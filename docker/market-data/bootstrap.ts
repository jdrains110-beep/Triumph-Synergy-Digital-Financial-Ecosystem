/**
 * Market Data Service — Bootstrap
 *
 * Polls Pi Network Horizon API for live ledger, fee, and market statistics.
 * Publishes real-time data to:
 *   - Redis pub/sub channel  "market:pi:ledger"
 *   - Redis keys             "market:pi:latest"  (5-min TTL)
 *   - Postgres table         market_data
 *
 * Exposes:
 *   GET /health          — liveness probe
 *   GET /metrics         — Prometheus-compatible metrics
 *   GET /api/market      — latest cached snapshot
 *   GET /api/market/history?limit=N — recent records from Postgres
 */

import http from "node:http";
import { createClient } from "redis";
import { Pool } from "pg";

const PORT = 8085;
const HORIZON_URL = process.env.STELLAR_HORIZON_URL ?? "https://api.mainnet.minepi.com";
const REDIS_URL   = process.env.REDIS_URL            ?? "redis://triumph-redis:6379";
const DB_URL      = process.env.DATABASE_URL         ?? process.env.POSTGRES_URL ?? "";
const POLL_MS     = parseInt(process.env.MARKET_POLL_MS ?? "5000", 10);
const NETWORK     = process.env.PI_NETWORK_MODE ?? "mainnet";
const PI_API_KEY  = process.env.PI_API_KEY ?? "";

const horizonHeaders = (): Record<string, string> => ({
  Accept: "application/json",
  ...(PI_API_KEY ? { Authorization: `Key ${PI_API_KEY}` } : {}),
});

// ─── State ────────────────────────────────────────────────────────────────────

let latestSnapshot: Record<string, unknown> | null = null;
let totalPolls = 0;
let failedPolls = 0;
let ready = false;
let shuttingDown = false;
let activeRequests = 0;

// ─── Redis ────────────────────────────────────────────────────────────────────

const redis = createClient({ url: REDIS_URL });
redis.on("error", (e: Error) => console.error("[redis]", e.message));
// redis.connect() called inside start()"

// ─── Postgres ─────────────────────────────────────────────────────────────────

const pool = DB_URL ? new Pool({ connectionString: DB_URL, max: 5 }) : null;

async function ensureTable() {
  if (!pool) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS market_data (
      id            SERIAL PRIMARY KEY,
      network       TEXT NOT NULL DEFAULT 'mainnet',
      ledger_seq    BIGINT,
      closed_at     TIMESTAMPTZ,
      base_fee_pi   NUMERIC(18,7),
      base_reserve  NUMERIC(18,7),
      tx_count      INTEGER,
      op_count      INTEGER,
      fee_p10       NUMERIC(18,7),
      fee_p50       NUMERIC(18,7),
      fee_p95       NUMERIC(18,7),
      fee_p99       NUMERIC(18,7),
      raw           JSONB,
      captured_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_market_data_captured ON market_data(captured_at DESC);
  `).catch((e: Error) => console.error("[pg] ensureTable:", e.message));
}

// ─── Data polling ─────────────────────────────────────────────────────────────

async function fetchJSON(path: string): Promise<unknown> {
  const res = await fetch(`${HORIZON_URL}${path}`, {
    headers: horizonHeaders(),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} from ${path}`);
  return res.json();
}

async function poll() {
  totalPolls++;
  try {
    // 1. Latest ledger
    const ledgersRaw = await fetchJSON("/ledgers?order=desc&limit=1") as any;
    const ledger = ledgersRaw?.["_embedded"]?.records?.[0];

    // 2. Fee statistics
    const fees = await fetchJSON("/fee_stats") as any;

    const snapshot = {
      network: NETWORK,
      ledger_seq:    ledger?.sequence          ?? null,
      closed_at:     ledger?.closed_at         ?? null,
      base_fee_pi:   ledger?.base_fee_in_stroops != null
                       ? Number(ledger.base_fee_in_stroops) / 1e7 : null,
      base_reserve:  ledger?.base_reserve_in_stroops != null
                       ? Number(ledger.base_reserve_in_stroops) / 1e7 : null,
      tx_count:      ledger?.transaction_count  ?? null,
      op_count:      ledger?.operation_count    ?? null,
      fee_p10:       fees?.fee_charged?.p10     != null ? Number(fees.fee_charged.p10) / 1e7 : null,
      fee_p50:       fees?.fee_charged?.p50     != null ? Number(fees.fee_charged.p50) / 1e7 : null,
      fee_p95:       fees?.fee_charged?.p95     != null ? Number(fees.fee_charged.p95) / 1e7 : null,
      fee_p99:       fees?.fee_charged?.p99     != null ? Number(fees.fee_charged.p99) / 1e7 : null,
      captured_at: new Date().toISOString(),
    };

    latestSnapshot = snapshot;

    // Push to Redis
    const ttl = Math.ceil(POLL_MS / 1000) * 2;
    await redis.set("market:pi:latest", JSON.stringify(snapshot), { EX: ttl }).catch(() => {});
    await redis.publish("market:pi:ledger", JSON.stringify(snapshot)).catch(() => {});

    // Persist to Postgres
    if (pool && snapshot.ledger_seq) {
      await pool.query(
        `INSERT INTO market_data
           (network, ledger_seq, closed_at, base_fee_pi, base_reserve,
            tx_count, op_count, fee_p10, fee_p50, fee_p95, fee_p99, raw)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         ON CONFLICT DO NOTHING`,
        [
          snapshot.network, snapshot.ledger_seq,
          snapshot.closed_at ? new Date(snapshot.closed_at as string) : null,
          snapshot.base_fee_pi, snapshot.base_reserve,
          snapshot.tx_count, snapshot.op_count,
          snapshot.fee_p10, snapshot.fee_p50, snapshot.fee_p95, snapshot.fee_p99,
          JSON.stringify(snapshot),
        ]
      ).catch((e: Error) => console.error("[pg] insert:", e.message));
    }

    console.log(`[market-data] ledger=${snapshot.ledger_seq} fee_p50=${snapshot.fee_p50} Pi`);
  } catch (err: unknown) {
    failedPolls++;
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[market-data] poll error: ${msg}`);
  }
}

// ─── HTTP server ──────────────────────────────────────────────────────────────

const safeStringify = (o: unknown) =>
  JSON.stringify(o, (_k, v) => (typeof v === "bigint" ? v.toString() : v));

const server = http.createServer((req, res) => {
  if (shuttingDown) { res.writeHead(503); res.end('{"error":"shutting down"}'); return; }
  activeRequests++;
  res.on("finish", () => { activeRequests--; });
  res.setHeader("Content-Type", "application/json");
  const url = req.url?.split("?")[0];

  if (url === "/health" || url === "/") {
    res.writeHead(ready ? 200 : 503);
    res.end(safeStringify({ service: "market-data", status: ready ? "healthy" : "starting",
      network: NETWORK, totalPolls, failedPolls }));

  } else if (url === "/metrics") {
    res.writeHead(200);
    res.end(safeStringify({ uptime_s: process.uptime(), total_polls: totalPolls,
      failed_polls: failedPolls, active_requests: activeRequests,
      memory: process.memoryUsage() }));

  } else if (url === "/api/market") {
    if (!latestSnapshot) { res.writeHead(503); res.end('{"error":"no data yet"}'); return; }
    res.writeHead(200);
    res.end(safeStringify(latestSnapshot));

  } else if (url === "/api/market/history" && pool) {
    const raw = req.url ?? "";
    const qs  = new URLSearchParams(raw.includes("?") ? raw.split("?")[1] : "");
    const limit = Math.min(parseInt(qs.get("limit") ?? "50", 10), 500);
    pool.query(
      "SELECT * FROM market_data ORDER BY captured_at DESC LIMIT $1",
      [limit]
    ).then(r => { res.writeHead(200); res.end(safeStringify({ rows: r.rows })); })
     .catch(() => { res.writeHead(500); res.end('{"error":"db error"}'); });

  } else {
    res.writeHead(404); res.end('{"error":"not found"}');
  }
});

server.listen(PORT, "0.0.0.0", () =>
  console.log(`📊 Market Data service listening on :${PORT}`)
);

// ─── Start ───────────────────────────────────────────────────────────────────

async function start() {
  await redis.connect().catch((e: Error) => console.error("[redis] connect:", e.message));
  await ensureTable();
  await poll(); // immediate first poll
  ready = true;
  setInterval(poll, POLL_MS);
  console.log(`✅ Market Data ONLINE — polling ${HORIZON_URL} every ${POLL_MS}ms`);
}

start().catch(err => { console.error("❌ Market Data failed:", err); process.exit(1); });

// ─── Graceful shutdown ────────────────────────────────────────────────────────

function shutdown(sig: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[market-data] ${sig} received, shutting down…`);
  server.close(() => {
    Promise.all([redis.quit().catch(() => {}), pool?.end().catch(() => {}) ?? Promise.resolve()])
      .finally(() => process.exit(0));
  });
  setTimeout(() => process.exit(1), 10_000);
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT",  () => shutdown("SIGINT"));

/**
 * Compliance Engine Service — Bootstrap
 *
 * KYC / AML / GDPR / MiCA compliance pipeline.
 * Subscribes to Redis channel "oracle:pi:tx" for real-time transaction screening.
 * Exposes synchronous screening API for on-demand checks.
 *
 * Endpoints:
 *   GET  /health                     — liveness probe
 *   GET  /metrics                    — Prometheus metrics
 *   POST /api/compliance/screen      — screen { address, amount, txHash }
 *   POST /api/compliance/kyc         — verify KYC submission { userId, data }
 *   GET  /api/compliance/status/:id  — check screening result
 *   GET  /api/compliance/history     — recent screenings from DB
 */

import http from "node:http";
import { createClient } from "redis";
import { Pool } from "pg";
import crypto from "node:crypto";

const PORT   = 8087;
const REDIS_URL = process.env.REDIS_URL    ?? "redis://triumph-redis:6379";
const DB_URL    = process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? "";
const NETWORK   = process.env.PI_NETWORK_MODE ?? "mainnet";

// OFAC / sanctions list — minimal built-in; extend via env BLOCKED_ADDRESSES (CSV)
const BLOCKED_ADDRESSES = new Set<string>(
  (process.env.BLOCKED_ADDRESSES ?? "").split(",").filter(Boolean).map(s => s.trim().toLowerCase())
);
// High-risk threshold (Pi) — flag for manual review
const AML_THRESHOLD_PI = parseFloat(process.env.AML_THRESHOLD_PI ?? "10000");

// ─── Metrics ──────────────────────────────────────────────────────────────────

let screened = 0;
let flagged  = 0;
let blocked  = 0;
let ready    = false;
let shuttingDown   = false;
let activeRequests = 0;

// ─── Redis ────────────────────────────────────────────────────────────────────

const redis    = createClient({ url: REDIS_URL });
const redisSub = redis.duplicate();
redis.on("error",    (e: Error) => console.error("[redis]",    e.message));
redisSub.on("error", (e: Error) => console.error("[redisSub]", e.message));
// connect() called inside start()

// ─── Postgres ─────────────────────────────────────────────────────────────────

const pool = DB_URL ? new Pool({ connectionString: DB_URL, max: 5 }) : null;

async function ensureTable() {
  if (!pool) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS compliance_screenings (
      id            TEXT PRIMARY KEY,
      network       TEXT NOT NULL DEFAULT 'mainnet',
      tx_hash       TEXT,
      address       TEXT,
      amount_pi     NUMERIC(18,7),
      result        TEXT NOT NULL,  -- PASS | FLAG | BLOCK
      reasons       TEXT[],
      risk_score    SMALLINT,
      screened_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_compliance_screened ON compliance_screenings(screened_at DESC);
    CREATE INDEX IF NOT EXISTS idx_compliance_address  ON compliance_screenings(address);

    CREATE TABLE IF NOT EXISTS kyc_records (
      id            TEXT PRIMARY KEY,
      user_id       TEXT NOT NULL,
      status        TEXT NOT NULL DEFAULT 'PENDING',
      doc_hash      TEXT,
      submitted_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      reviewed_at   TIMESTAMPTZ,
      reviewer_note TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_kyc_user ON kyc_records(user_id);
  `).catch((e: Error) => console.error("[pg] ensureTable:", e.message));
}

// ─── Screening logic ──────────────────────────────────────────────────────────

interface ScreeningInput {
  address?: string;
  amount?:  number;
  txHash?:  string;
}

interface ScreeningResult {
  id:        string;
  result:    "PASS" | "FLAG" | "BLOCK";
  reasons:   string[];
  riskScore: number;
}

function screen(input: ScreeningInput): ScreeningResult {
  const id = crypto.randomUUID();
  const addr = (input.address ?? "").toLowerCase();
  const reasons: string[] = [];
  let riskScore = 0;

  // Sanction check
  if (addr && BLOCKED_ADDRESSES.has(addr)) {
    reasons.push("OFAC_MATCH");
    riskScore = 100;
  }

  // AML threshold check
  if (input.amount && input.amount >= AML_THRESHOLD_PI) {
    reasons.push(`LARGE_TX:${input.amount}Pi`);
    riskScore = Math.max(riskScore, 70);
  }

  // Structuring detection — amounts just under threshold
  if (input.amount && input.amount >= AML_THRESHOLD_PI * 0.9 && input.amount < AML_THRESHOLD_PI) {
    reasons.push("POSSIBLE_STRUCTURING");
    riskScore = Math.max(riskScore, 50);
  }

  // Unknown/empty address
  if (!addr) {
    reasons.push("MISSING_ADDRESS");
    riskScore = Math.max(riskScore, 30);
  }

  const result: "PASS" | "FLAG" | "BLOCK" =
    riskScore >= 100 ? "BLOCK" : riskScore >= 50 ? "FLAG" : "PASS";

  screened++;
  if (result === "FLAG")  flagged++;
  if (result === "BLOCK") blocked++;

  return { id, result, reasons, riskScore };
}

async function persistScreening(input: ScreeningInput, sr: ScreeningResult) {
  if (!pool) return;
  await pool.query(
    `INSERT INTO compliance_screenings
       (id, network, tx_hash, address, amount_pi, result, reasons, risk_score)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [sr.id, NETWORK, input.txHash ?? null, input.address ?? null,
     input.amount  ?? null, sr.result, sr.reasons, sr.riskScore]
  ).catch((e: Error) => console.error("[pg] persist screening:", e.message));
}

// ─── Subscribe to oracle:pi:tx ────────────────────────────────────────────────

async function startSubscription() {
  await redisSub.connect().catch((e: Error) => console.error("[redisSub] connect:", e.message));
  await redisSub.subscribe("oracle:pi:tx", async (message) => {
    try {
      const tx = JSON.parse(message) as any;
      const input: ScreeningInput = {
        address: tx.source_acct,
        amount:  tx.amount_pi ? parseFloat(tx.amount_pi) : undefined,
        txHash:  tx.tx_hash,
      };
      const sr = screen(input);
      await persistScreening(input, sr);
      if (sr.result !== "PASS") {
        await redis.publish("compliance:alert", JSON.stringify({ ...sr, input })).catch(() => {});
        console.log(`[compliance] ${sr.result} tx=${input.txHash} score=${sr.riskScore}`);
      }
    } catch {}
  }).catch((e: Error) => console.error("[redisSub] subscribe error:", e.message));
  console.log("✅ Compliance Engine subscribed to oracle:pi:tx");
}

// ─── HTTP server ──────────────────────────────────────────────────────────────

const safeStringify = (o: unknown) =>
  JSON.stringify(o, (_k, v) => (typeof v === "bigint" ? v.toString() : v));

async function readBody(req: http.IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => { body += chunk; if (body.length > 64_000) req.destroy(); });
    req.on("end",  () => { try { resolve(JSON.parse(body)); } catch { resolve({}); } });
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  if (shuttingDown) { res.writeHead(503); res.end('{"error":"shutting down"}'); return; }
  activeRequests++;
  res.on("finish", () => { activeRequests--; });
  res.setHeader("Content-Type", "application/json");
  const url = req.url?.split("?")[0];

  if (url === "/health" || url === "/") {
    res.writeHead(ready ? 200 : 503);
    res.end(safeStringify({ service: "compliance", status: ready ? "healthy" : "starting",
      network: NETWORK, screened, flagged, blocked }));

  } else if (url === "/metrics") {
    const mem = process.memoryUsage();
    const lines = [
      `# HELP process_uptime_seconds Service uptime in seconds`,
      `# TYPE process_uptime_seconds gauge`,
      `process_uptime_seconds{service="compliance",network="${NETWORK}"} ${process.uptime().toFixed(3)}`,
      `# HELP nodejs_heap_used_bytes Node.js heap used bytes`,
      `# TYPE nodejs_heap_used_bytes gauge`,
      `nodejs_heap_used_bytes{service="compliance"} ${mem.heapUsed}`,
      `# HELP compliance_screened_total Total addresses screened`,
      `# TYPE compliance_screened_total counter`,
      `compliance_screened_total{network="${NETWORK}"} ${screened}`,
      `# HELP compliance_flagged_total Addresses flagged for review`,
      `# TYPE compliance_flagged_total counter`,
      `compliance_flagged_total{network="${NETWORK}"} ${flagged}`,
      `# HELP compliance_blocked_total Addresses blocked`,
      `# TYPE compliance_blocked_total counter`,
      `compliance_blocked_total{network="${NETWORK}"} ${blocked}`,
      `# HELP compliance_active_requests Current in-flight HTTP requests`,
      `# TYPE compliance_active_requests gauge`,
      `compliance_active_requests ${activeRequests}`,
    ].join("\n");
    res.writeHead(200, { "Content-Type": "text/plain; version=0.0.4; charset=utf-8" });
    res.end(lines + "\n");

  } else if (url === "/api/compliance/screen" && req.method === "POST") {
    const body = await readBody(req) as ScreeningInput;
    const sr = screen(body);
    await persistScreening(body, sr);
    res.writeHead(200);
    res.end(safeStringify({ ...sr, network: NETWORK }));

  } else if (url === "/api/compliance/kyc" && req.method === "POST") {
    const body = await readBody(req) as any;
    const id = crypto.randomUUID();
    const docHash = body.data
      ? crypto.createHash("sha256").update(JSON.stringify(body.data)).digest("hex")
      : null;
    if (pool) {
      await pool.query(
        `INSERT INTO kyc_records (id, user_id, status, doc_hash)
         VALUES ($1,$2,'PENDING',$3)`,
        [id, body.userId ?? "unknown", docHash]
      ).catch(() => {});
    }
    res.writeHead(202);
    res.end(safeStringify({ id, status: "PENDING", network: NETWORK }));

  } else if (url?.startsWith("/api/compliance/status/") && pool) {
    const id = url.slice("/api/compliance/status/".length);
    const r = await pool.query(
      "SELECT * FROM compliance_screenings WHERE id=$1 UNION ALL SELECT id,'',NULL,NULL,NULL,status,NULL,NULL,submitted_at FROM kyc_records WHERE id=$1",
      [id]
    ).catch(() => null);
    res.writeHead(r ? 200 : 500);
    res.end(safeStringify({ rows: r?.rows ?? [] }));

  } else if (url === "/api/compliance/history" && pool) {
    const raw = req.url ?? "";
    const qs  = new URLSearchParams(raw.includes("?") ? raw.split("?")[1] : "");
    const limit = Math.min(parseInt(qs.get("limit") ?? "50", 10), 500);
    pool.query(
      "SELECT * FROM compliance_screenings ORDER BY screened_at DESC LIMIT $1", [limit]
    ).then(r => { res.writeHead(200); res.end(safeStringify({ rows: r.rows })); })
     .catch(() => { res.writeHead(500); res.end('{"error":"db error"}'); });

  } else {
    res.writeHead(404); res.end('{"error":"not found"}');
  }
});

server.listen(PORT, "0.0.0.0", () =>
  console.log(`🛡️  Compliance Engine listening on :${PORT}`)
);

// ─── Start ───────────────────────────────────────────────────────────────────

async function start() {
  await redis.connect().catch((e: Error) => console.error("[redis] connect:", e.message));
  await ensureTable();
  await startSubscription();
  ready = true;
  console.log("✅ Compliance Engine ONLINE");
}

start().catch(err => { console.error("❌ Compliance Engine failed:", err); process.exit(1); });

function shutdown(sig: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[compliance] ${sig} — shutting down…`);
  server.close(() => {
    Promise.all([
      redis.quit().catch(() => {}),
      redisSub.quit().catch(() => {}),
      pool?.end().catch(() => {}) ?? Promise.resolve(),
    ]).finally(() => process.exit(0));
  });
  setTimeout(() => process.exit(1), 10_000);
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT",  () => shutdown("SIGINT"));

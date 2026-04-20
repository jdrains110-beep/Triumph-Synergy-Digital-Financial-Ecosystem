/**
 * Blockchain Oracle Service — Bootstrap
 *
 * Opens a streaming (SSE) connection to Pi Network Horizon. For each new
 * ledger close event it:
 *   1. Publishes the event to Redis pub/sub channel "oracle:pi:ledger"
 *   2. Fetches the full transaction list for that ledger
 *   3. Publishes each transaction to "oracle:pi:tx"
 *   4. Persists new on-chain events to Postgres (oracle_events table)
 *   5. Triggers internal smart-contract evaluation webhook
 *
 * Exposes:
 *   GET /health            — liveness probe
 *   GET /metrics           — Prometheus metrics
 *   GET /api/events?limit  — recent events from Postgres
 *   GET /api/stream        — SSE proxy (browser → this service)
 */

// Copyright (C) 2024-2026 Jeremiah Drains / Triumph Synergy. All rights reserved.
// License: PiOS
// Copyright (C) 2024-2026 Jeremiah Drains / Triumph Synergy. All rights reserved.
// License: PiOS


import http from "node:http";
import { createClient } from "redis";
import { Pool } from "pg";

const PORT = 8086;
const HORIZON_URL   = process.env.STELLAR_HORIZON_URL ?? "https://api.mainnet.minepi.com";
const REDIS_URL     = process.env.REDIS_URL            ?? "redis://triumph-redis:6379";
const DB_URL        = process.env.DATABASE_URL         ?? process.env.POSTGRES_URL ?? "";
const CONTRACTS_URL = process.env.CONTRACTS_URL        ?? "http://triumph-smart-contracts:8082";
const NETWORK       = process.env.PI_NETWORK_MODE      ?? "mainnet";
const PI_API_KEY    = process.env.PI_API_KEY            ?? "";
const RECONNECT_MS  = 5_000;

const horizonHeaders = (): Record<string, string> => ({
  Accept: "application/json",
  ...(PI_API_KEY ? { Authorization: `Key ${PI_API_KEY}` } : {}),
});

// ─── Metrics ──────────────────────────────────────────────────────────────────

let ledgersReceived = 0;
let txsReceived     = 0;
let reconnects      = 0;
let ready           = false;
let shuttingDown    = false;
let activeRequests  = 0;
let streamAbort: AbortController | null = null;

// ─── Redis ────────────────────────────────────────────────────────────────────

const redis = createClient({
  url: REDIS_URL,
  socket: {
    reconnectStrategy: (retries: number) => Math.min(retries * 500, 5000),
  },
});
redis.on("error", (e: Error) => console.error("[redis]", e.message));
// redis.connect() called inside start()

// ─── Postgres ─────────────────────────────────────────────────────────────────

const pool = DB_URL ? new Pool({ connectionString: DB_URL, max: 5 }) : null;

async function ensureTable() {
  if (!pool) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS oracle_events (
      id          SERIAL PRIMARY KEY,
      network     TEXT NOT NULL DEFAULT 'mainnet',
      event_type  TEXT NOT NULL,
      ledger_seq  BIGINT,
      closed_at   TIMESTAMPTZ,
      tx_hash     TEXT,
      source_acct TEXT,
      dest_acct   TEXT,
      amount_pi   NUMERIC(18,7),
      op_type     TEXT,
      raw         JSONB,
      captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_oracle_events_captured ON oracle_events(captured_at DESC);
    CREATE INDEX IF NOT EXISTS idx_oracle_events_tx_hash  ON oracle_events(tx_hash);
  `).catch((e: Error) => console.error("[pg] ensureTable:", e.message));
}

async function persistEvent(row: Record<string, unknown>) {
  if (!pool) return;
  await pool.query(
    `INSERT INTO oracle_events
       (network, event_type, ledger_seq, closed_at, tx_hash,
        source_acct, dest_acct, amount_pi, op_type, raw)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [
      row.network, row.event_type, row.ledger_seq,
      row.closed_at ? new Date(row.closed_at as string) : null,
      row.tx_hash   ?? null, row.source_acct ?? null,
      row.dest_acct ?? null, row.amount_pi   ?? null,
      row.op_type   ?? null, JSON.stringify(row),
    ]
  ).catch((e: Error) => console.error("[pg] persist:", e.message));
}

// ─── Streaming ledger watcher ─────────────────────────────────────────────────

async function fetchJSON(path: string, signal?: AbortSignal): Promise<unknown> {
  const res = await fetch(`${HORIZON_URL}${path}`, {
    headers: horizonHeaders(),
    signal: signal ?? AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${path}`);
  return res.json();
}

async function processTxsForLedger(seq: number, closedAt: string) {
  try {
    const data = await fetchJSON(
      `/ledgers/${seq}/transactions?limit=200&include_failed=false`
    ) as any;
    const txs: unknown[] = data?.["_embedded"]?.records ?? [];
    for (const tx of txs) {
      const t = tx as any;
      const event = {
        network: NETWORK, event_type: "transaction",
        ledger_seq: seq, closed_at: closedAt,
        tx_hash: t.hash, source_acct: t.source_account,
        dest_acct: null, amount_pi: null, op_type: "transaction",
      };
      txsReceived++;
      await redis.publish("oracle:pi:tx", JSON.stringify({ ...event, raw: t })).catch(() => {});
      await persistEvent(event);
    }
  } catch (e: unknown) {
    console.error("[oracle] fetchTxs:", (e as Error).message);
  }
}

async function startStream() {
  if (shuttingDown) return;
  reconnects++;
  streamAbort = new AbortController();

  try {
    console.log(`[oracle] connecting to ${HORIZON_URL}/ledgers?cursor=now&order=asc`);
    const res = await fetch(`${HORIZON_URL}/ledgers?cursor=now&order=asc`, {
      headers: { ...horizonHeaders(), Accept: "text/event-stream" },
      signal: streamAbort.signal,
    });

    if (!res.ok || !res.body) {
      throw new Error(`Horizon SSE ${res.status}`);
    }

    ready = true;
    console.log("✅ Blockchain Oracle SSE stream OPEN");

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";

    while (!shuttingDown) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });

      // SSE frames are separated by double newline
      const frames = buf.split("\n\n");
      buf = frames.pop() ?? "";

      for (const frame of frames) {
        const dataLine = frame.split("\n").find(l => l.startsWith("data:"));
        if (!dataLine) continue;
        const raw = dataLine.slice(5).trim();
        if (!raw || raw === "\"hello\"") continue;

        try {
          const ledger = JSON.parse(raw) as any;
          const seq      = ledger.sequence ?? ledger.id;
          const closedAt = ledger.closed_at;
          // Skip control / hello / malformed frames
          if (!seq || !closedAt) continue;
          ledgersReceived++;

          const event = {
            network: NETWORK, event_type: "ledger_close",
            ledger_seq: seq, closed_at: closedAt,
            tx_hash: null, source_acct: null,
            dest_acct: null, amount_pi: null, op_type: "ledger",
          };

          // Publish to Redis
          await redis.publish("oracle:pi:ledger", JSON.stringify(event)).catch(() => {});
          await redis.set("oracle:pi:latest_ledger", JSON.stringify(event), { EX: 30 }).catch(() => {});

          // Persist + fetch txs (non-blocking)
          persistEvent(event).catch(() => {});
          processTxsForLedger(seq, closedAt).catch(() => {});

          // Notify smart-contract service
          fetch(`${CONTRACTS_URL}/internal/ledger`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ledger_seq: seq, closed_at: closedAt }),
            signal: AbortSignal.timeout(3000),
          }).catch(() => {});

          console.log(`[oracle] ledger ${seq} closed at ${closedAt}`);
        } catch {}
      }
    }
  } catch (err: unknown) {
    if (!shuttingDown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[oracle] stream error: ${msg} — reconnecting in ${RECONNECT_MS}ms`);
      setTimeout(startStream, RECONNECT_MS);
    }
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
    res.end(safeStringify({ service: "blockchain-oracle", status: ready ? "healthy" : "starting",
      network: NETWORK, ledgersReceived, txsReceived, reconnects }));

  } else if (url === "/metrics") {
    const mem = process.memoryUsage();
    const lines = [
      `# HELP process_uptime_seconds Service uptime in seconds`,
      `# TYPE process_uptime_seconds gauge`,
      `process_uptime_seconds{service="blockchain-oracle",network="${NETWORK}"} ${process.uptime().toFixed(3)}`,
      `# HELP nodejs_heap_used_bytes Node.js heap used bytes`,
      `# TYPE nodejs_heap_used_bytes gauge`,
      `nodejs_heap_used_bytes{service="blockchain-oracle"} ${mem.heapUsed}`,
      `# HELP oracle_ledgers_received_total Pi ledgers received`,
      `# TYPE oracle_ledgers_received_total counter`,
      `oracle_ledgers_received_total{network="${NETWORK}"} ${ledgersReceived}`,
      `# HELP oracle_txs_received_total Pi transactions received`,
      `# TYPE oracle_txs_received_total counter`,
      `oracle_txs_received_total{network="${NETWORK}"} ${txsReceived}`,
      `# HELP oracle_reconnects_total SSE stream reconnect count`,
      `# TYPE oracle_reconnects_total counter`,
      `oracle_reconnects_total ${reconnects}`,
      `# HELP oracle_active_requests Current in-flight HTTP requests`,
      `# TYPE oracle_active_requests gauge`,
      `oracle_active_requests ${activeRequests}`,
    ].join("\n");
    res.writeHead(200, { "Content-Type": "text/plain; version=0.0.4; charset=utf-8" });
    res.end(lines + "\n");

  } else if (url === "/api/events" && pool) {
    const raw = req.url ?? "";
    const qs  = new URLSearchParams(raw.includes("?") ? raw.split("?")[1] : "");
    const limit = Math.min(parseInt(qs.get("limit") ?? "50", 10), 500);
    pool.query("SELECT * FROM oracle_events ORDER BY captured_at DESC LIMIT $1", [limit])
      .then(r => { res.writeHead(200); res.end(safeStringify({ rows: r.rows })); })
      .catch(() => { res.writeHead(500); res.end('{"error":"db error"}'); });

  } else {
    res.writeHead(404); res.end('{"error":"not found"}');
  }
});

server.listen(PORT, "0.0.0.0", () =>
  console.log(`🔗 Blockchain Oracle listening on :${PORT}`)
);

// ─── Start ───────────────────────────────────────────────────────────────────

async function start() {
  await redis.connect().catch((e: Error) => console.error("[redis] connect:", e.message));
  await ensureTable();
  await startStream();
}

start().catch(err => { console.error("❌ Blockchain Oracle failed:", err); process.exit(1); });

// ─── Graceful shutdown ────────────────────────────────────────────────────────

function shutdown(sig: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  streamAbort?.abort();
  console.log(`[oracle] ${sig} — shutting down…`);
  server.close(() => {
    Promise.all([redis.quit().catch(() => {}), pool?.end().catch(() => {}) ?? Promise.resolve()])
      .finally(() => process.exit(0));
  });
  setTimeout(() => process.exit(1), 10_000);
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT",  () => shutdown("SIGINT"));

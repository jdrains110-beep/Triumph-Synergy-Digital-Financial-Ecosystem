/**
 * DEX Engine Service — Bootstrap
 *
 * Pi Network Decentralized Exchange engine.
 * Subscribes to Redis "market:pi:ledger" for fee/price feeds.
 * Provides an in-memory order book backed by Postgres for persistence.
 *
 * Also polls Horizon's order-book / offers APIs for live DEX data.
 *
 * Endpoints:
 *   GET  /health                  — liveness probe
 *   GET  /metrics                 — Prometheus metrics
 *   GET  /api/dex/orderbook       — current order book snapshot
 *   GET  /api/dex/price           — current Pi reference price
 *   POST /api/dex/order           — place order { side, amountPi, priceUsd }
 *   DELETE /api/dex/order/:id     — cancel order
 *   GET  /api/dex/trades          — recent trades
 */

// Copyright (C) 2024-2026 Jeremiah Drains / Triumph Synergy. All rights reserved.
// License: PiOS
// Copyright (C) 2024-2026 Jeremiah Drains / Triumph Synergy. All rights reserved.
// License: PiOS


import http from "node:http";
import { createClient } from "redis";
import { Pool } from "pg";
import crypto from "node:crypto";

const PORT      = 8088;
const HORIZON   = process.env.STELLAR_HORIZON_URL ?? "https://api.mainnet.minepi.com";
const REDIS_URL = process.env.REDIS_URL            ?? "redis://triumph-redis:6379";
const DB_URL    = process.env.DATABASE_URL         ?? process.env.POSTGRES_URL ?? "";
const NETWORK   = process.env.PI_NETWORK_MODE      ?? "mainnet";

// Base asset — Pi (native Stellar asset on Pi Network)
const BASE_ASSET  = "Pi";
const QUOTE_ASSET = "USD";

// ─── State ────────────────────────────────────────────────────────────────────

interface Order {
  id:        string;
  side:      "BUY" | "SELL";
  amountPi:  number;
  priceUsd:  number;
  status:    "OPEN" | "FILLED" | "CANCELLED";
  createdAt: string;
}

// In-process order book (persisted to Postgres)
const bids: Order[] = []; // sorted desc by price
const asks: Order[] = []; // sorted asc  by price

let referencePrice: number | null = null; // USD/Pi from Horizon offers
let totalTrades    = 0;
let ready          = false;
let shuttingDown   = false;
let activeRequests = 0;

// ─── Redis ────────────────────────────────────────────────────────────────────

const redis    = createClient({
  url: REDIS_URL,
  socket: {
    reconnectStrategy: (retries: number) => Math.min(retries * 500, 5000),
  },
});
const redisSub = redis.duplicate();
redis.on("error",    (e: Error) => console.error("[redis]",    e.message));
redisSub.on("error", (e: Error) => console.error("[redisSub]", e.message));
// connect() called inside start()

// ─── Postgres ─────────────────────────────────────────────────────────────────

const pool = DB_URL ? new Pool({ connectionString: DB_URL, max: 5 }) : null;

async function ensureTable() {
  if (!pool) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS dex_orders (
      id         TEXT PRIMARY KEY,
      network    TEXT NOT NULL DEFAULT 'mainnet',
      side       TEXT NOT NULL,
      amount_pi  NUMERIC(18,7) NOT NULL,
      price_usd  NUMERIC(18,7) NOT NULL,
      status     TEXT NOT NULL DEFAULT 'OPEN',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      filled_at  TIMESTAMPTZ
    );
    CREATE INDEX IF NOT EXISTS idx_dex_orders_status ON dex_orders(status);

    CREATE TABLE IF NOT EXISTS dex_trades (
      id            TEXT PRIMARY KEY,
      network       TEXT NOT NULL DEFAULT 'mainnet',
      buy_order_id  TEXT,
      sell_order_id TEXT,
      amount_pi     NUMERIC(18,7) NOT NULL,
      price_usd     NUMERIC(18,7) NOT NULL,
      traded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_dex_trades_at ON dex_trades(traded_at DESC);

    CREATE TABLE IF NOT EXISTS dex_price_feed (
      id            SERIAL PRIMARY KEY,
      network       TEXT NOT NULL DEFAULT 'mainnet',
      price_usd     NUMERIC(18,7),
      source        TEXT,
      captured_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `).catch((e: Error) => console.error("[pg] ensureTable:", e.message));
}

// ─── Horizon order book polling ────────────────────────────────────────────────

async function refreshPriceFromHorizon() {
  try {
    // Pi/XLM proxy: Horizon offers/orderbook endpoint on Pi Network
    const url = `${HORIZON}/order_book?selling_asset_type=native&buying_asset_type=credit_alphanum4&buying_asset_code=USD&buying_asset_issuer=GDUKMGUGDZQK6YHYA5Z6AY2G4XDSZPSZ3SW5UN3ARVMU6WUVHR4U2ZQ&limit=10`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return;
    const data = await res.json() as any;
    const bestAsk = data?.asks?.[0]?.price;
    if (bestAsk) {
      referencePrice = parseFloat(bestAsk);
      await redis.set("dex:pi:price_usd", referencePrice.toString(), { EX: 60 }).catch(() => {});
      await redis.publish("dex:pi:price", JSON.stringify({
        price_usd: referencePrice, network: NETWORK, source: "horizon"
      })).catch(() => {});
      if (pool) {
        await pool.query(
          "INSERT INTO dex_price_feed (network, price_usd, source) VALUES ($1,$2,$3)",
          [NETWORK, referencePrice, "horizon"]
        ).catch(() => {});
      }
    }
  } catch {}
}

// Attempt match after every new order
function matchOrders() {
  while (bids.length && asks.length) {
    const topBid  = bids[0];
    const topAsk  = asks[0];
    if (topBid.priceUsd < topAsk.priceUsd) break; // no cross

    const fillAmt = Math.min(topBid.amountPi, topAsk.amountPi);
    const price   = (topBid.priceUsd + topAsk.priceUsd) / 2;
    totalTrades++;

    const trade = {
      id:           crypto.randomUUID(),
      buyOrderId:   topBid.id,
      sellOrderId:  topAsk.id,
      amountPi:     fillAmt,
      priceUsd:     price,
      tradedAt:     new Date().toISOString(),
    };

    redis.publish("dex:pi:trade", JSON.stringify(trade)).catch(() => {});

    if (pool) {
      pool.query(
        `INSERT INTO dex_trades (id, network, buy_order_id, sell_order_id, amount_pi, price_usd)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [trade.id, NETWORK, trade.buyOrderId, trade.sellOrderId, fillAmt, price]
      ).catch(() => {});
    }

    topBid.amountPi -= fillAmt;
    topAsk.amountPi -= fillAmt;

    if (topBid.amountPi <= 0) { topBid.status = "FILLED"; bids.shift(); }
    if (topAsk.amountPi <= 0) { topAsk.status = "FILLED"; asks.shift(); }
  }
}

function placeOrder(side: "BUY" | "SELL", amountPi: number, priceUsd: number): Order {
  const order: Order = {
    id: crypto.randomUUID(), side, amountPi, priceUsd,
    status: "OPEN", createdAt: new Date().toISOString(),
  };
  if (side === "BUY") {
    bids.push(order);
    bids.sort((a, b) => b.priceUsd - a.priceUsd);
  } else {
    asks.push(order);
    asks.sort((a, b) => a.priceUsd - b.priceUsd);
  }
  if (pool) {
    pool.query(
      `INSERT INTO dex_orders (id, network, side, amount_pi, price_usd)
       VALUES ($1,$2,$3,$4,$5)`,
      [order.id, NETWORK, side, amountPi, priceUsd]
    ).catch(() => {});
  }
  matchOrders();
  return order;
}

// ─── HTTP server ──────────────────────────────────────────────────────────────

const safeStringify = (o: unknown) =>
  JSON.stringify(o, (_k, v) => (typeof v === "bigint" ? v.toString() : v));

async function readBody(req: http.IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => { body += chunk; if (body.length > 32_000) req.destroy(); });
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
    res.end(safeStringify({ service: "dex", status: ready ? "healthy" : "starting",
      network: NETWORK, referencePrice, openBids: bids.length, openAsks: asks.length, totalTrades }));

  } else if (url === "/metrics") {
    const mem = process.memoryUsage();
    const lines = [
      `# HELP process_uptime_seconds Service uptime in seconds`,
      `# TYPE process_uptime_seconds gauge`,
      `process_uptime_seconds{service="dex",network="${NETWORK}"} ${process.uptime().toFixed(3)}`,
      `# HELP nodejs_heap_used_bytes Node.js heap used bytes`,
      `# TYPE nodejs_heap_used_bytes gauge`,
      `nodejs_heap_used_bytes{service="dex"} ${mem.heapUsed}`,
      `# HELP dex_trades_total Total trades executed`,
      `# TYPE dex_trades_total counter`,
      `dex_trades_total{network="${NETWORK}"} ${totalTrades}`,
      `# HELP dex_open_orders Current open orders in orderbook`,
      `# TYPE dex_open_orders gauge`,
      `dex_open_orders{side="bid",network="${NETWORK}"} ${bids.length}`,
      `dex_open_orders{side="ask",network="${NETWORK}"} ${asks.length}`,
      `# HELP dex_reference_price_usd Current Pi reference price USD`,
      `# TYPE dex_reference_price_usd gauge`,
      `dex_reference_price_usd{network="${NETWORK}"} ${referencePrice ?? 0}`,
      `# HELP dex_active_requests Current in-flight HTTP requests`,
      `# TYPE dex_active_requests gauge`,
      `dex_active_requests ${activeRequests}`,
    ].join("\n");
    res.writeHead(200, { "Content-Type": "text/plain; version=0.0.4; charset=utf-8" });
    res.end(lines + "\n");

  } else if (url === "/api/dex/orderbook") {
    res.writeHead(200);
    res.end(safeStringify({
      base: BASE_ASSET, quote: QUOTE_ASSET,
      referencePrice, network: NETWORK,
      bids: bids.slice(0, 20).map(o => ({ price: o.priceUsd, amount: o.amountPi })),
      asks: asks.slice(0, 20).map(o => ({ price: o.priceUsd, amount: o.amountPi })),
    }));

  } else if (url === "/api/dex/price") {
    res.writeHead(200);
    res.end(safeStringify({ price_usd: referencePrice, network: NETWORK,
      base: BASE_ASSET, quote: QUOTE_ASSET }));

  } else if (url === "/api/dex/order" && req.method === "POST") {
    const body = await readBody(req) as any;
    const side      = body.side === "SELL" ? "SELL" : "BUY" as "BUY"|"SELL";
    const amountPi  = Math.abs(parseFloat(body.amountPi  ?? "0"));
    const priceUsd  = Math.abs(parseFloat(body.priceUsd  ?? (referencePrice ?? "0").toString()));
    if (!amountPi || !priceUsd) { res.writeHead(400); res.end('{"error":"invalid"}'); return; }
    const order = placeOrder(side, amountPi, priceUsd);
    res.writeHead(201);
    res.end(safeStringify(order));

  } else if (url?.startsWith("/api/dex/order/") && req.method === "DELETE") {
    const id = url.slice("/api/dex/order/".length);
    const bidIdx = bids.findIndex(o => o.id === id);
    const askIdx = asks.findIndex(o => o.id === id);
    if (bidIdx >= 0) bids.splice(bidIdx, 1);
    if (askIdx >= 0) asks.splice(askIdx, 1);
    if (pool) pool.query("UPDATE dex_orders SET status='CANCELLED' WHERE id=$1", [id]).catch(() => {});
    res.writeHead(200);
    res.end(safeStringify({ cancelled: id }));

  } else if (url === "/api/dex/trades" && pool) {
    const raw = req.url ?? "";
    const qs  = new URLSearchParams(raw.includes("?") ? raw.split("?")[1] : "");
    const limit = Math.min(parseInt(qs.get("limit") ?? "50", 10), 500);
    pool.query("SELECT * FROM dex_trades ORDER BY traded_at DESC LIMIT $1", [limit])
      .then(r => { res.writeHead(200); res.end(safeStringify({ rows: r.rows })); })
      .catch(() => { res.writeHead(500); res.end('{"error":"db error"}'); });

  } else {
    res.writeHead(404); res.end('{"error":"not found"}');
  }
});

server.listen(PORT, "0.0.0.0", () =>
  console.log(`💱 DEX Engine listening on :${PORT}`)
);

// ─── Start ───────────────────────────────────────────────────────────────────

async function start() {
  await redis.connect().catch((e: Error) => console.error("[redis] connect:", e.message));
  await redisSub.connect().catch((e: Error) => console.error("[redisSub] connect:", e.message));
  await ensureTable();

  // Restore open orders from DB
  if (pool) {
    const r = await pool.query("SELECT * FROM dex_orders WHERE status='OPEN'").catch(() => null);
    for (const row of r?.rows ?? []) {
      const order: Order = {
        id: row.id, side: row.side, amountPi: parseFloat(row.amount_pi),
        priceUsd: parseFloat(row.price_usd), status: "OPEN",
        createdAt: row.created_at.toISOString(),
      };
      if (order.side === "BUY") bids.push(order);
      else asks.push(order);
    }
    bids.sort((a, b) => b.priceUsd - a.priceUsd);
    asks.sort((a, b) => a.priceUsd - b.priceUsd);
    console.log(`[dex] restored ${bids.length} bids, ${asks.length} asks`);
  }

  // Subscribe to market data for live price updates
  await redisSub.subscribe("market:pi:ledger", () => {
    refreshPriceFromHorizon().catch(() => {});
  }).catch(() => {});

  // Subscribe to market-data ML price feed — Pi/USD price published every 30s
  await redisSub.subscribe("dex:pi:price", (msg) => {
    try {
      const data = JSON.parse(msg) as Record<string, unknown>;
      if (typeof data.pi_price_usd === "number" && (data.pi_price_usd as number) > 0) {
        referencePrice = data.pi_price_usd as number;
        console.log(`[dex] 💰 Pi price updated from market-data: $${referencePrice}`);
      }
    } catch {}
  }).catch(() => {});

  // Seed referencePrice from Redis key on startup (populated by market-data service)
  const storedPrice = await redis.get("dex:pi:price_usd").catch(() => null);
  if (storedPrice) {
    const p = parseFloat(storedPrice);
    if (p > 0) {
      referencePrice = p;
      console.log(`[dex] 💰 Pi price seeded from Redis: $${p}`);
    }
  }

  // Initial price fetch from Horizon (may return null on testnet — Redis feed above is primary)
  await refreshPriceFromHorizon();

  // Periodic price refresh
  setInterval(() => refreshPriceFromHorizon().catch(() => {}), 30_000);

  ready = true;
  console.log("✅ DEX Engine ONLINE");
}

start().catch(err => { console.error("❌ DEX Engine failed:", err); process.exit(1); });

function shutdown(sig: string) {
  if (shuttingDown) return;
  shuttingDown = true;
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

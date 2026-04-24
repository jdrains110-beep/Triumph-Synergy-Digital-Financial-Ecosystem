/**
 * Transaction Engine Bootstrap — HTTP health server on :8080 with backpressure
 */
// Copyright (C) 2024-2026 Jeremiah Drains / Triumph Synergy. All rights reserved.
// License: PiOS

import http from "node:http";
import { PiHyperTransactionEngine } from "../../lib/pi-transaction/pi-hyper-transaction-engine";

const PORT = 8080;
const networkType = (process.env.PI_NETWORK_MODE || "mainnet") as "mainnet" | "testnet";
const safeStringify = (o: unknown) => JSON.stringify(o, (_k, v) => typeof v === "bigint" ? v.toString() : v);
let engine: PiHyperTransactionEngine | null = null;
let ready = false;
let shuttingDown = false;
let activeRequests = 0;
const MAX_CONCURRENT = 150;
const MAX_CONNECTIONS = 400;

const server = http.createServer((req, res) => {
  if (shuttingDown) { res.writeHead(503); res.end('{"error":"shutting down"}'); return; }
  if (activeRequests >= MAX_CONCURRENT) { res.writeHead(503, {"Retry-After":"1"}); res.end('{"error":"overloaded"}'); return; }
  activeRequests++;
  res.on("close", () => { activeRequests--; });
  res.setHeader("Content-Type", "application/json");
  if (req.url === "/health" || req.url === "/") {
    let status = null;
    try { status = engine ? engine.getStatus() : null; } catch {}
    res.writeHead(ready ? 200 : 503);
    res.end(safeStringify({ service: "transaction-engine", status: ready ? "healthy" : "starting", network: networkType, activeRequests, details: status }));
  } else if (req.url === "/metrics") {
    const mem = process.memoryUsage();
    const lines = [
      `# HELP process_uptime_seconds Service uptime in seconds`,
      `# TYPE process_uptime_seconds gauge`,
      `process_uptime_seconds{service="transaction-engine"} ${process.uptime().toFixed(3)}`,
      `# HELP nodejs_heap_used_bytes Node.js heap used bytes`,
      `# TYPE nodejs_heap_used_bytes gauge`,
      `nodejs_heap_used_bytes{service="transaction-engine"} ${mem.heapUsed}`,
      `# HELP service_active_requests Current in-flight HTTP requests`,
      `# TYPE service_active_requests gauge`,
      `service_active_requests{service="transaction-engine"} ${activeRequests}`,
      `# HELP service_ready Service readiness`,
      `# TYPE service_ready gauge`,
      `service_ready{service="transaction-engine"} ${ready ? 1 : 0}`,
    ].join("\n");
    res.writeHead(200, { "Content-Type": "text/plain; version=0.0.4; charset=utf-8" });
    res.end(lines + "\n");
  } else {
    res.writeHead(404); res.end('{"error":"not found"}');
  }
});

server.maxConnections = MAX_CONNECTIONS;
server.keepAliveTimeout = 65_000;
server.listen(PORT, "0.0.0.0", () => console.log(`🩺 Transaction Engine health on :${PORT}`));

async function start() {
  const { initializeHyperTransactionEngine, piHyperTransactionEngine } = await import("../../lib/pi-transaction/pi-hyper-transaction-engine");
  await initializeHyperTransactionEngine();
  engine = piHyperTransactionEngine;
  ready = true;
  console.log(`✅ Transaction Engine ONLINE — network=${networkType}`);
}

start().catch((err) => { console.error("❌ Transaction Engine failed:", err); process.exit(1); });

function shutdown(sig: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`⏳ ${sig} — draining…`);
  server.close(() => { try { engine?.stop(); } catch {} process.exit(0); });
  setTimeout(() => process.exit(1), 15_000).unref();
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

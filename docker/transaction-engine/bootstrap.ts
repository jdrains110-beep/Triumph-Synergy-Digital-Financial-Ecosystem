/**
 * Transaction Engine Bootstrap — HTTP health server on :8080 with backpressure
 */
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
    res.writeHead(200);
    res.end(safeStringify({ active_requests: activeRequests, ready, uptime_s: process.uptime(), memory: process.memoryUsage() }));
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

/**
 * Smart Contracts Bootstrap — HTTP health server on :8082 with backpressure
 */
import http from "node:http";
import { PiSmartContractEngine } from "../../lib/pi-transaction/pi-smart-contracts";

const PORT = 8082;
const networkType = (process.env.PI_NETWORK_MODE || "mainnet") as "mainnet" | "testnet";
const safeStringify = (o: unknown) => JSON.stringify(o, (_k, v) => typeof v === "bigint" ? v.toString() : v);
let engine: PiSmartContractEngine | null = null;
let ready = false;
let shuttingDown = false;
let activeRequests = 0;
const MAX_CONCURRENT = 150;

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
    res.end(safeStringify({ service: "smart-contracts", status: ready ? "healthy" : "starting", network: networkType, activeRequests, details: status }));
  } else if (req.url === "/metrics") {
    res.writeHead(200);
    res.end(safeStringify({ active_requests: activeRequests, ready, uptime_s: process.uptime(), memory: process.memoryUsage() }));
  } else {
    res.writeHead(404); res.end('{"error":"not found"}');
  }
});

server.maxConnections = 400;
server.keepAliveTimeout = 65_000;
server.listen(PORT, "0.0.0.0", () => console.log(`🩺 Smart Contracts health on :${PORT}`));

async function start() {
  const { initializeSmartContractEngine, piSmartContractEngine } = await import("../../lib/pi-transaction/pi-smart-contracts");
  await initializeSmartContractEngine();
  engine = piSmartContractEngine;
  ready = true;
  console.log(`✅ Smart Contracts ONLINE — network=${networkType}`);
}

start().catch((err) => { console.error("❌ Smart Contracts failed:", err); process.exit(1); });

function shutdown(sig: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`⏳ ${sig} — draining…`);
  server.close(() => { try { engine?.stop(); } catch {} process.exit(0); });
  setTimeout(() => process.exit(1), 15_000).unref();
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

/**
 * SCP Auto-Upgrade Bootstrap — HTTP health server on :8083 with backpressure
 */
import http from "node:http";
import { PiSCPAutoUpgradeManager } from "../../lib/pi-transaction/pi-scp-auto-upgrade";

const PORT = 8083;
const networkType = (process.env.PI_NETWORK_MODE || "mainnet") as "mainnet" | "testnet";
const safeStringify = (o: unknown) => JSON.stringify(o, (_k, v) => typeof v === "bigint" ? v.toString() : v);
let manager: PiSCPAutoUpgradeManager | null = null;
let ready = false;
let shuttingDown = false;
let activeRequests = 0;
const MAX_CONCURRENT = 100;

const server = http.createServer((req, res) => {
  if (shuttingDown) { res.writeHead(503); res.end('{"error":"shutting down"}'); return; }
  if (activeRequests >= MAX_CONCURRENT) { res.writeHead(503, {"Retry-After":"1"}); res.end('{"error":"overloaded"}'); return; }
  activeRequests++;
  res.on("close", () => { activeRequests--; });
  res.setHeader("Content-Type", "application/json");
  if (req.url === "/health" || req.url === "/") {
    let status = null;
    try { status = manager ? manager.getStatus() : null; } catch {}
    res.writeHead(ready ? 200 : 503);
    res.end(safeStringify({ service: "scp-upgrader", status: ready ? "healthy" : "starting", network: networkType, activeRequests, details: status }));
  } else if (req.url === "/metrics") {
    res.writeHead(200);
    res.end(safeStringify({ active_requests: activeRequests, ready, uptime_s: process.uptime(), memory: process.memoryUsage() }));
  } else {
    res.writeHead(404); res.end('{"error":"not found"}');
  }
});

server.maxConnections = 300;
server.keepAliveTimeout = 65_000;
server.listen(PORT, "0.0.0.0", () => console.log(`🩺 SCP Upgrader health on :${PORT}`));

async function start() {
  const { initializeSCPAutoUpgrade, piSCPAutoUpgradeManager } = await import("../../lib/pi-transaction/pi-scp-auto-upgrade");
  await initializeSCPAutoUpgrade(networkType);
  manager = piSCPAutoUpgradeManager;
  ready = true;
  console.log(`✅ SCP Upgrader ONLINE — network=${networkType}`);
}

start().catch((err) => { console.error("❌ SCP Upgrader failed:", err); process.exit(1); });

function shutdown(sig: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`⏳ ${sig} — draining…`);
  server.close(() => { try { manager?.stop(); } catch {} process.exit(0); });
  setTimeout(() => process.exit(1), 15_000).unref();
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

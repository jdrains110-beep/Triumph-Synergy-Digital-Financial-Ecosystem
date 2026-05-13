/**
 * Smart Contracts Bootstrap — HTTP health server on :8082 with backpressure
 */
// Copyright (C) 2024-2026 Jeremiah Joel Drains, Founder & Superior Sovereign / Triumph Synergy. All rights reserved.
// License: PiOS

import http from "node:http";
import { PiSmartContractEngine } from "../../lib/pi-transaction/pi-smart-contracts";

const PORT = 8082;
const networkType = "mainnet" as const; // mainnet-only mandate (Pi Network + Stellar Protocol 24)
const PI_BRIDGE_URL = process.env.PI_BRIDGE_URL || "http://triumph-pi-bridge-connector:8092";
const CENTRAL_NODE_URL = process.env.CENTRAL_NODE_URL || "http://triumph-central-node:11626";
const CENTRAL_NODE_PUBLIC_KEY = process.env.CENTRAL_NODE_PUBLIC_KEY || "GA6Z5STFJZPBDQT5VZSDUTCKLXXB626ONTLRWBJAWYKLH4LKPIZCGL7V";
const safeStringify = (o: unknown) => JSON.stringify(o, (_k, v) => typeof v === "bigint" ? v.toString() : v);
let engine: PiSmartContractEngine | null = null;
let ready = false;
let shuttingDown = false;
let activeRequests = 0;
const MAX_CONCURRENT = 150;

async function fetchJson(url: string, init?: RequestInit): Promise<{ status: number; body: unknown }> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.headers || {}),
    },
    signal: AbortSignal.timeout(10_000),
  });
  const text = await response.text();
  return {
    status: response.status,
    body: text ? JSON.parse(text) as unknown : null,
  };
}

function readJsonBody(req: http.IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    req.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf8").trim();
        resolve(raw ? JSON.parse(raw) as Record<string, unknown> : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function sendJson(res: http.ServerResponse, status: number, payload: unknown) {
  res.writeHead(status);
  res.end(safeStringify(payload));
}

const server = http.createServer((req, res) => {
  if (shuttingDown) { res.writeHead(503); res.end('{"error":"shutting down"}'); return; }
  if (activeRequests >= MAX_CONCURRENT) { res.writeHead(503, {"Retry-After":"1"}); res.end('{"error":"overloaded"}'); return; }
  activeRequests++;
  res.on("close", () => { activeRequests--; });
  res.setHeader("Content-Type", "application/json");
  const requestUrl = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  const pathname = requestUrl.pathname;
  if (pathname === "/health" || pathname === "/") {
    let status = null;
    try { status = engine ? engine.getStatus() : null; } catch {}
    res.writeHead(ready ? 200 : 503);
    res.end(safeStringify({ service: "smart-contracts", status: ready ? "healthy" : "starting", network: networkType, activeRequests, rpc: { piBridgeUrl: PI_BRIDGE_URL, centralNodeUrl: CENTRAL_NODE_URL, centralNodePublicKey: CENTRAL_NODE_PUBLIC_KEY, supernodeMode: true }, details: status }));
  } else if (pathname === "/metrics") {
    const mem = process.memoryUsage();
    const lines = [
      `# HELP process_uptime_seconds Service uptime in seconds`,
      `# TYPE process_uptime_seconds gauge`,
      `process_uptime_seconds{service="smart-contracts"} ${process.uptime().toFixed(3)}`,
      `# HELP nodejs_heap_used_bytes Node.js heap used bytes`,
      `# TYPE nodejs_heap_used_bytes gauge`,
      `nodejs_heap_used_bytes{service="smart-contracts"} ${mem.heapUsed}`,
      `# HELP service_active_requests Current in-flight HTTP requests`,
      `# TYPE service_active_requests gauge`,
      `service_active_requests{service="smart-contracts"} ${activeRequests}`,
      `# HELP service_ready Service readiness`,
      `# TYPE service_ready gauge`,
      `service_ready{service="smart-contracts"} ${ready ? 1 : 0}`,
    ].join("\n");
    res.writeHead(200, { "Content-Type": "text/plain; version=0.0.4; charset=utf-8" });
    res.end(lines + "\n");
  } else if (pathname === "/rpc/supernode/status") {
    Promise.all([
      fetchJson(`${PI_BRIDGE_URL}/bridge/status`),
      fetchJson(`${CENTRAL_NODE_URL}/info`),
      fetchJson(`${PI_BRIDGE_URL}/pi-node/status`),
    ]).then(([bridge, central, piNode]) => {
      sendJson(res, ready ? 200 : 503, {
        service: "smart-contracts",
        network: networkType,
        central_node_public_key: CENTRAL_NODE_PUBLIC_KEY,
        superior_rpc: true,
        topology: {
          role: "central-supernode-contract-orchestrator",
          central_node: central.body,
          pi_desktop_supernode: piNode.body,
          bridge: bridge.body,
          consensus: {
            protocol: "Stellar SCP",
            passphrase: process.env.STELLAR_NETWORK_PASSPHRASE || "Pi Network",
            coupling: "mutual-supernode-support",
          },
        },
        engine: engine?.getStatus() || null,
      });
    }).catch((error) => {
      sendJson(res, 503, { error: "supernode status unavailable", details: (error as Error).message });
    });
  } else if (pathname === "/rpc/supernode/consensus") {
    Promise.all([
      fetchJson(`${PI_BRIDGE_URL}/bridge/status`),
      fetchJson(`${CENTRAL_NODE_URL}/supernode/status`),
    ]).then(([bridge, central]) => {
      sendJson(res, 200, {
        role: "consensus-coordinator",
        central_node: central.body,
        bridge: bridge.body,
        supernode_mesh: {
          primary: CENTRAL_NODE_PUBLIC_KEY,
          secondary: "pi-desktop-pi-node",
          protocol: "Stellar SCP",
          mode: "supporting-each-other",
        },
      });
    }).catch((error) => {
      sendJson(res, 503, { error: "consensus status unavailable", details: (error as Error).message });
    });
  } else if (pathname.startsWith("/rpc/account/")) {
    const address = pathname.slice("/rpc/account/".length);
    fetchJson(`${PI_BRIDGE_URL}/pi-node/account/${address}`).then(({ status, body }) => {
      sendJson(res, status, body);
    }).catch((error) => {
      sendJson(res, 503, { error: "account lookup failed", details: (error as Error).message });
    });
  } else if (pathname === "/rpc/transactions") {
    const address = requestUrl.searchParams.get("address");
    const limit = requestUrl.searchParams.get("limit") || "20";
    const order = requestUrl.searchParams.get("order") || "desc";
    const target = address
      ? `${PI_BRIDGE_URL}/pi-node/transactions/account/${address}?limit=${encodeURIComponent(limit)}`
      : `${PI_BRIDGE_URL}/pi-node/transactions?limit=${encodeURIComponent(limit)}&order=${encodeURIComponent(order)}`;
    fetchJson(target).then(({ status, body }) => {
      sendJson(res, status, body);
    }).catch((error) => {
      sendJson(res, 503, { error: "transaction lookup failed", details: (error as Error).message });
    });
  } else if (pathname === "/rpc/fee-stats") {
    fetchJson(`${PI_BRIDGE_URL}/pi-node/fee-stats`).then(({ status, body }) => {
      sendJson(res, status, body);
    }).catch((error) => {
      sendJson(res, 503, { error: "fee stats unavailable", details: (error as Error).message });
    });
  } else if (pathname.startsWith("/rpc/horizon/")) {
    const relayPath = pathname.slice("/rpc/horizon/".length);
    const query = requestUrl.searchParams.toString();
    const target = `${PI_BRIDGE_URL}/bridge/relay/${relayPath}${query ? `?${query}` : ""}`;
    fetchJson(target).then(({ status, body }) => {
      sendJson(res, status, body);
    }).catch((error) => {
      sendJson(res, 503, { error: "horizon relay failed", details: (error as Error).message });
    });
  } else if (pathname === "/rpc/submit" && req.method === "POST") {
    readJsonBody(req).then((payload) => {
      return fetchJson(`${PI_BRIDGE_URL}/pi-node/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }).then(({ status, body }) => {
      sendJson(res, status, body);
    }).catch((error) => {
      sendJson(res, 503, { error: "transaction submission failed", details: (error as Error).message });
    });
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

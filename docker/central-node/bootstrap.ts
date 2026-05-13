/**
 * Central Node Bootstrap — wraps the Pi Transaction System with an HTTP health server
 * Exposes /info on port 11626 (Stellar Core compatible)
 *
 * Backpressure:
 *   - Request queue with max depth to shed load under pressure
 *   - Per-IP rate limiting to prevent any single client from overwhelming
 *   - Connection cap to protect the Node.js event loop
 *   - Graceful 503 when the system is still booting or overloaded
 */
// Copyright (C) 2024-2026 Jeremiah Joel Drains, Founder & Superior Sovereign / Triumph Synergy. All rights reserved.
// License: PiOS

import http from "node:http";
import crypto from "node:crypto";
import { initializePiTransactionSystem, getPiTransactionSystemStatus, shutdownPiTransactionSystem } from "../../lib/pi-transaction/index";

const HEALTH_PORT = 11626;
const networkType = "mainnet" as const; // mainnet-only mandate (Pi Network + Stellar Protocol 23)
const startedAt = new Date().toISOString();
let systemReady = false;
let shuttingDown = false;

// Horizon URL — prefer local Pi node via pi-bridge-connector over external internet
// Priority: PI_BRIDGE_URL (new) > PI_INTERNAL_HORIZON_URL > PI_NODE via bridge > external fallback
const PI_NODE_HOST     = process.env.PI_NODE_HOST;
const PI_NODE_API_PORT = process.env.PI_NODE_API_PORT || "8000";
const PI_BRIDGE_URL    = process.env.PI_BRIDGE_URL; // e.g. http://triumph-pi-bridge-connector:8092
const PI_INTERNAL_HORIZON = process.env.PI_INTERNAL_HORIZON_URL;
const CONTRACTS_URL    = process.env.CONTRACTS_URL || "http://triumph-smart-contracts:8082";

// Resolve the Horizon endpoint — prefer resilient bridge proxy first.
function resolveHorizonUrl(): string {
  // 1. Explicit internal override (usually pi-bridge /pi-node)
  if (PI_INTERNAL_HORIZON) return PI_INTERNAL_HORIZON;
  // 2. Pi bridge relay (goes through connector to Pi node with retries/cache)
  if (PI_BRIDGE_URL) return `${PI_BRIDGE_URL}/pi-node`;
  // 3. Direct local Pi node Horizon
  if (PI_NODE_HOST && PI_NODE_HOST !== "host.docker.internal") {
    return `http://${PI_NODE_HOST}:${PI_NODE_API_PORT}`;
  }
  // 4. Configured fallback
  if (process.env.STELLAR_HORIZON_URL) return process.env.STELLAR_HORIZON_URL;
  // 5. External Pi Horizon (last resort — external internet)
  return "https://api.mainnet.minepi.com";
}
const HORIZON_URL = resolveHorizonUrl();
const USING_BRIDGE_PROXY = /\/pi-node\/?$/.test(HORIZON_URL);
const CENTRAL_KEY = process.env.CENTRAL_NODE_PUBLIC_KEY || "GA6Z5STFJZPBDQT5VZSDUTCKLXXB626ONTLRWBJAWYKLH4LKPIZCGL7V";

console.log(`[Central Node] Horizon URL: ${HORIZON_URL} (PI_NODE_HOST=${PI_NODE_HOST ?? "unset"})`);

// ── Production guard: refuse to start without a join secret ─────────────────
// An unguarded /supernode/join endpoint in a live deployment lets any caller
// self-register as an APEX-QUANTUM-NODE.  Fail loudly so operators are forced
// to configure the secret before traffic reaches the service.
if (!process.env.SUPERNODE_JOIN_SECRET && process.env.NODE_ENV === "production") {
  console.error(
    "❌ FATAL: SUPERNODE_JOIN_SECRET must be set in production. " +
    "An unset secret leaves /supernode/join unauthenticated. " +
    "Generate one with:  openssl rand -hex 32"
  );
  process.exit(1);
}

// ── Timing-safe secret comparison ───────────────────────────────────────────
// Hashes both strings to SHA-256 digests (constant length) before comparing
// with timingSafeEqual, so neither the secret length nor a mismatch position
// is leaked via timing.
function timingSafeSecretEqual(a: string, b: string): boolean {
  const ha = crypto.createHash("sha256").update(a).digest();
  const hb = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}


// Multi-supernode topology: this node + N peer supernodes that mutually
// power each other. Any node that connects via /supernode/join is upgraded
// to apex-quantum status and added to the peer registry, boosting the mesh.
const SUPERNODE_ROLE = (process.env.SUPERNODE_ROLE || "primary") as "primary" | "peer";
const SUPERNODE_ID = process.env.SUPERNODE_ID || (SUPERNODE_ROLE === "primary" ? "central-node" : "supernode-peer");
const SUPERNODE_PEERS = (process.env.SUPERNODE_PEERS || "")
  .split(",").map(s => s.trim()).filter(Boolean);
const APEX_AUTO_UPGRADE = (process.env.APEX_AUTO_UPGRADE ?? "true") !== "false";
const QUANTUM_FORTRESS_URL = process.env.QUANTUM_FORTRESS_URL || process.env.QUANTUM_SHIELD_URL || "http://triumph-quantum-fortress:8094";

interface PeerEntry {
  id: string;
  url: string;
  role: "primary" | "peer" | "joined";
  apex_quantum: boolean;
  upgraded_at: string;
  last_seen: string;
  last_status: "healthy" | "degraded" | "unreachable";
  pq_algorithms: string[];
  boost_factor: number;
}
const peerRegistry = new Map<string, PeerEntry>();

function registerPeer(id: string, url: string, role: PeerEntry["role"]): PeerEntry {
  const now = new Date().toISOString();
  const existing = peerRegistry.get(id);
  const entry: PeerEntry = existing ?? {
    id, url, role,
    apex_quantum: APEX_AUTO_UPGRADE,
    upgraded_at: now,
    last_seen: now,
    last_status: "healthy",
    pq_algorithms: ["ML-KEM-1024", "ML-DSA-87", "SPHINCS+-SHAKE-256f"],
    boost_factor: 1,
  };
  entry.url = url;
  entry.role = role;
  entry.last_seen = now;
  entry.boost_factor = peerRegistry.size + 1; // every join boosts the mesh
  peerRegistry.set(id, entry);
  return entry;
}

// Seed the peer registry from SUPERNODE_PEERS at boot
for (const url of SUPERNODE_PEERS) {
  const id = url.replace(/^https?:\/\//, "").replace(/[:/].*$/, "") || url;
  registerPeer(id, url, "peer");
}

async function pollPeer(entry: PeerEntry): Promise<void> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 5_000);
  try {
    const r = await fetch(`${entry.url.replace(/\/$/, "")}/supernode/status`, {
      headers: { Accept: "application/json" }, signal: ctrl.signal,
    });
    entry.last_seen = new Date().toISOString();
    entry.last_status = r.ok ? "healthy" : "degraded";
  } catch {
    entry.last_status = "unreachable";
  } finally {
    clearTimeout(t);
  }
}

async function pollAllPeers(): Promise<void> {
  if (peerRegistry.size === 0) return;
  await Promise.allSettled([...peerRegistry.values()].map(pollPeer));
}

// Mutually announce ourselves to seed peers — they'll register us back
async function announceToPeers(): Promise<void> {
  const selfUrl = process.env.SUPERNODE_SELF_URL || `http://${process.env.HOSTNAME || SUPERNODE_ID}:11626`;
  const JOIN_SECRET = process.env.SUPERNODE_JOIN_SECRET;
  for (const peer of peerRegistry.values()) {
    if (peer.role !== "peer") continue;
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 5_000);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (JOIN_SECRET) headers["Authorization"] = `Bearer ${JOIN_SECRET}`;
      await fetch(`${peer.url.replace(/\/$/, "")}/supernode/join`, {
        method: "POST",
        headers,
        signal: ctrl.signal,
        body: JSON.stringify({
          id: SUPERNODE_ID, url: selfUrl, role: SUPERNODE_ROLE,
          public_key: CENTRAL_KEY, network: networkType,
        }),
      });
    } catch { /* silent — peer may not be up yet */ }
    finally { clearTimeout(t); }
  }
}

setInterval(pollAllPeers, 15_000).unref();
setInterval(announceToPeers, 30_000).unref();
// Initial best-effort announce after 5s
setTimeout(announceToPeers, 5_000).unref();
setTimeout(pollAllPeers,    7_000).unref();

function supernodeTopology() {
  const peers = [...peerRegistry.values()];
  return {
    mode: "mutual-supernode-support",
    apex_quantum_mesh: true,
    self: {
      id: SUPERNODE_ID,
      role: SUPERNODE_ROLE,
      public_key: CENTRAL_KEY,
      apex_quantum: true,
      pq_algorithms: ["ML-KEM-1024", "ML-DSA-87", "SPHINCS+-SHAKE-256f"],
      quantum_fortress_url: QUANTUM_FORTRESS_URL,
    },
    primary_role: "central-node",
    secondary_role: "pi-desktop-pi-node",
    central_node_public_key: CENTRAL_KEY,
    pi_desktop_node: {
      host: PI_NODE_HOST || "host.docker.internal",
      api_port: Number(PI_NODE_API_PORT),
      peer_port: Number(process.env.PI_NODE_PORT || 31402),
      bridge_url: PI_BRIDGE_URL || "http://triumph-pi-bridge-connector:8092",
    },
    peer_supernodes: peers,
    peer_count: peers.length,
    apex_boost: peers.reduce((a, p) => a + (p.last_status === "healthy" ? p.boost_factor : 0), 1),
    smart_contract_platform: {
      url: CONTRACTS_URL,
      rpc_status_endpoint: `${CONTRACTS_URL}/rpc/supernode/status`,
      rpc_submit_endpoint: `${CONTRACTS_URL}/rpc/submit`,
    },
    consensus: {
      protocol: "Stellar SCP",
      protocol_version: Number(process.env.PI_PROTOCOL_VERSION ?? 23),
      protocol_version_label: `scp-v${process.env.PI_PROTOCOL_VERSION ?? 23}`,
      stellar_core_version: process.env.STELLAR_CORE_VERSION ?? "v23.0.0",
      auto_protocol_update: true,
      horizon_url: HORIZON_URL,
      network: "mainnet",
      network_passphrase: process.env.STELLAR_NETWORK_PASSPHRASE || "Pi Network",
      local_horizon_preferred: HORIZON_URL.startsWith("http://"),
      pq_required: process.env.SCP_REQUIRE_PQ_SIGNATURE === "true",
    },
  };
}

// Cached blockchain state (refreshed periodically)
let chainAccount: { sequence: string; balances: unknown[]; lastChecked: string } | null = null;
let chainLedger: { sequence: number; hash: string; closed_at: string } | null = null;
let chainError: string | null = null;

async function refreshChainState() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000); // Pi node can be slow under load
  try {
    const accountPath = USING_BRIDGE_PROXY
      ? `/account/${CENTRAL_KEY}`
      : `/accounts/${CENTRAL_KEY}`;
    const ledgerPath = USING_BRIDGE_PROXY
      ? `/ledger`
      : `/ledgers?order=desc&limit=1`;

    const [acctRes, ledgerRes] = await Promise.all([
      fetch(`${HORIZON_URL}${accountPath}`, {
        headers: { Accept: "application/json" },
        signal: controller.signal,
      }),
      fetch(`${HORIZON_URL}${ledgerPath}`, {
        headers: { Accept: "application/json" },
        signal: controller.signal,
      }),
    ]);
    if (acctRes.ok) {
      const acct = await acctRes.json() as Record<string, unknown>;
      chainAccount = {
        sequence: String(acct.sequence ?? ""),
        balances: (acct.balances ?? []) as unknown[],
        lastChecked: new Date().toISOString(),
      };
      chainError = null;
    } else if (acctRes.status === 404) {
      // Account not yet funded on-chain — valid state for new nodes
      chainAccount = {
        sequence: "0",
        balances: [],
        lastChecked: new Date().toISOString(),
      };
      chainError = "account_not_funded";
    } else {
      chainError = `Account ${acctRes.status}: ${acctRes.statusText}`;
    }
    if (ledgerRes.ok) {
      const body = await ledgerRes.json() as Record<string, unknown>;
      const rec = USING_BRIDGE_PROXY
        ? (body as Record<string, unknown>)
        : (((body as Record<string, Record<string, unknown[]>>)?._embedded?.records ?? [])[0] as Record<string, unknown> | undefined);
      if (rec) {
        chainLedger = {
          sequence: Number(rec.sequence ?? 0),
          hash: String(rec.hash ?? ""),
          closed_at: String(rec.closed_at ?? ""),
        };
      }
    }
    // Only clear non-account errors (preserve "account_not_funded" status)
    if (chainError && chainError !== "account_not_funded") {
      chainError = null;
    }
  } catch (err) {
    chainError = (err as Error).message;
    console.warn(`[Chain] Horizon refresh failed: ${chainError}`);
  } finally {
    clearTimeout(timeout);
  }
}

// Refresh chain state every 60 seconds — Pi mainnet node is slow to respond under load;
// cached data is sufficient for status endpoints.
refreshChainState();
const chainRefreshInterval = setInterval(refreshChainState, 60_000);
chainRefreshInterval.unref();

// BigInt-safe JSON serializer — prevents "Do not know how to serialize a BigInt" crash
function safeStringify(obj: unknown, indent?: number): string {
  return JSON.stringify(obj, (_key, value) =>
    typeof value === "bigint" ? value.toString() : value
  , indent);
}

// ── Backpressure settings ────────────────────────────────────────────────
const MAX_CONCURRENT = 200;          // max in-flight requests
const MAX_CONNECTIONS = 500;         // max open sockets
const RATE_WINDOW_MS = 60_000;       // 1-minute sliding window
const RATE_MAX_PER_IP = 300;         // max requests per IP per window
const REQUEST_TIMEOUT_MS = 10_000;   // per-request timeout

let activeRequests = 0;
const ipHits = new Map<string, { count: number; resetAt: number }>();

// Sweep stale IP entries every 2 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of ipHits) {
    if (now > entry.resetAt) ipHits.delete(ip);
  }
}, 120_000).unref();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  let entry = ipHits.get(ip);
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + RATE_WINDOW_MS };
    ipHits.set(ip, entry);
  }
  entry.count++;
  return entry.count > RATE_MAX_PER_IP;
}

// ── HTTP server ──────────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  // Connection-level backpressure
  if (shuttingDown) {
    res.writeHead(503, { "Retry-After": "5" });
    res.end('{"error":"shutting down"}');
    return;
  }
  if (activeRequests >= MAX_CONCURRENT) {
    res.writeHead(503, { "Retry-After": "1" });
    res.end('{"error":"overloaded","hint":"try again shortly"}');
    return;
  }

  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim()
            || req.socket.remoteAddress || "unknown";
  if (isRateLimited(ip)) {
    res.writeHead(429, { "Retry-After": "10" });
    res.end('{"error":"rate limited"}');
    return;
  }

  activeRequests++;
  const timer = setTimeout(() => {
    if (!res.writableEnded) {
      res.writeHead(504);
      res.end('{"error":"request timeout"}');
    }
  }, REQUEST_TIMEOUT_MS);

  const finish = () => { clearTimeout(timer); activeRequests--; };
  res.on("close", finish);

  const url = req.url || "/";
  res.setHeader("Content-Type", "application/json");

  if (url === "/info" || url === "/health" || url === "/") {
    let status: ReturnType<typeof getPiTransactionSystemStatus> | null = null;
    try {
      status = systemReady ? getPiTransactionSystemStatus() : null;
    } catch { /* swallow — status is optional telemetry */ }

    const payload = {
      info: {
        state: systemReady ? "Synced!" : "Booting",
        network: networkType,
        build: "triumph-central-node-v5.4",
        startedAt,
        central_node: CENTRAL_KEY,
        horizon_url: HORIZON_URL,
        protocol_version: chainLedger?.sequence ? 21 : 0,
        ledger: chainLedger ?? { num: 0, hash: "awaiting", closed_at: "" },
        blockchain: {
          connected: chainAccount !== null,
          account_status: chainError === "account_not_funded" ? "not_funded_on_chain" : chainError ? "error" : "active",
          error: chainError === "account_not_funded" ? null : chainError,
          account: chainAccount ? {
            address: CENTRAL_KEY,
            sequence: chainAccount.sequence,
            balances: chainAccount.balances,
            lastChecked: chainAccount.lastChecked,
          } : null,
        },
        ecosystem: {
          transaction_engine: status?.transactionEngine ?? "pending",
          vault_manager: status?.vaultManager ?? "pending",
          smart_contracts: status?.smartContractEngine ?? "pending",
          scp_upgrader: status?.scpUpgradeManager ?? "pending",
        },
        pi_node_host: process.env.PI_NODE_HOST || "host.docker.internal",
        pi_node_port: process.env.PI_NODE_PORT || 31402,
        pi_bridge_url: PI_BRIDGE_URL || `http://triumph-pi-bridge-connector:8092`,
        using_bridge_proxy: USING_BRIDGE_PROXY,
        pi_bridge_active: !!(PI_NODE_HOST && PI_NODE_HOST !== "host.docker.internal"),
        horizon_resolves_local: HORIZON_URL.startsWith("http://"),
        supernode_topology: supernodeTopology(),
        backpressure: { activeRequests, maxConcurrent: MAX_CONCURRENT },
      },
    };
    res.writeHead(systemReady ? 200 : 503);
    res.end(safeStringify(payload, 2));
  } else if (url === "/supernode/status") {
    res.writeHead(systemReady ? 200 : 503);
    res.end(safeStringify({
      status: systemReady ? "healthy" : "starting",
      network: networkType,
      topology: supernodeTopology(),
      blockchain: {
        connected: chainAccount !== null,
        latest_ledger: chainLedger,
        chain_error: chainError,
      },
    }, 2));
  } else if (url === "/supernode/peers") {
    res.writeHead(200);
    res.end(safeStringify({
      self: { id: SUPERNODE_ID, role: SUPERNODE_ROLE, public_key: CENTRAL_KEY },
      apex_quantum_mesh: true,
      peer_count: peerRegistry.size,
      apex_boost: [...peerRegistry.values()].reduce(
        (a, p) => a + (p.last_status === "healthy" ? p.boost_factor : 0), 1),
      peers: [...peerRegistry.values()],
    }, 2));
  } else if (url === "/supernode/join" && req.method === "POST") {
    // ── Auth guard ────────────────────────────────────────────────────────────
    // If SUPERNODE_JOIN_SECRET is set, require a matching Bearer token so that
    // only trusted peers can self-register. Without a secret the endpoint is
    // unrestricted (backwards-compatible for single-host dev setups).
    const JOIN_SECRET = process.env.SUPERNODE_JOIN_SECRET;
    if (JOIN_SECRET) {
      const authHeader = req.headers["authorization"] || "";
      const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
      if (!timingSafeSecretEqual(token, JOIN_SECRET)) {
        res.writeHead(401);
        res.end('{"error":"unauthorized"}');
        return;
      }
    }
    let body = "";
    req.on("data", (c) => { body += c; if (body.length > 8192) req.destroy(); });
    req.on("end", () => {
      try {
        const j = JSON.parse(body || "{}") as {
          id?: string; url?: string; role?: string; public_key?: string;
        };
        if (!j.id || !j.url) {
          res.writeHead(400);
          res.end('{"error":"id and url required"}');
          return;
        }
        const entry = registerPeer(j.id, j.url, "joined");
        res.writeHead(200);
        res.end(safeStringify({
          accepted: true,
          apex_quantum_upgraded: true,
          mesh_boost_factor: entry.boost_factor,
          message: `${j.id} upgraded to APEX-QUANTUM-NODE — mesh boosted to ${peerRegistry.size + 1} nodes`,
          assigned: entry,
          mesh_size: peerRegistry.size + 1,
        }, 2));
      } catch {
        // Return a generic error — never leak internal exception details
        res.writeHead(400);
        res.end('{"error":"invalid request body"}');
      }
    });
  } else if (url === "/metrics") {
    const mem = process.memoryUsage();
    const lines = [
      "# HELP triumph_central_node_active_requests Current in-flight requests",
      "# TYPE triumph_central_node_active_requests gauge",
      `triumph_central_node_active_requests ${activeRequests}`,
      "# HELP triumph_central_node_max_concurrent Configured concurrency limit",
      "# TYPE triumph_central_node_max_concurrent gauge",
      `triumph_central_node_max_concurrent ${MAX_CONCURRENT}`,
      "# HELP triumph_central_node_tracked_ips Distinct IPs seen in rate-limit window",
      "# TYPE triumph_central_node_tracked_ips gauge",
      `triumph_central_node_tracked_ips ${ipHits.size}`,
      "# HELP triumph_central_node_ready Whether the node finished initializing",
      "# TYPE triumph_central_node_ready gauge",
      `triumph_central_node_ready ${systemReady ? 1 : 0}`,
      "# HELP process_uptime_seconds Process uptime in seconds",
      "# TYPE process_uptime_seconds counter",
      `process_uptime_seconds ${process.uptime().toFixed(3)}`,
      "# HELP process_resident_memory_bytes RSS memory in bytes",
      "# TYPE process_resident_memory_bytes gauge",
      `process_resident_memory_bytes ${mem.rss}`,
      "# HELP process_heap_bytes Heap used in bytes",
      "# TYPE process_heap_bytes gauge",
      `process_heap_bytes ${mem.heapUsed}`,
    ];
    res.writeHead(200, { "Content-Type": "text/plain; version=0.0.4; charset=utf-8" });
    res.end(lines.join("\n") + "\n");
  } else {
    res.writeHead(404);
    res.end('{"error":"not found"}');
  }
});

server.maxConnections = MAX_CONNECTIONS;
server.keepAliveTimeout = 65_000;
server.headersTimeout = 70_000;

server.listen(HEALTH_PORT, "0.0.0.0", () => {
  console.log(`🩺 Central Node health server on :${HEALTH_PORT} (max ${MAX_CONCURRENT} concurrent, ${RATE_MAX_PER_IP} req/min/ip)`);
});

server.on("error", (err) => {
  console.error("❌ Central Node HTTP server error:", err);
});

// ── Start the Pi Transaction System ──────────────────────────────────────
initializePiTransactionSystem({ networkType })
  .then(() => {
    systemReady = true;
    console.log(`✅ Central Node ONLINE — network=${networkType}`);
  })
  .catch((err) => {
    console.error("❌ Central Node failed to start:", err);
    process.exit(1);
  });

// ── Graceful shutdown ────────────────────────────────────────────────────
function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\n⏳ Received ${signal} — graceful shutdown…`);
  server.close(() => {
    try { shutdownPiTransactionSystem(); } catch {}
    console.log("✅ Central Node stopped.");
    process.exit(0);
  });
  // Force exit after 15s if connections don't drain
  setTimeout(() => { console.error("⚠️ Force exit after timeout"); process.exit(1); }, 15_000).unref();
}
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

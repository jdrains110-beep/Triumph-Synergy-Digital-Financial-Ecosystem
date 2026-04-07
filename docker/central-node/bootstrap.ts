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
import http from "node:http";
import { initializePiTransactionSystem, getPiTransactionSystemStatus, shutdownPiTransactionSystem } from "../../lib/pi-transaction/index";

const HEALTH_PORT = 11626;
const networkType = (process.env.PI_NETWORK_MODE || "mainnet") as "mainnet" | "testnet";
const startedAt = new Date().toISOString();
let systemReady = false;
let shuttingDown = false;

// Horizon URL for live blockchain queries
const HORIZON_URL = process.env.STELLAR_HORIZON_URL
  || (networkType === "mainnet" ? "https://api.mainnet.minepi.com" : "https://api.testnet.minepi.com");
const CENTRAL_KEY = process.env.CENTRAL_NODE_PUBLIC_KEY || "GA6Z5STFJZPBDQT5VZSDUTCKLXXB626ONTLRWBJAWYKLH4LKPIZCGL7V";

// Cached blockchain state (refreshed periodically)
let chainAccount: { sequence: string; balances: unknown[]; lastChecked: string } | null = null;
let chainLedger: { sequence: number; hash: string; closed_at: string } | null = null;
let chainError: string | null = null;

async function refreshChainState() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const [acctRes, ledgerRes] = await Promise.all([
      fetch(`${HORIZON_URL}/accounts/${CENTRAL_KEY}`, {
        headers: { Accept: "application/json" },
        signal: controller.signal,
      }),
      fetch(`${HORIZON_URL}/ledgers?order=desc&limit=1`, {
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
      const rec = ((body as Record<string, Record<string, unknown[]>>)?._embedded?.records ?? [])[0] as Record<string, unknown> | undefined;
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

// Refresh chain state every 30 seconds
refreshChainState();
const chainRefreshInterval = setInterval(refreshChainState, 30_000);
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
        build: "triumph-central-node-v1.0.0",
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
        backpressure: { activeRequests, maxConcurrent: MAX_CONCURRENT },
      },
    };
    res.writeHead(systemReady ? 200 : 503);
    res.end(safeStringify(payload, 2));
  } else if (url === "/metrics") {
    res.writeHead(200);
    res.end(safeStringify({
      active_requests: activeRequests,
      max_concurrent: MAX_CONCURRENT,
      tracked_ips: ipHits.size,
      system_ready: systemReady,
      uptime_s: process.uptime(),
      memory: process.memoryUsage(),
    }));
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

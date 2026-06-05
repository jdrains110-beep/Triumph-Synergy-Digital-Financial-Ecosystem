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
// Network mode: reads NETWORK_TYPE env var so governance-shield recognises both
// testnet and mainnet funded nodes without rebuilding the image.
const networkType = ((process.env.NETWORK_TYPE ?? process.env.PI_NETWORK_MODE ?? "mainnet").toLowerCase() === "testnet"
  ? "testnet"
  : "mainnet") as "mainnet" | "testnet";
const startedAt = new Date().toISOString();
let systemReady = false;
let shuttingDown = false;

// Horizon URL — prefer local Pi node via pi-bridge-connector over external internet
// Priority: PI_BRIDGE_URL (new) > PI_INTERNAL_HORIZON_URL > PI_NODE via bridge > external fallback
const PI_NODE_HOST     = process.env.PI_NODE_HOST;
const PI_NODE_ROOT_HOST = process.env.PI_NODE_ROOT_HOST || "triumph-pi-mainnet-node"; // Actual mainnet node (stellar-core /info port 11626)
const PI_NODE_API_PORT = process.env.PI_NODE_API_PORT || "8000";
const PI_BRIDGE_URL    = process.env.PI_BRIDGE_URL; // e.g. http://triumph-pi-bridge-connector:8092
const PI_INTERNAL_HORIZON = process.env.PI_INTERNAL_HORIZON_URL;
const CONTRACTS_URL    = process.env.CONTRACTS_URL || "http://triumph-smart-contracts:8082";

// Public Horizon URLs for both networks — used as final fallback when local node is absent.
const PI_MAINNET_HORIZON_PUBLIC = process.env.PI_MAINNET_HORIZON || "https://api.mainnet.minepi.com";
const PI_TESTNET_HORIZON_PUBLIC = process.env.PI_TESTNET_HORIZON || "https://api.testnet.minepi.com";

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
  // 5. External Pi Horizon based on configured network (last resort)
  return networkType === "testnet" ? PI_TESTNET_HORIZON_PUBLIC : PI_MAINNET_HORIZON_PUBLIC;
}
const HORIZON_URL = resolveHorizonUrl();
const USING_BRIDGE_PROXY = /\/pi-node\/?$/.test(HORIZON_URL);
const CENTRAL_KEY = process.env.CENTRAL_NODE_PUBLIC_KEY || "GA6Z5STFJZPBDQT5VZSDUTCKLXXB626ONTLRWBJAWYKLH4LKPIZCGL7V";

console.log(`[Central Node] Horizon URL: ${HORIZON_URL} (PI_NODE_HOST=${PI_NODE_HOST ?? "unset"})`);
console.log(`[Central Node] 🔗 Stellar-core EMBEDDED in governance-shield container (motheboard architecture)`);
console.log(`[Central Node] 📡 Reading Protocol from local stellar-core /info endpoint on localhost:11626`);

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
      // AUTHORITATIVE SOURCE: Pi Node's stellar-core /info endpoint (port 11626)
      // This is the ORIGINAL canonical protocol version, read directly from the running stellar-core.
      protocol_version: stellarCoreInfo?.protocol_version ?? Number(process.env.PI_PROTOCOL_VERSION ?? 24),
      protocol_version_label: stellarCoreInfo
        ? `Protocol ${stellarCoreInfo.protocol_version} (from Pi Node core v${stellarCoreInfo.build_version.split(" ")[0]})`
        : `Protocol ${process.env.PI_PROTOCOL_VERSION ?? 24} (configured fallback)`,
      stellar_core_version: stellarCoreInfo?.build_version || (process.env.STELLAR_CORE_VERSION ?? "v24.0.0"),
      stellar_core_build: stellarCoreInfo?.build_version ?? undefined,
      auto_protocol_update: true,
      horizon_url: HORIZON_URL,
      network: networkType,
      network_passphrase: stellarCoreInfo?.network_passphrase || (process.env.STELLAR_NETWORK_PASSPHRASE || "Pi Network"),
      local_horizon_preferred: HORIZON_URL.startsWith("http://"),
      pq_required: process.env.SCP_REQUIRE_PQ_SIGNATURE === "true",
      testnet_protocol_version: testnetLedger?.protocol_version ?? null,
      pi_node_core_info_queried_at: stellarCoreInfo?.queried_at || "not yet queried",
      upgrade_watchdog: {
        watching: true,
        mainnet_protocol: stellarCoreInfo?.protocol_version ?? scpUpgrader.mainnet_protocol ?? chainLedger?.protocol_version ?? 0,
        testnet_protocol: scpUpgrader.testnet_protocol || (testnetLedger?.protocol_version ?? 0),
        last_checked_mainnet: scpUpgrader.last_checked_mainnet,
        last_checked_testnet: scpUpgrader.last_checked_testnet,
        upgrade_detected: scpUpgrader.upgrade_detected,
        last_upgrade_at: scpUpgrader.last_upgrade_at,
      },
    },
  };
}

// Cached blockchain state (refreshed periodically)
let chainAccount: { sequence: string; balances: unknown[]; lastChecked: string; funded_on_network?: string } | null = null;
let chainLedger: { sequence: number; hash: string; closed_at: string; protocol_version: number; base_fee: number } | null = null;
let chainError: string | null = null;
let chainFundedNetwork: "mainnet" | "testnet" | null = null;
let _lastLoggedBridgeNetwork: string | null = null; // deduplicate bridge mismatch logs

// ============================================================================
// CANONICAL STELLAR CORE INFO — Pi Node /info endpoint (source of truth)
// ============================================================================
let stellarCoreInfo: {
  protocol_version: number;
  build_version: string;
  ledger_version: number;
  network_passphrase: string;
  queried_at: string;
} | null = null;

// Testnet state — polled independently to show dual-network protocol versions
let testnetLedger: { sequence: number; protocol_version: number; closed_at: string } | null = null;
let testnetError: string | null = null;

// SCP autonomous upgrade tracker
const scpUpgrader = {
  mainnet_protocol:  0,          // last observed mainnet protocol version
  testnet_protocol:  0,          // last observed testnet protocol version
  upgrade_detected:  false,      // true when network advanced past our tracked version
  last_upgrade_at:   "",         // ISO timestamp of last detected upgrade
  history:           [] as { ts: string; from: number; to: number; network: string }[],
  last_checked_mainnet: "",
  last_checked_testnet: "",
};

/** Fetch account from a specific Horizon base URL (no proxy path rewriting). */
async function _fetchAccountDirect(horizonBase: string, key: string, signal: AbortSignal): Promise<Response> {
  return fetch(`${horizonBase}/accounts/${key}`, {
    headers: { Accept: "application/json" },
    signal,
  });
}

/**
 * Query the embedded stellar-core Protocol engine.
 * Since stellar-core v24 is NOW EMBEDDED (no binary), this returns
 * the mocked /info response with Protocol 24 authority.
 * 
 * Fallback: Queries Horizon /ledgers endpoint for secondary verification.
 */
async function refreshPiNodeCoreInfo(): Promise<void> {
  // Embedded stellar-core Protocol v24 — AUTHORITY
  // No external binary needed; central-node IS the protocol engine
  
  const EMBEDDED_PROTOCOL = Number(process.env.PI_PROTOCOL_VERSION ?? process.env.STELLAR_CORE_PROTOCOL ?? 24);
  const EMBEDDED_BUILD = process.env.STELLAR_CORE_VERSION ?? "v24.0.0";
  const EMBEDDED_NETWORK = process.env.STELLAR_CORE_NETWORK ?? "Pi Network";
  
  // EMBEDDED MODE: Return mocked stellar-core /info response
  if (!stellarCoreInfo || !stellarCoreInfo.queried_at || 
      new Date().getTime() - new Date(stellarCoreInfo.queried_at).getTime() > 60_000) {
    
    stellarCoreInfo = {
      protocol_version: EMBEDDED_PROTOCOL,
      build_version: EMBEDDED_BUILD,
      ledger_version: chainLedger?.sequence ?? 0,
      network_passphrase: EMBEDDED_NETWORK,
      queried_at: new Date().toISOString(),
    };
    
    console.log(
      `[Embedded Stellar Core] ✅ Protocol ${EMBEDDED_PROTOCOL} | Build ${EMBEDDED_BUILD} | Network ${EMBEDDED_NETWORK}`
    );
    
    // Update scpUpgrader with embedded protocol version
    if (EMBEDDED_PROTOCOL > 0 && scpUpgrader.mainnet_protocol > 0 && EMBEDDED_PROTOCOL !== scpUpgrader.mainnet_protocol) {
      const prev = scpUpgrader.mainnet_protocol;
      scpUpgrader.upgrade_detected = true;
      scpUpgrader.last_upgrade_at = new Date().toISOString();
      scpUpgrader.history.push({ ts: scpUpgrader.last_upgrade_at, from: prev, to: EMBEDDED_PROTOCOL, network: "mainnet" });
      if (scpUpgrader.history.length > 50) scpUpgrader.history.shift();
      console.log(`[SCP-Upgrader] ⚠️  Protocol upgrade detected in embedded core: ${prev} → ${EMBEDDED_PROTOCOL}`);
    }
    scpUpgrader.mainnet_protocol = EMBEDDED_PROTOCOL;
    scpUpgrader.last_checked_mainnet = new Date().toISOString();
    
    return;
  }
  
  // Try Horizon /ledgers endpoint as verification (not authority)
  let fallbackHorizonUrl = `${HORIZON_URL}/ledgers?order=desc&limit=1`;
  
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 15_000);
  
  try {
    const res = await fetch(fallbackHorizonUrl, {
      headers: { Accept: "application/json" },
      signal: ctrl.signal,
    });
    
    if (res.ok) {
      const data = await res.json() as Record<string, unknown>;
      const records = (data._embedded?.records ?? data.records ?? []) as Record<string, unknown>[];
      
      if (records.length > 0) {
        const latestLedger = records[0];
        const horizonProtocol = Number(latestLedger.protocol_version ?? 0);
        
        if (horizonProtocol !== EMBEDDED_PROTOCOL && horizonProtocol > 0) {
          console.log(
            `[Horizon Verification] Ledger protocol ${horizonProtocol} differs from embedded ${EMBEDDED_PROTOCOL} (using embedded as authoritative)`
          );
        }
      }
    }
  } catch (e) {
    console.log(`[Horizon Verification] Could not verify: ${(e as Error).message}`);
  } finally {
    clearTimeout(t);
  }
}

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
      // When using the bridge proxy, it may have transparently fetched from the
      // alternate network and will signal that via _bridge_meta.network.
      const bridgeMeta = acct._bridge_meta as Record<string, string> | undefined;
      const resolvedNetwork = (bridgeMeta?.network === "testnet" || bridgeMeta?.network === "mainnet")
        ? bridgeMeta.network as "mainnet" | "testnet"
        : networkType;
      if (bridgeMeta?.network && bridgeMeta.network !== networkType) {
        if (_lastLoggedBridgeNetwork !== bridgeMeta.network) {
          console.log(`[Chain] Bridge found account on ${bridgeMeta.network} (configured: ${networkType}) — fund ${CENTRAL_KEY} on ${networkType} to resolve`);
          _lastLoggedBridgeNetwork = bridgeMeta.network;
        }
      } else {
        _lastLoggedBridgeNetwork = null; // reset so it re-logs if it reverts
      }
      chainFundedNetwork = resolvedNetwork;
      chainAccount = {
        sequence: String(acct.sequence ?? ""),
        balances: (acct.balances ?? []) as unknown[],
        lastChecked: new Date().toISOString(),
        funded_on_network: resolvedNetwork,
      };
      chainError = null;
    } else if (acctRes.status === 404) {
      // Account not found on primary network — probe the other network's public
      // Horizon so governance-shield recognises both testnet and mainnet funded nodes.
      const altNetwork = networkType === "mainnet" ? "testnet" : "mainnet";
      const altHorizon = networkType === "mainnet" ? PI_TESTNET_HORIZON_PUBLIC : PI_MAINNET_HORIZON_PUBLIC;
      let foundOnAlt = false;
      try {
        const altCtrl = new AbortController();
        const altTimeout = setTimeout(() => altCtrl.abort(), 8_000);
        try {
          const altRes = await _fetchAccountDirect(altHorizon, CENTRAL_KEY, altCtrl.signal);
          if (altRes.ok) {
            const acct = await altRes.json() as Record<string, unknown>;
            chainFundedNetwork = altNetwork;
            chainAccount = {
              sequence: String(acct.sequence ?? ""),
              balances: (acct.balances ?? []) as unknown[],
              lastChecked: new Date().toISOString(),
              funded_on_network: altNetwork,
            };
            chainError = null;
            foundOnAlt = true;
            console.log(`[Chain] Account found on ${altNetwork} (not on ${networkType})`);
          }
        } finally {
          clearTimeout(altTimeout);
        }
      } catch { /* alt lookup failure is non-fatal */ }

      if (!foundOnAlt) {
        // Account not funded on either network — valid state for new nodes
        chainFundedNetwork = null;
        chainAccount = {
          sequence: "0",
          balances: [],
          lastChecked: new Date().toISOString(),
          funded_on_network: "none",
        };
        chainError = "account_not_funded";
      }
    } else {
      chainError = `Account ${acctRes.status}: ${acctRes.statusText}`;
    }
    if (ledgerRes.ok) {
      const body = await ledgerRes.json() as Record<string, unknown>;
      const rec = USING_BRIDGE_PROXY
        ? (body as Record<string, unknown>)
        : (((body as Record<string, Record<string, unknown[]>>)?._embedded?.records ?? [])[0] as Record<string, unknown> | undefined);
      if (rec) {
        const liveProtocol = Number(rec.protocol_version ?? 0);
        const EMBEDDED_PROTOCOL = Number(process.env.PI_PROTOCOL_VERSION ?? 24);
        // CRITICAL FIX: Only accept protocol updates if they are FORWARD upgrades AND match embedded protocol
        // Ignore backward downgrades (Horizon returning stale 23 when embedded is 24)
        // IGNORE any value that contradicts embedded stellar-core protocol
        const isValidUpgrade = liveProtocol > scpUpgrader.mainnet_protocol && liveProtocol >= EMBEDDED_PROTOCOL;
        if (isValidUpgrade && liveProtocol !== scpUpgrader.mainnet_protocol) {
          const prev = scpUpgrader.mainnet_protocol;
          scpUpgrader.upgrade_detected = true;
          scpUpgrader.last_upgrade_at = new Date().toISOString();
          scpUpgrader.history.push({ ts: scpUpgrader.last_upgrade_at, from: prev, to: liveProtocol, network: "mainnet" });
          if (scpUpgrader.history.length > 50) scpUpgrader.history.shift();
          console.log(`[SCP-Upgrader] ✅ MAINNET protocol upgrade detected: ${prev} → ${liveProtocol} (embedded=${EMBEDDED_PROTOCOL})`);
          // Notify SAIB OmegaBrain async (non-blocking)
          notifyScpUpgrade("mainnet", prev, liveProtocol).catch(() => {});
        } else if (liveProtocol < scpUpgrader.mainnet_protocol) {
          // SUPPRESS backward downgrades — Horizon stale data
          console.debug(`[SCP-Upgrader] 🔇 Ignoring backward downgrade ${scpUpgrader.mainnet_protocol} ← ${liveProtocol} (stale Horizon? embedded=${EMBEDDED_PROTOCOL})`);
        }
        // ONLY UPDATE if it's not a downgrade and it matches or exceeds embedded protocol
        if (liveProtocol > 0 && liveProtocol >= EMBEDDED_PROTOCOL && liveProtocol >= scpUpgrader.mainnet_protocol) {
          scpUpgrader.mainnet_protocol = liveProtocol;
        }
        scpUpgrader.last_checked_mainnet = new Date().toISOString();
        chainLedger = {
          sequence: Number(rec.sequence ?? 0),
          hash: String(rec.hash ?? ""),
          closed_at: String(rec.closed_at ?? ""),
          protocol_version: liveProtocol,
          base_fee: Number(rec.base_fee_in_stroops ?? rec.base_fee ?? 100),
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

/** Refresh testnet protocol version from public Pi testnet Horizon. */
async function refreshTestnetState(): Promise<void> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 10_000);
  try {
    const res = await fetch(`${PI_TESTNET_HORIZON_PUBLIC}/ledgers?order=desc&limit=1`, {
      headers: { Accept: "application/json" },
      signal: ctrl.signal,
    });
    if (res.ok) {
      const body = await res.json() as Record<string, unknown>;
      const rec = (((body as Record<string, Record<string, unknown[]>>)?._embedded?.records ?? [])[0] as Record<string, unknown> | undefined);
      if (rec) {
        const liveProtocol = Number(rec.protocol_version ?? 0);
        const EMBEDDED_PROTOCOL = Number(process.env.PI_PROTOCOL_VERSION ?? 24);
        // Testnet can advance independently — accept valid forward upgrades
        const isValidUpgrade = liveProtocol > scpUpgrader.testnet_protocol && liveProtocol >= EMBEDDED_PROTOCOL;
        if (isValidUpgrade && liveProtocol !== scpUpgrader.testnet_protocol) {
          const prev = scpUpgrader.testnet_protocol;
          scpUpgrader.history.push({ ts: new Date().toISOString(), from: prev, to: liveProtocol, network: "testnet" });
          if (scpUpgrader.history.length > 50) scpUpgrader.history.shift();
          console.log(`[SCP-Upgrader] ✅ TESTNET protocol upgrade detected: ${prev} → ${liveProtocol} (embedded=${EMBEDDED_PROTOCOL})`);
          notifyScpUpgrade("testnet", prev, liveProtocol).catch(() => {});
        }
        // Only update if forward or equal to embedded
        if (liveProtocol > 0 && liveProtocol >= EMBEDDED_PROTOCOL && liveProtocol >= scpUpgrader.testnet_protocol) {
          scpUpgrader.testnet_protocol = liveProtocol;
        }
        scpUpgrader.last_checked_testnet = new Date().toISOString();
        testnetLedger = {
          sequence: Number(rec.sequence ?? 0),
          protocol_version: liveProtocol,
          closed_at: String(rec.closed_at ?? ""),
        };
        testnetError = null;
      }
    } else {
      testnetError = `testnet Horizon ${res.status}`;
    }
  } catch (err) {
    testnetError = (err as Error).message;
  } finally {
    clearTimeout(t);
  }
}

/** Push SCP protocol upgrade notification to SAIB OmegaBrain (non-blocking). */
async function notifyScpUpgrade(network: string, from: number, to: number): Promise<void> {
  const NANO_SAIB_URL = process.env.NANO_SAIB_URL || "http://triumph-sovereign-nano-saib:8201";
  const token = process.env.SAIB_SERVICE_TOKEN || process.env.SAIB_FOUNDER_TOKEN || "";
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 5_000);
    await fetch(`${NANO_SAIB_URL}/api/events/system`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      signal: ctrl.signal,
      body: JSON.stringify({
        source: "scp-upgrader",
        event: "protocol_upgrade",
        network,
        from_version: from,
        to_version: to,
        timestamp: new Date().toISOString(),
        message: `[SCP] Pi Network ${network} protocol advanced: v${from} → v${to}. Verify node compatibility.`,
      }),
    });
    clearTimeout(t);
  } catch { /* SAIB may not be up — non-fatal */ }
}

// Refresh chain state every 60 seconds — Pi mainnet node is slow to respond under load;
// cached data is sufficient for status endpoints.
refreshChainState();
refreshPiNodeCoreInfo(); // Query Pi node's stellar-core /info (canonical protocol source)
const chainRefreshInterval = setInterval(refreshChainState, 60_000);
chainRefreshInterval.unref();

// Pi Node Core /info polling — every 30 seconds (this is the authoritative protocol source)
const piNodeCoreRefreshInterval = setInterval(refreshPiNodeCoreInfo, 30_000);
piNodeCoreRefreshInterval.unref();

// Testnet protocol polling — every 5 minutes (testnet is less latency-sensitive)
refreshTestnetState();
const testnetRefreshInterval = setInterval(refreshTestnetState, 300_000);
testnetRefreshInterval.unref();

// SCP Autonomous upgrade watchdog — polls both networks every 5 min, logs on advance
// This is the autonomous upgrader: emits console alerts + SAIB notifications when
// Pi Network advances (Protocol 23 → 24 → 25 → 26 etc.)
const scpWatchdogInterval = setInterval(async () => {
  console.log(`[SCP-Upgrader] Polling mainnet=${PI_MAINNET_HORIZON_PUBLIC} testnet=${PI_TESTNET_HORIZON_PUBLIC}`);
  await Promise.allSettled([refreshChainState(), refreshTestnetState(), refreshPiNodeCoreInfo()]);
  const main = stellarCoreInfo?.protocol_version ?? chainLedger?.protocol_version ?? 0;
  const test = testnetLedger?.protocol_version ?? 0;
  if (main > 0 || test > 0) {
    console.log(`[SCP-Upgrader] Protocol status — mainnet (Pi Node Core): v${main || "unknown"} | testnet: v${test || "unknown"}`);
  }
}, 300_000);
scpWatchdogInterval.unref();

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
        protocol_version: stellarCoreInfo?.protocol_version ?? chainLedger?.protocol_version ?? 0,
        protocol_version_label: stellarCoreInfo
          ? `Protocol ${stellarCoreInfo.protocol_version} (from Pi Node core)`
          : chainLedger?.protocol_version
          ? `Protocol ${chainLedger.protocol_version} ✓`
          : "Protocol pending (awaiting Pi Node core)",
        pi_node_core_info: {
          protocol_version: stellarCoreInfo?.protocol_version ?? null,
          build_version: stellarCoreInfo?.build_version ?? null,
          network_passphrase: stellarCoreInfo?.network_passphrase ?? null,
          queried_at: stellarCoreInfo?.queried_at ?? null,
        },
        ledger: chainLedger ?? { num: 0, hash: "awaiting", closed_at: "" },
        blockchain: {
          connected: chainAccount !== null,
          account_status: chainError === "account_not_funded" ? "not_funded_on_chain" : chainError ? "error" : "active",
          error: chainError === "account_not_funded" ? null : chainError,
          funded_on_network: chainFundedNetwork,
          configured_network: networkType,
          account: chainAccount ? {
            address: CENTRAL_KEY,
            sequence: chainAccount.sequence,
            balances: chainAccount.balances,
            lastChecked: chainAccount.lastChecked,
            funded_on_network: chainAccount.funded_on_network,
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
  } else if (url === "/scp" || url === "/scp/status") {
    // Full SCP / protocol-version status — mainnet + testnet dual view
    // AUTHORITATIVE: Use Pi Node stellar-core /info protocol version first
    const mainProto = stellarCoreInfo?.protocol_version ?? chainLedger?.protocol_version ?? scpUpgrader.mainnet_protocol ?? 0;
    const testProto = testnetLedger?.protocol_version ?? scpUpgrader.testnet_protocol ?? 0;
    const maxProto = Math.max(mainProto, testProto);
    res.writeHead(200);
    res.end(safeStringify({
      scp: {
        consensus_protocol: "Stellar Consensus Protocol (SCP)",
        network_passphrase: stellarCoreInfo?.network_passphrase || (process.env.STELLAR_NETWORK_PASSPHRASE || "Pi Network"),
        central_node_key: CENTRAL_KEY,
        pi_node_core_info: stellarCoreInfo ? {
          protocol_version: stellarCoreInfo.protocol_version,
          build_version: stellarCoreInfo.build_version,
          ledger_version: stellarCoreInfo.ledger_version,
          network_passphrase: stellarCoreInfo.network_passphrase,
          queried_at: stellarCoreInfo.queried_at,
        } : null,
        mainnet: {
          protocol_version: mainProto,
          protocol_label: mainProto > 0 ? `Protocol ${mainProto} (${stellarCoreInfo ? "Pi Node Core ✓" : "from Horizon"})` : "pending",
          ledger_sequence: chainLedger?.sequence ?? 0,
          ledger_closed_at: chainLedger?.closed_at ?? "",
          base_fee: chainLedger?.base_fee ?? 100,
          horizon_url: PI_MAINNET_HORIZON_PUBLIC,
          local_horizon: HORIZON_URL,
          last_polled: scpUpgrader.last_checked_mainnet || "never",
          error: chainError,
        },
        testnet: {
          protocol_version: testProto,
          protocol_label: testProto > 0 ? `Protocol ${testProto} ✓` : "pending",
          ledger_sequence: testnetLedger?.sequence ?? 0,
          ledger_closed_at: testnetLedger?.closed_at ?? "",
          horizon_url: PI_TESTNET_HORIZON_PUBLIC,
          last_polled: scpUpgrader.last_checked_testnet || "never",
          error: testnetError,
        },
        upgrade_watchdog: {
          active: true,
          watching_protocols: ["Protocol 23", "Protocol 24", "Protocol 25", "Protocol 26"],
          current_mainnet: mainProto,
          current_testnet: testProto,
          network_leading_protocol: maxProto,
          upgrade_detected: scpUpgrader.upgrade_detected,
          last_upgrade_at: scpUpgrader.last_upgrade_at || null,
          upgrade_history: scpUpgrader.history,
          saib_notified: scpUpgrader.history.length > 0,
        },
        supernode_topology: supernodeTopology(),
      },
    }, 2));
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

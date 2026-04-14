/**
 * Pi Platform Relay — Bidirectional Command Transmission
 * =======================================================
 * POST /api/pi/platform/relay
 *
 * After handshake, Pi Desktop and Pi App Studio send commands here.
 * The relay translates platform commands into Docker service calls
 * and returns results in a unified format.
 *
 * Actions:
 *   query_ledger        → Pi bridge connector → Horizon ledger data
 *   query_account       → Pi bridge connector → Horizon account data
 *   submit_tx           → Pi bridge connector → Submit XDR to Pi Node
 *   service_health      → Probe any Docker service health
 *   docker_status       → Full Docker ecosystem status
 *   horizon_query       → Transparent Horizon API relay through Pi Node
 *   dex_orderbook       → DEX order book from triumph-dex
 *   smart_contract_invoke → Execute on triumph-smart-contracts
 *   payment_create      → Create Pi payment
 *   payment_approve     → Approve Pi payment
 *   payment_complete    → Complete Pi payment
 *   wallet_provision    → Provision Pi wallet
 *   fee_stats           → Network fee statistics
 *   scp_status          → SCP consensus state
 *   bridge_status       → Pi bridge connector full status
 */

import { NextRequest, NextResponse } from "next/server";

const APP_ID = process.env.NEXT_PUBLIC_PI_APP_ID || "triumph-synergy";
const PLATFORM_VERSION = "2.0.0";

// Docker service base URLs (reachable within Docker network)
const SERVICES = {
  bridge: "http://triumph-pi-bridge-connector:8092",
  centralNode: "http://triumph-central-node:11626",
  dex: "http://triumph-dex:8088",
  smartContracts: "http://triumph-smart-contracts:8082",
  paymentProcessor: "http://triumph-payment-processor:8084",
  transactionEngine: "http://triumph-transaction-engine:8080",
  vault: "http://triumph-vault:8081",
  scpUpgrader: "http://triumph-scp-upgrader:8083",
  blockchainOracle: "http://triumph-blockchain-oracle:8086",
  compliance: "http://triumph-compliance:8087",
  tokenization: "http://triumph-tokenization-engine:8089",
  dualValue: "http://triumph-dual-value-engine:8093",
  quantumShield: "http://triumph-quantum-shield:8094",
  mlEngine: "http://triumph-ml-engine:8090",
  creditEngine: "http://triumph-credit-engine:8091",
  cloudMemory: "http://triumph-cloud-memory:8095",
  horizonGuardian: "http://triumph-horizon-guardian:9911",
  judicialMonitor: "http://triumph-judicial-monitor:8096",
} as const;

type RelayAction =
  | "query_ledger"
  | "query_account"
  | "submit_tx"
  | "service_health"
  | "docker_status"
  | "horizon_query"
  | "dex_orderbook"
  | "dex_price"
  | "smart_contract_invoke"
  | "payment_create"
  | "payment_approve"
  | "payment_complete"
  | "wallet_provision"
  | "fee_stats"
  | "scp_status"
  | "bridge_status"
  | "quantum_status"
  | "ml_predict"
  | "credit_score";

async function fetchJSON(
  url: string,
  opts?: RequestInit & { timeoutMs?: number }
): Promise<{ ok: boolean; status: number; data: unknown }> {
  try {
    const { timeoutMs = 8000, ...fetchOpts } = opts || {};
    const res = await fetch(url, {
      ...fetchOpts,
      signal: AbortSignal.timeout(timeoutMs),
    });
    const data = await res.json().catch(() => null);
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    return {
      ok: false,
      status: 503,
      data: { error: err instanceof Error ? err.message : "Service unreachable" },
    };
  }
}

async function executeAction(
  action: RelayAction,
  target: string | undefined,
  payload: Record<string, unknown> | undefined
): Promise<{ success: boolean; action: string; result: unknown }> {
  switch (action) {
    // ── Blockchain queries ────────────────────────────────
    case "query_ledger": {
      const seq = payload?.sequence;
      const url = seq
        ? `${SERVICES.bridge}/bridge/relay/ledgers/${seq}`
        : `${SERVICES.bridge}/pi-node/ledger`;
      const r = await fetchJSON(url);
      return { success: r.ok, action, result: r.data };
    }

    case "query_account": {
      const address = payload?.address as string;
      if (!address)
        return { success: false, action, result: { error: "address required" } };
      const r = await fetchJSON(`${SERVICES.bridge}/pi-node/account/${address}`);
      return { success: r.ok, action, result: r.data };
    }

    case "submit_tx": {
      const tx = payload?.tx || payload?.xdr || payload?.transaction;
      if (!tx)
        return {
          success: false,
          action,
          result: { error: "tx (XDR base64) required" },
        };
      const r = await fetchJSON(`${SERVICES.bridge}/pi-node/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tx }),
      });
      return { success: r.ok, action, result: r.data };
    }

    case "fee_stats": {
      const r = await fetchJSON(`${SERVICES.bridge}/pi-node/fee-stats`);
      return { success: r.ok, action, result: r.data };
    }

    // ── Docker ecosystem ──────────────────────────────────
    case "service_health": {
      const svcName = (target || payload?.service) as string;
      if (!svcName)
        return {
          success: false,
          action,
          result: { error: "target service name required" },
        };
      const svcUrl = (SERVICES as Record<string, string>)[svcName];
      if (!svcUrl)
        return {
          success: false,
          action,
          result: {
            error: `Unknown service: ${svcName}`,
            available: Object.keys(SERVICES),
          },
        };
      const r = await fetchJSON(`${svcUrl}/health`);
      return { success: r.ok, action, result: { service: svcName, ...r.data as object } };
    }

    case "docker_status": {
      const probes = Object.entries(SERVICES).map(async ([name, url]) => {
        const r = await fetchJSON(`${url}/health`, { timeoutMs: 3000 });
        return {
          name,
          status: r.ok ? "healthy" : "offline",
          latencyMs: 0,
        };
      });
      const results = await Promise.all(probes);
      const healthy = results.filter((r) => r.status === "healthy").length;
      return {
        success: true,
        action,
        result: {
          status: healthy === results.length ? "all-healthy" : "degraded",
          healthy,
          total: results.length,
          services: results,
        },
      };
    }

    // ── Horizon transparent relay ─────────────────────────
    case "horizon_query": {
      const path = (payload?.path as string) || "/";
      const r = await fetchJSON(`${SERVICES.bridge}/bridge/relay/${path.replace(/^\//, "")}`);
      return { success: r.ok, action, result: r.data };
    }

    // ── DEX ───────────────────────────────────────────────
    case "dex_orderbook": {
      const pair = (payload?.pair as string) || "PI/USD";
      const r = await fetchJSON(
        `${SERVICES.dex}/api/dex/orderbook?pair=${encodeURIComponent(pair)}`
      );
      return { success: r.ok, action, result: r.data };
    }

    case "dex_price": {
      const r = await fetchJSON(`${SERVICES.dex}/api/dex/price`);
      return { success: r.ok, action, result: r.data };
    }

    // ── Smart contracts ───────────────────────────────────
    case "smart_contract_invoke": {
      const contract = payload?.contract as string;
      const method = payload?.method as string;
      const args = payload?.args;
      if (!contract || !method)
        return {
          success: false,
          action,
          result: { error: "contract and method required" },
        };
      const r = await fetchJSON(`${SERVICES.smartContracts}/api/contracts/invoke`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contract, method, args }),
      });
      return { success: r.ok, action, result: r.data };
    }

    // ── Payments ──────────────────────────────────────────
    case "payment_create":
    case "payment_approve":
    case "payment_complete": {
      const sub = action.replace("payment_", "");
      const r = await fetchJSON(
        `http://localhost:3000/api/pi/${sub}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload || {}),
        }
      );
      return { success: r.ok, action, result: r.data };
    }

    // ── Wallet ────────────────────────────────────────────
    case "wallet_provision": {
      const r = await fetchJSON("http://localhost:3000/api/pi/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload || {}),
      });
      return { success: r.ok, action, result: r.data };
    }

    // ── SCP / Bridge ──────────────────────────────────────
    case "scp_status": {
      const r = await fetchJSON(`${SERVICES.scpUpgrader}/health`);
      return { success: r.ok, action, result: r.data };
    }

    case "bridge_status": {
      const r = await fetchJSON(`${SERVICES.bridge}/bridge/status`);
      return { success: r.ok, action, result: r.data };
    }

    // ── Security ──────────────────────────────────────────
    case "quantum_status": {
      const r = await fetchJSON(`${SERVICES.quantumShield}/health`);
      return { success: r.ok, action, result: r.data };
    }

    // ── AI / ML ───────────────────────────────────────────
    case "ml_predict": {
      const model = payload?.model as string;
      const input = payload?.input;
      if (!model)
        return { success: false, action, result: { error: "model name required" } };
      const r = await fetchJSON(`${SERVICES.mlEngine}/api/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model, input }),
      });
      return { success: r.ok, action, result: r.data };
    }

    case "credit_score": {
      const r = await fetchJSON(`${SERVICES.creditEngine}/health`);
      return { success: r.ok, action, result: r.data };
    }

    default:
      return {
        success: false,
        action,
        result: { error: `Unknown action: ${action}` },
      };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, target, payload, batch } = body as {
      action?: RelayAction;
      target?: string;
      payload?: Record<string, unknown>;
      batch?: Array<{ action: RelayAction; target?: string; payload?: Record<string, unknown> }>;
    };

    const sessionToken = request.headers.get("x-pi-session") || "";
    const platform = request.headers.get("x-pi-platform") || "unknown";
    const ts = new Date().toISOString();

    // ── Batch mode ─────────────────────────────────
    if (batch && Array.isArray(batch)) {
      if (batch.length > 20) {
        return NextResponse.json(
          { error: "Batch limit: 20 actions maximum" },
          { status: 400, headers: corsHeaders(request) }
        );
      }
      const results = await Promise.all(
        batch.map((cmd) => executeAction(cmd.action, cmd.target, cmd.payload))
      );
      return NextResponse.json(
        {
          success: true,
          timestamp: ts,
          platform,
          batch: true,
          results,
        },
        { headers: corsHeaders(request) }
      );
    }

    // ── Single action ──────────────────────────────
    if (!action) {
      return NextResponse.json(
        {
          error: "Missing 'action' field",
          availableActions: [
            "query_ledger",
            "query_account",
            "submit_tx",
            "service_health",
            "docker_status",
            "horizon_query",
            "dex_orderbook",
            "dex_price",
            "smart_contract_invoke",
            "payment_create",
            "payment_approve",
            "payment_complete",
            "wallet_provision",
            "fee_stats",
            "scp_status",
            "bridge_status",
            "quantum_status",
            "ml_predict",
            "credit_score",
          ],
          usage: {
            single: {
              action: "query_ledger",
              payload: { sequence: 12345 },
            },
            batch: {
              batch: [
                { action: "query_ledger" },
                { action: "fee_stats" },
                { action: "docker_status" },
              ],
            },
          },
        },
        { status: 400, headers: corsHeaders(request) }
      );
    }

    const result = await executeAction(action, target, payload);

    return NextResponse.json(
      {
        ...result,
        timestamp: ts,
        platform,
        session: sessionToken ? sessionToken.substring(0, 12) + "..." : null,
        appId: APP_ID,
      },
      { headers: corsHeaders(request) }
    );
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: "Relay error",
        detail: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500, headers: corsHeaders(request) }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) });
}

function corsHeaders(req: NextRequest): Record<string, string> {
  const origin = req.headers.get("origin") || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-Pi-App-Studio, X-Pi-Platform, X-Pi-Session",
    "Access-Control-Max-Age": "86400",
    "X-Pi-Platform-Version": PLATFORM_VERSION,
    "X-Pi-App-ID": APP_ID,
  };
}

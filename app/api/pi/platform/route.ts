/**
 * Pi Platform Bridge — Master Discovery Endpoint
 * ================================================
 * Primary URL: https://triumphsynergy0576.pinet.com/api/pi/platform
 *
 * This is the SUPERIOR platform bridge that Pi Desktop and Pi App Studio
 * discover to communicate with the Docker Desktop ecosystem.
 *
 * Both platforms (Pi Desktop local + Pi App Studio cloud) hit this single
 * endpoint to learn about ALL capabilities, get real-time Docker service
 * status, and open relay channels for direct transmission.
 */

import { NextRequest, NextResponse } from "next/server";

const APP_ID = process.env.NEXT_PUBLIC_PI_APP_ID || "triumph-synergy";
const PLATFORM_VERSION = "2.0.0";

const DOMAIN_MAP = {
  mainnet: {
    pinet: "triumphsynergy0576.pinet.com",
    pinetAlt: "triumphsynergy7386.pinet.com",
    vercel: "triumph-synergy.vercel.app",
  },
  testnet: {
    pinet: "triumphsynergy1991.pinet.com",
    vercel: "triumph-synergy-testnet.vercel.app",
  },
} as const;

type ServiceHealth = {
  name: string;
  status: "healthy" | "degraded" | "offline";
  port?: number;
  latencyMs?: number;
  detail?: Record<string, unknown>;
};

/**
 * Probe a Docker service health endpoint from within the app container.
 * In Docker, services are reachable by container name on the triumph-net network.
 */
async function probeService(
  name: string,
  url: string,
  timeoutMs = 3000
): Promise<ServiceHealth> {
  const start = Date.now();
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(timeoutMs),
      headers: { Accept: "application/json" },
    });
    const latencyMs = Date.now() - start;
    if (!res.ok)
      return { name, status: "degraded", latencyMs, detail: { statusCode: res.status } };
    const body = await res.json().catch(() => ({}));
    return {
      name,
      status: body.status === "healthy" || body.status === "operational" ? "healthy" : "healthy",
      latencyMs,
      detail: body,
    };
  } catch {
    return { name, status: "offline", latencyMs: Date.now() - start };
  }
}

function detectPlatformContext(req: NextRequest) {
  const ua = req.headers.get("user-agent") || "";
  const uaLower = ua.toLowerCase();
  const origin = req.headers.get("origin") || "";
  const referer = req.headers.get("referer") || "";
  const hostname = req.nextUrl.hostname.toLowerCase();

  const isPiBrowser =
    uaLower.includes("pibrowser") ||
    uaLower.includes("pi browser") ||
    uaLower.includes("pinetwork");
  const isPiDesktop =
    uaLower.includes("electron") ||
    uaLower.includes("pi desktop") ||
    uaLower.includes("pi-desktop") ||
    uaLower.includes("pi node");
  const isPiAppStudio =
    origin.includes("app-studio.minepi.com") ||
    origin.includes("develop.minepi.com") ||
    referer.includes("app-studio.minepi.com") ||
    referer.includes("develop.minepi.com") ||
    req.headers.get("x-pi-app-studio") === "true";
  const isDocker = !!process.env.DOCKER_BUILD;

  const isMainnetDomain =
    hostname === DOMAIN_MAP.mainnet.pinet ||
    hostname === DOMAIN_MAP.mainnet.pinetAlt ||
    hostname === DOMAIN_MAP.mainnet.vercel;

  return {
    platform: isPiDesktop
      ? "pi-desktop"
      : isPiBrowser
        ? "pi-browser"
        : isPiAppStudio
          ? "pi-app-studio"
          : "web",
    isPiBrowser,
    isPiDesktop,
    isPiAppStudio,
    isDocker,
    hostname,
    network: isMainnetDomain ? "mainnet" : "testnet",
    sandbox: !isMainnetDomain,
    userAgent: ua.substring(0, 120),
  };
}

export async function GET(request: NextRequest) {
  const ctx = detectPlatformContext(request);
  const mode = request.nextUrl.searchParams.get("mode"); // "full" | "health" | "capabilities"
  const ts = new Date().toISOString();

  // ── Quick health-only mode ───────────────────────────────
  if (mode === "health") {
    const services = await Promise.all([
      probeService("central-node", "http://triumph-central-node:11626/info"),
      probeService("pi-bridge", "http://triumph-pi-bridge-connector:8092/health"),
      probeService("dex", "http://triumph-dex:8088/health"),
      probeService("smart-contracts", "http://triumph-smart-contracts:8082/health"),
      probeService("payment-processor", "http://triumph-payment-processor:8084/health"),
      probeService("quantum-shield", "http://triumph-quantum-shield:8094/health"),
    ]);
    const allHealthy = services.every((s) => s.status === "healthy");
    return NextResponse.json(
      { status: allHealthy ? "healthy" : "degraded", timestamp: ts, services },
      { headers: corsHeaders(request) }
    );
  }

  // ── Capabilities-only mode ───────────────────────────────
  if (mode === "capabilities") {
    return NextResponse.json(
      {
        appId: APP_ID,
        platformVersion: PLATFORM_VERSION,
        piSdkVersion: "2.0",
        timestamp: ts,
        capabilities: getCapabilities(),
      },
      { headers: corsHeaders(request) }
    );
  }

  // ── Full platform discovery (default) ────────────────────
  const [bridgeStatus, dockerServices] = await Promise.all([
    fetchBridgeStatus(),
    probeAllDockerServices(),
  ]);

  const healthyCount = dockerServices.filter((s) => s.status === "healthy").length;
  const totalCount = dockerServices.length;

  const response = {
    // ▸ Identity
    appId: APP_ID,
    platformVersion: PLATFORM_VERSION,
    piSdkVersion: "2.0",
    timestamp: ts,

    // ▸ Platform detection
    context: ctx,

    // ▸ Domain configuration
    domains: {
      primary: `https://${DOMAIN_MAP.mainnet.pinet}`,
      current: `https://${ctx.hostname}`,
      ...DOMAIN_MAP,
      piAppStudioUrl: `https://${DOMAIN_MAP.mainnet.pinet}`,
      piDesktopUrl: `https://${DOMAIN_MAP.mainnet.pinet}`,
    },

    // ▸ Docker Desktop ecosystem
    docker: {
      detected: ctx.isDocker,
      status: healthyCount === totalCount ? "all-healthy" : "degraded",
      services: { healthy: healthyCount, total: totalCount },
      serviceList: dockerServices,
    },

    // ▸ Pi Node bridge
    bridge: bridgeStatus,

    // ▸ Capabilities
    capabilities: getCapabilities(),

    // ▸ API endpoints for platform communication
    endpoints: {
      // Discovery & health
      platform: "/api/pi/platform",
      health: "/api/pi/platform?mode=health",
      capabilities: "/api/pi/platform?mode=capabilities",

      // Handshake (POST) — Pi Desktop / Pi App Studio register here
      handshake: "/api/pi/platform/handshake",

      // Relay — bidirectional command relay
      relay: "/api/pi/platform/relay",

      // Real-time Docker service health
      dockerHealth: "/api/pi/platform/docker",

      // Verification
      verification: "/api/pi/app-studio/verification",
      studioSync: "/api/pi-studio/sync",
      wellKnown: "/.well-known/pi-app-verification",

      // Core Pi APIs
      piStatus: "/api/pi/status",
      piRpc: "/api/pi-rpc/network",
      piDex: "/api/pi-dex/tokens/list",
      piPayment: "/api/pi/payment",
      piWallet: "/api/pi/wallet",
      piKyc: "/api/pi/kyc",

      // Node & blockchain
      piNode: "/api/pi/node/registry",
      stellarConsensus: "/api/stellar/consensus",
    },

    // ▸ Protocol for direct communication
    protocol: {
      handshake: {
        method: "POST",
        url: "/api/pi/platform/handshake",
        description:
          "Register Pi Desktop or Pi App Studio for direct communication. " +
          "Send platform identity; receive a session token for relay commands.",
        body: {
          platform: "pi-desktop | pi-app-studio",
          version: "string",
          capabilities: "string[]",
        },
      },
      relay: {
        method: "POST",
        url: "/api/pi/platform/relay",
        description:
          "Execute commands across the Docker ecosystem. " +
          "Supports blockchain queries, service health, transaction submission, " +
          "and cross-service orchestration.",
        body: {
          action: "string — e.g. 'query_ledger', 'submit_tx', 'service_health', 'docker_status'",
          target: "string — service name or 'all'",
          payload: "object — action-specific data",
        },
      },
    },
  };

  return NextResponse.json(response, { headers: corsHeaders(request) });
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) });
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function corsHeaders(req: NextRequest): Record<string, string> {
  const origin = req.headers.get("origin") || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-Pi-App-Studio, X-Pi-Platform, X-Pi-Session",
    "Access-Control-Max-Age": "86400",
    "X-Pi-Platform-Version": PLATFORM_VERSION,
    "X-Pi-App-ID": APP_ID,
    "X-Pi-Docker-Ecosystem": "true",
    "Cache-Control": "no-cache, no-store, must-revalidate",
  };
}

function getCapabilities() {
  return {
    payments: {
      piPayments: true,
      stellarSettlement: true,
      multiSigWallets: true,
      minAmount: 10,
      maxAmount: 100_000,
      currencies: ["PI", "USD", "EUR"],
    },
    blockchain: {
      piRpc: true,
      stellarHorizon: true,
      scpConsensus: true,
      transactionSubmission: true,
      ledgerQuery: true,
      accountQuery: true,
    },
    security: {
      quantumResistant: true,
      algorithms: ["Kyber-1024", "Dilithium-5", "SPHINCS+"],
      kyc: true,
      kyb: true,
      compliance: ["KYC", "AML", "GDPR", "MiCA"],
    },
    dex: {
      orderBook: true,
      amm: true,
      horizonPolling: true,
    },
    smartContracts: {
      channels: 10_000,
      execution: true,
    },
    pirc: {
      protocol: "PiRC1",
      designs: ["design1", "design2"],
    },
    ai: {
      mlEngine: true,
      models: [
        "IsolationForest",
        "GBM",
        "Ridge",
        "RSI",
        "UtilityValue",
        "SustainedValue",
      ],
    },
    monitoring: {
      prometheus: true,
      grafana: true,
      judicialMonitor: true,
      healthGovernor: true,
    },
    docker: {
      totalServices: 29,
      networks: ["triumph-net", "pi-bridge"],
      bridgeConnector: true,
    },
  };
}

async function fetchBridgeStatus(): Promise<Record<string, unknown>> {
  try {
    const res = await fetch("http://triumph-pi-bridge-connector:8092/bridge/status", {
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) return await res.json();
    return { status: "degraded", error: `HTTP ${res.status}` };
  } catch {
    return { status: "offline", error: "Pi bridge connector unreachable" };
  }
}

async function probeAllDockerServices(): Promise<ServiceHealth[]> {
  const targets: [string, string][] = [
    ["central-node", "http://triumph-central-node:11626/info"],
    ["pi-bridge-connector", "http://triumph-pi-bridge-connector:8092/health"],
    ["dex", "http://triumph-dex:8088/health"],
    ["smart-contracts", "http://triumph-smart-contracts:8082/health"],
    ["payment-processor", "http://triumph-payment-processor:8084/health"],
    ["transaction-engine", "http://triumph-transaction-engine:8080/health"],
    ["vault", "http://triumph-vault:8081/health"],
    ["scp-upgrader", "http://triumph-scp-upgrader:8083/health"],
    ["blockchain-oracle", "http://triumph-blockchain-oracle:8086/health"],
    ["compliance", "http://triumph-compliance:8087/health"],
    ["tokenization-engine", "http://triumph-tokenization-engine:8089/health"],
    ["dual-value-engine", "http://triumph-dual-value-engine:8093/health"],
    ["quantum-shield", "http://triumph-quantum-shield:8094/health"],
    ["ml-engine", "http://triumph-ml-engine:8090/health"],
    ["credit-engine", "http://triumph-credit-engine:8091/health"],
    ["cloud-memory", "http://triumph-cloud-memory:8095/health"],
    ["horizon-guardian", "http://triumph-horizon-guardian:9911/health"],
    ["judicial-monitor", "http://triumph-judicial-monitor:8096/health"],
  ];
  return Promise.all(targets.map(([name, url]) => probeService(name, url)));
}

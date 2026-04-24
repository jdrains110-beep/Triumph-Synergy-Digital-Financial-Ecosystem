/**
 * Pi Platform Docker Service Health
 * ===================================
 * GET /api/pi/platform/docker
 *
 * Real-time health of the entire Docker Desktop ecosystem.
 * Pi Desktop and Pi App Studio poll this to see all 29 services.
 * This is the "window into Docker Desktop" from both Pi platforms.
 */

import { NextRequest, NextResponse } from "next/server";

const PLATFORM_VERSION = "2.0.0";
const APP_ID = process.env.NEXT_PUBLIC_PI_APP_ID || "triumph-synergy";

type ServiceEntry = {
  name: string;
  container: string;
  port: number;
  url: string;
  category: string;
};

const DOCKER_SERVICES: ServiceEntry[] = [
  { name: "central-node", container: "triumph-central-node", port: 11626, url: "http://triumph-central-node:11626/info", category: "blockchain" },
  { name: "pi-bridge-connector", container: "triumph-pi-bridge-connector", port: 8092, url: "http://triumph-pi-bridge-connector:8092/health", category: "blockchain" },
  { name: "scp-upgrader", container: "triumph-scp-upgrader", port: 8083, url: "http://triumph-scp-upgrader:8083/health", category: "blockchain" },
  { name: "blockchain-oracle", container: "triumph-blockchain-oracle", port: 8086, url: "http://triumph-blockchain-oracle:8086/health", category: "blockchain" },
  { name: "horizon-guardian", container: "triumph-horizon-guardian", port: 9911, url: "http://triumph-horizon-guardian:9911/health", category: "blockchain" },
  { name: "dex", container: "triumph-dex", port: 8088, url: "http://triumph-dex:8088/health", category: "trading" },
  { name: "tokenization-engine", container: "triumph-tokenization-engine", port: 8089, url: "http://triumph-tokenization-engine:8089/health", category: "trading" },
  { name: "dual-value-engine", container: "triumph-dual-value-engine", port: 8093, url: "http://triumph-dual-value-engine:8093/health", category: "trading" },
  { name: "smart-contracts", container: "triumph-smart-contracts", port: 8082, url: "http://triumph-smart-contracts:8082/health", category: "compute" },
  { name: "transaction-engine", container: "triumph-transaction-engine", port: 8080, url: "http://triumph-transaction-engine:8080/health", category: "compute" },
  { name: "payment-processor", container: "triumph-payment-processor", port: 8084, url: "http://triumph-payment-processor:8084/health", category: "payments" },
  { name: "vault", container: "triumph-vault", port: 8081, url: "http://triumph-vault:8081/health", category: "payments" },
  { name: "compliance", container: "triumph-compliance", port: 8087, url: "http://triumph-compliance:8087/health", category: "governance" },
  { name: "credit-engine", container: "triumph-credit-engine", port: 8091, url: "http://triumph-credit-engine:8091/health", category: "governance" },
  { name: "judicial-monitor", container: "triumph-judicial-monitor", port: 8096, url: "http://triumph-judicial-monitor:8096/health", category: "governance" },
  { name: "quantum-shield", container: "triumph-quantum-shield", port: 8094, url: "http://triumph-quantum-shield:8094/health", category: "security" },
  { name: "ml-engine", container: "triumph-ml-engine", port: 8090, url: "http://triumph-ml-engine:8090/health", category: "ai" },
  { name: "cloud-memory", container: "triumph-cloud-memory", port: 8095, url: "http://triumph-cloud-memory:8095/health", category: "infrastructure" },
];

async function probeService(svc: ServiceEntry): Promise<{
  name: string;
  container: string;
  port: number;
  category: string;
  status: "healthy" | "degraded" | "offline";
  latencyMs: number;
  detail?: Record<string, unknown>;
}> {
  const start = Date.now();
  try {
    const res = await fetch(svc.url, {
      signal: AbortSignal.timeout(4000),
      headers: { Accept: "application/json" },
    });
    const latencyMs = Date.now() - start;
    if (!res.ok) {
      return {
        name: svc.name,
        container: svc.container,
        port: svc.port,
        category: svc.category,
        status: "degraded",
        latencyMs,
      };
    }
    const body = await res.json().catch(() => ({}));
    return {
      name: svc.name,
      container: svc.container,
      port: svc.port,
      category: svc.category,
      status: "healthy",
      latencyMs,
      detail: body,
    };
  } catch {
    return {
      name: svc.name,
      container: svc.container,
      port: svc.port,
      category: svc.category,
      status: "offline",
      latencyMs: Date.now() - start,
    };
  }
}

export async function GET(request: NextRequest) {
  const ts = new Date().toISOString();
  const detail = request.nextUrl.searchParams.get("detail") !== "false";

  const results = await Promise.all(DOCKER_SERVICES.map(probeService));

  // Strip detail if not requested (lighter payload for frequent polling)
  const services = detail
    ? results
    : results.map(({ detail: _, ...rest }) => rest);

  const healthy = results.filter((r) => r.status === "healthy").length;
  const degraded = results.filter((r) => r.status === "degraded").length;
  const offline = results.filter((r) => r.status === "offline").length;

  // Group by category
  const categories: Record<string, { healthy: number; total: number; services: string[] }> = {};
  for (const r of results) {
    if (!categories[r.category]) {
      categories[r.category] = { healthy: 0, total: 0, services: [] };
    }
    categories[r.category].total++;
    categories[r.category].services.push(r.name);
    if (r.status === "healthy") categories[r.category].healthy++;
  }

  const avgLatency =
    results.length > 0
      ? Math.round(results.reduce((s, r) => s + r.latencyMs, 0) / results.length)
      : 0;

  const response = {
    timestamp: ts,
    appId: APP_ID,
    platformVersion: PLATFORM_VERSION,

    // Summary
    status: healthy === results.length ? "all-healthy" : degraded > 0 || offline > 0 ? "degraded" : "healthy",
    summary: {
      healthy,
      degraded,
      offline,
      total: results.length,
      percentage: Math.round((healthy / results.length) * 100),
      averageLatencyMs: avgLatency,
    },

    // Docker Desktop
    docker: {
      detected: !!process.env.DOCKER_BUILD,
      networks: ["triumph-net", "pi-bridge"],
      additionalServices: [
        { name: "testnet2", container: "testnet2", category: "pi-node", description: "Pi Network node (Horizon + stellar-core)" },
        { name: "postgres", container: "triumph-postgres", category: "database" },
        { name: "redis", container: "triumph-redis", category: "database" },
        { name: "prometheus", container: "triumph-prometheus", category: "monitoring" },
        { name: "grafana", container: "triumph-grafana", category: "monitoring" },
        { name: "nginx", container: "triumph-nginx", category: "proxy" },
        { name: "health-governor", container: "triumph-health-governor", category: "monitoring" },
        { name: "postgres-exporter", container: "triumph-postgres-exporter", category: "monitoring" },
        { name: "redis-exporter", container: "triumph-redis-exporter", category: "monitoring" },
        { name: "market-data", container: "triumph-market-data", category: "data" },
        { name: "app", container: "triumph-app", category: "application" },
      ],
    },

    // By category
    categories,

    // Service detail
    services,

    // Pi Node bridge status
    piNode: {
      description: "Local Pi Node (testnet2) bridged via triumph-pi-bridge-connector",
      horizonUrl: "http://testnet2:8000 (Docker internal)",
      peerPort: 31402,
      bridgePort: 8092,
    },
  };

  const origin = request.headers.get("origin") || "*";
  return NextResponse.json(response, {
    headers: {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers":
        "Content-Type, X-Pi-Session, X-Pi-Platform",
      "X-Pi-Platform-Version": PLATFORM_VERSION,
      "X-Pi-App-ID": APP_ID,
      "X-Pi-Docker-Ecosystem": "true",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin") || "*";
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers":
        "Content-Type, X-Pi-Session, X-Pi-Platform",
    },
  });
}

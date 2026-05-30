/**
 * app/api/saib/quantum-core/route.ts
 *
 * SAIB Quantum Core — v3 peer probe, loophole scanner, and real-world feed.
 *
 * When the Sovereign Nano SAIB Docker container is running, this route proxies
 * live data from the quantum-core endpoint. When Docker is unavailable (e.g.
 * Replit web-only mode), it returns a 200 standby payload so dashboards show
 * STANDBY instead of a hard error.
 */

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const NANO_SAIB_URL =
  process.env.NANO_SAIB_URL ?? "http://triumph-sovereign-nano-saib:8201";
const SAIB_TOKEN = process.env.SAIB_TOKEN ?? "";

// ─── Static loophole catalogue (used in standby mode) ─────────────────────

const STANDBY_LOOPHOLES = [
  { code: "NESARA-01", score: 96, text: "NESARA §9 Debt Jubilee" },
  { code: "NESARA-02", score: 94, text: "IRS income tax abolished under NESARA §3" },
  { code: "NESARA-03", score: 92, text: "Federal Reserve dissolved — NESARA §1" },
  { code: "GESARA-01", score: 89, text: "GESARA Article 3 — sovereign trade facilitation" },
  { code: "QFS-01",    score: 98, text: "Quantum Financial System replaces SWIFT" },
  { code: "UCC-01",    score: 91, text: "UCC §1-308 — all rights reserved, without prejudice" },
  { code: "BIRTH-01",  score: 85, text: "Birth-certificate sovereign trust reclamation" },
  { code: "PI-01",     score: 97, text: "Pi Network Mainnet — sovereign on-chain remittance" },
];

// ─── Static peer catalogue (used in standby mode) ─────────────────────────

const STANDBY_PEERS = [
  { id: "peer-central-node",       endpoint: "/api/central-node/ports",      status: "standby" },
  { id: "peer-quantum-backbone",   endpoint: "/api/quantum-backbone",         status: "standby" },
  { id: "peer-nesara",             endpoint: "/api/nesara",                   status: "standby" },
  { id: "peer-financial-hub",      endpoint: "/api/financial-hub",            status: "standby" },
  { id: "peer-mesh",               endpoint: "/api/saib/mesh",                status: "standby" },
  { id: "peer-network-monitoring", endpoint: "/api/saib/network-monitoring",  status: "standby" },
  { id: "peer-sentinel",           endpoint: "/api/saib/sentinel",            status: "standby" },
];

/** Build a standby payload (Docker offline / container unreachable) */
function standbyPayload() {
  const now = new Date().toISOString();
  const cycleId = `QC-${Date.now().toString(36).toUpperCase()}`;
  return {
    version: "SAIB-QUANTUM-CORE-v3",
    cycle_id: cycleId,
    status: "standby",
    containerOnline: false,
    note: "Docker container unavailable — returning graceful standby. All data below is static.",
    peers: STANDBY_PEERS.map((p) => ({
      ...p,
      probed_at: now,
      latency_ms: null,
    })),
    loophole_scan_totals: {
      total: STANDBY_LOOPHOLES.length,
      high_confidence: STANDBY_LOOPHOLES.filter((l) => l.score >= 90).length,
      loopholes: STANDBY_LOOPHOLES,
    },
    real_world: [
      { symbol: "XAU/USD", name: "Gold",    price_usd: null, source: "standby", updated_at: now },
      { symbol: "BTC/USD", name: "Bitcoin", price_usd: null, source: "standby", updated_at: now },
      { symbol: "PI/USD",  name: "Pi",      price_usd: 314159,  source: "internal-sovereign", updated_at: now },
    ],
    attestation: {
      quantum_signature: "ML-DSA-87-STANDBY",
      signed_at: now,
      signer: "TRIUMPH-SOVEREIGN-NANO-SAIB",
    },
    blockchain_powered: true,
    refreshedAt: now,
  };
}

// ─── GET ──────────────────────────────────────────────────────────────────

export async function GET() {
  const now = new Date().toISOString();

  try {
    const headers: Record<string, string> = { Accept: "application/json" };
    if (SAIB_TOKEN) headers["Authorization"] = `Bearer ${SAIB_TOKEN}`;

    const upstream = await fetch(`${NANO_SAIB_URL}/quantum-core`, {
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });

    if (!upstream.ok) {
      return NextResponse.json(
        {
          ...standbyPayload(),
          status: "degraded",
          containerOnline: true,
          error: `SAIB quantum-core returned ${upstream.status}`,
          note: "Container online but quantum-core endpoint returned an error.",
        },
        { status: 200 }
      );
    }

    const data = await upstream.json();
    return NextResponse.json({
      version: "SAIB-QUANTUM-CORE-v3",
      status: "online",
      containerOnline: true,
      ...data,
      refreshedAt: now,
    });
  } catch {
    // Container unreachable — return graceful standby
    return NextResponse.json(standbyPayload(), { status: 200 });
  }
}

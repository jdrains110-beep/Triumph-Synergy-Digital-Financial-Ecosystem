/**
 * app/api/saib/network-monitoring/route.ts
 *
 * SAIB Network Monitoring status endpoint.
 *
 * Proxies to the Sovereign Nano SAIB container (/status) to pull live network
 * signal data. When Docker is unavailable (Replit web-only mode), returns 200
 * with a graceful-degradation payload so the SAIB dashboard shows STANDBY
 * instead of a hard 503 error.
 */

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const NANO_SAIB_URL =
  process.env.NANO_SAIB_URL ?? "http://triumph-sovereign-nano-saib:8201";
const SAIB_TOKEN = process.env.SAIB_TOKEN ?? "";

export async function GET() {
  try {
    const headers: Record<string, string> = {
      Accept: "application/json",
    };
    if (SAIB_TOKEN) {
      headers["Authorization"] = `Bearer ${SAIB_TOKEN}`;
    }

    const upstream = await fetch(`${NANO_SAIB_URL}/status`, {
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });

    if (!upstream.ok) {
      return NextResponse.json(
        {
          ok: false,
          status: "degraded",
          mode: "network-monitoring",
          containerOnline: true,
          error: `SAIB status returned ${upstream.status}`,
          networkSignals: 0,
          anomalies: 0,
          refreshedAt: new Date().toISOString(),
        },
        { status: 200 }
      );
    }

    const data = await upstream.json();

    // Extract network-specific fields from the full status payload
    const networkData = {
      ok: true,
      status: "online",
      mode: "network-monitoring",
      containerOnline: true,
      signalsProcessed: data.signals_processed ?? 0,
      networkSignals: data.network_signals ?? 0,
      anomalies: data.anomalies ?? 0,
      ewmaBaselines: data.ewma_baselines ?? 0,
      peerCount: data.mesh?.peer_count ?? 0,
      autoHealed: data.auto_healed ?? 0,
      healCount: data.heal_count ?? 0,
      uptime: data.uptime_s ?? 0,
      refreshedAt: new Date().toISOString(),
    };

    return NextResponse.json(networkData);
  } catch {
    // Container unreachable — graceful standby (200, not 503)
    return NextResponse.json({
      ok: true,
      status: "standby",
      mode: "network-monitoring",
      containerOnline: false,
      note: "SAIB network monitor container offline — start with: docker compose up -d sovereign-nano-saib",
      signalsProcessed: 0,
      networkSignals: 0,
      anomalies: 0,
      ewmaBaselines: 0,
      peerCount: 0,
      autoHealed: 0,
      healCount: 0,
      uptime: 0,
      meshId: "sovereign-nano-saib",
      version: "TRIUMPH-SAIB-v5",
      securityLevel: "APEX-QUANTUM-SOVEREIGN",
      refreshedAt: new Date().toISOString(),
    });
  }
}

/**
 * app/api/saib/sentinel/route.ts
 *
 * SAIB Sentinel Mesh status endpoint.
 *
 * Proxies to the Sovereign Nano SAIB container (/guardian/summary) to pull live
 * threat-sentinel data. When Docker is unavailable (Replit web-only mode), returns
 * 200 with a graceful-degradation payload so the SAIB dashboard shows STANDBY
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

    const upstream = await fetch(`${NANO_SAIB_URL}/guardian/summary`, {
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });

    if (!upstream.ok) {
      return NextResponse.json(
        {
          ok: false,
          status: "degraded",
          mode: "sentinel",
          containerOnline: true,
          error: `SAIB guardian returned ${upstream.status}`,
          activeAlerts: 0,
          threatsBlocked: 0,
          overallTier: "UNKNOWN",
          refreshedAt: new Date().toISOString(),
        },
        { status: 200 }
      );
    }

    const data = await upstream.json();
    return NextResponse.json({
      ok: true,
      status: "online",
      mode: "sentinel",
      containerOnline: true,
      activeAlerts: data.active_alerts ?? 0,
      threatsBlocked: data.threats_blocked ?? 0,
      overallTier: data.overall_tier ?? "ACTIVE",
      categories: data.categories ?? [],
      recentAlerts: data.recent_alerts ?? [],
      refreshedAt: new Date().toISOString(),
    });
  } catch {
    // Container unreachable — graceful standby (200, not 503)
    return NextResponse.json({
      ok: true,
      status: "standby",
      mode: "sentinel",
      containerOnline: false,
      note: "SAIB sentinel container offline — start with: docker compose up -d sovereign-nano-saib",
      activeAlerts: 0,
      threatsBlocked: 0,
      overallTier: "STANDBY",
      categories: [],
      recentAlerts: [],
      meshId: "sovereign-nano-saib",
      version: "TRIUMPH-SAIB-v5",
      securityLevel: "APEX-QUANTUM-SOVEREIGN",
      intelligenceMode: "sentinel",
      refreshedAt: new Date().toISOString(),
    });
  }
}

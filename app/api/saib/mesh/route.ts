/**
 * app/api/saib/mesh/route.ts
 *
 * SAIB Backbone — Apex Mesh status endpoint.
 *
 * When the Sovereign Nano SAIB Docker container (triumph-sovereign-nano-saib:8201)
 * is running, this route proxies to /mesh/stats and returns live peer-mesh data.
 * When Docker is unavailable (e.g. Replit web-only mode), it returns a 200
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

    const upstream = await fetch(`${NANO_SAIB_URL}/mesh/stats`, {
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });

    if (!upstream.ok) {
      // Container responded but with an error — surface as degraded, not 503
      return NextResponse.json(
        {
          ok: false,
          status: "degraded",
          mode: "mesh",
          containerOnline: true,
          error: `SAIB mesh returned ${upstream.status}`,
          peers: 0,
          peerList: [],
          gossipRounds: 0,
          lastGossip: null,
          refreshedAt: new Date().toISOString(),
        },
        { status: 200 }
      );
    }

    const data = await upstream.json();
    return NextResponse.json({
      ok: true,
      status: "online",
      mode: "mesh",
      containerOnline: true,
      ...data,
      refreshedAt: new Date().toISOString(),
    });
  } catch {
    // Container unreachable — graceful standby (200, not 503)
    return NextResponse.json({
      ok: true,
      status: "standby",
      mode: "mesh",
      containerOnline: false,
      note: "SAIB mesh container offline — start with: docker compose up -d sovereign-nano-saib",
      peers: 0,
      peerList: [],
      gossipRounds: 0,
      lastGossip: null,
      meshId: "sovereign-nano-saib",
      version: "TRIUMPH-SAIB-v5",
      securityLevel: "APEX-QUANTUM-SOVEREIGN",
      refreshedAt: new Date().toISOString(),
    });
  }
}

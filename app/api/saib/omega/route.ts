/**
 * app/api/saib/omega/route.ts
 *
 * SAIB v6 Omega Prime — full status proxy.
 * Returns the three-mode status (Mesh | Container | Ecosystem),
 * OmegaBrain stats, and Founder Presence overview.
 */

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const NANO_SAIB_URL =
  process.env.NANO_SAIB_URL ?? "http://triumph-sovereign-nano-saib:8201";
const SAIB_TOKEN = process.env.SAIB_TOKEN ?? "";

function authHeaders(): Record<string, string> {
  const h: Record<string, string> = { Accept: "application/json" };
  if (SAIB_TOKEN) h["Authorization"] = `Bearer ${SAIB_TOKEN}`;
  return h;
}

/** GET /api/saib/omega  — Omega Prime full status */
export async function GET() {
  try {
    const [omegaRes, brainRes, founderRes] = await Promise.all([
      fetch(`${NANO_SAIB_URL}/omega/status`, {
        headers: authHeaders(),
        cache: "no-store",
        signal: AbortSignal.timeout(5_000),
      }),
      fetch(`${NANO_SAIB_URL}/omega/brain/stats`, {
        headers: authHeaders(),
        cache: "no-store",
        signal: AbortSignal.timeout(5_000),
      }),
      fetch(`${NANO_SAIB_URL}/omega/founder/status`, {
        headers: authHeaders(),
        cache: "no-store",
        signal: AbortSignal.timeout(5_000),
      }),
    ]);

    if (!omegaRes.ok || !brainRes.ok) {
      return NextResponse.json(
        {
          ok: false,
          status: "DEGRADED",
          message: "Omega Prime upstream returned an error",
        },
        { status: 502 }
      );
    }

    const [omega, brain, founder] = await Promise.all([
      omegaRes.json(),
      brainRes.json(),
      founderRes.ok ? founderRes.json() : null,
    ]);

    return NextResponse.json({
      ok: true,
      version: omega.version ?? "6.0.0-OMEGA-PRIME",
      precision_tier: omega.precision_tier,
      active_modes: omega.active_modes ?? [],
      uptime_s: omega.uptime_s,
      brain,
      founder: founder ?? null,
      mesh_engine: omega.mesh_engine,
      container_engine: omega.container_engine,
      ecosystem_engine: omega.ecosystem_engine,
    });
  } catch {
    return NextResponse.json(
      {
        ok: false,
        status: "STANDBY",
        version: "6.0.0-OMEGA-PRIME",
        message: "Omega Prime offline — Docker container not running",
        active_modes: ["MESH", "CONTAINER", "ECOSYSTEM"],
        brain: { total_nodes: 0, growth_cycle: 0 },
        founder: null,
      },
      { status: 200 }
    );
  }
}

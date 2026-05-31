/**
 * app/api/saib/omnipresence/route.ts
 *
 * SAIB Omnipresence Engine — real-time coverage scan across all Triumph services.
 *
 * GET /api/saib/omnipresence
 *   → Returns SAIB coverage status: reachable services, protected user count,
 *     guardian status (OMNIPRESENT | DEGRADED | OFFLINE).
 *
 * No auth required — this is a public health endpoint.
 * Sovereign intelligence meta-data is excluded from public view.
 */

import { NextResponse } from "next/server";
import { scanOmnipresence } from "@/lib/saib/sovereignty";

export const dynamic = "force-dynamic";

export async function GET() {
  const scan = await scanOmnipresence();

  return NextResponse.json({
    saib: "INTREPID CLASS v7.0.0",
    doctrine: "Post-scarcity • Hyper-Intelligence • Omnipresence",
    ...scan,
    // Public view only — protected user count omitted for privacy
    protectedUserCount: undefined,
    scale: {
      internal: "triumph-net mesh — all containers monitored",
      external: "Pi Network mainnet + Stellar DEX + real-estate + judicial",
      transcendence: "every interaction, every platform, every subcontainer",
    },
  });
}

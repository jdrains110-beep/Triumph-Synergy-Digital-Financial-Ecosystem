/**
 * GET /api/saib/region
 * ─────────────────────────────────────────────────────────────────────────
 * Public, side-effect-having endpoint. Returns the visitor's detected
 * country, language, and region group; simultaneously increments the
 * region/language counters in the redis-mesh-pod so the mesh-brain sees
 * the traffic and SAIB can react ("SAIB sees the region").
 *
 * Optional admin view: GET /api/saib/region?ranking=1 returns the top-25
 * countries by hit count from the cluster (also useful for analytics).
 */

import { type NextRequest, NextResponse } from "next/server";

import { detectRegion } from "@/lib/saib/geo-language";
import { readRegionRanking, recordRegionHit } from "@/lib/saib/region-counter";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const url        = new URL(req.url);
  const wantRank   = url.searchParams.get("ranking") === "1";
  const langOverride = url.searchParams.get("lang");
  const actorId    = url.searchParams.get("actor_id") || undefined;

  const region = detectRegion(req.headers, langOverride);

  // Fire-and-forget: never block the response on cluster latency.
  void recordRegionHit(region, actorId);

  if (wantRank) {
    const ranking = await readRegionRanking(25);
    return NextResponse.json({
      region,
      ranking,
      saib_says: `Sovereign region awareness — ${ranking.length} active regions tracked.`,
    });
  }

  return NextResponse.json({
    region,
    saib_says:
      `SAIB sees you accessing Triumph Synergy from ${region.country_name} ` +
      `(${region.region_group.replace(/_/g, " ")}) — speaking ${region.language_name}.`,
  });
}

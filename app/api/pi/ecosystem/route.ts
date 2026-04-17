/**
 * Pi Ecosystem Status API
 * ========================
 * GET  /api/pi/ecosystem          → Full ecosystem health + integration map
 * GET  /api/pi/ecosystem?summary  → Compact integration summary
 * GET  /api/pi/ecosystem?tier=sdk → Filter by tier (core|sdk|platform|community|upstream)
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getEcosystemHealth,
  getIntegrationSummary,
  getReposByTier,
  getRegistryStats,
  PI_ECOSYSTEM_REGISTRY,
  type RepoTier,
} from "@/lib/pi-ecosystem";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  // Compact summary mode
  if (searchParams.has("summary")) {
    return NextResponse.json({
      ok: true,
      data: getIntegrationSummary(),
    });
  }

  // Filter by tier
  const tier = searchParams.get("tier") as RepoTier | null;
  if (tier) {
    const repos = getReposByTier(tier);
    return NextResponse.json({
      ok: true,
      tier,
      count: repos.length,
      repos: repos.map((r) => ({
        upstream: r.upstream,
        fork: r.fork,
        status: r.status,
        stars: r.stars,
        language: r.language,
        description: r.description,
        integrationPoints: r.integrationPoints,
        localBindings: r.localBindings,
      })),
    });
  }

  // Full ecosystem health check
  const health = await getEcosystemHealth();

  return NextResponse.json({
    ok: true,
    ecosystem: "Triumph Synergy Quantum Financial Ecosystem",
    version: health.registryVersion,
    integrationScore: health.integrationScore,
    timestamp: health.timestamp,
    stats: health.stats,
    platforms: health.platforms,
    forkSummary: health.forkSummary,
    registry: PI_ECOSYSTEM_REGISTRY.map((r) => ({
      upstream: r.upstream,
      fork: `https://github.com/${r.fork}`,
      tier: r.tier,
      status: r.status,
      stars: r.stars,
      language: r.language,
      integrationPoints: r.integrationPoints.length,
      localBindings: r.localBindings.length,
    })),
  });
}

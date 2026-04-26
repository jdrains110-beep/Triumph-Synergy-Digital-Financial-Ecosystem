/**
 * /api/sovereign/pidex/loopholes
 * Sovereign Pi-DEX — All 61 Regulatory Loopholes
 *
 * GET — full loophole registry, filterable by target/minScore/keyword
 */

import { NextResponse } from "next/server";
import {
  ALL_PIDEX_LOOPHOLES,
  SOVEREIGN_PIDEX_VERSION,
  APEX_SECURITY_LEVEL,
  type PiDexLoopholeTarget,
} from "@/lib/programs/sovereign-pidex";

export const dynamic = "force-dynamic";
export const revalidate = 60;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const target    = searchParams.get("target") as PiDexLoopholeTarget | null;
  const minScore  = Number(searchParams.get("minScore") ?? 0);
  const keyword   = searchParams.get("q")?.toLowerCase() ?? "";
  const pulse     = searchParams.get("pulse") === "1"; // only deployOnPulse=true

  let loopholes = ALL_PIDEX_LOOPHOLES;

  if (target)   loopholes = loopholes.filter(l => l.target === target);
  if (minScore) loopholes = loopholes.filter(l => l.obliterationScore >= minScore);
  if (keyword)  loopholes = loopholes.filter(l =>
    l.title.toLowerCase().includes(keyword) ||
    l.effect.toLowerCase().includes(keyword) ||
    l.cite.toLowerCase().includes(keyword)
  );
  if (pulse)    loopholes = loopholes.filter(l => l.deployOnPulse);

  const avgScore = loopholes.length
    ? loopholes.reduce((s, l) => s + l.obliterationScore, 0) / loopholes.length
    : 0;

  return NextResponse.json({
    success:         true,
    programId:       SOVEREIGN_PIDEX_VERSION,
    securityLevel:   APEX_SECURITY_LEVEL,
    totalLoopholes:  ALL_PIDEX_LOOPHOLES.length,
    filtered:        loopholes.length,
    avgObliterationScore: Math.round(avgScore * 100) / 100,
    filters: { target, minScore, keyword, pulse },
    loopholes,
    computedAt:      new Date().toISOString(),
  });
}

/**
 * /api/sovereign/health/loopholes
 * Triumph Synergy — Sovereign Health Loophole Scanner
 * Covers all 5 authorities: SCHA · SNCA · SMWA · SNPA · SHWA
 *
 * GET  ?target=MEDICARE|CMS|MIDWIFE|FDA_NUTRITION|ACA&minScore=70
 * POST { scenario, keywords[], minObliteration }
 *      scenarios: "medicare-denial" | "nursing-cms" | "midwife-block" |
 *                 "fda-nutrition" | "aca-cobra" | "employer-health" | "all"
 */

import { NextRequest, NextResponse } from "next/server";
import {
  SCHA_LOOPHOLES,
  SNCA_LOOPHOLES,
  SMWA_LOOPHOLES,
  SNPA_LOOPHOLES,
  SHWA_LOOPHOLES,
  ALL_HEALTH_LOOPHOLE_COUNT,
  SOVEREIGN_HEALTH_VERSION,
  APEX_SECURITY_LEVEL,
  QUANTUM_ALGO_SIG,
} from "@/lib/programs/sovereign-health";

export const dynamic = "force-dynamic";

const ALL_LOOPHOLES = [
  ...SCHA_LOOPHOLES.map(l => ({ ...l, authority_id: "SCHA", program: "Sovereign Care & Hospital Authority" })),
  ...SNCA_LOOPHOLES.map(l => ({ ...l, authority_id: "SNCA", program: "Sovereign Nursing & Care Authority" })),
  ...SMWA_LOOPHOLES.map(l => ({ ...l, authority_id: "SMWA", program: "Sovereign Midwife & Wellness Authority" })),
  ...SNPA_LOOPHOLES.map(l => ({ ...l, authority_id: "SNPA", program: "Sovereign Nutrition & Prevention Authority" })),
  ...SHWA_LOOPHOLES.map(l => ({ ...l, authority_id: "SHWA", program: "Sovereign Health Workforce Authority" })),
];

function targetLabel(target: string): string {
  const map: Record<string, string> = {
    MEDICARE:      "Medicare / Medicaid (SCHA)",
    CMS:           "CMS Nursing Homes (SNCA)",
    MIDWIFE:       "Hospital OB/GYN / State Licensing (SMWA)",
    FDA_NUTRITION: "FDA / USDA Nutrition (SNPA)",
    ACA:           "ACA / COBRA / Employer Health (SHWA)",
  };
  return map[target] ?? target;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const target   = searchParams.get("target")?.toUpperCase();
  const minScore = Number(searchParams.get("minScore") ?? "0");

  let loopholes = ALL_LOOPHOLES.map(l => ({ ...l, programName: targetLabel(l.target) }));

  if (target) loopholes = loopholes.filter(l => l.target === target);
  if (minScore > 0) loopholes = loopholes.filter(l => l.obliterationScore >= minScore);

  return NextResponse.json({
    success: true,
    programId: SOVEREIGN_HEALTH_VERSION,
    securityLevel: APEX_SECURITY_LEVEL,
    totalLoopholes: loopholes.length,
    platformTotal: ALL_HEALTH_LOOPHOLE_COUNT,
    autoDismissLoopholes: loopholes.filter(l => l.autoDismiss).length,
    averageObliterationScore: Math.round(
      loopholes.reduce((a, l) => a + l.obliterationScore, 0) / (loopholes.length || 1),
    ),
    breakdown: {
      SCHA: SCHA_LOOPHOLES.length,
      SNCA: SNCA_LOOPHOLES.length,
      SMWA: SMWA_LOOPHOLES.length,
      SNPA: SNPA_LOOPHOLES.length,
      SHWA: SHWA_LOOPHOLES.length,
    },
    loopholes,
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    scenario,
    keywords = [],
    minObliteration = 70,
  } = body;

  if (!scenario) {
    return NextResponse.json({ success: false, error: "scenario is required" }, { status: 400 });
  }

  const safeKeywords = (Array.isArray(keywords) ? keywords : [])
    .slice(0, 20)
    .map((k: unknown) => String(k).toLowerCase().slice(0, 50));

  const scenarioTargets: Record<string, string[]> = {
    "medicare-denial":    ["MEDICARE"],
    "nursing-cms":        ["CMS"],
    "midwife-block":      ["MIDWIFE"],
    "fda-nutrition":      ["FDA_NUTRITION"],
    "aca-cobra":          ["ACA"],
    "employer-health":    ["ACA"],
    "all":                ["MEDICARE", "CMS", "MIDWIFE", "FDA_NUTRITION", "ACA"],
  };

  const targets = scenarioTargets[scenario];
  if (!targets) {
    return NextResponse.json({
      success: false,
      error: `Unknown scenario '${scenario}'. Valid: ${Object.keys(scenarioTargets).join(", ")}`,
    }, { status: 400 });
  }

  let matched = ALL_LOOPHOLES.filter(
    l => targets.includes(l.target) && l.obliterationScore >= minObliteration,
  );

  if (safeKeywords.length > 0) {
    matched = matched.filter(l =>
      safeKeywords.some(kw =>
        l.title.toLowerCase().includes(kw) ||
        l.effect.toLowerCase().includes(kw) ||
        l.cite.toLowerCase().includes(kw),
      ),
    );
  }

  matched.sort((a, b) => b.obliterationScore - a.obliterationScore);

  return NextResponse.json({
    success: true,
    programId: SOVEREIGN_HEALTH_VERSION,
    securityLevel: APEX_SECURITY_LEVEL,
    quantumSignatureAlgo: QUANTUM_ALGO_SIG,
    scenario,
    targets,
    matchedLoopholes: matched.length,
    autoDismiss: matched.filter(l => l.autoDismiss).length,
    topScore: matched[0]?.obliterationScore ?? 0,
    avgScore: matched.length
      ? Math.round(matched.reduce((a, l) => a + l.obliterationScore, 0) / matched.length)
      : 0,
    loopholes: matched,
  });
}

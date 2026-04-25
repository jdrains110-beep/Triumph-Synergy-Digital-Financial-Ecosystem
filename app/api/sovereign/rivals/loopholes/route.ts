/**
 * /api/sovereign/rivals/loopholes
 * Unified Loophole Scanner — IRS + DCF + D&B
 *
 * GET  — All loopholes across all three rivals
 * POST — Scan a scenario and return activated loopholes + sovereign strategy
 */

import { NextRequest, NextResponse } from "next/server";
import {
  IRS_LOOPHOLES,
  DCF_LOOPHOLES,
  DNB_LOOPHOLES,
  SOVEREIGN_RIVALS_VERSION,
  APEX_SECURITY_LEVEL,
  QUANTUM_ALGO_SIG,
  buildRivalsStats,
} from "@/lib/programs/sovereign-rivals";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const target = searchParams.get("target"); // "irs" | "dcf" | "dnb" | null (all)
  const minScore = Number(searchParams.get("minScore") ?? "0");

  let loopholes = [
    ...IRS_LOOPHOLES.map(l => ({ ...l, target: "IRS" as const, rival: "SQTA" })),
    ...DCF_LOOPHOLES.map(l => ({ ...l, target: "DCF" as const, rival: "SFPA" })),
    ...DNB_LOOPHOLES.map(l => ({ ...l, target: "DNB" as const, rival: "SBCA" })),
  ];

  if (target) {
    const t = target.toUpperCase();
    loopholes = loopholes.filter(l => l.target === t);
  }
  if (minScore > 0) {
    loopholes = loopholes.filter(l => l.obliterationScore >= minScore);
  }

  return NextResponse.json({
    success: true,
    programId: SOVEREIGN_RIVALS_VERSION,
    securityLevel: APEX_SECURITY_LEVEL,
    quantumSignatureAlgo: QUANTUM_ALGO_SIG,
    totalLoopholes: loopholes.length,
    averageObliterationScore: Math.round(
      loopholes.reduce((a, l) => a + l.obliterationScore, 0) / (loopholes.length || 1),
    ),
    breakdown: {
      irs: IRS_LOOPHOLES.length,
      dcf: DCF_LOOPHOLES.length,
      dnb: DNB_LOOPHOLES.length,
    },
    loopholes,
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    scenario,          // "irs-audit" | "dcf-investigation" | "dnb-dispute" | "all"
    keywords = [],     // ["income", "removal", "credit"] etc.
    minObliteration = 70,
  } = body;

  if (!scenario) {
    return NextResponse.json(
      { success: false, error: "scenario is required" },
      { status: 400 },
    );
  }

  const safeKeywords = (Array.isArray(keywords) ? keywords : [])
    .slice(0, 20)
    .map((k: unknown) => String(k).toLowerCase().slice(0, 50));

  const results: {
    target: string;
    rival: string;
    cite: string;
    title: string;
    effect: string;
    obliterationScore: number;
    keywordMatches: string[];
  }[] = [];

  const allLoopholes = [
    ...IRS_LOOPHOLES.map(l => ({ ...l, target: "IRS", rival: "SQTA" })),
    ...DCF_LOOPHOLES.map(l => ({ ...l, target: "DCF", rival: "SFPA" })),
    ...DNB_LOOPHOLES.map(l => ({ ...l, target: "DNB", rival: "SBCA" })),
  ];

  const scenarioTargets: Record<string, string[]> = {
    "irs-audit":        ["IRS"],
    "irs-criminal":     ["IRS"],
    "dcf-investigation":["DCF"],
    "dcf-removal":      ["DCF"],
    "dnb-dispute":      ["DNB"],
    "dnb-inaccuracy":   ["DNB"],
    "all":              ["IRS", "DCF", "DNB"],
  };

  const targets = scenarioTargets[scenario] ?? ["IRS", "DCF", "DNB"];

  for (const l of allLoopholes) {
    if (!targets.includes(l.target)) continue;
    if (l.obliterationScore < minObliteration) continue;

    const haystack = `${l.cite} ${l.title} ${l.effect}`.toLowerCase();
    const matches  = safeKeywords.filter(k => haystack.includes(k));

    // Include if keyword matches OR if it's a high-obliteration loophole
    if (matches.length > 0 || l.obliterationScore >= 85 || safeKeywords.length === 0) {
      results.push({
        target: l.target,
        rival: l.rival,
        cite: l.cite,
        title: l.title,
        effect: l.effect,
        obliterationScore: l.obliterationScore,
        keywordMatches: matches,
      });
    }
  }

  // Sort: highest obliteration first
  results.sort((a, b) => b.obliterationScore - a.obliterationScore);

  const sovereignStrategy = buildSovereignStrategy(scenario, results);

  return NextResponse.json({
    success: true,
    scenario,
    targetsScanned: targets,
    loopholesActivated: results.length,
    averageObliterationScore: Math.round(
      results.reduce((a, l) => a + l.obliterationScore, 0) / (results.length || 1),
    ),
    sovereignStrategy,
    loopholes: results,
    stats: buildRivalsStats(),
  });
}

function buildSovereignStrategy(scenario: string, loopholes: { target: string; cite: string; title: string; obliterationScore: number }[]): string[] {
  const strategy: string[] = [];
  const autoDismiss = loopholes.filter(l => l.obliterationScore >= 92);
  const strong      = loopholes.filter(l => l.obliterationScore >= 80 && l.obliterationScore < 92);

  if (scenario.startsWith("irs")) {
    strategy.push("IMMEDIATE: File SQTA sovereign tax profile — establishes Pi-as-property position on record");
    strategy.push("File IRS Form 843 dispute citing IRS Notice 2014-21 and EO 14178");
    strategy.push("Invoke IRC §7491 — shift burden of proof to IRS with quantum-certified filing");
    strategy.push("Apply NESARA exemption filing — challenge constitutionality of income tax on Pi labour");
    strategy.push("Document all Pi transactions as property exchanges — zero income recognition");
  } else if (scenario.startsWith("dcf")) {
    strategy.push("IMMEDIATE: Register family under SFPA — creates Pi blockchain immutable record");
    strategy.push("Do NOT consent to home entry without a warrant (4th Amendment)");
    strategy.push("Do NOT allow child interview without attorney present (In re Gault)");
    strategy.push("Demand written documentation of all allegations before any response");
    strategy.push("File emergency injunction citing 14th Amendment family integrity right");
    strategy.push("Subpoena DCF Title IV-E financial records to prove institutional removal bias");
    strategy.push("File 42 U.S.C. §1983 civil rights claim for personal liability against DCF workers");
  } else if (scenario.startsWith("dnb")) {
    strategy.push("IMMEDIATE: Register under SBCA — PIUN issued, D&B is no longer required");
    strategy.push("File SBCA D&B dispute letter citing FTC Act §5 and state data rights laws");
    strategy.push("Notify lenders that DUNS was discontinued by U.S. government in April 2022");
    strategy.push("Present PIUN + Pi Business Score as superior credit identity to all lenders");
    strategy.push("File FTC complaint if D&B fails to correct within 30 days");
  } else {
    strategy.push("Activate all three sovereign rivals: SQTA (IRS) + SFPA (DCF) + SBCA (D&B)");
    strategy.push("Register Pi Universal Number (PIUN) — replaces both SSN/EIN and DUNS in Pi ecosystem");
    strategy.push("Create sovereign tax filing — neutralises IRS assessment with 18 loopholes");
    strategy.push("Register family under SFPA — constitutional shield against DCF intervention");
    strategy.push("Issue Pi Business Score — renders D&B obsolete for Pi ecosystem commerce");
  }

  if (autoDismiss.length > 0) {
    strategy.push(`AUTO-DISMISS ELIGIBLE: ${autoDismiss.length} loophole(s) with score ≥ 92 — immediate case termination possible`);
  }
  if (strong.length > 0) {
    strategy.push(`${strong.length} strong loophole(s) available — significant legal leverage`);
  }

  return strategy;
}

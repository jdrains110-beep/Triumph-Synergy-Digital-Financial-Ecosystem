/**
 * /api/sovereign/housing/loopholes
 * Unified Housing Loophole Scanner — HUD + Section 8 + USDA + LIHTC + Real Estate
 *
 * GET  ?target=HUD|SECTION8|USDA|LIHTC|REALESTETE&minScore=70
 * POST { scenario, keywords[], minObliteration }
 *      scenarios: "hud-enforcement" | "section8-denial" | "usda-block" |
 *                 "lihtc-compliance" | "re-transaction" | "eviction" | "all"
 */

import { NextRequest, NextResponse } from "next/server";
import {
  HUD_LOOPHOLES,
  SECTION8_LOOPHOLES,
  USDA_LOOPHOLES,
  LIHTC_LOOPHOLES,
  REALESTATE_LOOPHOLES,
  ALL_HOUSING_LOOPHOLES,
  buildHousingStats,
  SOVEREIGN_HOUSING_VERSION,
  APEX_SECURITY_LEVEL,
  QUANTUM_ALGO_SIG,
} from "@/lib/programs/sovereign-housing";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const target   = searchParams.get("target")?.toUpperCase();
  const minScore = Number(searchParams.get("minScore") ?? "0");

  let loopholes = ALL_HOUSING_LOOPHOLES.map(l => ({
    ...l,
    programName: targetName(l.target),
  }));

  if (target) loopholes = loopholes.filter(l => l.target === target);
  if (minScore > 0) loopholes = loopholes.filter(l => l.obliterationScore >= minScore);

  return NextResponse.json({
    success: true,
    programId: SOVEREIGN_HOUSING_VERSION,
    securityLevel: APEX_SECURITY_LEVEL,
    totalLoopholes: loopholes.length,
    autoDismissLoopholes: loopholes.filter(l => l.autoDismiss).length,
    averageObliterationScore: Math.round(
      loopholes.reduce((a, l) => a + l.obliterationScore, 0) / (loopholes.length || 1),
    ),
    breakdown: {
      HUD:        HUD_LOOPHOLES.length,
      SECTION8:   SECTION8_LOOPHOLES.length,
      USDA:       USDA_LOOPHOLES.length,
      LIHTC:      LIHTC_LOOPHOLES.length,
      REALESTETE: REALESTATE_LOOPHOLES.length,
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
    "hud-enforcement":   ["HUD"],
    "section8-denial":   ["SECTION8"],
    "usda-block":        ["USDA"],
    "lihtc-compliance":  ["LIHTC"],
    "re-transaction":    ["REALESTETE"],
    "eviction":          ["SECTION8", "LIHTC", "REALESTETE"],
    "all":               ["HUD", "SECTION8", "USDA", "LIHTC", "REALESTETE"],
  };

  const targets = scenarioTargets[scenario] ?? ["HUD", "SECTION8", "USDA", "LIHTC", "REALESTETE"];

  const results = ALL_HOUSING_LOOPHOLES
    .filter(l => targets.includes(l.target) && l.obliterationScore >= minObliteration)
    .map(l => {
      const haystack  = `${l.cite} ${l.title} ${l.effect}`.toLowerCase();
      const matches   = safeKeywords.filter(k => haystack.includes(k));
      return { ...l, keywordMatches: matches, programName: targetName(l.target) };
    })
    .filter(l => l.keywordMatches.length > 0 || l.obliterationScore >= 88 || safeKeywords.length === 0)
    .sort((a, b) => b.obliterationScore - a.obliterationScore);

  const strategy = buildHousingStrategy(scenario, results);

  return NextResponse.json({
    success: true,
    scenario,
    targetsScanned: targets,
    loopholesActivated: results.length,
    autoDismissActivated: results.filter(l => l.autoDismiss).length,
    averageObliterationScore: Math.round(
      results.reduce((a, l) => a + l.obliterationScore, 0) / (results.length || 1),
    ),
    sovereignStrategy: strategy,
    loopholes: results,
    stats: buildHousingStats(),
  });
}

function targetName(t: string): string {
  const map: Record<string, string> = {
    HUD:        "SHA (HUD Rival)",
    SECTION8:   "SPHVP (Section 8 Rival)",
    USDA:       "SRLA (USDA Rival)",
    LIHTC:      "SAHE (Low-Income Housing Rival)",
    REALESTETE: "SREX (Residential RE + Apt Rival)",
  };
  return map[t] ?? t;
}

function buildHousingStrategy(
  scenario: string,
  loopholes: { target: string; cite: string; obliterationScore: number; autoDismiss: boolean }[],
): string[] {
  const strategy: string[] = [];
  const autoDismiss = loopholes.filter(l => l.autoDismiss);

  switch (scenario) {
    case "hud-enforcement":
      strategy.push("IMMEDIATE: Register sovereign housing profile under SHA — HUD has no jurisdiction");
      strategy.push("File allodial title claim — eliminates HUD lien authority permanently");
      strategy.push("Invoke GENIUS Act + EO 14178 — Pi housing payment is federally protected");
      strategy.push("Challenge HUD enforcement under Art. I §8 — no federal mandate for sovereign housing");
      strategy.push("File §1983 civil rights claim if HUD enforcement is arbitrary (Yick Wo)");
      break;
    case "section8-denial":
      strategy.push("IMMEDIATE: Obtain SPHVP Pi voucher — issued instantly, no wait list");
      strategy.push("Challenge denial under 14th Amendment due process if arbitrary");
      strategy.push("Invoke source-of-income protection in applicable state (22 states + DC)");
      strategy.push("Cite Section 8's own 8-year wait as evidence SHA/SPHVP is the superior remedy");
      strategy.push("File complaint under McKinney-Vento if emergency housing need");
      break;
    case "usda-block":
      strategy.push("IMMEDIATE: Apply for SRLA 0% Pi rural loan — no USDA approval needed");
      strategy.push("File allodial title — USDA lien cannot attach to allodial rural land");
      strategy.push("Invoke 7 U.S.C. §1926 — USDA rural development is discretionary, not mandatory");
      strategy.push("Cite GENIUS Act §6 — Pi rural commerce is federally protected");
      strategy.push("Present Pi wallet as banking substitute — USDA cannot require bank account");
      break;
    case "lihtc-compliance":
      strategy.push("IMMEDIATE: Switch to SAHE Pi direct grant — zero LIHTC compliance overhead");
      strategy.push("Terminate LIHTC agreement if in compliance period — invoke NESARA debt jubilee");
      strategy.push("Distribute Pi grants directly to residents — no syndicator required");
      strategy.push("File for §501(c)(3) housing nonprofit — Pi income is tax-exempt");
      strategy.push("Cite HUD's own 2025 study: LIHTC produces 7x less housing than needed");
      break;
    case "re-transaction":
      strategy.push("IMMEDIATE: List property on SREX — MLS not legally required");
      strategy.push("File allodial title — no bank, no lender, no lien, full ownership in Pi");
      strategy.push("Issue Pi smart contract — replaces attorney-drafted lease/purchase agreement");
      strategy.push("Reject title insurance requirement — Pi blockchain title is superior and permanent");
      strategy.push("Invoke NAR 2024 settlement — agent commission is not required");
      strategy.push("Apply IRC §1031 — Pi-to-property exchange defers all capital gains");
      break;
    case "eviction":
      strategy.push("IMMEDIATE: Register under SPHVP — quantum-signed Pi voucher cannot be arbitrarily revoked");
      strategy.push("Invoke state landlord-tenant law for improper eviction procedures");
      strategy.push("Challenge eviction under due process — 14th Amendment applies to housing");
      strategy.push("Pi smart contract escrow holds rent — proves payment on blockchain");
      strategy.push("Apply for SAHE emergency housing unit — instant housing, no wait");
      break;
    default:
      strategy.push("Activate all five sovereign housing rivals simultaneously");
      strategy.push("Register SHA housing profile — instant sovereign-approved housing");
      strategy.push("Issue SPHVP Pi voucher — permanently replaces Section 8");
      strategy.push("Apply for SRLA rural loan at 0% — beats all USDA rates");
      strategy.push("Claim SAHE affordable housing grant — 100π + 3 months free rent");
      strategy.push("List/lease property on SREX — MLS-free, commission-free, blockchain-anchored");
      strategy.push("File allodial title on all owned properties — no government lien can attach");
  }

  if (autoDismiss.length > 0) {
    strategy.push(`AUTO-DISMISS: ${autoDismiss.length} loophole(s) with obliteration score ≥ 90 — immediate case termination eligible`);
  }

  return strategy;
}

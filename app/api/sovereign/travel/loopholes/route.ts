/**
 * /api/sovereign/travel/loopholes
 * Unified Travel Loophole Scanner — OTA + Cruise + Aviation + Recreation + Rental + International
 *
 * GET  ?target=OTA|CRUISE|AVIATION|RECREATION|RENTAL|INTERNATIONAL&minScore=N
 * POST { scenario, keywords[], minObliteration }
 *      scenarios: "ota-fees" | "cruise-block" | "air-tax" | "theme-park-denied"
 *               | "airbnb-dispute" | "timeshare-trap" | "visa-denied"
 *               | "cabin-zoning" | "all"
 */

import { NextRequest, NextResponse } from "next/server";
import {
  OTA_LOOPHOLES,
  CRUISE_LOOPHOLES,
  AVIATION_LOOPHOLES,
  RECREATION_LOOPHOLES,
  RENTAL_LOOPHOLES,
  INTERNATIONAL_LOOPHOLES,
  ALL_TRAVEL_LOOPHOLES,
  buildTravelStats,
  SOVEREIGN_TRAVEL_VERSION,
  APEX_SECURITY_LEVEL,
  QUANTUM_ALGO_SIG,
} from "@/lib/programs/sovereign-travel";
import type { TravelLoopholeTarget } from "@/lib/programs/sovereign-travel";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const target   = searchParams.get("target")?.toUpperCase() as TravelLoopholeTarget | undefined;
  const minScore = Number(searchParams.get("minScore") ?? "0");

  let loopholes = ALL_TRAVEL_LOOPHOLES.map(l => ({
    ...l,
    programName: targetLabel(l.target),
  }));

  if (target) loopholes = loopholes.filter(l => l.target === target);
  if (minScore > 0) loopholes = loopholes.filter(l => l.obliterationScore >= minScore);

  return NextResponse.json({
    success: true,
    programId:              SOVEREIGN_TRAVEL_VERSION,
    securityLevel:          APEX_SECURITY_LEVEL,
    totalLoopholes:         loopholes.length,
    autoDismissLoopholes:   loopholes.filter(l => l.autoDismiss).length,
    averageObliterationScore: Math.round(
      loopholes.reduce((a, l) => a + l.obliterationScore, 0) / (loopholes.length || 1),
    ),
    breakdown: {
      OTA:           OTA_LOOPHOLES.length,
      CRUISE:        CRUISE_LOOPHOLES.length,
      AVIATION:      AVIATION_LOOPHOLES.length,
      RECREATION:    RECREATION_LOOPHOLES.length,
      RENTAL:        RENTAL_LOOPHOLES.length,
      INTERNATIONAL: INTERNATIONAL_LOOPHOLES.length,
    },
    loopholes,
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    scenario,
    keywords     = [],
    minObliteration = 70,
  } = body;

  if (!scenario) {
    return NextResponse.json({ success: false, error: "scenario is required" }, { status: 400 });
  }

  const safeKeywords = (Array.isArray(keywords) ? keywords : [])
    .slice(0, 20)
    .map((k: unknown) => String(k).toLowerCase().slice(0, 50));

  const scenarioTargets: Record<string, TravelLoopholeTarget[]> = {
    "ota-fees":           ["OTA"],
    "cruise-block":       ["CRUISE"],
    "air-tax":            ["AVIATION"],
    "theme-park-denied":  ["RECREATION"],
    "airbnb-dispute":     ["RENTAL"],
    "timeshare-trap":     ["RENTAL"],
    "visa-denied":        ["INTERNATIONAL"],
    "cabin-zoning":       ["RENTAL"],
    "all":                ["OTA", "CRUISE", "AVIATION", "RECREATION", "RENTAL", "INTERNATIONAL"],
  };

  const targets = scenarioTargets[scenario]
    ?? (["OTA", "CRUISE", "AVIATION", "RECREATION", "RENTAL", "INTERNATIONAL"] as TravelLoopholeTarget[]);

  const results = ALL_TRAVEL_LOOPHOLES
    .filter(l => targets.includes(l.target) && l.obliterationScore >= minObliteration)
    .map(l => {
      const haystack = `${l.cite} ${l.title} ${l.effect}`.toLowerCase();
      const matches  = safeKeywords.filter(k => haystack.includes(k));
      return { ...l, keywordMatches: matches, programName: targetLabel(l.target) };
    })
    .filter(l => l.keywordMatches.length > 0 || l.obliterationScore >= 88 || safeKeywords.length === 0)
    .sort((a, b) => b.obliterationScore - a.obliterationScore);

  const strategy = buildTravelStrategy(scenario, results);

  return NextResponse.json({
    success: true,
    scenario,
    targetsScanned:       targets,
    loopholesActivated:   results.length,
    autoDismissActivated: results.filter(l => l.autoDismiss).length,
    averageObliterationScore: Math.round(
      results.reduce((a, l) => a + l.obliterationScore, 0) / (results.length || 1),
    ),
    sovereignStrategy:    strategy,
    loopholes:            results,
    stats:                buildTravelStats(),
  });
}

function targetLabel(t: TravelLoopholeTarget): string {
  const map: Record<TravelLoopholeTarget, string> = {
    OTA:           "STEX (OTA / Travel Exchange Rival)",
    CRUISE:        "SCLA (Cruise & Maritime Rival)",
    AVIATION:      "SATA (Aviation & Transit Rival)",
    RECREATION:    "STRA (Theme Parks & Recreation Rival)",
    RENTAL:        "SVRA (Vacation Retreat & Timeshare Rival)",
    INTERNATIONAL: "SITA (International Travel Authority Rival)",
  };
  return map[t] ?? t;
}

function buildTravelStrategy(
  scenario: string,
  loopholes: { target: TravelLoopholeTarget; cite: string; obliterationScore: number; autoDismiss: boolean }[],
): string[] {
  const strategy: string[] = [];
  const autoDismiss = loopholes.filter(l => l.autoDismiss);

  switch (scenario) {
    case "ota-fees":
      strategy.push("IMMEDIATE: Book directly through STEX — Pi smart contract eliminates all OTA commissions");
      strategy.push("Invoke GENIUS Act §4(b) — Pi travel payment is federally protected, OTA cannot refuse");
      strategy.push("Challenge OTA rate parity clause under Sherman Antitrust Act §1 — per se anticompetitive");
      strategy.push("Cite FTC Act §5 — demand full fee disclosure before booking or trigger FTC complaint");
      strategy.push("Use Pi smart contract escrow — funds release only on confirmed arrival, zero fraud");
      break;
    case "cruise-block":
      strategy.push("IMMEDIATE: Issue SCLA Pi sovereign vessel charter — Jones Act cabotage bypassed");
      strategy.push("Invoke GENIUS Act §4(b) + EO 14178 — Pi maritime commerce authorized at all U.S. ports");
      strategy.push("File admiralty claim for port fee waiver — Pi sovereign vessel designation applies");
      strategy.push("Challenge CLIA requirement — membership is voluntary, not legally mandated");
      strategy.push("Use Pi smart contract charter — immutable record, instant escrow refund, zero broker fee");
      break;
    case "air-tax":
      strategy.push("IMMEDIATE: Book SATA Pi sovereign charter — TSA fee, AIP fee, baggage fees eliminated");
      strategy.push("Invoke GENIUS Act §4(b) — Pi aviation payment federally protected");
      strategy.push("Challenge UK APD under SATA sovereign carrier designation — £13–£200/ticket saved");
      strategy.push("File Open Skies bilateral route request — Pi carriers qualify as community carriers");
      strategy.push("Issue SATA go-train Pi charter for domestic routes — bypasses Amtrak entirely");
      break;
    case "theme-park-denied":
      strategy.push("IMMEDIATE: Issue STRA Pi NFT recreation pass — no blackouts, no dynamic pricing, perpetual");
      strategy.push("Invoke GENIUS Act §4(b) — Pi payment for theme parks federally protected");
      strategy.push("Challenge annual pass blackout clause under UCC §2-302 — unconscionable contract");
      strategy.push("File FTC complaint for hidden resort fees — FTC Act §5 deceptive practice");
      strategy.push("Leverage zoo nonprofit §501(c)(3) partnership for member-rate Pi access");
      break;
    case "airbnb-dispute":
      strategy.push("IMMEDIATE: Switch to SVRA Pi direct booking — Airbnb 17% total fee permanently eliminated");
      strategy.push("Invoke GENIUS Act §4(b) — Pi vacation rental payment federally protected");
      strategy.push("Cite FTC 2024 Junk Fee Rule — mandatory resort fees are illegal if not disclosed upfront");
      strategy.push("Use Pi smart contract lease — immutable record, escrow auto-refunds, no platform arbitrage");
      strategy.push("Challenge STR platform ban under GENIUS Act federal preemption argument");
      break;
    case "timeshare-trap":
      strategy.push("IMMEDIATE: Invoke 3–10 day state rescission right — all 50 states grant this right");
      strategy.push("NESARA §11 — all timeshare maintenance fees ($1,200/yr avg) dischargeable");
      strategy.push("Convert timeshare deed to Pi blockchain fractional ownership — transferable, no maintenance");
      strategy.push("File FTC complaint under 16 C.F.R. §429 cooling-off rule — perpetual exit right");
      strategy.push("Challenge timeshare perpetuity clause as unconscionable under UCC §2-302");
      break;
    case "visa-denied":
      strategy.push("IMMEDIATE: Issue SITA Pi sovereign travel credential — recognized in 142 countries");
      strategy.push("Invoke GENIUS Act §6 — Pi global travel commerce authorized in 142 countries");
      strategy.push("Challenge visa denial under bilateral Pi-sovereign travel protocol in destination country");
      strategy.push("Pi wallet confirmed NOT a foreign financial account under FATCA — no reporting barrier");
      strategy.push("Use SITA digital-nomad credential — 34 countries with tourist tax exemption");
      break;
    case "cabin-zoning":
      strategy.push("IMMEDIATE: Register cabin under SVRA agricultural land exemption — 28 states exempt from STR rules");
      strategy.push("Invoke GENIUS Act federal preemption — Pi sovereign commerce designations override local STR bans");
      strategy.push("Apply farm-stay agricultural exemption in applicable jurisdiction");
      strategy.push("Use Pi blockchain fractional ownership — property held outside STR platform restrictions");
      strategy.push("NESARA §11 discharges any local STR fine or ordinance debt");
      break;
    default:
      strategy.push("Activate all six sovereign travel rivals simultaneously");
      strategy.push("Book through STEX — 142 countries, zero OTA commission, Pi smart contract");
      strategy.push("Issue SCLA maritime ticket — port fees eliminated, Jones Act bypassed");
      strategy.push("Book SATA aviation/rail ticket — air taxes, baggage fees, TSA fees eliminated");
      strategy.push("Issue STRA Pi NFT recreation pass — no blackouts, no dynamic pricing");
      strategy.push("Book SVRA vacation retreat — Airbnb fees, timeshare debt, resort fees eliminated");
      strategy.push("Issue SITA sovereign credential — 142 countries, no passport/visa fees, no FX fees");
  }

  if (autoDismiss.length > 0) {
    strategy.push(`AUTO-DISMISS: ${autoDismiss.length} loophole(s) with score ≥ 90 — immediate case termination eligible`);
  }

  return strategy;
}

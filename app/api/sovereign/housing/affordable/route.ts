/**
 * /api/sovereign/housing/affordable
 * Sovereign Affordable Housing Engine (SAHE) — LIHTC / Low-Income Housing Rival API
 *
 * GET  ?view=stats      → SAHE stats + LIHTC obsolescence declaration
 * GET  ?view=loopholes  → All 13 LIHTC loopholes
 * POST                  → Issue Pi affordable housing unit
 */

import { NextRequest, NextResponse } from "next/server";
import {
  saheEngine,
  LIHTC_LOOPHOLES,
  SOVEREIGN_HOUSING_VERSION,
  APEX_SECURITY_LEVEL,
  QUANTUM_ALGO_SIG,
  SAHE_ID,
  PI_RATE_INTERNAL,
  PI_ANNUAL_RENT_COVERAGE,
} from "@/lib/programs/sovereign-housing";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const view = new URL(req.url).searchParams.get("view");

  if (view === "loopholes") {
    return NextResponse.json({
      success: true,
      programId: SAHE_ID,
      target: "LIHTC",
      securityLevel: APEX_SECURITY_LEVEL,
      totalLoopholes: LIHTC_LOOPHOLES.length,
      autoDismissLoopholes: LIHTC_LOOPHOLES.filter(l => l.autoDismiss).length,
      avgObliterationScore: Math.round(
        LIHTC_LOOPHOLES.reduce((a, l) => a + l.obliterationScore, 0) / LIHTC_LOOPHOLES.length,
      ),
      loopholes: LIHTC_LOOPHOLES,
    });
  }

  const stats = saheEngine.getStats();
  return NextResponse.json({
    success: true,
    programId: SAHE_ID,
    version: SOVEREIGN_HOUSING_VERSION,
    securityLevel: APEX_SECURITY_LEVEL,
    quantumSignatureAlgo: QUANTUM_ALGO_SIG,
    piInternalRate: PI_RATE_INTERNAL,
    stats,
    piEconomics: {
      oneInternalPiUSD: PI_RATE_INTERNAL,
      monthsOfAverageUSRentPerPi: PI_ANNUAL_RENT_COVERAGE,
      avgUSMonthlyRentUSD: 1_000,
      statement: `1 Pioneer-mined π = $${PI_RATE_INTERNAL.toLocaleString()} = ${Math.round(PI_ANNUAL_RENT_COVERAGE / 12)} years of average U.S. rent`,
    },
    lihtcComparison: {
      lihtcOverheadPerUnit: "$35,000 (syndicators + lawyers + compliance)",
      lihtcCompliancePeriod: "10–15 years",
      lihtcHousingProduced: "7x less than needed (HUD 2025)",
      saheOverheadPerUnit: "$0",
      saheCompliancePeriod: "None",
      saheWaitTime: "Instant",
      saheMeansTest: "None",
    },
    lihtcObsolescenceStatement: [
      "LIHTC is a voluntary tax credit — Pi direct subsidy is cheaper, faster, and unlimited.",
      "LIHTC syndicators, lawyers, and compliance officers are permanently eliminated.",
      "SAHE has no means test — any Pi holder receives affordable housing assistance instantly.",
      "1 Pioneer π = $314,159 = 26+ years of average U.S. rent — housing is permanently solved.",
      "SAHE includes 3 months free rent + 100π sovereign housing grant for all participants.",
      "NESARA debt jubilee discharges all low-income housing debt — SAHE provides clean restart.",
    ],
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    piUid,
    piWallet,
    recipientName,
    unitType       = "apartment",
    jurisdiction,
    monthlyRentPi  = 0.15,
    rentFreeMonths = 3,
  } = body;

  if (!piUid || !piWallet || !recipientName || !jurisdiction) {
    return NextResponse.json(
      { success: false, error: "piUid, piWallet, recipientName, and jurisdiction are required" },
      { status: 400 },
    );
  }

  const unit = saheEngine.issueAffordableUnit({
    piUid,
    piWallet,
    recipientName,
    unitType,
    jurisdiction,
    monthlyRentPi: Number(monthlyRentPi),
    rentFreeMonths: Number(rentFreeMonths),
  });

  return NextResponse.json({
    success: true,
    programId: SAHE_ID,
    securityLevel: APEX_SECURITY_LEVEL,
    unit,
    lihtcCostAvoided: "$35,000 in syndicator/legal overhead",
    autoAppliedLoopholes: LIHTC_LOOPHOLES.filter(l => l.autoDismiss).map(l => ({
      id: l.id,
      cite: l.cite,
      title: l.title,
      obliterationScore: l.obliterationScore,
    })),
    sovereignMessage:
      `Sovereign affordable housing unit issued. ${rentFreeMonths} months free rent included. ` +
      "100π sovereign housing grant issued to your Pi wallet. No means test, no income verification, " +
      "no LIHTC compliance period. Pi is your affordable housing authority.",
  });
}

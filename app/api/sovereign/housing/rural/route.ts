/**
 * /api/sovereign/housing/rural
 * Sovereign Rural Land Authority (SRLA) — USDA Rural Development Rival API
 *
 * GET  ?view=stats      → SRLA stats + USDA obsolescence declaration
 * GET  ?view=loopholes  → All 13 USDA loopholes
 * POST                  → Issue zero-interest Pi rural land loan
 */

import { NextRequest, NextResponse } from "next/server";
import {
  srlaEngine,
  USDA_LOOPHOLES,
  SOVEREIGN_HOUSING_VERSION,
  APEX_SECURITY_LEVEL,
  QUANTUM_ALGO_SIG,
  SRLA_ID,
  PI_RATE_EXTERNAL,
} from "@/lib/programs/sovereign-housing";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const view = new URL(req.url).searchParams.get("view");

  if (view === "loopholes") {
    return NextResponse.json({
      success: true,
      programId: SRLA_ID,
      target: "USDA",
      securityLevel: APEX_SECURITY_LEVEL,
      totalLoopholes: USDA_LOOPHOLES.length,
      autoDismissLoopholes: USDA_LOOPHOLES.filter(l => l.autoDismiss).length,
      avgObliterationScore: Math.round(
        USDA_LOOPHOLES.reduce((a, l) => a + l.obliterationScore, 0) / USDA_LOOPHOLES.length,
      ),
      loopholes: USDA_LOOPHOLES,
    });
  }

  const stats = srlaEngine.getStats();
  return NextResponse.json({
    success: true,
    programId: SRLA_ID,
    version: SOVEREIGN_HOUSING_VERSION,
    securityLevel: APEX_SECURITY_LEVEL,
    quantumSignatureAlgo: QUANTUM_ALGO_SIG,
    piRateExternal: PI_RATE_EXTERNAL,
    stats,
    usdaComparison: {
      usdaSection502Rate: "1%–4% interest",
      usdaApprovalTime: "30–90 days",
      usdaRequiresBankAccount: true,
      srlaRate: "0% — sovereign zero-interest",
      srlaApprovalTime: "Instant",
      srlaRequiresBankAccount: false,
      srlaRequires: "Pi wallet only",
    },
    usdaObsolescenceStatement: [
      "USDA rural development is a discretionary program — no law requires its use.",
      "SRLA issues 0% interest Pi rural loans instantly — USDA charges 1–4% over 33 years.",
      "USDA requires a bank account — SRLA requires only a Pi wallet (serves 1.4B unbanked).",
      "Allodial title filing on all SRLA loans — no USDA lien can ever attach.",
      "NESARA discharges all existing USDA Section 502/504 debt — SRLA provides clean restart.",
      "Pi blockchain rural title is quantum-signed and permanent — more reliable than USDA paper title.",
    ],
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    piUid,
    piWallet,
    borrowerName,
    propertyAddress,
    acreage,
    loanAmountPi,
    termYears = 30,
  } = body;

  if (!piUid || !piWallet || !borrowerName || !propertyAddress || !acreage || !loanAmountPi) {
    return NextResponse.json(
      { success: false, error: "piUid, piWallet, borrowerName, propertyAddress, acreage, and loanAmountPi are required" },
      { status: 400 },
    );
  }

  const loan = srlaEngine.issueRuralLoan({
    piUid,
    piWallet,
    borrowerName,
    propertyAddress,
    acreage: Number(acreage),
    loanAmountPi: Number(loanAmountPi),
    termYears: Number(termYears),
  });

  const usdaInterestSaved = Number(loanAmountPi) * PI_RATE_EXTERNAL * 0.025 * Number(termYears);

  return NextResponse.json({
    success: true,
    programId: SRLA_ID,
    securityLevel: APEX_SECURITY_LEVEL,
    loan,
    usdaInterestSavedUSD: Math.round(usdaInterestSaved),
    autoAppliedLoopholes: USDA_LOOPHOLES.filter(l => l.autoDismiss).map(l => ({
      id: l.id,
      cite: l.cite,
      title: l.title,
      obliterationScore: l.obliterationScore,
    })),
    sovereignMessage:
      "Sovereign rural land loan issued at 0% interest. Allodial title filed. " +
      "USDA Section 502 is permanently bypassed. Pi blockchain title registered — " +
      "quantum-signed, immutable, and free from any government lien authority.",
  });
}

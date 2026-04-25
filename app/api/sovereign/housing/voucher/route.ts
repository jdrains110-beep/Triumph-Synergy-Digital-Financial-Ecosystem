/**
 * /api/sovereign/housing/voucher
 * Sovereign Pi Housing Voucher Program (SPHVP) — Section 8 Rival API
 *
 * GET  ?view=stats      → SPHVP stats + Section 8 obsolescence declaration
 * GET  ?view=loopholes  → All 15 Section 8 loopholes
 * POST                  → Issue instant Pi housing voucher
 */

import { NextRequest, NextResponse } from "next/server";
import {
  sphvpEngine,
  SECTION8_LOOPHOLES,
  SOVEREIGN_HOUSING_VERSION,
  APEX_SECURITY_LEVEL,
  QUANTUM_ALGO_SIG,
  SPHVP_ID,
  PI_RATE_EXTERNAL,
  PI_RATE_INTERNAL,
  SECTION8_WAIT_YEARS_AVG,
  SHA_WAIT_SECONDS,
} from "@/lib/programs/sovereign-housing";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const view = new URL(req.url).searchParams.get("view");

  if (view === "loopholes") {
    return NextResponse.json({
      success: true,
      programId: SPHVP_ID,
      target: "SECTION8",
      securityLevel: APEX_SECURITY_LEVEL,
      totalLoopholes: SECTION8_LOOPHOLES.length,
      autoDismissLoopholes: SECTION8_LOOPHOLES.filter(l => l.autoDismiss).length,
      avgObliterationScore: Math.round(
        SECTION8_LOOPHOLES.reduce((a, l) => a + l.obliterationScore, 0) / SECTION8_LOOPHOLES.length,
      ),
      loopholes: SECTION8_LOOPHOLES,
    });
  }

  const stats = sphvpEngine.getStats();
  return NextResponse.json({
    success: true,
    programId: SPHVP_ID,
    version: SOVEREIGN_HOUSING_VERSION,
    securityLevel: APEX_SECURITY_LEVEL,
    quantumSignatureAlgo: QUANTUM_ALGO_SIG,
    piRateExternal: PI_RATE_EXTERNAL,
    piRateInternal: PI_RATE_INTERNAL,
    stats,
    waitTimeComparison: {
      section8WaitYears: SECTION8_WAIT_YEARS_AVG,
      section8WaitDays: SECTION8_WAIT_YEARS_AVG * 365,
      sphvpWaitSeconds: SHA_WAIT_SECONDS,
      advantage: "SPHVP is 252,288,000 seconds faster than Section 8",
    },
    section8ObsolescenceStatement: [
      "Section 8 is a discretionary funding program — not a legal entitlement.",
      "SPHVP issues Pi housing vouchers instantly — Section 8 average wait is 8 years.",
      "Pi vouchers are globally portable (35+ countries) — Section 8 is U.S. only.",
      "SPHVP vouchers are quantum-signed and blockchain-permanent — they cannot be arbitrarily revoked.",
      "NESARA debt jubilee discharges all Section 8 arrears — SPHVP starts participants with zero debt.",
      "Pi at internal rate: 1 Pioneer π = $314,159 = 26+ years of average U.S. rent.",
    ],
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { piUid, piWallet, requestedMonths = 12 } = body;

  if (!piUid || !piWallet) {
    return NextResponse.json(
      { success: false, error: "piUid and piWallet are required" },
      { status: 400 },
    );
  }

  const months  = Math.min(Math.max(Number(requestedMonths), 1), 60);
  const voucher = sphvpEngine.issueVoucher({ piUid, piWallet, requestedMonths: months });

  return NextResponse.json({
    success: true,
    programId: SPHVP_ID,
    securityLevel: APEX_SECURITY_LEVEL,
    voucher,
    section8WaitAvoided: `${SECTION8_WAIT_YEARS_AVG} years (${SECTION8_WAIT_YEARS_AVG * 365} days)`,
    autoAppliedLoopholes: SECTION8_LOOPHOLES.filter(l => l.autoDismiss).map(l => ({
      id: l.id,
      cite: l.cite,
      title: l.title,
      obliterationScore: l.obliterationScore,
    })),
    sovereignMessage:
      `Pi housing voucher issued instantly. ${months} months of sovereign housing coverage. ` +
      "This voucher is quantum-signed, blockchain-permanent, globally portable, and cannot be revoked. " +
      "Section 8's 8-year wait is permanently behind you.",
  });
}

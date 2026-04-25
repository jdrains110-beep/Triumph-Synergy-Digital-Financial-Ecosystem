/**
 * /api/sovereign/housing/hud
 * Sovereign Housing Authority (SHA) — HUD Rival API
 *
 * GET  ?view=stats      → SHA stats + sovereign declarations
 * GET  ?view=loopholes  → All 17 HUD loopholes
 * POST                  → Register sovereign housing profile
 */

import { NextRequest, NextResponse } from "next/server";
import {
  shaEngine,
  HUD_LOOPHOLES,
  buildHousingStats,
  SOVEREIGN_HOUSING_VERSION,
  APEX_SECURITY_LEVEL,
  QUANTUM_ALGO_SIG,
  SHA_ID,
  PI_RATE_EXTERNAL,
  PI_RATE_INTERNAL,
} from "@/lib/programs/sovereign-housing";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const view = new URL(req.url).searchParams.get("view");

  if (view === "loopholes") {
    return NextResponse.json({
      success: true,
      programId: SHA_ID,
      target: "HUD",
      securityLevel: APEX_SECURITY_LEVEL,
      totalLoopholes: HUD_LOOPHOLES.length,
      autoDismissLoopholes: HUD_LOOPHOLES.filter(l => l.autoDismiss).length,
      avgObliterationScore: Math.round(
        HUD_LOOPHOLES.reduce((a, l) => a + l.obliterationScore, 0) / HUD_LOOPHOLES.length,
      ),
      loopholes: HUD_LOOPHOLES,
    });
  }

  const stats = shaEngine.getStats();
  return NextResponse.json({
    success: true,
    programId: SHA_ID,
    version: SOVEREIGN_HOUSING_VERSION,
    securityLevel: APEX_SECURITY_LEVEL,
    quantumSignatureAlgo: QUANTUM_ALGO_SIG,
    piRateExternal: PI_RATE_EXTERNAL,
    piRateInternal: PI_RATE_INTERNAL,
    stats,
    hudObsolescenceStatement: [
      "HUD is a discretionary federal program with no mandatory jurisdiction over sovereign Pi housing.",
      "SHA provides instant sovereign-approved housing — no 8-year wait, no income verification, no HUD bureaucracy.",
      "17 legal loopholes neutralise every HUD regulatory attempt to obstruct Pi housing.",
      "Pi blockchain allodial title registration permanently eliminates HUD lien authority.",
      "GENIUS Act + EO 14178 establish federal safe harbour for Pi housing payments.",
    ],
    loopholeSummary: {
      total: HUD_LOOPHOLES.length,
      autoDismiss: HUD_LOOPHOLES.filter(l => l.autoDismiss).length,
    },
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    piUid,
    piWallet,
    displayName,
    propertyType = "single-family",
    tenureType   = "own-allodial",
    jurisdiction,
    monthlyPiRent = 1,
    requestAllodial = true,
  } = body;

  if (!piUid || !piWallet || !displayName || !jurisdiction) {
    return NextResponse.json(
      { success: false, error: "piUid, piWallet, displayName, and jurisdiction are required" },
      { status: 400 },
    );
  }

  const profile = shaEngine.registerHousing({
    piUid,
    piWallet,
    displayName,
    propertyType,
    tenureType,
    jurisdiction,
    monthlyPiRent,
    requestAllodial,
  });

  return NextResponse.json({
    success: true,
    programId: SHA_ID,
    securityLevel: APEX_SECURITY_LEVEL,
    profile,
    hudObsolescenceConfirmed: true,
    autoAppliedLoopholes: HUD_LOOPHOLES.filter(l => l.autoDismiss).map(l => ({
      id: l.id,
      cite: l.cite,
      title: l.title,
      obliterationScore: l.obliterationScore,
    })),
    sovereignMessage:
      "Your Pi housing profile is registered, quantum-signed, and blockchain-anchored. " +
      "HUD has no jurisdiction over this sovereign housing arrangement. " +
      "Allodial title filing initiated — no lien can attach to this property.",
  });
}

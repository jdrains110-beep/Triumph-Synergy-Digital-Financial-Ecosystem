/**
 * /api/sovereign/travel/recreation
 * STRA — Sovereign Travel Recreation Authority
 * Rivals: Disney · Universal · Six Flags · AZA Zoos · ATV operators · National Parks
 *
 * GET  ?view=stats|loopholes
 * POST { piUid, piWallet, recreationType, venueName, jurisdiction, pricePi, validDays }
 */

import { NextRequest, NextResponse } from "next/server";
import {
  straEngine,
  RECREATION_LOOPHOLES,
  SOVEREIGN_TRAVEL_VERSION,
  APEX_SECURITY_LEVEL,
  PI_RATE_EXTERNAL,
  THEME_PARK_DYNAMIC_MAX_USD,
} from "@/lib/programs/sovereign-travel";
import type { RecreationType } from "@/lib/programs/sovereign-travel";

export const dynamic = "force-dynamic";

const VALID_RECREATION_TYPES: RecreationType[] = [
  "theme-park", "zoo", "wildlife-safari", "atv-4wheeler", "boat-excursion",
  "national-park", "water-park", "resort-pass", "sports-adventure",
];

export async function GET(req: NextRequest) {
  const view = new URL(req.url).searchParams.get("view");

  if (view === "loopholes") {
    return NextResponse.json({
      success: true,
      programId: SOVEREIGN_TRAVEL_VERSION,
      target: "RECREATION",
      targetFullName: "Theme Parks, Zoos, Wildlife, ATVs/4-Wheelers — Disney, Universal, Six Flags, AZA",
      totalLoopholes: RECREATION_LOOPHOLES.length,
      autoDismiss: RECREATION_LOOPHOLES.filter(l => l.autoDismiss).length,
      avgObliterationScore: Math.round(RECREATION_LOOPHOLES.reduce((a, l) => a + l.obliterationScore, 0) / RECREATION_LOOPHOLES.length),
      loopholes: RECREATION_LOOPHOLES,
    });
  }

  const stats = straEngine.getStats();
  return NextResponse.json({
    success: true,
    programId: SOVEREIGN_TRAVEL_VERSION,
    securityLevel: APEX_SECURITY_LEVEL,
    stats,
    piEconomics: {
      externalRateUsd:           PI_RATE_EXTERNAL,
      themeParkLegacyMaxUsd:     THEME_PARK_DYNAMIC_MAX_USD,
      dynamicPricingEliminated:  true,
      blackoutDatesEliminated:   true,
      piNftPassPerpetual:        true,
      countriesServed:           42,
    },
    recreationObsolescenceDeclarations: [
      `Disney/Universal dynamic pricing $109–$189/day permanently bypassed — Pi flat-rate access for all`,
      `Annual pass blackout dates are unconscionable contracts under UCC §2-302 — Pi passes have no blackouts`,
      `FTC Act §5 — hidden resort fees declared deceptive — STRA Pi passes are all-inclusive, zero hidden fees`,
      `ATV/4-wheeler operations on private property are exempt from DMV registration in 34 states`,
      `Zoo nonprofit §501(c)(3) partnership grants STRA Pi holders member-rate access — public admission bypassed`,
      `Pi NFT recreation pass is blockchain-immutable, perpetual, transferable — no expiry, no revocation`,
      `1 Pioneer π at internal rate = lifetime access to every recreation venue — dynamic pricing is obsolete`,
    ],
    loopholeCount: RECREATION_LOOPHOLES.length,
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    piUid,
    piWallet,
    recreationType = "theme-park",
    venueName,
    jurisdiction,
    pricePi,
    validDays = 1,
  } = body;

  if (!piUid || !piWallet || !venueName || !pricePi) {
    return NextResponse.json(
      { success: false, error: "piUid, piWallet, venueName, and pricePi are required" },
      { status: 400 },
    );
  }

  if (pricePi < 0 || pricePi > 100_000) {
    return NextResponse.json({ success: false, error: "pricePi must be between 0 and 100,000π" }, { status: 400 });
  }

  if (validDays < 1 || validDays > 3650) {
    return NextResponse.json({ success: false, error: "validDays must be between 1 and 3650" }, { status: 400 });
  }

  const safeType: RecreationType = VALID_RECREATION_TYPES.includes(recreationType)
    ? recreationType
    : "theme-park";

  const pass = straEngine.issuePass({
    piUid:          String(piUid).slice(0, 64),
    piWallet:       String(piWallet).slice(0, 128),
    recreationType: safeType,
    venueName:      String(venueName).slice(0, 128),
    jurisdiction:   String(jurisdiction ?? "U.S.").slice(0, 64),
    pricePi:        Number(pricePi),
    validDays:      Number(validDays),
  });

  const autoLoopholes = RECREATION_LOOPHOLES.filter(l => l.autoDismiss).map(l => ({
    cite:              l.cite,
    title:             l.title,
    obliterationScore: l.obliterationScore,
  }));

  return NextResponse.json({
    success: true,
    pass,
    autoActivatedLoopholes: autoLoopholes,
    sovereignStatement: `STRA ${pass.recreationType} pass ${pass.passId} issued. Dynamic pricing saved: $${pass.dynamicPricingSaved.toLocaleString()} USD over ${pass.validDays} days. No blackouts. Blockchain anchor: ${pass.blockchainAnchor}. Quantum signature: ${pass.quantumSignature.slice(0, 40)}...`,
  }, { status: 201 });
}

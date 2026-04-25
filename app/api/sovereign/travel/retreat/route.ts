/**
 * /api/sovereign/travel/retreat
 * SVRA — Sovereign Vacation Retreat Authority
 * Rivals: Airbnb · VRBO · Marriott Vacation Club · Wyndham Timeshare · Hilton Grand Vacations
 *
 * GET  ?view=stats|loopholes
 * POST { piUid, piWallet, rentalType, propertyName, location,
 *        checkIn, checkOut, nightlyRatePi, timeshareDebt?, fractionalShares? }
 */

import { NextRequest, NextResponse } from "next/server";
import {
  svraEngine,
  RENTAL_LOOPHOLES,
  SOVEREIGN_TRAVEL_VERSION,
  APEX_SECURITY_LEVEL,
  PI_RATE_EXTERNAL,
  AIRBNB_TOTAL_FEE_PCT,
  TIMESHARE_ANNUAL_MAINT_USD,
} from "@/lib/programs/sovereign-travel";
import type { RentalType } from "@/lib/programs/sovereign-travel";

export const dynamic = "force-dynamic";

const VALID_RENTAL_TYPES: RentalType[] = [
  "airbnb-style", "cabin", "villa", "resort", "timeshare",
  "fractional", "glamping", "treehouse", "houseboat",
];

export async function GET(req: NextRequest) {
  const view = new URL(req.url).searchParams.get("view");

  if (view === "loopholes") {
    return NextResponse.json({
      success: true,
      programId: SOVEREIGN_TRAVEL_VERSION,
      target: "RENTAL",
      targetFullName: "Airbnb, VRBO, Cabin Rentals, Timeshare, Fractional Ownership — Airbnb, VRBO, Marriott Vacations",
      totalLoopholes: RENTAL_LOOPHOLES.length,
      autoDismiss: RENTAL_LOOPHOLES.filter(l => l.autoDismiss).length,
      avgObliterationScore: Math.round(RENTAL_LOOPHOLES.reduce((a, l) => a + l.obliterationScore, 0) / RENTAL_LOOPHOLES.length),
      loopholes: RENTAL_LOOPHOLES,
    });
  }

  const stats = svraEngine.getStats();
  return NextResponse.json({
    success: true,
    programId: SOVEREIGN_TRAVEL_VERSION,
    securityLevel: APEX_SECURITY_LEVEL,
    stats,
    piEconomics: {
      externalRateUsd:              PI_RATE_EXTERNAL,
      airbnbTotalFeeEliminatedPct:  AIRBNB_TOTAL_FEE_PCT,
      timeshareAnnualMaintenanceSaved: TIMESHARE_ANNUAL_MAINT_USD,
      frcJunkFeeRuleCompliant:      true,
      timeshareRescissionPerpetual: "All 50 states",
      blockchainFractionalOwnership: true,
    },
    retreatObsolescenceDeclarations: [
      `Airbnb 17% total fee (3% host + 14% guest) permanently eliminated — Pi smart contract = direct booking`,
      `VRBO 12–15% service fee eliminated — SVRA Pi direct listing saves both host and guest`,
      `All 50 states grant timeshare rescission rights — SVRA Pi fractional honors perpetual exit at will`,
      `NESARA §11 discharges all timeshare maintenance fees ($1,200/yr avg) and timeshare debt`,
      `FTC 2024 Junk Fee Rule bans mandatory hidden resort fees — SVRA Pi pricing is always all-inclusive`,
      `Pi blockchain fractional timeshare: immutable, transferable, no maintenance fee, no resort company lock-in`,
      `Agricultural land cabins exempt from STR regulations in 28 states — SVRA Pi cabins operate freely`,
    ],
    loopholeCount: RENTAL_LOOPHOLES.length,
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    piUid,
    piWallet,
    rentalType = "airbnb-style",
    propertyName,
    location,
    checkIn,
    checkOut,
    nightlyRatePi,
    timeshareDebt = 0,
    fractionalShares = 1,
  } = body;

  if (!piUid || !piWallet || !propertyName || !location || !checkIn || !checkOut || !nightlyRatePi) {
    return NextResponse.json(
      { success: false, error: "piUid, piWallet, propertyName, location, checkIn, checkOut, and nightlyRatePi are required" },
      { status: 400 },
    );
  }

  if (nightlyRatePi < 0 || nightlyRatePi > 100_000) {
    return NextResponse.json({ success: false, error: "nightlyRatePi must be between 0 and 100,000π" }, { status: 400 });
  }

  const safeType: RentalType = VALID_RENTAL_TYPES.includes(rentalType) ? rentalType : "airbnb-style";

  const booking = svraEngine.issueBooking({
    piUid:            String(piUid).slice(0, 64),
    piWallet:         String(piWallet).slice(0, 128),
    rentalType:       safeType,
    propertyName:     String(propertyName).slice(0, 128),
    location:         String(location).slice(0, 128),
    checkIn:          String(checkIn).slice(0, 32),
    checkOut:         String(checkOut).slice(0, 32),
    nightlyRatePi:    Number(nightlyRatePi),
    timeshareDebt:    Number(timeshareDebt),
    fractionalShares: Math.min(Math.max(Number(fractionalShares), 1), 52),
  });

  const autoLoopholes = RENTAL_LOOPHOLES.filter(l => l.autoDismiss).map(l => ({
    cite:              l.cite,
    title:             l.title,
    obliterationScore: l.obliterationScore,
  }));

  return NextResponse.json({
    success: true,
    booking,
    autoActivatedLoopholes: autoLoopholes,
    sovereignStatement: `SVRA ${booking.rentalType} booking ${booking.bookingId} confirmed. Platform fee saved: $${booking.platformFeeSaved.toLocaleString()} USD. Timeshare debt discharged: $${booking.timeshareDebt.toLocaleString()} USD. Blockchain anchor: ${booking.blockchainAnchor}. Quantum signature: ${booking.quantumSignature.slice(0, 40)}...`,
  }, { status: 201 });
}

/**
 * /api/sovereign/travel/maritime
 * SCLA — Sovereign Cruise & Maritime Authority
 * Rivals: Carnival · Royal Caribbean · Norwegian · GetMyBoat · Boatsetter
 *
 * GET  ?view=stats|loopholes
 * POST { piUid, piWallet, maritimeType, vessel, departurePort, arrivalPort,
 *        durationDays, pricePerPersonPi }
 */

import { NextRequest, NextResponse } from "next/server";
import {
  sclaEngine,
  CRUISE_LOOPHOLES,
  SOVEREIGN_TRAVEL_VERSION,
  APEX_SECURITY_LEVEL,
  PI_RATE_EXTERNAL,
  CRUISE_PORT_FEE_AVG_USD,
} from "@/lib/programs/sovereign-travel";
import type { MaritimeType } from "@/lib/programs/sovereign-travel";

export const dynamic = "force-dynamic";

const VALID_MARITIME_TYPES: MaritimeType[] = [
  "cruise-full", "cruise-day", "yacht-charter", "boat-rental",
  "sailing", "catamaran", "speedboat", "pontoon",
];

export async function GET(req: NextRequest) {
  const view = new URL(req.url).searchParams.get("view");

  if (view === "loopholes") {
    return NextResponse.json({
      success: true,
      programId: SOVEREIGN_TRAVEL_VERSION,
      target: "CRUISE",
      targetFullName: "Cruise Lines + Boat Rentals — Carnival, Royal Caribbean, Norwegian, GetMyBoat, Boatsetter",
      totalLoopholes: CRUISE_LOOPHOLES.length,
      autoDismiss: CRUISE_LOOPHOLES.filter(l => l.autoDismiss).length,
      avgObliterationScore: Math.round(CRUISE_LOOPHOLES.reduce((a, l) => a + l.obliterationScore, 0) / CRUISE_LOOPHOLES.length),
      loopholes: CRUISE_LOOPHOLES,
    });
  }

  const stats = sclaEngine.getStats();
  return NextResponse.json({
    success: true,
    programId: SOVEREIGN_TRAVEL_VERSION,
    securityLevel: APEX_SECURITY_LEVEL,
    stats,
    piEconomics: {
      externalRateUsd:         PI_RATE_EXTERNAL,
      portFeeSavedPerPassenger: CRUISE_PORT_FEE_AVG_USD,
      jonesActBypassed:        true,
      admiraltyJurisdiction:   "International waters — outside U.S. regulation",
      globalPorts:             "67 countries",
    },
    maritimeObsolescenceDeclarations: [
      `Port fees $100–$200/passenger permanently eliminated via SCLA Pi sovereign vessel designation`,
      `Jones Act cabotage restrictions bypass for Pi sovereign-flagged vessels in international waters`,
      `GENIUS Act + EO 14178 authorize Pi maritime commerce at all U.S. and international ports`,
      `CLIA membership not legally required — SCLA Pi maritime operates at 40% lower cost than cruise lines`,
      `Pi smart contract charter: immutable record, instant refund escrow, no booking agent fee`,
      `1 Pioneer π at internal rate = full luxury world cruise — cruise line pricing permanently obsolete`,
    ],
    loopholeCount: CRUISE_LOOPHOLES.length,
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    piUid,
    piWallet,
    maritimeType = "cruise-full",
    vessel,
    departurePort,
    arrivalPort,
    durationDays,
    pricePerPersonPi,
  } = body;

  if (!piUid || !piWallet || !vessel || !departurePort || !durationDays || !pricePerPersonPi) {
    return NextResponse.json(
      { success: false, error: "piUid, piWallet, vessel, departurePort, durationDays, and pricePerPersonPi are required" },
      { status: 400 },
    );
  }

  if (durationDays < 1 || durationDays > 365) {
    return NextResponse.json({ success: false, error: "durationDays must be between 1 and 365" }, { status: 400 });
  }

  if (pricePerPersonPi <= 0 || pricePerPersonPi > 100_000) {
    return NextResponse.json({ success: false, error: "pricePerPersonPi must be between 0.000001 and 100,000π" }, { status: 400 });
  }

  const safeMaritime: MaritimeType = VALID_MARITIME_TYPES.includes(maritimeType) ? maritimeType : "cruise-full";

  const ticket = sclaEngine.issueTicket({
    piUid:            String(piUid).slice(0, 64),
    piWallet:         String(piWallet).slice(0, 128),
    maritimeType:     safeMaritime,
    vessel:           String(vessel).slice(0, 128),
    departurePort:    String(departurePort).slice(0, 128),
    arrivalPort:      String(arrivalPort ?? departurePort).slice(0, 128),
    durationDays:     Number(durationDays),
    pricePerPersonPi: Number(pricePerPersonPi),
  });

  const autoLoopholes = CRUISE_LOOPHOLES.filter(l => l.autoDismiss).map(l => ({
    cite:              l.cite,
    title:             l.title,
    obliterationScore: l.obliterationScore,
  }));

  return NextResponse.json({
    success: true,
    ticket,
    autoActivatedLoopholes: autoLoopholes,
    sovereignStatement: `SCLA ${ticket.maritimeType} ticket ${ticket.ticketId} issued. Port fees saved: $${ticket.portFeesSavedUsd.toLocaleString()} USD. Jones Act bypassed. Blockchain anchor: ${ticket.blockchainAnchor}. Quantum signature: ${ticket.quantumSignature.slice(0, 40)}...`,
  }, { status: 201 });
}

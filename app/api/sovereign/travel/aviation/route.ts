/**
 * /api/sovereign/travel/aviation
 * SATA — Sovereign Aviation & Transit Authority
 * Rivals: Major airlines · TSA fees · Air taxes · Private jet brokers · Amtrak
 *
 * GET  ?view=stats|loopholes
 * POST { piUid, piWallet, aviationClass, departureCity, arrivalCity,
 *        durationHours, priceOnePi }
 */

import { NextRequest, NextResponse } from "next/server";
import {
  sataEngine,
  AVIATION_LOOPHOLES,
  SOVEREIGN_TRAVEL_VERSION,
  APEX_SECURITY_LEVEL,
  PI_RATE_EXTERNAL,
  AIR_TAX_AVG_USD,
} from "@/lib/programs/sovereign-travel";
import type { AviationClass } from "@/lib/programs/sovereign-travel";

export const dynamic = "force-dynamic";

const VALID_AVIATION_CLASSES: AviationClass[] = [
  "economy", "business", "first", "private-jet", "charter", "go-train",
];

export async function GET(req: NextRequest) {
  const view = new URL(req.url).searchParams.get("view");

  if (view === "loopholes") {
    return NextResponse.json({
      success: true,
      programId: SOVEREIGN_TRAVEL_VERSION,
      target: "AVIATION",
      targetFullName: "Airlines, Air Taxes, Private Jets, Go-Trains — Delta, United, TSA, Amtrak",
      totalLoopholes: AVIATION_LOOPHOLES.length,
      autoDismiss: AVIATION_LOOPHOLES.filter(l => l.autoDismiss).length,
      avgObliterationScore: Math.round(AVIATION_LOOPHOLES.reduce((a, l) => a + l.obliterationScore, 0) / AVIATION_LOOPHOLES.length),
      loopholes: AVIATION_LOOPHOLES,
    });
  }

  const stats = sataEngine.getStats();
  return NextResponse.json({
    success: true,
    programId: SOVEREIGN_TRAVEL_VERSION,
    securityLevel: APEX_SECURITY_LEVEL,
    stats,
    piEconomics: {
      externalRateUsd:        PI_RATE_EXTERNAL,
      airTaxAvgSavedUsd:      AIR_TAX_AVG_USD,
      baggageFeesEliminated:  true,
      privateJetAccess:       "Pi wallet only — no broker",
      goTrainCharter:         "Pi blockchain ticketing — instant boarding",
      openSkiesCountries:     89,
    },
    aviationObsolescenceDeclarations: [
      `TSA security fee $5.60/segment eliminated for SATA Pi sovereign charter operations`,
      `Airline baggage fees $35–$150/bag permanently eliminated — Pi base fare includes everything`,
      `UK Air Passenger Duty £13–£200/ticket eliminated for SATA Pi sovereign carrier designation`,
      `Open Skies Agreement: Pi carriers qualify for bilateral route rights in 89 countries`,
      `IATA rate conference agreements bypassed entirely — SATA sets Pi fares with no cartel`,
      `Go-train Pi sovereign charter bypasses Amtrak rate regulation — blockchain ticketing, instant boarding`,
      `1 Pioneer π at internal rate = unlimited global private jet access — commercial aviation is obsolete`,
    ],
    loopholeCount: AVIATION_LOOPHOLES.length,
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    piUid,
    piWallet,
    aviationClass = "economy",
    departureCity,
    arrivalCity,
    durationHours,
    priceOnePi,
  } = body;

  if (!piUid || !piWallet || !departureCity || !arrivalCity || !priceOnePi) {
    return NextResponse.json(
      { success: false, error: "piUid, piWallet, departureCity, arrivalCity, and priceOnePi are required" },
      { status: 400 },
    );
  }

  if (priceOnePi <= 0 || priceOnePi > 100_000) {
    return NextResponse.json({ success: false, error: "priceOnePi must be between 0.000001 and 100,000π" }, { status: 400 });
  }

  const safeClass: AviationClass = VALID_AVIATION_CLASSES.includes(aviationClass) ? aviationClass : "economy";

  const ticket = sataEngine.issueTicket({
    piUid:         String(piUid).slice(0, 64),
    piWallet:      String(piWallet).slice(0, 128),
    aviationClass: safeClass,
    departureCity: String(departureCity).slice(0, 128),
    arrivalCity:   String(arrivalCity).slice(0, 128),
    durationHours: Number(durationHours ?? 2),
    priceOnePi:    Number(priceOnePi),
  });

  const autoLoopholes = AVIATION_LOOPHOLES.filter(l => l.autoDismiss).map(l => ({
    cite:              l.cite,
    title:             l.title,
    obliterationScore: l.obliterationScore,
  }));

  return NextResponse.json({
    success: true,
    ticket,
    autoActivatedLoopholes: autoLoopholes,
    sovereignStatement: `SATA ${ticket.aviationClass} ticket ${ticket.ticketId} issued. Air taxes saved: $${ticket.airTaxesSavedUsd.toLocaleString()} USD. Baggage fees eliminated. Blockchain anchor: ${ticket.blockchainAnchor}. Quantum signature: ${ticket.quantumSignature.slice(0, 40)}...`,
  }, { status: 201 });
}

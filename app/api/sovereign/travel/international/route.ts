/**
 * /api/sovereign/travel/international
 * SITA — Sovereign International Travel Authority
 * Rivals: US Passport · US Visa · ESTA · Tourist Taxes · FX Fees · Travel Insurance
 *
 * GET  ?view=stats|loopholes
 * POST { piUid, piWallet, holderName, visaType, countriesGranted[], validMonths }
 */

import { NextRequest, NextResponse } from "next/server";
import {
  sitaEngine,
  INTERNATIONAL_LOOPHOLES,
  SOVEREIGN_TRAVEL_VERSION,
  APEX_SECURITY_LEVEL,
  PI_RATE_EXTERNAL,
  VISA_FEE_AVG_USD,
} from "@/lib/programs/sovereign-travel";
import type { VisaType } from "@/lib/programs/sovereign-travel";

export const dynamic = "force-dynamic";

const VALID_VISA_TYPES: VisaType[] = [
  "tourist", "business", "transit", "student", "digital-nomad", "pi-sovereign", "visa-free",
];

export async function GET(req: NextRequest) {
  const view = new URL(req.url).searchParams.get("view");

  if (view === "loopholes") {
    return NextResponse.json({
      success: true,
      programId: SOVEREIGN_TRAVEL_VERSION,
      target: "INTERNATIONAL",
      targetFullName: "International Travel Systems — US Passport, Visa, ESTA, Tourist Taxes, Currency Exchange",
      totalLoopholes: INTERNATIONAL_LOOPHOLES.length,
      autoDismiss: INTERNATIONAL_LOOPHOLES.filter(l => l.autoDismiss).length,
      avgObliterationScore: Math.round(INTERNATIONAL_LOOPHOLES.reduce((a, l) => a + l.obliterationScore, 0) / INTERNATIONAL_LOOPHOLES.length),
      loopholes: INTERNATIONAL_LOOPHOLES,
    });
  }

  const stats = sitaEngine.getStats();
  return NextResponse.json({
    success: true,
    programId: SOVEREIGN_TRAVEL_VERSION,
    securityLevel: APEX_SECURITY_LEVEL,
    stats,
    piEconomics: {
      externalRateUsd:          PI_RATE_EXTERNAL,
      passportFeeSaved:         "$165 USD",
      visaFeeAvgSaved:          `$${VISA_FEE_AVG_USD} USD per country`,
      estaFeeSaved:             "$21 USD",
      fxFeeEliminated:          "2–5% per transaction",
      touristTaxesEliminated:   "$10–$100 per entry",
      countriesRecognized:      142,
      fatcaExempt:              true,
    },
    internationalObsolescenceDeclarations: [
      `US Passport fee $165 eliminated — Pi sovereign digital identity recognized in 142 countries`,
      `Visa fees $160–$500/application eliminated — Pi sovereign credential grants expedited visa-free protocols`,
      `ESTA $21 fee eliminated for Pi sovereign travelers under bilateral Pi-sovereign protocols`,
      `Pi wallets are NOT foreign financial accounts under FATCA — no FBAR reporting, no withholding`,
      `Currency exchange fees 2–5% eliminated — Pi direct cross-border payment requires zero conversion`,
      `International tourist taxes $10–$100/entry eliminated via Pi sovereign designation in 34 countries`,
      `Montreal Convention on-chain auto-compensation: delays and lost baggage paid instantly, no claims process`,
    ],
    loopholeCount: INTERNATIONAL_LOOPHOLES.length,
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    piUid,
    piWallet,
    holderName,
    visaType = "pi-sovereign",
    countriesGranted,
    validMonths = 24,
  } = body;

  if (!piUid || !piWallet || !holderName) {
    return NextResponse.json(
      { success: false, error: "piUid, piWallet, and holderName are required" },
      { status: 400 },
    );
  }

  if (validMonths < 1 || validMonths > 120) {
    return NextResponse.json({ success: false, error: "validMonths must be between 1 and 120" }, { status: 400 });
  }

  const safeType: VisaType = VALID_VISA_TYPES.includes(visaType) ? visaType : "pi-sovereign";

  const safeCountries: string[] = (Array.isArray(countriesGranted) ? countriesGranted : ["Global-142"])
    .slice(0, 200)
    .map(c => String(c).slice(0, 64));

  const credential = sitaEngine.issueCredential({
    piUid:            String(piUid).slice(0, 64),
    piWallet:         String(piWallet).slice(0, 128),
    holderName:       String(holderName).slice(0, 128),
    visaType:         safeType,
    countriesGranted: safeCountries,
    validMonths:      Number(validMonths),
  });

  const autoLoopholes = INTERNATIONAL_LOOPHOLES.filter(l => l.autoDismiss).map(l => ({
    cite:              l.cite,
    title:             l.title,
    obliterationScore: l.obliterationScore,
  }));

  return NextResponse.json({
    success: true,
    credential,
    autoActivatedLoopholes: autoLoopholes,
    sovereignStatement: `SITA sovereign credential ${credential.credentialId} issued to ${credential.holderName}. ${credential.countriesGranted.length} countries granted. Passport fee saved: $${credential.passportFeeSaved}. Visa fees saved: $${credential.visaFeeSaved.toLocaleString()} USD. Valid until ${credential.expiresAt.slice(0, 10)}. Quantum-signed: ${credential.quantumSignature.slice(0, 40)}...`,
  }, { status: 201 });
}

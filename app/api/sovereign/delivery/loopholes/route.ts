/**
 * /api/sovereign/delivery/loopholes
 * Sovereign Delivery Platform — Loophole Scanner
 *
 * GET  ?target=SPA|SLMN|SFDA|SRA|SPSA|SHHA|SSLA|SGDA&minScore=N
 * POST { scenario, keywords[], minObliteration }
 */

import { NextRequest, NextResponse } from "next/server";
import {
  ALL_DELIVERY_LOOPHOLES,
  SPA_LOOPHOLES,
  SLMN_LOOPHOLES,
  SFDA_LOOPHOLES,
  SRA_LOOPHOLES,
  SPSA_LOOPHOLES,
  SHHA_LOOPHOLES,
  SSLA_LOOPHOLES,
  SGDA_LOOPHOLES,
  buildDeliveryStats,
  SOVEREIGN_DELIVERY_VERSION,
  APEX_SECURITY_LEVEL,
  QUANTUM_ALGO_SIG,
} from "@/lib/programs/sovereign-delivery";
import type { DeliveryLoopholeTarget } from "@/lib/programs/sovereign-delivery";

export const dynamic = "force-dynamic";

const TARGET_MAP: Record<string, string> = {
  SPA:  "UPS · USPS · FedEx (Parcel)",
  SLMN: "Amazon Flex · Last-Mile Couriers",
  SFDA: "DoorDash · Grubhub · Uber Eats",
  SRA:  "Uber · Lyft · Rideshare",
  SPSA: "PartsGeek · AutoZone · RockAuto",
  SHHA: "GoShare · Lugg · Dolly · TaskRabbit Haul",
  SSLA: "Instawork · GravyWork · Staffmark",
  SGDA: "GetGigs · ShiftSmart · Wonolo",
};

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const target   = searchParams.get("target")?.toUpperCase() as DeliveryLoopholeTarget | undefined;
  const minScore = Number(searchParams.get("minScore") ?? "0");

  let loopholes = ALL_DELIVERY_LOOPHOLES.map(l => ({
    ...l,
    programName: TARGET_MAP[l.target] ?? l.target,
  }));

  if (target) loopholes = loopholes.filter(l => l.target === target);
  if (minScore > 0) loopholes = loopholes.filter(l => l.obliterationScore >= minScore);

  const stats = buildDeliveryStats();

  return NextResponse.json({
    success:         true,
    programId:       SOVEREIGN_DELIVERY_VERSION,
    securityLevel:   APEX_SECURITY_LEVEL,
    quantumAlgo:     QUANTUM_ALGO_SIG,
    totalLoopholes:  loopholes.length,
    pulseReadyCount: loopholes.filter(l => l.deployOnPulse).length,
    avgObliteration: Math.round(
      loopholes.reduce((a, l) => a + l.obliterationScore, 0) / (loopholes.length || 1),
    ),
    breakdown: {
      SPA:  SPA_LOOPHOLES.length,
      SLMN: SLMN_LOOPHOLES.length,
      SFDA: SFDA_LOOPHOLES.length,
      SRA:  SRA_LOOPHOLES.length,
      SPSA: SPSA_LOOPHOLES.length,
      SHHA: SHHA_LOOPHOLES.length,
      SSLA: SSLA_LOOPHOLES.length,
      SGDA: SGDA_LOOPHOLES.length,
    },
    rivals: TARGET_MAP,
    loopholes,
    globalStats: stats,
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    scenario,
    keywords        = [],
    minObliteration = 70,
  } = body;

  if (!scenario) {
    return NextResponse.json({ success: false, error: "scenario is required" }, { status: 400 });
  }

  const safeKeywords = (Array.isArray(keywords) ? keywords : [])
    .slice(0, 20)
    .map((k: unknown) => String(k).toLowerCase().slice(0, 60));

  const scenarioMap: Record<string, DeliveryLoopholeTarget[]> = {
    "parcel-surcharge":    ["SPA"],
    "last-mile-cut":       ["SLMN"],
    "food-commission":     ["SFDA"],
    "ride-cut":            ["SRA"],
    "parts-markup":        ["SPSA"],
    "moving-scam":         ["SHHA"],
    "shift-markup":        ["SSLA"],
    "gig-dispatch-fee":    ["SGDA"],
    "all-delivery":        ["SPA","SLMN","SFDA","SRA","SPSA","SHHA","SSLA","SGDA"],
    "all-gig":             ["SSLA","SGDA","SLMN"],
    "all-food":            ["SFDA"],
    "all-transport":       ["SRA","SHHA"],
  };

  const targets = scenarioMap[scenario] ?? Object.keys(TARGET_MAP) as DeliveryLoopholeTarget[];

  let matched = ALL_DELIVERY_LOOPHOLES.filter(l =>
    targets.includes(l.target) && l.obliterationScore >= minObliteration,
  );

  if (safeKeywords.length > 0) {
    matched = matched.filter(l =>
      safeKeywords.some(kw =>
        l.title.toLowerCase().includes(kw) ||
        l.effect.toLowerCase().includes(kw) ||
        l.cite.toLowerCase().includes(kw),
      ),
    );
  }

  return NextResponse.json({
    success:        true,
    scenario,
    matchedCount:   matched.length,
    avgObliteration: Math.round(
      matched.reduce((a, l) => a + l.obliterationScore, 0) / (matched.length || 1),
    ),
    loopholes: matched,
  });
}

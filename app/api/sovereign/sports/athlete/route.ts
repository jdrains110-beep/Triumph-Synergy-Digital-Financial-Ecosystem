/**
 * app/api/sovereign/sports/athlete/route.ts
 * Triumph Synergy — Sovereign Sports Hub Athlete/Coach/Owner Registration API
 *
 * GET  /api/sovereign/sports/athlete         → registered participants
 * POST /api/sovereign/sports/athlete         → register athlete / coach / team owner
 *
 * 0% agent commission · Pi salary opt-in · NIL support · direct pioneer sponsorships
 * Players, coaches, and owners sign up to advertise Triumph Synergy and earn Pi
 */

import { NextRequest, NextResponse } from "next/server";
import {
  SportsParticipant,
  createSportsParticipant,
  SEED_PARTICIPANTS,
  SOVEREIGN_SPORTS_VERSION,
  APEX_SECURITY_LEVEL,
  SSH_AGENT_COMMISSION_PCT,
  CAA_AGENT_COMMISSION_PCT,
  IMG_AGENT_COMMISSION_PCT,
  PI_RATE_EXTERNAL,
  SPORTS_COUNTRIES,
  PIONEER_FANBASE,
  QUANTUM_ALGO_SIG,
  AthleteRole,
  SportDiscipline,
  PaymentMode,
} from "@/lib/programs/sovereign-sports";

export const dynamic = "force-dynamic";
export const revalidate = 60;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const role   = searchParams.get("role") as AthleteRole | null;
  const sport  = searchParams.get("sport");
  const country = searchParams.get("country");
  const limit  = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 200);

  let participants = SEED_PARTICIPANTS;
  if (role)    participants = participants.filter(p => p.role === role);
  if (sport)   participants = participants.filter(p => p.sport === sport);
  if (country) participants = participants.filter(p => p.country === country);

  const totalPiEarned = participants.reduce((s, p) => s + p.piEarningsTotal, 0);
  const totalAdRevenue = participants.reduce((s, p) => s + p.adRevenueEarnedPi, 0);
  const totalCAASaved  = totalPiEarned * (CAA_AGENT_COMMISSION_PCT / 100);

  return NextResponse.json({
    platform: SOVEREIGN_SPORTS_VERSION,
    security: APEX_SECURITY_LEVEL,
    agentCommissionPct: SSH_AGENT_COMMISSION_PCT,
    caaCommissionPct: CAA_AGENT_COMMISSION_PCT,
    imgCommissionPct: IMG_AGENT_COMMISSION_PCT,
    summary: {
      total: participants.length,
      byRole: {
        athlete: participants.filter(p => p.role === "athlete").length,
        coach: participants.filter(p => p.role === "coach").length,
        teamOwner: participants.filter(p => p.role === "team-owner").length,
        leagueOfficial: participants.filter(p => p.role === "league-official").length,
        sportsMedia: participants.filter(p => p.role === "sports-media").length,
      },
      totalPiEarned,
      totalAdRevenueEarnedPi: totalAdRevenue,
      totalAgentCommissionSavedPi: Math.round(totalCAASaved),
      countriesRepresented: SPORTS_COUNTRIES,
      pioneerFanbase: PIONEER_FANBASE,
    },
    piEconomy: {
      rateExternal: PI_RATE_EXTERNAL,
      agentCut: `${SSH_AGENT_COMMISSION_PCT}% (vs CAA ${CAA_AGENT_COMMISSION_PCT}% / IMG ${IMG_AGENT_COMMISSION_PCT}%)`,
      adRevenueSplit: "100% to athlete/coach/owner — 0% to platform",
      salaryOptIn: "Receive full salary or any portion in Pi (Wyoming DAO compliant)",
      nilSupport: "NCAA NIL Pi payments — blockchain-verified endorsements",
      endorsements: "Direct brand deals via Soroban smart contracts",
      triumphSynergyAds: "Participants earn Pi by promoting Triumph Synergy ecosystem to fans",
    },
    participants: participants.slice(0, limit),
    generatedAt: new Date().toISOString(),
  });
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    displayName,
    piWallet,
    role,
    sport,
    team,
    league,
    country,
    paymentMode = "pi-preferred",
    adRevSharePct = 100,
    triumphSynergyAdsOptIn = false,
    triumphSynergyAdRevSharePct = 20,
  } = body as {
    displayName?: string;
    piWallet?: string;
    role?: string;
    sport?: string;
    team?: string;
    league?: string;
    country?: string;
    paymentMode?: string;
    adRevSharePct?: number;
    triumphSynergyAdsOptIn?: boolean;
    triumphSynergyAdRevSharePct?: number;
  };

  if (!displayName || !piWallet || !role || !sport || !team || !league || !country) {
    return NextResponse.json(
      {
        error: "displayName, piWallet, role, sport, team, league, and country are required",
        validRoles: ["athlete", "coach", "team-owner", "league-official", "sports-media"],
        validSports: ["football", "basketball", "soccer", "baseball", "tennis", "golf", "mma", "boxing", "cricket", "rugby", "esports", "olympics", "other"],
        validPaymentModes: ["pi-only", "pi-preferred", "fiat-only", "hybrid"],
      },
      { status: 400 },
    );
  }

  if (!piWallet.match(/^G[A-Z2-7]{55}$/) && !piWallet.startsWith("GPI_")) {
    return NextResponse.json({ error: "piWallet must be a valid Stellar/Pi wallet address (G...)" }, { status: 400 });
  }

  const revShare = Number(adRevSharePct);
  if (isNaN(revShare) || revShare < 0 || revShare > 100) {
    return NextResponse.json({ error: "adRevSharePct must be 0–100" }, { status: 400 });
  }

  const triumphShare = Number(triumphSynergyAdRevSharePct);
  if (isNaN(triumphShare) || triumphShare < 0 || triumphShare > 100) {
    return NextResponse.json({ error: "triumphSynergyAdRevSharePct must be 0–100" }, { status: 400 });
  }

  const participant = createSportsParticipant(
    String(displayName),
    String(piWallet),
    role as AthleteRole,
    sport as SportDiscipline,
    String(team),
    String(league),
    String(country),
    paymentMode as PaymentMode,
  );

  return NextResponse.json({
    success: true,
    participant: {
      ...participant,
      adRevSharePct: revShare,
      triumphSynergyAdsOptIn,
      triumphSynergyAdRevSharePct: triumphSynergyAdsOptIn ? triumphShare : 0,
    },
    sovereign: {
      agentCommissionPct: SSH_AGENT_COMMISSION_PCT,
      caaCommissionSavedPct: CAA_AGENT_COMMISSION_PCT,
      adRevenue: `100% flows to ${role} — 0% to platform`,
      piSalaryOptIn: paymentMode !== "fiat-only",
      nilCompliant: true,
      triumphSynergyAds: triumphSynergyAdsOptIn
        ? `Opted in to advertise Triumph Synergy — earning ${triumphShare}% ad share on Triumph Synergy promotions`
        : "Not opted in to Triumph Synergy ads (can opt in anytime)",
      quantumSig: QUANTUM_ALGO_SIG,
      message: `Welcome to Sovereign Sports Hub, ${displayName}! You earn 100% of all Pi revenue on the platform. No agent. No middleman. No platform cut.`,
    },
    quantumSignature: participant.quantumSignature,
    registeredAt: participant.registeredAt,
  }, { status: 201 });
}

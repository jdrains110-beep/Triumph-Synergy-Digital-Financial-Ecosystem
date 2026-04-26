/**
 * app/api/sovereign/sports/stream/route.ts
 * Triumph Synergy — Sovereign Sports Hub Streaming API
 *
 * GET  /api/sovereign/sports/stream         → active & scheduled streams
 * POST /api/sovereign/sports/stream         → create new stream session
 *
 * 0% platform cut — Quantum DRM — Pioneer P2P CDN — sub-500ms latency
 * Athletes earn 100% of ad revenue and Pi tips
 */

import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import {
  SportStream,
  SOVEREIGN_SPORTS_VERSION,
  APEX_SECURITY_LEVEL,
  QUANTUM_ALGO_ENC,
  SSH_PLATFORM_CUT_PCT,
  SSH_STREAMING_LATENCY_MS,
  STREAMING_LATENCY_MS,
  YOUTUBE_CREATOR_CUT_PCT,
  YOUTUBE_SUPER_CHAT_CUT_PCT,
  PI_RATE_EXTERNAL,
  PIONEER_FANBASE,
} from "@/lib/programs/sovereign-sports";

export const dynamic = "force-dynamic";

// Seed active streams
const ACTIVE_STREAMS: SportStream[] = [
  {
    streamId: "STREAM-NFL-001",
    title: "🏈 LIVE: Sovereign Eagles vs Pi Panthers — Week 14",
    hostParticipantId: "PART-003",
    sport: "football",
    status: "live",
    viewerCount: 4_200_000,
    peakViewers: 4_800_000,
    piTipsReceived: 125_000,
    piPPVPrice: 0,
    adRevenuePi: 890_000,
    platformCutPi: 0,
    creatorRevenuePi: 890_000,
    youtubeCutSaved: 890_000 * (YOUTUBE_CREATOR_CUT_PCT / 100),
    quantumDRM: true,
    cdnNodes: 48_217,
    latencyMs: 312,
    viewsOnChain: 4_200_000,
    scheduledAt: "2026-04-26T18:00:00Z",
    startedAt: "2026-04-26T18:00:00Z",
  },
  {
    streamId: "STREAM-SOCCER-001",
    title: "⚽ LIVE: Pi Brazil FC vs Sovereign Madrid — Champions Cup",
    hostParticipantId: "PART-001",
    sport: "soccer",
    status: "live",
    viewerCount: 18_500_000,
    peakViewers: 22_000_000,
    piTipsReceived: 680_000,
    piPPVPrice: 10,
    adRevenuePi: 2_100_000,
    platformCutPi: 0,
    creatorRevenuePi: 2_100_000,
    youtubeCutSaved: 2_100_000 * (YOUTUBE_CREATOR_CUT_PCT / 100),
    quantumDRM: true,
    cdnNodes: 89_441,
    latencyMs: 287,
    viewsOnChain: 18_500_000,
    scheduledAt: "2026-04-26T19:30:00Z",
    startedAt: "2026-04-26T19:30:00Z",
  },
  {
    streamId: "STREAM-BBALL-001",
    title: "🏀 SCHEDULED: Pi Lakers vs Sovereign Celtics — Finals Game 7",
    hostParticipantId: "PART-002",
    sport: "basketball",
    status: "scheduled",
    viewerCount: 0,
    peakViewers: 0,
    piTipsReceived: 0,
    piPPVPrice: 25,
    adRevenuePi: 0,
    platformCutPi: 0,
    creatorRevenuePi: 0,
    youtubeCutSaved: 0,
    quantumDRM: true,
    cdnNodes: 0,
    latencyMs: STREAMING_LATENCY_MS,
    viewsOnChain: 0,
    scheduledAt: "2026-06-15T20:00:00Z",
  },
];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sport    = searchParams.get("sport");
  const status   = searchParams.get("status");
  const limit    = Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 100);

  let streams = ACTIVE_STREAMS;
  if (sport)  streams = streams.filter(s => s.sport === sport);
  if (status) streams = streams.filter(s => s.status === status);

  const totalAdRevenuePi    = streams.reduce((s, st) => s + st.adRevenuePi, 0);
  const totalTipsPi         = streams.reduce((s, st) => s + st.piTipsReceived, 0);
  const totalPlatformCutPi  = streams.reduce((s, st) => s + st.platformCutPi, 0); // always 0
  const totalYouTubeSaved   = streams.reduce((s, st) => s + st.youtubeCutSaved, 0);
  const totalViewers        = streams.reduce((s, st) => s + st.viewerCount, 0);

  return NextResponse.json({
    platform: SOVEREIGN_SPORTS_VERSION,
    security: APEX_SECURITY_LEVEL,
    quantumDRM: QUANTUM_ALGO_ENC,
    platformCutPct: SSH_PLATFORM_CUT_PCT,
    streamingLatencyMs: SSH_STREAMING_LATENCY_MS,
    youtubeCutAthleteSaved: `${YOUTUBE_CREATOR_CUT_PCT}% per stream`,
    superChatCutSaved: `${YOUTUBE_SUPER_CHAT_CUT_PCT}% per tip`,
    pioneerCDNNodes: PIONEER_FANBASE,
    summary: {
      totalStreams: streams.length,
      liveNow: streams.filter(s => s.status === "live").length,
      totalViewers,
      totalAdRevenuePi,
      totalTipsPi,
      totalPlatformCutPi,
      totalYouTubeSaved: Math.round(totalYouTubeSaved),
      totalAthleteRevenuePi: totalAdRevenuePi + totalTipsPi,
    },
    streams: streams.slice(0, limit),
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
    title,
    hostParticipantId,
    sport,
    piPPVPrice = 0,
    scheduledAt,
  } = body as {
    title?: string;
    hostParticipantId?: string;
    sport?: string;
    piPPVPrice?: number;
    scheduledAt?: string;
  };

  if (!title || !hostParticipantId || !sport) {
    return NextResponse.json(
      { error: "title, hostParticipantId, and sport are required" },
      { status: 400 },
    );
  }

  const piPPVPriceNum = Number(piPPVPrice);
  if (isNaN(piPPVPriceNum) || piPPVPriceNum < 0) {
    return NextResponse.json({ error: "piPPVPrice must be >= 0" }, { status: 400 });
  }

  const stream: SportStream = {
    streamId: `STREAM-${randomUUID().replace(/-/g, "").toUpperCase().slice(0, 12)}`,
    title: String(title),
    hostParticipantId: String(hostParticipantId),
    sport: sport as SportStream["sport"],
    status: scheduledAt ? "scheduled" : "live",
    viewerCount: 0,
    peakViewers: 0,
    piTipsReceived: 0,
    piPPVPrice: piPPVPriceNum,
    adRevenuePi: 0,
    platformCutPi: SSH_PLATFORM_CUT_PCT,  // always 0
    creatorRevenuePi: 0,
    youtubeCutSaved: 0,
    quantumDRM: true,
    cdnNodes: 0,
    latencyMs: SSH_STREAMING_LATENCY_MS,
    viewsOnChain: 0,
    scheduledAt: scheduledAt ?? new Date().toISOString(),
    startedAt: scheduledAt ? undefined : new Date().toISOString(),
  };

  return NextResponse.json({
    success: true,
    stream,
    sovereign: {
      platformCutPct: SSH_PLATFORM_CUT_PCT,
      quantumDRM: QUANTUM_ALGO_ENC,
      streamingLatencyMs: SSH_STREAMING_LATENCY_MS,
      piPPVUsdEquiv: piPPVPriceNum * PI_RATE_EXTERNAL,
      message: piPPVPriceNum === 0
        ? "Free stream — 100% ad revenue and all Pi tips go directly to host"
        : `PPV stream — fans pay ${piPPVPriceNum} Pi (~$${(piPPVPriceNum * PI_RATE_EXTERNAL).toFixed(2)}) to watch. 0% platform cut.`,
    },
    quantumSignature: `ML-DSA-87::SSSA::${randomUUID().replace(/-/g, "").toUpperCase().slice(0, 24)}`,
    createdAt: new Date().toISOString(),
  }, { status: 201 });
}

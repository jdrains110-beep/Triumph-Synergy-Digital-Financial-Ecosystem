/**
 * GET /api/tokenization/hq
 *
 * Public broadcast endpoint for the Triumph Synergy HQ Genesis Allodial Deed.
 *
 * This is the example anchor that connects the physical world to the Pi
 * blockchain.  Anyone in the world — human or machine — can verify
 * Triumph Synergy's sovereign allodial title by fetching this endpoint.
 *
 * Headers returned:
 *   X-Triumph-Network         — "mainnet"
 *   X-Triumph-Central-Node    — Pi central node address
 *   X-Triumph-Property-Hash   — SHA-256 of the legal description
 *   X-Triumph-Broadcast-Hash  — SHA-256 of this broadcast payload
 *   Cache-Control             — 60 seconds (deeds are immutable)
 */

import { NextResponse } from "next/server";
import { generateHQBroadcast, HQ_PI_ADDRESS } from "@/lib/tokenization/hq-genesis-deed";

export const dynamic   = "force-dynamic";
export const revalidate = 0;

export async function GET(): Promise<NextResponse> {
  const broadcast = generateHQBroadcast();

  const response = NextResponse.json({
    success:   true,
    data:      broadcast,
    message:   "Triumph Synergy HQ Genesis Allodial Deed — public broadcast",
    timestamp: broadcast.broadcastAt,
  });

  response.headers.set("X-Triumph-Network",       broadcast.network);
  response.headers.set("X-Triumph-Central-Node",  HQ_PI_ADDRESS);
  response.headers.set("X-Triumph-Property-Hash", broadcast.deed.propertyHash);
  response.headers.set("X-Triumph-Broadcast-Hash", broadcast.broadcastHash);
  response.headers.set("X-Triumph-Genesis-Deed",  broadcast.deed.tokenId);
  response.headers.set("Cache-Control",            "public, max-age=60, stale-while-revalidate=300");
  response.headers.set("Access-Control-Allow-Origin", "*");   // Public broadcast

  return response;
}

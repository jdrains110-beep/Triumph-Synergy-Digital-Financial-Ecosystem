/**
 * Triumph Synergy HQ Genesis Deed Broadcast
 *
 * Public endpoint — no authentication required.
 * Transmits the Triumph Synergy Headquarters allodial deed to the world,
 * serving as the anchor example that connects the digital ecosystem to
 * physical-world property rights on Pi Network mainnet.
 *
 * GET  /api/hq-broadcast          → full broadcast payload
 * GET  /api/hq-broadcast?view=deed → stripped deed only
 * GET  /api/hq-broadcast?view=verify → verification instructions only
 */

import { type NextRequest, NextResponse } from "next/server";
import {
  generateHQBroadcast,
  HQ_GENESIS_DEED,
  HQ_PI_ADDRESS,
  HQ_DOMAIN,
  HQ_LEGAL_DESCRIPTION,
} from "@/lib/tokenization/hq-genesis-deed";

// Cache broadcast for 60 s — propertyHash is deterministic, only broadcastAt changes
let _cache: { payload: ReturnType<typeof generateHQBroadcast>; ts: number } | null = null;

function getBroadcast() {
  const now = Date.now();
  if (!_cache || now - _cache.ts > 60_000) {
    _cache = { payload: generateHQBroadcast(), ts: now };
  }
  return _cache.payload;
}

export async function GET(request: NextRequest) {
  const view = request.nextUrl.searchParams.get("view") ?? "full";

  const broadcast = getBroadcast();

  // CORS headers — this endpoint is public and world-readable
  const headers = {
    "Access-Control-Allow-Origin":  "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Cache-Control":                "public, max-age=60",
    "X-Triumph-Central-Node":       HQ_PI_ADDRESS,
    "X-Triumph-Domain":             HQ_DOMAIN,
    "X-Triumph-Network":            "Pi Network Mainnet",
    "X-Triumph-Broadcast-Hash":     broadcast.broadcastHash,
  };

  switch (view) {
    case "deed":
      return NextResponse.json(
        {
          success:   true,
          deed:      HQ_GENESIS_DEED,
          broadcastHash: broadcast.broadcastHash,
          broadcastAt:   broadcast.broadcastAt,
        },
        { headers }
      );

    case "verify":
      return NextResponse.json(
        {
          success:     true,
          verification: broadcast.verification,
          declaration:  broadcast.declaration,
          centralNode:  HQ_PI_ADDRESS,
          domain:       HQ_DOMAIN,
          legalDescription: HQ_LEGAL_DESCRIPTION,
          broadcastHash: broadcast.broadcastHash,
          broadcastAt:   broadcast.broadcastAt,
        },
        { headers }
      );

    case "summary":
      return NextResponse.json(
        {
          success:        true,
          tokenId:        HQ_GENESIS_DEED.tokenId,
          domain:         HQ_DOMAIN,
          network:        "mainnet",
          centralNode:    HQ_PI_ADDRESS,
          status:         HQ_GENESIS_DEED.status,
          titleType:      HQ_GENESIS_DEED.titleType,
          deedNumber:     HQ_GENESIS_DEED.deedNumber,
          valuationPi:    HQ_GENESIS_DEED.valuationPi,
          valuationUsd:   HQ_GENESIS_DEED.valuationUsd,
          mintedAt:       HQ_GENESIS_DEED.mintedAt,
          propertyHash:   HQ_GENESIS_DEED.propertyHash,
          fortressScore:  HQ_GENESIS_DEED.fortressProtection.securityScore,
          declaration:    broadcast.declaration,
          broadcastHash:  broadcast.broadcastHash,
          broadcastAt:    broadcast.broadcastAt,
          piThesis:       "Pi Network utility creates value that can be sustained",
        },
        { headers }
      );

    default: // full
      return NextResponse.json(
        { success: true, ...broadcast },
        { headers }
      );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin":  "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

/**
 * @fileoverview Gateway Bridge — Interoperability bridge transactions
 * @copyright Copyright (C) 2024-2026 Jeremiah Joel Drains, Founder & Superior Sovereign / Triumph Synergy. All rights reserved.
 * @license PiOS
 *
 * GET  /api/gateway/bridge          — List all bridges and their status
 * POST /api/gateway/bridge          — Initiate a bridge transaction
 *
 * Every financial network on Earth — SWIFT, ACH, FedWire, Ethereum, Bitcoin —
 * attaches to the Triumph Synergy ecosystem through these bridges.
 * Pi settles everything.
 */

import { NextResponse, type NextRequest } from "next/server";
import {
  InteroperabilityBridge,
  type BridgeNetwork,
  type BridgeDirection,
} from "@/lib/sovereign-finance";

export async function GET() {
  const bridges = InteroperabilityBridge.listBridges();
  const health = InteroperabilityBridge.healthCheck();

  return NextResponse.json({
    success: true,
    totalBridges: bridges.length,
    healthIssues: health.length,
    bridges: bridges.map((b) => ({
      network: b.network,
      status: b.status,
      direction: b.direction,
      feeBps: b.feeBps,
      finalitySeconds: b.finalitySeconds,
      minPi: b.minAmountPi,
      maxPi: b.maxAmountPi,
      externalAsset: b.externalAsset,
      requiresKyc: b.requiresKyc,
    })),
    ...(health.length > 0 && { degraded: health }),
  });
}

export async function POST(req: NextRequest) {
  try {
    const { network, direction, amountPi, senderAddress, recipientAddress } =
      await req.json();

    if (!network || !amountPi || !senderAddress || !recipientAddress) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: network, amountPi, senderAddress, recipientAddress",
        },
        { status: 400 },
      );
    }

    const tx = await InteroperabilityBridge.bridgeTransaction({
      network: network as BridgeNetwork,
      direction: (direction ?? "outbound") as BridgeDirection,
      amountPi,
      senderAddress,
      recipientAddress,
    });

    return NextResponse.json({
      success: true,
      transaction: tx,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? "Bridge transaction failed" },
      { status: 422 },
    );
  }
}

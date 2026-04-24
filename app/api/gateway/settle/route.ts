/**
 * @fileoverview Gateway Settle — Pi-based settlement endpoint
 * @copyright Copyright (C) 2024-2026 Jeremiah Drains / Triumph Synergy. All rights reserved.
 * @license PiOS
 *
 * POST /api/gateway/settle
 * Settle a transaction through the Universal Gateway.
 * Pi is ALWAYS the base settlement unit — external currencies are derived.
 */

import { NextResponse, type NextRequest } from "next/server";
import { UniversalGateway, type SettlementRequest } from "@/lib/sovereign-finance";

export async function POST(req: NextRequest) {
  try {
    const body: SettlementRequest = await req.json();

    const {
      connectorId,
      amountPi,
      targetCurrency,
      direction,
      memo,
      externalRef,
      signature,
      timestamp,
    } = body;

    if (
      !connectorId ||
      !amountPi ||
      !targetCurrency ||
      !direction ||
      !signature ||
      !timestamp
    ) {
      return NextResponse.json(
        { error: "Missing required settlement fields" },
        { status: 400 },
      );
    }

    if (amountPi <= 0) {
      return NextResponse.json(
        { error: "amountPi must be positive" },
        { status: 400 },
      );
    }

    const gateway = new UniversalGateway();
    const result = await gateway.settle(body);

    if (result.status === "failed") {
      return NextResponse.json(
        { error: result.error, settlement: result },
        { status: 422 },
      );
    }

    return NextResponse.json({
      success: true,
      settlement: result,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Settlement failed" },
      { status: 500 },
    );
  }
}

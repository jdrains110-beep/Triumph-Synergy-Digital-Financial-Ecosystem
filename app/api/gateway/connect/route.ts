/**
 * @fileoverview Gateway Connect — External system registration
 * @copyright Copyright (C) 2024-2026 Jeremiah Drains / Triumph Synergy. All rights reserved.
 * @license PiOS
 *
 * POST /api/gateway/connect
 * Register a new external system (bank, exchange, government, dApp) with
 * the Triumph Synergy Universal Gateway.  Returns a connector ID and
 * one-time HMAC secret for authenticating future requests.
 */

import { NextResponse, type NextRequest } from "next/server";
import { UniversalGateway, type ConnectorTier, type SettlementCurrency } from "@/lib/sovereign-finance";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { name, tier, supportedCurrencies, webhookUrl, ipAllowlist } = body;

    if (!name || !tier || !supportedCurrencies || !webhookUrl) {
      return NextResponse.json(
        { error: "Missing required fields: name, tier, supportedCurrencies, webhookUrl" },
        { status: 400 },
      );
    }

    const gateway = new UniversalGateway();
    const { connector, hmacSecret } = await gateway.registerConnector({
      name,
      tier: tier as ConnectorTier,
      supportedCurrencies: supportedCurrencies as SettlementCurrency[],
      webhookUrl,
      ipAllowlist,
    });

    return NextResponse.json({
      success: true,
      connector: {
        id: connector.id,
        name: connector.name,
        tier: connector.tier,
        status: connector.status,
        publicKey: connector.publicKey,
        dailySettlementCap: connector.dailySettlementCap,
      },
      // One-time secret — the caller MUST store this securely
      hmacSecret,
      message: "Store the hmacSecret securely. It will not be shown again.",
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Registration failed" },
      { status: 500 },
    );
  }
}

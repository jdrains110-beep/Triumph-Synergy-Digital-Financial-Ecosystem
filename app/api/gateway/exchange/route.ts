/**
 * @fileoverview Gateway Exchange — Pi exchange rates
 * @copyright Copyright (C) 2024-2026 Jeremiah Joel Drains, Founder & Superior Sovereign / Triumph Synergy. All rights reserved.
 * @license PiOS
 *
 * GET  /api/gateway/exchange?currency=USD
 * POST /api/gateway/exchange  { currency: "USD" }
 *
 * Returns the Pi → target exchange rate.
 * Pi is the sovereign base; all rates are DERIVED from Pi's value.
 */

import { NextResponse, type NextRequest } from "next/server";
import {
  UniversalGateway,
  GlobalReserveProtocol,
  type SettlementCurrency,
} from "@/lib/sovereign-finance";

export async function GET(req: NextRequest) {
  const currency = req.nextUrl.searchParams.get("currency") ?? "USD";

  const gateway = new UniversalGateway();
  const rate = await gateway.getExchangeRate(currency as SettlementCurrency);

  return NextResponse.json({
    success: true,
    rate,
    note: "Pi is the sovereign base currency. All rates are Pi-denominated.",
  });
}

export async function POST(req: NextRequest) {
  try {
    const { currency, amountPi, amountFiat } = await req.json();

    if (amountPi != null) {
      // Convert Pi → fiat
      const fiatValue = GlobalReserveProtocol.piToFiat(
        amountPi,
        currency ?? "USD",
      );
      return NextResponse.json({
        success: true,
        input: { amountPi, currency: currency ?? "USD" },
        output: { amountFiat: fiatValue },
      });
    }

    if (amountFiat != null) {
      // Convert fiat → Pi
      const piValue = GlobalReserveProtocol.priceInPi(
        amountFiat,
        currency ?? "USD",
      );
      return NextResponse.json({
        success: true,
        input: { amountFiat, currency: currency ?? "USD" },
        output: { amountPi: piValue },
      });
    }

    // Just return the rate
    const gateway = new UniversalGateway();
    const rate = await gateway.getExchangeRate(
      (currency ?? "USD") as SettlementCurrency,
    );
    return NextResponse.json({ success: true, rate });
  } catch {
    return NextResponse.json(
      { error: "Exchange query failed" },
      { status: 500 },
    );
  }
}

/**
 * @fileoverview Gateway Reserve — Global Reserve Protocol status
 * @copyright Copyright (C) 2024-2026 Jeremiah Joel Drains, Founder & Superior Sovereign / Triumph Synergy. All rights reserved.
 * @license PiOS
 *
 * GET /api/gateway/reserve
 * Returns the current state of Pi as the global reserve currency,
 * sector-by-sector real-world utility metrics, and currency profiles.
 */

import { NextResponse } from "next/server";
import {
  GlobalReserveProtocol,
  REAL_WORLD_UTILITY_SECTORS,
  PI_EXTERNAL_VALUE_USD,
  PI_INTERNAL_VALUE_USD,
  PI_VALUE_MULTIPLIER,
} from "@/lib/sovereign-finance";

export async function GET() {
  const currencies = GlobalReserveProtocol.defaultCurrencyProfiles();

  const sectorMetrics = REAL_WORLD_UTILITY_SECTORS.map((sector) =>
    GlobalReserveProtocol.sectorUtility(sector, 0, 0),
  );

  const snapshot = GlobalReserveProtocol.buildSnapshot({
    totalPiCirculating: 0,
    connectorCount: 0,
    sectorMetrics,
    currencies,
  });

  return NextResponse.json({
    success: true,
    protocol: "Triumph Synergy Global Reserve Protocol v1.0",
    positioning: {
      base: "Pi Network",
      role: "Sovereign global reserve currency and settlement layer",
      advantage:
        "Real-world utility across 20+ sectors built by Triumph Synergy — " +
        "every financial system on Earth attaches to Pi to survive and maintain.",
      internalValue: `$${PI_INTERNAL_VALUE_USD.toLocaleString()} USD per Pi (internally mined)`,
      externalValue: `$${PI_EXTERNAL_VALUE_USD.toLocaleString()} USD per Pi (external market)`,
      multiplier: `${PI_VALUE_MULTIPLIER}x multiplier for Pioneer miners`,
    },
    sectors: REAL_WORLD_UTILITY_SECTORS,
    snapshot,
  });
}

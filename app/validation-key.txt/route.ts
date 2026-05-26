import type { NextRequest } from "next/server";
import {
  buildValidationResponse,
  pickValidationMode,
  resolveValidationKey,
} from "@/lib/validation/keys";

export const dynamic = "force-dynamic";

// Pi App Studio currently has Triumph Synergy registered as a TESTNET app.
// Its verifier fetches `/validation-key.txt` (no query param, no special
// host hint) and expects the TESTNET validation key. The picker can fall
// through to mainnet when NEXT_PUBLIC_PI_SANDBOX is unset on the host, so
// we force testnet as the default and only return mainnet when explicitly
// requested via ?mode=mainnet. Flip this back to picker logic once the
// app is transferred to mainnet in Pi App Studio.
export function GET(request: NextRequest) {
  const url = new URL(request.url);
  const modeParam = url.searchParams.get("mode");
  const mode =
    modeParam === "mainnet"
      ? "mainnet"
      : modeParam === "testnet"
        ? "testnet"
        : pickValidationMode(request, "testnet");
  const key = resolveValidationKey(mode);
  return buildValidationResponse(key);
}

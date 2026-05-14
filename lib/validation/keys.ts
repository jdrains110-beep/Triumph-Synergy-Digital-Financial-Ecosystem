import { NextResponse } from "next/server";

/**
 * Validation key resolution.
 *
 * MAINNET-ONLY MANDATE: the entire ecosystem operates on Pi Network mainnet
 * + Stellar Protocol 24. The ONE permitted testnet artifact in the codebase
 * is the Pi App Studio testnet validation key, served exclusively by
 * `app/validation-key-testnet.txt/route.ts`. The "testnet" branch below
 * MUST only be reached by that route. It must never be used to drive
 * Pi payments, Stellar submissions, or any other runtime logic.
 */
export type ValidationMode = "mainnet" | "testnet";

// Validation key resolved lazily so module can be imported at build time.
const getDefaultValidationKey = () =>
  process.env.DEFAULT_VALIDATION_KEY ||
  process.env.PI_VALIDATION_KEY ||
  process.env.VALIDATION_KEY ||
  "";

// No hardcoded domain whitelists — Pi App Studio assigns a fresh hostname
// on every transfer and any whitelist mis-classifies the new domain.
// Mode is selected by, in order:
//   1. explicit ?mode= query param
//   2. NEXT_PUBLIC_PI_SANDBOX env ("true" = testnet)
//   3. host substring hints ("testnet"/"sandbox")
//   4. mainnet (default)
const TESTNET_DOMAINS: string[] = [];
const MAINNET_DOMAINS: string[] = [];

export const pickValidationMode = (
  request: Request,
  explicitMode?: ValidationMode
): ValidationMode => {
  if (explicitMode) {
    return explicitMode;
  }

  const url = new URL(request.url);
  const modeParam = url.searchParams.get("mode");
  if (modeParam === "testnet") {
    return "testnet";
  }
  if (modeParam === "mainnet") {
    return "mainnet";
  }

  const host = (request.headers.get("host") || url.host || "").toLowerCase();

  // Domain whitelists are intentionally empty (see comment above) but the
  // loops are kept so future ops can reintroduce a list via env without
  // re-touching this file.
  if (TESTNET_DOMAINS.some(d => host.includes(d) || host === d)) {
    console.log("[Validation] Detected TESTNET domain:", host);
    return "testnet";
  }

  if (MAINNET_DOMAINS.some(d => host.includes(d) || host === d)) {
    console.log("[Validation] Detected MAINNET domain:", host);
    return "mainnet";
  }

  // Env-driven sandbox flag is the canonical signal post-transfer.
  if (process.env.NEXT_PUBLIC_PI_SANDBOX === "true") {
    return "testnet";
  }

  // Fallback: check for testnet hints in hostname
  if (host.includes("1991") || host.includes("testnet") || host.includes("sandbox")) {
    console.log("[Validation] Detected testnet hint in host:", host);
    return "testnet";
  }
  
  // Default to mainnet
  console.log("[Validation] Defaulting to mainnet for host:", host);
  return "mainnet";
};

export const resolveValidationKey = (mode: ValidationMode): string => {
  const fallback = getDefaultValidationKey();
  const mainnet =
    process.env.PI_NETWORK_MAINNET_VALIDATION_KEY ||
    process.env.MAINNET_VALIDATION_KEY ||
    process.env.PI_VALIDATION_KEY ||
    process.env.VALIDATION_KEY ||
    fallback;
  const testnet =
    process.env.PI_NETWORK_TESTNET_VALIDATION_KEY ||
    process.env.TESTNET_VALIDATION_KEY ||
    process.env.PI_VALIDATION_KEY ||
    process.env.VALIDATION_KEY ||
    fallback;

  const key = mode === "testnet" ? testnet : mainnet;

  if (!key && process.env.NODE_ENV === "production") {
    throw new Error(
      "CRITICAL: No validation key configured. Set DEFAULT_VALIDATION_KEY, " +
      "PI_VALIDATION_KEY, or VALIDATION_KEY in the environment."
    );
  }

  return key;
};

export const buildValidationResponse = (key: string) =>
  new NextResponse(`${key}\n`, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=60",
    },
  });

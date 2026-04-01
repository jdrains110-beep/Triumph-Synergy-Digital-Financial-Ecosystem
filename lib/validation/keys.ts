import { NextResponse } from "next/server";

export type ValidationMode = "mainnet" | "testnet";

// Default fallback key keeps existing verification working if env vars are missing.
const DEFAULT_VALIDATION_KEY =
  process.env.DEFAULT_VALIDATION_KEY ||
  process.env.PI_VALIDATION_KEY ||
  process.env.VALIDATION_KEY ||
  "efee2c5a2ce4e5079efeb7eb88e9460f8928f87e900d1fb2075b3f6279fb5b612550875c1fb8b0f1b749b96028e66c833bfc6e52011997a4c38d3252e7b2b195";

// TESTNET domains - explicit list
const TESTNET_DOMAINS = [
  "triumphsynergy1991.pinet.com",      // PINET TESTNET
  "triumph-synergy-testnet.vercel.app", // VERCEL TESTNET
];

// MAINNET domains - explicit list  
const MAINNET_DOMAINS = [
  "triumphsynergy0576.pinet.com",       // PINET MAINNET PRIMARY
  "triumphsynergy7386.pinet.com",       // PINET MAINNET SECONDARY
  "triumph-synergy.vercel.app",         // VERCEL MAINNET
];

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
  
  // Check explicit domain lists first
  if (TESTNET_DOMAINS.some(d => host.includes(d) || host === d)) {
    console.log("[Validation] Detected TESTNET domain:", host);
    return "testnet";
  }
  
  if (MAINNET_DOMAINS.some(d => host.includes(d) || host === d)) {
    console.log("[Validation] Detected MAINNET domain:", host);
    return "mainnet";
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
  const mainnet =
    process.env.PI_NETWORK_MAINNET_VALIDATION_KEY ||
    process.env.MAINNET_VALIDATION_KEY ||
    process.env.PI_VALIDATION_KEY ||
    process.env.VALIDATION_KEY ||
    DEFAULT_VALIDATION_KEY;
  const testnet =
    process.env.PI_NETWORK_TESTNET_VALIDATION_KEY ||
    process.env.TESTNET_VALIDATION_KEY ||
    process.env.PI_VALIDATION_KEY ||
    process.env.VALIDATION_KEY ||
    DEFAULT_VALIDATION_KEY;

  return mode === "testnet" ? testnet : mainnet;
};

export const buildValidationResponse = (key: string) =>
  new NextResponse(`${key}\n`, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=60",
    },
  });

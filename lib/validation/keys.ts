import { NextResponse } from "next/server";

export type ValidationMode = "mainnet" | "testnet";

// Default fallback key keeps existing verification working if env vars are missing.
const DEFAULT_VALIDATION_KEY =
  process.env.DEFAULT_VALIDATION_KEY ||
  process.env.PI_VALIDATION_KEY ||
  process.env.VALIDATION_KEY ||
  "efee2c5a2ce4e5079efeb7eb88e9460f8928f87e900d1fb2075b3f6279fb5b612550875c1fb8b0f1b749b96028e66c833bfc6e52011997a4c38d3252e7b2b195";

const TESTNET_HOST_HINTS = ["testnet.", "-test.", "sandbox."];

export const pickValidationMode = (
  request: Request,
  explicitMode?: ValidationMode
): ValidationMode => {
  if (explicitMode) return explicitMode;

  const url = new URL(request.url);
  const modeParam = url.searchParams.get("mode");
  if (modeParam === "testnet") return "testnet";
  if (modeParam === "mainnet") return "mainnet";

  const host = (request.headers.get("host") || url.host || "").toLowerCase();
  const isTestnetHost = TESTNET_HOST_HINTS.some((hint) => host.includes(hint));
  return isTestnetHost ? "testnet" : "mainnet";
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

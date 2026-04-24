/**
 * Pi Network Domain Verification Endpoint
 * This endpoint proves domain ownership to Pi Network
 * Returns the correct domain for testnet or mainnet
 */

import { NextResponse } from "next/server";

export async function GET() {
  // Get the correct domain based on environment
  const isSandbox = process.env.NEXT_PUBLIC_PI_SANDBOX === "true";
  const domain = isSandbox
    ? "triumphsynergy1991.pinet.com"
    : "triumphsynergy7386.pinet.com";

  // Get the correct validation key
  const verificationToken = isSandbox
    ? process.env.PI_NETWORK_TESTNET_VALIDATION_KEY || ""
    : process.env.PI_NETWORK_MAINNET_VALIDATION_KEY || "";

  return NextResponse.json({
    domain,
    appId: process.env.NEXT_PUBLIC_PI_APP_ID || "",
    verification: verificationToken,
    network: isSandbox ? "testnet" : "mainnet",
    timestamp: new Date().toISOString(),
  });
}

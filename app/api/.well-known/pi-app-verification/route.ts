/**
 * Pi App Verification Endpoint
 * CRITICAL: Pi Browser calls this to verify the app is legitimate
 * If this returns wrong data or 404, Pi Browser shows blank screen
 *
 * Official docs: https://github.com/pi-apps/pi-platform-docs
 */

import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const hostname = request.headers.get("host") || "";

    // ALWAYS detect from hostname, never from env vars
    // This ensures each domain gets the correct config
    let domain = "triumphsynergy0576.pinet.com";
    let network = "mainnet";
    let verificationKey = process.env.PI_NETWORK_MAINNET_VALIDATION_KEY || "";

    // Check hostname to determine environment
    if (hostname.includes("1991")) {
      // 1991 is ALWAYS testnet
      domain = "triumphsynergy1991.pinet.com";
      network = "testnet";
      verificationKey = process.env.PI_NETWORK_TESTNET_VALIDATION_KEY || "";
      console.log("[Pi Verification] 1991 detected - using testnet config");
    } else if (hostname.includes("7386")) {
      // 7386 is mainnet
      domain = "triumphsynergy7386.pinet.com";
      network = "mainnet";
      verificationKey = process.env.PI_NETWORK_MAINNET_VALIDATION_KEY || "";
      console.log("[Pi Verification] 7386 detected - using mainnet config");
    } else {
      // Default to primary domain (0576) as mainnet
      domain = "triumphsynergy0576.pinet.com";
      network = "mainnet";
      verificationKey = process.env.PI_NETWORK_MAINNET_VALIDATION_KEY || "";
      console.log("[Pi Verification] 0576 or unknown - using mainnet config");
    }

    console.log(
      "[Pi Verification] Request from:",
      hostname,
      "→ Domain:",
      domain,
      "Network:",
      network
    );

    // Return verification data
    const response = {
      domain,
      appId: process.env.NEXT_PUBLIC_PI_APP_ID || "triumph-synergy",
      verification: verificationKey,
      network,
      sandbox: network === "testnet",
      version: "1.0",
    };

    const result = NextResponse.json(response);

    // Add CORS headers for Pi Browser
    result.headers.set("Access-Control-Allow-Origin", "*");
    result.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    result.headers.set("Access-Control-Allow-Headers", "Content-Type");
    result.headers.set("Content-Type", "application/json");

    return result;
  } catch (error) {
    console.error("[Pi Verification] Error:", error);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

/**
 * Pi App Verification Endpoint
 * CRITICAL: Pi Browser calls this to verify the app is legitimate
 * If this returns wrong data or 404, Pi Browser shows blank screen
 *
 * Official docs: https://github.com/pi-apps/pi-platform-docs
 */

import { type NextRequest, NextResponse } from "next/server";

// Domain configuration - ALL 5 PRODUCTION DOMAINS
const DOMAIN_CONFIG: Record<string, { network: "mainnet" | "testnet"; envKey: string }> = {
  // PINET DOMAINS
  "triumphsynergy1991.pinet.com": { network: "testnet", envKey: "PI_NETWORK_TESTNET_VALIDATION_KEY" },
  "triumphsynergy7386.pinet.com": { network: "mainnet", envKey: "PI_NETWORK_MAINNET_VALIDATION_KEY" },
  "triumphsynergy0576.pinet.com": { network: "mainnet", envKey: "PI_NETWORK_MAINNET_VALIDATION_KEY" },
  // VERCEL DOMAINS
  "triumph-synergy.vercel.app": { network: "mainnet", envKey: "PI_NETWORK_MAINNET_VALIDATION_KEY" },
  "triumph-synergy-testnet.vercel.app": { network: "testnet", envKey: "PI_NETWORK_TESTNET_VALIDATION_KEY" },
};

export async function GET(request: NextRequest) {
  try {
    const hostname = (request.headers.get("host") || "").toLowerCase().split(":")[0];
    
    console.log("[Pi Verification] Request hostname:", hostname);

    // Look up domain configuration
    let config = DOMAIN_CONFIG[hostname];
    
    // If exact match not found, try partial matching
    if (!config) {
      for (const [domain, domainConfig] of Object.entries(DOMAIN_CONFIG)) {
        if (hostname.includes(domain) || domain.includes(hostname)) {
          config = domainConfig;
          console.log("[Pi Verification] Partial match found:", domain);
          break;
        }
      }
    }
    
    // Default to mainnet if no match
    if (!config) {
      console.log("[Pi Verification] No domain match, defaulting to mainnet");
      config = { network: "mainnet", envKey: "PI_NETWORK_MAINNET_VALIDATION_KEY" };
    }

    const verificationKey = process.env[config.envKey] || 
      process.env.PI_VALIDATION_KEY || 
      "efee2c5a2ce4e5079efeb7eb88e9460f8928f87e900d1fb2075b3f6279fb5b612550875c1fb8b0f1b749b96028e66c833bfc6e52011997a4c38d3252e7b2b195";

    console.log(
      "[Pi Verification] Config:",
      "hostname:", hostname,
      "network:", config.network,
      "keyLength:", verificationKey.length
    );

    // Return verification data
    const response = {
      domain: hostname,
      appId: process.env.NEXT_PUBLIC_PI_APP_ID || process.env.PI_APP_ID || "triumph-synergy",
      verification: verificationKey,
      network: config.network,
      sandbox: config.network === "testnet",
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

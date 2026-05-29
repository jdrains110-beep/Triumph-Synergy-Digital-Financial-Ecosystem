/**
 * PI APP STUDIO VERIFICATION ENDPOINT
 *
 * This API route provides Pi Network with verification data for domain ownership
 * and app identity verification.
 *
 * Accessed at: /api/pi-verification (also proxied from /.well-known/pi-app-verification)
 *
 * CRITICAL: Returns the VALIDATION KEY that Pi Network uses to verify domain ownership
 */

// Domain configuration — MAINNET-ONLY MANDATE
// (Pi Network + Stellar Protocol 24). The testnet validation key is
// served separately from /validation-key-testnet.txt and is the ONLY
// permitted testnet artifact in the ecosystem.
const DOMAIN_CONFIG: Record<string, { network: "mainnet" | "testnet"; envKey: string }> = {
  // PINET MAINNET DOMAINS
  "triumphsynergyab2099.pinet.com": { network: "mainnet", envKey: "PI_NETWORK_MAINNET_VALIDATION_KEY" },
  // REPLIT MAINNET ORIGIN
  "triumph-synergy.replit.app": { network: "mainnet", envKey: "PI_NETWORK_MAINNET_VALIDATION_KEY" },
};

// Default validation key (mainnet). Testnet key is intentionally not
// served from this endpoint — see /validation-key-testnet.txt.
const DEFAULT_MAINNET_KEY = "efee2c5a2ce4e5079efeb7eb88e9460f8928f87e900d1fb2075b3f6279fb5b612550875c1fb8b0f1b749b96028e66c833bfc6e52011997a4c38d3252e7b2b195";

export async function GET(request: Request) {
  // Get hostname
  const url = new URL(request.url);
  const hostname = (request.headers.get("host") || url.hostname || "").toLowerCase().split(":")[0];

  console.log("[Pi Verification] Request from hostname:", hostname);

  // Look up domain configuration
  let config = DOMAIN_CONFIG[hostname];
  
  // If exact match not found, try partial matching
  if (!config) {
    for (const [domain, domainConfig] of Object.entries(DOMAIN_CONFIG)) {
      if (hostname.includes(domain) || domain.includes(hostname)) {
        config = domainConfig;
        break;
      }
    }
  }
  
  // Default to mainnet if no match
  if (!config) {
    config = { network: "mainnet", envKey: "PI_NETWORK_MAINNET_VALIDATION_KEY" };
  }

  // Get the validation key (mainnet-only mandate)
  const validationKey = process.env[config.envKey] || DEFAULT_MAINNET_KEY;

  console.log("[Pi Verification] Network:", config.network, "Key length:", validationKey.length);

  // CORS headers for Pi Network verification systems
  const headers = {
    "Content-Type": "application/json",
    "Cache-Control": "no-cache, no-store, must-revalidate",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "X-Pi-Verification-Status": "verified",
    "X-Pi-App-ID": process.env.NEXT_PUBLIC_PI_APP_ID || "triumph-synergy",
  };

  // Verification data structure
  const verificationData = {
    // Core app identification
    app_id: process.env.NEXT_PUBLIC_PI_APP_ID || process.env.PI_APP_ID || "triumph-synergy",
    app_name: "Triumph Synergy",
    verified: true,
    verification_date: "2026-01-18",
    verification_method: "http-endpoint",

    // CRITICAL: The validation key for Pi Network domain verification
    verification: validationKey,
    validation_key: validationKey,

    // Network configuration
    network: config.network,
    sandbox: false,
    
    // Domain info
    domain: hostname,
    
    // App URLs (mainnet-only)
    urls: {
      mainnet_pinet: "https://triumphsynergyab2099.pinet.com",
      mainnet_replit: "https://Triumph-Synergy.replit.app",
      current_host: hostname,
    },

    // Timestamp
    timestamp: new Date().toISOString(),
    version: "1.0",
  };

  return new Response(JSON.stringify(verificationData, null, 2), {
    status: 200,
    headers,
  });
}

export async function OPTIONS(request: Request) {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

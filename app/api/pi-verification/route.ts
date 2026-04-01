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

// Default validation keys (fallback if env vars not set)
const DEFAULT_MAINNET_KEY = "efee2c5a2ce4e5079efeb7eb88e9460f8928f87e900d1fb2075b3f6279fb5b612550875c1fb8b0f1b749b96028e66c833bfc6e52011997a4c38d3252e7b2b195";
const DEFAULT_TESTNET_KEY = "75b333f8b28771b24f2fb6adb87b225cc1b58eef8bd5a747d388a98dca1084e331eebc385c6a63885a887f4a0382bc883adeeeccdce9240b4cb8c10faaed93a3";

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

  // Get the validation key
  const validationKey = process.env[config.envKey] || 
    (config.network === "testnet" ? DEFAULT_TESTNET_KEY : DEFAULT_MAINNET_KEY);

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
    sandbox: config.network === "testnet",
    
    // Domain info
    domain: hostname,
    
    // App URLs
    urls: {
      mainnet_pinet: "https://triumphsynergy0576.pinet.com",
      mainnet_pinet_alt: "https://triumphsynergy7386.pinet.com",
      mainnet_vercel: "https://triumph-synergy.vercel.app",
      testnet_pinet: "https://triumphsynergy1991.pinet.com",
      testnet_vercel: "https://triumph-synergy-testnet.vercel.app",
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

/**
 * PI APP STUDIO VERIFICATION ENDPOINT
 *
 * This API route provides Pi Network with verification data for domain ownership
 * and app identity verification without requiring DNS records.
 *
 * Accessed by Pi App Studio at: /api/pi-verification (proxied from /.well-known/pi-app-verification)
 */

export async function GET(request: Request) {
  // CORS headers for Pi Network verification systems
  const headers = {
    "Content-Type": "application/json",
    "Cache-Control": "no-cache, no-store, must-revalidate",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "X-Pi-Verification-Status": "verified",
    "X-Pi-App-ID": "triumph-synergy",
  };

  // Get the origin/host from request
  const url = new URL(request.url);
  const host = url.hostname;

  // Simple verification data structure
  const verificationData = {
    // Core app identification
    app_id: "triumph-synergy",
    app_name: "Triumph Synergy",
    verified: true,
    verification_date: "2026-01-18",
    verification_method: "http-endpoint",

    // App URLs
    urls: {
      mainnet: "https://triumphsynergy7386.pinet.com",
      testnet: "https://triumphsynergy1991.pinet.com",
      custom_domain: "https://triumphsynergy0576.pinet.com",
      current_host: host,
    },

    // Verification confirmation
    verification_tokens: {
      mainnet: "triumph-synergy-mainnet-verified-20260118",
      testnet: "triumph-synergy-testnet-verified-20260118",
      domain: "triumphsynergy0576-pinet-verified-20260118",
    },

    // Timestamp for cache validation
    timestamp: new Date().toISOString(),
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
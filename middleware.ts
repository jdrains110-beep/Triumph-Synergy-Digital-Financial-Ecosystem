/**
 * middleware.ts
 * Edge Middleware — Web3 session support + Supabase refresh + security headers
 *
 * Web3 Integration: Propagates wallet identity headers (X-Wallet-PublicKey,
 * X-Wallet-DID) from authenticated clients to downstream API routes.
 *
 * Supabase SSR integration: refreshes auth tokens on every request so
 * server components always see a fresh session.
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createMiddlewareSupabase } from "@/lib/supabase";

/**
 * Main middleware function
 */
export async function middleware(request: NextRequest) {
  const hostname = request.nextUrl.hostname.toLowerCase();

  // PRODUCTION DOMAINS
  const PRODUCTION_DOMAINS = [
    "triumphsynergy1991.pinet.com", // PINET DEV
    "triumphsynergy7386.pinet.com", // PINET MAINNET
    "triumphsynergy0576.pinet.com", // PINET PRIMARY
    "localhost",
    "127.0.0.1",
  ];

  // BLOCK non-sovereign preview deployments
  if (
    hostname.includes(".vercel.app") ||
    hostname.includes("-jeremiah-drains-projects.vercel.app") ||
    hostname.includes("-git-")
  ) {
    // Redirect to sovereign Pi Network domain
    const redirectUrl = new URL(request.nextUrl);
    redirectUrl.hostname = "triumphsynergy1991.pinet.com";
    return NextResponse.redirect(redirectUrl, 307);
  }

  // Create response and refresh Supabase auth session
  const response = NextResponse.next();

  try {
    const supabase = createMiddlewareSupabase(request, response);
    // Refresh the session — this updates cookies so the server always has a
    // valid token.  We intentionally ignore the return value; if there is no
    // active session the call is a harmless no-op.
    await supabase.auth.getUser();
  } catch {
    // Supabase not configured or unreachable — continue without session refresh
  }

  // ────────────────────────────────────────────────────────────────────────
  // APEX SECURITY HEADERS — sovereign hardening profile
  // ────────────────────────────────────────────────────────────────────────
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("X-DNS-Prefetch-Control", "off");
  response.headers.set("X-Download-Options", "noopen");
  response.headers.set("X-Permitted-Cross-Domain-Policies", "none");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    [
      "camera=()",
      "microphone=()",
      "geolocation=()",
      "payment=(self)",
      "usb=()",
      "bluetooth=()",
      "interest-cohort=()",
      "browsing-topics=()",
    ].join(", ")
  );
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload"
  );
  // Cross-Origin isolation (apex profile)
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  response.headers.set("Cross-Origin-Resource-Policy", "same-origin");
  // Allow embedding Pi SDK iframe but isolate process
  response.headers.set("Cross-Origin-Embedder-Policy", "credentialless");
  // Prevent stale-content cached attacks on dynamic routes
  response.headers.set(
    "Cache-Control",
    "private, no-store, no-cache, must-revalidate, max-age=0"
  );
  // Generate per-request nonce for inline scripts (CSP3)
  const nonce = crypto
    .getRandomValues(new Uint8Array(16))
    .reduce((acc, b) => acc + b.toString(16).padStart(2, "0"), "");
  response.headers.set("X-CSP-Nonce", nonce);
  response.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://sdk.minepi.com https://app-cdn.minepi.com`,
      "script-src-attr 'none'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://*.minepi.com https://developer-assets.minepi.com",
      "connect-src 'self' https://api.minepi.com https://*.minepi.com https://horizon.pi.network https://api.testnet.minepi.com https://*.supabase.co wss://*.supabase.co",
      "frame-src 'self' https://sdk.minepi.com",
      "font-src 'self' data:",
      "object-src 'none'",
      "media-src 'self'",
      "manifest-src 'self'",
      "worker-src 'self' blob:",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
      "block-all-mixed-content",
    ].join("; ")
  );
  response.headers.set("Report-To", '{"group":"csp","max_age":10886400,"endpoints":[{"url":"/api/security/csp-report"}]}');
  response.headers.set("NEL", '{"report_to":"csp","max_age":10886400,"include_subdomains":true}');

  // Web3 protocol headers — identify this as a Web3-native application
  response.headers.set("X-Web3-Protocol", "triumph-synergy/1.0");
  response.headers.set("X-Chain", "pi-network");

  // Propagate wallet identity from client to API routes
  const walletKey = request.headers.get("x-wallet-publickey");
  if (walletKey) {
    response.headers.set("X-Wallet-PublicKey", walletKey);
    const did = request.headers.get("x-wallet-did") || `did:pi:${walletKey}`;
    response.headers.set("X-Wallet-DID", did);
  }

  return response;
}

/**
 * Middleware configuration
 * Only match dynamic routes to avoid interfering with static content
 */
export const config = {
  matcher: [
    /*
     * Match routes that need preview blocking logic
     * Static files pass through automatically
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|html|txt|xml|json)$).*)",
  ],
};


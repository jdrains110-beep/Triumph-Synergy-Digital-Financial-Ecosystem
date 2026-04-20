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
    "triumphsynergy1991.pinet.com", // PINET TESTNET
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

  // Security headers
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload"
  );
  response.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://sdk.minepi.com https://app-cdn.minepi.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://*.minepi.com",
      "connect-src 'self' https://api.minepi.com https://*.minepi.com https://*.supabase.co wss://*.supabase.co",
      "frame-src 'self' https://sdk.minepi.com",
      "font-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join("; ")
  );

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


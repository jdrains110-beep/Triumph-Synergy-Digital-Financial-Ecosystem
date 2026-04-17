/**
 * middleware.ts
 * Edge Middleware — Supabase session refresh + preview blocking + security headers
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

  // PRODUCTION DOMAINS - Let them pass through unmodified
  const PRODUCTION_DOMAINS = [
    "triumphsynergy1991.pinet.com", // PINET TESTNET
    "triumphsynergy7386.pinet.com", // PINET MAINNET
    "triumphsynergy0576.pinet.com", // PINET PRIMARY
    "triumph-synergy.vercel.app", // VERCEL MAINNET
    "triumph-synergy-testnet.vercel.app", // VERCEL TESTNET
    "localhost",
    "127.0.0.1",
  ];

  // BLOCK preview deployments - redirect to production
  if (
    hostname.includes("-jeremiah-drains-projects.vercel.app") ||
    hostname.includes("-git-") ||
    (hostname.includes(".vercel.app") &&
      !PRODUCTION_DOMAINS.includes(hostname))
  ) {
    const redirectUrl = new URL(request.nextUrl);
    redirectUrl.hostname = "triumph-synergy.vercel.app";
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


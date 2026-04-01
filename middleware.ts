/**
 * middleware.ts
 * Minimal Edge Middleware - Only blocks preview deployments
 * All other logic handled by app/layout.tsx Pi SDK initialization
 * 
 * Goal: Eliminate interference with Pi Studio integration
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Main middleware function - MINIMAL, NO INTERFERENCE
 */
export function middleware(request: NextRequest) {
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

  // All production domains: pass through without modification
  // Pi SDK initialization happens in app/layout.tsx
  return NextResponse.next();
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


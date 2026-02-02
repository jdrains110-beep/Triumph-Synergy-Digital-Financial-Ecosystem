/**
 * middleware.ts
 * Next.js Edge Middleware for Pi Browser Detection and Request Handling
 *
 * This middleware runs on every request to:
 * 1. Detect Pi Browser from User-Agent
 * 2. Set headers for Pi SDK integration
 * 3. Route requests appropriately based on browser context
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Detect if request is from Pi Browser
 */
function isPiBrowser(userAgent: string): boolean {
  if (!userAgent) {
    return false;
  }
  const ua = userAgent.toLowerCase();
  return (
    ua.includes("pibrowser") ||
    ua.includes("pi browser") ||
    ua.includes("pinetwork")
  );
}

/**
 * Extract Pi Browser version from User-Agent
 */
function getPiBrowserVersion(userAgent: string): string | null {
  if (!userAgent) {
    return null;
  }
  const match = userAgent.match(/PiBrowser\/([^\s]+)/i);
  return match ? match[1] : null;
}

/**
 * Main middleware function
 */
export function middleware(request: NextRequest) {
  const userAgent = request.headers.get("user-agent") || "";
  const isPi = isPiBrowser(userAgent);
  const piVersion = getPiBrowserVersion(userAgent);

  // Normalize hostname to lowercase for comparison
  const hostname = request.nextUrl.hostname.toLowerCase();

  // ============================================
  // ALLOWED DOMAINS - DO NOT REDIRECT THESE
  // All lowercase for case-insensitive comparison
  // ============================================
  const ALLOWED_DOMAINS = [
    "triumphsynergy1991.pinet.com", // PINET TESTNET
    "triumphsynergy7386.pinet.com", // PINET MAINNET
    "triumphsynergy0576.pinet.com", // PINET PRIMARY
    "triumph-synergy.vercel.app", // VERCEL MAINNET
    "triumph-synergy-testnet.vercel.app", // VERCEL TESTNET
    "localhost",
    "127.0.0.1",
  ];

  // Only redirect if NOT an allowed domain
  const isAllowedDomain = ALLOWED_DOMAINS.includes(hostname);

  // Log for debugging (only in development or if debug header present)
  if (
    process.env.NODE_ENV === "development" ||
    request.headers.get("x-debug")
  ) {
    console.log(
      `[Middleware] Hostname: ${hostname}, Allowed: ${isAllowedDomain}`
    );
  }

  // DISABLED: Redirects were causing issues with Pi Browser
  // Let all domains through, just set headers
  /*
  if (
    !isAllowedDomain &&
    (hostname.includes("-jeremiah-drains-projects.vercel.app") ||
      hostname.includes("-git-") ||
      (hostname.endsWith(".vercel.app") &&
        !hostname.startsWith("triumph-synergy")))
  ) {
    const redirectUrl = new URL(request.nextUrl);
    redirectUrl.hostname = "triumphsynergy0576.pinet.com";
    const response = NextResponse.redirect(redirectUrl, 301);
    response.headers.set("Cache-Control", "no-cache, no-store, must-revalidate");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
    return response;
  }
  */

  // Create response with modified headers
  const response = NextResponse.next();

  // Mark response as coming from validated domain (not preview)
  response.headers.set("X-Validated-Domain", "true");
  response.headers.set(
    "X-Deployment-Source",
    hostname.includes("pinet.com") ? "pinet" : "vercel"
  );

  // Set Pi Browser detection headers
  response.headers.set("X-Pi-Browser", isPi ? "true" : "false");

  if (piVersion) {
    response.headers.set("X-Pi-Browser-Version", piVersion);
  }

  // ============================================
  // EXPLICIT FULL DOMAIN URL MATCHING
  // ALL 5 PRODUCTION DOMAINS LISTED EXPLICITLY
  // ============================================
  // PINET DOMAINS:
  //   triumphsynergy1991.pinet.com = TESTNET
  //   triumphsynergy7386.pinet.com = MAINNET
  //   triumphsynergy0576.pinet.com = MAINNET (primary)
  // VERCEL DOMAINS:
  //   triumph-synergy.vercel.app = MAINNET
  //   triumph-synergy-testnet.vercel.app = TESTNET
  // ============================================
  const isTestnet =
    hostname === "triumphsynergy1991.pinet.com" ||
    hostname === "triumph-synergy-testnet.vercel.app" ||
    (hostname.endsWith(".vercel.app") &&
      hostname !== "triumph-synergy.vercel.app" &&
      hostname !== "triumph-synergy-testnet.vercel.app");

  const isMainnet =
    hostname === "triumphsynergy7386.pinet.com" ||
    hostname === "triumphsynergy0576.pinet.com" ||
    hostname === "triumph-synergy.vercel.app";

  response.headers.set("X-Pi-Network", isTestnet ? "testnet" : "mainnet");
  response.headers.set("X-Pi-Sandbox", isTestnet ? "true" : "false");
  response.headers.set("X-Hostname", hostname);

  // Add CORS headers for Pi SDK
  const origin = request.headers.get("origin") || "";
  if (
    origin.includes("minepi.com") ||
    origin.includes("pinet.com") ||
    origin.includes("vercel.app") ||
    origin.includes("localhost")
  ) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Credentials", "true");
    response.headers.set(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, OPTIONS"
    );
    response.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-Pi-App-Id, X-Requested-With"
    );
  }

  // Handle preflight requests
  if (request.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 200,
      headers: response.headers,
    });
  }

  // Log Pi Browser detection (only in development)
  if (process.env.NODE_ENV === "development" && isPi) {
    console.log(
      `[Middleware] Pi Browser detected: ${piVersion || "unknown version"}`
    );
  }

  return response;
}

/**
 * Middleware configuration
 * Match all routes except static files and internal Next.js routes
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files (html, txt, etc)
     * - api routes (let them pass through)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|html|txt|xml|json)$).*)",
  ],
};

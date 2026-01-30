/**
 * middleware.ts
 * Next.js Edge Middleware for Pi Browser Detection and Request Handling
 * 
 * This middleware runs on every request to:
 * 1. Detect Pi Browser from User-Agent
 * 2. Set headers for Pi SDK integration
 * 3. Route requests appropriately based on browser context
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Detect if request is from Pi Browser
 */
function isPiBrowser(userAgent: string): boolean {
  if (!userAgent) return false;
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
  if (!userAgent) return null;
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
  
  const hostname = request.nextUrl.hostname;
  
  // CRITICAL: Redirect preview URLs to production pinet domains
  // Prevent accessing via random Vercel preview deployments
  if (
    hostname.includes("-jeremiah-drains-projects.vercel.app") ||
    hostname.includes("-git-") ||
    (hostname.includes("vercel.app") && !hostname.includes("triumph-synergy.vercel.app"))
  ) {
    // Redirect to testnet domain by default with permanent redirect
    const redirectUrl = new URL(request.nextUrl);
    redirectUrl.hostname = "triumphsynergy0576.pinet.com";
    const response = NextResponse.redirect(redirectUrl, 301);
    // Ensure no caching of redirect to prevent stale preview URLs
    response.headers.set("Cache-Control", "no-cache, no-store, must-revalidate");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
    return response;
  }
  
  // Create response with modified headers
  const response = NextResponse.next();
  
  // Mark response as coming from validated domain (not preview)
  response.headers.set("X-Validated-Domain", "true");
  response.headers.set("X-Deployment-Source", hostname.includes("pinet.com") ? "pinet" : "vercel");
  
  // Set Pi Browser detection headers
  response.headers.set("X-Pi-Browser", isPi ? "true" : "false");
  
  if (piVersion) {
    response.headers.set("X-Pi-Browser-Version", piVersion);
  }
  
  // Set Pi Network environment based on hostname
  // triumphsynergy0576 = mainnet (primary app domain)
  // triumphsynergy1991 = testnet (development/testing) ← ALWAYS testnet
  // triumphsynergy7386 = mainnet (production)
  const isTestnet = hostname.includes("1991");
  const isMainnet = hostname.includes("7386") || hostname.includes("0576") || hostname.includes("triumph-synergy.vercel.app");
  
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
    console.log(`[Middleware] Pi Browser detected: ${piVersion || "unknown version"}`);
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
     * - public folder files
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};

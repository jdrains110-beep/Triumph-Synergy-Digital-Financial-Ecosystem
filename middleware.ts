import { NextRequest, NextResponse } from "next/server";

/**
 * Middleware for Pi Browser recognition and routing
 * Detects Pi Browser and sets appropriate headers/context
 */

const PI_BROWSER_USER_AGENTS = [
  "PiBrowser",
  "Pi Browser",
  "pi-browser",
  "minepi",
];

const PI_NETWORK_PATTERNS = [
  /PiBrowser/i,
  /Pi Browser/i,
  /pi-browser/i,
  /minepi/i,
];

/**
 * Detect if request comes from Pi Browser
 */
function isPiBrowserRequest(userAgent: string): boolean {
  if (!userAgent) return false;
  return PI_NETWORK_PATTERNS.some((pattern) => pattern.test(userAgent));
}

/**
 * Middleware function
 */
export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const userAgent = request.headers.get("user-agent") || "";
  const isPiBrowser = isPiBrowserRequest(userAgent);

  // Set headers for downstream components
  response.headers.set("x-pi-browser", isPiBrowser ? "true" : "false");
  response.headers.set("x-pi-user-agent", userAgent);

  // Log Pi Browser detection for debugging
  if (isPiBrowser) {
    console.log(
      `[Middleware] Pi Browser detected from ${request.nextUrl.pathname}`
    );
  }

  // Add Pi Browser context to response
  response.headers.set("x-pi-environment", isPiBrowser ? "pi-browser" : "web");

  // Route-specific handling
  const pathname = request.nextUrl.pathname;

  // API routes - add Pi Browser context
  if (pathname.startsWith("/api/")) {
    response.headers.set("x-pi-context", isPiBrowser ? "native" : "fallback");
  }

  // Payment routes - ensure Pi Browser users get native payment UI
  if (pathname.includes("/payment") || pathname.includes("/checkout")) {
    if (isPiBrowser) {
      response.headers.set("x-payment-method", "pi-native");
    } else {
      response.headers.set("x-payment-method", "fallback");
    }
  }

  return response;
}

/**
 * Matcher configuration - apply middleware to specific routes
 */
export const config = {
  matcher: [
    // Apply to all routes except static files and API routes that don't need it
    "/((?!_next/static|_next/image|favicon.ico|public/).*)",
  ],
};

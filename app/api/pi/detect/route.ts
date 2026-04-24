/**
 * Pi Browser Detection API Route
 *
 * Replaces the deprecated middleware pattern
 * Provides Pi Browser detection via API endpoint
 */

import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const userAgent = request.headers.get("user-agent") || "";

  // Pi Browser detection patterns
  const PI_BROWSER_PATTERNS = [
    /PiBrowser/i,
    /Pi Browser/i,
    /pi-browser/i,
    /minepi/i,
  ];

  const isPiBrowser = PI_BROWSER_PATTERNS.some((pattern) =>
    pattern.test(userAgent)
  );

  return NextResponse.json(
    {
      isPiBrowser,
      userAgent,
      timestamp: new Date().toISOString(),
      headers: {
        "x-pi-browser": isPiBrowser ? "true" : "false",
      },
    },
    {
      headers: {
        "x-pi-browser": isPiBrowser ? "true" : "false",
        "Cache-Control": "no-cache",
      },
    }
  );
}

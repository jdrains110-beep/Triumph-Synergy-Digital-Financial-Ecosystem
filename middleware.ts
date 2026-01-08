import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Next.js Middleware
 *
 * Handles routing before requests reach the application.
 * PRIORITY: validation-key.txt must be served FIRST for Pi domain verification.
 */
export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const host = request.headers.get("host") || "";

  // ============================================================================
  // PRIORITY: Serve validation key BEFORE any redirects
  // This is required for Pi Network domain verification
  // ============================================================================
  if (
    pathname === "/validation-key.txt" ||
    pathname === "/api/validation-key"
  ) {
    const validationKey =
      "efee2c5a2ce4e5079efeb7eb88e9460f8928f87e900d1fb2075b3f6279fb5b612550875c1fb8b0f1b749b96028e66c833bfc6e52011997a4c38d3252e7b2b195";
    return new NextResponse(validationKey, {
      status: 200,
      headers: {
        "Content-Type": "text/plain",
        "Cache-Control": "public, max-age=3600",
      },
    });
  }
  // ============================================================================

  // ============================================================================
  // LOCKED REDIRECT: All Vercel URLs → triumphsynergy0576.pinet.com
  // This is required for Pi App Studio connectivity
  // ============================================================================
  if (host.includes("triumph-synergy") && host.includes("vercel.app")) {
    return NextResponse.redirect(
      `https://triumphsynergy0576.pinet.com${pathname}${search}`,
      { status: 307 }
    );
  }
  // ============================================================================

  // Allow all other requests to continue
  return NextResponse.next();
}

// Configure which paths the middleware runs on
export const config = {
  matcher: [
    // Match validation endpoints explicitly
    "/validation-key.txt",
    "/api/validation-key",
    // Match all other paths except static files
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
};

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";

/**
 * CRITICAL: DO NOT MODIFY THE REDIRECT LOGIC BELOW
 *
 * All traffic from Vercel domains MUST redirect to https://triumphsynergy0576.pinet.com/
 * This is a core routing requirement for Pi App Studio integration.
 * Any add-ons, features, or modifications must respect this redirect - NO EXCEPTIONS.
 *
 * If you need to add features, add them AFTER the redirect check.
 * 
 * EXCEPTION: validation-key.txt must be served directly for Pi domain verification.
 */
export default async function proxy(request: NextRequest) {
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
    // Return the validation key directly as plain text
    const validationKey = "efee2c5a2ce4e5079efeb7eb88e9460f8928f87e900d1fb2075b3f6279fb5b612550875c1fb8b0f1b749b96028e66c833bfc6e52011997a4c38d3252e7b2b195";
    return new NextResponse(validationKey, {
      status: 200,
      headers: {
        "Content-Type": "text/plain",
        "Cache-Control": "public, max-age=3600",
        "x-vercel-skip-protection": "1",
      },
    });
  }
  // ============================================================================
  
  // ============================================================================
  // LOCKED REDIRECT: All Vercel URLs → triumphsynergy0576.pinet.com
  // DO NOT MODIFY - This is non-negotiable for Pi App Studio connectivity
  // ============================================================================
  if (host.includes("triumph-synergy") && host.includes("vercel.app")) {
    return NextResponse.redirect(
      `https://triumphsynergy0576.pinet.com${pathname}${search}`,
      { status: 307 } // Temporary redirect
    );
  }
  // ============================================================================

  // Allow API routes to continue without auth
  if (pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  // Allow public/static files and known public routes
  if (
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname.startsWith("/public") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/(auth)")
  ) {
    return NextResponse.next();
  }

  // Protect other routes with auth
  try {
    const session = await auth();

    if (!session) {
      const loginUrl = new URL("/api/auth/signin", request.url);
      return NextResponse.redirect(loginUrl);
    }
  } catch (error) {
    console.error("Auth middleware error:", error);
    // Allow request to continue even if auth fails
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/validation-key.txt",
    "/api/validation-key",
    "/((?!api|_next/static|_next/image|favicon.ico|public).*)",
  ],
};

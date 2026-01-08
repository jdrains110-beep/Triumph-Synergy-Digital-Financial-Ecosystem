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
 */
export default async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const host = request.headers.get("host") || "";

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

  // Allow validation endpoints and skip platform protections
  if (
    pathname === "/validation-key.txt" ||
    pathname === "/api/validation-key"
  ) {
    const response = NextResponse.next();
    response.headers.set("x-vercel-skip-protection", "1");
    return response;
  }

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

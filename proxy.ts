import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

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

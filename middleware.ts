import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow API routes to work
  if (pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  // Allow public routes
  if (
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname.startsWith("/public")
  ) {
    return NextResponse.next();
  }

  // Allow auth routes
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/(auth)")
  ) {
    return NextResponse.next();
  }

  // Protect other routes
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
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!api|_next/static|_next/image|favicon.ico|public).*)",
  ],
};

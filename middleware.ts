import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow all API routes
  if (pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  // Allow static files and public routes
  if (
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname === "/robots.txt" ||
    pathname.startsWith("/public") ||
    pathname.startsWith("/images")
  ) {
    return NextResponse.next();
  }

  // Allow auth routes without checking session
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname === "/api/auth/signin" ||
    pathname === "/api/auth/signout" ||
    pathname === "/api/auth/callback"
  ) {
    return NextResponse.next();
  }

  // Allow all other routes (remove auth check for now)
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};

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

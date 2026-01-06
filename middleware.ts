import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  // Redirect all Vercel domain traffic to custom domain
  const host = request.headers.get("host") || "";

  if (host.includes("triumph-synergy") && host.includes("vercel.app")) {
    // Preserve the path and query string
    const { pathname, search } = request.nextUrl;
    return NextResponse.redirect(
      `https://triumphsynergy0576.pinet.com${pathname}${search}`,
      { status: 307 } // Temporary redirect
    );
  }

  return NextResponse.next();
}

export const config = {
  // Apply middleware to all routes except static assets and _next
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public/).*)",
  ],
};

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname, host } = request.nextUrl;

  // Allow validation key to be served directly without redirect
  if (pathname === "/validation-key.txt") {
    return NextResponse.next();
  }

  // Let these paths go through without crashing
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/_next") ||
    pathname.startsWith("/favicon.ico")
  ) {
    return NextResponse.next();
  }

  // Redirect Vercel deployments to Pi App Studio (except validation key)
  if (host.includes("vercel.app")) {
    const piUrl = new URL(pathname, "https://triumphsynergy0576.pinet.com");
    return NextResponse.redirect(piUrl);
  }

  // Everything else just works normally
  return NextResponse.next();
}

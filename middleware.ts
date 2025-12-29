import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname, host } = request.nextUrl;

  // Let these paths go through without crashing
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/_next") ||
    pathname.startsWith("/favicon.ico")
  ) {
    return NextResponse.next();
  }

  // Redirect Vercel deployments to Pi App Studio
  if (host.includes("vercel.app")) {
    const piUrl = new URL(pathname, "https://triumphsynergy0576.pinet.com");
    return NextResponse.redirect(piUrl);
  }

  // Everything else just works normally
  return NextResponse.next();
}

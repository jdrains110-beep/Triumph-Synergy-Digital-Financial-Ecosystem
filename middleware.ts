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

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api/validation-key (validation-key API endpoint)
     */
    "/((?!_next/static|_next/image|favicon\\.ico|api/validation-key).*)",
  ],
};

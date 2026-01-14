import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const SUPPORTED_LOCALES = ["en", "es", "fr", "pt", "hi", "zh"];
const DEFAULT_LOCALE = "en";

const normalizeLocale = (value?: string | null) =>
  value?.toLowerCase().split(/[._-]/)[0];

const pickLocale = (
  acceptLanguage: string | null,
  cookieLocale: string | undefined,
  country: string | null
) => {
  const cookieCandidate = normalizeLocale(cookieLocale);
  if (cookieCandidate && SUPPORTED_LOCALES.includes(cookieCandidate)) {
    return cookieCandidate;
  }

  if (acceptLanguage) {
    const headerLocale = acceptLanguage
      .split(",")
      .map((part) => part.trim().split(";")[0])
      .map(normalizeLocale)
      .find((loc) => loc && SUPPORTED_LOCALES.includes(loc));
    if (headerLocale) {
      return headerLocale;
    }
  }

  const countryLocaleMap: Record<string, string> = {
    AR: "es",
    BO: "es",
    BR: "pt",
    CL: "es",
    CO: "es",
    EC: "es",
    ES: "es",
    FR: "fr",
    GT: "es",
    HN: "es",
    IN: "hi",
    MX: "es",
    NI: "es",
    PA: "es",
    PE: "es",
    PY: "es",
    SV: "es",
    UY: "es",
    VE: "es",
    PT: "pt",
    TW: "zh",
    HK: "zh",
    CN: "zh",
    SG: "zh",
  };
  const countryCandidate = country
    ? countryLocaleMap[country.toUpperCase()]
    : null;
  if (countryCandidate && SUPPORTED_LOCALES.includes(countryCandidate)) {
    return countryCandidate;
  }

  return DEFAULT_LOCALE;
};

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

  const acceptLanguage = request.headers.get("accept-language");
  const cookieLocale = request.cookies.get("ts-locale")?.value;
  const countryHeader = request.headers.get("x-vercel-ip-country") || null;

  const locale = pickLocale(acceptLanguage, cookieLocale, countryHeader);

  const response = NextResponse.next();
  response.cookies.set("ts-locale", locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
    sameSite: "lax",
  });

  // Security hardening headers
  response.headers.set("x-frame-options", "DENY");
  response.headers.set("x-content-type-options", "nosniff");
  response.headers.set("referrer-policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "permissions-policy",
    "accelerometer=(), geolocation=(), microphone=(), camera=(), gyroscope=(), payment=(self)"
  );
  response.headers.set("cross-origin-resource-policy", "same-site");
  response.headers.set("x-ts-locale", locale);

  // Allow all other requests to continue
  return response;
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

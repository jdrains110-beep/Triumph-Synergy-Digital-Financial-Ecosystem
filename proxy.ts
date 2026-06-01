/**
 * proxy.ts  (replaces middleware.ts — Next.js 16 renamed the convention)
 * Edge Proxy — Web3 session support + Supabase refresh + security headers
 *
 * Web3 Integration: Propagates wallet identity headers (X-Wallet-PublicKey,
 * X-Wallet-DID) from authenticated clients to downstream API routes.
 *
 * Supabase SSR integration: refreshes auth tokens on every request so
 * server components always see a fresh session.
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createMiddlewareSupabase } from "@/lib/supabase";

// Stellar public key format: 'G' + 55 uppercase base32 chars (A-Z, 2-7), 56 total.
// Used to validate X-Wallet-PublicKey before propagating it to API routes.
const STELLAR_KEY_RE = /^G[A-Z2-7]{55}$/;

/**
 * Main proxy function (Next.js 16 convention — was "middleware")
 */
export async function proxy(request: NextRequest) {
  // NOTE: Pi App Studio assigns each app a fresh hostname on (re)transfer.
  // We must NOT hard-code or filter on hostnames here, otherwise the verifier
  // (or a freshly-issued domain) gets redirected away before the app can call
  // Pi.authenticate(), causing "We didn't detect a Pi sign-in." Hostnames are
  // configured at deploy time via env (NEXT_PUBLIC_APP_URL) and validated by
  // Pi App Studio itself; this edge layer treats every host as legitimate.

  // Create response and refresh Supabase auth session.
  // Generate per-request nonce up front so we can forward it to the server
  // component tree (via x-csp-nonce request header) and also emit it on the
  // response CSP. This lets the root layout attach `nonce={...}` to the Pi SDK
  // <script> tags so they pass strict CSP even with 'strict-dynamic'.
  const nonce = crypto
    .getRandomValues(new Uint8Array(16))
    .reduce((acc, b) => acc + b.toString(16).padStart(2, "0"), "");

  const requestHeaders = new Headers(request.headers);
  // Use 'x-nonce' — the header name Next.js App Router reads to auto-apply
  // the nonce to its own injected scripts (bootstrapper, __NEXT_DATA__, etc.).
  requestHeaders.set("x-nonce", nonce);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  try {
    const supabase = createMiddlewareSupabase(request, response);
    // Refresh the session — this updates cookies so the server always has a
    // valid token.  We intentionally ignore the return value; if there is no
    // active session the call is a harmless no-op.
    await supabase.auth.getUser();
  } catch {
    // Supabase not configured or unreachable — continue without session refresh
  }

  // ────────────────────────────────────────────────────────────────────────
  // APEX SECURITY HEADERS — sovereign hardening profile
  // ────────────────────────────────────────────────────────────────────────
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("X-DNS-Prefetch-Control", "off");
  response.headers.set("X-Download-Options", "noopen");
  response.headers.set("X-Permitted-Cross-Domain-Policies", "none");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    [
      "camera=()",
      "microphone=()",
      "geolocation=()",
      "payment=(self)",
      "usb=()",
      "bluetooth=()",
      "interest-cohort=()",
      "browsing-topics=()",
    ].join(", ")
  );
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload"
  );
  // Cross-Origin isolation (apex profile)
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  response.headers.set("Cross-Origin-Resource-Policy", "same-origin");
  // Allow embedding Pi SDK iframe but isolate process
  response.headers.set("Cross-Origin-Embedder-Policy", "credentialless");
  // Prevent stale-content cached attacks on dynamic routes
  response.headers.set(
    "Cache-Control",
    "private, no-store, no-cache, must-revalidate, max-age=0"
  );
  // Forward nonce so the client/layout can read it via response header if needed.
  response.headers.set("X-CSP-Nonce", nonce);
  response.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://sdk.minepi.com https://app-cdn.minepi.com`,
      "script-src-attr 'none'",
      // 'unsafe-inline' in style-src: styles cannot execute JavaScript so XSS
      // via injected styles is not possible. Per CSP3 spec, if a nonce OR hash
      // is also present in style-src, browsers IGNORE 'unsafe-inline', breaking
      // all inline styles injected by Next.js and next-themes. Therefore the
      // nonce is intentionally omitted from style-src.
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://*.minepi.com https://developer-assets.minepi.com",
      "connect-src 'self' https://api.minepi.com https://*.minepi.com https://horizon.pi.network https://api.mainnet.minepi.com https://*.supabase.co wss://*.supabase.co",
      "frame-src 'self' https://sdk.minepi.com",
      "font-src 'self' data:",
      "object-src 'none'",
      "media-src 'self'",
      "manifest-src 'self'",
      "worker-src 'self' blob:",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
      "block-all-mixed-content",
    ].join("; ")
  );
  response.headers.set("Report-To", '{"group":"csp","max_age":10886400,"endpoints":[{"url":"/api/security/csp-report"}]}');
  response.headers.set("NEL", '{"report_to":"csp","max_age":10886400,"include_subdomains":true}');

  // Web3 protocol headers — identify this as a Web3-native application
  response.headers.set("X-Web3-Protocol", "triumph-synergy/1.0");
  response.headers.set("X-Chain", "pi-network");

  // ── SAIB Omnipresence Headers ─────────────────────────────────────────────
  // Injected on every response — signals SAIB guardian coverage across every
  // interaction, every platform, every subcontainer (internal + external).
  response.headers.set("X-SAIB-Version", "v7.0.0-INTREPID-CLASS");
  response.headers.set(
    "X-SAIB-Doctrine",
    "Post-Scarcity; Hyper-Intelligence; Omnipresence; Debt-Freedom-Protection"
  );
  response.headers.set("X-SAIB-Guardian", "triumph-sovereign-nano-saib:8201");
  response.headers.set(
    "X-Sovereign-Rights",
    "DSR:/api/saib/sovereignty; Protection:/api/saib/protect; Omnipresence:/api/saib/omnipresence"
  );

  // Propagate wallet identity from client to API routes.
  // Only forward keys that match the Stellar public key format (G + 55 base32
  // uppercase chars, 56 total) to prevent arbitrary header injection.
  // Note: this validates format only; signature verification is the
  // responsibility of each API route that consumes the header.
  const walletKey = request.headers.get("x-wallet-publickey");
  if (walletKey && STELLAR_KEY_RE.test(walletKey)) {
    response.headers.set("X-Wallet-PublicKey", walletKey);
    const did = request.headers.get("x-wallet-did") || `did:pi:${walletKey}`;
    response.headers.set("X-Wallet-DID", did);
  }
  // Keys that fail format validation are silently dropped (not propagated)

  return response;
}

/**
 * Middleware configuration
 * Only match dynamic routes to avoid interfering with static content
 */
export const config = {
  matcher: [
    /*
     * Match routes that need preview blocking logic
     * Static files and health check endpoints pass through automatically
     */
    "/((?!_next/static|_next/image|favicon.ico|api/health|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|html|txt|xml|json)$).*)",
  ],
};


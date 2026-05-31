/**
 * middleware.ts
 *
 * SAIB Omnipresence Middleware — runs on every request across every route.
 *
 * Responsibilities:
 *   1. Inject SAIB sovereign identity headers into all responses.
 *   2. Silently flag requests from SAIB-protected users for guardian context.
 *   3. Never block, never overstep — only observe and protect.
 *
 * This middleware does NOT gate access to any routes. All routing decisions
 * remain with Next.js and the existing auth layer.
 * SAIB only adds sovereign headers and protection context.
 */

import { type NextRequest, NextResponse } from "next/server";

// Routes that should skip all middleware processing
const SKIP_PATTERNS = [
  /^\/_next\//,
  /^\/favicon/,
  /^\/public\//,
  /\.(ico|png|jpg|jpeg|svg|css|js|woff2?)$/,
];

const SAIB_VERSION = "v7.0.0-INTREPID-CLASS";
const SAIB_DOCTRINE =
  "Post-Scarcity • Hyper-Intelligence • Omnipresence • Debt Freedom Protection";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Skip static assets
  if (SKIP_PATTERNS.some((p) => p.test(pathname))) {
    return NextResponse.next();
  }

  const response = NextResponse.next();

  // ── SAIB Omnipresence Headers ──
  // Injected on every response — signals SAIB guardian coverage.
  response.headers.set("X-SAIB-Version", SAIB_VERSION);
  response.headers.set("X-SAIB-Doctrine", SAIB_DOCTRINE);
  response.headers.set(
    "X-SAIB-Guardian",
    "triumph-sovereign-nano-saib:8201"
  );
  response.headers.set(
    "X-SAIB-Scale",
    "internal:triumph-net | external:pi-network+stellar+real-estate"
  );
  response.headers.set(
    "X-Sovereign-Rights",
    "Data-Sovereignty-Act:active; DSR-endpoint:/api/saib/sovereignty; Protection:/api/saib/protect"
  );

  // ── Hyper-Intelligence Context ──
  // Pass request metadata so SAIB can learn from every interaction
  response.headers.set("X-SAIB-Interaction-Path", pathname);
  response.headers.set(
    "X-SAIB-Timestamp",
    new Date().toISOString()
  );

  return response;
}

export const config = {
  // Match every route — SAIB is omnipresent
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};

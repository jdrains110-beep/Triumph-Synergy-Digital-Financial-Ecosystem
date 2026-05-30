/**
 * lib/api/verify-saib-token.ts
 *
 * Constant-time service-token validation for machine-to-machine endpoints
 * (HSM signing, wallet operations, SAIB task execution).
 *
 * Usage:
 *   import { verifySaibToken } from "@/lib/api/verify-saib-token";
 *   const err = verifySaibToken(request);
 *   if (err) return err;   // NextResponse with 401 already built
 *
 * The token is read from the SAIB_SERVICE_TOKEN environment variable and
 * validated against the inbound `Authorization: Bearer <token>` header or
 * the `X-SAIB-Token` header (either is accepted).
 *
 * NEVER commit the actual token value — store it in Replit Secrets /
 * Docker environment as SAIB_SERVICE_TOKEN.
 */

import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";

const SERVICE_TOKEN = process.env.SAIB_SERVICE_TOKEN ?? "";

/**
 * Returns `null` when the request carries a valid service token.
 * Returns a 401 NextResponse immediately if validation fails.
 *
 * Rejects the request outright when SAIB_SERVICE_TOKEN is not configured,
 * so misconfiguration is loud rather than silently open.
 */
export function verifySaibToken(req: NextRequest): NextResponse | null {
  if (!SERVICE_TOKEN) {
    return NextResponse.json(
      { error: "Service authentication not configured" },
      { status: 503 },
    );
  }

  const raw =
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    req.headers.get("x-saib-token") ??
    "";

  // Constant-time comparison — prevents timing-based token extraction
  let valid = false;
  try {
    const a = Buffer.from(raw.padEnd(SERVICE_TOKEN.length, "\0"));
    const b = Buffer.from(SERVICE_TOKEN.padEnd(raw.length, "\0"));
    // Both must be same length for timingSafeEqual
    const tokenBuf    = Buffer.alloc(Math.max(a.length, b.length));
    const incomingBuf = Buffer.alloc(Math.max(a.length, b.length));
    a.copy(tokenBuf);
    b.copy(incomingBuf);
    valid = timingSafeEqual(tokenBuf, incomingBuf) && raw.length === SERVICE_TOKEN.length;
  } catch {
    valid = false;
  }

  if (!valid) {
    return NextResponse.json(
      { error: "Unauthorized — valid X-SAIB-Token or Bearer token required" },
      { status: 401 },
    );
  }

  return null;
}

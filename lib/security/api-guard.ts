/**
 * API Security Guard
 * Centralized security utilities for API route protection
 */

import crypto from "crypto";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/app/(auth)/auth";

// ============================================================================
// AUTHENTICATED ROUTE GUARD
// ============================================================================

/**
 * Require authenticated session for a route handler.
 * Returns 401 if no valid session. Otherwise calls the handler with session.
 */
export async function requireAuth(
  request: NextRequest,
  handler: (request: NextRequest, session: any) => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }
    return handler(request, session);
  } catch {
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 401 }
    );
  }
}

// ============================================================================
// CSRF PROTECTION
// ============================================================================

const ALLOWED_ORIGINS = new Set([
  "https://triumphsynergyab2099.pinet.com",
  "https://triumphsynergyab2099.pinet.com",
  "https://triumphsynergyab2099.pinet.com",
  "https://triumphsynergyab2099.pinet.com",
  "https://Triumph-Synergy.replit.app",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]);

/**
 * Verify request origin for CSRF protection on state-changing methods.
 * Returns true if request is safe (GET/HEAD/OPTIONS or valid origin).
 */
export function verifyCsrf(request: NextRequest): boolean {
  const method = request.method.toUpperCase();
  // Safe methods don't need CSRF checks
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    return true;
  }

  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");

  // Allow requests with no origin (same-origin in older browsers, server-to-server)
  if (!origin && !referer) return true;

  if (origin && ALLOWED_ORIGINS.has(origin)) return true;

  // Check referer as fallback
  if (referer) {
    try {
      const refOrigin = new URL(referer).origin;
      if (ALLOWED_ORIGINS.has(refOrigin)) return true;
    } catch {
      // Invalid referer URL
    }
  }

  return false;
}

/**
 * Combined guard: rate-limit + CSRF + auth for sensitive routes.
 * Returns a 4xx response on failure, or calls the handler with session.
 */
export async function secureRoute(
  request: NextRequest,
  handler: (request: NextRequest, session: any) => Promise<NextResponse>,
  options: {
    rateLimit?: { max: number; windowMs: number; endpoint: string };
    requireAuth?: boolean;
    requireCsrf?: boolean;
  } = {}
): Promise<NextResponse> {
  const { rateLimit: rl, requireAuth: needAuth = true, requireCsrf: needCsrf = true } = options;

  // CSRF check
  if (needCsrf && !verifyCsrf(request)) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }

  // Rate limiting
  if (rl) {
    const { allowed, remaining } = await rateLimitByIPAsync(request, rl.endpoint, rl.max, rl.windowMs);
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests" },
        {
          status: 429,
          headers: {
            "Retry-After": String(Math.ceil(rl.windowMs / 1000)),
            "X-RateLimit-Remaining": String(remaining),
          },
        }
      );
    }
  }

  // Auth check
  if (needAuth) {
    return requireAuth(request, handler);
  }

  return handler(request, null);
}

// ============================================================================
// RATE LIMITING (in-memory, per-instance)
// ============================================================================

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

// Clean up expired entries every 60s
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore) {
      if (entry.resetAt < now) rateLimitStore.delete(key);
    }
  }, 60_000);
}

export function rateLimit(
  key: string,
  maxRequests: number,
  windowMs: number
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || entry.resetAt < now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1 };
  }

  entry.count++;
  const remaining = Math.max(0, maxRequests - entry.count);
  return { allowed: entry.count <= maxRequests, remaining };
}

export function rateLimitByIP(
  request: NextRequest,
  endpoint: string,
  maxRequests = 60,
  windowMs = 60_000
): { allowed: boolean; remaining: number } {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  return rateLimit(`${endpoint}:${ip}`, maxRequests, windowMs);
}

// ============================================================================
// RATE LIMITING — Redis-backed (distributed, multi-instance safe)
//
// Uses Redis INCR + PEXPIRE to implement an atomic fixed-window counter that
// is shared across all app instances.  Falls back transparently to the
// in-memory version when Redis is unavailable.
// ============================================================================

/**
 * Async rate-limit check backed by Redis.
 * Falls back to the in-memory store if Redis throws.
 */
export async function rateLimitAsync(
  key: string,
  maxRequests: number,
  windowMs: number,
): Promise<{ allowed: boolean; remaining: number }> {
  try {
    const { redis } = await import("@/lib/redis");
    const redisKey = `rl:${key}`;
    const count = await redis.incr(redisKey);
    if (count === 1) {
      // First hit in a new window — set TTL (fire-and-forget; incr already ran)
      await redis.pExpire(redisKey, windowMs);
    }
    const remaining = Math.max(0, maxRequests - count);
    return { allowed: count <= maxRequests, remaining };
  } catch {
    // Redis unavailable — fall back to per-instance in-memory counter
    return rateLimit(key, maxRequests, windowMs);
  }
}

/**
 * Async per-IP rate-limit check backed by Redis (with in-memory fallback).
 * Use this in async route handlers instead of the synchronous `rateLimitByIP`.
 */
export async function rateLimitByIPAsync(
  request: NextRequest,
  endpoint: string,
  maxRequests = 60,
  windowMs = 60_000,
): Promise<{ allowed: boolean; remaining: number }> {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  return rateLimitAsync(`${endpoint}:${ip}`, maxRequests, windowMs);
}

// ============================================================================
// INPUT SANITIZATION
// ============================================================================

const SAFE_ID_PATTERN = /^[a-zA-Z0-9_\-]{1,128}$/;

export function isValidId(value: unknown): value is string {
  return typeof value === "string" && SAFE_ID_PATTERN.test(value);
}

export function sanitizeFilename(name: string): string {
  // Strip path separators and null bytes
  const base = name.replace(/[\\/:\0]/g, "").replace(/\.\./g, "");
  // Only keep safe chars
  const safe = base.replace(/[^a-zA-Z0-9._\-]/g, "_");
  // Limit length
  return safe.slice(0, 128) || "unnamed";
}

// ============================================================================
// WEBHOOK SIGNATURE VERIFICATION
// ============================================================================

export function verifyHmacSha256(
  payload: string,
  signature: string,
  secret: string
): boolean {
  if (!secret || !signature) return false;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected)
    );
  } catch {
    return false;
  }
}

// ============================================================================
// RPC METHOD WHITELIST
// ============================================================================

const ALLOWED_RPC_METHODS = new Set([
  // Horizon / Stellar standard
  "getHealth",
  "getEvents",
  "getLatestLedger",
  "getLedgerEntries",
  "getNetwork",
  "getTransaction",
  "sendTransaction",
  "simulateTransaction",
  // Pi-specific
  "eth_chainId",
  "eth_blockNumber",
  "eth_getBalance",
  "eth_getTransactionReceipt",
  "net_version",
]);

export function isAllowedRPCMethod(method: string): boolean {
  return ALLOWED_RPC_METHODS.has(method);
}

// ============================================================================
// SAFE ERROR RESPONSES
// ============================================================================

export function safeErrorResponse(error: unknown): string {
  // Never leak internal details to clients
  if (error instanceof Error) {
    const msg = error.message;
    // Only forward messages that are safe for the client
    if (msg.length < 200 && !/stack|at\s|node_modules|internal/i.test(msg)) {
      return msg;
    }
  }
  return "An internal error occurred";
}

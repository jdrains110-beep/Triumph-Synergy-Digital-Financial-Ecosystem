/**
 * API Security Guard
 * Centralized security utilities for API route protection
 */

import crypto from "crypto";
import { type NextRequest } from "next/server";

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

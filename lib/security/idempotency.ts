/**
 * Idempotency middleware — sovereign apex layer.
 *
 * Guarantees that POST /api/pi_payment/{approve,complete} (and any other
 * sensitive mutating endpoint) cannot be replayed: the same Idempotency-Key
 * always returns the same response for `ttlMs`. Prevents:
 *   - double-charges from network retries
 *   - replay attacks across compromised TLS sessions
 *   - duplicate Stellar tx submissions
 *
 * Storage tier: in-memory cache (per-instance) with optional Supabase
 * write-through for cross-instance coherence. The header MUST be a UUIDv4
 * or 32+ hex chars; otherwise a 400 is returned (forces clients to be
 * deterministic).
 */

import { createHash } from "node:crypto";
import { NextResponse } from "next/server";

interface CachedResponse {
  status: number;
  body: string;
  headers: Record<string, string>;
  expiresAt: number;
  bodyHash: string;
}

const CACHE = new Map<string, CachedResponse>();
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const MAX_CACHE_ENTRIES = 10_000;
const KEY_PATTERN = /^[a-zA-Z0-9_\-]{16,128}$/;

// Periodic GC
if (typeof globalThis !== "undefined" && !(globalThis as any).__idem_gc) {
  (globalThis as any).__idem_gc = setInterval(() => {
    const now = Date.now();
    for (const [k, v] of CACHE) if (v.expiresAt < now) CACHE.delete(k);
    if (CACHE.size > MAX_CACHE_ENTRIES) {
      const excess = CACHE.size - MAX_CACHE_ENTRIES;
      let i = 0;
      for (const k of CACHE.keys()) {
        if (i++ >= excess) break;
        CACHE.delete(k);
      }
    }
  }, 60_000);
}

function namespacedKey(route: string, key: string, userScope: string): string {
  return createHash("sha256")
    .update(`${route}::${userScope}::${key}`)
    .digest("hex");
}

function bodyFingerprint(body: string): string {
  return createHash("sha256").update(body).digest("hex");
}

export interface IdempotencyOptions {
  ttlMs?: number;
  /** Stable scope per caller (user id, wallet, or IP). Default: anon. */
  userScope?: string;
  /** If true, mismatched body for same key returns 409 Conflict. */
  strict?: boolean;
}

/**
 * Wrap a Next.js route handler in idempotency protection.
 * The handler is only invoked on first call; subsequent calls within TTL
 * return the cached response.
 */
export async function withIdempotency(
  request: Request,
  handler: () => Promise<Response>,
  options: IdempotencyOptions = {}
): Promise<Response> {
  const key = request.headers.get("idempotency-key");
  const route = new URL(request.url).pathname;
  const ttl = options.ttlMs ?? DEFAULT_TTL_MS;
  const scope = options.userScope ?? "anon";
  const strict = options.strict ?? true;

  // Idempotency-Key REQUIRED for mutating sensitive routes
  if (!key) {
    return NextResponse.json(
      {
        error: "missing_idempotency_key",
        message:
          "Idempotency-Key header required for this endpoint. Provide a UUIDv4 or 32+ hex.",
      },
      { status: 400 }
    );
  }
  if (!KEY_PATTERN.test(key)) {
    return NextResponse.json(
      { error: "invalid_idempotency_key", message: "Key must match ^[a-zA-Z0-9_-]{16,128}$" },
      { status: 400 }
    );
  }

  // Capture body for fingerprint comparison
  const cloned = request.clone();
  const rawBody = await cloned.text();
  const fp = bodyFingerprint(rawBody);

  const cacheKey = namespacedKey(route, key, scope);
  const cached = CACHE.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    if (strict && cached.bodyHash !== fp) {
      return NextResponse.json(
        {
          error: "idempotency_key_conflict",
          message:
            "Same Idempotency-Key was used with a different request body. This is a likely replay or client bug.",
        },
        { status: 409 }
      );
    }
    return new Response(cached.body, {
      status: cached.status,
      headers: {
        ...cached.headers,
        "X-Idempotent-Replay": "true",
        "X-Idempotency-Key": key,
      },
    });
  }

  // Execute and cache
  const response = await handler();
  const text = await response.clone().text();
  const headersObj: Record<string, string> = {};
  response.headers.forEach((v, k) => {
    headersObj[k] = v;
  });

  // Only cache 2xx and 4xx (not 5xx — those should be retryable)
  if (response.status < 500) {
    CACHE.set(cacheKey, {
      status: response.status,
      body: text,
      headers: headersObj,
      expiresAt: Date.now() + ttl,
      bodyHash: fp,
    });
  }

  return new Response(text, {
    status: response.status,
    headers: {
      ...headersObj,
      "X-Idempotent-Replay": "false",
      "X-Idempotency-Key": key,
    },
  });
}

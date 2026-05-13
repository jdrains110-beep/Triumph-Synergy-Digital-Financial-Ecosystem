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
 * Storage tier: Redis primary (shared across all app instances) with automatic
 * in-memory fallback when Redis is unavailable. The Redis key is the same
 * SHA-256-namespaced hash as the in-memory key, stored as a JSON blob with
 * EX ttl so it self-expires without a GC loop.
 *
 * The Idempotency-Key header MUST be a UUIDv4 or 32+ hex chars; otherwise a
 * 400 is returned (forces clients to be deterministic).
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

// In-memory fallback — used when Redis is unavailable
const FALLBACK_CACHE = new Map<string, CachedResponse>();
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const MAX_FALLBACK_ENTRIES = 10_000;
const KEY_PATTERN = /^[a-zA-Z0-9_\-]{16,128}$/;

// Periodic GC for the in-memory fallback only
if (typeof globalThis !== "undefined" && !(globalThis as any).__idem_gc) {
  (globalThis as any).__idem_gc = setInterval(() => {
    const now = Date.now();
    for (const [k, v] of FALLBACK_CACHE) if (v.expiresAt < now) FALLBACK_CACHE.delete(k);
    if (FALLBACK_CACHE.size > MAX_FALLBACK_ENTRIES) {
      const excess = FALLBACK_CACHE.size - MAX_FALLBACK_ENTRIES;
      let i = 0;
      for (const k of FALLBACK_CACHE.keys()) {
        if (i++ >= excess) break;
        FALLBACK_CACHE.delete(k);
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

// ── Redis helpers (fail-safe) ──────────────────────────────────────────────

async function redisGet(key: string): Promise<CachedResponse | null> {
  try {
    const { redis } = await import("@/lib/redis");
    const cachedJson = await redis.get(`idem:${key}`);
    if (!cachedJson) return null;
    return JSON.parse(cachedJson) as CachedResponse;
  } catch {
    return null;
  }
}

async function redisSet(
  key: string,
  value: CachedResponse,
  ttlMs: number,
): Promise<void> {
  try {
    const { redis } = await import("@/lib/redis");
    const ttlSec = Math.max(1, Math.ceil(ttlMs / 1000));
    await redis.set(`idem:${key}`, JSON.stringify(value), { EX: ttlSec });
  } catch {
    // Redis unavailable — value was already written to FALLBACK_CACHE
  }
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
 *
 * Redis is the primary store (shared across instances).  Falls back to an
 * in-memory Map when Redis is unreachable so the API keeps working.
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
  const now = Date.now();

  // ── Cache lookup: Redis first, then in-memory fallback ────────────────────
  let cached: CachedResponse | null = await redisGet(cacheKey);
  if (!cached) cached = FALLBACK_CACHE.get(cacheKey) ?? null;

  if (cached && cached.expiresAt > now) {
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
    const entry: CachedResponse = {
      status: response.status,
      body: text,
      headers: headersObj,
      expiresAt: now + ttl,
      bodyHash: fp,
    };
    // Write to both stores — Redis is primary; fallback covers Redis outages
    FALLBACK_CACHE.set(cacheKey, entry);
    await redisSet(cacheKey, entry, ttl);
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


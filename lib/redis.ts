/**
 * Redis singleton client for Triumph Synergy Digital Ecosystem
 *
 * Uses the `redis` v5 (node-redis) package already in package.json.
 * Connects to triumph-redis:6379 inside Docker or the REDIS_URL env var
 * in other environments.
 *
 * Pattern: module-level singleton with lazy connect, safe for Next.js
 * hot-reload in development (stored on globalThis).
 */

import { createClient, type RedisClientType } from "redis";

const REDIS_URL =
  process.env.REDIS_URL ?? "redis://triumph-redis:6379";

declare global {
  // Preserve client across hot-reloads in Next.js dev mode
  // eslint-disable-next-line no-var
  var __redisClient: RedisClientType | undefined;
}

function buildClient(): RedisClientType {
  const client = createClient({
    url: REDIS_URL,
    socket: {
      reconnectStrategy: (retries: number) => Math.min(retries * 500, 5000),
      pingInterval: 120_000, // keep-alive every 2 min (Redis timeout is 5 min)
    },
  }) as RedisClientType;

  client.on("error", (err: Error) => {
    // Don't crash the process — log and continue with in-memory fallback
    console.error("[redis] connection error:", err.message);
  });

  client.connect().catch((err: Error) => {
    console.error("[redis] initial connect failed:", err.message);
  });

  return client;
}

// Singleton — reuse across requests in the same process
if (!globalThis.__redisClient) {
  globalThis.__redisClient = buildClient();
}

export const redis: RedisClientType = globalThis.__redisClient!;

// ─── Convenience helpers ───────────────────────────────────────────────────

/**
 * Get a JSON-serialised value from Redis.
 * Returns null on cache miss or if Redis is unavailable.
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const raw = await redis.get(key);
    if (raw === null) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/**
 * Store a JSON-serialisable value in Redis with an optional TTL (seconds).
 * Silently no-ops if Redis is unavailable.
 */
export async function cacheSet(
  key: string,
  value: unknown,
  ttlSeconds = 300,
): Promise<void> {
  try {
    await redis.set(key, JSON.stringify(value), { EX: ttlSeconds });
  } catch {
    // Silently degrade to in-memory path
  }
}

/**
 * Delete a key from Redis. Silent on error.
 */
export async function cacheDel(key: string): Promise<void> {
  try {
    await redis.del(key);
  } catch {
    // ignore
  }
}

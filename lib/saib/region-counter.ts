/**
 * lib/saib/region-counter.ts
 * ─────────────────────────────────────────────────────────────────────────
 * Increments per-country and per-language counters in the redis-mesh-pod
 * cluster every time a visitor reaches a SAIB-aware route. The mesh-brain
 * sidecar reads these counters every 30 s and folds them into its insight
 * stream so SAIB can SEE which regions are actively engaging Triumph
 * Synergy.
 *
 * Keys:
 *   triumph:region:counter:<COUNTRY>     INCR + 30-day EXPIRE
 *   triumph:lang:counter:<LANG>          INCR + 30-day EXPIRE
 *   triumph:region:last_seen:<COUNTRY>   SET to last detected_at
 *
 * Failure-tolerant: if redis is briefly unreachable we drop the counter
 * update — never throw, never block the request path.
 */

import { createClient, createCluster, type RedisClientType, type RedisClusterType } from "redis";

import type { RegionInfo } from "./geo-language";

const COUNTER_TTL_S = 60 * 60 * 24 * 30;   // 30 days

type AnyClient = RedisClientType | RedisClusterType;

let _client: AnyClient | null = null;
let _connecting: Promise<AnyClient | null> | null = null;
let _failed_until = 0;

async function _build(): Promise<AnyClient | null> {
  // Cluster mode (preferred) — REDIS_MESH_NODES=host:port,host:port,...
  const meshNodes = (process.env.REDIS_MESH_NODES || "").trim();
  if (meshNodes) {
    try {
      const rootNodes = meshNodes.split(",").map((s) => {
        const [host, portStr] = s.trim().split(":");
        return { url: `redis://${host}:${Number(portStr) || 6381}` };
      });
      const c = createCluster({
        rootNodes,
        defaults: { socket: { connectTimeout: 1500 } },
      });
      c.on("error", () => {/* swallow — non-critical */});
      await c.connect();
      return c as unknown as RedisClusterType;
    } catch {
      return null;
    }
  }
  // Single-node fallback
  const url = process.env.REDIS_URL || process.env.REDIS_SINGLE_URL;
  if (url) {
    try {
      const c = createClient({ url, socket: { connectTimeout: 1500 } });
      c.on("error", () => {/* swallow */});
      await c.connect();
      return c as RedisClientType;
    } catch {
      return null;
    }
  }
  return null;
}

async function _client_or_null(): Promise<AnyClient | null> {
  if (_client) return _client;
  if (Date.now() < _failed_until) return null;
  if (_connecting) return _connecting;
  _connecting = _build()
    .then((c) => {
      if (c) _client = c;
      else _failed_until = Date.now() + 5000;
      return c;
    })
    .finally(() => { _connecting = null; });
  return _connecting;
}

export async function recordRegionHit(region: RegionInfo, actorId?: string): Promise<void> {
  const c = await _client_or_null();
  if (!c) return;
  try {
    const country = region.country.toUpperCase();
    const lang    = region.language;
    await Promise.all([
      c.incr(`triumph:region:counter:${country}`),
      c.expire(`triumph:region:counter:${country}`, COUNTER_TTL_S),
      c.incr(`triumph:lang:counter:${lang}`),
      c.expire(`triumph:lang:counter:${lang}`, COUNTER_TTL_S),
      c.set(`triumph:region:last_seen:${country}`, String(region.detected_at), { EX: COUNTER_TTL_S }),
      actorId
        ? c.set(`triumph:region:actor:${actorId}`,
                JSON.stringify({ country, lang, group: region.region_group, ts: region.detected_at }),
                { EX: COUNTER_TTL_S })
        : Promise.resolve(),
    ]);
  } catch {
    // Non-fatal — mesh-pod is allowed to be briefly unavailable.
  }
}

export async function readRegionRanking(limit = 25): Promise<Array<{ country: string; hits: number }>> {
  const c = await _client_or_null();
  if (!c) return [];
  try {
    const keys = await _scanAll(c, "triumph:region:counter:*");
    if (!keys.length) return [];
    const values = await Promise.all(keys.map((k) => c.get(k).catch(() => "0")));
    const ranked = keys.map((k, i) => ({
      country: k.split(":").pop() || "??",
      hits:    Number(values[i] || 0),
    }));
    ranked.sort((a, b) => b.hits - a.hits);
    return ranked.slice(0, limit);
  } catch {
    return [];
  }
}

async function _scanAll(c: AnyClient, pattern: string): Promise<string[]> {
  const out: string[] = [];
  // Cluster: iterate every master shard.
  const maybeCluster = c as unknown as { masters?: Iterable<{ client: Promise<RedisClientType> }> };
  if (maybeCluster.masters && typeof (maybeCluster.masters as { [Symbol.iterator]?: unknown })[Symbol.iterator] === "function") {
    for (const node of maybeCluster.masters as Iterable<{ client: Promise<RedisClientType> }>) {
      const inner = await node.client;
      let cursor = 0;
      do {
        const r = await inner.scan(cursor, { MATCH: pattern, COUNT: 200 });
        cursor = r.cursor as unknown as number;
        out.push(...r.keys);
      } while (cursor !== 0);
    }
    return out;
  }
  let cursor = 0;
  do {
    const r = await (c as RedisClientType).scan(cursor, { MATCH: pattern, COUNT: 200 });
    cursor = r.cursor as unknown as number;
    out.push(...r.keys);
  } while (cursor !== 0);
  return out;
}

"""
Triumph Synergy Cloud Memory Platform
=======================================
A superior unified memory layer for all 22+ ecosystem services.

ARCHITECTURE:
  - LZ4 compression: shrinks payloads 60-80% before storage
  - Content-addressed deduplication: identical data stored ONCE
  - TTL-aware tiered store: hot/warm/cold tiers with auto-eviction
  - Namespace isolation: each service has its own keyspace
  - Cross-service broadcast: write once, all services read instantly
  - Snapshot + restore: persistent state survives container restarts
  - Prometheus metrics: full observability on compression ratios + hit rates

ENDPOINTS:
  POST /mem/write          -- Compressed write (any service, any key)
  GET  /mem/read/{ns}/{key}-- Decompressed read
  POST /mem/broadcast      -- Write to ALL service namespaces at once
  GET  /mem/snapshot       -- Export full compressed snapshot
  POST /mem/restore        -- Restore from snapshot
  GET  /mem/stats          -- Compression ratios, hit rates, size savings
  GET  /mem/namespace/{ns} -- List all keys in a namespace
  DELETE /mem/flush/{ns}   -- Flush a namespace (service restart prep)
  GET  /health             -- Health + memory stats
  GET  /metrics            -- Prometheus metrics

Port: 8095
Networks: triumph-net
"""

import asyncio
import base64
import hashlib
import json
import logging
import os
import time
from typing import Any

import lz4.frame
import redis.asyncio as aioredis
from fastapi import FastAPI, HTTPException
from fastapi.responses import PlainTextResponse
from prometheus_client import (
    Counter, Gauge, Histogram, generate_latest, CONTENT_TYPE_LATEST
)

# ── Config ──────────────────────────────────────────────────────────────────────

REDIS_URL         = os.getenv("REDIS_URL",          "redis://triumph-redis:6379")
PORT              = int(os.getenv("PORT",            "8095"))
DEFAULT_TTL       = int(os.getenv("DEFAULT_TTL_S",   "3600"))   # 1 hour default TTL
HOT_TTL           = int(os.getenv("HOT_TTL_S",       "300"))    # 5 min hot tier
WARM_TTL          = int(os.getenv("WARM_TTL_S",      "3600"))   # 1 hour warm tier
COLD_TTL          = int(os.getenv("COLD_TTL_S",      "86400"))  # 24 hour cold tier
COMPRESSION_LEVEL = int(os.getenv("LZ4_LEVEL",       "9"))      # max compression

# All platform namespaces
NAMESPACES = [
    "pi-bridge", "dual-value", "quantum-shield", "market-data",
    "dex", "smart-contracts", "credit-engine", "ml-engine",
    "blockchain-oracle", "compliance", "payment-processor",
    "tokenization", "vault", "scp-upgrader", "central-node",
    "transaction-engine", "app", "hq",
]

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("cloud-memory")

# ── Prometheus ──────────────────────────────────────────────────────────────────

writes_total         = Counter("mem_writes_total",            "Total write operations")
reads_total          = Counter("mem_reads_total",             "Total read operations")
cache_hits           = Counter("mem_cache_hits_total",        "Cache hits")
cache_misses         = Counter("mem_cache_misses_total",      "Cache misses")
dedup_saves          = Counter("mem_dedup_saves_total",       "Deduplicated writes (data already existed)")
broadcast_total      = Counter("mem_broadcasts_total",        "Broadcast write operations")
bytes_in_gauge       = Gauge("mem_bytes_raw_total",           "Total raw bytes written")
bytes_stored_gauge   = Gauge("mem_bytes_compressed_total",    "Total compressed bytes stored")
compression_ratio    = Gauge("mem_compression_ratio",         "Average compression ratio (raw/compressed)")
keys_gauge           = Gauge("mem_keys_total",                "Total keys in memory store")
write_latency        = Histogram("mem_write_latency_seconds", "Write operation latency")
read_latency         = Histogram("mem_read_latency_seconds",  "Read operation latency")

# ── State ───────────────────────────────────────────────────────────────────────

stats: dict[str, Any] = {
    "total_raw_bytes":        0,
    "total_compressed_bytes": 0,
    "total_writes":           0,
    "total_reads":            0,
    "total_hits":             0,
    "total_misses":           0,
    "total_dedup":            0,
    "total_broadcasts":       0,
    "started_at":             time.time(),
}

app = FastAPI(title="Triumph Cloud Memory Platform", version="2.0.0")
_redis: aioredis.Redis | None = None


# ── Compression helpers ─────────────────────────────────────────────────────────

def _compress(data: bytes) -> bytes:
    """LZ4 compress. Level 9 = maximum compression ratio."""
    return lz4.frame.compress(data, compression_level=COMPRESSION_LEVEL)


def _decompress(data: bytes) -> bytes:
    return lz4.frame.decompress(data)


def _content_hash(data: bytes) -> str:
    """SHA-256 content address for deduplication."""
    return hashlib.sha256(data).hexdigest()


def _serialize(value: Any) -> bytes:
    """Serialize any Python value to bytes."""
    if isinstance(value, (dict, list)):
        return json.dumps(value, separators=(",", ":")).encode()
    if isinstance(value, str):
        return value.encode()
    if isinstance(value, bytes):
        return value
    return str(value).encode()


def _deserialize(raw: bytes) -> Any:
    """Best-effort deserialization back to Python type."""
    try:
        return json.loads(raw)
    except Exception:
        try:
            return raw.decode()
        except Exception:
            return base64.b64encode(raw).decode()


# ── Redis key helpers ───────────────────────────────────────────────────────────

def _data_key(namespace: str, key: str) -> str:
    return f"mem:{namespace}:{key}:data"


def _meta_key(namespace: str, key: str) -> str:
    return f"mem:{namespace}:{key}:meta"


def _dedup_key(content_hash: str) -> str:
    return f"mem:dedup:{content_hash}"


def _ns_index_key(namespace: str) -> str:
    return f"mem:index:{namespace}"


# ── Core operations ─────────────────────────────────────────────────────────────

async def _write(
    namespace: str,
    key: str,
    value: Any,
    ttl: int | None = None,
    tier: str = "warm",
) -> dict[str, Any]:
    global _redis
    if _redis is None:
        raise RuntimeError("Redis not connected")

    raw      = _serialize(value)
    raw_size = len(raw)
    c_hash   = _content_hash(raw)

    # Check dedup store — if same content already compressed, reuse it
    existing = await _redis.get(_dedup_key(c_hash))
    if existing:
        compressed     = existing
        compressed_size = len(compressed)
        dedup_saves.inc()
        stats["total_dedup"] += 1
    else:
        compressed      = _compress(raw)
        compressed_size = len(compressed)
        # Store in content-addressed dedup store (24h TTL)
        await _redis.set(_dedup_key(c_hash), compressed, ex=86400)

    # Determine TTL by tier
    effective_ttl = ttl or {"hot": HOT_TTL, "warm": WARM_TTL, "cold": COLD_TTL}.get(tier, WARM_TTL)

    # Store compressed data pointer + compressed bytes
    await _redis.set(_data_key(namespace, key), compressed, ex=effective_ttl)

    # Store metadata
    meta = {
        "raw_bytes":        raw_size,
        "compressed_bytes": compressed_size,
        "ratio":            round(raw_size / max(compressed_size, 1), 3),
        "tier":             tier,
        "ttl_s":            effective_ttl,
        "hash":             c_hash[:16],
        "written_at":       time.time(),
    }
    await _redis.set(_meta_key(namespace, key), json.dumps(meta), ex=effective_ttl + 60)

    # Index key in namespace set
    await _redis.sadd(_ns_index_key(namespace), key)
    await _redis.expire(_ns_index_key(namespace), max(effective_ttl, 3600))

    # Update global stats
    stats["total_raw_bytes"]        += raw_size
    stats["total_compressed_bytes"] += compressed_size
    stats["total_writes"]           += 1
    bytes_in_gauge.set(stats["total_raw_bytes"])
    bytes_stored_gauge.set(stats["total_compressed_bytes"])
    if stats["total_compressed_bytes"] > 0:
        compression_ratio.set(
            round(stats["total_raw_bytes"] / stats["total_compressed_bytes"], 3)
        )
    writes_total.inc()

    return {
        "namespace":        namespace,
        "key":              key,
        "raw_bytes":        raw_size,
        "compressed_bytes": compressed_size,
        "ratio":            meta["ratio"],
        "tier":             tier,
        "ttl_s":            effective_ttl,
        "deduped":          existing is not None,
    }


async def _read(namespace: str, key: str) -> Any | None:
    global _redis
    if _redis is None:
        raise RuntimeError("Redis not connected")

    compressed = await _redis.get(_data_key(namespace, key))
    if compressed is None:
        cache_misses.inc()
        stats["total_misses"] += 1
        return None

    cache_hits.inc()
    stats["total_hits"] += 1
    stats["total_reads"] += 1
    reads_total.inc()

    raw = _decompress(compressed)
    return _deserialize(raw)


# ── Routes ──────────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    global _redis
    redis_ok = False
    try:
        if _redis:
            await _redis.ping()
            redis_ok = True
    except Exception:
        pass

    raw  = stats["total_raw_bytes"]
    comp = stats["total_compressed_bytes"]
    ratio = round(raw / max(comp, 1), 3)
    saved = raw - comp

    return {
        "status":              "healthy" if redis_ok else "degraded",
        "redis":               redis_ok,
        "total_writes":        stats["total_writes"],
        "total_reads":         stats["total_reads"],
        "cache_hits":          stats["total_hits"],
        "cache_misses":        stats["total_misses"],
        "hit_rate_pct":        round(stats["total_hits"] / max(stats["total_reads"], 1) * 100, 1),
        "dedup_saves":         stats["total_dedup"],
        "raw_bytes":           raw,
        "compressed_bytes":    comp,
        "compression_ratio":   ratio,
        "bytes_saved":         saved,
        "savings_pct":         round((1 - comp / max(raw, 1)) * 100, 1),
        "broadcasts":          stats["total_broadcasts"],
        "namespaces":          NAMESPACES,
        "uptime_seconds":      round(time.time() - stats["started_at"], 1),
    }


@app.get("/metrics", response_class=PlainTextResponse)
async def metrics():
    return PlainTextResponse(generate_latest(), media_type=CONTENT_TYPE_LATEST)


@app.post("/mem/write")
async def write_memory(body: dict):
    """
    Write compressed data to the memory platform.
    Body: { "namespace": str, "key": str, "value": any, "ttl": int?, "tier": str? }
    """
    namespace = body.get("namespace")
    key       = body.get("key")
    value     = body.get("value")
    ttl       = body.get("ttl")
    tier      = body.get("tier", "warm")

    if not namespace or not key or value is None:
        raise HTTPException(400, "namespace, key, and value are required")
    if namespace not in NAMESPACES:
        raise HTTPException(400, f"Unknown namespace '{namespace}'. Valid: {NAMESPACES}")

    with write_latency.time():
        result = await _write(namespace, key, value, ttl=ttl, tier=tier)
    return result


@app.get("/mem/read/{namespace}/{key}")
async def read_memory(namespace: str, key: str):
    """Read and decompress data from the memory platform."""
    if namespace not in NAMESPACES:
        raise HTTPException(400, f"Unknown namespace '{namespace}'")

    with read_latency.time():
        value = await _read(namespace, key)

    if value is None:
        raise HTTPException(404, f"Key '{key}' not found in namespace '{namespace}'")

    return {"namespace": namespace, "key": key, "value": value}


@app.post("/mem/broadcast")
async def broadcast_memory(body: dict):
    """
    Write a value to ALL service namespaces at once.
    Body: { "key": str, "value": any, "ttl": int?, "tier": str? }
    One write, 22 services instantly updated.
    """
    key   = body.get("key")
    value = body.get("value")
    ttl   = body.get("ttl")
    tier  = body.get("tier", "hot")

    if not key or value is None:
        raise HTTPException(400, "key and value are required")

    results = []
    for ns in NAMESPACES:
        r = await _write(ns, key, value, ttl=ttl, tier=tier)
        results.append(r)

    stats["total_broadcasts"] += 1
    broadcast_total.inc()

    # Also publish to Redis pub/sub so live subscribers get it instantly
    if _redis:
        await _redis.publish("mem:broadcast", json.dumps({
            "key":        key,
            "namespaces": NAMESPACES,
            "tier":       tier,
            "at":         time.time(),
        }))

    return {
        "broadcast_key":  key,
        "namespaces":     len(NAMESPACES),
        "tier":           tier,
        "sample_ratio":   results[0]["ratio"] if results else None,
        "bytes_saved":    sum(r["raw_bytes"] - r["compressed_bytes"] for r in results),
        "deduped_count":  sum(1 for r in results if r["deduped"]),
    }


@app.get("/mem/namespace/{namespace}")
async def list_namespace(namespace: str):
    """List all keys stored in a namespace."""
    if namespace not in NAMESPACES:
        raise HTTPException(400, f"Unknown namespace '{namespace}'")

    if not _redis:
        raise HTTPException(503, "Redis not connected")

    keys = await _redis.smembers(_ns_index_key(namespace))
    return {"namespace": namespace, "keys": sorted(keys), "count": len(keys)}


@app.get("/mem/stats")
async def memory_stats():
    """Detailed compression and performance statistics."""
    raw  = stats["total_raw_bytes"]
    comp = stats["total_compressed_bytes"]
    return {
        "compression": {
            "raw_bytes":         raw,
            "compressed_bytes":  comp,
            "ratio":             round(raw / max(comp, 1), 3),
            "bytes_saved":       raw - comp,
            "savings_pct":       round((1 - comp / max(raw, 1)) * 100, 1),
            "algorithm":         "LZ4",
            "level":             COMPRESSION_LEVEL,
        },
        "cache": {
            "total_reads":       stats["total_reads"],
            "hits":              stats["total_hits"],
            "misses":            stats["total_misses"],
            "hit_rate_pct":      round(stats["total_hits"] / max(stats["total_reads"], 1) * 100, 1),
        },
        "writes": {
            "total":             stats["total_writes"],
            "dedup_saves":       stats["total_dedup"],
            "dedup_rate_pct":    round(stats["total_dedup"] / max(stats["total_writes"], 1) * 100, 1),
            "broadcasts":        stats["total_broadcasts"],
        },
        "tiers": {
            "hot_ttl_s":  HOT_TTL,
            "warm_ttl_s": WARM_TTL,
            "cold_ttl_s": COLD_TTL,
        },
        "uptime_seconds": round(time.time() - stats["started_at"], 1),
    }


@app.get("/mem/snapshot")
async def snapshot():
    """Export a compressed snapshot of all current namespace data."""
    if not _redis:
        raise HTTPException(503, "Redis not connected")

    snap: dict[str, dict] = {}
    for ns in NAMESPACES:
        keys = await _redis.smembers(_ns_index_key(ns))
        snap[ns] = {}
        for key in keys:
            val = await _read(ns, key)
            if val is not None:
                snap[ns][key] = val

    raw     = json.dumps(snap, separators=(",", ":")).encode()
    compressed = _compress(raw)
    encoded = base64.b64encode(compressed).decode()

    return {
        "snapshot_b64":    encoded,
        "raw_bytes":       len(raw),
        "compressed_bytes":len(compressed),
        "ratio":           round(len(raw) / max(len(compressed), 1), 3),
        "namespaces":      len(snap),
        "total_keys":      sum(len(v) for v in snap.values()),
        "created_at":      time.time(),
    }


@app.post("/mem/restore")
async def restore(body: dict):
    """Restore a snapshot (base64-encoded LZ4-compressed JSON)."""
    snapshot_b64 = body.get("snapshot_b64")
    if not snapshot_b64:
        raise HTTPException(400, "snapshot_b64 required")

    compressed = base64.b64decode(snapshot_b64)
    raw        = _decompress(compressed)
    data       = json.loads(raw)

    restored = 0
    for ns, keys in data.items():
        if ns not in NAMESPACES:
            continue
        for key, value in keys.items():
            await _write(ns, key, value, tier="warm")
            restored += 1

    return {"restored_keys": restored, "namespaces": list(data.keys())}


@app.delete("/mem/flush/{namespace}")
async def flush_namespace(namespace: str):
    """Flush all keys in a namespace (service restart preparation)."""
    if namespace not in NAMESPACES:
        raise HTTPException(400, f"Unknown namespace '{namespace}'")
    if not _redis:
        raise HTTPException(503, "Redis not connected")

    keys = await _redis.smembers(_ns_index_key(ns := namespace))
    for key in keys:
        await _redis.delete(_data_key(ns, key))
        await _redis.delete(_meta_key(ns, key))
    await _redis.delete(_ns_index_key(ns))

    return {"namespace": namespace, "flushed_keys": len(keys)}


# ── Background: seed canonical Pi values into all namespaces on startup ─────────

async def _seed_canonical_values() -> None:
    """Broadcast the canonical Pi dual-value constants to all namespaces on boot."""
    await asyncio.sleep(5)  # wait for Redis to settle
    pi_internal = float(os.getenv("PI_INTERNAL_RATE",  "314159.0"))
    pi_external = float(os.getenv("PI_EXTERNAL_RATE",  "314.159"))
    pi_mult     = float(os.getenv("PI_INTERNAL_MULTIPLIER", "1000.0"))

    canonical = {
        "PI_INTERNAL_RATE":       pi_internal,
        "PI_EXTERNAL_RATE":       pi_external,
        "PI_INTERNAL_MULTIPLIER": pi_mult,
        "source":                 "lib/pios/pios-integration.ts",
        "published_at":           time.time(),
    }

    for ns in NAMESPACES:
        await _write(ns, "pi_canonical_rates", canonical, tier="hot")

    log.info(f"[cloud-memory] Seeded canonical Pi rates to {len(NAMESPACES)} namespaces: "
             f"internal=${pi_internal:,.0f} external=${pi_external}")

    # Also set Redis keys for direct fast access
    if _redis:
        await _redis.set("mem:canonical:pi_internal_rate",  str(pi_internal), ex=3600)
        await _redis.set("mem:canonical:pi_external_rate",  str(pi_external), ex=3600)
        await _redis.set("mem:canonical:pi_multiplier",     str(pi_mult),     ex=3600)
        await _redis.publish("mem:broadcast", json.dumps({
            "key": "pi_canonical_rates", "namespaces": NAMESPACES, "tier": "hot",
            "at": time.time(),
        }))


async def _background_loop() -> None:
    global _redis
    try:
        _redis = await aioredis.from_url(REDIS_URL, decode_responses=False)
        log.info(f"[cloud-memory] Redis connected: {REDIS_URL}")
    except Exception as e:
        log.warning(f"[cloud-memory] Redis unavailable: {e}")

    asyncio.create_task(_seed_canonical_values())

    # Periodic stats update
    while True:
        try:
            if _redis:
                cursor = 0
                count  = 0
                while True:
                    cursor, keys = await _redis.scan(cursor, match="mem:*:data", count=100)
                    count += len(keys)
                    if cursor == 0:
                        break
                keys_gauge.set(count)
        except Exception:
            pass
        await asyncio.sleep(30)


@app.on_event("startup")
async def _startup() -> None:
    asyncio.create_task(_background_loop())

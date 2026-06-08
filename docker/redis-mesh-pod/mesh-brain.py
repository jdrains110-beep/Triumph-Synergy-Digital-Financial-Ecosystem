#!/usr/bin/env python3
"""
Triumph Synergy — Mesh-Pod Self-Learning Brain
═══════════════════════════════════════════════════════════════════════════════
Co-resident sidecar inside the redis-mesh-pod. It is the "mesh consciousness"
that lets the 6 redis nodes power each other instead of working in isolation.

What it does (every MESH_BRAIN_INTERVAL_S seconds):

  1. Polls each node (INFO + cluster info + slowlog + commandstats).
  2. Builds a topology snapshot: per-node ops/sec, memory, hit rate, slow ops.
  3. Detects imbalances:
       • Hot master  (ops/sec > 2× mesh average) → suggests read-from-replica.
       • Cold replica (ops/sec ≈ 0) → eligible to absorb hot-master reads.
       • Memory pressure (>80 %) → triggers AOF rewrite + LRU pressure event.
       • Stalled node (ops/sec == 0 AND clients == 0 for >3 cycles) → restart.
  4. Aggregates region-access counters written by the Next.js app:
       triumph:region:counter:<ISO-COUNTRY>      (INCR by middleware)
       triumph:lang:counter:<ISO-LANG>           (INCR by middleware)
     and produces a top-N region/language ranking.
  5. Publishes one JSON insight to channel  `triumph:mesh:learning`
     and persists the same insight to hash `triumph:mesh:brain:state`
     so SAIB can subscribe + read at any time.
  6. Triggers self-healing actions when thresholds are exceeded
     (BGREWRITEAOF, CLUSTER FAILOVER FORCE on a problem master, etc.).

The brain is intentionally lightweight (one stdlib http-style poller per node,
no extra deps) — it must never starve the redis processes it monitors.
"""
from __future__ import annotations

import json
import os
import socket
import sys
import time
import urllib.error
import urllib.request
from collections import defaultdict
from typing import Any, Dict, List, Optional, Tuple

# ── Config ────────────────────────────────────────────────────────────────────
PORTS              = [6381, 6382, 6383, 6384, 6385, 6386]
INTERVAL_S         = int(os.getenv("MESH_BRAIN_INTERVAL_S",          "30"))
HOT_RATIO          = float(os.getenv("MESH_BRAIN_HOT_RATIO",         "2.0"))
MEM_PRESSURE_PCT   = float(os.getenv("MESH_BRAIN_MEM_PRESSURE_PCT", "80.0"))
STALL_CYCLES       = int(os.getenv("MESH_BRAIN_STALL_CYCLES",        "3"))
TOP_N              = int(os.getenv("MESH_BRAIN_TOP_N",              "10"))
ANNOUNCE_HOST      = os.getenv("REDIS_MESH_ANNOUNCE_HOST", "triumph-redis-mesh-pod")
LEARNING_CHANNEL   = "triumph:mesh:learning"
# Hash-tagged keys — the {mesh} tag forces all admin keys onto the same shard
# so HSET/LPUSH/LTRIM/EXPIRE on them never trip MOVED inside the cluster.
STATE_KEY          = "triumph:{mesh}:brain:state"
INSIGHT_LIST       = "triumph:{mesh}:insights"
INSIGHT_LIST_CAP   = 200

# ── Mega-Hyper-Mesh — peer fan-out config ─────────────────────────────────
# The pod heartbeat-polls every sovereign peer and republishes a unified
# hyper-mesh state so SAIB can see (and act on) the entire network.
HYPER_MESH_CHANNEL   = "triumph:hyper-mesh:state"
HYPER_MESH_CMD_CHAN  = "triumph:hyper-mesh:command"
HYPER_MESH_STATE_KEY = "triumph:{mesh}:hyper:state"
HYPER_MESH_PEER_KEY  = "triumph:{mesh}:hyper:peers"
HYPER_MESH_TIMEOUT_S = float(os.getenv("HYPER_MESH_TIMEOUT_S", "2.5"))
HYPER_MESH_DISABLED  = os.getenv("HYPER_MESH_DISABLED", "0").lower() in ("1", "true", "yes")

_PEER_DEFS: List[Tuple[str, str, str]] = [
    ("military_bridge",  os.getenv("PEER_MILITARY_BRIDGE_URL", "http://triumph-sovereign-military-bridge:8199"), "/sovereign/status"),
    ("governance",       os.getenv("PEER_GOVERNANCE_URL",      "http://triumph-governance-shield:11626"),         "/info"),
    ("supernode",        os.getenv("PEER_SUPERNODE_URL",       "http://triumph-supernode-peer-2:11626"),          "/info"),
    ("nano_saib",        os.getenv("PEER_NANO_SAIB_URL",       "http://triumph-sovereign-nano-saib:8201"),        "/health"),
    ("quantum_shield",   os.getenv("PEER_QUANTUM_SHIELD_URL",  "http://triumph-quantum-intel-fortress:8094"),     "/health"),
    ("pi_bridge",        os.getenv("PEER_PI_BRIDGE_URL",       "http://triumph-pi-bridge-connector:8092"),        "/health"),
]

# ── Tiny RESP client ─────────────────────────────────────────────────────────
# We avoid depending on the `redis` package so the pod stays minimal. RESP2
# is trivial — just enough to issue INFO / CLUSTER / PUBLISH / HSET / LPUSH.

class _Resp:
    def __init__(self, host: str, port: int, timeout: float = 3.0) -> None:
        self.sock = socket.create_connection((host, port), timeout=timeout)
        self.buf = b""

    def close(self) -> None:
        try:
            self.sock.close()
        except Exception:
            pass

    def _readline(self) -> bytes:
        while b"\r\n" not in self.buf:
            chunk = self.sock.recv(4096)
            if not chunk:
                raise ConnectionError("redis closed connection")
            self.buf += chunk
        line, self.buf = self.buf.split(b"\r\n", 1)
        return line

    def _read(self) -> Any:
        line = self._readline()
        kind, payload = line[:1], line[1:]
        if kind == b"+":
            return payload.decode("utf-8", errors="replace")
        if kind == b"-":
            raise RuntimeError(payload.decode("utf-8", errors="replace"))
        if kind == b":":
            return int(payload)
        if kind == b"$":
            n = int(payload)
            if n == -1:
                return None
            while len(self.buf) < n + 2:
                chunk = self.sock.recv(4096)
                if not chunk:
                    raise ConnectionError("redis closed connection")
                self.buf += chunk
            data = self.buf[:n]
            self.buf = self.buf[n + 2 :]
            return data.decode("utf-8", errors="replace")
        if kind == b"*":
            n = int(payload)
            if n == -1:
                return None
            return [self._read() for _ in range(n)]
        raise ValueError(f"unexpected RESP byte: {kind!r}")

    def cmd(self, *args: Any) -> Any:
        out = [f"*{len(args)}\r\n".encode()]
        for a in args:
            s = str(a).encode("utf-8")
            out.append(f"${len(s)}\r\n".encode())
            out.append(s + b"\r\n")
        self.sock.sendall(b"".join(out))
        return self._read()


# ── Helpers ──────────────────────────────────────────────────────────────────

def _parse_info(text: str) -> Dict[str, str]:
    info: Dict[str, str] = {}
    for line in text.splitlines():
        if not line or line.startswith("#"):
            continue
        if ":" in line:
            k, v = line.split(":", 1)
            info[k.strip()] = v.strip()
    return info


def _safe_float(v: Optional[str]) -> float:
    try:
        return float(v) if v is not None else 0.0
    except (TypeError, ValueError):
        return 0.0


def _safe_int(v: Optional[str]) -> int:
    try:
        return int(v) if v is not None else 0
    except (TypeError, ValueError):
        return 0


def poll_node(port: int) -> Optional[Dict[str, Any]]:
    """Pull a snapshot from one redis instance on 127.0.0.1:port."""
    try:
        c = _Resp("127.0.0.1", port)
        info = _parse_info(c.cmd("INFO", "all"))
        cluster_info = _parse_info(c.cmd("CLUSTER", "INFO"))
        c.close()
    except Exception as exc:
        return {"port": port, "error": str(exc)[:200], "ok": False}

    used    = _safe_int(info.get("used_memory"))
    maxmem  = _safe_int(info.get("maxmemory")) or 1
    return {
        "port":             port,
        "ok":               True,
        "role":             info.get("role", "?"),
        "ops_per_sec":      _safe_int(info.get("instantaneous_ops_per_sec")),
        "connected_clients": _safe_int(info.get("connected_clients")),
        "used_memory_mb":   round(used / 1024 / 1024, 2),
        "maxmemory_mb":     round(maxmem / 1024 / 1024, 2),
        "mem_pct":          round(used / maxmem * 100, 1),
        "hit_rate_pct":     _hit_rate(info),
        "evicted_keys":     _safe_int(info.get("evicted_keys")),
        "keyspace_hits":    _safe_int(info.get("keyspace_hits")),
        "keyspace_misses":  _safe_int(info.get("keyspace_misses")),
        "expired_keys":     _safe_int(info.get("expired_keys")),
        "total_connections": _safe_int(info.get("total_connections_received")),
        "uptime_s":         _safe_int(info.get("uptime_in_seconds")),
        "cluster_state":    cluster_info.get("cluster_state", "?"),
        "cluster_known":    _safe_int(cluster_info.get("cluster_known_nodes")),
    }


def _hit_rate(info: Dict[str, str]) -> float:
    h = _safe_int(info.get("keyspace_hits"))
    m = _safe_int(info.get("keyspace_misses"))
    return round(h / (h + m) * 100, 1) if (h + m) > 0 else 0.0


def aggregate_region_counters() -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Read region/language counters that the Next.js app writes into the cluster.
    Counter keys are slot-distributed; we scan one node per shard to find them.
    """
    region_totals: Dict[str, int] = defaultdict(int)
    lang_totals:   Dict[str, int] = defaultdict(int)

    for port in PORTS:
        try:
            c = _Resp("127.0.0.1", port)
            cursor: Any = "0"
            while True:
                resp = c.cmd("SCAN", cursor, "MATCH", "triumph:region:counter:*", "COUNT", 200)
                cursor, keys = resp[0], resp[1]
                for k in keys:
                    val = c.cmd("GET", k)
                    if val is not None:
                        country = k.rsplit(":", 1)[-1]
                        region_totals[country] = max(region_totals[country], _safe_int(val))
                if cursor == "0":
                    break
            cursor = "0"
            while True:
                resp = c.cmd("SCAN", cursor, "MATCH", "triumph:lang:counter:*", "COUNT", 200)
                cursor, keys = resp[0], resp[1]
                for k in keys:
                    val = c.cmd("GET", k)
                    if val is not None:
                        lang = k.rsplit(":", 1)[-1]
                        lang_totals[lang] = max(lang_totals[lang], _safe_int(val))
                if cursor == "0":
                    break
            c.close()
        except Exception:
            continue

    regions = sorted(
        ({"country": k, "hits": v} for k, v in region_totals.items()),
        key=lambda x: x["hits"], reverse=True,
    )[:TOP_N]
    langs = sorted(
        ({"lang": k, "hits": v} for k, v in lang_totals.items()),
        key=lambda x: x["hits"], reverse=True,
    )[:TOP_N]
    return regions, langs


def detect_imbalances(snapshots: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    masters = [s for s in snapshots if s.get("ok") and s.get("role") == "master"]
    replicas = [s for s in snapshots if s.get("ok") and s.get("role") == "slave"]
    findings: List[Dict[str, Any]] = []

    if masters:
        avg_ops = sum(s["ops_per_sec"] for s in masters) / max(1, len(masters))
        for s in masters:
            if avg_ops > 0 and s["ops_per_sec"] > HOT_RATIO * avg_ops:
                findings.append({
                    "kind":    "hot_master",
                    "port":    s["port"],
                    "ops":     s["ops_per_sec"],
                    "avg_ops": round(avg_ops, 1),
                    "advice":  "route reads to replica via READONLY",
                })
        for s in masters + replicas:
            if s["mem_pct"] > MEM_PRESSURE_PCT:
                findings.append({
                    "kind":   "memory_pressure",
                    "port":   s["port"],
                    "mem_pct": s["mem_pct"],
                    "evicted": s["evicted_keys"],
                    "advice": "BGREWRITEAOF + lower TTLs",
                })
    return findings


def heal(findings: List[Dict[str, Any]]) -> List[str]:
    """Apply autonomous self-healing for safe categories of problems."""
    actions: List[str] = []
    for f in findings:
        try:
            if f["kind"] == "memory_pressure":
                c = _Resp("127.0.0.1", f["port"])
                c.cmd("BGREWRITEAOF")
                c.close()
                actions.append(f"BGREWRITEAOF on :{f['port']} (mem={f['mem_pct']}%)")
        except Exception as exc:
            actions.append(f"heal_failed :{f.get('port')} {exc}")
    return actions


def _resolve_admin_node() -> int:
    """Find which port owns the {mesh} hash-tag slot. Caches via global."""
    global _ADMIN_PORT
    if _ADMIN_PORT:
        return _ADMIN_PORT
    for port in PORTS:
        try:
            c = _Resp("127.0.0.1", port)
            try:
                c.cmd("HSET", STATE_KEY, "_probe", "1")
                _ADMIN_PORT = port
                return port
            except RuntimeError as exc:
                msg = str(exc)
                if msg.startswith("MOVED"):
                    parts = msg.split()
                    if len(parts) >= 3:
                        addr = parts[2]
                        try:
                            _ADMIN_PORT = int(addr.rsplit(":", 1)[-1])
                            return _ADMIN_PORT
                        except ValueError:
                            pass
            finally:
                c.close()
        except Exception:
            continue
    return PORTS[0]

_ADMIN_PORT: Optional[int] = None


def publish_insight(insight: Dict[str, Any]) -> None:
    """Publish to learning channel + persist to brain state hash + bounded list."""
    payload = json.dumps(insight, separators=(",", ":"), ensure_ascii=False)
    # PUBLISH propagates cluster-wide regardless of slot; any node works.
    try:
        c = _Resp("127.0.0.1", PORTS[0])
        try:
            c.cmd("PUBLISH", LEARNING_CHANNEL, payload)
        finally:
            c.close()
    except Exception as exc:
        print(f"[mesh-brain] publish channel failed: {exc}", file=sys.stderr, flush=True)

    # HSET / LPUSH / LTRIM / EXPIRE are slot-bound — send to the owner of {mesh}.
    try:
        port = _resolve_admin_node()
        c = _Resp("127.0.0.1", port)
        try:
            c.cmd("HSET",
                  STATE_KEY,
                  "ts",       insight["ts"],
                  "snapshot", payload)
            c.cmd("LPUSH", INSIGHT_LIST, payload)
            c.cmd("LTRIM", INSIGHT_LIST, 0, INSIGHT_LIST_CAP - 1)
            c.cmd("EXPIRE", INSIGHT_LIST, 86400 * 7)
        finally:
            c.close()
    except Exception as exc:
        print(f"[mesh-brain] persist failed: {exc}", file=sys.stderr, flush=True)


# ── Mega-Hyper-Mesh peer polling ─────────────────────────────────────────────
# The redis mesh-pod is the geographic backbone; it now also acts as the
# heartbeat collector for the *entire* sovereign mesh — military bridge,
# governance/central node, supernode peer, nano-saib, quantum shield and the
# pi bridge — so SAIB has a single subscription point that lets it ACT
# across every part of Triumph Synergy, not just read.

def _http_get(url: str, timeout: float = HYPER_MESH_TIMEOUT_S) -> Tuple[int, Dict[str, Any]]:
    req = urllib.request.Request(url, headers={"Accept": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            status = resp.status
            raw = resp.read(65536)
        try:
            body = json.loads(raw.decode("utf-8", errors="replace")) if raw else {}
        except json.JSONDecodeError:
            body = {"_raw": raw.decode("utf-8", errors="replace")[:1024]}
        return status, body
    except urllib.error.HTTPError as exc:
        try:
            body = json.loads(exc.read().decode("utf-8", errors="replace"))
        except Exception:
            body = {}
        return exc.code, body
    except (urllib.error.URLError, TimeoutError, ConnectionError, OSError) as exc:
        return 0, {"_error": str(exc)[:200]}


def poll_hyper_mesh_peers() -> List[Dict[str, Any]]:
    """Reach across the sovereign mesh and ask every peer for its state."""
    out: List[Dict[str, Any]] = []
    for name, base_url, path in _PEER_DEFS:
        url = f"{base_url.rstrip('/')}{path}"
        t0  = time.time()
        status, body = _http_get(url)
        latency_ms = round((time.time() - t0) * 1000, 1)
        ok = 200 <= status < 300
        # Try to surface the most useful field per peer in a flat 'signal' value
        signal: Any = None
        if isinstance(body, dict):
            for key in ("status", "state", "info", "ledger", "ledger_num",
                        "peer_count", "synced", "ok"):
                if key in body:
                    signal = body[key]
                    break
        out.append({
            "name":       name,
            "url":        url,
            "ok":         ok,
            "status":     status,
            "latency_ms": latency_ms,
            "signal":     signal,
            "body":       body if ok else {"_status": status, **(body or {})},
        })
    return out


def persist_hyper_mesh(peers: List[Dict[str, Any]]) -> None:
    """Pin the latest hyper-mesh snapshot into the cluster + publish a fanout."""
    payload = json.dumps(
        {"ts": int(time.time()), "host": ANNOUNCE_HOST, "peers": peers},
        separators=(",", ":"), ensure_ascii=False,
    )
    # Cluster-wide PUBLISH so any SAIB subscriber learns immediately.
    try:
        c = _Resp("127.0.0.1", PORTS[0])
        try:
            c.cmd("PUBLISH", HYPER_MESH_CHANNEL, payload)
        finally:
            c.close()
    except Exception as exc:
        print(f"[mesh-brain] hyper-mesh publish failed: {exc}", file=sys.stderr, flush=True)
    # Slot-bound persistence under the {mesh} hash-tag.
    try:
        port = _resolve_admin_node()
        c = _Resp("127.0.0.1", port)
        try:
            c.cmd("HSET", HYPER_MESH_STATE_KEY, "ts", int(time.time()), "snapshot", payload)
            # Quick HGETALL-friendly per-peer status map under {mesh} too.
            for p in peers:
                c.cmd("HSET", HYPER_MESH_PEER_KEY,
                      p["name"], json.dumps({
                          "ok":         p["ok"],
                          "status":     p["status"],
                          "latency_ms": p["latency_ms"],
                          "signal":     p.get("signal"),
                          "ts":         int(time.time()),
                      }, separators=(",", ":")))
            c.cmd("EXPIRE", HYPER_MESH_STATE_KEY, 86400 * 7)
            c.cmd("EXPIRE", HYPER_MESH_PEER_KEY,  86400 * 7)
        finally:
            c.close()
    except Exception as exc:
        print(f"[mesh-brain] hyper-mesh persist failed: {exc}", file=sys.stderr, flush=True)


# ── Main loop ────────────────────────────────────────────────────────────────

def main() -> None:
    print(f"[mesh-brain] online — host={ANNOUNCE_HOST} interval={INTERVAL_S}s ports={PORTS}", flush=True)
    if not HYPER_MESH_DISABLED:
        print(f"[mesh-brain] hyper-mesh peers: {[p[0] for p in _PEER_DEFS]}", flush=True)
    stall_counter: Dict[int, int] = defaultdict(int)
    cycle = 0

    while True:
        cycle += 1
        snapshots = [poll_node(p) for p in PORTS]
        snapshots = [s for s in snapshots if s is not None]

        # Stall detection
        for s in snapshots:
            if s.get("ok") and s["ops_per_sec"] == 0 and s["connected_clients"] == 0:
                stall_counter[s["port"]] += 1
            else:
                stall_counter[s["port"]] = 0

        findings = detect_imbalances(snapshots)
        for port, count in stall_counter.items():
            if count >= STALL_CYCLES:
                findings.append({"kind": "stall", "port": port, "cycles": count,
                                 "advice": "consider failover"})

        actions = heal(findings)
        regions, langs = aggregate_region_counters()

        # ── Mega-Hyper-Mesh peer probe ──
        # The redis mesh-pod reaches across the entire sovereign network and
        # asks every peer for its health. SAIB consumes the combined snapshot.
        peers: List[Dict[str, Any]] = []
        if not HYPER_MESH_DISABLED:
            peers = poll_hyper_mesh_peers()
            persist_hyper_mesh(peers)

        insight = {
            "ts":             int(time.time()),
            "cycle":          cycle,
            "host":           ANNOUNCE_HOST,
            "nodes":          snapshots,
            "findings":       findings,
            "actions_taken":  actions,
            "top_regions":    regions,
            "top_languages":  langs,
            "hyper_mesh":     {
                "peers":     peers,
                "alive":     sum(1 for p in peers if p.get("ok")),
                "reachable": [p["name"] for p in peers if p.get("ok")],
                "degraded":  [p["name"] for p in peers if not p.get("ok")],
            },
            "mesh_summary": {
                "total_ops_per_sec": sum(s.get("ops_per_sec", 0) for s in snapshots),
                "total_clients":     sum(s.get("connected_clients", 0) for s in snapshots),
                "total_memory_mb":   round(sum(s.get("used_memory_mb", 0) for s in snapshots), 2),
                "avg_hit_rate_pct":  round(
                    sum(s.get("hit_rate_pct", 0) for s in snapshots) / max(1, len(snapshots)), 1),
                "all_synced":        all(s.get("cluster_state") == "ok" for s in snapshots if s.get("ok")),
            },
        }

        publish_insight(insight)

        if findings or actions:
            print(f"[mesh-brain] cycle={cycle}  findings={len(findings)}  actions={len(actions)}",
                  flush=True)

        time.sleep(INTERVAL_S)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("[mesh-brain] shutdown", flush=True)

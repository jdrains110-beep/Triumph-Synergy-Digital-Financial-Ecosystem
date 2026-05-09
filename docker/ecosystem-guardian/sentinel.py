# Copyright (C) 2024-2026 Jeremiah Joel Drains, Founder & Superior Sovereign / Triumph Synergy. All rights reserved.
# License: PiOS
"""
Triumph Synergy Network Sentinel
═════════════════════════════════════════════════════════════════════════
Monitors external connectivity, detects network transitions (Starlink,
broadband, mobile hotspot), and keeps the Pi Node + ecosystem connected
across any connection type.

Features:
 ┌─ Multi-path connectivity probes (Pi Horizon, DNS, ICMP-like HTTP)
 ├─ ISP/connection-type detection (Starlink, broadband, cellular/CGNAT)
 ├─ Automatic service recovery on network transitions
 ├─ Latency + jitter tracking for connection quality scoring
 ├─ Pi Network peer reachability verification (port 31402)
 ├─ Encrypted tunnel readiness check (WireGuard / Cloudflare WARP)
 └─ Redis pub/sub event stream for ecosystem-wide awareness

Port: 9913
"""

# Copyright (C) 2024-2026 Jeremiah Joel Drains, Founder & Superior Sovereign / Triumph Synergy. All rights reserved.
# License: PiOS
# Copyright (C) 2024-2026 Jeremiah Joel Drains, Founder & Superior Sovereign / Triumph Synergy. All rights reserved.
# License: PiOS


import http.client
import json
import os
import socket
import statistics
import threading
import time
import urllib.request
from http.server import HTTPServer, BaseHTTPRequestHandler
from typing import Any

# ── Configuration ────────────────────────────────────────────────────

PROBE_INTERVAL = int(os.environ.get("PROBE_INTERVAL_S", "15"))
METRICS_PORT = int(os.environ.get("METRICS_PORT", "9913"))
REDIS_URL = os.environ.get("REDIS_URL", "redis://triumph-redis:6379")
PI_NODE_HOST = os.environ.get("PI_NODE_HOST", "triumph-pi-mainnet-node")
PI_NODE_PEER_PORT = int(os.environ.get("PI_NODE_PEER_PORT", "31402"))
PI_HORIZON_URL = os.environ.get("PI_HORIZON_URL", f"http://{PI_NODE_HOST}:8000")
PI_BRIDGE_URL = os.environ.get("PI_BRIDGE_URL", "http://triumph-pi-bridge-connector:8092")
ML_ENGINE_URL = os.environ.get("ML_ENGINE_URL", "http://triumph-ml-engine:8090")
SELF_HEAL_ML_ENABLED = os.environ.get("SELF_HEAL_ML_ENABLED", "true").lower() == "true"
ANOMALY_Z_THRESHOLD = float(os.environ.get("ANOMALY_Z_THRESHOLD", "2.5"))
ANOMALY_STREAK_THRESHOLD = int(os.environ.get("ANOMALY_STREAK_THRESHOLD", "3"))
CONTROL_PLANE_REQUIRE_PQ_READY = os.environ.get("CONTROL_PLANE_REQUIRE_PQ_READY", "true").lower() == "true"
QUANTUM_SHIELD_URL = os.environ.get("QUANTUM_SHIELD_URL", "http://triumph-quantum-shield:8094").rstrip("/")
PQ_CHECK_INTERVAL_S = int(os.environ.get("PQ_CHECK_INTERVAL_S", "30"))

# External probes — diverse endpoints to detect real connectivity
EXTERNAL_PROBES = [
    ("pi_mainnet", "https://api.mainnet.minepi.com/"),
    ("dns_google", "https://dns.google/resolve?name=minepi.com&type=A"),
    ("cloudflare", "https://1.1.1.1/cdn-cgi/trace"),
]

# Known ISP/connection signatures
STARLINK_ASNS = {"AS14593", "AS394164"}  # SpaceX Starlink ASNs
CGNAT_PREFIXES = ["100.64.", "10.", "172.16.", "172.17.", "172.18.", "172.19.",
                  "172.20.", "172.21.", "172.22.", "172.23.", "172.24.", "172.25.",
                  "172.26.", "172.27.", "172.28.", "172.29.", "172.30.", "172.31.",
                  "192.168."]

# ── State ────────────────────────────────────────────────────────────

state: dict[str, Any] = {
    "started_at": time.time(),
    "probe_count": 0,
    "connection": {
        "type": "unknown",          # starlink | broadband | cellular | offline
        "public_ip": None,
        "is_cgnat": None,           # True = no inbound peers possible
        "asn": None,
        "isp": None,
        "country": None,
    },
    "quality": {
        "latency_ms": 0,
        "jitter_ms": 0,
        "packet_loss_pct": 0,
        "score": 0,                 # 0-100
        "samples": [],              # last 20 latency samples
    },
    "probes": {},                   # per-probe results
    "internal": {
        "pi_node_reachable": False,
        "pi_bridge_reachable": False,
        "pi_horizon_reachable": False,
        "redis_reachable": False,
    },
    "transitions": [],              # last 10 network transitions
    "last_transition_at": 0,
    "services_restarted": 0,
    "last_error": None,
    "ml": {
        "enabled": SELF_HEAL_ML_ENABLED,
        "anomaly_score": 0.0,
        "anomaly_streak": 0,
        "last_action": "none",
        "baselines": {},
    },
}

lock = threading.Lock()
redis_client = None
pq_state = {"ok": False, "checked_at": 0.0}


def _prometheus_text(snapshot: dict[str, Any]) -> str:
    """Render sentinel state into Prometheus 0.0.4 text format."""
    conn = snapshot.get("connection", {})
    q = snapshot.get("quality", {})
    ml = snapshot.get("ml", {})
    transitions = snapshot.get("transitions", [])

    lines = [
        "# HELP triumph_sentinel_probe_count_total Number of probe cycles executed",
        "# TYPE triumph_sentinel_probe_count_total counter",
        f"triumph_sentinel_probe_count_total {snapshot.get('probe_count', 0)}",
        "# HELP triumph_sentinel_services_restarted_total Services restarted by sentinel",
        "# TYPE triumph_sentinel_services_restarted_total counter",
        f"triumph_sentinel_services_restarted_total {snapshot.get('services_restarted', 0)}",
        "# HELP triumph_sentinel_network_transitions_total Detected network transitions",
        "# TYPE triumph_sentinel_network_transitions_total counter",
        f"triumph_sentinel_network_transitions_total {len(transitions)}",
        "# HELP triumph_sentinel_quality_score Current network quality score",
        "# TYPE triumph_sentinel_quality_score gauge",
        f"triumph_sentinel_quality_score {q.get('score', 0)}",
        "# HELP triumph_sentinel_latency_ms Current average latency in milliseconds",
        "# TYPE triumph_sentinel_latency_ms gauge",
        f"triumph_sentinel_latency_ms {q.get('latency_ms', 0)}",
        "# HELP triumph_sentinel_jitter_ms Current jitter in milliseconds",
        "# TYPE triumph_sentinel_jitter_ms gauge",
        f"triumph_sentinel_jitter_ms {q.get('jitter_ms', 0)}",
        "# HELP triumph_sentinel_ml_anomaly_score Current ML anomaly score",
        "# TYPE triumph_sentinel_ml_anomaly_score gauge",
        f"triumph_sentinel_ml_anomaly_score {ml.get('anomaly_score', 0)}",
        "# HELP triumph_sentinel_ml_anomaly_streak Current ML anomaly streak",
        "# TYPE triumph_sentinel_ml_anomaly_streak gauge",
        f"triumph_sentinel_ml_anomaly_streak {ml.get('anomaly_streak', 0)}",
        "# HELP triumph_sentinel_ml_enabled ML self-healing enabled (1 enabled, 0 disabled)",
        "# TYPE triumph_sentinel_ml_enabled gauge",
        f"triumph_sentinel_ml_enabled {1 if ml.get('enabled') else 0}",
        "# HELP triumph_sentinel_pq_ready PQ control-plane readiness (1 ready, 0 not ready)",
        "# TYPE triumph_sentinel_pq_ready gauge",
        f"triumph_sentinel_pq_ready {1 if ml.get('pq_ready') else 0}",
    ]

    current_type = conn.get("type", "unknown")
    for t in ["starlink", "broadband", "cellular", "cgnat_broadband", "satellite", "offline", "unknown"]:
        lines.append(
            f'triumph_sentinel_connection_type{{type="{t}"}} {1 if current_type == t else 0}'
        )

    return "\n".join(lines) + "\n"


def _pq_ready(timeout_s: float = 4.0) -> bool:
    now = time.time()
    if now - pq_state["checked_at"] < PQ_CHECK_INTERVAL_S:
        return pq_state["ok"]
    pq_state["checked_at"] = now
    try:
        req = urllib.request.Request(f"{QUANTUM_SHIELD_URL}/health", method="GET")
        with urllib.request.urlopen(req, timeout=timeout_s) as resp:
            pq_state["ok"] = 200 <= resp.status < 300
    except Exception:
        pq_state["ok"] = False
    return pq_state["ok"]

# ── Redis (optional) ────────────────────────────────────────────────

def _connect_redis():
    """Connect to Redis for pub/sub event broadcasting."""
    global redis_client
    try:
        import importlib
        # Parse redis URL
        parts = REDIS_URL.replace("redis://", "").split(":")
        host = parts[0]
        port = int(parts[1]) if len(parts) > 1 else 6379
        redis_client = socket.create_connection((host, port), timeout=3)
        # Send a simple PING
        redis_client.sendall(b"*1\r\n$4\r\nPING\r\n")
        resp = redis_client.recv(64)
        if b"PONG" in resp:
            print(f"[sentinel] Redis connected: {host}:{port}")
            return True
    except Exception as e:
        print(f"[sentinel] Redis unavailable: {e}")
        redis_client = None
    return False


def _publish_event(channel: str, data: dict):
    """Publish event to Redis pub/sub using raw protocol."""
    global redis_client
    if not redis_client:
        return
    try:
        msg = json.dumps(data)
        cmd = f"*3\r\n$7\r\nPUBLISH\r\n${len(channel)}\r\n{channel}\r\n${len(msg)}\r\n{msg}\r\n"
        redis_client.sendall(cmd.encode())
        redis_client.recv(128)  # consume response
    except Exception:
        redis_client = None  # will reconnect next cycle


# ── Probing ──────────────────────────────────────────────────────────

def _probe_url(url: str, timeout: float = 5.0) -> tuple[bool, float]:
    """Probe a URL. Returns (reachable, latency_ms)."""
    start = time.monotonic()
    try:
        req = urllib.request.Request(url, method="GET")
        req.add_header("User-Agent", "TriumphSynergy-NetworkSentinel/1.0")
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            resp.read(1024)  # consume some body
            latency = (time.monotonic() - start) * 1000
            return (resp.status < 500, latency)
    except Exception:
        latency = (time.monotonic() - start) * 1000
        return (False, latency)


def _detect_public_ip() -> dict:
    """Detect public IP, ASN, ISP using Cloudflare + ipinfo fallback."""
    info = {"public_ip": None, "is_cgnat": None, "asn": None, "isp": None, "country": None}

    # Method 1: Cloudflare trace (fastest, no rate limits)
    try:
        req = urllib.request.Request("https://1.1.1.1/cdn-cgi/trace")
        with urllib.request.urlopen(req, timeout=5) as resp:
            body = resp.read().decode()
            for line in body.strip().split("\n"):
                if line.startswith("ip="):
                    info["public_ip"] = line.split("=", 1)[1]
                elif line.startswith("loc="):
                    info["country"] = line.split("=", 1)[1]
    except Exception:
        pass

    # Method 2: ipinfo.io for ASN/ISP (if CF worked for IP)
    if info["public_ip"]:
        try:
            req = urllib.request.Request(f"https://ipinfo.io/{info['public_ip']}/json")
            req.add_header("User-Agent", "TriumphSynergy/1.0")
            with urllib.request.urlopen(req, timeout=5) as resp:
                data = json.loads(resp.read())
                org = data.get("org", "")
                info["asn"] = org.split(" ")[0] if org else None
                info["isp"] = " ".join(org.split(" ")[1:]) if org else None
        except Exception:
            pass

    # Determine CGNAT status
    if info["public_ip"]:
        info["is_cgnat"] = any(info["public_ip"].startswith(p) for p in CGNAT_PREFIXES)
    else:
        info["is_cgnat"] = None

    return info


def _classify_connection(ip_info: dict, avg_latency: float, jitter: float) -> str:
    """Classify connection type based on ASN, latency, and jitter patterns."""
    asn = ip_info.get("asn", "") or ""
    isp = (ip_info.get("isp", "") or "").lower()

    # Starlink: known ASNs or ISP name
    if asn in STARLINK_ASNS or "starlink" in isp or "spacex" in isp:
        return "starlink"

    # Cellular/hotspot: CGNAT + high jitter
    if ip_info.get("is_cgnat") and jitter > 30:
        return "cellular"

    # CGNAT with low jitter could be cable ISP with CGNAT
    if ip_info.get("is_cgnat"):
        return "cgnat_broadband"

    # Normal broadband: public IP, reasonable latency
    if avg_latency < 100 and jitter < 20:
        return "broadband"

    # High latency but stable: satellite (non-Starlink) or long-haul
    if avg_latency > 200:
        return "satellite"

    return "broadband"


def _probe_internal() -> dict:
    """Check internal Docker network reachability."""
    results = {
        "pi_node_reachable": False,
        "pi_bridge_reachable": False,
        "pi_horizon_reachable": False,
        "redis_reachable": False,
    }

    # Pi Bridge Connector
    try:
        ok, _ = _probe_url(f"{PI_BRIDGE_URL}/health", timeout=3)
        results["pi_bridge_reachable"] = ok
    except Exception:
        pass

    # Pi Node Horizon (inside Docker)
    try:
        ok, _ = _probe_url(f"{PI_HORIZON_URL}/", timeout=5)
        results["pi_horizon_reachable"] = ok
    except Exception:
        pass

    # Pi Node as seen by Triumph
    results["pi_node_reachable"] = results["pi_horizon_reachable"]

    # Redis
    try:
        s = socket.create_connection(("triumph-redis", 6379), timeout=2)
        s.sendall(b"*1\r\n$4\r\nPING\r\n")
        resp = s.recv(32)
        results["redis_reachable"] = b"PONG" in resp
        s.close()
    except Exception:
        pass

    return results


def _restart_degraded_services():
    """Restart services that lost connectivity during a network transition."""
    sock_path = "/var/run/docker.sock"
    services_to_check = [
        "triumph-blockchain-oracle",     # SSE stream breaks on network change
        "triumph-market-data",           # Horizon poll may stall
        "triumph-pi-bridge-connector",   # Core bridge to Pi Node
    ]
    restarted = 0

    for svc in services_to_check:
        try:
            conn = http.client.HTTPConnection("localhost")
            conn.sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
            conn.sock.connect(sock_path)
            conn.request("GET", f"/containers/{svc}/json")
            resp = conn.getresponse()
            data = json.loads(resp.read())
            conn.close()

            health = data.get("State", {}).get("Health", {}).get("Status", "")
            status = data.get("State", {}).get("Status", "")

            if status == "running" and health in ("unhealthy", ""):
                print(f"[sentinel] Restarting {svc} (health={health}) after network transition")
                conn2 = http.client.HTTPConnection("localhost")
                conn2.sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
                conn2.sock.connect(sock_path)
                conn2.request("POST", f"/containers/{svc}/restart?t=10")
                conn2.getresponse().read()
                conn2.close()
                restarted += 1
        except Exception as e:
            print(f"[sentinel] Could not check {svc}: {e}")

    return restarted


def _update_ml_baseline(conn_type: str, quality: dict[str, Any]) -> tuple[float, int]:
    """
    Lightweight online learner (EWMA) per connection type.
    Returns anomaly score and current streak.
    """
    if not SELF_HEAL_ML_ENABLED:
        return (0.0, 0)

    baselines = state["ml"].setdefault("baselines", {})
    b = baselines.setdefault(
        conn_type,
        {
            "score_mean": quality.get("score", 0.0),
            "score_var": 100.0,
            "lat_mean": quality.get("latency_ms", 0.0),
            "lat_var": 100.0,
            "jitter_mean": quality.get("jitter_ms", 0.0),
            "jitter_var": 100.0,
            "n": 0,
        },
    )

    alpha = 0.18
    score = float(quality.get("score", 0.0))
    lat = float(quality.get("latency_ms", 0.0))
    jit = float(quality.get("jitter_ms", 0.0))

    def ewma_update(mean, var, x):
        delta = x - mean
        new_mean = mean + alpha * delta
        new_var = (1 - alpha) * var + alpha * (delta * delta)
        return new_mean, max(new_var, 1.0)

    b["score_mean"], b["score_var"] = ewma_update(b["score_mean"], b["score_var"], score)
    b["lat_mean"], b["lat_var"] = ewma_update(b["lat_mean"], b["lat_var"], lat)
    b["jitter_mean"], b["jitter_var"] = ewma_update(b["jitter_mean"], b["jitter_var"], jit)
    b["n"] += 1

    import math
    z_score_drop = max(0.0, (b["score_mean"] - score) / math.sqrt(b["score_var"]))
    z_lat = max(0.0, (lat - b["lat_mean"]) / math.sqrt(b["lat_var"]))
    z_jit = max(0.0, (jit - b["jitter_mean"]) / math.sqrt(b["jitter_var"]))

    anomaly = round((0.5 * z_score_drop) + (0.3 * z_lat) + (0.2 * z_jit), 3)
    streak = int(state["ml"].get("anomaly_streak", 0))
    if anomaly >= ANOMALY_Z_THRESHOLD:
        streak += 1
    else:
        streak = 0

    state["ml"]["anomaly_score"] = anomaly
    state["ml"]["anomaly_streak"] = streak
    baselines[conn_type] = b
    return anomaly, streak


# ── Quality scoring ──────────────────────────────────────────────────

def _calculate_quality(latencies: list[float]) -> dict:
    """Calculate connection quality score from latency samples."""
    if not latencies:
        return {"latency_ms": 0, "jitter_ms": 0, "packet_loss_pct": 0, "score": 0, "samples": []}

    valid = [l for l in latencies if l < 9000]  # exclude timeouts
    if not valid:
        return {"latency_ms": 9999, "jitter_ms": 9999, "packet_loss_pct": 100, "score": 0,
                "samples": latencies[-20:]}

    avg = statistics.mean(valid)
    jitter = statistics.stdev(valid) if len(valid) > 1 else 0
    loss = ((len(latencies) - len(valid)) / len(latencies)) * 100

    # Score: 100 = perfect, 0 = unusable
    # Latency penalty: -1 per 5ms over 20ms baseline
    # Jitter penalty: -2 per 10ms
    # Loss penalty: -10 per 1%
    score = 100
    score -= max(0, (avg - 20) / 5)
    score -= max(0, jitter / 5)
    score -= loss * 10
    score = max(0, min(100, score))

    return {
        "latency_ms": round(avg, 1),
        "jitter_ms": round(jitter, 1),
        "packet_loss_pct": round(loss, 1),
        "score": round(score, 1),
        "samples": latencies[-20:],
    }


# ── Main probe loop ─────────────────────────────────────────────────

def sentinel_loop():
    global redis_client

    # Initial Redis connection
    _connect_redis()

    all_latencies: list[float] = []

    while True:
        try:
            cycle_start = time.monotonic()

            # ── 1. External probes ──────────────────────────────────
            probe_results = {}
            cycle_latencies = []

            for name, url in EXTERNAL_PROBES:
                ok, latency = _probe_url(url, timeout=8)
                probe_results[name] = {
                    "reachable": ok,
                    "latency_ms": round(latency, 1),
                    "url": url,
                }
                if ok:
                    cycle_latencies.append(latency)
                else:
                    cycle_latencies.append(9999)  # timeout marker

            all_latencies.extend(cycle_latencies)
            all_latencies = all_latencies[-80:]  # keep last 80 samples

            # ── 2. Connection classification ────────────────────────
            ip_info = _detect_public_ip()
            quality = _calculate_quality(all_latencies)

            valid_latencies = [l for l in all_latencies if l < 9000]
            avg_lat = statistics.mean(valid_latencies) if valid_latencies else 0
            jitter = statistics.stdev(valid_latencies) if len(valid_latencies) > 1 else 0
            conn_type = _classify_connection(ip_info, avg_lat, jitter)
            anomaly_score, anomaly_streak = _update_ml_baseline(conn_type, quality)

            # ── 3. Detect network transition ────────────────────────
            old_type = state["connection"]["type"]
            old_ip = state["connection"]["public_ip"]
            transition = False

            if (conn_type != old_type and old_type != "unknown") or \
               (ip_info["public_ip"] and ip_info["public_ip"] != old_ip and old_ip is not None):
                transition = True
                ts = time.time()
                event = {
                    "time": ts,
                    "from_type": old_type,
                    "to_type": conn_type,
                    "from_ip": old_ip,
                    "to_ip": ip_info["public_ip"],
                    "reason": "ip_changed" if ip_info["public_ip"] != old_ip else "type_changed",
                }
                print(f"[sentinel] NETWORK TRANSITION: {old_type}({old_ip}) → {conn_type}({ip_info['public_ip']})")

                with lock:
                    state["transitions"].append(event)
                    state["transitions"] = state["transitions"][-10:]
                    state["last_transition_at"] = ts

                # Publish transition event
                _publish_event("network:transition", event)

                # Restart services that break on network changes
                restarted = _restart_degraded_services()
                with lock:
                    state["services_restarted"] += restarted
                    state["ml"]["last_action"] = "transition_recovery"

            # ── 4.5 ML anomaly-triggered proactive recovery ────────────────
            if SELF_HEAL_ML_ENABLED and anomaly_streak >= ANOMALY_STREAK_THRESHOLD:
                pq_ok = _pq_ready()
                can_recover = (not CONTROL_PLANE_REQUIRE_PQ_READY) or pq_ok
                if can_recover:
                    restarted = _restart_degraded_services()
                    if restarted > 0:
                        print(
                            f"[sentinel] ML recovery triggered: anomaly={anomaly_score}, "
                            f"streak={anomaly_streak}, restarted={restarted}"
                        )
                        _publish_event("network:ml_recovery", {
                            "time": time.time(),
                            "anomaly_score": anomaly_score,
                            "anomaly_streak": anomaly_streak,
                            "restarted": restarted,
                            "connection_type": conn_type,
                            "pq_ready": pq_ok,
                        })
                        with lock:
                            state["services_restarted"] += restarted
                            state["ml"]["last_action"] = "ml_recovery"
                            state["ml"]["anomaly_streak"] = 0
                else:
                    with lock:
                        state["ml"]["last_action"] = "pq_gate_blocked"

            # ── 5. Internal Docker network probes ───────────────────
            internal = _probe_internal()

            # ── 6. Update state ─────────────────────────────────────
            with lock:
                state["probe_count"] += 1
                state["connection"] = {
                    "type": conn_type,
                    "public_ip": ip_info["public_ip"],
                    "is_cgnat": ip_info["is_cgnat"],
                    "asn": ip_info["asn"],
                    "isp": ip_info["isp"],
                    "country": ip_info["country"],
                }
                state["quality"] = quality
                state["probes"] = probe_results
                state["internal"] = internal
                state["last_error"] = None
                state["ml"]["anomaly_score"] = anomaly_score
                state["ml"]["anomaly_streak"] = anomaly_streak
                state["ml"]["enabled"] = SELF_HEAL_ML_ENABLED
                state["ml"]["pq_ready"] = pq_state["ok"]

            # Reconnect Redis if lost
            if not redis_client:
                _connect_redis()

            # ── 7. Periodic Redis state publish ─────────────────────
            if state["probe_count"] % 4 == 0:  # every ~60s
                _publish_event("network:status", {
                    "type": conn_type,
                    "ip": ip_info["public_ip"],
                    "cgnat": ip_info["is_cgnat"],
                    "quality_score": quality["score"],
                    "latency_ms": quality["latency_ms"],
                    "pi_node": internal["pi_node_reachable"],
                    "bridge": internal["pi_bridge_reachable"],
                    "ml_anomaly_score": anomaly_score,
                    "pq_ready": pq_state["ok"],
                })

        except Exception as e:
            with lock:
                state["last_error"] = str(e)
            print(f"[sentinel] error: {e}")

        time.sleep(PROBE_INTERVAL)


# ── HTTP endpoints ───────────────────────────────────────────────────

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/health":
            probes_ok = sum(1 for p in state["probes"].values() if p.get("reachable"))
            self._respond(200, {
                "status": "healthy" if probes_ok > 0 else "offline",
                "service": "network-sentinel",
                "connection_type": state["connection"]["type"],
                "quality_score": state["quality"]["score"],
                "probes_ok": probes_ok,
                "probes_total": len(state["probes"]),
            })
        elif self.path == "/status":
            with lock:
                self._respond(200, {
                    "uptime_s": round(time.time() - state["started_at"], 1),
                    "probe_count": state["probe_count"],
                    "connection": state["connection"],
                    "quality": {k: v for k, v in state["quality"].items() if k != "samples"},
                    "internal": state["internal"],
                    "transitions": state["transitions"][-5:],
                    "services_restarted": state["services_restarted"],
                })
        elif self.path == "/metrics":
            with lock:
                self._respond(200, state)
        elif self.path == "/prometheus":
            with lock:
                payload = _prometheus_text(state).encode()
            self.send_response(200)
            self.send_header("Content-Type", "text/plain; version=0.0.4")
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
        elif self.path == "/connectivity":
            # Detailed connectivity report for dashboards
            with lock:
                conn = state["connection"]
                q = state["quality"]
                inbound = "yes" if not conn.get("is_cgnat") else "no (CGNAT)"
                self._respond(200, {
                    "network": {
                        "type": conn["type"],
                        "ip": conn["public_ip"],
                        "isp": conn["isp"],
                        "cgnat": conn["is_cgnat"],
                        "inbound_peers": inbound,
                        "starlink": conn["type"] == "starlink",
                    },
                    "quality": {
                        "score": q["score"],
                        "latency_ms": q["latency_ms"],
                        "jitter_ms": q["jitter_ms"],
                        "loss_pct": q["packet_loss_pct"],
                        "rating": (
                            "excellent" if q["score"] >= 90 else
                            "good" if q["score"] >= 70 else
                            "fair" if q["score"] >= 50 else
                            "poor" if q["score"] >= 25 else "critical"
                        ),
                    },
                    "pi_network": {
                        "node_reachable": state["internal"]["pi_node_reachable"],
                        "bridge_active": state["internal"]["pi_bridge_reachable"],
                        "horizon_api": state["internal"]["pi_horizon_reachable"],
                        "peer_port": PI_NODE_PEER_PORT,
                        "inbound_peers_possible": not conn.get("is_cgnat"),
                    },
                    "recommendations": _recommendations(conn, q),
                })
        else:
            self._respond(404, {"error": "not found"})

    def _respond(self, code, body):
        payload = json.dumps(body, default=str).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def log_message(self, *args):
        pass


def _recommendations(conn: dict, quality: dict) -> list[str]:
    """Generate actionable recommendations based on current network state."""
    recs = []
    if conn.get("is_cgnat"):
        recs.append("CGNAT detected — inbound Pi peer connections (port 31402) are blocked. Use Starlink or broadband for full peer connectivity.")
    if conn.get("type") == "cellular":
        recs.append("Mobile hotspot detected — high jitter may cause SSE stream drops. Consider switching to Starlink or wired broadband.")
    if conn.get("type") == "starlink":
        recs.append("Starlink active — excellent choice. Public IP enables inbound Pi peers. Variable latency (20-80ms) is normal.")
    if quality.get("score", 0) < 50:
        recs.append(f"Connection quality is poor (score: {quality['score']}). Consider switching networks.")
    if quality.get("jitter_ms", 0) > 50:
        recs.append(f"High jitter ({quality['jitter_ms']}ms) detected — SSE streams and real-time data may lag.")
    if not recs:
        recs.append("Connection is healthy. All systems nominal.")
    return recs


# ── Main ─────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print(f"[sentinel] Starting — probe interval={PROBE_INTERVAL}s")
    print(f"[sentinel] Pi Node: {PI_NODE_HOST}:{PI_NODE_PEER_PORT}")
    print(f"[sentinel] Pi Horizon: {PI_HORIZON_URL}")

    t = threading.Thread(target=sentinel_loop, daemon=True)
    t.start()

    server = HTTPServer(("0.0.0.0", METRICS_PORT), Handler)
    print(f"[sentinel] HTTP on :{METRICS_PORT}")
    server.serve_forever()

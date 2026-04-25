# Copyright (C) 2024-2026 Jeremiah Drains / Triumph Synergy. All rights reserved.
# License: PiOS
"""
Triumph Synergy Health Governor
──────────────────────────────────────────────────────────────────────
Watchdog that monitors all Triumph containers via the Docker API socket
and takes corrective action to keep the service mesh alive.

Features:
 - Polls container stats every GOVERNOR_INTERVAL_S seconds
 - Memory monitoring: warn at 80%, restart at 95%
 - HTTP health probing: restart containers whose /health endpoint fails
   for HEALTH_FAIL_THRESHOLD consecutive checks
 - Restart backoff: exponential cooldown prevents restart storms
 - Docker health status monitoring: restarts containers stuck in
   "unhealthy" status for too long
 - Exposes /health and /metrics endpoints (port 9912)
 - Protects postgres & redis from automatic restart
"""

# Copyright (C) 2024-2026 Jeremiah Drains / Triumph Synergy. All rights reserved.
# License: PiOS
# Copyright (C) 2024-2026 Jeremiah Drains / Triumph Synergy. All rights reserved.
# License: PiOS


import http.client
import json
import os
import socket
import threading
import time
import urllib.request
import urllib.error
from http.server import HTTPServer, BaseHTTPRequestHandler

# ── Configuration ──────────────────────────────────────────────────
INTERVAL = int(os.environ.get("GOVERNOR_INTERVAL_S", "30"))
MEMORY_WARN_PCT = float(os.environ.get("MEMORY_WARN_PCT", "80"))
MEMORY_KILL_PCT = float(os.environ.get("MEMORY_KILL_PCT", "95"))
METRICS_PORT = int(os.environ.get("METRICS_PORT", "9912"))
HEALTH_FAIL_THRESHOLD = int(os.environ.get("HEALTH_FAIL_THRESHOLD", "3"))
DOCKER_UNHEALTHY_THRESHOLD = int(os.environ.get("DOCKER_UNHEALTHY_THRESHOLD", "3"))
RESTART_BACKOFF_BASE = int(os.environ.get("RESTART_BACKOFF_BASE_S", "60"))
RESTART_BACKOFF_MAX = int(os.environ.get("RESTART_BACKOFF_MAX_S", "600"))
HEALTH_PROBE_TIMEOUT = int(os.environ.get("HEALTH_PROBE_TIMEOUT_S", "5"))
ML_SELF_HEAL_ENABLED = os.environ.get("ML_SELF_HEAL_ENABLED", "true").lower() == "true"
ML_HISTORY_WINDOW_S = int(os.environ.get("ML_HISTORY_WINDOW_S", "900"))
ML_MAX_RESTARTS_PER_WINDOW = int(os.environ.get("ML_MAX_RESTARTS_PER_WINDOW", "4"))
ML_SUPPRESSION_S = int(os.environ.get("ML_SUPPRESSION_S", "300"))
CONTROL_PLANE_REQUIRE_PQ_READY = os.environ.get("CONTROL_PLANE_REQUIRE_PQ_READY", "true").lower() == "true"
QUANTUM_SHIELD_URL = os.environ.get("QUANTUM_SHIELD_URL", "http://triumph-quantum-shield:8094").rstrip("/")
PQ_CHECK_INTERVAL_S = int(os.environ.get("PQ_CHECK_INTERVAL_S", "30"))
# Containers that should NEVER be restarted automatically
PROTECTED = set(
    x.strip() for x in os.environ.get("PROTECTED_CONTAINERS", "triumph-postgres,triumph-redis").split(",") if x.strip()
)
PREFIX = os.environ.get("CONTAINER_PREFIX", "triumph-")

# Service name → internal health URL (Docker network)
SERVICE_HEALTH_MAP = {
    "triumph-app":                  "http://triumph-app:3000/api/health",
    "triumph-transaction-engine":   "http://triumph-transaction-engine:8080/health",
    "triumph-vault":                "http://triumph-vault:8081/health",
    "triumph-smart-contracts":      "http://triumph-smart-contracts:8082/health",
    "triumph-scp-upgrader":         "http://triumph-scp-upgrader:8083/health",
    "triumph-payment-processor":    "http://triumph-payment-processor:8084/health",
    "triumph-market-data":          "http://triumph-market-data:8085/health",
    "triumph-blockchain-oracle":    "http://triumph-blockchain-oracle:8086/health",
    "triumph-compliance":           "http://triumph-compliance:8087/health",
    "triumph-dex":                  "http://triumph-dex:8088/health",
    "triumph-tokenization-engine":  "http://triumph-tokenization-engine:8089/health",
    "triumph-ml-engine":            "http://triumph-ml-engine:8090/health",
    "triumph-credit-engine":        "http://triumph-credit-engine:8091/health",
    "triumph-pi-bridge-connector":  "http://triumph-pi-bridge-connector:8092/health",
    "triumph-dual-value-engine":    "http://triumph-dual-value-engine:8093/health",
    "triumph-quantum-shield":       "http://triumph-quantum-shield:8094/health",
    "triumph-cloud-memory":         "http://triumph-cloud-memory:8095/health",
    "triumph-judicial-monitor":     "http://triumph-judicial-monitor:8096/health",
    "triumph-nginx":                "http://triumph-nginx:80/health",
}

# ── Docker socket HTTP client ─────────────────────────────────────

class DockerSocket:
    """Minimal Docker Engine API client over /var/run/docker.sock"""

    SOCK = "/var/run/docker.sock"

    @classmethod
    def _request(cls, method, path):
        conn = http.client.HTTPConnection("localhost")
        conn.sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        conn.sock.connect(cls.SOCK)
        conn.request(method, path)
        resp = conn.getresponse()
        data = resp.read().decode()
        conn.close()
        return json.loads(data) if data else {}

    @classmethod
    def containers(cls):
        return cls._request("GET", "/containers/json?all=false")

    @classmethod
    def stats(cls, cid):
        return cls._request("GET", f"/containers/{cid}/stats?stream=false")

    @classmethod
    def inspect(cls, cid):
        return cls._request("GET", f"/containers/{cid}/json")

    @classmethod
    def restart(cls, cid):
        return cls._request("POST", f"/containers/{cid}/restart?t=10")


# ── Health probe ───────────────────────────────────────────────────

def probe_health(url):
    """HTTP GET health check. Returns True if 2xx, False otherwise."""
    try:
        req = urllib.request.Request(url, method="GET")
        resp = urllib.request.urlopen(req, timeout=HEALTH_PROBE_TIMEOUT)
        return 200 <= resp.status < 300
    except Exception:
        return False


# ── State ──────────────────────────────────────────────────────────

metrics_snapshot = {"ts": 0, "containers": [], "restarts": 0, "warnings": 0, "health_restarts": 0}
lock = threading.Lock()

# Track consecutive health failures per container
health_fail_counts = {}  # name → int

# Track consecutive Docker unhealthy detections per container
docker_unhealthy_counts = {}  # name -> int

# Track restart backoff per container: name → next_allowed_restart_ts
restart_backoff = {}
restart_counts = {}  # name → consecutive restart count (for exponential backoff)
restart_timeline = {}  # name -> [timestamps]
restart_suppressed_until = {}  # name -> ts
restart_cause_counts = {}  # name -> {cause: count}
pq_state = {"ok": False, "checked_at": 0.0}


def pq_ready():
    """Check Quantum Shield readiness and cache result for a short interval."""
    now = time.time()
    if now - pq_state["checked_at"] < PQ_CHECK_INTERVAL_S:
        return pq_state["ok"]
    pq_state["checked_at"] = now
    try:
        req = urllib.request.Request(f"{QUANTUM_SHIELD_URL}/health", method="GET")
        with urllib.request.urlopen(req, timeout=HEALTH_PROBE_TIMEOUT) as resp:
            pq_state["ok"] = 200 <= resp.status < 300
    except Exception:
        pq_state["ok"] = False
    return pq_state["ok"]


def record_restart_cause(name, cause):
    causes = restart_cause_counts.setdefault(name, {})
    causes[cause] = causes.get(cause, 0) + 1


def adaptive_restart_allowed(name):
    """Simple online learning: suppress thrashy restarts when a service keeps failing repeatedly."""
    if not ML_SELF_HEAL_ENABLED:
        return True

    now = time.time()
    suppressed = restart_suppressed_until.get(name, 0)
    if now < suppressed:
        return False

    hist = [t for t in restart_timeline.get(name, []) if now - t <= ML_HISTORY_WINDOW_S]
    restart_timeline[name] = hist
    if len(hist) >= ML_MAX_RESTARTS_PER_WINDOW:
        restart_suppressed_until[name] = now + ML_SUPPRESSION_S
        print(
            f"[GOVERNOR] ML suppression for {name}: "
            f"{len(hist)} restarts in {ML_HISTORY_WINDOW_S}s, suppressing for {ML_SUPPRESSION_S}s"
        )
        return False

    return True


def can_autorecover(name):
    """Single gate for autonomous restart actions with backoff + ML + PQ readiness."""
    if not can_restart(name):
        return False
    if not adaptive_restart_allowed(name):
        return False
    if CONTROL_PLANE_REQUIRE_PQ_READY and not pq_ready():
        print(f"[GOVERNOR] PQ gate blocked auto-recovery for {name}: quantum shield unavailable")
        return False
    return True


def can_restart(name):
    """Check if enough time has passed since last restart (exponential backoff)."""
    now = time.time()
    next_allowed = restart_backoff.get(name, 0)
    return now >= next_allowed


def record_restart(name):
    """Record a restart and update the backoff timer."""
    count = restart_counts.get(name, 0) + 1
    restart_counts[name] = count
    backoff = min(RESTART_BACKOFF_BASE * (2 ** (count - 1)), RESTART_BACKOFF_MAX)
    restart_backoff[name] = time.time() + backoff
    restart_timeline.setdefault(name, []).append(time.time())
    print(f"[GOVERNOR] Backoff for {name}: next restart allowed in {backoff}s (attempt #{count})")


def clear_backoff(name):
    """Clear backoff when a container is healthy again."""
    if name in restart_counts:
        del restart_counts[name]
    if name in restart_backoff:
        del restart_backoff[name]


# ── Governor loop ──────────────────────────────────────────────────

def governor_loop():
    global metrics_snapshot
    total_restarts = 0
    total_warnings = 0
    total_health_restarts = 0

    while True:
        try:
            containers = DockerSocket.containers()
            report = []
            infra_degraded = False

            # If core state services are down, avoid thrashing dependent service restarts.
            for c in containers:
                name = (c.get("Names") or ["/unknown"])[0].lstrip("/")
                if name in PROTECTED and "unhealthy" in str(c.get("Status", "")).lower():
                    infra_degraded = True
                    break

            for c in containers:
                name = (c.get("Names") or ["/unknown"])[0].lstrip("/")
                if not name.startswith(PREFIX):
                    continue

                cid = c["Id"]
                entry = {"name": name, "mb": 0, "limit_mb": 0, "pct": 0, "action": "ok", "health": "unknown"}

                # ── Memory monitoring ──────────────────────────────
                try:
                    st = DockerSocket.stats(cid)
                    mem_usage = st.get("memory_stats", {}).get("usage", 0)
                    mem_limit = st.get("memory_stats", {}).get("limit", 1)

                    if mem_limit <= 8 * 1024 * 1024 * 1024:
                        pct = round(mem_usage / mem_limit * 100, 1) if mem_limit else 0
                        mb_used = round(mem_usage / (1024 * 1024), 1)
                        mb_limit = round(mem_limit / (1024 * 1024), 1)
                        entry.update({"mb": mb_used, "limit_mb": mb_limit, "pct": pct})

                        if pct >= MEMORY_KILL_PCT and name not in PROTECTED:
                            if can_autorecover(name):
                                print(f"[GOVERNOR] RESTART (memory) {name}: {mb_used}MB / {mb_limit}MB ({pct}%)")
                                try:
                                    DockerSocket.restart(cid)
                                    entry["action"] = "restarted_memory"
                                    total_restarts += 1
                                    record_restart_cause(name, "memory")
                                    record_restart(name)
                                except Exception as e:
                                    print(f"[GOVERNOR] Failed to restart {name}: {e}")
                                    entry["action"] = "restart_failed"
                            else:
                                entry["action"] = "restart_gated"
                                print(f"[GOVERNOR] GATED {name}: memory restart skipped")
                        elif pct >= MEMORY_WARN_PCT:
                            print(f"[GOVERNOR] WARNING {name}: {mb_used}MB / {mb_limit}MB ({pct}%)")
                            entry["action"] = "warning"
                            total_warnings += 1
                except Exception:
                    pass

                # ── Docker health status check ─────────────────────
                try:
                    health_status = "unknown"
                    if "unhealthy" in str(c.get("Status", "")).lower():
                        health_status = "unhealthy"
                    else:
                        inspected = DockerSocket.inspect(cid)
                        health_status = (
                            inspected.get("State", {})
                            .get("Health", {})
                            .get("Status", "unknown")
                        )
                    entry["docker_health"] = health_status

                    if health_status == "unhealthy":
                        unhealthy_fails = docker_unhealthy_counts.get(name, 0) + 1
                        docker_unhealthy_counts[name] = unhealthy_fails
                        entry["docker_health"] = f"unhealthy ({unhealthy_fails}/{DOCKER_UNHEALTHY_THRESHOLD})"

                        if unhealthy_fails >= DOCKER_UNHEALTHY_THRESHOLD and name not in PROTECTED:
                            if infra_degraded:
                                entry["action"] = "wait_infra"
                                print(f"[GOVERNOR] WAIT {name}: infra degraded, delaying docker-health restart")
                            elif can_autorecover(name):
                                print(
                                    f"[GOVERNOR] RESTART (docker-health) {name}: "
                                    f"unhealthy {unhealthy_fails} consecutive checks"
                                )
                                try:
                                    DockerSocket.restart(cid)
                                    entry["action"] = "restarted_docker_health"
                                    total_health_restarts += 1
                                    docker_unhealthy_counts[name] = 0
                                    health_fail_counts[name] = 0
                                    record_restart_cause(name, "docker_health")
                                    record_restart(name)
                                except Exception as e:
                                    print(f"[GOVERNOR] Failed to restart {name}: {e}")
                                    entry["action"] = "restart_failed"
                            else:
                                entry["action"] = "docker_health_restart_gated"
                                print(f"[GOVERNOR] GATED {name}: docker-health restart skipped")
                    elif health_status == "healthy":
                        docker_unhealthy_counts[name] = 0
                except Exception:
                    pass

                # ── HTTP health probe ──────────────────────────────
                health_url = SERVICE_HEALTH_MAP.get(name)
                if health_url:
                    ok = probe_health(health_url)
                    if ok:
                        entry["health"] = "healthy"
                        health_fail_counts[name] = 0
                        if entry["action"] == "ok":
                            clear_backoff(name)
                    else:
                        fails = health_fail_counts.get(name, 0) + 1
                        health_fail_counts[name] = fails
                        entry["health"] = f"failing ({fails}/{HEALTH_FAIL_THRESHOLD})"

                        if fails >= HEALTH_FAIL_THRESHOLD and name not in PROTECTED:
                            if infra_degraded:
                                entry["action"] = "wait_infra"
                                print(f"[GOVERNOR] WAIT {name}: infra degraded, delaying health restart")
                            elif can_autorecover(name):
                                print(f"[GOVERNOR] RESTART (health) {name}: failed {fails} consecutive health checks")
                                try:
                                    DockerSocket.restart(cid)
                                    entry["action"] = "restarted_health"
                                    total_health_restarts += 1
                                    health_fail_counts[name] = 0
                                    record_restart_cause(name, "http_health")
                                    record_restart(name)
                                except Exception as e:
                                    print(f"[GOVERNOR] Failed to restart {name}: {e}")
                                    entry["action"] = "restart_failed"
                            else:
                                entry["action"] = "health_restart_gated"
                                print(f"[GOVERNOR] GATED {name}: health restart skipped")

                report.append(entry)

            with lock:
                metrics_snapshot = {
                    "ts": int(time.time()),
                    "containers": sorted(report, key=lambda x: -x["pct"]),
                    "restarts": total_restarts,
                    "warnings": total_warnings,
                    "health_restarts": total_health_restarts,
                    "pq_ready": pq_state["ok"],
                    "ml_self_heal_enabled": ML_SELF_HEAL_ENABLED,
                    "restart_cause_counts": restart_cause_counts,
                }

        except Exception as e:
            print(f"[GOVERNOR] Loop error: {e}")

        time.sleep(INTERVAL)


# ── HTTP endpoints ─────────────────────────────────────────────────

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == "/health":
            self._respond(200, {"status": "healthy", "service": "health-governor"})
        elif self.path == "/metrics":
            with lock:
                self._respond(200, metrics_snapshot)
        else:
            self._respond(404, {"error": "not found"})

    def _respond(self, code, body):
        try:
            payload = json.dumps(body).encode()
            self.send_response(code)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)
        except BrokenPipeError:
            pass

    def log_message(self, format, *args):
        pass  # Suppress per-request logs


# ── Main ───────────────────────────────────────────────────────────

if __name__ == "__main__":
    print(f"[GOVERNOR] Starting — interval={INTERVAL}s warn={MEMORY_WARN_PCT}% kill={MEMORY_KILL_PCT}%")
    print(f"[GOVERNOR] Protected: {PROTECTED}")

    t = threading.Thread(target=governor_loop, daemon=True)
    t.start()

    server = HTTPServer(("0.0.0.0", METRICS_PORT), Handler)
    print(f"[GOVERNOR] HTTP listening on :{METRICS_PORT}")
    server.serve_forever()

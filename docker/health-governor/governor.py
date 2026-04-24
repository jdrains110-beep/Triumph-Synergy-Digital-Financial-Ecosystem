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
RESTART_BACKOFF_BASE = int(os.environ.get("RESTART_BACKOFF_BASE_S", "60"))
RESTART_BACKOFF_MAX = int(os.environ.get("RESTART_BACKOFF_MAX_S", "600"))
HEALTH_PROBE_TIMEOUT = int(os.environ.get("HEALTH_PROBE_TIMEOUT_S", "5"))
# Containers that should NEVER be restarted automatically
PROTECTED = set(
    os.environ.get("PROTECTED_CONTAINERS", "triumph-postgres,triumph-redis").split(",")
)
PREFIX = os.environ.get("CONTAINER_PREFIX", "triumph-")

# Service name → internal health URL (Docker network)
SERVICE_HEALTH_MAP = {
    "triumph-app":                  "http://triumph-app:3000/health",
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

# Track restart backoff per container: name → next_allowed_restart_ts
restart_backoff = {}
restart_counts = {}  # name → consecutive restart count (for exponential backoff)


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
                            if can_restart(name):
                                print(f"[GOVERNOR] RESTART (memory) {name}: {mb_used}MB / {mb_limit}MB ({pct}%)")
                                try:
                                    DockerSocket.restart(cid)
                                    entry["action"] = "restarted_memory"
                                    total_restarts += 1
                                    record_restart(name)
                                except Exception as e:
                                    print(f"[GOVERNOR] Failed to restart {name}: {e}")
                                    entry["action"] = "restart_failed"
                            else:
                                entry["action"] = "restart_backoff"
                                print(f"[GOVERNOR] BACKOFF {name}: restart skipped (cooling down)")
                        elif pct >= MEMORY_WARN_PCT:
                            print(f"[GOVERNOR] WARNING {name}: {mb_used}MB / {mb_limit}MB ({pct}%)")
                            entry["action"] = "warning"
                            total_warnings += 1
                except Exception:
                    pass

                # ── Docker health status check ─────────────────────
                try:
                    health_status = (c.get("State") or "").lower()
                    if "unhealthy" in str(c.get("Status", "")):
                        health_status = "unhealthy"
                    entry["docker_health"] = health_status
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
                            if can_restart(name):
                                print(f"[GOVERNOR] RESTART (health) {name}: failed {fails} consecutive health checks")
                                try:
                                    DockerSocket.restart(cid)
                                    entry["action"] = "restarted_health"
                                    total_health_restarts += 1
                                    health_fail_counts[name] = 0
                                    record_restart(name)
                                except Exception as e:
                                    print(f"[GOVERNOR] Failed to restart {name}: {e}")
                                    entry["action"] = "restart_failed"
                            else:
                                entry["action"] = "health_restart_backoff"
                                print(f"[GOVERNOR] BACKOFF {name}: health-restart skipped (cooling down)")

                report.append(entry)

            with lock:
                metrics_snapshot = {
                    "ts": int(time.time()),
                    "containers": sorted(report, key=lambda x: -x["pct"]),
                    "restarts": total_restarts,
                    "warnings": total_warnings,
                    "health_restarts": total_health_restarts,
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

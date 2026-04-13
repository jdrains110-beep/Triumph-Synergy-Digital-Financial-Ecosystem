"""
Triumph Synergy Health Governor
──────────────────────────────────────────────────────────────────────
Lightweight watchdog (~20 MB RSS) that monitors all Triumph containers
via the Docker API socket and takes corrective action before Docker
Desktop crashes from memory exhaustion.

Features:
 - Polls container stats every GOVERNOR_INTERVAL_S seconds
 - Restarts any container exceeding MEMORY_KILL_PCT of its mem_limit
 - Logs memory warnings at MEMORY_WARN_PCT threshold
 - Exposes /health and /metrics endpoints (port 9912)
 - Protects postgres & redis from restart (oom_score_adj -500 layer)
"""

import http.client
import json
import os
import socket
import threading
import time
from http.server import HTTPServer, BaseHTTPRequestHandler

# ── Configuration ──────────────────────────────────────────────────
INTERVAL = int(os.environ.get("GOVERNOR_INTERVAL_S", "30"))
MEMORY_WARN_PCT = float(os.environ.get("MEMORY_WARN_PCT", "80"))
MEMORY_KILL_PCT = float(os.environ.get("MEMORY_KILL_PCT", "95"))
METRICS_PORT = int(os.environ.get("METRICS_PORT", "9912"))
# Containers that should NEVER be restarted automatically
PROTECTED = set(
    os.environ.get("PROTECTED_CONTAINERS", "triumph-postgres,triumph-redis").split(",")
)
PREFIX = os.environ.get("CONTAINER_PREFIX", "triumph-")

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
    def restart(cls, cid):
        return cls._request("POST", f"/containers/{cid}/restart?t=10")


# ── State ──────────────────────────────────────────────────────────

metrics_snapshot = {"ts": 0, "containers": [], "restarts": 0, "warnings": 0}
lock = threading.Lock()


# ── Governor loop ──────────────────────────────────────────────────

def governor_loop():
    global metrics_snapshot
    total_restarts = 0
    total_warnings = 0

    while True:
        try:
            containers = DockerSocket.containers()
            report = []

            for c in containers:
                name = (c.get("Names") or ["/unknown"])[0].lstrip("/")
                if not name.startswith(PREFIX):
                    continue

                cid = c["Id"]
                try:
                    st = DockerSocket.stats(cid)
                except Exception:
                    continue

                mem_usage = st.get("memory_stats", {}).get("usage", 0)
                mem_limit = st.get("memory_stats", {}).get("limit", 1)

                # Skip if limit is the full host RAM (no mem_limit set)
                if mem_limit > 8 * 1024 * 1024 * 1024:
                    continue

                pct = round(mem_usage / mem_limit * 100, 1) if mem_limit else 0
                mb_used = round(mem_usage / (1024 * 1024), 1)
                mb_limit = round(mem_limit / (1024 * 1024), 1)

                entry = {"name": name, "mb": mb_used, "limit_mb": mb_limit, "pct": pct, "action": "ok"}

                if pct >= MEMORY_KILL_PCT and name not in PROTECTED:
                    print(f"[GOVERNOR] RESTART {name}: {mb_used}MB / {mb_limit}MB ({pct}%)")
                    try:
                        DockerSocket.restart(cid)
                        entry["action"] = "restarted"
                        total_restarts += 1
                    except Exception as e:
                        print(f"[GOVERNOR] Failed to restart {name}: {e}")
                        entry["action"] = "restart_failed"
                elif pct >= MEMORY_WARN_PCT:
                    print(f"[GOVERNOR] WARNING {name}: {mb_used}MB / {mb_limit}MB ({pct}%)")
                    entry["action"] = "warning"
                    total_warnings += 1

                report.append(entry)

            with lock:
                metrics_snapshot = {
                    "ts": int(time.time()),
                    "containers": sorted(report, key=lambda x: -x["pct"]),
                    "restarts": total_restarts,
                    "warnings": total_warnings,
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

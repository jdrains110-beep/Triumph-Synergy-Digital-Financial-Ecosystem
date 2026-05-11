"""
SAIB Watchdog — Self-Resurrection Sidecar
=========================================

Independent micro-container whose only purpose is to keep the apex-services
container (which hosts SAIB itself) alive. SAIB cannot restart its own
container from inside, so this watchdog is the external resurrection
authority.

Behaviour:
  • Every WATCHDOG_INTERVAL_S (default 30s) check that:
      - the configured target container exists in Docker
      - its state is "running"
      - its HTTP /health endpoint responds 200 within timeout
  • If any check fails consecutively WATCHDOG_FAILS_BEFORE_RESTART times,
    issue a `docker restart` on the target.
  • A rolling window throttles restarts so a crash-loop doesn't get
    hammered (max WATCHDOG_MAX_RESTARTS in WATCHDOG_WINDOW_S).
  • Optional: post a heartbeat to a peer SAIB so the federation knows the
    watchdog itself is alive.

Mainnet-only mandate — no testnet behaviour, no testnet endpoints.
"""

from __future__ import annotations

import logging
import os
import sys
import time
from collections import deque

import httpx
from typing import Any

docker_sdk: Any = None
try:
    import docker as docker_sdk
    _DOCKER_OK = True
except Exception:  # noqa: BLE001
    _DOCKER_OK = False

# Optional Kubernetes client (lazy) — only loaded when WATCHDOG_K8S_MODE=true
_K8S_OK = False
_k8s_core = None
_k8s_client_mod: Any = None
_k8s_config_mod: Any = None
try:
    from kubernetes import client as _k8s_client_mod, config as _k8s_config_mod  # type: ignore
    _K8S_OK = True
except Exception:  # noqa: BLE001
    pass

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [WATCHDOG] %(message)s",
)
log = logging.getLogger("watchdog")

TARGET_CONTAINER = os.getenv("WATCHDOG_TARGET", "triumph-apex-services")
TARGET_HEALTH_URL = os.getenv(
    "WATCHDOG_TARGET_HEALTH_URL",
    "http://triumph-apex-services:8099/health",
)
INTERVAL_S = float(os.getenv("WATCHDOG_INTERVAL_S", "30"))
TIMEOUT_S = float(os.getenv("WATCHDOG_TIMEOUT_S", "10"))
FAILS_BEFORE_RESTART = int(os.getenv("WATCHDOG_FAILS_BEFORE_RESTART", "3"))
MAX_RESTARTS = int(os.getenv("WATCHDOG_MAX_RESTARTS", "5"))
WINDOW_S = float(os.getenv("WATCHDOG_WINDOW_S", "1800"))  # 30 min
# Grace period after container start/restart before probing begins (seconds).
# apex-services runs 18 supervisord sub-processes under QEMU and needs ~240s
# to fully bind all ports.  Probing before that causes a restart storm.
START_DELAY_S = float(os.getenv("WATCHDOG_START_DELAY_S", "270"))
PEER_HEARTBEAT_URL = os.getenv("WATCHDOG_PEER_HEARTBEAT_URL", "").strip()
K8S_MODE = os.getenv("WATCHDOG_K8S_MODE", "false").lower() == "true"
K8S_NAMESPACE = os.getenv("WATCHDOG_K8S_NAMESPACE", "triumph")
K8S_LABEL_SELECTOR = os.getenv("WATCHDOG_K8S_LABEL_SELECTOR", "app=triumph-apex-services")


def _k8s_init() -> None:
    global _k8s_core
    if _k8s_core is not None or not _K8S_OK:
        return
    try:
        _k8s_config_mod.load_incluster_config()
    except Exception:  # noqa: BLE001
        _k8s_config_mod.load_kube_config()
    _k8s_core = _k8s_client_mod.CoreV1Api()


def docker_client():
    if not _DOCKER_OK:
        raise RuntimeError("docker SDK unavailable")
    return docker_sdk.from_env()


def container_running(client, name: str) -> bool:
    if K8S_MODE:
        return _k8s_pod_running()
    try:
        c = client.containers.get(name)
        c.reload()
        return c.status == "running"
    except Exception as exc:  # noqa: BLE001
        log.warning("container lookup failed for %s: %s", name, exc)
        return False


def container_started_at(client, name: str) -> float:
    """Return the Unix timestamp when the container last started, or 0.0 on error."""
    if K8S_MODE:
        return 0.0
    try:
        c = client.containers.get(name)
        c.reload()
        started = c.attrs.get("State", {}).get("StartedAt", "")
        if started:
            # Docker returns RFC3339 nanoseconds: "2026-05-11T08:01:52.123456789Z"
            # Truncate to microseconds so fromisoformat handles it.
            started = started[:26].rstrip("Z")
            from datetime import datetime, timezone
            dt = datetime.fromisoformat(started).replace(tzinfo=timezone.utc)
            return dt.timestamp()
    except Exception as exc:  # noqa: BLE001
        log.debug("container_started_at failed for %s: %s", name, exc)
    return 0.0


def _k8s_pod_running() -> bool:
    try:
        _k8s_init()
        if _k8s_core is None:
            return False
        pods = _k8s_core.list_namespaced_pod(
            namespace=K8S_NAMESPACE, label_selector=K8S_LABEL_SELECTOR,
        )
        running = [p for p in pods.items if p.status.phase == "Running"]
        return len(running) > 0
    except Exception as exc:  # noqa: BLE001
        log.warning("k8s pod lookup failed: %s", exc)
        return False


def http_healthy(url: str) -> bool:
    try:
        with httpx.Client(timeout=TIMEOUT_S) as client:
            resp = client.get(url)
            return resp.status_code == 200
    except Exception as exc:  # noqa: BLE001
        log.warning("HTTP probe %s failed: %s", url, exc)
        return False


def restart_container(client, name: str) -> bool:
    if K8S_MODE:
        return _k8s_delete_pods()
    try:
        c = client.containers.get(name)
        log.warning("restarting %s (id=%s)", name, c.short_id)
        c.restart(timeout=20)
        return True
    except Exception as exc:  # noqa: BLE001
        log.error("restart failed for %s: %s", name, exc)
        return False


def _k8s_delete_pods() -> bool:
    """Delete the apex-services pod(s); the Deployment recreates them."""
    try:
        _k8s_init()
        if _k8s_core is None:
            return False
        pods = _k8s_core.list_namespaced_pod(
            namespace=K8S_NAMESPACE, label_selector=K8S_LABEL_SELECTOR,
        )
        deleted = 0
        for pod in pods.items:
            log.warning("deleting unhealthy pod %s/%s",
                        K8S_NAMESPACE, pod.metadata.name)
            _k8s_core.delete_namespaced_pod(
                name=pod.metadata.name, namespace=K8S_NAMESPACE,
            )
            deleted += 1
        return deleted > 0
    except Exception as exc:  # noqa: BLE001
        log.error("k8s pod delete failed: %s", exc)
        return False


def heartbeat() -> None:
    if not PEER_HEARTBEAT_URL:
        return
    try:
        with httpx.Client(timeout=5.0) as client:
            client.post(
                PEER_HEARTBEAT_URL,
                json={"watchdog": "alive", "ts": time.time(), "target": TARGET_CONTAINER},
            )
    except Exception:  # noqa: BLE001
        pass


def main() -> None:
    log.info(
        "starting — target=%s health=%s interval=%ss fails_before_restart=%s mode=%s",
        TARGET_CONTAINER, TARGET_HEALTH_URL, INTERVAL_S, FAILS_BEFORE_RESTART,
        "k8s" if K8S_MODE else "docker",
    )

    client = None if K8S_MODE else docker_client()
    consecutive_fails = 0
    restart_times: deque[float] = deque(maxlen=MAX_RESTARTS * 4)
    # Seed last_restart_time from the container's actual StartedAt so the grace
    # period is correct even when the watchdog starts long after the container.
    _initial_started = 0.0 if K8S_MODE else container_started_at(client, TARGET_CONTAINER)
    last_restart_time = _initial_started if _initial_started > 0 else time.time()
    log.info("initial container StartedAt=%.0f (grace expires in %.0fs)",
             last_restart_time, max(0, START_DELAY_S - (time.time() - last_restart_time)))

    while True:
        try:
            # Sync last_restart_time with the container's actual StartedAt.
            # This handles external restarts (Docker daemon, user, other tools)
            # so the grace period resets correctly regardless of restart source.
            if not K8S_MODE:
                actual_started = container_started_at(client, TARGET_CONTAINER)
                if actual_started > last_restart_time:
                    log.info("%s restarted externally at %.0f — resetting grace period",
                             TARGET_CONTAINER, actual_started)
                    last_restart_time = actual_started
                    consecutive_fails = 0

            # Skip probing during startup / post-restart grace period so that
            # slow-starting containers (e.g. apex-services with 18 sub-processes
            # under QEMU) are not restarted before they have bound their ports.
            grace_remaining = START_DELAY_S - (time.time() - last_restart_time)
            if grace_remaining > 0:
                log.info(
                    "%s in startup grace period — %.0fs remaining, skipping probe",
                    TARGET_CONTAINER, grace_remaining,
                )
                time.sleep(min(INTERVAL_S, grace_remaining))
                continue

            running = container_running(client, TARGET_CONTAINER)
            healthy = running and http_healthy(TARGET_HEALTH_URL)

            if healthy:
                if consecutive_fails:
                    log.info("%s recovered (was failing %d times)",
                             TARGET_CONTAINER, consecutive_fails)
                consecutive_fails = 0
            else:
                consecutive_fails += 1
                log.warning(
                    "%s unhealthy (running=%s) — strike %d/%d",
                    TARGET_CONTAINER, running, consecutive_fails, FAILS_BEFORE_RESTART,
                )

                if consecutive_fails >= FAILS_BEFORE_RESTART:
                    now = time.time()
                    while restart_times and now - restart_times[0] > WINDOW_S:
                        restart_times.popleft()
                    if len(restart_times) >= MAX_RESTARTS:
                        log.error(
                            "restart storm protection: %d restarts in %.0fs window — "
                            "skipping this restart cycle",
                            len(restart_times), WINDOW_S,
                        )
                    else:
                        if restart_container(client, TARGET_CONTAINER):
                            restart_times.append(now)
                            last_restart_time = time.time()
                        consecutive_fails = 0

            heartbeat()
        except Exception as exc:  # noqa: BLE001
            log.error("watchdog loop error: %s", exc)

        time.sleep(INTERVAL_S)


if __name__ == "__main__":
    main()

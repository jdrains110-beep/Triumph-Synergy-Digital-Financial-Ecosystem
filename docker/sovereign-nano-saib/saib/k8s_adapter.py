"""
Kubernetes / Cloud-Native Adapter — SAIB v5
──────────────────────────────────────────────────────────────────────────────
Sovereign-grade Kubernetes integration: watch pod lifecycle events, detect
crash loops and OOM kills, pull pod logs, and issue rolling restarts — all
via the Kubernetes REST API (no kubectl binary required).

Supports both:
  • In-cluster  — service account token auto-mounted at
                  /var/run/secrets/kubernetes.io/serviceaccount/
  • Out-of-cluster — KUBECONFIG or explicit api_server + token per tenant

K8s Event severity mapping
──────────────────────────
  CrashLoopBackOff → CRITICAL
  OOMKilled        → CRITICAL
  BackOff          → HIGH
  Failed / Error   → HIGH
  Pending > 5min   → MEDIUM
  Evicted          → MEDIUM
  ImagePullBackOff → HIGH
  Warning          → LOW

Design
──────
  • No kubernetes SDK dependency (avoids large wheels) — pure aiohttp + REST
  • Optional: if `kubernetes` pip package is installed, use it for watch/stream
  • Singleton K8sAdapter with per-tenant namespace scoping
  • Background watcher loop: polls events every 60s, pushes to event buffer
  • heal_k8s_deployment() issues a rolling restart via /rollout/restart
"""
from __future__ import annotations

import asyncio
import json
import logging
import os
import time
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

import aiohttp

log = logging.getLogger("saib.k8s_adapter")

# ── K8s connection config ────────────────────────────────────────────────────

K8S_API_SERVER = os.getenv(
    "KUBERNETES_API_SERVER",
    "https://kubernetes.default.svc",
)
K8S_TOKEN_FILE = "/var/run/secrets/kubernetes.io/serviceaccount/token"
K8S_CA_FILE    = "/var/run/secrets/kubernetes.io/serviceaccount/ca.crt"

POLL_INTERVAL_S = int(os.getenv("SAIB_K8S_POLL_S", "60"))
EVENT_BUFFER_MAX = 500

# ── event severity map ────────────────────────────────────────────────────────

_REASON_SEVERITY: Dict[str, str] = {
    "CrashLoopBackOff":  "CRITICAL",
    "OOMKilled":         "CRITICAL",
    "BackOff":           "HIGH",
    "Failed":            "HIGH",
    "Error":             "HIGH",
    "ImagePullBackOff":  "HIGH",
    "ErrImageNeverPull": "HIGH",
    "Evicted":           "MEDIUM",
    "Preempted":         "MEDIUM",
    "Pending":           "MEDIUM",
    "Warning":           "LOW",
    "Killing":           "LOW",
    "Pulled":            "INFO",
    "Scheduled":         "INFO",
    "Started":           "INFO",
}


# ── data models ──────────────────────────────────────────────────────────────

@dataclass
class K8sEvent:
    namespace:  str
    pod:        str
    container:  str
    reason:     str
    message:    str
    severity:   str
    ts:         float = field(default_factory=time.time)
    count:      int   = 1
    kind:       str   = "Pod"


@dataclass
class K8sPodStatus:
    namespace:  str
    name:       str
    phase:      str          # Running | Pending | Failed | Succeeded | Unknown
    ready:      bool
    restarts:   int
    node:       str
    containers: List[dict]   # [{name, image, state, restarts}]
    ts:         float = field(default_factory=time.time)


# ── adapter ──────────────────────────────────────────────────────────────────

class K8sAdapter:
    """
    Sovereign Kubernetes adapter for SAIB v5.
    Connects in-cluster or with explicit credentials per tenant.
    """

    def __init__(self) -> None:
        self._event_buffer: List[K8sEvent] = []
        self._lock = asyncio.Lock()
        self._watcher_task: Optional[asyncio.Task] = None
        self._in_cluster_token: str = _load_in_cluster_token()
        log.info(
            "K8sAdapter: online (in-cluster=%s)",
            bool(self._in_cluster_token),
        )

    def boot(self) -> None:
        """Start background event watcher if in-cluster token is available."""
        if self._in_cluster_token:
            try:
                loop = asyncio.get_event_loop()
                self._watcher_task = loop.create_task(
                    self._background_watcher(K8S_API_SERVER, self._in_cluster_token)
                )
                log.info("K8sAdapter: background watcher started")
            except RuntimeError:
                log.info("K8sAdapter: no running loop — watcher not started")

    async def _background_watcher(self, api_server: str, token: str) -> None:
        while True:
            try:
                events = await self.list_events(
                    api_server = api_server,
                    namespace  = "",
                    token      = token,
                    all_namespaces = True,
                )
                async with self._lock:
                    for ev in events:
                        if ev.severity in ("CRITICAL", "HIGH"):
                            self._event_buffer.append(ev)
                    if len(self._event_buffer) > EVENT_BUFFER_MAX:
                        del self._event_buffer[:-EVENT_BUFFER_MAX]
            except Exception as exc:
                log.debug("K8sAdapter watcher error: %s", exc)
            await asyncio.sleep(POLL_INTERVAL_S)

    # ── pod listing & status ──────────────────────────────────────────────────

    async def list_pods(
        self,
        api_server:     str,
        namespace:      str,
        token:          str,
        label_selector: str = "",
        ssl_verify:     bool = False,
    ) -> List[K8sPodStatus]:
        url  = f"{api_server}/api/v1/namespaces/{namespace}/pods"
        params: Dict[str, str] = {}
        if label_selector:
            params["labelSelector"] = label_selector

        headers = _auth_headers(token)
        pods = []
        try:
            async with aiohttp.ClientSession(
                timeout   = aiohttp.ClientTimeout(total=15),
                connector = aiohttp.TCPConnector(ssl=ssl_verify),
            ) as sess:
                async with sess.get(url, headers=headers, params=params) as resp:
                    if resp.status != 200:
                        log.debug("K8s list_pods: HTTP %d", resp.status)
                        return []
                    data = await resp.json()
                    for item in data.get("items", []):
                        pods.append(_parse_pod(item, namespace))
        except Exception as exc:
            log.debug("K8s list_pods: %s", exc)
        return pods

    # ── event listing ─────────────────────────────────────────────────────────

    async def list_events(
        self,
        api_server:     str,
        namespace:      str,
        token:          str,
        all_namespaces: bool = False,
        field_selector: str  = "type=Warning",
        ssl_verify:     bool = False,
    ) -> List[K8sEvent]:
        if all_namespaces:
            url = f"{api_server}/api/v1/events"
        else:
            url = f"{api_server}/api/v1/namespaces/{namespace}/events"

        params: Dict[str, str] = {}
        if field_selector:
            params["fieldSelector"] = field_selector

        headers = _auth_headers(token)
        events: List[K8sEvent] = []
        try:
            async with aiohttp.ClientSession(
                timeout   = aiohttp.ClientTimeout(total=15),
                connector = aiohttp.TCPConnector(ssl=ssl_verify),
            ) as sess:
                async with sess.get(url, headers=headers, params=params) as resp:
                    if resp.status != 200:
                        return []
                    data = await resp.json()
                    for item in data.get("items", []):
                        ev = _parse_event(item)
                        if ev:
                            events.append(ev)
        except Exception as exc:
            log.debug("K8s list_events: %s", exc)
        return events

    # ── pod log fetch ─────────────────────────────────────────────────────────

    async def get_pod_logs(
        self,
        api_server: str,
        namespace:  str,
        pod_name:   str,
        token:      str,
        container:  str = "",
        tail:       int = 200,
        ssl_verify: bool = False,
    ) -> str:
        url = (
            f"{api_server}/api/v1/namespaces/{namespace}"
            f"/pods/{pod_name}/log?tailLines={tail}"
        )
        if container:
            url += f"&container={container}"

        headers = _auth_headers(token)
        try:
            async with aiohttp.ClientSession(
                timeout   = aiohttp.ClientTimeout(total=15),
                connector = aiohttp.TCPConnector(ssl=ssl_verify),
            ) as sess:
                async with sess.get(url, headers=headers) as resp:
                    if resp.status != 200:
                        return f"[log fetch failed: HTTP {resp.status}]"
                    return await resp.text()
        except Exception as exc:
            return f"[log fetch error: {exc}]"

    # ── rolling restart ───────────────────────────────────────────────────────

    async def restart_deployment(
        self,
        api_server:     str,
        namespace:      str,
        deployment:     str,
        token:          str,
        ssl_verify:     bool = False,
    ) -> bool:
        """
        Trigger a rolling restart of a Kubernetes Deployment by patching
        the pod template's restart annotation with the current timestamp.
        """
        url     = (
            f"{api_server}/apis/apps/v1/namespaces/{namespace}"
            f"/deployments/{deployment}"
        )
        patch   = {
            "spec": {
                "template": {
                    "metadata": {
                        "annotations": {
                            "kubectl.kubernetes.io/restartedAt":
                                time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
                        }
                    }
                }
            }
        }
        headers = {**_auth_headers(token), "Content-Type": "application/strategic-merge-patch+json"}
        try:
            async with aiohttp.ClientSession(
                timeout   = aiohttp.ClientTimeout(total=20),
                connector = aiohttp.TCPConnector(ssl=ssl_verify),
            ) as sess:
                async with sess.patch(url, headers=headers, json=patch) as resp:
                    ok = resp.status in (200, 201)
                    log.info(
                        "K8s rolling restart %s/%s: HTTP %d",
                        namespace, deployment, resp.status,
                    )
                    return ok
        except Exception as exc:
            log.error("K8s restart_deployment: %s", exc)
            return False

    # ── high-level helpers ────────────────────────────────────────────────────

    async def detect_unhealthy_pods(
        self,
        api_server: str,
        namespace:  str,
        token:      str,
    ) -> List[K8sPodStatus]:
        """Return pods with crash loops, OOM kills, or repeated restarts."""
        pods = await self.list_pods(api_server, namespace, token)
        return [
            p for p in pods
            if (
                p.phase in ("Failed", "Unknown")
                or p.restarts >= 3
                or not p.ready
            )
        ]

    async def get_critical_events(
        self,
        api_server: str,
        namespace:  str,
        token:      str,
    ) -> List[K8sEvent]:
        events = await self.list_events(api_server, namespace, token)
        return [e for e in events if e.severity in ("CRITICAL", "HIGH")]

    def get_buffered_events(self, severity: str = "") -> List[dict]:
        """Return buffered events from the background watcher."""
        evs = self._event_buffer
        if severity:
            evs = [e for e in evs if e.severity == severity]
        return [
            {
                "namespace": e.namespace,
                "pod":       e.pod,
                "reason":    e.reason,
                "message":   e.message,
                "severity":  e.severity,
                "ts":        e.ts,
            }
            for e in evs[-100:]
        ]

    def stats(self) -> dict:
        return {
            "buffered_events":   len(self._event_buffer),
            "in_cluster":        bool(self._in_cluster_token),
            "watcher_running":   self._watcher_task is not None and not (
                self._watcher_task.done() if self._watcher_task else True
            ),
            "critical_buffered": sum(
                1 for e in self._event_buffer if e.severity == "CRITICAL"
            ),
        }


# ── parsers ───────────────────────────────────────────────────────────────────

def _parse_event(item: dict) -> Optional[K8sEvent]:
    try:
        reason    = item.get("reason", "")
        message   = item.get("message", "")
        count     = item.get("count", 1) or 1
        severity  = _REASON_SEVERITY.get(reason, "LOW")
        ns        = item.get("metadata", {}).get("namespace", "")
        involved  = item.get("involvedObject", {})
        pod       = involved.get("name", "")
        container = ""
        # extract container from message if possible
        if "container" in message.lower():
            import re
            m = re.search(r'container[:\s]+([a-z0-9\-]+)', message, re.IGNORECASE)
            if m:
                container = m.group(1)
        return K8sEvent(
            namespace = ns,
            pod       = pod,
            container = container,
            reason    = reason,
            message   = message[:500],
            severity  = severity,
            count     = count,
        )
    except Exception:
        return None


def _parse_pod(item: dict, namespace: str) -> K8sPodStatus:
    meta      = item.get("metadata", {})
    spec      = item.get("spec", {})
    status    = item.get("status", {})
    phase     = status.get("phase", "Unknown")
    node      = spec.get("nodeName", "")
    name      = meta.get("name", "")

    total_restarts = 0
    ready_count    = 0
    containers     = []
    for cs in status.get("containerStatuses", []):
        restarts       = cs.get("restartCount", 0)
        total_restarts += restarts
        is_ready        = cs.get("ready", False)
        if is_ready:
            ready_count += 1
        state = cs.get("state", {})
        containers.append({
            "name":      cs.get("name", ""),
            "image":     cs.get("image", ""),
            "ready":     is_ready,
            "restarts":  restarts,
            "state":     list(state.keys())[0] if state else "unknown",
        })
    ready = ready_count > 0 and ready_count == len(containers)
    return K8sPodStatus(
        namespace  = namespace,
        name       = name,
        phase      = phase,
        ready      = ready,
        restarts   = total_restarts,
        node       = node,
        containers = containers,
    )


# ── helpers ──────────────────────────────────────────────────────────────────

def _auth_headers(token: str) -> dict:
    if token:
        return {"Authorization": f"Bearer {token}", "Accept": "application/json"}
    return {"Accept": "application/json"}


def _load_in_cluster_token() -> str:
    if os.path.exists(K8S_TOKEN_FILE):
        try:
            with open(K8S_TOKEN_FILE) as f:
                return f.read().strip()
        except Exception:
            pass
    return ""


# ── singleton ─────────────────────────────────────────────────────────────────
k8s_adapter = K8sAdapter()

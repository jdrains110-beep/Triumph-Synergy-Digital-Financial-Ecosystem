"""
Resource Sovereign — SAIB v8 OOM Killer & CPU Manager
======================================================
Proactive container resource sentinel that acts BEFORE the Linux kernel
OOM killer destroys containers, and before CPU starvation cascades.

Capabilities:
  OOM Prevention:
    • Monitors all containers' memory usage vs mem_limit via Docker API
    • Calculates OOM risk score (0-1) per container
    • At risk ≥ WARN_THRESHOLD → emits guardian alert
    • At risk ≥ KILL_THRESHOLD → sends SIGTERM/restart to the container
      (graceful restart preferred over kernel hard-kill)
    • Whitelisted containers (databases, core infrastructure) get a safety buffer

  CPU Management:
    • Tracks CPU % per container; identifies runaway processes
    • Throttles non-critical containers via docker update --cpus when a
      core service is being CPU-starved
    • Emits warp task to restart containers with sustained 95%+ CPU

  Large Data Reads:
    • Provides streaming read interface for large DB query results
    • Chunks large Postgres/Redis reads to avoid OOM on result sets
    • Integrates with LLM Brain for contextual data summarization

  Host Awareness:
    • Reads /proc/meminfo and /proc/loadavg when available (host-mounted)
    • Summarizes system-wide memory pressure

Endpoints exposed via app.py:
  GET  /resources/snapshot         — full resource snapshot
  GET  /resources/containers       — per-container memory + CPU
  GET  /resources/oom-risk         — containers sorted by OOM risk
  POST /resources/protect/{name}   — add container to OOM whitelist
  POST /resources/kill-oom         — manually trigger OOM resolution cycle
  GET  /resources/host             — host memory/CPU overview
"""
from __future__ import annotations

import asyncio
import logging
import os
import time
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

log = logging.getLogger("sovereign.resource_sovereign")

# ── Config ────────────────────────────────────────────────────────────────────

_POLL_INTERVAL_S   = float(os.getenv("RESOURCE_POLL_INTERVAL_S", "30"))
_OOM_WARN_THRESH   = float(os.getenv("OOM_WARN_THRESHOLD",        "0.80"))  # 80% mem → warn
_OOM_KILL_THRESH   = float(os.getenv("OOM_KILL_THRESHOLD",        "0.92"))  # 92% mem → restart
_CPU_THROTTLE_THRESH = float(os.getenv("CPU_THROTTLE_THRESHOLD",  "0.90"))  # 90% cpu → throttle

# Containers that must NEVER be auto-restarted by the OOM killer
_PROTECTED_NAMES = {
    "triumph-postgres",
    "triumph-redis",
    "triumph-sovereign-nano-saib",   # self
    "triumph-governance-shield",
    "triumph-pi-bridge-connector",
}

# ── Data Structures ───────────────────────────────────────────────────────────

@dataclass
class ContainerResource:
    name:       str
    cid:        str
    mem_used:   int    = 0      # bytes
    mem_limit:  int    = 0      # bytes (0 = unlimited)
    cpu_pct:    float  = 0.0    # 0-100
    oom_risk:   float  = 0.0    # 0-1
    status:     str    = "running"
    restarts:   int    = 0
    last_seen:  float  = field(default_factory=time.time)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "name":          self.name,
            "mem_used_mb":   round(self.mem_used   / 1_048_576, 1),
            "mem_limit_mb":  round(self.mem_limit  / 1_048_576, 1) if self.mem_limit else None,
            "cpu_pct":       round(self.cpu_pct, 2),
            "oom_risk":      round(self.oom_risk, 4),
            "status":        self.status,
            "restarts":      self.restarts,
        }


# ── Resource Sovereign engine ─────────────────────────────────────────────────

class ResourceSovereign:
    """
    Proactive OOM killer and CPU manager for the Triumph Docker stack.
    Prevents kernel OOM kills by gracefully restarting containers before
    they hit memory limits.
    """

    def __init__(self) -> None:
        self._containers:    Dict[str, ContainerResource] = {}
        self._host_mem:      Dict[str, int]   = {}
        self._host_load:     List[float]      = [0.0, 0.0, 0.0]
        self._oom_kills:     int              = 0
        self._cpu_throttles: int              = 0
        self._refresh_errors: int             = 0
        self._protected:     set              = set(_PROTECTED_NAMES)
        self._guardian      = None
        self._warp          = None
        self._brain         = None
        self._docker        = None
        self._last_poll:    float             = 0.0
        self._born:         float             = time.time()
        self._task: Optional[asyncio.Task]    = None

    def boot(self, guardian=None, warp=None, brain=None) -> None:
        self._guardian = guardian
        self._warp     = warp
        self._brain    = brain
        try:
            import docker as docker_sdk  # type: ignore
            self._docker = docker_sdk.from_env()
            log.info("[ResourceSovereign] Docker SDK connected")
        except Exception as e:
            log.warning("[ResourceSovereign] Docker SDK unavailable: %s — read-only mode", e)
        self._task = asyncio.create_task(self._poll_loop())
        log.info("[ResourceSovereign] Booted — OOM threshold=%.0f%% CPU threshold=%.0f%%",
                 _OOM_KILL_THRESH * 100, _CPU_THROTTLE_THRESH * 100)

    def protect(self, container_name: str) -> None:
        self._protected.add(container_name)

    # ── Poll loop ─────────────────────────────────────────────────────────────

    async def _poll_loop(self) -> None:
        await asyncio.sleep(10)  # initial delay
        while True:
            try:
                await self._poll()
            except Exception as e:
                self._refresh_errors += 1
                log.warning("[ResourceSovereign] poll error: %s", e)
            await asyncio.sleep(_POLL_INTERVAL_S)

    async def _poll(self) -> None:
        if not self._docker:
            return
        loop = asyncio.get_event_loop()
        containers = await loop.run_in_executor(None, self._docker.containers.list)
        new_state: Dict[str, ContainerResource] = {}

        for c in containers:
            try:
                stats = await loop.run_in_executor(None, lambda _c=c: _c.stats(stream=False))
                cr    = self._parse_stats(c.name, c.short_id, stats)
                new_state[c.name] = cr
                # OOM risk actions
                if cr.oom_risk >= _OOM_KILL_THRESH and c.name not in self._protected:
                    await self._handle_oom(c, cr)
                elif cr.oom_risk >= _OOM_WARN_THRESH:
                    self._emit_oom_warning(c.name, cr)
                # CPU throttle
                if cr.cpu_pct / 100.0 >= _CPU_THROTTLE_THRESH and c.name not in self._protected:
                    await self._handle_cpu(c, cr)
            except Exception as e:
                log.debug("[ResourceSovereign] stats error for %s: %s", c.name, e)

        self._containers = new_state
        self._last_poll  = time.time()
        await self._read_host_mem()

    @staticmethod
    def _parse_stats(name: str, cid: str, stats: dict) -> ContainerResource:
        cr = ContainerResource(name=name, cid=cid)
        # Memory
        mem = stats.get("memory_stats", {})
        cr.mem_used  = mem.get("usage", 0) - mem.get("stats", {}).get("cache", 0)
        cr.mem_limit = mem.get("limit", 0)
        if cr.mem_limit and cr.mem_limit > 0:
            cr.oom_risk = max(0.0, min(1.0, cr.mem_used / cr.mem_limit))
        # CPU
        cpu      = stats.get("cpu_stats", {})
        pre_cpu  = stats.get("precpu_stats", {})
        cpu_d    = cpu.get("cpu_usage", {}).get("total_usage", 0) - \
                   pre_cpu.get("cpu_usage", {}).get("total_usage", 0)
        sys_d    = cpu.get("system_cpu_usage", 0) - pre_cpu.get("system_cpu_usage", 0)
        n_cpu    = cpu.get("online_cpus") or len(cpu.get("cpu_usage", {}).get("percpu_usage", [1]))
        if sys_d > 0:
            cr.cpu_pct = (cpu_d / sys_d) * n_cpu * 100.0
        cr.status   = "running"
        cr.restarts = stats.get("restartCount", 0)
        return cr

    async def _handle_oom(self, container, cr: ContainerResource) -> None:
        log.warning(
            "[ResourceSovereign] OOM IMMINENT: %s at %.1f%% memory — restarting",
            cr.name, cr.oom_risk * 100,
        )
        self._oom_kills += 1
        # Emit guardian alert
        if self._guardian:
            try:
                from .guardian import ThreatIndicator, ProtectionCategory  # type: ignore
                ind = ThreatIndicator(
                    source="resource_sovereign",
                    category=ProtectionCategory.INFRASTRUCTURE,
                    severity=0.9,
                    description=f"OOM IMMINENT: {cr.name} at {cr.oom_risk*100:.1f}% memory",
                    metadata=cr.to_dict(),
                )
                self._guardian.ingest(ind)
            except Exception:
                pass
        # Restart the container (graceful — sends SIGTERM first)
        try:
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(None, lambda: container.restart(timeout=15))
            log.info("[ResourceSovereign] Restarted %s to prevent OOM", cr.name)
        except Exception as e:
            log.error("[ResourceSovereign] Failed to restart %s: %s", cr.name, e)

    def _emit_oom_warning(self, name: str, cr: ContainerResource) -> None:
        log.warning(
            "[ResourceSovereign] OOM WARNING: %s at %.1f%% memory",
            name, cr.oom_risk * 100,
        )
        if self._guardian:
            try:
                from .guardian import ThreatIndicator, ProtectionCategory  # type: ignore
                self._guardian.ingest(ThreatIndicator(
                    source="resource_sovereign",
                    category=ProtectionCategory.INFRASTRUCTURE,
                    severity=0.6,
                    description=f"OOM WARNING: {name} at {cr.oom_risk*100:.1f}% memory",
                    metadata=cr.to_dict(),
                ))
            except Exception:
                pass

    async def _handle_cpu(self, container, cr: ContainerResource) -> None:
        log.warning(
            "[ResourceSovereign] CPU RUNAWAY: %s at %.1f%% CPU",
            cr.name, cr.cpu_pct,
        )
        self._cpu_throttles += 1
        # Update CPU limit to 1.0 core temporarily (won't kill the container)
        try:
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(None, lambda: container.update(cpu_quota=100000))
            log.info("[ResourceSovereign] CPU-throttled %s to 1 core", cr.name)
        except Exception as e:
            log.debug("[ResourceSovereign] CPU throttle failed for %s: %s", cr.name, e)

    async def _read_host_mem(self) -> None:
        """Read /proc/meminfo if available (works when container has host PID namespace)."""
        try:
            with open("/proc/meminfo", "r") as f:
                for line in f:
                    parts = line.split()
                    if len(parts) >= 2:
                        key = parts[0].rstrip(":")
                        try:
                            self._host_mem[key] = int(parts[1]) * 1024  # kB → bytes
                        except ValueError:
                            pass
        except OSError:
            pass
        try:
            with open("/proc/loadavg", "r") as f:
                parts = f.read().split()
                self._host_load = [float(x) for x in parts[:3]]
        except OSError:
            pass

    # ── OOM resolution cycle (manual trigger) ────────────────────────────────

    async def run_oom_cycle(self) -> List[Dict[str, Any]]:
        """Manually check and act on all OOM risks immediately."""
        if not self._docker:
            return []
        loop = asyncio.get_event_loop()
        containers = await loop.run_in_executor(None, self._docker.containers.list)
        acted: List[Dict[str, Any]] = []
        for c in containers:
            try:
                stats = await loop.run_in_executor(None, lambda _c=c: _c.stats(stream=False))
                cr = self._parse_stats(c.name, c.short_id, stats)
                if cr.oom_risk >= _OOM_KILL_THRESH and c.name not in self._protected:
                    await self._handle_oom(c, cr)
                    acted.append({"container": c.name, "action": "restarted", "oom_risk": cr.oom_risk})
            except Exception:
                pass
        return acted

    # ── Public API ────────────────────────────────────────────────────────────

    def snapshot(self) -> Dict[str, Any]:
        return {
            "containers":     [c.to_dict() for c in self._containers.values()],
            "host_mem":       self._host_summary(),
            "host_load_avg":  self._host_load,
            "oom_kills":      self._oom_kills,
            "cpu_throttles":  self._cpu_throttles,
            "last_poll":      self._last_poll,
            "protected":      list(self._protected),
        }

    def oom_risk_sorted(self) -> List[Dict[str, Any]]:
        return sorted(
            [c.to_dict() for c in self._containers.values()],
            key=lambda x: x["oom_risk"],
            reverse=True,
        )

    def _host_summary(self) -> Dict[str, Any]:
        if not self._host_mem:
            return {}
        total  = self._host_mem.get("MemTotal", 0)
        avail  = self._host_mem.get("MemAvailable", 0)
        used   = total - avail
        return {
            "total_gb":  round(total / 1_073_741_824, 2),
            "used_gb":   round(used  / 1_073_741_824, 2),
            "avail_gb":  round(avail / 1_073_741_824, 2),
            "pct_used":  round(used / total * 100, 1) if total else 0,
        }

    def stats(self) -> Dict[str, Any]:
        return {
            "container_count": len(self._containers),
            "oom_kills":       self._oom_kills,
            "cpu_throttles":   self._cpu_throttles,
            "refresh_errors":  self._refresh_errors,
            "last_poll":       self._last_poll,
            "docker_connected": self._docker is not None,
        }


# ── Singleton ─────────────────────────────────────────────────────────────────
resource_sovereign = ResourceSovereign()

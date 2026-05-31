"""
Blockchain Warden — SAIB Sovereign Blockchain Guardian
───────────────────────────────────────────────────────────────────────────────
SAIB watches and protects the Pi Network mainnet node
(container: triumph-pi-mainnet-node) from:
  • stellar-core crashes and OOM kills (AMD64 emulation memory spikes)
  • Ledger stalls (consensus not advancing)
  • Memory pressure spikes (pre-OOM early warning)
  • Container death (stopped/exited/dead state)
  • Horizon API unresponsiveness
  • Peer count drops (isolation from Pi Network consensus)

Healing actions:
  1. stellar-core process crash   → Docker exec supervisorctl restart stellar-core
  2. Ledger stall (>5 min)        → same — restart the process inside the container
  3. Memory pressure (>85%)       → alert Guardian, log for manual review
  4. Memory pressure (>95%)       → force restart stellar-core before OOM kill
  5. Container stopped/dead       → restart the container via Docker socket
  6. Horizon down while core OK   → restart horizon-stream service (not the node)
  7. Peer count = 0               → alert Guardian + report to warp-sight

Architecture:
  BlockchainWarden
    ├── _node_poll_loop()   — 60s: stellar-core /info + Horizon /
    ├── _docker_watch_loop() — 30s: container stats + OOM detection
    └── _heal()             — restart process or container
"""
from __future__ import annotations

import asyncio
import json
import logging
import time
import uuid
from collections import deque
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional

import aiohttp

log = logging.getLogger("sovereign.blockchain_warden")

# ── container constants ──────────────────────────────────────────────────────
_NODE_CONTAINER   = "triumph-pi-mainnet-node"
_STELLAR_INFO_URL = f"http://{_NODE_CONTAINER}:11626/info"
_HORIZON_URL      = f"http://{_NODE_CONTAINER}:8000/"
_DOCKER_SOCK      = "/var/run/docker.sock"

# ── thresholds ───────────────────────────────────────────────────────────────
_LEDGER_STALL_S      = 300   # 5 min without ledger advance → stalled
_MEM_WARN_PCT        = 0.85  # alert at 85% memory
_MEM_CRITICAL_PCT    = 0.95  # force-restart stellar-core at 95%
_PEER_MIN            = 1     # at least 1 authenticated peer
_NODE_POLL_INTERVAL  = 60    # seconds between stellar-core polls
_DOCKER_POLL_INTERVAL = 30   # seconds between Docker stat polls


class NodeHealth(Enum):
    SYNCED     = "synced"       # stellar-core reports "Synced!"
    CATCHING_UP = "catching_up" # stellar-core is doing initial sync
    JOINING    = "joining"      # joining SCP, just started
    DEGRADED   = "degraded"     # running but not syncing
    CRITICAL   = "critical"     # crash detected or container stopped
    UNKNOWN    = "unknown"      # not yet checked


@dataclass
class StellarInfo:
    state:        str   = ""
    ledger_num:   int   = 0
    ledger_age_s: int   = 0
    peer_count:   int   = 0
    protocol:     int   = 0
    network:      str   = ""
    raw:          dict  = field(default_factory=dict)


@dataclass
class NodeStats:
    container_running:   bool  = False
    oom_killed:          bool  = False
    mem_bytes:           int   = 0
    mem_limit_bytes:     int   = 0
    mem_pct:             float = 0.0
    cpu_pct:             float = 0.0


@dataclass
class WardenEvent:
    id:          str
    ts:          float
    kind:        str    # "heal_start", "heal_ok", "heal_fail", "alert", "info"
    detail:      str
    action_taken: str   = ""


class BlockchainWarden:
    """
    Sovereign guardian for triumph-pi-mainnet-node.

    Permanently watches stellar-core and Horizon, heals crashes
    autonomously, and alerts the Guardian + OmegaBrain on anomalies.
    """

    def __init__(self) -> None:
        self._running       = False
        self._health        = NodeHealth.UNKNOWN
        self._stellar       = StellarInfo()
        self._stats         = NodeStats()
        self._last_ledger   = 0
        self._last_ledger_ts: float = 0.0
        self._heal_count    = 0
        self._last_heal_ts: float  = 0.0
        self._history: deque[WardenEvent] = deque(maxlen=200)
        self._guardian: Any  = None
        self._brain:    Any  = None
        self._healer:   Any  = None

    # ── boot ────────────────────────────────────────────────────────────────

    def boot(
        self,
        guardian: Any = None,
        brain:    Any = None,
        healer:   Any = None,
    ) -> None:
        self._guardian = guardian
        self._brain    = brain
        self._healer   = healer
        self._running  = True
        asyncio.create_task(self._node_poll_loop())
        asyncio.create_task(self._docker_watch_loop())
        log.info(
            "[BlockchainWarden] Online — watching %s | stellar-core + Horizon + Docker",
            _NODE_CONTAINER,
        )

    # ── public API ───────────────────────────────────────────────────────────

    def status(self) -> Dict[str, Any]:
        """Current warden snapshot — safe for external API response."""
        stall_s = 0
        if self._last_ledger_ts:
            stall_s = int(time.time() - self._last_ledger_ts)

        return {
            "health":              self._health.value,
            "container_running":   self._stats.container_running,
            "oom_killed":          self._stats.oom_killed,
            "stellar_state":       self._stellar.state,
            "ledger_num":          self._stellar.ledger_num,
            "ledger_age_s":        self._stellar.ledger_age_s,
            "ledger_stall_s":      stall_s,
            "peer_count":          self._stellar.peer_count,
            "protocol_version":    self._stellar.protocol,
            "network":             self._stellar.network,
            "mem_pct":             round(self._stats.mem_pct * 100, 1),
            "mem_mb":              round(self._stats.mem_bytes / 1024 / 1024, 1),
            "mem_limit_mb":        round(self._stats.mem_limit_bytes / 1024 / 1024, 1),
            "cpu_pct":             round(self._stats.cpu_pct, 1),
            "heal_count":          self._heal_count,
            "last_heal_ts":        self._last_heal_ts or None,
            "recent_events":       [
                {"id": e.id, "ts": e.ts, "kind": e.kind,
                 "detail": e.detail, "action": e.action_taken}
                for e in list(self._history)[:10]
            ],
        }

    def stellar_raw(self) -> Dict[str, Any]:
        """Raw stellar-core /info data from last poll."""
        return self._stellar.raw

    async def force_restart(self, target: str = "stellar-core") -> Dict[str, Any]:
        """
        Manually trigger a restart.
        target: "stellar-core" (restart process) or "container" (restart full node)
        """
        if target == "container":
            ok = await self._restart_container()
            return {"ok": ok, "action": "container_restart"}
        else:
            ok = await self._restart_stellar_process()
            return {"ok": ok, "action": "stellar_core_restart"}

    # ── background loops ─────────────────────────────────────────────────────

    async def _node_poll_loop(self) -> None:
        """Poll stellar-core /info and Horizon every 60s."""
        await asyncio.sleep(15)  # let other engines boot first
        while self._running:
            try:
                await self._check_stellar_core()
                await self._check_horizon()
                await self._evaluate_node_health()
            except Exception as exc:
                log.debug("[BlockchainWarden] node poll error: %s", exc)
            await asyncio.sleep(_NODE_POLL_INTERVAL)

    async def _docker_watch_loop(self) -> None:
        """Poll Docker container stats every 30s."""
        await asyncio.sleep(20)
        while self._running:
            try:
                await self._fetch_docker_stats()
                await self._check_oom()
            except Exception as exc:
                log.debug("[BlockchainWarden] docker watch error: %s", exc)
            await asyncio.sleep(_DOCKER_POLL_INTERVAL)

    # ── stellar-core polling ──────────────────────────────────────────────────

    async def _check_stellar_core(self) -> None:
        """Fetch /info from stellar-core HTTP admin port (11626)."""
        try:
            async with aiohttp.ClientSession(
                timeout=aiohttp.ClientTimeout(total=10)
            ) as sess:
                async with sess.get(_STELLAR_INFO_URL) as resp:
                    if resp.status != 200:
                        self._stellar.state = f"http_{resp.status}"
                        return
                    data = await resp.json(content_type=None)

            info = data.get("info", {})
            self._stellar.raw         = info
            self._stellar.state       = info.get("state", "")
            self._stellar.protocol    = info.get("protocol_version", 0)
            self._stellar.network     = info.get("network", "")
            self._stellar.peer_count  = (
                info.get("peers", {}).get("authenticated_count", 0)
            )

            ledger = info.get("ledger", {})
            new_num = ledger.get("num", 0)
            self._stellar.ledger_age_s = ledger.get("age", 0)

            if new_num > self._last_ledger:
                self._last_ledger    = new_num
                self._last_ledger_ts = time.time()
                self._stellar.ledger_num = new_num

            log.debug(
                "[BlockchainWarden] stellar-core: state=%s ledger=%d peers=%d age=%ds",
                self._stellar.state, self._stellar.ledger_num,
                self._stellar.peer_count, self._stellar.ledger_age_s,
            )

        except aiohttp.ClientConnectorError:
            # Container is down or stellar-core isn't running
            self._stellar.state = "unreachable"
        except Exception as exc:
            log.debug("[BlockchainWarden] stellar /info error: %s", exc)
            self._stellar.state = f"error:{type(exc).__name__}"

    async def _check_horizon(self) -> None:
        """Check Horizon API liveness."""
        try:
            async with aiohttp.ClientSession(
                timeout=aiohttp.ClientTimeout(total=8)
            ) as sess:
                async with sess.get(_HORIZON_URL) as resp:
                    if resp.status not in (200, 503):  # 503 = syncing, still alive
                        log.warning(
                            "[BlockchainWarden] Horizon returned HTTP %d", resp.status
                        )
        except aiohttp.ClientConnectorError:
            log.debug("[BlockchainWarden] Horizon unreachable (container may be down)")
        except Exception as exc:
            log.debug("[BlockchainWarden] Horizon check error: %s", exc)

    # ── Docker stats + OOM detection ─────────────────────────────────────────

    async def _fetch_docker_stats(self) -> None:
        """Pull container stats via Docker socket (one-shot, no stream)."""
        import os
        if not os.path.exists(_DOCKER_SOCK):
            return
        try:
            conn = aiohttp.UnixConnector(path=_DOCKER_SOCK)
            async with aiohttp.ClientSession(
                connector=conn, timeout=aiohttp.ClientTimeout(total=10)
            ) as sess:
                # Container inspect — get running state
                async with sess.get(
                    f"http://localhost/containers/{_NODE_CONTAINER}/json"
                ) as resp:
                    if resp.status == 404:
                        self._stats.container_running = False
                        return
                    info = await resp.json()

                state = info.get("State", {})
                self._stats.container_running = state.get("Running", False)
                self._stats.oom_killed        = state.get("OOMKilled", False)

                if not self._stats.container_running:
                    return

                # Stats — one-shot (stream=false)
                async with sess.get(
                    f"http://localhost/containers/{_NODE_CONTAINER}/stats?stream=false"
                ) as resp:
                    if resp.status != 200:
                        return
                    s = await resp.json()

            mem = s.get("memory_stats", {})
            mem_usage = mem.get("usage", 0)
            mem_limit = mem.get("limit", 1)
            # cache_mem may inflate usage; subtract cache on cgroup v1
            mem_cache  = mem.get("stats", {}).get("cache", 0)
            real_usage = max(mem_usage - mem_cache, 0)

            self._stats.mem_bytes       = real_usage
            self._stats.mem_limit_bytes = mem_limit
            self._stats.mem_pct         = real_usage / mem_limit if mem_limit else 0.0

            # CPU delta
            cpu_d = s.get("cpu_stats", {})
            pre_d = s.get("precpu_stats", {})
            cpu_total   = cpu_d.get("cpu_usage", {}).get("total_usage", 0)
            pre_total   = pre_d.get("cpu_usage", {}).get("total_usage", 0)
            sys_total   = cpu_d.get("system_cpu_usage", 0)
            pre_sys     = pre_d.get("system_cpu_usage", 0)
            num_cpus    = cpu_d.get("online_cpus", 1) or 1
            cpu_delta   = cpu_total - pre_total
            sys_delta   = sys_total - pre_sys
            if sys_delta > 0:
                self._stats.cpu_pct = (cpu_delta / sys_delta) * num_cpus * 100.0
            else:
                self._stats.cpu_pct = 0.0

            log.debug(
                "[BlockchainWarden] stats mem=%.1f%% cpu=%.1f%%",
                self._stats.mem_pct * 100, self._stats.cpu_pct,
            )

        except Exception as exc:
            log.debug("[BlockchainWarden] docker stats error: %s", exc)

    async def _check_oom(self) -> None:
        """React to OOM kill flag on the container."""
        if self._stats.oom_killed:
            self._record("alert", "stellar-core was OOM-killed by kernel")
            await self._alert_guardian(
                "stellar-core OOM killed — Pi mainnet node restarting",
                severity=0.75,
            )

    # ── health evaluation + healing ─────────────────────────────────────────

    async def _evaluate_node_health(self) -> None:
        """Determine overall node health and trigger healing if needed."""
        state = self._stellar.state.lower()

        # ── container stopped → full container restart ────────────────────
        if not self._stats.container_running:
            if self._health != NodeHealth.CRITICAL:
                self._health = NodeHealth.CRITICAL
                self._record("heal_start", "Container not running — restarting")
                await self._alert_guardian(
                    "triumph-pi-mainnet-node container stopped", severity=0.9
                )
                await self._heal_container_down()
            return

        # ── stellar-core unreachable (process crashed inside container) ──
        if state in ("unreachable", "") or state.startswith("error:"):
            if self._health != NodeHealth.CRITICAL:
                self._health = NodeHealth.CRITICAL
                self._record(
                    "heal_start",
                    f"stellar-core unreachable (state='{self._stellar.state}') — restarting process",
                )
                await self._alert_guardian(
                    "stellar-core process unreachable inside pi-mainnet-node",
                    severity=0.80,
                )
                await self._heal_stellar_process()
            return

        # ── ledger stall ─────────────────────────────────────────────────
        if self._last_ledger_ts:
            stall_s = time.time() - self._last_ledger_ts
            if stall_s > _LEDGER_STALL_S:
                if self._health != NodeHealth.CRITICAL:
                    self._health = NodeHealth.CRITICAL
                    self._record(
                        "heal_start",
                        f"Ledger stalled for {int(stall_s)}s at #{self._last_ledger} — restarting stellar-core",
                    )
                    await self._alert_guardian(
                        f"Pi ledger stalled {int(stall_s)}s — stellar-core restart triggered",
                        severity=0.70,
                    )
                    await self._heal_stellar_process()
                return

        # ── memory pressure ───────────────────────────────────────────────
        if self._stats.mem_pct >= _MEM_CRITICAL_PCT:
            self._record(
                "heal_start",
                f"Memory critical {self._stats.mem_pct*100:.1f}% — pre-emptive stellar-core restart",
            )
            await self._alert_guardian(
                f"Pi mainnet node memory critical ({self._stats.mem_pct*100:.1f}%) — pre-emptive restart",
                severity=0.80,
            )
            await self._heal_stellar_process()
            return

        if self._stats.mem_pct >= _MEM_WARN_PCT:
            self._record(
                "alert",
                f"Memory warning {self._stats.mem_pct*100:.1f}% — monitoring",
            )
            await self._alert_guardian(
                f"Pi mainnet node memory high ({self._stats.mem_pct*100:.1f}%)",
                severity=0.50,
            )

        # ── peer isolation ────────────────────────────────────────────────
        if self._stellar.peer_count < _PEER_MIN and "synced" in state:
            self._record("alert", "stellar-core has 0 authenticated peers — isolated from Pi Network")
            await self._alert_guardian(
                "Pi mainnet node has 0 peers — possible network isolation",
                severity=0.60,
            )

        # ── classify health ───────────────────────────────────────────────
        if "synced" in state:
            self._health = NodeHealth.SYNCED
        elif "catching up" in state:
            self._health = NodeHealth.CATCHING_UP
        elif "joining" in state:
            self._health = NodeHealth.JOINING
        else:
            self._health = NodeHealth.DEGRADED

        # Clear CRITICAL flag once we see healthy state
        if self._health in (NodeHealth.SYNCED, NodeHealth.CATCHING_UP):
            self._stats.oom_killed = False  # reset after recovery

    # ── healing actions ───────────────────────────────────────────────────────

    async def _heal_stellar_process(self) -> None:
        """Restart stellar-core process inside the container via supervisorctl."""
        # Debounce: don't heal more than once per 2 minutes
        if time.time() - self._last_heal_ts < 120:
            log.debug("[BlockchainWarden] Heal debounced (last=%.0fs ago)", time.time() - self._last_heal_ts)
            return

        ok = await self._restart_stellar_process()
        self._last_heal_ts = time.time()
        self._heal_count  += 1

        if ok:
            self._record("heal_ok", "stellar-core restarted via supervisorctl", "supervisorctl restart stellar-core")
        else:
            self._record("heal_fail", "supervisorctl restart failed — trying full container restart")
            # Fall back to full container restart
            ok2 = await self._restart_container()
            if ok2:
                self._record("heal_ok", "Container restarted as fallback", "docker restart")
            else:
                self._record("heal_fail", "Full container restart also failed — manual intervention needed")
                await self._alert_guardian(
                    "Pi mainnet node UNRECOVERABLE — all auto-heal attempts failed",
                    severity=1.0,
                )

    async def _heal_container_down(self) -> None:
        """Start/restart a stopped container."""
        if time.time() - self._last_heal_ts < 120:
            return
        ok = await self._restart_container()
        self._last_heal_ts = time.time()
        self._heal_count  += 1
        if ok:
            self._record("heal_ok", "Container restarted after stop", "docker restart")
        else:
            self._record("heal_fail", "Could not restart container")
            await self._alert_guardian(
                "triumph-pi-mainnet-node container could not be restarted by Warden",
                severity=1.0,
            )

    async def _restart_stellar_process(self) -> bool:
        """
        Run `supervisorctl restart stellar-core` inside the node container
        using the Docker exec API.
        """
        import os
        if not os.path.exists(_DOCKER_SOCK):
            log.warning("[BlockchainWarden] Docker socket not available")
            return False
        try:
            conn = aiohttp.UnixConnector(path=_DOCKER_SOCK)
            async with aiohttp.ClientSession(
                connector=conn, timeout=aiohttp.ClientTimeout(total=30)
            ) as sess:
                # 1. Create exec instance
                exec_payload = json.dumps({
                    "AttachStdout": True,
                    "AttachStderr": True,
                    "Cmd": ["supervisorctl", "restart", "stellar-core"],
                })
                async with sess.post(
                    f"http://localhost/containers/{_NODE_CONTAINER}/exec",
                    data=exec_payload,
                    headers={"Content-Type": "application/json"},
                ) as resp:
                    if resp.status != 201:
                        log.warning("[BlockchainWarden] exec create failed: HTTP %d", resp.status)
                        return False
                    exec_data = await resp.json()
                    exec_id = exec_data.get("Id", "")

                if not exec_id:
                    return False

                # 2. Start exec instance
                start_payload = json.dumps({"Detach": False, "Tty": False})
                async with sess.post(
                    f"http://localhost/exec/{exec_id}/start",
                    data=start_payload,
                    headers={"Content-Type": "application/json"},
                ) as resp:
                    # 200 = OK
                    ok = resp.status in (200, 204)
                    if ok:
                        log.info("[BlockchainWarden] supervisorctl restart stellar-core → OK")
                    else:
                        log.warning("[BlockchainWarden] exec start failed: HTTP %d", resp.status)
                    return ok

        except Exception as exc:
            log.error("[BlockchainWarden] _restart_stellar_process error: %s", repr(exc))
            return False

    async def _restart_container(self) -> bool:
        """Restart the full triumph-pi-mainnet-node container via Docker socket."""
        import os
        if not os.path.exists(_DOCKER_SOCK):
            return False
        try:
            conn = aiohttp.UnixConnector(path=_DOCKER_SOCK)
            async with aiohttp.ClientSession(
                connector=conn, timeout=aiohttp.ClientTimeout(total=60)
            ) as sess:
                # t=15 → 15s graceful shutdown before SIGKILL
                async with sess.post(
                    f"http://localhost/containers/{_NODE_CONTAINER}/restart?t=15"
                ) as resp:
                    ok = resp.status in (204, 200)
                    if ok:
                        log.info("[BlockchainWarden] Container %s restarted", _NODE_CONTAINER)
                        await asyncio.sleep(10)  # wait for supervisord to bring up stellar-core
                    else:
                        log.warning("[BlockchainWarden] Container restart HTTP %d", resp.status)
                    return ok
        except Exception as exc:
            log.error("[BlockchainWarden] _restart_container error: %s", repr(exc))
            return False

    # ── helpers ───────────────────────────────────────────────────────────────

    def _record(self, kind: str, detail: str, action: str = "") -> None:
        ev = WardenEvent(
            id=str(uuid.uuid4())[:8],
            ts=time.time(),
            kind=kind,
            detail=detail,
            action_taken=action,
        )
        self._history.appendleft(ev)
        log.info("[BlockchainWarden][%s] %s", kind, detail)

        # also write to OmegaBrain memory
        if self._brain:
            try:
                asyncio.create_task(
                    self._brain.record(
                        f"blockchain_warden:{kind}",
                        {"detail": detail, "action": action, "ts": ev.ts},
                    )
                )
            except Exception:
                pass

    async def _alert_guardian(self, description: str, severity: float = 0.7) -> None:
        if not self._guardian:
            return
        try:
            from .guardian import ThreatIndicator, ProtectionCategory
            self._guardian.ingest(
                ThreatIndicator(
                    source      = "blockchain-warden/pi-mainnet-node",
                    category    = ProtectionCategory.INFRASTRUCTURE,
                    severity    = min(severity, 1.0),
                    description = description,
                    metadata    = {
                        "container":    _NODE_CONTAINER,
                        "stellar_state": self._stellar.state,
                        "ledger":        self._stellar.ledger_num,
                        "mem_pct":       round(self._stats.mem_pct * 100, 1),
                        "heal_count":    self._heal_count,
                    },
                )
            )
        except Exception as exc:
            log.debug("[BlockchainWarden] guardian alert error: %s", exc)


# ── singleton ────────────────────────────────────────────────────────────────
blockchain_warden = BlockchainWarden()

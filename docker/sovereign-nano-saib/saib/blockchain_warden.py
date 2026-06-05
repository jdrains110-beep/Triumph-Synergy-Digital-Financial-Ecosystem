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
import os
import time
import uuid
from collections import deque
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional

import aiohttp

log = logging.getLogger("sovereign.blockchain_warden")

# ── container constants ──────────────────────────────────────────────────────
_NODE_CONTAINER    = "triumph-pi-mainnet-node"
_STELLAR_INFO_URL  = f"http://{_NODE_CONTAINER}:11626/info"
_HORIZON_URL       = f"http://{_NODE_CONTAINER}:8000/"
_DOCKER_SOCK       = "/var/run/docker.sock"
_STALE_PID_PATH    = "/opt/stellar/postgresql/data/postmaster.pid"

# Internal mesh peers for sync-lag monitoring
_PEER_CONTAINERS = [
    ("triumph-supernode-peer-2", "http://triumph-supernode-peer-2:11626/info"),
    ("triumph-central-node",     "http://triumph-central-node:11626/info"),
]

# PostgreSQL tuning applied via ALTER SYSTEM SET once node is healthy.
# These complement the env vars injected by docker-compose.
_POSTGRES_TUNING = [
    ("max_connections",                           "50"),
    ("shared_buffers",                            "512MB"),
    ("effective_cache_size",                      "1500MB"),
    ("work_mem",                                  "16MB"),
    ("maintenance_work_mem",                      "128MB"),
    ("checkpoint_completion_target",              "0.9"),
    ("wal_buffers",                               "32MB"),
    ("statement_timeout",                         "300000"),
    ("idle_in_transaction_session_timeout",       "60000"),
    ("log_min_duration_statement",                "5000"),
    ("random_page_cost",                          "1.1"),
    ("synchronous_commit",                        "off"),  # safe for non-critical Pi audit DB
]

# ── thresholds ───────────────────────────────────────────────────────────────
def _env_int(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, str(default)))
    except (TypeError, ValueError):
        return default

# ── thresholds (env-tunable for QEMU emulation on Apple Silicon) ─────────────
# On native AMD64 Linux: stellar-core boots in ~30-90s. On Apple Silicon under
# QEMU emulation: initial bucket-apply takes 20-60+ min. Without a grace period
# the warden's heal cycle (every 60s) keeps killing the node before it ever
# finishes its first sync. Set BLOCKCHAIN_WARDEN_BOOT_GRACE_S=2400 (40 min) on
# emulation hosts via the pi-mainnet-node service environment.
_LEDGER_STALL_S      = _env_int("BLOCKCHAIN_WARDEN_LEDGER_STALL_S",  300)   # 5 min without ledger advance → stalled
_STARTUP_HANG_S      = _env_int("BLOCKCHAIN_WARDEN_STARTUP_HANG_S",  180)   # stale-lockfile detector
_BOOT_GRACE_S        = _env_int("BLOCKCHAIN_WARDEN_BOOT_GRACE_S",    2400)  # 40 min — suppress heals during initial boot/QEMU
_MEM_WARN_PCT        = 0.85  # alert at 85% memory
_MEM_CRITICAL_PCT    = 0.95  # force-restart stellar-core at 95%
_PEER_MIN            = 1     # at least 1 authenticated peer
_SYNC_LAG_LEDGERS    = 512   # alert if node ledger lags ecosystem peers by this many
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
        # Phase 0: container existence flag — False means the pi-mainnet-node
        # container is not deployed (opt-in profile). Skip all healing when False.
        self._node_deployed: bool = True
        # Track when container first seen running (to detect startup hangs)
        self._container_running_since: float = 0.0
        # True once postgres tuning has been applied for this run
        self._pg_tuning_applied: bool = False
        # Peer ledger cache for sync-lag detection {container: ledger_num}
        self._peer_ledgers: Dict[str, int] = {}

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
        asyncio.create_task(self._peer_sync_loop())
        log.info(
            "[BlockchainWarden] Online — watching %s | stellar-core + Horizon + Docker + PeerSync",
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
            "pg_tuning_applied":   self._pg_tuning_applied,
            "peer_ledgers":        self._peer_ledgers,
            "node_deployed":       self._node_deployed,
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
        await asyncio.sleep(20)  # start after docker_watch confirms node existence
        while self._running:
            # Phase 0: skip entirely if target container is not deployed
            if not self._node_deployed:
                await asyncio.sleep(_NODE_POLL_INTERVAL)
                continue
            try:
                await self._check_stellar_core()
                await self._check_horizon()
                await self._evaluate_node_health()
            except Exception as exc:
                log.debug("[BlockchainWarden] node poll error: %s", exc)
            await asyncio.sleep(_NODE_POLL_INTERVAL)

    async def _docker_watch_loop(self) -> None:
        """Poll Docker container stats every 30s."""
        await asyncio.sleep(10)  # run before _node_poll_loop so _node_deployed is set
        while self._running:
            # Phase 0: skip healing if target container is not deployed
            if not self._node_deployed:
                await asyncio.sleep(_DOCKER_POLL_INTERVAL)
                continue
            try:
                await self._fetch_docker_stats()
                await self._check_oom()
                await self._check_startup_hang()
            except Exception as exc:
                log.debug("[BlockchainWarden] docker watch error: %s", exc)
            await asyncio.sleep(_DOCKER_POLL_INTERVAL)

    async def _peer_sync_loop(self) -> None:
        """Check sync lag against internal ecosystem peers every 120s."""
        await asyncio.sleep(120)  # give the node time to start before comparing
        while self._running:
            if not self._node_deployed:
                await asyncio.sleep(120)
                continue
            try:
                await self._check_sync_lag()
            except Exception as exc:
                log.debug("[BlockchainWarden] peer sync check error: %s", exc)
            await asyncio.sleep(120)

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
                        # Container does not exist — not deployed (opt-in profile)
                        self._node_deployed = False
                        self._stats.container_running = False
                        log.debug(
                            "[BlockchainWarden] %s not found — marking as not deployed (opt-in profile)",
                            _NODE_CONTAINER,
                        )
                        return
                    self._node_deployed = True
                    info = await resp.json()

                state = info.get("State", {})
                prev_running                  = self._stats.container_running
                self._stats.container_running = state.get("Running", False)
                self._stats.oom_killed        = state.get("OOMKilled", False)

                # Track when container first started running (for startup-hang detection)
                if self._stats.container_running and not prev_running:
                    self._container_running_since = time.time()
                elif not self._stats.container_running:
                    self._container_running_since = 0.0

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

        # ── boot grace window ─────────────────────────────────────────────
        # On Apple Silicon under QEMU emulation the AMD64 stellar-core image
        # takes 20-60+ min for initial bucket-apply. Suppress all heal actions
        # until the container has been up for _BOOT_GRACE_S — only "container
        # not running" is fatal during this window.
        in_boot_grace = (
            self._stats.container_running
            and self._container_running_since > 0.0
            and (time.time() - self._container_running_since) < _BOOT_GRACE_S
        )

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
            if in_boot_grace:
                # Still booting under QEMU — log once at debug, do not heal
                log.debug(
                    "[BlockchainWarden] stellar-core unreachable but within boot-grace window (%.0fs/%ds) — waiting",
                    time.time() - self._container_running_since, _BOOT_GRACE_S,
                )
                return
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
                if in_boot_grace:
                    return  # initial sync — ledger may not advance yet
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

        # ── postgres tuning (one-shot after node reaches healthy state) ───
        if (
            self._health in (NodeHealth.SYNCED, NodeHealth.CATCHING_UP)
            and not self._pg_tuning_applied
        ):
            asyncio.create_task(self._apply_postgres_tuning())

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

    async def _check_startup_hang(self) -> None:
        """
        Detect the postmaster.pid stale-lockfile startup hang:
        container has been running for >_STARTUP_HANG_S but stellar-core
        is still unreachable — almost always caused by a stale PID file.
        Skipped while inside _BOOT_GRACE_S (QEMU emulation initial boot).
        """
        if not self._stats.container_running:
            self._container_running_since = 0.0
            return

        if self._container_running_since == 0.0:
            self._container_running_since = time.time()
            return

        elapsed = time.time() - self._container_running_since
        if elapsed < _STARTUP_HANG_S:
            return  # still within normal startup window
        if elapsed < _BOOT_GRACE_S:
            return  # under QEMU we expect long boots — don't touch the lockfile

        # Node is up but stellar-core is unreachable — check for stale lockfile
        state = self._stellar.state.lower()
        if state in ("unreachable", "") and self._heal_count == 0:
            log.warning(
                "[BlockchainWarden] Startup hang detected after %.0fs — "
                "clearing stale postmaster.pid and restarting",
                elapsed,
            )
            self._record(
                "heal_start",
                f"Startup hang {int(elapsed)}s — stale postmaster.pid suspected; clearing and restarting",
            )
            await self._clear_stale_lockfile()
            # Reset so _evaluate_node_health will trigger a fresh heal after this
            self._container_running_since = time.time()

    async def _check_sync_lag(self) -> None:
        """Compare node ledger against internal ecosystem peers. Alert on large lag."""
        best_peer_ledger = 0
        for container, url in _PEER_CONTAINERS:
            try:
                async with aiohttp.ClientSession(
                    timeout=aiohttp.ClientTimeout(total=5)
                ) as sess:
                    async with sess.get(url) as resp:
                        if resp.status == 200:
                            data  = await resp.json(content_type=None)
                            info  = data.get("info", data)
                            ledger_num = info.get("ledger", {}).get("num", 0)
                            if ledger_num:
                                self._peer_ledgers[container] = ledger_num
                                best_peer_ledger = max(best_peer_ledger, ledger_num)
            except Exception:
                pass  # peer may not be running — that's OK

        if best_peer_ledger and self._stellar.ledger_num:
            lag = best_peer_ledger - self._stellar.ledger_num
            if lag > _SYNC_LAG_LEDGERS:
                self._record(
                    "alert",
                    f"Sync lag: node ledger={self._stellar.ledger_num} peer_best={best_peer_ledger} lag={lag}",
                )
                await self._alert_guardian(
                    f"Pi mainnet node is {lag} ledgers behind peers — may need catch-up",
                    severity=0.55,
                )
                log.info(
                    "[BlockchainWarden] sync lag=%d (node=%d peer_best=%d)",
                    lag, self._stellar.ledger_num, best_peer_ledger,
                )

    async def _apply_postgres_tuning(self) -> None:
        """
        One-shot: apply recommended PostgreSQL settings via ALTER SYSTEM SET
        inside the node container. Safe to call multiple times (idempotent).
        Only runs once per BlockchainWarden lifetime.
        """
        self._pg_tuning_applied = True  # set early to prevent parallel calls
        log.info("[BlockchainWarden] Applying PostgreSQL tuning via ALTER SYSTEM SET")
        errors = 0
        for param, value in _POSTGRES_TUNING:
            sql = f"ALTER SYSTEM SET {param} = '{value}';"
            cmd = [
                "su", "-c",
                f'psql -U stellar -d core -c "{sql}"',
                "postgres",
            ]
            ok = await self._exec_in_container(cmd, timeout=15)
            if not ok:
                errors += 1
                log.debug("[BlockchainWarden] pg_tune: failed to set %s", param)

        # Reload postgres config (no restart needed for ALTER SYSTEM params)
        reload_cmd = ["su", "-c", "pg_ctl reload -D /opt/stellar/postgresql/data", "postgres"]
        await self._exec_in_container(reload_cmd, timeout=10)

        if errors == 0:
            self._record("info", f"PostgreSQL tuning applied ({len(_POSTGRES_TUNING)} params, 0 errors)")
        else:
            self._record("alert", f"PostgreSQL tuning: {errors}/{len(_POSTGRES_TUNING)} params failed (non-critical)")

    async def _clear_stale_lockfile(self) -> bool:
        """
        Remove the stale postmaster.pid from the PostgreSQL data directory.
        This unblocks the startup loop when a prior container run left a stale PID.
        """
        ok = await self._exec_in_container(
            ["rm", "-f", _STALE_PID_PATH],
            timeout=10,
        )
        if ok:
            self._record(
                "info",
                f"Stale lockfile removed: {_STALE_PID_PATH}",
                "exec rm -f postmaster.pid",
            )
            log.info("[BlockchainWarden] Stale postmaster.pid cleared")
        else:
            log.warning("[BlockchainWarden] Failed to clear stale postmaster.pid")
        return ok

    async def _exec_in_container(self, cmd: List[str], timeout: int = 30) -> bool:
        """Run a command inside _NODE_CONTAINER via the Docker exec API."""
        import os
        if not os.path.exists(_DOCKER_SOCK):
            return False
        try:
            conn = aiohttp.UnixConnector(path=_DOCKER_SOCK)
            async with aiohttp.ClientSession(
                connector=conn,
                timeout=aiohttp.ClientTimeout(total=timeout + 5),
            ) as sess:
                exec_payload = json.dumps({
                    "AttachStdout": True,
                    "AttachStderr": True,
                    "Cmd": cmd,
                })
                async with sess.post(
                    f"http://localhost/containers/{_NODE_CONTAINER}/exec",
                    data=exec_payload,
                    headers={"Content-Type": "application/json"},
                ) as resp:
                    if resp.status != 201:
                        return False
                    exec_data = await resp.json()
                    exec_id   = exec_data.get("Id", "")

                if not exec_id:
                    return False

                start_payload = json.dumps({"Detach": False, "Tty": False})
                async with sess.post(
                    f"http://localhost/exec/{exec_id}/start",
                    data=start_payload,
                    headers={"Content-Type": "application/json"},
                ) as resp:
                    return resp.status in (200, 204)

        except Exception as exc:
            log.debug("[BlockchainWarden] exec_in_container error: %s", repr(exc))
            return False

    async def _heal_stellar_process(self) -> None:
        """Restart stellar-core process inside the container via supervisorctl."""
        # Debounce: don't heal more than once per 2 minutes
        if time.time() - self._last_heal_ts < 120:
            log.debug("[BlockchainWarden] Heal debounced (last=%.0fs ago)", time.time() - self._last_heal_ts)
            return

        ok = await self._restart_stellar_process()
        self._last_heal_ts = time.time()
        self._heal_count  += 1
        self._pg_tuning_applied = False  # re-apply tuning after stellar-core comes back

        if ok:
            self._record("heal_ok", "stellar-core restarted via supervisorctl", "supervisorctl restart stellar-core")
        else:
            self._record("heal_fail", "supervisorctl restart failed — trying full container restart + lockfile clear")
            # Clear stale lockfile then fall back to full container restart
            await self._clear_stale_lockfile()
            ok2 = await self._restart_container()
            self._container_running_since = 0.0
            if ok2:
                self._record("heal_ok", "Container restarted as fallback (lockfile cleared)", "docker restart")
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
        # Always clear the stale lockfile before restarting to prevent
        # the "Waiting for postgres to be available" startup hang.
        await self._clear_stale_lockfile()
        ok = await self._restart_container()
        self._last_heal_ts = time.time()
        self._heal_count  += 1
        self._container_running_since = 0.0  # reset startup-hang timer
        self._pg_tuning_applied = False       # re-apply tuning after restart
        if ok:
            self._record("heal_ok", "Container restarted after stop", "docker restart")
        else:
            self._record("heal_fail", "Could not restart container")
            await self._alert_guardian(
                "triumph-pi-mainnet-node container could not be restarted by Warden",
                severity=1.0,
            )

    async def _restart_stellar_process(self) -> bool:
        """Restart stellar-core process inside the container via supervisorctl."""
        ok = await self._exec_in_container(
            ["supervisorctl", "restart", "stellar-core"], timeout=30
        )
        if ok:
            log.info("[BlockchainWarden] supervisorctl restart stellar-core → OK")
        else:
            log.warning("[BlockchainWarden] supervisorctl restart failed")
        return ok

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
                # t=20 → 20s graceful shutdown before SIGKILL (stellar-core needs time to flush)
                async with sess.post(
                    f"http://localhost/containers/{_NODE_CONTAINER}/restart?t=20"
                ) as resp:
                    ok = resp.status in (204, 200)
                    if ok:
                        log.info("[BlockchainWarden] Container %s restarted", _NODE_CONTAINER)
                        # Give supervisord time to start processes, then clear any
                        # stale lockfile that may have been left from prior run.
                        await asyncio.sleep(5)
                        await self._clear_stale_lockfile()
                        await asyncio.sleep(5)  # wait for postgres to start cleanly
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

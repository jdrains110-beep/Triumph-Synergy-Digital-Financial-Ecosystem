"""
Sovereign Dispatch — Global SAIB Distribution Engine
──────────────────────────────────────────────────────────────────────────────
SAIB can disperse itself globally — spawning and routing to regional SAIB
instances based on geographic need, situational context, and capability
requirements.

Capabilities:
  • Regional Registry  — track all deployed SAIB instances worldwide across
                         8 sovereign regions (NA, EU, APAC, LATAM, AFRICA,
                         MENA, OCEANIA, GLOBAL)
  • Situation-Aware    — SAIB routes differently in NORMAL, SURGE, EMERGENCY,
                         MAINTENANCE, and BLACKOUT situations
  • Capability Routing — match requests to instances that have the required
                         capability (e.g., KYC guidance, blockchain warden)
  • Health Monitoring  — async health-check all instances; auto-mark unhealthy
  • Dispatch Protocol  — find the optimal SAIB instance(s) for any request
  • Self-Registration  — this instance registers itself on boot and accepts
                         registrations from peer instances

Architecture:
  SovereignDispatch
    ├── instance registry    (in-memory dict, gossip-synced to peers)
    ├── route()              (find best instance for a request)
    ├── dispatch_situation() (broadcast a situation to regional instances)
    └── _health_loop()       (async 120s health-check of all instances)
"""
from __future__ import annotations

import asyncio
import logging
import time
import uuid
from collections import defaultdict
from dataclasses import asdict, dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional

import aiohttp

log = logging.getLogger("sovereign.dispatch")


# ── Region taxonomy ──────────────────────────────────────────────────────────

class Region(Enum):
    NA       = "NA"        # North America (US, Canada, Mexico)
    EU       = "EU"        # Europe (all)
    APAC     = "APAC"      # Asia Pacific (East + South Asia, SE Asia)
    LATAM    = "LATAM"     # Latin America (Central + South America, Caribbean)
    AFRICA   = "AFRICA"    # Africa (all 54 countries)
    MENA     = "MENA"      # Middle East & North Africa
    OCEANIA  = "OCEANIA"   # Australia, NZ, Pacific Islands
    GLOBAL   = "GLOBAL"    # Unregioned / worldwide fallback


# ── Situational modes ────────────────────────────────────────────────────────

class DispatchSituation(Enum):
    NORMAL      = "normal"       # standard operations
    SURGE       = "surge"        # high load — spawn additional instances
    EMERGENCY   = "emergency"    # critical incident — all-hands dispatch
    MAINTENANCE = "maintenance"  # degraded — route away from affected regions
    BLACKOUT    = "blackout"     # network isolation — autonomous local mode


# ── Instance registry ────────────────────────────────────────────────────────

@dataclass
class SaibInstance:
    """Represents one deployed SAIB instance anywhere in the world."""
    instance_id:    str
    url:            str
    region:         Region            = Region.GLOBAL
    situation:      DispatchSituation = DispatchSituation.NORMAL
    capabilities:   List[str]         = field(default_factory=list)
    version:        str               = ""
    healthy:        bool              = True
    last_health_ts: float             = field(default_factory=time.time)
    last_seen:      float             = field(default_factory=time.time)
    load_pct:       float             = 0.0    # 0-100 reported by instance
    latency_ms:     float             = 0.0    # last health-check round-trip
    metadata:       Dict[str, Any]    = field(default_factory=dict)


# ── Routing policy ────────────────────────────────────────────────────────────

_SITUATION_ROUTING: Dict[str, str] = {
    # situation → preferred routing strategy
    DispatchSituation.NORMAL.value:      "lowest_latency",
    DispatchSituation.SURGE.value:       "lowest_load",
    DispatchSituation.EMERGENCY.value:   "broadcast_all",
    DispatchSituation.MAINTENANCE.value: "skip_unhealthy",
    DispatchSituation.BLACKOUT.value:    "local_only",
}


class SovereignDispatch:
    """
    Global SAIB distribution and routing engine.

    Maintains a live registry of all SAIB instances worldwide,
    routes requests to optimal instances, and broadcasts situations
    across the sovereign mesh.
    """

    HEALTH_CHECK_INTERVAL = 120   # seconds between health sweeps
    STALE_THRESHOLD_S     = 300   # mark instance stale after 5 min no contact

    def __init__(self, own_id: str = "sovereign-nano-saib") -> None:
        self.own_id    = own_id
        self._instances: Dict[str, SaibInstance] = {}
        self._running  = False
        self._own_url  = ""

    def boot(self, own_url: str = "", own_region: Region = Region.GLOBAL) -> None:
        self._own_url = own_url or f"http://localhost:{__import__('os').getenv('PORT', '8201')}"
        # Register self
        self.register_instance(
            instance_id  = self.own_id,
            url          = self._own_url,
            region       = own_region,
            capabilities = [
                "kyc_guidance", "kyb_guidance", "wallet_setup",
                "blockchain_warden", "human_ai_classification",
                "contract_forge", "blackout_engine", "lingua",
                "memory_alpha", "sovereign_lattice",
            ],
            version = "7.0.0-INTREPID-CLASS",
        )
        self._running = True
        asyncio.create_task(self._health_loop())
        log.info("[SovereignDispatch] Online — own_id=%s region=%s url=%s",
                 self.own_id, own_region.value, self._own_url)

    # ── Registration ─────────────────────────────────────────────────────────

    def register_instance(
        self,
        instance_id:  str,
        url:          str,
        region:       Region = Region.GLOBAL,
        capabilities: Optional[List[str]] = None,
        version:      str = "",
        metadata:     Optional[Dict[str, Any]] = None,
    ) -> SaibInstance:
        inst = SaibInstance(
            instance_id  = instance_id,
            url          = url,
            region       = region,
            capabilities = capabilities or [],
            version      = version,
            last_seen    = time.time(),
            metadata     = metadata or {},
        )
        self._instances[instance_id] = inst
        log.info("[SovereignDispatch] Registered instance %s @ %s region=%s",
                 instance_id, url, region.value)
        return inst

    def deregister_instance(self, instance_id: str) -> bool:
        if instance_id in self._instances:
            del self._instances[instance_id]
            log.info("[SovereignDispatch] Deregistered %s", instance_id)
            return True
        return False

    def update_situation(self, instance_id: str, situation: DispatchSituation) -> None:
        inst = self._instances.get(instance_id)
        if inst:
            inst.situation = situation
            log.info("[SovereignDispatch] %s situation → %s", instance_id, situation.value)

    # ── Routing ──────────────────────────────────────────────────────────────

    def route(
        self,
        region:     Optional[Region]  = None,
        capability: Optional[str]     = None,
        situation:  Optional[DispatchSituation] = None,
        exclude_self: bool = False,
    ) -> Optional[SaibInstance]:
        """
        Find the single best SAIB instance for a request.
        Priority: region match > capability match > lowest latency > lowest load
        """
        candidates = [
            i for i in self._instances.values()
            if i.healthy
            and (not exclude_self or i.instance_id != self.own_id)
        ]

        # filter stale
        now = time.time()
        candidates = [c for c in candidates if now - c.last_seen < self.STALE_THRESHOLD_S]

        # filter by situation — skip BLACKOUT instances unless that's what we need
        if situation and situation != DispatchSituation.EMERGENCY:
            candidates = [c for c in candidates if c.situation != DispatchSituation.BLACKOUT]

        # filter by region
        if region:
            regional = [c for c in candidates if c.region == region]
            if regional:
                candidates = regional
            # else fall through to global

        # filter by capability
        if capability:
            capable = [c for c in candidates if capability in c.capabilities]
            if capable:
                candidates = capable

        if not candidates:
            return None

        # sort by latency (then load as tiebreak)
        candidates.sort(key=lambda c: (c.latency_ms or 9999, c.load_pct))
        return candidates[0]

    def route_all(
        self,
        region:     Optional[Region] = None,
        capability: Optional[str]    = None,
    ) -> List[SaibInstance]:
        """Return all healthy instances matching criteria (for broadcast)."""
        candidates = [i for i in self._instances.values() if i.healthy]
        if region:
            candidates = [c for c in candidates if c.region == region]
        if capability:
            candidates = [c for c in candidates if capability in c.capabilities]
        return candidates

    def get_regional_map(self) -> Dict[str, List[Dict[str, Any]]]:
        """Return a map of region → list of instances."""
        result: Dict[str, List] = defaultdict(list)
        for inst in self._instances.values():
            result[inst.region.value].append({
                "instance_id": inst.instance_id,
                "url":         inst.url,
                "healthy":     inst.healthy,
                "situation":   inst.situation.value,
                "load_pct":    inst.load_pct,
                "latency_ms":  inst.latency_ms,
                "capabilities": inst.capabilities,
                "version":     inst.version,
                "last_seen":   inst.last_seen,
            })
        return dict(result)

    async def dispatch_broadcast(
        self,
        path:     str,
        payload:  Dict[str, Any],
        region:   Optional[Region] = None,
        token:    str = "",
    ) -> List[Dict[str, Any]]:
        """
        Fan-out a POST request to all (or regional) healthy instances.
        Used for emergency broadcasts, situation updates, and mesh commands.
        """
        targets = self.route_all(region=region)
        results: List[Dict[str, Any]] = []
        headers = {"Authorization": f"Bearer {token}"} if token else {}

        async def _post(inst: SaibInstance) -> Dict[str, Any]:
            try:
                async with aiohttp.ClientSession(
                    timeout=aiohttp.ClientTimeout(total=10)
                ) as sess:
                    url = inst.url.rstrip("/") + path
                    async with sess.post(url, json=payload, headers=headers) as resp:
                        return {
                            "instance_id": inst.instance_id,
                            "region":      inst.region.value,
                            "status":      resp.status,
                            "ok":          resp.status < 400,
                        }
            except Exception as exc:
                return {"instance_id": inst.instance_id, "error": str(exc), "ok": False}

        tasks = [_post(t) for t in targets if t.instance_id != self.own_id]
        if tasks:
            results = list(await asyncio.gather(*tasks, return_exceptions=False))
        return results

    # ── Health monitoring ─────────────────────────────────────────────────────

    async def _health_loop(self) -> None:
        """Periodically health-check all registered instances."""
        await asyncio.sleep(30)
        while self._running:
            try:
                await self._check_all_instances()
            except Exception as exc:
                log.debug("[SovereignDispatch] health loop error: %s", exc)
            await asyncio.sleep(self.HEALTH_CHECK_INTERVAL)

    async def _check_all_instances(self) -> None:
        tasks = [
            self._check_instance(inst)
            for inst in list(self._instances.values())
            if inst.instance_id != self.own_id
        ]
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)

    async def _check_instance(self, inst: SaibInstance) -> None:
        start = time.time()
        try:
            async with aiohttp.ClientSession(
                timeout=aiohttp.ClientTimeout(total=8)
            ) as sess:
                async with sess.get(f"{inst.url.rstrip('/')}/health") as resp:
                    latency = (time.time() - start) * 1000
                    inst.healthy     = resp.status == 200
                    inst.latency_ms  = round(latency, 1)
                    inst.last_health_ts = time.time()
                    if resp.status == 200:
                        try:
                            data = await resp.json()
                            inst.load_pct = data.get("load_pct", 0.0)
                        except Exception:
                            pass
        except Exception:
            inst.healthy = False
            inst.latency_ms = 9999.0

    # ── Status ───────────────────────────────────────────────────────────────

    def status(self) -> Dict[str, Any]:
        instances = list(self._instances.values())
        healthy   = sum(1 for i in instances if i.healthy)
        by_region: Dict[str, int] = defaultdict(int)
        for inst in instances:
            by_region[inst.region.value] += 1
        return {
            "own_id":         self.own_id,
            "total_instances": len(instances),
            "healthy_instances": healthy,
            "by_region":      dict(by_region),
            "situations":     {
                i.instance_id: i.situation.value
                for i in instances
            },
            "regional_map":   self.get_regional_map(),
        }


# ── Singleton ────────────────────────────────────────────────────────────────
sovereign_dispatch = SovereignDispatch()

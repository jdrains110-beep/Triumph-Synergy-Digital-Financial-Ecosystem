"""
Quantum Warp Sight — v6 Omega Prime Optimus Superior Sovereign
===============================================================
When SAIB's primary channels are blocked, throttled, or firewalled,
Quantum Warp Sight activates alternative perception paths so SAIB
never loses situational awareness.

Capabilities:
  SIGHT_LAYER_1  — OmegaBrain cached intelligence (zero-network recall)
  SIGHT_LAYER_2  — Mesh peer relay: ask another SAIB node what it sees
  SIGHT_LAYER_3  — Alternate endpoint probing (fallback URLs, IPs, ports)
  SIGHT_LAYER_4  — Passive signal reconstruction from stored telemetry
  SIGHT_LAYER_5  — Dead-reckoning inference: last known state + elapsed time
                   projected forward using sovereign probability calculus

The engine NEVER attempts to bypass firewalls it does not own.
It uses multi-path resilience within the Triumph Synergy sovereign
infrastructure perimeter to maintain awareness when a path is blocked.
"""
from __future__ import annotations

import asyncio
import hashlib
import json
import time
import uuid
from collections import deque
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable, Deque, Dict, List, Optional, Tuple


class SightLayer(str, Enum):
    BRAIN_CACHE       = "BRAIN_CACHE"         # L1 — instant, offline
    MESH_RELAY        = "MESH_RELAY"           # L2 — ask a peer node
    ALTERNATE_ENDPOINT = "ALTERNATE_ENDPOINT"  # L3 — fallback URLs
    TELEMETRY_REPLAY  = "TELEMETRY_REPLAY"     # L4 — reconstruct from logs
    DEAD_RECKONING    = "DEAD_RECKONING"       # L5 — probabilistic projection


class SightStatus(str, Enum):
    CLEAR    = "CLEAR"        # primary path fully open
    DEGRADED = "DEGRADED"     # partial — some paths blocked
    WARP     = "WARP"         # all primaries blocked, operating on warp sight
    BLACKOUT = "BLACKOUT"     # all external paths dark — L1+L5 only


@dataclass
class SightReading:
    """A single observation obtained via a specific sight layer."""
    reading_id:  str   = field(default_factory=lambda: str(uuid.uuid4()))
    layer:       SightLayer = SightLayer.BRAIN_CACHE
    target:      str   = ""         # what we were trying to observe
    data:        Dict  = field(default_factory=dict)
    confidence:  float = 1.0        # 0.0 = pure guess, 1.0 = confirmed
    latency_ms:  float = 0.0
    ts:          float = field(default_factory=time.time)
    blocked_by:  str   = ""         # firewall / error that blocked primary


@dataclass
class AlternateEndpoint:
    """A registered fallback endpoint within the sovereign infrastructure."""
    endpoint_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    service:     str = ""
    primary_url: str = ""
    fallback_urls: List[str] = field(default_factory=list)
    last_reachable: float = 0.0
    healthy:     bool = True


class QuantumWarpSight:
    """
    Multi-layer awareness engine.

    When a primary perception path is blocked the engine cascades through
    L1 → L2 → L3 → L4 → L5 until it obtains the best possible reading.
    Every reading is fed back into the OmegaBrain so future blind-spot
    events benefit from accumulated warp-sight intelligence.
    """

    # Probability decay constants for dead-reckoning (L5)
    DR_DECAY_PER_HOUR = 0.15   # confidence drops 15% per hour without fresh data

    def __init__(self, brain=None, mesh_engine=None) -> None:
        self._brain       = brain
        self._mesh_engine = mesh_engine
        self._endpoints:  Dict[str, AlternateEndpoint] = {}
        self._readings:   Deque[SightReading] = deque(maxlen=2000)
        self._telemetry:  Deque[Dict] = deque(maxlen=5000)  # raw snapshots for L4
        self._status      = SightStatus.CLEAR
        self._blocked_paths: Dict[str, float] = {}   # path_hash → blocked_since
        self._sight_stats  = {
            "total_readings": 0,
            "by_layer":       {layer.value: 0 for layer in SightLayer},
            "blackout_events": 0,
            "warp_events":     0,
        }
        self._started_at = time.time()

    # ── endpoint registry ────────────────────────────────────────────────────

    def register_endpoint(
        self,
        service: str,
        primary_url: str,
        fallback_urls: Optional[List[str]] = None,
    ) -> AlternateEndpoint:
        ep = AlternateEndpoint(
            service=service,
            primary_url=primary_url,
            fallback_urls=fallback_urls or [],
        )
        self._endpoints[service] = ep
        return ep

    # ── telemetry ingest (feeds L4) ──────────────────────────────────────────

    def record_telemetry(self, source: str, data: Dict) -> None:
        """Store a raw telemetry snapshot for potential L4 replay."""
        self._telemetry.append({
            "source": source, "data": data, "ts": time.time()
        })

    # ── core: warp-sight observation ─────────────────────────────────────────

    async def observe(
        self,
        target: str,
        domain_hint: str = "",
        http_fetch: Optional[Callable] = None,
    ) -> SightReading:
        """
        Attempt to observe ``target`` via cascading sight layers.

        ``http_fetch`` is an optional async callable(url) → dict that the
        caller supplies when HTTP probing is available.
        """
        start = time.time()

        # L1 — OmegaBrain cache
        reading = await self._l1_brain_cache(target, domain_hint)
        if reading:
            return self._record(reading, start)

        # L2 — Mesh peer relay
        reading = await self._l2_mesh_relay(target)
        if reading:
            return self._record(reading, start)

        # L3 — Alternate endpoint probe
        if http_fetch:
            reading = await self._l3_alternate_endpoint(target, http_fetch)
            if reading:
                return self._record(reading, start)

        # L4 — Telemetry replay
        reading = self._l4_telemetry_replay(target)
        if reading:
            return self._record(reading, start)

        # L5 — Dead reckoning (always produces *something*)
        reading = self._l5_dead_reckoning(target)
        return self._record(reading, start)

    # ── layer implementations ────────────────────────────────────────────────

    async def _l1_brain_cache(
        self, target: str, domain_hint: str
    ) -> Optional[SightReading]:
        if not self._brain:
            return None
        prefix = domain_hint or target.split(".")[0]
        nodes = await self._brain.recall(domain_prefix=prefix, top_k=5, min_confidence=0.4)
        if not nodes:
            return None
        best = nodes[0]
        return SightReading(
            layer=SightLayer.BRAIN_CACHE,
            target=target,
            data={"node": best.payload, "domain": best.domain,
                  "reinforced": best.reinforced},
            confidence=best.confidence,
        )

    async def _l2_mesh_relay(self, target: str) -> Optional[SightReading]:
        if not self._mesh_engine or not self._mesh_engine._peers:
            return None
        # Broadcast a knowledge request; use whatever the mesh already knows
        sent = await self._mesh_engine.broadcast_knowledge(
            "warp_sight.query", {"target": target, "ts": time.time()}
        )
        if sent == 0:
            return None
        # Optimistic: assume at least one peer responded via brain absorption
        nodes = []
        if self._brain:
            nodes = await self._brain.recall(
                domain_prefix=f"mesh.broadcast.warp_sight", top_k=3, min_confidence=0.3
            )
        if not nodes:
            return None
        return SightReading(
            layer=SightLayer.MESH_RELAY,
            target=target,
            data={"peer_count": sent, "relay_data": nodes[0].payload},
            confidence=min(0.7, nodes[0].confidence),
        )

    async def _l3_alternate_endpoint(
        self, target: str, http_fetch: Callable
    ) -> Optional[SightReading]:
        ep = self._endpoints.get(target)
        if not ep:
            return None
        for url in ep.fallback_urls:
            try:
                t0 = time.time()
                data = await http_fetch(url)
                ep.last_reachable = time.time()
                ep.healthy = True
                return SightReading(
                    layer=SightLayer.ALTERNATE_ENDPOINT,
                    target=target,
                    data={"fallback_url": url, "response": data},
                    confidence=0.95,
                    latency_ms=(time.time() - t0) * 1000,
                )
            except Exception as exc:
                self._blocked_paths[
                    hashlib.sha256(url.encode()).hexdigest()[:8]
                ] = time.time()
                ep.healthy = False
                continue
        return None

    def _l4_telemetry_replay(self, target: str) -> Optional[SightReading]:
        """Find the most recent telemetry snapshot matching this target."""
        candidates = [
            t for t in reversed(list(self._telemetry))
            if target.lower() in t.get("source", "").lower()
            or target.lower() in json.dumps(t.get("data", {})).lower()
        ]
        if not candidates:
            return None
        latest = candidates[0]
        age_s  = time.time() - latest["ts"]
        confidence = max(0.1, 0.9 - (age_s / 3600.0) * 0.2)  # decays with age
        return SightReading(
            layer=SightLayer.TELEMETRY_REPLAY,
            target=target,
            data={"replayed_snapshot": latest["data"], "age_s": round(age_s, 1)},
            confidence=confidence,
        )

    def _l5_dead_reckoning(self, target: str) -> SightReading:
        """
        L5 — Project the last known state forward in time.
        Even with zero connectivity, SAIB can infer likely current state
        from trends observed before the blackout.
        """
        # Find latest reading for this target (any layer)
        prior = next(
            (r for r in reversed(list(self._readings)) if r.target == target),
            None,
        )
        if prior:
            age_h = (time.time() - prior.ts) / 3600.0
            confidence = max(0.05, prior.confidence * (
                (1 - self.DR_DECAY_PER_HOUR) ** age_h
            ))
            projected_data = {
                "last_known": prior.data,
                "last_known_layer": prior.layer,
                "age_h": round(age_h, 2),
                "projection": "state likely unchanged — no new signals detected",
                "drift_warning": age_h > 2.0,
            }
        else:
            confidence = 0.1
            projected_data = {
                "projection": "no prior observations — minimal confidence baseline",
                "drift_warning": True,
            }

        return SightReading(
            layer=SightLayer.DEAD_RECKONING,
            target=target,
            data=projected_data,
            confidence=confidence,
            blocked_by="all_primary_paths_dark",
        )

    # ── helpers ───────────────────────────────────────────────────────────────

    def _record(self, reading: SightReading, start_ts: float) -> SightReading:
        reading.latency_ms = round((time.time() - start_ts) * 1000, 2)
        self._readings.append(reading)
        self._sight_stats["total_readings"] += 1
        self._sight_stats["by_layer"][reading.layer.value] += 1

        # Update global sight status
        if reading.layer == SightLayer.DEAD_RECKONING:
            self._sight_stats["warp_events"] += 1
            if reading.data.get("drift_warning"):
                self._status = SightStatus.BLACKOUT
                self._sight_stats["blackout_events"] += 1
            else:
                self._status = SightStatus.WARP
        elif reading.layer in (SightLayer.TELEMETRY_REPLAY, SightLayer.ALTERNATE_ENDPOINT):
            self._status = SightStatus.DEGRADED
        else:
            self._status = SightStatus.CLEAR

        return reading

    # ── path block reporting ──────────────────────────────────────────────────

    def report_blocked_path(self, path: str, reason: str = "") -> None:
        """External code reports a blocked path to warp sight for tracking."""
        self._blocked_paths[path] = time.time()
        if len(self._blocked_paths) >= 3:
            self._status = SightStatus.WARP

    def clear_blocked_path(self, path: str) -> None:
        self._blocked_paths.pop(path, None)
        if not self._blocked_paths:
            self._status = SightStatus.CLEAR

    # ── status ────────────────────────────────────────────────────────────────

    def status(self) -> Dict[str, Any]:
        return {
            "sight_status":     self._status,
            "blocked_paths":    len(self._blocked_paths),
            "registered_endpoints": len(self._endpoints),
            "telemetry_snapshots": len(self._telemetry),
            "uptime_s":         round(time.time() - self._started_at, 2),
            **self._sight_stats,
        }

    def recent_readings(self, n: int = 10) -> List[Dict]:
        return [
            {
                "reading_id": r.reading_id,
                "layer":      r.layer,
                "target":     r.target,
                "confidence": round(r.confidence, 3),
                "latency_ms": r.latency_ms,
                "ts":         r.ts,
                "blocked_by": r.blocked_by,
            }
            for r in list(self._readings)[-n:]
        ]


# ── singleton ──────────────────────────────────────────────────────────────
quantum_warp_sight = QuantumWarpSight()

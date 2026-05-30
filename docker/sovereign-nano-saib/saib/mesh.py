"""
Sovereign Multi-SAIB Mesh Coordination
- Peer registry with live heartbeat (gossip protocol)
- Collective intelligence: broadcast events, aggregate quorum verdicts
- Load-aware task delegation to least-busy peer
- Warp-speed collective observe: fan-out to all alive peers simultaneously
- Mesh-wide synchronization: all SAIBs protect each other
"""
from __future__ import annotations

import asyncio
import time
from collections import defaultdict, deque
from dataclasses import dataclass, field
from typing import Optional

import httpx


@dataclass
class SaibPeer:
    peer_id: str
    url: str
    token: str
    alive: bool = False
    last_heartbeat: float = 0.0
    health: dict = field(default_factory=dict)
    tasks_sent: int = 0
    tasks_ok: int = 0
    latency_ms: float = 0.0


class SaibMesh:
    """
    Self-organizing sovereign SAIB mesh.
    Every SAIB registers its peers and shares threat verdicts in real-time.
    Quorum consensus prevents single-point manipulation.
    """

    HEARTBEAT_INTERVAL_S = 30.0
    PEER_DEAD_AFTER_S    = 90.0

    def __init__(self, own_id: str = "sovereign-nano-saib"):
        self._own_id = own_id
        self._peers: dict[str, SaibPeer] = {}
        self._collective: dict[str, list[dict]] = defaultdict(list)
        self._gossip_log: deque = deque(maxlen=1000)
        self._hb_task: Optional[asyncio.Task] = None
        self._born = time.time()

    # ── Peer Management ───────────────────────────────────────────────────────

    def register_peer(self, peer_id: str, url: str, token: str) -> None:
        self._peers[peer_id] = SaibPeer(peer_id=peer_id, url=url, token=token)

    def remove_peer(self, peer_id: str) -> bool:
        return bool(self._peers.pop(peer_id, None))

    def alive_peers(self) -> list[SaibPeer]:
        return [p for p in self._peers.values() if p.alive]

    # ── Heartbeat ─────────────────────────────────────────────────────────────

    async def _ping(self, peer: SaibPeer) -> None:
        t0 = time.perf_counter()
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                r = await client.get(f"{peer.url}/health")
            if r.status_code == 200:
                peer.alive = True
                peer.health = r.json()
                peer.last_heartbeat = time.time()
                peer.latency_ms = round((time.perf_counter() - t0) * 1000, 2)
                return
        except Exception:
            pass
        age = time.time() - peer.last_heartbeat
        peer.alive = age < self.PEER_DEAD_AFTER_S

    async def _heartbeat_loop(self) -> None:
        while True:
            await asyncio.sleep(self.HEARTBEAT_INTERVAL_S)
            tasks = [asyncio.create_task(self._ping(p)) for p in self._peers.values()]
            if tasks:
                await asyncio.gather(*tasks, return_exceptions=True)

    def start(self) -> None:
        if not self._hb_task:
            self._hb_task = asyncio.create_task(self._heartbeat_loop())

    # ── Gossip ────────────────────────────────────────────────────────────────

    async def gossip_verdict(self, target_entity: str, verdict: dict) -> int:
        """Broadcast a threat verdict to all alive peers. Returns count sent."""
        payload = {
            "from": self._own_id,
            "target_entity": target_entity,
            "verdict": verdict,
            "ts": time.time(),
        }
        self._gossip_log.append(payload)
        alive = self.alive_peers()
        sent = 0
        async with httpx.AsyncClient(timeout=5.0) as client:
            for peer in alive:
                try:
                    await client.post(
                        f"{peer.url}/mesh/gossip",
                        json=payload,
                        headers={"Authorization": f"Bearer {peer.token}"},
                    )
                    sent += 1
                except Exception:
                    pass
        return sent

    def ingest_gossip(self, payload: dict) -> None:
        entity = payload.get("target_entity", "")
        self._collective[entity].append({
            "from": payload.get("from"),
            "verdict": payload.get("verdict", {}),
            "ts": payload.get("ts", 0),
        })
        # cap per entity
        if len(self._collective[entity]) > 100:
            self._collective[entity] = self._collective[entity][-100:]

    # ── Quorum Verdict ────────────────────────────────────────────────────────

    def quorum_verdict(self, entity_id: str, max_age_s: float = 120.0) -> dict:
        """
        Weighted quorum across all peer verdicts for an entity.
        Recent verdicts count more (linear age decay).
        """
        now = time.time()
        records = [r for r in self._collective.get(entity_id, [])
                   if (now - r["ts"]) < max_age_s]
        if not records:
            return {"quorum": "NO_DATA", "count": 0, "confidence": 0.0}

        level_weights: dict[str, float] = defaultdict(float)
        for r in records:
            age = now - r["ts"]
            weight = max(0.1, 1.0 - age / max_age_s)
            lvl = r["verdict"].get("threat", "UNKNOWN")
            level_weights[lvl] += weight

        total = sum(level_weights.values())
        majority = max(level_weights, key=level_weights.__getitem__)
        confidence = level_weights[majority] / max(total, 1e-9)

        return {
            "quorum": majority,
            "confidence": round(confidence, 4),
            "count": len(records),
            "breakdown": {k: round(v / total, 3) for k, v in level_weights.items()},
        }

    # ── Collective Observe (warp fan-out) ─────────────────────────────────────

    async def collective_observe(self, event: dict) -> list[dict]:
        """
        Fan-out an observe event to ALL alive peers simultaneously.
        Returns aggregated results. Dead peers are skipped.
        """
        alive = self.alive_peers()
        if not alive:
            return []

        async def _send_to(peer: SaibPeer) -> dict:
            try:
                async with httpx.AsyncClient(timeout=10.0) as client:
                    r = await client.post(
                        f"{peer.url}/defense/observe",
                        json=event,
                        headers={"Authorization": f"Bearer {peer.token}"},
                    )
                peer.tasks_sent += 1
                if r.status_code == 200:
                    peer.tasks_ok += 1
                    return {"peer": peer.peer_id, "ok": True, "result": r.json()}
                return {"peer": peer.peer_id, "ok": False, "status": r.status_code}
            except Exception as e:
                return {"peer": peer.peer_id, "ok": False, "error": str(e)}

        tasks = [asyncio.create_task(_send_to(p)) for p in alive]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        return [r if isinstance(r, dict) else {"error": str(r)} for r in results]

    # ── Least-busy Delegation ────────────────────────────────────────────────

    def least_busy_peer(self) -> Optional[SaibPeer]:
        alive = self.alive_peers()
        if not alive:
            return None
        return min(alive, key=lambda p: p.tasks_sent - p.tasks_ok)

    # ── Stats ─────────────────────────────────────────────────────────────────

    def stats(self) -> dict:
        alive = self.alive_peers()
        return {
            "own_id": self._own_id,
            "peers_total": len(self._peers),
            "peers_alive": len(alive),
            "peers": [{
                "id": p.peer_id,
                "alive": p.alive,
                "latency_ms": p.latency_ms,
                "tasks_sent": p.tasks_sent,
                "tasks_ok": p.tasks_ok,
            } for p in self._peers.values()],
            "gossip_messages": len(self._gossip_log),
            "collective_entities": len(self._collective),
            "uptime_s": round(time.time() - self._born, 1),
        }

"""
Unreal Engine Bridge — Sovereign Nano SAIB
Publishes the live threat graph as a WebSocket stream in a UE-ingestible
JSON schema.  A UE Blueprint actor subscribes to ws://<host>/ws/threat-graph
and renders the threat topology in real time.

Message format (one per second):
{
  "ts":        1748563200.0,
  "schema":    "sovereign-nano-saib/v1",
  "nodes": [
    { "id": "peer_id", "threat": "NORMAL|MONITOR|ALERT|QUARANTINE|BLOCK",
      "verdict": 0.12, "x": 0.0, "y": 0.0, "z": 0.0 }
  ],
  "edges": [
    { "source": "local", "target": "peer_id", "weight": 0.12, "active": true }
  ],
  "summary":   { ... }
}

UE Integration hint:
  • Import the JSON Blueprint Utilities plugin
  • Create a WebSocketSubsystem connection to this WS endpoint
  • Map "threat" → material slot / particle emitter intensity
  • Map "verdict" → mesh scale or glow intensity
"""
from __future__ import annotations

import asyncio
import json
import math
import time
from typing import Any

from fastapi import WebSocket, WebSocketDisconnect


class UnrealEngineBridge:
    """
    Maintains a set of active WebSocket subscribers and broadcasts
    the threat graph snapshot every `interval_s` seconds.
    """

    def __init__(self, interval_s: float = 1.0) -> None:
        self._interval   = interval_s
        self._clients:   set[WebSocket] = set()
        self._snapshot:  dict[str, Any] = {}
        self._broadcast_count = 0

    # ------------------------------------------------------------------ #
    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        self._clients.add(ws)
        # Immediately push current snapshot
        if self._snapshot:
            try:
                await ws.send_text(json.dumps(self._snapshot))
            except Exception:
                pass

    def disconnect(self, ws: WebSocket) -> None:
        self._clients.discard(ws)

    async def handle(self, ws: WebSocket) -> None:
        """Run inside a FastAPI WebSocket route handler."""
        await self.connect(ws)
        try:
            while True:
                await ws.receive_text()   # keep-alive pings from UE
        except WebSocketDisconnect:
            self.disconnect(ws)

    # ------------------------------------------------------------------ #
    def update_snapshot(self, threat_graph: dict[str, Any]) -> None:
        """Called by the main app loop with fresh threat data."""
        nodes = []
        edges = []
        peers = threat_graph.get("peers", {})
        for idx, (peer_id, info) in enumerate(peers.items()):
            # Distribute nodes on a sphere for UE placement
            theta = (idx / max(1, len(peers))) * 2 * math.pi
            nodes.append({
                "id":      peer_id,
                "threat":  info.get("threat", "NORMAL"),
                "verdict": info.get("verdict", 0.0),
                "x":       round(math.cos(theta) * 500, 1),
                "y":       round(math.sin(theta) * 500, 1),
                "z":       0.0,
            })
            edges.append({
                "source": "local",
                "target": peer_id,
                "weight": info.get("verdict", 0.0),
                "active": info.get("threat", "NORMAL") != "BLOCK",
            })

        self._snapshot = {
            "ts":      time.time(),
            "schema":  "sovereign-nano-saib/v1",
            "nodes":   nodes,
            "edges":   edges,
            "summary": threat_graph.get("summary", {}),
        }

    async def broadcast_loop(self) -> None:
        """Background task — broadcast snapshot to all connected UE clients."""
        while True:
            await asyncio.sleep(self._interval)
            if not self._clients or not self._snapshot:
                continue
            dead = set()
            payload = json.dumps(self._snapshot)
            for ws in self._clients:
                try:
                    await ws.send_text(payload)
                    self._broadcast_count += 1
                except Exception:
                    dead.add(ws)
            self._clients -= dead

    def stats(self) -> dict:
        return {
            "connected_ue_clients": len(self._clients),
            "broadcasts":           self._broadcast_count,
            "interval_s":           self._interval,
        }

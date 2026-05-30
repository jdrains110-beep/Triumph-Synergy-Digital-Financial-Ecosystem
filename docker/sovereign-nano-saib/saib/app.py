"""
Sovereign Nano SAIB — Apex Defense Mesh
FastAPI application that unifies all five engines into one sovereign service.

Endpoints (all auth-gated by X-Bridge-Token / Authorization bearer):
  GET  /health                    — service health + engine status
  POST /defense/observe           — ingest a traffic event
  GET  /defense/verdict/{peer_id} — current threat verdict for one peer
  GET  /defense/summary           — fleet-wide threat summary
  POST /defense/tunnel/send       — route payload through obfuscated tunnel
  GET  /defense/neural/stats      — neural core stats
  POST /defense/neural/learn      — online supervised update
  GET  /defense/photonic/stats    — photonic lane stats
  WS   /ws/threat-graph           — Unreal Engine live feed (no auth — read-only)
"""
from __future__ import annotations

import asyncio
import os
import secrets
import time
from contextlib import asynccontextmanager
from typing import Any

from fastapi import (
    Depends, FastAPI, Header, HTTPException, WebSocket, BackgroundTasks,
)
from pydantic import BaseModel

from .obfuscator   import ProtocolObfuscator
from .tunneler     import TunnelManager
from .threat_model import ApexThreatModel, ThreatLevel
from .photonic     import PhotonicLane
from .neural       import NeuralLogicCore
from .unreal_bridge import UnrealEngineBridge

# ──────────────────────────────────────────────────────────────── config ──
SMB_URL       = os.getenv("SMB_URL", "http://triumph-sovereign-military-bridge:8199")
BRIDGE_TOKEN  = os.getenv("PUBLIC_BRIDGE_TOKEN", "")
_load_path    = "/run/secrets/public_bridge_token"
if not BRIDGE_TOKEN and os.path.exists(_load_path):
    BRIDGE_TOKEN = open(_load_path).read().strip()

START_TIME = time.time()

# ──────────────────────────────────────────────────────────────── engines ──
obfuscator   = ProtocolObfuscator()
tunnels      = TunnelManager(SMB_URL, BRIDGE_TOKEN)
threat_model = ApexThreatModel()
photonic     = PhotonicLane()
neural       = NeuralLogicCore()
ue_bridge    = UnrealEngineBridge(interval_s=1.0)

# ──────────────────────────────────────────────────────────────── auth ──
def _require_token(
    authorization:  str = Header("", alias="Authorization"),
    x_bridge_token: str = Header("", alias="X-Bridge-Token"),
) -> None:
    if not BRIDGE_TOKEN:
        return
    provided = ""
    if authorization.startswith("Bearer "):
        provided = authorization[7:]
    elif x_bridge_token:
        provided = x_bridge_token
    if not secrets.compare_digest(provided, BRIDGE_TOKEN):
        raise HTTPException(status_code=401, detail="Unauthorized")


# ────────────────────────────────────────────────────── background loop ──
async def _snapshot_loop() -> None:
    """Refresh UE snapshot every second from threat model."""
    while True:
        await asyncio.sleep(1)
        verdicts = threat_model.all_verdicts()
        peers    = {v["peer_id"]: {"threat": v["threat"],
                                    "verdict": (v["recent_z"] or [0])[-1] / 6.0}
                   for v in verdicts}
        ue_bridge.update_snapshot({"peers": peers, "summary": threat_model.summary()})


@asynccontextmanager
async def lifespan(app: FastAPI):
    asyncio.create_task(_snapshot_loop())
    asyncio.create_task(ue_bridge.broadcast_loop())
    print(
        "Sovereign Nano SAIB ONLINE — Port 8201\n"
        "Engines: Obfuscation | Tunneling | ApexThreat | Photonic | Neural | UnrealBridge"
    )
    yield


# ─────────────────────────────────────────────────────────────── app ──
app = FastAPI(
    title="Sovereign Nano SAIB — Apex Defense Mesh",
    version="1.0.0",
    lifespan=lifespan,
)

# ──────────────────────────────────────────────────────────────── models ──
class ObserveRequest(BaseModel):
    peer_id:     str
    byte_count:  int  = 0
    error:       bool = False
    payload_hex: str  = ""

class TunnelSendRequest(BaseModel):
    destination: str
    payload_hex: str

class LearnRequest(BaseModel):
    peer_id:        str
    anomaly_score:  float
    obfusc_entropy: float
    peer_trust:     float
    tunnel_health:  float
    label:          float          # 0 = benign, 1 = threat


# ─────────────────────────────────────────────────────────── endpoints ──

@app.get("/health")
def health():
    return {
        "status":   "healthy",
        "service":  "sovereign-nano-saib",
        "version":  "1.0.0",
        "uptime_s": round(time.time() - START_TIME, 1),
        "engines": {
            "obfuscator":    obfuscator.stats(),
            "tunnels":       tunnels.stats(),
            "threat_model":  threat_model.summary(),
            "photonic":      photonic.stats(),
            "neural":        neural.stats(),
            "unreal_bridge": ue_bridge.stats(),
        },
    }


@app.post("/defense/observe", dependencies=[Depends(_require_token)])
async def observe(req: ObserveRequest):
    threat = threat_model.observe(
        req.peer_id, req.byte_count, req.error, req.payload_hex,
    )
    verdict = threat_model.verdict(req.peer_id)

    # Feed neural core
    recent_z = (verdict["recent_z"] or [0.0])[-1]
    entropy  = float(len(req.payload_hex) / 1024)  # rough proxy
    summary  = threat_model.summary()
    n_bad    = sum(
        v for k, v in summary["by_level"].items()
        if k not in ("NORMAL", "MONITOR")
    )
    peer_trust   = 1.0 - (n_bad / max(1, summary["peer_count"]))
    tunnel_stats = tunnels.stats()
    total_sent   = sum(s["packets_sent"] for s in tunnel_stats.values()) if tunnel_stats else 1
    total_recv   = sum(s["packets_recv"] for s in tunnel_stats.values()) if tunnel_stats else 1
    tunnel_health = total_recv / max(1, total_sent)

    neural_out = neural.predict(recent_z, entropy, peer_trust, tunnel_health)

    return {
        "peer_id":     req.peer_id,
        "threat":      threat.value,
        "verdict":     verdict,
        "neural":      neural_out,
    }


@app.get("/defense/verdict/{peer_id}", dependencies=[Depends(_require_token)])
def get_verdict(peer_id: str):
    return threat_model.verdict(peer_id)


@app.get("/defense/summary", dependencies=[Depends(_require_token)])
def summary():
    return {
        "threat_summary": threat_model.summary(),
        "all_verdicts":   threat_model.all_verdicts(),
        "neural":         neural.stats(),
        "photonic":       photonic.stats(),
        "obfuscator":     obfuscator.stats(),
        "unreal_bridge":  ue_bridge.stats(),
    }


@app.post("/defense/tunnel/send", dependencies=[Depends(_require_token)])
async def tunnel_send(req: TunnelSendRequest):
    payload = bytes.fromhex(req.payload_hex) if req.payload_hex else b""
    session = tunnels.session(req.destination)
    result  = await session.send(req.destination, payload)
    # also log as an observation
    threat_model.observe(req.destination, len(payload))
    return result


@app.get("/defense/neural/stats", dependencies=[Depends(_require_token)])
def neural_stats():
    return neural.stats()


@app.post("/defense/neural/learn", dependencies=[Depends(_require_token)])
def neural_learn(req: LearnRequest):
    loss = neural.learn(
        req.anomaly_score, req.obfusc_entropy,
        req.peer_trust,    req.tunnel_health, req.label,
    )
    # treat label=1 events as observations too
    if req.label >= 0.5:
        threat_model.observe(req.peer_id)
    return {"loss": round(loss, 6)}


@app.get("/defense/photonic/stats", dependencies=[Depends(_require_token)])
def photonic_stats():
    return photonic.stats()


# ───────────────────────────────────── Unreal Engine WebSocket (public) ──
@app.websocket("/ws/threat-graph")
async def ws_threat_graph(ws: WebSocket):
    await ue_bridge.handle(ws)

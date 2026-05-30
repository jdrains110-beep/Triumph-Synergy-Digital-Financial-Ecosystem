"""
Sovereign Nano SAIB — Apex Warp Mesh v2.0
13-engine sovereign defense, intelligence, and execution platform.

Core engines (v1):
  Obfuscation | Tunneling | ApexThreat | Photonic | Neural | UnrealBridge

Warp expansion engines (v2):
  Quantum | Intelligence | WarpSpeed | Brainstorm | Mesh | Guardian | Enforcer

Endpoints — all auth-gated except /health, /ws/threat-graph, /mesh/gossip:
  GET  /health
  POST /defense/observe
  GET  /defense/verdict/{peer_id}
  GET  /defense/summary
  POST /defense/tunnel/send
  GET  /defense/neural/stats
  POST /defense/neural/learn
  GET  /defense/photonic/stats
  --- Warp v2 ---
  GET  /quantum/stats
  POST /intel/signal             — ingest intelligence signal
  GET  /intel/entity/{entity_id} — entity profile
  GET  /intel/threats            — top threats
  POST /intel/link               — link two entities in causal graph
  GET  /intel/predict/{entity_id}— trajectory prediction
  GET  /warp/stats
  POST /warp/burst               — fire a named task burst
  POST /brainstorm/goal          — submit a goal
  POST /brainstorm/cycle         — advance OODA cycle
  GET  /brainstorm/stats
  POST /mesh/register            — register a peer SAIB
  POST /mesh/gossip              — ingest gossip from peer (no auth — mesh-internal)
  POST /mesh/collective          — fan-out observe to all peers
  GET  /mesh/stats
  POST /guardian/ingest          — ingest a threat indicator
  POST /guardian/ack/{alert_id}  — acknowledge alert
  GET  /guardian/summary
  POST /enforcer/evaluate        — evaluate policies for an entity
  POST /enforcer/kill/{entity_id}
  POST /enforcer/release/{entity_id}
  GET  /enforcer/audit
  GET  /enforcer/stats
  WS   /ws/threat-graph          — Unreal Engine live feed (public)
"""
from __future__ import annotations

import asyncio
import os
import secrets
import time
import uuid
from contextlib import asynccontextmanager
from typing import Any, Optional

from fastapi import Depends, FastAPI, Header, HTTPException, WebSocket
from pydantic import BaseModel

# ── v1 engines ──────────────────────────────────────────────────────────────
from .obfuscator    import ProtocolObfuscator
from .tunneler      import TunnelManager
from .threat_model  import ApexThreatModel, ThreatLevel
from .photonic      import PhotonicLane
from .neural        import NeuralLogicCore
from .unreal_bridge import UnrealEngineBridge

# ── v2 warp engines ──────────────────────────────────────────────────────────
from .quantum      import QuantumLayer
from .intelligence import SovereignIntelligence, Signal as IntelSignal
from .warp         import WarpSpeedEngine, WarpLane
from .brainstorm   import BrainstormEngine, Goal, GoalPriority
from .mesh         import SaibMesh
from .guardian     import FounderGuardian, ThreatIndicator, ProtectionCategory
from .enforcer     import SovereignEnforcer

# ──────────────────────────────────────────────────────────────── config ──
SMB_URL      = os.getenv("SMB_URL", "http://triumph-sovereign-military-bridge:8199")
BRIDGE_TOKEN = os.getenv("PUBLIC_BRIDGE_TOKEN", "")
_secret_path = "/run/secrets/public_bridge_token"
if not BRIDGE_TOKEN and os.path.exists(_secret_path):
    BRIDGE_TOKEN = open(_secret_path).read().strip()

START_TIME = time.time()
VERSION    = "2.0.0"

# ──────────────────────────────────────────────────────────────── engines ──
# v1
obfuscator   = ProtocolObfuscator()
tunnels      = TunnelManager(SMB_URL, BRIDGE_TOKEN)
threat_model = ApexThreatModel()
photonic     = PhotonicLane()
neural       = NeuralLogicCore()
ue_bridge    = UnrealEngineBridge(interval_s=1.0)

# v2
quantum      = QuantumLayer()
intel        = SovereignIntelligence()
warp         = WarpSpeedEngine()
brainstorm   = BrainstormEngine()
mesh         = SaibMesh(own_id="sovereign-nano-saib")
guardian     = FounderGuardian()
enforcer     = SovereignEnforcer()

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


# ──────────────────────────────────────────────────── background loops ──
async def _snapshot_loop() -> None:
    while True:
        await asyncio.sleep(1)
        verdicts = threat_model.all_verdicts()
        peers = {
            v["peer_id"]: {
                "threat":  v["threat"],
                "verdict": (v["recent_z"] or [0])[-1] / 6.0,
                "intel":   intel.entity_profile(v["peer_id"]) or {},
                "enforcer_tier": enforcer._entity_tiers.get(v["peer_id"], None) and
                                 enforcer._entity_tiers[v["peer_id"]].name,
            }
            for v in verdicts
        }
        ue_bridge.update_snapshot({
            "peers":   peers,
            "summary": threat_model.summary(),
            "guardian_tier": guardian._overall_tier.name,
            "warp_tps": warp.tasks_per_sec(),
        })


@asynccontextmanager
async def lifespan(app: FastAPI):
    asyncio.create_task(_snapshot_loop())
    asyncio.create_task(ue_bridge.broadcast_loop())
    mesh.start()
    brainstorm.start_background()
    print(
        f"Sovereign Nano SAIB ONLINE — Port 8201  v{VERSION}\n"
        "Engines v1: Obfuscation | Tunneling | ApexThreat | Photonic | Neural | UnrealBridge\n"
        "Engines v2: Quantum | Intelligence | WarpSpeed | Brainstorm | Mesh | Guardian | Enforcer"
    )
    yield


# ─────────────────────────────────────────────────────────────── app ──
app = FastAPI(
    title="Sovereign Nano SAIB — Apex Warp Mesh",
    version=VERSION,
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
    label:          float

class IntelSignalRequest(BaseModel):
    source:      str
    entity_id:   str
    signal_type: str   = "network"
    value:       float = 0.5
    confidence:  float = 0.8
    metadata:    dict  = {}

class IntelLinkRequest(BaseModel):
    src:      str
    dst:      str
    relation: str   = "associated"
    weight:   float = 1.0

class WarpBurstRequest(BaseModel):
    tasks: list[str]   # task names to simulate — real delegation via mesh
    lane:  str = "HIGH"

class GoalRequest(BaseModel):
    description: str
    priority:    float = 0.5
    domain:      str   = "general"
    deadline:    Optional[float] = None

class OODACycleRequest(BaseModel):
    goal_id:     str
    observation: Optional[dict] = None
    fast:        bool = False   # run_to_completion in one shot

class MeshRegisterRequest(BaseModel):
    peer_id: str
    url:     str
    token:   str

class GuardianIngestRequest(BaseModel):
    source:      str
    category:    str   = "DIGITAL_INTRUSION"
    severity:    float = 0.5
    description: str   = ""
    metadata:    dict  = {}

class EnforcerEvalRequest(BaseModel):
    entity_id:     str
    neural_action: str = ""
    threat_level:  str = ""
    guardian_tier: str = ""
    intel_class:   str = ""


# ═══════════════════════════════════════════════════ v1 endpoints (unchanged) ══

@app.get("/health")
def health():
    return {
        "status":   "healthy",
        "service":  "sovereign-nano-saib",
        "version":  VERSION,
        "uptime_s": round(time.time() - START_TIME, 1),
        "engines_v1": {
            "obfuscator":    obfuscator.stats(),
            "tunnels":       tunnels.stats(),
            "threat_model":  threat_model.summary(),
            "photonic":      photonic.stats(),
            "neural":        neural.stats(),
            "unreal_bridge": ue_bridge.stats(),
        },
        "engines_v2": {
            "quantum":      quantum.stats(),
            "intelligence": intel.stats(),
            "warp":         warp.stats(),
            "brainstorm":   brainstorm.stats(),
            "mesh":         mesh.stats(),
            "guardian":     guardian.summary(),
            "enforcer":     enforcer.stats(),
        },
    }


def _build_context(req_peer_id: str) -> tuple[dict, dict]:
    """Build threat context + neural output for a peer, used by /defense/observe."""
    verdict     = threat_model.verdict(req_peer_id)
    recent_z    = (verdict["recent_z"] or [0.0])[-1]
    summary     = threat_model.summary()
    n_bad       = sum(v for k, v in summary["by_level"].items()
                      if k not in ("NORMAL", "MONITOR"))
    peer_trust  = 1.0 - (n_bad / max(1, summary["peer_count"]))
    ts          = tunnels.stats()
    total_sent  = sum(s["packets_sent"] for s in ts.values()) if ts else 1
    total_recv  = sum(s["packets_recv"] for s in ts.values()) if ts else 1
    tunnel_health = total_recv / max(1, total_sent)
    entropy     = float(len(req_peer_id) / 64)  # placeholder entropy proxy
    neural_out  = neural.predict(recent_z, entropy, peer_trust, tunnel_health)
    return verdict, neural_out


@app.post("/defense/observe", dependencies=[Depends(_require_token)])
async def observe(req: ObserveRequest):
    threat = threat_model.observe(req.peer_id, req.byte_count, req.error, req.payload_hex)
    verdict, neural_out = _build_context(req.peer_id)

    # ── also feed intelligence engine ──
    sig = IntelSignal(
        source="defense_observe",
        entity_id=req.peer_id,
        signal_type="network",
        value=min(req.byte_count / 65536, 1.0) if req.byte_count else 0.1,
        confidence=0.75,
    )
    intel_result = intel.ingest_signal(sig)

    # ── enforcer evaluation ──
    enf = enforcer.evaluate(req.peer_id, {
        "neural_action": neural_out.get("action", ""),
        "threat_level":  threat.value,
        "intel_class":   intel_result.get("threat_class", ""),
    })

    return {
        "peer_id":    req.peer_id,
        "threat":     threat.value,
        "verdict":    verdict,
        "neural":     neural_out,
        "intel":      intel_result,
        "enforcer":   enf,
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
        "guardian":       guardian.summary(),
        "enforcer":       enforcer.stats(),
        "warp":           warp.stats(),
    }


@app.post("/defense/tunnel/send", dependencies=[Depends(_require_token)])
async def tunnel_send(req: TunnelSendRequest):
    payload = bytes.fromhex(req.payload_hex) if req.payload_hex else b""
    session = tunnels.session(req.destination)
    result  = await session.send(req.destination, payload)
    threat_model.observe(req.destination, len(payload))
    return result


@app.get("/defense/neural/stats", dependencies=[Depends(_require_token)])
def neural_stats():
    return neural.stats()


@app.post("/defense/neural/learn", dependencies=[Depends(_require_token)])
def neural_learn(req: LearnRequest):
    loss = neural.learn(
        req.anomaly_score, req.obfusc_entropy,
        req.peer_trust, req.tunnel_health, req.label,
    )
    if req.label >= 0.5:
        threat_model.observe(req.peer_id)
    return {"loss": round(loss, 6)}


@app.get("/defense/photonic/stats", dependencies=[Depends(_require_token)])
def photonic_stats():
    return photonic.stats()


# ═══════════════════════════════════════════════════ QUANTUM ══════════════════

@app.get("/quantum/stats", dependencies=[Depends(_require_token)])
def quantum_stats():
    return quantum.stats()


@app.post("/quantum/keygen", dependencies=[Depends(_require_token)])
def quantum_keygen():
    key = quantum.generate_session_key()
    return {"key_hex": key.hex(), "bits": 256, "source": "QRNG+HKDF-SHA384"}


# ═══════════════════════════════════════════════════ INTELLIGENCE ══════════════

@app.post("/intel/signal", dependencies=[Depends(_require_token)])
def intel_ingest(req: IntelSignalRequest):
    sig = IntelSignal(
        source=req.source,
        entity_id=req.entity_id,
        signal_type=req.signal_type,
        value=req.value,
        confidence=req.confidence,
        metadata=req.metadata,
    )
    return intel.ingest_signal(sig)


@app.get("/intel/entity/{entity_id}", dependencies=[Depends(_require_token)])
def intel_entity(entity_id: str):
    profile = intel.entity_profile(entity_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Entity not found")
    return profile


@app.get("/intel/threats", dependencies=[Depends(_require_token)])
def intel_threats(n: int = 10):
    return intel.top_threats(min(n, 50))


@app.post("/intel/link", dependencies=[Depends(_require_token)])
def intel_link(req: IntelLinkRequest):
    intel.link(req.src, req.dst, req.relation, req.weight)
    return {"linked": True, "src": req.src, "dst": req.dst}


@app.get("/intel/predict/{entity_id}", dependencies=[Depends(_require_token)])
def intel_predict(entity_id: str):
    return intel.predict_trajectory(entity_id)


@app.get("/intel/stats", dependencies=[Depends(_require_token)])
def intel_stats():
    return intel.stats()


# ═══════════════════════════════════════════════════ WARP ══════════════════════

@app.get("/warp/stats", dependencies=[Depends(_require_token)])
def warp_stats():
    return warp.stats()


@app.post("/warp/burst", dependencies=[Depends(_require_token)])
async def warp_burst(req: WarpBurstRequest):
    """Simulate a warp burst — each task name fires as a no-op coro."""
    lane_map = {
        "CRITICAL": WarpLane.CRITICAL,
        "HIGH": WarpLane.HIGH,
        "NORMAL": WarpLane.NORMAL,
        "BACKGROUND": WarpLane.BACKGROUND,
    }
    lane = lane_map.get(req.lane.upper(), WarpLane.HIGH)

    async def _noop():
        return "ok"

    results = await warp.warp_burst([_noop for _ in req.tasks[:32]], lane)
    return {
        "tasks_fired": len(results),
        "successes": sum(1 for r in results if r.success),
        "warp_stats": warp.stats(),
    }


# ═══════════════════════════════════════════════════ BRAINSTORM ════════════════

@app.post("/brainstorm/goal", dependencies=[Depends(_require_token)])
def brainstorm_goal(req: GoalRequest):
    goal = Goal(
        id=str(uuid.uuid4())[:8],
        description=req.description,
        priority=req.priority,
        domain=req.domain,
        deadline=req.deadline,
    )
    goal_id = brainstorm.submit_goal(goal)
    return {"goal_id": goal_id, "status": "submitted"}


@app.post("/brainstorm/cycle", dependencies=[Depends(_require_token)])
def brainstorm_cycle(req: OODACycleRequest):
    if req.fast:
        return {"results": brainstorm.run_to_completion(req.goal_id, req.observation)}
    return brainstorm.cycle(req.goal_id, req.observation)


@app.get("/brainstorm/stats", dependencies=[Depends(_require_token)])
def brainstorm_stats():
    return brainstorm.stats()


# ═══════════════════════════════════════════════════ MESH ══════════════════════

@app.post("/mesh/register", dependencies=[Depends(_require_token)])
def mesh_register(req: MeshRegisterRequest):
    mesh.register_peer(req.peer_id, req.url, req.token)
    return {"registered": req.peer_id, "mesh_size": len(mesh._peers)}


@app.post("/mesh/gossip")  # no auth — inter-mesh internal
async def mesh_gossip(payload: dict):
    mesh.ingest_gossip(payload)
    return {"received": True}


@app.post("/mesh/collective", dependencies=[Depends(_require_token)])
async def mesh_collective(req: ObserveRequest):
    results = await mesh.collective_observe(req.model_dump())
    return {"results": results, "peers_reached": len(results)}


@app.get("/mesh/quorum/{entity_id}", dependencies=[Depends(_require_token)])
def mesh_quorum(entity_id: str):
    return mesh.quorum_verdict(entity_id)


@app.get("/mesh/stats", dependencies=[Depends(_require_token)])
def mesh_stats():
    return mesh.stats()


# ═══════════════════════════════════════════════════ GUARDIAN ══════════════════

@app.post("/guardian/ingest", dependencies=[Depends(_require_token)])
def guardian_ingest(req: GuardianIngestRequest):
    try:
        cat = ProtectionCategory(req.category)
    except ValueError:
        cat = ProtectionCategory.DIGITAL_INTRUSION
    ind = ThreatIndicator(
        source=req.source,
        category=cat,
        severity=req.severity,
        description=req.description,
        metadata=req.metadata,
    )
    return guardian.ingest(ind)


@app.post("/guardian/ack/{alert_id}", dependencies=[Depends(_require_token)])
def guardian_ack(alert_id: str):
    ok = guardian.acknowledge(alert_id)
    return {"acknowledged": ok, "alert_id": alert_id}


@app.get("/guardian/summary", dependencies=[Depends(_require_token)])
def guardian_summary():
    return guardian.summary()


# ═══════════════════════════════════════════════════ ENFORCER ══════════════════

@app.post("/enforcer/evaluate", dependencies=[Depends(_require_token)])
def enforcer_evaluate(req: EnforcerEvalRequest):
    ctx = {k: v for k, v in req.model_dump().items()
           if k != "entity_id" and v}
    return enforcer.evaluate(req.entity_id, ctx)


@app.post("/enforcer/kill/{entity_id}", dependencies=[Depends(_require_token)])
def enforcer_kill(entity_id: str):
    return enforcer.engage_kill_switch(entity_id)


@app.post("/enforcer/release/{entity_id}", dependencies=[Depends(_require_token)])
def enforcer_release(entity_id: str):
    return enforcer.release_kill_switch(entity_id)


@app.get("/enforcer/audit", dependencies=[Depends(_require_token)])
def enforcer_audit(n: int = 20):
    return enforcer.audit_trail(min(n, 100))


@app.get("/enforcer/stats", dependencies=[Depends(_require_token)])
def enforcer_stats():
    return enforcer.stats()


# ══════════════════════════════════ Unreal Engine WebSocket (public) ══════════

@app.websocket("/ws/threat-graph")
async def ws_threat_graph(ws: WebSocket):
    await ue_bridge.handle(ws)


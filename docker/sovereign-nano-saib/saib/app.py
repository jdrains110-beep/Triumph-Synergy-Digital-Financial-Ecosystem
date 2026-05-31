"""
Sovereign Nano SAIB — Nano Omega Prime Superior Sovereign Framework v6
19-engine + 6-connector + Omega Prime three-mode sovereign platform.

v6 additions:
  OmegaPrime (Mesh | Container | Ecosystem modes)
  OmegaBrain (warp-speed triple/quadruple knowledge growth)
  FounderPresence (real-world + digital dual-domain protection)
  Interaction Engine (SAIB responds to any entity that contacts it)

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
  --- Connectors v3 ---
  GET  /connectors/status        — all connector health
  GET  /connectors/pi/stats      — Pi Network connector
  POST /connectors/pi/payment/approve
  POST /connectors/pi/payment/complete
  POST /connectors/pi/payment/cancel
  GET  /connectors/pi/payment/{payment_id}
  POST /connectors/pi/wallet/register
  GET  /connectors/db/query      — Triumph DB read-only query
  GET  /connectors/knowledge/facts
  GET  /connectors/knowledge/threats
  GET  /connectors/founder/status
  GET  /connectors/founder/events
  POST /connectors/founder/ack/{event_id}
  GET  /connectors/autonomous/decisions
  GET  /connectors/autonomous/pending
  POST /connectors/autonomous/approve/{decision_id}
  POST /connectors/autonomous/reject/{decision_id}
  POST /connectors/actions/discord
  POST /connectors/actions/slack
  POST /connectors/actions/webhook
  POST /connectors/actions/enforce
  GET  /connectors/actions/audit
  --- X Social v3 ---
  GET  /connectors/x/stats           — @jaymoney0300 monitor stats
  GET  /connectors/x/mentions        — recent @jaymoney0300 mentions
  GET  /connectors/x/threats         — hostile / impersonation mentions
  GET  /connectors/x/search          — recent Triumph Synergy search hits
  GET  /connectors/x/timeline        — @jaymoney0300 recent tweets
  POST /connectors/x/tweet           — post tweet as @jaymoney0300
  POST /connectors/x/reply           — reply to a tweet as @jaymoney0300
  POST /connectors/x/quote           — quote-tweet as @jaymoney0300
  --- Grok AI v3 ---
  GET  /connectors/grok/stats         — model, call count, token usage
  POST /connectors/grok/complete      — raw Grok completion
  POST /connectors/grok/analyze       — threat signal deep analysis
  POST /connectors/grok/strategic     — sovereign strategic advisory
  POST /connectors/grok/draft-tweet   — compose tweet for @jaymoney0300
  POST /connectors/grok/summarize     — condense text to key insights
  POST /connectors/grok/provision-key  — SAIB self-provisions fresh xAI key via mgmt token
"""
from __future__ import annotations

import asyncio
import os
import secrets
import time
import uuid
from contextlib import asynccontextmanager
from typing import Any, Optional

from fastapi import Depends, FastAPI, Header, HTTPException, Request, WebSocket
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

# ── v3 connector layer ────────────────────────────────────────────────────────
from .connectors.orchestrator import orchestrator as conn_orchestrator

# ── v4 apex engines ────────────────────────────────────────────────────────────
from .healer     import healer     as _healer_engine
from .bot_defense import bot_defense as _bot_defense_engine

# ── v5 sovereign apex engines ────────────────────────────────────────────────
from .external_registry import external_registry, ExternalServiceSpec
from .log_ingestion     import pull_logs_for_service, start_syslog_receiver
from .code_analyzer     import analyse_code
from .fix_engine        import generate_fix, deliver_github_pr, deliver_gitlab_mr, deliver_webhook
from .mcp_server        import mcp_server
from .tenant_auth       import tenant_auth
from .k8s_adapter       import k8s_adapter
from .external_registry import LogSourceType, StackType

# ── v5 billing + Pi payments ─────────────────────────────────────────────────
from .billing    import billing_engine, BillingPlan, SessionState, PLAN_CATALOG
from .pi_payments import pi_processor

# ── v6 Omega Prime engines ────────────────────────────────────────────────────
from .omega_prime      import omega_prime, OmegaMode
from .founder_presence import founder_presence, FounderPresenceEvent, ReimbursementClaim

# ──────────────────────────────────────────────────────────────── config ──
SMB_URL      = os.getenv("SMB_URL", "http://triumph-sovereign-military-bridge:8199")
BRIDGE_TOKEN = os.getenv("PUBLIC_BRIDGE_TOKEN", "")
_secret_path = "/run/secrets/public_bridge_token"
if not BRIDGE_TOKEN and os.path.exists(_secret_path):
    BRIDGE_TOKEN = open(_secret_path).read().strip()

START_TIME = time.time()
VERSION    = "6.0.0-OMEGA-PRIME"

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
    x_saib_session: str = Header("", alias="X-SAIB-Session"),
) -> None:
    # Internal bridge token — always bypasses billing
    if not BRIDGE_TOKEN:
        return
    provided = ""
    if authorization.startswith("Bearer "):
        provided = authorization[7:]
    elif x_bridge_token:
        provided = x_bridge_token
    if provided and secrets.compare_digest(provided, BRIDGE_TOKEN):
        return
    # External access via billing session token
    if x_saib_session:
        allowed, reason = billing_engine.check_access(x_saib_session)
        if allowed:
            return
        if "expired" in reason:
            raise HTTPException(
                status_code=402,
                detail={
                    "error":   reason,
                    "message": "Session expired — pay with Pi or USD to continue.",
                    "plans":   "/billing/plans",
                    "start":   "/billing/session/start",
                },
            )
    raise HTTPException(
        status_code=401,
        detail=(
            "Unauthorized — use bridge token or start a free session at "
            "/billing/session/start"
        ),
    )


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
    # ── boot v3 connector layer ──
    conn_orchestrator.boot(
        intel      = intel,
        guardian   = guardian,
        enforcer   = enforcer,
        brainstorm = brainstorm,
        warp       = warp,
        mesh       = mesh,
    )
    # ── boot v4 apex engines ──
    _grok_ref = conn_orchestrator.grok
    _x_ref    = conn_orchestrator.x_social
    _healer_engine.boot(
        grok         = _grok_ref,
        warp         = warp,
        guardian     = guardian,
        # v5 modules
        registry     = external_registry,
        log_ingest   = pull_logs_for_service,
        code_analyzer = analyse_code,
        fix_engine   = True,   # signals fix_engine is available
        k8s_adapter  = k8s_adapter,
    )
    _bot_defense_engine.boot(grok=_grok_ref, x_social=_x_ref, guardian=guardian)
    # ── boot v5 sovereign apex engines ──
    k8s_adapter.boot()
    mcp_server.boot(healer=_healer_engine, registry=external_registry, grok=_grok_ref)
    start_syslog_receiver(port=9514)
    billing_engine.boot(pi_processor=pi_processor)
    # ── boot v6 Omega Prime ──
    omega_prime.boot(
        mesh       = mesh,
        guardian   = guardian,
        enforcer   = enforcer,
        brainstorm = brainstorm,
        warp       = warp,
        intel      = intel,
        grok       = conn_orchestrator.grok,
        x_social   = conn_orchestrator.x_social,
        healer     = _healer_engine,
    )
    founder_presence._brain = omega_prime.brain   # share brain
    asyncio.create_task(omega_prime.run_forever())
    print(
        f"Sovereign Nano SAIB ONLINE — Port 8201  v{VERSION}\n"
        "Engines v1: Obfuscation | Tunneling | ApexThreat | Photonic | Neural | UnrealBridge\n"
        "Engines v2: Quantum | Intelligence | WarpSpeed | Brainstorm | Mesh | Guardian | Enforcer\n"
        "Connectors v3: PiNetwork | TriumphDB | OutboundActions | KnowledgeFeed | FounderWatch | AutonomousDecisions | XSocial(@jaymoney0300) | GrokAI(xAI)\n"
        "Apex v4: SovereignHealer(auto-heal all services) | BotDefense(scammer/bot detection+block)\n"
        "Sovereign Apex v5: ExternalRegistry | LogIngestion | CodeAnalyzer | FixEngine | MCP | TenantAuth | K8s\n"
        "Billing v5: FreeSession(30min) | Pi(mainnet) | USD(Stripe+regional) | FounderSplit(15%)\n"
        "Omega Prime v6: THREE MODES (Mesh|Container|Ecosystem) | OmegaBrain(warp-speed 3x/4x growth) | FounderPresence(real+digital) | InteractionEngine"
    )
    yield


# ─────────────────────────────────────────────────────────────── app ──
app = FastAPI(
    title="Sovereign Nano SAIB — Apex Sovereign Connector Mesh",
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


# ── Connector request models ──────────────────────────────────────────────────

class PiPaymentApproveRequest(BaseModel):
    payment_id: str

class PiPaymentCompleteRequest(BaseModel):
    payment_id: str
    txid:       str

class PiWalletRegisterRequest(BaseModel):
    address: str

class DBQueryRequest(BaseModel):
    table:   str
    select:  str  = "*"
    filters: dict = {}
    limit:   int  = 50

class KnowledgeFactsRequest(BaseModel):
    domain:  Optional[str] = None
    min_sev: float = 0.0
    limit:   int   = 50

class DiscordAlertRequest(BaseModel):
    title:   str
    message: str
    level:   str = "ALERT"

class SlackAlertRequest(BaseModel):
    title:   str
    message: str
    level:   str = "ALERT"

class WebhookFireRequest(BaseModel):
    url:     str
    payload: dict
    headers: dict = {}
    method:  str  = "POST"

class EnforceEntityRequest(BaseModel):
    entity_id: str
    action:    str = "freeze_wallet"
    reason:    str = ""

class RejectDecisionRequest(BaseModel):
    reason: str = ""

class XPostTweetRequest(BaseModel):
    text: str

class XReplyRequest(BaseModel):
    text:           str
    reply_to_id:    str

class XQuoteRequest(BaseModel):
    text:           str
    quote_tweet_id: str

class GrokCompleteRequest(BaseModel):
    prompt:      str
    system:      Optional[str]   = None
    temperature: Optional[float] = None
    max_tokens:  Optional[int]   = None

class GrokAnalyzeRequest(BaseModel):
    signal: dict

class GrokStrategicRequest(BaseModel):
    context: dict

class GrokDraftTweetRequest(BaseModel):
    topic: str
    tone:  str = "confident"

class GrokSummarizeRequest(BaseModel):
    text:      str
    max_words: int = 150


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
        "connectors_v3": conn_orchestrator.status() if conn_orchestrator._is_running else "booting",
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


# ══════════════════════════════════════════════ CONNECTORS v3 ══════════════════

# ── Connector status ──────────────────────────────────────────────────────────

@app.get("/connectors/status", dependencies=[Depends(_require_token)])
def connectors_status():
    return conn_orchestrator.status()


# ── Pi Network ────────────────────────────────────────────────────────────────

@app.get("/connectors/pi/stats", dependencies=[Depends(_require_token)])
def pi_stats():
    return conn_orchestrator.pi.stats() if conn_orchestrator.pi else {"error": "not started"}


@app.get("/connectors/pi/protocol", dependencies=[Depends(_require_token)])
def pi_protocol():
    """Current Pi Network protocol version state + upgrade history.

    Returns the live stellar-core version, Horizon version, Stellar ledger
    protocol number, and the complete history of all detected upgrades.
    The SAIB fires alerts across Intel / Guardian / Discord the instant any
    of these version numbers change so the ecosystem stays in sync with Pi
    mainnet on every protocol hop (e.g. v23 → v24).
    """
    if not conn_orchestrator.pi:
        return {"error": "not started"}
    ps = conn_orchestrator.pi.get_protocol_state()
    return {
        "core_version":           ps.core_version,
        "core_version_num":       ps.core_version_num,
        "horizon_version":        ps.horizon_version,
        "horizon_version_num":    ps.horizon_version_num,
        "network_protocol":       ps.network_protocol,
        "network_passphrase":     ps.network_passphrase,
        "history_latest_ledger":  ps.history_latest,
        "last_checked":           ps.last_checked,
        "upgraded_at":            ps.upgraded_at,
        "previous": {
            "core_version_num":    ps.previous_core_num,
            "horizon_version_num": ps.previous_horizon_num,
            "network_protocol":    ps.previous_network_protocol,
        },
        "upgrade_history": ps.upgrade_history,
    }


@app.post("/connectors/pi/wallet/register", dependencies=[Depends(_require_token)])
def pi_wallet_register(req: PiWalletRegisterRequest):
    conn_orchestrator.pi.register_wallet(req.address)
    return {"registered": req.address}


@app.post("/connectors/pi/payment/approve", dependencies=[Depends(_require_token)])
async def pi_payment_approve(req: PiPaymentApproveRequest):
    result = await conn_orchestrator.pi.approve_payment(req.payment_id)
    return result


@app.post("/connectors/pi/payment/complete", dependencies=[Depends(_require_token)])
async def pi_payment_complete(req: PiPaymentCompleteRequest):
    result = await conn_orchestrator.pi.complete_payment(req.payment_id, req.txid)
    return result


@app.post("/connectors/pi/payment/cancel", dependencies=[Depends(_require_token)])
async def pi_payment_cancel(req: PiPaymentApproveRequest):
    result = await conn_orchestrator.pi.cancel_payment(req.payment_id)
    return result


@app.get("/connectors/pi/payment/{payment_id}", dependencies=[Depends(_require_token)])
async def pi_payment_get(payment_id: str):
    result = await conn_orchestrator.pi.get_payment(payment_id)
    return result


# ── Triumph DB ────────────────────────────────────────────────────────────────

@app.post("/connectors/db/query", dependencies=[Depends(_require_token)])
async def db_query(req: DBQueryRequest):
    """Read-only query into the Triumph Synergy Supabase database."""
    rows = await conn_orchestrator.db.query(
        table=req.table,
        select=req.select,
        filters=req.filters or None,
        limit=min(req.limit, 200),
    )
    return {"rows": rows, "count": len(rows)}


@app.get("/connectors/db/stats", dependencies=[Depends(_require_token)])
def db_stats():
    return conn_orchestrator.db.stats() if conn_orchestrator.db else {}


# ── Knowledge Feed ────────────────────────────────────────────────────────────

@app.post("/connectors/knowledge/facts", dependencies=[Depends(_require_token)])
def knowledge_facts(req: KnowledgeFactsRequest):
    facts = conn_orchestrator.knowledge.get_facts(
        domain=req.domain,
        min_sev=req.min_sev,
        limit=min(req.limit, 200),
    )
    return {"facts": [f.__dict__ for f in facts], "count": len(facts)}


@app.get("/connectors/knowledge/threats", dependencies=[Depends(_require_token)])
def knowledge_threats(n: int = 10):
    facts = conn_orchestrator.knowledge.top_threats(min(n, 50))
    return {"threats": [f.__dict__ for f in facts]}


@app.get("/connectors/knowledge/stats", dependencies=[Depends(_require_token)])
def knowledge_stats():
    return conn_orchestrator.knowledge.stats() if conn_orchestrator.knowledge else {}


# ── Founder Watch ─────────────────────────────────────────────────────────────

@app.get("/connectors/founder/status", dependencies=[Depends(_require_token)])
def founder_status():
    fw = conn_orchestrator.founder
    if not fw:
        return {"error": "not started"}
    return {
        "stats":  fw.stats(),
        "profile": {
            "threat_score":      fw.profile.threat_score,
            "current_level":     fw.profile.current_level.name,
            "wallet_balance":    fw.profile.wallet_balance,
            "wallet_velocity":   fw.profile.wallet_velocity,
            "active_sessions":   fw.profile.active_sessions,
            "countries_seen":    fw.profile.countries_seen,
            "last_seen_country": fw.profile.last_seen_country,
        },
    }


@app.get("/connectors/founder/events", dependencies=[Depends(_require_token)])
def founder_events(min_level: int = 1):
    fw = conn_orchestrator.founder
    if not fw:
        return {"events": []}
    from .connectors.founder_watch import FounderAlertLevel
    try:
        level = FounderAlertLevel(min_level)
    except ValueError:
        level = FounderAlertLevel.WATCH
    events = fw.active_events(level)
    return {
        "events": [
            {
                "event_id":    e.event_id,
                "category":    e.category,
                "level":       e.level.name,
                "title":       e.title,
                "description": e.description,
                "evidence":    e.evidence,
                "ts":          e.ts,
            }
            for e in events
        ],
        "count": len(events),
    }


@app.post("/connectors/founder/ack/{event_id}", dependencies=[Depends(_require_token)])
def founder_ack(event_id: str):
    fw = conn_orchestrator.founder
    if not fw:
        raise HTTPException(status_code=503, detail="FounderWatch not started")
    ok = fw.acknowledge(event_id)
    return {"acknowledged": ok, "event_id": event_id}


# ── Autonomous Decisions ──────────────────────────────────────────────────────

@app.get("/connectors/autonomous/decisions", dependencies=[Depends(_require_token)])
def autonomous_decisions(n: int = 50):
    ad = conn_orchestrator.autonomous
    return {
        "history": ad.history(min(n, 200)) if ad else [],
        "stats":   ad.stats() if ad else {},
    }


@app.get("/connectors/autonomous/pending", dependencies=[Depends(_require_token)])
def autonomous_pending():
    ad = conn_orchestrator.autonomous
    return {
        "pending": ad.pending_review() if ad else [],
    }


@app.post("/connectors/autonomous/approve/{decision_id}", dependencies=[Depends(_require_token)])
def autonomous_approve(decision_id: str):
    ad = conn_orchestrator.autonomous
    if not ad:
        raise HTTPException(status_code=503, detail="AutonomousDecisions not started")
    ok = ad.approve(decision_id)
    return {"approved": ok, "decision_id": decision_id}


@app.post("/connectors/autonomous/reject/{decision_id}", dependencies=[Depends(_require_token)])
def autonomous_reject(decision_id: str, req: RejectDecisionRequest):
    ad = conn_orchestrator.autonomous
    if not ad:
        raise HTTPException(status_code=503, detail="AutonomousDecisions not started")
    ok = ad.reject(decision_id, req.reason)
    return {"rejected": ok, "decision_id": decision_id}


# ── Outbound Actions ──────────────────────────────────────────────────────────

@app.post("/connectors/actions/discord", dependencies=[Depends(_require_token)])
async def actions_discord(req: DiscordAlertRequest):
    result = await conn_orchestrator.actions.discord_alert(
        title=req.title, message=req.message, level=req.level
    )
    return result.__dict__


@app.post("/connectors/actions/slack", dependencies=[Depends(_require_token)])
async def actions_slack(req: SlackAlertRequest):
    result = await conn_orchestrator.actions.slack_alert(
        title=req.title, message=req.message, level=req.level
    )
    return result.__dict__


@app.post("/connectors/actions/webhook", dependencies=[Depends(_require_token)])
async def actions_webhook(req: WebhookFireRequest):
    result = await conn_orchestrator.actions.webhook_fire(
        url=req.url, payload=req.payload, headers=req.headers, method=req.method
    )
    return result.__dict__


@app.post("/connectors/actions/enforce", dependencies=[Depends(_require_token)])
async def actions_enforce(req: EnforceEntityRequest):
    result = await conn_orchestrator.actions.enforce_entity(
        entity_id=req.entity_id, action=req.action, reason=req.reason
    )
    return result.__dict__


@app.get("/connectors/actions/audit", dependencies=[Depends(_require_token)])
def actions_audit(n: int = 50):
    return {
        "audit": conn_orchestrator.actions.audit_trail(min(n, 200)) if conn_orchestrator.actions else [],
        "stats": conn_orchestrator.actions.stats() if conn_orchestrator.actions else {},
    }


# ── X Social (@jaymoney0300 + Triumph Synergy) ────────────────────────────────

def _x() -> Any:
    """Shorthand: returns the live X social connector or raises 503."""
    c = conn_orchestrator.x_social
    if not c:
        raise HTTPException(status_code=503, detail="X social connector not started")
    return c


@app.get("/connectors/x/stats", dependencies=[Depends(_require_token)])
def x_stats():
    """Live stats: @jaymoney0300 mention counts, threat counts, poll health."""
    return _x().stats()


@app.get("/connectors/x/mentions", dependencies=[Depends(_require_token)])
def x_mentions(n: int = 20):
    """Recent @jaymoney0300 mentions with sentiment scores."""
    return {"mentions": _x().recent_mentions(min(n, 100))}


@app.get("/connectors/x/threats", dependencies=[Depends(_require_token)])
def x_threats(n: int = 20):
    """Hostile or impersonation mentions that triggered Intel / Guardian alerts."""
    return {"threats": _x().recent_threats(min(n, 100))}


@app.get("/connectors/x/search", dependencies=[Depends(_require_token)])
def x_search_hits(n: int = 20):
    """Recent tweets matching Triumph Synergy / Pi Network search terms."""
    return {"search_hits": _x().recent_search_hits(min(n, 100))}


@app.get("/connectors/x/timeline", dependencies=[Depends(_require_token)])
async def x_timeline(n: int = 10):
    """@jaymoney0300's own recent tweets."""
    tweets = await _x().get_timeline(max_results=min(n, 20))
    return {"tweets": tweets, "username": "jaymoney0300"}


@app.post("/connectors/x/tweet", dependencies=[Depends(_require_token)])
async def x_post_tweet(req: XPostTweetRequest):
    """Post a tweet as @jaymoney0300. Requires X OAuth 1.0a credentials."""
    result = await _x().post_tweet(req.text)
    return result


@app.post("/connectors/x/reply", dependencies=[Depends(_require_token)])
async def x_reply(req: XReplyRequest):
    """Reply to a specific tweet as @jaymoney0300."""
    result = await _x().reply_tweet(req.text, req.reply_to_id)
    return result


@app.post("/connectors/x/quote", dependencies=[Depends(_require_token)])
async def x_quote(req: XQuoteRequest):
    """Quote-tweet as @jaymoney0300."""
    result = await _x().quote_tweet(req.text, req.quote_tweet_id)
    return result


# ── Grok AI (xAI inference) ────────────────────────────────────────────────────

def _grok() -> Any:
    """Shorthand: returns the live Grok connector or raises 503."""
    c = conn_orchestrator.grok
    if not c:
        raise HTTPException(status_code=503, detail="Grok connector not started")
    return c


@app.get("/connectors/grok/stats", dependencies=[Depends(_require_token)])
def grok_stats():
    """Grok model stats: calls, token usage, latency."""
    return _grok().stats()


@app.post("/connectors/grok/complete", dependencies=[Depends(_require_token)])
async def grok_complete(req: GrokCompleteRequest):
    """Raw single-turn Grok completion."""
    result = await _grok().complete(
        req.prompt,
        system=req.system,
        temperature=req.temperature,
        max_tokens=req.max_tokens,
    )
    return {"text": result.text, "tokens": result.total_tokens,
            "latency_ms": result.latency_ms, "error": result.error}


@app.post("/connectors/grok/analyze", dependencies=[Depends(_require_token)])
async def grok_analyze_threat(req: GrokAnalyzeRequest):
    """Deep threat-signal analysis via Grok."""
    result = await _grok().analyze_threat(req.signal)
    return {"analysis": result.text, "tokens": result.total_tokens,
            "latency_ms": result.latency_ms, "error": result.error}


@app.post("/connectors/grok/strategic", dependencies=[Depends(_require_token)])
async def grok_strategic(req: GrokStrategicRequest):
    """Sovereign strategic advisory from Grok."""
    result = await _grok().strategic_advice(req.context)
    return {"advisory": result.text, "tokens": result.total_tokens,
            "latency_ms": result.latency_ms, "error": result.error}


@app.post("/connectors/grok/draft-tweet", dependencies=[Depends(_require_token)])
async def grok_draft_tweet(req: GrokDraftTweetRequest):
    """Draft a tweet for @jaymoney0300 on the given topic."""
    result = await _grok().draft_tweet(req.topic, req.tone)
    return {"tweet": result.text, "tokens": result.total_tokens,
            "latency_ms": result.latency_ms, "error": result.error}


@app.post("/connectors/grok/summarize", dependencies=[Depends(_require_token)])
async def grok_summarize(req: GrokSummarizeRequest):
    """Summarize text highlighting sovereign risk factors."""
    result = await _grok().summarize(req.text, req.max_words)
    return {"summary": result.text, "tokens": result.total_tokens,
            "latency_ms": result.latency_ms, "error": result.error}


@app.post("/connectors/grok/provision-key", dependencies=[Depends(_require_token)])
async def grok_provision_key():
    """SAIB self-provisions a fresh xAI inference key via the management token."""
    result = await _grok().provision_key()
    return result


# ══════════════════════════════════════ APEX v4 — SOVEREIGN HEALER ═══════════

class HealRequest(BaseModel):
    service: str


@app.get("/apex/healer/stats", dependencies=[Depends(_require_token)])
def healer_stats():
    """Sovereign Healer stats: service health map, heal history, success rates."""
    return _healer_engine.stats()


@app.get("/apex/healer/scan", dependencies=[Depends(_require_token)])
async def healer_scan():
    """Full scan of all Triumph ecosystem services — returns current health map."""
    return await _healer_engine.scan_all()


@app.post("/apex/healer/heal", dependencies=[Depends(_require_token)])
async def healer_heal(req: HealRequest):
    """
    Trigger a full 6-layer root-cause analysis and warp-precision heal
    for a specific service. Grok AI diagnoses the root cause across:
      Layer 0: HTTP health surface
      Layer 1: Response body error fields
      Layer 2: Stdout/stderr log stream
      Layer 3: Structured JSON log events
      Layer 4: Grok AI quantum root-cause reasoning
      Layer 5: Warp-speed autonomous fix application
    """
    return await _healer_engine.deep_heal(req.service)


# ══════════════════════════════════════ APEX v4 — BOT DEFENSE ════════════════

class BotAssessRequest(BaseModel):
    account_data: dict

class BotForceAssessRequest(BaseModel):
    username: str

class BotThresholdRequest(BaseModel):
    block_threshold:  float = 0.50
    report_threshold: float = 0.70


@app.get("/apex/botdefense/stats", dependencies=[Depends(_require_token)])
def botdefense_stats():
    """Bot defense stats: scanned, blocked, reported, threat registry."""
    return _bot_defense_engine.stats()


@app.post("/apex/botdefense/assess", dependencies=[Depends(_require_token)])
async def botdefense_assess(req: BotAssessRequest):
    """
    Multi-signal bot/scammer assessment of an X account.
    Signals: account age, follower ratio, tweet velocity, scam phrase detection,
    impersonation detection, Grok AI deep analysis.
    Auto-blocks if score >= block_threshold, reports if >= report_threshold.
    """
    threat = await _bot_defense_engine.assess(req.account_data)
    return {
        "username":     threat.username,
        "threat_class": threat.threat_class.value,
        "score":        threat.score,
        "signals":      threat.signals,
        "grok_analysis": threat.grok_analysis,
        "action_taken": threat.action_taken,
        "blocked":      threat.blocked,
        "reported":     threat.reported,
    }


@app.post("/apex/botdefense/force-assess", dependencies=[Depends(_require_token)])
async def botdefense_force_assess(req: BotForceAssessRequest):
    """
    Force-assess a specific X username by fetching their profile live.
    Will auto-block/report if score crosses thresholds.
    """
    return await _bot_defense_engine.force_assess(req.username)


@app.post("/apex/botdefense/whitelist", dependencies=[Depends(_require_token)])
def botdefense_whitelist(req: BotForceAssessRequest):
    """Add a username to the permanent whitelist (never blocked/reported)."""
    _bot_defense_engine._whitelist.add(req.username.lower())
    return {"whitelisted": req.username, "whitelist": list(_bot_defense_engine._whitelist)}


@app.post("/apex/botdefense/thresholds", dependencies=[Depends(_require_token)])
def botdefense_thresholds(req: BotThresholdRequest):
    """Adjust block/report score thresholds."""
    _bot_defense_engine.BLOCK_THRESHOLD  = max(0.0, min(req.block_threshold, 1.0))
    _bot_defense_engine.REPORT_THRESHOLD = max(0.0, min(req.report_threshold, 1.0))
    return {
        "block_threshold":  _bot_defense_engine.BLOCK_THRESHOLD,
        "report_threshold": _bot_defense_engine.REPORT_THRESHOLD,
    }


# ══════════════════════════════════════════════════════════════════════════════
#  SAIB v5 — Sovereign Apex Intelligent Brain v5 endpoints
# ══════════════════════════════════════════════════════════════════════════════

# ── v5 request/response models ────────────────────────────────────────────────

class V5RegisterServiceRequest(BaseModel):
    name:          str
    health_url:    str
    log_source:    str = "http_endpoint"
    stack_type:    str = "generic"
    criticality:   float = 0.5
    log_config:    dict = {}
    repo_url:      str  = ""
    repo_token:    str  = ""
    repo_provider: str  = "github"
    k8s_namespace: str  = ""
    k8s_label:     str  = ""

class V5LogIngestRequest(BaseModel):
    service_id: str
    signature:  str = ""
    payload:    dict = {}

class V5AnalyzeCodeRequest(BaseModel):
    code:       str
    language:   str = "generic"
    context:    str = ""

class V5AnalyzeLogsRequest(BaseModel):
    service_id: str
    tenant_token: str = ""

class V5FixGenerateRequest(BaseModel):
    service_id:    str
    error_type:    str
    error_message: str
    code_snippet:  str
    language:      str  = "generic"
    root_cause:    str  = ""

class V5FixPRRequest(BaseModel):
    fix_id:      str     # returned by /v5/fix/generate — NOTE: stateless; pass fix data instead
    service_id:  str
    error_type:  str
    explanation: str
    diff:        str
    original_code: str
    fixed_code:    str
    confidence:    float
    repo_url:    str
    repo_token:  str
    repo_provider: str = "github"

class V5TenantCreateRequest(BaseModel):
    name:         str
    plan:         str = "free"
    admin_token:  str = ""

class V5TenantTokenRequest(BaseModel):
    tenant_id: str
    api_key:   str
    ttl_s:     int = 3600


# ── v5 tenant management ─────────────────────────────────────────────────────

@app.post("/v5/tenants/create", dependencies=[Depends(_require_token)])
async def v5_tenant_create(req: V5TenantCreateRequest):
    """Admin: create a new tenant (requires master bridge token)."""
    try:
        creds = tenant_auth.create_tenant(
            name        = req.name,
            plan        = req.plan,
            admin_token = req.admin_token or BRIDGE_TOKEN,
        )
        # issue a registry token for the new tenant automatically
        registry_token = external_registry.issue_token(
            tenant_id = creds.tenant_id,
            scopes    = ["register", "read", "approve_heal", "fix"],
            label     = f"{req.name}-default",
        )
        return {
            "tenant_id":      creds.tenant_id,
            "api_key":        creds.api_key,
            "plan":           creds.plan,
            "registry_token": registry_token,
            "note":           "Store these credentials securely — api_key shown once",
        }
    except (PermissionError, ValueError) as e:
        raise HTTPException(status_code=403, detail=str(e))


@app.post("/v5/tenants/token", dependencies=[Depends(_require_token)])
async def v5_tenant_issue_jwt(req: V5TenantTokenRequest):
    """Issue a short-lived JWT for a tenant."""
    token = tenant_auth.issue_jwt(req.tenant_id, req.api_key, req.ttl_s)
    if not token:
        raise HTTPException(status_code=401, detail="Invalid tenant credentials")
    return {"jwt": token, "expires_in_s": req.ttl_s}


@app.get("/v5/tenants/list", dependencies=[Depends(_require_token)])
async def v5_tenant_list():
    """Admin: list all tenants."""
    return {"tenants": tenant_auth.list_tenants(admin_token=BRIDGE_TOKEN), "stats": tenant_auth.stats()}


# ── v5 external service registry ─────────────────────────────────────────────

@app.post("/v5/services/register", dependencies=[Depends(_require_token)])
async def v5_register_service(req: V5RegisterServiceRequest):
    """Register an external service for sovereign monitoring."""
    try:
        spec = await external_registry.register(
            tenant_id    = "__master__",  # master token in-band registration
            name         = req.name,
            health_url   = req.health_url,
            log_source   = LogSourceType(req.log_source),
            stack_type   = StackType(req.stack_type),
            criticality  = req.criticality,
            log_config   = req.log_config,
            repo_url     = req.repo_url,
            repo_token   = req.repo_token,
            repo_provider = req.repo_provider,
            k8s_namespace = req.k8s_namespace,
            k8s_label     = req.k8s_label,
        )
        return {
            "service_id":     spec.service_id,
            "name":           spec.name,
            "webhook_secret": spec.webhook_secret,
            "log_push_url":   f"/v5/logs/ingest?service_id={spec.service_id}",
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.delete("/v5/services/{service_id}", dependencies=[Depends(_require_token)])
async def v5_deregister_service(service_id: str):
    ok = external_registry.deregister(service_id, "__master__")
    if not ok:
        raise HTTPException(status_code=404, detail="Service not found")
    return {"deregistered": service_id}


@app.get("/v5/services", dependencies=[Depends(_require_token)])
async def v5_list_services():
    svcs = external_registry.list_services("__master__")
    return {
        "services": [
            {
                "service_id":  s.service_id,
                "name":        s.name,
                "health_url":  s.health_url,
                "log_source":  s.log_source,
                "stack_type":  s.stack_type,
                "criticality": s.criticality,
                "repo_url":    s.repo_url,
            }
            for s in svcs
        ],
        "stats": external_registry.stats(),
    }


# ── v5 log ingestion ──────────────────────────────────────────────────────────

@app.post("/v5/logs/ingest")
async def v5_log_ingest(req: V5LogIngestRequest):
    """
    Push-based log ingestion. External services POST log events here.
    No auth required (signature verified by webhook_secret per service).
    """
    ok = external_registry.ingest_webhook(
        service_id = req.service_id,
        payload    = req.payload,
        signature  = req.signature,
    )
    if not ok:
        raise HTTPException(status_code=400, detail="Invalid service_id or signature mismatch")
    return {"ingested": True}


@app.get("/v5/logs/{service_id}", dependencies=[Depends(_require_token)])
async def v5_get_logs(service_id: str, tail: int = 100):
    """Fetch buffered log events for a registered service."""
    events = external_registry.get_log_buffer(service_id, "__master__", n=tail)
    return {"service_id": service_id, "events": events, "count": len(events)}


# ── v5 analysis ───────────────────────────────────────────────────────────────

@app.post("/v5/analyze/code", dependencies=[Depends(_require_token)])
async def v5_analyze_code(req: V5AnalyzeCodeRequest):
    """Analyze a code snippet / stack trace for bugs via Grok + stack parsers."""
    from .log_ingestion import NormalisedLogEvent
    import time as _time
    mock_events = [
        NormalisedLogEvent(
            service_id = "api-direct",
            ts         = _time.time(),
            level      = "error",
            message    = line,
        )
        for line in req.code.splitlines()
        if line.strip()
    ]
    ctx = await analyse_code(
        service_id = "api-direct",
        log_events = mock_events,
        stack_type = req.language,
    )
    if not ctx:
        return {"frames": [], "error_type": "none", "note": "No stack trace detected"}
    return {
        "error_type":    ctx.error_type,
        "error_message": ctx.error_message,
        "primary_frame": {"file": ctx.primary_frame.file, "line": ctx.primary_frame.line, "symbol": ctx.primary_frame.symbol} if ctx.primary_frame else None,
        "frame_count":   len(ctx.stack_frames),
        "snippet":       ctx.snippet,
        "language":      ctx.language,
    }


@app.post("/v5/analyze/logs", dependencies=[Depends(_require_token)])
async def v5_analyze_logs(req: V5AnalyzeLogsRequest):
    """Run full 8-layer sovereign diagnosis on a registered service."""
    spec = external_registry.get_service(req.service_id, "__master__")
    if not spec:
        raise HTTPException(status_code=404, detail="Service not found")
    result = await _healer_engine.diagnose_single(spec)
    return result


@app.get("/v5/health/external", dependencies=[Depends(_require_token)])
async def v5_health_external():
    """Scan all externally registered services health."""
    import aiohttp as _aio
    results = {}
    svcs = external_registry.list_services("__master__")
    async with _aio.ClientSession(timeout=_aio.ClientTimeout(total=5)) as sess:
        for svc in svcs:
            try:
                async with sess.get(svc.health_url) as r:
                    results[svc.name] = {"status": r.status, "ok": r.status == 200}
            except Exception as exc:
                results[svc.name] = {"status": 0, "ok": False, "error": str(exc)[:100]}
    return {"services": results, "count": len(svcs)}


# ── v5 fix engine ─────────────────────────────────────────────────────────────

@app.post("/v5/fix/generate", dependencies=[Depends(_require_token)])
async def v5_fix_generate(req: V5FixGenerateRequest):
    """Generate an AI code fix from a known error context."""
    from .log_ingestion import NormalisedLogEvent
    from .code_analyzer import CodeContext, StackFrame
    import time as _time

    mock_frame = StackFrame(file="unknown", line=0, symbol=req.error_type)
    mock_ctx   = CodeContext(
        service_id           = req.service_id,
        stack_frames         = [mock_frame],
        primary_frame        = mock_frame,
        file_path            = "unknown",
        start_line           = 0,
        end_line             = 0,
        language             = req.language,
        snippet              = req.code_snippet,
        error_type           = req.error_type,
        error_message        = req.error_message,
        full_trace           = req.code_snippet,
        grok_prompt_fragment = (
            f"Stack type: {req.language}\n"
            f"Error: {req.error_type}: {req.error_message}\n"
            f"Code:\n{req.code_snippet[:2000]}"
        ),
    )
    _grok_ref = conn_orchestrator.grok
    fix = await generate_fix(grok=_grok_ref, code_ctx=mock_ctx, root_cause=req.root_cause)
    if not fix:
        raise HTTPException(status_code=500, detail="Fix generation failed")
    return {
        "fix_id":        fix.id,
        "original_code": fix.original_code,
        "fixed_code":    fix.fixed_code,
        "explanation":   fix.explanation,
        "diff":          fix.diff,
        "confidence":    fix.confidence,
    }


@app.post("/v5/fix/pr", dependencies=[Depends(_require_token)])
async def v5_fix_deliver_pr(req: V5FixPRRequest):
    """Deliver a fix proposal as a GitHub/GitLab PR/MR."""
    from .fix_engine import FixProposal
    import time as _time

    fp = FixProposal(
        id            = req.fix_id,
        service_id    = req.service_id,
        file_path     = "",
        error_type    = req.error_type,
        error_message = "",
        original_code = req.original_code,
        fixed_code    = req.fixed_code,
        explanation   = req.explanation,
        diff          = req.diff,
        confidence    = req.confidence,
        language      = "generic",
    )
    if req.repo_provider == "github":
        url = await deliver_github_pr(fp, req.repo_url, req.repo_token)
    else:
        url = await deliver_gitlab_mr(fp, req.repo_url, req.repo_token)

    if not url:
        raise HTTPException(status_code=500, detail="PR/MR creation failed — check repo_url and repo_token")
    return {"url": url, "provider": req.repo_provider}


# ── v5 K8s ───────────────────────────────────────────────────────────────────

@app.get("/v5/k8s/events", dependencies=[Depends(_require_token)])
async def v5_k8s_events(severity: str = ""):
    """Return buffered K8s critical/high events from in-cluster watcher."""
    return {
        "events": k8s_adapter.get_buffered_events(severity=severity.upper() if severity else ""),
        "stats":  k8s_adapter.stats(),
    }


# ── v5 MCP endpoint ───────────────────────────────────────────────────────────

@app.post("/mcp")
async def mcp_jsonrpc(body: dict):
    """
    MCP JSON-RPC 2.0 endpoint. SAIB as a sovereign AI diagnostic tool server.
    Compatible with Claude, GitHub Copilot, Cursor, and any MCP-aware client.
    No auth required at transport level — tools enforce tenant_token internally.
    """
    return await mcp_server.handle_request(body)


@app.get("/mcp/tools/list")
async def mcp_tools_list():
    """MCP tool discovery — returns all available SAIB tools."""
    return mcp_server.get_tools_manifest()


@app.get("/v5/stats", dependencies=[Depends(_require_token)])
async def v5_stats():
    """Full v5 ecosystem stats."""
    return {
        "saib_version":    VERSION,
        "registry":        external_registry.stats(),
        "tenant_auth":     tenant_auth.stats(),
        "k8s":             k8s_adapter.stats(),
        "healer":          _healer_engine.stats(),
        "uptime_s":        round(time.time() - START_TIME, 1),
    }


# ═══════════════════════════════════════════════════════ BILLING v5 ════════
# Public endpoints (no auth): /billing/session/start, /billing/plans,
#                              /billing/pi/approve, /billing/pi/complete,
#                              /billing/stripe/webhook
# Session-gated endpoints:    /billing/session/status, /billing/pi/initiate,
#                              /billing/stripe/session
# Bridge-token endpoints:     /billing/founder/stats, /billing/stats
# ═════════════════════════════════════════════════════════════════════════════


class _BillingSessionStartReq(BaseModel):
    client_id: str = ""     # optional; anonymous UUID generated if blank
    pi_uid:    str = ""     # optional; Pi Network UID for Pi payment attribution


class _PiInitiateReq(BaseModel):
    session_token: str
    plan:          str   # BillingPlan.value  e.g. "pi_paygo"


class _PiApproveReq(BaseModel):
    payment_id: str


class _PiCompleteReq(BaseModel):
    payment_id: str
    txid:       str


class _StripeSessionReq(BaseModel):
    session_token: str
    plan:          str         # BillingPlan.value  e.g. "usd_basic"
    region:        str = "global"   # US | EU | IN | BR | MX | AU | SG | MY | NG | KE | ZA | JP | KR
    success_url:   str = ""
    cancel_url:    str = ""


# ── 1. Start a free 30-minute session ────────────────────────────────────────

@app.post("/billing/session/start")
async def billing_session_start(
    req:     _BillingSessionStartReq,
    request: Request,
) -> dict:
    """
    Start a free 30-minute SAIB session.  No payment required.
    Returns a session_token to include as X-SAIB-Session header on all requests.
    After 30 minutes the session expires and Pi or USD payment is required.
    """
    ip        = request.client.host if request.client else "0.0.0.0"
    client_id = req.client_id.strip() or str(uuid.uuid4())
    pi_uid    = req.pi_uid.strip() or None
    sess      = billing_engine.start_session(client_id, ip, pi_uid)
    now       = time.time()
    free_left = max(0, int(sess.free_expires_at - now))
    paid_left = max(0, int(sess.paid_expires_at - now)) if sess.paid_expires_at > now else 0
    return {
        "session_token":    sess.session_token,
        "client_id":        sess.client_id,
        "free_expires_at":  int(sess.free_expires_at),
        "free_remaining_s": free_left,
        "paid_remaining_s": paid_left,
        "plan":             sess.plan.value,
        "usage": (
            "Add  X-SAIB-Session: <session_token>  to every request header. "
            f"You have {free_left}s of free access remaining."
        ),
        "plans_url":        "/billing/plans",
    }


# ── 2. Check session status ───────────────────────────────────────────────────

@app.get("/billing/session/status")
async def billing_session_status(
    x_saib_session: str = Header("", alias="X-SAIB-Session"),
) -> dict:
    """Return current session state, remaining time, and plan info."""
    if not x_saib_session:
        raise HTTPException(status_code=400, detail="X-SAIB-Session header required")
    state, sess = billing_engine.validate_session(x_saib_session)
    if sess is None:
        raise HTTPException(status_code=404, detail="Session not found")
    now = time.time()
    return {
        "state":            state.value,
        "plan":             sess.plan.value,
        "free_expires_at":  int(sess.free_expires_at),
        "paid_expires_at":  int(sess.paid_expires_at),
        "free_remaining_s": max(0, int(sess.free_expires_at - now)),
        "paid_remaining_s": max(0, int(sess.paid_expires_at - now)),
        "total_paid_pi":    sess.total_paid_pi,
        "total_paid_usd":   sess.total_paid_usd,
        "payment_count":    len(sess.payment_ids),
    }


# ── 3. List all plans ─────────────────────────────────────────────────────────

@app.get("/billing/plans")
async def billing_list_plans() -> dict:
    """List all SAIB billing plans with Pi and USD pricing."""
    return {
        "plans":      billing_engine.list_plans(),
        "pi_network": "mainnet",
        "pi_info":    "Pi payments are real mainnet blockchain transactions creating Pi utility.",
        "usd_info":   "USD payments via Stripe — card, UPI (IN), PIX (BR), SEPA (EU), OXXO (MX), GrabPay (MY/SG), konbini (JP) and more.",
        "free_trial": f"{billing_engine.stats()['free_session_secs']}s free session — no payment required to start.",
        "start_url":  "/billing/session/start",
    }


# ── 4. Initiate a Pi payment ──────────────────────────────────────────────────

@app.post("/billing/pi/initiate")
async def billing_pi_initiate(
    req:            _PiInitiateReq,
    x_saib_session: str = Header("", alias="X-SAIB-Session"),
    authorization:  str = Header("", alias="Authorization"),
    x_bridge_token: str = Header("", alias="X-Bridge-Token"),
) -> dict:
    """
    Create a Pi mainnet payment for the requested plan.
    Returns payment data to pass to Pi.createPayment() in the Pi Browser frontend.
    The caller must have an active session (free or paid) OR bridge token.
    """
    # Validate access
    provided = authorization[7:] if authorization.startswith("Bearer ") else x_bridge_token
    is_internal = BRIDGE_TOKEN and provided and secrets.compare_digest(provided, BRIDGE_TOKEN)
    if not is_internal and x_saib_session:
        allowed, reason = billing_engine.check_access(x_saib_session)
        if not allowed:
            raise HTTPException(status_code=402, detail={"error": reason, "plans": "/billing/plans"})
    elif not is_internal:
        raise HTTPException(status_code=401, detail="X-SAIB-Session or bridge token required")

    try:
        plan = BillingPlan(req.plan)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Unknown plan '{req.plan}'. GET /billing/plans")

    token = x_saib_session or req.session_token
    try:
        result = await billing_engine.initiate_pi_payment(token, plan)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    return result


# ── 5. Approve a Pi payment (Pi SDK → onReadyForServerApproval) ───────────────

@app.post("/billing/pi/approve")
async def billing_pi_approve(req: _PiApproveReq) -> dict:
    """
    Server-side approve a pending Pi payment.
    Called by the frontend Pi SDK after onReadyForServerApproval fires.
    No auth required — paymentId is the authenticator.
    """
    ok = await billing_engine.approve_pi_payment(req.payment_id)
    return {"approved": ok, "payment_id": req.payment_id}


# ── 6. Complete a Pi payment (Pi SDK → onReadyForServerCompletion) ────────────

@app.post("/billing/pi/complete")
async def billing_pi_complete(req: _PiCompleteReq) -> dict:
    """
    Complete a Pi payment after blockchain confirmation.
    Called by the frontend Pi SDK after onReadyForServerCompletion fires.
    Verifies the transaction on Pi mainnet Horizon and activates the subscription.
    Automatically triggers the 15% founder split A2U to the founder wallet.
    """
    rec = await billing_engine.complete_pi_payment(req.payment_id, req.txid)
    if not rec:
        raise HTTPException(
            status_code=422,
            detail="Pi payment could not be completed — verify txid and payment_id",
        )
    return {
        "status":         "completed",
        "payment_id":     rec.payment_id,
        "plan":           rec.plan.value,
        "amount_pi":      rec.amount,
        "txid":           rec.txid,
        "founder_split":  rec.founder_split,
        "founder_paid":   rec.founder_paid,
        "message":        f"Subscription activated: {rec.plan.value}. Real Pi utility on the mainnet!",
    }


# ── 7. Create a Stripe checkout session ──────────────────────────────────────

@app.post("/billing/stripe/session")
async def billing_stripe_session(
    req:            _StripeSessionReq,
    x_saib_session: str = Header("", alias="X-SAIB-Session"),
    authorization:  str = Header("", alias="Authorization"),
    x_bridge_token: str = Header("", alias="X-Bridge-Token"),
) -> dict:
    """
    Create a Stripe Checkout session for USD payment.
    Region codes (optional): US, EU, UK, IN, BR, MX, AU, SG, MY, NG, KE, ZA, JP, KR.
    Returns a checkout_url to redirect the user to Stripe's hosted payment page.
    """
    provided   = authorization[7:] if authorization.startswith("Bearer ") else x_bridge_token
    is_internal = BRIDGE_TOKEN and provided and secrets.compare_digest(provided, BRIDGE_TOKEN)
    token      = x_saib_session or req.session_token
    if not is_internal and token:
        allowed, reason = billing_engine.check_access(token)
        if not allowed:
            raise HTTPException(status_code=402, detail={"error": reason, "plans": "/billing/plans"})
    elif not is_internal:
        raise HTTPException(status_code=401, detail="X-SAIB-Session or bridge token required")

    try:
        plan = BillingPlan(req.plan)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Unknown plan '{req.plan}'. GET /billing/plans")

    result = await billing_engine.create_stripe_session(
        session_token = token,
        plan          = plan,
        region        = req.region,
        success_url   = req.success_url or None,
        cancel_url    = req.cancel_url or None,
    )
    if "error" in result:
        raise HTTPException(status_code=503, detail=result)
    return result


# ── 8. Stripe webhook ─────────────────────────────────────────────────────────

@app.post("/billing/stripe/webhook")
async def billing_stripe_webhook(request: Request) -> dict:
    """
    Stripe webhook receiver.  No auth — Stripe signature verified internally.
    Set this URL in your Stripe Dashboard → Webhooks.
    Handles: checkout.session.completed, payment_intent.succeeded
    """
    payload    = await request.body()
    sig_header = request.headers.get("stripe-signature", "")
    rec        = billing_engine.process_stripe_webhook(payload, sig_header)
    if rec:
        return {"status": "processed", "payment_id": rec.payment_id, "plan": rec.plan.value}
    return {"status": "ignored"}


# ── 9. Founder revenue dashboard (bridge token only) ─────────────────────────

@app.get("/billing/founder/stats", dependencies=[Depends(_require_token)])
async def billing_founder_stats() -> dict:
    """
    Founder revenue dashboard — Pi owed/sent + USD tracked across all payments.
    Bridge token required.
    """
    return {
        **billing_engine.founder_stats(),
        "pi_processor": pi_processor.stats(),
    }


# ── 10. Billing overview (bridge token only) ──────────────────────────────────

@app.get("/billing/stats", dependencies=[Depends(_require_token)])
async def billing_stats() -> dict:
    """Full billing engine stats. Bridge token required."""
    return {
        "billing":      billing_engine.stats(),
        "pi_processor": pi_processor.stats(),
    }


# ══════════════════════════════════════════════════════════════════════════════
# v6 OMEGA PRIME — Nano Omega Prime Superior Sovereign Framework
# ══════════════════════════════════════════════════════════════════════════════

# ── 1. Omega Prime status ─────────────────────────────────────────────────────

@app.get("/omega/status")
def omega_status() -> dict:
    """Full Omega Prime status: modes, brain, container engine, ecosystem engine."""
    return omega_prime.status()


# ── 2. Mode control ───────────────────────────────────────────────────────────

class OmegaModeRequest(BaseModel):
    mode: str  # MESH | CONTAINER | ECOSYSTEM


@app.post("/omega/mode/activate", dependencies=[Depends(_require_token)])
def omega_activate_mode(req: OmegaModeRequest) -> dict:
    """Activate one of the three Omega operating modes."""
    try:
        omega_prime.activate_mode(OmegaMode(req.mode.upper()))
        return {"activated": req.mode.upper(), "active_modes": [m.value for m in omega_prime._active_modes]}
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Unknown mode '{req.mode}'. Use MESH, CONTAINER, or ECOSYSTEM.")


@app.post("/omega/mode/deactivate", dependencies=[Depends(_require_token)])
def omega_deactivate_mode(req: OmegaModeRequest) -> dict:
    """Deactivate an Omega operating mode."""
    try:
        omega_prime.deactivate_mode(OmegaMode(req.mode.upper()))
        return {"deactivated": req.mode.upper(), "active_modes": [m.value for m in omega_prime._active_modes]}
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Unknown mode '{req.mode}'.")


# ── 3. Omega Brain ────────────────────────────────────────────────────────────

class BrainAbsorbRequest(BaseModel):
    domain:     str
    payload:    dict
    confidence: float = 1.0


@app.post("/omega/brain/absorb", dependencies=[Depends(_require_token)])
async def omega_brain_absorb(req: BrainAbsorbRequest) -> dict:
    """Feed a new knowledge signal directly into the Omega Brain."""
    node = await omega_prime.brain.absorb(req.domain, req.payload, req.confidence)
    return {"node_id": node.node_id, "domain": node.domain, "confidence": node.confidence}


@app.get("/omega/brain/recall")
async def omega_brain_recall(
    domain: str = "",
    top_k: int = 20,
    min_confidence: float = 0.3,
    _auth: None = Depends(_require_token),
) -> dict:
    """Recall top knowledge nodes from the Omega Brain."""
    nodes = await omega_prime.brain.recall(domain_prefix=domain, top_k=top_k, min_confidence=min_confidence)
    return {
        "domain_filter": domain,
        "count": len(nodes),
        "nodes": [
            {"node_id": n.node_id, "domain": n.domain, "confidence": n.confidence,
             "reinforced": n.reinforced, "payload": n.payload}
            for n in nodes
        ],
    }


@app.get("/omega/brain/stats")
def omega_brain_stats() -> dict:
    """Omega Brain growth statistics."""
    return omega_prime.brain.stats()


@app.post("/omega/brain/grow", dependencies=[Depends(_require_token)])
async def omega_brain_grow() -> dict:
    """Force an immediate knowledge growth cycle (triple/quadruple)."""
    # Temporarily zero the interval to allow immediate growth
    orig = omega_prime.brain._growth_interval
    omega_prime.brain._growth_interval = 0
    result = await omega_prime.brain.growth_tick()
    omega_prime.brain._growth_interval = orig
    return result


# ── 4. Interaction Engine — SAIB responds to anyone ──────────────────────────

class InteractRequest(BaseModel):
    actor_id: str
    message:  str
    context:  dict = {}


@app.post("/omega/interact")
async def omega_interact(req: InteractRequest) -> dict:
    """
    Send any message to SAIB Omega Prime and receive a sovereign response.
    Open to all — SAIB classifies the actor and responds with Omega precision.
    Rate-limited via bot_defense automatically.
    """
    # Bot-defense pre-check (non-blocking)
    threat_score = 0.0
    try:
        threat_score = _bot_defense_engine.score_actor(req.actor_id)
    except Exception:
        pass

    if threat_score > 0.9:
        raise HTTPException(
            status_code=429,
            detail="Actor classified as high-threat by Omega Bot Defense. Interaction blocked.",
        )

    response = await omega_prime.respond_to(req.actor_id, req.message, req.context)
    return response


# ── 5. Container Mode — Omega introspection ───────────────────────────────────

class ContainerStatRequest(BaseModel):
    container_id: str
    name:         str
    cpu_pct:      float
    mem_pct:      float
    status:       str = "running"


@app.post("/omega/container/ingest", dependencies=[Depends(_require_token)])
async def omega_container_ingest(req: ContainerStatRequest) -> dict:
    """Feed a container stat into the Omega Container Mode engine."""
    intel_obj = omega_prime.container_engine.ingest_container_stat(
        req.container_id, req.name, req.cpu_pct, req.mem_pct, req.status
    )
    await omega_prime.container_engine.absorb_all_to_brain()
    return {
        "container_id": intel_obj.container_id,
        "crash_prob":   intel_obj.crash_prob,
        "alerts":       intel_obj.alerts,
        "status":       intel_obj.status,
    }


@app.get("/omega/container/stats", dependencies=[Depends(_require_token)])
def omega_container_stats() -> dict:
    """Container Mode engine statistics."""
    return omega_prime.container_engine.stats()


# ── 6. Ecosystem Mode ─────────────────────────────────────────────────────────

class EcosystemSignalRequest(BaseModel):
    source:     str
    event_type: str
    payload:    dict
    severity:   float = 0.0


@app.post("/omega/ecosystem/signal", dependencies=[Depends(_require_token)])
async def omega_ecosystem_signal(req: EcosystemSignalRequest) -> dict:
    """Inject an ecosystem signal (Pi, Stellar, X, real-world, financial)."""
    from .omega_prime import EcosystemSignal
    sig = EcosystemSignal(
        source=req.source, event_type=req.event_type,
        payload=req.payload, severity=req.severity,
    )
    await omega_prime.ecosystem_engine.ingest_signal(sig)
    return {"signal_id": sig.signal_id, "absorbed": True}


@app.get("/omega/ecosystem/stats", dependencies=[Depends(_require_token)])
def omega_ecosystem_stats() -> dict:
    """Ecosystem Mode engine statistics."""
    return omega_prime.ecosystem_engine.stats()


# ── 7. Founder Presence ───────────────────────────────────────────────────────

@app.get("/omega/founder/status")
def omega_founder_status(_auth: None = Depends(_require_token)) -> dict:
    """Dual-domain founder presence status (digital + real-world)."""
    return founder_presence.status()


@app.get("/omega/founder/events", dependencies=[Depends(_require_token)])
def omega_founder_events(n: int = 20) -> dict:
    """Recent founder presence events."""
    return {"events": founder_presence.recent_events(n)}


@app.post("/omega/founder/checkin", dependencies=[Depends(_require_token)])
async def omega_founder_checkin(location_hint: str = "", notes: str = "") -> dict:
    """Founder real-world safety check-in. Resets dead-man timer."""
    evt = await founder_presence.founder_checkin(location_hint=location_hint, notes=notes)
    return {"event_id": evt.event_id, "status": "SAFE", "ts": evt.ts}


@app.post("/omega/founder/x-mention", dependencies=[Depends(_require_token)])
async def omega_founder_x_mention(
    from_handle: str, content: str, hostile: bool = False
) -> dict:
    """Record an X mention targeting the founder."""
    evt = await founder_presence.x_mention_received(from_handle, content, hostile)
    return {"event_id": evt.event_id, "severity": evt.severity}


@app.post("/omega/founder/pi-wallet", dependencies=[Depends(_require_token)])
async def omega_founder_pi_wallet(balance: float) -> dict:
    """Update founder Pi wallet balance."""
    evt = await founder_presence.pi_wallet_update(balance)
    return {"event_id": evt.event_id, "balance": balance, "delta": evt.details.get("delta", 0)}


# ── Reimbursement tracker ─────────────────────────────────────────────────────

class ReimbursementRequest(BaseModel):
    description: str
    amount_usd:  float
    platform:    str
    notes:       str = ""


@app.post("/omega/founder/reimbursement/add", dependencies=[Depends(_require_token)])
def omega_add_reimbursement(req: ReimbursementRequest) -> dict:
    """Track a new reimbursement claim."""
    claim = founder_presence.add_reimbursement_claim(
        req.description, req.amount_usd, req.platform, notes=req.notes
    )
    return {"claim_id": claim.claim_id, "status": claim.status, "amount_usd": claim.amount_usd}


@app.get("/omega/founder/reimbursement/overdue", dependencies=[Depends(_require_token)])
def omega_overdue_reimbursements() -> dict:
    """List all overdue reimbursement claims."""
    claims = founder_presence.overdue_claims()
    return {
        "count": len(claims),
        "claims": [
            {"claim_id": c.claim_id, "description": c.description,
             "amount_usd": c.amount_usd, "platform": c.platform,
             "notes": c.notes}
            for c in claims
        ],
    }


# ── Email monitoring ──────────────────────────────────────────────────────────

class EmailIngestRequest(BaseModel):
    inbox:     str              # jdrains022@yahoo.com or jdrains110@gmail.com
    sender:    str
    subject:   str
    snippet:   str = ""
    labels:    list[str] = []
    thread_id: str = ""


@app.post("/omega/founder/email/ingest", dependencies=[Depends(_require_token)])
async def omega_email_ingest(req: EmailIngestRequest) -> dict:
    """
    Ingest an email event from a monitored founder inbox.
    Call this from a Gmail/Yahoo webhook or polling adapter.
    Subject + 200-char snippet only — no full body stored.
    """
    evt = await founder_presence.ingest_email(
        inbox=req.inbox, sender=req.sender, subject=req.subject,
        snippet=req.snippet, labels=req.labels, thread_id=req.thread_id,
    )
    return {
        "event_id": evt.event_id,
        "inbox":    evt.inbox,
        "severity": evt.severity,
        "keywords_matched": evt.details if hasattr(evt, "details") else [],
    }


@app.get("/omega/founder/email/stats", dependencies=[Depends(_require_token)])
def omega_email_stats() -> dict:
    """Email monitoring stats across both founder inboxes."""
    return founder_presence.email_stats()


@app.get("/omega/founder/email/recent", dependencies=[Depends(_require_token)])
def omega_email_recent(n: int = 20, inbox: str = "") -> dict:
    """Recent email events, optionally filtered by inbox address."""
    return {
        "emails": founder_presence.recent_emails(n=n, inbox=inbox or None)
    }


# ── 8. Mesh Mode — peer broadcast ────────────────────────────────────────────

class MeshBroadcastRequest(BaseModel):
    domain:  str
    payload: dict


@app.post("/omega/mesh/broadcast", dependencies=[Depends(_require_token)])
async def omega_mesh_broadcast(req: MeshBroadcastRequest) -> dict:
    """Broadcast a knowledge update to all mesh peers."""
    sent = await omega_prime.mesh_engine.broadcast_knowledge(req.domain, req.payload)
    return {"peers_notified": sent}


@app.post("/omega/mesh/verdict", dependencies=[Depends(_require_token)])
async def omega_mesh_verdict(entity_id: str, threat_score: float) -> dict:
    """Issue a collective quorum verdict for an entity."""
    verdict = await omega_prime.mesh_engine.collective_verdict(entity_id, threat_score)
    return {"entity_id": entity_id, "verdict": verdict, "threat_score": threat_score}


@app.get("/omega/mesh/stats", dependencies=[Depends(_require_token)])
def omega_mesh_mode_stats() -> dict:
    """Omega Mesh Mode engine statistics."""
    return omega_prime.mesh_engine.stats()


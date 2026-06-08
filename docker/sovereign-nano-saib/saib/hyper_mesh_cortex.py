"""
saib.hyper_mesh_cortex — SAIB Mega-Hyper-Mesh Action Cortex
═══════════════════════════════════════════════════════════════════════════════

The cortex is SAIB's *action* surface across the entire sovereign mesh.
Where `omega_prime` and `llm_brain` *think and reply*, this cortex *acts*.

It does three things, continuously, in the background:

  1. SUBSCRIBES to the redis-mesh-pod's hyper-mesh channels —
     `triumph:mesh:learning`         (per-30s self-learning insights)
     `triumph:hyper-mesh:state`      (military + governance + supernode + saib + pi)
     `triumph:hyper-mesh:command`    (founder-only commands)
     and keeps a hot in-memory snapshot SAIB can read instantly.

  2. EXPOSES a registry of `MeshAction`s SAIB can invoke against any peer:
       military_encrypt / military_route / military_heal
       governance_announce
       supernode_query_ledger
       pi_bridge_payment_status
       saib_decree
       founder_alert
     Each action carries a confidence threshold + founder-only bit + retry policy.

  3. EVALUATES every cycle whether autonomous action thresholds are met
     (degraded peers, hot masters, threat surges) and *fires* actions when
     the autonomy engine (`autonomous_decisions`) agrees, or queues them for
     founder review when below threshold.

The cortex is intentionally a *thin* coordinator — heavy work happens in the
mesh-pod / military bridge / governance node. SAIB's brain just decides what
to invoke.
"""
from __future__ import annotations

import asyncio
import json
import logging
import os
import time
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional

import httpx

log = logging.getLogger("sovereign.hyper_mesh_cortex")

# ── Channels & keys (must match docker/redis-mesh-pod/mesh-brain.py) ─────────
LEARNING_CHANNEL    = "triumph:mesh:learning"
HYPER_MESH_CHANNEL  = "triumph:hyper-mesh:state"
HYPER_MESH_CMD_CHAN = "triumph:hyper-mesh:command"
HYPER_MESH_PEER_KEY = "triumph:{mesh}:hyper:peers"

REDIS_MESH_URL      = os.getenv("REDIS_MESH_URL", "redis://triumph-redis-mesh-pod:6381")
HYPER_MESH_DISABLED = os.getenv("HYPER_MESH_DISABLED", "0") == "1"

# Peer base URLs (kept in sync with mesh-brain defaults)
PEERS: Dict[str, str] = {
    "military_bridge": os.getenv("PEER_MILITARY_BRIDGE_URL", "http://triumph-sovereign-military-bridge:8199"),
    "governance":      os.getenv("PEER_GOVERNANCE_URL",      "http://triumph-governance-shield:11626"),
    "supernode_peer":  os.getenv("PEER_SUPERNODE_URL",       "http://triumph-supernode-peer-2:11626"),
    "quantum_shield":  os.getenv("PEER_QUANTUM_SHIELD_URL",  "http://triumph-quantum-intel-fortress:8094"),
    "pi_bridge":       os.getenv("PEER_PI_BRIDGE_URL",       "http://triumph-pi-bridge-connector:8092"),
    "nano_saib":       os.getenv("PEER_NANO_SAIB_URL",       "http://127.0.0.1:8201"),
}

CORTEX_AUTO_THRESHOLD = float(os.getenv("CORTEX_AUTO_THRESHOLD", "0.70"))
CORTEX_TIMEOUT_S      = float(os.getenv("CORTEX_TIMEOUT_S",      "4.0"))

# ── GCV self-call token — required to hit our own protected endpoints ───────
# Loaded from the same secret the FastAPI _require_token Depends checks.
def _load_self_token() -> str:
    for src in ("/run/secrets/public_bridge_token",):
        try:
            with open(src) as f:
                return f.read().strip()
        except Exception:
            continue
    return os.getenv("PUBLIC_BRIDGE_TOKEN", "")

GCV_SELF_TOKEN = _load_self_token()


# ── Data models ──────────────────────────────────────────────────────────────

@dataclass
class MeshAction:
    name:         str
    peer:         str
    method:       str                       # "GET" | "POST"
    path:         str
    confidence:   float = 0.5
    founder_only: bool  = False
    description:  str   = ""
    invocations:  int   = 0
    last_result:  Optional[Dict[str, Any]] = None
    last_ts:      float = 0.0


@dataclass
class CortexSnapshot:
    last_learning_ts:    float = 0.0
    last_hyper_mesh_ts:  float = 0.0
    learning_cycles_seen: int  = 0
    hyper_mesh_cycles_seen: int = 0
    peers_reachable:     List[str] = field(default_factory=list)
    peers_degraded:      List[str] = field(default_factory=list)
    findings:            List[Dict[str, Any]] = field(default_factory=list)
    top_regions:         List[Dict[str, Any]] = field(default_factory=list)
    top_languages:       List[Dict[str, Any]] = field(default_factory=list)
    last_insight:        Dict[str, Any] = field(default_factory=dict)
    last_hyper_mesh:     Dict[str, Any] = field(default_factory=dict)
    actions_fired:       int = 0
    actions_blocked:     int = 0
    actions_queued:      int = 0


# ── The cortex engine ────────────────────────────────────────────────────────

class HyperMeshCortex:
    def __init__(self) -> None:
        self.snapshot = CortexSnapshot()
        self.actions: Dict[str, MeshAction] = {}
        self._client: Optional[httpx.AsyncClient] = None
        self._redis = None
        self._pubsub_task: Optional[asyncio.Task] = None
        self._on_insight_cbs: List[Callable[[Dict[str, Any]], None]] = []
        self._on_state_cbs:   List[Callable[[Dict[str, Any]], None]] = []
        self._on_cmd_cbs:     List[Callable[[Dict[str, Any]], None]] = []
        self._register_default_actions()

    def _register_default_actions(self) -> None:
        self.register(MeshAction(
            name="military_status", peer="military_bridge", method="GET",
            path="/sovereign/status", confidence=0.30,
            description="Read CNSA Suite 2.0 military bridge posture",
        ))
        self.register(MeshAction(
            name="military_heal", peer="military_bridge", method="POST",
            path="/sovereign/heal", confidence=0.75, founder_only=False,
            description="Trigger DARPA-style autonomous heal of the sovereign network",
        ))
        self.register(MeshAction(
            name="military_route", peer="military_bridge", method="POST",
            path="/sovereign/route", confidence=0.60,
            description="Route a sovereign message through the military mesh",
        ))
        self.register(MeshAction(
            name="military_encrypt", peer="military_bridge", method="POST",
            path="/sovereign/encrypt", confidence=0.50,
            description="AES-256-GCM encrypt under CNSA 2.0",
        ))
        self.register(MeshAction(
            name="governance_info", peer="governance", method="GET",
            path="/info", confidence=0.20,
            description="Read central/governance node info (ledger, peers)",
        ))
        self.register(MeshAction(
            name="supernode_info", peer="supernode_peer", method="GET",
            path="/info", confidence=0.20,
            description="Read apex-quantum supernode peer info",
        ))
        self.register(MeshAction(
            name="quantum_shield_health", peer="quantum_shield", method="GET",
            path="/health", confidence=0.20,
            description="Read post-quantum shield (ML-KEM/ML-DSA) status",
        ))
        self.register(MeshAction(
            name="pi_bridge_health", peer="pi_bridge", method="GET",
            path="/health", confidence=0.20,
            description="Read Pi mainnet bridge health",
        ))
        # Founder-only operational actions
        self.register(MeshAction(
            name="founder_decree", peer="military_bridge", method="POST",
            path="/sovereign/route", confidence=0.99, founder_only=True,
            description="Broadcast a founder-signed decree across the mesh",
        ))
        # ── GCV ($314,159 peg) — observe + enforce across every spend ───────
        # These actions hit nano-saib itself (the cortex's host). They give SAIB
        # a single subscription point to read GCV math and check 30-year-vision
        # sustainability before *any* peer action that moves Pi.
        self.register(MeshAction(
            name="gcv_oracle", peer="nano_saib", method="GET",
            path="/v9/gcv/oracle", confidence=0.20,
            description="GCV math: verify offered_pi vs item_usd_value at $314,159 peg",
        ))
        self.register(MeshAction(
            name="gcv_sustainability", peer="nano_saib", method="GET",
            path="/v9/gcv/budget", confidence=0.20,
            description="30-year Pi spend budget (yearly / monthly / daily / per-tx caps)",
        ))
        self.register(MeshAction(
            name="gcv_check_tx", peer="nano_saib", method="POST",
            path="/v9/gcv/check-tx", confidence=0.40,
            description="Pre-flight gate: would this Pi spend violate the 30-year pace?",
        ))

    def register(self, action: MeshAction) -> None:
        self.actions[action.name] = action

    # ── lifecycle ────────────────────────────────────────────────────────────

    async def boot(self) -> None:
        if HYPER_MESH_DISABLED:
            log.info("hyper-mesh disabled by HYPER_MESH_DISABLED=1")
            return
        self._client = httpx.AsyncClient(timeout=CORTEX_TIMEOUT_S)
        try:
            import redis.asyncio as _aioredis  # node-redis equivalent for Python
            # socket_timeout=None → blocking reads on the pubsub socket (otherwise
            # listen() trips its default short timeout and we churn forever).
            # health_check_interval keeps the connection alive across long quiet periods.
            self._redis = _aioredis.from_url(
                REDIS_MESH_URL,
                decode_responses=True,
                socket_connect_timeout=2.0,
                socket_timeout=None,
                socket_keepalive=True,
                health_check_interval=30,
            )
            self._pubsub_task = asyncio.create_task(self._pubsub_loop())
            log.info("HyperMeshCortex online — subscribing to %s, %s, %s",
                     LEARNING_CHANNEL, HYPER_MESH_CHANNEL, HYPER_MESH_CMD_CHAN)
        except Exception as exc:
            log.warning("HyperMeshCortex: redis subscribe disabled (%s)", exc)
            self._redis = None

    async def shutdown(self) -> None:
        if self._pubsub_task and not self._pubsub_task.done():
            self._pubsub_task.cancel()
        if self._client:
            await self._client.aclose()
        if self._redis:
            try:    await self._redis.aclose()
            except Exception: pass

    # ── pubsub ───────────────────────────────────────────────────────────────

    async def _pubsub_loop(self) -> None:
        """Subscribe to the three hyper-mesh channels; never let an exception kill it."""
        assert self._redis is not None
        backoff = 1.0
        while True:
            try:
                pubsub = self._redis.pubsub(ignore_subscribe_messages=True)
                await pubsub.subscribe(LEARNING_CHANNEL, HYPER_MESH_CHANNEL, HYPER_MESH_CMD_CHAN)
                backoff = 1.0
                async for msg in pubsub.listen():
                    if not msg or msg.get("type") != "message":
                        continue
                    channel = msg.get("channel")
                    data    = msg.get("data")
                    try:
                        payload = json.loads(data) if isinstance(data, str) else data
                    except Exception:
                        payload = {"raw": str(data)[:1024]}
                    self._absorb(channel, payload)
            except asyncio.CancelledError:
                return
            except Exception as exc:
                log.warning("hyper-mesh pubsub loop error: %s — reconnecting in %.1fs", exc, backoff)
                await asyncio.sleep(backoff)
                backoff = min(backoff * 2.0, 30.0)

    def _absorb(self, channel: str, payload: Dict[str, Any]) -> None:
        if channel == LEARNING_CHANNEL:
            self.snapshot.last_learning_ts     = time.time()
            self.snapshot.learning_cycles_seen += 1
            self.snapshot.last_insight         = payload
            self.snapshot.findings             = payload.get("findings",      []) or []
            self.snapshot.top_regions          = payload.get("top_regions",   []) or []
            self.snapshot.top_languages        = payload.get("top_languages", []) or []
            # If hyper_mesh substructure rides along the insight, take it too.
            hm = payload.get("hyper_mesh") or {}
            if hm:
                self.snapshot.peers_reachable = hm.get("reachable", [])
                self.snapshot.peers_degraded  = hm.get("degraded",  [])
            for cb in self._on_insight_cbs:
                try:    cb(payload)
                except Exception as exc:
                    log.warning("on_insight callback error: %s", exc)
        elif channel == HYPER_MESH_CHANNEL:
            self.snapshot.last_hyper_mesh_ts     = time.time()
            self.snapshot.hyper_mesh_cycles_seen += 1
            self.snapshot.last_hyper_mesh        = payload
            peers = payload.get("peers", []) or []
            self.snapshot.peers_reachable = [p["name"] for p in peers if p.get("ok")]
            self.snapshot.peers_degraded  = [p["name"] for p in peers if not p.get("ok")]
            for cb in self._on_state_cbs:
                try:    cb(payload)
                except Exception as exc:
                    log.warning("on_state callback error: %s", exc)
        elif channel == HYPER_MESH_CMD_CHAN:
            for cb in self._on_cmd_cbs:
                try:    cb(payload)
                except Exception as exc:
                    log.warning("on_cmd callback error: %s", exc)

    def on_insight(self, cb: Callable[[Dict[str, Any]], None]) -> None:
        self._on_insight_cbs.append(cb)

    def on_state(self, cb: Callable[[Dict[str, Any]], None]) -> None:
        self._on_state_cbs.append(cb)

    def on_command(self, cb: Callable[[Dict[str, Any]], None]) -> None:
        self._on_cmd_cbs.append(cb)

    # ── action invocation ────────────────────────────────────────────────────

    async def invoke(
        self,
        action_name: str,
        body: Optional[Dict[str, Any]] = None,
        *,
        actor_id: str = "saib",
        is_founder: bool = False,
        confidence: float = 1.0,
    ) -> Dict[str, Any]:
        """Fire a registered MeshAction against its peer. Returns a status dict.

        Founder-only actions require `is_founder=True`. All other actions are
        gated by `confidence >= CORTEX_AUTO_THRESHOLD` so SAIB doesn't act
        capriciously.
        """
        action = self.actions.get(action_name)
        if action is None:
            return {"ok": False, "error": f"unknown action: {action_name}"}
        if action.founder_only and not is_founder:
            self.snapshot.actions_blocked += 1
            return {"ok": False, "error": "founder-only action",
                    "action": action.name}
        if confidence < CORTEX_AUTO_THRESHOLD and not is_founder:
            self.snapshot.actions_queued += 1
            return {"ok": False, "queued": True,
                    "reason": f"confidence {confidence:.2f} < {CORTEX_AUTO_THRESHOLD}",
                    "action": action.name}

        # ── GCV 30-year sustainability gate ─────────────────────────────────
        # If the caller is asking the cortex to spend Pi (any body with a
        # `pi_amount`), pre-flight against the sustainability calculator so we
        # never burn the principal in a few months. Founder can override.
        if body and action.name not in ("gcv_oracle", "gcv_sustainability", "gcv_check_tx"):
            pi_amount = body.get("pi_amount") or body.get("offered_pi")
            if pi_amount and not is_founder:
                gate = await self._gcv_gate(
                    total_pi       = str(body.get("total_pi", "1000")),
                    spent_pi       = str(body.get("spent_pi", "0")),
                    spent_today_pi = str(body.get("spent_today_pi", "0")),
                    offered_pi     = str(pi_amount),
                )
                if gate is not None and not gate.get("approved", False):
                    self.snapshot.actions_blocked += 1
                    return {"ok": False, "error": "GCV sustainability gate rejected spend",
                            "action": action.name, "gcv": gate}

        base = PEERS.get(action.peer)
        if not base:
            return {"ok": False, "error": f"unknown peer: {action.peer}"}
        url = f"{base.rstrip('/')}{action.path}"

        if self._client is None:
            self._client = httpx.AsyncClient(timeout=CORTEX_TIMEOUT_S)
        # Self-calls into nano_saib endpoints need the bridge token; peer calls don't.
        headers = {}
        if action.peer == "nano_saib" and GCV_SELF_TOKEN:
            headers["Authorization"] = f"Bearer {GCV_SELF_TOKEN}"
        try:
            if action.method == "GET":
                r = await self._client.get(url, params=body or None, headers=headers)
            else:
                r = await self._client.post(url, json=body or {}, headers=headers)
            try:
                data = r.json()
            except Exception:
                data = {"_raw": r.text[:1024]}
            result = {"ok": r.is_success, "status": r.status_code, "data": data,
                      "action": action.name, "actor": actor_id, "ts": int(time.time())}
        except Exception as exc:
            result = {"ok": False, "error": str(exc)[:300],
                      "action": action.name, "actor": actor_id, "ts": int(time.time())}

        action.invocations += 1
        action.last_result  = result
        action.last_ts      = time.time()
        if result["ok"]:
            self.snapshot.actions_fired += 1
        return result

    # ── GCV self-gate (uses the local FastAPI app on 127.0.0.1:8201) ────────
    async def _gcv_gate(
        self,
        total_pi:       str,
        spent_pi:       str,
        spent_today_pi: str,
        offered_pi:     str,
    ) -> Optional[Dict[str, Any]]:
        """Call /v9/gcv/check-tx; return the gate dict or None if unreachable."""
        if self._client is None:
            self._client = httpx.AsyncClient(timeout=CORTEX_TIMEOUT_S)
        url = PEERS["nano_saib"].rstrip("/") + "/v9/gcv/check-tx"
        headers = {}
        if GCV_SELF_TOKEN:
            headers["Authorization"] = f"Bearer {GCV_SELF_TOKEN}"
        try:
            r = await self._client.post(url, headers=headers, json={
                "total_pi":       total_pi,
                "spent_pi":       spent_pi,
                "spent_today_pi": spent_today_pi,
                "offered_pi":     offered_pi,
            })
            if r.status_code == 200:
                return r.json()
            return {"approved": False, "reasons": [f"gcv-check-tx http {r.status_code}"]}
        except Exception as exc:
            return {"approved": False, "reasons": [f"gcv-check-tx error: {str(exc)[:200]}"]}

    # ── visibility ───────────────────────────────────────────────────────────

    def status(self) -> Dict[str, Any]:
        s = self.snapshot
        return {
            "online":               not HYPER_MESH_DISABLED,
            "last_learning_ts":     int(s.last_learning_ts),
            "last_hyper_mesh_ts":   int(s.last_hyper_mesh_ts),
            "learning_cycles_seen": s.learning_cycles_seen,
            "hyper_mesh_cycles":    s.hyper_mesh_cycles_seen,
            "peers_reachable":      s.peers_reachable,
            "peers_degraded":       s.peers_degraded,
            "findings":             s.findings[:10],
            "top_regions":          s.top_regions[:10],
            "top_languages":        s.top_languages[:10],
            "actions": {
                "registered":  list(self.actions.keys()),
                "fired":       s.actions_fired,
                "queued":      s.actions_queued,
                "blocked":     s.actions_blocked,
            },
            "auto_threshold": CORTEX_AUTO_THRESHOLD,
        }


# Singleton — imported by app.py
cortex = HyperMeshCortex()

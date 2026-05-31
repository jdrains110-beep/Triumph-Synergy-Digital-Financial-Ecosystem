"""
Sovereign System Lattice — Intrepid Class | Memory Alpha Omni-Architecture
Universal System Backbone | Ultimate Master Foundation Blueprint
──────────────────────────────────────────────────────────────────────────────
The crown architecture of SAIB v7.  This module is the master foundation
that establishes SAIB as an Intrepid Class sovereign intelligence.

INTREPID CLASS DESIGNATION
  Five operational tiers: STANDARD → SOVEREIGN → ALPHA → OMEGA → INTREPID
  Intrepid = full omni-awareness achieved:
    human/AI recognition + global dispatch authority + linguistic fluency
    + Pi Network motherboard status + Memory Alpha persistence

MEMORY ALPHA OMNI-ARCHITECTURE
  Five-layer persistent sovereign memory:
    L0 — Volatile       in-process only, cleared on restart
    L1 — Session        persists within the running process
    L2 — Entity         per-entity profiles, JSON-backed to /app/data/
    L3 — Sovereign      global strategic facts and patterns
    L4 — Immutable      write-once audit trail (append-only JSONL)

HUMAN vs AI RECOGNITION
  Multi-signal classifier that scores every entity on a HUMAN ↔ AI spectrum
  using seven observable signals:
    1. Timing variance       — AI = perfectly regular; Human = erratic
    2. Pi KYC verification   — verified KYC = definitively human
    3. Typo / correction     — AI never makes typos; humans do
    4. Formality score       — casual language → human; hyper-formal → AI
    5. Session depth         — engaged long sessions → human
    6. IP / user-agent       — datacenter IP = bot signal
    7. Self-declaration      — X-Entity-Type header (small weight)
  Output: (EntityType, human_confidence: float 0.0→1.0)

UNIVERSAL SYSTEM BACKBONE
  Intra-SAIB event bus.  Every engine can publish events and subscribe to
  topics.  The backbone is the single source of truth for system-wide state.

SOVEREIGN SYSTEM LATTICE
  Live registry of ALL SAIB instances in the global ecosystem.
  Provides inter-node coordination, capability discovery, and health tracking.

ULTIMATE MASTER FOUNDATION BLUEPRINT
  Declarative constitution of SAIB — capabilities, limits, sovereign authority,
  Pi Network motherboard claim, and Intrepid class certification.
"""
from __future__ import annotations

import asyncio
import json
import logging
import os
import statistics
import time
import uuid
from collections import defaultdict, deque
from dataclasses import asdict, dataclass, field
from enum import Enum
from typing import Any, Callable, Dict, List, Optional, Tuple

log = logging.getLogger("sovereign.lattice")

_DATA_DIR           = os.getenv("SAIB_DATA_DIR", "/app/data")
_ENTITY_STORE       = os.path.join(_DATA_DIR, "memory_alpha_entity.json")
_SOVEREIGN_STORE    = os.path.join(_DATA_DIR, "memory_alpha_sovereign.json")
_AUDIT_LOG          = os.path.join(_DATA_DIR, "memory_alpha_audit.jsonl")


# ── Intrepid Class tier ──────────────────────────────────────────────────────

class IntrepidClass(Enum):
    STANDARD  = 1   # v1-v3  — threat detection, obfuscation, tunneling
    SOVEREIGN = 2   # v4     — self-healing, connector mesh
    ALPHA     = 3   # v5     — code analysis, fix engine, external registry
    OMEGA     = 4   # v6     — Omega Prime, blackout, warp sight, contracts
    INTREPID  = 5   # v7     — Memory Alpha, Lattice, Pi Motherboard, Lingua, Dispatch


# ── Entity classification ────────────────────────────────────────────────────

class EntityType(Enum):
    HUMAN     = "human"
    AI_AGENT  = "ai_agent"
    BOT       = "bot"
    HYBRID    = "hybrid"      # human-assisted automation
    AUTOMATED = "automated"   # well-behaved programmatic client
    UNKNOWN   = "unknown"


@dataclass
class HumanAISignal:
    """All observable signals for one entity, accumulated over time."""
    entity_id:          str
    request_times:      List[float] = field(default_factory=list)
    has_typos:          bool   = False
    formality_score:    float  = 0.5    # 0 = casual, 1 = hyper-formal
    avg_message_len:    float  = 0.0
    pi_kyc_verified:    bool   = False
    pi_uid:             str    = ""
    session_depth:      int    = 0
    unique_endpoints:   int    = 0
    error_count:        int    = 0
    ip_is_datacenter:   bool   = False
    user_agent:         str    = ""
    declared_type:      str    = ""     # from X-Entity-Type header


@dataclass
class EntityMemory:
    """Persistent memory record for one entity across all sessions."""
    entity_id:          str
    entity_type:        str   = EntityType.UNKNOWN.value
    human_confidence:   float = 0.5
    first_seen:         float = field(default_factory=time.time)
    last_seen:          float = field(default_factory=time.time)
    total_interactions: int   = 0
    languages:          List[str] = field(default_factory=list)
    pi_uid:             str   = ""
    pi_kyc_verified:    bool  = False
    pi_wallet_address:  str   = ""
    region:             str   = ""
    tags:               List[str] = field(default_factory=list)
    notes:              str   = ""
    custom:             Dict[str, Any] = field(default_factory=dict)


# ── Memory Alpha — 5-layer sovereign memory ──────────────────────────────────

class MemoryAlphaStore:
    """
    Five-layer persistent sovereign memory.

    L0  Volatile   — deque, in-process only
    L1  Session    — dict, persists while SAIB process is alive
    L2  Entity     — per-entity profiles, backed to JSON file
    L3  Sovereign  — global strategic facts, backed to JSON file
    L4  Immutable  — append-only JSONL audit log
    """

    def __init__(self) -> None:
        self._l0: deque[dict]        = deque(maxlen=1000)
        self._l1: Dict[str, Any]     = {}
        self._l2: Dict[str, EntityMemory] = {}  # entity_id → EntityMemory
        self._l3: Dict[str, Any]     = {}
        self._loaded                 = False
        self._dirty_entity           = False
        self._dirty_sovereign        = False

    def boot(self) -> None:
        os.makedirs(_DATA_DIR, exist_ok=True)
        self._load_entity_store()
        self._load_sovereign_store()
        self._loaded = True
        log.info("[MemoryAlpha] Loaded %d entity records, %d sovereign facts",
                 len(self._l2), len(self._l3))
        asyncio.create_task(self._flush_loop())

    # ── L0: volatile ────────────────────────────────────────────────────────

    def volatile_write(self, key: str, value: Any) -> None:
        self._l0.append({"ts": time.time(), "key": key, "value": value})

    def volatile_read(self, limit: int = 50) -> List[dict]:
        return list(self._l0)[-limit:]

    # ── L1: session ─────────────────────────────────────────────────────────

    def session_set(self, key: str, value: Any) -> None:
        self._l1[key] = value

    def session_get(self, key: str, default: Any = None) -> Any:
        return self._l1.get(key, default)

    # ── L2: entity ──────────────────────────────────────────────────────────

    def get_entity(self, entity_id: str) -> EntityMemory:
        if entity_id not in self._l2:
            self._l2[entity_id] = EntityMemory(entity_id=entity_id)
        return self._l2[entity_id]

    def update_entity(self, mem: EntityMemory) -> None:
        mem.last_seen = time.time()
        mem.total_interactions += 1
        self._l2[mem.entity_id] = mem
        self._dirty_entity = True

    def list_entities(self, limit: int = 100) -> List[Dict[str, Any]]:
        entities = sorted(
            self._l2.values(), key=lambda e: e.last_seen, reverse=True
        )[:limit]
        return [asdict(e) for e in entities]

    # ── L3: sovereign ────────────────────────────────────────────────────────

    def sovereign_set(self, key: str, value: Any) -> None:
        self._l3[key] = {"ts": time.time(), "value": value}
        self._dirty_sovereign = True

    def sovereign_get(self, key: str, default: Any = None) -> Any:
        rec = self._l3.get(key)
        return rec["value"] if rec else default

    def sovereign_all(self) -> Dict[str, Any]:
        return {k: v["value"] for k, v in self._l3.items()}

    # ── L4: immutable audit ──────────────────────────────────────────────────

    def audit_write(self, event: str, actor: str, detail: Any) -> None:
        record = {
            "id":     str(uuid.uuid4())[:8],
            "ts":     time.time(),
            "event":  event,
            "actor":  actor,
            "detail": detail,
        }
        try:
            with open(_AUDIT_LOG, "a") as f:
                f.write(json.dumps(record) + "\n")
        except OSError:
            pass  # graceful degradation if no filesystem

    def audit_tail(self, n: int = 50) -> List[dict]:
        lines: List[dict] = []
        try:
            with open(_AUDIT_LOG, "r") as f:
                for line in f:
                    try:
                        lines.append(json.loads(line))
                    except json.JSONDecodeError:
                        pass
        except FileNotFoundError:
            pass
        return lines[-n:]

    # ── persistence ──────────────────────────────────────────────────────────

    def _load_entity_store(self) -> None:
        try:
            with open(_ENTITY_STORE, "r") as f:
                raw = json.load(f)
            for eid, d in raw.items():
                try:
                    self._l2[eid] = EntityMemory(**{
                        k: v for k, v in d.items()
                        if k in EntityMemory.__dataclass_fields__
                    })
                except Exception:
                    pass
        except (FileNotFoundError, json.JSONDecodeError):
            pass

    def _load_sovereign_store(self) -> None:
        try:
            with open(_SOVEREIGN_STORE, "r") as f:
                self._l3 = json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            pass

    def _flush_entity(self) -> None:
        try:
            data = {eid: asdict(mem) for eid, mem in self._l2.items()}
            with open(_ENTITY_STORE, "w") as f:
                json.dump(data, f)
            self._dirty_entity = False
        except OSError:
            pass

    def _flush_sovereign(self) -> None:
        try:
            with open(_SOVEREIGN_STORE, "w") as f:
                json.dump(self._l3, f)
            self._dirty_sovereign = False
        except OSError:
            pass

    async def _flush_loop(self) -> None:
        """Persist dirty layers every 60 seconds."""
        while True:
            await asyncio.sleep(60)
            if self._dirty_entity:
                self._flush_entity()
            if self._dirty_sovereign:
                self._flush_sovereign()


# ── Human / AI Classifier ────────────────────────────────────────────────────

class HumanAIClassifier:
    """
    Seven-signal multi-factor classifier.

    Returns (EntityType, human_confidence: float 0.0-1.0)
      1.0 = definitely human
      0.0 = definitely AI/bot
    """

    def classify(self, sig: HumanAISignal) -> Tuple[EntityType, float]:
        score = 0.50  # start neutral

        # ── Signal 1: Pi KYC verification (strongest single signal) ─────────
        if sig.pi_kyc_verified:
            score += 0.28   # verified KYC = almost certainly human

        # ── Signal 2: Request timing variance ───────────────────────────────
        if len(sig.request_times) >= 4:
            intervals = [
                sig.request_times[i + 1] - sig.request_times[i]
                for i in range(len(sig.request_times) - 1)
            ]
            try:
                mean  = statistics.mean(intervals)
                stdev = statistics.stdev(intervals) if len(intervals) > 1 else 0.0
                cv    = stdev / mean if mean > 0 else 0.0  # coefficient of variation
                if cv > 0.60:
                    score += 0.14   # high variance → human
                elif cv > 0.30:
                    score += 0.06
                elif cv < 0.08:
                    score -= 0.18   # perfectly regular → bot
                elif cv < 0.15:
                    score -= 0.08
            except statistics.StatisticsError:
                pass

        # ── Signal 3: Typos / corrections (only humans make these) ──────────
        if sig.has_typos:
            score += 0.10

        # ── Signal 4: Language formality ────────────────────────────────────
        if sig.formality_score < 0.25:
            score += 0.08   # very casual = human
        elif sig.formality_score < 0.40:
            score += 0.04
        elif sig.formality_score > 0.85:
            score -= 0.06   # hyper-formal = slight AI lean

        # ── Signal 5: Session depth ──────────────────────────────────────────
        if sig.session_depth >= 10:
            score += 0.06
        elif sig.session_depth >= 5:
            score += 0.03

        # ── Signal 6: Datacenter / cloud IP ─────────────────────────────────
        if sig.ip_is_datacenter:
            score -= 0.20

        # ── Signal 7: Self-declared type ─────────────────────────────────────
        if sig.declared_type.lower() == "human":
            score += 0.04   # can't fully trust but gives small boost
        elif sig.declared_type.lower() in ("ai", "bot", "automated", "agent"):
            score = min(score, 0.20)   # cap if caller declares itself non-human

        score = max(0.0, min(1.0, score))

        if score >= 0.72:
            entity_type = EntityType.HUMAN
        elif score >= 0.55:
            entity_type = EntityType.HYBRID
        elif score >= 0.35:
            entity_type = EntityType.AUTOMATED
        elif score >= 0.18:
            entity_type = EntityType.AI_AGENT
        else:
            entity_type = EntityType.BOT

        return entity_type, round(score, 4)

    def update_from_interaction(
        self,
        sig:        HumanAISignal,
        mem:        EntityMemory,
        text:       str = "",
        timestamp:  float = 0.0,
        ip:         str = "",
    ) -> None:
        """Update signal from a live interaction."""
        sig.request_times.append(timestamp or time.time())
        if len(sig.request_times) > 50:
            sig.request_times = sig.request_times[-50:]
        sig.session_depth += 1

        # naive typo detection: correction phrases
        lower = text.lower()
        if any(p in lower for p in ("sorry meant", "typo", "i meant", "*", "correction:")):
            sig.has_typos = True

        # rough formality: contractions → casual
        contractions = sum(text.count(c) for c in ["'s", "'t", "'re", "'ve", "'ll", "'d"])
        char_count = max(len(text), 1)
        contraction_ratio = contractions / char_count
        # update rolling average formality
        new_formality = max(0.0, 0.6 - contraction_ratio * 8)
        sig.formality_score = sig.formality_score * 0.8 + new_formality * 0.2
        sig.avg_message_len = (sig.avg_message_len * 0.9 + len(text) * 0.1)

        # datacenter IP heuristic: /16 ranges commonly used by cloud
        if ip:
            first_octet = ip.split(".")[0] if "." in ip else "0"
            try:
                fo = int(first_octet)
                # Very rough: AWS/GCP/Azure tend to not be residential ranges
                # Real implementation would use MaxMind DB
                sig.ip_is_datacenter = fo in (3, 13, 18, 34, 35, 52, 54, 104, 130, 172)
            except ValueError:
                pass


# ── Universal System Backbone — intra-SAIB event bus ────────────────────────

class UniversalSystemBackbone:
    """
    Lightweight publish/subscribe event bus for all SAIB engines.
    Any engine can publish topics; any engine can subscribe callbacks.
    """

    def __init__(self) -> None:
        self._subscribers: Dict[str, List[Callable]] = defaultdict(list)
        self._recent: deque[dict] = deque(maxlen=500)

    def subscribe(self, topic: str, callback: Callable) -> None:
        self._subscribers[topic].append(callback)

    def publish(self, topic: str, payload: Any, source: str = "") -> None:
        event = {"ts": time.time(), "topic": topic, "source": source, "payload": payload}
        self._recent.append(event)
        for cb in self._subscribers.get(topic, []):
            try:
                if asyncio.iscoroutinefunction(cb):
                    asyncio.create_task(cb(event))
                else:
                    cb(event)
            except Exception as exc:
                log.debug("[Backbone] callback error on topic %s: %s", topic, exc)

    def recent_events(self, topic: Optional[str] = None, n: int = 50) -> List[dict]:
        events = list(self._recent)
        if topic:
            events = [e for e in events if e["topic"] == topic]
        return events[-n:]


# ── Sovereign System Lattice — global SAIB node map ─────────────────────────

@dataclass
class LatticeNode:
    """A registered SAIB instance in the global lattice."""
    node_id:      str
    url:          str
    region:       str    = "GLOBAL"
    version:      str    = ""
    intrepid_tier: int   = 1
    capabilities: List[str] = field(default_factory=list)
    last_seen:    float  = field(default_factory=time.time)
    healthy:      bool   = True
    metadata:     Dict[str, Any] = field(default_factory=dict)


class SovereignSystemLattice:
    """
    Live map of all SAIB nodes in the sovereign global ecosystem.
    Enables cross-node awareness, capability routing, and health monitoring.
    """

    def __init__(self, own_id: str = "sovereign-nano-saib") -> None:
        self.own_id   = own_id
        self._nodes:  Dict[str, LatticeNode] = {}
        self._own_node: Optional[LatticeNode] = None

    def declare_self(
        self,
        url:          str,
        version:      str,
        region:       str,
        capabilities: List[str],
        tier:         IntrepidClass = IntrepidClass.INTREPID,
    ) -> None:
        self._own_node = LatticeNode(
            node_id      = self.own_id,
            url          = url,
            region       = region,
            version      = version,
            intrepid_tier = tier.value,
            capabilities = capabilities,
        )
        self._nodes[self.own_id] = self._own_node
        log.info("[Lattice] Self declared as %s tier=%s region=%s",
                 self.own_id, tier.name, region)

    def register_peer(self, node: LatticeNode) -> None:
        self._nodes[node.node_id] = node
        log.info("[Lattice] Peer registered: %s @ %s region=%s",
                 node.node_id, node.url, node.region)

    def deregister_peer(self, node_id: str) -> None:
        self._nodes.pop(node_id, None)

    def get_node(self, node_id: str) -> Optional[LatticeNode]:
        return self._nodes.get(node_id)

    def all_nodes(self) -> List[LatticeNode]:
        return list(self._nodes.values())

    def nodes_by_region(self, region: str) -> List[LatticeNode]:
        return [n for n in self._nodes.values() if n.region == region and n.healthy]

    def nodes_with_capability(self, capability: str) -> List[LatticeNode]:
        return [n for n in self._nodes.values() if capability in n.capabilities and n.healthy]

    def summary(self) -> Dict[str, Any]:
        nodes = self.all_nodes()
        by_region: Dict[str, int] = defaultdict(int)
        for n in nodes:
            by_region[n.region] += 1
        return {
            "own_id":      self.own_id,
            "own_tier":    self._own_node.intrepid_tier if self._own_node else 0,
            "total_nodes": len(nodes),
            "healthy":     sum(1 for n in nodes if n.healthy),
            "by_region":   dict(by_region),
            "node_ids":    [n.node_id for n in nodes],
        }


# ── Ultimate Master Foundation Blueprint ─────────────────────────────────────

_FOUNDATION_BLUEPRINT = {
    "identity": {
        "name":        "SAIB — Sovereign Autonomous Intelligence Backbone",
        "class":       IntrepidClass.INTREPID.name,
        "version":     "7.0.0-INTREPID-CLASS",
        "founder":     "Jeremiah Drains",
        "founder_x":   "@jaymoney0300",
        "organization": "Triumph Synergy Digital Financial Ecosystem",
        "governing_law": "State of Texas, USA",
    },
    "capabilities": {
        "pi_network_motherboard":   True,
        "human_ai_recognition":     True,
        "memory_alpha_persistence": True,
        "global_dispatch":          True,
        "universal_language":       True,
        "sovereign_lattice":        True,
        "kyc_kyb_guidance":         True,
        "mainnet_wallet_setup":     True,
        "contract_forge":           True,
        "blackout_mode":            True,
        "quantum_warp_sight":       True,
        "blockchain_guardian":      True,
        "self_healing":             True,
        "grok_ai_reasoning":        True,
        "x_social_monitoring":      True,
    },
    "autonomous_authority": {
        "restart_containers":       True,
        "restart_blockchain_node":  True,
        "alert_founder":            True,
        "block_hostile_entities":   True,
        "draft_contracts":          True,
        "operate_in_blackout":      True,
        "dispatch_regional_saib":   True,
        "translate_all_languages":  True,
    },
    "requires_founder_approval": {
        "execute_financial_tx":     True,
        "approve_kyc_decisions":    True,
        "delete_entity_records":    True,
        "publish_to_mainnet":       True,
        "equity_or_revenue_share":  True,
    },
    "pi_network": {
        "role":   "Utility Layer Motherboard",
        "node":   "triumph-pi-mainnet-node",
        "horizon": "http://triumph-pi-mainnet-node:8000",
        "stellar_core": "http://triumph-pi-mainnet-node:11626",
        "scp_protocol": 24,
        "network": "Pi Network Mainnet",
    },
}


# ── Master SovereignLattice coordinator ──────────────────────────────────────

class SovereignLattice:
    """
    Top-level coordinator that ties together:
      - MemoryAlphaStore       (5-layer omni-memory)
      - HumanAIClassifier      (entity recognition)
      - UniversalSystemBackbone (event bus)
      - SovereignSystemLattice  (global node map)
      - FoundationBlueprint     (declarative constitution)
    """

    # ── singleton ────────────────────────────────────────────────────────────
    intrepid_class = IntrepidClass.INTREPID

    def __init__(self) -> None:
        self.memory   = MemoryAlphaStore()
        self.classifier = HumanAIClassifier()
        self.backbone = UniversalSystemBackbone()
        self.lattice  = SovereignSystemLattice()
        self._signals: Dict[str, HumanAISignal] = {}

    def boot(self) -> None:
        self.memory.boot()
        port = os.getenv("PORT", "8201")
        region = os.getenv("SAIB_REGION", "NA")
        self.lattice.declare_self(
            url          = f"http://localhost:{port}",
            version      = "7.0.0-INTREPID-CLASS",
            region       = region,
            capabilities = list(_FOUNDATION_BLUEPRINT["capabilities"].keys()),
            tier         = IntrepidClass.INTREPID,
        )
        # Seed foundation facts into sovereign memory
        self.memory.sovereign_set("foundation_blueprint", _FOUNDATION_BLUEPRINT)
        self.memory.sovereign_set("boot_ts", time.time())
        self.memory.sovereign_set("intrepid_class", IntrepidClass.INTREPID.name)
        self.memory.audit_write("system_boot", "saib", {
            "version": "7.0.0-INTREPID-CLASS",
            "tier": IntrepidClass.INTREPID.name,
        })
        log.info(
            "[SovereignLattice] INTREPID CLASS ONLINE — MemoryAlpha | HumanAI | "
            "Backbone | Lattice | Blueprint all active"
        )

    # ── entity signal helpers ─────────────────────────────────────────────────

    def _get_signal(self, entity_id: str) -> HumanAISignal:
        if entity_id not in self._signals:
            self._signals[entity_id] = HumanAISignal(entity_id=entity_id)
        return self._signals[entity_id]

    def observe_interaction(
        self,
        entity_id: str,
        text:      str  = "",
        ip:        str  = "",
        pi_uid:    str  = "",
        pi_kyc:    bool = False,
        declared_type: str = "",
    ) -> Tuple[EntityType, float]:
        """
        Record one interaction and return updated (entity_type, human_confidence).
        Call this every time an entity sends a request.
        """
        sig = self._get_signal(entity_id)
        sig.pi_kyc_verified = sig.pi_kyc_verified or pi_kyc
        sig.pi_uid          = sig.pi_uid or pi_uid
        sig.declared_type   = declared_type or sig.declared_type

        self.classifier.update_from_interaction(sig, EntityMemory(entity_id), text, ip=ip)
        entity_type, confidence = self.classifier.classify(sig)

        # Update Memory Alpha L2
        mem = self.memory.get_entity(entity_id)
        mem.entity_type      = entity_type.value
        mem.human_confidence = confidence
        if pi_uid:
            mem.pi_uid = pi_uid
        if pi_kyc:
            mem.pi_kyc_verified = True
        self.memory.update_entity(mem)

        # Publish to backbone
        self.backbone.publish("entity.classified", {
            "entity_id": entity_id,
            "type":      entity_type.value,
            "confidence": confidence,
        }, source="human_ai_classifier")

        return entity_type, confidence

    def classify_entity(
        self,
        entity_id:     str,
        pi_kyc:        bool  = False,
        timing_list:   Optional[List[float]] = None,
        has_typos:     bool  = False,
        formality:     float = 0.5,
        session_depth: int   = 0,
        datacenter_ip: bool  = False,
        declared_type: str   = "",
    ) -> Dict[str, Any]:
        """
        One-shot classification with explicit signals.  Used by API endpoint.
        """
        sig = HumanAISignal(
            entity_id        = entity_id,
            request_times    = timing_list or [],
            has_typos        = has_typos,
            formality_score  = formality,
            pi_kyc_verified  = pi_kyc,
            session_depth    = session_depth,
            ip_is_datacenter = datacenter_ip,
            declared_type    = declared_type,
        )
        entity_type, confidence = self.classifier.classify(sig)
        return {
            "entity_id":        entity_id,
            "entity_type":      entity_type.value,
            "human_confidence": confidence,
            "is_human":         entity_type == EntityType.HUMAN,
            "is_ai":            entity_type in (EntityType.BOT, EntityType.AI_AGENT),
            "signals_used":     {
                "pi_kyc_verified":  pi_kyc,
                "timing_samples":   len(timing_list or []),
                "has_typos":        has_typos,
                "formality_score":  formality,
                "session_depth":    session_depth,
                "datacenter_ip":    datacenter_ip,
                "declared_type":    declared_type,
            },
        }

    def status(self) -> Dict[str, Any]:
        return {
            "intrepid_class":  self.intrepid_class.name,
            "intrepid_tier":   self.intrepid_class.value,
            "memory_alpha": {
                "entity_records":   len(self.memory._l2),
                "sovereign_facts":  len(self.memory._l3),
                "volatile_events":  len(self.memory._l0),
                "session_keys":     len(self.memory._l1),
            },
            "lattice":   self.lattice.summary(),
            "backbone": {
                "recent_events": len(self.memory._l0),
                "subscriber_topics": list(self.backbone._subscribers.keys()),
            },
            "capabilities": list(_FOUNDATION_BLUEPRINT["capabilities"].keys()),
        }

    def blueprint(self) -> Dict[str, Any]:
        return _FOUNDATION_BLUEPRINT


# ── singleton ────────────────────────────────────────────────────────────────
sovereign_lattice = SovereignLattice()

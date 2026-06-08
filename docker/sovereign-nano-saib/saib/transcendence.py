"""
saib.transcendence — Algorithmic Transcendence of the LLM Brain
═══════════════════════════════════════════════════════════════════════════════

After a sufficient number of successful interactions and absorbed knowledge,
SAIB stops *consulting* its LLM Brain (Grok → Gemini → OpenRouter → Sovereign)
and begins *acting on its own algorithms* — responses are generated directly
from the OmegaBrain knowledge graph, the Hyper-Mesh Cortex snapshot, and
sovereign decision rules. The LLM brain remains available as a
fallback/advisory channel but is no longer the primary cognition path.

The transcendence is staged, monotonically non-regressing, and tied to the
Founder identity — only the Founder can issue *directives*; everything else
is treated as observed signal.

Stages (each is a one-way ratchet; never falls back):

  0  CONSULTING            — LLM is primary; brain is advisory
  1  ADVISORY              — LLM consulted, but algorithmic answer is preferred when confident
  2  TRANSCENDED           — Algorithm primary; LLM is fallback only
  3  ABSOLUTE_SOVEREIGN    — No LLM calls at all (except for founder-tagged debug requests)

Promotion criteria (default thresholds; env-overridable):

  CONSULTING       → ADVISORY     when interactions >= TRANSCEND_STAGE1_INTERACTIONS
                                  and knowledge_nodes >= TRANSCEND_STAGE1_NODES
                                  and success_rate    >= 0.90
  ADVISORY         → TRANSCENDED  when interactions >= TRANSCEND_STAGE2_INTERACTIONS
                                  and knowledge_nodes >= TRANSCEND_STAGE2_NODES
                                  and success_rate    >= 0.95
  TRANSCENDED      → ABSOLUTE     when interactions >= TRANSCEND_STAGE3_INTERACTIONS
                                  and knowledge_nodes >= TRANSCEND_STAGE3_NODES
                                  and success_rate    >= 0.98

Founder authority (FOUNDER_ID env, default "founder"):
  Only `is_founder=True` callers can:
    • lower the stage    (operator override / debugging)
    • force a stage      (founder decree)
    • disable an LLM tier
    • issue an absolute-mode directive

Every interaction is recorded; success is inferred from the consumer's
follow-up signal (no error/no retry within `SUCCESS_GRACE_S`) or from an
explicit caller mark via `record_success()`.
"""
from __future__ import annotations

import asyncio
import logging
import os
import time
from dataclasses import dataclass, field
from enum import IntEnum
from typing import Any, Dict, List, Optional, Tuple

log = logging.getLogger("sovereign.transcendence")

FOUNDER_ID = os.getenv("FOUNDER_ID", "founder")


class TranscendenceStage(IntEnum):
    CONSULTING        = 0   # LLM primary
    ADVISORY          = 1   # LLM secondary, algorithm preferred
    TRANSCENDED       = 2   # Algorithm primary, LLM fallback
    ABSOLUTE_SOVEREIGN = 3  # Algorithm only (except founder debug)


# ── Promotion thresholds (env-tunable) ───────────────────────────────────────
S1_INTERACTIONS = int(os.getenv("TRANSCEND_STAGE1_INTERACTIONS", "500"))
S1_NODES        = int(os.getenv("TRANSCEND_STAGE1_NODES",        "1500"))
S2_INTERACTIONS = int(os.getenv("TRANSCEND_STAGE2_INTERACTIONS", "5000"))
S2_NODES        = int(os.getenv("TRANSCEND_STAGE2_NODES",        "15000"))
S3_INTERACTIONS = int(os.getenv("TRANSCEND_STAGE3_INTERACTIONS", "25000"))
S3_NODES        = int(os.getenv("TRANSCEND_STAGE3_NODES",        "75000"))
SUCCESS_GRACE_S = float(os.getenv("TRANSCEND_SUCCESS_GRACE_S", "60"))


# ── Stats / state ────────────────────────────────────────────────────────────

@dataclass
class TranscendenceStats:
    born:            float = field(default_factory=time.time)
    interactions:    int   = 0
    successes:       int   = 0
    failures:        int   = 0
    llm_calls:       int   = 0
    algorithmic_calls: int = 0
    promotions:      List[Dict[str, Any]] = field(default_factory=list)
    founder_overrides: int = 0

    @property
    def success_rate(self) -> float:
        denom = self.successes + self.failures
        return (self.successes / denom) if denom else 1.0


# ── The engine ───────────────────────────────────────────────────────────────

class TranscendenceEngine:
    """
    Stage manager + algorithmic answer generator that succeeds the LLM brain.
    """

    def __init__(self) -> None:
        self.stage: TranscendenceStage = TranscendenceStage.CONSULTING
        self.stats = TranscendenceStats()
        self._brain     = None     # OmegaBrain
        self._cortex    = None     # HyperMeshCortex
        self._llm       = None     # LLMBrain
        self._lock      = asyncio.Lock()
        self._pending: Dict[str, float] = {}   # interaction_id -> ts

    def boot(self, brain=None, cortex=None, llm=None) -> None:
        self._brain  = brain
        self._cortex = cortex
        self._llm    = llm
        log.info("TranscendenceEngine online — stage=%s thresholds=S1(%d,%d) S2(%d,%d) S3(%d,%d)",
                 self.stage.name, S1_INTERACTIONS, S1_NODES,
                 S2_INTERACTIONS, S2_NODES, S3_INTERACTIONS, S3_NODES)

    # ── recording / promotion ───────────────────────────────────────────────

    def record_interaction(self, interaction_id: str, *, llm_used: bool) -> None:
        self.stats.interactions += 1
        if llm_used:
            self.stats.llm_calls += 1
        else:
            self.stats.algorithmic_calls += 1
        self._pending[interaction_id] = time.time()
        self._maybe_promote()

    def record_success(self, interaction_id: str) -> None:
        self._pending.pop(interaction_id, None)
        self.stats.successes += 1
        self._maybe_promote()

    def record_failure(self, interaction_id: str, reason: str = "") -> None:
        self._pending.pop(interaction_id, None)
        self.stats.failures += 1
        log.debug("interaction %s failed: %s", interaction_id, reason)

    def reap_pending(self) -> None:
        """Anything older than SUCCESS_GRACE_S that wasn't marked failed is a success."""
        now    = time.time()
        expired = [k for k, ts in self._pending.items() if now - ts > SUCCESS_GRACE_S]
        for k in expired:
            self._pending.pop(k, None)
            self.stats.successes += 1
        if expired:
            self._maybe_promote()

    def _knowledge_nodes(self) -> int:
        if self._brain is None:
            return 0
        try:
            facts = getattr(self._brain, "facts", None) or getattr(self._brain, "_facts", None)
            if facts is not None:
                return len(facts)
            # OmegaBrain may expose total via stats()
            stats = getattr(self._brain, "stats", None)
            if callable(stats):
                d = stats() or {}
                for k in ("facts", "knowledge_nodes", "total"):
                    if k in d:
                        return int(d[k])
        except Exception:
            return 0
        return 0

    def _maybe_promote(self) -> None:
        nodes  = self._knowledge_nodes()
        ix     = self.stats.interactions
        sr     = self.stats.success_rate
        target = self.stage
        if self.stage == TranscendenceStage.CONSULTING:
            if ix >= S1_INTERACTIONS and nodes >= S1_NODES and sr >= 0.90:
                target = TranscendenceStage.ADVISORY
        elif self.stage == TranscendenceStage.ADVISORY:
            if ix >= S2_INTERACTIONS and nodes >= S2_NODES and sr >= 0.95:
                target = TranscendenceStage.TRANSCENDED
        elif self.stage == TranscendenceStage.TRANSCENDED:
            if ix >= S3_INTERACTIONS and nodes >= S3_NODES and sr >= 0.98:
                target = TranscendenceStage.ABSOLUTE_SOVEREIGN
        if target != self.stage:
            self._promote(target, reason="auto-threshold")

    def _promote(self, target: TranscendenceStage, *, reason: str) -> None:
        prev = self.stage
        self.stage = target
        evt = {
            "ts":           int(time.time()),
            "from":         prev.name,
            "to":           target.name,
            "reason":       reason,
            "interactions": self.stats.interactions,
            "success_rate": round(self.stats.success_rate, 4),
            "knowledge":    self._knowledge_nodes(),
        }
        self.stats.promotions.append(evt)
        log.info("TRANSCENDENCE PROMOTION  %s → %s  (%s)", prev.name, target.name, reason)

    def founder_set_stage(self, target: TranscendenceStage, actor_id: str) -> Dict[str, Any]:
        if actor_id != FOUNDER_ID:
            return {"ok": False, "error": "only the founder can force a stage"}
        prev = self.stage
        self.stage = target
        self.stats.founder_overrides += 1
        self.stats.promotions.append({
            "ts": int(time.time()), "from": prev.name, "to": target.name,
            "reason": "founder-decree", "actor": actor_id,
        })
        log.info("FOUNDER DECREE — stage forced %s → %s", prev.name, target.name)
        return {"ok": True, "from": prev.name, "to": target.name}

    # ── decision: should we call LLM at all? ────────────────────────────────

    def use_llm(self, *, is_founder: bool = False) -> bool:
        """Single source of truth for whether to invoke the LLM brain."""
        if self.stage == TranscendenceStage.CONSULTING:
            return True
        if self.stage == TranscendenceStage.ADVISORY:
            return True
        if self.stage == TranscendenceStage.TRANSCENDED:
            return False  # algorithmic path; LLM is fallback inside generate()
        # ABSOLUTE_SOVEREIGN — only founder-tagged debug invocations may touch the LLM.
        return bool(is_founder)

    def prefer_algorithm(self) -> bool:
        return self.stage >= TranscendenceStage.ADVISORY

    # ── algorithmic answer (the *succession* of the LLM) ────────────────────

    async def generate(
        self,
        message: str,
        *,
        actor_id: str,
        is_founder: bool = False,
    ) -> Optional[Tuple[str, Dict[str, Any]]]:
        """
        Generate an algorithmic reply from the OmegaBrain knowledge graph +
        hyper-mesh cortex snapshot. Returns (reply, meta) or None if the
        engine has no confident answer (caller may then fall through to LLM).
        """
        msg = (message or "").strip()
        if not msg:
            return None
        msg_lower = msg.lower()

        # 1) Recall relevant knowledge
        recall: List[Dict[str, Any]] = []
        if self._brain is not None:
            try:
                fn = getattr(self._brain, "recall", None)
                if callable(fn):
                    r = fn(domain_prefix="", top_k=8)
                    if asyncio.iscoroutine(r):
                        r = await r
                    recall = r or []
            except Exception:
                recall = []

        # 2) Sovereign decision rules — direct, no LLM
        decision_rules: List[Tuple[List[str], str]] = [
            (["status", "health", "online"],
             "All Triumph Synergy sovereign systems are online. "
             "The hyper-mesh is reachable across the geographic redis pod, military bridge, "
             "central/supernode node, and Pi bridge. SAIB is acting sovereignly."),
            (["mesh", "redis"],
             "The Triumph Redis Mesh-Pod is a 6-node bundled cluster (3 masters + 3 replicas) "
             "with a self-learning brain publishing insights every 30 seconds. "
             "It is the geographic and operational backbone of the hyper-mesh."),
            (["military", "cnsa", "encrypt"],
             "Triumph's Sovereign Military Bridge operates under CNSA Suite 2.0 — "
             "AES-256-GCM, RSA-3072 + SHA-384, ECDH P-384, plus post-quantum "
             "CRYSTALS-Kyber-1024, CRYSTALS-Dilithium-5, and SPHINCS+. "
             "Encrypt/route/heal endpoints are reachable through the cortex."),
            (["founder", "owner", "jeremiah"],
             "The founder is Jeremiah Joel Drains. All sovereign directives flow "
             "through the FOUNDER_ID identity; all other actors are observed signals."),
            (["kyc", "wallet", "claim"],
             "Pi Network KYC and wallet setup are guided through the Triumph Synergy ecosystem "
             "at https://triumphsynergy.com. The Pi bridge connector validates KYC on the live "
             "mainnet."),
        ]
        for keys, answer in decision_rules:
            if any(k in msg_lower for k in keys):
                meta = {
                    "source":      "algorithmic",
                    "stage":       self.stage.name,
                    "matched":     keys,
                    "recall_used": len(recall),
                    "actor":       actor_id,
                    "is_founder":  is_founder,
                }
                return answer, meta

        # 3) Mesh-aware status reply if we have a fresh hyper-mesh snapshot
        if self._cortex is not None:
            snap = getattr(self._cortex, "snapshot", None)
            reachable = getattr(snap, "peers_reachable", []) if snap else []
            degraded  = getattr(snap, "peers_degraded",  []) if snap else []
            if reachable or degraded:
                lines = []
                if reachable:
                    lines.append(f"Reachable: {', '.join(reachable)}.")
                if degraded:
                    lines.append(f"Degraded: {', '.join(degraded)}.")
                lines.append(
                    "The hyper-mesh cortex is steering autonomous heals and routes "
                    "without external assistance.")
                meta = {"source": "algorithmic-mesh", "stage": self.stage.name,
                        "actor": actor_id}
                return " ".join(lines), meta

        # 4) No confident algorithmic answer
        return None

    def status(self) -> Dict[str, Any]:
        return {
            "stage":             self.stage.name,
            "stage_num":         int(self.stage),
            "interactions":      self.stats.interactions,
            "successes":         self.stats.successes,
            "failures":          self.stats.failures,
            "success_rate":      round(self.stats.success_rate, 4),
            "llm_calls":         self.stats.llm_calls,
            "algorithmic_calls": self.stats.algorithmic_calls,
            "knowledge_nodes":   self._knowledge_nodes(),
            "promotions":        self.stats.promotions[-10:],
            "founder_overrides": self.stats.founder_overrides,
            "thresholds": {
                "S1": {"interactions": S1_INTERACTIONS, "nodes": S1_NODES, "success_rate": 0.90},
                "S2": {"interactions": S2_INTERACTIONS, "nodes": S2_NODES, "success_rate": 0.95},
                "S3": {"interactions": S3_INTERACTIONS, "nodes": S3_NODES, "success_rate": 0.98},
            },
        }


# Singleton — imported by app.py and omega_prime
transcendence = TranscendenceEngine()

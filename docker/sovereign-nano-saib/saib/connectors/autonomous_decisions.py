"""
Autonomous Decisions Engine — SAIB v3
──────────────────────────────────────────────────────────────────────────────
The sovereign decision-making cortex. Combines all live signals from every
connector and engine to make autonomous, weighted decisions and execute them
through the appropriate action channels — with no human in the loop required.

Decision model
──────────────
• OBSERVE  — collect signals from all connected sources
• ASSESS   — score combined threat / opportunity / risk posture
• DECIDE   — select best response from policy-weighted decision tree
• EXECUTE  — dispatch action via OutboundActions + Enforcer + Guardian
• LEARN    — record outcome, update confidence weights for future cycles

Decision types
──────────────
PROTECTIVE   — block, freeze, isolate, alert
INVESTIGATIVE — deep scan, collect evidence, correlate
OPERATIONAL  — scale resources, reroute traffic, self-heal
TRANSACTIONAL — approve/cancel Pi payments, log financial events
STRATEGIC    — brainstorm goal resubmit, escalate to mesh quorum
FOUNDER      — immediate founder protection response

Confidence threshold: decisions below 0.65 are queued for human review,
above 0.65 are auto-executed. Threshold is configurable via env.
"""
from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import os
import time
import uuid
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable, Dict, List, Optional, Tuple

log = logging.getLogger("saib.connector.autonomous_decisions")

# ───────────────────────────────────── config ──
AUTO_EXECUTE_THRESHOLD = float(os.getenv("SAIB_AUTO_EXECUTE_THRESHOLD", "0.65"))
DECISION_LOOP_S        = float(os.getenv("SAIB_DECISION_LOOP_S", "10"))
MAX_DECISION_HISTORY   = int(os.getenv("SAIB_MAX_DECISION_HISTORY", "2000"))
MAX_QUEUED_FOR_REVIEW  = int(os.getenv("SAIB_MAX_REVIEW_QUEUE", "500"))


# ───────────────────────────────────── types ──

class DecisionType(str, Enum):
    PROTECTIVE     = "PROTECTIVE"
    INVESTIGATIVE  = "INVESTIGATIVE"
    OPERATIONAL    = "OPERATIONAL"
    TRANSACTIONAL  = "TRANSACTIONAL"
    STRATEGIC      = "STRATEGIC"
    FOUNDER        = "FOUNDER"


class DecisionStatus(str, Enum):
    PENDING         = "PENDING"
    AUTO_EXECUTED   = "AUTO_EXECUTED"
    QUEUED_REVIEW   = "QUEUED_REVIEW"
    APPROVED        = "APPROVED"
    REJECTED        = "REJECTED"
    EXPIRED         = "EXPIRED"
    FAILED          = "FAILED"


@dataclass
class Decision:
    decision_id:   str
    dtype:         DecisionType
    title:         str
    rationale:     str
    action:        str          # e.g. "freeze_wallet", "discord_alert", "military_bridge_cmd"
    action_params: dict
    confidence:    float        # 0–1
    urgency:       float        # 0–1
    risk:          float        # 0–1 (risk of NOT acting)
    evidence:      dict         = field(default_factory=dict)
    status:        DecisionStatus = DecisionStatus.PENDING
    ts:            float          = field(default_factory=time.time)
    executed_ts:   Optional[float] = None
    result:        Optional[dict]  = None
    auto_score:    float           = 0.0


@dataclass
class DecisionOutcome:
    decision_id:  str
    success:      bool
    latency_ms:   float
    detail:       dict = field(default_factory=dict)


# ───────────────────────────────────── decision scoring ──

def _score(confidence: float, urgency: float, risk: float) -> float:
    """Composite auto-execute score."""
    return round(
        confidence * 0.50 +
        urgency    * 0.30 +
        risk       * 0.20,
        4,
    )


# ───────────────────────────────────── engine ──

class AutonomousDecisionsEngine:
    """
    The sovereign decision cortex. Wired to all connectors and engines.
    Call `.start()` in lifespan to activate the continuous decision loop.
    """

    def __init__(self) -> None:
        self._history:      List[Decision] = []
        self._review_queue: List[Decision] = []
        self._on_decision:  List[Callable[[Decision], None]] = []

        # Injected engine references — set via .inject()
        self._guardian    = None
        self._enforcer    = None
        self._brainstorm  = None
        self._intel       = None
        self._warp        = None
        self._mesh        = None
        self._founder     = None
        self._actions     = None
        self._pi          = None
        self._db          = None
        self._knowledge   = None

        self._running  = False
        self._cycles   = 0
        self._executed = 0
        self._queued   = 0
        self._failed   = 0

        # Outcome learning: track action→success rate
        self._outcome_weights: Dict[str, float] = {}

    # ── injection ─────────────────────────────────────────────────────────

    def inject(self, **kwargs: Any) -> None:
        for k, v in kwargs.items():
            setattr(self, f"_{k}", v)
        log.info("AutonomousDecisions: injected %s", list(kwargs.keys()))

    # ── lifecycle ─────────────────────────────────────────────────────────

    def start(self) -> None:
        if self._running:
            return
        self._running = True
        asyncio.create_task(self._decision_loop())
        log.info("Autonomous Decisions Engine started — threshold=%.2f  loop=%.0fs",
                 AUTO_EXECUTE_THRESHOLD, DECISION_LOOP_S)

    def stop(self) -> None:
        self._running = False

    # ── public API ────────────────────────────────────────────────────────

    def on_decision(self, cb: Callable[[Decision], None]) -> None:
        self._on_decision.append(cb)

    def approve(self, decision_id: str) -> bool:
        for d in self._review_queue:
            if d.decision_id == decision_id:
                d.status = DecisionStatus.APPROVED
                asyncio.create_task(self._execute(d))
                self._review_queue.remove(d)
                return True
        return False

    def reject(self, decision_id: str, reason: str = "") -> bool:
        for d in self._review_queue:
            if d.decision_id == decision_id:
                d.status = DecisionStatus.REJECTED
                d.result = {"reason": reason}
                self._review_queue.remove(d)
                return True
        return False

    def pending_review(self) -> List[dict]:
        return [
            {
                "decision_id": d.decision_id,
                "type":        d.dtype.value,
                "title":       d.title,
                "rationale":   d.rationale,
                "action":      d.action,
                "confidence":  d.confidence,
                "urgency":     d.urgency,
                "auto_score":  d.auto_score,
                "ts":          d.ts,
            }
            for d in self._review_queue
        ]

    def history(self, n: int = 50) -> List[dict]:
        return [
            {
                "decision_id": d.decision_id,
                "type":        d.dtype.value,
                "title":       d.title,
                "action":      d.action,
                "status":      d.status.value,
                "confidence":  d.confidence,
                "auto_score":  d.auto_score,
                "ts":          d.ts,
                "executed_ts": d.executed_ts,
            }
            for d in self._history[-n:]
        ]

    def stats(self) -> dict:
        return {
            "cycles":         self._cycles,
            "executed":       self._executed,
            "queued_review":  self._queued,
            "failed":         self._failed,
            "pending_review": len(self._review_queue),
            "history_size":   len(self._history),
            "auto_threshold": AUTO_EXECUTE_THRESHOLD,
            "outcome_weights": dict(list(self._outcome_weights.items())[:20]),
        }

    # ── main decision loop ────────────────────────────────────────────────

    async def _decision_loop(self) -> None:
        await asyncio.sleep(8)   # wait for connectors to start
        while self._running:
            try:
                decisions = await self._observe_and_decide()
                for d in decisions:
                    await self._route(d)
                self._cycles += 1
            except Exception as exc:
                log.warning("Decision loop error: %s", exc)
            await asyncio.sleep(DECISION_LOOP_S)

    async def _observe_and_decide(self) -> List[Decision]:
        """
        Gather all live signals and synthesize candidate decisions.
        Returns only NEW decisions not already in history.
        """
        decisions: List[Decision] = []

        # ── Founder watch events ──────────────────────────────────────────
        if self._founder:
            for event in self._founder.active_events():
                did = f"fw_{event.event_id}"
                if self._already_decided(did):
                    continue
                from .founder_watch import FounderAlertLevel
                urgency    = min(1.0, event.level / 5.0)
                confidence = 0.90
                action = self._map_founder_action(event.level)
                d = Decision(
                    decision_id   = did,
                    dtype         = DecisionType.FOUNDER,
                    title         = f"Founder Protection: {event.title}",
                    rationale     = event.description,
                    action        = action,
                    action_params = {
                        "entity_id": "founder",
                        "level":     event.level.name,
                        "evidence":  event.evidence,
                        "title":     event.title,
                        "message":   event.description,
                    },
                    confidence    = confidence,
                    urgency       = urgency,
                    risk          = urgency,
                    evidence      = event.evidence,
                )
                d.auto_score = _score(d.confidence, d.urgency, d.risk)
                decisions.append(d)

        # ── Guardian alerts ───────────────────────────────────────────────
        if self._guardian:
            summary = self._guardian.summary()
            for alert in summary.get("active_alerts", [])[:10]:
                did = f"grd_{alert.get('alert_id','')}"
                if self._already_decided(did):
                    continue
                sev = float(alert.get("score", 0))
                tier = str(alert.get("tier", ""))
                confidence = min(1.0, sev * 1.2)
                urgency    = sev
                d = Decision(
                    decision_id   = did,
                    dtype         = DecisionType.PROTECTIVE,
                    title         = f"Guardian Auto-Response: {tier}",
                    rationale     = f"Guardian alert {alert.get('alert_id')} score={sev:.3f}",
                    action        = "broadcast_alert",
                    action_params = {"title": tier, "message": f"Guardian alert — score {sev:.3f}", "detail": alert},
                    confidence    = confidence,
                    urgency       = urgency,
                    risk          = sev,
                    evidence      = alert,
                )
                d.auto_score = _score(d.confidence, d.urgency, d.risk)
                decisions.append(d)

        # ── Intel top threats ─────────────────────────────────────────────
        if self._intel:
            threats = self._intel.top_threats(5)
            for entity in threats:
                eid = entity.get("entity_id", "")
                cls = entity.get("classification", "")
                did = f"intel_{eid}"
                if self._already_decided(did) or cls not in ("HOSTILE", "CRITICAL", "EXISTENTIAL"):
                    continue
                score = float(entity.get("fused_score", 0))
                d = Decision(
                    decision_id   = did,
                    dtype         = DecisionType.PROTECTIVE,
                    title         = f"Intel Hostile Entity: {eid[:20]}",
                    rationale     = f"Intelligence classification={cls}  fused_score={score:.3f}",
                    action        = "enforce_entity",
                    action_params = {
                        "entity_id": eid,
                        "action":    "block" if cls == "HOSTILE" else "freeze_wallet",
                        "reason":    f"Intel classification: {cls}",
                    },
                    confidence    = min(1.0, score * 1.1),
                    urgency       = score,
                    risk          = score,
                    evidence      = entity,
                )
                d.auto_score = _score(d.confidence, d.urgency, d.risk)
                decisions.append(d)

        # ── Knowledge feed — critical threats ─────────────────────────────
        if self._knowledge:
            top_threats = self._knowledge.top_threats(5)
            for fact in top_threats:
                did = f"kf_{fact.fact_id}"
                if self._already_decided(did):
                    continue
                d = Decision(
                    decision_id   = did,
                    dtype         = DecisionType.INVESTIGATIVE,
                    title         = f"Knowledge: {fact.title[:60]}",
                    rationale     = f"Source: {fact.source}  severity={fact.severity:.2f}",
                    action        = "discord_alert",
                    action_params = {
                        "title":   f"Threat Intel: {fact.title[:80]}",
                        "message": fact.description[:300],
                        "level":   "ALERT",
                    },
                    confidence    = fact.confidence,
                    urgency       = fact.severity,
                    risk          = fact.severity * 0.8,
                    evidence      = {"fact_id": fact.fact_id, "tags": fact.tags},
                )
                d.auto_score = _score(d.confidence, d.urgency, d.risk)
                decisions.append(d)

        # ── Pi large transaction watch ────────────────────────────────────
        if self._pi:
            pi_stats = self._pi.stats()
            for addr, ws in pi_stats.get("wallet_states", {}).items():
                vel = float(ws.get("velocity", 0))
                if vel >= 5:
                    did = f"pi_vel_{addr[:12]}"
                    if self._already_decided(did):
                        continue
                    d = Decision(
                        decision_id   = did,
                        dtype         = DecisionType.TRANSACTIONAL,
                        title         = f"Pi Wallet High Velocity: {addr[:12]}…",
                        rationale     = f"Velocity={vel:.0f} tx/window on wallet {addr[:12]}",
                        action        = "discord_alert",
                        action_params = {
                            "title":   "Pi Wallet Velocity Alert",
                            "message": f"Wallet {addr[:16]}…  {vel:.0f} outbound tx in 5min",
                            "level":   "ALERT",
                        },
                        confidence    = 0.85,
                        urgency       = min(1.0, vel / 10.0),
                        risk          = 0.7,
                        evidence      = {"wallet": addr, "velocity": vel},
                    )
                    d.auto_score = _score(d.confidence, d.urgency, d.risk)
                    decisions.append(d)

        # ── DB anomalies ──────────────────────────────────────────────────
        if self._db:
            db_stats = self._db.stats()
            # already handled via callbacks in founder_watch / guardian

        return decisions

    # ── routing + execution ───────────────────────────────────────────────

    async def _route(self, decision: Decision) -> None:
        self._history.append(decision)
        if len(self._history) > MAX_DECISION_HISTORY:
            self._history = self._history[-MAX_DECISION_HISTORY:]

        for cb in self._on_decision:
            try:
                cb(decision)
            except Exception:
                pass

        if decision.auto_score >= AUTO_EXECUTE_THRESHOLD:
            await self._execute(decision)
        else:
            decision.status = DecisionStatus.QUEUED_REVIEW
            self._review_queue.append(decision)
            if len(self._review_queue) > MAX_QUEUED_FOR_REVIEW:
                self._review_queue.pop(0)
            self._queued += 1
            log.info("Decision queued for review [%s]: %s (score=%.3f < %.2f)",
                     decision.decision_id, decision.title[:60],
                     decision.auto_score, AUTO_EXECUTE_THRESHOLD)

    async def _execute(self, decision: Decision) -> None:
        t0 = time.time()
        decision.status      = DecisionStatus.AUTO_EXECUTED
        decision.executed_ts = t0
        success = True
        result: dict = {}

        try:
            result = await self._dispatch_action(decision.action, decision.action_params)
        except Exception as exc:
            success = False
            result  = {"error": str(exc)}
            decision.status = DecisionStatus.FAILED
            self._failed += 1
            log.warning("Decision FAILED [%s] %s: %s",
                        decision.decision_id, decision.action, exc)
        else:
            self._executed += 1
            log.info("Decision EXECUTED [%s] %s -> %s (score=%.3f, %.0fms)",
                     decision.decision_id, decision.action,
                     decision.dtype.value,
                     decision.auto_score,
                     (time.time() - t0) * 1000)

        decision.result = result
        self._learn(decision.action, success)

    async def _dispatch_action(self, action: str, params: dict) -> dict:
        """Route to the correct connector/engine method."""
        if not self._actions:
            return {"skipped": "OutboundActions not injected"}

        if action == "broadcast_alert":
            results = await self._actions.broadcast_critical_alert(
                title=params.get("title", "SAIB Alert"),
                message=params.get("message", ""),
                detail=params.get("detail", {}),
            )
            return {"results": [r.__dict__ for r in results]}

        elif action == "discord_alert":
            r = await self._actions.discord_alert(
                title=params.get("title", ""),
                message=params.get("message", ""),
                level=params.get("level", "ALERT"),
            )
            return r.__dict__

        elif action == "enforce_entity":
            r = await self._actions.enforce_entity(
                entity_id=params.get("entity_id", ""),
                action=params.get("action", "block"),
                reason=params.get("reason", ""),
            )
            return r.__dict__

        elif action == "military_bridge_cmd":
            r = await self._actions.military_bridge_cmd(
                endpoint=params.get("endpoint", "/sovereign/command"),
                payload=params.get("payload", {}),
            )
            return r.__dict__

        elif action == "triumph_action":
            r = await self._actions.triumph_action(
                action=params.get("triumph_action", "flag_for_review"),
                params=params,
            )
            return r.__dict__

        elif action == "email_dispatch":
            r = await self._actions.email_dispatch(
                subject=params.get("subject", "SAIB Alert"),
                body=params.get("body", ""),
            )
            return r.__dict__

        else:
            log.warning("Unknown action: %s — broadcasting as alert", action)
            r = await self._actions.discord_alert(
                title=f"Unhandled action: {action}",
                message=str(params)[:200],
                level="ALERT",
            )
            return r.__dict__

    # ── learning ──────────────────────────────────────────────────────────

    def _learn(self, action: str, success: bool) -> None:
        current = self._outcome_weights.get(action, 0.75)
        # exponential moving average
        updated = current * 0.95 + (1.0 if success else 0.0) * 0.05
        self._outcome_weights[action] = round(updated, 4)

    # ── helpers ───────────────────────────────────────────────────────────

    def _already_decided(self, decision_id: str) -> bool:
        cutoff = time.time() - 300.0   # 5 min dedup window
        for d in reversed(self._history[-200:]):
            if d.decision_id == decision_id and d.ts >= cutoff:
                return True
        return False

    @staticmethod
    def _map_founder_action(level: Any) -> str:
        from .founder_watch import FounderAlertLevel
        return {
            FounderAlertLevel.WATCH:     "discord_alert",
            FounderAlertLevel.CONCERN:   "discord_alert",
            FounderAlertLevel.PROTECT:   "broadcast_alert",
            FounderAlertLevel.LOCKDOWN:  "broadcast_alert",
            FounderAlertLevel.EMERGENCY: "broadcast_alert",
        }.get(level, "broadcast_alert")


# ── singleton ─────────────────────────────────────────────────────────────────
autonomous = AutonomousDecisionsEngine()

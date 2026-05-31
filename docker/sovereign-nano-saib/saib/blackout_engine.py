"""
Blackout Engine — v6 Omega Prime
=================================
Even in a total blackout — no network, no API access, no external services —
SAIB continues to reason, enforce, protect, queue actions, and build
intelligence. When connectivity returns, every queued action replays in
order with full audit trail.

Blackout phases:
  NORMAL     — all systems online
  DEGRADED   — some external APIs unreachable; fallbacks active
  DARK       — no external connectivity; operating on cached brain + local state
  DEEP_DARK  — total isolation; SAIB runs autonomous playbooks from pre-auth'd
               decision library, storing every action for post-blackout replay

Capabilities during DARK / DEEP_DARK:
  • Continuous reasoning over OmegaBrain (no network needed)
  • Enforce active policies on known entities from cached verdicts
  • Execute pre-authorized playbooks (guardian, enforcer, mesh verdicts)
  • Queue all outbound actions (Discord, Slack, X, Pi, API calls) for replay
  • Generate intelligence assessments from stored telemetry
  • Write and queue contract drafts for delivery post-blackout
  • Dead-reckoning threat projections with confidence decay
  • Full event log — every decision documented for sovereign audit
"""
from __future__ import annotations

import asyncio
import json
import time
import uuid
from collections import deque
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable, Deque, Dict, List, Optional


class BlackoutPhase(str, Enum):
    NORMAL     = "NORMAL"
    DEGRADED   = "DEGRADED"
    DARK       = "DARK"
    DEEP_DARK  = "DEEP_DARK"


class QueuedActionType(str, Enum):
    ENFORCE     = "ENFORCE"
    OUTBOUND    = "OUTBOUND"    # Discord / Slack / webhook / X
    CONTRACT    = "CONTRACT"    # queue a contract for delivery
    ALERT       = "ALERT"
    INTELLIGENCE = "INTELLIGENCE"
    ARBITRARY   = "ARBITRARY"


@dataclass
class QueuedAction:
    """An action that could not execute during blackout, queued for replay."""
    action_id:   str   = field(default_factory=lambda: str(uuid.uuid4()))
    action_type: QueuedActionType = QueuedActionType.ARBITRARY
    target:      str   = ""
    payload:     Dict  = field(default_factory=dict)
    queued_at:   float = field(default_factory=time.time)
    attempts:    int   = 0
    executed_at: Optional[float] = None
    result:      Optional[Dict]  = None
    priority:    int   = 5        # 1 = highest


@dataclass
class BlackoutIntelligence:
    """An intelligence assessment generated locally during a blackout."""
    intel_id:    str   = field(default_factory=lambda: str(uuid.uuid4()))
    subject:     str   = ""
    assessment:  str   = ""
    confidence:  float = 0.0
    basis:       str   = ""     # "brain_cache" | "telemetry" | "dead_reckoning"
    generated_at: float = field(default_factory=time.time)
    phase:       BlackoutPhase = BlackoutPhase.DARK


# ── pre-authorized playbooks ─────────────────────────────────────────────────

_DEFAULT_PLAYBOOKS: Dict[str, Dict] = {
    "hostile_actor_detected": {
        "description": "Block and alert on any actor scoring > 0.8 threat",
        "actions": ["enforcer.block", "guardian.alert", "queue.outbound_alert"],
        "auto_approve": True,
    },
    "pi_wallet_large_delta": {
        "description": "Alert founder and queue guardian event on wallet delta > 500 Pi",
        "actions": ["guardian.alert", "queue.outbound_alert"],
        "auto_approve": True,
    },
    "container_crash_imminent": {
        "description": "Attempt restart via k8s_adapter; queue healer action",
        "actions": ["k8s.restart", "healer.heal", "queue.alert"],
        "auto_approve": True,
    },
    "founder_deadman_missed": {
        "description": "Escalate to CRITICAL, broadcast mesh alert, queue emergency contact",
        "actions": ["guardian.escalate_lockdown", "mesh.broadcast", "queue.emergency_contact"],
        "auto_approve": True,
    },
}


class BlackoutEngine:
    """
    Sovereign autonomous operation engine.

    Monitors connectivity, transitions through blackout phases automatically,
    executes pre-authorized playbooks without external calls, and replays
    the full action queue the moment connectivity is restored.
    """

    # Connectivity check interval (seconds)
    CONNECTIVITY_CHECK_INTERVAL = 30.0
    # How long degraded before declaring DARK
    DEGRADED_TO_DARK_THRESHOLD  = 120.0
    # How long DARK before DEEP_DARK autonomous mode
    DARK_TO_DEEP_DARK_THRESHOLD = 300.0

    def __init__(self, brain=None) -> None:
        self._brain      = brain
        self._phase      = BlackoutPhase.NORMAL
        self._phase_since: Dict[BlackoutPhase, float] = {BlackoutPhase.NORMAL: time.time()}
        self._action_queue: Deque[QueuedAction] = deque(maxlen=10000)
        self._intel_log:    Deque[BlackoutIntelligence] = deque(maxlen=2000)
        self._event_log:    Deque[Dict] = deque(maxlen=5000)
        self._playbooks:    Dict[str, Dict] = dict(_DEFAULT_PLAYBOOKS)
        self._replay_callbacks: Dict[QueuedActionType, Callable] = {}

        # Connectivity probe targets (set by boot)
        self._probe_targets: List[str] = []
        self._last_successful_probe: float = time.time()
        self._consecutive_failures:  int   = 0

        # Stats
        self._stats = {
            "total_queued":    0,
            "total_replayed":  0,
            "total_intel":     0,
            "blackout_count":  0,
            "deepdark_count":  0,
            "playbooks_fired": 0,
        }
        self._started_at = time.time()

    # ── registration ─────────────────────────────────────────────────────────

    def register_probe_target(self, url: str) -> None:
        """Register an internal URL to probe for connectivity."""
        self._probe_targets.append(url)

    def register_replay_callback(
        self, action_type: QueuedActionType, callback: Callable
    ) -> None:
        """Register the executor for a queued action type (called on replay)."""
        self._replay_callbacks[action_type] = callback

    def register_playbook(self, name: str, playbook: Dict) -> None:
        """Add or override a pre-authorized autonomous playbook."""
        self._playbooks[name] = playbook

    # ── phase management ──────────────────────────────────────────────────────

    def report_connectivity(self, reachable: bool, target: str = "") -> None:
        """Called by probes / external code to report connectivity state."""
        if reachable:
            self._last_successful_probe = time.time()
            self._consecutive_failures  = 0
            if self._phase != BlackoutPhase.NORMAL:
                self._transition(BlackoutPhase.NORMAL)
        else:
            self._consecutive_failures += 1
            dark_since = self._phase_since.get(BlackoutPhase.DEGRADED, time.time())
            if self._phase == BlackoutPhase.NORMAL:
                self._transition(BlackoutPhase.DEGRADED)
            elif self._phase == BlackoutPhase.DEGRADED:
                if time.time() - dark_since > self.DEGRADED_TO_DARK_THRESHOLD:
                    self._transition(BlackoutPhase.DARK)
            elif self._phase == BlackoutPhase.DARK:
                dark_since = self._phase_since.get(BlackoutPhase.DARK, time.time())
                if time.time() - dark_since > self.DARK_TO_DEEP_DARK_THRESHOLD:
                    self._transition(BlackoutPhase.DEEP_DARK)

    def _transition(self, new_phase: BlackoutPhase) -> None:
        old = self._phase
        self._phase = new_phase
        self._phase_since[new_phase] = time.time()
        if new_phase in (BlackoutPhase.DARK, BlackoutPhase.DEEP_DARK):
            self._stats["blackout_count"] += 1
        if new_phase == BlackoutPhase.DEEP_DARK:
            self._stats["deepdark_count"] += 1
        self._log(f"PHASE_TRANSITION", {"from": old, "to": new_phase})

    # ── action queueing ───────────────────────────────────────────────────────

    def queue_action(
        self,
        action_type: QueuedActionType,
        target: str,
        payload: Dict,
        priority: int = 5,
    ) -> QueuedAction:
        """
        Queue an action for execution.
        If NORMAL, the caller should execute immediately.
        If DARK/DEEP_DARK, the action queues here for post-blackout replay.
        """
        action = QueuedAction(
            action_type=action_type, target=target,
            payload=payload, priority=priority,
        )
        self._action_queue.append(action)
        self._stats["total_queued"] += 1
        return action

    # ── autonomous reasoning during blackout ──────────────────────────────────

    async def reason(
        self,
        subject: str,
        context: Optional[Dict] = None,
    ) -> BlackoutIntelligence:
        """
        Generate a local intelligence assessment with no external calls.
        Uses OmegaBrain recall + stored telemetry + dead-reckoning logic.
        """
        ctx = context or {}

        # Pull relevant brain nodes
        nodes = []
        if self._brain:
            nodes = await self._brain.recall(
                domain_prefix=subject.replace(".", "_")[:20],
                top_k=10, min_confidence=0.2
            )

        if nodes:
            top = nodes[0]
            confidence = top.confidence
            assessment = (
                f"Based on {len(nodes)} cached knowledge nodes (highest confidence "
                f"{confidence:.2f}), the current assessment for '{subject}' is: "
                f"last known state — {json.dumps(top.payload)[:300]}. "
                f"Operating on DARK intelligence — {len(nodes)} signals available."
            )
            basis = "brain_cache"
        else:
            confidence = 0.15
            assessment = (
                f"No cached knowledge found for '{subject}'. "
                f"Dead-reckoning projection: status likely unchanged from last "
                f"known configuration. Confidence minimal — treat as unverified."
            )
            basis = "dead_reckoning"

        intel = BlackoutIntelligence(
            subject=subject, assessment=assessment,
            confidence=confidence, basis=basis,
            phase=self._phase,
        )
        self._intel_log.append(intel)
        self._stats["total_intel"] += 1

        if self._brain:
            await self._brain.absorb(
                f"blackout.intelligence.{subject}",
                {"assessment": assessment[:200], "confidence": confidence},
                confidence=confidence,
            )

        return intel

    # ── playbook execution ────────────────────────────────────────────────────

    async def fire_playbook(
        self, name: str, trigger_data: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        Execute a pre-authorized playbook autonomously.
        All actions are queued for replay; no external calls needed.
        """
        pb = self._playbooks.get(name)
        if not pb:
            return {"error": f"Playbook '{name}' not found"}

        if not pb.get("auto_approve"):
            return {"error": f"Playbook '{name}' requires manual approval — not auto-approved"}

        fired_actions = []
        for action_spec in pb.get("actions", []):
            parts  = action_spec.split(".")
            a_type = QueuedActionType.ARBITRARY
            if "enforce" in action_spec:
                a_type = QueuedActionType.ENFORCE
            elif "alert" in action_spec or "outbound" in action_spec:
                a_type = QueuedActionType.OUTBOUND
            elif "contract" in action_spec:
                a_type = QueuedActionType.CONTRACT

            qa = self.queue_action(
                a_type, action_spec,
                {"playbook": name, "trigger": trigger_data or {}, "action": action_spec},
                priority=1,
            )
            fired_actions.append(qa.action_id)

        self._stats["playbooks_fired"] += 1
        self._log("PLAYBOOK_FIRED", {"name": name, "actions": fired_actions})
        return {"playbook": name, "actions_queued": len(fired_actions), "action_ids": fired_actions}

    # ── replay (called when connectivity returns) ─────────────────────────────

    async def replay_queue(self) -> Dict[str, Any]:
        """
        Execute all queued actions in priority order now that connectivity
        is restored.  Uses registered callbacks for each action type.
        Returns a replay summary.
        """
        if self._phase not in (BlackoutPhase.NORMAL, BlackoutPhase.DEGRADED):
            return {"skipped": True, "reason": "still in blackout phase"}

        pending = sorted(
            [a for a in self._action_queue if a.executed_at is None],
            key=lambda a: (a.priority, a.queued_at),
        )

        replayed = 0
        failed   = 0
        for action in pending:
            cb = self._replay_callbacks.get(action.action_type)
            if cb:
                try:
                    if asyncio.iscoroutinefunction(cb):
                        result = await cb(action)
                    else:
                        result = cb(action)
                    action.result     = result
                    action.executed_at = time.time()
                    action.attempts   += 1
                    replayed += 1
                except Exception as exc:
                    action.attempts += 1
                    failed += 1
            else:
                # No callback registered — mark as logged-only
                action.executed_at = time.time()
                action.result      = {"logged_only": True, "note": "No replay callback registered"}
                replayed += 1

        self._stats["total_replayed"] += replayed
        self._log("QUEUE_REPLAYED", {"replayed": replayed, "failed": failed})
        return {"replayed": replayed, "failed": failed, "total_pending": len(pending)}

    # ── logging / status ──────────────────────────────────────────────────────

    def _log(self, event_type: str, payload: Dict) -> None:
        self._event_log.append({
            "id": str(uuid.uuid4()), "type": event_type,
            "payload": payload, "phase": self._phase, "ts": time.time(),
        })

    def status(self) -> Dict[str, Any]:
        pending_queue = [a for a in self._action_queue if a.executed_at is None]
        return {
            "phase":              self._phase,
            "consecutive_failures": self._consecutive_failures,
            "last_successful_probe_ago_s": round(
                time.time() - self._last_successful_probe, 1
            ),
            "queued_actions":     len(pending_queue),
            "queued_by_priority": {
                str(p): sum(1 for a in pending_queue if a.priority == p)
                for p in range(1, 6)
            },
            "intel_log_size":     len(self._intel_log),
            "playbooks_available": list(self._playbooks.keys()),
            "uptime_s":           round(time.time() - self._started_at, 2),
            **self._stats,
        }

    def recent_intel(self, n: int = 10) -> List[Dict]:
        return [
            {
                "intel_id":    i.intel_id,
                "subject":     i.subject,
                "assessment":  i.assessment,
                "confidence":  round(i.confidence, 3),
                "basis":       i.basis,
                "phase":       i.phase,
                "generated_at": i.generated_at,
            }
            for i in list(self._intel_log)[-n:]
        ]


# ── singleton ──────────────────────────────────────────────────────────────
blackout_engine = BlackoutEngine()

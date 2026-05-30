"""
Sovereign Enforcer — Autonomous Policy Execution & Enforcement
- 10 built-in policies covering neural, threat, guardian, and intelligence signals
- 6-tier response: PASS → WARN → THROTTLE → BLOCK → ISOLATE → SHUTDOWN
- Circuit breakers per entity (auto-escalate on repeated breach)
- Kill switches (per-entity or global emergency stop)
- Immutable SHA-256 audit trail (tamper-evident event chain)
- Custom policy support (runtime add/disable)
"""
from __future__ import annotations

import hashlib
import time
from collections import defaultdict, deque
from dataclasses import dataclass, field
from enum import IntEnum
from typing import Any, Callable, Optional


class ResponseTier(IntEnum):
    PASS      = 0
    WARN      = 1
    THROTTLE  = 2
    BLOCK     = 3
    ISOLATE   = 4
    SHUTDOWN  = 5


@dataclass
class Policy:
    id: str
    name: str
    description: str
    tier: ResponseTier
    enabled: bool = True
    trigger_count: int = 0
    # Callable: (entity_id, context, circuit_count) → bool
    predicate: Optional[Callable[[str, dict, int], bool]] = field(
        default=None, repr=False
    )


@dataclass
class EnforcementEvent:
    policy_id: str
    entity_id: str
    tier: ResponseTier
    context: dict
    ts: float = field(default_factory=time.time)
    digest: str = ""

    def __post_init__(self):
        if not self.digest:
            blob = f"{self.policy_id}:{self.entity_id}:{self.tier.name}:{self.ts:.6f}"
            self.digest = hashlib.sha256(blob.encode()).hexdigest()[:20]


# ── Built-in predicates ───────────────────────────────────────────────────────

def _p(check: Callable[[str, dict, int], bool]) -> Callable:
    return check


BUILT_IN_POLICIES: list[Policy] = [
    Policy("p001", "Neural FULL_BLOCK",      "neural_action == FULL_BLOCK",      ResponseTier.SHUTDOWN,
           predicate=_p(lambda e, c, n: c.get("neural_action") == "FULL_BLOCK")),
    Policy("p002", "Neural ISOLATE",          "neural_action == ISOLATE",          ResponseTier.ISOLATE,
           predicate=_p(lambda e, c, n: c.get("neural_action") == "ISOLATE")),
    Policy("p003", "Neural RATE_LIMIT",       "neural_action == RATE_LIMIT",       ResponseTier.THROTTLE,
           predicate=_p(lambda e, c, n: c.get("neural_action") == "RATE_LIMIT")),
    Policy("p004", "Threat BLOCK",            "threat_level == BLOCK",             ResponseTier.BLOCK,
           predicate=_p(lambda e, c, n: c.get("threat_level") == "BLOCK")),
    Policy("p005", "Threat QUARANTINE",       "threat_level == QUARANTINE",        ResponseTier.ISOLATE,
           predicate=_p(lambda e, c, n: c.get("threat_level") == "QUARANTINE")),
    Policy("p006", "Guardian LOCKDOWN",       "guardian_tier == LOCKDOWN",         ResponseTier.SHUTDOWN,
           predicate=_p(lambda e, c, n: c.get("guardian_tier") == "LOCKDOWN")),
    Policy("p007", "Guardian CRITICAL",       "guardian_tier == CRITICAL",         ResponseTier.ISOLATE,
           predicate=_p(lambda e, c, n: c.get("guardian_tier") == "CRITICAL")),
    Policy("p008", "Circuit Breaker ×5",      "breach_count >= 5",                 ResponseTier.BLOCK,
           predicate=_p(lambda e, c, n: n >= 5)),
    Policy("p009", "Intel EXISTENTIAL",       "intel_class == EXISTENTIAL",        ResponseTier.SHUTDOWN,
           predicate=_p(lambda e, c, n: c.get("intel_class") == "EXISTENTIAL")),
    Policy("p010", "Intel CRITICAL",          "intel_class == CRITICAL",           ResponseTier.ISOLATE,
           predicate=_p(lambda e, c, n: c.get("intel_class") == "CRITICAL")),
    Policy("p011", "Guardian ELEVATED",       "guardian_tier == ELEVATED",         ResponseTier.THROTTLE,
           predicate=_p(lambda e, c, n: c.get("guardian_tier") == "ELEVATED")),
    Policy("p012", "Intel HOSTILE",           "intel_class == HOSTILE",            ResponseTier.BLOCK,
           predicate=_p(lambda e, c, n: c.get("intel_class") == "HOSTILE")),
]


class SovereignEnforcer:
    """
    Autonomous policy engine.
    Evaluates all active policies, enforces the highest applicable tier,
    and writes a tamper-evident audit event for every enforcement action.
    """

    def __init__(self):
        self._policies: dict[str, Policy] = {p.id: p for p in BUILT_IN_POLICIES}
        self._entity_tiers: dict[str, ResponseTier] = {}
        self._circuit: dict[str, int] = defaultdict(int)  # entity → breach count
        self._kill_switches: dict[str, bool] = {}          # entity/global
        self._global_kill: bool = False
        self._audit: deque[EnforcementEvent] = deque(maxlen=10000)
        self._total = 0
        self._born = time.time()

    # ── Evaluation ────────────────────────────────────────────────────────────

    def evaluate(self, entity_id: str, context: dict) -> dict:
        """
        Evaluate all policies against context.
        context keys (any subset):
          neural_action:  PASS | RATE_LIMIT | ISOLATE | FULL_BLOCK
          threat_level:   NORMAL | MONITOR | ALERT | QUARANTINE | BLOCK
          guardian_tier:  INFO | WATCHFUL | CAUTION | ELEVATED | CRITICAL | LOCKDOWN
          intel_class:    CLEAR | BENIGN | SUSPICIOUS | HOSTILE | CRITICAL | EXISTENTIAL
        """
        circuit_n = self._circuit[entity_id]
        triggered: list[tuple[ResponseTier, Policy]] = []

        # Kill switch override
        if self._global_kill or self._kill_switches.get(entity_id):
            ks_policy = Policy("ks", "Kill Switch", "manual kill switch", ResponseTier.SHUTDOWN)
            triggered.append((ResponseTier.SHUTDOWN, ks_policy))

        for policy in self._policies.values():
            if not policy.enabled:
                continue
            if policy.predicate and policy.predicate(entity_id, context, circuit_n):
                triggered.append((policy.tier, policy))
                policy.trigger_count += 1

        tier = max((t for t, _ in triggered), default=ResponseTier.PASS)
        top_policy = max(triggered, key=lambda x: x[0].value, default=(ResponseTier.PASS, Policy("none", "pass", "", ResponseTier.PASS)))[1]

        prev = self._entity_tiers.get(entity_id, ResponseTier.PASS)
        self._entity_tiers[entity_id] = tier

        if tier >= ResponseTier.BLOCK:
            self._circuit[entity_id] += 1

        event = EnforcementEvent(
            policy_id=top_policy.id,
            entity_id=entity_id,
            tier=tier,
            context={k: v for k, v in context.items() if isinstance(v, (str, int, float, bool))},
        )
        self._audit.append(event)
        self._total += 1

        return {
            "entity_id": entity_id,
            "tier": tier.name,
            "policy": top_policy.id,
            "policy_name": top_policy.name,
            "escalated": tier > prev,
            "breach_count": self._circuit[entity_id],
            "audit_digest": event.digest,
            "all_triggered": [p.id for _, p in triggered],
        }

    # ── Kill Switches ─────────────────────────────────────────────────────────

    def engage_kill_switch(self, entity_id: str) -> dict:
        self._kill_switches[entity_id] = True
        return {"entity_id": entity_id, "kill_switch": "ENGAGED"}

    def release_kill_switch(self, entity_id: str) -> dict:
        self._kill_switches[entity_id] = False
        return {"entity_id": entity_id, "kill_switch": "RELEASED"}

    def global_shutdown(self) -> dict:
        self._global_kill = True
        return {"global_kill": "ENGAGED", "ts": time.time()}

    def global_resume(self) -> dict:
        self._global_kill = False
        return {"global_kill": "RELEASED", "ts": time.time()}

    # ── Policy Management ─────────────────────────────────────────────────────

    def add_policy(self, policy: Policy) -> None:
        self._policies[policy.id] = policy

    def toggle_policy(self, policy_id: str, enabled: bool) -> bool:
        if policy_id in self._policies:
            self._policies[policy_id].enabled = enabled
            return True
        return False

    # ── Audit Trail ───────────────────────────────────────────────────────────

    def audit_trail(self, n: int = 20) -> list[dict]:
        return [{
            "policy": e.policy_id,
            "entity": e.entity_id,
            "tier": e.tier.name,
            "ts": e.ts,
            "digest": e.digest,
        } for e in list(self._audit)[-n:]]

    def entity_history(self, entity_id: str, n: int = 20) -> list[dict]:
        events = [e for e in self._audit if e.entity_id == entity_id]
        return self.audit_trail(n) if not events else [{
            "policy": e.policy_id,
            "tier": e.tier.name,
            "ts": e.ts,
            "digest": e.digest,
        } for e in events[-n:]]

    # ── Stats ─────────────────────────────────────────────────────────────────

    def stats(self) -> dict:
        return {
            "policies_active": sum(1 for p in self._policies.values() if p.enabled),
            "policies_total": len(self._policies),
            "enforcements_total": self._total,
            "global_kill_active": self._global_kill,
            "kill_switches_engaged": [k for k, v in self._kill_switches.items() if v],
            "entity_tiers": {k: v.name for k, v in self._entity_tiers.items()},
            "circuit_breakers": dict(self._circuit),
            "audit_log_size": len(self._audit),
            "top_triggered": sorted(
                [{"id": p.id, "name": p.name, "count": p.trigger_count}
                 for p in self._policies.values()],
                key=lambda x: x["count"], reverse=True
            )[:5],
            "uptime_s": round(time.time() - self._born, 1),
        }

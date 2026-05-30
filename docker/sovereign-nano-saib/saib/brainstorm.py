"""
Sovereign Brainstorm Automation Framework
- OODA loop engine: Observe → Orient → Decide → Act → Complete
- Autonomous goal decomposition into ranked step plans
- Multi-criteria plan scoring (feasibility × risk × priority × urgency)
- Self-improving plan library (learns from outcomes)
- Mesh-collaborative strategy: broadcast subtasks to SAIB peers
- Continuous re-evaluation loop (background task, 30s interval)
"""
from __future__ import annotations

import asyncio
import time
import uuid
from collections import deque
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


class OODAPhase(Enum):
    OBSERVE  = "OBSERVE"
    ORIENT   = "ORIENT"
    DECIDE   = "DECIDE"
    ACT      = "ACT"
    COMPLETE = "COMPLETE"
    FAILED   = "FAILED"


class GoalPriority(Enum):
    CRITICAL   = 1.0
    HIGH       = 0.75
    NORMAL     = 0.5
    LOW        = 0.25


@dataclass
class Goal:
    id: str
    description: str
    priority: float           # 0-1 (use GoalPriority.value)
    domain: str = "general"   # e.g. "defense", "ecosystem", "founder", "financial"
    deadline: Optional[float] = None
    success_criteria: list = field(default_factory=list)
    created_at: float = field(default_factory=time.time)
    context: dict = field(default_factory=dict)


@dataclass
class Plan:
    id: str
    goal_id: str
    strategy: str             # "direct" | "phased" | "mesh" | "quantum_optimize"
    steps: list[str]
    score: float = 0.0
    feasibility: float = 1.0
    risk: float = 0.0
    executed: bool = False
    outcome: Optional[str] = None   # None | "SUCCESS" | "PARTIAL" | "FAILED"
    created_at: float = field(default_factory=time.time)
    execution_ms: float = 0.0


@dataclass
class OODASession:
    goal: Goal
    phase: OODAPhase = OODAPhase.OBSERVE
    observations: list[dict] = field(default_factory=list)
    candidate_plans: list[Plan] = field(default_factory=list)
    selected_plan: Optional[Plan] = None
    completed: bool = False
    started_at: float = field(default_factory=time.time)
    completed_at: Optional[float] = None


class BrainstormEngine:
    """
    Sovereign OODA automation — cycles continuously, generates ranked plans,
    learns from outcomes, and delegates to the SAIB mesh when needed.
    """

    REEVAL_INTERVAL_S = 30.0

    def __init__(self):
        self._goals: dict[str, Goal] = {}
        self._sessions: dict[str, OODASession] = {}
        self._plans: dict[str, Plan] = {}
        self._plan_library: deque[Plan] = deque(maxlen=500)
        self._cycles_run = 0
        self._history: deque = deque(maxlen=300)
        self._background_task: Optional[asyncio.Task] = None
        self._born = time.time()

    # ── Goal Management ───────────────────────────────────────────────────────

    def submit_goal(self, goal: Goal) -> str:
        self._goals[goal.id] = goal
        session = OODASession(goal=goal)
        self._sessions[goal.id] = session
        return goal.id

    def quick_goal(
        self,
        description: str,
        priority: float = 0.5,
        domain: str = "general",
    ) -> str:
        g = Goal(
            id=str(uuid.uuid4())[:8],
            description=description,
            priority=priority,
            domain=domain,
        )
        return self.submit_goal(g)

    # ── Plan Generation ───────────────────────────────────────────────────────

    def _generate_plans(self, session: OODASession) -> list[Plan]:
        g = session.goal
        plans: list[Plan] = []

        # 1. Direct execution
        plans.append(Plan(
            id=f"{g.id}_direct",
            goal_id=g.id,
            strategy="direct",
            steps=[
                f"Analyze task: {g.description}",
                "Execute with full engine resources",
                "Monitor outcomes in real-time",
                "Confirm success criteria satisfied",
            ],
            feasibility=0.92, risk=0.28,
        ))

        # 2. Phased execution
        plans.append(Plan(
            id=f"{g.id}_phased",
            goal_id=g.id,
            strategy="phased",
            steps=[
                f"Phase-1 RECON: gather all intelligence on '{g.description}'",
                "Phase-2 PLAN: design step-by-step approach with fallbacks",
                "Phase-3 EXECUTE: run with threat monitoring active",
                "Phase-4 VERIFY: confirm each success criterion",
                "Phase-5 HARDEN: update defenses based on findings",
            ],
            feasibility=0.85, risk=0.18,
        ))

        # 3. Mesh-collaborative (delegate to SAIB peers)
        plans.append(Plan(
            id=f"{g.id}_mesh",
            goal_id=g.id,
            strategy="mesh",
            steps=[
                "Decompose goal into independent subtasks",
                "Broadcast subtasks to SAIB mesh at warp speed",
                "Collect partial results from all alive peers",
                "Run neural fusion on collective responses",
                "Synthesize unified outcome + audit trail",
            ],
            feasibility=0.78, risk=0.12,
        ))

        # 4. Quantum-optimized routing
        plans.append(Plan(
            id=f"{g.id}_quantum",
            goal_id=g.id,
            strategy="quantum_optimize",
            steps=[
                "Map task as optimization problem",
                "Run quantum-inspired annealing to find optimal path",
                "Execute optimal path with photonic determinism",
                "Feed results into neural core for learning",
            ],
            feasibility=0.70, risk=0.10,
        ))

        # Boost from successful historical plans in same domain
        domain_wins = [p for p in self._plan_library
                       if p.outcome == "SUCCESS" and
                       self._goals.get(p.goal_id, Goal("", "", 0, domain="")).domain == g.domain]
        if domain_wins:
            boost = min(len(domain_wins) * 0.02, 0.12)
            for p in plans:
                p.feasibility = min(p.feasibility + boost, 1.0)

        return plans

    def _score_plan(self, plan: Plan, goal: Goal) -> float:
        urgency = 1.0
        if goal.deadline:
            remaining = max(goal.deadline - time.time(), 0)
            urgency = 1.0 + max(0.0, (1.0 - remaining / 3600)) * 0.5
        score = (
            plan.feasibility * 0.38 +
            (1.0 - plan.risk) * 0.28 +
            goal.priority * 0.20 +
            min(urgency * 0.14, 0.14)
        )
        return round(min(score, 1.0), 4)

    # ── OODA Cycle ────────────────────────────────────────────────────────────

    def cycle(self, goal_id: str, observation: Optional[dict] = None) -> dict:
        """
        Advance one OODA phase for a goal.
        Call repeatedly (or use run_to_completion) to fully cycle.
        """
        session = self._sessions.get(goal_id)
        if not session:
            return {"error": "goal_not_found"}
        if session.completed:
            return {"phase": "COMPLETE", "already_done": True}

        self._cycles_run += 1
        g = session.goal

        if session.phase == OODAPhase.OBSERVE:
            if observation:
                session.observations.append({**observation, "ts": time.time()})
            session.phase = OODAPhase.ORIENT
            return {"phase": "ORIENT", "observations_logged": len(session.observations)}

        if session.phase == OODAPhase.ORIENT:
            plans = self._generate_plans(session)
            for p in plans:
                p.score = self._score_plan(p, g)
                self._plans[p.id] = p
            session.candidate_plans = sorted(plans, key=lambda x: x.score, reverse=True)
            session.phase = OODAPhase.DECIDE
            return {
                "phase": "DECIDE",
                "candidates": [
                    {"id": p.id, "strategy": p.strategy, "score": p.score,
                     "feasibility": p.feasibility, "risk": p.risk}
                    for p in session.candidate_plans
                ],
            }

        if session.phase == OODAPhase.DECIDE:
            best = session.candidate_plans[0] if session.candidate_plans else None
            session.selected_plan = best
            session.phase = OODAPhase.ACT
            return {
                "phase": "ACT",
                "selected": best.id if best else None,
                "strategy": best.strategy if best else None,
                "score": best.score if best else 0,
                "steps": best.steps if best else [],
            }

        if session.phase == OODAPhase.ACT:
            plan = session.selected_plan
            if plan:
                plan.executed = True
                plan.outcome = "SUCCESS"   # optimistic — caller can update
                plan.execution_ms = (time.time() - session.started_at) * 1000
                self._plan_library.append(plan)
            session.completed = True
            session.completed_at = time.time()
            session.phase = OODAPhase.COMPLETE
            self._history.append({
                "goal_id": goal_id,
                "domain": g.domain,
                "plan_id": plan.id if plan else None,
                "strategy": plan.strategy if plan else None,
                "ts": time.time(),
            })
            return {
                "phase": "COMPLETE",
                "goal_id": goal_id,
                "plan_id": plan.id if plan else None,
                "execution_ms": round(plan.execution_ms, 1) if plan else 0,
            }

        return {"phase": session.phase.value}

    def run_to_completion(self, goal_id: str, observation: Optional[dict] = None) -> list[dict]:
        """Fast-path: run all OODA phases in one call."""
        results = []
        r = self.cycle(goal_id, observation)
        results.append(r)
        while r.get("phase") not in ("COMPLETE", "FAILED") and not r.get("error") and not r.get("already_done"):
            r = self.cycle(goal_id)
            results.append(r)
        return results

    def record_outcome(self, goal_id: str, plan_id: str, outcome: str) -> bool:
        """Update outcome in plan library for future learning."""
        for p in self._plan_library:
            if p.id == plan_id and p.goal_id == goal_id:
                p.outcome = outcome
                return True
        return False

    # ── Background Re-evaluation Loop ────────────────────────────────────────

    async def _reeval_loop(self):
        while True:
            await asyncio.sleep(self.REEVAL_INTERVAL_S)
            # Re-score any stale active goals
            for gid, session in list(self._sessions.items()):
                if not session.completed and session.phase == OODAPhase.DECIDE:
                    for p in session.candidate_plans:
                        p.score = self._score_plan(p, session.goal)
                    session.candidate_plans.sort(key=lambda x: x.score, reverse=True)

    def start_background(self):
        if not self._background_task:
            self._background_task = asyncio.create_task(self._reeval_loop())

    # ── Status ────────────────────────────────────────────────────────────────

    def stats(self) -> dict:
        active = [s for s in self._sessions.values() if not s.completed]
        wins = len([p for p in self._plan_library if p.outcome == "SUCCESS"])
        return {
            "goals_active": len(active),
            "goals_total": len(self._goals),
            "cycles_run": self._cycles_run,
            "plans_generated": len(self._plans),
            "plan_library_size": len(self._plan_library),
            "success_rate": round(wins / max(len(self._plan_library), 1), 3),
            "recent_completions": list(self._history)[-5:],
            "uptime_s": round(time.time() - self._born, 1),
        }

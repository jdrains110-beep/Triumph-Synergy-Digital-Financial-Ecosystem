"""
Omni Sovereign Master — SAIB v9 Multi-Agent Orchestration Engine
──────────────────────────────────────────────────────────────────────────────
The apex intelligence orchestrator of SAIB. Receives objectives, delegates
work to three specialized sub-agents (Researcher, Coder, Enforcer), runs a
self-correcting feedback loop, and delivers verified output.

Architecture:
      USER PROMPT → OMNI SOVEREIGN MASTER ←→ [LLMBrain / Long-Term Memory]
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
          [Researcher]     [Coder]       [VisionEnforcer]
                              │                   ▲
                         [ARTIFACT] ──────────────┘
                      (code / data / file)
              └────────────── ENFORCER ←──────────┘
                       (Security + Quality Gate)

Sub-agents:
  • Researcher     — synthesizes context, docs, and constraints
  • Coder          — generates and iterates on code artifacts
  • VisionEnforcer — reads runtime output and validates it
  • Enforcer       — security + quality gatekeeper (TRIUMPH or retry)

Enforcement Loop:
  Researcher → Coder → Vision → Enforcer → [TRIUMPH | retry→Coder]
  Max iterations: configurable (default 3) — safe ceiling prevents runaway
"""
from __future__ import annotations

import asyncio
import logging
import time
import uuid
from collections import deque
from typing import Any, Dict, List, Optional, TypedDict

log = logging.getLogger("sovereign.omni_master")

# ── LangGraph (graceful fallback to sequential if not installed) ──────────────
try:
    from langgraph.graph import StateGraph, END as GRAPH_END
    _LANGGRAPH = True
except ImportError:
    _LANGGRAPH = False
    log.warning("[OmniMaster] langgraph not installed — using sequential fallback")


# ── State schema ──────────────────────────────────────────────────────────────
class OmniSovereignState(TypedDict):
    task_id:           str
    objective:         str
    current_code:      str
    runtime_logs:      str
    vision_feedback:   str
    enforcer_feedback: str
    research_context:  str
    iteration_count:   int
    max_iterations:    int
    status:            str   # delegating|creating|researching|enforcing|triumph|failed
    output:            str
    agent_trace:       List[str]


_BLANK: OmniSovereignState = {
    "task_id":           "",
    "objective":         "",
    "current_code":      "",
    "runtime_logs":      "",
    "vision_feedback":   "None yet. Begin initialization.",
    "enforcer_feedback": "",
    "research_context":  "",
    "iteration_count":   0,
    "max_iterations":    3,
    "status":            "delegating",
    "output":            "",
    "agent_trace":       [],
}


# ── Node builder helpers ──────────────────────────────────────────────────────
def _extract_code(text: str) -> str:
    """Pull code out of ```python ... ``` or ``` ... ``` fences."""
    for fence in ("```python", "```"):
        if fence in text:
            after = text.split(fence, 1)[1]
            return after.rsplit("```", 1)[0].strip()
    return text.strip()


def _build_researcher(llm: Any):
    async def node(state: OmniSovereignState) -> OmniSovereignState:
        log.info("[OmniMaster/Researcher] Synthesizing context for objective")
        prompt = (
            "You are the SAIB Researcher sub-agent.\n"
            f"Objective: {state['objective']}\n"
            f"Prior research: {state.get('research_context') or 'None'}\n"
            f"Runtime logs: {state.get('runtime_logs') or 'None'}\n\n"
            "Gather and synthesize all relevant facts, dependencies, APIs, "
            "and constraints the Coder will need. Be dense and precise — no filler."
        )
        result = await llm.complete(prompt)
        return {
            **state,
            "research_context": result,
            "agent_trace": state["agent_trace"] + [
                f"[researcher] context={len(result)}chars"
            ],
        }
    return node


def _build_coder(llm: Any):
    async def node(state: OmniSovereignState) -> OmniSovereignState:
        iteration = state["iteration_count"] + 1
        log.info("[OmniMaster/Coder] Generating artifact (iteration %d)", iteration)
        prompt = (
            "You are the SAIB Coder sub-agent — sovereign code architect.\n"
            f"Objective: {state['objective']}\n"
            f"Research context:\n{state.get('research_context') or 'None'}\n"
            f"Previous code:\n{state.get('current_code') or 'None yet'}\n"
            f"Runtime logs:\n{state.get('runtime_logs') or 'None'}\n"
            f"Enforcer feedback:\n{state.get('enforcer_feedback') or 'None'}\n"
            f"Vision feedback:\n{state.get('vision_feedback') or 'None'}\n\n"
            "Write complete, production-ready code that fully achieves the objective. "
            "Address every issue raised by enforcer and vision feedback. "
            "Output ONLY clean runnable code in ```python ... ``` blocks."
        )
        result = await llm.complete(prompt)
        code = _extract_code(result)
        return {
            **state,
            "current_code":    code,
            "iteration_count": iteration,
            "status":          "creating",
            "agent_trace": state["agent_trace"] + [f"[coder] iter={iteration}"],
        }
    return node


def _build_vision(llm: Any):
    async def node(state: OmniSovereignState) -> OmniSovereignState:
        log.info("[OmniMaster/Vision] Analyzing runtime output")
        if not state.get("runtime_logs"):
            return {**state, "vision_feedback": "No runtime output yet — code not executed."}
        prompt = (
            "You are the SAIB Vision Enforcer sub-agent.\n"
            f"Objective: {state['objective']}\n"
            f"Runtime output:\n{state['runtime_logs']}\n\n"
            "Does this runtime output prove the objective was achieved? "
            "Look for: exceptions, missing output, incorrect results, side effects.\n"
            "If the objective is fully achieved, respond with 'VISION_CLEAR' on line 1.\n"
            "Otherwise describe exactly what needs to be fixed."
        )
        feedback = await llm.complete(prompt)
        clear = "VISION_CLEAR" in feedback.upper().split("\n")[0]
        return {
            **state,
            "vision_feedback": feedback,
            "agent_trace": state["agent_trace"] + [
                "[vision] " + ("CLEAR" if clear else "needs_fix")
            ],
        }
    return node


def _build_enforcer(llm: Any):
    async def node(state: OmniSovereignState) -> OmniSovereignState:
        log.info("[OmniMaster/Enforcer] Running security + quality gates")
        prompt = (
            "You are the SAIB Enforcer sub-agent — sovereign security and quality auditor.\n"
            f"Objective: {state['objective']}\n"
            f"Generated code:\n{state.get('current_code') or 'None'}\n"
            f"Runtime output:\n{state.get('runtime_logs') or 'Not yet executed'}\n\n"
            "Evaluate against ALL of these gates:\n"
            "  1. Security: no SQL injection, XSS, hardcoded secrets, unsafe eval(), OWASP violations\n"
            "  2. Correctness: fully achieves the stated objective\n"
            "  3. Quality: production-ready, clean, handles edge cases\n"
            "  4. Completeness: no missing pieces or TODO stubs\n\n"
            "If ALL four gates pass, respond with 'TRIUMPH' on the FIRST line.\n"
            "Otherwise list precisely what must be corrected — do NOT say TRIUMPH."
        )
        feedback = await llm.complete(prompt)
        triumph = "TRIUMPH" in feedback.upper().split("\n")[0]
        if triumph:
            return {
                **state,
                "status":            "triumph",
                "enforcer_feedback": "All security and quality gates passed.",
                "output":            state.get("current_code", ""),
                "agent_trace": state["agent_trace"] + ["[enforcer] TRIUMPH"],
            }
        return {
            **state,
            "status":            "iterating",
            "enforcer_feedback": feedback,
            "agent_trace": state["agent_trace"] + ["[enforcer] needs_revision"],
        }
    return node


def _router(state: OmniSovereignState) -> str:
    if state["status"] == "triumph":
        return "complete"
    if state["iteration_count"] >= state["max_iterations"]:
        log.warning(
            "[OmniMaster] Iteration ceiling %d reached — delivering best effort",
            state["max_iterations"],
        )
        return "complete"
    return "retry"


# ── Engine ────────────────────────────────────────────────────────────────────
class OmniSovereignMaster:
    """
    Apex multi-agent orchestration engine (v9).

    Sub-agents: Researcher → Coder → VisionEnforcer → Enforcer
    Self-correcting loop until TRIUMPH or iteration ceiling.
    """

    def __init__(self) -> None:
        self._llm: Any        = None
        self._brain: Any      = None
        self._graph: Any      = None
        self._task_count:   int = 0
        self._triumph_count: int = 0
        self._running: bool  = False
        self._history: deque = deque(maxlen=500)

    def boot(self, llm: Any = None, brain: Any = None) -> None:
        self._llm    = llm
        self._brain  = brain
        self._running = True
        if llm and _LANGGRAPH:
            self._graph = self._compile_graph(llm)
            log.info("[OmniMaster] LangGraph engine compiled — v9 OMNI MASTER SOVEREIGN ONLINE")
        elif llm:
            log.info("[OmniMaster] Sequential fallback engine ONLINE (install langgraph for full graph)")
        else:
            log.warning("[OmniMaster] No LLM provided — task execution in degraded mode")

    def _compile_graph(self, llm: Any) -> Any:
        g = StateGraph(OmniSovereignState)
        g.add_node("Researcher", _build_researcher(llm))
        g.add_node("Coder",      _build_coder(llm))
        g.add_node("Vision",     _build_vision(llm))
        g.add_node("Enforcer",   _build_enforcer(llm))
        g.set_entry_point("Researcher")
        g.add_edge("Researcher", "Coder")
        g.add_edge("Coder",      "Vision")
        g.add_edge("Vision",     "Enforcer")
        g.add_conditional_edges(
            "Enforcer",
            _router,
            {"retry": "Coder", "complete": GRAPH_END},
        )
        return g.compile()

    async def _run_sequential(self, state: OmniSovereignState) -> OmniSovereignState:
        """Fallback sequential pipeline without LangGraph."""
        llm = self._llm
        if not llm:
            return {**state, "status": "failed", "output": "No LLM brain available"}
        state = await _build_researcher(llm)(state)
        for _ in range(state["max_iterations"]):
            state = await _build_coder(llm)(state)
            state = await _build_vision(llm)(state)
            state = await _build_enforcer(llm)(state)
            if _router(state) == "complete":
                break
        return state

    async def run_task(
        self,
        objective: str,
        runtime_logs: str = "",
        max_iterations: int = 3,
    ) -> Dict[str, Any]:
        task_id = str(uuid.uuid4())[:12]
        t0 = time.time()
        self._task_count += 1

        state: OmniSovereignState = {
            **_BLANK,
            "task_id":        task_id,
            "objective":      objective,
            "runtime_logs":   runtime_logs,
            "max_iterations": max_iterations,
        }

        try:
            if self._graph:
                result = await self._graph.ainvoke(state)
            else:
                result = await self._run_sequential(state)
        except Exception as exc:
            log.error("[OmniMaster] Task %s error: %s", task_id, exc)
            result = {**state, "status": "failed", "output": str(exc)}

        elapsed = round(time.time() - t0, 2)
        if result.get("status") == "triumph":
            self._triumph_count += 1

        summary = {
            "task_id":     task_id,
            "status":      result.get("status", "unknown"),
            "output":      result.get("output", result.get("current_code", "")),
            "iterations":  result.get("iteration_count", 0),
            "elapsed_s":   elapsed,
            "agent_trace": result.get("agent_trace", []),
        }
        self._history.appendleft(summary)
        log.info(
            "[OmniMaster] Task %s → %s in %.1fs (%d iter)",
            task_id, summary["status"], elapsed, summary["iterations"],
        )
        return summary

    def status(self) -> Dict[str, Any]:
        return {
            "running":        self._running,
            "graph_engine":   "langgraph" if self._graph else "sequential_fallback",
            "task_count":     self._task_count,
            "triumph_count":  self._triumph_count,
            "recent_tasks":   list(self._history)[:5],
        }


# ── singleton ─────────────────────────────────────────────────────────────────
omni_sovereign_master = OmniSovereignMaster()

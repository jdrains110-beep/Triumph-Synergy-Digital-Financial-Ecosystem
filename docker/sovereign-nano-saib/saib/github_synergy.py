"""
GitHub Synergy Engine — SAIB v9
──────────────────────────────────────────────────────────────────────────────
Clones a GitHub repository, flattens its code into AI context, generates an
executable patch/driver script via the Omni Sovereign Master pipeline, and
enforces the result in a self-correcting loop.

Flow (LangGraph StateGraph):
  1. Ingest  — git clone --depth=1 + flatten relevant files into context
  2. Execute — LLM Coder generates + runs synergy_run.py in the workspace
  3. Enforce — LLM Enforcer validates runtime output (TRIUMPH or retry)
  4. Loop    — up to max_iterations (default 3) then best-effort delivery

Triumph Synergy:
  • Creates What It Reads  — transforms code context into working patches
  • Sees What It Creates   — runtime stdout/stderr fed back into LLM loop
  • Self-Enforcing         — Enforcer rejects broken outputs before delivery
"""
from __future__ import annotations

import asyncio
import logging
import os
import shutil
import subprocess
import tempfile
import time
import uuid
from typing import Any, Dict, List, TypedDict

log = logging.getLogger("sovereign.github_synergy")

try:
    from langgraph.graph import StateGraph, END as GRAPH_END
    _LANGGRAPH = True
except ImportError:
    _LANGGRAPH = False

# ── Constants ─────────────────────────────────────────────────────────────────
_INGEST_EXTS   = {".py", ".md", ".json", ".sh", ".ts", ".tsx", ".yml", ".yaml",
                  ".toml", ".env.example", ".sql"}
_MAX_FILE_CHARS   = 8_000    # truncate individual files
_MAX_CONTEXT_CHARS = 60_000  # total flattened context cap
_EXEC_TIMEOUT      = 30      # seconds for subprocess execution


# ── State schema ──────────────────────────────────────────────────────────────
class GitHubSynergyState(TypedDict):
    run_id:            str
    repo_url:          str
    workspace_path:    str
    codebase_context:  str
    target_task:       str
    current_iteration: int
    max_iterations:    int
    execution_logs:    str
    enforcer_feedback: str
    generated_script:  str
    output_summary:    str
    status:            str   # ingesting|executing|enforcing|triumph|failed


# ── Node: Ingestor ────────────────────────────────────────────────────────────
async def _github_ingestor(state: GitHubSynergyState) -> GitHubSynergyState:
    """Clone the repository and flatten relevant files into AI context."""
    run_id   = state["run_id"]
    repo_url = state["repo_url"]
    log.info("[GitHubSynergy/Ingestor] Cloning: %s", repo_url)

    workspace = state.get("workspace_path") or os.path.join(
        tempfile.gettempdir(), f"synergy_{run_id}"
    )
    if os.path.exists(workspace):
        shutil.rmtree(workspace, ignore_errors=True)

    try:
        res = subprocess.run(
            ["git", "clone", "--depth=1", repo_url, workspace],
            capture_output=True, text=True, timeout=120,
        )
        if res.returncode != 0:
            raise RuntimeError(f"git clone failed: {res.stderr[:500]}")
    except Exception as exc:
        log.error("[GitHubSynergy/Ingestor] Clone failed: %s", exc)
        return {
            **state,
            "status":          "failed",
            "codebase_context": f"Ingest failed: {exc}",
            "execution_logs":   str(exc),
        }

    # Flatten files into context
    parts: List[str] = []
    total = 0
    count = 0
    for root, dirs, files in os.walk(workspace):
        dirs[:] = [
            d for d in dirs
            if not d.startswith(".")
            and d not in ("node_modules", "__pycache__", ".git", "dist", "build")
        ]
        for fname in sorted(files):
            if not any(fname.endswith(ext) for ext in _INGEST_EXTS):
                continue
            fpath = os.path.join(root, fname)
            rel   = os.path.relpath(fpath, workspace)
            try:
                with open(fpath, "r", errors="ignore") as f:
                    content = f.read(_MAX_FILE_CHARS)
                entry = f"\n--- FILE: {rel} ---\n{content}"
                if total + len(entry) > _MAX_CONTEXT_CHARS:
                    parts.append("\n[... context truncated at limit ...]")
                    break
                parts.append(entry)
                total += len(entry)
                count += 1
            except Exception:
                pass

    context = "".join(parts)
    log.info("[GitHubSynergy/Ingestor] %d files ingested (%d chars)", count, total)
    return {
        **state,
        "workspace_path":   workspace,
        "codebase_context": context,
        "status":           "executing",
    }


# ── Node: Executor ────────────────────────────────────────────────────────────
def _build_executor(llm: Any):
    async def node(state: GitHubSynergyState) -> GitHubSynergyState:
        iteration = state["current_iteration"] + 1
        log.info("[GitHubSynergy/Executor] Generating script (iter %d)", iteration)

        prompt = (
            "You are the SAIB GitHub Synergy Executor.\n"
            f"Repository codebase (truncated to 20k chars):\n"
            f"{state['codebase_context'][:20_000]}\n\n"
            f"Target task: {state['target_task']}\n"
            f"Previous execution logs:\n{state.get('execution_logs') or 'None'}\n"
            f"Enforcer feedback:\n{state.get('enforcer_feedback') or 'None'}\n\n"
            "Write a complete, standalone Python script that achieves the target task "
            "within this codebase. The script will be saved as 'synergy_run.py' in the "
            "workspace root and executed with `python3 synergy_run.py`. "
            "Output ONLY clean runnable Python in ```python ... ``` blocks."
        )
        result = await llm.complete(prompt)

        # Extract code block
        code = result
        for fence in ("```python", "```"):
            if fence in result:
                code = result.split(fence, 1)[1].rsplit("```", 1)[0].strip()
                break

        # Execute the script in the workspace
        workspace = state.get("workspace_path") or tempfile.gettempdir()
        script_path = os.path.join(workspace, "synergy_run.py")
        try:
            with open(script_path, "w") as f:
                f.write(code)
            res = subprocess.run(
                ["python3", script_path],
                capture_output=True, text=True,
                timeout=_EXEC_TIMEOUT, cwd=workspace,
            )
            logs = (
                f"STDOUT:\n{res.stdout[:3000]}\n"
                f"STDERR:\n{res.stderr[:1000]}\n"
                f"EXIT_CODE: {res.returncode}"
            )
        except subprocess.TimeoutExpired:
            logs = f"Runtime Error: Execution timed out after {_EXEC_TIMEOUT}s."
        except Exception as exc:
            logs = f"Runtime Error: {exc}"

        return {
            **state,
            "generated_script":  code,
            "execution_logs":    logs,
            "current_iteration": iteration,
            "status":            "enforcing",
        }
    return node


# ── Node: Enforcer ────────────────────────────────────────────────────────────
def _build_synergy_enforcer(llm: Any):
    async def node(state: GitHubSynergyState) -> GitHubSynergyState:
        log.info("[GitHubSynergy/Enforcer] Evaluating output (iter %d)", state["current_iteration"])
        prompt = (
            "You are the SAIB GitHub Synergy Enforcer.\n"
            f"Task: {state['target_task']}\n"
            f"Execution logs:\n{state['execution_logs']}\n"
            f"Script (first 3k chars):\n{state.get('generated_script', '')[:3000]}\n\n"
            "Does the runtime output prove the task was completed successfully without errors? "
            "Check for: exceptions, missing output, wrong behavior, broken system layers.\n"
            "If YES, respond with exactly 'TRIUMPH' on line 1.\n"
            "If NO, explain precisely what must be corrected."
        )
        feedback = await llm.complete(prompt)
        if "TRIUMPH" in feedback.upper().split("\n")[0]:
            return {
                **state,
                "status":            "triumph",
                "enforcer_feedback": "Synergy achieved — task verified.",
                "output_summary":    state.get("execution_logs", "")[:2000],
            }
        return {
            **state,
            "status":            "iterating",
            "enforcer_feedback": feedback,
        }
    return node


def _synergy_router(state: GitHubSynergyState) -> str:
    if state["status"] == "triumph":
        return "complete"
    if state["current_iteration"] >= state["max_iterations"]:
        log.warning("[GitHubSynergy] Iteration ceiling %d reached", state["max_iterations"])
        return "complete"
    return "retry"


# ── Engine ────────────────────────────────────────────────────────────────────
class GitHubSynergyEngine:
    """
    Sovereign GitHub Synergy Engine (v9).
    Clones → Ingests → Generates → Executes → Enforces in a self-correcting loop.
    """

    def __init__(self) -> None:
        self._llm: Any      = None
        self._graph: Any    = None
        self._run_count     = 0
        self._triumph_count = 0
        self._running       = False

    def boot(self, llm: Any = None) -> None:
        self._llm     = llm
        self._running = True
        if llm and _LANGGRAPH:
            self._graph = self._compile(llm)
            log.info("[GitHubSynergy] LangGraph graph compiled — ONLINE")
        else:
            log.info("[GitHubSynergy] Sequential fallback ONLINE")

    def _compile(self, llm: Any) -> Any:
        g = StateGraph(GitHubSynergyState)
        g.add_node("Ingest",   _github_ingestor)
        g.add_node("Execute",  _build_executor(llm))
        g.add_node("Enforce",  _build_synergy_enforcer(llm))
        g.set_entry_point("Ingest")
        g.add_edge("Ingest",  "Execute")
        g.add_edge("Execute", "Enforce")
        g.add_conditional_edges(
            "Enforce",
            _synergy_router,
            {"retry": "Execute", "complete": GRAPH_END},
        )
        return g.compile()

    async def run(
        self,
        repo_url: str,
        target_task: str,
        max_iterations: int = 3,
    ) -> Dict[str, Any]:
        run_id = str(uuid.uuid4())[:10]
        self._run_count += 1
        t0 = time.time()

        state: GitHubSynergyState = {
            "run_id":            run_id,
            "repo_url":          repo_url,
            "workspace_path":    "",
            "codebase_context":  "",
            "target_task":       target_task,
            "current_iteration": 0,
            "max_iterations":    max_iterations,
            "execution_logs":    "",
            "enforcer_feedback": "",
            "generated_script":  "",
            "output_summary":    "",
            "status":            "ingesting",
        }

        workspace = ""
        try:
            if self._graph:
                result = await self._graph.ainvoke(state)
            else:
                # Sequential fallback
                result = await _github_ingestor(state)
                if result["status"] != "failed" and self._llm:
                    executor = _build_executor(self._llm)
                    enforcer = _build_synergy_enforcer(self._llm)
                    for _ in range(max_iterations):
                        result = await executor(result)
                        result = await enforcer(result)
                        if _synergy_router(result) == "complete":
                            break
            workspace = result.get("workspace_path", "")
        except Exception as exc:
            log.error("[GitHubSynergy] Run %s error: %s", run_id, exc)
            result = {**state, "status": "failed", "execution_logs": str(exc)}
        finally:
            if workspace and os.path.exists(workspace):
                shutil.rmtree(workspace, ignore_errors=True)

        elapsed = round(time.time() - t0, 2)
        if result.get("status") == "triumph":
            self._triumph_count += 1

        return {
            "run_id":         run_id,
            "repo_url":       repo_url,
            "status":         result.get("status"),
            "iterations":     result.get("current_iteration", 0),
            "execution_logs": result.get("execution_logs", "")[:2000],
            "output_summary": result.get("output_summary", ""),
            "elapsed_s":      elapsed,
        }

    def stats(self) -> Dict[str, Any]:
        return {
            "running":        self._running,
            "graph_engine":   "langgraph" if self._graph else "sequential",
            "run_count":      self._run_count,
            "triumph_count":  self._triumph_count,
        }


# ── singleton ─────────────────────────────────────────────────────────────────
github_synergy = GitHubSynergyEngine()

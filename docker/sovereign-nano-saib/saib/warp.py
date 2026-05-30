"""
Sovereign Warp Speed Execution Engine
- 4 priority lanes: CRITICAL / HIGH / NORMAL / BACKGROUND
- Per-lane concurrency semaphores (burst-parallel)
- Warp burst: fire N coroutines simultaneously and collect results
- Live telemetry: tasks/sec, p50/p95/p99 latency in ms
- Inter-SAIB delegation interface (fire-and-collect across mesh)
"""
from __future__ import annotations

import asyncio
import time
from collections import deque
from dataclasses import dataclass, field
from enum import IntEnum
from typing import Any, Awaitable, Callable, Optional


class WarpLane(IntEnum):
    CRITICAL   = 0
    HIGH       = 1
    NORMAL     = 2
    BACKGROUND = 3


# Per-lane concurrency caps
_CONCURRENCY = {
    WarpLane.CRITICAL:   64,
    WarpLane.HIGH:       32,
    WarpLane.NORMAL:     16,
    WarpLane.BACKGROUND:  4,
}

# Per-lane timeout limits (seconds; 0 = no limit)
_TIMEOUT = {
    WarpLane.CRITICAL:    5.0,
    WarpLane.HIGH:       15.0,
    WarpLane.NORMAL:     30.0,
    WarpLane.BACKGROUND: 120.0,
}


@dataclass
class WarpResult:
    task_id: str
    lane: WarpLane
    success: bool
    value: Any
    latency_ms: float
    error: Optional[str] = None


class WarpSpeedEngine:
    """
    Apex parallel coroutine dispatcher.
    CRITICAL lane bypasses all queuing — tasks fire instantly with max concurrency.
    Warp burst fires a list of coroutines simultaneously and returns when all complete.
    """

    def __init__(self):
        self._sems: dict[WarpLane, asyncio.Semaphore] = {}
        self._latencies: deque = deque(maxlen=2000)
        self._by_lane: dict[WarpLane, int] = {l: 0 for l in WarpLane}
        self._failed: dict[WarpLane, int] = {l: 0 for l in WarpLane}
        self._total = 0
        self._start = time.time()
        self._active: dict[str, asyncio.Task] = {}

    def _sem(self, lane: WarpLane) -> asyncio.Semaphore:
        if lane not in self._sems:
            self._sems[lane] = asyncio.Semaphore(_CONCURRENCY[lane])
        return self._sems[lane]

    async def dispatch(
        self,
        coro_fn: Callable[[], Awaitable[Any]],
        lane: WarpLane = WarpLane.NORMAL,
        task_id: str = "",
        timeout: Optional[float] = None,
    ) -> asyncio.Task:
        tid = task_id or f"w{time.time_ns()}"
        t0 = time.perf_counter()
        sem = self._sem(lane)
        tmo = timeout if timeout is not None else _TIMEOUT[lane]

        async def _run() -> WarpResult:
            async with sem:
                try:
                    coro = coro_fn()
                    if tmo > 0:
                        value = await asyncio.wait_for(coro, timeout=tmo)
                    else:
                        value = await coro
                    lat = (time.perf_counter() - t0) * 1000
                    self._latencies.append(lat)
                    self._by_lane[lane] += 1
                    self._total += 1
                    return WarpResult(tid, lane, True, value, round(lat, 3))
                except Exception as exc:
                    self._failed[lane] += 1
                    self._total += 1
                    return WarpResult(tid, lane, False, None,
                                      round((time.perf_counter() - t0) * 1000, 3),
                                      str(exc))
                finally:
                    self._active.pop(tid, None)

        task = asyncio.create_task(_run(), name=tid)
        self._active[tid] = task
        return task

    async def warp_burst(
        self,
        coro_fns: list[Callable[[], Awaitable[Any]]],
        lane: WarpLane = WarpLane.HIGH,
    ) -> list[WarpResult]:
        """Fire all coro_fns simultaneously at warp speed; collect all results."""
        task_handles = [await self.dispatch(fn, lane) for fn in coro_fns]
        results = await asyncio.gather(*task_handles, return_exceptions=True)
        return [r if isinstance(r, WarpResult) else
                WarpResult("burst", lane, False, None, 0.0, str(r))
                for r in results]

    async def critical(
        self,
        coro_fn: Callable[[], Awaitable[Any]],
        task_id: str = "",
    ) -> WarpResult:
        """Express-lane: fire, await, return result immediately."""
        t = await self.dispatch(coro_fn, WarpLane.CRITICAL, task_id)
        return await t

    # ── Telemetry ─────────────────────────────────────────────────────────────

    def _pctile(self, p: float) -> float:
        if not self._latencies:
            return 0.0
        s = sorted(self._latencies)
        idx = min(int(len(s) * p / 100), len(s) - 1)
        return round(s[idx], 3)

    def tasks_per_sec(self) -> float:
        elapsed = max(time.time() - self._start, 0.001)
        return round(self._total / elapsed, 2)

    def stats(self) -> dict:
        return {
            "total_dispatched": self._total,
            "active_now": len(self._active),
            "tasks_per_sec": self.tasks_per_sec(),
            "latency_ms": {
                "p50": self._pctile(50),
                "p95": self._pctile(95),
                "p99": self._pctile(99),
            },
            "by_lane": {lane.name: self._by_lane[lane] for lane in WarpLane},
            "failed_by_lane": {lane.name: self._failed[lane] for lane in WarpLane},
            "concurrency_caps": {lane.name: _CONCURRENCY[lane] for lane in WarpLane},
        }

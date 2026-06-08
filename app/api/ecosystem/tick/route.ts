/**
 * /api/ecosystem/tick
 *   GET  → trigger a fresh tick (returns full result)
 *   POST → trigger + optionally start the autonomous loop
 *
 * The autonomous loop normally starts on app boot via instrumentation.ts;
 * these routes let you re-trigger or restart it manually.
 */

import { NextRequest, NextResponse } from "next/server";

import {
  runTick,
  startAutonomousLoop,
  stopAutonomousLoop,
  loopRunning,
  getLastTick,
} from "@/lib/ecosystem/autonomous-tick";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const tick = await runTick();
  return NextResponse.json({
    loop_running: loopRunning(),
    tick,
    // Expose v5 data at top level for convenience
    saib_v5: tick.saib_v5,
  });
}

export async function POST(req: NextRequest) {
  let body: { action?: string; interval_ms?: number } = {};
  try { body = await req.json(); } catch { /* empty body is fine */ }

  if (body.action === "stop") {
    const stopped = stopAutonomousLoop();
    return NextResponse.json({ stopped, loop_running: loopRunning(), last: getLastTick() });
  }

  if (body.action === "start") {
    const started = startAutonomousLoop(body.interval_ms ?? 30_000);
    return NextResponse.json({ started, loop_running: loopRunning(), last: getLastTick() });
  }

  // default: run a single tick on demand
  const tick = await runTick();
  return NextResponse.json({ loop_running: loopRunning(), tick });
}

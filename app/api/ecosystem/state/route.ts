/**
 * GET /api/ecosystem/state
 *
 * Returns the latest cached autonomous-tick result without re-probing.
 * The autonomous loop runs every 30s on app boot via instrumentation.ts,
 * so this endpoint is the cheap, always-fresh "are we alive?" view.
 */

import { NextResponse } from "next/server";

import { getLastTick, loopRunning, runTick } from "@/lib/ecosystem/autonomous-tick";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  let last = getLastTick();
  // first request after boot before the loop fires — do a one-shot
  if (!last) last = await runTick();
  return NextResponse.json({
    loop_running: loopRunning(),
    last,
  });
}

/**
 * GCV 30-Year Sustainability API
 * ──────────────────────────────
 * GET  /api/saib/gcv/sustainability?total_pi=1000
 * POST /api/saib/gcv/sustainability  { total_pi, spent_pi?, spent_today_pi?, offered_pi }
 *
 * Enforces the founder's multi-decade vision: no actor should burn its Pi
 * principal in months. Used by chat, real-estate, tokenization, and the
 * hyper-mesh cortex action gate.
 */
import { NextResponse } from "next/server";
import {
  checkPace,
  checkTransaction,
  computeBudget,
  SUSTAINABILITY_HORIZON_YEARS,
} from "@/lib/saib/gcv-calculator";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const totalPi = url.searchParams.get("total_pi");
  const horizon = Number(url.searchParams.get("horizon_years") ?? SUSTAINABILITY_HORIZON_YEARS);
  if (!totalPi) {
    return NextResponse.json({ error: "total_pi required" }, { status: 400 });
  }
  const spentPi = url.searchParams.get("spent_pi");
  const ageSeconds = url.searchParams.get("age_seconds");
  const budget = computeBudget(totalPi, horizon);
  if (spentPi !== null && ageSeconds !== null) {
    return NextResponse.json({
      budget,
      pace: checkPace(totalPi, spentPi, Number(ageSeconds), horizon),
    });
  }
  return NextResponse.json({ budget });
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  const totalPi = body.total_pi as string | number | undefined;
  const offeredPi = body.offered_pi as string | number | undefined;
  if (totalPi === undefined || offeredPi === undefined) {
    return NextResponse.json(
      { error: "total_pi and offered_pi required" },
      { status: 400 },
    );
  }
  return NextResponse.json(
    checkTransaction({
      totalPi,
      offeredPi,
      spentPi: body.spent_pi as string | number | undefined,
      spentTodayPi: body.spent_today_pi as string | number | undefined,
      horizonYears: body.horizon_years as number | undefined,
    }),
  );
}

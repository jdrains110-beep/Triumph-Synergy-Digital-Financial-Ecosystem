/**
 * app/api/sovereign/ai-bot/loopholes/route.ts
 *
 * SAIB Loophole Registry Endpoint
 * GET  ?category=TAX|FAMILY|BUSINESS|...  → filtered or all loopholes
 * POST { loopholeIds[], piUid, piWallet }  → apply specific loopholes
 */

import { NextRequest, NextResponse } from "next/server";
import {
  saibEngine,
  SAIB_VERSION,
  APEX_SECURITY_LEVEL,
  SAIB_LOOPHOLES,
  SAIB_TOTAL_LOOPHOLES,
  SAIB_AUTO_APPLY_LOOPHOLES,
  SAIB_STACKABLE_LOOPHOLES,
  type SAIBLoopholeCategory,
} from "@/lib/programs/sovereign-ai-bot";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category") as SAIBLoopholeCategory | null;
  const autoOnly = searchParams.get("autoOnly") === "true";

  let loopholes = saibEngine.scanLoopholes(category ?? undefined);
  if (autoOnly) loopholes = loopholes.filter(l => l.autoApply);

  const byCategory = SAIB_LOOPHOLES.reduce<Record<string, number>>((acc, l) => {
    acc[l.category] = (acc[l.category] ?? 0) + 1;
    return acc;
  }, {});

  return NextResponse.json({
    success:          true,
    programId:        SAIB_VERSION,
    securityLevel:    APEX_SECURITY_LEVEL,
    loopholes,
    summary: {
      total:       SAIB_TOTAL_LOOPHOLES,
      autoApply:   SAIB_AUTO_APPLY_LOOPHOLES,
      stackable:   SAIB_STACKABLE_LOOPHOLES,
      byCategory,
      filtered:    loopholes.length,
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      loopholeIds: string[];
      piUid:       string;
      piWallet:    string;
    };

    const { loopholeIds, piUid, piWallet } = body;

    if (!loopholeIds?.length || !piUid || !piWallet) {
      return NextResponse.json(
        { success: false, error: "loopholeIds[], piUid, piWallet are required" },
        { status: 400 },
      );
    }

    const applied = SAIB_LOOPHOLES.filter(l => loopholeIds.includes(l.id));
    if (!applied.length) {
      return NextResponse.json(
        { success: false, error: "No valid loophole IDs found" },
        { status: 404 },
      );
    }

    const totalObliterationScore = Math.round(
      applied.reduce((sum, l) => sum + l.obliterationScore, 0) / applied.length,
    );

    // Queue and execute a loophole-scan task to record the application
    const task = saibEngine.queueTask({
      taskType:   "loophole-scan",
      platformId: "SAIB-INTERNAL",
      piUid,
      piWallet,
      payload: { loopholeIds, count: applied.length },
      priority: 2,
    });
    const executed = saibEngine.executeTask(task.taskId);

    return NextResponse.json({
      success:                true,
      programId:              SAIB_VERSION,
      securityLevel:          APEX_SECURITY_LEVEL,
      loopholesApplied:       applied,
      totalApplied:           applied.length,
      totalObliterationScore,
      executionTask:          executed,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: String(err) },
      { status: 500 },
    );
  }
}

/**
 * app/api/sovereign/ai-bot/execute/route.ts
 *
 * SAIB Task Execution Endpoint
 * POST → queue + immediately execute a sovereign bot task
 * GET  → return current execution stats
 */

import { NextRequest, NextResponse } from "next/server";
import {
  saibEngine,
  SAIB_VERSION,
  APEX_SECURITY_LEVEL,
  type SAIBTaskType,
  type PlatformId,
} from "@/lib/programs/sovereign-ai-bot";

export const dynamic = "force-dynamic";

export async function GET() {
  const stats = saibEngine.getStats();
  return NextResponse.json({
    success:       true,
    programId:     SAIB_VERSION,
    securityLevel: APEX_SECURITY_LEVEL,
    stats,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      taskType:    SAIBTaskType;
      platformId?: PlatformId | "SAIB-INTERNAL";
      piUid:       string;
      piWallet:    string;
      payload?:    Record<string, unknown>;
      priority?:   1 | 2 | 3 | 4 | 5;
    };

    const { taskType, piUid, piWallet } = body;

    if (!taskType || !piUid || !piWallet) {
      return NextResponse.json(
        { success: false, error: "taskType, piUid, and piWallet are required" },
        { status: 400 },
      );
    }

    const task = saibEngine.queueTask({
      taskType,
      platformId: body.platformId ?? "SAIB-INTERNAL",
      piUid,
      piWallet,
      payload:    body.payload ?? {},
      priority:   body.priority,
    });

    // Immediately execute in autonomous mode
    const executed = saibEngine.executeTask(task.taskId);
    const stats    = saibEngine.getStats();

    return NextResponse.json({
      success:       true,
      programId:     SAIB_VERSION,
      securityLevel: APEX_SECURITY_LEVEL,
      task:          executed,
      stats: {
        totalTasksRun:         stats.totalTasksRun,
        totalLoopholesApplied: stats.totalLoopholesApplied,
        totalUsdSaved:         stats.totalUsdSaved,
        quantumOpsCount:       stats.quantumOpsCount,
      },
      piEconomics:  stats.piEconomics,
      loopholeCount: stats.autoApplyLoopholes,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: String(err) },
      { status: 500 },
    );
  }
}

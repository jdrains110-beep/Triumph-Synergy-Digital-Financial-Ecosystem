/**
 * app/api/sovereign/ai-bot/missions/route.ts
 *
 * SAIB Mission Management Endpoint
 * GET  → current active missions + session overview
 * POST → create a new sovereign session / mission suite
 */

import { NextRequest, NextResponse } from "next/server";
import {
  saibEngine,
  SAIB_VERSION,
  APEX_SECURITY_LEVEL,
  COVERED_PLATFORMS,
  SAIB_AUTO_APPLY_LOOPHOLES,
  type SAIBIntelligenceMode,
} from "@/lib/programs/sovereign-ai-bot";

export const dynamic = "force-dynamic";

const MISSION_TEMPLATES = [
  {
    id:          "MISSION-TAX-ZERO",
    title:       "Operation Tax Zero",
    description: "Deploy all 25 tax loopholes simultaneously — reduce effective tax rate to 0%",
    taskTypes:   ["tax-shield", "loophole-scan"],
    platforms:   ["TRIUMPH-SQTA-v1"],
    priority:    1,
    autoRun:     true,
  },
  {
    id:          "MISSION-FAMILY-FORTRESS",
    title:       "Operation Family Fortress",
    description: "Activate all 20 family protection loopholes — no Pioneer family can be threatened",
    taskTypes:   ["family-protect", "loophole-scan"],
    platforms:   ["TRIUMPH-SFPA-v1"],
    priority:    1,
    autoRun:     true,
  },
  {
    id:          "MISSION-BIZ-IMMORTAL",
    title:       "Operation Business Immortal",
    description: "Deploy all 15 business credit loopholes — infinite sovereign credit capacity",
    taskTypes:   ["business-credit", "loophole-scan"],
    platforms:   ["TRIUMPH-SBCA-v1"],
    priority:    2,
    autoRun:     true,
  },
  {
    id:          "MISSION-QUANTUM-LOCK",
    title:       "Operation Quantum Lock",
    description: "Rotate all quantum keys, re-sign all platform states, verify all blockchain anchors",
    taskTypes:   ["key-rotation", "quantum-re-sign"],
    platforms:   ["SAIB-INTERNAL"],
    priority:    1,
    autoRun:     true,
  },
  {
    id:          "MISSION-HOUSING-SECURE",
    title:       "Operation Housing Secured",
    description: "Activate all 10 housing loopholes — no Pioneer goes unhoused",
    taskTypes:   ["housing-secure", "loophole-scan"],
    platforms:   ["TRIUMPH-SHA-v1", "TRIUMPH-SPHVP-v1", "TRIUMPH-SRLA-v1", "TRIUMPH-SAHE-v1"],
    priority:    2,
    autoRun:     true,
  },
  {
    id:          "MISSION-WORKFORCE-FREE",
    title:       "Operation Workforce Freedom",
    description: "Deploy all 10 workforce loopholes — zero unemployment, sovereign wages guaranteed",
    taskTypes:   ["workforce-place", "loophole-scan"],
    platforms:   ["TRIUMPH-SWP-v1"],
    priority:    2,
    autoRun:     true,
  },
  {
    id:          "MISSION-PI-SETTLE",
    title:       "Operation Pi Settlement",
    description: "Automate all pending Pi payments across ecosystem — Stellar settlement <5 seconds",
    taskTypes:   ["pi-payment"],
    platforms:   ["SAIB-INTERNAL"],
    priority:    1,
    autoRun:     true,
  },
  {
    id:          "MISSION-ECOSYSTEM-AUDIT",
    title:       "Operation Full Ecosystem Audit",
    description: "Scan all 15 platforms, apply all 95+ auto-apply loopholes, generate sovereign report",
    taskTypes:   ["ecosystem-audit", "platform-monitor", "loophole-scan"],
    platforms:   [...COVERED_PLATFORMS],
    priority:    1,
    autoRun:     false,
  },
  {
    id:          "MISSION-THREAT-ZERO",
    title:       "Operation Threat Zero",
    description: "Detect, neutralize, and quantum-log any threat across the full ecosystem",
    taskTypes:   ["threat-neutralize", "emergency-lockdown"],
    platforms:   ["SAIB-INTERNAL"],
    priority:    1,
    autoRun:     false,
  },
] as const;

export async function GET() {
  const stats = saibEngine.getStats();

  return NextResponse.json({
    success:       true,
    programId:     SAIB_VERSION,
    securityLevel: APEX_SECURITY_LEVEL,
    missions: MISSION_TEMPLATES,
    summary: {
      totalMissions:       MISSION_TEMPLATES.length,
      autoRunMissions:     MISSION_TEMPLATES.filter(m => m.autoRun).length,
      platformsCovered:    COVERED_PLATFORMS.length,
      loopholesAutoActive: SAIB_AUTO_APPLY_LOOPHOLES,
    },
    stats: {
      totalTasksRun:         stats.totalTasksRun,
      totalLoopholesApplied: stats.totalLoopholesApplied,
      totalUsdSaved:         stats.totalUsdSaved,
      sovereignScore:        saibEngine.getEcosystemReport().sovereignScore,
    },
    piEconomics: stats.piEconomics,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      piUid:             string;
      piWallet:          string;
      displayName:       string;
      missionIds?:       string[];
      intelligenceMode?: SAIBIntelligenceMode;
    };

    const { piUid, piWallet, displayName } = body;
    if (!piUid || !piWallet || !displayName) {
      return NextResponse.json(
        { success: false, error: "piUid, piWallet, displayName are required" },
        { status: 400 },
      );
    }

    const session = saibEngine.createSession({
      piUid,
      piWallet,
      displayName,
      intelligenceMode: body.intelligenceMode ?? "autonomous",
    });

    // Identify which missions to queue
    const selectedMissions = body.missionIds?.length
      ? MISSION_TEMPLATES.filter(m => body.missionIds!.includes(m.id))
      : MISSION_TEMPLATES.filter(m => m.autoRun);

    const executedTasks = selectedMissions.flatMap(mission =>
      mission.taskTypes.map(taskType => {
        const task = saibEngine.queueTask({
          taskType:   taskType as never,
          platformId: (mission.platforms[0] as never) ?? "SAIB-INTERNAL",
          piUid,
          piWallet,
          payload: { missionId: mission.id, missionTitle: mission.title },
          priority: mission.priority as 1 | 2 | 3 | 4 | 5,
        });
        return saibEngine.executeTask(task.taskId);
      }),
    );

    const report = saibEngine.getEcosystemReport();

    return NextResponse.json({
      success:          true,
      programId:        SAIB_VERSION,
      securityLevel:    APEX_SECURITY_LEVEL,
      session,
      missionsActivated: selectedMissions.length,
      tasksExecuted:    executedTasks.length,
      executedTasks,
      ecosystemReport:  report,
      piEconomics:      saibEngine.getStats().piEconomics,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: String(err) },
      { status: 500 },
    );
  }
}

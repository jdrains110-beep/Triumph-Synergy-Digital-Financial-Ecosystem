/**
 * app/api/sovereign/ai-bot/scan/route.ts
 *
 * SAIB Ecosystem Security Scan Endpoint
 * GET  → run full ecosystem health scan
 * POST { piUid, piWallet, platforms? } → targeted scan + report
 */

import { NextRequest, NextResponse } from "next/server";
import {
  saibEngine,
  SAIB_VERSION,
  APEX_SECURITY_LEVEL,
  COVERED_PLATFORMS,
  QUANTUM_ALGO_SIG,
  QUANTUM_ALGO_ENC,
  QUANTUM_ALGO_HASH,
  SOVEREIGN_ANCHOR,
  type PlatformId,
} from "@/lib/programs/sovereign-ai-bot";

export const dynamic = "force-dynamic";

export async function GET() {
  const report = saibEngine.getEcosystemReport();
  const stats  = saibEngine.getStats();

  return NextResponse.json({
    success:       true,
    programId:     SAIB_VERSION,
    securityLevel: APEX_SECURITY_LEVEL,
    report,
    quantumStack: {
      signature:  QUANTUM_ALGO_SIG,
      encryption: QUANTUM_ALGO_ENC,
      hashing:    QUANTUM_ALGO_HASH,
      anchor:     SOVEREIGN_ANCHOR,
    },
    piEconomics: stats.piEconomics,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      piUid:      string;
      piWallet:   string;
      platforms?: PlatformId[];
    };

    const { piUid, piWallet } = body;
    if (!piUid || !piWallet) {
      return NextResponse.json(
        { success: false, error: "piUid and piWallet are required" },
        { status: 400 },
      );
    }

    const targetPlatforms = body.platforms ?? [...COVERED_PLATFORMS];

    // Queue and execute ecosystem-audit task
    const task = saibEngine.queueTask({
      taskType:   "ecosystem-audit",
      platformId: "SAIB-INTERNAL",
      piUid,
      piWallet,
      payload: { platforms: targetPlatforms, scanDepth: "full" },
      priority: 1,
    });
    const executed = saibEngine.executeTask(task.taskId);
    const report   = saibEngine.getEcosystemReport();

    // Raise info alert for completed scan
    const alert = saibEngine.raiseAlert({
      severity:   "info",
      platformId: "ECOSYSTEM",
      title:      "Ecosystem Scan Complete",
      detail:     `Full SAIB scan of ${targetPlatforms.length} platforms completed — all systems sovereign`,
      taskId:     executed.taskId,
    });

    return NextResponse.json({
      success:          true,
      programId:        SAIB_VERSION,
      securityLevel:    APEX_SECURITY_LEVEL,
      report,
      executionTask:    executed,
      alert,
      platformsScanned: targetPlatforms.length,
      quantumStack: {
        signature:  QUANTUM_ALGO_SIG,
        encryption: QUANTUM_ALGO_ENC,
        hashing:    QUANTUM_ALGO_HASH,
        anchor:     SOVEREIGN_ANCHOR,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: String(err) },
      { status: 500 },
    );
  }
}

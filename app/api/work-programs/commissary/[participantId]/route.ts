/**
 * GET /api/work-programs/commissary/[participantId]
 * Get commissary account balance and transaction history for an inmate participant.
 *
 * POST /api/work-programs/commissary/[participantId]
 * Credit the commissary account (called by task-verification engine).
 */

import { NextRequest, NextResponse } from "next/server";
import {
  sovereignWorkEngine,
  type CommissaryAccount,
  COMMISSARY_PI_CAP,
  PI_WORK_RATE_EXTERNAL,
  SOVEREIGN_PROGRAM_ID,
} from "@/lib/programs/sovereign-work-program";

// ── GET — account balance + history ───────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ participantId: string }> }
) {
  const { participantId } = await params;

  const account = buildDemoAccount(participantId);

  return NextResponse.json({
    success: true,
    programId: SOVEREIGN_PROGRAM_ID,
    account,
    piRate: PI_WORK_RATE_EXTERNAL,
    capPi: COMMISSARY_PI_CAP,
    summary: {
      balancePi: account.piBalance,
      balanceUsd: account.usdEquivalent,
      spaceRemainingPi: Math.max(0, COMMISSARY_PI_CAP - account.piBalance),
      recentTransactions: account.transactions.slice(-10),
    },
  });
}

// ── POST — credit commissary ───────────────────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ participantId: string }> }
) {
  const { participantId } = await params;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const { piAmount, taskId } = body as { piAmount: number; taskId: string };

  if (!piAmount || piAmount <= 0 || !taskId) {
    return NextResponse.json(
      { success: false, error: "Missing required fields: piAmount (>0), taskId" },
      { status: 400 }
    );
  }

  const account = buildDemoAccount(participantId);
  const updated = sovereignWorkEngine.creditCommissary(account, piAmount, taskId);

  return NextResponse.json({
    success: true,
    programId: SOVEREIGN_PROGRAM_ID,
    participantId,
    credited: {
      requestedPi: piAmount,
      actualCreditedPi: updated.piBalance - account.piBalance,
      newBalancePi: updated.piBalance,
      newBalanceUsd: updated.usdEquivalent,
      capPi: COMMISSARY_PI_CAP,
      cappedExcess: Math.max(0, piAmount - (updated.piBalance - account.piBalance)),
    },
    latestTransaction: updated.transactions[updated.transactions.length - 1],
  });
}

// ── Demo account builder ───────────────────────────────────────────────────────

function buildDemoAccount(participantId: string): CommissaryAccount {
  return {
    id: `COMM-${participantId}`,
    inmateId: participantId,
    facilityId: "TX-STATE-001",
    piBalance: 12.5,
    usdEquivalent: 12.5 * PI_WORK_RATE_EXTERNAL,
    linkedPiWallet: undefined,
    lastUpdated: new Date().toISOString(),
    transactions: [
      {
        id: "COMM-TX-DEMO-001",
        accountId: `COMM-${participantId}`,
        type: "work-credit",
        amountPi: 0.5,
        amountUsd: 0.5 * PI_WORK_RATE_EXTERNAL,
        taskId: "SWP-T-DEMO-001",
        note: "Work task completion credit — task SWP-T-DEMO-001",
        timestamp: new Date(Date.now() - 86_400_000).toISOString(),
      },
      {
        id: "COMM-TX-DEMO-002",
        accountId: `COMM-${participantId}`,
        type: "work-credit",
        amountPi: 1.0,
        amountUsd: 1.0 * PI_WORK_RATE_EXTERNAL,
        taskId: "SWP-T-DEMO-002",
        note: "Work task completion credit — task SWP-T-DEMO-002",
        timestamp: new Date(Date.now() - 43_200_000).toISOString(),
      },
      {
        id: "COMM-TX-DEMO-003",
        accountId: `COMM-${participantId}`,
        type: "commissary-spend",
        amountPi: -0.2,
        amountUsd: -0.2 * PI_WORK_RATE_EXTERNAL,
        note: "Commissary purchase — hygiene items",
        timestamp: new Date(Date.now() - 7_200_000).toISOString(),
      },
    ],
  };
}

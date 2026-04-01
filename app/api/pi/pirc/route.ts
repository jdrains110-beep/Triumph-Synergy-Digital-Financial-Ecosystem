/**
 * PiRC API Route
 * Pi Request for Comments Protocol Integration
 * 
 * Endpoints:
 * GET  - Get PiRC status, launchpad projects, harmony state
 * POST - Start participation, allocation, or sync operations
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getActivePiRCSpec,
  getPiRCConfig,
  getLaunchpadSummary,
  startParticipationWindow,
  getParticipationWindow,
  startAllocationPeriod,
  getAllocationPeriod,
  getTGEState,
  calculatePiPower,
  calculateDesign1Allocation,
  calculateDesign2Allocation,
  initializePiRC,
} from "@/lib/pirc";
import {
  startProtocolSync,
  getSyncState,
  getHarmonyState,
  forceSync,
  getPendingUpgrades,
  getProtocolSyncStatus,
  isSystemHarmonized,
} from "@/lib/pirc/protocol-sync";
import { getPiNodeRegistry, getPiNodeSummary } from "@/lib/pi-node/registry";

// ============================================================================
// GET: Retrieve PiRC Status
// ============================================================================

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action") || "status";
  const projectId = searchParams.get("projectId");

  try {
    switch (action) {
      case "status": {
        const spec = getActivePiRCSpec();
        const config = getPiRCConfig();
        const syncStatus = getProtocolSyncStatus();
        const nodeRegistry = getPiNodeRegistry();
        const nodeSummary = getPiNodeSummary();

        return NextResponse.json({
          success: true,
          data: {
            piRC: {
              spec,
              network: config.network,
              supportedDesigns: config.supportedDesigns,
            },
            sync: {
              state: syncStatus.syncState,
              harmony: syncStatus.harmonyState,
              isHarmonized: isSystemHarmonized(),
              pendingUpgrades: syncStatus.pendingUpgrades.length,
            },
            nodes: {
              total: nodeSummary.total,
              supernodes: nodeSummary.supernodes,
              online: nodeSummary.online,
              health: nodeSummary.networkHealth,
            },
            launchpad: {
              projects: getLaunchpadSummary(),
            },
          },
          timestamp: new Date().toISOString(),
        });
      }

      case "harmony": {
        const harmony = getHarmonyState();
        const sync = getSyncState();

        return NextResponse.json({
          success: true,
          data: {
            harmony,
            sync,
            isHarmonized: isSystemHarmonized(),
            pendingUpgrades: getPendingUpgrades(),
          },
          timestamp: new Date().toISOString(),
        });
      }

      case "launchpad": {
        const projects = getLaunchpadSummary();

        return NextResponse.json({
          success: true,
          data: {
            projects,
            totalProjects: projects.length,
            activeProjects: projects.filter((p) => p.status === "live").length,
            totalValueLocked: projects.reduce((sum, p) => sum + p.lpDepth, 0),
          },
          timestamp: new Date().toISOString(),
        });
      }

      case "project": {
        if (!projectId) {
          return NextResponse.json(
            { success: false, error: "projectId required" },
            { status: 400 }
          );
        }

        const participation = getParticipationWindow(projectId);
        const allocation = getAllocationPeriod(projectId);
        const tge = getTGEState(projectId);

        return NextResponse.json({
          success: true,
          data: {
            projectId,
            participation,
            allocation,
            tge,
          },
          timestamp: new Date().toISOString(),
        });
      }

      case "pipower": {
        const stakedPi = Number(searchParams.get("stakedPi")) || 0;
        const totalStakedPi = Number(searchParams.get("totalStaked")) || 1000000;
        const tokensAvailable = Number(searchParams.get("tokens")) || 10000000;
        const hasLockup = searchParams.get("hasLockup") === "true";

        const piPower = calculatePiPower(stakedPi, totalStakedPi, tokensAvailable, hasLockup);

        return NextResponse.json({
          success: true,
          data: piPower,
          timestamp: new Date().toISOString(),
        });
      }

      case "allocation-preview": {
        const design = (searchParams.get("design") as "design1" | "design2") || "design1";
        const totalPi = Number(searchParams.get("totalPi")) || 1000000;
        const tokens = Number(searchParams.get("tokens")) || 10000000;

        const allocation = design === "design1"
          ? calculateDesign1Allocation(totalPi, tokens)
          : calculateDesign2Allocation(totalPi, tokens);

        return NextResponse.json({
          success: true,
          data: allocation,
          timestamp: new Date().toISOString(),
        });
      }

      case "upgrades": {
        return NextResponse.json({
          success: true,
          data: {
            pendingUpgrades: getPendingUpgrades(),
            syncStatus: getSyncState()?.syncStatus,
          },
          timestamp: new Date().toISOString(),
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("[PiRC API] GET error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST: PiRC Operations
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "initialize": {
        const { config } = body;
        initializePiRC(config);
        await startProtocolSync();

        return NextResponse.json({
          success: true,
          message: "PiRC initialized",
          data: {
            spec: getActivePiRCSpec(),
            config: getPiRCConfig(),
          },
          timestamp: new Date().toISOString(),
        });
      }

      case "start-sync": {
        await startProtocolSync();

        return NextResponse.json({
          success: true,
          message: "Protocol synchronization started",
          timestamp: new Date().toISOString(),
        });
      }

      case "force-sync": {
        const state = await forceSync();

        return NextResponse.json({
          success: true,
          message: "Force sync completed",
          data: state,
          timestamp: new Date().toISOString(),
        });
      }

      case "start-participation": {
        const { projectId, tokensAvailable, durationHours } = body;

        if (!projectId || !tokensAvailable || !durationHours) {
          return NextResponse.json(
            { success: false, error: "Missing required fields" },
            { status: 400 }
          );
        }

        const window = startParticipationWindow(projectId, tokensAvailable, durationHours);

        return NextResponse.json({
          success: true,
          message: "Participation window started",
          data: window,
          timestamp: new Date().toISOString(),
        });
      }

      case "start-allocation": {
        const { projectId, designType, totalCommittedPi, tokensAvailable, escrowWallet, lpAddress } = body;

        if (!projectId || !designType || !totalCommittedPi || !tokensAvailable) {
          return NextResponse.json(
            { success: false, error: "Missing required fields" },
            { status: 400 }
          );
        }

        const period = startAllocationPeriod(
          projectId,
          designType,
          totalCommittedPi,
          tokensAvailable,
          escrowWallet || "escrow-" + projectId,
          lpAddress || "lp-" + projectId
        );

        return NextResponse.json({
          success: true,
          message: "Allocation period started",
          data: period,
          timestamp: new Date().toISOString(),
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("[PiRC API] POST error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

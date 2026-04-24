/**
 * Network Status API Route
 * 
 * Unified endpoint showing complete network state:
 * - Pi Network nodes and supernodes
 * - Stellar SCP consensus status
 * - PiRC protocol harmony
 * - Cross-chain synchronization
 */

import { NextRequest, NextResponse } from "next/server";
import { getPiNodeRegistry, getPiNodeSummary } from "@/lib/pi-node/registry";
import { getSCPAutoUpdate } from "@/lib/stellar/scp-auto-update";
import { getActivePiRCSpec, getPiRCConfig, getLaunchpadSummary } from "@/lib/pirc";
import {
  getSyncState,
  getHarmonyState,
  isSystemHarmonized,
  getPendingUpgrades,
} from "@/lib/pirc/protocol-sync";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") || "full";

  try {
    // Gather all state
    const nodeRegistry = getPiNodeRegistry();
    const nodeSummary = getPiNodeSummary();
    const scpAutoUpdate = getSCPAutoUpdate();
    const scpState = scpAutoUpdate?.getState();
    const syncState = getSyncState();
    const harmonyState = getHarmonyState();
    const piRCSpec = getActivePiRCSpec();
    const piRCConfig = getPiRCConfig();
    const launchpadProjects = getLaunchpadSummary();
    const pendingUpgrades = getPendingUpgrades();

    // Quick summary format
    if (format === "summary") {
      return NextResponse.json({
        success: true,
        data: {
          network: piRCConfig.network,
          isHarmonized: isSystemHarmonized(),
          piNodes: nodeSummary.total,
          supernodes: nodeSummary.supernodes,
          stellarLedger: scpState?.latestLedger || 0,
          stellarProtocol: scpState?.protocolVersion || 0,
          piRCVersion: piRCSpec.version,
          health: nodeSummary.networkHealth,
          pendingUpgrades: pendingUpgrades.length,
        },
        timestamp: new Date().toISOString(),
      });
    }

    // Full detailed response
    const response = {
      success: true,
      data: {
        // Pi Network Layer
        piNetwork: {
          registry: {
            rootPublicKey: nodeRegistry.rootPublicKey,
            ports: nodeRegistry.ports,
            totalNodes: nodeRegistry.nodes.length,
            totalSupernodes: nodeRegistry.supernodes.length,
          },
          stats: nodeRegistry.networkStats,
          summary: nodeSummary,
          nodes: format === "detailed" ? nodeRegistry.nodes : undefined,
          supernodes: format === "detailed" ? nodeRegistry.supernodes : undefined,
        },

        // Stellar Consensus Protocol Layer
        stellar: {
          connected: !!scpState,
          state: scpState ? {
            latestLedger: scpState.latestLedger,
            ledgerCloseTime: scpState.ledgerCloseTime,
            protocolVersion: scpState.protocolVersion,
            currentPhase: scpState.currentPhase,
            coreVersion: scpState.coreVersion,
            networkPassphrase: scpState.networkPassphrase?.substring(0, 20) + "...",
            validators: scpState.validators?.length || 0,
            lastUpdated: scpState.lastUpdated,
          } : null,
        },

        // PiRC Protocol Layer
        piRC: {
          spec: piRCSpec,
          config: {
            network: piRCConfig.network,
            autoSync: piRCConfig.autoSync,
            supportedDesigns: piRCConfig.supportedDesigns,
          },
          launchpad: {
            totalProjects: launchpadProjects.length,
            activeProjects: launchpadProjects.filter(p => p.status === "live").length,
            totalValueLocked: launchpadProjects.reduce((sum, p) => sum + p.lpDepth, 0),
            projects: format === "detailed" ? launchpadProjects : undefined,
          },
        },

        // Protocol Synchronization
        sync: {
          state: syncState,
          status: syncState?.syncStatus || "unknown",
          lastSync: syncState?.lastSync,
          pendingUpgrades: pendingUpgrades.length,
          upgradeDetails: format === "detailed" ? pendingUpgrades : undefined,
        },

        // Harmony Status (Cross-Protocol)
        harmony: {
          isHarmonized: isSystemHarmonized(),
          state: harmonyState,
          divergences: harmonyState?.ecosystem.divergences || [],
        },

        // Integration Points
        integrations: {
          piSDK: {
            version: "2.0",
            url: "https://sdk.minepi.com/pi-sdk.js",
            initialized: true,
          },
          stellarHorizon: {
            url: piRCConfig.horizonUrl,
            connected: !!scpState,
          },
          piNetworkAPI: {
            url: piRCConfig.piNetworkApiUrl,
            connected: true,
          },
        },

        // API Endpoints (for reference)
        endpoints: {
          piRC: "/api/pi/pirc",
          nodeRegistry: "/api/pi/node/registry",
          payments: "/api/pi/payment",
          verification: "/api/pi/verify",
          networkStatus: "/api/pi/network",
        },
      },
      timestamp: new Date().toISOString(),
      version: "2.0.0",
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[Network API] Error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch network status",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function HEAD() {
  const isHarmonized = isSystemHarmonized();
  return new NextResponse(null, {
    status: isHarmonized ? 200 : 503,
    headers: {
      "X-Harmony-Status": isHarmonized ? "harmonized" : "syncing",
      "X-Timestamp": new Date().toISOString(),
    },
  });
}

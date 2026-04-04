/**
 * Network Monitoring Dashboard API
 * 
 * Central hub for:
 * - Account integrity monitoring
 * - Network health and threat detection
 * - Pi origin tracking and segregation
 * - Self-contained Pi Network status
 * - Real-time security metrics
 */

import { NextRequest, NextResponse } from "next/server";
import { accountFusionSystem } from "@/lib/identity/account-fusion";
import { networkMonitor } from "@/lib/network/network-monitor";
import { piOriginTracker } from "@/lib/tokens/pi-origin-tracking";
import { selfContainedPiNetwork } from "@/lib/pi-network/self-contained-pi";

// ============================================================================
// GET Endpoints - Read-only monitoring
// ============================================================================

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const dashboard = searchParams.get("dashboard");
  const accountId = searchParams.get("accountId");

  try {
    // System Health Dashboard
    if (dashboard === "health") {
      const networkHealth = networkMonitor.calculateNetworkHealth();
      const accountStats = accountFusionSystem.getStatistics();
      const piStats = piOriginTracker.getStatistics();
      const piNetworkState = selfContainedPiNetwork.getNetworkState();

      return NextResponse.json(
        {
          timestamp: new Date().toISOString(),
          overview: {
            networkHealth,
            totalAccounts: accountStats.totalAccounts,
            flaggedAccounts: accountStats.flaggedAccounts,
            activeThreats: networkMonitor.getActiveThreats().length,
          },
          blockchain: {
            chainId: piNetworkState.chainId,
            latestBlock: piNetworkState.latestBlockNumber,
            activeValidators: piNetworkState.activeValidators,
            gasPrice: piNetworkState.gasPrice,
          },
          piDistribution: {
            totalInternal: piStats.totalInternalPi,
            totalExternal: piStats.totalExternalPi,
            internalUnits: piStats.internalCount,
            externalUnits: piStats.externalCount,
            accountsWithMixing: piStats.accountsWithMixing,
          },
          threats: {
            critical: networkMonitor.getThreatsByLevel("critical").length,
            high: networkMonitor.getThreatsByLevel("high").length,
            medium: networkMonitor.getThreatsByLevel("medium").length,
            low: networkMonitor.getThreatsByLevel("low").length,
          },
        },
        { status: 200 }
      );
    }

    // Account Verification Status
    if (dashboard === "accounts") {
      return NextResponse.json(
        {
          message: "Account verification system active",
          stats: accountFusionSystem.getStatistics(),
          verificationMethods: {
            biometric: ["facial", "fingerprint", "iris", "voice"],
            documents: ["passport", "driver_license", "id_card", "birth_certificate"],
            kyc: ["level1", "level2", "level3"],
          },
        },
        { status: 200 }
      );
    }

    // Network Threats
    if (dashboard === "threats") {
      const activeThreats = networkMonitor.getActiveThreats();
      return NextResponse.json(
        {
          activeThreats: activeThreats.map(t => ({
            id: t.id,
            type: t.type,
            level: t.level,
            status: t.status,
            affectedAccounts: t.accountIds.length,
            detectedAt: new Date(t.detectedAt).toISOString(),
          })),
          networkHealth: networkMonitor.calculateNetworkHealth(),
        },
        { status: 200 }
      );
    }

    // Pi Origin Tracking
    if (dashboard === "pi-origins") {
      const stats = piOriginTracker.getStatistics();
      return NextResponse.json(
        {
          piDistribution: {
            internal: {
              total: stats.totalInternalPi,
              units: stats.internalCount,
              origin: "mined/contributed (priority, internal value)",
              trustLevel: "high",
            },
            external: {
              total: stats.totalExternalPi,
              units: stats.externalCount,
              origin: "CEX-bought (lower value, separate API)",
              trustLevel: "medium",
            },
            segregationCompliance: {
              accountsWithMixing: stats.accountsWithMixing,
              status: stats.accountsWithMixing === 0 ? "compliant" : "non-compliant",
            },
          },
        },
        { status: 200 }
      );
    }

    // Self-Contained Pi Network Status
    if (dashboard === "pi-network") {
      const state = selfContainedPiNetwork.getNetworkState();
      return NextResponse.json(
        {
          piNetworkStatus: {
            chainId: state.chainId,
            status: "operational",
            latestBlock: state.latestBlockNumber,
            blockHash: state.latestBlockHash,
            totalSupply: state.totalSupply,
            activeValidators: state.activeValidators,
            consensusAlgorithm: "PBFT (Practical Byzantine Fault Tolerance)",
            selfContained: true,
            externalDependency: "none",
          },
        },
        { status: 200 }
      );
    }

    // Specific Account Details (with authorization)
    if (dashboard === "account" && accountId) {
      // In production, verify requester has permission
      return NextResponse.json(
        {
          message: `Account details for ${accountId}`,
          piPool: piOriginTracker.getAccountPool(accountId),
          // Additional account-specific data
        },
        { status: 200 }
      );
    }

    // Real-time Snapshot
    if (dashboard === "snapshot") {
      return NextResponse.json(
        {
          timestamp: new Date().toISOString(),
          snapshot: networkMonitor.getLatestSnapshot(),
          networkHealth: networkMonitor.calculateNetworkHealth(),
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        error: "Invalid dashboard parameter",
        availableDashboards: [
          "health",
          "accounts",
          "threats",
          "pi-origins",
          "pi-network",
          "account",
          "snapshot",
        ],
      },
      { status: 400 }
    );
  } catch (error) {
    console.error("Dashboard error:", error);
    return NextResponse.json(
      {
        error: "Dashboard error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST Endpoints - Actions and reports
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = body.action;

    // Report Threat
    if (action === "report_threat") {
      const { threatId, status, notes } = body;
      await networkMonitor.reportThreat(threatId, status);
      return NextResponse.json(
        {
          success: true,
          message: `Threat ${threatId} reported as ${status}`,
        },
        { status: 200 }
      );
    }

    // Verify External Pi
    if (action === "verify_external_pi") {
      const { piUnitId, exchangeProof } = body;
      const verified = await piOriginTracker.verifyExternalPi(piUnitId, exchangeProof);
      return NextResponse.json(
        {
          success: verified,
          message: verified ? "External Pi verified" : "Verification failed",
        },
        { status: 200 }
      );
    }

    // Register Validator
    if (action === "register_validator") {
      const { validatorAddress } = body;
      selfContainedPiNetwork.registerValidator(validatorAddress);
      return NextResponse.json(
        {
          success: true,
          message: `Validator registered: ${validatorAddress}`,
        },
        { status: 200 }
      );
    }

    // Submit Transaction
    if (action === "submit_transaction") {
      const tx = body.transaction;
      const result = await selfContainedPiNetwork.submitTransaction(tx);
      return NextResponse.json(
        {
          success: result.success,
          transactionHash: result.hash,
        },
        { status: 200 }
      );
    }

    // Execute Mining
    if (action === "execute_mining") {
      const { minerAddress } = body;
      const block = await selfContainedPiNetwork.executeMining(minerAddress);
      return NextResponse.json(
        {
          success: true,
          block: {
            number: block.number,
            hash: block.hash,
            timestamp: block.timestamp,
            miner: block.miner,
          },
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        error: "Invalid action",
        availableActions: [
          "report_threat",
          "verify_external_pi",
          "register_validator",
          "submit_transaction",
          "execute_mining",
        ],
      },
      { status: 400 }
    );
  } catch (error) {
    console.error("Action error:", error);
    return NextResponse.json(
      {
        error: "Action failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// PUT Endpoints - Updates and modifications
// ============================================================================

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const operation = body.operation;

    // Link Device to Account
    if (operation === "link_device") {
      const { accountId, device, biometricVerification } = body;
      const updatedAccount = await accountFusionSystem.linkDevice(
        accountId,
        device,
        biometricVerification
      );
      return NextResponse.json(
        {
          success: true,
          message: "Device linked successfully",
          deviceCount: updatedAccount.devices.length,
        },
        { status: 200 }
      );
    }

    // Link Pi Address
    if (operation === "link_pi_address") {
      const { accountId, piAddress, biometricVerification } = body;
      accountFusionSystem.linkPiAddress(accountId, piAddress, biometricVerification);
      return NextResponse.json(
        {
          success: true,
          message: "Pi address linked successfully",
        },
        { status: 200 }
      );
    }

    // Transfer Pi
    if (operation === "transfer_pi") {
      const { piUnitId, fromAccount, toAccount } = body;
      await piOriginTracker.transferPi(piUnitId, fromAccount, toAccount);
      return NextResponse.json(
        {
          success: true,
          message: "Pi transferred successfully",
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { error: "Invalid operation" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Operation error:", error);
    return NextResponse.json(
      {
        error: "Operation failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  return NextResponse.json(
    { error: "DELETE not supported" },
    { status: 405 }
  );
}

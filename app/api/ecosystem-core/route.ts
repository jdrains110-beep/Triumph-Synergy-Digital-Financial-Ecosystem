/**
 * Ecosystem Core API
 * 
 * RESTful API for the Triumph-Synergy Ecosystem Core
 * Powered by Pi Network Blockchain
 */

import { NextRequest, NextResponse } from "next/server";

import {
  getEcosystemStatus,
  dockerAutoUpgrade,
  githubCodifier,
  physicalDigitalBridge,
  connectionOverflowHub,
  immutableEcosystem,
  mlEvolvingEcosystem,
  economicProtection,
} from "@/lib/ecosystem-core";

// =============================================================================
// GET - Ecosystem Status
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const system = searchParams.get("system");
    
    if (!system) {
      // Return complete ecosystem status
      const status = getEcosystemStatus();
      return NextResponse.json({
        success: true,
        data: status,
        message: "Triumph-Synergy Ecosystem - Powered by Pi Network",
      });
    }
    
    // Return specific system status
    switch (system) {
      case "docker":
        return NextResponse.json({
          success: true,
          data: dockerAutoUpgradeManager.getStatistics(),
          system: "Docker Auto-Upgrade",
        });
        
      case "codifier":
        return NextResponse.json({
          success: true,
          data: gitHubCodifier.getStatistics(),
          system: "GitHub Codifier (RBAC)",
        });
        
      case "physical-digital":
        return NextResponse.json({
          success: true,
          data: physicalDigitalBridge.getStatistics(),
          system: "Physical-Digital Bridge",
        });
        
      case "connections":
        return NextResponse.json({
          success: true,
          data: connectionOverflowHub.getStatistics(),
          system: "Connection Overflow Hub",
        });
        
      case "immutable":
        return NextResponse.json({
          success: true,
          data: immutableEcosystem.getStatistics(),
          system: "Immutable Ecosystem Protection",
        });
        
      case "ml":
        return NextResponse.json({
          success: true,
          data: mlEvolvingEcosystem.getStatistics(),
          system: "ML Self-Evolving Ecosystem",
        });
        
      case "economic":
        return NextResponse.json({
          success: true,
          data: economicProtection.getStatistics(),
          system: "Economic Protection System",
          paymentRules: {
            piNetwork: "90% (PRIMARY)",
            utilityTokens: "5% (pegged to Pi)",
            utilityCrypto: "5% (real-world backed)",
          },
          eliminates: ["meme-coins", "rugpulls", "market-manipulation", "hoarding"],
        });
        
      default:
        return NextResponse.json({
          success: false,
          error: "Unknown system",
          availableSystems: ["docker", "codifier", "physical-digital", "connections", "immutable", "ml", "economic"],
        }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}

// =============================================================================
// POST - Ecosystem Actions
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, system, params, userId } = body;
    
    if (!action || !system) {
      return NextResponse.json({
        success: false,
        error: "Missing required fields: action and system",
      }, { status: 400 });
    }
    
    // Verify user authorization (simplified)
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: "Authentication required",
      }, { status: 401 });
    }
    
    // Route to appropriate system
    let result: unknown;
    
    switch (system) {
      // =====================================================================
      // Docker Auto-Upgrade Actions
      // =====================================================================
      case "docker":
        switch (action) {
          case "check-upgrades":
            result = await dockerAutoUpgradeManager.checkForUpgrades();
            break;
          case "approve-upgrade":
            result = dockerAutoUpgradeManager.approveUpgrade(
              params.upgradeId,
              params.approverId,
              params.level
            );
            break;
          default:
            throw new Error(`Unknown docker action: ${action}`);
        }
        break;
      
      // =====================================================================
      // GitHub Codifier Actions
      // =====================================================================
      case "codifier":
        switch (action) {
          case "register-user":
            result = gitHubCodifier.registerUser(
              params.userId,
              params.email,
              params.name,
              params.role,
              params.piWallet
            );
            break;
          case "promote-user":
            result = gitHubCodifier.promoteUser(
              params.userId,
              params.newRole,
              params.promoterId
            );
            break;
          case "submit-change":
            result = gitHubCodifier.submitCodeChange(params);
            break;
          case "review-change":
            result = gitHubCodifier.reviewCodeChange(
              params.changeId,
              params.reviewerId,
              params.approved,
              params.comments
            );
            break;
          case "owner-override":
            result = await gitHubCodifier.ownerOverride(
              params.targetId,
              userId,
              params.decision,
              params.reason
            );
            break;
          default:
            throw new Error(`Unknown codifier action: ${action}`);
        }
        break;
      
      // =====================================================================
      // Physical-Digital Bridge Actions
      // =====================================================================
      case "physical-digital":
        switch (action) {
          case "register-asset":
            result = physicalDigitalBridge.registerAsset(params);
            break;
          case "tokenize-asset":
            result = physicalDigitalBridge.tokenizeAsset(
              params.assetId,
              params.standard,
              params.metadata
            );
            break;
          case "register-device":
            result = physicalDigitalBridge.registerDevice(params);
            break;
          case "create-twin":
            result = physicalDigitalBridge.createDigitalTwin(params);
            break;
          case "create-identity":
            result = physicalDigitalBridge.createPhysicalIdentity(params);
            break;
          default:
            throw new Error(`Unknown physical-digital action: ${action}`);
        }
        break;
      
      // =====================================================================
      // Connection Overflow Hub Actions
      // =====================================================================
      case "connections":
        switch (action) {
          case "register-endpoint":
            result = connectionOverflowHub.registerEndpoint(params);
            break;
          case "establish-connection":
            result = connectionOverflowHub.establishConnection(params);
            break;
          case "create-bridge":
            result = connectionOverflowHub.createBridge(params);
            break;
          case "create-route":
            result = connectionOverflowHub.createRoute(params);
            break;
          case "create-pool":
            result = connectionOverflowHub.createOverflowPool(params);
            break;
          default:
            throw new Error(`Unknown connections action: ${action}`);
        }
        break;
      
      // =====================================================================
      // Immutable Ecosystem Actions
      // =====================================================================
      case "immutable":
        switch (action) {
          case "set-owner-key":
            immutableEcosystem.setOwnerKey(params.publicKey);
            result = { success: true, message: "Owner key set (irreversible)" };
            break;
          case "register-asset":
            result = immutableEcosystem.registerAsset(params);
            break;
          case "verify-asset":
            result = immutableEcosystem.verifyAsset(params.assetId, params.content);
            break;
          case "request-change":
            result = immutableEcosystem.requestChange(params);
            break;
          case "sign-change":
            result = immutableEcosystem.signChangeRequest(params);
            break;
          case "execute-change":
            result = immutableEcosystem.executeChange(params.requestId, userId);
            break;
          default:
            throw new Error(`Unknown immutable action: ${action}`);
        }
        break;
      
      // =====================================================================
      // ML Evolving Ecosystem Actions
      // =====================================================================
      case "ml":
        switch (action) {
          case "register-model":
            result = mlEvolvingEcosystem.registerModel(params);
            break;
          case "train-model":
            result = mlEvolvingEcosystem.trainModel(params.modelId, params.epochs);
            break;
          case "predict":
            result = mlEvolvingEcosystem.predict(params.modelId, params.input);
            break;
          case "verify-prediction":
            result = mlEvolvingEcosystem.verifyPrediction(
              params.predictionId,
              params.actualOutcome
            );
            break;
          case "start-evolution":
            mlEvolvingEcosystem.startEvolution(params);
            result = { success: true, message: "Evolution started" };
            break;
          case "stop-evolution":
            mlEvolvingEcosystem.stopEvolution();
            result = { success: true, message: "Evolution stopped" };
            break;
          case "start-optimization":
            result = mlEvolvingEcosystem.startOptimization(params);
            break;
          case "report-issue":
            result = mlEvolvingEcosystem.reportIssue(params);
            break;
          case "apply-insight":
            result = mlEvolvingEcosystem.applyInsight(params.insightId);
            break;
          default:
            throw new Error(`Unknown ml action: ${action}`);
        }
        break;
      
      // =====================================================================
      // Economic Protection System Actions
      // =====================================================================
      case "economic":
        switch (action) {
          case "get-pi-rate":
            result = economicProtection.getInternalPiRate();
            break;
          case "get-payment-ratios":
            result = economicProtection.getPaymentRatios();
            break;
          case "register-token":
            result = economicProtection.registerUtilityToken(params);
            break;
          case "verify-token":
            result = economicProtection.verifyUtilityToken(params.tokenId);
            break;
          case "check-rugpull":
            result = { 
              isRugpull: economicProtection.checkRugpullAttempt(params.tokenId),
              tokenId: params.tokenId,
            };
            break;
          case "register-enterprise":
            result = economicProtection.registerEnterprise(params);
            break;
          case "process-buyin":
            result = economicProtection.processEnterpriseBuyIn(
              params.enterpriseId,
              params.piAmount,
              params.txHash
            );
            break;
          case "sign-anti-manipulation":
            result = economicProtection.signAntiManipulationAgreement(
              params.enterpriseId,
              params.signatureHash
            );
            break;
          case "process-transaction":
            result = economicProtection.processTransaction(params);
            break;
          case "get-manipulation-alerts":
            result = economicProtection.getManipulationAlerts(params.status);
            break;
          case "resolve-hoarding":
            result = economicProtection.resolveHoardingViolation(
              params.violationId,
              params.distributionTx
            );
            break;
          default:
            throw new Error(`Unknown economic action: ${action}`);
        }
        break;
      
      default:
        return NextResponse.json({
          success: false,
          error: `Unknown system: ${system}`,
          availableSystems: ["docker", "codifier", "physical-digital", "connections", "immutable", "ml", "economic"],
        }, { status: 400 });
    }
    
    return NextResponse.json({
      success: true,
      action,
      system,
      result,
      timestamp: new Date().toISOString(),
      blockchainPowered: true,
    });
    
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}

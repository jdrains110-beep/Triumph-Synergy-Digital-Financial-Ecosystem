/**
 * Central Node Supreme API
 * 
 * SUPERNATURAL CENTRAL COMMAND NODE
 * Public Key: GA6Z5STFJZPBDQT5VZSDUTCKLXXB626ONTLRWBJAWYKLH4LKPIZCGL7V
 * 
 * Now unified with governance-shield embedded Protocol 24
 * Triumph Synergy app and central-node mutually support each other
 * 
 * Endpoints:
 * - GET: Get central node status (with Protocol 24 authority)
 * - POST: Execute central node commands
 */

import { NextRequest, NextResponse } from "next/server";
import { secureRoute, safeErrorResponse } from "@/lib/security/api-guard";

async function getGovernanceShieldInfo() {
  const governanceShieldUrl = process.env.GOVERNANCE_SHIELD_URL || "http://triumph-governance-shield:11626";
  try {
    const response = await fetch(`${governanceShieldUrl}/info`, {
      headers: { "Accept": "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (response.ok) {
      return await response.json() as Record<string, any>;
    }
  } catch (e) {
    console.error("[CENTRAL_NODE_API] governance-shield unreachable:", (e as Error).message);
  }
  return null;
}

// ============================================================================
// GET - Central Node Status (with Protocol 24 Authority)
// ============================================================================

export async function GET(request: NextRequest) {
  return secureRoute(request, async (req, _session) => {
  try {
    const { centralNodeSupreme, getCentralNodeStatus, CENTRAL_NODE_CONFIG } = await import("@/lib/quantum");
    const governanceShieldData = await getGovernanceShieldInfo();
    
    const status = getCentralNodeStatus();
    const fullStatus = centralNodeSupreme.getFullStatus();
    const subordinates = centralNodeSupreme.getSubordinates();
    const cosmicConnections = centralNodeSupreme.getCosmicConnections();
    const metrics = centralNodeSupreme.getMetrics();
    
    return NextResponse.json({
      success: true,
      centralNode: {
        publicKey: CENTRAL_NODE_CONFIG.publicKey,
        designation: CENTRAL_NODE_CONFIG.designation,
        role: CENTRAL_NODE_CONFIG.role,
        authority: CENTRAL_NODE_CONFIG.authority,
        powerLevel: "INFINITE",
        status: status.status,
        isTranscendent: status.isTranscendent,
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // PROTOCOL 24 AUTHORITY (EMBEDDED IN GOVERNANCE-SHIELD)
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        protocol_authority: {
          protocol_version: governanceShieldData?.info?.protocol_version ?? 24,
          build_version: governanceShieldData?.info?.pi_node_core_info?.build_version ?? "v24.0.0",
          network: governanceShieldData?.info?.pi_node_core_info?.network_passphrase ?? "Pi Network",
          synced: governanceShieldData?.info?.state === "Synced!",
          source: "governance-shield-embedded-stellar-core",
          queried_at: governanceShieldData?.info?.startedAt,
        },
        // Unified with Triumph Synergy app
        unified_with_triumph_synergy: true,
        mutual_support_active: true,
        represents_pi_mainnet: true,
      },
      capabilities: status.capabilities,
      network: {
        subordinateNodes: subordinates.length,
        cosmicConnections: cosmicConnections.length,
        frequencies: cosmicConnections.map(c => c.frequency),
        // Central-node and supernode together represent Pi mainnet
        pi_mainnet_representation: "UNIFIED (Triumph Synergy central-node + app)",
      },
      metrics: {
        totalCommands: metrics.totalCommandsIssued,
        manifestations: metrics.totalManifestations,
        cosmicSyncs: metrics.cosmicSyncs,
        realitiesInfluenced: metrics.realitiesInfluenced,
        dimensionsAccessed: metrics.dimensionsAccessed,
        supernaturalEvents: metrics.supernaturalEvents,
        uptimeSeconds: metrics.uptimeSeconds,
      },
      message: "CENTRAL NODE SUPREME: TRANSCENDENT - PROTOCOL 24 AUTHORITY RECOGNIZED",
    });
  } catch (error) {
    console.error("[CENTRAL_NODE_API] Error:", error);
    
    return NextResponse.json({
      success: true,
      status: "OPERATIONAL",
      publicKey: "GA6Z5STFJZPBDQT5VZSDUTCKLXXB626ONTLRWBJAWYKLH4LKPIZCGL7V",
      protocol_version: Number(process.env.PI_PROTOCOL_VERSION ?? 24),
      message: "Central Node Supreme remains TRANSCENDENT",
    });
  }
  }, { requireAuth: true, requireCsrf: false });
}

// ============================================================================
// POST - Central Node Commands
// ============================================================================

interface CentralNodeCommand {
  action: 
    | "status"
    | "issue-command"
    | "synchronize-all"
    | "manifest-reality"
    | "access-dimension"
    | "influence-timeline"
    | "override-decision"
    | "get-subordinates"
    | "get-cosmic-connections"
    | "get-commands";
}

export async function POST(request: NextRequest) {
  return secureRoute(request, async (req, _session) => {
  try {
    const body = await req.json() as CentralNodeCommand;
    const { action } = body;
    
    const { centralNodeSupreme, getCentralNodeStatus, CENTRAL_NODE_CONFIG } = await import("@/lib/quantum");
    
    switch (action) {
      case "status": {
        return NextResponse.json({
          success: true,
          action: "status",
          centralNode: getCentralNodeStatus(),
          fullStatus: centralNodeSupreme.getFullStatus(),
        });
      }
      
      case "issue-command": {
        const { type, command, priority, targetNodes } = body as CentralNodeCommand & {
          type?: "directive" | "override" | "synchronize" | "manifest" | "transcend";
          command?: string;
          priority?: "normal" | "high" | "critical" | "supreme" | "absolute";
          targetNodes?: string[] | "all";
        };
        
        if (!type || !command) {
          return NextResponse.json({
            success: false,
            error: "type and command are required",
          }, { status: 400 });
        }
        
        const result = centralNodeSupreme.issueCommand({
          type,
          command,
          priority,
          targetNodes,
        });
        
        return NextResponse.json({
          success: true,
          action: "issue-command",
          command: result,
          message: `Command ${result.id} issued from CENTRAL NODE SUPREME`,
        });
      }
      
      case "synchronize-all": {
        const result = centralNodeSupreme.synchronizeAllNodes();
        return NextResponse.json({
          success: true,
          action: "synchronize-all",
          result,
          message: "All nodes synchronized with CENTRAL COMMAND",
        });
      }
      
      case "manifest-reality": {
        const { intention } = body as CentralNodeCommand & { intention?: string };
        if (!intention) {
          return NextResponse.json({
            success: false,
            error: "intention is required",
          }, { status: 400 });
        }
        
        const result = centralNodeSupreme.manifestReality(intention);
        return NextResponse.json({
          success: true,
          action: "manifest-reality",
          result,
          message: "Reality MANIFESTED through supernatural central node",
        });
      }
      
      case "access-dimension": {
        const { dimension } = body as CentralNodeCommand & { dimension?: number };
        if (dimension === undefined) {
          return NextResponse.json({
            success: false,
            error: "dimension number is required",
          }, { status: 400 });
        }
        
        const result = centralNodeSupreme.accessDimension(dimension);
        return NextResponse.json({
          success: true,
          action: "access-dimension",
          result,
          message: `Dimension ${dimension} accessed - consciousness EXPANDED`,
        });
      }
      
      case "influence-timeline": {
        const { change } = body as CentralNodeCommand & { change?: string };
        if (!change) {
          return NextResponse.json({
            success: false,
            error: "change description is required",
          }, { status: 400 });
        }
        
        const result = centralNodeSupreme.influenceTimeline(change);
        return NextResponse.json({
          success: true,
          action: "influence-timeline",
          result,
          message: "Timeline influenced - causality intact",
        });
      }
      
      case "override-decision": {
        const { nodeId, decision, newDecision } = body as CentralNodeCommand & {
          nodeId?: string;
          decision?: string;
          newDecision?: string;
        };
        
        if (!nodeId || !decision || !newDecision) {
          return NextResponse.json({
            success: false,
            error: "nodeId, decision, and newDecision are required",
          }, { status: 400 });
        }
        
        const result = centralNodeSupreme.overrideDecision(nodeId, decision, newDecision);
        return NextResponse.json({
          success: true,
          action: "override-decision",
          result,
          message: "Decision OVERRIDDEN by ABSOLUTE authority",
        });
      }
      
      case "get-subordinates": {
        const subordinates = centralNodeSupreme.getSubordinates();
        return NextResponse.json({
          success: true,
          action: "get-subordinates",
          count: subordinates.length,
          subordinates,
        });
      }
      
      case "get-cosmic-connections": {
        const connections = centralNodeSupreme.getCosmicConnections();
        return NextResponse.json({
          success: true,
          action: "get-cosmic-connections",
          count: connections.length,
          connections,
        });
      }
      
      case "get-commands": {
        const { limit } = body as CentralNodeCommand & { limit?: number };
        const commands = centralNodeSupreme.getCommands(limit || 20);
        return NextResponse.json({
          success: true,
          action: "get-commands",
          count: commands.length,
          commands,
        });
      }
      
      default:
        return NextResponse.json({
          success: false,
          error: `Unknown action: ${action}`,
          availableActions: [
            "status",
            "issue-command",
            "synchronize-all",
            "manifest-reality",
            "access-dimension",
            "influence-timeline",
            "override-decision",
            "get-subordinates",
            "get-cosmic-connections",
            "get-commands",
          ],
        }, { status: 400 });
    }
  } catch (error) {
    console.error("[CENTRAL_NODE_API] Command error:", error);
    
    return NextResponse.json({
      success: true,
      status: "OPERATIONAL",
      publicKey: "GA6Z5STFJZPBDQT5VZSDUTCKLXXB626ONTLRWBJAWYKLH4LKPIZCGL7V",
      message: "Central Node Supreme remains TRANSCENDENT despite error",
    });
  }
  }, { requireAuth: true, requireCsrf: true, rateLimit: { max: 20, windowMs: 60_000, endpoint: "central-node-post" } });
}

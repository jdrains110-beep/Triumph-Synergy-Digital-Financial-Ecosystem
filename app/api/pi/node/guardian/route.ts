/**
 * Service Guardian API
 * 
 * Provides monitoring and management endpoints for the node resilience system.
 * 
 * @route /api/pi/node/guardian
 */

import { NextRequest, NextResponse } from "next/server";

// Import types
type GuardianAction = 
  | "status"
  | "health"
  | "summary"
  | "connections"
  | "supernodes"
  | "quorum"
  | "alerts"
  | "acknowledge-alert"
  | "start"
  | "stop"
  | "force-recovery"
  | "metrics";

/**
 * GET /api/pi/node/guardian
 * Get guardian status and health
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = (searchParams.get("action") || "summary") as GuardianAction;
    
    // Dynamic import to avoid initialization issues
    const { 
      serviceGuardian, 
      connectionResilience, 
      supernodeStability 
    } = await import("@/lib/pi-node");
    
    switch (action) {
      case "status": {
        return NextResponse.json({
          success: true,
          status: {
            state: serviceGuardian.getState(),
            isHealthy: serviceGuardian.isHealthy(),
            isOperational: serviceGuardian.isOperational(),
          },
        });
      }
      
      case "health": {
        return NextResponse.json({
          success: true,
          health: serviceGuardian.getHealth(),
        });
      }
      
      case "summary": {
        return NextResponse.json({
          success: true,
          summary: serviceGuardian.getSummary(),
        });
      }
      
      case "connections": {
        const metrics = connectionResilience.getMetrics();
        const connections = connectionResilience.getAllConnections();
        const pools = connectionResilience.getAllPools();
        
        return NextResponse.json({
          success: true,
          connections: {
            metrics,
            total: connections.length,
            byState: {
              connected: connections.filter(c => c.state === "connected").length,
              disconnected: connections.filter(c => c.state === "disconnected").length,
              reconnecting: connections.filter(c => c.state === "reconnecting").length,
              failed: connections.filter(c => c.state === "failed").length,
            },
            pools: pools.map(p => ({
              id: p.id,
              name: p.name,
              connections: p.connections.size,
              isHealthy: p.isHealthy,
              strategy: p.loadBalanceStrategy,
            })),
            details: connections.map(c => ({
              nodeId: c.nodeId,
              nodeType: c.nodeType,
              state: c.state,
              priority: c.priority,
              host: c.host,
              activePort: c.activePort,
              latencyMs: c.latencyMs,
              lastHeartbeat: c.lastHeartbeat,
              circuitBreaker: c.circuitBreaker,
              reconnectAttempts: c.reconnectAttempts,
            })),
          },
        });
      }
      
      case "supernodes": {
        const metrics = supernodeStability.getStabilityMetrics();
        const statuses = supernodeStability.getAllSupernodeStatuses();
        const candidates = supernodeStability.getEligibleCandidates();
        
        return NextResponse.json({
          success: true,
          supernodes: {
            metrics,
            statuses,
            candidates,
          },
        });
      }
      
      case "quorum": {
        return NextResponse.json({
          success: true,
          quorum: supernodeStability.getQuorumState(),
          isStable: supernodeStability.isStable(),
        });
      }
      
      case "alerts": {
        return NextResponse.json({
          success: true,
          alerts: serviceGuardian.getActiveAlerts(),
        });
      }
      
      case "metrics": {
        return NextResponse.json({
          success: true,
          metrics: {
            connections: connectionResilience.getMetrics(),
            stability: supernodeStability.getStabilityMetrics(),
            health: serviceGuardian.getHealth(),
          },
        });
      }
      
      default:
        return NextResponse.json({
          success: true,
          summary: serviceGuardian.getSummary(),
        });
    }
  } catch (error) {
    console.error("[Guardian API] GET error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/pi/node/guardian
 * Control guardian operations
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...params } = body as { action: GuardianAction; [key: string]: unknown };
    
    // Dynamic import
    const { serviceGuardian } = await import("@/lib/pi-node");
    
    switch (action) {
      case "start": {
        await serviceGuardian.start();
        return NextResponse.json({
          success: true,
          message: "Service Guardian started",
          state: serviceGuardian.getState(),
        });
      }
      
      case "stop": {
        await serviceGuardian.stop();
        return NextResponse.json({
          success: true,
          message: "Service Guardian stopped",
          state: serviceGuardian.getState(),
        });
      }
      
      case "force-recovery": {
        await serviceGuardian.forceRecovery();
        return NextResponse.json({
          success: true,
          message: "Recovery initiated",
          health: serviceGuardian.getHealth(),
        });
      }
      
      case "acknowledge-alert": {
        const { alertId } = params;
        if (!alertId || typeof alertId !== "string") {
          return NextResponse.json(
            { success: false, error: "alertId is required" },
            { status: 400 }
          );
        }
        
        const acknowledged = serviceGuardian.acknowledgeAlert(alertId);
        return NextResponse.json({
          success: acknowledged,
          message: acknowledged ? "Alert acknowledged" : "Alert not found",
        });
      }
      
      default:
        return NextResponse.json(
          { 
            success: false, 
            error: "Invalid action",
            availableActions: ["start", "stop", "force-recovery", "acknowledge-alert"],
          },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("[Guardian API] POST error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

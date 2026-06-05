/**
 * Cloudflare Worker: SAIB Quantum Builder Edge Handler
 * 
 * Receives inbound requests and fires autonomous self-correction diagnostics
 * in the background while responding immediately to edge clients.
 * 
 * Uses Cloudflare's ctx.waitUntil() to execute background tasks without
 * blocking primary response flow.
 * 
 * Version: v4.3 (Allodial Deeds integrated)
 */

import { SAIBQuantumBuilder, AuditReport } from './quantum-builder';
import { DispatchNotifier } from './dispatch-notifier';

export interface QuantumWorkerRequest {
  deedCertificateId?: string;
  domain?: string;
  ownerAddress?: string;
  operationMode?: "DIAGNOSTIC" | "PROCESS" | "HEALTH_CHECK";
  customPayload?: Record<string, any>;
}

export default {
  /**
   * Main request handler for Cloudflare Worker
   * 
   * Entry point for all inbound requests to SAIB Quantum Builder endpoint.
   * Implements immediate handshake while firing background diagnostics.
   */
  async fetch(request: Request, env: any, ctx: ExecutionContext): Promise<Response> {
    const requestPath = new URL(request.url).pathname;
    const saibId = request.headers.get("X-SAIB-ID") || "SAIB-OPTIMUS-001";

    // ==============================================================
    // ROUTING LAYER: Dispatch to appropriate handler
    // ==============================================================

    // Health check endpoint - minimal latency
    if (requestPath === "/health" && request.method === "GET") {
      return handleHealthCheck(env, saibId);
    }

    // Diagnostic endpoint - returns system state snapshot
    if (requestPath === "/diagnostics" && request.method === "GET") {
      return handleDiagnosticsRequest(env, saibId);
    }

    // Main processing endpoint - accepts POST payloads
    if (requestPath === "/process" && request.method === "POST") {
      return handleQuantumProcessing(request, env, ctx, saibId);
    }

    // Admin reset endpoint - resets all mutations (requires auth)
    if (requestPath === "/admin/reset" && request.method === "POST") {
      return handleAdminReset(request, env, saibId);
    }

    // Default 404
    return new Response(
      JSON.stringify({
        error: "Endpoint not found",
        availableEndpoints: ["/health", "/diagnostics", "/process", "/admin/reset"]
      }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }
};

/**
 * HANDLER 1: Health Check Endpoint
 * Returns immediate lightweight response
 */
async function handleHealthCheck(env: any, saibId: string): Promise<Response> {
  const currentStrategy = await env.SAIB_BACKUP_KV.get("ACTIVE_DYNAMIC_STRATEGY_FLAG") || "STANDARD_FORWARD";

  return new Response(
    JSON.stringify({
      status: "SAIB Quantum Builder Online",
      engineId: saibId,
      activeStrategy: currentStrategy,
      timestamp: new Date().toISOString(),
      version: "v4.3"
    }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        "X-SAIB-Engine": "Quantum-Builder-Autonomous"
      }
    }
  );
}

/**
 * HANDLER 2: Diagnostics Endpoint
 * Returns current system state snapshot
 */
async function handleDiagnosticsRequest(env: any, saibId: string): Promise<Response> {
  try {
    const snapshot = await SAIBQuantumBuilder.getSystemStateSnapshot(env);
    const auditHistory = await SAIBQuantumBuilder.retrieveAuditHistory(env, saibId, 5);

    return new Response(
      JSON.stringify({
        saibId,
        currentState: snapshot,
        recentAudits: auditHistory,
        timestamp: new Date().toISOString()
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

/**
 * HANDLER 3: Main Quantum Processing Endpoint
 * 
 * Accepts incoming payloads and fires background diagnostics while
 * returning immediate 202 Accepted response.
 */
async function handleQuantumProcessing(
  request: Request,
  env: any,
  ctx: ExecutionContext,
  saibId: string
): Promise<Response> {
  let incomingPayload: any;

  try {
    // Parse request body
    incomingPayload = await request.json();
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Invalid JSON payload" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    // Validate incoming envelope
    if (!incomingPayload.domain && !incomingPayload.deedCertificateId) {
      return new Response(
        JSON.stringify({ error: "Request must include 'domain' or 'deedCertificateId'" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Fetch current mutated strategy from edge KV cache
    const currentMutatedStrategy =
      await env.SAIB_BACKUP_KV.get("ACTIVE_DYNAMIC_STRATEGY_FLAG") || "STANDARD_FORWARD";

    // ==============================================================
    // FIRE BACKGROUND AUTONOMOUS CORRECTION LOOP
    // ==============================================================
    // This executes completely asynchronously while we respond immediately
    ctx.waitUntil(
      executeAutonomousSelfCorrection(saibId, incomingPayload, env, currentMutatedStrategy)
    );

    // ==============================================================
    // IMMEDIATE EDGE HANDSHAKE RESPONSE (202 Accepted)
    // ==============================================================
    // Return control to client immediately with processing confirmation
    const nodeHandshakeId = generateNodeHandshakeUUID();

    return new Response(
      JSON.stringify({
        status: "Accepted",
        message: "Request enqueued for processing",
        activeEdgeStrategy: currentMutatedStrategy,
        nodeHandshakeUUID: nodeHandshakeId,
        processingDetails: {
          saibEngineId: saibId,
          domain: incomingPayload.domain,
          deedCertificateId: incomingPayload.deedCertificateId,
          receivedAt: new Date().toISOString(),
          backgroundDiagnosticsActive: true
        }
      }),
      {
        status: 202, // Accepted - request queued for background processing
        headers: {
          "Content-Type": "application/json",
          "X-SAIB-Engine-Class": "Quantum-Builder-Autonomous",
          "X-Handshake-UUID": nodeHandshakeId,
          "Cache-Control": "no-cache"
        }
      }
    );

  } catch (error: any) {
    console.error("[QUANTUM WORKER] Request processing error:", error);
    return new Response(
      JSON.stringify({
        error: "Processing failed",
        details: error.message
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

/**
 * HANDLER 4: Admin Reset Endpoint
 * 
 * Allows authorized users to manually reset all dynamic mutations
 * and restore system to default state.
 */
async function handleAdminReset(request: Request, env: any, saibId: string): Promise<Response> {
  // Check authorization header
  const authToken = request.headers.get("Authorization");
  const adminToken = env.ADMIN_RESET_TOKEN || "NOT_SET";

  if (!authToken || !authToken.startsWith("Bearer ")) {
    return new Response(
      JSON.stringify({ error: "Missing authorization header" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  const providedToken = authToken.substring(7);

  // Timing-safe comparison
  const match = timingSafeCompare(providedToken, adminToken);
  if (!match) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  // Reset all mutations
  const resetResult = await SAIBQuantumBuilder.resetDynamicMutations(env);

  return new Response(
    JSON.stringify({
      status: "System reset successful",
      keysReset: resetResult.keysReset,
      resetTimestamp: new Date().toISOString()
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" }
    }
  );
}

/**
 * BACKGROUND TASK: Execute autonomous self-correction loop
 * 
 * This runs completely in background via ctx.waitUntil()
 * Does not block primary response flow
 */
async function executeAutonomousSelfCorrection(
  saibId: string,
  envelope: any,
  env: any,
  currentStrategy: string
): Promise<void> {
  try {
    // ==============================================================
    // 1. RUN COMPREHENSIVE SELF-DIAGNOSIS BATTERY
    // ==============================================================
    console.log(`[BACKGROUND TASK] Starting autonomous self-correction for ${saibId}`);

    const auditReport = await SAIBQuantumBuilder.executeSelfDiagnosisAndCorrection(env, saibId);

    // ==============================================================
    // 2. DISPATCH WEBHOOK ALERTS FOR CORRECTIONS
    // ==============================================================
    if (env.DISPATCH_WEBHOOK_URL && auditReport.correctionsApplied.length > 0) {
      await dispatchSelfCorrectionAlert(auditReport, env, saibId, currentStrategy);
    }

    // ==============================================================
    // 3. LOG MUTATIONS TO AUDIT TRAIL
    // ==============================================================
    if (auditReport.strategyMutations.length > 0) {
      await env.SAIB_BACKUP_KV.put(
        `mutation_log_${Date.now()}`,
        JSON.stringify({
          saibId,
          mutations: auditReport.strategyMutations,
          triggerPayload: {
            domain: envelope.domain,
            deedCertificateId: envelope.deedCertificateId
          },
          timestamp: new Date().toISOString()
        }),
        { expirationTtl: 7776000 } // 90 days
      );
    }

    console.log(`[BACKGROUND TASK] Autonomous correction completed`, {
      corrections: auditReport.correctionsApplied.length,
      mutations: auditReport.strategyMutations.length,
      healthScore: auditReport.systemHealthScore
    });

  } catch (error: any) {
    console.error("[BACKGROUND TASK] Autonomous correction failed:", error);

    // Attempt to log failure
    try {
      await env.SAIB_BACKUP_KV.put(
        `error_log_${Date.now()}`,
        JSON.stringify({
          saibId,
          error: error.message,
          timestamp: new Date().toISOString()
        }),
        { expirationTtl: 604800 } // 7 days
      );
    } catch (kvError) {
      console.error("[BACKGROUND TASK] Failed to log error:", kvError);
    }
  }
}

/**
 * Dispatch webhook alert for self-correction events
 */
async function dispatchSelfCorrectionAlert(
  auditReport: AuditReport,
  env: any,
  saibId: string,
  previousStrategy: string
): Promise<void> {
  try {
    const embed = {
      title: "🔄 SAIB AUTONOMOUS SELF-CORRECTION ACTIVATED",
      description: "SAIB Quantum Builder has detected system degradation and applied autonomous corrections.",
      color: 16737792, // Orange warning color
      fields: [
        {
          name: "🔧 Engine ID",
          value: `\`${saibId}\``,
          inline: true
        },
        {
          name: "⚠️ Failures Detected",
          value: `\`${auditReport.failuresDetected.join(", ") || "NONE"}\``,
          inline: false
        },
        {
          name: "✅ Corrections Applied",
          value: `\`${auditReport.correctionsApplied.join(", ") || "NONE"}\``,
          inline: false
        },
        {
          name: "🔀 Strategy Mutations",
          value: auditReport.strategyMutations
            .map((m) => `${m.previousStrategy} → ${m.newStrategy}`)
            .join("\n") || "NONE",
          inline: false
        },
        {
          name: "📊 System Health",
          value: `${auditReport.systemHealthScore}/100`,
          inline: true
        },
        {
          name: "🎯 Active Directive",
          value: `\`${auditReport.activeDirective}\``,
          inline: true
        }
      ],
      timestamp: auditReport.timestamp,
      footer: {
        text: "SAIB Quantum Builder v4.3 - Autonomous Self-Correcting System"
      }
    };

    const message = {
      username: "SAIB QUANTUM BUILDER SENTINEL",
      embeds: [embed]
    };

    const response = await fetch(env.DISPATCH_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(message)
    });

    if (!response.ok) {
      console.error("[DISPATCH] Webhook failed:", response.status);
    }
  } catch (error: any) {
    console.error("[DISPATCH] Failed to send webhook alert:", error.message);
  }
}

/**
 * Generate unique node handshake UUID
 */
function generateNodeHandshakeUUID(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

/**
 * Timing-safe string comparison (prevents timing attacks)
 */
function timingSafeCompare(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);

  if (bufferA.length !== bufferB.length) {
    return false;
  }

  let mismatch = 0;
  for (let i = 0; i < bufferA.length; i++) {
    mismatch |= bufferA[i] ^ bufferB[i];
  }

  return mismatch === 0;
}

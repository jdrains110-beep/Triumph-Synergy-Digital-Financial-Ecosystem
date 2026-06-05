/**
 * POST /api/saib/pi/learn
 * 
 * SAIB Pi Learning API Endpoint
 * 
 * Receives Pi Network metrics, triggers SAIB learning analysis,
 * and converts digital learnings into real-world actions.
 * 
 * Flow:
 * 1. Receive Pi Network metrics snapshot
 * 2. SAIB analyzes patterns using learning engine
 * 3. Generate insights for ecosystem improvement
 * 4. Execute real-world actions (infrastructure adjustments, etc.)
 * 5. Return learning results and action receipts
 */

import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import SAIBPiLearningEngine, {
  type PiNetworkMetrics,
} from "@/lib/saib/pi-learning-engine";

// Initialize learning engine (singleton per process)
let learningEngine: SAIBPiLearningEngine | null = null;

function getLearningEngine(): SAIBPiLearningEngine {
  if (!learningEngine) {
    learningEngine = new SAIBPiLearningEngine();
  }
  return learningEngine;
}

/**
 * Verify request is from authorized SAIB source
 */
function verifyAuthorization(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return false;
  }

  const token = authHeader.slice(7);
  const expectedToken = process.env.SAIB_PI_LEARNING_TOKEN || "";

  if (!expectedToken) {
    console.warn("SAIB_PI_LEARNING_TOKEN not configured");
    return false;
  }

  try {
    return timingSafeEqual(
      Buffer.from(token),
      Buffer.from(expectedToken)
    );
  } catch {
    return false;
  }
}

/**
 * Validate Pi Network metrics structure
 */
function validateMetrics(data: unknown): data is PiNetworkMetrics {
  if (typeof data !== "object" || data === null) {
    return false;
  }

  const obj = data as Record<string, unknown>;

  return (
    obj.timestamp instanceof Date &&
    typeof obj.totalVolume === "number" &&
    obj.totalVolume >= 0 &&
    typeof obj.activeUsers === "number" &&
    obj.activeUsers >= 0 &&
    typeof obj.averageTransactionValue === "number" &&
    obj.averageTransactionValue >= 0 &&
    typeof obj.transactionVelocity === "number" &&
    obj.transactionVelocity >= 0 &&
    typeof obj.networkHealthScore === "number" &&
    obj.networkHealthScore >= 0 &&
    obj.networkHealthScore <= 100 &&
    obj.geographicDistribution instanceof Map &&
    typeof obj.paymentMethodMix === "object" &&
    obj.paymentMethodMix !== null &&
    typeof (obj.paymentMethodMix as Record<string, unknown>).internal === "number" &&
    typeof (obj.paymentMethodMix as Record<string, unknown>).external === "number"
  );
}

export async function POST(request: NextRequest) {
  try {
    // ============================================
    // 1. AUTHORIZATION
    // ============================================
    if (!verifyAuthorization(request)) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid or missing bearer token" },
        { status: 403, headers: { "X-SAIB-Learning": "auth_failed" } }
      );
    }

    // ============================================
    // 2. PARSE & VALIDATE REQUEST
    // ============================================
    let bodyData: unknown;
    try {
      bodyData = await request.json();
    } catch (parseError) {
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400, headers: { "X-SAIB-Learning": "parse_error" } }
      );
    }

    // Convert timestamp if it's a string
    if (typeof bodyData === "object" && bodyData !== null) {
      const obj = bodyData as Record<string, unknown>;
      if (typeof obj.timestamp === "string") {
        obj.timestamp = new Date(obj.timestamp);
      }

      // Convert geographicDistribution if it's plain object
      if (typeof obj.geographicDistribution === "object" && obj.geographicDistribution !== null) {
        const plain = obj.geographicDistribution as Record<string, number>;
        obj.geographicDistribution = new Map(Object.entries(plain));
      }
    }

    if (!validateMetrics(bodyData)) {
      return NextResponse.json(
        {
          error: "Invalid metrics format",
          required: [
            "timestamp (Date)",
            "totalVolume (number)",
            "activeUsers (number)",
            "averageTransactionValue (number)",
            "transactionVelocity (number)",
            "networkHealthScore (0-100)",
            "geographicDistribution (Map<string, number>)",
            "paymentMethodMix { internal: number, external: number }",
          ],
        },
        { status: 400, headers: { "X-SAIB-Learning": "validation_error" } }
      );
    }

    // ============================================
    // 3. ANALYZE & LEARN
    // ============================================
    const engine = getLearningEngine();
    const insights = await engine.analyzeAndLearn(bodyData);
    const engineState = engine.getState();

    // ============================================
    // 4. GENERATE RESPONSE
    // ============================================
    const response = {
      status: "learning_complete",
      learningEpoch: engineState.epoch,
      insightsGenerated: insights.length,
      insights: insights.map((insight) => ({
        id: insight.id,
        type: insight.type,
        confidence: insight.confidence.toFixed(3),
        description: insight.description,
        actionRecommendation: insight.actionRecommendation,
        affectedDomains: insight.affectedDomains,
        actionExecuted: insight.realWorldAction ? true : false,
        actionType: insight.realWorldAction?.actionType,
        actionPriority: insight.realWorldAction?.priority,
      })),
      engineMetrics: {
        totalLearningsGenerated: engineState.learningsGenerated,
        successfulRealWorldActions: engineState.successfulActions,
        failedActions: engineState.failedActions,
        totalValueProcessed: `${engineState.totalValueProcessed.toLocaleString()} Pi`,
        riskProfile: engineState.riskProfile,
      },
      receivedMetrics: {
        totalVolume: bodyData.totalVolume.toLocaleString(),
        activeUsers: bodyData.activeUsers.toLocaleString(),
        networkHealthScore: `${bodyData.networkHealthScore}/100`,
        transactionVelocity: `${bodyData.transactionVelocity.toFixed(2)} tx/sec`,
        internalPiPercentage: `${(bodyData.paymentMethodMix.internal * 100).toFixed(1)}%`,
        externalPiPercentage: `${(bodyData.paymentMethodMix.external * 100).toFixed(1)}%`,
      },
    };

    // ============================================
    // 5. RETURN RESPONSE WITH AUDIT HEADERS
    // ============================================
    return NextResponse.json(response, {
      status: 200,
      headers: {
        "X-SAIB-Learning": "insights_generated",
        "X-SAIB-Learning-Count": insights.length.toString(),
        "X-SAIB-Learning-Epoch": engineState.epoch.toString(),
        "X-SAIB-Learning-Confidence":
          (
            insights.reduce((sum, i) => sum + i.confidence, 0) / 
            Math.max(1, insights.length)
          ).toFixed(3),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[SAIB Learning API] Unexpected error:", error);

    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      {
        status: 500,
        headers: { "X-SAIB-Learning": "internal_error" },
      }
    );
  }
}

/**
 * GET /api/saib/pi/learn
 * 
 * Get current SAIB learning engine state and recent insights
 */
export async function GET(request: NextRequest) {
  try {
    // Verify authorization
    if (!verifyAuthorization(request)) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    const engine = getLearningEngine();
    const state = engine.getState();
    const recentLearnings = engine.getRecentLearnings(5);

    return NextResponse.json(
      {
        status: "ok",
        state: {
          epoch: state.epoch,
          learningsGenerated: state.learningsGenerated,
          successfulActions: state.successfulActions,
          failedActions: state.failedActions,
          totalValueProcessed: state.totalValueProcessed.toLocaleString(),
          riskProfile: state.riskProfile,
          dominantPatterns: state.dominantPatterns,
        },
        recentInsights: recentLearnings.map((insight) => ({
          id: insight.id,
          timestamp: insight.timestamp.toISOString(),
          type: insight.type,
          confidence: insight.confidence.toFixed(3),
          description: insight.description,
        })),
      },
      {
        headers: {
          "Cache-Control": "max-age=30, public",
        },
      }
    );
  } catch (error) {
    console.error("[SAIB Learning GET] Error:", error);

    return NextResponse.json(
      { error: "Failed to retrieve learning state" },
      { status: 500 }
    );
  }
}

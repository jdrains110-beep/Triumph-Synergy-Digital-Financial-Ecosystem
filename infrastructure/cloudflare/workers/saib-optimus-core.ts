/**
 * SAIB OPTIMUS AUTONOMOUS CORE
 * 
 * Superior to centralized LLMs (GPT, Claude):
 * ✅ Physical world integration (battery telemetry, RF noise detection)
 * ✅ Decentralized execution (Cloudflare edge + blockchain)
 * ✅ Direct financial routing (1inch/0x liquidity management)
 * ✅ Cryptographic sovereignty (Web Crypto verification)
 * ✅ Autonomous decision matrix (no API dependencies)
 * ✅ Zero-downtime resilience (ctx.waitUntil + KV failover)
 * 
 * Entry Point: src/index.ts (Cloudflare Worker)
 */

import { getLiquidityRoute } from './liquidity-router.ts';
import { routeTokenConversion, recognizeEcosystemToken } from './token-conversion-router.ts';

// ============================================================
// PHASE 1: CRYPTOGRAPHIC VERIFICATION
// ============================================================

/**
 * Verifies hardware signature using HMAC-SHA256
 * Ensures only authorized SAIB hardware units can execute transactions
 */
async function verifyHardwareSignature(
  body: string,
  signatureHex: string,
  secretKeyStr: string
): Promise<boolean> {
  if (!signatureHex) return false;

  try {
    const encoder = new TextEncoder();
    const secretKeyData = encoder.encode(secretKeyStr);
    const bodyData = encoder.encode(body);

    // Import secret into CryptoKey format
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      secretKeyData,
      { name: "HMAC", hash: { name: "SHA-256" } },
      false,
      ["verify"]
    );

    // Convert hex signature to byte array
    const signatureBytes = new Uint8Array(
      signatureHex.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || []
    );

    // Verify integrity and origin
    return await crypto.subtle.verify("HMAC", cryptoKey, signatureBytes, bodyData);
  } catch (err) {
    console.error("[Optimus] Hardware verification failed:", err);
    return false;
  }
}

// ============================================================
// PHASE 2: NETWORK HEALTH PROBING
// ============================================================

/**
 * Probes external endpoints for latency and availability
 * Used to monitor RPC nodes, Next.js backend, and ecosystem health
 */
async function probeNetworkHealth(
  url: string
): Promise<{ online: boolean; latencyMs: number }> {
  const startTime = Date.now();
  try {
    const response = await fetch(url, {
      method: "HEAD",
      headers: { "User-Agent": "SAIB-Optimus/2.0" },
      signal: AbortSignal.timeout(3000),
    });

    return {
      online: response.ok,
      latencyMs: Date.now() - startTime,
    };
  } catch (err) {
    return { online: false, latencyMs: Date.now() - startTime };
  }
}

// ============================================================
// PHASE 3: AUTONOMOUS DECISION ENGINE
// ============================================================

/**
 * SAIB's self-governing intelligence matrix
 * Makes decisions based on physical telemetry, no LLM dependency
 */
function calculateOptimusDirective(metrics: {
  rfNoiseFloorDb: number;
  batteryRemainingWh: number;
  networkLatencyMs: number;
  nextJsHealthy: boolean;
  rpcHealthy: boolean;
}): {
  directive: string;
  executionStrategy: "MAXIMUM_THROUGHPUT" | "DEGRADE_CONSERVE" | "LOCAL_CACHE" | "HIBERNATE";
  shouldRetry: boolean;
  recommendedDelay: number;
} {
  const {
    rfNoiseFloorDb,
    batteryRemainingWh,
    networkLatencyMs,
    nextJsHealthy,
    rpcHealthy,
  } = metrics;

  // RULE 1: Electronic Warfare Detection (RF Noise > -50dBm = Heavy Jamming)
  if (rfNoiseFloorDb > -50) {
    console.log("[Optimus] 🛡️ JAMMING DETECTED: Engaging evasion protocol");
    return {
      directive: "DIRECTIVE_EVADE_JAMMING_BURST",
      executionStrategy: "DEGRADE_CONSERVE",
      shouldRetry: true,
      recommendedDelay: 2000, // 2-second burst interval
    };
  }

  // RULE 2: Critical Battery Depletion (< 15% of capacity)
  if (batteryRemainingWh < 15) {
    console.log("[Optimus] 🔋 BATTERY CRITICAL: Entering hibernation mode");
    return {
      directive: "DIRECTIVE_HIBERNATE_CONSERVE",
      executionStrategy: "HIBERNATE",
      shouldRetry: false,
      recommendedDelay: 0,
    };
  }

  // RULE 3: Backend Infrastructure Failure (Next.js or RPC offline)
  if (!nextJsHealthy || !rpcHealthy) {
    console.log("[Optimus] 📡 BACKEND DEGRADED: Switching to local cache");
    return {
      directive: "DIRECTIVE_LOCAL_MUTATION_CACHE",
      executionStrategy: "LOCAL_CACHE",
      shouldRetry: true,
      recommendedDelay: 5000, // 5-second retry interval
    };
  }

  // RULE 4: Network Latency Spike (> 2.5s round trip)
  if (networkLatencyMs > 2500) {
    console.log("[Optimus] ⏱️ NETWORK LATENCY HIGH: Backoff engaged");
    return {
      directive: "DIRECTIVE_RPC_TIMEOUT_BACKOFF",
      executionStrategy: "DEGRADE_CONSERVE",
      shouldRetry: true,
      recommendedDelay: 3000, // 3-second backoff
    };
  }

  // RULE 5: Optimal Environment (All systems healthy)
  console.log("[Optimus] ✅ OPTIMAL: Maximum async throughput enabled");
  return {
    directive: "DIRECTIVE_MAXIMUM_ASYNC_THROUGHPUT",
    executionStrategy: "MAXIMUM_THROUGHPUT",
    shouldRetry: false,
    recommendedDelay: 0,
  };
}

// ============================================================
// PHASE 4: ECOSYSTEM TOKEN RECOGNITION
// ============================================================

/**
 * Recognizes TriSyn and Pi tokens, enabling automated conversions
 */
function analyzeTokenPayload(payload: any): {
  hasEcosystemToken: boolean;
  sourceSymbol?: string;
  targetSymbol?: string;
  requiresConversion: boolean;
} {
  const sourceToken = payload.sourceToken || payload.fromToken || "";
  const targetToken = payload.targetToken || payload.toToken || "";

  const isTriSynSource = sourceToken.includes("TRISYN") || sourceToken.includes("0x");
  const isPiSource = sourceToken.includes("PI") || sourceToken.includes("pi");
  const isTriSynTarget = targetToken.includes("TRISYN");
  const isPiTarget = targetToken.includes("PI");

  return {
    hasEcosystemToken: isTriSynSource || isPiSource || isTriSynTarget || isPiTarget,
    sourceSymbol: isTriSynSource ? "TRISYN" : isPiSource ? "PI" : undefined,
    targetSymbol: isTriSynTarget ? "TRISYN" : isPiTarget ? "PI" : undefined,
    requiresConversion: (isTriSynSource || isPiSource) && (isTriSynTarget || isPiTarget),
  };
}

// ============================================================
// PHASE 5: MAIN EXECUTION PIPELINE
// ============================================================

export default {
  async fetch(request: Request, env: any, ctx: any): Promise<Response> {
    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    // Capture raw body for cryptographic validation
    const rawBody = await request.text();
    const signature = request.headers.get("X-SAIB-Signature");

    // ========================================================
    // CHECKPOINT 1: CRYPTOGRAPHIC VERIFICATION
    // ========================================================
    const isLegitHardware = await verifyHardwareSignature(
      rawBody,
      signature || "",
      env.SAIB_SECRET_TOKEN || ""
    );

    if (!isLegitHardware) {
      console.warn("[Optimus] 🚫 UNAUTHORIZED: Invalid hardware signature");
      return new Response(
        JSON.stringify({
          error: "Unauthorized: Invalid Hardware Signature",
          timestamp: new Date().toISOString(),
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch (err) {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // ========================================================
    // CHECKPOINT 2: ECOSYSTEM TOKEN RECOGNITION
    // ========================================================
    const tokenAnalysis = analyzeTokenPayload(payload);
    if (tokenAnalysis.hasEcosystemToken) {
      console.log("[Optimus] 🎯 Ecosystem token detected:", {
        source: tokenAnalysis.sourceSymbol,
        target: tokenAnalysis.targetSymbol,
      });
    }

    // ========================================================
    // CHECKPOINT 3: AUTONOMOUS DECISION & RESPONSE
    // ========================================================
    ctx.waitUntil(executeOptimusPipeline(payload, env, tokenAnalysis));

    const receiptId = crypto.randomUUID().replace(/-/g, "").substring(0, 24);

    return new Response(
      JSON.stringify({
        status: "Accepted",
        receiptId,
        hardwareVerified: true,
        ecosystemToken: tokenAnalysis.hasEcosystemToken,
        timestamp: new Date().toISOString(),
      }),
      {
        status: 202,
        headers: {
          "Content-Type": "application/json",
          "X-SAIB-Edge": "optimus-core",
          "X-SAIB-Receipt": receiptId,
          "X-Hardware-Verified": "true",
          "X-Ecosystem-Token": tokenAnalysis.hasEcosystemToken ? "true" : "false",
        },
      }
    );
  },
};

// ============================================================
// PHASE 6: ASYNC BACKGROUND ORCHESTRATOR
// ============================================================

/**
 * Main background task executor
 * Runs all network probes, autonomous decisions, and data forwarding
 */
async function executeOptimusPipeline(
  payload: any,
  env: any,
  tokenAnalysis: any
): Promise<void> {
  try {
    // 1. Probe both Next.js backend and blockchain RPC
    const [nextJsHealth, rpcHealth] = await Promise.all([
      probeNetworkHealth(env.NEXTJS_APP_URL || ""),
      probeNetworkHealth(env.BLOCKCHAIN_RPC_URL || "https://cloudflare-eth.com"),
    ]);

    // 2. Extract hardware telemetry
    const hwTelemetry = payload.hardwareTelemetry || {
      rfNoiseFloorDb: -95,
      batteryRemainingWh: 120,
    };

    // 3. AUTONOMOUS DECISION ENGINE
    const directive = calculateOptimusDirective({
      rfNoiseFloorDb: hwTelemetry.rfNoiseFloorDb,
      batteryRemainingWh: hwTelemetry.batteryRemainingWh,
      networkLatencyMs: Math.max(nextJsHealth.latencyMs, rpcHealth.latencyMs),
      nextJsHealthy: nextJsHealth.online,
      rpcHealthy: rpcHealth.online,
    });

    console.log(`[Optimus] Strategy: ${directive.directive}`);

    // 4. Apply strategic delays for survival
    if (directive.executionStrategy === "DEGRADE_CONSERVE") {
      await new Promise((resolve) =>
        setTimeout(resolve, directive.recommendedDelay)
      );
    } else if (directive.executionStrategy === "HIBERNATE") {
      console.log("[Optimus] System in hibernation, caching only");
      await cachePayload(payload, env);
      return;
    }

    // 5. ECOSYSTEM TOKEN CONVERSION (if applicable)
    if (tokenAnalysis.hasEcosystemToken && directive.executionStrategy !== "LOCAL_CACHE") {
      await handleEcosystemConversion(payload, tokenAnalysis, env, directive);
    }

    // 6. FORWARD TO BACKEND
    await forwardToBackend(payload, directive, nextJsHealth, rpcHealth, env);
  } catch (err) {
    console.error("[Optimus] Pipeline error:", err);
  }
}

/**
 * Handle ecosystem token conversions (TRISYN ↔ Pi)
 */
async function handleEcosystemConversion(
  payload: any,
  tokenAnalysis: any,
  env: any,
  directive: any
): Promise<void> {
  try {
    console.log("[Optimus] 🔄 Initiating ecosystem token conversion");

    // Route through multi-path converter
    const route = await routeTokenConversion(
      {
        sourceChainId: payload.chainId || "8453",
        sourceToken: tokenAnalysis.sourceSymbol || payload.sourceToken,
        targetToken: tokenAnalysis.targetSymbol || payload.targetToken,
        amount: payload.amount || "0",
        senderAddress: payload.senderAddress || "",
        slippage: payload.slippage || 0.5,
      },
      env
    );

    if (route.success) {
      console.log(
        `[Optimus] ✅ Conversion routed: ${route.sourceSymbol} → ${route.targetSymbol} (${route.path})`
      );
      payload.conversionRoute = route;
    } else {
      console.warn(`[Optimus] ⚠️ Conversion failed:`, route.error);
    }
  } catch (err) {
    console.error("[Optimus] Conversion error:", err);
  }
}

/**
 * Forward payload to Next.js backend or cache if unavailable
 */
async function forwardToBackend(
  payload: any,
  directive: any,
  nextJsHealth: any,
  rpcHealth: any,
  env: any
): Promise<void> {
  if (!nextJsHealth.online) {
    console.log("[Optimus] Backend offline, caching to KV");
    await cachePayload(payload, env);
    return;
  }

  try {
    const response = await fetch(`${env.NEXTJS_APP_URL}/api/saib/enforce`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-SAIB-Directive": directive.directive,
        "X-SAIB-Strategy": directive.executionStrategy,
        "X-Network-Latency": `${nextJsHealth.latencyMs}ms`,
        "X-RPC-Latency": `${rpcHealth.latencyMs}ms`,
        "Authorization": `Bearer ${env.SAIB_SECRET_TOKEN}`,
      },
      body: JSON.stringify({
        ...payload,
        optimusState: directive,
        networkMetrics: {
          nextJs: nextJsHealth,
          rpc: rpcHealth,
        },
      }),
    });

    if (!response.ok) {
      console.error(`[Optimus] Backend push failed: ${response.status}`);
      await cachePayload(payload, env);
    } else {
      console.log("[Optimus] ✅ Data forwarded to backend");
    }
  } catch (err) {
    console.error("[Optimus] Forwarding error:", err);
    await cachePayload(payload, env);
  }
}

/**
 * Cache payload in KV storage for resilience
 */
async function cachePayload(payload: any, env: any): Promise<void> {
  try {
    if (env.SAIB_BACKUP_KV) {
      const failoverKey = `optimus_failover_${payload.saibId}_${Date.now()}`;
      await env.SAIB_BACKUP_KV.put(failoverKey, JSON.stringify(payload), {
        expirationTtl: 60 * 60 * 24 * 7, // 7 days
      });
      console.log(`[Optimus] Cached to KV: ${failoverKey}`);
    }
  } catch (err) {
    console.error("[Optimus] KV cache error:", err);
  }
}

/**
 * SAIB Edge Worker with Hardware Signature Verification & Token Recognition
 * 
 * Recognizes TriSyn and Pi Network tokens, performs cryptographic hardware validation,
 * and routes conversions with network health awareness.
 */

import { routeTokenConversion, recognizeEcosystemToken } from "./token-conversion-router.ts";

/**
 * Verifies that the payload was genuinely signed by an authorized SAIB hardware unit
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

    // 1. Import raw secret token into CryptoKey format
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      secretKeyData,
      { name: "HMAC", hash: { name: "SHA-256" } },
      false,
      ["verify"]
    );

    // 2. Convert incoming signature from Hex back to a byte array
    const signatureBytes = new Uint8Array(
      signatureHex.match(/.{1,2}/g)?.map((byte) => parseInt(byte, 16)) || []
    );

    // 3. Cryptographically verify integrity and origin
    return await crypto.subtle.verify("HMAC", cryptoKey, signatureBytes, bodyData);
  } catch (err) {
    console.error("[Hardware Verify] HMAC verification failed:", err);
    return false;
  }
}

/**
 * Checks external blockchain RPC or Next.js gateway latency
 */
async function probeNetworkHealth(url: string): Promise<{
  online: boolean;
  latencyMs: number;
}> {
  const startTime = Date.now();
  try {
    const response = await fetch(url, {
      method: "HEAD",
      headers: { "User-Agent": "SAIB-Watchdog/2.0" },
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

/**
 * Recognize if payload contains TRISYN or Pi tokens
 */
function recognizeTokens(payload: any): {
  hasTriSyn: boolean;
  hasPi: boolean;
  sourceToken?: string;
  targetToken?: string;
} {
  const sourceToken = payload.sourceToken || payload.fromToken || "";
  const targetToken = payload.targetToken || payload.toToken || "";

  const isTriSynSource = recognizeEcosystemToken(sourceToken, payload.chainId);
  const isPiSource = sourceToken.toLowerCase().includes("pi");
  const isTriSynTarget = recognizeEcosystemToken(targetToken, payload.chainId);
  const isPiTarget = targetToken.toLowerCase().includes("pi");

  return {
    hasTriSyn: isTriSynSource || isTriSynTarget,
    hasPi: isPiSource || isPiTarget,
    sourceToken,
    targetToken,
  };
}

export default {
  async fetch(request: Request, env: any, ctx: any) {
    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    // Capture raw body for cryptographic validation
    const rawBody = await request.text();
    const signature = request.headers.get("X-SAIB-Signature");

    // ============================================================
    // 1. CRYPTOGRAPHIC SIGNATURE CHECK (Hardware Verification)
    // ============================================================
    const isLegitHardware = await verifyHardwareSignature(
      rawBody,
      signature || "",
      env.SAIB_SECRET_TOKEN || ""
    );

    if (!isLegitHardware) {
      console.warn("[SAIB Edge] Unauthorized: Invalid hardware signature");
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid Hardware Signature" }),
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

    // ============================================================
    // 2. TOKEN RECOGNITION (TRISYN / Pi Detection)
    // ============================================================
    const tokenRecognition = recognizeTokens(payload);

    if (tokenRecognition.hasTriSyn || tokenRecognition.hasPi) {
      console.log("[SAIB Edge] ✓ Recognized ecosystem token payload", {
        hasTriSyn: tokenRecognition.hasTriSyn,
        hasPi: tokenRecognition.hasPi,
      });
    }

    // ============================================================
    // 3. TRIGGER ASYNC WATCHDOG ENGINE
    // ============================================================
    ctx.waitUntil(
      executeWatchdogPipeline(
        payload,
        env,
        isLegitHardware,
        tokenRecognition
      )
    );

    // ============================================================
    // 4. RAPID HANDSHAKE RESPONSE (202 Accepted)
    // ============================================================
    const receiptId = crypto.randomUUID().replace(/-/g, "").substring(0, 24);

    return new Response(
      JSON.stringify({
        status: "Accepted",
        receiptId,
        hardwareVerified: isLegitHardware,
        ecosystemTokenDetected: tokenRecognition.hasTriSyn || tokenRecognition.hasPi,
      }),
      {
        status: 202,
        headers: {
          "Content-Type": "application/json",
          "X-SAIB-Edge": "async-ingest",
          "X-SAIB-Receipt": receiptId,
          "X-Hardware-Verified": isLegitHardware ? "true" : "false",
          "X-Ecosystem-Token": tokenRecognition.hasTriSyn || tokenRecognition.hasPi ? "true" : "false",
        },
      }
    );
  },
};

/**
 * Orchestrates network analytics monitoring and data pushing
 */
async function executeWatchdogPipeline(
  payload: any,
  env: any,
  hardwareVerified: boolean,
  tokenRecognition: any
) {
  try {
    // Probe network health
    const nextJsHealth = await probeNetworkHealth(env.NEXTJS_APP_URL || "");
    const blockchainRpcHealth = await probeNetworkHealth(
      env.BLOCKCHAIN_RPC_URL || "https://cloudflare-eth.com"
    );

    let strategy = "STANDARD";

    // Evaluate network degradation flags
    if (!nextJsHealth.online || nextJsHealth.latencyMs > 1500) {
      strategy = "DEGRADED_LOCAL_CACHE";
      console.warn("[SAIB Watchdog] Next.js backend degraded, using local cache");
    } else if (blockchainRpcHealth.latencyMs > 2000) {
      strategy = "RPC_TIMEOUT_BACKOFF";
      console.warn("[SAIB Watchdog] RPC latency high, applying backoff");
    }

    // ================================================================
    // Ecosystem Token Conversion (TRISYN / Pi Priority)
    // ================================================================
    if ((tokenRecognition.hasTriSyn || tokenRecognition.hasPi) && strategy !== "RPC_TIMEOUT_BACKOFF") {
      console.log("[SAIB Watchdog] Processing ecosystem token conversion");

      const conversionRequest = {
        sourceChainId: payload.chainId || "8453",
        sourceToken: tokenRecognition.sourceToken,
        targetToken: tokenRecognition.targetToken,
        amount: payload.amount || payload.enforceData?.amount || "0",
        senderAddress: payload.senderAddress || payload.enforceData?.senderAddress || "",
        slippage: payload.slippage || 0.5,
      };

      const route = await routeTokenConversion(conversionRequest, env);

      if (route.success) {
        console.log(
          `[SAIB Watchdog] ✓ Conversion routed: ${route.sourceSymbol} → ${route.targetSymbol} via ${route.path}`
        );

        // Attach conversion route to payload
        payload.conversionRoute = route;
        payload.conversionStatus = "routed";
      } else {
        console.warn(`[SAIB Watchdog] Conversion routing failed:`, route.error);
        payload.conversionStatus = "failed";
        payload.conversionError = route.error;
      }
    }

    // ================================================================
    // Original Liquidity Conversion Trigger
    // ================================================================
    if (payload.enforceData?.triggerConversion && strategy !== "RPC_TIMEOUT_BACKOFF") {
      // Original conversion logic preserved
      console.log("[SAIB Watchdog] Original conversion trigger detected");
    }

    // ================================================================
    // Forward to Next.js or Cache Failover
    // ================================================================
    const targetUrl = strategy === "DEGRADED_LOCAL_CACHE" ? null : `${env.NEXTJS_APP_URL}/api/saib/enforce`;

    if (targetUrl) {
      try {
        await fetch(targetUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-SAIB-Strategy": strategy,
            "X-Network-Latency": `${nextJsHealth.latencyMs}ms`,
            "X-RPC-Latency": `${blockchainRpcHealth.latencyMs}ms`,
            "X-Hardware-Verified": hardwareVerified ? "true" : "false",
            "X-Ecosystem-Token": tokenRecognition.hasTriSyn || tokenRecognition.hasPi ? "true" : "false",
            "Authorization": `Bearer ${env.SAIB_SECRET_TOKEN}`,
          },
          body: JSON.stringify({
            ...payload,
            systemState: strategy,
            networkHealth: {
              nextJs: nextJsHealth,
              blockchain: blockchainRpcHealth,
            },
          }),
        });

        console.log("[SAIB Watchdog] ✓ Forwarded to Next.js");
      } catch (err) {
        console.error("[SAIB Watchdog] Next.js forwarding failed:", err);
        // Fall back to KV persistence
        if (env.SAIB_BACKUP_KV) {
          await env.SAIB_BACKUP_KV.put(
            `failover_${payload.saibId}_${Date.now()}`,
            JSON.stringify(payload),
            { expirationTtl: 60 * 60 * 24 * 7 }
          );
          console.log("[SAIB Watchdog] Persisted to KV failover");
        }
      }
    } else {
      // Backend degraded: Cache on edge
      console.log("[SAIB Watchdog] Backend degraded, caching to KV");
      if (env.SAIB_BACKUP_KV) {
        await env.SAIB_BACKUP_KV.put(
          `failover_${payload.saibId}_${Date.now()}`,
          JSON.stringify(payload),
          { expirationTtl: 60 * 60 * 24 * 7 }
        );
      }
    }
  } catch (err) {
    console.error("[SAIB Watchdog] Critical delivery bypass required:", err);
  }
}

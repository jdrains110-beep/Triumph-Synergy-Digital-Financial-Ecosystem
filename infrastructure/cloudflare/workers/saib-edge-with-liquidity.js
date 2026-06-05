/**
 * SAIB Edge Worker with Liquidity Routing
 * 
 * Enhanced version integrating DEX aggregator liquidity routing
 * for automated asset conversion to build Triumph Synergy treasury.
 * 
 * Original functionality preserved: GET cache tier, async SAIB enforcement.
 * New: POST /api/saib/convert - Routes through DEX for asset swaps.
 */

import { getBestLiquidityRoute } from './liquidity-router.ts';

const CACHEABLE_PATHS = {
  "/health": { ttl: 10, swr: 30 },
  "/status": { ttl: 10, swr: 30 },
  "/codebase": { ttl: 60, swr: 300 },
  "/network": { ttl: 60, swr: 300 },
  "/loopholes": { ttl: 300, swr: 600 },
  "/brain": { ttl: 5, swr: 60 },
  "/visitors": { ttl: 5, swr: 60 },
  "/persist": { ttl: 5, swr: 60 },
  "/learning": { ttl: 5, swr: 60 },
  "/report": { ttl: 5, swr: 60 },
  "/gold": { ttl: 5, swr: 60 },
  "/metrics": { ttl: 5, swr: 60 },
};

const ASYNC_ENFORCE_PATHS = new Set([
  "/api/saib/enforce",
  "/api/saib/edge/enforce",
  "/saib/enforce",
]);

const LIQUIDITY_CONVERSION_PATHS = new Set([
  "/api/saib/convert",
  "/api/saib/liquidity",
  "/saib/convert",
]);

const MAX_BODY_BYTES = 64 * 1024;
const POWER_CONSERVE_DELAY_MS = 5000;
const SIGNAL_NOISE_DELAY_MS = 2000;
const FORWARD_TIMEOUT_MS = 12000;
const LIQUIDITY_ROUTE_TIMEOUT_MS = 15000;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Route to appropriate handler
    if (LIQUIDITY_CONVERSION_PATHS.has(url.pathname)) {
      return handleLiquidityConversion(request, env, ctx);
    }

    if (ASYNC_ENFORCE_PATHS.has(url.pathname)) {
      return handleAsyncEnforcement(request, env, ctx);
    }

    const policy = CACHEABLE_PATHS[url.pathname];

    if (!policy || request.method !== "GET") {
      return fetch(
        new Request(
          `${env.ORIGIN}${url.pathname}${url.search}`,
          request
        )
      );
    }

    return handleCacheRead(url, env, policy, ctx);
  },
};

/**
 * Handle liquidity conversion requests
 * Converts one digital asset to another via DEX aggregators
 */
async function handleLiquidityConversion(request, env, ctx) {
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method Not Allowed" }, 405);
  }

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_BODY_BYTES) {
    return jsonResponse({ error: "Payload Too Large" }, 413);
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON Payload" }, 400);
  }

  // Validate conversion request
  const validation = validateConversionRequest(payload);
  if (!validation.ok) {
    return jsonResponse({ error: validation.error }, 400);
  }

  // Queue liquidity routing in background
  ctx.waitUntil(
    processLiquidityConversion(
      payload,
      env,
      request.headers.get("authorization") || ""
    )
  );

  // Return fast 202 Accepted
  return jsonResponse(
    {
      status: "ConversionAccepted",
      conversionId: `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      fromToken: payload.fromToken,
      toToken: payload.toToken,
      fromAmount: payload.fromAmount,
      message: "Liquidity route being calculated and executed asynchronously",
    },
    202
  );
}

function validateConversionRequest(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { ok: false, error: "Payload must be an object" };
  }

  const required = [
    "chainId",
    "fromToken",
    "toToken",
    "fromAmount",
    "fromAddress",
  ];
  for (const field of required) {
    if (!(field in payload)) {
      return { ok: false, error: `Missing required field: ${field}` };
    }
  }

  return { ok: true };
}

async function processLiquidityConversion(payload, env, authHeader) {
  try {
    console.log(
      `[Liquidity Router] Starting conversion: ${payload.fromAmount} ${payload.fromToken} → ${payload.toToken} on chain ${payload.chainId}`
    );

    // Get optimal liquidity route from DEX aggregator
    const route = await getBestLiquidityRoute(
      payload.chainId,
      payload.fromToken,
      payload.toToken,
      payload.fromAmount,
      payload.fromAddress,
      env,
      payload.slippage || 0.5
    );

    if (!route.success) {
      console.error(`[Liquidity Router] Route failed: ${route.error}`);
      await persistConversionFailover(payload, env, `Route failed: ${route.error}`);
      return;
    }

    console.log(
      `[Liquidity Router] ✓ Route found: ${route.quote.minAmount} ${payload.toToken} (slippage: ${route.quote.slippage}%)`
    );

    // Forward to Next.js for transaction signing and execution
    await forwardConversionToNextJs(
      payload,
      route,
      env,
      authHeader
    );
  } catch (error) {
    console.error(
      `[Liquidity Router] Error: ${error && error.message ? error.message : String(error)}`
    );
    await persistConversionFailover(
      payload,
      env,
      error && error.message ? error.message : String(error)
    );
  }
}

async function forwardConversionToNextJs(
  payload,
  route,
  env,
  authHeader
) {
  const nextUrl = env.NEXTJS_APP_URL;
  const token = env.SAIB_SECRET_TOKEN;

  if (!nextUrl || !token) {
    throw new Error("NEXTJS_APP_URL or SAIB_SECRET_TOKEN not configured");
  }

  const conversionPayload = {
    type: "liquidity_conversion",
    chainId: payload.chainId,
    fromToken: payload.fromToken,
    toToken: payload.toToken,
    fromAmount: payload.fromAmount,
    fromAddress: payload.fromAddress,
    minAmount: route.quote.minAmount,
    estimatedGas: route.quote.estimatedGas,
    aggregator: route.quote.aggregator,
    transaction: route.transaction,
    timestamp: new Date().toISOString(),
  };

  const response = await fetchWithTimeout(
    `${nextUrl}/api/saib/convert/execute`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
        "X-SAIB-Conversion-Type": "liquidity_swap",
      },
      body: JSON.stringify(conversionPayload),
    },
    LIQUIDITY_ROUTE_TIMEOUT_MS
  );

  if (!response.ok) {
    const body = await safeText(response);
    throw new Error(
      `Next.js forwarding failed: ${response.status} ${body.slice(0, 500)}`
    );
  }

  console.log(`[Liquidity Router] ✓ Conversion forwarded to Next.js for execution`);
}

async function persistConversionFailover(payload, env, reason) {
  const record = {
    type: "conversion_failure",
    chainId: payload.chainId,
    fromToken: payload.fromToken,
    toToken: payload.toToken,
    fromAmount: payload.fromAmount,
    reason,
    failedAt: new Date().toISOString(),
  };

  if (env.SAIB_BACKUP_QUEUE) {
    try {
      await env.SAIB_BACKUP_QUEUE.send(record);
      console.log("[Liquidity Router] Failover queued");
      return;
    } catch (err) {
      console.error("Queue failover failed", err && err.message ? err.message : err);
    }
  }

  const kv = env.SAIB_BACKUP_KV || env.SAIB_CACHE;
  if (kv) {
    try {
      await kv.put(
        `conversion_failover_${payload.chainId}_${Date.now()}`,
        JSON.stringify(record),
        { expirationTtl: 60 * 60 * 24 * 7 }
      );
      console.log("[Liquidity Router] Failover persisted to KV");
      return;
    } catch (err) {
      console.error("KV failover failed", err && err.message ? err.message : err);
    }
  }

  console.error("[Liquidity Router] No failover available", reason);
}

/**
 * Original SAIB enforcement handler
 */
async function handleAsyncEnforcement(request, env, ctx) {
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method Not Allowed" }, 405);
  }

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_BODY_BYTES) {
    return jsonResponse({ error: "Payload Too Large" }, 413);
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON Payload" }, 400);
  }

  const validation = validatePayload(payload);
  if (!validation.ok) {
    return jsonResponse({ error: validation.error }, 400);
  }

  const strategy = chooseProcessingStrategy(payload.hardwareTelemetry);
  const receiptId = await receiptDigest(payload, strategy);
  const ingressOrigin = new URL(request.url).origin;

  ctx.waitUntil(
    processAndPush(payload, strategy, receiptId, ingressOrigin, env)
  );

  return jsonResponse(
    {
      status: "Accepted",
      saibId: payload.saibId,
      receiptId,
      strategyEngaged: strategy,
    },
    202
  );
}

function validatePayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { ok: false, error: "Bad Request: payload must be an object" };
  }
  if (typeof payload.saibId !== "string" || !payload.saibId.trim()) {
    return { ok: false, error: "Bad Request: saibId is required" };
  }
  if (
    !payload.enforceData ||
    typeof payload.enforceData !== "object" ||
    Array.isArray(payload.enforceData)
  ) {
    return { ok: false, error: "Bad Request: enforceData object is required" };
  }
  if (
    typeof payload.enforceData.action !== "string" ||
    !payload.enforceData.action.trim()
  ) {
    return { ok: false, error: "Bad Request: enforceData.action is required" };
  }
  return { ok: true };
}

function chooseProcessingStrategy(hardwareTelemetry = {}) {
  const batteryRemainingWh = Number(
    hardwareTelemetry.batteryRemainingWh ?? 120
  );
  const rfNoiseFloorDb = Number(hardwareTelemetry.rfNoiseFloorDb ?? -95);

  if (
    Number.isFinite(batteryRemainingWh) &&
    batteryRemainingWh < 25
  ) {
    return "THROTTLE_POWER_CONSERVE";
  }
  if (Number.isFinite(rfNoiseFloorDb) && rfNoiseFloorDb > -60) {
    return "THROTTLE_SIGNAL_NOISE";
  }
  return "STANDARD";
}

async function processAndPush(
  payload,
  strategy,
  receiptId,
  ingressOrigin,
  env
) {
  if (strategy === "THROTTLE_POWER_CONSERVE") {
    await delay(POWER_CONSERVE_DELAY_MS);
  } else if (strategy === "THROTTLE_SIGNAL_NOISE") {
    await delay(SIGNAL_NOISE_DELAY_MS);
  }

  const nextUrl = env.NEXTJS_APP_URL;
  const token = env.SAIB_SECRET_TOKEN;
  if (!nextUrl || !token) {
    await persistFailover(
      payload,
      strategy,
      receiptId,
      env,
      "missing NEXTJS_APP_URL or SAIB_SECRET_TOKEN"
    );
    return;
  }
  if (safeOrigin(nextUrl) === ingressOrigin) {
    await persistFailover(
      payload,
      strategy,
      receiptId,
      env,
      "NEXTJS_APP_URL must point to a direct Next.js origin that bypasses this Worker route"
    );
    return;
  }

  const forwardPayload = {
    ...payload.enforceData,
    saibId: payload.saibId,
    edgeReceiptId: receiptId,
    edgeAcceptedAt: new Date().toISOString(),
    edgeStrategy: strategy,
    hardwareTelemetry: payload.hardwareTelemetry || null,
  };

  try {
    const response = await fetchWithTimeout(
      `${nextUrl}/api/saib/enforce`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
          "X-SAIB-Edge-Receipt": receiptId,
          "X-SAIB-Strategy": strategy,
        },
        body: JSON.stringify(forwardPayload),
      },
      FORWARD_TIMEOUT_MS
    );

    if (!response.ok) {
      const body = await safeText(response);
      await persistFailover(
        payload,
        strategy,
        receiptId,
        env,
        `Next.js push failed: ${response.status} ${body.slice(0, 500)}`
      );
    }
  } catch (err) {
    await persistFailover(
      payload,
      strategy,
      receiptId,
      env,
      `Network push failed: ${err && err.message ? err.message : String(err)}`
    );
  }
}

function safeOrigin(value) {
  try {
    return new URL(value).origin;
  } catch {
    return "";
  }
}

async function fetchWithTimeout(url, init, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort("timeout"), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function persistFailover(payload, strategy, receiptId, env, reason) {
  const record = {
    receiptId,
    reason,
    strategy,
    failedAt: new Date().toISOString(),
    payload,
  };

  if (env.SAIB_BACKUP_QUEUE) {
    try {
      await env.SAIB_BACKUP_QUEUE.send(record);
      return;
    } catch (err) {
      console.error(
        "SAIB queue failover failed",
        err && err.message ? err.message : err
      );
    }
  }

  const kv = env.SAIB_BACKUP_KV || env.SAIB_CACHE;
  if (kv) {
    try {
      await kv.put(
        `saib_failover_${payload.saibId}_${Date.now()}_${receiptId}`,
        JSON.stringify(record),
        {
          expirationTtl: 60 * 60 * 24 * 7,
        }
      );
      return;
    } catch (err) {
      console.error("SAIB KV failover failed", err && err.message ? err.message : err);
    }
  }

  console.error(
    "SAIB edge delivery failed without queue/KV failover",
    reason
  );
}

async function handleCacheRead(url, env, policy, ctx) {
  const cacheKey = `saib:${url.pathname}${url.search}`;
  const now = Date.now();

  if (env.SAIB_CACHE) {
    const cached = await env.SAIB_CACHE.getWithMetadata(cacheKey, "stream");
    if (cached.value && cached.metadata) {
      const { storedAt, ttl, swr, headers } = cached.metadata;
      const age = (now - storedAt) / 1000;

      if (age < ttl) {
        return new Response(cached.value, {
          headers: {
            ...headers,
            "x-saib-edge": "HIT",
            age: String(Math.floor(age)),
          },
        });
      }

      if (age < ttl + swr) {
        ctx.waitUntil(refresh(env, url, cacheKey, policy));
        return new Response(cached.value, {
          headers: {
            ...headers,
            "x-saib-edge": "STALE",
            age: String(Math.floor(age)),
          },
        });
      }
    }
  }

  return refresh(env, url, cacheKey, policy, true);
}

async function refresh(env, url, cacheKey, policy, returnResponse = false) {
  const originReq = new Request(
    `${env.ORIGIN}${url.pathname}${url.search}`,
    { method: "GET" }
  );
  const resp = await fetch(originReq);

  if (resp.status >= 200 && resp.status < 400) {
    const body = await resp.arrayBuffer();
    const headers = {};
    resp.headers.forEach((value, key) => {
      headers[key] = value;
    });

    if (env.SAIB_CACHE) {
      await env.SAIB_CACHE.put(cacheKey, body, {
        expirationTtl: policy.ttl + policy.swr + 60,
        metadata: {
          storedAt: Date.now(),
          ttl: policy.ttl,
          swr: policy.swr,
          headers,
        },
      });
    }

    if (returnResponse) {
      return new Response(body, {
        status: resp.status,
        headers: { ...headers, "x-saib-edge": "MISS" },
      });
    }
  }
  return resp;
}

async function receiptDigest(payload, strategy) {
  const material = JSON.stringify({
    payload,
    strategy,
    acceptedAt: new Date().toISOString(),
  });
  const bytes = new TextEncoder().encode(material);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 24);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function safeText(response) {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

function jsonResponse(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-SAIB-Edge": "async-ingest",
    },
  });
}

/**
 * SAIB Edge Worker
 *
 * Responsibilities:
 *   1. GET cache tier for safe read-only SAIB/public status surfaces.
 *   2. Async SAIB enforcement ingress for real-world edge devices:
 *      validate fast, return 202, and forward to Next.js in ctx.waitUntil().
 *
 * This worker is intentionally auditable. It does not provide stealth or evasion;
 * it provides resilient asynchronous delivery, hardware-health backoff, receipts,
 * and KV/Queue failover when origin delivery is unavailable.
 *
 * Bind in wrangler.toml / Cloudflare dashboard:
 *   - ORIGIN            (var, e.g. https://triumphsynergy.app)
 *   - NEXTJS_APP_URL    (var, direct Next.js origin for /api/saib/enforce)
 *   - SAIB_SECRET_TOKEN (secret, Founder/operator token accepted by Next.js)
 *   - SAIB_CACHE        (KV namespace, cache + optional failover fallback)
 *   - SAIB_BACKUP_KV    (optional KV namespace for failed async deliveries)
 *   - SAIB_BACKUP_QUEUE (optional Queue for failed async deliveries)
 */

const CACHEABLE_PATHS = {
  "/health":     { ttl: 10,  swr: 30  },
  "/status":     { ttl: 10,  swr: 30  },
  "/codebase":   { ttl: 60,  swr: 300 },
  "/network":    { ttl: 60,  swr: 300 },
  "/loopholes":  { ttl: 300, swr: 600 },
  "/brain":      { ttl: 5,   swr: 60  },
  "/visitors":   { ttl: 5,   swr: 60  },
  "/persist":    { ttl: 5,   swr: 60  },
  "/learning":   { ttl: 5,   swr: 60  },
  "/report":     { ttl: 5,   swr: 60  },
  "/gold":       { ttl: 5,   swr: 60  },
  "/metrics":    { ttl: 5,   swr: 60  },
};

const ASYNC_ENFORCE_PATHS = new Set([
  "/api/saib/enforce",
  "/api/saib/edge/enforce",
  "/saib/enforce",
]);

const MAX_BODY_BYTES = 64 * 1024;
const POWER_CONSERVE_DELAY_MS = 5000;
const SIGNAL_NOISE_DELAY_MS = 2000;
const FORWARD_TIMEOUT_MS = 12000;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (ASYNC_ENFORCE_PATHS.has(url.pathname)) {
      return handleAsyncEnforcement(request, env, ctx);
    }

    const policy = CACHEABLE_PATHS[url.pathname];

    if (!policy || request.method !== "GET") {
      return fetch(new Request(`${env.ORIGIN}${url.pathname}${url.search}`, request));
    }

    return handleCacheRead(url, env, policy, ctx);
  },
};

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

  ctx.waitUntil(processAndPush(payload, strategy, receiptId, ingressOrigin, env));

  return jsonResponse({
    status: "Accepted",
    saibId: payload.saibId,
    receiptId,
    strategyEngaged: strategy,
  }, 202);
}

function validatePayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { ok: false, error: "Bad Request: payload must be an object" };
  }
  if (typeof payload.saibId !== "string" || !payload.saibId.trim()) {
    return { ok: false, error: "Bad Request: saibId is required" };
  }
  if (!payload.enforceData || typeof payload.enforceData !== "object" || Array.isArray(payload.enforceData)) {
    return { ok: false, error: "Bad Request: enforceData object is required" };
  }
  if (typeof payload.enforceData.action !== "string" || !payload.enforceData.action.trim()) {
    return { ok: false, error: "Bad Request: enforceData.action is required" };
  }
  return { ok: true };
}

function chooseProcessingStrategy(hardwareTelemetry = {}) {
  const batteryRemainingWh = Number(hardwareTelemetry.batteryRemainingWh ?? 120);
  const rfNoiseFloorDb = Number(hardwareTelemetry.rfNoiseFloorDb ?? -95);

  if (Number.isFinite(batteryRemainingWh) && batteryRemainingWh < 25) {
    return "THROTTLE_POWER_CONSERVE";
  }
  if (Number.isFinite(rfNoiseFloorDb) && rfNoiseFloorDb > -60) {
    return "THROTTLE_SIGNAL_NOISE";
  }
  return "STANDARD";
}

async function processAndPush(payload, strategy, receiptId, ingressOrigin, env) {
  if (strategy === "THROTTLE_POWER_CONSERVE") {
    await delay(POWER_CONSERVE_DELAY_MS);
  } else if (strategy === "THROTTLE_SIGNAL_NOISE") {
    await delay(SIGNAL_NOISE_DELAY_MS);
  }

  const nextUrl = env.NEXTJS_APP_URL;
  const token = env.SAIB_SECRET_TOKEN;
  if (!nextUrl || !token) {
    await persistFailover(payload, strategy, receiptId, env, "missing NEXTJS_APP_URL or SAIB_SECRET_TOKEN");
    return;
  }
  if (safeOrigin(nextUrl) === ingressOrigin) {
    await persistFailover(payload, strategy, receiptId, env, "NEXTJS_APP_URL must point to a direct Next.js origin that bypasses this Worker route");
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
    const response = await fetchWithTimeout(`${nextUrl}/api/saib/enforce`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`,
        "X-SAIB-Edge-Receipt": receiptId,
        "X-SAIB-Strategy": strategy,
      },
      body: JSON.stringify(forwardPayload),
    }, FORWARD_TIMEOUT_MS);

    if (!response.ok) {
      const body = await safeText(response);
      await persistFailover(payload, strategy, receiptId, env, `Next.js push failed: ${response.status} ${body.slice(0, 500)}`);
    }
  } catch (err) {
    await persistFailover(payload, strategy, receiptId, env, `Network push failed: ${err && err.message ? err.message : String(err)}`);
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
      console.error("SAIB queue failover failed", err && err.message ? err.message : err);
    }
  }

  const kv = env.SAIB_BACKUP_KV || env.SAIB_CACHE;
  if (kv) {
    try {
      await kv.put(`saib_failover_${payload.saibId}_${Date.now()}_${receiptId}`, JSON.stringify(record), {
        expirationTtl: 60 * 60 * 24 * 7,
      });
      return;
    } catch (err) {
      console.error("SAIB KV failover failed", err && err.message ? err.message : err);
    }
  }

  console.error("SAIB edge delivery failed without queue/KV failover", reason);
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
          headers: { ...headers, "x-saib-edge": "HIT", "age": String(Math.floor(age)) },
        });
      }

      if (age < ttl + swr) {
        ctx.waitUntil(refresh(env, url, cacheKey, policy));
        return new Response(cached.value, {
          headers: { ...headers, "x-saib-edge": "STALE", "age": String(Math.floor(age)) },
        });
      }
    }
  }

  return refresh(env, url, cacheKey, policy, true);
}

async function refresh(env, url, cacheKey, policy, returnResponse = false) {
  const originReq = new Request(`${env.ORIGIN}${url.pathname}${url.search}`, { method: "GET" });
  const resp = await fetch(originReq);

  if (resp.status >= 200 && resp.status < 400) {
    const body = await resp.arrayBuffer();
    const headers = {};
    resp.headers.forEach((value, key) => { headers[key] = value; });

    if (env.SAIB_CACHE) {
      await env.SAIB_CACHE.put(cacheKey, body, {
        expirationTtl: policy.ttl + policy.swr + 60,
        metadata: { storedAt: Date.now(), ttl: policy.ttl, swr: policy.swr, headers },
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
  const material = JSON.stringify({ payload, strategy, acceptedAt: new Date().toISOString() });
  const bytes = new TextEncoder().encode(material);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 24);
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

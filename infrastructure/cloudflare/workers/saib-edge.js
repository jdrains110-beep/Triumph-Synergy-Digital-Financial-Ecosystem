/**
 * SAIB Edge Cache Worker
 *
 * Adds a 2nd cache tier (KV) on top of Cloudflare's standard cache.
 * Implements stale-while-revalidate: serves stale content instantly,
 * refreshes from origin in the background. Origin sees ~1 req per
 * (path × edge POP × max-age) regardless of incoming RPS.
 *
 * Bind in wrangler.toml:
 *   - SAIB_CACHE (KV namespace)
 *   - ORIGIN     (var, e.g. "https://origin.triumphsynergy.example")
 */

const CACHEABLE_PATHS = {
  "/health":     { ttl: 10,  swr: 30  },
  "/status":    { ttl: 10,  swr: 30  },
  "/codebase":  { ttl: 60,  swr: 300 },
  "/network":   { ttl: 60,  swr: 300 },
  "/loopholes": { ttl: 300, swr: 600 },
  "/brain":     { ttl: 5,   swr: 60  },
  "/visitors":  { ttl: 5,   swr: 60  },
  "/persist":   { ttl: 5,   swr: 60  },
  "/learning":  { ttl: 5,   swr: 60  },
  "/report":    { ttl: 5,   swr: 60  },
  "/gold":      { ttl: 5,   swr: 60  },
  "/metrics":   { ttl: 5,   swr: 60  },
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const policy = CACHEABLE_PATHS[url.pathname];

    // Mutations / unknown paths → straight to origin
    if (!policy || request.method !== "GET") {
      return fetch(new Request(env.ORIGIN + url.pathname + url.search, request));
    }

    const cacheKey = `saib:${url.pathname}${url.search}`;
    const now = Date.now();

    // 1. Try KV
    const cached = await env.SAIB_CACHE.getWithMetadata(cacheKey, "stream");
    if (cached.value && cached.metadata) {
      const { storedAt, ttl, swr, headers } = cached.metadata;
      const age = (now - storedAt) / 1000;

      if (age < ttl) {
        // Fresh — serve directly
        return new Response(cached.value, {
          headers: { ...headers, "x-saib-edge": "HIT", "age": String(Math.floor(age)) },
        });
      }

      if (age < ttl + swr) {
        // Stale-but-valid — serve stale, refresh in background
        ctx.waitUntil(refresh(env, url, cacheKey, policy));
        return new Response(cached.value, {
          headers: { ...headers, "x-saib-edge": "STALE", "age": String(Math.floor(age)) },
        });
      }
    }

    // 2. Miss — fetch + cache
    return await refresh(env, url, cacheKey, policy, /*returnResponse=*/ true);
  },
};

async function refresh(env, url, cacheKey, policy, returnResponse = false) {
  const originReq = new Request(env.ORIGIN + url.pathname + url.search, { method: "GET" });
  const resp = await fetch(originReq);

  if (resp.status >= 200 && resp.status < 400) {
    const body = await resp.arrayBuffer();
    const headers = {};
    resp.headers.forEach((v, k) => { headers[k] = v; });

    await env.SAIB_CACHE.put(cacheKey, body, {
      expirationTtl: policy.ttl + policy.swr + 60,
      metadata: { storedAt: Date.now(), ttl: policy.ttl, swr: policy.swr, headers },
    });

    if (returnResponse) {
      return new Response(body, {
        status: resp.status,
        headers: { ...headers, "x-saib-edge": "MISS" },
      });
    }
  }
  return resp;
}

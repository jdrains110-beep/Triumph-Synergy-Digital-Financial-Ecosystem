/**
 * app/api/saib/knowledge/route.ts
 *
 * SAIB v6 Omega Brain — knowledge stats and recall.
 *
 * GET  /api/saib/knowledge          — brain stats
 * GET  /api/saib/knowledge/recall?domain=&top_k=  — recall nodes
 * POST /api/saib/knowledge/absorb   — feed new knowledge signal
 * POST /api/saib/knowledge/grow     — force a warp-speed growth cycle
 */

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const NANO_SAIB_URL =
  process.env.NANO_SAIB_URL ?? "http://triumph-sovereign-nano-saib:8201";
const SAIB_TOKEN = process.env.SAIB_TOKEN ?? "";

function authHeaders(): Record<string, string> {
  const h: Record<string, string> = { Accept: "application/json" };
  if (SAIB_TOKEN) h["Authorization"] = `Bearer ${SAIB_TOKEN}`;
  return h;
}

/** GET /api/saib/knowledge — brain stats */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const recall = searchParams.has("recall");

  try {
    if (recall) {
      const domain = searchParams.get("domain") ?? "";
      const topK = parseInt(searchParams.get("top_k") ?? "20", 10);
      const params = new URLSearchParams({ domain, top_k: String(topK) });
      const upstream = await fetch(
        `${NANO_SAIB_URL}/omega/brain/recall?${params.toString()}`,
        { headers: authHeaders(), cache: "no-store", signal: AbortSignal.timeout(5_000) }
      );
      if (!upstream.ok) return NextResponse.json({ error: "Upstream error" }, { status: 502 });
      return NextResponse.json(await upstream.json());
    }

    const upstream = await fetch(`${NANO_SAIB_URL}/omega/brain/stats`, {
      headers: authHeaders(),
      cache: "no-store",
      signal: AbortSignal.timeout(5_000),
    });
    if (!upstream.ok) return NextResponse.json({ error: "Upstream error" }, { status: 502 });
    return NextResponse.json(await upstream.json());
  } catch {
    return NextResponse.json(
      {
        total_nodes: 0,
        total_absorbed: 0,
        total_recalled: 0,
        growth_cycle: 0,
        next_multiplier: 3,
        status: "STANDBY",
      },
      { status: 200 }
    );
  }
}

/** POST /api/saib/knowledge — absorb or grow */
export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action") ?? "absorb";

  if (action === "grow") {
    try {
      const upstream = await fetch(`${NANO_SAIB_URL}/omega/brain/grow`, {
        method: "POST",
        headers: authHeaders(),
        signal: AbortSignal.timeout(10_000),
      });
      if (!upstream.ok) return NextResponse.json({ error: "Upstream error" }, { status: 502 });
      return NextResponse.json(await upstream.json());
    } catch {
      return NextResponse.json({ error: "Omega Brain offline" }, { status: 503 });
    }
  }

  // default: absorb
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { domain, payload, confidence } = body as {
    domain?: string;
    payload?: Record<string, unknown>;
    confidence?: number;
  };

  if (!domain || typeof domain !== "string") {
    return NextResponse.json({ error: "domain is required" }, { status: 400 });
  }

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...authHeaders(),
    };
    const upstream = await fetch(`${NANO_SAIB_URL}/omega/brain/absorb`, {
      method: "POST",
      headers,
      body: JSON.stringify({ domain, payload: payload ?? {}, confidence: confidence ?? 1.0 }),
      signal: AbortSignal.timeout(5_000),
    });
    if (!upstream.ok) return NextResponse.json({ error: "Upstream error" }, { status: 502 });
    return NextResponse.json(await upstream.json());
  } catch {
    return NextResponse.json({ error: "Omega Brain offline" }, { status: 503 });
  }
}

/**
 * app/api/sovereign/ai-bot/docker/route.ts
 *
 * Bridge: proxies requests to the Sovereign AI Bot Docker container
 * (triumph-sovereign-ai-bot:8099) so the browser-side dashboard can
 * read live sentinel-mode status, learning model, and service health.
 *
 * Security: APEX-QUANTUM-SOVEREIGN
 */

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const SAIB_URL = process.env.SAIB_URL ?? "http://triumph-sovereign-ai-bot:8099";

// Allowed passthrough endpoints (whitelist — never expose Docker internals beyond these)
const ALLOWED: Record<string, string> = {
  status:   "/status",
  report:   "/report",
  learning: "/learning",
  health:   "/health",
  loopholes:"/loopholes",
};

export async function GET(req: NextRequest) {
  const endpoint = req.nextUrl.searchParams.get("endpoint") ?? "status";
  const path     = ALLOWED[endpoint];

  if (!path) {
    return NextResponse.json({ success: false, error: "Unknown endpoint" }, { status: 400 });
  }

  try {
    const upstream = await fetch(`${SAIB_URL}${path}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });

    if (!upstream.ok) {
      return NextResponse.json(
        { success: false, error: `SAIB returned ${upstream.status}`, containerOnline: false },
        { status: 502 },
      );
    }

    const data = await upstream.json();
    return NextResponse.json({ success: true, containerOnline: true, ...data });
  } catch {
    // Container not yet started or unreachable — return graceful degradation
    return NextResponse.json({
      success:        false,
      containerOnline: false,
      error:          "SAIB container unreachable — start with: docker compose up -d sovereign-ai-bot",
      saib_version:   "TRIUMPH-SAIB-v1",
      security_level: "APEX-QUANTUM-SOVEREIGN",
      intelligence_mode: "sentinel",
    });
  }
}

export async function POST(req: NextRequest) {
  const endpoint = req.nextUrl.searchParams.get("endpoint") ?? "execute";
  if (!["execute", "scan"].includes(endpoint)) {
    return NextResponse.json({ success: false, error: "Unknown endpoint" }, { status: 400 });
  }

  try {
    const body     = await req.json();
    const upstream = await fetch(`${SAIB_URL}/${endpoint}`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(body),
      signal:  AbortSignal.timeout(12_000),
    });

    const data = await upstream.json();
    return NextResponse.json({ success: upstream.ok, containerOnline: true, ...data });
  } catch {
    return NextResponse.json({ success: false, containerOnline: false, error: "SAIB container unreachable" });
  }
}

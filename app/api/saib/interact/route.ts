/**
 * app/api/saib/interact/route.ts
 *
 * SAIB v6 Interaction Engine — any user, service, or external actor can send
 * a message to SAIB Omega Prime and receive an intelligent sovereign response.
 *
 * POST  /api/saib/interact  { actor_id, message, context? }
 */

import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const NANO_SAIB_URL =
  process.env.NANO_SAIB_URL ?? "http://triumph-sovereign-nano-saib:8201";
const SAIB_TOKEN = process.env.SAIB_TOKEN ?? "";

/** POST /api/saib/interact */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { actor_id, message, context } = body as {
    actor_id?: string;
    message?: string;
    context?: Record<string, unknown>;
  };

  if (!actor_id || typeof actor_id !== "string" || actor_id.trim() === "") {
    return NextResponse.json({ error: "actor_id is required" }, { status: 400 });
  }
  if (!message || typeof message !== "string" || message.trim() === "") {
    return NextResponse.json({ error: "message is required" }, { status: 400 });
  }

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    if (SAIB_TOKEN) headers["Authorization"] = `Bearer ${SAIB_TOKEN}`;

    const upstream = await fetch(`${NANO_SAIB_URL}/omega/interact`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        actor_id: actor_id.trim(),
        message: message.trim(),
        context: context ?? {},
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!upstream.ok) {
      const err = await upstream.json().catch(() => ({ detail: "Upstream error" }));
      return NextResponse.json(err, { status: upstream.status });
    }

    const result = await upstream.json();
    return NextResponse.json(result);
  } catch {
    // Graceful fallback when Docker is not running
    return NextResponse.json({
      reply:
        "Sovereign Nano SAIB Omega Prime is currently offline. " +
        "The Triumph Synergy ecosystem remains sovereign and protected. " +
        "Please try again shortly.",
      actor_class: "UNKNOWN",
      threat_level: 0.0,
      precision: "SUPERNATURAL",
      modes_active: ["MESH", "CONTAINER", "ECOSYSTEM"],
      knowledge_used: 0,
    });
  }
}

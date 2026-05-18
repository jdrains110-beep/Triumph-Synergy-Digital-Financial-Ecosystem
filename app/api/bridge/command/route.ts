/**
 * POST /api/bridge/command
 *
 * Enqueue a command for one (or all) connected Docker Desktop nodes.
 * The command is published on a Redis channel that /api/bridge/stream
 * subscribers (the Docker connectors) receive in real time.
 *
 * Body:
 *   {
 *     "node_id"?: string,         // omit or "broadcast" for fan-out
 *     "action":   string,         // e.g. "refresh_horizon", "ping"
 *     "params"?:  object
 *   }
 */

import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import { BRIDGE_COMMANDS_CHANNEL, bridgeTokenOk } from "../_auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface CommandBody {
  node_id?: string;
  action?: string;
  params?: Record<string, unknown>;
}

export async function POST(req: Request) {
  if (!bridgeTokenOk(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let body: CommandBody;
  try {
    body = (await req.json()) as CommandBody;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const action = (body.action || "").trim();
  if (!action) {
    return NextResponse.json({ ok: false, error: "action_required" }, { status: 400 });
  }

  const target = (body.node_id || "broadcast").trim().slice(0, 64) || "broadcast";
  const channel = BRIDGE_COMMANDS_CHANNEL(target);
  const envelope = {
    id: cryptoRandomId(),
    issued_at: new Date().toISOString(),
    target_node: target,
    action,
    params: body.params ?? {},
  };

  try {
    const delivered = await redis.publish(channel, JSON.stringify(envelope));
    return NextResponse.json({
      ok: true,
      queued: true,
      channel,
      subscribers: delivered,
      envelope,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[bridge/command] redis publish failed:", msg);
    return NextResponse.json({ ok: false, error: "redis_unavailable" }, { status: 503 });
  }
}

function cryptoRandomId(): string {
  // Node 18+ has globalThis.crypto.randomUUID
  const g = globalThis.crypto;
  if (g && typeof g.randomUUID === "function") return g.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

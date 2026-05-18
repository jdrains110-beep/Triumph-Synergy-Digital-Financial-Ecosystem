/**
 * POST /api/bridge/ingest
 *
 * Docker Desktop pi-bridge-connector pushes its latest ledger + node state
 * snapshot here every ~10s. We:
 *   1. authenticate the bearer token
 *   2. cache the latest snapshot under `triumph:bridge:node:<id>:state`
 *   3. add the node id to a set for discovery
 *   4. publish on `triumph:bridge:ingest` so live dashboards can react
 */

import { NextResponse } from "next/server";
import { redis } from "@/lib/redis";
import {
  BRIDGE_INGEST_CHANNEL,
  BRIDGE_NODES_SET,
  BRIDGE_STATE_KEY,
  BRIDGE_STATE_TTL_S,
  bridgeTokenOk,
  nodeIdFrom,
} from "../_auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!bridgeTokenOk(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const nodeId = nodeIdFrom(req);
  const envelope = {
    node_id: nodeId,
    received_at: new Date().toISOString(),
    snapshot: body,
  };
  const serialized = JSON.stringify(envelope);

  try {
    await Promise.all([
      redis.set(BRIDGE_STATE_KEY(nodeId), serialized, { EX: BRIDGE_STATE_TTL_S }),
      redis.sAdd(BRIDGE_NODES_SET, nodeId),
      redis.publish(BRIDGE_INGEST_CHANNEL, serialized),
    ]);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[bridge/ingest] redis error:", msg);
    return NextResponse.json({ ok: false, error: "redis_unavailable" }, { status: 503 });
  }

  return NextResponse.json({ ok: true, node_id: nodeId });
}

export async function GET(req: Request) {
  if (!bridgeTokenOk(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  // Return latest snapshot(s) — convenient for browser debugging.
  try {
    const nodes = await redis.sMembers(BRIDGE_NODES_SET);
    const out: Record<string, unknown> = {};
    for (const nodeId of nodes) {
      const raw = await redis.get(BRIDGE_STATE_KEY(nodeId));
      if (raw) {
        try {
          out[nodeId] = JSON.parse(raw);
        } catch {
          out[nodeId] = raw;
        }
      }
    }
    return NextResponse.json({ ok: true, nodes: out });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 503 });
  }
}

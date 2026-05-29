import { type NextRequest, NextResponse } from "next/server";
import {
  _peekMockInbox,
  verifyEnvelope,
  type TravelRuleEnvelope,
} from "@/lib/pi/travel-rule";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Inbox endpoint — accepts TRP envelopes from other VASPs.
 * GET  → list received envelopes (mock transport only)
 * POST → ingest one; verifies signature if TRAVEL_RULE_PEER_PUBKEY set
 */
export async function GET() {
  return NextResponse.json({ envelopes: _peekMockInbox() });
}

export async function POST(req: NextRequest) {
  try {
    const env = (await req.json()) as TravelRuleEnvelope;
    if (!env?.id || !env?.payload) {
      return NextResponse.json({ error: "invalid envelope" }, { status: 400 });
    }
    const peerKey = process.env.TRAVEL_RULE_PEER_PUBKEY;
    if (peerKey && env.signature && !verifyEnvelope(env, peerKey)) {
      return NextResponse.json({ error: "signature verification failed" }, { status: 401 });
    }
    return NextResponse.json({ receiptId: env.id, received: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "inbox error" },
      { status: 500 },
    );
  }
}

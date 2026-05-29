import { type NextRequest, NextResponse } from "next/server";
import { audit, verifyChain } from "@/lib/pi/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      actor?: string;
      action?: string;
      subject?: string;
      payload?: Record<string, unknown>;
    };
    if (!body?.action) return NextResponse.json({ error: "action required" }, { status: 400 });
    const r = await audit({
      actor: body.actor,
      action: body.action,
      subject: body.subject,
      payload: body.payload,
    });
    return NextResponse.json(r);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "audit failed" }, { status: 500 });
  }
}

export async function GET() {
  const r = await verifyChain();
  return NextResponse.json(r);
}

import { type NextRequest, NextResponse } from "next/server";
import { reconcileWithChain } from "@/lib/pi/transfer-agent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { isin } = (await req.json()) as { isin?: string };
    if (!isin) return NextResponse.json({ error: "isin required" }, { status: 400 });
    const r = await reconcileWithChain(isin);
    return NextResponse.json(r);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "reconcile failed" }, { status: 500 });
  }
}

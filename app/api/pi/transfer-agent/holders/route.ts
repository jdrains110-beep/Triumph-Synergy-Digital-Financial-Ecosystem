import { type NextRequest, NextResponse } from "next/server";
import { upsertHolder, listHolders, type Holder } from "@/lib/pi/transfer-agent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Holder;
    if (!body?.isin || !body?.accountId || body.balance === undefined) {
      return NextResponse.json({ error: "isin, accountId, balance required" }, { status: 400 });
    }
    const r = await upsertHolder(body);
    return NextResponse.json({ ok: true, holder: r });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "upsert failed" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const isin = req.nextUrl.searchParams.get("isin");
  if (!isin) return NextResponse.json({ error: "isin required" }, { status: 400 });
  const list = await listHolders(isin);
  return NextResponse.json({ isin, holders: list });
}

import { type NextRequest, NextResponse } from "next/server";
import { registerSecurity, getSecurity, type Security } from "@/lib/pi/transfer-agent";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Security;
    if (!body?.isin || !body?.assetCode || !body?.assetIssuer || !body?.network) {
      return NextResponse.json({ error: "isin, assetCode, assetIssuer, network required" }, { status: 400 });
    }
    const r = await registerSecurity(body);
    return NextResponse.json({ ok: true, security: r });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "register failed" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const isin = req.nextUrl.searchParams.get("isin");
  if (!isin) return NextResponse.json({ error: "isin required" }, { status: 400 });
  const s = await getSecurity(isin);
  if (!s) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(s);
}

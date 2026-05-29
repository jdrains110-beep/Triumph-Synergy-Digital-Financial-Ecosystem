import { type NextRequest, NextResponse } from "next/server";
import { fileSar, verifyRegulatorJwt, type SarFiling } from "@/lib/pi/regulator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authClaims(req: NextRequest) {
  const h = req.headers.get("authorization") || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  if (!m) throw new Error("missing bearer");
  return verifyRegulatorJwt(m[1]);
}

export async function POST(req: NextRequest) {
  try {
    const claims = authClaims(req);
    const body = (await req.json()) as SarFiling;
    if (!body?.kind || !body?.subject || !body?.narrative) {
      return NextResponse.json({ error: "kind, subject, narrative required" }, { status: 400 });
    }
    const filed = await fileSar({
      ...body,
      jurisdiction: body.jurisdiction || claims.jur,
      filedBy: body.filedBy || claims.sub || `regulator:${claims.jur}`,
    });
    return NextResponse.json({ ok: true, filing: filed });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "sar failed";
    const status = /token|bearer|signature|expired|role/i.test(msg) ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

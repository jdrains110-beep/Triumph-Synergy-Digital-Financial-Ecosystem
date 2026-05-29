import { type NextRequest, NextResponse } from "next/server";
import { generateReport, verifyRegulatorJwt, type ReportType } from "@/lib/pi/regulator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authClaims(req: NextRequest) {
  const h = req.headers.get("authorization") || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  if (!m) throw new Error("missing bearer");
  return verifyRegulatorJwt(m[1]);
}

export async function GET(req: NextRequest) {
  try {
    const claims = authClaims(req);
    const type = req.nextUrl.searchParams.get("type") as ReportType | null;
    if (!type) return NextResponse.json({ error: "type required" }, { status: 400 });
    const params: Record<string, string> = {};
    req.nextUrl.searchParams.forEach((v, k) => {
      if (k !== "type") params[k] = v;
    });
    const r = await generateReport(type, params, claims);
    return NextResponse.json(r);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "report failed";
    const status = /token|bearer|signature|expired|role/i.test(msg) ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

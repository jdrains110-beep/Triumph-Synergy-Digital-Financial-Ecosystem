import { type NextRequest, NextResponse } from "next/server";
import { signRegulatorJwt } from "@/lib/pi/regulator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/pi/regulator/token
 * body: { jurisdiction: string, sub?: string, ttl?: number }
 *
 * Issuer endpoint — gated by REGULATOR_TOKEN_ADMIN_SECRET header. Mints a
 * short-lived JWT that the regulator uses on subsequent calls.
 */
export async function POST(req: NextRequest) {
  const adminSecret = process.env.REGULATOR_TOKEN_ADMIN_SECRET;
  const presented = req.headers.get("x-admin-secret");
  if (!adminSecret || presented !== adminSecret) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  try {
    const { jurisdiction, sub, ttl } = (await req.json()) as {
      jurisdiction?: string;
      sub?: string;
      ttl?: number;
    };
    if (!jurisdiction) return NextResponse.json({ error: "jurisdiction required" }, { status: 400 });
    const ttlSec = Math.min(Math.max(ttl || 3600, 60), 24 * 3600);
    const token = signRegulatorJwt(
      { role: "regulator", jur: jurisdiction, sub, exp: 0 },
      ttlSec,
    );
    return NextResponse.json({ token, expiresIn: ttlSec });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "token failed" }, { status: 500 });
  }
}

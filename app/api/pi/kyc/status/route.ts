import { type NextRequest, NextResponse } from "next/server";
import { getStatusByApplicationId, getStatusByExternalId, requireKycLevel } from "@/lib/pi/kyc";

/**
 * GET /api/pi/kyc/status?externalId=... | ?applicationId=... | ?externalId=...&minLevel=basic
 * Unified status + gating endpoint.
 */
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const externalId = sp.get("externalId");
  const applicationId = sp.get("applicationId");
  const minLevel = sp.get("minLevel") as "phone" | "basic" | "enhanced" | "institutional" | null;

  if (applicationId) {
    const r = await getStatusByApplicationId(applicationId);
    if (!r) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json(r);
  }
  if (!externalId) {
    return NextResponse.json({ error: "externalId or applicationId required" }, { status: 400 });
  }
  if (minLevel) {
    const gate = await requireKycLevel(externalId, minLevel);
    return NextResponse.json(gate, { status: gate.allowed ? 200 : 403 });
  }
  const r = await getStatusByExternalId(externalId);
  if (!r) return NextResponse.json({ status: "not_started", level: "unverified" });
  return NextResponse.json(r);
}

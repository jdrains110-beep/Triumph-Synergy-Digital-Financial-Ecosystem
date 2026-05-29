import { type NextRequest, NextResponse } from "next/server";
import { getStatusByExternalId, startKyc } from "@/lib/pi/kyc";

/**
 * POST /api/pi/kyc/start
 * body: { externalId, email?, phone?, countryCode?, fullName?, dateOfBirth?, requestedLevel? }
 * Starts a KYC flow via the configured provider (KYC_PROVIDER env).
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      externalId?: string;
      email?: string;
      phone?: string;
      countryCode?: string;
      fullName?: string;
      dateOfBirth?: string;
      requestedLevel?: "phone" | "basic" | "enhanced" | "institutional";
    };
    if (!body.externalId) {
      return NextResponse.json({ error: "externalId required" }, { status: 400 });
    }
    const r = await startKyc(
      {
        externalId: body.externalId,
        email: body.email,
        phone: body.phone,
        countryCode: body.countryCode,
        fullName: body.fullName,
        dateOfBirth: body.dateOfBirth,
      },
      { requestedLevel: body.requestedLevel },
    );
    return NextResponse.json(r);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "kyc start failed" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/pi/kyc/start?externalId=...
 * Returns latest KYC record for a user (no flow started if none exists).
 */
export async function GET(req: NextRequest) {
  const ext = req.nextUrl.searchParams.get("externalId");
  if (!ext) return NextResponse.json({ error: "externalId required" }, { status: 400 });
  const r = await getStatusByExternalId(ext);
  if (!r) return NextResponse.json({ status: "not_started", level: "unverified" });
  return NextResponse.json(r);
}

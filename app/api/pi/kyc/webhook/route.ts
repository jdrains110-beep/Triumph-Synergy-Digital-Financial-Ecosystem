import { type NextRequest, NextResponse } from "next/server";
import { applyWebhook, getKycProvider } from "@/lib/pi/kyc";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/pi/kyc/webhook
 * Provider posts here on status changes. Provider adapter is responsible
 * for verifying the signature; we just normalize and persist.
 */
export async function POST(req: NextRequest) {
  try {
    const raw = await req.text();
    const headers: Record<string, string> = {};
    req.headers.forEach((v, k) => {
      headers[k] = v;
    });
    const event = await getKycProvider().parseWebhook(raw, headers);
    await applyWebhook(event);
    return NextResponse.json({ ok: true, applicationId: event.applicationId, status: event.status });
  } catch (e) {
    console.error("[kyc webhook]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "webhook error" },
      { status: 400 },
    );
  }
}

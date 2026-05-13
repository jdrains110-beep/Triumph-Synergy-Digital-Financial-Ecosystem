import { type NextRequest, NextResponse } from "next/server";
import { rateLimitByIPAsync, isValidId } from "@/lib/security/api-guard";
import { appendAuditEvent } from "@/lib/security/audit-chain";

export async function POST(req: NextRequest) {
  // Rate limit: 20 incomplete-payment reports per minute per IP (Redis-backed)
  const rl = await rateLimitByIPAsync(req, "pi-payment-incomplete", 20, 60_000);
  if (!rl.allowed) {
    void appendAuditEvent("ratelimit.tripped", { route: "incomplete" });
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const body = await req.json();
    const { paymentId, reason } = body;

    if (!isValidId(paymentId)) {
      return NextResponse.json(
        { error: "Payment ID required" },
        { status: 400 }
      );
    }

    void appendAuditEvent("payment.incomplete", { paymentId, reason: String(reason ?? "") });
    console.log("[Pi Payment] Incomplete payment reported:", { paymentId, reason });

    return NextResponse.json({
      success: true,
      message: "Incomplete payment logged for recovery",
      paymentId,
      status: "incomplete",
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to process incomplete payment" },
      { status: 500 }
    );
  }
}

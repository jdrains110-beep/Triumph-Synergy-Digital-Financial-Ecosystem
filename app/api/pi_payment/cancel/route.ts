import { type NextRequest, NextResponse } from "next/server";
import { rateLimitByIPAsync, isValidId } from "@/lib/security/api-guard";
import { appendAuditEvent } from "@/lib/security/audit-chain";

export async function POST(req: NextRequest) {
  // Rate limit: 20 cancellations per minute per IP (Redis-backed, distributed)
  const rl = await rateLimitByIPAsync(req, "pi-payment-cancel", 20, 60_000);
  if (!rl.allowed) {
    void appendAuditEvent("ratelimit.tripped", { route: "cancel" });
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const body = await req.json();
    const { paymentId } = body;

    if (!isValidId(paymentId)) {
      return NextResponse.json(
        { error: "Payment ID required" },
        { status: 400 }
      );
    }

    void appendAuditEvent("payment.cancelled", { paymentId });
    console.log("[Pi Payment] Cancelling payment:", paymentId);

    return NextResponse.json({
      success: true,
      message: "Payment cancelled successfully",
      paymentId,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to cancel payment" },
      { status: 500 }
    );
  }
}

import { type NextRequest, NextResponse } from "next/server";
import { rateLimitByIPAsync, isValidId } from "@/lib/security/api-guard";
import { appendAuditEvent } from "@/lib/security/audit-chain";

export async function POST(req: NextRequest) {
  // Rate limit: 30 error reports per minute per IP (Redis-backed)
  const rl = await rateLimitByIPAsync(req, "pi-payment-error", 30, 60_000);
  if (!rl.allowed) {
    void appendAuditEvent("ratelimit.tripped", { route: "pi-payment-error" });
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const body = await req.json();
    const { paymentId, error: errorDetails } = body;

    if (!isValidId(paymentId)) {
      return NextResponse.json(
        { error: "Payment ID required" },
        { status: 400 }
      );
    }

    void appendAuditEvent("payment.failed", { paymentId, stage: "client-error" });
    // Log internally but do not echo errorDetails back to the client
    console.error("[Pi Payment] Payment error reported:", { paymentId, errorDetails });

    return NextResponse.json({
      success: true,
      message: "Error logged successfully",
      paymentId,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to process error" },
      { status: 500 }
    );
  }
}

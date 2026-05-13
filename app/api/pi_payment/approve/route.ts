import { type NextRequest, NextResponse } from "next/server";
import { rateLimitByIPAsync, isValidId, safeErrorResponse } from "@/lib/security/api-guard";
import { withIdempotency } from "@/lib/security/idempotency";
import { signReceipt } from "@/lib/security/pq-receipts";
import { appendAuditEvent } from "@/lib/security/audit-chain";

// Pi Network API Configuration
const PI_API_KEY = process.env.PI_API_KEY || "";

export async function POST(req: NextRequest) {
  return withIdempotency(req, () => handle(req), {
    userScope: req.headers.get("x-wallet-publickey") ?? req.headers.get("x-forwarded-for") ?? "anon",
    ttlMs: 24 * 60 * 60 * 1000,
  });
}

async function handle(req: NextRequest) {
  try {
    // Rate limit: 30 approvals per minute per IP (Redis-backed, distributed)
    const rl = await rateLimitByIPAsync(req, "pi-payment-approve", 30, 60_000);
    if (!rl.allowed) {
      void appendAuditEvent("ratelimit.tripped", { route: "approve" });
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = await req.json();
    const { paymentId, amount } = body;

    if (!isValidId(paymentId)) {
      return NextResponse.json(
        { error: "Payment ID required" },
        { status: 400 }
      );
    }

    console.log("[Pi Payment API] Approving payment:", paymentId);

    // Verify payment exists and is valid
    const verifyResponse = await fetch(
      `https://api.minepi.com/v2/payments/${paymentId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Key ${PI_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!verifyResponse.ok) {
      console.error(
        "[Pi Payment API] Payment verification failed:",
        verifyResponse.status
      );
      return NextResponse.json(
        {
          error: "Payment verification failed",
          details: "Invalid or expired payment ID",
        },
        { status: 400 }
      );
    }

    const paymentData = await verifyResponse.json();
    console.log("[Pi Payment API] Payment verified:", paymentData);

    // Validate payment details
    if (amount && paymentData.amount !== amount) {
      return NextResponse.json(
        {
          error: "Amount mismatch",
          expected: paymentData.amount,
          received: amount,
        },
        { status: 400 }
      );
    }

    // Approve the payment
    const approveResponse = await fetch(
      `https://api.minepi.com/v2/payments/${paymentId}/approve`,
      {
        method: "POST",
        headers: {
          Authorization: `Key ${PI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          // Additional approval metadata can be added here
        }),
      }
    );

    if (!approveResponse.ok) {
      console.error(
        "[Pi Payment API] Payment approval failed:",
        approveResponse.status
      );
      return NextResponse.json(
        {
          error: "Payment approval failed",
        },
        { status: 400 }
      );
    }

    const approvalData = await approveResponse.json();
    console.log("[Pi Payment API] Payment approved:", approvalData);

    const receipt = signReceipt({
      paymentId,
      amount: paymentData.amount ?? amount ?? 0,
      memo: paymentData.memo ?? null,
      user: paymentData.user_uid ?? null,
      stage: "approved",
    });
    const auditHash = await appendAuditEvent(
      "payment.approved",
      { paymentId, amount: paymentData.amount, receiptHash: receipt.hash },
      paymentData.user_uid ?? null
    );

    return NextResponse.json({
      success: true,
      paymentId,
      status: "approved",
      data: approvalData,
      receipt,
      auditHash,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    void appendAuditEvent("payment.failed", { stage: "approve", err: String(error) });
    console.error("[Pi Payment API] Approval error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 }
    );
  }
}

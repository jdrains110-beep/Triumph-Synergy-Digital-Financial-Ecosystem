import { type NextRequest, NextResponse } from "next/server";
import { completePayment, verifyPayment } from "@/lib/pi/server";

/**
 * Pi Payment Completion Endpoint — POST /api/pi/complete
 *
 * Network resolution mirrors /api/pi/approve.
 */
export async function POST(req: NextRequest) {
  try {
    const { paymentId, txid } = (await req.json()) as {
      paymentId?: string;
      txid?: string;
    };

    if (!paymentId || !txid) {
      return NextResponse.json(
        {
          error: "Payment ID and transaction ID required",
          code: "MISSING_PARAMETERS",
        },
        { status: 400 },
      );
    }

    const verified = await verifyPayment(paymentId, req);
    if ("error" in verified) {
      return NextResponse.json(
        {
          error: "Payment verification failed",
          code: "PAYMENT_NOT_FOUND",
          network: verified.network,
          details: verified.error,
        },
        { status: 400 },
      );
    }
    const { payment, resolved } = verified;

    if (!payment.status?.developer_approved) {
      return NextResponse.json(
        {
          error: "Payment not approved",
          code: "PAYMENT_NOT_APPROVED",
          network: resolved.network,
          details: "Payment must be approved before completion",
        },
        { status: 400 },
      );
    }

    if (payment.status?.developer_completed) {
      return NextResponse.json({
        success: true,
        paymentId,
        txid,
        network: resolved.network,
        status: "already_completed",
        message: "Payment was already completed",
      });
    }

    const completed = await completePayment(paymentId, txid, resolved);
    if (!completed.ok) {
      return NextResponse.json(
        {
          error: "Payment completion failed",
          code: "COMPLETION_FAILED",
          network: resolved.network,
          details: completed.error,
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      paymentId,
      txid,
      network: resolved.network,
      status: "completed",
      data: completed.data,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Pi API] Completion error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        code: "INTERNAL_ERROR",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

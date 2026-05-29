import { type NextRequest, NextResponse } from "next/server";
import { cancelPayment, verifyPayment } from "@/lib/pi/server";

/**
 * Pi Payment Cancellation Endpoint — POST /api/pi/cancel
 * Network resolution mirrors /api/pi/approve.
 */
export async function POST(req: NextRequest) {
  try {
    const { paymentId, reason } = (await req.json()) as {
      paymentId?: string;
      reason?: string;
    };
    if (!paymentId) {
      return NextResponse.json(
        { error: "Payment ID required", code: "MISSING_PAYMENT_ID" },
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

    if (payment.status?.cancelled || payment.status?.user_cancelled) {
      return NextResponse.json({
        success: true,
        paymentId,
        network: resolved.network,
        status: "already_cancelled",
        message: "Payment was already cancelled",
      });
    }

    if (payment.status?.developer_completed) {
      return NextResponse.json(
        {
          error: "Cannot cancel completed payment",
          code: "PAYMENT_COMPLETED",
          network: resolved.network,
          details: "Completed payments cannot be cancelled",
        },
        { status: 400 },
      );
    }

    const cancelled = await cancelPayment(paymentId, resolved);
    if (!cancelled.ok) {
      return NextResponse.json(
        {
          error: "Payment cancellation failed",
          code: "CANCELLATION_FAILED",
          network: resolved.network,
          details: cancelled.error,
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      paymentId,
      network: resolved.network,
      status: "cancelled",
      reason: reason || "server-initiated",
      data: cancelled.data,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Pi API] Cancellation error:", error);
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

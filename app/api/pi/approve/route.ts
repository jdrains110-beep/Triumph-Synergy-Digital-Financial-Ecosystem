import { type NextRequest, NextResponse } from "next/server";

// Pi Network API Configuration
const PI_API_KEY = process.env.PI_API_KEY || "";
const PI_APP_ID = process.env.PI_APP_ID || "";

/**
 * Pi Payment Approval Endpoint
 * POST /api/pi/approve
 *
 * Server-side approval of Pi payments as required by Pi Platform docs
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { paymentId } = body;

    if (!paymentId) {
      return NextResponse.json(
        {
          error: "Payment ID required",
          code: "MISSING_PAYMENT_ID",
        },
        { status: 400 }
      );
    }

    console.log("[Pi API] Approving payment:", paymentId);

    // Verify payment exists and is valid using Pi Platform API
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
        "[Pi API] Payment verification failed:",
        verifyResponse.status
      );
      return NextResponse.json(
        {
          error: "Payment verification failed",
          code: "PAYMENT_NOT_FOUND",
          details: "Invalid or expired payment ID",
        },
        { status: 400 }
      );
    }

    const paymentData = await verifyResponse.json();
    console.log("[Pi API] Payment verified:", paymentData);

    // Check if payment is already approved
    if (paymentData.status?.developer_approved) {
      return NextResponse.json({
        success: true,
        paymentId,
        status: "already_approved",
        message: "Payment was already approved",
      });
    }

    // Approve the payment using Pi Platform API
    const approveResponse = await fetch(
      `https://api.minepi.com/v2/payments/${paymentId}/approve`,
      {
        method: "POST",
        headers: {
          Authorization: `Key ${PI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      }
    );

    if (!approveResponse.ok) {
      console.error(
        "[Pi API] Payment approval failed:",
        approveResponse.status
      );
      const errorText = await approveResponse.text();
      return NextResponse.json(
        {
          error: "Payment approval failed",
          code: "APPROVAL_FAILED",
          details: errorText,
        },
        { status: 400 }
      );
    }

    const approvalData = await approveResponse.json();
    console.log("[Pi API] Payment approved successfully:", approvalData);

    return NextResponse.json({
      success: true,
      paymentId,
      status: "approved",
      data: approvalData,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Pi API] Approval error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        code: "INTERNAL_ERROR",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

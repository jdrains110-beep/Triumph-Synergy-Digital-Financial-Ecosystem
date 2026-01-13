import { type NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { paymentId } = body;

    if (!paymentId) {
      return NextResponse.json(
        { error: "Payment ID required" },
        { status: 400 }
      );
    }

    // TODO: Implement payment cancellation logic
    console.log("[Pi Payment] Cancelling payment:", paymentId);

    return NextResponse.json({
      success: true,
      message: "Payment cancelled successfully",
      paymentId,
    });
  } catch (error) {
    console.error("[Pi Payment] Cancel error:", error);
    return NextResponse.json(
      { error: "Failed to cancel payment" },
      { status: 500 }
    );
  }
}

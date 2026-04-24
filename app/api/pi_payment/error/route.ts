import { type NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { paymentId, error: errorDetails } = body;

    console.error("[Pi Payment] Payment error reported:", {
      paymentId,
      error: errorDetails,
    });

    // TODO: Implement error logging and handling logic
    // Could store error details in database, send notifications, etc.

    return NextResponse.json({
      success: true,
      message: "Error logged successfully",
      paymentId,
    });
  } catch (error) {
    console.error("[Pi Payment] Error handling failed:", error);
    return NextResponse.json(
      { error: "Failed to process error" },
      { status: 500 }
    );
  }
}

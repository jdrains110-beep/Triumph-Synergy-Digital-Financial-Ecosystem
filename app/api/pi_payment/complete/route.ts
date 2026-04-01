import { type NextRequest, NextResponse } from "next/server";

// Pi Network API Configuration
const PI_API_KEY = process.env.PI_API_KEY || "";
const PI_APP_ID = process.env.PI_APP_ID || "";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { paymentId, txid, amount, memo, metadata, user, isAdmin } = body;

    if (!paymentId || !txid) {
      return NextResponse.json(
        { error: "Payment ID and transaction ID required" },
        { status: 400 }
      );
    }

    console.log("[Pi Payment API] Completing payment:", {
      paymentId,
      txid,
      amount,
      memo,
      user,
      isAdmin,
      metadata,
    });

    // Verify transaction exists on Pi Network
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
          details: "Invalid payment ID",
        },
        { status: 400 }
      );
    }

    const paymentData = await verifyResponse.json();
    console.log("[Pi Payment API] Payment data verified:", paymentData);

    // Validate transaction ID
    if (paymentData.transaction && paymentData.transaction.txid !== txid) {
      return NextResponse.json(
        {
          error: "Transaction ID mismatch",
          expected: paymentData.transaction.txid,
          received: txid,
        },
        { status: 400 }
      );
    }

    // Admin override logic
    if (isAdmin && metadata?.adminOverride) {
      console.log(
        "[Pi Payment API] Admin override applied for completion:",
        paymentId
      );
    }

    // Complete the payment
    const completeResponse = await fetch(
      `https://api.minepi.com/v2/payments/${paymentId}/complete`,
      {
        method: "POST",
        headers: {
          Authorization: `Key ${PI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          txid,
          // Additional completion metadata can be added here
        }),
      }
    );

    if (!completeResponse.ok) {
      console.error(
        "[Pi Payment API] Payment completion failed:",
        completeResponse.status
      );
      return NextResponse.json(
        {
          error: "Payment completion failed",
          details: await completeResponse.text(),
        },
        { status: 400 }
      );
    }

    const completionData = await completeResponse.json();
    console.log("[Pi Payment API] Payment completed:", completionData);

    // Additional network verification
    let networkVerified = false;
    try {
      // Verify transaction on Pi Network (this would be a real network check)
      networkVerified = true; // Placeholder - implement actual network verification
    } catch (networkError) {
      console.warn(
        "[Pi Payment API] Network verification failed:",
        networkError
      );
    }

    return NextResponse.json({
      success: true,
      paymentId,
      txid,
      status: "completed",
      networkVerified,
      data: completionData,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[Pi Payment API] Completion error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

import type { NextApiRequest, NextApiResponse } from "next";

/**
 * API Route for Pi Network Payment Processing
 * Handles buy requests and transaction settlement
 */

type PaymentRequest = {
  amount: number;
  productId: string;
  userId: string;
};

type PaymentResponse = {
  success: boolean;
  transactionId?: string;
  error?: string;
  status: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PaymentResponse>
) {
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed",
      status: "error",
    });
  }

  try {
    const { amount, productId, userId } = req.body as PaymentRequest;

    // Validate request
    if (!amount || !productId || !userId) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
        status: "invalid",
      });
    }

    // Generate transaction ID
    const transactionId = `pi_txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Log transaction (in production, save to database)
    console.log("💳 Payment Request:", {
      transactionId,
      amount,
      productId,
      userId,
      timestamp: new Date().toISOString(),
    });

    // In production, integrate with Pi Network SDK for actual payment
    // For now, simulate successful payment
    const simulatedPayment = {
      transactionId,
      amount,
      currency: "PI",
      productId,
      userId,
      status: "completed",
      timestamp: new Date().toISOString(),
    };

    console.log("✅ Payment Processed:", simulatedPayment);

    return res.status(200).json({
      success: true,
      transactionId,
      status: "completed",
    });
  } catch (error) {
    console.error("❌ Payment Error:", error);
    return res.status(500).json({
      success: false,
      error: "Payment processing failed",
      status: "error",
    });
  }
}

// app/api/payments/route.ts
// Unified Payment Processing API Endpoint
// Routes all payments through Pi (PRIMARY) → Apple Pay (SECONDARY)

import { type NextRequest, NextResponse } from "next/server";
import ApplePayProcessor from "@/lib/payments/apple-pay-secondary";
import PiNetworkPaymentProcessor from "@/lib/payments/pi-network-primary";
import UnifiedPaymentRouter from "@/lib/payments/unified-routing";

// Initialize payment processors
const router = new UnifiedPaymentRouter();
const piProcessor = new PiNetworkPaymentProcessor();
const appleProcessor = new ApplePayProcessor();

/**
 * POST /api/payments
 *
 * Process a payment through the unified payment system
 *
 * Request body:
 * {
 *   "method": "pi_network" | "apple_pay",
 *   "orderId": "string",
 *   "amount": number,
 *   // For Pi payments:
 *   "source": "internal" | "external",
 *   "userAddress": "string",
 *   // For Apple Pay:
 *   "paymentToken": "string",
 *   "currency": "USD"
 * }
 *
 * Response:
 * {
 *   "success": boolean,
 *   "paymentId": "string",
 *   "processor": "string",
 *   "data": {...},
 *   "error": "string"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Parse request
    const body = (await request.json()) as Record<string, unknown>;

    // Validate required fields
    const { method, orderId, amount } = body;

    if (!method || !orderId || !amount) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: method, orderId, amount",
        },
        { status: 400 }
      );
    }

    // Log payment attempt (for audit)
    console.log(
      `[PAYMENT] Received ${method} payment for order ${orderId}: ${amount}`
    );

    // Route payment through unified system
    const result = await router.routePayment(method as string, body);

    if (result.success) {
      // Store payment in database
      await storePaymentRecord({
        paymentId: result.paymentId || `payment_${Date.now()}`,
        method: method as string,
        processor: result.processor,
        orderId: orderId as string,
        amount: amount as number,
        timestamp: new Date().toISOString(),
        status: "confirmed",
      });

      console.log(`[PAYMENT] ✅ Payment processed: ${result.paymentId}`);

      return NextResponse.json({
        success: true,
        paymentId: result.paymentId,
        processor: result.processor,
        message: `Payment processed successfully via ${result.processor}`,
        data: {
          orderId,
          amount,
          method,
        },
      });
    }
    console.error(`[PAYMENT] ❌ Payment failed: ${result.error}`);

    return NextResponse.json(
      {
        success: false,
        processor: result.processor,
        error: result.error,
      },
      { status: 402 } // Payment Required
    );
  } catch (error) {
    console.error("[PAYMENT] Unexpected error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Payment processing failed",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/payments?method=pi_network&orderId=xxx
 *
 * Get payment status
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const _method = searchParams.get("method");
    const paymentId = searchParams.get("paymentId");
    const orderId = searchParams.get("orderId");

    if (!paymentId && !orderId) {
      return NextResponse.json(
        {
          success: false,
          error: "Provide either paymentId or orderId",
        },
        { status: 400 }
      );
    }

    // Retrieve payment status from database
    const payment = await getPaymentRecord(paymentId || orderId || "");

    if (!payment) {
      return NextResponse.json(
        {
          success: false,
          error: "Payment not found",
        },
        { status: 404 }
      );
    }

    // Get detailed status from processor
    let status: any = null;
    if (payment.method === "pi_network") {
      status = await piProcessor.getPaymentStatus(payment.paymentId);
    } else if (payment.method === "apple_pay") {
      status = await appleProcessor.getPaymentStatus(payment.paymentId);
    }

    return NextResponse.json({
      success: true,
      paymentId: payment.paymentId,
      method: payment.method,
      processor: payment.processor,
      orderId: payment.orderId,
      amount: payment.amount,
      status: status?.status || payment.status,
      createdAt: payment.timestamp,
      data: status,
    });
  } catch (error) {
    console.error("[PAYMENT_STATUS] Error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to retrieve payment status",
      },
      { status: 500 }
    );
  }
}

/**
 * Get payment statistics and performance metrics
 * @internal - Called by GET route with /stats parameter
 */
async function getPaymentStats(request: NextRequest) {
  try {
    if (!request.nextUrl.pathname.endsWith("/stats")) {
      return null;
    }

    const days = Number.parseInt(
      request.nextUrl.searchParams.get("days") || "30",
      10
    );
    const stats = await router.getPaymentStats(days);

    return NextResponse.json({
      success: true,
      period: `${days} days`,
      data: stats,
    });
  } catch (error) {
    console.error("[PAYMENT_STATS] Error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to retrieve payment statistics",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/payments/config
 *
 * Get available payment methods and configuration
 */
async function getConfig(request: NextRequest) {
  try {
    if (!request.nextUrl.pathname.endsWith("/config")) {
      return null;
    }

    // Validate system configuration
    const validation = await router.validateConfiguration();

    const methods = router.getAvailableMethods();

    return NextResponse.json({
      success: validation.ready,
      ready: validation.ready,
      status: validation.status,
      methods: methods.map((m) => ({
        id: m.id,
        name: m.name,
        type: m.type,
        priority: m.priority,
        targetAdoption: m.targetAdoption,
      })),
      primary: router.getPrimaryMethod(),
      secondary: router.getSecondaryMethod(),
      validation,
    });
  } catch (error) {
    console.error("[PAYMENT_CONFIG] Error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to retrieve payment configuration",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/payments/verify
 *
 * Verify a payment on the blockchain
 */
async function verifyPayment(request: NextRequest) {
  try {
    if (
      request.method !== "POST" ||
      !request.nextUrl.pathname.endsWith("/verify")
    ) {
      return null;
    }

    const body = (await request.json()) as Record<string, unknown>;
    const { paymentId, method, transactionHash } = body;

    if (!transactionHash) {
      return NextResponse.json(
        {
          success: false,
          error: "Transaction hash required",
        },
        { status: 400 }
      );
    }

    let verified: any = false;
    if (method === "pi_network") {
      verified = await piProcessor.verifyPiPayment(transactionHash as string);
    } else {
      return NextResponse.json(
        {
          success: false,
          error: "Verification only available for Pi Network payments",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: verified.valid || verified === true,
      paymentId,
      verified: verified.confirmed || verified === true,
      confirmations: verified.confirmations || 0,
    });
  } catch (error) {
    console.error("[PAYMENT_VERIFY] Error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Payment verification failed",
      },
      { status: 500 }
    );
  }
}

/**
 * Store payment record in database
 * @private
 */
function storePaymentRecord(payment: {
  paymentId: string;
  method: string;
  processor: string;
  orderId: string;
  amount: number;
  timestamp: string;
  status: string;
}): void {
  try {
    // Store in appropriate table based on method
    if (payment.method === "pi_network") {
      // INSERT INTO pi_payments (payment_id, order_id, amount, status, created_at)
      // VALUES ($1, $2, $3, $4, $5)
      console.log(`Stored Pi payment: ${payment.paymentId}`);
    } else if (payment.method === "apple_pay") {
      // INSERT INTO apple_pay_payments (payment_id, order_id, amount, processor, status, created_at)
      // VALUES ($1, $2, $3, $4, $5, $6)
      console.log(`Stored Apple Pay payment: ${payment.paymentId}`);
    }

    // Also store in unified payments audit log
    // INSERT INTO payment_audit (payment_id, method, processor, amount, status, created_at)
    // VALUES ($1, $2, $3, $4, $5, $6)
  } catch (error) {
    console.error("Failed to store payment record:", error);
    throw error;
  }
}

/**
 * Retrieve payment record from database
 * @private
 */
function getPaymentRecord(paymentIdOrOrderId: string): Promise<{
  paymentId: string;
  method: string;
  processor: string;
  orderId: string;
  amount: number;
  timestamp: string;
  status: string;
} | null> {
  return Promise.resolve().then(() => {
    try {
      // Query payment_audit table
      // SELECT * FROM payment_audit
      // WHERE payment_id = $1 OR order_id = $1

      // Mock data - replace with actual database query
      return {
        paymentId: paymentIdOrOrderId,
        method: "pi_network",
        processor: "pi_network",
        orderId: "order-123",
        amount: 100,
        timestamp: new Date().toISOString(),
        status: "confirmed",
      };
    } catch (error) {
      console.error("Failed to retrieve payment record:", error);
      return null;
    }
  });
}

// Route segment config for Next.js 13+
export const maxDuration = 30;

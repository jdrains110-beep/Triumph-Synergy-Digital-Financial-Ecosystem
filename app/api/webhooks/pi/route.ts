/**
 * Pi Network Webhook Handler
 * Handles incoming webhooks from Pi Network for payment and user events
 */

import crypto from "crypto";
import { type NextRequest, NextResponse } from "next/server";

// ============================================================================
// TYPES
// ============================================================================

type PiWebhookPayload = {
  type: "payment" | "user" | "app";
  event: string;
  data: Record<string, unknown>;
  timestamp: string;
  signature: string;
};

type PaymentWebhookData = {
  payment_id: string;
  user_uid: string;
  amount: number;
  memo: string;
  status: "pending" | "approved" | "completed" | "cancelled" | "failed";
  txid?: string;
  metadata?: Record<string, unknown>;
};

type UserWebhookData = {
  user_uid: string;
  username: string;
  event: "registered" | "authenticated" | "deauthorized";
};

// ============================================================================
// SIGNATURE VERIFICATION
// ============================================================================

function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// ============================================================================
// WEBHOOK HANDLERS
// ============================================================================

async function handlePaymentWebhook(data: PaymentWebhookData): Promise<void> {
  console.log("💰 Payment webhook received:", data.payment_id);

  switch (data.status) {
    case "pending":
      console.log("⏳ Payment pending approval");
      // Log payment initiation
      break;

    case "approved":
      console.log("✅ Payment approved");
      // Update payment status in database
      break;

    case "completed":
      console.log("✅ Payment completed with txid:", data.txid);
      // Finalize payment, trigger Stellar settlement if needed
      await processPaymentCompletion(data);
      break;

    case "cancelled":
      console.log("❌ Payment cancelled");
      // Handle cancellation
      break;

    case "failed":
      console.log("❌ Payment failed");
      // Handle failure
      break;

    default:
      console.warn("⚠️ Unknown payment status:", data.status);
      break;
  }
}

async function handleUserWebhook(data: UserWebhookData): Promise<void> {
  console.log("👤 User webhook received:", data.username);

  switch (data.event) {
    case "registered":
      console.log("✅ New user registered");
      // Create user profile
      break;

    case "authenticated":
      console.log("✅ User authenticated");
      // Update last login
      break;

    case "deauthorized":
      console.log("⚠️ User deauthorized app");
      // Handle deauthorization
      break;

    default:
      console.warn("⚠️ Unknown user event:", data.event);
      break;
  }
}

async function processPaymentCompletion(
  data: PaymentWebhookData
): Promise<void> {
  // Trigger Stellar settlement for completed payments
  console.log("🌟 Processing Stellar settlement for payment:", data.payment_id);

  // This would integrate with the Stellar settlement service
  // For now, just log the event
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const payload = await request.text();
    const signature = request.headers.get("x-pi-signature") || "";
    const webhookSecret = process.env.PI_WEBHOOK_SECRET || "";

    // Verify signature if secret is configured
    if (
      webhookSecret &&
      !verifyWebhookSignature(payload, signature, webhookSecret)
    ) {
      console.error("❌ Invalid webhook signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const webhookData: PiWebhookPayload = JSON.parse(payload);

    console.log("📨 Webhook received:", webhookData.type, webhookData.event);

    switch (webhookData.type) {
      case "payment":
        await handlePaymentWebhook(
          webhookData.data as unknown as PaymentWebhookData
        );
        break;

      case "user":
        await handleUserWebhook(webhookData.data as unknown as UserWebhookData);
        break;

      case "app":
        console.log("📱 App webhook:", webhookData.event);
        break;

      default:
        console.log("⚠️ Unknown webhook type:", webhookData.type);
    }

    return NextResponse.json({
      success: true,
      received: webhookData.type,
      event: webhookData.event,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Webhook processing error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    status: "active",
    endpoint: "/api/webhooks/pi",
    supported_types: ["payment", "user", "app"],
    timestamp: new Date().toISOString(),
  });
}

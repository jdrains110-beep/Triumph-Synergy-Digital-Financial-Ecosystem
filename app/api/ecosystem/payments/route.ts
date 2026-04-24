/**
 * app/api/ecosystem/payments/route.ts
 * Handle payments through integrated applications
 */

import { type NextRequest, NextResponse } from "next/server";
import {
  applicationRegistry,
  executeApplicationPayment,
  type PaymentExecutionConfig,
} from "@/lib/ecosystem/application-registry";

/**
 * POST /api/ecosystem/payments
 * Execute a payment through an integrated application
 *
 * Request body:
 * {
 *   appId: string;          // Application ID
 *   amount: number;         // Payment amount in Pi
 *   memo: string;           // Payment description
 *   userId?: string;        // User ID
 *   metadata?: object;      // Additional metadata
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { appId, amount, memo, userId, metadata } = body;

    // Validation
    if (!appId || !amount || !memo) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: appId, amount, memo",
        },
        { status: 400 }
      );
    }

    if (typeof amount !== "number" || amount <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Amount must be a positive number",
        },
        { status: 400 }
      );
    }

    // Check if application exists
    const app = applicationRegistry.getApplication(appId);
    if (!app) {
      return NextResponse.json(
        {
          success: false,
          error: `Application ${appId} not found`,
        },
        { status: 404 }
      );
    }

    if (!app.enabled) {
      return NextResponse.json(
        {
          success: false,
          error: `Application ${appId} is not enabled`,
        },
        { status: 403 }
      );
    }

    console.log(`[API] Processing payment through ${app.name}:`, {
      appId,
      amount,
      memo,
    });

    // Execute payment
    const config: PaymentExecutionConfig = {
      appId,
      amount,
      memo,
      userId,
      metadata: metadata || {},
    };

    const result = await executeApplicationPayment(config);

    return NextResponse.json(
      {
        success: true,
        data: result,
        message: `Payment processed through ${app.name}`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[API] Payment error:", error);
    const errorMsg = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        success: false,
        error: errorMsg,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/ecosystem/payments/status/:appId
 * Get payment status for an application
 */
export async function GET(request: NextRequest) {
  try {
    const appId = request.nextUrl.searchParams.get("appId");

    if (!appId) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing appId parameter",
        },
        { status: 400 }
      );
    }

    const app = applicationRegistry.getApplication(appId);
    if (!app) {
      return NextResponse.json(
        {
          success: false,
          error: `Application ${appId} not found`,
        },
        { status: 404 }
      );
    }

    const integration = applicationRegistry.getIntegration(appId);
    if (!integration) {
      return NextResponse.json(
        {
          success: false,
          error: `No integration found for ${appId}`,
        },
        { status: 404 }
      );
    }

    const status = await integration.getStatus();

    return NextResponse.json(
      {
        success: true,
        data: status,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[API] Status check error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

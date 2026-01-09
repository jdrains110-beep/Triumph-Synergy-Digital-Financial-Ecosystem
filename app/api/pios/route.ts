/**
 * Pi OS (PIOS) API Route
 * 
 * Handles Pi OS integration, authentication, payments, and notifications
 */

import { type NextRequest, NextResponse } from "next/server";
import {
  piosIntegration,
  initializePiOS,
  authenticatePiUser,
  createPiPayment,
  approvePiPayment,
  generateDeepLink,
} from "@/lib/pios/pios-integration";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");
  const userId = searchParams.get("userId");
  const paymentId = searchParams.get("paymentId");

  try {
    switch (action) {
      case "status":
        return NextResponse.json({
          success: true,
          initialized: piosIntegration.isReady(),
          config: piosIntegration.getConfig(),
        });

      case "user":
        if (!userId) {
          return NextResponse.json({ success: false, error: "User ID required" }, { status: 400 });
        }
        const user = await piosIntegration.getUser(userId);
        return NextResponse.json({ success: true, user });

      case "payment":
        if (!paymentId) {
          return NextResponse.json({ success: false, error: "Payment ID required" }, { status: 400 });
        }
        const payment = await piosIntegration.getPayment(paymentId);
        return NextResponse.json({ success: true, payment });

      case "user-payments":
        if (!userId) {
          return NextResponse.json({ success: false, error: "User ID required" }, { status: 400 });
        }
        const payments = await piosIntegration.getUserPayments(userId);
        return NextResponse.json({ success: true, payments });

      case "notifications":
        if (!userId) {
          return NextResponse.json({ success: false, error: "User ID required" }, { status: 400 });
        }
        const notifications = await piosIntegration.getUserNotifications(userId);
        return NextResponse.json({ success: true, notifications });

      case "services":
        const services = await piosIntegration.getTriumphServices();
        return NextResponse.json({ success: true, services });

      case "sdk":
        const script = await piosIntegration.generateClientScript();
        return new NextResponse(script, {
          headers: { "Content-Type": "application/javascript" },
        });

      case "rates":
        return NextResponse.json({
          success: true,
          piToUsd: piosIntegration.getPiToUsdRate(),
          timestamp: new Date().toISOString(),
        });

      default:
        return NextResponse.json({
          success: true,
          message: "Pi OS Integration API",
          endpoints: {
            "GET ?action=status": "Get PIOS status and config",
            "GET ?action=user&userId=X": "Get Pi user details",
            "GET ?action=payment&paymentId=X": "Get payment details",
            "GET ?action=user-payments&userId=X": "Get user payments",
            "GET ?action=notifications&userId=X": "Get user notifications",
            "GET ?action=services": "List Triumph services",
            "GET ?action=sdk": "Get client SDK script",
            "GET ?action=rates": "Get Pi/USD rates",
            "POST": "Initialize, authenticate, create payments",
          },
        });
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "initialize":
        const initResult = await initializePiOS(body.config);
        return NextResponse.json(initResult);

      case "authenticate":
        const user = await authenticatePiUser({
          accessToken: body.accessToken,
          refreshToken: body.refreshToken,
        });
        return NextResponse.json({ success: true, user });

      case "create-payment":
        const payment = await createPiPayment({
          userId: body.userId,
          amount: body.amount,
          memo: body.memo,
          metadata: body.metadata,
          direction: body.direction || "user_to_app",
        });
        return NextResponse.json({ success: true, payment });

      case "approve-payment":
        const approved = await approvePiPayment(body.paymentId);
        return NextResponse.json({ success: true, payment: approved });

      case "cancel-payment":
        const cancelled = await piosIntegration.cancelPayment(body.paymentId, body.reason);
        return NextResponse.json({ success: true, payment: cancelled });

      case "send-notification":
        const notification = await piosIntegration.sendNotification({
          userId: body.userId,
          type: body.type,
          title: body.title,
          body: body.body,
          data: body.data || {},
          expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
        });
        return NextResponse.json({ success: true, notification });

      case "generate-deeplink":
        const deepLink = generateDeepLink(body.linkAction, body.params);
        return NextResponse.json({ success: true, deepLink });

      case "register-service":
        const registered = await piosIntegration.registerTriumphService(
          body.userId,
          body.serviceName
        );
        return NextResponse.json(registered);

      case "update-triumph-profile":
        const updated = await piosIntegration.updateUserTriumphProfile(body.userId, {
          triumphUserId: body.triumphUserId,
          triumphTier: body.triumphTier,
          triumphServicesEnabled: body.triumphServicesEnabled,
        });
        return NextResponse.json({ success: true, user: updated });

      default:
        return NextResponse.json(
          { success: false, error: "Invalid action" },
          { status: 400 }
        );
    }
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

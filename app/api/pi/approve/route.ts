import { type NextRequest, NextResponse } from "next/server";
import { requireKycLevel, type KycLevel } from "@/lib/pi/kyc";
import {
  getSanctionsStatus,
  refreshSanctionsLists,
  screenSanctions,
} from "@/lib/pi/sanctions";
import { approvePayment, verifyPayment } from "@/lib/pi/server";

/**
 * Pi Payment Approval Endpoint — POST /api/pi/approve
 *
 * Network selector (in order): X-Pi-Network header > ?network= query >
 * payment.sandbox flag > PI_DEFAULT_NETWORK env > "mainnet".
 * Mainnet uses PI_API_KEY; testnet uses PI_API_KEY_TESTNET.
 *
 * KYC gating: if PI_KYC_MIN_LEVEL is set ("phone"|"basic"|"enhanced"|"institutional"),
 * payment.user_uid must have a KYC record at or above that level. Bypass with
 * PI_KYC_BYPASS_NETWORKS=testnet (CSV) for sandbox flows.
 */
export async function POST(req: NextRequest) {
  try {
    const { paymentId } = (await req.json()) as { paymentId?: string };
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

    // KYC gate — opt-in via env. Skip on bypass networks (typically testnet).
    const minLevel = (process.env.PI_KYC_MIN_LEVEL || "").trim() as KycLevel | "";
    const bypassNetworks = (process.env.PI_KYC_BYPASS_NETWORKS || "testnet")
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    if (minLevel && !bypassNetworks.includes(resolved.network)) {
      const userId = payment.user_uid;
      if (!userId) {
        return NextResponse.json(
          { error: "kyc_required", code: "KYC_NO_USER", network: resolved.network },
          { status: 403 },
        );
      }
      const gate = await requireKycLevel(userId, minLevel);
      if (!gate.allowed) {
        return NextResponse.json(
          {
            error: "kyc_required",
            code: "KYC_GATE_FAILED",
            network: resolved.network,
            required_level: minLevel,
            current_level: gate.currentLevel,
            kyc_status: gate.status,
            reason: gate.reason,
          },
          { status: 403 },
        );
      }
    }

    // Sanctions screen — opt-in via PI_SANCTIONS_ENABLED=1. Screens user_uid + to_address.
    if (process.env.PI_SANCTIONS_ENABLED === "1" && !bypassNetworks.includes(resolved.network)) {
      if (Object.keys(getSanctionsStatus()).length === 0) {
        await refreshSanctionsLists().catch(() => {});
      }
      const hits = screenSanctions({
        cryptoAddress: payment.to_address,
        aliases: [payment.user_uid].filter(Boolean) as string[],
      });
      const blocking = hits.filter((h) => h.score >= 95);
      if (blocking.length > 0) {
        return NextResponse.json(
          {
            error: "sanctions_block",
            code: "SANCTIONS_HIT",
            network: resolved.network,
            hits: blocking.map((h) => ({ list: h.list, matchType: h.matchType, score: h.score })),
          },
          { status: 403 },
        );
      }
    }

    if (payment.status?.developer_approved) {
      return NextResponse.json({
        success: true,
        paymentId,
        network: resolved.network,
        status: "already_approved",
        message: "Payment was already approved",
      });
    }

    const approved = await approvePayment(paymentId, resolved);
    if (!approved.ok) {
      return NextResponse.json(
        {
          error: "Payment approval failed",
          code: "APPROVAL_FAILED",
          network: resolved.network,
          details: approved.error,
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      paymentId,
      network: resolved.network,
      status: "approved",
      data: approved.data,
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
      { status: 500 },
    );
  }
}

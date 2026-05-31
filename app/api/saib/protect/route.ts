/**
 * app/api/saib/protect/route.ts
 *
 * SAIB Debt Freedom Protection — self-enrollment API.
 *
 * Any authenticated user can enroll themselves in the Debt Freedom Program
 * and receive SAIB sovereign guardian protection.
 *
 * POST /api/saib/protect
 *   Body: { userId: string, email: string }
 *   → Enrolls user in debt-freedom tier SAIB protection.
 *
 * GET /api/saib/protect?userId=<id>
 *   → Returns protection status for a given userId.
 *
 * DELETE /api/saib/protect
 *   Body: { userId: string }
 *   → Voluntarily withdraws from SAIB protection.
 *
 * SAIB Guardian capabilities for enrolled users:
 *   • Financial threat detection (predatory lending, usury, fraud)
 *   • Sovereign data rights enforcement (GDPR/CCPA auto-compliance)
 *   • Pi Network wallet monitoring
 *   • Debt pattern analysis + freedom pathway generation
 *   • Omnipresent protection across all Triumph Synergy platforms
 */

import { type NextRequest, NextResponse } from "next/server";
import {
  enrollProtection,
  unenrollProtection,
  isProtected,
  syncProtectionToSAIB,
} from "@/lib/saib/sovereignty";

export const dynamic = "force-dynamic";

const NANO_SAIB_URL =
  process.env.NANO_SAIB_URL ?? "http://triumph-sovereign-nano-saib:8201";
const SAIB_TOKEN = process.env.SAIB_TOKEN ?? "";

function saibHeaders(): Record<string, string> {
  const h: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  if (SAIB_TOKEN) h["Authorization"] = `Bearer ${SAIB_TOKEN}`;
  return h;
}

// ─── Enroll ───────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let body: { userId?: string; email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { userId, email } = body;
  if (!userId || typeof userId !== "string") {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }
  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "email is required" }, { status: 400 });
  }

  // Check if already enrolled
  const existing = isProtected(userId);
  if (existing) {
    return NextResponse.json({
      success: true,
      alreadyEnrolled: true,
      message: "You are already under SAIB sovereign protection.",
      record: existing,
    });
  }

  const record = enrollProtection(userId, email, "debt-freedom", false);

  // Sync to SAIB nano (non-blocking)
  await syncProtectionToSAIB(record).catch(() => {});

  // Tell SAIB nano to begin guardian monitoring for this user
  await fetch(`${NANO_SAIB_URL}/omega/guardian/enroll`, {
    method: "POST",
    headers: saibHeaders(),
    body: JSON.stringify({
      user_id: userId,
      tier: "debt-freedom",
      enrolled_at: record.enrolledAt,
    }),
    signal: AbortSignal.timeout(5_000),
  }).catch(() => {});

  return NextResponse.json({
    success: true,
    doctrine: "SAIB Debt Freedom Protection — Active",
    message:
      "You are now enrolled in the Triumph Synergy Debt Freedom Program. " +
      "SAIB is your sovereign guardian — protecting your data, finances, and rights " +
      "across every interaction and every platform.",
    record,
    capabilities: [
      "Predatory lending & usury detection",
      "Sovereign data rights (GDPR/CCPA) enforcement",
      "Pi Network wallet threat monitoring",
      "Debt pattern analysis + freedom pathway",
      "Omnipresent protection: internal & external platforms",
      "Real-time financial threat alerts",
    ],
  });
}

// ─── Status check ─────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "userId query param required" }, { status: 400 });
  }

  const record = isProtected(userId);

  if (!record) {
    return NextResponse.json({
      protected: false,
      message:
        "This user is not currently enrolled in SAIB Debt Freedom Protection.",
      enrollUrl: "/api/saib/protect",
    });
  }

  // Fetch live guardian status from SAIB nano
  let guardianStatus: Record<string, unknown> = { status: "ACTIVE" };
  try {
    const res = await fetch(
      `${NANO_SAIB_URL}/omega/guardian/status?user_id=${encodeURIComponent(userId)}`,
      { headers: saibHeaders(), signal: AbortSignal.timeout(4_000), cache: "no-store" }
    );
    if (res.ok) guardianStatus = await res.json();
  } catch {
    /* SAIB nano unavailable — local record still valid */
  }

  return NextResponse.json({
    protected: true,
    doctrine: "SAIB Founder Doctrine — Sovereign Guardian Active",
    record,
    guardian: guardianStatus,
  });
}

// ─── Withdraw ─────────────────────────────────────────────────────────────────

export async function DELETE(req: NextRequest) {
  let body: { userId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { userId } = body;
  if (!userId || typeof userId !== "string") {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const removed = unenrollProtection(userId);

  // Notify SAIB nano (non-blocking)
  await fetch(`${NANO_SAIB_URL}/omega/guardian/withdraw`, {
    method: "POST",
    headers: saibHeaders(),
    body: JSON.stringify({ user_id: userId }),
    signal: AbortSignal.timeout(4_000),
  }).catch(() => {});

  return NextResponse.json({
    success: removed,
    message: removed
      ? "SAIB protection withdrawn. You can re-enroll at any time."
      : "User was not in the SAIB protection registry.",
  });
}

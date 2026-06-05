/**
 * app/api/saib/sovereignty/route.ts
 *
 * SAIB Sovereignty API — Founder-authenticated Data Sovereignty Restoration.
 *
 * POST /api/saib/sovereignty/scrub
 *   Body: { userId: string }
 *   Header: Authorization: Bearer <SAIB_FOUNDER_TOKEN>
 *   → Executes DSR: erases all PII, returns audit stub.
 *
 * POST /api/saib/sovereignty/enroll
 *   Body: { userId: string, email: string, tier?: "debt-freedom"|"full-sovereign" }
 *   Header: Authorization: Bearer <SAIB_FOUNDER_TOKEN>
 *   → Enrolls user in SAIB Debt Freedom Protection.
 *
 * DELETE /api/saib/sovereignty/enroll
 *   Body: { userId: string }
 *   Header: Authorization: Bearer <SAIB_FOUNDER_TOKEN>
 *   → Removes a user from SAIB protection.
 *
 * GET /api/saib/sovereignty/roster
 *   Header: Authorization: Bearer <SAIB_FOUNDER_TOKEN>
 *   → Returns list of all SAIB-protected users (Founder-only view).
 *
 * SECURITY:
 *   All mutations require the SAIB_FOUNDER_TOKEN (64-char hex secret).
 *   Token comparison is constant-time (no timing oracle).
 *   This endpoint is NOT publicly accessible — Founder use only.
 */

import { type NextRequest, NextResponse } from "next/server";
import {
  verifyFounderToken,
  executeDSR,
  enrollProtection,
  unenrollProtection,
  listProtectedUsers,
  syncProtectionToSAIB,
} from "@/lib/saib/sovereignty";

export const dynamic = "force-dynamic";

function requireFounder(req: NextRequest): boolean {
  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : auth;
  return verifyFounderToken(token);
}

function unauthorized() {
  return NextResponse.json(
    { error: "Founder authentication required." },
    { status: 401 }
  );
}

// ─── Scrub: Full Data Sovereignty Restoration ─────────────────────────────────

export async function POST(req: NextRequest) {
  if (!requireFounder(req)) return unauthorized();

  let body: { userId?: string; email?: string; action?: string; tier?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { action = "scrub", userId, email, tier } = body;

  if (!userId || typeof userId !== "string") {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  // ── Action: scrub ──
  if (action === "scrub") {
    const stub = await executeDSR(userId, true);
    return NextResponse.json({
      success: stub.status === "COMPLETE",
      doctrine: "SAIB Founder Doctrine — Data Sovereignty Restoration",
      message:
        stub.status === "COMPLETE"
          ? `User ${userId} is now fully sovereign. All PII erased. Audit stub retained for compliance.`
          : `Partial erasure completed. Some records may require manual review.`,
      audit: stub,
    });
  }

  // ── Action: enroll ──
  if (action === "enroll") {
    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "email is required for enrollment" },
        { status: 400 }
      );
    }
    const enrollTier =
      tier === "full-sovereign" ? "full-sovereign" : "debt-freedom";
    const record = enrollProtection(userId, email, enrollTier, true);
    await syncProtectionToSAIB(record).catch(() => {});
    return NextResponse.json({
      success: true,
      doctrine: "SAIB Founder Doctrine — Debt Freedom Protection Activated",
      message: `User ${userId} is now under SAIB sovereign protection (${enrollTier} tier). SAIB Guardian is active.`,
      record,
    });
  }

  // ── Action: unenroll ──
  if (action === "unenroll") {
    const removed = unenrollProtection(userId);
    return NextResponse.json({
      success: removed,
      message: removed
        ? `User ${userId} has been removed from SAIB protection.`
        : `User ${userId} was not in the protection registry.`,
    });
  }

  return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
}

// ─── Roster: List all protected users (Founder view) ─────────────────────────

export async function GET(req: NextRequest) {
  if (!requireFounder(req)) return unauthorized();

  const roster = listProtectedUsers();
  return NextResponse.json({
    doctrine: "SAIB Founder Doctrine — Omnipresent Protection Roster",
    timestamp: new Date().toISOString(),
    totalProtected: roster.length,
    protectedUsers: roster,
  });
}

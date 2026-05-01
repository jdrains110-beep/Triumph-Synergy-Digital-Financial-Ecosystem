import { NextResponse, type NextRequest } from "next/server";
import { appendAuditEvent } from "@/lib/security/audit-chain";
import { rateLimitByIP } from "@/lib/security/api-guard";

/**
 * CSP violation report sink. Browsers POST here per `report-to` directive.
 * Each violation is appended to the audit chain so we can spot injection
 * attempts across the fleet.
 */
export async function POST(req: NextRequest) {
  const rl = rateLimitByIP(req, "csp-report", 120, 60_000);
  if (!rl.allowed) return new NextResponse(null, { status: 429 });

  try {
    const body = await req.json().catch(() => ({}));
    void appendAuditEvent("csp.violation", {
      report: body,
      ua: req.headers.get("user-agent"),
    });
  } catch {
    // never throw from a report sink
  }
  return new NextResponse(null, { status: 204 });
}

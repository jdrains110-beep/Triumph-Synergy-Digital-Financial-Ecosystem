/**
 * app/api/credit/fcra/dispute/route.ts
 * Proxy — FCRA §611 Superior Dispute → Credit Engine (port 8091)
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/security/api-guard";

const CREDIT_ENGINE = process.env.CREDIT_ENGINE_URL ?? "http://triumph-quantum-intel-fortress:8091";

export async function POST(req: NextRequest) {
  return requireAuth(req, async (req, _session) => {
    try {
      const body = await req.json();
      const res = await fetch(`${CREDIT_ENGINE}/api/credit/fcra/dispute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    } catch {
      return NextResponse.json({ error: "Credit engine unavailable" }, { status: 503 });
    }
  });
}

export async function GET(req: NextRequest) {
  return requireAuth(req, async (req, _session) => {
    const caseId = req.nextUrl.searchParams.get("caseId");
    if (!caseId) return NextResponse.json({ error: "caseId required" }, { status: 400 });

    try {
      const res = await fetch(`${CREDIT_ENGINE}/api/credit/fcra/dispute/${caseId}`);
      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    } catch {
      return NextResponse.json({ error: "Credit engine unavailable" }, { status: 503 });
    }
  });
}

/**
 * app/api/credit/fcra/score-delta/[address]/route.ts
 * Proxy — FCRA score recovery delta → Credit Engine (port 8091)
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/security/api-guard";

const CREDIT_ENGINE = process.env.CREDIT_ENGINE_URL ?? "http://triumph-quantum-intel-fortress:8091";

export async function GET(
  req: NextRequest,
  { params }: { params: { address: string } }
) {
  return requireAuth(req, async (_req, _session) => {
    try {
      const res = await fetch(
        `${CREDIT_ENGINE}/api/credit/fcra/score-delta/${params.address}`
      );
      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    } catch {
      return NextResponse.json({ error: "Credit engine unavailable" }, { status: 503 });
    }
  });
}

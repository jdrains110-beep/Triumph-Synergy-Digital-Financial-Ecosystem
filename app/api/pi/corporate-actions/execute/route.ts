import { type NextRequest, NextResponse } from "next/server";
import { executeCorporateAction, type CorporateAction } from "@/lib/pi/corporate-actions";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/pi/corporate-actions/execute
 * body: CorporateAction
 *
 * Issuer-only endpoint — should be locked down by upstream auth/RBAC.
 */
export async function POST(req: NextRequest) {
  try {
    const action = (await req.json()) as CorporateAction;
    if (!action?.type) {
      return NextResponse.json({ error: "action.type required" }, { status: 400 });
    }
    const result = await executeCorporateAction(action);
    return NextResponse.json({ ok: true, result });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "corporate-action failed" },
      { status: 500 },
    );
  }
}

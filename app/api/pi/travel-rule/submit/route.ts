import { type NextRequest, NextResponse } from "next/server";
import {
  isTravelRuleApplicable,
  submitTravelRule,
  type IvmsTransaction,
} from "@/lib/pi/travel-rule";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/pi/travel-rule/submit
 * body: { payload: IvmsTransaction, beneficiaryVaspId, beneficiaryEndpoint? }
 *
 * Validates FATF R.16 applicability, optionally signs, and dispatches via
 * TRAVEL_RULE_TRANSPORT (mock | trp). Returns the signed envelope and a
 * remote receipt id.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      payload: IvmsTransaction;
      beneficiaryVaspId: string;
      beneficiaryEndpoint?: string;
      amountUsd?: number;
      originatorJurisdiction?: string;
      beneficiaryJurisdiction?: string;
    };

    if (!body.payload || !body.beneficiaryVaspId) {
      return NextResponse.json(
        { error: "payload and beneficiaryVaspId required" },
        { status: 400 },
      );
    }

    if (typeof body.amountUsd === "number") {
      const trig = isTravelRuleApplicable({
        amountUsd: body.amountUsd,
        originatorJurisdiction: body.originatorJurisdiction,
        beneficiaryJurisdiction: body.beneficiaryJurisdiction,
      });
      if (!trig.applies) {
        return NextResponse.json({
          applied: false,
          threshold: trig.threshold,
          jurisdiction: trig.jurisdiction,
          reason: "below_threshold",
        });
      }
    }

    const r = await submitTravelRule({
      payload: body.payload,
      beneficiaryVaspId: body.beneficiaryVaspId,
      beneficiaryEndpoint: body.beneficiaryEndpoint,
    });
    return NextResponse.json({ applied: true, ...r });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "travel-rule submit failed" },
      { status: 500 },
    );
  }
}

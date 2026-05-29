import { type NextRequest, NextResponse } from "next/server";
import { signAndSubmitDvp, type DvpUnsignedTransaction } from "@/lib/pi/dvp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/pi/dvp/submit
 * body: { unsigned: DvpUnsignedTransaction, signers: Record<accountId, secret> }
 *
 * SECURITY: in production, secrets MUST come from the HSM adapter, not the
 * request body. This endpoint accepts pre-signed XDRs by signing here only
 * when DVP_ALLOW_SECRET_SIGNING=1 (dev/test only).
 */
export async function POST(req: NextRequest) {
  if (process.env.DVP_ALLOW_SECRET_SIGNING !== "1") {
    return NextResponse.json(
      { error: "secret signing disabled — use HSM signer service" },
      { status: 403 },
    );
  }
  try {
    const body = (await req.json()) as {
      unsigned: DvpUnsignedTransaction;
      signers: Record<string, string>;
    };
    if (!body?.unsigned?.xdr || !body?.signers) {
      return NextResponse.json(
        { error: "unsigned XDR and signers map required" },
        { status: 400 },
      );
    }
    const r = await signAndSubmitDvp(body.unsigned, body.signers);
    return NextResponse.json(r);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "dvp submit failed" },
      { status: 500 },
    );
  }
}

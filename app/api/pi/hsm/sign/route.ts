import { type NextRequest, NextResponse } from "next/server";
import { getSigner } from "@/lib/pi/hsm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/pi/hsm/sign
 * body: { accountId, xdr, networkPassphrase }
 * Returns signed XDR. No secret material crosses the boundary —
 * the signer pulls the key from its configured backend.
 */
export async function POST(req: NextRequest) {
  try {
    const { accountId, xdr, networkPassphrase } = (await req.json()) as {
      accountId?: string;
      xdr?: string;
      networkPassphrase?: string;
    };
    if (!accountId || !xdr || !networkPassphrase) {
      return NextResponse.json(
        { error: "accountId, xdr, networkPassphrase required" },
        { status: 400 },
      );
    }
    const signer = getSigner();
    const signedXdr = await signer.signTransaction(accountId, xdr, networkPassphrase);
    return NextResponse.json({ signedXdr, signer: signer.name });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "sign failed" },
      { status: 500 },
    );
  }
}

export async function GET() {
  const signer = getSigner();
  const accounts = await signer.listAccounts().catch((e: Error) => ({ error: e.message }));
  return NextResponse.json({ signer: signer.name, accounts });
}

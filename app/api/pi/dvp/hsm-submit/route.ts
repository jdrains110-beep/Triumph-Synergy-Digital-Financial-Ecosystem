import { type NextRequest, NextResponse } from "next/server";
import { Horizon, TransactionBuilder, type Transaction } from "@stellar/stellar-sdk";
import { getSigner } from "@/lib/pi/hsm";
import { resolvePiNetwork, type PiNetwork } from "@/lib/pi/network";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/pi/dvp/hsm-submit
 * body: { unsigned: { xdr, network, passphrase, requiredSigners[] } }
 *
 * Signs each required account via the HSM adapter, then submits to Horizon.
 * No secrets ever cross the wire.
 */
export async function POST(req: NextRequest) {
  try {
    const { unsigned } = (await req.json()) as {
      unsigned: { xdr: string; network: PiNetwork; passphrase: string; requiredSigners: string[] };
    };
    if (!unsigned?.xdr || !unsigned?.requiredSigners?.length) {
      return NextResponse.json({ error: "unsigned with requiredSigners required" }, { status: 400 });
    }
    const signer = getSigner();
    let xdr = unsigned.xdr;
    for (const account of unsigned.requiredSigners) {
      xdr = await signer.signTransaction(account, xdr, unsigned.passphrase);
    }
    const resolved = resolvePiNetwork({ override: unsigned.network });
    const server = new Horizon.Server(resolved.horizon, {
      allowHttp: resolved.horizon.startsWith("http://"),
    });
    const tx = TransactionBuilder.fromXDR(xdr, unsigned.passphrase) as Transaction;
    const r = (await server.submitTransaction(tx)) as Horizon.HorizonApi.SubmitTransactionResponse & {
      hash: string;
      ledger: number;
      successful: boolean;
    };
    return NextResponse.json({
      hash: r.hash,
      ledger: r.ledger,
      successful: r.successful,
      signer: signer.name,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "dvp hsm-submit failed" },
      { status: 500 },
    );
  }
}

/**
 * GCV Convert / Calculator API
 * ────────────────────────────
 * Exposes the $314,159 Pi-peg conversion to the triumph-app for BOTH the
 * Pi testnet and mainnet flows. The peg is identical on both networks —
 * only ledger settlement differs.
 *
 * GET  /api/saib/gcv/convert?direction=pi-to-usd&amount=0.5
 * GET  /api/saib/gcv/convert?direction=usd-to-pi&amount=628318
 * GET  /api/saib/gcv/convert?direction=verify&item_usd=314159&offered_pi=1.05
 * GET  /api/saib/gcv/convert?direction=quote&network=mainnet&amount=10000
 */
import { NextResponse } from "next/server";
import {
  GCV_PEG_USD,
  piToUsd,
  usdToPi,
  verifyTransaction,
  quoteForNetwork,
  formatPi,
  formatUsd,
  type Network,
} from "@/lib/saib/gcv-calculator";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const direction = (url.searchParams.get("direction") ?? "pi-to-usd").toLowerCase();
  const amountRaw = url.searchParams.get("amount") ?? "0";
  const amount = Number(amountRaw);
  const network = ((url.searchParams.get("network") ?? "mainnet") as Network);

  if (!Number.isFinite(amount) && direction !== "verify") {
    return NextResponse.json(
      { error: "amount must be a finite number" },
      { status: 400 },
    );
  }

  switch (direction) {
    case "pi-to-usd": {
      const usd = piToUsd(amount);
      return NextResponse.json({
        network,
        gcv_peg_usd: GCV_PEG_USD,
        input_pi: amount,
        input_pi_formatted: formatPi(amount),
        output_usd: usd,
        output_usd_formatted: formatUsd(usd),
      });
    }
    case "usd-to-pi": {
      const pi = usdToPi(amount);
      return NextResponse.json({
        network,
        gcv_peg_usd: GCV_PEG_USD,
        input_usd: amount,
        input_usd_formatted: formatUsd(amount),
        output_pi: pi,
        output_pi_formatted: formatPi(pi),
      });
    }
    case "verify": {
      const itemUsd = url.searchParams.get("item_usd") ?? "0";
      const offeredPi = url.searchParams.get("offered_pi") ?? "0";
      return NextResponse.json(verifyTransaction(itemUsd, offeredPi));
    }
    case "quote": {
      return NextResponse.json(quoteForNetwork(network, amount));
    }
    default:
      return NextResponse.json(
        { error: `unknown direction: ${direction}` },
        { status: 400 },
      );
  }
}

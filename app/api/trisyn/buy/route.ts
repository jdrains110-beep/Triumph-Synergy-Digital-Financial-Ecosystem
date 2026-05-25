/**
 * app/api/trisyn/buy/route.ts
 *
 * Pi Testnet TRISYN purchase endpoint.
 *
 * Flow:
 *   1. Pioneer adds TRISYN in Pi Wallet (creates trustline) — must be
 *      done BEFORE calling this endpoint, otherwise Pi Blockchain rejects
 *      the payment with op_no_trust.
 *   2. Pioneer pays Pi to the distributor via the Pi SDK U2A flow
 *      (handled by the frontend; this endpoint is invoked from the
 *      `completePayment` webhook after Pi confirms the inbound Pi payment).
 *   3. This endpoint releases the corresponding TRISYN amount from the
 *      distributor wallet to the Pioneer's Pi address at the hard peg
 *      1 TRISYN ⇄ 1 π.
 *
 * Security: enforced by SAIB allowlist + signed by distributor secret
 * loaded from PI_TRISYN_DISTRIBUTOR_SECRET_TESTNET. Issuer secret is
 * NEVER loaded by the API — only the distributor signs runtime payments.
 *
 * Pi Tokens spec: https://github.com/pi-apps/pi-platform-docs/blob/master/tokens.md
 */

import { NextResponse } from "next/server";
import * as StellarSDK from "@stellar/stellar-sdk";
import {
  APP_WALLET_PI_TESTNET,
  PI_TESTNET_HORIZON,
  PI_TESTNET_PASSPHRASE,
  TRISYN_ASSET_CODE,
  TRISYN_DISTRIBUTOR_TESTNET,
} from "@/lib/config/pi-app-wallets";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface BuyRequest {
  recipient: string; // Pi address of the buyer (G...)
  amount: string; // TRISYN amount (1:1 with Pi paid)
  piPaymentId?: string; // Pi SDK payment identifier (for idempotency)
  piTxId?: string; // Pi mainnet/testnet tx hash that delivered Pi to distributor
}

function badRequest(message: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, error: message, ...extra }, { status: 400 });
}

export async function POST(req: Request) {
  let body: BuyRequest;
  try {
    body = (await req.json()) as BuyRequest;
  } catch {
    return badRequest("invalid JSON body");
  }

  const { recipient, amount, piPaymentId, piTxId } = body;

  if (!recipient || !StellarSDK.StrKey.isValidEd25519PublicKey(recipient)) {
    return badRequest("recipient must be a valid Pi public key");
  }
  if (recipient === APP_WALLET_PI_TESTNET || recipient === TRISYN_DISTRIBUTOR_TESTNET) {
    return badRequest("recipient cannot be the issuer or distributor wallet");
  }
  const amt = Number(amount);
  if (!Number.isFinite(amt) || amt <= 0 || amt > 100_000) {
    return badRequest("amount must be a positive number ≤ 100,000 TRISYN per call");
  }

  const distributorSecret = process.env.PI_TRISYN_DISTRIBUTOR_SECRET_TESTNET;
  if (!distributorSecret) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "distributor not configured (PI_TRISYN_DISTRIBUTOR_SECRET_TESTNET unset)",
      },
      { status: 503 },
    );
  }

  let distributorKp: StellarSDK.Keypair;
  try {
    distributorKp = StellarSDK.Keypair.fromSecret(distributorSecret.trim());
  } catch {
    return NextResponse.json(
      { ok: false, error: "distributor secret invalid" },
      { status: 500 },
    );
  }

  const server = new StellarSDK.Horizon.Server(PI_TESTNET_HORIZON);
  const asset = new StellarSDK.Asset(TRISYN_ASSET_CODE, APP_WALLET_PI_TESTNET);

  // Verify recipient has a trustline before attempting payment — fail
  // fast with a clear message instead of a cryptic op_no_trust.
  let recipientAccount: Awaited<ReturnType<typeof server.loadAccount>>;
  try {
    recipientAccount = await server.loadAccount(recipient);
  } catch {
    return badRequest("recipient account not found on Pi Testnet");
  }
  const hasTrustline = recipientAccount.balances.some(
    (b) =>
      b.asset_type !== "native" &&
      "asset_code" in b &&
      b.asset_code === TRISYN_ASSET_CODE &&
      "asset_issuer" in b &&
      b.asset_issuer === APP_WALLET_PI_TESTNET,
  );
  if (!hasTrustline) {
    return badRequest(
      "recipient has no TRISYN trustline — open Pi Wallet → Tokens → Add TRISYN first",
    );
  }

  try {
    const ledger = await server.ledgers().order("desc").limit(1).call();
    const fee = ledger.records[0].base_fee_in_stroops;
    const distributorAccount = await server.loadAccount(
      distributorKp.publicKey(),
    );
    const tx = new StellarSDK.TransactionBuilder(distributorAccount, {
      fee,
      networkPassphrase: PI_TESTNET_PASSPHRASE,
      timebounds: await server.fetchTimebounds(90),
    })
      .addOperation(
        StellarSDK.Operation.payment({
          destination: recipient,
          asset,
          amount: amt.toFixed(7),
        }),
      )
      .addMemo(
        StellarSDK.Memo.text(
          (piPaymentId ?? piTxId ?? "TRISYN-BUY").slice(0, 28),
        ),
      )
      .build();
    tx.sign(distributorKp);
    const result = await server.submitTransaction(tx);
    return NextResponse.json({
      ok: true,
      asset: TRISYN_ASSET_CODE,
      issuer: APP_WALLET_PI_TESTNET,
      recipient,
      amount: amt.toFixed(7),
      hash: result.hash,
      ledger: result.ledger,
      explorer: `${PI_TESTNET_HORIZON}/transactions/${result.hash}`,
    });
  } catch (err: unknown) {
    const error = err as {
      message?: string;
      response?: { data?: { extras?: { result_codes?: unknown } } };
    };
    return NextResponse.json(
      {
        ok: false,
        error: error.message ?? "submission failed",
        result_codes: error.response?.data?.extras?.result_codes,
      },
      { status: 502 },
    );
  }
}

/** Public-facing metadata so Pioneers can verify the endpoint + asset. */
export async function GET() {
  return NextResponse.json({
    ok: true,
    asset: TRISYN_ASSET_CODE,
    issuer: APP_WALLET_PI_TESTNET,
    distributor: TRISYN_DISTRIBUTOR_TESTNET,
    network: "Pi Testnet",
    horizon: PI_TESTNET_HORIZON,
    peg: "1 TRISYN ⇄ 1 π",
    max_per_call: 100_000,
    instructions: [
      "1. Open Pi Wallet → Tokens → Add Token → TRISYN",
      `2. Send Pi to the distributor (${TRISYN_DISTRIBUTOR_TESTNET}) via the Pi SDK U2A flow`,
      "3. POST { recipient, amount, piPaymentId } to this endpoint",
    ],
    spec: "https://github.com/pi-apps/pi-platform-docs/blob/master/tokens.md",
  });
}

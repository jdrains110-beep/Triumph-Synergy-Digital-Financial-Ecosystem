#!/usr/bin/env npx tsx
/**
 * Rotate the funding wallet to a fresh keypair.
 *
 * Strategy: AccountMerge — sweeps 100% of native Pi from OLD account to
 * DEST account and permanently closes OLD on-chain (compromised key cannot
 * be reused). Falls back to a plain Payment of all-but-reserve if merge
 * fails (e.g. sub-entries exist).
 *
 * Required env:
 *   OLD_SECRET       - secret of compromised wallet (S...)
 *   DEST             - destination public key (G...). If unset, a fresh
 *                      keypair is generated and printed (you must capture it).
 *
 * Optional env:
 *   HORIZON_URL          default: https://api.testnet.minepi.com
 *   NETWORK_PASSPHRASE   default: "Pi Testnet"
 *   FEE                  default: 1000000  (Pi minimum is 100000)
 *   FORCE_PAYMENT        "1" to skip merge and just send a payment
 *   PAYMENT_AMOUNT       override payment amount (Pi). Default = balance - 1.5
 *
 * Usage:
 *   read -s OLD_SECRET && export OLD_SECRET
 *   DEST=G... npx tsx scripts/rotate-funding-key.ts
 *
 * NEVER paste OLD_SECRET on the command line. Use stdin or env file.
 */

import {
  Keypair,
  Horizon,
  TransactionBuilder,
  Operation,
  Asset,
} from "@stellar/stellar-sdk";

const HORIZON_URL = process.env.HORIZON_URL || "https://api.testnet.minepi.com";
const NETWORK_PASSPHRASE = process.env.NETWORK_PASSPHRASE || "Pi Testnet";
const FEE = process.env.FEE || "1000000";
const FORCE_PAYMENT = process.env.FORCE_PAYMENT === "1";
const PAYMENT_AMOUNT = process.env.PAYMENT_AMOUNT;

function fail(msg: string): never {
  console.error(`ERROR: ${msg}`);
  process.exit(1);
}

async function main() {
  const OLD_SECRET = process.env.OLD_SECRET;
  if (!OLD_SECRET) fail("OLD_SECRET env var is required");

  const oldKp = Keypair.fromSecret(OLD_SECRET);
  const oldPub = oldKp.publicKey();

  let destPub = process.env.DEST;
  if (!destPub) {
    const fresh = Keypair.random();
    destPub = fresh.publicKey();
    console.log("==========================================================");
    console.log("GENERATED FRESH KEYPAIR — STORE THESE OFFLINE IMMEDIATELY:");
    console.log(`  PUBLIC: ${fresh.publicKey()}`);
    console.log(`  SECRET: ${fresh.secret()}`);
    console.log("==========================================================");
  }

  console.log(`Network:    ${NETWORK_PASSPHRASE}`);
  console.log(`Horizon:    ${HORIZON_URL}`);
  console.log(`OLD source: ${oldPub}`);
  console.log(`DEST:       ${destPub}`);

  const server = new Horizon.Server(HORIZON_URL, { allowHttp: true });

  // Confirm DEST exists on this network. If missing on testnet we auto-create
  // with a small starting balance so the subsequent AccountMerge has a target.
  // On mainnet CreateAccount is restricted by Pi protocol — must pre-exist.
  let destExists = true;
  try {
    await server.loadAccount(destPub);
    console.log(`DEST exists on-chain: OK`);
  } catch {
    destExists = false;
    if (NETWORK_PASSPHRASE === "Pi Network") {
      fail(
        `DEST ${destPub} is NOT funded on Pi Mainnet. CreateAccount is ` +
          `restricted — destination must already be a Pi-onboarded account.`,
      );
    }
    console.log(`DEST missing — will auto-create on ${NETWORK_PASSPHRASE}`);
    const srcForCreate = await server.loadAccount(oldPub);
    const createTx = new TransactionBuilder(srcForCreate, {
      fee: FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        Operation.createAccount({
          destination: destPub,
          startingBalance: "2",
        }),
      )
      .setTimeout(120)
      .build();
    createTx.sign(oldKp);
    const createRes = await server.submitTransaction(createTx);
    console.log(`  create hash:   ${createRes.hash}`);
    console.log(`  create ledger: ${(createRes as any).ledger ?? "?"}`);
  }

  const src = await server.loadAccount(oldPub);
  const native = src.balances.find((b: any) => b.asset_type === "native") as
    | { balance: string }
    | undefined;
  if (!native) fail("OLD account has no native balance entry");
  console.log(`OLD balance: ${native.balance} Pi`);
  console.log(`subentries:  ${(src as any).subentry_count ?? "?"}`);

  const useMerge = !FORCE_PAYMENT && (src as any).subentry_count === 0;

  const tx = new TransactionBuilder(src, {
    fee: FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  }).setTimeout(180);

  if (useMerge) {
    console.log("Strategy: AccountMerge (closes OLD account permanently)");
    tx.addOperation(Operation.accountMerge({ destination: destPub }));
  } else {
    const balanceNum = Number.parseFloat(native.balance);
    // Reserve covers base reserve (1 Pi) + buffer for fee + sub-entries.
    const reserve = 1.5;
    const amt = PAYMENT_AMOUNT
      ? PAYMENT_AMOUNT
      : (balanceNum - reserve).toFixed(7);
    if (Number.parseFloat(amt) <= 0) fail(`Computed amount ${amt} <= 0`);
    console.log(`Strategy: Payment of ${amt} Pi (OLD remains open)`);
    tx.addOperation(
      Operation.payment({
        destination: destPub,
        asset: Asset.native(),
        amount: amt,
      }),
    );
  }

  const built = tx.build();
  built.sign(oldKp);

  try {
    const res = await server.submitTransaction(built);
    console.log("SUCCESS");
    console.log(`  hash:   ${res.hash}`);
    console.log(`  ledger: ${(res as any).ledger ?? "?"}`);
  } catch (e: any) {
    const detail = e?.response?.data || e?.data || e;
    console.error("SUBMIT FAILED:");
    try {
      console.error(JSON.stringify(detail, null, 2));
    } catch {
      console.error(detail);
    }
    process.exit(2);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

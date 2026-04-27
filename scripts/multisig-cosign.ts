#!/usr/bin/env npx tsx
/**
 * Add a signature to a Pi Testnet/Mainnet envelope using a SOFTWARE secret.
 * For hardware-wallet signing use scripts/sign-with-ledger.ts instead.
 *
 * Usage:
 *   read -s SIGNER_SECRET && export SIGNER_SECRET
 *   npx tsx scripts/multisig-cosign.ts --in tx.signed.xdr --out tx.signed2.xdr
 *
 * Env:
 *   SIGNER_SECRET        S... secret of the cosigner (REQUIRED)
 *   NETWORK_PASSPHRASE   default "Pi Testnet"
 */

import { readFileSync, writeFileSync } from "node:fs";
import {
  Keypair,
  TransactionBuilder,
  Transaction,
  FeeBumpTransaction,
} from "@stellar/stellar-sdk";

const NETWORK_PASSPHRASE = process.env.NETWORK_PASSPHRASE || "Pi Testnet";

function parseArgs(argv: string[]) {
  const a: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--in") a.in = argv[++i];
    else if (argv[i] === "--out") a.out = argv[++i];
  }
  return a;
}

async function readXdr(path?: string): Promise<string> {
  if (path) return readFileSync(path, "utf8").trim();
  const chunks: Buffer[] = [];
  for await (const c of process.stdin) chunks.push(c as Buffer);
  return Buffer.concat(chunks).toString("utf8").trim();
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const secret = process.env.SIGNER_SECRET;
  if (!secret) {
    console.error("ERROR: SIGNER_SECRET env var required");
    process.exit(1);
  }
  const kp = Keypair.fromSecret(secret);
  console.error(`cosigner pubkey: ${kp.publicKey()}`);
  console.error(`network:         ${NETWORK_PASSPHRASE}`);

  const xdr = await readXdr(opts.in);
  const tx = TransactionBuilder.fromXDR(xdr, NETWORK_PASSPHRASE) as
    | Transaction
    | FeeBumpTransaction;
  console.error(`tx hash:         ${tx.hash().toString("hex")}`);
  console.error(`existing sigs:   ${tx.signatures.length}`);

  tx.sign(kp);
  const out = tx.toEnvelope().toXDR("base64");
  console.error(`new sigs total:  ${tx.signatures.length}`);

  if (opts.out) {
    writeFileSync(opts.out, out + "\n");
    console.error(`-> ${opts.out}`);
  } else {
    process.stdout.write(out + "\n");
  }
}

main().catch((e) => {
  console.error("FAILED:", e?.message ?? e);
  process.exit(1);
});

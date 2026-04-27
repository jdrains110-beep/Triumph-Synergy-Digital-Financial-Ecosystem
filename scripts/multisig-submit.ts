#!/usr/bin/env npx tsx
/**
 * Submit a fully-signed envelope to Pi Testnet/Mainnet Horizon.
 *
 * Usage:
 *   npx tsx scripts/multisig-submit.ts --in tx.signed2.xdr
 *
 * Env:
 *   HORIZON_URL          default https://api.testnet.minepi.com
 *   NETWORK_PASSPHRASE   default "Pi Testnet"
 */

import { readFileSync } from "node:fs";
import {
  Horizon,
  TransactionBuilder,
  Transaction,
  FeeBumpTransaction,
} from "@stellar/stellar-sdk";

const HORIZON_URL = process.env.HORIZON_URL || "https://api.testnet.minepi.com";
const NETWORK_PASSPHRASE = process.env.NETWORK_PASSPHRASE || "Pi Testnet";

function parseArgs(argv: string[]) {
  const a: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--in") a.in = argv[++i];
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
  const xdr = await readXdr(opts.in);
  const tx = TransactionBuilder.fromXDR(xdr, NETWORK_PASSPHRASE) as
    | Transaction
    | FeeBumpTransaction;

  console.error(`network:    ${NETWORK_PASSPHRASE}`);
  console.error(`horizon:    ${HORIZON_URL}`);
  console.error(`tx hash:    ${tx.hash().toString("hex")}`);
  console.error(`signatures: ${tx.signatures.length}`);

  const server = new Horizon.Server(HORIZON_URL, { allowHttp: true });
  try {
    const res = await server.submitTransaction(tx);
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
  console.error("FAILED:", e?.message ?? e);
  process.exit(1);
});

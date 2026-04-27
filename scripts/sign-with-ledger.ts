#!/usr/bin/env npx tsx
/**
 * Sign a Pi Testnet / Pi Mainnet transaction envelope with a Ledger device.
 *
 * Works with Ledger Nano S Plus, Nano X, Stax (any device running the official
 * Stellar app, version >= 5.0.0).
 *
 * Pre-reqs:
 *   1. Plug in Ledger, unlock with PIN, open the "Stellar" app.
 *   2. npm i @ledgerhq/hw-transport-node-hid @ledgerhq/hw-app-str
 *      (already added to package.json in this repo via this commit)
 *
 * Usage:
 *   # Sign an envelope from a file:
 *   npx tsx scripts/sign-with-ledger.ts --in tx.xdr --out tx.signed.xdr
 *
 *   # Or pipe in / out:
 *   cat tx.xdr | npx tsx scripts/sign-with-ledger.ts > tx.signed.xdr
 *
 *   # Just print the device's public key (no signing):
 *   npx tsx scripts/sign-with-ledger.ts --pubkey
 *
 * Env:
 *   NETWORK_PASSPHRASE   default: "Pi Testnet"
 *                        use "Pi Network" for Pi Mainnet
 *   DERIVATION_PATH      default: "44'/148'/0'"   (Stellar SLIP-0010 path,
 *                        matches Ledger Live Stellar account #1)
 *   ACCOUNT_INDEX        shorthand: sets path to "44'/148'/<INDEX>'"
 */

import { readFileSync, writeFileSync } from "node:fs";
import { TransactionBuilder, Networks, Transaction, FeeBumpTransaction } from "@stellar/stellar-sdk";

// Lazy-loaded so --help / --pubkey work without the device deps installed.
async function loadLedger() {
  const TransportNodeHid = (await import("@ledgerhq/hw-transport-node-hid")).default;
  const StrModule = await import("@ledgerhq/hw-app-str");
  const Str = StrModule.default ?? StrModule;
  return { TransportNodeHid, Str };
}

const NETWORK_PASSPHRASE = process.env.NETWORK_PASSPHRASE || "Pi Testnet";
const ACCOUNT_INDEX = process.env.ACCOUNT_INDEX || "0";
const DERIVATION_PATH =
  process.env.DERIVATION_PATH || `44'/148'/${ACCOUNT_INDEX}'`;

function parseArgs(argv: string[]) {
  const args: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--pubkey" || a === "--help") args[a.slice(2)] = true;
    else if (a === "--in" || a === "--out") args[a.slice(2)] = argv[++i];
  }
  return args;
}

async function readEnvelopeXdr(opts: Record<string, any>): Promise<string> {
  if (opts.in) {
    return readFileSync(opts.in, "utf8").trim();
  }
  // stdin
  const chunks: Buffer[] = [];
  for await (const c of process.stdin) chunks.push(c as Buffer);
  return Buffer.concat(chunks).toString("utf8").trim();
}

function writeEnvelopeXdr(opts: Record<string, any>, xdr: string) {
  if (opts.out) {
    writeFileSync(opts.out, xdr + "\n");
    console.error(`signed envelope -> ${opts.out}`);
  } else {
    process.stdout.write(xdr + "\n");
  }
}

async function getPublicKey() {
  const { TransportNodeHid, Str } = await loadLedger();
  const transport = await TransportNodeHid.create();
  try {
    const str = new (Str as any).default
      ? new (Str as any).default(transport)
      : new (Str as any)(transport);
    const { publicKey } = await str.getPublicKey(DERIVATION_PATH);
    return publicKey as string;
  } finally {
    await transport.close();
  }
}

async function signEnvelope(envelopeXdr: string): Promise<string> {
  const { TransportNodeHid, Str } = await loadLedger();
  const transport = await TransportNodeHid.create();
  try {
    const str = new (Str as any).default
      ? new (Str as any).default(transport)
      : new (Str as any)(transport);

    const { publicKey } = await str.getPublicKey(DERIVATION_PATH);
    console.error(`Ledger pubkey @ ${DERIVATION_PATH}: ${publicKey}`);
    console.error(`Network passphrase: ${NETWORK_PASSPHRASE}`);

    // Reconstruct tx so we can compute the correct signature base.
    const tx = TransactionBuilder.fromXDR(envelopeXdr, NETWORK_PASSPHRASE) as
      | Transaction
      | FeeBumpTransaction;

    console.error(
      `tx hash: ${tx.hash().toString("hex")} (verify on Ledger screen)`,
    );
    console.error(`Operations:`);
    if ("operations" in tx) {
      for (const op of tx.operations) {
        console.error(`  - ${op.type}${(op as any).destination ? " -> " + (op as any).destination : ""}`);
      }
    } else {
      console.error(`  - fee-bump for inner tx`);
    }
    console.error("Confirm + approve on the Ledger device...");

    const signatureBase = tx.signatureBase();
    const { signature } = await str.signTransaction(
      DERIVATION_PATH,
      signatureBase,
    );

    tx.addSignature(publicKey, signature.toString("base64"));
    return tx.toEnvelope().toXDR("base64");
  } finally {
    await transport.close();
  }
}

function help() {
  console.log(`Sign Pi Testnet/Mainnet tx with Ledger.

  --pubkey            Print Ledger Stellar pubkey at $DERIVATION_PATH and exit
  --in  <file>        Read envelope XDR from file (default: stdin)
  --out <file>        Write signed envelope XDR to file (default: stdout)
  --help              This message

Env: NETWORK_PASSPHRASE (default "Pi Testnet"), DERIVATION_PATH (default "44'/148'/0'"), ACCOUNT_INDEX (default 0)`);
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) return help();
  if (opts.pubkey) {
    console.log(await getPublicKey());
    return;
  }
  const envelope = await readEnvelopeXdr(opts);
  if (!envelope) {
    console.error("ERROR: no envelope XDR provided (use --in <file> or pipe stdin)");
    process.exit(1);
  }
  const signed = await signEnvelope(envelope);
  writeEnvelopeXdr(opts, signed);
}

main().catch((e) => {
  console.error("FAILED:", e?.message ?? e);
  if (e?.statusText) console.error("  Ledger status:", e.statusText);
  process.exit(1);
});

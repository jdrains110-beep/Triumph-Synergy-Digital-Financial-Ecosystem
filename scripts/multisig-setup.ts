#!/usr/bin/env npx tsx
/**
 * Build the SetOptions transaction that converts an account into a 2-of-3
 * (or N-of-M) multisig on Pi Testnet / Pi Mainnet.
 *
 * Output: an UNSIGNED envelope XDR printed to stdout (or --out file).
 * The master key still signs this one tx (because we're modifying its own
 * signers); after this submits, future txs require N signatures.
 *
 * IMPORTANT — IRREVERSIBLE if MASTER_WEIGHT=0:
 *   Setting master_weight=0 disables the original key permanently. Run
 *   --dry-run first and verify all 3 cosigner pubkeys are correct and that
 *   each holder can produce a signature.
 *
 * Required env:
 *   ACCOUNT          public key being upgraded (default: GA6Z5...GL7V central node)
 *   SIGNER_A         G... pubkey of cosigner A (e.g. your Ledger)
 *   SIGNER_B         G... pubkey of cosigner B (e.g. Trezor)
 *   SIGNER_C         G... pubkey of cosigner C (e.g. backup hot key)
 *
 * Optional env:
 *   THRESHOLD        signature threshold required (default 2)
 *   SIGNER_WEIGHT    weight per signer (default 1)
 *   MASTER_WEIGHT    weight of original master key after change (default 0 — disables)
 *                    set to 1 if you want the master key to still count toward threshold
 *   HORIZON_URL      default https://api.testnet.minepi.com
 *   NETWORK_PASSPHRASE  default "Pi Testnet"  (use "Pi Network" for mainnet)
 *   FEE              default 1000000 stroops
 *   DRY_RUN          "1" to print the plan without producing XDR
 *
 * Usage:
 *   ACCOUNT=GA6Z5... SIGNER_A=G... SIGNER_B=G... SIGNER_C=G... \
 *     npx tsx scripts/multisig-setup.ts --out tx.unsigned.xdr
 *   # then: have the master-key holder sign with sign-with-ledger or stellar-sdk,
 *   # then: scripts/multisig-submit.ts
 */

import { writeFileSync } from "node:fs";
import {
  Horizon,
  TransactionBuilder,
  Operation,
} from "@stellar/stellar-sdk";

const ACCOUNT =
  process.env.ACCOUNT ||
  "GA6Z5STFJZPBDQT5VZSDUTCKLXXB626ONTLRWBJAWYKLH4LKPIZCGL7V";
const SIGNERS = [process.env.SIGNER_A, process.env.SIGNER_B, process.env.SIGNER_C].filter(
  Boolean,
) as string[];
const THRESHOLD = Number.parseInt(process.env.THRESHOLD || "2", 10);
const SIGNER_WEIGHT = Number.parseInt(process.env.SIGNER_WEIGHT || "1", 10);
const MASTER_WEIGHT = Number.parseInt(process.env.MASTER_WEIGHT || "0", 10);
const HORIZON_URL = process.env.HORIZON_URL || "https://api.testnet.minepi.com";
const NETWORK_PASSPHRASE = process.env.NETWORK_PASSPHRASE || "Pi Testnet";
const FEE = process.env.FEE || "1000000";
const DRY_RUN = process.env.DRY_RUN === "1";

function parseArgs(argv: string[]) {
  const args: Record<string, string> = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--out") args.out = argv[++i];
  }
  return args;
}

function fail(m: string): never {
  console.error("ERROR:", m);
  process.exit(1);
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  if (SIGNERS.length < 1) fail("set SIGNER_A (and SIGNER_B/C as needed)");
  for (const s of SIGNERS) {
    if (!/^G[A-Z2-7]{55}$/.test(s)) fail(`invalid signer pubkey: ${s}`);
  }
  if (!/^G[A-Z2-7]{55}$/.test(ACCOUNT)) fail(`invalid ACCOUNT: ${ACCOUNT}`);
  if (THRESHOLD < 1 || THRESHOLD > SIGNERS.length + (MASTER_WEIGHT > 0 ? 1 : 0)) {
    fail(`THRESHOLD ${THRESHOLD} unreachable with given signers/master_weight`);
  }

  console.error("=== Multisig setup plan ===");
  console.error(`  Account:           ${ACCOUNT}`);
  console.error(`  Network:           ${NETWORK_PASSPHRASE}`);
  console.error(`  Horizon:           ${HORIZON_URL}`);
  console.error(`  New signers:       ${SIGNERS.length}`);
  SIGNERS.forEach((s, i) => console.error(`    [${i}] ${s} (weight=${SIGNER_WEIGHT})`));
  console.error(`  Master weight:     ${MASTER_WEIGHT}${MASTER_WEIGHT === 0 ? "  (DISABLES original key — IRREVERSIBLE)" : ""}`);
  console.error(`  Thresholds:        low=${THRESHOLD} med=${THRESHOLD} high=${THRESHOLD}`);
  console.error(`  Fee:               ${FEE} stroops`);

  if (DRY_RUN) {
    console.error("\nDRY_RUN=1 — not building XDR");
    return;
  }

  const server = new Horizon.Server(HORIZON_URL, { allowHttp: true });
  const src = await server.loadAccount(ACCOUNT);
  console.error(`  Loaded account, sequence=${src.sequenceNumber()}`);

  const builder = new TransactionBuilder(src, {
    fee: FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  }).setTimeout(900); // 15 minutes for cosigners to round-robin

  // Add each new signer
  for (const s of SIGNERS) {
    builder.addOperation(
      Operation.setOptions({
        signer: { ed25519PublicKey: s, weight: SIGNER_WEIGHT },
      }),
    );
  }

  // Set thresholds + master weight in a single setOptions
  builder.addOperation(
    Operation.setOptions({
      masterWeight: MASTER_WEIGHT,
      lowThreshold: THRESHOLD,
      medThreshold: THRESHOLD,
      highThreshold: THRESHOLD,
    }),
  );

  const tx = builder.build();
  const xdr = tx.toEnvelope().toXDR("base64");

  console.error(`\n  Built unsigned envelope (${xdr.length} chars)`);
  console.error(`  Tx hash (preview): ${tx.hash().toString("hex")}`);

  if (opts.out) {
    writeFileSync(opts.out, xdr + "\n");
    console.error(`  -> ${opts.out}`);
  } else {
    process.stdout.write(xdr + "\n");
  }

  console.error("\nNext: have the MASTER key holder sign this envelope.");
  console.error("  Ledger:  npx tsx scripts/sign-with-ledger.ts --in tx.unsigned.xdr --out tx.signed.xdr");
  console.error("  Submit:  npx tsx scripts/multisig-submit.ts --in tx.signed.xdr");
}

main().catch((e) => {
  console.error("FAILED:", e?.message ?? e);
  process.exit(1);
});

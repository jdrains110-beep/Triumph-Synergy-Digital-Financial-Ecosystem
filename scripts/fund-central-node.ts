#!/usr/bin/env npx tsx
/**
 * Fund Central Node on Pi Testnet
 * ================================
 * Creates the central / governance-shield Stellar account on Pi Testnet
 * by submitting a CreateAccount op from a funded source account.
 *
 * Prerequisites:
 *   - A FUNDED Pi Testnet source account (fund via Pi Browser sandbox).
 *   - Node.js 18+ with @stellar/stellar-sdk installed (already in repo deps).
 *
 * Usage:
 *   SOURCE_SECRET=S... npx tsx scripts/fund-central-node.ts
 *
 * Optional env vars:
 *   DESTINATION       - public key to fund   (default: central node pubkey)
 *   STARTING_BALANCE  - amount of Pi to send (default: "5")
 *   HORIZON_URL       - Pi Testnet horizon   (default: api.testnet.minepi.com)
 *   NETWORK_PASSPHRASE - default: "Pi Testnet"
 *   GOVERNANCE_SHIELD_URL - smoke-test URL   (default: http://triumph-governance-shield:11626/info)
 *   SKIP_SMOKE_TEST   - set to "1" to skip the post-fund smoke test
 *
 * NEVER paste SOURCE_SECRET on the command line history; prefer:
 *   read -s SOURCE_SECRET && export SOURCE_SECRET
 *   npx tsx scripts/fund-central-node.ts
 */

import {
  Keypair,
  Horizon,
  TransactionBuilder,
  Operation,
  BASE_FEE,
} from "@stellar/stellar-sdk";

const HORIZON_URL =
  process.env.HORIZON_URL || "https://api.testnet.minepi.com";
const NETWORK_PASSPHRASE = process.env.NETWORK_PASSPHRASE || "Pi Testnet";
const DESTINATION =
  process.env.DESTINATION ||
  "GA6Z5STFJZPBDQT5VZSDUTCKLXXB626ONTLRWBJAWYKLH4LKPIZCGL7V";
const STARTING_BALANCE = process.env.STARTING_BALANCE || "5";
// Pi Testnet baseFee is 100000 stroops (Stellar default is 100). Default high
// to avoid tx_insufficient_fee; can be overridden with FEE env var.
const FEE = process.env.FEE || "1000000";
const GOVERNANCE_SHIELD_URL =
  process.env.GOVERNANCE_SHIELD_URL ||
  "http://triumph-governance-shield:11626/info";
const SKIP_SMOKE_TEST = process.env.SKIP_SMOKE_TEST === "1";

function fail(msg: string): never {
  console.error(`ERROR: ${msg}`);
  process.exit(1);
}

async function accountExists(
  server: Horizon.Server,
  publicKey: string,
): Promise<boolean> {
  try {
    await server.loadAccount(publicKey);
    return true;
  } catch (e: unknown) {
    const err = e as { response?: { status?: number } };
    if (err?.response?.status === 404) return false;
    throw e;
  }
}

async function main() {
  console.log("Fund Central Node — Pi Testnet");
  console.log(`  Horizon:     ${HORIZON_URL}`);
  console.log(`  Passphrase:  "${NETWORK_PASSPHRASE}"`);
  console.log(`  Destination: ${DESTINATION}`);
  console.log(`  Amount:      ${STARTING_BALANCE} Pi\n`);

  const secret = process.env.SOURCE_SECRET;
  if (!secret) fail("SOURCE_SECRET env var is required.");

  let source: Keypair;
  try {
    source = Keypair.fromSecret(secret);
  } catch {
    fail("SOURCE_SECRET is not a valid Stellar secret key.");
  }
  console.log(`Source: ${source.publicKey()}`);

  const server = new Horizon.Server(HORIZON_URL);

  // 1. Verify source is funded
  if (!(await accountExists(server, source.publicKey()))) {
    fail(
      `Source account ${source.publicKey()} is NOT funded on this network. ` +
        "Fund it via the Pi Browser sandbox (Testnet mode) first.",
    );
  }
  const sourceAccount = await server.loadAccount(source.publicKey());
  const native = sourceAccount.balances.find(
    (b) => b.asset_type === "native",
  );
  console.log(`Source balance: ${native?.balance ?? "?"} Pi\n`);

  // 2. Check destination state
  const destExists = await accountExists(server, DESTINATION);
  if (destExists) {
    console.log(
      "Destination account already exists on this ledger. " +
        "Will send a Payment instead of CreateAccount.",
    );
  } else {
    console.log("Destination does NOT exist yet — will CreateAccount.");
  }

  // 3. Build tx
  const op = destExists
    ? Operation.payment({
        destination: DESTINATION,
        asset: (await import("@stellar/stellar-sdk")).Asset.native(),
        amount: STARTING_BALANCE,
      })
    : Operation.createAccount({
        destination: DESTINATION,
        startingBalance: STARTING_BALANCE,
      });

  const tx = new TransactionBuilder(sourceAccount, {
    fee: FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(op)
    .setTimeout(60)
    .build();

  tx.sign(source);

  // 4. Submit
  console.log("Submitting transaction...");
  try {
    const result = await server.submitTransaction(tx);
    console.log("\nSUCCESS");
    console.log(`  Hash:   ${result.hash}`);
    console.log(`  Ledger: ${result.ledger}`);
    console.log(`  View:   ${HORIZON_URL}/transactions/${result.hash}`);

    // 5. Confirm new state on the ledger
    const after = await server.loadAccount(DESTINATION);
    const bal = after.balances.find((b) => b.asset_type === "native");
    console.log(`\nDestination balance now: ${bal?.balance ?? "?"} Pi`);

    // 6. Smoke test against governance-shield
    if (SKIP_SMOKE_TEST) {
      console.log("\nSmoke test: skipped (SKIP_SMOKE_TEST=1)");
    } else {
      await runSmokeTest();
    }
  } catch (e: unknown) {
    const err = e as {
      response?: {
        data?: {
          extras?: { result_codes?: unknown };
          detail?: string;
        };
        status?: number;
      };
      message?: string;
    };
    console.error("\nFAILED");
    console.error(`  Status: ${err?.response?.status}`);
    console.error(
      `  Detail: ${err?.response?.data?.detail || err?.message}`,
    );
    console.error(
      `  Codes:  ${JSON.stringify(err?.response?.data?.extras?.result_codes)}`,
    );
    console.error(`  Raw:    ${JSON.stringify(err?.response?.data)}`);
    process.exit(1);
  }
}

// ── Governance-shield smoke test ────────────────────────────────────────────
//
// Polls governance-shield /info up to ~90s and prints the moment its
// blockchain.account_status flips from "not_funded_on_chain" to "active".
// The central node refreshes chain state on a 30s interval, so allow time.

interface ShieldInfo {
  info?: {
    state?: string;
    central_node?: string;
    blockchain?: {
      connected?: boolean;
      account_status?: string;
      error?: string | null;
      account?: {
        address?: string;
        sequence?: string;
        balances?: Array<{ asset_type: string; balance: string }>;
      } | null;
    };
  };
}

async function fetchShieldInfo(): Promise<ShieldInfo | null> {
  try {
    const res = await fetch(GOVERNANCE_SHIELD_URL, {
      signal: AbortSignal.timeout(5000),
    });
    // 503 still returns a JSON body during boot; keep parsing
    return (await res.json()) as ShieldInfo;
  } catch {
    return null;
  }
}

async function runSmokeTest() {
  console.log("\n--- Smoke test: governance-shield ---");
  console.log(`URL: ${GOVERNANCE_SHIELD_URL}`);

  const initial = await fetchShieldInfo();
  if (!initial) {
    console.log(
      "WARN: could not reach governance-shield. " +
        "Run this script attached to its docker network, e.g.\n" +
        "  docker run --rm --network pi-bridge -e SOURCE_SECRET ... node:20-alpine ...\n" +
        "Funding succeeded on-chain regardless.",
    );
    return;
  }

  const initialStatus = initial.info?.blockchain?.account_status ?? "unknown";
  console.log(`Initial shield account_status: ${initialStatus}`);

  const deadline = Date.now() + 90_000;
  const pollMs = 5_000;
  let attempt = 0;

  while (Date.now() < deadline) {
    attempt++;
    const info = await fetchShieldInfo();
    const status = info?.info?.blockchain?.account_status;
    const bals = info?.info?.blockchain?.account?.balances ?? [];
    const native = bals.find((b) => b.asset_type === "native");

    process.stdout.write(
      `  [${attempt}] status=${status ?? "?"} balance=${native?.balance ?? "-"}\n`,
    );

    if (status === "active" && native?.balance) {
      console.log(
        `\nOK: governance-shield sees the funded account. ` +
          `Balance=${native.balance} Pi`,
      );
      return;
    }
    await new Promise((r) => setTimeout(r, pollMs));
  }

  console.log(
    "\nWARN: governance-shield did not flip to active within 90s. " +
      "Ledger funding succeeded; the next 30s refresh cycle should pick it up. " +
      "Verify manually:\n" +
      `  curl -s ${GOVERNANCE_SHIELD_URL} | python3 -m json.tool | grep -A4 blockchain`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

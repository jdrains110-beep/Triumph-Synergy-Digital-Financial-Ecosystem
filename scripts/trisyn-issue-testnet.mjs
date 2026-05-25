#!/usr/bin/env node
/**
 * scripts/trisyn-issue-testnet.mjs
 *
 * Issue the TRISYN utility token on Pi Testnet per the official Pi spec:
 *   https://github.com/pi-apps/pi-platform-docs/blob/master/tokens.md
 *
 * This script implements the full lifecycle as discrete subcommands so
 * each step is auditable, idempotent-where-possible, and recoverable:
 *
 *   1. trustline    — distributor wallet establishes a trustline to TRISYN.
 *                     This is the on-chain event that creates the asset.
 *   2. mint         — issuer pays TRISYN_MAX_SUPPLY of TRISYN to the
 *                     distributor (one-shot minting; fixed supply).
 *   3. home-domain  — issuer sets home_domain so Pi Wallet can discover
 *                     /.well-known/pi.toml and list TRISYN.
 *   4. lock         — issuer sets master signer weight to 0, permanently
 *                     locking supply at TRISYN_MAX_SUPPLY (Stellar best
 *                     practice for fixed-supply tokens).
 *   5. sell         — distributor pays N TRISYN to a Pioneer who has
 *                     established a trustline. Used by the buy API.
 *   6. status       — print on-chain balances + flags for both wallets.
 *
 * PREREQUISITES (per Pi spec):
 *   - 2 Pi Wallets created inside Pi Wallet and activated on Pi Testnet
 *   - Issuer wallet  = the Pi App Wallet (App Studio-issued)
 *   - Distributor    = a second testnet wallet you control
 *
 * REQUIRED ENVIRONMENT VARIABLES:
 *   PI_TRISYN_ISSUER_SECRET_TESTNET       Issuer secret seed (S...)
 *   PI_TRISYN_DISTRIBUTOR_SECRET_TESTNET  Distributor secret seed (S...)
 *
 * OPTIONAL:
 *   PI_TESTNET_HORIZON   (default https://api.testnet.minepi.com)
 *   TRISYN_HOME_DOMAIN   (default triumphsynergyab2099.pinet.com)
 *
 * USAGE:
 *   node scripts/trisyn-issue-testnet.mjs trustline
 *   node scripts/trisyn-issue-testnet.mjs mint
 *   node scripts/trisyn-issue-testnet.mjs home-domain
 *   node scripts/trisyn-issue-testnet.mjs lock
 *   node scripts/trisyn-issue-testnet.mjs sell <RECIPIENT_PUBLIC_KEY> <AMOUNT>
 *   node scripts/trisyn-issue-testnet.mjs status
 *
 * SECURITY: Secrets are read from env only — they are never logged, never
 * persisted, and never transmitted to any third party. Run on a trusted
 * machine. The Pi App Wallet secret should be exported from Pi Wallet
 * settings only when you're ready to issue, then removed from env.
 */

import * as StellarSDK from "@stellar/stellar-sdk";

// ── Constants (mirror lib/config/pi-app-wallets.ts) ─────────────────────────

const HORIZON_URL =
  process.env.PI_TESTNET_HORIZON || "https://api.testnet.minepi.com";
const NETWORK_PASSPHRASE = "Pi Testnet";
const TRISYN_ASSET_CODE = "TRISYN";
const TRISYN_MAX_SUPPLY = "100000000000"; // 100 billion
const TRISYN_HOME_DOMAIN =
  process.env.TRISYN_HOME_DOMAIN || "triumphsynergyab2099.pinet.com";

// Expected App Wallet (sanity-check the issuer secret derives to this).
const EXPECTED_ISSUER_PUBKEY =
  "GC4ZAPK6QOEX2JJQBTQW2GVCYW3AI7NRYFNZUSE343S5OIK6G4FBM7XP";

// ── Helpers ─────────────────────────────────────────────────────────────────

const server = new StellarSDK.Horizon.Server(HORIZON_URL);

function loadKeypair(envVar, label) {
  const secret = process.env[envVar];
  if (!secret) {
    console.error(`✗ Missing required env var: ${envVar}`);
    console.error(`  Export your ${label} secret seed and re-run.`);
    process.exit(1);
  }
  try {
    return StellarSDK.Keypair.fromSecret(secret.trim());
  } catch (err) {
    console.error(`✗ ${envVar} is not a valid Stellar secret seed.`);
    console.error(`  ${err.message}`);
    process.exit(1);
  }
}

async function baseFee() {
  const resp = await server.ledgers().order("desc").limit(1).call();
  return resp.records[0].base_fee_in_stroops;
}

async function buildTx(sourceAccount, ops, signers) {
  let builder = new StellarSDK.TransactionBuilder(sourceAccount, {
    fee: await baseFee(),
    networkPassphrase: NETWORK_PASSPHRASE,
    timebounds: await server.fetchTimebounds(90),
  });
  for (const op of ops) builder = builder.addOperation(op);
  const tx = builder.build();
  for (const s of signers) tx.sign(s);
  return tx;
}

async function submit(tx, label) {
  try {
    const res = await server.submitTransaction(tx);
    console.log(`✓ ${label} submitted`);
    console.log(`  hash:   ${res.hash}`);
    console.log(`  ledger: ${res.ledger}`);
    return res;
  } catch (err) {
    const codes = err?.response?.data?.extras?.result_codes;
    console.error(`✗ ${label} failed`);
    if (codes) console.error(`  codes: ${JSON.stringify(codes)}`);
    else console.error(`  ${err.message}`);
    process.exit(1);
  }
}

// ── Subcommands ─────────────────────────────────────────────────────────────

async function cmdTrustline() {
  const issuer = loadKeypair("PI_TRISYN_ISSUER_SECRET_TESTNET", "issuer");
  const distributor = loadKeypair(
    "PI_TRISYN_DISTRIBUTOR_SECRET_TESTNET",
    "distributor",
  );
  if (issuer.publicKey() !== EXPECTED_ISSUER_PUBKEY) {
    console.warn(
      `⚠ Issuer derives to ${issuer.publicKey()}, expected ${EXPECTED_ISSUER_PUBKEY}. Continuing anyway.`,
    );
  }
  const asset = new StellarSDK.Asset(TRISYN_ASSET_CODE, issuer.publicKey());
  const distAccount = await server.loadAccount(distributor.publicKey());
  const tx = await buildTx(
    distAccount,
    [StellarSDK.Operation.changeTrust({ asset })],
    [distributor],
  );
  await submit(tx, "Trustline");
  console.log(
    `  TRISYN is now an on-chain asset issued by ${issuer.publicKey()}.`,
  );
}

async function cmdMint() {
  const issuer = loadKeypair("PI_TRISYN_ISSUER_SECRET_TESTNET", "issuer");
  const distributor = loadKeypair(
    "PI_TRISYN_DISTRIBUTOR_SECRET_TESTNET",
    "distributor",
  );
  const asset = new StellarSDK.Asset(TRISYN_ASSET_CODE, issuer.publicKey());
  const issuerAccount = await server.loadAccount(issuer.publicKey());
  const tx = await buildTx(
    issuerAccount,
    [
      StellarSDK.Operation.payment({
        destination: distributor.publicKey(),
        asset,
        amount: TRISYN_MAX_SUPPLY,
      }),
    ],
    [issuer],
  );
  await submit(tx, `Mint ${TRISYN_MAX_SUPPLY} TRISYN`);
}

async function cmdHomeDomain() {
  const issuer = loadKeypair("PI_TRISYN_ISSUER_SECRET_TESTNET", "issuer");
  const issuerAccount = await server.loadAccount(issuer.publicKey());
  const tx = await buildTx(
    issuerAccount,
    [StellarSDK.Operation.setOptions({ homeDomain: TRISYN_HOME_DOMAIN })],
    [issuer],
  );
  await submit(tx, `Set home_domain = ${TRISYN_HOME_DOMAIN}`);
  console.log(
    `  Pi Wallet will now scan https://${TRISYN_HOME_DOMAIN}/.well-known/pi.toml`,
  );
}

async function cmdLock() {
  const issuer = loadKeypair("PI_TRISYN_ISSUER_SECRET_TESTNET", "issuer");
  const issuerAccount = await server.loadAccount(issuer.publicKey());
  console.log(
    "⚠ About to set issuer master weight to 0 — this PERMANENTLY locks supply.",
  );
  console.log("  Make sure mint has already been run, or you'll lock at 0.");
  if (process.env.TRISYN_CONFIRM_LOCK !== "yes") {
    console.error(
      "✗ Set TRISYN_CONFIRM_LOCK=yes to confirm. Refusing to lock issuer.",
    );
    process.exit(1);
  }
  const tx = await buildTx(
    issuerAccount,
    [StellarSDK.Operation.setOptions({ masterWeight: 0 })],
    [issuer],
  );
  await submit(tx, "Lock issuer (master weight → 0)");
  console.log(
    `  TRISYN supply is now permanently fixed at ${TRISYN_MAX_SUPPLY}.`,
  );
}

async function cmdSell(recipient, amount) {
  if (!recipient || !amount) {
    console.error(
      "Usage: node scripts/trisyn-issue-testnet.mjs sell <RECIPIENT> <AMOUNT>",
    );
    process.exit(1);
  }
  if (!StellarSDK.StrKey.isValidEd25519PublicKey(recipient)) {
    console.error(`✗ Invalid recipient public key: ${recipient}`);
    process.exit(1);
  }
  const issuer = loadKeypair("PI_TRISYN_ISSUER_SECRET_TESTNET", "issuer");
  const distributor = loadKeypair(
    "PI_TRISYN_DISTRIBUTOR_SECRET_TESTNET",
    "distributor",
  );
  const asset = new StellarSDK.Asset(TRISYN_ASSET_CODE, issuer.publicKey());
  const distAccount = await server.loadAccount(distributor.publicKey());
  const tx = await buildTx(
    distAccount,
    [
      StellarSDK.Operation.payment({
        destination: recipient,
        asset,
        amount: String(amount),
      }),
    ],
    [distributor],
  );
  await submit(tx, `Sell ${amount} TRISYN → ${recipient}`);
}

async function cmdStatus() {
  const issuer = loadKeypair("PI_TRISYN_ISSUER_SECRET_TESTNET", "issuer");
  const distributor = loadKeypair(
    "PI_TRISYN_DISTRIBUTOR_SECRET_TESTNET",
    "distributor",
  );
  for (const [label, kp] of [
    ["Issuer     ", issuer],
    ["Distributor", distributor],
  ]) {
    console.log(`\n${label} ${kp.publicKey()}`);
    try {
      const acc = await server.loadAccount(kp.publicKey());
      console.log(`  home_domain: ${acc.home_domain || "(unset)"}`);
      console.log(
        `  thresholds:  master=${acc.thresholds.master_weight} low=${acc.thresholds.low_threshold} med=${acc.thresholds.med_threshold} high=${acc.thresholds.high_threshold}`,
      );
      for (const b of acc.balances) {
        const code = b.asset_code || b.asset_type;
        console.log(`  ${code.padEnd(12)} ${b.balance}`);
      }
    } catch (e) {
      console.log(
        `  ✗ account not found on ${HORIZON_URL} (activate it in Pi Wallet first)`,
      );
    }
  }
}

// ── Entry point ─────────────────────────────────────────────────────────────

const [, , cmd, ...rest] = process.argv;

console.log(`Pi Testnet Horizon: ${HORIZON_URL}`);
console.log(`Network passphrase: ${NETWORK_PASSPHRASE}`);
console.log(`Asset code:         ${TRISYN_ASSET_CODE}`);
console.log("");

switch (cmd) {
  case "trustline":
    await cmdTrustline();
    break;
  case "mint":
    await cmdMint();
    break;
  case "home-domain":
    await cmdHomeDomain();
    break;
  case "lock":
    await cmdLock();
    break;
  case "sell":
    await cmdSell(rest[0], rest[1]);
    break;
  case "status":
    await cmdStatus();
    break;
  default:
    console.log(
      "Subcommands: trustline | mint | home-domain | lock | sell | status",
    );
    console.log("");
    console.log("Recommended order on Pi Testnet:");
    console.log("  1. trustline    (distributor establishes trust → asset exists)");
    console.log("  2. mint         (issuer pays full supply to distributor)");
    console.log("  3. home-domain  (issuer links pi.toml for Pi Wallet listing)");
    console.log("  4. lock         (issuer master weight → 0; supply locked)");
    console.log("");
    console.log("Then use 'sell <pub> <amt>' to distribute to Pioneers.");
    process.exit(0);
}

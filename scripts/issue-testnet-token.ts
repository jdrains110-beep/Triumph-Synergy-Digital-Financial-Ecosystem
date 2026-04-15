#!/usr/bin/env npx tsx
/**
 * Pi Testnet Token Issuance Script
 * ==================================
 * Creates a custom Stellar asset on Pi Testnet (api.testnet.minepi.com).
 *
 * Prerequisites:
 *   - A FUNDED Pi Testnet account (get test Pi through Pi Browser sandbox)
 *   - Node.js 18+ with @stellar/stellar-sdk installed
 *
 * Usage:
 *   npx tsx scripts/issue-testnet-token.ts
 *
 * Environment variables (or edit DEFAULTS below):
 *   SOURCE_SECRET  — Secret key of a funded Pi Testnet account
 *   TOKEN_CODE     — Asset code (1-12 chars, e.g. "SYN")
 *   TOKEN_SUPPLY   — Amount to mint (e.g. "1000000000")
 */

import {
  Keypair,
  Horizon,
  TransactionBuilder,
  Operation,
  Asset,
  Networks,
} from "@stellar/stellar-sdk";

// ── Configuration ───────────────────────────────────────────────────────────

const PI_TESTNET_HORIZON = "https://api.testnet.minepi.com";
const PI_TESTNET_PASSPHRASE = "Pi Testnet";

// Triumph Synergy utility tokens — all 10 defined in the ecosystem
const TOKENS = [
  { code: "SYN", name: "Synergy Token", supply: "1000000000", piPeg: "100:1" },
  { code: "TRI", name: "Triumph Token", supply: "100000000", piPeg: "10:1" },
  { code: "LRN", name: "Learn Token", supply: "500000000", piPeg: "50:1" },
  { code: "PLY", name: "Play Token", supply: "2000000000", piPeg: "200:1" },
  { code: "WCH", name: "Watch Token", supply: "5000000000", piPeg: "500:1" },
  { code: "WRK", name: "Work Token", supply: "250000000", piPeg: "25:1" },
  { code: "TCH", name: "Teach Token", supply: "200000000", piPeg: "20:1" },
  { code: "CRT", name: "Create Token", supply: "300000000", piPeg: "30:1" },
  { code: "SOC", name: "Social Token", supply: "1000000000", piPeg: "100:1" },
  { code: "LOY", name: "Loyalty Token", supply: "500000000", piPeg: "50:1" },
] as const;

// Default: issue SYN (Synergy Token) — the flagship utility token
const DEFAULT_TOKEN_INDEX = 0;

// ── Helpers ─────────────────────────────────────────────────────────────────

function getEnvOrPrompt(key: string, fallback?: string): string {
  const val = process.env[key];
  if (val) return val;
  if (fallback) return fallback;
  console.error(`Missing env var: ${key}`);
  process.exit(1);
}

async function accountExists(
  server: Horizon.Server,
  publicKey: string
): Promise<boolean> {
  try {
    await server.loadAccount(publicKey);
    return true;
  } catch {
    return false;
  }
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  Triumph Synergy — Pi Testnet Token Issuance");
  console.log("═══════════════════════════════════════════════════════════\n");

  // 1. Source account (funded on Pi Testnet)
  const sourceSecret = getEnvOrPrompt("SOURCE_SECRET");
  const sourceKeypair = Keypair.fromSecret(sourceSecret);
  console.log(`Source account: ${sourceKeypair.publicKey()}`);

  // 2. Pick token
  const tokenIdx = Number(process.env.TOKEN_INDEX ?? DEFAULT_TOKEN_INDEX);
  const token = TOKENS[tokenIdx];
  if (!token) {
    console.error(`Invalid TOKEN_INDEX=${tokenIdx}. Valid: 0-${TOKENS.length - 1}`);
    TOKENS.forEach((t, i) => console.log(`  ${i}: ${t.code} — ${t.name}`));
    process.exit(1);
  }
  const mintAmount = process.env.TOKEN_SUPPLY || token.supply;

  console.log(`\nToken: ${token.code} (${token.name})`);
  console.log(`Supply to mint: ${mintAmount}`);
  console.log(`Pi peg ratio: ${token.piPeg}`);
  console.log(`Network: Pi Testnet`);
  console.log(`Horizon: ${PI_TESTNET_HORIZON}\n`);

  // 3. Connect to Pi Testnet Horizon
  const server = new Horizon.Server(PI_TESTNET_HORIZON);

  // Verify source is funded
  const sourceExists = await accountExists(server, sourceKeypair.publicKey());
  if (!sourceExists) {
    console.error("ERROR: Source account is NOT funded on Pi Testnet.");
    console.error("Fund it through Pi Browser (sandbox mode) first.");
    console.error(`Account: ${sourceKeypair.publicKey()}`);
    process.exit(1);
  }
  console.log("✓ Source account verified (funded on Pi Testnet)\n");

  // 4. Generate issuer and distribution keypairs
  const issuerKeypair = Keypair.random();
  const distKeypair = Keypair.random();

  console.log("Generated keypairs:");
  console.log(`  Issuer:       ${issuerKeypair.publicKey()}`);
  console.log(`  Distribution: ${distKeypair.publicKey()}\n`);

  // 5. Create the asset object
  const asset = new Asset(token.code, issuerKeypair.publicKey());
  console.log(`Asset: ${token.code}:${issuerKeypair.publicKey()}\n`);

  // 6. STEP 1: Create both accounts from source
  console.log("Step 1/4: Creating issuer + distribution accounts...");
  const sourceAccount = await server.loadAccount(sourceKeypair.publicKey());
  const baseFee = (await server.fetchBaseFee()).toString();

  const createTx = new TransactionBuilder(sourceAccount, {
    fee: baseFee,
    networkPassphrase: PI_TESTNET_PASSPHRASE,
  })
    .addOperation(
      Operation.createAccount({
        destination: issuerKeypair.publicKey(),
        startingBalance: "3", // 2 base + buffer for operations
      })
    )
    .addOperation(
      Operation.createAccount({
        destination: distKeypair.publicKey(),
        startingBalance: "3", // 2 base + 1 for trustline reserve
      })
    )
    .setTimeout(180)
    .build();

  createTx.sign(sourceKeypair);
  const createResult = await server.submitTransaction(createTx);
  console.log(`  ✓ Accounts created (ledger: ${(createResult as Horizon.HorizonApi.SubmitTransactionResponse).ledger})\n`);

  // 7. STEP 2: Distribution account establishes trustline to issuer
  console.log("Step 2/4: Establishing trustline on distribution account...");
  const distAccount = await server.loadAccount(distKeypair.publicKey());

  const trustTx = new TransactionBuilder(distAccount, {
    fee: baseFee,
    networkPassphrase: PI_TESTNET_PASSPHRASE,
  })
    .addOperation(
      Operation.changeTrust({
        asset,
        // No limit = max trust
      })
    )
    .setTimeout(180)
    .build();

  trustTx.sign(distKeypair);
  const trustResult = await server.submitTransaction(trustTx);
  console.log(`  ✓ Trustline established (ledger: ${(trustResult as Horizon.HorizonApi.SubmitTransactionResponse).ledger})\n`);

  // 8. STEP 3: Issuer mints tokens by sending payment to distribution
  console.log(`Step 3/4: Minting ${mintAmount} ${token.code}...`);
  const issuerAccount = await server.loadAccount(issuerKeypair.publicKey());

  const mintTx = new TransactionBuilder(issuerAccount, {
    fee: baseFee,
    networkPassphrase: PI_TESTNET_PASSPHRASE,
  })
    .addOperation(
      Operation.payment({
        destination: distKeypair.publicKey(),
        asset,
        amount: mintAmount,
      })
    )
    .setTimeout(180)
    .build();

  mintTx.sign(issuerKeypair);
  const mintResult = await server.submitTransaction(mintTx);
  console.log(`  ✓ ${mintAmount} ${token.code} minted (ledger: ${(mintResult as Horizon.HorizonApi.SubmitTransactionResponse).ledger})\n`);

  // 9. STEP 4: Create DEX sell offer (SYN/Pi trading pair)
  console.log(`Step 4/4: Creating DEX sell offer (${token.code}/Pi)...`);
  const distAccountRefreshed = await server.loadAccount(distKeypair.publicKey());

  // Offer: sell 10% of supply at the defined peg ratio
  const piPegNum = Number.parseInt(token.piPeg.split(":")[0]);
  const initialListing = Math.floor(Number(mintAmount) * 0.1).toString();
  const pricePerToken = (1 / piPegNum).toFixed(7); // price in Pi per token

  const offerTx = new TransactionBuilder(distAccountRefreshed, {
    fee: baseFee,
    networkPassphrase: PI_TESTNET_PASSPHRASE,
  })
    .addOperation(
      Operation.manageSellOffer({
        selling: asset,
        buying: Asset.native(), // Pi (native asset)
        amount: initialListing,
        price: pricePerToken, // Pi per token
      })
    )
    .setTimeout(180)
    .build();

  offerTx.sign(distKeypair);
  const offerResult = await server.submitTransaction(offerTx);
  console.log(`  ✓ DEX offer created: ${initialListing} ${token.code} at ${pricePerToken} Pi each`);
  console.log(`    (ledger: ${(offerResult as Horizon.HorizonApi.SubmitTransactionResponse).ledger})\n`);

  // 10. Summary
  console.log("═══════════════════════════════════════════════════════════");
  console.log("  TOKEN ISSUANCE COMPLETE");
  console.log("═══════════════════════════════════════════════════════════");
  console.log(`  Token:        ${token.code} (${token.name})`);
  console.log(`  Asset Code:   ${token.code}`);
  console.log(`  Issuer:       ${issuerKeypair.publicKey()}`);
  console.log(`  Distribution: ${distKeypair.publicKey()}`);
  console.log(`  Total Supply: ${mintAmount}`);
  console.log(`  DEX Listing:  ${initialListing} ${token.code} @ ${pricePerToken} Pi`);
  console.log(`  Pi Peg:       ${token.piPeg}`);
  console.log(`  Network:      Pi Testnet`);
  console.log(`  Horizon:      ${PI_TESTNET_HORIZON}`);
  console.log("");
  console.log("  IMPORTANT — Save these keys securely:");
  console.log(`  Issuer Secret:       ${issuerKeypair.secret()}`);
  console.log(`  Distribution Secret: ${distKeypair.secret()}`);
  console.log("");
  console.log("  View on Pi Testnet:");
  console.log(`  ${PI_TESTNET_HORIZON}/assets?asset_code=${token.code}&asset_issuer=${issuerKeypair.publicKey()}`);
  console.log("═══════════════════════════════════════════════════════════");
}

main().catch((err) => {
  console.error("\nFatal error:", err.response?.data?.extras?.result_codes || err.message || err);
  process.exit(1);
});

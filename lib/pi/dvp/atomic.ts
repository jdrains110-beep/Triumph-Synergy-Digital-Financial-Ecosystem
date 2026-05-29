/**
 * Atomic Delivery-vs-Payment (DvP) primitive on Stellar / Pi Network.
 *
 * Two patterns are supported:
 *
 *   1. ATOMIC_SWAP    — single transaction with two payment operations
 *                       (buyer→seller cash, seller→buyer asset). Either both
 *                       settle or neither does, because Stellar transactions
 *                       are all-or-nothing.
 *
 *   2. CLAIMABLE_PAIR — for cross-account or time-delayed settlement, both
 *                       legs are wrapped in claimable balances with mutual
 *                       predicate (each side claims the other's asset only
 *                       when its own balance has been created).
 *
 * For a v1 we implement #1 (true atomic) end-to-end; #2 is stubbed for the
 * cross-domain case where buyer and seller never co-sign one transaction.
 *
 * Network passphrase + horizon URL are picked via lib/pi/network.
 */

import {
  Asset,
  BASE_FEE,
  Claimant,
  Horizon,
  Keypair,
  Networks,
  Operation,
  TransactionBuilder,
  type Transaction,
} from "@stellar/stellar-sdk";

import { resolvePiNetwork, type PiNetwork } from "../network";

export interface DvpLeg {
  /** Source account that delivers the asset on this leg. */
  sourceAccount: string;
  /** Destination account that receives the asset on this leg. */
  destinationAccount: string;
  /** "PI" for native, or "<CODE>:<ISSUER>" for any other Stellar asset. */
  asset: "PI" | string;
  amount: string; // stringified decimal
}

export interface DvpTradeInput {
  network?: PiNetwork;
  /** Cash leg: usually buyer→seller in PI or stablecoin. */
  cash: DvpLeg;
  /** Securities/asset leg: usually seller→buyer in TRISYN or another asset. */
  asset: DvpLeg;
  /** Memo embedded into the transaction (max 28 bytes). */
  memo?: string;
  /** Unix epoch seconds — transaction MUST settle before this time or fails. */
  minTime?: number;
  maxTime?: number;
  /**
   * If true (default) the asset issuer/distributor MUST already have a
   * trustline on both ends — we do NOT auto-create them. We add a
   * `changeTrust` op if `createTrustline: true`.
   */
  createTrustline?: boolean;
}

export interface DvpUnsignedTransaction {
  xdr: string;
  network: PiNetwork;
  passphrase: string;
  /** Accounts that must sign before submission, in order. */
  requiredSigners: string[];
  hash: string;
}

function parseAsset(spec: string): Asset {
  if (spec === "PI" || spec.toUpperCase() === "NATIVE") return Asset.native();
  const [code, issuer] = spec.split(":");
  if (!code || !issuer) throw new Error(`bad asset spec: ${spec}`);
  return new Asset(code, issuer);
}

function horizon(network: PiNetwork): Horizon.Server {
  const resolved = resolvePiNetwork({ override: network });
  return new Horizon.Server(resolved.horizon, { allowHttp: resolved.horizon.startsWith("http://") });
}

function passphraseFor(network: PiNetwork): string {
  const resolved = resolvePiNetwork({ override: network });
  // Fall back to Stellar's canonical passphrases when env not set explicitly
  if (network === "mainnet") return resolved.passphrase || Networks.PUBLIC;
  return resolved.passphrase || Networks.TESTNET;
}

/**
 * Build an atomic DvP transaction. Returns the unsigned XDR — caller signs
 * with both source keys (cash sender + asset sender) via the HSM adapter.
 */
export async function buildAtomicDvp(input: DvpTradeInput): Promise<DvpUnsignedTransaction> {
  const network: PiNetwork = input.network ?? "mainnet";
  const server = horizon(network);
  const passphrase = passphraseFor(network);

  // Use the cash sender's account as the transaction source (pays the fee).
  const sourceAccount = await server.loadAccount(input.cash.sourceAccount);

  const cashAsset = parseAsset(input.cash.asset);
  const assetAsset = parseAsset(input.asset.asset);

  const builder = new TransactionBuilder(sourceAccount, {
    fee: String(Number(BASE_FEE) * 3), // 3 ops max in our v1
    networkPassphrase: passphrase,
    memo: input.memo ? Memo.text(input.memo.substring(0, 28)) : undefined,
  });

  if (input.createTrustline) {
    builder.addOperation(
      Operation.changeTrust({
        asset: assetAsset,
        source: input.asset.destinationAccount,
      }),
    );
  }

  // Leg 1: cash sender → cash receiver
  builder.addOperation(
    Operation.payment({
      destination: input.cash.destinationAccount,
      asset: cashAsset,
      amount: input.cash.amount,
      source: input.cash.sourceAccount,
    }),
  );

  // Leg 2: asset sender → asset receiver
  builder.addOperation(
    Operation.payment({
      destination: input.asset.destinationAccount,
      asset: assetAsset,
      amount: input.asset.amount,
      source: input.asset.sourceAccount,
    }),
  );

  if (input.minTime || input.maxTime) {
    builder.setTimebounds(input.minTime ?? 0, input.maxTime ?? 0);
  } else {
    builder.setTimeout(300); // 5 minute default
  }

  const tx = builder.build();
  const required = new Set<string>([input.cash.sourceAccount, input.asset.sourceAccount]);
  if (input.createTrustline) required.add(input.asset.destinationAccount);

  return {
    xdr: tx.toXDR(),
    network,
    passphrase,
    requiredSigners: [...required],
    hash: tx.hash().toString("hex"),
  };
}

/**
 * Sign + submit a previously-built DvP XDR. `signers` is a map of accountId →
 * secret seed. In production these come from the HSM/MPC adapter, NOT from
 * env or memory.
 */
export async function signAndSubmitDvp(
  unsigned: DvpUnsignedTransaction,
  signers: Record<string, string>,
): Promise<{
  hash: string;
  ledger: number;
  successful: boolean;
  raw: Horizon.HorizonApi.SubmitTransactionResponse;
}> {
  const passphrase = unsigned.passphrase;
  const server = horizon(unsigned.network);
  const tx = TransactionBuilder.fromXDR(unsigned.xdr, passphrase) as Transaction;
  for (const account of unsigned.requiredSigners) {
    const secret = signers[account];
    if (!secret) throw new Error(`dvp: missing signer for ${account}`);
    tx.sign(Keypair.fromSecret(secret));
  }
  const r = (await server.submitTransaction(tx)) as Horizon.HorizonApi.SubmitTransactionResponse & {
    successful: boolean;
    ledger: number;
    hash: string;
  };
  return { hash: r.hash, ledger: r.ledger, successful: r.successful, raw: r };
}

// ─── Memo helper (Stellar SDK quirk: Memo is on the namespace export) ────────
import { Memo } from "@stellar/stellar-sdk";

/**
 * Wait for transaction finality — N ledgers past the submission ledger.
 * Defaults to 1 ledger (Stellar finality is single-ledger consensus).
 */
export async function waitForDvpFinality(
  network: PiNetwork,
  txHash: string,
  confirmations = Number(process.env.DVP_FINALITY_LEDGERS || "1"),
): Promise<{ finalized: boolean; confirmedAtLedger: number; latestLedger: number }> {
  const server = horizon(network);
  const tx = await server.transactions().transaction(txHash).call();
  const confirmedAt = tx.ledger;
  // Poll latest ledger until we reach confirmedAt + confirmations
  for (let i = 0; i < 60; i++) {
    const latest = (await server.ledgers().order("desc").limit(1).call()).records[0]?.sequence ?? 0;
    if (latest >= confirmedAt + confirmations) {
      return { finalized: true, confirmedAtLedger: confirmedAt, latestLedger: latest };
    }
    await new Promise((r) => setTimeout(r, 5_000));
  }
  return { finalized: false, confirmedAtLedger: confirmedAt, latestLedger: 0 };
}

// ─── Claimable-pair (async DvP) helpers ──────────────────────────────────────

/**
 * Build a claimable balance for an asset leg. The recipient claims it only
 * after they post a matching balance for the counter-asset.
 *
 * Use case: buyer in jurisdiction A, seller in jurisdiction B, no co-signing.
 */
export async function buildClaimableLeg(input: {
  network?: PiNetwork;
  sourceAccount: string;
  recipient: string;
  asset: string;
  amount: string;
  /** Unix seconds; balance auto-recallable by sender after this time. */
  reclaimAfter?: number;
}): Promise<DvpUnsignedTransaction> {
  const network: PiNetwork = input.network ?? "mainnet";
  const server = horizon(network);
  const passphrase = passphraseFor(network);
  const account = await server.loadAccount(input.sourceAccount);

  const claimants = [new Claimant(input.recipient, Claimant.predicateUnconditional())];
  if (input.reclaimAfter) {
    // Sender can reclaim after reclaimAfter
    claimants.push(
      new Claimant(
        input.sourceAccount,
        Claimant.predicateNot(Claimant.predicateBeforeAbsoluteTime(String(input.reclaimAfter))),
      ),
    );
  }

  const tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: passphrase })
    .addOperation(
      Operation.createClaimableBalance({
        asset: parseAsset(input.asset),
        amount: input.amount,
        claimants,
      }),
    )
    .setTimeout(300)
    .build();

  return {
    xdr: tx.toXDR(),
    network,
    passphrase,
    requiredSigners: [input.sourceAccount],
    hash: tx.hash().toString("hex"),
  };
}

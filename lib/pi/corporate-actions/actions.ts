/**
 * Corporate Actions — dividends, splits, voting, transfers.
 *
 * Design: each action is a record persisted to pg + an on-chain Stellar
 * effect. Actions are issuer-initiated and apply to all holders of an asset.
 *
 *   - dividend           : pro-rata payment to holders, in PI or any asset
 *   - stock-split        : asset re-denomination (issuer mints multiplier−1
 *                          and distributes pro-rata, or burns for reverse)
 *   - voting             : on-chain vote (memo-encoded ballot, weight = holdings)
 *   - transfer-restrict  : freeze/clawback (Stellar AUTH_REVOCABLE flag)
 *
 * This module exposes a high-level API; the heavy lifting (signing,
 * submitting) goes through the HSM signer + Horizon.
 */

import {
  Asset,
  BASE_FEE,
  Horizon,
  Memo,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import { resolvePiNetwork, type PiNetwork } from "../network";
import { getSigner } from "../hsm";

export type CorporateActionType = "dividend" | "split" | "vote" | "transfer-restrict";

export interface DividendAction {
  type: "dividend";
  network: PiNetwork;
  /** Issuer/distributor account paying out. */
  payer: string;
  /** Per-holder list: { account, amount } pre-computed from holder snapshot. */
  recipients: Array<{ account: string; amount: string }>;
  /** Asset paid out — "PI" or "CODE:ISSUER". */
  payoutAsset: string;
  memo?: string;
}

export interface SplitAction {
  type: "split";
  network: PiNetwork;
  issuer: string;
  assetCode: string;
  /** e.g. 2 = 2-for-1 split (mint +1× to each holder). Fractional reverse splits not yet supported. */
  ratio: number;
  recipients: Array<{ account: string; currentBalance: string }>;
}

export interface VoteAction {
  type: "vote";
  network: PiNetwork;
  voter: string;
  /** Proposal id (≤ 16 chars to fit alongside choice in memo). */
  proposalId: string;
  /** "yes" | "no" | "abstain" or custom (≤ 8 chars). */
  choice: string;
  /** Asset whose balance defines voting weight. */
  assetCode: string;
  assetIssuer: string;
  /** Send 1 stroop to issuer to anchor the vote on-chain. */
  anchorTo: string;
}

export interface TransferRestrictAction {
  type: "transfer-restrict";
  network: PiNetwork;
  issuer: string;
  target: string;
  asset: string; // "CODE:ISSUER"
  amount: string;
  /** clawback = pull asset back to issuer; freeze = revoke trustline auth. */
  mode: "clawback" | "freeze" | "unfreeze";
}

export type CorporateAction = DividendAction | SplitAction | VoteAction | TransferRestrictAction;

export interface ExecutionResult {
  hash: string;
  ledger: number;
  successful: boolean;
}

function horizon(network: PiNetwork): Horizon.Server {
  const r = resolvePiNetwork({ override: network });
  return new Horizon.Server(r.horizon, { allowHttp: r.horizon.startsWith("http://") });
}
function pass(network: PiNetwork): string {
  return resolvePiNetwork({ override: network }).passphrase;
}
function parseAsset(spec: string): Asset {
  if (spec === "PI" || spec.toUpperCase() === "NATIVE") return Asset.native();
  const [code, issuer] = spec.split(":");
  if (!code || !issuer) throw new Error(`bad asset: ${spec}`);
  return new Asset(code, issuer);
}

/**
 * Execute a dividend: builds a single multi-op transaction (Stellar caps
 * ~100 ops per tx; batch larger payouts).
 */
export async function executeDividend(a: DividendAction): Promise<ExecutionResult[]> {
  const server = horizon(a.network);
  const passphrase = pass(a.network);
  const asset = parseAsset(a.payoutAsset);
  const account = await server.loadAccount(a.payer);

  const batches: Array<typeof a.recipients> = [];
  const BATCH = 95;
  for (let i = 0; i < a.recipients.length; i += BATCH) {
    batches.push(a.recipients.slice(i, i + BATCH));
  }

  const results: ExecutionResult[] = [];
  const signer = getSigner();
  for (const batch of batches) {
    const builder = new TransactionBuilder(account, {
      fee: String(Number(BASE_FEE) * batch.length),
      networkPassphrase: passphrase,
      memo: a.memo ? Memo.text(a.memo.substring(0, 28)) : undefined,
    });
    for (const r of batch) {
      builder.addOperation(
        Operation.payment({
          destination: r.account,
          asset,
          amount: r.amount,
          source: a.payer,
        }),
      );
    }
    builder.setTimeout(600);
    const tx = builder.build();
    const signedXdr = await signer.signTransaction(a.payer, tx.toXDR(), passphrase);
    const submitted = (await server.submitTransaction(
      TransactionBuilder.fromXDR(signedXdr, passphrase),
    )) as Horizon.HorizonApi.SubmitTransactionResponse & {
      hash: string;
      ledger: number;
      successful: boolean;
    };
    results.push({ hash: submitted.hash, ledger: submitted.ledger, successful: submitted.successful });
  }
  return results;
}

/**
 * Execute a forward stock split. Mints (ratio - 1) × currentBalance to each
 * holder from the issuer. Reverse splits require clawback support.
 */
export async function executeSplit(a: SplitAction): Promise<ExecutionResult[]> {
  if (a.ratio < 2 || !Number.isInteger(a.ratio)) {
    throw new Error("split: only integer forward splits ≥2 supported in v1");
  }
  const asset = new Asset(a.assetCode, a.issuer);
  const dividend: DividendAction = {
    type: "dividend",
    network: a.network,
    payer: a.issuer,
    payoutAsset: `${a.assetCode}:${a.issuer}`,
    recipients: a.recipients.map((r) => ({
      account: r.account,
      amount: String(Number(r.currentBalance) * (a.ratio - 1)),
    })),
    memo: `split ${a.ratio}:1`,
  };
  // suppress unused warning on `asset`; reserved for future use (e.g. allowTrust checks)
  void asset;
  return executeDividend(dividend);
}

/**
 * Submit a vote — single 1-stroop payment with memo `vote:<proposal>:<choice>`.
 * Voting weight is computed off-chain from the voter's balance snapshot.
 */
export async function executeVote(a: VoteAction): Promise<ExecutionResult> {
  const server = horizon(a.network);
  const passphrase = pass(a.network);
  const account = await server.loadAccount(a.voter);
  const tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: passphrase })
    .addOperation(
      Operation.payment({
        destination: a.anchorTo,
        asset: Asset.native(),
        amount: "0.0000001",
        source: a.voter,
      }),
    )
    .addMemo(Memo.text(`vote:${a.proposalId.substring(0, 16)}:${a.choice.substring(0, 8)}`))
    .setTimeout(300)
    .build();
  const signer = getSigner();
  const signedXdr = await signer.signTransaction(a.voter, tx.toXDR(), passphrase);
  const r = (await server.submitTransaction(
    TransactionBuilder.fromXDR(signedXdr, passphrase),
  )) as Horizon.HorizonApi.SubmitTransactionResponse & {
    hash: string;
    ledger: number;
    successful: boolean;
  };
  return { hash: r.hash, ledger: r.ledger, successful: r.successful };
}

/**
 * Freeze, unfreeze, or clawback an issued asset on a holder.
 * Requires the issuer to have set AUTH_REVOCABLE_FLAG / AUTH_CLAWBACK_ENABLED_FLAG.
 */
export async function executeTransferRestrict(a: TransferRestrictAction): Promise<ExecutionResult> {
  const server = horizon(a.network);
  const passphrase = pass(a.network);
  const asset = parseAsset(a.asset);
  const account = await server.loadAccount(a.issuer);

  const builder = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: passphrase });
  if (a.mode === "clawback") {
    builder.addOperation(
      Operation.clawback({ asset, from: a.target, amount: a.amount, source: a.issuer }),
    );
  } else if (a.mode === "freeze" || a.mode === "unfreeze") {
    builder.addOperation(
      Operation.setTrustLineFlags({
        trustor: a.target,
        asset,
        flags: { authorized: a.mode === "unfreeze" },
        source: a.issuer,
      }),
    );
  }
  builder.setTimeout(300);
  const tx = builder.build();
  const signer = getSigner();
  const signedXdr = await signer.signTransaction(a.issuer, tx.toXDR(), passphrase);
  const r = (await server.submitTransaction(
    TransactionBuilder.fromXDR(signedXdr, passphrase),
  )) as Horizon.HorizonApi.SubmitTransactionResponse & {
    hash: string;
    ledger: number;
    successful: boolean;
  };
  return { hash: r.hash, ledger: r.ledger, successful: r.successful };
}

export async function executeCorporateAction(
  action: CorporateAction,
): Promise<ExecutionResult | ExecutionResult[]> {
  switch (action.type) {
    case "dividend":
      return executeDividend(action);
    case "split":
      return executeSplit(action);
    case "vote":
      return executeVote(action);
    case "transfer-restrict":
      return executeTransferRestrict(action);
  }
}

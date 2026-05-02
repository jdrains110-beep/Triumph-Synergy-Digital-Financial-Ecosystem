/**
 * Stellar/Pi Broadcaster
 * ─────────────────────────────────────────────────────────────────────────────
 * Anchors a token (deed / domain / sovereign-estate) on the Pi blockchain by
 * submitting a real `manageData` transaction to Pi's Horizon API (which is a
 * Stellar fork — same SDK, different passphrase + URL).
 *
 * Behavior:
 *   1. If STELLAR_SECRET_KEY is set AND STELLAR_BROADCAST_ENABLED=true ⇒
 *      build → sign → submit a real transaction. Returns the real network
 *      tx hash + ledger sequence.
 *   2. Otherwise (or on broadcast failure) ⇒ deterministic SHA-256 placeholder
 *      so internal sovereign mints still complete. The receipt clearly marks
 *      `broadcasted: false` so callers can distinguish.
 *
 * Network selection:
 *   STELLAR_NETWORK_PASSPHRASE  → "Pi Network" (mainnet) or "Pi Testnet"
 *   STELLAR_HORIZON_URL         → https://api.mainnet.minepi.com  (mainnet)
 *                              or https://api.testnet.minepi.com  (testnet)
 *
 * SECURITY:
 *   STELLAR_SECRET_KEY is the wallet's S-key. Inject via Docker secret or
 *   Vault. NEVER commit. The engine reads it once at process start and never
 *   logs or echoes it back in any response.
 */

import { createHash } from "node:crypto";
import {
  Horizon,
  Keypair,
  Networks,
  TransactionBuilder,
  Operation,
  Memo,
  BASE_FEE,
} from "@stellar/stellar-sdk";

export type AnchorKind = "deed" | "domain" | "sovereign-estate";

export interface AnchorRequest {
  kind: AnchorKind;
  tokenId: string;
  /** 64-char SHA-256 hex of the canonical claim (property/domain/etc.) */
  claimHash: string;
  /** Optional human label for the data-entry name (defaults to kind:tokenId[:10]) */
  label?: string;
}

export interface AnchorResult {
  txHash: string;
  ledger: number;
  fee: string;
  broadcasted: boolean;
  explorerUrl: string | null;
  network: "mainnet" | "testnet" | "unknown";
  /** present only when broadcasted=false because of an error */
  error?: string;
}

const HORIZON_URL =
  process.env.STELLAR_HORIZON_URL ?? "https://api.mainnet.minepi.com";
const NETWORK_PASSPHRASE =
  process.env.STELLAR_NETWORK_PASSPHRASE ?? "Pi Network";
const SECRET_KEY = process.env.STELLAR_SECRET_KEY ?? "";
const BROADCAST_ENABLED =
  (process.env.STELLAR_BROADCAST_ENABLED ?? "false").toLowerCase() === "true";
const TX_TIMEOUT_SEC = parseInt(process.env.STELLAR_TX_TIMEOUT_SEC ?? "180", 10);
// Pi Network requires a higher base fee than vanilla Stellar (100000 stroops vs 100).
// Allow override via env, otherwise use 100000 which matches Pi mainnet+testnet base fee.
const PI_BASE_FEE = process.env.STELLAR_BASE_FEE ?? "100000";

const NETWORK_TAG: "mainnet" | "testnet" | "unknown" =
  /testnet/i.test(NETWORK_PASSPHRASE) || /testnet/i.test(HORIZON_URL)
    ? "testnet"
    : /mainnet|^Pi Network$/i.test(NETWORK_PASSPHRASE) ||
      /mainnet/i.test(HORIZON_URL)
    ? "mainnet"
    : "unknown";

const EXPLORER_BASE =
  NETWORK_TAG === "testnet"
    ? "https://blockexplorer.minepi.com/testnet/tx"
    : NETWORK_TAG === "mainnet"
    ? "https://blockexplorer.minepi.com/mainnet/tx"
    : null;

let _server: Horizon.Server | null = null;
let _keypair: Keypair | null = null;
let _initError: string | null = null;

function lazyInit(): boolean {
  if (!BROADCAST_ENABLED || !SECRET_KEY) return false;
  if (_initError) return false;
  if (_server && _keypair) return true;
  try {
    _server = new Horizon.Server(HORIZON_URL, { allowHttp: false });
    _keypair = Keypair.fromSecret(SECRET_KEY);
    return true;
  } catch (e) {
    _initError = (e as Error).message;
    console.error("[stellar-broadcaster] init failed:", _initError);
    return false;
  }
}

function sha256(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

function placeholder(req: AnchorRequest, ledger: number, reason?: string): AnchorResult {
  return {
    txHash: sha256(`stellar:${req.kind}:${req.tokenId}:${ledger}`),
    ledger,
    fee: PI_BASE_FEE,
    broadcasted: false,
    explorerUrl: null,
    network: NETWORK_TAG,
    ...(reason ? { error: reason } : {}),
  };
}

export function broadcasterStatus(): {
  enabled: boolean;
  configured: boolean;
  network: typeof NETWORK_TAG;
  passphrase: string;
  horizon: string;
  publicKey: string | null;
  initError: string | null;
} {
  const ready = lazyInit();
  return {
    enabled: BROADCAST_ENABLED,
    configured: !!SECRET_KEY,
    network: NETWORK_TAG,
    passphrase: NETWORK_PASSPHRASE,
    horizon: HORIZON_URL,
    publicKey: ready ? _keypair!.publicKey() : null,
    initError: _initError,
  };
}

/**
 * Anchor a token claim on the Pi/Stellar network.
 * Always resolves — broadcast failures degrade to a deterministic placeholder
 * so the mint pipeline never crashes.
 */
export async function broadcastAnchor(
  req: AnchorRequest,
  fallbackLedger: number,
): Promise<AnchorResult> {
  if (!lazyInit()) {
    return placeholder(req, fallbackLedger);
  }
  const server = _server!;
  const kp = _keypair!;

  try {
    const account = await server.loadAccount(kp.publicKey());

    // manageData entry: name ≤ 64 bytes, value ≤ 64 bytes raw
    const dataName = (req.label ?? `${req.kind}:${req.tokenId}`).slice(0, 64);
    // claimHash is 64 hex chars = 32 raw bytes — well within the 64-byte limit
    const dataValue = Buffer.from(req.claimHash.slice(0, 64), "hex");

    const tx = new TransactionBuilder(account, {
      fee: PI_BASE_FEE,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(
        Operation.manageData({
          name: dataName,
          value: dataValue,
        }),
      )
      .addMemo(Memo.hash(Buffer.from(req.claimHash.slice(0, 64), "hex")))
      .setTimeout(TX_TIMEOUT_SEC)
      .build();

    tx.sign(kp);
    const result = await server.submitTransaction(tx);
    const txHash =
      (result as unknown as { hash?: string }).hash ?? sha256(tx.toXDR());
    const ledger =
      (result as unknown as { ledger?: number }).ledger ?? fallbackLedger;

    return {
      txHash,
      ledger,
      fee: PI_BASE_FEE,
      broadcasted: true,
      explorerUrl: EXPLORER_BASE ? `${EXPLORER_BASE}/${txHash}` : null,
      network: NETWORK_TAG,
    };
  } catch (e) {
    const err = e as {
      message?: string;
      response?: {
        data?: {
          extras?: {
            result_codes?: unknown;
            result_xdr?: string;
            envelope_xdr?: string;
          };
          title?: string;
          detail?: string;
        };
        status?: number;
      };
    };
    const horizonExtras = err?.response?.data?.extras;
    const horizonTitle = err?.response?.data?.title;
    const horizonDetail = err?.response?.data?.detail;
    const codes = horizonExtras?.result_codes
      ? JSON.stringify(horizonExtras.result_codes)
      : "";
    const msg = [
      err?.message ?? String(e),
      horizonTitle,
      horizonDetail,
      codes,
    ]
      .filter(Boolean)
      .join(" | ");
    console.error(
      `[stellar-broadcaster] submit failed (${req.kind}:${req.tokenId}):`,
      msg,
      horizonExtras ?? "",
    );
    return placeholder(req, fallbackLedger, msg);
  }
}

// Re-export for engine startup logging
export const STELLAR_NETWORK = NETWORK_TAG;
export const STELLAR_NETWORK_PASSPHRASE = NETWORK_PASSPHRASE;
export const STELLAR_HORIZON_URL = HORIZON_URL;
// Networks enum re-exported for completeness (tests / future expansion)
export { Networks };

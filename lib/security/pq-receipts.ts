/**
 * Post-Quantum Signed Receipts — sovereign apex layer.
 *
 * Every successful Pi payment (and other irreversible state mutation) is
 * signed with ML-DSA-65 (NIST FIPS 204, formerly Dilithium3). Signatures are
 * verifiable by anyone holding the public key, are quantum-resistant, and
 * protect the user even if RSA/ECDSA are broken in 5–15 years.
 *
 * Key material:
 *   - Seed source: process.env.PQ_RECEIPT_SEED (64-hex, 32 bytes) — REQUIRED
 *     in production. In dev, an ephemeral seed is generated and warned about.
 *   - Public key is exposed at /api/security/pq-pubkey for client verification.
 *
 * Receipt envelope (canonical JSON, sorted keys):
 *   { v: 1, alg: "ML-DSA-65", payload: {...}, ts: <iso>, prev: <hex|null> }
 *
 * The `prev` field links into the audit hash chain (see ./audit-chain.ts),
 * making the receipt + chain jointly tamper-evident.
 */

import { ml_dsa65 } from "@noble/post-quantum/ml-dsa.js";
import { createHash } from "node:crypto";

const RECEIPT_VERSION = 1;
const ALG = "ML-DSA-65";

let cachedKeys: { secretKey: Uint8Array; publicKey: Uint8Array } | null = null;

function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0) throw new Error("invalid hex length");
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function bytesToHex(b: Uint8Array): string {
  let s = "";
  for (let i = 0; i < b.length; i++) s += b[i].toString(16).padStart(2, "0");
  return s;
}

function getKeys(): { secretKey: Uint8Array; publicKey: Uint8Array } {
  if (cachedKeys) return cachedKeys;
  const seedHex = process.env.PQ_RECEIPT_SEED;
  let seed: Uint8Array;
  if (seedHex && /^[0-9a-fA-F]{64}$/.test(seedHex)) {
    seed = hexToBytes(seedHex);
  } else {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "PQ_RECEIPT_SEED env var required in production (64 hex chars / 32 bytes)"
      );
    }
    console.warn(
      "[pq-receipts] PQ_RECEIPT_SEED missing — generating EPHEMERAL dev seed. Receipts will not verify across restarts."
    );
    seed = crypto.getRandomValues(new Uint8Array(32));
  }
  const kp = ml_dsa65.keygen(seed);
  cachedKeys = { secretKey: kp.secretKey, publicKey: kp.publicKey };
  return cachedKeys;
}

/** Canonical JSON serialization with sorted keys. Required for stable signatures. */
export function canonicalJSON(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return "[" + value.map(canonicalJSON).join(",") + "]";
  }
  const keys = Object.keys(value as Record<string, unknown>).sort();
  return (
    "{" +
    keys
      .map(
        (k) =>
          JSON.stringify(k) +
          ":" +
          canonicalJSON((value as Record<string, unknown>)[k])
      )
      .join(",") +
    "}"
  );
}

export interface ReceiptPayload {
  paymentId: string;
  txid?: string | null;
  amount: number;
  memo?: string;
  user?: string;
  prevHash?: string | null;
  [k: string]: unknown;
}

export interface SignedReceipt {
  v: number;
  alg: string;
  ts: string;
  payload: ReceiptPayload;
  hash: string;
  signature: string;
  publicKey: string;
}

/** Sign a receipt with the apex PQ key. */
export function signReceipt(payload: ReceiptPayload): SignedReceipt {
  const { secretKey, publicKey } = getKeys();
  const envelope = {
    v: RECEIPT_VERSION,
    alg: ALG,
    ts: new Date().toISOString(),
    payload,
  };
  const canonical = canonicalJSON(envelope);
  const hash = createHash("sha256").update(canonical).digest();
  const sig = ml_dsa65.sign(secretKey, hash);
  return {
    ...envelope,
    hash: bytesToHex(hash),
    signature: bytesToHex(sig),
    publicKey: bytesToHex(publicKey),
  };
}

/** Verify a signed receipt against the current public key. */
export function verifyReceipt(receipt: SignedReceipt): boolean {
  try {
    const envelope = {
      v: receipt.v,
      alg: receipt.alg,
      ts: receipt.ts,
      payload: receipt.payload,
    };
    const canonical = canonicalJSON(envelope);
    const hash = createHash("sha256").update(canonical).digest();
    if (bytesToHex(hash) !== receipt.hash) return false;
    return ml_dsa65.verify(
      hexToBytes(receipt.publicKey),
      hash,
      hexToBytes(receipt.signature)
    );
  } catch {
    return false;
  }
}

/** Public key as hex — safe to expose. */
export function getPublicKeyHex(): string {
  return bytesToHex(getKeys().publicKey);
}

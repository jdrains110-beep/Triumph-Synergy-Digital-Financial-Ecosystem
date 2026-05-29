/**
 * HSM / MPC Signer adapter — pluggable backends for Stellar signing.
 *
 * Switch via env HSM_PROVIDER:
 *   local       — file-based keyring (dev/test). Reads HSM_LOCAL_KEYS=path/to/keys.json
 *                 OR per-account env HSM_KEY_<G...>=S...
 *   fireblocks  — Fireblocks REST API (MPC). Needs FIREBLOCKS_API_KEY + FIREBLOCKS_PRIVATE_KEY_PEM
 *   cloudhsm    — AWS CloudHSM PKCS#11 stub (throws unless configured)
 *   yubihsm     — YubiHSM2 PKCS#11 stub (throws unless configured)
 *
 * Public API:
 *   getSigner().sign(accountId, txBuilder | xdr, networkPassphrase) → signed XDR
 *   getSigner().listAccounts()
 */

import {
  Keypair,
  TransactionBuilder,
  type Transaction,
  type FeeBumpTransaction,
} from "@stellar/stellar-sdk";
import fs from "node:fs";

export interface HsmSigner {
  name: string;
  listAccounts(): Promise<string[]>;
  /** Sign a Stellar transaction XDR for the given account. Returns the signed XDR. */
  signTransaction(
    accountId: string,
    xdr: string,
    networkPassphrase: string,
  ): Promise<string>;
  /** Sign arbitrary bytes (for travel-rule envelopes, etc.). */
  signBytes(accountId: string, data: Buffer): Promise<Buffer>;
}

// ─── Local keyring (dev only) ────────────────────────────────────────────────

function loadLocalKeys(): Map<string, string> {
  const map = new Map<string, string>();
  const path = process.env.HSM_LOCAL_KEYS;
  if (path && fs.existsSync(path)) {
    try {
      const json = JSON.parse(fs.readFileSync(path, "utf8")) as Record<string, string>;
      for (const [k, v] of Object.entries(json)) map.set(k, v);
    } catch (e) {
      console.error("[hsm-local] keys file:", (e as Error).message);
    }
  }
  for (const [k, v] of Object.entries(process.env)) {
    if (k.startsWith("HSM_KEY_") && v) {
      map.set(k.slice("HSM_KEY_".length), v);
    }
  }
  return map;
}

export class LocalKeyringSigner implements HsmSigner {
  name = "local";
  private keys = loadLocalKeys();

  async listAccounts(): Promise<string[]> {
    return [...this.keys.keys()];
  }

  async signTransaction(accountId: string, xdr: string, networkPassphrase: string): Promise<string> {
    const secret = this.keys.get(accountId);
    if (!secret) throw new Error(`hsm-local: no key for ${accountId}`);
    const tx = TransactionBuilder.fromXDR(xdr, networkPassphrase) as Transaction | FeeBumpTransaction;
    tx.sign(Keypair.fromSecret(secret));
    return tx.toXDR();
  }

  async signBytes(accountId: string, data: Buffer): Promise<Buffer> {
    const secret = this.keys.get(accountId);
    if (!secret) throw new Error(`hsm-local: no key for ${accountId}`);
    return Keypair.fromSecret(secret).sign(data);
  }
}

// ─── Fireblocks (MPC) ────────────────────────────────────────────────────────

/**
 * Fireblocks adapter — uses the raw-signing API to obtain ECDSA signatures
 * that we then attach to the Stellar transaction as a decorated signature.
 *
 * NOTE: Fireblocks supports XLM natively (CHAIN: XLM | XLM_TEST). When
 * accountId corresponds to a Fireblocks vault account, we use the "transfer"
 * API; for arbitrary keys we use the "raw signing" API. This adapter uses
 * raw signing for maximum flexibility.
 */
export class FireblocksSigner implements HsmSigner {
  name = "fireblocks";
  private base = process.env.FIREBLOCKS_BASE_URL || "https://api.fireblocks.io";
  private apiKey = process.env.FIREBLOCKS_API_KEY || "";
  private privateKeyPem = (process.env.FIREBLOCKS_PRIVATE_KEY_PEM || "").replace(/\\n/g, "\n");

  configured(): boolean {
    return Boolean(this.apiKey && this.privateKeyPem);
  }

  private async jwt(path: string, body: unknown): Promise<string> {
    if (!this.configured()) throw new Error("Fireblocks not configured");
    // eval('require') bypasses bundler static analysis — these are optional deps
    // only needed when HSM_PROVIDER=fireblocks at runtime.
    let jwtMod: { default: { sign: (p: object, k: string, o: object) => string } } | null = null;
    try {
      jwtMod = (0, eval)("require")("jsonwebtoken");
    } catch {
      jwtMod = null;
    }
    if (!jwtMod) throw new Error("jsonwebtoken not installed");
    const crypto = await import("node:crypto");
    const payload = {
      uri: path,
      nonce: crypto.randomBytes(16).toString("hex"),
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 55,
      sub: this.apiKey,
      bodyHash: crypto
        .createHash("sha256")
        .update(JSON.stringify(body ?? {}))
        .digest("hex"),
    };
    return jwtMod.default.sign(payload, this.privateKeyPem, { algorithm: "RS256" });
  }

  private async call(method: "GET" | "POST", path: string, body?: unknown): Promise<unknown> {
    const token = await this.jwt(path, body);
    const r = await fetch(`${this.base}${path}`, {
      method,
      headers: {
        "X-API-Key": this.apiKey,
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!r.ok) throw new Error(`fireblocks ${path} → ${r.status} ${await r.text()}`);
    return r.json();
  }

  async listAccounts(): Promise<string[]> {
    if (!this.configured()) return [];
    const r = (await this.call("GET", "/v1/vault/accounts_paged?assetId=XLM&limit=50")) as {
      accounts?: Array<{ assets?: Array<{ id: string; address?: string }> }>;
    };
    const out = new Set<string>();
    for (const acc of r.accounts ?? []) {
      for (const a of acc.assets ?? []) {
        if (a.id === "XLM" && a.address) out.add(a.address);
        if (a.id === "XLM_TEST" && a.address) out.add(a.address);
      }
    }
    return [...out];
  }

  async signTransaction(accountId: string, xdr: string, networkPassphrase: string): Promise<string> {
    // Raw-signing approach: compute the tx hash, request a signature, attach.
    const tx = TransactionBuilder.fromXDR(xdr, networkPassphrase) as Transaction | FeeBumpTransaction;
    const hash = tx.hash();
    const sig = await this.signBytes(accountId, hash);
    const Keypair = (await import("@stellar/stellar-sdk")).Keypair;
    const kp = Keypair.fromPublicKey(accountId);
    const hint = kp.signatureHint();
    const { xdr: xdrNs } = await import("@stellar/stellar-sdk");
    const decorated = new xdrNs.DecoratedSignature({ hint, signature: sig });
    tx.signatures.push(decorated);
    return tx.toXDR();
  }

  async signBytes(accountId: string, data: Buffer): Promise<Buffer> {
    const r = (await this.call("POST", "/v1/transactions", {
      operation: "RAW",
      assetId: "XLM",
      source: { type: "VAULT_ACCOUNT", id: process.env.FIREBLOCKS_VAULT_ACCOUNT_ID || "0" },
      extraParameters: {
        rawMessageData: { messages: [{ content: data.toString("hex") }] },
      },
      note: `triumph-hsm sign for ${accountId.slice(0, 8)}…`,
    })) as { id: string };
    // Poll completion
    for (let i = 0; i < 30; i++) {
      const status = (await this.call("GET", `/v1/transactions/${r.id}`)) as {
        status: string;
        signedMessages?: Array<{ signature?: { fullSig?: string } }>;
      };
      if (status.status === "COMPLETED") {
        const sig = status.signedMessages?.[0]?.signature?.fullSig;
        if (!sig) throw new Error("fireblocks: missing signature in completed tx");
        return Buffer.from(sig, "hex");
      }
      if (status.status === "FAILED" || status.status === "REJECTED") {
        throw new Error(`fireblocks status=${status.status}`);
      }
      await new Promise((r) => setTimeout(r, 2_000));
    }
    throw new Error("fireblocks: signing timeout");
  }
}

// ─── CloudHSM stub (PKCS#11) ─────────────────────────────────────────────────

export class CloudHsmSigner implements HsmSigner {
  name = "cloudhsm";
  async listAccounts(): Promise<string[]> {
    throw new Error("CloudHSM PKCS#11 adapter not yet wired — install graphene-pk11 and set HSM_PKCS11_LIB");
  }
  async signTransaction(): Promise<string> {
    throw new Error("CloudHSM PKCS#11 adapter not yet wired");
  }
  async signBytes(): Promise<Buffer> {
    throw new Error("CloudHSM PKCS#11 adapter not yet wired");
  }
}

// ─── YubiHSM stub ────────────────────────────────────────────────────────────

export class YubiHsmSigner implements HsmSigner {
  name = "yubihsm";
  async listAccounts(): Promise<string[]> {
    throw new Error("YubiHSM2 adapter not yet wired — install yubihsm-shell and set HSM_YUBIHSM_CONNECTOR");
  }
  async signTransaction(): Promise<string> {
    throw new Error("YubiHSM2 adapter not yet wired");
  }
  async signBytes(): Promise<Buffer> {
    throw new Error("YubiHSM2 adapter not yet wired");
  }
}

// ─── Factory ────────────────────────────────────────────────────────────────

let _signer: HsmSigner | null = null;

export function getSigner(): HsmSigner {
  if (_signer) return _signer;
  const provider = (process.env.HSM_PROVIDER || "local").toLowerCase();
  switch (provider) {
    case "fireblocks":
      _signer = new FireblocksSigner();
      break;
    case "cloudhsm":
      _signer = new CloudHsmSigner();
      break;
    case "yubihsm":
      _signer = new YubiHsmSigner();
      break;
    default:
      _signer = new LocalKeyringSigner();
  }
  return _signer;
}

export function resetSignerForTests(): void {
  _signer = null;
}

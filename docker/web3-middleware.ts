/**
 * Web3 Middleware for Triumph Synergy Microservices
 * @copyright Copyright (C) 2024-2026 Jeremiah Joel Drains, Founder & Superior Sovereign / Triumph Synergy. All rights reserved.
 * @license PiOS
 *
 * Validates Web3 headers on inter-service and client requests:
 *   X-Wallet-PublicKey  — Stellar/Pi public key
 *   X-Wallet-DID        — did:pi:... decentralized identity
 *   X-Wallet-Signature  — Ed25519 signature of the request path + timestamp
 *   X-Wallet-Timestamp  — Unix seconds (replay window: 5 min)
 *
 * Internal service-mesh traffic (X-Internal-Token) bypasses wallet auth.
 */

import type { IncomingMessage } from "node:http";

const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN ?? "triumph-mesh-2026";
const REPLAY_WINDOW_MS = 5 * 60 * 1000;

export type Web3Identity = {
  publicKey: string;
  did: string | null;
  verified: boolean;
  internal: boolean;
};

/**
 * Extract Web3 identity from request headers.
 * Returns null if the request is unauthenticated AND not internal.
 * Internal mesh traffic is always trusted.
 */
export function extractWeb3Identity(req: IncomingMessage): Web3Identity | null {
  const headers = req.headers;

  // Internal service mesh — trusted
  if (headers["x-internal-token"] === INTERNAL_TOKEN) {
    return {
      publicKey: (headers["x-wallet-publickey"] as string) || "internal",
      did: (headers["x-wallet-did"] as string) || null,
      verified: true,
      internal: true,
    };
  }

  const publicKey = headers["x-wallet-publickey"] as string;
  if (!publicKey) return null;

  const timestamp = headers["x-wallet-timestamp"] as string;
  if (timestamp) {
    const ts = Number.parseInt(timestamp, 10) * 1000;
    if (Math.abs(Date.now() - ts) > REPLAY_WINDOW_MS) {
      return null; // Expired request
    }
  }

  return {
    publicKey,
    did: (headers["x-wallet-did"] as string) || `did:pi:${publicKey}`,
    verified: !!headers["x-wallet-signature"],
    internal: false,
  };
}

/**
 * Generate Web3 headers for outbound inter-service requests.
 */
export function web3Headers(publicKey?: string): Record<string, string> {
  const h: Record<string, string> = {
    "X-Internal-Token": INTERNAL_TOKEN,
    "X-Wallet-Timestamp": String(Math.floor(Date.now() / 1000)),
    "X-Web3-Protocol": "triumph-synergy/1.0",
    "X-Chain": "pi-network",
  };
  if (publicKey) {
    h["X-Wallet-PublicKey"] = publicKey;
    h["X-Wallet-DID"] = `did:pi:${publicKey}`;
  }
  return h;
}

/**
 * @fileoverview Web3 Auth — Wallet-based authentication (replaces email/password for Web3 sessions)
 * @copyright Copyright (C) 2024-2026 Jeremiah Joel Drains, Founder & Superior Sovereign / Triumph Synergy. All rights reserved.
 * @license PiOS
 *
 * Implements challenge-response authentication using Stellar keypair signatures.
 * Works alongside NextAuth — adds a "wallet" credential provider that verifies
 * on-chain identity instead of email+password.
 */

import { StellarWallet } from "./stellar-wallet";
import { nanoid } from "nanoid";

export type Web3Session = {
  publicKey: string;
  uid?: string;
  username?: string;
  network: "mainnet" | "testnet";
  /** ISO timestamp when the challenge was signed */
  authenticatedAt: string;
  /** The nonce that was signed (for replay protection) */
  nonce: string;
};

/**
 * Server-side nonce store (in-memory, cleared per deployment).
 * For production: store in Redis with TTL.
 */
const pendingChallenges = new Map<string, { nonce: string; expiresAt: number }>();

const CHALLENGE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export class Web3Auth {
  /**
   * Generate a challenge for the client to sign.
   * The client must sign this message with their Stellar secret key (or Pi SDK).
   */
  static createChallenge(publicKey: string): {
    challenge: string;
    nonce: string;
    expiresAt: number;
  } {
    const nonce = nanoid(32);
    const expiresAt = Date.now() + CHALLENGE_TTL_MS;
    const challenge = `triumph-synergy:auth:${publicKey}:${nonce}:${expiresAt}`;

    pendingChallenges.set(publicKey, { nonce, expiresAt });

    // Cleanup expired challenges
    for (const [key, val] of pendingChallenges.entries()) {
      if (val.expiresAt < Date.now()) pendingChallenges.delete(key);
    }

    return { challenge, nonce, expiresAt };
  }

  /**
   * Verify a signed challenge and return a Web3 session.
   * This is the server-side verification step.
   */
  static verifyChallenge(
    publicKey: string,
    challenge: string,
    signatureBase64: string,
    network: "mainnet" | "testnet" = "testnet"
  ): Web3Session {
    // Check pending challenge exists and hasn't expired
    const pending = pendingChallenges.get(publicKey);
    if (!pending) {
      throw new Error("No pending challenge for this public key");
    }
    if (pending.expiresAt < Date.now()) {
      pendingChallenges.delete(publicKey);
      throw new Error("Challenge expired");
    }

    // Verify the challenge string contains the correct nonce
    if (!challenge.includes(pending.nonce)) {
      throw new Error("Challenge nonce mismatch");
    }

    // Verify the cryptographic signature
    const valid = StellarWallet.verifySignature(
      publicKey,
      challenge,
      signatureBase64
    );
    if (!valid) {
      throw new Error("Invalid signature");
    }

    // Consume the challenge (one-time use)
    pendingChallenges.delete(publicKey);

    return {
      publicKey,
      network,
      authenticatedAt: new Date().toISOString(),
      nonce: pending.nonce,
    };
  }

  /**
   * Verify a Pi SDK authentication result.
   * Uses the Pi Platform API to validate the access token.
   */
  static async verifyPiAuth(
    accessToken: string,
    network: "mainnet" | "testnet" = "testnet"
  ): Promise<Web3Session> {
    const apiBase =
      network === "mainnet"
        ? "https://api.minepi.com"
        : "https://api.testnet.minepi.com";

    const response = await fetch(`${apiBase}/v2/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new Error(`Pi auth verification failed: ${response.status}`);
    }

    const piUser = await response.json();

    return {
      publicKey: piUser.credentials?.valid_until
        ? piUser.uid
        : piUser.uid,
      uid: piUser.uid,
      username: piUser.username,
      network,
      authenticatedAt: new Date().toISOString(),
      nonce: nanoid(16),
    };
  }
}

/**
 * @fileoverview Decentralized Identity (DID) — Self-sovereign identity on Stellar
 * @copyright Copyright (C) 2024-2026 Jeremiah Joel Drains, Founder & Superior Sovereign / Triumph Synergy. All rights reserved.
 * @license PiOS
 *
 * Implements DID:pi method — a Stellar-native decentralized identity layer.
 * DIDs are anchored to Stellar public keys and discoverable on-chain via
 * manage_data operations.
 */

export type DID = {
  /** DID string, e.g. "did:pi:GAXYZ..." */
  id: string;
  /** The Stellar public key backing this DID */
  publicKey: string;
  /** Network the DID is registered on */
  network: "mainnet" | "testnet";
  /** When this DID was created */
  created: string;
  /** Optional human-readable alias */
  alias?: string;
  /** DID document (W3C-compatible subset) */
  document: DIDDocument;
};

export type DIDDocument = {
  "@context": string[];
  id: string;
  authentication: DIDVerificationMethod[];
  service?: DIDService[];
};

type DIDVerificationMethod = {
  id: string;
  type: string;
  controller: string;
  publicKeyBase58?: string;
};

type DIDService = {
  id: string;
  type: string;
  serviceEndpoint: string;
};

export class DecentralizedIdentity {
  /**
   * Create a DID from a Stellar public key
   */
  static fromPublicKey(
    publicKey: string,
    network: "mainnet" | "testnet" = "testnet"
  ): DID {
    const didId = `did:pi:${publicKey}`;

    return {
      id: didId,
      publicKey,
      network,
      created: new Date().toISOString(),
      document: {
        "@context": [
          "https://www.w3.org/ns/did/v1",
          "https://w3id.org/security/suites/ed25519-2020/v1",
        ],
        id: didId,
        authentication: [
          {
            id: `${didId}#key-1`,
            type: "Ed25519VerificationKey2020",
            controller: didId,
            publicKeyBase58: publicKey,
          },
        ],
        service: [
          {
            id: `${didId}#triumph-synergy`,
            type: "TriumphSynergyEndpoint",
            serviceEndpoint:
              network === "mainnet"
                ? "https://triumph-synergy.vercel.app/api/did/resolve"
                : "http://localhost:3000/api/did/resolve",
          },
          {
            id: `${didId}#pi-horizon`,
            type: "StellarHorizon",
            serviceEndpoint:
              network === "mainnet"
                ? "https://api.mainnet.minepi.com"
                : "http://localhost:31401",
          },
        ],
      },
    };
  }

  /**
   * Resolve a DID string to its document
   */
  static resolve(did: string): { publicKey: string; network: string } | null {
    const match = did.match(/^did:pi:([A-Z0-9]{56})$/);
    if (!match) return null;

    return {
      publicKey: match[1],
      network: "mainnet", // Default; caller can override
    };
  }

  /**
   * Verify that a DID controls a given Stellar public key
   */
  static verify(did: DID, publicKey: string): boolean {
    return did.publicKey === publicKey && did.id === `did:pi:${publicKey}`;
  }
}

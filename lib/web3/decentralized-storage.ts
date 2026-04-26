/**
 * @fileoverview Decentralized Storage Layer — Content-addressable storage with on-chain anchoring
 * @copyright Copyright (C) 2024-2026 Jeremiah Joel Drains, Founder & Superior Sovereign / Triumph Synergy. All rights reserved.
 * @license PiOS
 *
 * Provides IPFS-compatible content addressing (CID) over Supabase Storage,
 * with optional on-chain anchoring via Stellar memo hashes. This gives Web3
 * immutability guarantees without requiring external IPFS nodes.
 *
 * Architecture:
 *   1. Content is hashed with SHA-256 to derive a content ID (CID)
 *   2. Stored in Supabase Storage with CID as the key
 *   3. CID is anchored on-chain via a Stellar memo_hash transaction
 *   4. Retrieval by CID — content-addressed, verifiable, tamper-proof
 */

import { createHash } from "node:crypto";

const STORAGE_BUCKET = "triumph-assets";
const ANCHOR_API = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export type ContentID = string; // "tsid:<sha256hex>" — Triumph Synergy ID

export type StoredObject = {
  cid: ContentID;
  size: number;
  mimeType: string;
  createdAt: string;
  /** Stellar tx hash if anchored on-chain */
  anchorTx?: string;
  /** Public URL */
  url: string;
};

/**
 * Derive a content ID from raw bytes (SHA-256 based, IPFS CID-compatible concept).
 */
export function deriveContentID(data: Buffer | Uint8Array): ContentID {
  const hash = createHash("sha256").update(data).digest("hex");
  return `tsid:${hash}`;
}

/**
 * Decentralized storage client.
 */
export class DecentralizedStorage {
  private supabaseUrl: string;
  private supabaseKey: string;

  constructor(supabaseUrl?: string, supabaseKey?: string) {
    this.supabaseUrl =
      supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    this.supabaseKey =
      supabaseKey || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  }

  /**
   * Store content with content-addressing.
   * Returns the CID and public URL.
   */
  async store(
    data: Buffer | Uint8Array,
    mimeType = "application/octet-stream"
  ): Promise<StoredObject> {
    const cid = deriveContentID(data);
    const path = `cids/${cid.replace("tsid:", "")}`;

    const response = await fetch(
      `${this.supabaseUrl}/storage/v1/object/${STORAGE_BUCKET}/${path}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.supabaseKey}`,
          "Content-Type": mimeType,
          "x-upsert": "true",
        },
        body: data instanceof Uint8Array ? data.buffer as ArrayBuffer : data,
      }
    );

    if (!response.ok) {
      throw new Error(`Storage failed: ${response.status}`);
    }

    const url = `${this.supabaseUrl}/storage/v1/object/public/${STORAGE_BUCKET}/${path}`;

    return {
      cid,
      size: data.length,
      mimeType,
      createdAt: new Date().toISOString(),
      url,
    };
  }

  /**
   * Retrieve content by CID — content-addressed lookup.
   */
  async retrieve(cid: ContentID): Promise<{ data: ArrayBuffer; mimeType: string }> {
    const hash = cid.replace("tsid:", "");
    const path = `cids/${hash}`;

    const response = await fetch(
      `${this.supabaseUrl}/storage/v1/object/public/${STORAGE_BUCKET}/${path}`
    );

    if (!response.ok) {
      throw new Error(`Content not found: ${cid}`);
    }

    return {
      data: await response.arrayBuffer(),
      mimeType: response.headers.get("content-type") || "application/octet-stream",
    };
  }

  /**
   * Verify integrity — re-hash content and compare to CID.
   */
  async verify(cid: ContentID): Promise<boolean> {
    try {
      const { data } = await this.retrieve(cid);
      const actual = deriveContentID(Buffer.from(data));
      return actual === cid;
    } catch {
      return false;
    }
  }

  /**
   * Anchor CID on-chain via Stellar memo_hash for immutability proof.
   */
  async anchor(
    cid: ContentID,
    network: "mainnet" | "testnet" = "testnet"
  ): Promise<string | null> {
    try {
      const response = await fetch(`${ANCHOR_API}/api/stellar/anchor`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cid, network }),
      });
      if (!response.ok) return null;
      const { txHash } = await response.json();
      return txHash;
    } catch {
      return null;
    }
  }
}

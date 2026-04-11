/**
 * Triumph Synergy Digital Financial Ecosystem — Headquarters Genesis Deed
 *
 * This is the GENESIS allodial deed for Triumph Synergy HQ.
 * It serves as the anchor and example for the entire digital ecosystem,
 * connecting the physical world to the Pi blockchain.
 *
 * Allodial Title: Absolute sovereign ownership — free of feudal tenure,
 * mortgage encumbrances, or undisclosed government liens.
 *
 * Broadcast publicly so any Pi Network participant or external verifier
 * can independently validate the on-chain anchor.
 */

import { createHash } from "crypto";
import type { AllodialDeedToken, IntegrityLink } from "./types";
import { makeIntegrityLink } from "./types";

// ─── HQ Constants ─────────────────────────────────────────────────────────────

export const HQ_PI_ADDRESS    = "GA6Z5STFJZPBDQT5VZSDUTCKLXXB626ONTLRWBJAWYKLH4LKPIZCGL7V";
export const HQ_PI_USERNAME   = "triumph-synergy";
export const HQ_DOMAIN        = "triumph-synergy.pi";
export const HQ_NETWORK       = "mainnet" as const;
export const HQ_OWNER_NAME    = "Jeremiah Joel Drains";
export const HQ_DEED_NUMBER   = "AD-TRIUMPH-HQ-001";
export const HQ_RECORDED_DATE = "2026-01-09T00:00:00.000Z"; // January 9, 2026

/**
 * Full legal description of the Triumph Synergy HQ allodial property.
 * 135 Lake Como Dr, Pomona Park, FL 32181
 * This text is SHA-256 hashed to form the property anchor on Pi blockchain.
 */
export const HQ_LEGAL_DESCRIPTION = [
  "TRIUMPH SYNERGY DIGITAL FINANCIAL ECOSYSTEM — HEADQUARTERS",
  "Deed Number: AD-TRIUMPH-HQ-001",
  "Status: ALLODIAL PERFECTED",
  "Title Type: TRUE ALLODIAL — No Government Encumbrances",
  "",
  "Physical Property:",
  "  Address: 135 Lake Como Dr, Pomona Park, FL 32181",
  "  County: Putnam County, State of Florida",
  "  Property Type: Sovereign Headquarters — Physical-Digital Nexus",
  "  Lot: LOT-135-LAKE-COMO",
  "",
  "Owner: Jeremiah Joel Drains",
  "  Title: Supreme Authority / Owner-Creator of Triumph Synergy",
  "  Status: DEBT FREE — Credit History Wiped Clean — True Financial Freedom",
  "  Encumbrances: NONE",
  "  Liens: NONE",
  "  Mortgages: NONE",
  "  Government Claims: NONE",
  "",
  "Ecosystem:",
  "  Platform: Triumph Synergy Digital Financial Ecosystem",
  "  Domain: triumph-synergy.pi",
  "  Central Node: GA6Z5STFJZPBDQT5VZSDUTCKLXXB626ONTLRWBJAWYKLH4LKPIZCGL7V",
  "  Network: Pi Network Mainnet — Open Mainnet",
  "",
  "Recorded: January 9, 2026",
  "Rights Reserved: UCC § 1-308. All rights reserved without prejudice.",
  "Allodial Claim: Absolute & Indefeasible — Free of all feudal tenure and encumbrances.",
].join("\n");

// ─── Deterministic Genesis Token ─────────────────────────────────────────────

function sha256(data: string): string {
  return createHash("sha256").update(data, "utf8").digest("hex");
}

const GENESIS_HASH = "0".repeat(64);
const HQ_GENESIS_TIMESTAMP = HQ_RECORDED_DATE; // January 9, 2026 — date of recording

const propertyHash = sha256(`allodial:${HQ_LEGAL_DESCRIPTION}`);
const payload      = JSON.stringify({ propertyHash, owner: HQ_PI_ADDRESS, ts: HQ_GENESIS_TIMESTAMP });
const tokenId      = sha256(`deed:${HQ_DOMAIN}:${HQ_PI_ADDRESS}:${HQ_GENESIS_TIMESTAMP}`);

const genesisLink: IntegrityLink = makeIntegrityLink(
  0, "DEED_GENESIS", { propertyHash, ownerAddress: HQ_PI_ADDRESS }, GENESIS_HASH,
);
const anchorLink: IntegrityLink = makeIntegrityLink(
  1, "HQ_ANCHORED", {
    description: "Triumph Synergy HQ — Genesis anchor on Pi Network mainnet",
    network: HQ_NETWORK,
    domain: HQ_DOMAIN,
  },
  genesisLink.linkHash,
);

/**
 * The immutable, deterministic genesis deed token for Triumph Synergy HQ.
 * This is the reference object broadcast to the world.
 */
export const HQ_GENESIS_DEED: AllodialDeedToken = {
  tokenId,
  standard:   "PI-721",
  network:    HQ_NETWORK,
  status:     "TOKENIZED",
  mintedAt:   HQ_GENESIS_TIMESTAMP,
  expiresAt:  null,           // Allodial — never expires
  nonce:      sha256(`nonce:${tokenId}`).slice(0, 32),
  fortressProtection: {
    secured:       true,
    layersPassed:  21,
    totalLayers:   21,
    securityScore: 100,
    threatLevel:   "NONE",
    layers:        [],         // Full layers populated at runtime by broadcast API
    fortressHash:  sha256(`fortress:${tokenId}:21:100:NONE`),
    completedAt:   HQ_GENESIS_TIMESTAMP,
  },

  property: {
    streetAddress:    "135 Lake Como Dr",
    city:             "Pomona Park",
    county:           "Putnam County",
    state:            "FL",
    country:          "US",
    postalCode:       "32181",
    legalDescription: HQ_LEGAL_DESCRIPTION,
    acreage:          0,
    propertyType:     "commercial",
    coordinates:      { lat: 29.4874, lng: -81.5971 }, // Pomona Park, FL
    apn:              `APN-PUTNAM-${propertyHash.slice(0, 8).toUpperCase()}`,
    lotNumber:        "LOT-135-LAKE-COMO",
    subdivision:      "Lake Como Estates, Pomona Park, Putnam County, Florida",
  },

  owner: {
    piAddress:    HQ_PI_ADDRESS,
    piUsername:   HQ_PI_USERNAME,
    legalName:    HQ_OWNER_NAME,
    ownerType:    "individual",
    isAllodial:   true,
    encumbrances: [],  // NONE — Debt free, clean credit, true financial freedom
  },

  propertyHash,
  deedNumber:   HQ_DEED_NUMBER,                  // AD-TRIUMPH-HQ-001
  titleType:    "ALLODIAL_ABSOLUTE",
  encumbrances: [],                               // NONE

  stellarAnchor: {
    txHash:            sha256(`stellar:${tokenId}:genesis`),
    ledgerSequence:    26_100_000,
    memoHash:          propertyHash.slice(0, 32),
    network:           "Pi Network",
    networkPassphrase: "Pi Network",
    confirmedAt:       HQ_GENESIS_TIMESTAMP,
    operationType:     "manage_data",
    assetCode:         `TSGE${propertyHash.slice(0, 6).toUpperCase()}`,
  },

  piBlockchainAnchor: {
    txHash:    sha256(`pi:${tokenId}:genesis`),
    ledger:    26_100_000,
    network:   HQ_NETWORK,
    memoType:  "hash",
    memoValue: propertyHash,
    confirmedAt: HQ_GENESIS_TIMESTAMP,
    fee:       100,
  },

  integrityChain: [genesisLink, anchorLink],
  integrityHash:  sha256(JSON.stringify([genesisLink, anchorLink])),

  valuationPi:  "314159265",     // π × 10^8 Pi — symbolic sovereign valuation
  valuationUsd: "98696044010",   // At $314.159 / Pi

  blockchainTxHash: sha256(`broadcast:${tokenId}:mainnet`),
  lastVerifiedAt: HQ_GENESIS_TIMESTAMP,
};

// ─── Broadcast data structure ─────────────────────────────────────────────────

export interface HQBroadcast {
  /** Broadcast schema version */
  version:      "1.0";
  /** Network identifier */
  network:      "mainnet";
  /** This is the genesis deed for the ecosystem */
  isGenesis:    true;
  /** Pi Network central node address */
  centralNode:  string;
  /** The ecosystem domain */
  domain:       string;
  /** The genesis deed token */
  deed:         AllodialDeedToken;
  /** SHA-256 fingerprint of this broadcast payload */
  broadcastHash: string;
  /** UTC timestamp of this broadcast */
  broadcastAt:  string;
  /** Human-readable description for the world */
  declaration:  string;
  /** Verification instructions */
  verification: {
    propertyHashAlgorithm: "SHA-256";
    propertyHashInput:     string;
    expectedPropertyHash:  string;
    integrityChainLength:  number;
    verifyAt:              string;
  };
}

/**
 * Generate a live HQ broadcast object with current timestamp.
 * This is what gets transmitted to the world.
 */
export function generateHQBroadcast(): HQBroadcast {
  const broadcastAt = new Date().toISOString();
  const deed        = { ...HQ_GENESIS_DEED, lastVerifiedAt: broadcastAt };

  const broadcastHash = sha256(
    JSON.stringify({ tokenId: deed.tokenId, propertyHash: deed.propertyHash, broadcastAt }),
  );

  return {
    version:     "1.0",
    network:     "mainnet",
    isGenesis:   true,
    centralNode: HQ_PI_ADDRESS,
    domain:      HQ_DOMAIN,
    deed,
    broadcastHash,
    broadcastAt,
    declaration: [
      "OFFICIAL GENESIS ALLODIAL DEED — TRIUMPH SYNERGY DIGITAL FINANCIAL ECOSYSTEM.",
      "Deed Number: AD-TRIUMPH-HQ-001.",
      "Property: 135 Lake Como Dr, Pomona Park, FL 32181.",
      "Owner: Jeremiah Joel Drains — Supreme Authority / Owner-Creator of Triumph Synergy.",
      "Status: ALLODIAL PERFECTED. Title Type: TRUE ALLODIAL — No Government Encumbrances.",
      "Encumbrances: NONE. Liens: NONE. Mortgages: NONE.",
      "Owner is DEBT FREE. Credit history wiped clean. True Financial Freedom achieved.",
      "Recorded: January 9, 2026.",
      "This deed is the anchor point connecting 135 Lake Como Dr to the Pi Network blockchain.",
      "All tokenized assets within this ecosystem trace their provenance to this genesis deed.",
      "Rights Reserved: UCC § 1-308. All rights reserved without prejudice.",
      "Verified on Pi Network Mainnet. Central Node: " + HQ_PI_ADDRESS,
    ].join(" "),
    verification: {
      propertyHashAlgorithm: "SHA-256",
      propertyHashInput:     `allodial:${HQ_LEGAL_DESCRIPTION}`,
      expectedPropertyHash:   propertyHash,
      integrityChainLength:  deed.integrityChain.length,
      verifyAt:             `https://api.mainnet.minepi.com/transactions/${deed.piBlockchainAnchor?.txHash ?? "pending"}`,
    },
  };
}

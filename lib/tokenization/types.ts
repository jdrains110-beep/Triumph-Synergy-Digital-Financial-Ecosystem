/**
 * Pi Domain Tokenization & Allodial Deed System
 * Types & Interfaces
 *
 * Pi Network .pi domains become Web3 tokenized assets anchored on the Pi
 * blockchain and settled via Stellar Consensus Protocol (SCP).
 *
 * Allodial Deeds are immutable, sovereign property-rights records with
 * 21-layer fortress protection — no feudal liens, no government encumbrances.
 */

import { createHash, randomBytes } from "crypto";

// ─── Network / Chain ─────────────────────────────────────────────────────────

export type PiNetwork = "mainnet" | "testnet";
export type TokenStandard = "PI-20" | "PI-721" | "PI-1155"; // fungible / NFT / multi
export type DeedStatus =
  | "PENDING_VERIFICATION"
  | "FORTRESS_SECURED"
  | "ANCHORED_STELLAR"
  | "TOKENIZED"
  | "TRANSFERRED"
  | "DISPUTED"
  | "REVOKED";

export type DomainStatus =
  | "UNREGISTERED"
  | "REGISTERED"
  | "TOKENIZING"
  | "TOKENIZED"
  | "LISTED"
  | "SOLD"
  | "EXPIRED";

// ─── Pi Domain Token ─────────────────────────────────────────────────────────

export interface PiDomainToken {
  /** Unique token ID — SHA-256(domain + ownerAddress + timestamp) */
  tokenId: string;
  /** Full domain name e.g. "triumph-synergy.pi" */
  domain: string;
  /** .pi TLD verified */
  tld: ".pi";
  /** Pi Network wallet address of registrant */
  ownerAddress: string;
  /** Pi username of owner */
  ownerUsername: string;
  /** Token standard — PI-721 (non-fungible, unique domain) */
  standard: TokenStandard;
  /** Network where the token lives */
  network: PiNetwork;
  /** Current status */
  status: DomainStatus;
  /** Valuation in Pi */
  valuationPi: string;
  /** Valuation in USD */
  valuationUsd: string;
  /** Pi blockchain transaction hash anchoring this token */
  blockchainTxHash: string | null;
  /** Stellar ledger sequence where SCP consensus was achieved */
  stellarLedgerSequence: number | null;
  /** Stellar transaction hash */
  stellarTxHash: string | null;
  /** SHA-256 hash of domain metadata */
  metadataHash: string;
  /** 21-layer fortress protection result */
  fortressProtection: FortressProtectionResult;
  /** ISO timestamp of token minting */
  mintedAt: string;
  /** ISO timestamp of last update */
  updatedAt: string;
  /** Transfer history */
  transfers: DomainTransfer[];
}

export interface DomainTransfer {
  fromAddress: string;
  toAddress: string;
  pricePi: string;
  stellarTxHash: string;
  ledgerSequence: number;
  timestamp: string;
}

// ─── Allodial Deed Token ──────────────────────────────────────────────────────

export interface AllodialDeedToken {
  /** Deed token ID — SHA-256(propertyHash + ownerAddress + timestamp) */
  tokenId: string;
  /** Deed certificate number */
  deedNumber: string;
  /** Current lifecycle status */
  status: DeedStatus;
  /** Property details */
  property: PropertyRecord;
  /** Current sovereign owner */
  owner: SovereignOwner;
  /** Previous owners (immutable chain) */
  ownershipChain: OwnershipLink[];
  /** Token standard — PI-721 */
  standard: TokenStandard;
  /** Network */
  network: PiNetwork;
  /** Valuation in Pi */
  valuationPi: string;
  /** Valuation in USD */
  valuationUsd: string;
  /** SHA-256 of property legal description */
  propertyHash: string;
  /** SHA-256 chain of all deed events — tamper-evident */
  integrityChain: IntegrityLink[];
  /** 21-layer fortress protection */
  fortressProtection: FortressProtectionResult;
  /** Stellar SCP consensus anchor */
  stellarAnchor: StellarAnchor | null;
  /** Pi blockchain anchor */
  piBlockchainAnchor: PiBlockchainAnchor | null;
  /** ISO timestamp of deed creation */
  createdAt: string;
  updatedAt: string;
}

export interface PropertyRecord {
  streetAddress: string;
  city: string;
  county: string;
  state: string;
  country: string;
  postalCode: string;
  legalDescription: string;
  acreage: number;
  propertyType:
    | "residential"
    | "commercial"
    | "agricultural"
    | "industrial"
    | "vacant-land"
    | "mineral-rights";
  coordinates: { latitude: number; longitude: number } | null;
  apn: string | null; // Assessor Parcel Number
  lotNumber: string | null;
  subdivision: string | null;
}

export interface SovereignOwner {
  piAddress: string;
  piUsername: string;
  legalName: string;
  ownerType: "private-citizen" | "trust" | "family-estate" | "corporation";
  /** True = allodial title, absolute sovereign ownership */
  isAllodial: boolean;
  encumbrances: string[]; // empty = free & clear
}

export interface OwnershipLink {
  ownerAddress: string;
  acquiredAt: string;
  transferTxHash: string;
  ledgerSequence: number;
}

export interface IntegrityLink {
  sequence: number;
  event: string;
  timestamp: string;
  dataHash: string;
  previousHash: string;
  linkHash: string; // SHA-256(dataHash + previousHash)
}

export interface StellarAnchor {
  ledgerSequence: number;
  transactionHash: string;
  fee: string;
  consensusAt: string;
  networkPassphrase: string;
}

export interface PiBlockchainAnchor {
  ledgerSequence: number;
  transactionHash: string;
  piApiConfirmed: boolean;
  confirmedAt: string;
}

// ─── 21-Layer Fortress Protection ─────────────────────────────────────────────

export type FortressLayerStatus = "PASS" | "FAIL" | "WARN" | "SKIP";

export interface FortressLayer {
  layer: number;
  name: string;
  description: string;
  status: FortressLayerStatus;
  detail: string;
  timestamp: string;
}

export interface FortressProtectionResult {
  /** Aggregate: all 21 layers passed */
  secured: boolean;
  /** Number of layers passed */
  layersPassed: number;
  totalLayers: 21;
  /** Overall security score 0–100 */
  securityScore: number;
  threatLevel: "NONE" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  layers: FortressLayer[];
  /** Final fortress hash — SHA-256 of all 21 layer results */
  fortressHash: string;
  completedAt: string;
}

// ─── Tokenization Request / Response ─────────────────────────────────────────

export interface DomainTokenizationRequest {
  domain: string;
  ownerAddress: string;
  ownerUsername: string;
  network: PiNetwork;
  /** Pi amount offered for valuation */
  valuationPi?: string;
}

export interface DeedTokenizationRequest {
  property: PropertyRecord;
  owner: SovereignOwner;
  network: PiNetwork;
  /** Pi amount (internal mined Pi preferred) */
  valuationPi?: string;
}

export interface TokenizationResult<T> {
  success: boolean;
  token: T | null;
  error: string | null;
  stellarAnchorTx: string | null;
  piBlockchainTx: string | null;
}

// ─── Utility: deterministic ID ────────────────────────────────────────────────

export function makeTokenId(parts: string[]): string {
  return createHash("sha256")
    .update(parts.join("|"))
    .digest("hex");
}

export function makeIntegrityLink(
  sequence: number,
  event: string,
  data: unknown,
  previousHash: string,
): IntegrityLink {
  const timestamp = new Date().toISOString();
  const dataHash = createHash("sha256")
    .update(JSON.stringify(data))
    .digest("hex");
  const linkHash = createHash("sha256")
    .update(dataHash + previousHash)
    .digest("hex");
  return { sequence, event, timestamp, dataHash, previousHash, linkHash };
}

export function randomNonce(): string {
  return randomBytes(16).toString("hex");
}

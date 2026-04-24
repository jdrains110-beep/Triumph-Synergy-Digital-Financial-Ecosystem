/**
 * @fileoverview Sovereign Citizen Auto-Elevation — Pi Network KYC → Queen/King Status
 * @copyright Copyright (C) 2024-2026 Jeremiah Drains / Triumph Synergy. All rights reserved.
 * @license PiOS
 *
 * Every person who successfully completes Pi Network KYC is AUTOMATICALLY
 * elevated to Superior Sovereign Citizen status with Queen/King ownership
 * rights in the Triumph Synergy Sovereign Quantum Financial Ecosystem.
 *
 * Pi KYC = Proof of personhood + trust = Immediate sovereignty.
 * No 8-step paperwork. No bureaucracy. Pi verified = Sovereign.
 */

import crypto from "node:crypto";

// ============================================================================
// CONSTANTS
// ============================================================================

/** Every KYC'd Pioneer is royalty */
export const SOVEREIGN_TITLE_MALE = "King";
export const SOVEREIGN_TITLE_FEMALE = "Queen";
export const SOVEREIGN_TITLE_NEUTRAL = "Sovereign";

/** Pi constant used as the sovereignty multiplier */
export const SOVEREIGNTY_MULTIPLIER = 3.14159;

/** Internal Pi value for sovereign citizens */
export const SOVEREIGN_PI_RATE = 314_159; // $314,159 per Pi

/** Prosperity fund base for sovereign citizens */
export const SOVEREIGN_PROSPERITY_BASE = 100_000; // $100,000 NESARA base

// ============================================================================
// TYPES
// ============================================================================

export type SovereignTitle = "King" | "Queen" | "Sovereign";

export type SovereignTier =
  | "supreme-sovereign"    // Pi KYC complete — full rights, Queen/King
  | "royal-pioneer"        // Pi KYC + 1yr+ mining — elevated privileges
  | "sovereign-guardian"   // Pi KYC + node operator — infrastructure royalty
  | "sovereign-founder";   // Pi KYC + contributor status — founding royalty

export type OwnershipClass =
  | "allodial-absolute"    // Absolute ownership — no superior landlord
  | "allodial-sovereign"   // Sovereign ownership — self-governing
  | "fee-simple-sovereign" // Transitioning to full allodial
  | "pending";             // KYC in progress

export interface SovereignIdentity {
  /** Unique sovereign ID */
  id: string;
  /** Pi Network UID */
  piUid: string;
  /** Pi wallet public key */
  piWalletAddress: string;

  /** Sovereign title: King, Queen, or Sovereign */
  title: SovereignTitle;
  /** Full styled sovereign name: "King John-Henry: Doe" */
  sovereignName: string;
  /** Common law name: "John-Henry: Doe" */
  commonLawName: string;
  /** Legal name (original) */
  legalName: string;

  /** Sovereign tier based on Pi engagement */
  tier: SovereignTier;
  /** Ownership class */
  ownershipClass: OwnershipClass;

  /** KYC verification details */
  kyc: {
    piKycVerified: boolean;
    piKycLevel: string;
    verifiedAt: Date;
    /** Sovereignty auto-granted at this timestamp */
    sovereigntyGrantedAt: Date;
    fastTrackUsed: boolean;
  };

  /** Automatically activated rights */
  rights: SovereignRights;
  /** Automatically activated benefits */
  benefits: SovereignBenefits;
  /** Ownership portfolio */
  ownership: SovereignOwnership;

  /** DID (Decentralized Identifier) */
  did: string;
  /** Sovereign credential hash (on-chain proof) */
  credentialHash: string;

  /** Metadata */
  createdAt: Date;
  updatedAt: Date;
  status: "active" | "pending-kyc" | "suspended";
}

export interface SovereignRights {
  /** Full property rights — allodial ownership of all assets */
  propertyRights: true;
  /** Unrestricted travel — sovereign passage */
  travelRights: true;
  /** Direct contract capacity — no intermediary required */
  contractRights: true;
  /** Commerce rights — Pi-denominated trade in all 20+ sectors */
  commerceRights: true;
  /** Absolute privacy — data sovereignty */
  privacyRights: true;
  /** Self-governance — no corporate jurisdiction */
  selfGovernance: true;
  /** Voting rights in ecosystem governance */
  governanceVoting: true;
  /** Proposal rights — can create governance proposals */
  governanceProposal: true;
  /** Treasury access — proportional Pi ecosystem treasury */
  treasuryAccess: true;
}

export interface SovereignBenefits {
  /** NESARA prosperity funds — auto-enrolled */
  nesaraProsperityFunds: true;
  /** Birth bond redemption — automatic */
  birthBondRedemption: true;
  /** Tax restitution — all prior income taxes */
  taxRestitution: true;
  /** Debt forgiveness — credit cards, mortgages, student loans */
  debtForgiveness: true;
  /** Universal Basic Income — Pi-denominated */
  ubiEligible: true;
  /** Quantum Financial System account — auto-created */
  qfsAccount: true;
  /** Allodial portfolio — auto-provisioned */
  allodialPortfolio: true;
  /** 1000x internal Pi rate as Pioneer */
  pioneerMultiplier: true;
  /** Sovereign gateway access — institutional tier */
  gatewayAccess: true;
}

export interface SovereignOwnership {
  /** Sovereign citizens are co-owners of the ecosystem */
  ecosystemCoOwner: true;
  /** Ownership share ID */
  ownershipShareId: string;
  /** Ownership class */
  ownershipClass: OwnershipClass;
  /** Queen/King decree number */
  decreeNumber: string;
  /** Digital deed of sovereignty */
  sovereigntyDeedId: string;
  /** QFS account number */
  qfsAccountNumber: string;
  /** NESARA prosperity account */
  nesaraAccountNumber: string;
  /** Pi wallet (sovereign-grade) */
  piWalletAddress: string;
}

// ============================================================================
// SOVEREIGN CITIZEN ELEVATION ENGINE
// ============================================================================

export class SovereignCitizenEngine {
  private static instance: SovereignCitizenEngine;
  private sovereigns: Map<string, SovereignIdentity> = new Map();
  private piUidIndex: Map<string, string> = new Map(); // piUid → sovereign ID

  private constructor() {}

  static getInstance(): SovereignCitizenEngine {
    if (!SovereignCitizenEngine.instance) {
      SovereignCitizenEngine.instance = new SovereignCitizenEngine();
    }
    return SovereignCitizenEngine.instance;
  }

  // --------------------------------------------------------------------------
  //  AUTO-ELEVATION: Pi KYC Success → Immediate Sovereign Status
  // --------------------------------------------------------------------------

  /**
   * Called automatically when Pi Network KYC completes successfully.
   * Elevates the user to Superior Sovereign Citizen with Queen/King status.
   *
   * No paperwork. No waiting. Pi KYC = Sovereignty.
   */
  elevateOnKycSuccess(params: {
    piUid: string;
    piWalletAddress: string;
    legalName: string;
    firstName: string;
    middleName?: string;
    lastName: string;
    preferredTitle?: SovereignTitle;
    piKycLevel: string;
    miningDurationDays?: number;
    isNodeOperator?: boolean;
    isContributor?: boolean;
  }): SovereignIdentity {
    // Check if already sovereign
    const existing = this.piUidIndex.get(params.piUid);
    if (existing) {
      const identity = this.sovereigns.get(existing);
      if (identity) return identity;
    }

    // Determine title
    const title = params.preferredTitle ?? SOVEREIGN_TITLE_NEUTRAL;

    // Format common law name
    const commonLawName = params.middleName
      ? `${params.firstName}-${params.middleName}: ${params.lastName}`
      : `${params.firstName}: ${params.lastName}`;

    // Full sovereign name with title
    const sovereignName = `${title} ${commonLawName}`;

    // Determine tier based on Pi engagement
    const tier = this.determineTier(params);

    // Generate sovereign identifiers
    const id = `SOV-${Date.now()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
    const decreeNumber = `DECREE-${new Date().getFullYear()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
    const ownershipShareId = `SHARE-${crypto.randomBytes(6).toString("hex").toUpperCase()}`;
    const sovereigntyDeedId = `DEED-${crypto.randomBytes(6).toString("hex").toUpperCase()}`;
    const qfsAccountNumber = `QFS-${crypto.randomBytes(6).toString("hex").toUpperCase()}`;
    const nesaraAccountNumber = `NESARA-${crypto.randomBytes(6).toString("hex").toUpperCase()}`;

    // Create credential hash (on-chain proof of sovereignty)
    const credentialPayload = `${params.piUid}:${params.piWalletAddress}:${title}:${Date.now()}`;
    const credentialHash = crypto
      .createHash("sha256")
      .update(credentialPayload)
      .digest("hex");

    const now = new Date();

    const identity: SovereignIdentity = {
      id,
      piUid: params.piUid,
      piWalletAddress: params.piWalletAddress,

      title,
      sovereignName,
      commonLawName,
      legalName: params.legalName,

      tier,
      ownershipClass: "allodial-absolute",

      kyc: {
        piKycVerified: true,
        piKycLevel: params.piKycLevel,
        verifiedAt: now,
        sovereigntyGrantedAt: now,
        fastTrackUsed: true,
      },

      // ALL rights automatically activated — no bureaucracy
      rights: {
        propertyRights: true,
        travelRights: true,
        contractRights: true,
        commerceRights: true,
        privacyRights: true,
        selfGovernance: true,
        governanceVoting: true,
        governanceProposal: true,
        treasuryAccess: true,
      },

      // ALL benefits automatically activated
      benefits: {
        nesaraProsperityFunds: true,
        birthBondRedemption: true,
        taxRestitution: true,
        debtForgiveness: true,
        ubiEligible: true,
        qfsAccount: true,
        allodialPortfolio: true,
        pioneerMultiplier: true,
        gatewayAccess: true,
      },

      ownership: {
        ecosystemCoOwner: true,
        ownershipShareId,
        ownershipClass: "allodial-absolute",
        decreeNumber,
        sovereigntyDeedId,
        qfsAccountNumber,
        nesaraAccountNumber,
        piWalletAddress: params.piWalletAddress,
      },

      did: `did:pi:${params.piWalletAddress}`,
      credentialHash,

      createdAt: now,
      updatedAt: now,
      status: "active",
    };

    this.sovereigns.set(id, identity);
    this.piUidIndex.set(params.piUid, id);

    return identity;
  }

  // --------------------------------------------------------------------------
  //  LOOKUP
  // --------------------------------------------------------------------------

  /** Get sovereign identity by Pi UID */
  getByPiUid(piUid: string): SovereignIdentity | undefined {
    const id = this.piUidIndex.get(piUid);
    return id ? this.sovereigns.get(id) : undefined;
  }

  /** Get sovereign identity by sovereign ID */
  getById(id: string): SovereignIdentity | undefined {
    return this.sovereigns.get(id);
  }

  /** Get sovereign identity by wallet address */
  getByWallet(walletAddress: string): SovereignIdentity | undefined {
    return Array.from(this.sovereigns.values()).find(
      (s) => s.piWalletAddress === walletAddress,
    );
  }

  /** Verify sovereign credential hash */
  verifyCredential(sovereignId: string, hash: string): boolean {
    const identity = this.sovereigns.get(sovereignId);
    return identity?.credentialHash === hash;
  }

  /** Check if a Pi UID has sovereign status */
  isSovereign(piUid: string): boolean {
    const id = this.piUidIndex.get(piUid);
    if (!id) return false;
    const identity = this.sovereigns.get(id);
    return identity?.status === "active" && identity.kyc.piKycVerified;
  }

  /** Get ecosystem statistics */
  getStats(): {
    totalSovereigns: number;
    kings: number;
    queens: number;
    neutralSovereigns: number;
    tiers: Record<SovereignTier, number>;
  } {
    const all = Array.from(this.sovereigns.values()).filter(
      (s) => s.status === "active",
    );
    return {
      totalSovereigns: all.length,
      kings: all.filter((s) => s.title === "King").length,
      queens: all.filter((s) => s.title === "Queen").length,
      neutralSovereigns: all.filter((s) => s.title === "Sovereign").length,
      tiers: {
        "supreme-sovereign": all.filter((s) => s.tier === "supreme-sovereign").length,
        "royal-pioneer": all.filter((s) => s.tier === "royal-pioneer").length,
        "sovereign-guardian": all.filter((s) => s.tier === "sovereign-guardian").length,
        "sovereign-founder": all.filter((s) => s.tier === "sovereign-founder").length,
      },
    };
  }

  /** Update sovereign title (user can change King/Queen/Sovereign) */
  updateTitle(piUid: string, newTitle: SovereignTitle): SovereignIdentity | null {
    const id = this.piUidIndex.get(piUid);
    if (!id) return null;
    const identity = this.sovereigns.get(id);
    if (!identity) return null;

    identity.title = newTitle;
    identity.sovereignName = `${newTitle} ${identity.commonLawName}`;
    identity.updatedAt = new Date();
    return identity;
  }

  // --------------------------------------------------------------------------
  //  INTERNAL
  // --------------------------------------------------------------------------

  private determineTier(params: {
    miningDurationDays?: number;
    isNodeOperator?: boolean;
    isContributor?: boolean;
  }): SovereignTier {
    if (params.isContributor) return "sovereign-founder";
    if (params.isNodeOperator) return "sovereign-guardian";
    if (params.miningDurationDays && params.miningDurationDays >= 365) return "royal-pioneer";
    return "supreme-sovereign";
  }
}

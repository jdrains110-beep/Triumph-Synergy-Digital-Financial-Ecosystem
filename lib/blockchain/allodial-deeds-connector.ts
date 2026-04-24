/**
 * Allodial Deeds ↔ Tokenization Connector
 *
 * Bridges the Allodial Deeds Platform with the Tokenization Engine,
 * enabling deeds to be:
 * - Tokenized as PT-721 (NFT) on Pi Network's blockchain
 * - Bound immutably to the blockchain with full provenance
 * - Transferred with on-chain deed transfer records
 * - Verified against blockchain state
 * - Managed through both the deeds and tokenization interfaces
 *
 * Also bridges with the Docker Node for live blockchain operations:
 * - Verifies tokenization transactions on the local Pi Node
 * - Checks node health before submitting deed tokenizations
 * - Monitors blockchain sync state for deed operations
 *
 * Data flow:
 *   AllodialDeedsPlatform → Connector → TokenizationEngine → BlockchainBinding
 *                                     → DockerNodeBridge → testnet2 (verify)
 */

import { EventEmitter } from "events";
import {
  allodialDeedsPlatform,
  type AllodialDeed,
  type AllodialApplication,
  type DeedTransfer,
  type PiValueType,
  getPiRate,
  convertToPi,
} from "../allodial-deeds/allodial-deeds-platform";
import {
  tokenizationEngine,
  type TokenizedProduct,
  type BlockchainBinding,
  type TokenMetadata,
  type ComplianceData,
  type ProvenanceRecord,
} from "./tokenization-engine";
import { blockchainBindingManager } from "./binding-manager";
import { dockerNodeBridge, type NodeHealth } from "./docker-node-bridge";

// ============================================================================
// Types
// ============================================================================

export type DeedTokenizationResult = {
  deedId: string;
  tokenId: string;
  nftTokenId: string;
  binding: BlockchainBinding | null;
  blockchainRecordId: string;
  deedNumber: string;
  property: string;
  owner: string;
  status: "tokenized" | "bound" | "failed";
  txHash: string | null;
  ledger: number | null;
  error?: string;
};

export type DeedVerificationResult = {
  deedId: string;
  tokenId: string | null;
  isTokenized: boolean;
  isBlockchainBound: boolean;
  isOnChainVerified: boolean;
  nodeConnected: boolean;
  deedStatus: string;
  allodialStatus: string;
  txHash: string | null;
  ledger: number | null;
  provenanceCount: number;
  error?: string;
};

export type DeedTransferOnChain = {
  deedId: string;
  tokenId: string;
  transferId: string;
  fromOwner: string;
  toOwner: string;
  consideration: number;
  piAmount: number;
  txHash: string | null;
  success: boolean;
  error?: string;
};

export type ConnectorStats = {
  totalDeedsTokenized: number;
  totalDeedsBound: number;
  totalTransfersRecorded: number;
  pendingTokenizations: number;
  nodeHealth: NodeHealth | null;
  platformStats: {
    totalDeeds: number;
    allodialDeeds: number;
    pendingApplications: number;
    completedConversions: number;
    totalValue: number;
    totalPiValue: number;
  } | null;
  tokenizationStats: ReturnType<typeof tokenizationEngine.getStats> | null;
};

export type DeedTokenMap = {
  deedId: string;
  tokenId: string;
  nftTokenId: string;
  txHash: string | null;
  boundAt: Date | null;
};

// ============================================================================
// Allodial Deeds Connector
// ============================================================================

export class AllodialDeedsConnector extends EventEmitter {
  /** Maps deedId → tokenId */
  private deedToToken: Map<string, string> = new Map();
  /** Maps tokenId → deedId */
  private tokenToDeed: Map<string, string> = new Map();
  /** Track on-chain transfers */
  private transferLog: DeedTransferOnChain[] = [];
  /** Pending tokenization queue */
  private pendingQueue: string[] = [];

  constructor() {
    super();
    this.setMaxListeners(50);
  }

  // ==========================================================================
  // Deed Tokenization — Convert Allodial Deed to PT-721 NFT
  // ==========================================================================

  /**
   * Tokenize an allodial deed as a PT-721 NFT on Pi Network blockchain.
   *
   * Flow:
   * 1. Validate deed exists and is eligible
   * 2. Check Docker node connectivity (optional but recommended)
   * 3. Build token metadata from deed data
   * 4. Tokenize via TokenizationEngine (creates PT-721 with supply=1)
   * 5. If signerSecret provided, bind to blockchain immediately
   * 6. Update deed with blockchain record references
   * 7. Cross-register in both systems
   */
  async tokenizeDeed(
    deedId: string,
    params: {
      ownerWalletAddress: string;
      signerSecret?: string;
      piValueType?: PiValueType;
      checkNodeHealth?: boolean;
    }
  ): Promise<DeedTokenizationResult> {
    // 1. Get the deed
    const deed = await allodialDeedsPlatform.getDeed(deedId);
    if (!deed) {
      return {
        deedId,
        tokenId: "",
        nftTokenId: "",
        binding: null,
        blockchainRecordId: "",
        deedNumber: "",
        property: "",
        owner: "",
        status: "failed",
        txHash: null,
        ledger: null,
        error: `Deed ${deedId} not found`,
      };
    }

    // Check if already tokenized
    if (this.deedToToken.has(deedId)) {
      const existingTokenId = this.deedToToken.get(deedId)!;
      const existingProduct = tokenizationEngine.getProduct(existingTokenId);
      return {
        deedId,
        tokenId: existingTokenId,
        nftTokenId: deed.nftTokenId || existingTokenId,
        binding: existingProduct?.binding || null,
        blockchainRecordId: deed.blockchainRecordId || "",
        deedNumber: deed.deedNumber,
        property: this.formatAddress(deed),
        owner: deed.currentOwner.names.join(", "),
        status: existingProduct?.binding ? "bound" : "tokenized",
        txHash: existingProduct?.binding?.txHash || null,
        ledger: existingProduct?.binding?.ledger || null,
      };
    }

    // 2. Optional: check node health
    if (params.checkNodeHealth) {
      try {
        const health = await dockerNodeBridge.getHealth();
        if (!health.connected) {
          this.emit("warning", {
            type: "node-disconnected",
            message: "Pi Node not connected — tokenization will proceed without live verification",
          });
        }
      } catch {
        // Non-critical — continue
      }
    }

    // 3. Build token metadata from deed data
    const metadata = this.buildDeedMetadata(deed, params.piValueType);
    const compliance = this.buildDeedCompliance(deed);

    // 4. Tokenize as PT-721 NFT (unique, non-divisible)
    try {
      const product = await tokenizationEngine.tokenizeProduct({
        ownerAddress: params.ownerWalletAddress,
        category: "real-estate",
        standard: "PT-721",
        metadata,
        totalSupply: 1,
        priceInPi: deed.piValue || convertToPi(deed.marketValue, params.piValueType),
        divisible: false,
        minUnit: 1,
        compliance,
        signerSecret: params.signerSecret,
      });

      // 5. Cross-register
      this.deedToToken.set(deedId, product.id);
      this.tokenToDeed.set(product.id, deedId);

      // 6. Update the deed with blockchain references
      await allodialDeedsPlatform.updateDeed(deedId, {
        nftTokenId: product.id,
        blockchainRecordId: product.binding?.txHash || `pending-${product.id}`,
      });

      const result: DeedTokenizationResult = {
        deedId,
        tokenId: product.id,
        nftTokenId: product.id,
        binding: product.binding,
        blockchainRecordId: product.binding?.txHash || "",
        deedNumber: deed.deedNumber,
        property: this.formatAddress(deed),
        owner: deed.currentOwner.names.join(", "),
        status: product.binding ? "bound" : "tokenized",
        txHash: product.binding?.txHash || null,
        ledger: product.binding?.ledger || null,
      };

      this.emit("deed:tokenized", result);
      return result;
    } catch (error) {
      return {
        deedId,
        tokenId: "",
        nftTokenId: "",
        binding: null,
        blockchainRecordId: "",
        deedNumber: deed.deedNumber,
        property: this.formatAddress(deed),
        owner: deed.currentOwner.names.join(", "),
        status: "failed",
        txHash: null,
        ledger: null,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Tokenize the headquarters deed (135 Lake Como Dr)
   */
  async tokenizeHeadquarters(params: {
    ownerWalletAddress: string;
    signerSecret?: string;
  }): Promise<DeedTokenizationResult> {
    return this.tokenizeDeed(
      allodialDeedsPlatform.HEADQUARTERS_DEED_ID,
      {
        ...params,
        piValueType: "external",
        checkNodeHealth: true,
      }
    );
  }

  /**
   * Batch tokenize multiple deeds
   */
  async batchTokenizeDeeds(
    deedIds: string[],
    params: {
      ownerWalletAddress: string;
      signerSecret?: string;
      piValueType?: PiValueType;
    }
  ): Promise<{
    total: number;
    successful: number;
    failed: number;
    results: DeedTokenizationResult[];
  }> {
    const results: DeedTokenizationResult[] = [];
    let successful = 0;
    let failed = 0;

    for (const deedId of deedIds) {
      const result = await this.tokenizeDeed(deedId, params);
      results.push(result);
      if (result.status === "failed") {
        failed++;
      } else {
        successful++;
      }
    }

    return { total: deedIds.length, successful, failed, results };
  }

  // ==========================================================================
  // Deed Verification — Cross-check deed ↔ token ↔ blockchain
  // ==========================================================================

  /**
   * Full verification: checks deed, token, blockchain binding, and Docker node
   */
  async verifyDeed(deedId: string): Promise<DeedVerificationResult> {
    const deed = await allodialDeedsPlatform.getDeed(deedId);
    if (!deed) {
      return {
        deedId,
        tokenId: null,
        isTokenized: false,
        isBlockchainBound: false,
        isOnChainVerified: false,
        nodeConnected: false,
        deedStatus: "not-found",
        allodialStatus: "unknown",
        txHash: null,
        ledger: null,
        provenanceCount: 0,
        error: "Deed not found",
      };
    }

    const tokenId = this.deedToToken.get(deedId) || null;
    const product = tokenId ? tokenizationEngine.getProduct(tokenId) : null;
    const isTokenized = !!product;
    const isBlockchainBound = !!product?.binding;
    let isOnChainVerified = false;
    let nodeConnected = false;

    // Try to verify on-chain via Docker node bridge
    if (product?.binding?.txHash) {
      try {
        const txCheck = await dockerNodeBridge.verifyTokenizationTx(
          product.binding.txHash
        );
        isOnChainVerified = txCheck.exists && txCheck.successful;
        nodeConnected = true;
      } catch {
        // Node may not be accessible — verification inconclusive
        try {
          // Fall back to tokenization engine's own verification
          const engineVerify = await tokenizationEngine.verifyBinding(tokenId!);
          isOnChainVerified = engineVerify.verified;
        } catch {
          // Both verifications failed
        }
      }
    }

    return {
      deedId,
      tokenId,
      isTokenized,
      isBlockchainBound,
      isOnChainVerified,
      nodeConnected,
      deedStatus: deed.status,
      allodialStatus: deed.allodialStatus,
      txHash: product?.binding?.txHash || null,
      ledger: product?.binding?.ledger || null,
      provenanceCount: product?.provenance.length || 0,
    };
  }

  // ==========================================================================
  // Deed Transfers — Record on blockchain
  // ==========================================================================

  /**
   * Record a deed transfer on the blockchain via tokenization engine
   */
  async recordTransferOnChain(
    deedId: string,
    transfer: DeedTransfer,
    signerSecret: string
  ): Promise<DeedTransferOnChain> {
    const tokenId = this.deedToToken.get(deedId);
    if (!tokenId) {
      return {
        deedId,
        tokenId: "",
        transferId: transfer.id,
        fromOwner: transfer.fromOwner.names.join(", "),
        toOwner: transfer.toOwner.names.join(", "),
        consideration: transfer.consideration,
        piAmount: convertToPi(transfer.consideration),
        txHash: null,
        success: false,
        error: "Deed not tokenized — tokenize first",
      };
    }

    try {
      const result = await tokenizationEngine.transferTokens(
        {
          tokenId,
          fromAddress: transfer.fromOwner.piWalletAddress || "deed-owner",
          toAddress: transfer.toOwner.piWalletAddress || "new-owner",
          amount: 1, // PT-721: whole token transfer
          memo: `DEED:${deedId.slice(-12)}`,
        },
        signerSecret
      );

      const record: DeedTransferOnChain = {
        deedId,
        tokenId,
        transferId: transfer.id,
        fromOwner: transfer.fromOwner.names.join(", "),
        toOwner: transfer.toOwner.names.join(", "),
        consideration: transfer.consideration,
        piAmount: convertToPi(transfer.consideration),
        txHash: result.txHash || null,
        success: result.success,
        error: result.error,
      };

      this.transferLog.push(record);
      this.emit("deed:transferred", record);
      return record;
    } catch (error) {
      return {
        deedId,
        tokenId,
        transferId: transfer.id,
        fromOwner: transfer.fromOwner.names.join(", "),
        toOwner: transfer.toOwner.names.join(", "),
        consideration: transfer.consideration,
        piAmount: convertToPi(transfer.consideration),
        txHash: null,
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  // ==========================================================================
  // Queries & Lookups
  // ==========================================================================

  /**
   * Get the token ID for a deed
   */
  getTokenForDeed(deedId: string): string | null {
    return this.deedToToken.get(deedId) || null;
  }

  /**
   * Get the deed ID for a token
   */
  getDeedForToken(tokenId: string): string | null {
    return this.tokenToDeed.get(tokenId) || null;
  }

  /**
   * Get all deed-token mappings
   */
  getAllMappings(): DeedTokenMap[] {
    const mappings: DeedTokenMap[] = [];
    for (const [deedId, tokenId] of this.deedToToken.entries()) {
      const product = tokenizationEngine.getProduct(tokenId);
      const deed = allodialDeedsPlatform.getHeadquartersDeed();
      mappings.push({
        deedId,
        tokenId,
        nftTokenId: tokenId,
        txHash: product?.binding?.txHash || null,
        boundAt: product?.binding?.confirmedAt || null,
      });
    }
    return mappings;
  }

  /**
   * Get transfer history for a deed
   */
  getTransferHistory(deedId: string): DeedTransferOnChain[] {
    return this.transferLog.filter((t) => t.deedId === deedId);
  }

  /**
   * Get comprehensive connector statistics
   */
  async getStats(): Promise<ConnectorStats> {
    let platformStats = null;
    try {
      platformStats = await allodialDeedsPlatform.getPlatformStats();
    } catch {
      // Platform stats unavailable
    }

    let tokenizationStats = null;
    try {
      tokenizationStats = tokenizationEngine.getStats();
    } catch {
      // Tokenization stats unavailable
    }

    return {
      totalDeedsTokenized: this.deedToToken.size,
      totalDeedsBound: Array.from(this.deedToToken.values()).filter((tokenId) => {
        const p = tokenizationEngine.getProduct(tokenId);
        return p?.binding !== null && p?.binding !== undefined;
      }).length,
      totalTransfersRecorded: this.transferLog.length,
      pendingTokenizations: this.pendingQueue.length,
      nodeHealth: dockerNodeBridge.getLastHealth(),
      platformStats,
      tokenizationStats,
    };
  }

  // ==========================================================================
  // Docker Node Integration — Health-Aware Operations
  // ==========================================================================

  /**
   * Check if the system is ready for deed tokenization operations
   */
  async isReadyForOperations(): Promise<{
    ready: boolean;
    nodeConnected: boolean;
    blockchainSynced: boolean;
    horizonOperational: boolean;
    issues: string[];
  }> {
    const issues: string[] = [];
    let nodeConnected = false;
    let blockchainSynced = false;
    let horizonOperational = false;

    try {
      const status = await dockerNodeBridge.getDashboardStatus();
      nodeConnected = status.node.connected;
      blockchainSynced = status.blockchainSynced;
      horizonOperational = status.horizonOperational;

      if (!nodeConnected) issues.push("Pi Node Docker container not reachable");
      if (!blockchainSynced) issues.push("Stellar-core not synced");
      if (!horizonOperational) issues.push("Horizon API not operational");
      if (status.ingestionGap > 10) issues.push(`High ingestion gap: ${status.ingestionGap} ledgers`);
    } catch {
      issues.push("Cannot reach Docker Node Bridge");
    }

    return {
      ready: nodeConnected && blockchainSynced && horizonOperational,
      nodeConnected,
      blockchainSynced,
      horizonOperational,
      issues,
    };
  }

  /**
   * Full system connectivity check — Deeds ↔ Tokenization ↔ Docker ↔ Blockchain
   */
  async getConnectivityStatus(): Promise<{
    deedsPlatform: boolean;
    tokenizationEngine: boolean;
    dockerNodeBridge: boolean;
    blockchainAccess: boolean;
    mode: string;
    latestLedger: number;
    totalDeeds: number;
    totalTokenized: number;
  }> {
    let dockerConnected = false;
    let blockchainAccess = false;
    let latestLedger = 0;
    let totalDeeds = 0;

    try {
      const stats = await allodialDeedsPlatform.getPlatformStats();
      totalDeeds = stats.totalDeeds;
    } catch {
      // platform unavailable
    }

    try {
      const health = await dockerNodeBridge.getHealth();
      dockerConnected = health.connected;
      latestLedger = health.horizon?.coreLatestLedger || 0;
      blockchainAccess = health.horizon !== null;
    } catch {
      // docker bridge unavailable
    }

    return {
      deedsPlatform: true, // Always available (in-memory singleton)
      tokenizationEngine: true, // Always available
      dockerNodeBridge: dockerConnected,
      blockchainAccess,
      mode: dockerNodeBridge.getMode(),
      latestLedger,
      totalDeeds,
      totalTokenized: this.deedToToken.size,
    };
  }

  // ==========================================================================
  // Internal Helpers
  // ==========================================================================

  private buildDeedMetadata(
    deed: AllodialDeed,
    piValueType?: PiValueType
  ): TokenMetadata {
    const addr = deed.property.address;
    const fullAddress = `${addr.street}, ${addr.city}, ${addr.state} ${addr.zip}`;

    return {
      name: `Allodial Deed: ${fullAddress}`,
      symbol: `AD-${deed.deedNumber.replace(/[^A-Z0-9]/g, "").slice(0, 8)}`,
      description: [
        `Allodial deed for ${fullAddress}`,
        `Deed Number: ${deed.deedNumber}`,
        `Type: ${deed.deedType}`,
        `Status: ${deed.allodialStatus}`,
        `Owner: ${deed.currentOwner.names.join(", ")}`,
        `County: ${addr.county}, ${addr.state}`,
        deed.property.acreage > 0 ? `Acreage: ${deed.property.acreage}` : "",
        deed.property.propertyType ? `Property Type: ${deed.property.propertyType}` : "",
      ]
        .filter(Boolean)
        .join(" | "),
      attributes: {
        deedId: deed.id,
        deedNumber: deed.deedNumber,
        deedType: deed.deedType,
        isAllodial: deed.isAllodial,
        allodialStatus: deed.allodialStatus,
        propertyType: deed.property.propertyType,
        street: addr.street,
        city: addr.city,
        county: addr.county,
        state: addr.state,
        zip: addr.zip,
        country: addr.country,
        acreage: deed.property.acreage,
        squareFootage: deed.property.squareFootage,
        latitude: deed.property.coordinates.lat,
        longitude: deed.property.coordinates.lng,
        parcelNumber: deed.property.parcelNumber,
        marketValue: deed.marketValue,
        piValue: deed.piValue || convertToPi(deed.marketValue, piValueType),
        piRate: getPiRate(piValueType),
        encumbranceCount: deed.encumbrances.length,
        lienCount: deed.liens.length,
        documentCount: deed.documents.length,
      },
    };
  }

  private buildDeedCompliance(deed: AllodialDeed): Partial<ComplianceData> {
    return {
      kycVerified: deed.currentOwner.verificationStatus === "verified",
      classification: "real-estate",
      restrictedJurisdictions: [],
      accreditedOnly: false,
      maxHolders: 1, // NFT = 1 holder
      transferRestrictions: [
        "notarization-required",
        "county-recording-required",
        deed.isAllodial ? "allodial-transfer-protocol" : "standard-deed-transfer",
      ],
    };
  }

  private formatAddress(deed: AllodialDeed): string {
    const addr = deed.property.address;
    return `${addr.street}, ${addr.city}, ${addr.state} ${addr.zip}`;
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const allodialDeedsConnector = new AllodialDeedsConnector();

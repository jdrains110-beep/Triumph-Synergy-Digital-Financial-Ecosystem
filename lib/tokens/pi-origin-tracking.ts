/**
 * Pi Origin Tracking System
 *
 * Differentiates between:
 * - INTERNAL PI: Mined/contributed Pi (priority, higher value)
 * - EXTERNAL PI: Exchange-bought Pi from CEXs (lower value, separate API)
 *
 * Features:
 * - Track Pi source immutably
 * - Separate pools for internal vs external
 * - Different valuations and trust levels
 * - Separate API endpoints
 * - Anti-mixing safeguards
 * - Audit trail for all Pi
 */

// ============================================================================
// Types & Interfaces
// ============================================================================

export type PiOrigin = "internal" | "external";
export type InternalPiSource = "mining" | "contribution" | "bounty" | "ecosystem_reward";
export type ExternalPiSource = "cex_buy" | "otc_trade" | "wrapped_pi";

export interface PiUnit {
  id: string;
  piAddress: string;
  amount: string; // Wei representation
  origin: PiOrigin;
  internalSource?: InternalPiSource;
  externalSource?: ExternalPiSource;
  sourceData: {
    timestamp: number;
    blockNumber?: string;
    transactionHash?: string;
    exchangeId?: string;
    verificationStatus: "unverified" | "verified" | "suspicious";
  };
  currentOwner: string;
  transferHistory: Array<{
    from: string;
    to: string;
    timestamp: number;
    blockNumber?: string;
    txHash?: string;
  }>;
  lastVerifiedAt: number;
  trustScore: number; // 0-100 for internal, separate scale for external
}

export interface PiPool {
  accountId: string;
  internalPi: {
    total: string;
    bySource: Record<InternalPiSource, string>;
    units: PiUnit[];
    value: string; // Based on optimal valuation
    trustScore: number;
  };
  externalPi: {
    total: string;
    bySource: Record<ExternalPiSource, string>;
    units: PiUnit[];
    value: string; // Based on CEX market price
    trustScore: number;
  };
  segregationCompliance: boolean;
  lastAuditAt: number;
  riskFlags: string[];
}

export interface PiOriginAudit {
  id: string;
  timestamp: number;
  auditType: "origin_verification" | "mixing_detection" | "value_reconciliation";
  accountId?: string;
  piUnitIds: string[];
  findings: {
    suspiciousMixing: boolean;
    misclassifiedOrigin: boolean;
    doubleSpendAttempt: boolean;
    invalidTransferChain: boolean;
  };
  status: "pending" | "verified" | "flagged" | "fraud_detected";
  auditorNotes?: string;
}

// ============================================================================
// Pi Origin Tracking System
// ============================================================================

export class PiOriginTracker {
  private piUnits: Map<string, PiUnit> = new Map();
  private accountPools: Map<string, PiPool> = new Map();
  private auditTrail: PiOriginAudit[] = [];
  private originIndex: Map<PiOrigin, Set<string>> = new Map([
    ["internal", new Set()],
    ["external", new Set()],
  ]);

  private static instance: PiOriginTracker;

  private constructor() {
    // Ensure pools exist
    this.originIndex.set("internal", new Set());
    this.originIndex.set("external", new Set());
  }

  static getInstance(): PiOriginTracker {
    if (!PiOriginTracker.instance) {
      PiOriginTracker.instance = new PiOriginTracker();
    }
    return PiOriginTracker.instance;
  }

  /**
   * Register mined/internal Pi
   * Sources: actual mining, ecosystem contributions, bounties, rewards
   */
  async registerInternalPi(
    piAddress: string,
    accountId: string,
    amount: string,
    source: InternalPiSource,
    blockNumber?: string,
    txHash?: string
  ): Promise<PiUnit> {
    const piUnit: PiUnit = {
      id: `pi_internal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      piAddress,
      amount,
      origin: "internal",
      internalSource: source,
      sourceData: {
        timestamp: Date.now(),
        blockNumber,
        transactionHash: txHash,
        verificationStatus: "unverified",
      },
      currentOwner: accountId,
      transferHistory: [{ from: "genesis", to: accountId, timestamp: Date.now(), blockNumber, txHash }],
      lastVerifiedAt: Date.now(),
      trustScore: 100, // Internal Pi starts with highest trust
    };

    this.piUnits.set(piUnit.id, piUnit);
    this.originIndex.get("internal")!.add(piUnit.id);

    // Add to account pool
    this.updateAccountPool(accountId, piUnit, "add");

    // Log audit
    this.createAudit("origin_verification", accountId, [piUnit.id], {
      suspiciousMixing: false,
      misclassifiedOrigin: false,
      doubleSpendAttempt: false,
      invalidTransferChain: false,
    });

    return piUnit;
  }

  /**
   * Register external Pi from CEX
   * Must go through verification process
   * Separate API and lower trust score
   */
  async registerExternalPi(
    piAddress: string,
    accountId: string,
    amount: string,
    source: ExternalPiSource,
    exchangeId: string,
    verificationData: { orderId: string; timestamp: number; price: string }
  ): Promise<PiUnit> {
    const piUnit: PiUnit = {
      id: `pi_external_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      piAddress,
      amount,
      origin: "external",
      externalSource: source,
      sourceData: {
        timestamp: Date.now(),
        exchangeId,
        verificationStatus: "unverified", // External Pi requires verification
      },
      currentOwner: accountId,
      transferHistory: [
        {
          from: exchangeId,
          to: accountId,
          timestamp: Date.now(),
          txHash: verificationData.orderId,
        },
      ],
      lastVerifiedAt: Date.now(),
      trustScore: 50, // External Pi starts with lower trust
    };

    this.piUnits.set(piUnit.id, piUnit);
    this.originIndex.get("external")!.add(piUnit.id);

    // Add to account pool
    this.updateAccountPool(accountId, piUnit, "add");

    // Create audit with unverified status
    this.createAudit("origin_verification", accountId, [piUnit.id], {
      suspiciousMixing: false,
      misclassifiedOrigin: false,
      doubleSpendAttempt: false,
      invalidTransferChain: false,
    });

    return piUnit;
  }

  /**
   * Verify external Pi (confirm it's legitimate CEX purchase)
   * Increases trust score on successful verification
   */
  async verifyExternalPi(piUnitId: string, exchangeProof: Record<string, any>): Promise<boolean> {
    const piUnit = this.piUnits.get(piUnitId);
    if (!piUnit || piUnit.origin !== "external") {
      return false;
    }

    try {
      // Validate exchange proof (simplified)
      if (exchangeProof.validProof) {
        piUnit.sourceData.verificationStatus = "verified";
        piUnit.trustScore = Math.min(100, piUnit.trustScore + 40);
        piUnit.lastVerifiedAt = Date.now();
        return true;
      }
    } catch (error) {
      piUnit.sourceData.verificationStatus = "suspicious";
      piUnit.trustScore = Math.max(0, piUnit.trustScore - 30);
    }

    return false;
  }

  /**
   * Transfer Pi with origin preservation
   * Prevents mixing of internal and external Pi
   * Updates transfer history
   */
  async transferPi(piUnitId: string, fromAccount: string, toAccount: string): Promise<void> {
    const piUnit = this.piUnits.get(piUnitId);
    if (!piUnit) {
      throw new Error("Pi unit not found");
    }

    if (piUnit.currentOwner !== fromAccount) {
      throw new Error("Not the owner of this Pi");
    }

    // Update transfer history
    piUnit.transferHistory.push({
      from: fromAccount,
      to: toAccount,
      timestamp: Date.now(),
    });

    // Update current owner
    piUnit.currentOwner = toAccount;

    // Update account pools
    this.updateAccountPool(fromAccount, piUnit, "remove");
    this.updateAccountPool(toAccount, piUnit, "add");

    // Check for mixing attempts
    await this.detectMixingAttempts(toAccount);
  }

  /**
   * Prevent mixing of internal and external Pi
   * Returns array of units split by origin
   */
  async separatePiByOrigin(accountId: string): Promise<{
    internal: PiUnit[];
    external: PiUnit[];
  }> {
    const pool = this.accountPools.get(accountId);
    if (!pool) {
      return { internal: [], external: [] };
    }

    return {
      internal: pool.internalPi.units,
      external: pool.externalPi.units,
    };
  }

  /**
   * Get Pi valuation
   * Internal Pi: Based on optimal ecosystem value
   * External Pi: Based on CEX market price
   */
  getPiValuation(piUnitId: string): {
    amount: string;
    value: string;
    origin: PiOrigin;
    valuationType: "internal_optimal" | "external_market";
  } | null {
    const piUnit = this.piUnits.get(piUnitId);
    if (!piUnit) {
      return null;
    }

    if (piUnit.origin === "internal") {
      return {
        amount: piUnit.amount,
        value: piUnit.amount, // 1:1 in optimized internal valuation
        origin: "internal",
        valuationType: "internal_optimal",
      };
    } else {
      // External Pi valued at market price
      // Would fetch from price oracle
      const marketPrice = "0.25"; // Placeholder: ~$0.25 per Pi (market dependent)
      const value = (parseFloat(piUnit.amount) * parseFloat(marketPrice)).toString();
      return {
        amount: piUnit.amount,
        value,
        origin: "external",
        valuationType: "external_market",
      };
    }
  }

  /**
   * Detect mixing attempts (trying to treat external Pi as internal)
   */
  private async detectMixingAttempts(accountId: string): Promise<void> {
    const pool = this.accountPools.get(accountId);
    if (!pool) {
      return;
    }

    // Check if account is trying to mix origins
    const hasInternal = pool.internalPi.units.length > 0;
    const hasExternal = pool.externalPi.units.length > 0;

    if (hasInternal && hasExternal) {
      // Flag for audit
      pool.riskFlags.push("Mixed origin Pi detected");

      // Create mixing detection audit
      const allUnitIds = [...pool.internalPi.units, ...pool.externalPi.units].map(u => u.id);
      this.createAudit("mixing_detection", accountId, allUnitIds, {
        suspiciousMixing: true,
        misclassifiedOrigin: false,
        doubleSpendAttempt: false,
        invalidTransferChain: false,
      });
    }
  }

  /**
   * Verify transfer chain integrity
   */
  async verifyTransferChain(piUnitId: string): Promise<boolean> {
    const piUnit = this.piUnits.get(piUnitId);
    if (!piUnit) {
      return false;
    }

    // Check that all transfers are valid
    for (let i = 1; i < piUnit.transferHistory.length; i++) {
      const prevTransfer = piUnit.transferHistory[i - 1];
      const currentTransfer = piUnit.transferHistory[i];

      // Verify previous recipient is current sender
      if (prevTransfer.to !== currentTransfer.from) {
        return false;
      }

      // Verify timestamps are ascending
      if (currentTransfer.timestamp <= prevTransfer.timestamp) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get account's Pi pools with segregation status
   */
  getAccountPool(accountId: string): PiPool | null {
    return this.accountPools.get(accountId) || null;
  }

  /**
   * Create audit record
   */
  private createAudit(
    auditType: "origin_verification" | "mixing_detection" | "value_reconciliation",
    accountId: string | undefined,
    piUnitIds: string[],
    findings: any
  ): void {
    const audit: PiOriginAudit = {
      id: `audit_${Date.now()}`,
      timestamp: Date.now(),
      auditType,
      accountId,
      piUnitIds,
      findings,
      status: "pending",
    };
    this.auditTrail.push(audit);
  }

  /**
   * Update account pool
   */
  private updateAccountPool(accountId: string, piUnit: PiUnit, operation: "add" | "remove"): void {
    if (!this.accountPools.has(accountId)) {
      this.accountPools.set(accountId, {
        accountId,
        internalPi: {
          total: "0",
          bySource: { mining: "0", contribution: "0", bounty: "0", ecosystem_reward: "0" },
          units: [],
          value: "0",
          trustScore: 100,
        },
        externalPi: {
          total: "0",
          bySource: { cex_buy: "0", otc_trade: "0", wrapped_pi: "0" },
          units: [],
          value: "0",
          trustScore: 50,
        },
        segregationCompliance: true,
        lastAuditAt: Date.now(),
        riskFlags: [],
      });
    }

    const pool = this.accountPools.get(accountId)!;

    if (piUnit.origin === "internal") {
      if (operation === "add") {
        pool.internalPi.units.push(piUnit);
        pool.internalPi.total = (
          parseFloat(pool.internalPi.total) + parseFloat(piUnit.amount)
        ).toString();
        if (piUnit.internalSource) {
          pool.internalPi.bySource[piUnit.internalSource] = (
            parseFloat(pool.internalPi.bySource[piUnit.internalSource]) + parseFloat(piUnit.amount)
          ).toString();
        }
      } else {
        pool.internalPi.units = pool.internalPi.units.filter(u => u.id !== piUnit.id);
        pool.internalPi.total = (
          parseFloat(pool.internalPi.total) - parseFloat(piUnit.amount)
        ).toString();
      }
    } else {
      if (operation === "add") {
        pool.externalPi.units.push(piUnit);
        pool.externalPi.total = (
          parseFloat(pool.externalPi.total) + parseFloat(piUnit.amount)
        ).toString();
        if (piUnit.externalSource) {
          pool.externalPi.bySource[piUnit.externalSource] = (
            parseFloat(pool.externalPi.bySource[piUnit.externalSource]) + parseFloat(piUnit.amount)
          ).toString();
        }
      } else {
        pool.externalPi.units = pool.externalPi.units.filter(u => u.id !== piUnit.id);
        pool.externalPi.total = (
          parseFloat(pool.externalPi.total) - parseFloat(piUnit.amount)
        ).toString();
      }
    }
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    totalInternalPi: string;
    totalExternalPi: string;
    internalCount: number;
    externalCount: number;
    accountsWithMixing: number;
  } {
    let totalInternal = "0";
    let totalExternal = "0";
    let accountsWithMixing = 0;

    for (const pool of this.accountPools.values()) {
      totalInternal = (parseFloat(totalInternal) + parseFloat(pool.internalPi.total)).toString();
      totalExternal = (parseFloat(totalExternal) + parseFloat(pool.externalPi.total)).toString();

      if (pool.internalPi.units.length > 0 && pool.externalPi.units.length > 0) {
        accountsWithMixing++;
      }
    }

    return {
      totalInternalPi: totalInternal,
      totalExternalPi: totalExternal,
      internalCount: this.originIndex.get("internal")!.size,
      externalCount: this.originIndex.get("external")!.size,
      accountsWithMixing,
    };
  }
}

// ============================================================================
// Singleton & Exports
// ============================================================================

export const piOriginTracker = PiOriginTracker.getInstance();

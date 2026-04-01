/**
 * Triumph-Synergy Economic Protection System
 * 
 * ELIMINATES:
 * - Meme coins
 * - Rugpulls
 * - Market manipulation
 * - Hoarding
 * 
 * ENFORCES:
 * - 90% Pi Network payments
 * - 5% Utility tokens pegged to Pi
 * - 5% Utility crypto for real-world value
 * - Internal Pi rate protection
 * - Enterprise buy-in requirements
 * - Real-world transaction backing
 */

import { EventEmitter } from "events";

// ============================================================================
// Types
// ============================================================================

export type PaymentType = 
  | "pi-network"           // 90% - Primary
  | "utility-token"        // 5% - Pegged to Pi
  | "utility-crypto";      // 5% - Real-world backed

export type TransactionCategory = 
  | "goods"
  | "services"
  | "work"
  | "sports"
  | "entertainment"
  | "real-estate"
  | "automotive"
  | "healthcare"
  | "education"
  | "technology"
  | "manufacturing"
  | "retail"
  | "hospitality"
  | "finance"
  | "agriculture";

export type EnterpriseSize = 
  | "startup"              // < $1M
  | "small"                // $1M - $10M
  | "medium"               // $10M - $100M
  | "large"                // $100M - $1B
  | "enterprise"           // $1B - $100B
  | "mega-corp";           // $100B+

export type ManipulationAttempt = 
  | "pump-and-dump"
  | "wash-trading"
  | "spoofing"
  | "front-running"
  | "hoarding"
  | "artificial-scarcity"
  | "price-manipulation"
  | "liquidity-drain"
  | "meme-coin-launch"
  | "rugpull-attempt";

export interface PiPaymentRatio {
  piNetwork: number;       // Must be >= 90%
  utilityToken: number;    // Must be <= 5%
  utilityCrypto: number;   // Must be <= 5%
  total: number;           // Must equal 100%
}

export interface InternalPiRate {
  baseRate: number;                // Pi to USD equivalent
  lastUpdated: Date;
  stabilityIndex: number;          // 0-100 (100 = maximum stability)
  antiManipulationActive: boolean;
  oracleConsensus: number;         // Number of oracles in agreement
  blockchainAnchored: boolean;
  anchorTx?: string;
}

export interface UtilityToken {
  id: string;
  symbol: string;
  name: string;
  
  // Peg to Pi
  peggedToPi: true;
  pegRatio: number;              // 1 token = X Pi
  pegStability: number;          // 0-100
  
  // Backing
  realWorldBacking: {
    category: TransactionCategory;
    totalTransactions: number;
    totalVolume: number;         // In Pi equivalent
    activeUsers: number;
  };
  
  // Anti-manipulation
  maxSupply: number;
  circulatingSupply: number;
  mintingLocked: boolean;
  burnMechanism: boolean;
  
  // Verification
  verified: boolean;
  verificationTx?: string;
  createdAt: Date;
}

export interface EnterpriseAccess {
  id: string;
  companyName: string;
  size: EnterpriseSize;
  
  // Valuation and buy-in
  estimatedValuation: number;    // In USD
  requiredBuyIn: number;         // In Pi
  actualBuyIn: number;           // In Pi
  buyInComplete: boolean;
  
  // Access level
  accessLevel: "pending" | "basic" | "standard" | "premium" | "unlimited";
  accessFeatures: string[];
  
  // Anti-hoarding
  piHoldings: number;
  maxAllowedHoldings: number;
  holdingUtilization: number;    // % used in transactions
  hoardingViolations: number;
  
  // Transaction activity
  transactions: {
    total: number;
    volume: number;
    categories: TransactionCategory[];
    lastTransactionAt?: Date;
  };
  
  // Compliance
  kycVerified: boolean;
  antiManipulationAgreed: boolean;
  
  // Blockchain
  registrationTx?: string;
  createdAt: Date;
}

export interface Transaction {
  id: string;
  type: "payment" | "transfer" | "exchange" | "investment";
  
  // Parties
  from: string;
  to: string;
  
  // Payment breakdown (must meet ratios)
  paymentBreakdown: {
    piAmount: number;
    utilityTokenAmount?: number;
    utilityTokenSymbol?: string;
    utilityCryptoAmount?: number;
    utilityCryptoSymbol?: string;
  };
  
  // Equivalent values
  totalPiEquivalent: number;
  totalUsdEquivalent: number;
  
  // Category
  category: TransactionCategory;
  description?: string;
  
  // Real-world backing
  realWorldProof?: {
    type: "receipt" | "contract" | "delivery" | "service-completion" | "work-verified";
    proofHash: string;
    verified: boolean;
  };
  
  // Compliance
  ratioCompliant: boolean;
  antiManipulationCheck: "passed" | "flagged" | "blocked";
  
  // Blockchain
  txHash: string;
  blockNumber: number;
  confirmedAt: Date;
}

export interface ManipulationAlert {
  id: string;
  type: ManipulationAttempt;
  severity: "low" | "medium" | "high" | "critical";
  
  // Detection
  detectedAt: Date;
  detector: string;
  confidence: number;
  
  // Details
  actor?: string;
  description: string;
  evidence: string[];
  
  // Response
  status: "detected" | "investigating" | "blocked" | "resolved";
  actionTaken?: string;
  
  // Blockchain
  alertHash: string;
  recordTx?: string;
}

export interface HoardingViolation {
  id: string;
  entityId: string;
  entityType: "individual" | "enterprise";
  
  // Violation details
  piHeld: number;
  maxAllowed: number;
  utilizationRate: number;       // % actually used
  requiredUtilization: number;   // Minimum required %
  
  // Timing
  detectedAt: Date;
  gracePeriodEnds?: Date;
  
  // Penalties
  penaltyApplied: boolean;
  penaltyType?: "warning" | "fee" | "forced-distribution" | "access-revoked";
  penaltyAmount?: number;
  
  // Resolution
  status: "active" | "grace-period" | "penalized" | "resolved";
}

// ============================================================================
// Enterprise Buy-In Requirements
// ============================================================================

const ENTERPRISE_BUYIN_REQUIREMENTS: Record<EnterpriseSize, { minValuation: number; buyInPercentage: number; maxHoldingMultiple: number }> = {
  "startup": { minValuation: 0, buyInPercentage: 0.1, maxHoldingMultiple: 2 },
  "small": { minValuation: 1_000_000, buyInPercentage: 0.05, maxHoldingMultiple: 1.5 },
  "medium": { minValuation: 10_000_000, buyInPercentage: 0.02, maxHoldingMultiple: 1.3 },
  "large": { minValuation: 100_000_000, buyInPercentage: 0.01, maxHoldingMultiple: 1.2 },
  "enterprise": { minValuation: 1_000_000_000, buyInPercentage: 0.005, maxHoldingMultiple: 1.1 },
  "mega-corp": { minValuation: 100_000_000_000, buyInPercentage: 0.001, maxHoldingMultiple: 1.05 },
};

// ============================================================================
// Payment Ratio Constants
// ============================================================================

const PAYMENT_RATIOS: PiPaymentRatio = {
  piNetwork: 90,
  utilityToken: 5,
  utilityCrypto: 5,
  total: 100,
};

const MIN_UTILIZATION_RATE = 70; // Minimum % of holdings that must be used in transactions

// ============================================================================
// Economic Protection Manager
// ============================================================================

class EconomicProtectionManager extends EventEmitter {
  private static instance: EconomicProtectionManager;
  
  private internalPiRate: InternalPiRate;
  private utilityTokens: Map<string, UtilityToken> = new Map();
  private enterprises: Map<string, EnterpriseAccess> = new Map();
  private transactions: Map<string, Transaction> = new Map();
  private manipulationAlerts: Map<string, ManipulationAlert> = new Map();
  private hoardingViolations: Map<string, HoardingViolation> = new Map();
  
  // Blacklists
  private bannedPatterns: Set<string> = new Set([
    "meme", "moon", "doge", "shib", "pepe", "wojak", "inu", "elon",
    "safe", "baby", "mini", "rocket", "lambo", "hodl", "wagmi",
    "pump", "gem", "100x", "1000x", "rugproof", // Ironic rugpull terms
  ]);
  
  private blockedEntities: Set<string> = new Set();
  
  // Indexes
  private enterprisesBySize: Map<EnterpriseSize, Set<string>> = new Map();
  private transactionsByCategory: Map<TransactionCategory, Set<string>> = new Map();
  
  // Metrics
  private globalMetrics = {
    totalTransactions: 0,
    totalPiVolume: 0,
    totalUsdEquivalent: 0,
    manipulationBlocked: 0,
    rugpullsPrevented: 0,
    memeCoinsRejected: 0,
    hoardingViolations: 0,
    enterprisesOnboarded: 0,
    realWorldTransactions: 0,
  };
  
  // Monitoring
  private manipulationCheckInterval?: NodeJS.Timeout;
  private hoardingCheckInterval?: NodeJS.Timeout;
  private rateStabilityInterval?: NodeJS.Timeout;
  
  private constructor() {
    super();
    this.setMaxListeners(100);
    
    // Initialize internal Pi rate
    this.internalPiRate = {
      baseRate: 314.159,  // Pi to USD - symbolic initial rate
      lastUpdated: new Date(),
      stabilityIndex: 100,
      antiManipulationActive: true,
      oracleConsensus: 21,
      blockchainAnchored: true,
      anchorTx: `0x${Date.now().toString(16)}${Math.random().toString(16).slice(2, 10)}`,
    };
    
    this.initializeEnterpriseIndexes();
    this.startProtectionMonitoring();
  }
  
  static getInstance(): EconomicProtectionManager {
    if (!EconomicProtectionManager.instance) {
      EconomicProtectionManager.instance = new EconomicProtectionManager();
    }
    return EconomicProtectionManager.instance;
  }
  
  private initializeEnterpriseIndexes(): void {
    for (const size of Object.keys(ENTERPRISE_BUYIN_REQUIREMENTS) as EnterpriseSize[]) {
      this.enterprisesBySize.set(size, new Set());
    }
  }
  
  private startProtectionMonitoring(): void {
    // Check for manipulation every 10 seconds
    this.manipulationCheckInterval = setInterval(() => {
      this.scanForManipulation();
    }, 10000);
    
    // Check for hoarding every minute
    this.hoardingCheckInterval = setInterval(() => {
      this.checkHoardingViolations();
    }, 60000);
    
    // Stabilize rate every 30 seconds
    this.rateStabilityInterval = setInterval(() => {
      this.stabilizePiRate();
    }, 30000);
  }
  
  // ==========================================================================
  // Internal Pi Rate Management
  // ==========================================================================
  
  /**
   * Get current internal Pi rate
   */
  getInternalPiRate(): InternalPiRate {
    return { ...this.internalPiRate };
  }
  
  /**
   * Update internal Pi rate (requires oracle consensus)
   */
  updateInternalPiRate(newRate: number, oracleSignatures: string[]): InternalPiRate {
    // Require minimum oracle consensus
    if (oracleSignatures.length < 15) {
      throw new Error("Insufficient oracle consensus (minimum 15 required)");
    }
    
    // Prevent extreme rate changes (max 5% per update)
    const maxChange = this.internalPiRate.baseRate * 0.05;
    const change = Math.abs(newRate - this.internalPiRate.baseRate);
    
    if (change > maxChange) {
      throw new Error("Rate change exceeds maximum allowed (5%)");
    }
    
    this.internalPiRate.baseRate = newRate;
    this.internalPiRate.lastUpdated = new Date();
    this.internalPiRate.oracleConsensus = oracleSignatures.length;
    this.internalPiRate.anchorTx = `0x${Date.now().toString(16)}${Math.random().toString(16).slice(2, 10)}`;
    
    this.emit("pi-rate-updated", { rate: this.internalPiRate });
    return this.internalPiRate;
  }
  
  private stabilizePiRate(): void {
    // Maintain stability through algorithmic adjustment
    const volatility = Math.random() * 0.01; // Simulated volatility
    
    if (volatility > 0.005) {
      // Apply stabilization
      this.internalPiRate.stabilityIndex = Math.max(90, this.internalPiRate.stabilityIndex - 1);
    } else {
      this.internalPiRate.stabilityIndex = Math.min(100, this.internalPiRate.stabilityIndex + 0.5);
    }
  }
  
  // ==========================================================================
  // Utility Token Management
  // ==========================================================================
  
  /**
   * Register a utility token (must be pegged to Pi)
   */
  registerUtilityToken(params: {
    symbol: string;
    name: string;
    pegRatio: number;
    category: TransactionCategory;
    maxSupply: number;
    burnMechanism?: boolean;
  }): UtilityToken {
    // Check for meme coin patterns
    const lowerSymbol = params.symbol.toLowerCase();
    const lowerName = params.name.toLowerCase();
    
    for (const pattern of this.bannedPatterns) {
      if (lowerSymbol.includes(pattern) || lowerName.includes(pattern)) {
        this.globalMetrics.memeCoinsRejected++;
        throw new Error(`Token rejected: Contains banned pattern "${pattern}". No meme coins allowed.`);
      }
    }
    
    const id = `token-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    
    const token: UtilityToken = {
      id,
      symbol: params.symbol.toUpperCase(),
      name: params.name,
      peggedToPi: true,
      pegRatio: params.pegRatio,
      pegStability: 100,
      realWorldBacking: {
        category: params.category,
        totalTransactions: 0,
        totalVolume: 0,
        activeUsers: 0,
      },
      maxSupply: params.maxSupply,
      circulatingSupply: 0,
      mintingLocked: false,
      burnMechanism: params.burnMechanism ?? true,
      verified: false,
      createdAt: new Date(),
    };
    
    this.utilityTokens.set(id, token);
    
    this.emit("utility-token-registered", { token });
    return token;
  }
  
  /**
   * Verify utility token (requires real-world transaction backing)
   */
  verifyUtilityToken(tokenId: string): UtilityToken {
    const token = this.utilityTokens.get(tokenId);
    if (!token) throw new Error("Token not found");
    
    // Require minimum real-world backing
    if (token.realWorldBacking.totalTransactions < 100) {
      throw new Error("Insufficient real-world transactions (minimum 100 required)");
    }
    
    if (token.realWorldBacking.activeUsers < 50) {
      throw new Error("Insufficient active users (minimum 50 required)");
    }
    
    token.verified = true;
    token.verificationTx = `0x${Date.now().toString(16)}${Math.random().toString(16).slice(2, 10)}`;
    
    this.emit("utility-token-verified", { token });
    return token;
  }
  
  /**
   * Check if token is attempting rugpull
   */
  checkRugpullAttempt(tokenId: string): boolean {
    const token = this.utilityTokens.get(tokenId);
    if (!token) return false;
    
    // Rugpull indicators
    const indicators = {
      largeMintIncrease: token.circulatingSupply > token.maxSupply * 0.9,
      lowUtilization: token.realWorldBacking.totalTransactions < 10,
      pegDestabilized: token.pegStability < 50,
      noActiveUsers: token.realWorldBacking.activeUsers < 5,
    };
    
    const rugpullScore = Object.values(indicators).filter(Boolean).length;
    
    if (rugpullScore >= 3) {
      this.createManipulationAlert({
        type: "rugpull-attempt",
        severity: "critical",
        actor: tokenId,
        description: `Potential rugpull detected for token ${token.symbol}`,
        evidence: Object.entries(indicators)
          .filter(([, v]) => v)
          .map(([k]) => k),
      });
      
      // Lock minting immediately
      token.mintingLocked = true;
      this.globalMetrics.rugpullsPrevented++;
      
      return true;
    }
    
    return false;
  }
  
  // ==========================================================================
  // Enterprise Access Management
  // ==========================================================================
  
  /**
   * Register enterprise for ecosystem access
   */
  registerEnterprise(params: {
    companyName: string;
    estimatedValuation: number;
    kycDocuments?: string[];
  }): EnterpriseAccess {
    // Determine size
    let size: EnterpriseSize;
    if (params.estimatedValuation >= 100_000_000_000) size = "mega-corp";
    else if (params.estimatedValuation >= 1_000_000_000) size = "enterprise";
    else if (params.estimatedValuation >= 100_000_000) size = "large";
    else if (params.estimatedValuation >= 10_000_000) size = "medium";
    else if (params.estimatedValuation >= 1_000_000) size = "small";
    else size = "startup";
    
    const requirements = ENTERPRISE_BUYIN_REQUIREMENTS[size];
    const requiredBuyIn = (params.estimatedValuation * requirements.buyInPercentage) / this.internalPiRate.baseRate;
    const maxAllowedHoldings = requiredBuyIn * requirements.maxHoldingMultiple;
    
    const id = `enterprise-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    
    const enterprise: EnterpriseAccess = {
      id,
      companyName: params.companyName,
      size,
      estimatedValuation: params.estimatedValuation,
      requiredBuyIn,
      actualBuyIn: 0,
      buyInComplete: false,
      accessLevel: "pending",
      accessFeatures: [],
      piHoldings: 0,
      maxAllowedHoldings,
      holdingUtilization: 0,
      hoardingViolations: 0,
      transactions: {
        total: 0,
        volume: 0,
        categories: [],
        lastTransactionAt: undefined,
      },
      kycVerified: false,
      antiManipulationAgreed: false,
      createdAt: new Date(),
    };
    
    this.enterprises.set(id, enterprise);
    this.enterprisesBySize.get(size)!.add(id);
    
    this.emit("enterprise-registered", { enterprise, requiredBuyIn });
    return enterprise;
  }
  
  /**
   * Process enterprise buy-in
   */
  processEnterpriseBuyIn(enterpriseId: string, piAmount: number, txHash: string): EnterpriseAccess {
    const enterprise = this.enterprises.get(enterpriseId);
    if (!enterprise) throw new Error("Enterprise not found");
    
    if (!enterprise.antiManipulationAgreed) {
      throw new Error("Enterprise must agree to anti-manipulation terms");
    }
    
    enterprise.actualBuyIn += piAmount;
    enterprise.piHoldings += piAmount;
    
    // Check if buy-in complete
    if (enterprise.actualBuyIn >= enterprise.requiredBuyIn) {
      enterprise.buyInComplete = true;
      enterprise.accessLevel = this.determineAccessLevel(enterprise);
      enterprise.accessFeatures = this.getAccessFeatures(enterprise.accessLevel);
      this.globalMetrics.enterprisesOnboarded++;
    }
    
    enterprise.registrationTx = txHash;
    
    this.emit("enterprise-buyin", { enterprise, piAmount });
    return enterprise;
  }
  
  private determineAccessLevel(enterprise: EnterpriseAccess): EnterpriseAccess["accessLevel"] {
    if (!enterprise.buyInComplete) return "pending";
    if (!enterprise.kycVerified) return "basic";
    
    const overpayRatio = enterprise.actualBuyIn / enterprise.requiredBuyIn;
    
    if (overpayRatio >= 3) return "unlimited";
    if (overpayRatio >= 2) return "premium";
    return "standard";
  }
  
  private getAccessFeatures(level: EnterpriseAccess["accessLevel"]): string[] {
    const features: Record<string, string[]> = {
      "pending": [],
      "basic": ["view-marketplace", "basic-transactions"],
      "standard": ["view-marketplace", "basic-transactions", "bulk-orders", "api-access"],
      "premium": ["view-marketplace", "basic-transactions", "bulk-orders", "api-access", "analytics", "priority-support"],
      "unlimited": ["view-marketplace", "basic-transactions", "bulk-orders", "api-access", "analytics", "priority-support", "white-label", "custom-integration"],
    };
    return features[level] || [];
  }
  
  /**
   * Sign anti-manipulation agreement
   */
  signAntiManipulationAgreement(enterpriseId: string, signatureHash: string): EnterpriseAccess {
    const enterprise = this.enterprises.get(enterpriseId);
    if (!enterprise) throw new Error("Enterprise not found");
    
    enterprise.antiManipulationAgreed = true;
    
    this.emit("anti-manipulation-agreed", { enterpriseId, signatureHash });
    return enterprise;
  }
  
  // ==========================================================================
  // Transaction Processing
  // ==========================================================================
  
  /**
   * Process a transaction (enforces payment ratios)
   */
  processTransaction(params: {
    from: string;
    to: string;
    type: Transaction["type"];
    category: TransactionCategory;
    paymentBreakdown: Transaction["paymentBreakdown"];
    description?: string;
    realWorldProof?: Transaction["realWorldProof"];
  }): Transaction {
    // Calculate totals
    const piAmount = params.paymentBreakdown.piAmount;
    let utilityTokenPiEquivalent = 0;
    let utilityCryptoPiEquivalent = 0;
    
    if (params.paymentBreakdown.utilityTokenAmount && params.paymentBreakdown.utilityTokenSymbol) {
      const token = this.findTokenBySymbol(params.paymentBreakdown.utilityTokenSymbol);
      if (token) {
        utilityTokenPiEquivalent = params.paymentBreakdown.utilityTokenAmount * token.pegRatio;
      }
    }
    
    if (params.paymentBreakdown.utilityCryptoAmount) {
      utilityCryptoPiEquivalent = params.paymentBreakdown.utilityCryptoAmount;
    }
    
    const totalPiEquivalent = piAmount + utilityTokenPiEquivalent + utilityCryptoPiEquivalent;
    
    // Check payment ratio compliance
    const piPercentage = (piAmount / totalPiEquivalent) * 100;
    const utilityTokenPercentage = (utilityTokenPiEquivalent / totalPiEquivalent) * 100;
    const utilityCryptoPercentage = (utilityCryptoPiEquivalent / totalPiEquivalent) * 100;
    
    const ratioCompliant = 
      piPercentage >= PAYMENT_RATIOS.piNetwork &&
      utilityTokenPercentage <= PAYMENT_RATIOS.utilityToken &&
      utilityCryptoPercentage <= PAYMENT_RATIOS.utilityCrypto;
    
    if (!ratioCompliant) {
      throw new Error(
        `Payment ratio violation: Pi must be >= 90%, got ${piPercentage.toFixed(1)}%. ` +
        `Utility tokens must be <= 5%, got ${utilityTokenPercentage.toFixed(1)}%. ` +
        `Utility crypto must be <= 5%, got ${utilityCryptoPercentage.toFixed(1)}%.`
      );
    }
    
    // Anti-manipulation check
    const manipulationCheck = this.checkTransactionManipulation(params);
    
    if (manipulationCheck === "blocked") {
      this.globalMetrics.manipulationBlocked++;
      throw new Error("Transaction blocked: Manipulation detected");
    }
    
    const id = `tx-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    
    const transaction: Transaction = {
      id,
      type: params.type,
      from: params.from,
      to: params.to,
      paymentBreakdown: params.paymentBreakdown,
      totalPiEquivalent,
      totalUsdEquivalent: totalPiEquivalent * this.internalPiRate.baseRate,
      category: params.category,
      description: params.description,
      realWorldProof: params.realWorldProof,
      ratioCompliant: true,
      antiManipulationCheck: manipulationCheck,
      txHash: `0x${Date.now().toString(16)}${Math.random().toString(16).slice(2, 10)}`,
      blockNumber: Math.floor(Date.now() / 10000),
      confirmedAt: new Date(),
    };
    
    this.transactions.set(id, transaction);
    
    // Index by category
    if (!this.transactionsByCategory.has(params.category)) {
      this.transactionsByCategory.set(params.category, new Set());
    }
    this.transactionsByCategory.get(params.category)!.add(id);
    
    // Update metrics
    this.globalMetrics.totalTransactions++;
    this.globalMetrics.totalPiVolume += totalPiEquivalent;
    this.globalMetrics.totalUsdEquivalent += transaction.totalUsdEquivalent;
    
    if (params.realWorldProof?.verified) {
      this.globalMetrics.realWorldTransactions++;
    }
    
    // Update utility token metrics
    if (params.paymentBreakdown.utilityTokenSymbol) {
      const token = this.findTokenBySymbol(params.paymentBreakdown.utilityTokenSymbol);
      if (token) {
        token.realWorldBacking.totalTransactions++;
        token.realWorldBacking.totalVolume += utilityTokenPiEquivalent;
      }
    }
    
    // Update enterprise metrics
    this.updateEnterpriseTransaction(params.from, transaction);
    this.updateEnterpriseTransaction(params.to, transaction);
    
    this.emit("transaction-processed", { transaction });
    return transaction;
  }
  
  private findTokenBySymbol(symbol: string): UtilityToken | undefined {
    for (const token of this.utilityTokens.values()) {
      if (token.symbol === symbol.toUpperCase()) {
        return token;
      }
    }
    return undefined;
  }
  
  private checkTransactionManipulation(params: {
    from: string;
    to: string;
    type: Transaction["type"];
    paymentBreakdown: Transaction["paymentBreakdown"];
  }): "passed" | "flagged" | "blocked" {
    // Check if entities are blocked
    if (this.blockedEntities.has(params.from) || this.blockedEntities.has(params.to)) {
      return "blocked";
    }
    
    // Check for wash trading (same entity)
    if (params.from === params.to) {
      return "blocked";
    }
    
    // Check for suspiciously large amounts (potential manipulation)
    const totalPi = params.paymentBreakdown.piAmount;
    if (totalPi > 1_000_000) { // 1M Pi threshold
      return "flagged";
    }
    
    return "passed";
  }
  
  private updateEnterpriseTransaction(entityId: string, transaction: Transaction): void {
    const enterprise = this.enterprises.get(entityId);
    if (!enterprise) return;
    
    enterprise.transactions.total++;
    enterprise.transactions.volume += transaction.totalPiEquivalent;
    enterprise.transactions.lastTransactionAt = new Date();
    
    if (!enterprise.transactions.categories.includes(transaction.category)) {
      enterprise.transactions.categories.push(transaction.category);
    }
    
    // Update holding utilization
    if (enterprise.piHoldings > 0) {
      enterprise.holdingUtilization = 
        (enterprise.transactions.volume / enterprise.piHoldings) * 100;
    }
  }
  
  // ==========================================================================
  // Anti-Manipulation System
  // ==========================================================================
  
  /**
   * Create manipulation alert
   */
  createManipulationAlert(params: {
    type: ManipulationAttempt;
    severity: ManipulationAlert["severity"];
    actor?: string;
    description: string;
    evidence: string[];
  }): ManipulationAlert {
    const id = `alert-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    
    const alert: ManipulationAlert = {
      id,
      type: params.type,
      severity: params.severity,
      detectedAt: new Date(),
      detector: "economic-protection-system",
      confidence: 0.85 + Math.random() * 0.15,
      actor: params.actor,
      description: params.description,
      evidence: params.evidence,
      status: "detected",
      alertHash: this.computeHash(JSON.stringify(params)),
      recordTx: `0x${Date.now().toString(16)}${Math.random().toString(16).slice(2, 10)}`,
    };
    
    this.manipulationAlerts.set(id, alert);
    
    // Auto-block for critical severity
    if (params.severity === "critical" && params.actor) {
      this.blockedEntities.add(params.actor);
      alert.status = "blocked";
      alert.actionTaken = "Entity blocked from ecosystem";
    }
    
    this.emit("manipulation-detected", { alert });
    return alert;
  }
  
  private scanForManipulation(): void {
    // Scan recent transactions for patterns
    const recentTxs = Array.from(this.transactions.values())
      .filter(tx => Date.now() - tx.confirmedAt.getTime() < 3600000); // Last hour
    
    // Check for pump-and-dump patterns
    const volumeByToken: Map<string, number> = new Map();
    for (const tx of recentTxs) {
      if (tx.paymentBreakdown.utilityTokenSymbol) {
        const symbol = tx.paymentBreakdown.utilityTokenSymbol;
        volumeByToken.set(symbol, (volumeByToken.get(symbol) || 0) + (tx.paymentBreakdown.utilityTokenAmount || 0));
      }
    }
    
    // Alert on unusual volume spikes
    for (const [symbol, volume] of volumeByToken) {
      if (volume > 100000) { // High volume threshold
        this.createManipulationAlert({
          type: "pump-and-dump",
          severity: "medium",
          description: `Unusual volume detected for ${symbol}: ${volume.toLocaleString()} tokens`,
          evidence: ["high-volume", "recent-activity"],
        });
      }
    }
  }
  
  // ==========================================================================
  // Anti-Hoarding System
  // ==========================================================================
  
  private checkHoardingViolations(): void {
    for (const enterprise of this.enterprises.values()) {
      // Check if holdings exceed allowed amount
      if (enterprise.piHoldings > enterprise.maxAllowedHoldings) {
        this.createHoardingViolation(enterprise, "excess-holdings");
      }
      
      // Check if utilization is too low
      if (enterprise.piHoldings > 10000 && enterprise.holdingUtilization < MIN_UTILIZATION_RATE) {
        this.createHoardingViolation(enterprise, "low-utilization");
      }
    }
  }
  
  private createHoardingViolation(enterprise: EnterpriseAccess, reason: string): void {
    // Check for existing active violation
    for (const violation of this.hoardingViolations.values()) {
      if (violation.entityId === enterprise.id && violation.status === "active") {
        return; // Already has active violation
      }
    }
    
    const id = `hoard-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    
    const gracePeriodEnds = new Date();
    gracePeriodEnds.setDate(gracePeriodEnds.getDate() + 7); // 7 day grace period
    
    const violation: HoardingViolation = {
      id,
      entityId: enterprise.id,
      entityType: "enterprise",
      piHeld: enterprise.piHoldings,
      maxAllowed: enterprise.maxAllowedHoldings,
      utilizationRate: enterprise.holdingUtilization,
      requiredUtilization: MIN_UTILIZATION_RATE,
      detectedAt: new Date(),
      gracePeriodEnds,
      penaltyApplied: false,
      status: "grace-period",
    };
    
    this.hoardingViolations.set(id, violation);
    enterprise.hoardingViolations++;
    this.globalMetrics.hoardingViolations++;
    
    this.emit("hoarding-violation", { violation, enterprise });
  }
  
  /**
   * Resolve hoarding violation through proper distribution
   */
  resolveHoardingViolation(violationId: string, distributionTx: string): HoardingViolation {
    const violation = this.hoardingViolations.get(violationId);
    if (!violation) throw new Error("Violation not found");
    
    violation.status = "resolved";
    
    // Update enterprise
    const enterprise = this.enterprises.get(violation.entityId);
    if (enterprise) {
      enterprise.piHoldings = Math.min(enterprise.piHoldings, enterprise.maxAllowedHoldings);
    }
    
    this.emit("hoarding-resolved", { violation, distributionTx });
    return violation;
  }
  
  // ==========================================================================
  // Queries
  // ==========================================================================
  
  getPaymentRatios(): PiPaymentRatio {
    return { ...PAYMENT_RATIOS };
  }
  
  getEnterpriseBuyInRequirements(): typeof ENTERPRISE_BUYIN_REQUIREMENTS {
    return { ...ENTERPRISE_BUYIN_REQUIREMENTS };
  }
  
  getUtilityToken(tokenId: string): UtilityToken | undefined {
    return this.utilityTokens.get(tokenId);
  }
  
  getAllUtilityTokens(): UtilityToken[] {
    return Array.from(this.utilityTokens.values());
  }
  
  getEnterprise(enterpriseId: string): EnterpriseAccess | undefined {
    return this.enterprises.get(enterpriseId);
  }
  
  getEnterprisesBySize(size: EnterpriseSize): EnterpriseAccess[] {
    const ids = this.enterprisesBySize.get(size);
    if (!ids) return [];
    return Array.from(ids).map(id => this.enterprises.get(id)!).filter(e => e);
  }
  
  getTransaction(txId: string): Transaction | undefined {
    return this.transactions.get(txId);
  }
  
  getTransactionsByCategory(category: TransactionCategory): Transaction[] {
    const ids = this.transactionsByCategory.get(category);
    if (!ids) return [];
    return Array.from(ids).map(id => this.transactions.get(id)!).filter(t => t);
  }
  
  getManipulationAlerts(status?: ManipulationAlert["status"]): ManipulationAlert[] {
    let alerts = Array.from(this.manipulationAlerts.values());
    if (status) {
      alerts = alerts.filter(a => a.status === status);
    }
    return alerts.sort((a, b) => b.detectedAt.getTime() - a.detectedAt.getTime());
  }
  
  getGlobalMetrics(): typeof this.globalMetrics {
    return { ...this.globalMetrics };
  }
  
  getStatistics(): {
    piRate: { current: number; stability: number; usdEquivalent: number };
    payments: { piPercentage: number; utilityTokenPercentage: number; utilityCryptoPercentage: number };
    tokens: { total: number; verified: number; memeCoinsRejected: number };
    enterprises: { total: number; bySize: Record<string, number>; totalBuyIn: number };
    transactions: { total: number; volume: number; realWorldBacked: number };
    protection: { manipulationBlocked: number; rugpullsPrevented: number; hoardingViolations: number };
  } {
    const enterprisesBySize: Record<string, number> = {};
    let totalBuyIn = 0;
    
    for (const [size, ids] of this.enterprisesBySize) {
      enterprisesBySize[size] = ids.size;
    }
    
    for (const enterprise of this.enterprises.values()) {
      totalBuyIn += enterprise.actualBuyIn;
    }
    
    let verifiedTokens = 0;
    for (const token of this.utilityTokens.values()) {
      if (token.verified) verifiedTokens++;
    }
    
    return {
      piRate: {
        current: this.internalPiRate.baseRate,
        stability: this.internalPiRate.stabilityIndex,
        usdEquivalent: this.globalMetrics.totalUsdEquivalent,
      },
      payments: {
        piPercentage: PAYMENT_RATIOS.piNetwork,
        utilityTokenPercentage: PAYMENT_RATIOS.utilityToken,
        utilityCryptoPercentage: PAYMENT_RATIOS.utilityCrypto,
      },
      tokens: {
        total: this.utilityTokens.size,
        verified: verifiedTokens,
        memeCoinsRejected: this.globalMetrics.memeCoinsRejected,
      },
      enterprises: {
        total: this.enterprises.size,
        bySize: enterprisesBySize,
        totalBuyIn,
      },
      transactions: {
        total: this.globalMetrics.totalTransactions,
        volume: this.globalMetrics.totalPiVolume,
        realWorldBacked: this.globalMetrics.realWorldTransactions,
      },
      protection: {
        manipulationBlocked: this.globalMetrics.manipulationBlocked,
        rugpullsPrevented: this.globalMetrics.rugpullsPrevented,
        hoardingViolations: this.globalMetrics.hoardingViolations,
      },
    };
  }
  
  private computeHash(content: string): string {
    const chars = "0123456789abcdef";
    let hash = "";
    let sum = 0;
    for (let i = 0; i < content.length; i++) {
      sum = (sum + content.charCodeAt(i) * (i + 1)) % 1000000000;
    }
    for (let i = 0; i < 64; i++) {
      hash += chars[(sum * (i + 1)) % 16];
    }
    return hash;
  }
}

// ============================================================================
// Exports
// ============================================================================

export const economicProtection = EconomicProtectionManager.getInstance();

export { EconomicProtectionManager };

export { PAYMENT_RATIOS, ENTERPRISE_BUYIN_REQUIREMENTS, MIN_UTILIZATION_RATE };

/**
 * Triumph-Synergy Quantum Mining Infrastructure
 *
 * Digital Financial Ecosystem powered by Quantum Computing & Quantum Resistance
 * Internal Pi Mining Hub with dynamic rates based on company participation
 *
 * All mined Pi is allocated by the Owner for infrastructure and ecosystem growth
 */

// ============================================================================
// DUAL PI VALUE SYSTEM
// ============================================================================

const PI_INTERNAL_RATE = 314_159; // $314,159 per Pi (internal/ecosystem)
const PI_EXTERNAL_RATE = 314.159; // $314.159 per Pi (external/market)
const PI_INTERNAL_MULTIPLIER = 1000;

type PiValueType = "internal" | "external";

function getPiRate(type: PiValueType): number {
  return type === "internal" ? PI_INTERNAL_RATE : PI_EXTERNAL_RATE;
}

// ============================================================================
// QUANTUM COMPUTING TYPES
// ============================================================================

export type QuantumProcessorType =
  | "superconducting"
  | "trapped-ion"
  | "photonic"
  | "topological"
  | "neutral-atom"
  | "quantum-annealing";

export type QuantumAlgorithm =
  | "shors" // Factoring
  | "grovers" // Search
  | "qaoa" // Optimization
  | "vqe" // Variational Quantum Eigensolver
  | "qml" // Quantum Machine Learning
  | "quantum-walk" // Graph algorithms
  | "hhl" // Linear systems
  | "pi-consensus"; // Custom Pi Network consensus

export type QuantumResistanceLevel =
  | "standard" // 128-bit post-quantum
  | "enhanced" // 256-bit post-quantum
  | "maximum" // 512-bit post-quantum
  | "military-grade"; // 1024-bit post-quantum

export type CryptographicSuite =
  | "crystals-kyber" // Key encapsulation
  | "crystals-dilithium" // Digital signatures
  | "falcon" // Compact signatures
  | "sphincs-plus" // Hash-based signatures
  | "ntru" // Lattice-based encryption
  | "classic-mceliece" // Code-based encryption
  | "sike" // Isogeny-based (backup)
  | "triumph-hybrid"; // Our custom hybrid approach

// ============================================================================
// MINING TYPES
// ============================================================================

export type MiningNodeType =
  | "quantum-core" // Full quantum processing node
  | "hybrid" // Quantum-classical hybrid
  | "classical-optimized" // Optimized classical with quantum algorithms
  | "edge" // Edge computing node
  | "mobile" // Mobile mining node
  | "institutional"; // Enterprise-grade node

export type MiningAllocationCategory =
  | "infrastructure"
  | "research-development"
  | "community-rewards"
  | "partner-incentives"
  | "liquidity-pool"
  | "emergency-reserve"
  | "ubi-funding"
  | "owner-discretionary";

export type CompanyTier =
  | "pioneer" // Early adopters
  | "partner" // Standard partners
  | "enterprise" // Large enterprises
  | "institutional" // Banks, governments
  | "founding"; // Founding members

// ============================================================================
// QUANTUM PROCESSOR INTERFACE
// ============================================================================

export type QuantumProcessor = {
  id: string;
  name: string;
  type: QuantumProcessorType;

  // Specifications
  qubits: number;
  logicalQubits: number;
  coherenceTime: number; // microseconds
  gateErrorRate: number;
  readoutErrorRate: number;

  // Performance
  quantumVolume: number;
  clopsScore: number; // Circuit Layer Operations Per Second

  // Connectivity
  connectivity: "all-to-all" | "linear" | "grid" | "heavy-hex" | "custom";

  // Status
  status: "online" | "calibrating" | "maintenance" | "offline";
  uptime: number; // percentage
  temperature: number; // millikelvin

  // Mining Capability
  miningHashRate: number; // Quantum hash operations per second
  piMiningEfficiency: number; // Pi mined per quantum operation

  // Location
  dataCenter: string;
  region: string;

  lastCalibration: Date;
  createdAt: Date;
};

export type QuantumSecurityModule = {
  id: string;

  // Resistance Level
  resistanceLevel: QuantumResistanceLevel;

  // Cryptographic Suites
  primarySuite: CryptographicSuite;
  backupSuites: CryptographicSuite[];

  // Key Management
  keyLength: number;
  keyRotationInterval: number; // hours
  lastKeyRotation: Date;

  // Entropy
  quantumRandomness: boolean;
  entropySource: "quantum" | "hybrid" | "hardware";
  entropyRate: number; // bits per second

  // Verification
  postQuantumVerified: boolean;
  nistCompliant: boolean;

  // Status
  status: "active" | "rotating" | "upgrading";
  threatsBlocked: number;

  createdAt: Date;
  updatedAt: Date;
};

// ============================================================================
// MINING NODE INTERFACE
// ============================================================================

export type MiningNode = {
  id: string;
  ownerId: string;
  name: string;
  type: MiningNodeType;

  // Hardware
  quantumProcessorId: string | null;
  classicalCores: number;
  memoryGB: number;
  storageGB: number;

  // Mining Performance
  hashRate: number;
  quantumBoost: number; // multiplier from quantum processing
  effectiveHashRate: number;

  // Pi Mining
  piMinedTotal: number;
  piMinedToday: number;
  piMinedThisMonth: number;
  miningEfficiency: number;

  // Network Contribution
  blocksValidated: number;
  transactionsProcessed: number;
  consensusParticipation: number; // percentage

  // Rewards
  baseRewardRate: number;
  companyBonusMultiplier: number;
  networkBonusMultiplier: number;
  totalRewardRate: number;

  // Status
  status: "mining" | "idle" | "syncing" | "maintenance" | "offline";
  uptime: number;
  lastBlock: Date;

  // Location
  region: string;
  dataCenter: string;

  createdAt: Date;
  updatedAt: Date;
};

// ============================================================================
// COMPANY PARTICIPANT INTERFACE
// ============================================================================

export type MiningCompany = {
  id: string;
  name: string;
  tier: CompanyTier;

  // Registration
  registrationDate: Date;
  verified: boolean;
  kycCompleted: boolean;

  // Mining Contribution
  nodesDeployed: number;
  totalHashRate: number;
  quantumNodesCount: number;
  networkSharePercent: number;

  // Pi Holdings
  piMined: number;
  piMinedValue: number;
  piMinedValueInternal: number;

  // Rewards
  monthlyMiningReward: number;
  bonusMultiplier: number;
  tierBonus: number;
  networkContributionBonus: number;

  // Impact on Network
  rateContribution: number; // How much this company increases mining rates

  // Subscription
  subscriptionTier: "basic" | "professional" | "enterprise" | "unlimited";
  subscriptionPrice: number;
  subscriptionPriceInPi: number;

  // Contact
  primaryContact: string;
  email: string;

  createdAt: Date;
  updatedAt: Date;
};

// ============================================================================
// MINING ALLOCATION INTERFACE
// ============================================================================

export type MiningAllocation = {
  id: string;
  category: MiningAllocationCategory;

  // Allocation Details
  percentage: number;
  piAllocated: number;
  piAllocatedValue: number;
  piAllocatedValueInternal: number;

  // Usage
  piUsed: number;
  piRemaining: number;

  // Owner Control
  ownerApproved: boolean;
  ownerNotes: string;
  lastOwnerReview: Date;

  // Purpose
  description: string;
  projects: string[];

  // Period
  periodStart: Date;
  periodEnd: Date;

  createdAt: Date;
  updatedAt: Date;
};

// ============================================================================
// NETWORK METRICS INTERFACE
// ============================================================================

export type NetworkMetrics = {
  // Overall Network
  totalNodes: number;
  quantumNodes: number;
  hybridNodes: number;
  classicalNodes: number;

  // Companies
  totalCompanies: number;
  activeCompanies: number;
  companiesByTier: Record<CompanyTier, number>;

  // Mining Rates
  baseRatePiPerHour: number;
  currentRatePiPerHour: number;
  networkBoostMultiplier: number;
  companyCountBonus: number;

  // Pi Metrics
  totalPiMined: number;
  totalPiMinedValue: number;
  totalPiMinedValueInternal: number;
  piMinedToday: number;
  piMinedThisMonth: number;

  // Hash Rate
  totalHashRate: number;
  quantumHashRate: number;
  averageNodeHashRate: number;

  // Quantum Security
  quantumResistanceActive: boolean;
  threatsBlockedTotal: number;
  securityLevel: QuantumResistanceLevel;

  // Uptime
  networkUptime: number;
  averageNodeUptime: number;

  lastUpdated: Date;
};

// ============================================================================
// SUBSCRIPTION PLANS
// ============================================================================

export type MiningSubscription = {
  tier: "basic" | "professional" | "enterprise" | "unlimited";
  name: string;

  // Pricing
  monthlyPrice: number;
  monthlyPriceInPi: number;
  annualPrice: number;
  annualPriceInPi: number;

  // Features
  maxNodes: number | "unlimited";
  quantumAccessLevel: "none" | "shared" | "dedicated" | "exclusive";
  hashRateBonus: number;
  prioritySupport: boolean;
  apiAccess: boolean;
  customAllocations: boolean;

  // Mining Benefits
  baseRewardMultiplier: number;
  piPayoutBonus: number;

  features: string[];
};

// ============================================================================
// QUANTUM MINING INFRASTRUCTURE CLASS
// ============================================================================

class QuantumMiningInfrastructure {
  private readonly quantumProcessors: Map<string, QuantumProcessor> = new Map();
  private readonly securityModules: Map<string, QuantumSecurityModule> =
    new Map();
  private readonly miningNodes: Map<string, MiningNode> = new Map();
  private readonly companies: Map<string, MiningCompany> = new Map();
  private readonly allocations: Map<string, MiningAllocation> = new Map();

  // Network state
  private readonly networkMetrics: NetworkMetrics;

  // Mining rate formula constants
  private readonly BASE_MINING_RATE = 100; // Base Pi per hour for the network
  private readonly COMPANY_RATE_BOOST = 0.05; // 5% increase per company
  private readonly QUANTUM_NODE_BOOST = 0.1; // 10% boost per quantum node
  private readonly MAX_RATE_MULTIPLIER = 10; // Maximum 10x base rate

  constructor() {
    this.networkMetrics = this.initializeMetrics();
    this.initializeQuantumInfrastructure();
    this.initializeAllocations();
  }

  private initializeMetrics(): NetworkMetrics {
    return {
      totalNodes: 0,
      quantumNodes: 0,
      hybridNodes: 0,
      classicalNodes: 0,
      totalCompanies: 0,
      activeCompanies: 0,
      companiesByTier: {
        pioneer: 0,
        partner: 0,
        enterprise: 0,
        institutional: 0,
        founding: 0,
      },
      baseRatePiPerHour: this.BASE_MINING_RATE,
      currentRatePiPerHour: this.BASE_MINING_RATE,
      networkBoostMultiplier: 1,
      companyCountBonus: 0,
      totalPiMined: 0,
      totalPiMinedValue: 0,
      totalPiMinedValueInternal: 0,
      piMinedToday: 0,
      piMinedThisMonth: 0,
      totalHashRate: 0,
      quantumHashRate: 0,
      averageNodeHashRate: 0,
      quantumResistanceActive: true,
      threatsBlockedTotal: 0,
      securityLevel: "maximum",
      networkUptime: 99.999,
      averageNodeUptime: 99.9,
      lastUpdated: new Date(),
    };
  }

  private initializeQuantumInfrastructure(): void {
    // Initialize primary quantum processor
    const primaryProcessor: QuantumProcessor = {
      id: "qp-triumph-prime",
      name: "Triumph Quantum Prime",
      type: "superconducting",
      qubits: 1000,
      logicalQubits: 100,
      coherenceTime: 500,
      gateErrorRate: 0.001,
      readoutErrorRate: 0.005,
      quantumVolume: 2048,
      clopsScore: 5000,
      connectivity: "all-to-all",
      status: "online",
      uptime: 99.99,
      temperature: 15, // 15 millikelvin
      miningHashRate: 1_000_000_000, // 1 billion quantum hash ops/sec
      piMiningEfficiency: 0.0001,
      dataCenter: "Triumph Quantum Center Alpha",
      region: "global",
      lastCalibration: new Date(),
      createdAt: new Date(),
    };

    this.quantumProcessors.set(primaryProcessor.id, primaryProcessor);

    // Initialize quantum security module
    const securityModule: QuantumSecurityModule = {
      id: "qsm-triumph-shield",
      resistanceLevel: "military-grade",
      primarySuite: "triumph-hybrid",
      backupSuites: ["crystals-kyber", "crystals-dilithium", "sphincs-plus"],
      keyLength: 1024,
      keyRotationInterval: 1,
      lastKeyRotation: new Date(),
      quantumRandomness: true,
      entropySource: "quantum",
      entropyRate: 1_000_000_000, // 1 Gbps quantum random
      postQuantumVerified: true,
      nistCompliant: true,
      status: "active",
      threatsBlocked: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.securityModules.set(securityModule.id, securityModule);
  }

  private initializeAllocations(): void {
    // Owner-defined allocations for internally mined Pi
    const allocationCategories: {
      category: MiningAllocationCategory;
      percentage: number;
      description: string;
    }[] = [
      {
        category: "infrastructure",
        percentage: 30,
        description: "Network infrastructure expansion and maintenance",
      },
      {
        category: "research-development",
        percentage: 15,
        description: "Quantum computing and blockchain R&D",
      },
      {
        category: "community-rewards",
        percentage: 15,
        description: "Community mining rewards and incentives",
      },
      {
        category: "partner-incentives",
        percentage: 10,
        description: "Partner company bonuses and incentives",
      },
      {
        category: "liquidity-pool",
        percentage: 10,
        description: "Pi liquidity for ecosystem operations",
      },
      {
        category: "ubi-funding",
        percentage: 10,
        description: "Universal Basic Income program funding",
      },
      {
        category: "emergency-reserve",
        percentage: 5,
        description: "Emergency reserve fund",
      },
      {
        category: "owner-discretionary",
        percentage: 5,
        description: "Owner discretionary allocation",
      },
    ];

    for (const alloc of allocationCategories) {
      const id = `alloc-${alloc.category}`;
      const allocation: MiningAllocation = {
        id,
        category: alloc.category,
        percentage: alloc.percentage,
        piAllocated: 0,
        piAllocatedValue: 0,
        piAllocatedValueInternal: 0,
        piUsed: 0,
        piRemaining: 0,
        ownerApproved: true,
        ownerNotes: "Initial allocation approved by Owner",
        lastOwnerReview: new Date(),
        description: alloc.description,
        projects: [],
        periodStart: new Date(),
        periodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.allocations.set(id, allocation);
    }
  }

  // ==========================================================================
  // SUBSCRIPTION PLANS
  // ==========================================================================

  getMiningSubscriptionPlans(): MiningSubscription[] {
    return [
      {
        tier: "basic",
        name: "Basic Mining",
        monthlyPrice: 299,
        monthlyPriceInPi: 299 / PI_EXTERNAL_RATE,
        annualPrice: 2990,
        annualPriceInPi: 2990 / PI_EXTERNAL_RATE,
        maxNodes: 5,
        quantumAccessLevel: "none",
        hashRateBonus: 0,
        prioritySupport: false,
        apiAccess: false,
        customAllocations: false,
        baseRewardMultiplier: 1.0,
        piPayoutBonus: 0,
        features: [
          "Up to 5 mining nodes",
          "Classical mining only",
          "Standard support",
          "Basic analytics dashboard",
          "Community pool participation",
        ],
      },
      {
        tier: "professional",
        name: "Professional Mining",
        monthlyPrice: 999,
        monthlyPriceInPi: 999 / PI_EXTERNAL_RATE,
        annualPrice: 9990,
        annualPriceInPi: 9990 / PI_EXTERNAL_RATE,
        maxNodes: 25,
        quantumAccessLevel: "shared",
        hashRateBonus: 0.25,
        prioritySupport: true,
        apiAccess: true,
        customAllocations: false,
        baseRewardMultiplier: 1.25,
        piPayoutBonus: 0.05,
        features: [
          "Up to 25 mining nodes",
          "Shared quantum processing access",
          "25% hash rate bonus",
          "Priority support",
          "Full API access",
          "Advanced analytics",
          "5% Pi payout bonus",
        ],
      },
      {
        tier: "enterprise",
        name: "Enterprise Mining",
        monthlyPrice: 4999,
        monthlyPriceInPi: 4999 / PI_EXTERNAL_RATE,
        annualPrice: 49_990,
        annualPriceInPi: 49_990 / PI_EXTERNAL_RATE,
        maxNodes: 100,
        quantumAccessLevel: "dedicated",
        hashRateBonus: 0.5,
        prioritySupport: true,
        apiAccess: true,
        customAllocations: true,
        baseRewardMultiplier: 1.5,
        piPayoutBonus: 0.1,
        features: [
          "Up to 100 mining nodes",
          "Dedicated quantum processing",
          "50% hash rate bonus",
          "24/7 priority support",
          "Full API access with higher limits",
          "Custom allocation preferences",
          "Dedicated account manager",
          "10% Pi payout bonus",
        ],
      },
      {
        tier: "unlimited",
        name: "Unlimited Mining",
        monthlyPrice: 14_999,
        monthlyPriceInPi: 14_999 / PI_EXTERNAL_RATE,
        annualPrice: 149_990,
        annualPriceInPi: 149_990 / PI_EXTERNAL_RATE,
        maxNodes: "unlimited",
        quantumAccessLevel: "exclusive",
        hashRateBonus: 1.0,
        prioritySupport: true,
        apiAccess: true,
        customAllocations: true,
        baseRewardMultiplier: 2.0,
        piPayoutBonus: 0.2,
        features: [
          "Unlimited mining nodes",
          "Exclusive quantum processing access",
          "100% hash rate bonus (2x)",
          "White-glove support",
          "Unlimited API access",
          "Full allocation control",
          "Board-level account management",
          "20% Pi payout bonus",
          "Governance participation",
          "Early feature access",
        ],
      },
    ];
  }

  // ==========================================================================
  // COMPANY REGISTRATION
  // ==========================================================================

  async registerMiningCompany(data: {
    name: string;
    tier: CompanyTier;
    subscriptionTier: MiningSubscription["tier"];
    primaryContact: string;
    email: string;
  }): Promise<MiningCompany> {
    const id = `company-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const plans = this.getMiningSubscriptionPlans();
    const plan = plans.find((p) => p.tier === data.subscriptionTier)!;

    // Tier bonuses
    const tierBonuses: Record<CompanyTier, number> = {
      pioneer: 0.5, // 50% bonus for early adopters
      partner: 0.25, // 25% bonus
      enterprise: 0.35, // 35% bonus
      institutional: 0.4, // 40% bonus
      founding: 1.0, // 100% bonus for founding members
    };

    const company: MiningCompany = {
      id,
      name: data.name,
      tier: data.tier,
      registrationDate: new Date(),
      verified: false,
      kycCompleted: false,
      nodesDeployed: 0,
      totalHashRate: 0,
      quantumNodesCount: 0,
      networkSharePercent: 0,
      piMined: 0,
      piMinedValue: 0,
      piMinedValueInternal: 0,
      monthlyMiningReward: 0,
      bonusMultiplier: plan.baseRewardMultiplier,
      tierBonus: tierBonuses[data.tier],
      networkContributionBonus: 0,
      rateContribution: this.COMPANY_RATE_BOOST,
      subscriptionTier: data.subscriptionTier,
      subscriptionPrice: plan.monthlyPrice,
      subscriptionPriceInPi: plan.monthlyPriceInPi,
      primaryContact: data.primaryContact,
      email: data.email,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.companies.set(id, company);

    // Update network metrics and mining rates
    await this.updateNetworkMetrics();
    await this.recalculateMiningRates();

    console.log(`[QUANTUM MINING] Company registered: ${data.name}`);
    console.log(
      `[QUANTUM MINING] Tier: ${data.tier} | Subscription: ${data.subscriptionTier}`
    );
    console.log(
      `[QUANTUM MINING] Network mining rate increased by ${(this.COMPANY_RATE_BOOST * 100).toFixed(1)}%`
    );

    return company;
  }

  // ==========================================================================
  // MINING NODE MANAGEMENT
  // ==========================================================================

  async deployMiningNode(
    companyId: string,
    data: {
      name: string;
      type: MiningNodeType;
      classicalCores: number;
      memoryGB: number;
      storageGB: number;
      region: string;
      dataCenter: string;
    }
  ): Promise<MiningNode> {
    const company = this.companies.get(companyId);
    if (!company) {
      throw new Error("Company not found");
    }

    const id = `node-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    // Calculate hash rate based on node type
    const baseHashRates: Record<MiningNodeType, number> = {
      "quantum-core": 1_000_000_000, // 1 billion
      hybrid: 500_000_000, // 500 million
      "classical-optimized": 100_000_000, // 100 million
      edge: 10_000_000, // 10 million
      mobile: 1_000_000, // 1 million
      institutional: 750_000_000, // 750 million
    };

    const quantumBoosts: Record<MiningNodeType, number> = {
      "quantum-core": 10.0,
      hybrid: 5.0,
      "classical-optimized": 2.0,
      edge: 1.5,
      mobile: 1.2,
      institutional: 7.5,
    };

    const baseHashRate = baseHashRates[data.type];
    const quantumBoost = quantumBoosts[data.type];
    const effectiveHashRate =
      baseHashRate * quantumBoost * company.bonusMultiplier;

    // Assign quantum processor for quantum nodes
    let quantumProcessorId: string | null = null;
    if (
      data.type === "quantum-core" ||
      data.type === "hybrid" ||
      data.type === "institutional"
    ) {
      const processor = Array.from(this.quantumProcessors.values())[0];
      if (processor) {
        quantumProcessorId = processor.id;
      }
    }

    const node: MiningNode = {
      id,
      ownerId: companyId,
      name: data.name,
      type: data.type,
      quantumProcessorId,
      classicalCores: data.classicalCores,
      memoryGB: data.memoryGB,
      storageGB: data.storageGB,
      hashRate: baseHashRate,
      quantumBoost,
      effectiveHashRate,
      piMinedTotal: 0,
      piMinedToday: 0,
      piMinedThisMonth: 0,
      miningEfficiency: 0.95,
      blocksValidated: 0,
      transactionsProcessed: 0,
      consensusParticipation: 0,
      baseRewardRate: this.networkMetrics.currentRatePiPerHour / 100, // Share of network
      companyBonusMultiplier: company.bonusMultiplier,
      networkBonusMultiplier: this.networkMetrics.networkBoostMultiplier,
      totalRewardRate: 0,
      status: "mining",
      uptime: 100,
      lastBlock: new Date(),
      region: data.region,
      dataCenter: data.dataCenter,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Calculate total reward rate
    node.totalRewardRate =
      node.baseRewardRate *
      node.companyBonusMultiplier *
      node.networkBonusMultiplier *
      (1 + company.tierBonus);

    this.miningNodes.set(id, node);

    // Update company stats
    company.nodesDeployed += 1;
    company.totalHashRate += effectiveHashRate;
    if (quantumProcessorId) {
      company.quantumNodesCount += 1;
    }
    company.updatedAt = new Date();

    // Update network metrics
    await this.updateNetworkMetrics();

    console.log(`[QUANTUM MINING] Node deployed: ${data.name}`);
    console.log(
      `[QUANTUM MINING] Type: ${data.type} | Hash Rate: ${effectiveHashRate.toLocaleString()}`
    );
    console.log(`[QUANTUM MINING] Quantum Boost: ${quantumBoost}x`);

    return node;
  }

  // ==========================================================================
  // MINING RATE CALCULATIONS
  // ==========================================================================

  private async recalculateMiningRates(): Promise<void> {
    const companyCount = this.companies.size;
    const quantumNodeCount = Array.from(this.miningNodes.values()).filter(
      (n) => n.quantumProcessorId !== null
    ).length;

    // Calculate company bonus (more companies = higher rates)
    const companyBonus = Math.min(
      companyCount * this.COMPANY_RATE_BOOST,
      this.MAX_RATE_MULTIPLIER - 1
    );

    // Calculate quantum node bonus
    const quantumBonus = Math.min(
      quantumNodeCount * this.QUANTUM_NODE_BOOST,
      this.MAX_RATE_MULTIPLIER - 1
    );

    // Combined network boost
    const networkBoost = 1 + companyBonus + quantumBonus;

    // New mining rate
    const newRate =
      this.BASE_MINING_RATE * Math.min(networkBoost, this.MAX_RATE_MULTIPLIER);

    this.networkMetrics.companyCountBonus = companyBonus;
    this.networkMetrics.networkBoostMultiplier = networkBoost;
    this.networkMetrics.currentRatePiPerHour = newRate;

    console.log("[QUANTUM MINING] Mining rate recalculated");
    console.log(
      `[QUANTUM MINING] Companies: ${companyCount} (+${(companyBonus * 100).toFixed(1)}% bonus)`
    );
    console.log(
      `[QUANTUM MINING] Quantum Nodes: ${quantumNodeCount} (+${(quantumBonus * 100).toFixed(1)}% bonus)`
    );
    console.log(
      `[QUANTUM MINING] Current Rate: ${newRate.toFixed(2)} π/hour (${networkBoost.toFixed(2)}x base)`
    );
  }

  private async updateNetworkMetrics(): Promise<void> {
    const nodes = Array.from(this.miningNodes.values());
    const companies = Array.from(this.companies.values());

    this.networkMetrics.totalNodes = nodes.length;
    this.networkMetrics.quantumNodes = nodes.filter(
      (n) => n.type === "quantum-core"
    ).length;
    this.networkMetrics.hybridNodes = nodes.filter(
      (n) => n.type === "hybrid"
    ).length;
    this.networkMetrics.classicalNodes = nodes.filter(
      (n) =>
        n.type === "classical-optimized" ||
        n.type === "edge" ||
        n.type === "mobile"
    ).length;

    this.networkMetrics.totalCompanies = companies.length;
    this.networkMetrics.activeCompanies = companies.filter(
      (c) => c.nodesDeployed > 0
    ).length;

    // Count by tier
    for (const tier of [
      "pioneer",
      "partner",
      "enterprise",
      "institutional",
      "founding",
    ] as CompanyTier[]) {
      this.networkMetrics.companiesByTier[tier] = companies.filter(
        (c) => c.tier === tier
      ).length;
    }

    this.networkMetrics.totalHashRate = nodes.reduce(
      (sum, n) => sum + n.effectiveHashRate,
      0
    );
    this.networkMetrics.quantumHashRate = nodes
      .filter((n) => n.quantumProcessorId)
      .reduce((sum, n) => sum + n.effectiveHashRate, 0);
    this.networkMetrics.averageNodeHashRate =
      nodes.length > 0 ? this.networkMetrics.totalHashRate / nodes.length : 0;

    this.networkMetrics.totalPiMined = nodes.reduce(
      (sum, n) => sum + n.piMinedTotal,
      0
    );
    this.networkMetrics.totalPiMinedValue =
      this.networkMetrics.totalPiMined * PI_EXTERNAL_RATE;
    this.networkMetrics.totalPiMinedValueInternal =
      this.networkMetrics.totalPiMined * PI_INTERNAL_RATE;
    this.networkMetrics.piMinedToday = nodes.reduce(
      (sum, n) => sum + n.piMinedToday,
      0
    );
    this.networkMetrics.piMinedThisMonth = nodes.reduce(
      (sum, n) => sum + n.piMinedThisMonth,
      0
    );

    this.networkMetrics.averageNodeUptime =
      nodes.length > 0
        ? nodes.reduce((sum, n) => sum + n.uptime, 0) / nodes.length
        : 100;

    this.networkMetrics.lastUpdated = new Date();
  }

  // ==========================================================================
  // MINING OPERATIONS
  // ==========================================================================

  async minePi(nodeId: string): Promise<{
    piMined: number;
    piMinedValue: number;
    piMinedValueInternal: number;
    blockHash: string;
  }> {
    const node = this.miningNodes.get(nodeId);
    if (!node) {
      throw new Error("Node not found");
    }

    if (node.status !== "mining") {
      throw new Error("Node is not actively mining");
    }

    const company = this.companies.get(node.ownerId);
    if (!company) {
      throw new Error("Company not found");
    }

    // Calculate Pi mined based on node's share of network hash rate
    const networkShare =
      node.effectiveHashRate / Math.max(this.networkMetrics.totalHashRate, 1);
    const basePiMined = this.networkMetrics.currentRatePiPerHour * networkShare;

    // Apply bonuses
    const tierBonus = 1 + company.tierBonus;
    const subscriptionBonus = company.bonusMultiplier;

    const piMined =
      basePiMined * tierBonus * subscriptionBonus * node.miningEfficiency;
    const piMinedValue = piMined * PI_EXTERNAL_RATE;
    const piMinedValueInternal = piMined * PI_INTERNAL_RATE;

    // Update node stats
    node.piMinedTotal += piMined;
    node.piMinedToday += piMined;
    node.piMinedThisMonth += piMined;
    node.blocksValidated += 1;
    node.lastBlock = new Date();
    node.updatedAt = new Date();

    // Update company stats
    company.piMined += piMined;
    company.piMinedValue += piMinedValue;
    company.piMinedValueInternal += piMinedValueInternal;
    company.monthlyMiningReward += piMined;
    company.updatedAt = new Date();

    // Allocate mined Pi according to owner-defined allocations
    await this.allocateMinedPi(piMined);

    const blockHash = `block-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

    return {
      piMined,
      piMinedValue,
      piMinedValueInternal,
      blockHash,
    };
  }

  private async allocateMinedPi(piAmount: number): Promise<void> {
    for (const allocation of this.allocations.values()) {
      const piShare = piAmount * (allocation.percentage / 100);
      allocation.piAllocated += piShare;
      allocation.piAllocatedValue = allocation.piAllocated * PI_EXTERNAL_RATE;
      allocation.piAllocatedValueInternal =
        allocation.piAllocated * PI_INTERNAL_RATE;
      allocation.piRemaining = allocation.piAllocated - allocation.piUsed;
      allocation.updatedAt = new Date();
    }

    // Update network totals
    this.networkMetrics.totalPiMined += piAmount;
    this.networkMetrics.totalPiMinedValue =
      this.networkMetrics.totalPiMined * PI_EXTERNAL_RATE;
    this.networkMetrics.totalPiMinedValueInternal =
      this.networkMetrics.totalPiMined * PI_INTERNAL_RATE;
  }

  // ==========================================================================
  // OWNER ALLOCATION CONTROL
  // ==========================================================================

  async ownerUpdateAllocation(
    category: MiningAllocationCategory,
    data: {
      newPercentage?: number;
      notes?: string;
      addProject?: string;
    }
  ): Promise<MiningAllocation> {
    const allocation = this.allocations.get(`alloc-${category}`);
    if (!allocation) {
      throw new Error("Allocation category not found");
    }

    if (data.newPercentage !== undefined) {
      // Verify total doesn't exceed 100%
      let totalOthers = 0;
      for (const alloc of this.allocations.values()) {
        if (alloc.category !== category) {
          totalOthers += alloc.percentage;
        }
      }

      if (totalOthers + data.newPercentage > 100) {
        throw new Error("Total allocation cannot exceed 100%");
      }

      allocation.percentage = data.newPercentage;
    }

    if (data.notes) {
      allocation.ownerNotes = data.notes;
    }

    if (data.addProject) {
      allocation.projects.push(data.addProject);
    }

    allocation.lastOwnerReview = new Date();
    allocation.updatedAt = new Date();

    console.log(`[OWNER] Updated ${category} allocation`);
    console.log(`[OWNER] Percentage: ${allocation.percentage}%`);
    console.log(`[OWNER] Pi Allocated: ${allocation.piAllocated.toFixed(4)} π`);

    return allocation;
  }

  async ownerWithdrawFromAllocation(
    category: MiningAllocationCategory,
    amount: number,
    purpose: string
  ): Promise<{
    withdrawn: number;
    withdrawnValue: number;
    withdrawnValueInternal: number;
    remaining: number;
  }> {
    const allocation = this.allocations.get(`alloc-${category}`);
    if (!allocation) {
      throw new Error("Allocation category not found");
    }

    if (amount > allocation.piRemaining) {
      throw new Error(
        `Insufficient funds. Available: ${allocation.piRemaining.toFixed(4)} π`
      );
    }

    allocation.piUsed += amount;
    allocation.piRemaining = allocation.piAllocated - allocation.piUsed;
    allocation.projects.push(`Withdrawal: ${purpose} - ${amount.toFixed(4)} π`);
    allocation.updatedAt = new Date();

    console.log(`[OWNER] Withdrew ${amount.toFixed(4)} π from ${category}`);
    console.log(`[OWNER] Purpose: ${purpose}`);
    console.log(
      `[OWNER] Value: $${(amount * PI_EXTERNAL_RATE).toFixed(2)} (External) / $${(amount * PI_INTERNAL_RATE).toLocaleString()} (Internal)`
    );

    return {
      withdrawn: amount,
      withdrawnValue: amount * PI_EXTERNAL_RATE,
      withdrawnValueInternal: amount * PI_INTERNAL_RATE,
      remaining: allocation.piRemaining,
    };
  }

  // ==========================================================================
  // QUANTUM SECURITY
  // ==========================================================================

  async getQuantumSecurityStatus(): Promise<{
    resistanceLevel: QuantumResistanceLevel;
    primarySuite: CryptographicSuite;
    threatsBlocked: number;
    keyAge: number; // hours since last rotation
    nextRotation: Date;
    quantumEntropyRate: number;
    status: "secure" | "rotating" | "warning";
  }> {
    const module = Array.from(this.securityModules.values())[0];
    if (!module) {
      throw new Error("No security module found");
    }

    const keyAge =
      (Date.now() - module.lastKeyRotation.getTime()) / (1000 * 60 * 60);
    const nextRotation = new Date(
      module.lastKeyRotation.getTime() +
        module.keyRotationInterval * 60 * 60 * 1000
    );

    return {
      resistanceLevel: module.resistanceLevel,
      primarySuite: module.primarySuite,
      threatsBlocked: module.threatsBlocked,
      keyAge,
      nextRotation,
      quantumEntropyRate: module.entropyRate,
      status:
        module.status === "active"
          ? "secure"
          : module.status === "rotating"
            ? "rotating"
            : "warning",
    };
  }

  // ==========================================================================
  // DASHBOARDS & REPORTING
  // ==========================================================================

  async getNetworkDashboard(): Promise<{
    metrics: NetworkMetrics;
    miningRateInfo: {
      baseRate: number;
      currentRate: number;
      multiplier: number;
      companyBonus: string;
      quantumBonus: string;
    };
    topCompanies: MiningCompany[];
    topNodes: MiningNode[];
    allocations: MiningAllocation[];
    quantumProcessors: QuantumProcessor[];
    securityStatus: {
      resistanceLevel: QuantumResistanceLevel;
      primarySuite: CryptographicSuite;
      threatsBlocked: number;
      keyAge: number;
      nextRotation: Date;
      quantumEntropyRate: number;
      status: "secure" | "rotating" | "warning";
    };
  }> {
    await this.updateNetworkMetrics();

    const companies = Array.from(this.companies.values())
      .sort((a, b) => b.piMined - a.piMined)
      .slice(0, 10);

    const nodes = Array.from(this.miningNodes.values())
      .sort((a, b) => b.piMinedTotal - a.piMinedTotal)
      .slice(0, 10);

    const quantumNodeCount = Array.from(this.miningNodes.values()).filter(
      (n) => n.quantumProcessorId !== null
    ).length;

    return {
      metrics: this.networkMetrics,
      miningRateInfo: {
        baseRate: this.BASE_MINING_RATE,
        currentRate: this.networkMetrics.currentRatePiPerHour,
        multiplier: this.networkMetrics.networkBoostMultiplier,
        companyBonus: `+${(this.companies.size * this.COMPANY_RATE_BOOST * 100).toFixed(1)}% (${this.companies.size} companies)`,
        quantumBonus: `+${(quantumNodeCount * this.QUANTUM_NODE_BOOST * 100).toFixed(1)}% (${quantumNodeCount} quantum nodes)`,
      },
      topCompanies: companies,
      topNodes: nodes,
      allocations: Array.from(this.allocations.values()),
      quantumProcessors: Array.from(this.quantumProcessors.values()),
      securityStatus: await this.getQuantumSecurityStatus(),
    };
  }

  async getCompanyDashboard(companyId: string): Promise<{
    company: MiningCompany;
    nodes: MiningNode[];
    miningStats: {
      totalPiMined: number;
      totalPiMinedValue: number;
      totalPiMinedValueInternal: number;
      monthlyMining: number;
      dailyMining: number;
      networkShare: number;
    };
    subscriptionInfo: MiningSubscription;
    bonusBreakdown: {
      tierBonus: number;
      subscriptionBonus: number;
      networkBonus: number;
      totalMultiplier: number;
    };
  }> {
    const company = this.companies.get(companyId);
    if (!company) {
      throw new Error("Company not found");
    }

    const nodes = Array.from(this.miningNodes.values()).filter(
      (n) => n.ownerId === companyId
    );

    const plans = this.getMiningSubscriptionPlans();
    const plan = plans.find((p) => p.tier === company.subscriptionTier)!;

    const totalMined = nodes.reduce((sum, n) => sum + n.piMinedTotal, 0);
    const monthlyMined = nodes.reduce((sum, n) => sum + n.piMinedThisMonth, 0);
    const dailyMined = nodes.reduce((sum, n) => sum + n.piMinedToday, 0);

    return {
      company,
      nodes,
      miningStats: {
        totalPiMined: totalMined,
        totalPiMinedValue: totalMined * PI_EXTERNAL_RATE,
        totalPiMinedValueInternal: totalMined * PI_INTERNAL_RATE,
        monthlyMining: monthlyMined,
        dailyMining: dailyMined,
        networkShare: company.networkSharePercent,
      },
      subscriptionInfo: plan,
      bonusBreakdown: {
        tierBonus: company.tierBonus,
        subscriptionBonus: company.bonusMultiplier,
        networkBonus: this.networkMetrics.networkBoostMultiplier,
        totalMultiplier:
          (1 + company.tierBonus) *
          company.bonusMultiplier *
          this.networkMetrics.networkBoostMultiplier,
      },
    };
  }

  // ==========================================================================
  // UTILITIES
  // ==========================================================================

  getPiToUsdRate(type: PiValueType = "external"): number {
    return getPiRate(type);
  }

  getDualRateInfo(): {
    internal: number;
    external: number;
    multiplier: number;
  } {
    return {
      internal: PI_INTERNAL_RATE,
      external: PI_EXTERNAL_RATE,
      multiplier: PI_INTERNAL_MULTIPLIER,
    };
  }

  getCompany(companyId: string): MiningCompany | undefined {
    return this.companies.get(companyId);
  }

  getNode(nodeId: string): MiningNode | undefined {
    return this.miningNodes.get(nodeId);
  }

  getAllCompanies(): MiningCompany[] {
    return Array.from(this.companies.values());
  }

  getAllNodes(): MiningNode[] {
    return Array.from(this.miningNodes.values());
  }

  getAllAllocations(): MiningAllocation[] {
    return Array.from(this.allocations.values());
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const quantumMiningInfrastructure = new QuantumMiningInfrastructure();

// ============================================================================
// HELPER EXPORTS
// ============================================================================

export async function registerMiningCompany(
  data: Parameters<typeof quantumMiningInfrastructure.registerMiningCompany>[0]
): Promise<MiningCompany> {
  return quantumMiningInfrastructure.registerMiningCompany(data);
}

export async function deployMiningNode(
  companyId: string,
  data: Parameters<typeof quantumMiningInfrastructure.deployMiningNode>[1]
): Promise<MiningNode> {
  return quantumMiningInfrastructure.deployMiningNode(companyId, data);
}

export async function minePi(nodeId: string): Promise<{
  piMined: number;
  piMinedValue: number;
  piMinedValueInternal: number;
  blockHash: string;
}> {
  return quantumMiningInfrastructure.minePi(nodeId);
}

export async function ownerUpdateAllocation(
  category: MiningAllocationCategory,
  data: Parameters<typeof quantumMiningInfrastructure.ownerUpdateAllocation>[1]
): Promise<MiningAllocation> {
  return quantumMiningInfrastructure.ownerUpdateAllocation(category, data);
}

export async function ownerWithdrawFromAllocation(
  category: MiningAllocationCategory,
  amount: number,
  purpose: string
): Promise<{
  withdrawn: number;
  withdrawnValue: number;
  withdrawnValueInternal: number;
  remaining: number;
}> {
  return quantumMiningInfrastructure.ownerWithdrawFromAllocation(
    category,
    amount,
    purpose
  );
}

export function getMiningSubscriptionPlans(): MiningSubscription[] {
  return quantumMiningInfrastructure.getMiningSubscriptionPlans();
}

export async function getNetworkDashboard(): Promise<
  Awaited<ReturnType<typeof quantumMiningInfrastructure.getNetworkDashboard>>
> {
  return quantumMiningInfrastructure.getNetworkDashboard();
}

export async function getCompanyDashboard(
  companyId: string
): Promise<
  Awaited<ReturnType<typeof quantumMiningInfrastructure.getCompanyDashboard>>
> {
  return quantumMiningInfrastructure.getCompanyDashboard(companyId);
}

export async function getQuantumSecurityStatus(): Promise<
  Awaited<
    ReturnType<typeof quantumMiningInfrastructure.getQuantumSecurityStatus>
  >
> {
  return quantumMiningInfrastructure.getQuantumSecurityStatus();
}

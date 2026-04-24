/**
 * PiRC Integration Library
 * Implements PiRC1: Pi Ecosystem Token Design
 * 
 * Features:
 * - Launchpad participation and allocation
 * - Liquidity pool management
 * - TGE (Token Generation Event) handling
 * - Engagement scoring
 * - Both Design 1 and Design 2 allocation models
 * 
 * @see https://github.com/PiNetwork/PiRC
 */

import type {
  PiRCSpec,
  PiRCConfig,
  ParticipationWindow,
  AllocationPeriod,
  AllocationDesign1,
  AllocationDesign2,
  TokenAllocation,
  EngagementScore,
  EngagementTier,
  TGEState,
  LiquidityPoolState,
  LaunchpadProjectSummary,
  PiPowerCalculation,
  PiRCEvent,
  PiRCEventHandler,
  PiRCEventType,
} from "@/types/pirc";

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_PIRC_CONFIG: PiRCConfig = {
  network: "mainnet",
  horizonUrl: "https://horizon.stellar.org",
  piNetworkApiUrl: "https://api.minepi.com",
  publicKey: process.env.NEXT_PUBLIC_PI_PUBLIC_KEY || "",
  autoSync: true,
  syncIntervalMs: 5000,
  supportedDesigns: ["design1", "design2"],
  nodeConfig: {
    minStakingAmount: 100,
    supernodeThreshold: 1000,
    validatorRequirements: [
      "99.9% uptime",
      "10,000 Pi staked",
      "KYC verified",
    ],
  },
};

const ACTIVE_PIRC_SPEC: PiRCSpec = {
  version: "PiRC1",
  status: "active",
  title: "Pi Ecosystem Token Design",
  author: "Pi Network / kokkalis",
  created: "2026-02-20",
  updated: "2026-03-16",
};

// ============================================================================
// In-Memory State (would be database in production)
// ============================================================================

const participationWindows = new Map<string, ParticipationWindow>();
const allocationPeriods = new Map<string, AllocationPeriod>();
const tgeStates = new Map<string, TGEState>();
const eventHandlers = new Set<PiRCEventHandler>();

// ============================================================================
// Event System
// ============================================================================

function emitEvent(type: PiRCEventType, projectId: string | undefined, data: Record<string, unknown>): void {
  const event: PiRCEvent = {
    type,
    timestamp: new Date().toISOString(),
    projectId,
    data,
    metadata: {
      source: "triumph-synergy",
      version: "2.0.0",
    },
  };

  eventHandlers.forEach((handler) => {
    try {
      handler(event);
    } catch (error) {
      console.error("[PiRC] Event handler error:", error);
    }
  });
}

// ============================================================================
// PiPower Calculation (Section 3)
// ============================================================================

/**
 * Calculate PiPower for a participant
 * PiPower_i = T_available × (StakedPi_i / ΣStakedPi + PiPower_Baseline)
 */
export function calculatePiPower(
  stakedPi: number,
  totalStakedPi: number,
  tokensAvailable: number,
  hasLongTermLockup = false
): PiPowerCalculation {
  // Baseline PiPower for long-term lockers (≥90% locked for ≥3 years)
  const baselinePiPower = hasLongTermLockup ? 0.01 : 0;
  
  const stakingRatio = totalStakedPi > 0 ? stakedPi / totalStakedPi : 0;
  const piPower = tokensAvailable * (stakingRatio + baselinePiPower);
  
  return {
    stakedPi,
    totalStakedPi,
    baselinePiPower,
    piPower,
    maxTokensCommittable: Math.floor(piPower),
  };
}

/**
 * Rank participants by engagement and assign tiers
 */
export function assignEngagementTiers(scores: EngagementScore[]): EngagementScore[] {
  // Sort by score descending
  const sorted = [...scores].sort((a, b) => b.score - a.score);
  const totalParticipants = sorted.length;
  const tierSize = Math.ceil(totalParticipants / 3);

  return sorted.map((score, index) => {
    let tier: EngagementTier;
    if (index < tierSize) {
      tier = "top";
    } else if (index < tierSize * 2) {
      tier = "middle";
    } else {
      tier = "bottom";
    }
    
    return {
      ...score,
      rank: index + 1,
      tier,
    };
  });
}

// ============================================================================
// Allocation Design 1 (Section 4.1)
// ============================================================================

/**
 * Calculate allocation using Design 1
 * Simple model: all Pi goes to LP, engagement-based discounts
 */
export function calculateDesign1Allocation(
  totalCommittedPi: number,
  tokensAvailable: number
): AllocationDesign1 {
  const T = tokensAvailable;
  const T_engage = T * 0.05; // 5% for engagement rewards
  const C = totalCommittedPi;
  const p_list = C / T;

  return {
    design: "design1",
    totalCommittedPi: C,
    purchaseTokens: T,
    liquidityTokens: T,
    engageTokens: T_engage,
    listingPrice: p_list,
    effectivePrices: {
      top: p_list * 0.909,     // ~10% discount
      middle: p_list * 0.952,   // ~5% discount
      bottom: p_list,            // No discount
    },
  };
}

/**
 * Calculate individual allocation for Design 1
 */
export function calculateDesign1UserAllocation(
  committedPi: number,
  design: AllocationDesign1,
  tier: EngagementTier,
  tierTotalCommitted: number
): TokenAllocation {
  const baseTokens = committedPi / design.listingPrice;
  
  // Engagement token distribution
  let engageTokens = 0;
  if (tier === "top" && tierTotalCommitted > 0) {
    engageTokens = (2 / 3) * design.engageTokens * (committedPi / tierTotalCommitted);
  } else if (tier === "middle" && tierTotalCommitted > 0) {
    engageTokens = (1 / 3) * design.engageTokens * (committedPi / tierTotalCommitted);
  }
  // Bottom tier gets no engagement tokens

  const totalTokens = baseTokens + engageTokens;
  const effectivePrice = committedPi / totalTokens;

  return {
    userId: "",
    committedPi,
    baseTokens,
    engageTokens,
    totalTokens,
    effectivePrice,
    engagementTier: tier,
  };
}

// ============================================================================
// Allocation Design 2 (Section 4.2)
// ============================================================================

/**
 * Calculate allocation using Design 2
 * Fixed-price portion + LP swaps based on engagement
 */
export function calculateDesign2Allocation(
  totalCommittedPi: number,
  tokensAvailable: number
): AllocationDesign2 {
  const T = tokensAvailable;
  const C = totalCommittedPi;
  
  const lpTokens = T * 0.8;          // 80% to LP
  const directSaleTokens = T * 0.2;   // 20% direct sale
  const p_list = C / (0.4 * T);       // Listing price
  const p_init = p_list / 4;          // Initial pool price
  const k = 0.4 * C * T;              // Constant product

  return {
    design: "design2",
    totalCommittedPi: C,
    fixedPricePortion: C / 2,
    swapPortion: C / 2,
    launchAllocation: T,
    lpTokens,
    directSaleTokens,
    listingPrice: p_list,
    initialPoolPrice: p_init,
    effectivePriceRange: {
      minPrice: 0.4 * p_list,  // Most engaged (60% discount)
      maxPrice: p_list,         // Least engaged (no discount)
    },
    constantProduct: k,
  };
}

/**
 * Calculate swap price based on cumulative swaps
 * p_swap(s) = (1/4) × (1 + 2s/C)² × p_list
 */
export function calculateSwapPrice(
  cumulativeSwaps: number,
  totalCommittedPi: number,
  listingPrice: number
): number {
  const C = totalCommittedPi;
  const ratio = 1 + (2 * cumulativeSwaps) / C;
  return 0.25 * Math.pow(ratio, 2) * listingPrice;
}

/**
 * Calculate effective price for Design 2
 * Harmonic mean of listing price and swap price
 */
export function calculateDesign2EffectivePrice(
  listingPrice: number,
  swapPrice: number
): number {
  return (2 * listingPrice * swapPrice) / (listingPrice + swapPrice);
}

// ============================================================================
// Liquidity Pool Management
// ============================================================================

/**
 * Initialize LP state after allocation
 */
export function initializeLiquidityPool(
  design: AllocationDesign1 | AllocationDesign2
): LiquidityPoolState {
  let piReserve: number;
  let tokenReserve: number;

  if (design.design === "design1") {
    // Design 1: All committed Pi + T tokens
    piReserve = design.totalCommittedPi;
    tokenReserve = design.liquidityTokens;
  } else {
    // Design 2: After all swaps, C Pi + 0.4T tokens
    piReserve = design.totalCommittedPi;
    tokenReserve = design.launchAllocation * 0.4;
  }

  const k = piReserve * tokenReserve;
  const spotPrice = piReserve / tokenReserve;

  return {
    piReserve,
    tokenReserve,
    constantProduct: k,
    spotPrice,
    totalLPShares: 100_000_000, // 100M LP tokens
    escrowShares: 100_000_000,   // All held by escrow (locked)
    swapFee: 0.003,              // 0.3%
  };
}

/**
 * Calculate price floor (theoretical minimum)
 */
export function calculatePriceFloor(
  design: AllocationDesign1 | AllocationDesign2
): number {
  if (design.design === "design1") {
    // Design 1: p_floor ≈ 0.238 × p_list (with 5% engage tokens)
    const ratio = design.purchaseTokens / (2 * design.purchaseTokens + design.engageTokens);
    return Math.pow(ratio, 2) * design.listingPrice;
  } else {
    // Design 2: p_floor = 0.16 × p_list
    return 0.16 * design.listingPrice;
  }
}

/**
 * Simulate a swap in the LP (constant product AMM)
 */
export function simulateSwap(
  pool: LiquidityPoolState,
  inputAmount: number,
  inputIsPi: boolean
): { outputAmount: number; newSpotPrice: number; priceImpact: number } {
  const fee = inputAmount * pool.swapFee;
  const inputAfterFee = inputAmount - fee;

  let outputAmount: number;
  let newPiReserve: number;
  let newTokenReserve: number;

  if (inputIsPi) {
    // Swap Pi for tokens
    newPiReserve = pool.piReserve + inputAfterFee;
    newTokenReserve = pool.constantProduct / newPiReserve;
    outputAmount = pool.tokenReserve - newTokenReserve;
  } else {
    // Swap tokens for Pi
    newTokenReserve = pool.tokenReserve + inputAfterFee;
    newPiReserve = pool.constantProduct / newTokenReserve;
    outputAmount = pool.piReserve - newPiReserve;
  }

  const newSpotPrice = newPiReserve / newTokenReserve;
  const priceImpact = Math.abs(newSpotPrice - pool.spotPrice) / pool.spotPrice;

  return { outputAmount, newSpotPrice, priceImpact };
}

// ============================================================================
// TGE State Management
// ============================================================================

/**
 * Create TGE state when market opens
 */
export function createTGEState(
  projectId: string,
  design: AllocationDesign1 | AllocationDesign2,
  lpState: LiquidityPoolState
): TGEState {
  const circulatingSupply = design.design === "design1"
    ? design.purchaseTokens + design.engageTokens
    : design.launchAllocation * 0.6; // 60% outside LP after swaps

  const state: TGEState = {
    projectId,
    tgeTime: new Date().toISOString(),
    lpState,
    circulatingSupply,
    tokensInLP: lpState.tokenReserve,
    tokensOutsideLP: circulatingSupply - lpState.tokenReserve,
    priceFloor: calculatePriceFloor(design),
    listingPrice: design.listingPrice,
    isMarketOpen: true,
    escrowLocked: true, // Escrow wallet permanently locked
  };

  tgeStates.set(projectId, state);
  emitEvent("tge_started", projectId, { state });
  emitEvent("market_opened", projectId, { listingPrice: design.listingPrice });

  return state;
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Get active PiRC specification
 */
export function getActivePiRCSpec(): PiRCSpec {
  return ACTIVE_PIRC_SPEC;
}

/**
 * Get configuration
 */
export function getPiRCConfig(): PiRCConfig {
  return { ...DEFAULT_PIRC_CONFIG };
}

/**
 * Subscribe to PiRC events
 */
export function onPiRCEvent(handler: PiRCEventHandler): () => void {
  eventHandlers.add(handler);
  return () => eventHandlers.delete(handler);
}

/**
 * Start a new participation window
 */
export function startParticipationWindow(
  projectId: string,
  tokensAvailable: number,
  durationHours: number
): ParticipationWindow {
  const startTime = new Date();
  const endTime = new Date(startTime.getTime() + durationHours * 60 * 60 * 1000);

  const window: ParticipationWindow = {
    projectId,
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    status: "active",
    totalParticipants: 0,
    totalStaked: 0,
    tokensAvailable,
    participants: [],
    engagementScores: [],
  };

  participationWindows.set(projectId, window);
  emitEvent("participation_started", projectId, { tokensAvailable, durationHours });

  return window;
}

/**
 * Get participation window for a project
 */
export function getParticipationWindow(projectId: string): ParticipationWindow | undefined {
  return participationWindows.get(projectId);
}

/**
 * Start allocation period
 */
export function startAllocationPeriod(
  projectId: string,
  designType: "design1" | "design2",
  totalCommittedPi: number,
  tokensAvailable: number,
  escrowWallet: string,
  lpAddress: string
): AllocationPeriod {
  const design = designType === "design1"
    ? calculateDesign1Allocation(totalCommittedPi, tokensAvailable)
    : calculateDesign2Allocation(totalCommittedPi, tokensAvailable);

  const period: AllocationPeriod = {
    projectId,
    design,
    escrowWallet,
    lpAddress,
    status: "allocating",
    allocations: [],
    startTime: new Date().toISOString(),
  };

  allocationPeriods.set(projectId, period);
  emitEvent("allocation_started", projectId, { design: designType, totalCommittedPi });

  return period;
}

/**
 * Get allocation period for a project
 */
export function getAllocationPeriod(projectId: string): AllocationPeriod | undefined {
  return allocationPeriods.get(projectId);
}

/**
 * Get TGE state for a project
 */
export function getTGEState(projectId: string): TGEState | undefined {
  return tgeStates.get(projectId);
}

/**
 * Get summary of all launchpad projects
 */
export function getLaunchpadSummary(): LaunchpadProjectSummary[] {
  const summaries: LaunchpadProjectSummary[] = [];

  participationWindows.forEach((window, projectId) => {
    const allocation = allocationPeriods.get(projectId);
    const tge = tgeStates.get(projectId);

    let status: LaunchpadProjectSummary["status"] = "participation";
    if (tge?.isMarketOpen) {
      status = "live";
    } else if (allocation) {
      status = allocation.status === "completed" ? "completed" : "allocation";
    }

    summaries.push({
      projectId,
      name: projectId,
      status,
      design: allocation?.design.design || "design1",
      totalRaised: allocation?.design.totalCommittedPi || 0,
      participants: window.totalParticipants,
      currentPrice: tge?.lpState.spotPrice,
      listingPrice: allocation?.design.listingPrice || 0,
      tgeDate: tge?.tgeTime,
      lpDepth: tge?.lpState.piReserve || 0,
    });
  });

  return summaries;
}

/**
 * Validate PiRC configuration
 */
export function validatePiRCConfig(config: Partial<PiRCConfig>): { 
  valid: boolean; 
  errors: string[] 
} {
  const errors: string[] = [];

  if (config.network && !["mainnet", "testnet"].includes(config.network)) {
    errors.push("Network must be 'mainnet' or 'testnet'");
  }

  if (config.syncIntervalMs && config.syncIntervalMs < 1000) {
    errors.push("Sync interval must be at least 1000ms");
  }

  if (config.nodeConfig?.minStakingAmount && config.nodeConfig.minStakingAmount < 0) {
    errors.push("Minimum staking amount must be non-negative");
  }

  return { valid: errors.length === 0, errors };
}

// Export singleton instance
let configInstance: PiRCConfig = DEFAULT_PIRC_CONFIG;

export function initializePiRC(config?: Partial<PiRCConfig>): void {
  if (config) {
    const validation = validatePiRCConfig(config);
    if (!validation.valid) {
      console.warn("[PiRC] Config validation warnings:", validation.errors);
    }
    configInstance = { ...DEFAULT_PIRC_CONFIG, ...config };
  }
  
  console.log("[PiRC] Initialized with spec:", ACTIVE_PIRC_SPEC.version);
  console.log("[PiRC] Network:", configInstance.network);
  console.log("[PiRC] Supported designs:", configInstance.supportedDesigns.join(", "));
}

export function getPiRCInstance(): PiRCConfig {
  return configInstance;
}

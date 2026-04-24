/**
 * PiRC (Pi Request for Comments) Type Definitions
 * Based on https://github.com/PiNetwork/PiRC
 * 
 * Implements PiRC1: Pi Ecosystem Token Design
 * Compatible with Stellar SCP (Stellar Consensus Protocol)
 */

// ============================================================================
// Core Protocol Types
// ============================================================================

export type PiRCVersion = "PiRC1" | "PiRC2" | "PiRC3";

export type PiRCStatus = 
  | "draft"
  | "review"
  | "active"
  | "finalized"
  | "deprecated";

export type PiRCSpec = {
  version: PiRCVersion;
  status: PiRCStatus;
  title: string;
  author: string;
  created: string;
  updated: string;
  requires?: PiRCVersion[];
};

// ============================================================================
// PiRC1: Pi Launchpad - Ecosystem Token Design
// ============================================================================

/**
 * Participation Window - Users stake Pi for PiPower
 * Section 3 of PiRC1
 */
export type PiPowerCalculation = {
  stakedPi: number;           // Amount of Pi staked by user
  totalStakedPi: number;      // Total Pi staked by all users
  baselinePiPower: number;    // Baseline for long-term lockers
  piPower: number;            // Calculated PiPower
  maxTokensCommittable: number; // Maximum tokens user can commit to buy
};

export type EngagementTier = "top" | "middle" | "bottom";

export type EngagementScore = {
  userId: string;
  score: number;
  rank: number;
  tier: EngagementTier;
  registrationDate: string;
  milestones: string[];
  appInteractions: number;
};

export type ParticipationWindow = {
  projectId: string;
  startTime: string;
  endTime: string;
  status: "upcoming" | "active" | "closed";
  totalParticipants: number;
  totalStaked: number;
  tokensAvailable: number;
  participants: PiPowerCalculation[];
  engagementScores: EngagementScore[];
};

// ============================================================================
// Allocation Period - Section 4 of PiRC1
// ============================================================================

/**
 * Design Option 1: Simple model with engagement-based discount
 * All committed Pi goes into LP
 */
export type AllocationDesign1 = {
  design: "design1";
  totalCommittedPi: number;      // C - total Pi committed
  purchaseTokens: number;        // T_purchase - tokens for participants
  liquidityTokens: number;       // T_liquidity - tokens for LP
  engageTokens: number;          // T_engage - tokens for engagement rewards (5% of T)
  listingPrice: number;          // p_list = C/T
  effectivePrices: {
    top: number;                 // ~0.909 * p_list (10% discount)
    middle: number;              // ~0.952 * p_list (5% discount)
    bottom: number;              // 1.0 * p_list (no discount)
  };
};

/**
 * Design Option 2: Fixed-price + LP swap model
 * 50% direct sale, 50% engagement-gated swaps
 */
export type AllocationDesign2 = {
  design: "design2";
  totalCommittedPi: number;      // C - total Pi committed
  fixedPricePortion: number;     // C/2 - for direct purchase at listing price
  swapPortion: number;           // C/2 - for engagement-based swaps
  launchAllocation: number;      // T - total tokens in launchpad
  lpTokens: number;              // 0.8T - tokens deposited to LP
  directSaleTokens: number;      // 0.2T - tokens sold at listing price
  listingPrice: number;          // p_list = C / 0.4T
  initialPoolPrice: number;      // p_init = p_list / 4
  effectivePriceRange: {
    minPrice: number;            // 0.4 * p_list (most engaged, 60% discount)
    maxPrice: number;            // 1.0 * p_list (least engaged, no discount)
  };
  constantProduct: number;       // k = 0.4CT
};

export type AllocationDesign = AllocationDesign1 | AllocationDesign2;

export type AllocationPeriod = {
  projectId: string;
  design: AllocationDesign;
  escrowWallet: string;
  lpAddress: string;
  status: "pending" | "allocating" | "completed";
  allocations: TokenAllocation[];
  startTime: string;
  endTime?: string;
};

export type TokenAllocation = {
  userId: string;
  committedPi: number;           // c_i - user's committed Pi
  baseTokens: number;            // t_i^base = c_i / p_list
  engageTokens: number;          // t_i^engage - bonus tokens from engagement
  totalTokens: number;           // t_i^base + t_i^engage
  effectivePrice: number;        // p_eff = c_i / totalTokens
  engagementTier: EngagementTier;
  lockupPeriod?: number;         // Days until tokens unlock
};

// ============================================================================
// TGE / Market Opening - Section 5 of PiRC1
// ============================================================================

export type LiquidityPoolState = {
  piReserve: number;             // x - Pi in pool
  tokenReserve: number;          // y - Tokens in pool
  constantProduct: number;       // k = x * y
  spotPrice: number;             // p_spot = x / y
  totalLPShares: number;
  escrowShares: number;          // Locked shares (cannot withdraw)
  swapFee: number;               // 0.3% per swap
};

export type TGEState = {
  projectId: string;
  tgeTime: string;
  lpState: LiquidityPoolState;
  circulatingSupply: number;     // Tokens in circulation at TGE
  tokensInLP: number;            // Tokens in liquidity pool
  tokensOutsideLP: number;       // Tokens held by participants
  priceFloor: number;            // Theoretical minimum price
  listingPrice: number;
  isMarketOpen: boolean;
  escrowLocked: boolean;         // Escrow wallet signing disabled
};

// ============================================================================
// Stellar SCP Integration Types
// ============================================================================

export type SCPPhase = 
  | "NOMINATING"     // Proposing candidate values
  | "PREPARING"      // Verifying quorum agreement
  | "CONFIRMING"     // Ensuring commitment
  | "EXTERNALIZED";  // Value agreed, applied to ledger

export type SCPQuorumSet = {
  threshold: number;             // Minimum nodes required to agree
  validators: string[];          // Node public keys
  innerSets?: SCPQuorumSet[];    // Nested quorum sets
};

export type SCPStatement = {
  nodeId: string;
  slotIndex: number;             // Ledger sequence number
  ballot: {
    counter: number;
    value: string;               // Hash of proposed value
  };
  phase: SCPPhase;
  timestamp: string;
};

export type SCPNetworkUpgrade = {
  upgradeId: string;
  currentProtocol: number;
  targetProtocol: number;
  scheduledTime: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  affectedNodes: string[];
  requiredActions: string[];
  changelog: string[];
};

export type SCPValidatorStatus = {
  nodeId: string;
  publicKey: string;
  isActive: boolean;
  lastVote: string;
  quorumSet: SCPQuorumSet;
  processedLedgers: number;
  missedLedgers: number;
  uptime: number;
  version: string;
};

// ============================================================================
// Protocol Synchronization Types
// ============================================================================

export type ProtocolSyncState = {
  piNetwork: {
    version: string;
    lastBlock: number;
    lastBlockTime: string;
    activeNodes: number;
    consensusHealth: "healthy" | "degraded" | "critical";
  };
  stellar: {
    protocolVersion: number;
    lastLedger: number;
    lastLedgerTime: string;
    phase: SCPPhase;
    validators: number;
  };
  syncStatus: "synced" | "syncing" | "behind" | "error";
  lastSync: string;
  pendingUpgrades: SCPNetworkUpgrade[];
};

export type ProtocolChangeEvent = {
  type: "pirc_update" | "scp_upgrade" | "network_change" | "validator_change";
  timestamp: string;
  source: "pi_network" | "stellar" | "local";
  data: {
    before: Record<string, unknown>;
    after: Record<string, unknown>;
    description: string;
  };
  requiresAction: boolean;
  suggestedActions?: string[];
};

// ============================================================================
// Harmony State - Cross-Protocol Integration
// ============================================================================

export type HarmonyState = {
  piRC: {
    activeSpec: PiRCSpec;
    launchpadProjects: number;
    totalValueLocked: number;
    activeLPs: number;
  };
  scp: {
    currentPhase: SCPPhase;
    protocolVersion: number;
    lastLedger: number;
    consensusRound: number;
  };
  nodes: {
    totalPiNodes: number;
    totalSupernodes: number;
    stellarValidators: number;
    networkCapacity: number;
  };
  ecosystem: {
    isHarmonized: boolean;
    lastHarmonyCheck: string;
    divergences: string[];
    autoSyncEnabled: boolean;
  };
};

// ============================================================================
// Event & Callback Types
// ============================================================================

export type PiRCEventType = 
  | "participation_started"
  | "participation_ended"
  | "allocation_started"
  | "allocation_completed"
  | "tge_started"
  | "market_opened"
  | "price_update"
  | "liquidity_added"
  | "protocol_upgrade"
  | "node_joined"
  | "node_left"
  | "harmony_check"
  | "sync_completed";

export type PiRCEvent = {
  type: PiRCEventType;
  timestamp: string;
  projectId?: string;
  data: Record<string, unknown>;
  metadata?: {
    source: string;
    version: string;
    signature?: string;
  };
};

export type PiRCEventHandler = (event: PiRCEvent) => void | Promise<void>;

// ============================================================================
// Configuration Types
// ============================================================================

export type PiRCConfig = {
  network: "mainnet" | "testnet";
  horizonUrl: string;
  piNetworkApiUrl: string;
  publicKey: string;
  autoSync: boolean;
  syncIntervalMs: number;
  supportedDesigns: ("design1" | "design2")[];
  nodeConfig: {
    minStakingAmount: number;
    supernodeThreshold: number;
    validatorRequirements: string[];
  };
};

// ============================================================================
// API Response Types
// ============================================================================

export type PiRCAPIResponse<T> = {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  timestamp: string;
  requestId: string;
};

export type LaunchpadProjectSummary = {
  projectId: string;
  name: string;
  status: "participation" | "allocation" | "live" | "completed";
  design: "design1" | "design2";
  totalRaised: number;
  participants: number;
  currentPrice?: number;
  listingPrice: number;
  tgeDate?: string;
  lpDepth: number;
};

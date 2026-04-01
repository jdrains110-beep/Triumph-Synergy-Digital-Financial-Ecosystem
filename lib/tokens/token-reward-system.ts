/**
 * Token Reward System
 * 
 * Utility tokens pegged to Pi Network for liquidity.
 * Earned through activities: games, videos, teaching, working, etc.
 * Businesses, employees, and individuals can all participate.
 */

import { EventEmitter } from "events";

// ============================================================================
// Types
// ============================================================================

export type TokenType =
  | "SYNERGY"      // Main utility token
  | "TRIUMPH"      // Premium reward token
  | "LEARN"        // Education token
  | "PLAY"         // Gaming token
  | "WATCH"        // Video/content token
  | "WORK"         // Work/productivity token
  | "TEACH"        // Teaching/mentoring token
  | "CREATE"       // Creator token
  | "SOCIAL"       // Social engagement token
  | "LOYALTY";     // Business loyalty token

export type ActivityType =
  | "video-watch"
  | "video-complete"
  | "game-play"
  | "game-win"
  | "game-achievement"
  | "lesson-complete"
  | "course-complete"
  | "teaching"
  | "mentoring"
  | "work-task"
  | "work-shift"
  | "work-milestone"
  | "content-create"
  | "content-engage"
  | "social-share"
  | "social-refer"
  | "purchase"
  | "sale"
  | "review"
  | "auction-participate"
  | "auction-win"
  | "daily-login"
  | "streak-bonus"
  | "community-help"
  | "bug-report"
  | "survey-complete";

export interface TokenInfo {
  type: TokenType;
  name: string;
  symbol: string;
  description: string;
  piPegRatio: number;        // How many tokens = 1 Pi
  totalSupply: number;
  circulatingSupply: number;
  burnedSupply: number;
  stakingPool: number;
  liquidityPool: number;
  createdAt: Date;
}

export interface TokenBalance {
  tokenType: TokenType;
  available: number;
  staked: number;
  pending: number;
  locked: number;
  totalEarned: number;
  totalSpent: number;
  lastUpdated: Date;
}

export interface TokenWallet {
  id: string;
  ownerId: string;
  ownerType: "individual" | "business" | "merchant" | "system";
  piWalletAddress?: string;
  balances: Map<TokenType, TokenBalance>;
  createdAt: Date;
  updatedAt: Date;
}

export interface TokenTransaction {
  id: string;
  type: "earn" | "spend" | "transfer" | "stake" | "unstake" | "swap" | "burn" | "mint";
  tokenType: TokenType;
  amount: number;
  fromWalletId?: string;
  toWalletId?: string;
  activityType?: ActivityType;
  activityId?: string;
  description: string;
  piEquivalent: number;
  status: "pending" | "completed" | "failed" | "cancelled";
  createdAt: Date;
  completedAt?: Date;
  metadata: Record<string, unknown>;
}

export interface ActivityReward {
  activityType: ActivityType;
  tokenType: TokenType;
  baseReward: number;
  multiplier: number;
  cooldown: number;        // Minutes between rewards
  dailyLimit: number;      // Max rewards per day
  description: string;
}

export interface StakingPool {
  tokenType: TokenType;
  totalStaked: number;
  apy: number;             // Annual percentage yield
  minStake: number;
  lockPeriod: number;      // Days
  participants: number;
}

export interface LiquidityPool {
  id: string;
  tokenType: TokenType;
  tokenReserve: number;
  piReserve: number;
  lpTokenSupply: number;
  fee: number;             // Percentage
  volume24h: number;
  createdAt: Date;
}

// ============================================================================
// Token Reward Manager
// ============================================================================

class TokenRewardManager extends EventEmitter {
  private static instance: TokenRewardManager;
  
  private tokens: Map<TokenType, TokenInfo> = new Map();
  private wallets: Map<string, TokenWallet> = new Map();
  private transactions: Map<string, TokenTransaction> = new Map();
  private activityRewards: Map<ActivityType, ActivityReward> = new Map();
  private stakingPools: Map<TokenType, StakingPool> = new Map();
  private liquidityPools: Map<string, LiquidityPool> = new Map();
  
  // Track daily limits
  private dailyRewards: Map<string, Map<ActivityType, { count: number; date: string }>> = new Map();
  
  // Owner index
  private ownerWalletIndex: Map<string, string> = new Map(); // ownerId -> walletId
  
  private constructor() {
    super();
    this.setMaxListeners(100);
    this.initializeTokens();
    this.initializeActivityRewards();
    this.initializeStakingPools();
  }
  
  static getInstance(): TokenRewardManager {
    if (!TokenRewardManager.instance) {
      TokenRewardManager.instance = new TokenRewardManager();
    }
    return TokenRewardManager.instance;
  }
  
  // ==========================================================================
  // Initialization
  // ==========================================================================
  
  private initializeTokens(): void {
    const tokenConfigs: Omit<TokenInfo, "circulatingSupply" | "burnedSupply" | "stakingPool" | "liquidityPool" | "createdAt">[] = [
      {
        type: "SYNERGY",
        name: "Synergy Token",
        symbol: "SYN",
        description: "Main utility token for the Triumph Synergy ecosystem",
        piPegRatio: 100,      // 100 SYN = 1 Pi
        totalSupply: 1_000_000_000,
      },
      {
        type: "TRIUMPH",
        name: "Triumph Token",
        symbol: "TRI",
        description: "Premium reward token for achievements and milestones",
        piPegRatio: 10,       // 10 TRI = 1 Pi
        totalSupply: 100_000_000,
      },
      {
        type: "LEARN",
        name: "Learn Token",
        symbol: "LRN",
        description: "Education and learning rewards",
        piPegRatio: 50,       // 50 LRN = 1 Pi
        totalSupply: 500_000_000,
      },
      {
        type: "PLAY",
        name: "Play Token",
        symbol: "PLY",
        description: "Gaming and entertainment rewards",
        piPegRatio: 200,      // 200 PLY = 1 Pi
        totalSupply: 2_000_000_000,
      },
      {
        type: "WATCH",
        name: "Watch Token",
        symbol: "WCH",
        description: "Video and content consumption rewards",
        piPegRatio: 500,      // 500 WCH = 1 Pi
        totalSupply: 5_000_000_000,
      },
      {
        type: "WORK",
        name: "Work Token",
        symbol: "WRK",
        description: "Productivity and work achievements",
        piPegRatio: 25,       // 25 WRK = 1 Pi
        totalSupply: 250_000_000,
      },
      {
        type: "TEACH",
        name: "Teach Token",
        symbol: "TCH",
        description: "Teaching and mentoring rewards",
        piPegRatio: 20,       // 20 TCH = 1 Pi
        totalSupply: 200_000_000,
      },
      {
        type: "CREATE",
        name: "Create Token",
        symbol: "CRT",
        description: "Content creation rewards",
        piPegRatio: 30,       // 30 CRT = 1 Pi
        totalSupply: 300_000_000,
      },
      {
        type: "SOCIAL",
        name: "Social Token",
        symbol: "SOC",
        description: "Social engagement and community rewards",
        piPegRatio: 100,      // 100 SOC = 1 Pi
        totalSupply: 1_000_000_000,
      },
      {
        type: "LOYALTY",
        name: "Loyalty Token",
        symbol: "LOY",
        description: "Business loyalty and customer rewards",
        piPegRatio: 50,       // 50 LOY = 1 Pi
        totalSupply: 500_000_000,
      },
    ];
    
    const now = new Date();
    for (const config of tokenConfigs) {
      this.tokens.set(config.type, {
        ...config,
        circulatingSupply: 0,
        burnedSupply: 0,
        stakingPool: 0,
        liquidityPool: config.totalSupply * 0.1, // 10% for liquidity
        createdAt: now,
      });
    }
  }
  
  private initializeActivityRewards(): void {
    const rewards: ActivityReward[] = [
      // Video activities
      { activityType: "video-watch", tokenType: "WATCH", baseReward: 5, multiplier: 1, cooldown: 1, dailyLimit: 100, description: "Watch a video" },
      { activityType: "video-complete", tokenType: "WATCH", baseReward: 20, multiplier: 1, cooldown: 0, dailyLimit: 50, description: "Complete watching a video" },
      
      // Gaming activities
      { activityType: "game-play", tokenType: "PLAY", baseReward: 10, multiplier: 1, cooldown: 5, dailyLimit: 50, description: "Play a game session" },
      { activityType: "game-win", tokenType: "PLAY", baseReward: 50, multiplier: 1.5, cooldown: 0, dailyLimit: 20, description: "Win a game" },
      { activityType: "game-achievement", tokenType: "TRIUMPH", baseReward: 5, multiplier: 2, cooldown: 0, dailyLimit: 10, description: "Unlock achievement" },
      
      // Learning activities
      { activityType: "lesson-complete", tokenType: "LEARN", baseReward: 25, multiplier: 1, cooldown: 0, dailyLimit: 20, description: "Complete a lesson" },
      { activityType: "course-complete", tokenType: "LEARN", baseReward: 500, multiplier: 2, cooldown: 0, dailyLimit: 5, description: "Complete a course" },
      
      // Teaching activities
      { activityType: "teaching", tokenType: "TEACH", baseReward: 100, multiplier: 1, cooldown: 30, dailyLimit: 10, description: "Teach a session" },
      { activityType: "mentoring", tokenType: "TEACH", baseReward: 50, multiplier: 1.5, cooldown: 60, dailyLimit: 5, description: "Mentor someone" },
      
      // Work activities
      { activityType: "work-task", tokenType: "WORK", baseReward: 20, multiplier: 1, cooldown: 0, dailyLimit: 50, description: "Complete a work task" },
      { activityType: "work-shift", tokenType: "WORK", baseReward: 200, multiplier: 1, cooldown: 0, dailyLimit: 2, description: "Complete a work shift" },
      { activityType: "work-milestone", tokenType: "TRIUMPH", baseReward: 100, multiplier: 2, cooldown: 0, dailyLimit: 5, description: "Reach work milestone" },
      
      // Content creation
      { activityType: "content-create", tokenType: "CREATE", baseReward: 100, multiplier: 1, cooldown: 0, dailyLimit: 10, description: "Create content" },
      { activityType: "content-engage", tokenType: "CREATE", baseReward: 5, multiplier: 1, cooldown: 1, dailyLimit: 100, description: "Content engagement received" },
      
      // Social activities
      { activityType: "social-share", tokenType: "SOCIAL", baseReward: 10, multiplier: 1, cooldown: 5, dailyLimit: 20, description: "Share content" },
      { activityType: "social-refer", tokenType: "SOCIAL", baseReward: 500, multiplier: 1, cooldown: 0, dailyLimit: 10, description: "Refer a new user" },
      
      // Commerce activities
      { activityType: "purchase", tokenType: "LOYALTY", baseReward: 10, multiplier: 1, cooldown: 0, dailyLimit: 50, description: "Make a purchase" },
      { activityType: "sale", tokenType: "SYNERGY", baseReward: 20, multiplier: 1, cooldown: 0, dailyLimit: 100, description: "Complete a sale" },
      { activityType: "review", tokenType: "SOCIAL", baseReward: 25, multiplier: 1, cooldown: 0, dailyLimit: 10, description: "Write a review" },
      
      // Auction activities
      { activityType: "auction-participate", tokenType: "SYNERGY", baseReward: 5, multiplier: 1, cooldown: 1, dailyLimit: 50, description: "Participate in auction" },
      { activityType: "auction-win", tokenType: "TRIUMPH", baseReward: 50, multiplier: 1.5, cooldown: 0, dailyLimit: 10, description: "Win an auction" },
      
      // Daily/Engagement
      { activityType: "daily-login", tokenType: "SYNERGY", baseReward: 50, multiplier: 1, cooldown: 1440, dailyLimit: 1, description: "Daily login" },
      { activityType: "streak-bonus", tokenType: "TRIUMPH", baseReward: 25, multiplier: 1, cooldown: 0, dailyLimit: 1, description: "Login streak bonus" },
      
      // Community
      { activityType: "community-help", tokenType: "SOCIAL", baseReward: 50, multiplier: 1, cooldown: 0, dailyLimit: 20, description: "Help community member" },
      { activityType: "bug-report", tokenType: "TRIUMPH", baseReward: 100, multiplier: 1, cooldown: 0, dailyLimit: 5, description: "Report a bug" },
      { activityType: "survey-complete", tokenType: "SYNERGY", baseReward: 100, multiplier: 1, cooldown: 0, dailyLimit: 5, description: "Complete a survey" },
    ];
    
    for (const reward of rewards) {
      this.activityRewards.set(reward.activityType, reward);
    }
  }
  
  private initializeStakingPools(): void {
    const pools: Omit<StakingPool, "totalStaked" | "participants">[] = [
      { tokenType: "SYNERGY", apy: 12, minStake: 100, lockPeriod: 30 },
      { tokenType: "TRIUMPH", apy: 18, minStake: 10, lockPeriod: 60 },
      { tokenType: "LEARN", apy: 15, minStake: 50, lockPeriod: 30 },
      { tokenType: "WORK", apy: 20, minStake: 25, lockPeriod: 90 },
      { tokenType: "LOYALTY", apy: 10, minStake: 100, lockPeriod: 14 },
    ];
    
    for (const pool of pools) {
      this.stakingPools.set(pool.tokenType, {
        ...pool,
        totalStaked: 0,
        participants: 0,
      });
    }
  }
  
  // ==========================================================================
  // Wallet Management
  // ==========================================================================
  
  /**
   * Create a token wallet for a user/business
   */
  createWallet(params: {
    ownerId: string;
    ownerType: TokenWallet["ownerType"];
    piWalletAddress?: string;
  }): TokenWallet {
    // Check if wallet exists
    const existingWalletId = this.ownerWalletIndex.get(params.ownerId);
    if (existingWalletId) {
      const existing = this.wallets.get(existingWalletId);
      if (existing) return existing;
    }
    
    const id = `wallet-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const now = new Date();
    
    const balances = new Map<TokenType, TokenBalance>();
    for (const tokenType of this.tokens.keys()) {
      balances.set(tokenType, {
        tokenType,
        available: 0,
        staked: 0,
        pending: 0,
        locked: 0,
        totalEarned: 0,
        totalSpent: 0,
        lastUpdated: now,
      });
    }
    
    const wallet: TokenWallet = {
      id,
      ownerId: params.ownerId,
      ownerType: params.ownerType,
      piWalletAddress: params.piWalletAddress,
      balances,
      createdAt: now,
      updatedAt: now,
    };
    
    this.wallets.set(id, wallet);
    this.ownerWalletIndex.set(params.ownerId, id);
    
    this.emit("wallet-created", { wallet });
    return wallet;
  }
  
  /**
   * Get wallet by ID
   */
  getWallet(walletId: string): TokenWallet | undefined {
    return this.wallets.get(walletId);
  }
  
  /**
   * Get wallet by owner
   */
  getWalletByOwner(ownerId: string): TokenWallet | undefined {
    const walletId = this.ownerWalletIndex.get(ownerId);
    return walletId ? this.wallets.get(walletId) : undefined;
  }
  
  /**
   * Get or create wallet
   */
  getOrCreateWallet(ownerId: string, ownerType: TokenWallet["ownerType"]): TokenWallet {
    const existing = this.getWalletByOwner(ownerId);
    if (existing) return existing;
    return this.createWallet({ ownerId, ownerType });
  }
  
  /**
   * Get balance for a specific token
   */
  getBalance(walletId: string, tokenType: TokenType): TokenBalance | null {
    const wallet = this.wallets.get(walletId);
    if (!wallet) return null;
    return wallet.balances.get(tokenType) || null;
  }
  
  /**
   * Get all balances
   */
  getAllBalances(walletId: string): TokenBalance[] {
    const wallet = this.wallets.get(walletId);
    if (!wallet) return [];
    return Array.from(wallet.balances.values());
  }
  
  // ==========================================================================
  // Token Operations
  // ==========================================================================
  
  /**
   * Reward tokens for an activity
   */
  rewardActivity(params: {
    walletId: string;
    activityType: ActivityType;
    activityId?: string;
    multiplier?: number;
  }): TokenTransaction | null {
    const wallet = this.wallets.get(params.walletId);
    if (!wallet) throw new Error("Wallet not found");
    
    const reward = this.activityRewards.get(params.activityType);
    if (!reward) throw new Error("Unknown activity type");
    
    // Check daily limit
    const today = new Date().toISOString().split("T")[0];
    let userDailyRewards = this.dailyRewards.get(params.walletId);
    if (!userDailyRewards) {
      userDailyRewards = new Map();
      this.dailyRewards.set(params.walletId, userDailyRewards);
    }
    
    const activityDaily = userDailyRewards.get(params.activityType);
    if (activityDaily) {
      if (activityDaily.date !== today) {
        // Reset for new day
        userDailyRewards.set(params.activityType, { count: 0, date: today });
      } else if (activityDaily.count >= reward.dailyLimit) {
        // Hit daily limit
        return null;
      }
    } else {
      userDailyRewards.set(params.activityType, { count: 0, date: today });
    }
    
    // Calculate reward
    const amount = Math.floor(reward.baseReward * reward.multiplier * (params.multiplier || 1));
    
    // Mint tokens
    const transaction = this.mintTokens({
      toWalletId: params.walletId,
      tokenType: reward.tokenType,
      amount,
      activityType: params.activityType,
      activityId: params.activityId,
      description: `Reward: ${reward.description}`,
    });
    
    // Update daily count
    const current = userDailyRewards.get(params.activityType)!;
    current.count++;
    
    return transaction;
  }
  
  /**
   * Mint new tokens (for rewards)
   */
  mintTokens(params: {
    toWalletId: string;
    tokenType: TokenType;
    amount: number;
    activityType?: ActivityType;
    activityId?: string;
    description: string;
  }): TokenTransaction {
    const wallet = this.wallets.get(params.toWalletId);
    if (!wallet) throw new Error("Wallet not found");
    
    const tokenInfo = this.tokens.get(params.tokenType);
    if (!tokenInfo) throw new Error("Unknown token type");
    
    // Check supply
    if (tokenInfo.circulatingSupply + params.amount > tokenInfo.totalSupply) {
      throw new Error("Exceeds total supply");
    }
    
    const id = `tx-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const now = new Date();
    
    const transaction: TokenTransaction = {
      id,
      type: "mint",
      tokenType: params.tokenType,
      amount: params.amount,
      toWalletId: params.toWalletId,
      activityType: params.activityType,
      activityId: params.activityId,
      description: params.description,
      piEquivalent: params.amount / tokenInfo.piPegRatio,
      status: "completed",
      createdAt: now,
      completedAt: now,
      metadata: {},
    };
    
    // Update balance
    const balance = wallet.balances.get(params.tokenType)!;
    balance.available += params.amount;
    balance.totalEarned += params.amount;
    balance.lastUpdated = now;
    wallet.updatedAt = now;
    
    // Update supply
    tokenInfo.circulatingSupply += params.amount;
    
    this.transactions.set(id, transaction);
    this.emit("tokens-minted", { transaction });
    
    return transaction;
  }
  
  /**
   * Transfer tokens between wallets
   */
  transferTokens(params: {
    fromWalletId: string;
    toWalletId: string;
    tokenType: TokenType;
    amount: number;
    description: string;
  }): TokenTransaction {
    const fromWallet = this.wallets.get(params.fromWalletId);
    const toWallet = this.wallets.get(params.toWalletId);
    
    if (!fromWallet) throw new Error("Source wallet not found");
    if (!toWallet) throw new Error("Destination wallet not found");
    
    const fromBalance = fromWallet.balances.get(params.tokenType)!;
    if (fromBalance.available < params.amount) {
      throw new Error("Insufficient balance");
    }
    
    const tokenInfo = this.tokens.get(params.tokenType)!;
    const id = `tx-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const now = new Date();
    
    const transaction: TokenTransaction = {
      id,
      type: "transfer",
      tokenType: params.tokenType,
      amount: params.amount,
      fromWalletId: params.fromWalletId,
      toWalletId: params.toWalletId,
      description: params.description,
      piEquivalent: params.amount / tokenInfo.piPegRatio,
      status: "completed",
      createdAt: now,
      completedAt: now,
      metadata: {},
    };
    
    // Update balances
    fromBalance.available -= params.amount;
    fromBalance.totalSpent += params.amount;
    fromBalance.lastUpdated = now;
    fromWallet.updatedAt = now;
    
    const toBalance = toWallet.balances.get(params.tokenType)!;
    toBalance.available += params.amount;
    toBalance.totalEarned += params.amount;
    toBalance.lastUpdated = now;
    toWallet.updatedAt = now;
    
    this.transactions.set(id, transaction);
    this.emit("tokens-transferred", { transaction });
    
    return transaction;
  }
  
  /**
   * Spend tokens (e.g., for purchases, auctions)
   */
  spendTokens(params: {
    walletId: string;
    tokenType: TokenType;
    amount: number;
    description: string;
    metadata?: Record<string, unknown>;
  }): TokenTransaction {
    const wallet = this.wallets.get(params.walletId);
    if (!wallet) throw new Error("Wallet not found");
    
    const balance = wallet.balances.get(params.tokenType)!;
    if (balance.available < params.amount) {
      throw new Error("Insufficient balance");
    }
    
    const tokenInfo = this.tokens.get(params.tokenType)!;
    const id = `tx-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const now = new Date();
    
    const transaction: TokenTransaction = {
      id,
      type: "spend",
      tokenType: params.tokenType,
      amount: params.amount,
      fromWalletId: params.walletId,
      description: params.description,
      piEquivalent: params.amount / tokenInfo.piPegRatio,
      status: "completed",
      createdAt: now,
      completedAt: now,
      metadata: params.metadata || {},
    };
    
    balance.available -= params.amount;
    balance.totalSpent += params.amount;
    balance.lastUpdated = now;
    wallet.updatedAt = now;
    
    this.transactions.set(id, transaction);
    this.emit("tokens-spent", { transaction });
    
    return transaction;
  }
  
  /**
   * Burn tokens (remove from circulation)
   */
  burnTokens(params: {
    walletId: string;
    tokenType: TokenType;
    amount: number;
    reason: string;
  }): TokenTransaction {
    const wallet = this.wallets.get(params.walletId);
    if (!wallet) throw new Error("Wallet not found");
    
    const balance = wallet.balances.get(params.tokenType)!;
    if (balance.available < params.amount) {
      throw new Error("Insufficient balance");
    }
    
    const tokenInfo = this.tokens.get(params.tokenType)!;
    const id = `tx-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const now = new Date();
    
    const transaction: TokenTransaction = {
      id,
      type: "burn",
      tokenType: params.tokenType,
      amount: params.amount,
      fromWalletId: params.walletId,
      description: `Burn: ${params.reason}`,
      piEquivalent: params.amount / tokenInfo.piPegRatio,
      status: "completed",
      createdAt: now,
      completedAt: now,
      metadata: { reason: params.reason },
    };
    
    balance.available -= params.amount;
    balance.lastUpdated = now;
    wallet.updatedAt = now;
    
    tokenInfo.circulatingSupply -= params.amount;
    tokenInfo.burnedSupply += params.amount;
    
    this.transactions.set(id, transaction);
    this.emit("tokens-burned", { transaction });
    
    return transaction;
  }
  
  // ==========================================================================
  // Staking
  // ==========================================================================
  
  /**
   * Stake tokens
   */
  stakeTokens(params: {
    walletId: string;
    tokenType: TokenType;
    amount: number;
  }): TokenTransaction {
    const wallet = this.wallets.get(params.walletId);
    if (!wallet) throw new Error("Wallet not found");
    
    const pool = this.stakingPools.get(params.tokenType);
    if (!pool) throw new Error("No staking pool for this token");
    
    if (params.amount < pool.minStake) {
      throw new Error(`Minimum stake is ${pool.minStake}`);
    }
    
    const balance = wallet.balances.get(params.tokenType)!;
    if (balance.available < params.amount) {
      throw new Error("Insufficient balance");
    }
    
    const tokenInfo = this.tokens.get(params.tokenType)!;
    const id = `tx-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const now = new Date();
    
    const transaction: TokenTransaction = {
      id,
      type: "stake",
      tokenType: params.tokenType,
      amount: params.amount,
      fromWalletId: params.walletId,
      description: `Stake ${params.amount} ${tokenInfo.symbol} for ${pool.apy}% APY`,
      piEquivalent: params.amount / tokenInfo.piPegRatio,
      status: "completed",
      createdAt: now,
      completedAt: now,
      metadata: {
        apy: pool.apy,
        lockPeriod: pool.lockPeriod,
        unlockDate: new Date(now.getTime() + pool.lockPeriod * 24 * 60 * 60 * 1000),
      },
    };
    
    balance.available -= params.amount;
    balance.staked += params.amount;
    balance.lastUpdated = now;
    wallet.updatedAt = now;
    
    pool.totalStaked += params.amount;
    pool.participants++;
    tokenInfo.stakingPool += params.amount;
    
    this.transactions.set(id, transaction);
    this.emit("tokens-staked", { transaction });
    
    return transaction;
  }
  
  /**
   * Unstake tokens
   */
  unstakeTokens(params: {
    walletId: string;
    tokenType: TokenType;
    amount: number;
  }): TokenTransaction {
    const wallet = this.wallets.get(params.walletId);
    if (!wallet) throw new Error("Wallet not found");
    
    const pool = this.stakingPools.get(params.tokenType);
    if (!pool) throw new Error("No staking pool for this token");
    
    const balance = wallet.balances.get(params.tokenType)!;
    if (balance.staked < params.amount) {
      throw new Error("Insufficient staked balance");
    }
    
    const tokenInfo = this.tokens.get(params.tokenType)!;
    const id = `tx-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const now = new Date();
    
    const transaction: TokenTransaction = {
      id,
      type: "unstake",
      tokenType: params.tokenType,
      amount: params.amount,
      toWalletId: params.walletId,
      description: `Unstake ${params.amount} ${tokenInfo.symbol}`,
      piEquivalent: params.amount / tokenInfo.piPegRatio,
      status: "completed",
      createdAt: now,
      completedAt: now,
      metadata: {},
    };
    
    balance.staked -= params.amount;
    balance.available += params.amount;
    balance.lastUpdated = now;
    wallet.updatedAt = now;
    
    pool.totalStaked -= params.amount;
    tokenInfo.stakingPool -= params.amount;
    
    this.transactions.set(id, transaction);
    this.emit("tokens-unstaked", { transaction });
    
    return transaction;
  }
  
  // ==========================================================================
  // Swap (Token to Pi conversion)
  // ==========================================================================
  
  /**
   * Swap tokens for Pi equivalent
   */
  swapToPi(params: {
    walletId: string;
    tokenType: TokenType;
    amount: number;
  }): { transaction: TokenTransaction; piAmount: number } {
    const wallet = this.wallets.get(params.walletId);
    if (!wallet) throw new Error("Wallet not found");
    
    const balance = wallet.balances.get(params.tokenType)!;
    if (balance.available < params.amount) {
      throw new Error("Insufficient balance");
    }
    
    const tokenInfo = this.tokens.get(params.tokenType)!;
    const piAmount = params.amount / tokenInfo.piPegRatio;
    
    // Check liquidity pool
    const pool = Array.from(this.liquidityPools.values())
      .find(p => p.tokenType === params.tokenType);
    
    if (pool && pool.piReserve < piAmount) {
      throw new Error("Insufficient liquidity");
    }
    
    const id = `tx-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const now = new Date();
    
    const transaction: TokenTransaction = {
      id,
      type: "swap",
      tokenType: params.tokenType,
      amount: params.amount,
      fromWalletId: params.walletId,
      description: `Swap ${params.amount} ${tokenInfo.symbol} for ${piAmount.toFixed(4)} Pi`,
      piEquivalent: piAmount,
      status: "completed",
      createdAt: now,
      completedAt: now,
      metadata: { piReceived: piAmount },
    };
    
    balance.available -= params.amount;
    balance.totalSpent += params.amount;
    balance.lastUpdated = now;
    wallet.updatedAt = now;
    
    // Update liquidity pool
    if (pool) {
      pool.tokenReserve += params.amount;
      pool.piReserve -= piAmount;
      pool.volume24h += piAmount;
    }
    
    this.transactions.set(id, transaction);
    this.emit("tokens-swapped", { transaction, piAmount });
    
    return { transaction, piAmount };
  }
  
  // ==========================================================================
  // Liquidity
  // ==========================================================================
  
  /**
   * Add liquidity to a pool
   */
  addLiquidity(params: {
    tokenType: TokenType;
    tokenAmount: number;
    piAmount: number;
    providerId: string;
  }): LiquidityPool {
    const tokenInfo = this.tokens.get(params.tokenType);
    if (!tokenInfo) throw new Error("Unknown token type");
    
    let pool = Array.from(this.liquidityPools.values())
      .find(p => p.tokenType === params.tokenType);
    
    if (!pool) {
      const id = `lp-${params.tokenType.toLowerCase()}`;
      pool = {
        id,
        tokenType: params.tokenType,
        tokenReserve: 0,
        piReserve: 0,
        lpTokenSupply: 0,
        fee: 0.3, // 0.3% fee
        volume24h: 0,
        createdAt: new Date(),
      };
      this.liquidityPools.set(id, pool);
    }
    
    pool.tokenReserve += params.tokenAmount;
    pool.piReserve += params.piAmount;
    pool.lpTokenSupply += Math.sqrt(params.tokenAmount * params.piAmount);
    
    tokenInfo.liquidityPool += params.tokenAmount;
    
    this.emit("liquidity-added", { pool, tokenAmount: params.tokenAmount, piAmount: params.piAmount });
    
    return pool;
  }
  
  // ==========================================================================
  // Business Token Programs
  // ==========================================================================
  
  /**
   * Create business loyalty program
   */
  createLoyaltyProgram(params: {
    businessId: string;
    name: string;
    tokenType: TokenType;
    rewardRate: number;        // Tokens per Pi spent
    bonusActivities: {
      activityType: ActivityType;
      multiplier: number;
    }[];
  }): {
    programId: string;
    wallet: TokenWallet;
  } {
    // Get or create business wallet
    const wallet = this.getOrCreateWallet(params.businessId, "business");
    
    const programId = `loyalty-${params.businessId}-${Date.now()}`;
    
    // Store program config in wallet metadata
    wallet.updatedAt = new Date();
    
    this.emit("loyalty-program-created", {
      programId,
      businessId: params.businessId,
      tokenType: params.tokenType,
      rewardRate: params.rewardRate,
    });
    
    return { programId, wallet };
  }
  
  /**
   * Reward employee with tokens
   */
  rewardEmployee(params: {
    businessWalletId: string;
    employeeWalletId: string;
    tokenType: TokenType;
    amount: number;
    reason: string;
  }): TokenTransaction {
    return this.transferTokens({
      fromWalletId: params.businessWalletId,
      toWalletId: params.employeeWalletId,
      tokenType: params.tokenType,
      amount: params.amount,
      description: `Employee reward: ${params.reason}`,
    });
  }
  
  // ==========================================================================
  // Queries
  // ==========================================================================
  
  /**
   * Get token info
   */
  getTokenInfo(tokenType: TokenType): TokenInfo | undefined {
    return this.tokens.get(tokenType);
  }
  
  /**
   * Get all tokens
   */
  getAllTokens(): TokenInfo[] {
    return Array.from(this.tokens.values());
  }
  
  /**
   * Get activity rewards config
   */
  getActivityReward(activityType: ActivityType): ActivityReward | undefined {
    return this.activityRewards.get(activityType);
  }
  
  /**
   * Get all activity rewards
   */
  getAllActivityRewards(): ActivityReward[] {
    return Array.from(this.activityRewards.values());
  }
  
  /**
   * Get staking pool info
   */
  getStakingPool(tokenType: TokenType): StakingPool | undefined {
    return this.stakingPools.get(tokenType);
  }
  
  /**
   * Get all staking pools
   */
  getAllStakingPools(): StakingPool[] {
    return Array.from(this.stakingPools.values());
  }
  
  /**
   * Get liquidity pool
   */
  getLiquidityPool(tokenType: TokenType): LiquidityPool | undefined {
    return Array.from(this.liquidityPools.values())
      .find(p => p.tokenType === tokenType);
  }
  
  /**
   * Get all liquidity pools
   */
  getAllLiquidityPools(): LiquidityPool[] {
    return Array.from(this.liquidityPools.values());
  }
  
  /**
   * Get transactions for a wallet
   */
  getTransactions(walletId: string, limit?: number): TokenTransaction[] {
    const transactions = Array.from(this.transactions.values())
      .filter(t => t.fromWalletId === walletId || t.toWalletId === walletId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    return limit ? transactions.slice(0, limit) : transactions;
  }
  
  /**
   * Calculate Pi value of wallet
   */
  calculateWalletPiValue(walletId: string): number {
    const wallet = this.wallets.get(walletId);
    if (!wallet) return 0;
    
    let totalPi = 0;
    for (const [tokenType, balance] of wallet.balances) {
      const tokenInfo = this.tokens.get(tokenType)!;
      const total = balance.available + balance.staked + balance.pending;
      totalPi += total / tokenInfo.piPegRatio;
    }
    
    return totalPi;
  }
  
  /**
   * Get system statistics
   */
  getStatistics(): {
    tokens: { type: TokenType; circulating: number; staked: number; liquidity: number; piValue: number }[];
    totalWallets: number;
    totalTransactions: number;
    totalPiValue: number;
  } {
    const tokens = Array.from(this.tokens.values()).map(t => ({
      type: t.type,
      circulating: t.circulatingSupply,
      staked: t.stakingPool,
      liquidity: t.liquidityPool,
      piValue: t.circulatingSupply / t.piPegRatio,
    }));
    
    const totalPiValue = tokens.reduce((sum, t) => sum + t.piValue, 0);
    
    return {
      tokens,
      totalWallets: this.wallets.size,
      totalTransactions: this.transactions.size,
      totalPiValue,
    };
  }
}

// ============================================================================
// Exports
// ============================================================================

export const tokenRewardSystem = TokenRewardManager.getInstance();

export { TokenRewardManager };

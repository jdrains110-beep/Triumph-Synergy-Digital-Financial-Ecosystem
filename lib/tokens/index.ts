/**
 * Token & Engagement System Index
 * 
 * Comprehensive token economy with:
 * - Pi-pegged utility tokens
 * - Activity-based rewards
 * - Live auctions
 * - Business interactions
 */

// Token Reward System
export {
  tokenRewardSystem,
  TokenRewardManager,
  type TokenType,
  type ActivityType,
  type TokenWallet,
  type TokenBalance,
  type TokenTransaction,
  type ActivityReward,
  type StakingPool,
  type StakingPosition,
  type LiquidityPool,
  type LoyaltyProgramConfig,
} from "./token-reward-system";

// Live Auction System
export {
  liveAuctionSystem,
  LiveAuctionManager,
  type AuctionType,
  type AuctionStatus,
  type BidStatus,
  type PaymentType,
  type Auction,
  type Bid,
  type AuctionRoom,
  type AuctionMessage,
  type AutoBidConfig,
  type AuctionLiveStream,
} from "./live-auction-system";

// Activity Engagement
export {
  activityEngagement,
  ActivityEngagementManager,
  type EngagementType,
  type VideoCategory,
  type GameCategory,
  type VideoSession,
  type GameSession,
  type LearningSession,
  type TeachingSession,
  type WorkSession,
  type ContentEngagement,
  type SocialAction,
  type DailyStreak,
} from "./activity-engagement";

// Business Interactions
export {
  businessInteractions,
  BusinessInteractionManager,
  type BusinessType,
  type EmploymentType,
  type IncentiveType,
  type Business,
  type Employee,
  type LoyaltyProgram,
  type LoyaltyTier,
  type LoyaltyMember,
  type AffiliateProgram,
  type TieredCommission,
  type Affiliate,
  type EmployeeIncentive,
  type BusinessTransaction,
  type Partnership,
} from "./business-interactions";

// ============================================================================
// Convenience Functions
// ============================================================================

import { tokenRewardSystem } from "./token-reward-system";
import { liveAuctionSystem } from "./live-auction-system";
import { activityEngagement } from "./activity-engagement";
import { businessInteractions } from "./business-interactions";

/**
 * Initialize a new user with all systems
 */
export function initializeUser(userId: string): {
  walletId: string;
  welcomeTokens: number;
} {
  const walletId = `user-${userId}`;
  
  // Create wallet
  const wallet = tokenRewardSystem.createWallet(walletId, "individual");
  
  // Welcome bonus
  const welcomeReward = tokenRewardSystem.rewardActivity({
    walletId,
    activityType: "daily-login",
    activityId: `welcome-${userId}`,
  });
  
  // Initial daily check-in
  activityEngagement.dailyCheckIn(userId, walletId);
  
  return {
    walletId,
    welcomeTokens: welcomeReward?.amount || 0,
  };
}

/**
 * Get user's complete engagement profile
 */
export function getUserEngagementProfile(userId: string, walletId: string): {
  wallet: ReturnType<typeof tokenRewardSystem.getWallet>;
  balances: ReturnType<typeof tokenRewardSystem.getBalances>;
  engagement: ReturnType<typeof activityEngagement.getUserSummary>;
  streak: ReturnType<typeof activityEngagement.getStreak>;
} {
  return {
    wallet: tokenRewardSystem.getWallet(walletId),
    balances: tokenRewardSystem.getBalances(walletId),
    engagement: activityEngagement.getUserSummary(userId),
    streak: activityEngagement.getStreak(userId),
  };
}

/**
 * Get business dashboard data
 */
export function getBusinessDashboard(businessId: string): {
  business: ReturnType<typeof businessInteractions.getBusiness>;
  stats: ReturnType<typeof businessInteractions.getBusinessStats>;
  employees: ReturnType<typeof businessInteractions.getBusinessEmployees>;
  transactions: ReturnType<typeof businessInteractions.getBusinessTransactions>;
} {
  return {
    business: businessInteractions.getBusiness(businessId),
    stats: businessInteractions.getBusinessStats(businessId),
    employees: businessInteractions.getBusinessEmployees(businessId),
    transactions: businessInteractions.getBusinessTransactions(businessId, 50),
  };
}

/**
 * Get auction marketplace data
 */
export function getAuctionMarketplace(): {
  active: ReturnType<typeof liveAuctionSystem.getActiveAuctions>;
  endingSoon: ReturnType<typeof liveAuctionSystem.getEndingSoon>;
  hot: ReturnType<typeof liveAuctionSystem.getHotAuctions>;
  stats: ReturnType<typeof liveAuctionSystem.getStatistics>;
} {
  return {
    active: liveAuctionSystem.getActiveAuctions(),
    endingSoon: liveAuctionSystem.getEndingSoon(20),
    hot: liveAuctionSystem.getHotAuctions(20),
    stats: liveAuctionSystem.getStatistics(),
  };
}

/**
 * Get platform-wide statistics
 */
export function getPlatformStatistics(): {
  tokens: ReturnType<typeof tokenRewardSystem.getStatistics>;
  auctions: ReturnType<typeof liveAuctionSystem.getStatistics>;
  activities: ReturnType<typeof activityEngagement.getStatistics>;
  business: ReturnType<typeof businessInteractions.getPlatformStats>;
} {
  return {
    tokens: tokenRewardSystem.getStatistics(),
    auctions: liveAuctionSystem.getStatistics(),
    activities: activityEngagement.getStatistics(),
    business: businessInteractions.getPlatformStats(),
  };
}

// ============================================================================
// Token Types with Pi Peg Ratios (Quick Reference)
// ============================================================================

/**
 * Token Exchange Rates (Tokens per 1 Pi)
 * 
 * SYNERGY  - 100:1  - General utility, social engagement
 * TRIUMPH  - 10:1   - Premium rewards, high value
 * LEARN    - 50:1   - Educational activities
 * PLAY     - 200:1  - Gaming rewards
 * WATCH    - 500:1  - Video watching, entertainment
 * WORK     - 25:1   - Employment, task completion
 * TEACH    - 20:1   - Teaching, mentoring
 * CREATE   - 30:1   - Content creation
 * SOCIAL   - 100:1  - Referrals, community
 * LOYALTY  - 50:1   - Business loyalty programs
 */
export const TOKEN_PI_RATES = {
  SYNERGY: 100,
  TRIUMPH: 10,
  LEARN: 50,
  PLAY: 200,
  WATCH: 500,
  WORK: 25,
  TEACH: 20,
  CREATE: 30,
  SOCIAL: 100,
  LOYALTY: 50,
} as const;

/**
 * Calculate Pi equivalent for token amount
 */
export function tokensToPi(tokenType: keyof typeof TOKEN_PI_RATES, amount: number): number {
  return amount / TOKEN_PI_RATES[tokenType];
}

/**
 * Calculate token amount for Pi
 */
export function piToTokens(tokenType: keyof typeof TOKEN_PI_RATES, piAmount: number): number {
  return piAmount * TOKEN_PI_RATES[tokenType];
}

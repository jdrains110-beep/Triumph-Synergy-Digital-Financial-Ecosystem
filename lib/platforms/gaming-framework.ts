/**
 * TRIUMPH SYNERGY - Gaming Platform Integration Framework
 * 
 * Enables major gaming platforms (GTA6, PlayStation 5, Battlefield 6, etc.)
 * to integrate Pi Network payments for user engagement monetization
 * 
 * Features:
 * - User interaction tracking and engagement rewards
 * - Streaming platform integration (Twitch, YouTube)
 * - Game economy tokenization
 * - Cross-platform user profiles
 * - Real-time Pi payment distribution
 * 
 * Official References:
 * - Pi SDK: github.com/pi-apps/pi-sdk-js
 * - Streaming APIs: Twitch/YouTube official docs
 */

import { OfficialPiPayments } from '@/lib/payments/pi-payments-official';
import { 
  enforceGamingPayment, 
  piOriginEnforcer,
  TransactionCategory 
} from '@/lib/core/pi-origin-enforcement';
import { piOriginVerificationEngine } from '@/lib/core/pi-origin-verification';

/**
 * CRITICAL: All gaming payments enforce Pi origin verification
 * - INTERNAL Pi only (mined within ecosystem)
 * - NO external Pi accepted
 * - Immutable enforcement on blockchain
 */

/**
 * User engagement events tracked across platforms
 */
export interface EngagementEvent {
  userId: string;
  platformId: string;
  eventType: 'gameplay' | 'achievement' | 'purchase' | 'streaming' | 'social' | 'tournament';
  amount: number; // Pi reward amount
  description: string;
  metadata: Record<string, any>;
  timestamp: Date;
}

/**
 * Streaming platform configuration
 */
export interface StreamingPlatform {
  id: 'twitch' | 'youtube' | 'kick' | 'trovo';
  name: string;
  apiKey?: string;
  webhookUrl?: string;
  enabled: boolean;
}

/**
 * Game-specific configuration
 */
export interface GamePlatformConfig {
  id: string; // 'gta6', 'ps5', 'battlefield-6'
  name: string;
  developer: string;
  version: string;
  apiEndpoint: string;
  apiKey: string;
  apiSecret: string;
  genre: 'action' | 'rpg' | 'fps' | 'sports' | 'mmo' | 'strategy' | 'casual';
  maxPlayersRewardPerDay?: number; // Pi cap per player daily
  engagementRateMultiplier: number; // 1.0 = 1 Pi per hour
  supportedStreamingPlatforms: StreamingPlatform[];
  tournaments?: {
    enabled: boolean;
    piPrizePool: number; // Total Pi for tournaments
    participationReward: number; // Pi for joining
  };
  achievements?: {
    enabled: boolean;
    piRewardPerAchievement: number;
  };
  socialFeatures?: {
    enabled: boolean;
    referralReward: number; // Pi per referral
    streamReward: number; // Pi per hour streamed
  };
}

/**
 * User gaming profile
 */
export interface GamingUserProfile {
  userId: string;
  platformIds: string[];
  totalEarned: number; // Total Pi earned
  monthlyEarned: number;
  engagementHours: number;
  achievements: string[];
  streamingStats?: {
    totalHours: number;
    totalViewers: number;
    totalStreamingEarned: number;
  };
  referrals: string[]; // Users referred
  piWalletAddress: string;
  preferences: {
    autoWithdraw: boolean;
    minWithdrawalAmount: number;
    emergencyContact?: string;
  };
}

/**
 * Tournament configuration
 */
export interface GamingTournament {
  id: string;
  platformId: string;
  name: string;
  startDate: Date;
  endDate: Date;
  totalPrizePool: number; // In Pi
  participationCount: number;
  standings: {
    rank: number;
    userId: string;
    score: number;
    prizeAmount: number;
  }[];
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';
}

/**
 * Gaming Platform Integration Interface
 * All gaming platforms must implement this
 */
export interface GamingIntegration {
  readonly platformId: string;
  readonly name: string;
  readonly developer: string;
  
  // Core lifecycle
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  
  // User management
  getUserProfile(userId: string): Promise<GamingUserProfile>;
  updateUserProfile(userId: string, profile: Partial<GamingUserProfile>): Promise<void>;
  
  // Engagement tracking
  trackEngagementEvent(event: EngagementEvent): Promise<void>;
  getEngagementStats(userId: string, platformId: string): Promise<{
    totalHours: number;
    totalEvents: number;
    estimatedEarnings: number;
  }>;
  
  // Reward distribution
  distributeRewards(userId: string, amount: number, memo: string): Promise<{
    transactionId: string;
    blockchainHash?: string;
    status: string;
  }>;
  
  // Streaming integration
  connectStreamingPlatform(streaming: StreamingPlatform): Promise<void>;
  trackStreamingSession(userId: string, platform: 'twitch' | 'youtube' | 'kick', durationHours: number, viewers: number): Promise<void>;
  
  // Tournaments
  createTournament(tournament: Omit<GamingTournament, 'id' | 'standings' | 'status'>): Promise<GamingTournament>;
  updateTournamentStandings(tournamentId: string, standings: GamingTournament['standings']): Promise<void>;
  completeTournament(tournamentId: string): Promise<void>;
  distributeTournamentPrizes(tournamentId: string): Promise<void>;
  
  // Social & referrals
  trackReferral(referrerId: string, referredUserId: string): Promise<void>;
  getReferralEarnings(userId: string): Promise<number>;
  
  // Achievements
  trackAchievement(userId: string, achievementId: string): Promise<void>;
  getAchievements(userId: string): Promise<string[]>;
  
  // Health check
  healthCheck(): Promise<{
    status: 'healthy' | 'degraded' | 'offline';
    uptime: number;
    activeUsers: number;
    lastSync: Date;
  }>;
}

/**
 * Gaming Platform Registry - Manages all integrated gaming platforms
 */
export class GamingPlatformRegistry {
  private static instance: GamingPlatformRegistry;
  private platforms = new Map<string, GamingIntegration>();
  private configs = new Map<string, GamePlatformConfig>();
  private engagementEvents: EngagementEvent[] = [];
  private userProfiles = new Map<string, GamingUserProfile>();
  private tournaments = new Map<string, GamingTournament>();
  private piPayments: OfficialPiPayments;

  private constructor() {
    // Initialize Pi Payments for reward distribution
    this.piPayments = new OfficialPiPayments({
      appId: 'triumph-gaming-hub',
      apiKey: process.env.NEXT_PUBLIC_PI_API_KEY!,
      apiSecret: process.env.PI_API_SECRET!,
      sandbox: process.env.NEXT_PUBLIC_PI_SANDBOX !== 'false',
    });
  }

  static getInstance(): GamingPlatformRegistry {
    if (!this.instance) {
      this.instance = new GamingPlatformRegistry();
    }
    return this.instance;
  }

  /**
   * Register a gaming platform
   */
  registerPlatform(
    config: GamePlatformConfig,
    integration: GamingIntegration
  ): void {
    if (this.platforms.has(config.id)) {
      throw new Error(`Platform ${config.id} already registered`);
    }
    
    this.platforms.set(config.id, integration);
    this.configs.set(config.id, config);
    console.log(`✅ Gaming platform registered: ${config.name}`);
  }

  /**
   * Get platform configuration
   */
  getConfig(platformId: string): GamePlatformConfig | undefined {
    return this.configs.get(platformId);
  }

  /**
   * Get platform integration
   */
  getPlatform(platformId: string): GamingIntegration | undefined {
    return this.platforms.get(platformId);
  }

  /**
   * List all registered platforms
   */
  listPlatforms(): Array<{ config: GamePlatformConfig; isHealthy: boolean }> {
    const result: Array<{ config: GamePlatformConfig; isHealthy: boolean }> = [];
    
    for (const [platformId, config] of this.configs.entries()) {
      result.push({
        config,
        isHealthy: this.platforms.has(platformId),
      });
    }
    
    return result;
  }

  /**
   * Track user engagement event
   */
  async trackEngagement(event: EngagementEvent): Promise<void> {
    this.engagementEvents.push(event);
    
    // Update user profile earnings
    const profile = await this.getUserProfile(event.userId, event.platformId);
    profile.totalEarned += event.amount;
    profile.monthlyEarned += event.amount;
    profile.engagementHours += event.eventType === 'gameplay' ? 1 : 0;
    
    this.userProfiles.set(`${event.userId}:${event.platformId}`, profile);
    
    // Distribute reward if exceeds threshold
    if (profile.monthlyEarned > 1 && profile.preferences.autoWithdraw) {
      await this.distributeRewards(event.userId, event.platformId, event.amount, event.description);
    }
  }

  /**
   * Get or create user profile
   */
  async getUserProfile(userId: string, platformId: string): Promise<GamingUserProfile> {
    const key = `${userId}:${platformId}`;
    
    if (!this.userProfiles.has(key)) {
      this.userProfiles.set(key, {
        userId,
        platformIds: [platformId],
        totalEarned: 0,
        monthlyEarned: 0,
        engagementHours: 0,
        achievements: [],
        referrals: [],
        piWalletAddress: `triumph-gaming-${userId}`,
        preferences: {
          autoWithdraw: true,
          minWithdrawalAmount: 1,
        },
      });
    }
    
    return this.userProfiles.get(key)!;
  }

  /**
   * Distribute rewards to user
   */
  async distributeRewards(
    userId: string,
    platformId: string,
    amount: number,
    memo: string
  ): Promise<{ transactionId: string; blockchainHash?: string }> {
    const platform = this.platforms.get(platformId);
    if (!platform) {
      throw new Error(`Platform ${platformId} not found`);
    }

    // ✅ CRITICAL: Enforce Pi origin verification
    // All gaming rewards MUST be from internally mined Pi
    // NO external Pi accepted - this is immutable
    const enforceResult = await enforceGamingPayment(
      userId, // User wallet
      amount,
      'engagement', // Gaming category
      memo
    );

    if (!enforceResult.success) {
      throw new Error(
        `[Gaming Rewards] REJECTED: ${enforceResult.message} - Only internally mined Pi accepted`
      );
    }

    try {
      // Create Pi payment via Official Pi Payments
      // ✓ Origin already verified above
      const payment = await this.piPayments.createPayment({
        amount,
        memo: `${memo} - ${platform.name} [INTERNAL PI VERIFIED]`,
        metadata: { 
          userId, 
          platformId,
          originEnforced: true, // Mark as origin-verified
          piSource: 'internal', // Record source
        },
      });

      return {
        transactionId: payment.paymentId,
        blockchainHash: payment.txid,
      };
    } catch (error) {
      console.error('Error distributing rewards:', error);
      throw error;
    }
  }

  /**
   * Create and register tournament
   */
  async createTournament(
    platformId: string,
    tournament: Omit<GamingTournament, 'id' | 'standings' | 'status'>
  ): Promise<GamingTournament> {
    const id = `tournament-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const newTournament: GamingTournament = {
      ...tournament,
      id,
      platformId,
      standings: [],
      status: 'scheduled',
    };

    this.tournaments.set(id, newTournament);
    return newTournament;
  }

  /**
   * Distribute tournament prizes
   */
  async distributeTournamentPrizes(tournamentId: string): Promise<void> {
    const tournament = this.tournaments.get(tournamentId);
    if (!tournament) {
      throw new Error(`Tournament ${tournamentId} not found`);
    }

    const platform = this.platforms.get(tournament.platformId);
    if (!platform) {
      throw new Error(`Platform ${tournament.platformId} not found`);
    }

    // Distribute prizes to each standing
    for (const standing of tournament.standings) {
      await this.distributeRewards(
        standing.userId,
        tournament.platformId,
        standing.prizeAmount,
        `Tournament Prize - Rank #${standing.rank}`
      );
    }

    tournament.status = 'completed';
    this.tournaments.set(tournamentId, tournament);
  }

  /**
   * Get engagement stats for user
   */
  getEngagementStats(userId: string, platformId: string): {
    totalHours: number;
    totalEvents: number;
    estimatedEarnings: number;
    recentEvents: EngagementEvent[];
  } {
    const userEvents = this.engagementEvents.filter(
      e => e.userId === userId && e.platformId === platformId
    );

    const totalEvents = userEvents.length;
    const estimatedEarnings = userEvents.reduce((sum, e) => sum + e.amount, 0);
    const totalHours = userEvents.filter(e => e.eventType === 'gameplay').length;

    return {
      totalHours,
      totalEvents,
      estimatedEarnings,
      recentEvents: userEvents.slice(-10),
    };
  }

  /**
   * Health check all platforms
   */
  async healthCheckAll(): Promise<
    Record<string, { status: 'healthy' | 'degraded' | 'offline'; uptime: number }>
  > {
    const results: Record<string, any> = {};

    for (const [platformId, platform] of this.platforms.entries()) {
      try {
        const health = await platform.healthCheck();
        results[platformId] = {
          status: health.status,
          uptime: health.uptime,
          activeUsers: health.activeUsers,
          lastSync: health.lastSync,
        };
      } catch (error) {
        results[platformId] = {
          status: 'offline',
          error: String(error),
        };
      }
    }

    return results;
  }

  /**
   * Get summary statistics
   */
  getSummary(): {
    totalPlatforms: number;
    totalUsers: number;
    totalEarnings: number;
    activeTournaments: number;
  } {
    return {
      totalPlatforms: this.platforms.size,
      totalUsers: this.userProfiles.size,
      totalEarnings: Array.from(this.userProfiles.values()).reduce(
        (sum, p) => sum + p.totalEarned,
        0
      ),
      activeTournaments: Array.from(this.tournaments.values()).filter(
        t => t.status === 'active'
      ).length,
    };
  }

  /**
   * Get all tournaments
   */
  getTournaments(platformId?: string): GamingTournament[] {
    if (platformId) {
      return Array.from(this.tournaments.values()).filter(t => t.platformId === platformId);
    }
    return Array.from(this.tournaments.values());
  }
}

/**
 * Singleton instance
 */
export const gamingRegistry = GamingPlatformRegistry.getInstance();

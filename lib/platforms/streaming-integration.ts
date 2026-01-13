/**
 * TRIUMPH SYNERGY - Streaming Platform Integration
 *
 * Enables real-time viewer monetization across streaming platforms
 * - Twitch streaming with Pi rewards
 * - YouTube Gaming with Pi earnings
 * - Kick streaming integration
 * - Real-time payment to streamers for engagement
 */

import { enforceStreamingPayment } from "@/lib/core/pi-origin-enforcement";
import { OfficialPiPayments } from "@/lib/payments/pi-payments-official";

/**
 * CRITICAL: All streaming earnings enforce Pi origin verification
 * - INTERNAL Pi only (earned from viewer engagement)
 * - NO external Pi accepted for streaming payouts
 * - Immutable enforcement on blockchain
 */

/**
 * Streaming session data
 */
export interface StreamingSession {
	sessionId: string;
	streamerId: string;
	platform: "twitch" | "youtube" | "kick" | "trovo";
	gamingPlatform: string; // 'gta6', 'ps5', 'battlefield-6'
	startTime: Date;
	endTime?: Date;
	viewers: number;
	peakViewers: number;
	avgWatchTime: number; // minutes
	totalEarned: number; // Pi earned
	status: "active" | "ended" | "archived";
}

/**
 * Streaming event (viewer interaction)
 */
export interface StreamingEvent {
	sessionId: string;
	eventType: "subscribe" | "donate" | "watch" | "cheer" | "raid";
	userId: string;
	amount?: number; // For monetized events
	timestamp: Date;
}

/**
 * Streaming platform configuration
 */
export interface StreamingPlatformConfig {
	id: "twitch" | "youtube" | "kick" | "trovo";
	name: string;
	baseUrl: string;
	apiKey?: string;
	apiSecret?: string;
	webhookUrl?: string;
	enabled: boolean;
	rewardConfig: {
		perViewer: number; // Pi per viewer per minute
		subscribeBonus: number; // Pi per subscriber
		donateMultiplier: number; // Multiply viewer donations
	};
}

/**
 * Streaming aggregator for cross-platform monetization
 */
export class StreamingAggregator {
	private static instance: StreamingAggregator;
	private readonly sessions = new Map<string, StreamingSession>();
	private readonly events: StreamingEvent[] = [];
	private readonly platforms: Map<string, StreamingPlatformConfig> = new Map();
	private readonly piPayments: OfficialPiPayments;
	private readonly streamerEarnings = new Map<string, number>();

	private constructor() {
		this.piPayments = new OfficialPiPayments({
			appId: "triumph-streaming-hub",
			apiKey: process.env.NEXT_PUBLIC_PI_API_KEY!,
			apiSecret: process.env.PI_API_SECRET!,
			sandbox: process.env.NEXT_PUBLIC_PI_SANDBOX !== "false",
		});

		this.initializePlatforms();
	}

	static getInstance(): StreamingAggregator {
		if (!StreamingAggregator.instance) {
			StreamingAggregator.instance = new StreamingAggregator();
		}
		return StreamingAggregator.instance;
	}

	/**
	 * Initialize streaming platforms
	 */
	private initializePlatforms(): void {
		this.platforms.set("twitch", {
			id: "twitch",
			name: "Twitch",
			baseUrl: "https://api.twitch.tv",
			apiKey: process.env.TWITCH_API_KEY,
			apiSecret: process.env.TWITCH_API_SECRET,
			webhookUrl: `${process.env.NEXT_PUBLIC_API_URL}/api/webhooks/twitch`,
			enabled: true,
			rewardConfig: {
				perViewer: 0.001, // 0.001 Pi per viewer per minute
				subscribeBonus: 1, // 1 Pi per subscriber
				donateMultiplier: 1, // Pass through donations
			},
		});

		this.platforms.set("youtube", {
			id: "youtube",
			name: "YouTube Gaming",
			baseUrl: "https://www.googleapis.com/youtube/v3",
			apiKey: process.env.YOUTUBE_API_KEY,
			apiSecret: process.env.YOUTUBE_API_SECRET,
			webhookUrl: `${process.env.NEXT_PUBLIC_API_URL}/api/webhooks/youtube`,
			enabled: true,
			rewardConfig: {
				perViewer: 0.0015, // 0.0015 Pi per viewer per minute
				subscribeBonus: 1.5, // 1.5 Pi per subscriber
				donateMultiplier: 1,
			},
		});

		this.platforms.set("kick", {
			id: "kick",
			name: "Kick",
			baseUrl: "https://api.kick.com",
			apiKey: process.env.KICK_API_KEY,
			apiSecret: process.env.KICK_API_SECRET,
			webhookUrl: `${process.env.NEXT_PUBLIC_API_URL}/api/webhooks/kick`,
			enabled: true,
			rewardConfig: {
				perViewer: 0.002, // 0.002 Pi per viewer per minute
				subscribeBonus: 2, // 2 Pi per subscriber
				donateMultiplier: 1.1, // 10% bonus on donations
			},
		});
	}

	/**
	 * Start a streaming session
	 */
	async startSession(
		streamerId: string,
		platform: "twitch" | "youtube" | "kick" | "trovo",
		gamingPlatform: string,
	): Promise<StreamingSession> {
		const sessionId = `stream-${streamerId}-${platform}-${Date.now()}`;

		const session: StreamingSession = {
			sessionId,
			streamerId,
			platform,
			gamingPlatform,
			startTime: new Date(),
			viewers: 0,
			peakViewers: 0,
			avgWatchTime: 0,
			totalEarned: 0,
			status: "active",
		};

		this.sessions.set(sessionId, session);
		console.log(`✅ Streaming session started: ${sessionId}`);

		return session;
	}

	/**
	 * Update stream metrics
	 */
	async updateStreamMetrics(
		sessionId: string,
		currentViewers: number,
		avgWatchTimeMinutes: number,
	): Promise<void> {
		const session = this.sessions.get(sessionId);
		if (!session) {
			throw new Error(`Session ${sessionId} not found`);
		}

		session.viewers = currentViewers;
		if (currentViewers > session.peakViewers) {
			session.peakViewers = currentViewers;
		}
		session.avgWatchTime = avgWatchTimeMinutes;

		// Calculate earnings for this update
		const platformConfig = this.platforms.get(session.platform);
		if (platformConfig) {
			const earnedThisUpdate =
				currentViewers * platformConfig.rewardConfig.perViewer;
			session.totalEarned += earnedThisUpdate;
		}
	}

	/**
	 * Record streaming event (subscribe, donate, etc)
	 */
	async recordEvent(
		sessionId: string,
		eventType: "subscribe" | "donate" | "cheer" | "raid",
		userId: string,
		amount?: number,
	): Promise<void> {
		const session = this.sessions.get(sessionId);
		if (!session) {
			throw new Error(`Session ${sessionId} not found`);
		}

		const event: StreamingEvent = {
			sessionId,
			eventType,
			userId,
			amount,
			timestamp: new Date(),
		};

		this.events.push(event);

		// Add bonus earnings
		const platformConfig = this.platforms.get(session.platform);
		if (platformConfig) {
			let bonus = 0;

			if (eventType === "subscribe") {
				bonus = platformConfig.rewardConfig.subscribeBonus;
			} else if (eventType === "donate" && amount) {
				bonus = amount * platformConfig.rewardConfig.donateMultiplier;
			}

			if (bonus > 0) {
				session.totalEarned += bonus;
				const currentEarnings =
					this.streamerEarnings.get(session.streamerId) || 0;
				this.streamerEarnings.set(session.streamerId, currentEarnings + bonus);
			}
		}
	}

	/**
	 * End streaming session and distribute earnings
	 */
	async endSession(sessionId: string): Promise<{
		earnings: number;
		transactionId: string;
		blockchainHash?: string;
	}> {
		const session = this.sessions.get(sessionId);
		if (!session) {
			throw new Error(`Session ${sessionId} not found`);
		}

		session.status = "ended";
		session.endTime = new Date();

		// ✅ CRITICAL: Enforce Pi origin verification for streaming earnings
		// All streaming earnings MUST be from viewer engagement (internal)
		// NO external Pi accepted - this is immutable
		const enforceResult = await enforceStreamingPayment(
			session.streamerId,
			session.totalEarned,
			"earnings",
			`Streaming earnings from ${session.platform} (${session.gamingPlatform})`,
		);

		if (!enforceResult.success) {
			throw new Error(
				`[Streaming Earnings] REJECTED: ${enforceResult.message} - Only internally earned Pi accepted`,
			);
		}

		// Distribute earnings (origin already verified)
		const payment = await this.piPayments.createPayment({
			amount: session.totalEarned,
			memo: `Streaming earnings from ${session.platform} (${session.gamingPlatform}) [INTERNAL PI VERIFIED]`,
			metadata: {
				streamerId: session.streamerId,
				sessionId,
				platform: session.platform,
				originEnforced: true, // Mark as origin-verified
				piSource: "internal", // Record source
			},
		});

		console.log(
			`✅ Session ended. Earnings: ${session.totalEarned} Pi [Origin Verified]`,
		);

		return {
			earnings: session.totalEarned,
			transactionId: payment.paymentId,
			blockchainHash: payment.txid,
		};
	}

	/**
	 * Get session summary
	 */
	getSessionSummary(sessionId: string): StreamingSession | undefined {
		return this.sessions.get(sessionId);
	}

	/**
	 * Get streamer statistics
	 */
	getStreamerStats(streamerId: string): {
		totalEarnings: number;
		activeSessions: number;
		totalSessions: number;
		avgViewers: number;
	} {
		const streamerSessions = Array.from(this.sessions.values()).filter(
			(s) => s.streamerId === streamerId,
		);

		const activeSessions = streamerSessions.filter(
			(s) => s.status === "active",
		).length;
		const totalEarnings = streamerSessions.reduce(
			(sum, s) => sum + s.totalEarned,
			0,
		);
		const avgViewers =
			streamerSessions.length > 0
				? streamerSessions.reduce((sum, s) => sum + s.avgWatchTime, 0) /
					streamerSessions.length
				: 0;

		return {
			totalEarnings,
			activeSessions,
			totalSessions: streamerSessions.length,
			avgViewers,
		};
	}

	/**
	 * Get platform statistics
	 */
	getPlatformStats(platform: "twitch" | "youtube" | "kick" | "trovo"): {
		activeSessions: number;
		totalStreamers: number;
		totalEarnings: number;
		totalViewers: number;
	} {
		const platformSessions = Array.from(this.sessions.values()).filter(
			(s) => s.platform === platform,
		);

		const activeSessions = platformSessions.filter(
			(s) => s.status === "active",
		).length;
		const streamers = new Set(platformSessions.map((s) => s.streamerId));
		const totalEarnings = platformSessions.reduce(
			(sum, s) => sum + s.totalEarned,
			0,
		);
		const totalViewers = platformSessions.reduce(
			(sum, s) => sum + s.viewers,
			0,
		);

		return {
			activeSessions,
			totalStreamers: streamers.size,
			totalEarnings,
			totalViewers,
		};
	}

	/**
	 * Get all session events
	 */
	getSessionEvents(sessionId: string): StreamingEvent[] {
		return this.events.filter((e) => e.sessionId === sessionId);
	}

	/**
	 * Get summary across all platforms
	 */
	getSummary(): {
		totalActiveSessions: number;
		totalStreamers: Set<string>;
		totalEarningsToday: number;
		platformBreakdown: Record<string, number>;
	} {
		const activeSessions = Array.from(this.sessions.values()).filter(
			(s) => s.status === "active",
		);
		const streamers = new Set(
			Array.from(this.sessions.values()).map((s) => s.streamerId),
		);

		const platformBreakdown: Record<string, number> = {};
		for (const session of this.sessions.values()) {
			platformBreakdown[session.platform] =
				(platformBreakdown[session.platform] || 0) + session.totalEarned;
		}

		return {
			totalActiveSessions: activeSessions.length,
			totalStreamers: streamers,
			totalEarningsToday: Array.from(this.sessions.values()).reduce(
				(sum, s) => sum + s.totalEarned,
				0,
			),
			platformBreakdown,
		};
	}
}

/**
 * Singleton instance
 */
export const streamingAggregator = StreamingAggregator.getInstance();

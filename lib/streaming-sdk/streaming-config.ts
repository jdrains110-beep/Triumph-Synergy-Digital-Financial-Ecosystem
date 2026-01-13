/**
 * Triumph Synergy Streaming Configuration
 * Comprehensive streaming platform with Agora, CDN, DRM, and AI capabilities
 * Date: January 7, 2026
 */

// ============================================================================
// AGORA CONFIGURATION
// ============================================================================

export const STREAMING_CONFIG = {
	// Agora Configuration
	agora: {
		appId: process.env.NEXT_PUBLIC_AGORA_APP_ID || "demo-app-id",
		enabled: !!process.env.NEXT_PUBLIC_AGORA_APP_ID,
		rtcToken: process.env.NEXT_PUBLIC_AGORA_TOKEN,
		channelNamePrefix: "triumph-stream-",
		defaultUID: 0,

		// Audio Configuration
		audio: {
			enabled: true,
			sampleRate: 48_000,
			channels: 2,
			bitrate: 128,
			codec: "opus",
		},

		// Video Configuration
		video: {
			enabled: true,
			codec: "vp8",
			width: 1920,
			height: 1080,
			frameRate: 30,
			bitrate: 2500,
			preset: "high_quality",
		},
	},

	// ============================================================================
	// CDN & DELIVERY CONFIGURATION
	// ============================================================================

	cdn: {
		// HLS Stream Configuration
		hls: {
			enabled: true,
			segmentDuration: 6,
			targetDuration: 10,
			maxSegments: 30,
			playlist: "live.m3u8",
			variant: "variable", // adaptive bitrate
		},

		// Bitrate Options for Adaptive Streaming
		bitrates: [
			{
				label: "4K",
				bitrate: 8000,
				width: 3840,
				height: 2160,
				fps: 60,
			},
			{
				label: "1080p",
				bitrate: 2500,
				width: 1920,
				height: 1080,
				fps: 30,
			},
			{
				label: "720p",
				bitrate: 1500,
				width: 1280,
				height: 720,
				fps: 30,
			},
			{
				label: "480p",
				bitrate: 800,
				width: 854,
				height: 480,
				fps: 24,
			},
			{
				label: "360p",
				bitrate: 500,
				width: 640,
				height: 360,
				fps: 24,
			},
		],

		// CDN Endpoints
		endpoints: [
			{
				name: "Primary",
				url:
					process.env.NEXT_PUBLIC_CDN_PRIMARY ||
					"https://cdn.triumph-synergy.com",
				region: "US-EAST",
			},
			{
				name: "Secondary",
				url:
					process.env.NEXT_PUBLIC_CDN_SECONDARY ||
					"https://cdn2.triumph-synergy.com",
				region: "EU-WEST",
			},
			{
				name: "Asia-Pacific",
				url:
					process.env.NEXT_PUBLIC_CDN_APAC ||
					"https://cdn-apac.triumph-synergy.com",
				region: "APAC",
			},
		],
	},

	// ============================================================================
	// DRM & SECURITY CONFIGURATION
	// ============================================================================

	security: {
		// Digital Rights Management
		drm: {
			enabled: true,
			provider: "widevine", // widevine, fairplay, playready
			licenseUrl: process.env.NEXT_PUBLIC_DRM_LICENSE_URL,
		},

		// Content Encryption
		encryption: {
			enabled: true,
			method: "AES-256-GCM",
			keyRotation: true,
			rotationInterval: 3600, // 1 hour
		},

		// Access Control
		accessControl: {
			requireAuth: true,
			ipWhitelist: false,
			geoRestriction: true,
			allowedCountries: ["US", "CA", "GB", "AU", "NZ", "DE", "FR"],
		},

		// Watermarking
		watermark: {
			enabled: true,
			position: "bottom-right",
			opacity: 0.3,
			refreshInterval: 5000,
		},
	},

	// ============================================================================
	// AI & PERSONALIZATION CONFIGURATION
	// ============================================================================

	ai: {
		// Content Recommendations
		recommendations: {
			enabled: true,
			model: "collaborative-filtering",
			minRating: 3.5,
			maxResults: 10,
			updateInterval: 3600,
		},

		// Smart Search
		search: {
			enabled: true,
			elasticSearch: {
				host: process.env.ELASTICSEARCH_HOST || "localhost:9200",
				index: "triumph_streams",
			},
			facets: [
				"category",
				"language",
				"duration",
				"quality",
				"popularity",
				"uploadDate",
			],
		},

		// Content Analysis
		analysis: {
			enabled: true,
			detectObjects: true,
			detectFaces: true,
			detectText: true,
			detectSpeech: true,
			language: "en-US",
		},

		// User Engagement AI
		engagement: {
			predictChurn: true,
			recommendNextVideo: true,
			suggestWatchParties: true,
			optimalPlayTime: true,
		},
	},

	// ============================================================================
	// INTERACTIVE FEATURES CONFIGURATION
	// ============================================================================

	interactivity: {
		// Live Chat
		chat: {
			enabled: true,
			maxMessageLength: 500,
			rateLimitPerMinute: 10,
			moderation: true,
			emojisEnabled: true,
			spoilerWarnings: true,
		},

		// Live Polls
		polls: {
			enabled: true,
			maxOptions: 5,
			timeoutSeconds: 300,
			resultsVisibility: "during-voting", // during-voting, after-close
			analytics: true,
		},

		// Watch Parties
		watchParties: {
			enabled: true,
			maxParticipants: 100,
			syncTolerance: 2000, // ms
			hostControls: true,
			guestCanPause: false,
		},

		// Live Reactions
		reactions: {
			enabled: true,
			types: ["👍", "❤️", "😂", "😮", "😢", "🔥", "🎉", "💯"],
			animationDuration: 2000,
		},

		// Super Chat (Donations)
		superChat: {
			enabled: true,
			minAmount: 1,
			currency: "USD",
			messageDuration: 5000,
			highlight: true,
		},
	},

	// ============================================================================
	// RECORDING & ARCHIVE CONFIGURATION
	// ============================================================================

	recording: {
		enabled: true,
		format: "mp4",
		quality: "1080p",
		codec: {
			video: "h264",
			audio: "aac",
		},
		storage: {
			provider: "s3", // s3, gcs, azure
			bucket: process.env.RECORDING_BUCKET || "triumph-streams",
			region: process.env.AWS_REGION || "us-east-1",
		},
		retention: {
			daysToKeep: 90,
			deleteAfterExpiry: true,
		},
	},

	// ============================================================================
	// ANALYTICS CONFIGURATION
	// ============================================================================

	analytics: {
		enabled: true,
		tracking: {
			viewerMetrics: true,
			engagementMetrics: true,
			performanceMetrics: true,
			revenueMetrics: true,
		},

		events: [
			"stream_started",
			"stream_ended",
			"viewer_joined",
			"viewer_left",
			"message_sent",
			"poll_voted",
			"reaction_sent",
			"super_chat_sent",
			"quality_changed",
			"error_occurred",
		],

		retention: {
			rawData: 30, // days
			aggregated: 365, // days
		},
	},

	// ============================================================================
	// THIRD-PARTY INTEGRATIONS
	// ============================================================================

	integrations: {
		// Zoom Integration
		zoom: {
			enabled: !!process.env.ZOOM_CLIENT_ID,
			clientId: process.env.ZOOM_CLIENT_ID,
			apiUrl: "https://api.zoom.us/v2",
			webhookSecret: process.env.ZOOM_WEBHOOK_SECRET,
		},

		// YouTube Live (Archive)
		youtube: {
			enabled: !!process.env.YOUTUBE_API_KEY,
			apiKey: process.env.YOUTUBE_API_KEY,
			autoArchive: true,
		},

		// Twitch Integration
		twitch: {
			enabled: !!process.env.TWITCH_CLIENT_ID,
			clientId: process.env.TWITCH_CLIENT_ID,
			simul: true, // simultaneous streaming
		},

		// Social Sharing
		social: {
			facebook: true,
			twitter: true,
			linkedin: true,
			tiktok: true,
			instagram: true,
		},
	},

	// ============================================================================
	// HELPER FUNCTIONS
	// ============================================================================

	// Format time in seconds to HH:MM:SS
	formatTime: (seconds: number): string => {
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		const secs = Math.floor(seconds % 60);
		return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
	},

	// Get bitrate for quality
	getBitrateForQuality: (quality: string): number => {
		const bitrate = STREAMING_CONFIG.cdn.bitrates.find(
			(b) => b.label === quality,
		);
		return bitrate?.bitrate || 1500;
	},

	// Get optimal bitrate based on bandwidth
	getOptimalBitrate: (bandwidth: number): string => {
		const bitrates = STREAMING_CONFIG.cdn.bitrates;
		for (let i = bitrates.length - 1; i >= 0; i--) {
			if (bitrates[i].bitrate <= bandwidth) {
				return bitrates[i].label;
			}
		}
		return bitrates.at(-1)?.label ?? bitrates[0].label;
	},

	// Calculate video statistics
	calculateStats: (
		viewCount: number,
		engagementCount: number,
		duration: number,
	): {
		engagementRate: number;
		avgViewDuration: number;
		completionRate: number;
	} => {
		return {
			engagementRate: viewCount > 0 ? (engagementCount / viewCount) * 100 : 0,
			avgViewDuration: viewCount > 0 ? duration / viewCount : 0,
			completionRate: 75, // Default, should be calculated from actual data
		};
	},

	// Check if stream is live
	isStreamLive: (status: string): boolean => {
		return status === "live" || status === "starting";
	},

	// Generate unique stream ID
	generateStreamId: (): string => {
		return `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	},

	// Get recommended bitrate (kb/s) based on network quality
	recommendedBitrate: (
		quality: "poor" | "fair" | "good" | "excellent",
	): number => {
		const mapping = {
			poor: 500,
			fair: 1000,
			good: 2500,
			excellent: 5000,
		};
		return mapping[quality];
	},
};

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface StreamSession {
	id: string;
	title: string;
	description: string;
	hostId: string;
	channelName: string;
	status: "scheduled" | "live" | "ended" | "paused";
	startedAt: Date;
	endedAt?: Date;
	viewerCount: number;
	peakViewerCount: number;
	duration: number;
	quality: string;
	recordingUrl?: string;
	thumbnailUrl?: string;
	category: string;
	tags: string[];
	language: string;
	isPublic: boolean;
}

export interface StreamViewer {
	id: string;
	sessionId: string;
	userId: string;
	joinedAt: Date;
	leftAt?: Date;
	duration: number;
	quality: string;
	bandwidth: number;
	engagement: number;
	country: string;
}

export interface StreamMessage {
	id: string;
	sessionId: string;
	userId: string;
	username: string;
	message: string;
	timestamp: Date;
	reactions: string[];
	isModerated: boolean;
	isPinned: boolean;
}

export interface StreamPoll {
	id: string;
	sessionId: string;
	question: string;
	options: Array<{
		id: string;
		text: string;
		votes: number;
	}>;
	createdAt: Date;
	endsAt: Date;
	closed: boolean;
	results: Array<{
		optionId: string;
		percentage: number;
		votes: number;
	}>;
}

export interface StreamReaction {
	id: string;
	sessionId: string;
	userId: string;
	emoji: string;
	timestamp: Date;
	animated: boolean;
}

export interface StreamAnalytics {
	sessionId: string;
	totalViewers: number;
	peakViewers: number;
	averageViewDuration: number;
	engagementRate: number;
	completionRate: number;
	messages: number;
	polls: number;
	reactions: number;
	superChats: number;
	revenue: number;
	countries: string[];
	devices: Record<string, number>;
	qualitySwitches: number;
	averageBufferTime: number;
}

export interface StreamRecommendation {
	sessionId: string;
	title: string;
	thumbnail: string;
	category: string;
	relevanceScore: number;
	reason: string;
	isLive: boolean;
}

export interface StreamWatchParty {
	id: string;
	hostId: string;
	sessionId: string;
	participants: string[];
	createdAt: Date;
	isSynced: boolean;
	maxParticipants: number;
	currentParticipants: number;
}

export type StreamQuality = "360p" | "480p" | "720p" | "1080p" | "4K";
export type StreamStatus = "scheduled" | "live" | "ended" | "paused";

export const getStreamingConfig = () => STREAMING_CONFIG;

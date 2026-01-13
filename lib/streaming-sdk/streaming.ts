/**
 * Triumph Synergy Streaming Core SDK
 * Manages streams, viewers, recording, analytics
 */

import {
	STREAMING_CONFIG,
	type StreamAnalytics,
	type StreamSession,
	type StreamViewer,
} from "./streaming-config";

/**
 * Core Streaming Manager
 * Handles all streaming operations
 */
export class StreamingManager {
	private readonly activeSessions: Map<string, StreamSession> = new Map();
	private readonly sessionViewers: Map<string, Set<StreamViewer>> = new Map();
	private readonly recordings: Map<string, string> = new Map();

	/**
	 * Initialize a new streaming session
	 */
	async initializeSession(
		hostId: string,
		title: string,
		description: string,
		options?: {
			category?: string;
			tags?: string[];
			isPublic?: boolean;
			language?: string;
		},
	): Promise<StreamSession> {
		const sessionId = STREAMING_CONFIG.generateStreamId();

		const session: StreamSession = {
			id: sessionId,
			title,
			description,
			hostId,
			channelName: `${STREAMING_CONFIG.agora.channelNamePrefix}${sessionId}`,
			status: "scheduled",
			startedAt: new Date(),
			viewerCount: 0,
			peakViewerCount: 0,
			duration: 0,
			quality: "1080p",
			category: options?.category || "general",
			tags: options?.tags || [],
			language: options?.language || "en-US",
			isPublic: options?.isPublic !== false,
		};

		this.activeSessions.set(sessionId, session);
		this.sessionViewers.set(sessionId, new Set());

		return session;
	}

	/**
	 * Start a streaming session
	 */
	async startStream(
		sessionId: string,
	): Promise<{ success: boolean; streamKey: string }> {
		const session = this.activeSessions.get(sessionId);
		if (!session) {
			throw new Error(`Stream session ${sessionId} not found`);
		}

		session.status = "live";
		session.startedAt = new Date();

		return {
			success: true,
			streamKey: `rtmps://live.agora.io/${session.channelName}`,
		};
	}

	/**
	 * End a streaming session
	 */
	async endStream(sessionId: string): Promise<{
		success: boolean;
		duration: number;
		viewerCount: number;
		recordingId?: string;
	}> {
		const session = this.activeSessions.get(sessionId);
		if (!session) {
			throw new Error(`Stream session ${sessionId} not found`);
		}

		session.status = "ended";
		session.endedAt = new Date();

		const duration = Math.floor(
			(session.endedAt.getTime() - session.startedAt.getTime()) / 1000,
		);
		session.duration = duration;

		const viewers = this.sessionViewers.get(sessionId);
		const viewerCount = viewers?.size || 0;

		// Generate recording
		const recordingId = `rec_${sessionId}`;
		if (STREAMING_CONFIG.recording.enabled) {
			this.recordings.set(
				recordingId,
				`${STREAMING_CONFIG.recording.storage.bucket}/${sessionId}.mp4`,
			);
		}

		return {
			success: true,
			duration,
			viewerCount,
			recordingId: STREAMING_CONFIG.recording.enabled ? recordingId : undefined,
		};
	}

	/**
	 * Add a viewer to the stream
	 */
	addViewer(sessionId: string, viewer: StreamViewer): void {
		const viewers = this.sessionViewers.get(sessionId);
		if (!viewers) {
			throw new Error(`Stream session ${sessionId} not found`);
		}

		viewers.add(viewer);

		const session = this.activeSessions.get(sessionId);
		if (session) {
			session.viewerCount = viewers.size;
			if (session.viewerCount > session.peakViewerCount) {
				session.peakViewerCount = session.viewerCount;
			}
		}
	}

	/**
	 * Remove a viewer from the stream
	 */
	removeViewer(sessionId: string, viewerId: string): void {
		const viewers = this.sessionViewers.get(sessionId);
		if (!viewers) {
			return;
		}

		const viewer = Array.from(viewers).find((v) => v.id === viewerId);
		if (viewer) {
			viewer.leftAt = new Date();
			viewer.duration = Math.floor(
				(viewer.leftAt.getTime() - viewer.joinedAt.getTime()) / 1000,
			);
			viewers.delete(viewer);

			const session = this.activeSessions.get(sessionId);
			if (session) {
				session.viewerCount = viewers.size;
			}
		}
	}

	/**
	 * Get session details
	 */
	getSession(sessionId: string): StreamSession | undefined {
		return this.activeSessions.get(sessionId);
	}

	/**
	 * Get all active sessions
	 */
	getActiveSessions(): StreamSession[] {
		return Array.from(this.activeSessions.values()).filter(
			(s) => s.status === "live",
		);
	}

	/**
	 * Get session viewers
	 */
	getSessionViewers(sessionId: string): StreamViewer[] {
		const viewers = this.sessionViewers.get(sessionId);
		return viewers ? Array.from(viewers) : [];
	}

	/**
	 * Update stream quality
	 */
	async updateQuality(
		sessionId: string,
		quality: string,
	): Promise<{ success: boolean; bitrate: number }> {
		const session = this.activeSessions.get(sessionId);
		if (!session) {
			throw new Error(`Stream session ${sessionId} not found`);
		}

		session.quality = quality;
		const bitrate = STREAMING_CONFIG.getBitrateForQuality(quality);

		return {
			success: true,
			bitrate,
		};
	}

	/**
	 * Get recommended quality based on bandwidth
	 */
	getRecommendedQuality(bandwidth: number): string {
		return STREAMING_CONFIG.getOptimalBitrate(bandwidth);
	}

	/**
	 * Enable recording
	 */
	async startRecording(
		sessionId: string,
	): Promise<{ success: boolean; recordingId: string }> {
		const session = this.activeSessions.get(sessionId);
		if (!session) {
			throw new Error(`Stream session ${sessionId} not found`);
		}

		const recordingId = `rec_${sessionId}_${Date.now()}`;
		this.recordings.set(
			recordingId,
			`${STREAMING_CONFIG.recording.storage.bucket}/${sessionId}.mp4`,
		);

		return {
			success: true,
			recordingId,
		};
	}

	/**
	 * Stop recording
	 */
	async stopRecording(
		recordingId: string,
	): Promise<{ success: boolean; url: string }> {
		const url = this.recordings.get(recordingId);
		if (!url) {
			throw new Error(`Recording ${recordingId} not found`);
		}

		return {
			success: true,
			url,
		};
	}

	/**
	 * Get analytics for a session
	 */
	getSessionAnalytics(sessionId: string): StreamAnalytics {
		const session = this.activeSessions.get(sessionId);
		const viewers = this.sessionViewers.get(sessionId);

		if (!session || !viewers) {
			throw new Error(`Stream session ${sessionId} not found`);
		}

		const allViewers = Array.from(viewers);
		const avgViewDuration =
			allViewers.reduce((sum, v) => sum + v.duration, 0) /
			Math.max(allViewers.length, 1);

		return {
			sessionId,
			totalViewers: allViewers.length,
			peakViewers: session.peakViewerCount,
			averageViewDuration: avgViewDuration,
			engagementRate: 42.5, // Mock value
			completionRate: 78.3, // Mock value
			messages: 234, // Mock value
			polls: 3, // Mock value
			reactions: 1250, // Mock value
			superChats: 15, // Mock value
			revenue: 450.0, // Mock value
			countries: ["US", "UK", "CA", "AU", "DE"],
			devices: {
				desktop: 45,
				mobile: 35,
				tablet: 20,
			},
			qualitySwitches: 12,
			averageBufferTime: 0.8,
		};
	}

	/**
	 * Get viewer analytics for a specific viewer
	 */
	getViewerAnalytics(
		sessionId: string,
		viewerId: string,
	): {
		viewedDuration: number;
		startTime: Date;
		endTime?: Date;
		qualityProgression: string[];
		bufferingEvents: number;
	} {
		const viewers = this.sessionViewers.get(sessionId);
		const viewer = viewers
			? Array.from(viewers).find((v) => v.id === viewerId)
			: undefined;

		if (!viewer) {
			throw new Error(`Viewer ${viewerId} not found in session ${sessionId}`);
		}

		return {
			viewedDuration: viewer.duration,
			startTime: viewer.joinedAt,
			endTime: viewer.leftAt,
			qualityProgression: ["480p", "720p", "1080p"],
			bufferingEvents: 2,
		};
	}

	/**
	 * Validate stream key
	 */
	async validateStreamKey(
		sessionId: string,
		streamKey: string,
	): Promise<boolean> {
		const session = this.activeSessions.get(sessionId);
		if (!session) {
			return false;
		}

		const expectedKey = `rtmps://live.agora.io/${session.channelName}`;
		return streamKey === expectedKey;
	}

	/**
	 * Change stream title
	 */
	updateStreamTitle(sessionId: string, title: string): void {
		const session = this.activeSessions.get(sessionId);
		if (session) {
			session.title = title;
		}
	}

	/**
	 * Change stream description
	 */
	updateStreamDescription(sessionId: string, description: string): void {
		const session = this.activeSessions.get(sessionId);
		if (session) {
			session.description = description;
		}
	}

	/**
	 * Pause stream
	 */
	async pauseStream(sessionId: string): Promise<{ success: boolean }> {
		const session = this.activeSessions.get(sessionId);
		if (session) {
			session.status = "paused";
		}
		return { success: true };
	}

	/**
	 * Resume stream
	 */
	async resumeStream(sessionId: string): Promise<{ success: boolean }> {
		const session = this.activeSessions.get(sessionId);
		if (session) {
			session.status = "live";
		}
		return { success: true };
	}

	/**
	 * Get recording URL
	 */
	getRecordingUrl(recordingId: string): string | undefined {
		return this.recordings.get(recordingId);
	}

	/**
	 * Check bandwidth and recommend quality
	 */
	checkBandwidthAndRecommend(currentBandwidth: number): {
		quality: string;
		bitrate: number;
		recommendation: string;
	} {
		const quality = this.getRecommendedQuality(currentBandwidth);
		const bitrate = STREAMING_CONFIG.getBitrateForQuality(quality);

		let recommendation = "Stream quality is optimal";
		if (currentBandwidth < 1000) {
			recommendation = "Low bandwidth detected. Consider lowering quality.";
		} else if (currentBandwidth > 5000) {
			recommendation = "High bandwidth available. You can stream in 4K!";
		}

		return { quality, bitrate, recommendation };
	}
}

// Export singleton instance
export const streamingManager = new StreamingManager();

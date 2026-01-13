/**
 * Rate Limiting Middleware for Biometric Authentication
 * Prevents brute force attacks and DoS attempts
 */

import { type NextRequest, NextResponse } from "next/server";

export interface RateLimitConfig {
	windowMs: number; // Time window in milliseconds
	maxAttempts: number; // Maximum attempts per window
	delayMs: number; // Delay between attempts
	keyGenerator?: (request: NextRequest) => string;
	skip?: (request: NextRequest) => boolean;
	onLimitReached?: (key: string) => Promise<void>;
}

/**
 * In-memory store for rate limiting
 * In production, use Redis or similar for distributed rate limiting
 */
export class RateLimitStore {
	private readonly store = new Map<
		string,
		{ attempts: number; resetTime: number }
	>();
	private readonly cleanupInterval: NodeJS.Timeout | null = null;

	constructor(cleanupIntervalMs = 60_000) {
		// Cleanup old entries every minute
		this.cleanupInterval = setInterval(() => this.cleanup(), cleanupIntervalMs);
	}

	/**
	 * Check if limit exceeded
	 */
	isLimited(key: string, config: RateLimitConfig): boolean {
		const now = Date.now();
		const entry = this.store.get(key);

		if (!entry) {
			return false;
		}

		if (now > entry.resetTime) {
			this.store.delete(key);
			return false;
		}

		return entry.attempts >= config.maxAttempts;
	}

	/**
	 * Record attempt
	 */
	recordAttempt(key: string, config: RateLimitConfig): void {
		const now = Date.now();
		const entry = this.store.get(key);

		if (!entry || now > entry.resetTime) {
			this.store.set(key, {
				attempts: 1,
				resetTime: now + config.windowMs,
			});
		} else {
			entry.attempts++;
		}
	}

	/**
	 * Get remaining attempts
	 */
	getRemainingAttempts(key: string, config: RateLimitConfig): number {
		const now = Date.now();
		const entry = this.store.get(key);

		if (!entry || now > entry.resetTime) {
			return config.maxAttempts;
		}

		return Math.max(0, config.maxAttempts - entry.attempts);
	}

	/**
	 * Get reset time
	 */
	getResetTime(key: string): number | null {
		const entry = this.store.get(key);
		return entry ? entry.resetTime : null;
	}

	/**
	 * Clear specific key
	 */
	clear(key: string): void {
		this.store.delete(key);
	}

	/**
	 * Clear all entries
	 */
	clearAll(): void {
		this.store.clear();
	}

	/**
	 * Cleanup expired entries
	 */
	private cleanup(): void {
		const now = Date.now();
		const keysToDelete: string[] = [];

		for (const [key, entry] of this.store.entries()) {
			if (now > entry.resetTime) {
				keysToDelete.push(key);
			}
		}

		for (const key of keysToDelete) {
			this.store.delete(key);
		}
	}

	/**
	 * Destroy rate limiter
	 */
	destroy(): void {
		if (this.cleanupInterval) {
			clearInterval(this.cleanupInterval);
		}
		this.store.clear();
	}
}

// Global rate limit stores
const authAttemptStore = new RateLimitStore();
const registrationStore = new RateLimitStore();
const credentialStore = new RateLimitStore();

/**
 * Get client IP from request
 */
function getClientIP(request: NextRequest): string {
	const forwarded = request.headers.get("x-forwarded-for");
	if (forwarded) {
		return forwarded.split(",")[0].trim();
	}

	return request.headers.get("x-real-ip") || "unknown";
}

/**
 * Default key generator using IP and user ID
 */
function defaultKeyGenerator(request: NextRequest, prefix: string): string {
	const ip = getClientIP(request);
	const userIdHeader = request.headers.get("x-user-id");

	return `${prefix}:${ip}${userIdHeader ? ":" + userIdHeader : ""}`;
}

/**
 * Rate limit middleware for authentication attempts
 */
export async function biometricAuthRateLimit(
	request: NextRequest,
	config: Partial<RateLimitConfig> = {},
): Promise<NextResponse | undefined> {
	const finalConfig: RateLimitConfig = {
		windowMs: 15 * 60 * 1000, // 15 minutes
		maxAttempts: 5, // 5 attempts
		delayMs: 1000,
		keyGenerator: (req) => defaultKeyGenerator(req, "biometric:auth"),
		...config,
	};

	if (finalConfig.skip?.(request)) {
		return;
	}

	const key = finalConfig.keyGenerator!(request);

	if (authAttemptStore.isLimited(key, finalConfig)) {
		const resetTime = authAttemptStore.getResetTime(key);
		const retryAfter = resetTime
			? Math.ceil((resetTime - Date.now()) / 1000)
			: 900;

		await finalConfig.onLimitReached?.(key);

		return NextResponse.json(
			{
				error: "Too many authentication attempts. Please try again later.",
				code: "RATE_LIMITED",
				retryAfter,
			},
			{
				status: 429,
				headers: {
					"Retry-After": retryAfter.toString(),
				},
			},
		);
	}

	authAttemptStore.recordAttempt(key, finalConfig);
	return;
}

/**
 * Rate limit middleware for registration attempts
 */
export async function biometricRegistrationRateLimit(
	request: NextRequest,
	config: Partial<RateLimitConfig> = {},
): Promise<NextResponse | undefined> {
	const finalConfig: RateLimitConfig = {
		windowMs: 60 * 60 * 1000, // 1 hour
		maxAttempts: 10, // 10 registrations per hour
		delayMs: 0,
		keyGenerator: (req) => defaultKeyGenerator(req, "biometric:register"),
		...config,
	};

	if (finalConfig.skip?.(request)) {
		return;
	}

	const key = finalConfig.keyGenerator!(request);

	if (registrationStore.isLimited(key, finalConfig)) {
		const resetTime = registrationStore.getResetTime(key);
		const retryAfter = resetTime
			? Math.ceil((resetTime - Date.now()) / 1000)
			: 3600;

		await finalConfig.onLimitReached?.(key);

		return NextResponse.json(
			{
				error: "Too many registration attempts. Please try again later.",
				code: "RATE_LIMITED",
				retryAfter,
			},
			{
				status: 429,
				headers: {
					"Retry-After": retryAfter.toString(),
				},
			},
		);
	}

	registrationStore.recordAttempt(key, finalConfig);
	return;
}

/**
 * Rate limit middleware for credential operations
 */
export async function biometricCredentialRateLimit(
	request: NextRequest,
	config: Partial<RateLimitConfig> = {},
): Promise<NextResponse | undefined> {
	const finalConfig: RateLimitConfig = {
		windowMs: 60 * 1000, // 1 minute
		maxAttempts: 20, // 20 operations per minute
		delayMs: 0,
		keyGenerator: (req) => defaultKeyGenerator(req, "biometric:credential"),
		...config,
	};

	if (finalConfig.skip?.(request)) {
		return;
	}

	const key = finalConfig.keyGenerator!(request);

	if (credentialStore.isLimited(key, finalConfig)) {
		const resetTime = credentialStore.getResetTime(key);
		const retryAfter = resetTime
			? Math.ceil((resetTime - Date.now()) / 1000)
			: 60;

		await finalConfig.onLimitReached?.(key);

		return NextResponse.json(
			{
				error: "Too many requests. Please wait before trying again.",
				code: "RATE_LIMITED",
				retryAfter,
			},
			{
				status: 429,
				headers: {
					"Retry-After": retryAfter.toString(),
				},
			},
		);
	}

	credentialStore.recordAttempt(key, finalConfig);
	return;
}

/**
 * Reset rate limit for specific user/IP
 * Call after successful authentication or manual unlock
 */
export function resetRateLimit(
	ip: string,
	userId?: string,
	limitType: "auth" | "register" | "credential" = "auth",
): void {
	const prefix = `biometric:${limitType}`;
	const key = `${prefix}:${ip}${userId ? ":" + userId : ""}`;

	switch (limitType) {
		case "auth":
			authAttemptStore.clear(key);
			break;
		case "register":
			registrationStore.clear(key);
			break;
		case "credential":
			credentialStore.clear(key);
			break;
		default:
			authAttemptStore.clear(key);
			break;
	}
}

/**
 * Get rate limit status
 */
export function getRateLimitStatus(
	ip: string,
	userId?: string,
	limitType: "auth" | "register" | "credential" = "auth",
): { isLimited: boolean; remainingAttempts: number; resetTime: number | null } {
	const prefix = `biometric:${limitType}`;
	const key = `${prefix}:${ip}${userId ? ":" + userId : ""}`;

	const stores = {
		auth: {
			store: authAttemptStore,
			config: { windowMs: 15 * 60 * 1000, maxAttempts: 5 },
		},
		register: {
			store: registrationStore,
			config: { windowMs: 60 * 60 * 1000, maxAttempts: 10 },
		},
		credential: {
			store: credentialStore,
			config: { windowMs: 60 * 1000, maxAttempts: 20 },
		},
	};

	const { store, config } = stores[limitType];

	return {
		isLimited: store.isLimited(key, config as RateLimitConfig),
		remainingAttempts: store.getRemainingAttempts(
			key,
			config as RateLimitConfig,
		),
		resetTime: store.getResetTime(key),
	};
}

/**
 * Cleanup function to destroy all rate limiters
 */
export function destroyRateLimiters(): void {
	authAttemptStore.destroy();
	registrationStore.destroy();
	credentialStore.destroy();
}

// Clean up on process exit
if (typeof process !== "undefined" && process.on) {
	process.on("exit", destroyRateLimiters);
	process.on("SIGTERM", destroyRateLimiters);
	process.on("SIGINT", destroyRateLimiters);
}

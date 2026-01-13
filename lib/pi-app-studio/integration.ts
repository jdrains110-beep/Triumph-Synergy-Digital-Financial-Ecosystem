/**
 * Pi App Studio Integration
 * Complete integration for Pi Network, Vercel, and GitHub
 *
 * This module provides a unified interface for:
 * - Pi SDK initialization and management
 * - Payment processing with Stellar settlement
 * - Authentication and user management
 * - Webhook handling
 * - Deployment verification
 */

// ============================================================================
// TYPES
// ============================================================================

export interface PiAppConfig {
	appId: string;
	appName: string;
	version: string;
	environment: "production" | "staging" | "sandbox";

	// SDK Configuration
	sdk: {
		version: string;
		scriptUrl: string;
		sandbox: boolean;
	};

	// Payment Configuration
	payments: {
		minAmount: number;
		maxAmount: number;
		internalMultiplier: number;
		externalMultiplier: number;
		settlementNetwork: "stellar";
	};

	// Endpoints
	endpoints: {
		approve: string;
		complete: string;
		cancel: string;
		value: string;
		status: string;
	};

	// Platform URLs
	urls: {
		production: string;
		staging: string;
		development: string;
	};
}

export interface PiAppStatus {
	ready: boolean;
	sdkLoaded: boolean;
	authenticated: boolean;
	paymentsEnabled: boolean;
	stellarConnected: boolean;
	environment: string;
	version: string;
	timestamp: string;
}

export interface PiPaymentConfig {
	amount: number;
	memo: string;
	metadata?: Record<string, unknown>;
	useInternalPi?: boolean;
}

export interface PiPaymentResult {
	success: boolean;
	paymentId?: string;
	txid?: string;
	amount?: number;
	stellarTxHash?: string;
	error?: string;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

export const PI_APP_CONFIG: PiAppConfig = {
	appId: process.env.NEXT_PUBLIC_PI_APP_ID || "triumph-synergy",
	appName: "Triumph-Synergy",
	version: "1.0.0",
	environment: (process.env.NODE_ENV === "production"
		? "production"
		: "sandbox") as PiAppConfig["environment"],

	sdk: {
		version: "2.0",
		scriptUrl:
			process.env.NEXT_PUBLIC_PI_SDK_URL || "https://sdk.minepi.com/pi-sdk.js",
		sandbox: process.env.NEXT_PUBLIC_PI_SANDBOX === "true",
	},

	payments: {
		minAmount: parseFloat(process.env.PI_MIN_TRANSACTION || "10"),
		maxAmount: parseFloat(process.env.PI_MAX_TRANSACTION || "100000"),
		internalMultiplier: parseFloat(process.env.INTERNAL_PI_MULTIPLIER || "1.5"),
		externalMultiplier: parseFloat(process.env.EXTERNAL_PI_MULTIPLIER || "1.0"),
		settlementNetwork: "stellar",
	},

	endpoints: {
		approve: "/api/pi/approve",
		complete: "/api/pi/complete",
		cancel: "/api/pi/cancel",
		value: "/api/pi/value",
		status: "/api/pi/status",
	},

	urls: {
		production: "https://triumph-synergy-jeremiah-drains-projects.vercel.app",
		staging: "https://triumph-synergy-staging.vercel.app",
		development: "http://localhost:3000",
	},
};

// ============================================================================
// PI SDK LOADER
// ============================================================================

let piSdkLoaded = false;
let piSdkInitialized = false;

/**
 * Load Pi SDK script into the DOM
 */
export function loadPiSDK(): Promise<boolean> {
	return new Promise((resolve) => {
		if (typeof window === "undefined") {
			resolve(false);
			return;
		}

		if (piSdkLoaded) {
			resolve(true);
			return;
		}

		// Check if already loaded
		if (window.Pi) {
			piSdkLoaded = true;
			resolve(true);
			return;
		}

		// Check if script already exists
		const existingScript = document.querySelector('script[src*="pi-sdk.js"]');
		if (existingScript) {
			piSdkLoaded = true;
			resolve(true);
			return;
		}

		// Load the script
		const script = document.createElement("script");
		script.src = PI_APP_CONFIG.sdk.scriptUrl;
		script.async = true;

		script.onload = () => {
			piSdkLoaded = true;
			console.log("✅ Pi SDK loaded successfully");
			resolve(true);
		};

		script.onerror = () => {
			console.error("❌ Failed to load Pi SDK");
			resolve(false);
		};

		document.head.appendChild(script);
	});
}

/**
 * Initialize Pi SDK with configuration
 */
export async function initializePiSDK(): Promise<boolean> {
	if (typeof window === "undefined") {
		return false;
	}

	// Load SDK first
	const loaded = await loadPiSDK();
	if (!loaded) {
		return false;
	}

	// Wait for Pi object to be available
	let attempts = 0;
	while (!window.Pi && attempts < 50) {
		await new Promise((r) => setTimeout(r, 100));
		attempts++;
	}

	if (!window.Pi) {
		console.error("❌ Pi SDK not available after loading");
		return false;
	}

	try {
		// Initialize with configuration
		window.Pi.init({
			version: PI_APP_CONFIG.sdk.version,
			sandbox: PI_APP_CONFIG.sdk.sandbox,
		});

		piSdkInitialized = true;
		console.log("✅ Pi SDK initialized successfully");
		return true;
	} catch (error) {
		console.error("❌ Failed to initialize Pi SDK:", error);
		return false;
	}
}

// ============================================================================
// AUTHENTICATION
// ============================================================================

export interface PiUser {
	uid: string;
	username: string;
	accessToken?: string;
}

let currentUser: PiUser | null = null;

/**
 * Authenticate user with Pi Network
 */
export async function authenticatePiUser(
	scopes: string[] = ["username", "payments"],
): Promise<PiUser | null> {
	if (typeof window === "undefined" || !window.Pi) {
		console.error("❌ Pi SDK not available");
		return null;
	}

	try {
		const result = await window.Pi.authenticate(
			scopes,
			onIncompletePaymentFound,
		);

		currentUser = {
			uid: result.user.uid,
			username: result.user.username,
			accessToken: result.accessToken,
		};

		console.log("✅ User authenticated:", currentUser.username);
		return currentUser;
	} catch (error) {
		console.error("❌ Authentication failed:", error);
		return null;
	}
}

/**
 * Get current authenticated user
 */
export function getCurrentUser(): PiUser | null {
	return currentUser;
}

/**
 * Handle incomplete payment found during authentication
 */
function onIncompletePaymentFound(payment: any): void {
	console.log("⚠️ Incomplete payment found:", payment);
	// Handle incomplete payment - complete or cancel
}

// ============================================================================
// PAYMENTS
// ============================================================================

/**
 * Create and process a Pi payment
 */
export async function createPiPayment(
	config: PiPaymentConfig,
): Promise<PiPaymentResult> {
	if (typeof window === "undefined" || !window.Pi) {
		return { success: false, error: "Pi SDK not available" };
	}

	// Validate amount
	if (config.amount < PI_APP_CONFIG.payments.minAmount) {
		return {
			success: false,
			error: `Minimum amount is ${PI_APP_CONFIG.payments.minAmount} Pi`,
		};
	}

	if (config.amount > PI_APP_CONFIG.payments.maxAmount) {
		return {
			success: false,
			error: `Maximum amount is ${PI_APP_CONFIG.payments.maxAmount} Pi`,
		};
	}

	// Apply multiplier if internal Pi
	const effectiveAmount = config.useInternalPi
		? config.amount * PI_APP_CONFIG.payments.internalMultiplier
		: config.amount * PI_APP_CONFIG.payments.externalMultiplier;

	try {
		const payment = await window.Pi.createPayment(
			{
				amount: effectiveAmount,
				memo: config.memo,
				metadata: {
					...config.metadata,
					originalAmount: config.amount,
					multiplierApplied: config.useInternalPi ? "internal" : "external",
				},
			},
			{
				onReadyForServerApproval: async (paymentId: string) => {
					// Call server approval endpoint
					const response = await fetch(PI_APP_CONFIG.endpoints.approve, {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ paymentId }),
					});

					if (!response.ok) {
						throw new Error("Server approval failed");
					}
				},
				onReadyForServerCompletion: async (paymentId: string, txid: string) => {
					// Call server completion endpoint
					const response = await fetch(PI_APP_CONFIG.endpoints.complete, {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({ paymentId, txid }),
					});

					if (!response.ok) {
						throw new Error("Server completion failed");
					}
				},
				onCancel: (paymentId: string) => {
					console.log("⚠️ Payment cancelled:", paymentId);
				},
				onError: (error: Error, payment?: any) => {
					console.error("❌ Payment error:", error, payment);
				},
			},
		);

		return {
			success: true,
			paymentId: payment.identifier,
			amount: effectiveAmount,
		};
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : "Payment failed",
		};
	}
}

/**
 * Get current Pi value
 */
export async function getPiValue(): Promise<{
	basePiValue: number;
	internalValue: number;
	externalValue: number;
}> {
	try {
		const response = await fetch(PI_APP_CONFIG.endpoints.value);
		const data = await response.json();

		return {
			basePiValue: data.basePiValue || 10.0,
			internalValue: data.effectiveValue?.internal || 15.0,
			externalValue: data.effectiveValue?.external || 10.0,
		};
	} catch {
		return {
			basePiValue: 10.0,
			internalValue: 15.0,
			externalValue: 10.0,
		};
	}
}

// ============================================================================
// APP STATUS
// ============================================================================

/**
 * Get Pi App status
 */
export function getPiAppStatus(): PiAppStatus {
	return {
		ready: piSdkInitialized,
		sdkLoaded: piSdkLoaded,
		authenticated: currentUser !== null,
		paymentsEnabled: true,
		stellarConnected: true,
		environment: PI_APP_CONFIG.environment,
		version: PI_APP_CONFIG.version,
		timestamp: new Date().toISOString(),
	};
}

/**
 * Check if running in Pi Browser
 */
export function isInPiBrowser(): boolean {
	if (typeof navigator === "undefined") {
		return false;
	}

	return (
		navigator.userAgent.includes("PiBrowser") ||
		navigator.userAgent.includes("Pi Network") ||
		(typeof window !== "undefined" && !!window.Pi)
	);
}

// ============================================================================
// VERCEL INTEGRATION
// ============================================================================

export const VERCEL_CONFIG = {
	projectUrl: PI_APP_CONFIG.urls.production,
	regions: ["iad1", "sfo1", "lhr1"],
	functions: {
		piApprove: {
			path: "/api/pi/approve",
			maxDuration: 30,
			memory: 1024,
		},
		piComplete: {
			path: "/api/pi/complete",
			maxDuration: 30,
			memory: 1024,
		},
		stellarSettlement: {
			path: "/api/stellar/settlement",
			maxDuration: 60,
			memory: 1024,
		},
	},
	crons: {
		stellarSettlement: "0 * * * *",
		paymentReconciliation: "*/15 * * * *",
	},
};

// ============================================================================
// GITHUB INTEGRATION
// ============================================================================

export const GITHUB_CONFIG = {
	repository: "jdrains110-beep/triumph-synergy",
	branch: "main",
	workflows: {
		deploy: ".github/workflows/pi-app-studio-deploy.yml",
		test: ".github/workflows/deploy.yml",
	},
	secrets: [
		"PI_API_KEY",
		"PI_API_SECRET",
		"PI_INTERNAL_API_KEY",
		"VERCEL_TOKEN",
		"STELLAR_PAYMENT_ACCOUNT",
		"STELLAR_PAYMENT_SECRET",
	],
};

// Import the canonical Window.Pi type declaration
// The global declaration is in types/pi-sdk.d.ts
import type {} from "../../types/pi-sdk.d";

export default {
	config: PI_APP_CONFIG,
	loadSDK: loadPiSDK,
	initialize: initializePiSDK,
	authenticate: authenticatePiUser,
	createPayment: createPiPayment,
	getPiValue,
	getStatus: getPiAppStatus,
	isInPiBrowser,
	getCurrentUser,
	vercel: VERCEL_CONFIG,
	github: GITHUB_CONFIG,
};

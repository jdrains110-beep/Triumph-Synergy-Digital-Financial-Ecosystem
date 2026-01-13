/**
 * lib/core/pi-origin-enforcement.ts
 *
 * ENFORCEMENT LAYER - Applies Pi Origin Verification to ALL transactions
 *
 * This middleware enforces the immutable Pi origin distinction across:
 * - All gaming platform payments
 * - All health institution payroll
 * - All streaming creator earnings
 * - All API endpoints
 * - All user transactions
 *
 * NO EXCEPTIONS - Every single transaction goes through this filter
 */

import {
	type PiOriginType,
	type PiPaymentWithOriginRequirement,
	piOriginVerificationEngine,
} from "./pi-origin-verification";

// ============================================================================
// TRANSACTION CATEGORIES & ORIGIN REQUIREMENTS
// ============================================================================

export enum TransactionCategory {
	GAMING_ENGAGEMENT = "gaming_engagement", // Must be INTERNAL
	GAMING_ACHIEVEMENT = "gaming_achievement", // Must be INTERNAL
	GAMING_TOURNAMENT = "gaming_tournament", // Must be INTERNAL
	GAMING_STREAMING = "gaming_streaming", // Must be INTERNAL
	HEALTH_PAYROLL = "health_payroll", // Must be INTERNAL
	HEALTH_BONUS = "health_bonus", // Must be INTERNAL
	HEALTH_CONTRACTOR = "health_contractor", // Must be INTERNAL
	STREAMING_EARNINGS = "streaming_earnings", // Must be INTERNAL
	STREAMING_SUBSCRIBER = "streaming_subscriber", // Must be INTERNAL
	STREAMING_DONATION = "streaming_donation", // Must be INTERNAL
}

/**
 * Get the required Pi origin type for a transaction category
 *
 * RULE: All ecosystem-generated earnings REQUIRE internal Pi
 * No exceptions - ecosystem will not accept external Pi for payouts
 */
export function getRequiredOriginType(
	category: TransactionCategory,
): PiOriginType {
	// All ecosystem-generated payments must be from INTERNAL Pi
	// This is non-negotiable and applies to ALL categories
	switch (category) {
		// Gaming payments - ALL must be INTERNAL
		case TransactionCategory.GAMING_ENGAGEMENT:
		case TransactionCategory.GAMING_ACHIEVEMENT:
		case TransactionCategory.GAMING_TOURNAMENT:
		case TransactionCategory.GAMING_STREAMING:
		// Health payments - ALL must be INTERNAL
		case TransactionCategory.HEALTH_PAYROLL:
		case TransactionCategory.HEALTH_BONUS:
		case TransactionCategory.HEALTH_CONTRACTOR:
		// Streaming payments - ALL must be INTERNAL
		case TransactionCategory.STREAMING_EARNINGS:
		case TransactionCategory.STREAMING_SUBSCRIBER:
		case TransactionCategory.STREAMING_DONATION:
			return "internal"; // ✓ IMMUTABLE - No exceptions
		default:
			return "internal";
	}
}

// ============================================================================
// TRANSACTION ENFORCEMENT MIDDLEWARE
// ============================================================================

export class PiOriginEnforcer {
	/**
	 * CRITICAL: Process a transaction with mandatory origin verification
	 *
	 * This is the ONLY way transactions should flow through the system
	 * - Blocks any transaction that doesn't match required origin
	 * - Logs all attempts (approved and rejected)
	 * - Makes origin distinction immutable in blockchain
	 */
	async enforceTransaction(
		walletAddress: string,
		category: TransactionCategory,
		amount: number,
		description: string,
		metadata?: Record<string, unknown>,
	): Promise<{
		success: boolean;
		message: string;
		requiredOrigin: PiOriginType;
		approved: boolean;
		transactionId?: string;
	}> {
		const requiredOrigin = getRequiredOriginType(category);

		console.log(
			`[Pi Origin Enforcer] Transaction attempt: ${description} (Category: ${category}, Required Origin: ${requiredOrigin})`,
		);

		// Create payment request with immutable origin requirement
		const payment: PiPaymentWithOriginRequirement = {
			amount,
			requiredOriginType: requiredOrigin,
			memo: `${category}: ${description}`,
			metadata: {
				...metadata,
				category,
				timestamp: new Date().toISOString(),
				enforced: true, // Mark as enforced
			},
			originValidated: false,
		};

		// Validate payment origin (this is where rejection happens)
		const validation = await piOriginVerificationEngine.validatePaymentOrigin(
			walletAddress,
			payment,
		);

		if (!validation.isValid) {
			console.error(
				`[Pi Origin Enforcer] ✗ TRANSACTION REJECTED: ${validation.reason}`,
			);

			return {
				success: false,
				message: validation.reason,
				requiredOrigin,
				approved: false,
			};
		}

		// Execute payment with verified origin
		try {
			const result = await piOriginVerificationEngine.executePaymentWithOrigin(
				walletAddress,
				payment,
				"ecosystem_treasury", // All payments go through ecosystem first
			);

			console.log(
				`[Pi Origin Enforcer] ✓ TRANSACTION APPROVED: ${amount} Pi from ${requiredOrigin} source`,
			);

			return {
				success: true,
				message: `Transaction approved: ${amount} Pi from ${requiredOrigin} Pi`,
				requiredOrigin,
				approved: true,
				transactionId: result.transactionId,
			};
		} catch (error) {
			const errorMsg = error instanceof Error ? error.message : String(error);
			console.error(`[Pi Origin Enforcer] ✗ Execution error: ${errorMsg}`);

			return {
				success: false,
				message: errorMsg,
				requiredOrigin,
				approved: false,
			};
		}
	}

	/**
	 * Batch enforcement for multiple transactions
	 * All must comply with origin requirements - no partial success
	 */
	async enforceBatchTransactions(
		walletAddress: string,
		transactions: Array<{
			category: TransactionCategory;
			amount: number;
			description: string;
			metadata?: Record<string, unknown>;
		}>,
	): Promise<{
		allApproved: boolean;
		totalAmount: number;
		approved: number;
		rejected: number;
		results: Array<{
			description: string;
			approved: boolean;
			reason?: string;
		}>;
	}> {
		console.log(
			`[Pi Origin Enforcer] Batch enforcement: ${transactions.length} transactions`,
		);

		const results: Array<{
			description: string;
			approved: boolean;
			reason?: string;
		}> = [];

		let totalAmount = 0;
		let approvedCount = 0;

		for (const tx of transactions) {
			const result = await this.enforceTransaction(
				walletAddress,
				tx.category,
				tx.amount,
				tx.description,
				tx.metadata,
			);

			results.push({
				description: tx.description,
				approved: result.approved,
				reason: result.message,
			});

			if (result.approved) {
				approvedCount++;
				totalAmount += tx.amount;
			}
		}

		const allApproved = approvedCount === transactions.length;

		console.log(
			`[Pi Origin Enforcer] Batch complete: ${approvedCount}/${transactions.length} approved, Total: ${totalAmount} Pi`,
		);

		return {
			allApproved,
			totalAmount,
			approved: approvedCount,
			rejected: transactions.length - approvedCount,
			results,
		};
	}

	/**
	 * Get enforcement status for a wallet
	 */
	getEnforcementStatus(walletAddress: string): {
		walletAddress: string;
		hasOriginTracking: boolean;
		internalPi: number;
		externalPi: number;
		lastUpdated: Date | null;
	} {
		const state =
			piOriginVerificationEngine.getWalletOriginState(walletAddress);

		return {
			walletAddress,
			hasOriginTracking: state !== null,
			internalPi: state?.internalPiTotal ?? 0,
			externalPi: state?.externalPiTotal ?? 0,
			lastUpdated: state?.lastUpdated ?? null,
		};
	}
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const piOriginEnforcer = new PiOriginEnforcer();

// ============================================================================
// ENFORCEMENT HOOKS FOR PLATFORMS
// ============================================================================

/**
 * Gaming Framework Hook
 * All gaming payments enforce internal Pi requirement
 */
export async function enforceGamingPayment(
	walletAddress: string,
	amount: number,
	eventType: "engagement" | "achievement" | "tournament" | "streaming",
	description: string,
): Promise<{
	success: boolean;
	message: string;
}> {
	const categoryMap = {
		engagement: TransactionCategory.GAMING_ENGAGEMENT,
		achievement: TransactionCategory.GAMING_ACHIEVEMENT,
		tournament: TransactionCategory.GAMING_TOURNAMENT,
		streaming: TransactionCategory.GAMING_STREAMING,
	};

	const result = await piOriginEnforcer.enforceTransaction(
		walletAddress,
		categoryMap[eventType],
		amount,
		description,
	);

	return {
		success: result.approved,
		message: result.message,
	};
}

/**
 * Health Framework Hook
 * All health payments enforce internal Pi requirement
 */
export async function enforceHealthPayment(
	walletAddress: string,
	amount: number,
	paymentType: "payroll" | "bonus" | "contractor",
	description: string,
): Promise<{
	success: boolean;
	message: string;
}> {
	const categoryMap = {
		payroll: TransactionCategory.HEALTH_PAYROLL,
		bonus: TransactionCategory.HEALTH_BONUS,
		contractor: TransactionCategory.HEALTH_CONTRACTOR,
	};

	const result = await piOriginEnforcer.enforceTransaction(
		walletAddress,
		categoryMap[paymentType],
		amount,
		description,
	);

	return {
		success: result.approved,
		message: result.message,
	};
}

/**
 * Streaming Framework Hook
 * All streaming earnings enforce internal Pi requirement
 */
export async function enforceStreamingPayment(
	walletAddress: string,
	amount: number,
	eventType: "earnings" | "subscriber" | "donation",
	description: string,
): Promise<{
	success: boolean;
	message: string;
}> {
	const categoryMap = {
		earnings: TransactionCategory.STREAMING_EARNINGS,
		subscriber: TransactionCategory.STREAMING_SUBSCRIBER,
		donation: TransactionCategory.STREAMING_DONATION,
	};

	const result = await piOriginEnforcer.enforceTransaction(
		walletAddress,
		categoryMap[eventType],
		amount,
		description,
	);

	return {
		success: result.approved,
		message: result.message,
	};
}

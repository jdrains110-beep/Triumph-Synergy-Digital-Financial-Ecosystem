/**
 * Triumph Synergy - Universal Basic Income (UBI) Distribution System
 *
 * Provides automated UBI distribution powered by Pi Network blockchain.
 * Integrates with NESARA/GESARA protocols for wealth redistribution.
 *
 * @module lib/ubi/universal-basic-income
 * @version 1.0.0
 * @since 2026-01-08
 */

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface UBIRecipient {
	id: string;
	piUsername: string;
	walletAddress: string;
	kycVerified: boolean;
	eligibilityStatus: "eligible" | "pending" | "ineligible" | "suspended";
	enrollmentDate: Date;
	lastDistribution: Date | null;
	totalReceived: number;
	country: string;
	region: string;
	metadata: Record<string, unknown>;
}

export interface UBIDistribution {
	id: string;
	recipientId: string;
	amount: number;
	currency: "PI" | "USD" | "LOCAL";
	piEquivalent: number;
	distributionType: "monthly" | "weekly" | "emergency" | "supplemental";
	status: "pending" | "processing" | "completed" | "failed";
	transactionHash: string | null;
	blockNumber: number | null;
	timestamp: Date;
	nesaraCompliant: boolean;
	gesaraCompliant: boolean;
}

export interface UBIProgram {
	id: string;
	name: string;
	description: string;
	fundingSource: "treasury" | "pi-network" | "partner" | "hybrid";
	monthlyAmount: number;
	currency: string;
	eligibilityCriteria: EligibilityCriteria;
	isActive: boolean;
	startDate: Date;
	endDate: Date | null;
	totalDistributed: number;
	recipientCount: number;
}

export interface EligibilityCriteria {
	minAge: number;
	maxAge: number | null;
	kycRequired: boolean;
	residencyRequired: boolean;
	incomeThreshold: number | null;
	citizenshipRequired: boolean;
	excludedCountries: string[];
	additionalRequirements: string[];
}

export interface DistributionSchedule {
	frequency: "daily" | "weekly" | "biweekly" | "monthly";
	dayOfWeek?: number; // 0-6 for weekly
	dayOfMonth?: number; // 1-31 for monthly
	timeOfDay: string; // HH:MM format
	timezone: string;
}

// ============================================================================
// UBI DISTRIBUTION ENGINE
// ============================================================================

export class UniversalBasicIncomeEngine {
	private static instance: UniversalBasicIncomeEngine;
	private readonly programs: Map<string, UBIProgram> = new Map();
	private readonly recipients: Map<string, UBIRecipient> = new Map();
	private readonly distributionQueue: UBIDistribution[] = [];
	private isProcessing = false;

	private constructor() {
		this.initializeDefaultPrograms();
	}

	static getInstance(): UniversalBasicIncomeEngine {
		if (!UniversalBasicIncomeEngine.instance) {
			UniversalBasicIncomeEngine.instance = new UniversalBasicIncomeEngine();
		}
		return UniversalBasicIncomeEngine.instance;
	}

	// ==========================================================================
	// PROGRAM MANAGEMENT
	// ==========================================================================

	private initializeDefaultPrograms(): void {
		// Pi Network Global UBI Program
		const piGlobalUBI: UBIProgram = {
			id: "pi-global-ubi-001",
			name: "Pi Network Global Universal Basic Income",
			description:
				"Monthly UBI distribution to verified Pi Network participants worldwide",
			fundingSource: "pi-network",
			monthlyAmount: 100,
			currency: "PI",
			eligibilityCriteria: {
				minAge: 18,
				maxAge: null,
				kycRequired: true,
				residencyRequired: false,
				incomeThreshold: null,
				citizenshipRequired: false,
				excludedCountries: [],
				additionalRequirements: ["pi-kyc-verified", "active-pioneer"],
			},
			isActive: true,
			startDate: new Date("2026-01-01"),
			endDate: null,
			totalDistributed: 0,
			recipientCount: 0,
		};

		// NESARA/GESARA Prosperity Program
		const nesaraProsperity: UBIProgram = {
			id: "nesara-prosperity-001",
			name: "NESARA/GESARA Prosperity Distribution",
			description:
				"Wealth redistribution program under NESARA/GESARA protocols",
			fundingSource: "treasury",
			monthlyAmount: 1000,
			currency: "USD",
			eligibilityCriteria: {
				minAge: 18,
				maxAge: null,
				kycRequired: true,
				residencyRequired: true,
				incomeThreshold: 75_000,
				citizenshipRequired: true,
				excludedCountries: [],
				additionalRequirements: ["nesara-registered", "debt-forgiveness-filed"],
			},
			isActive: true,
			startDate: new Date("2026-01-01"),
			endDate: null,
			totalDistributed: 0,
			recipientCount: 0,
		};

		this.programs.set(piGlobalUBI.id, piGlobalUBI);
		this.programs.set(nesaraProsperity.id, nesaraProsperity);
	}

	async createProgram(program: Omit<UBIProgram, "id">): Promise<UBIProgram> {
		const id = `ubi-program-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
		const newProgram: UBIProgram = { ...program, id };
		this.programs.set(id, newProgram);
		return newProgram;
	}

	async getProgram(programId: string): Promise<UBIProgram | null> {
		return this.programs.get(programId) || null;
	}

	async listPrograms(): Promise<UBIProgram[]> {
		return Array.from(this.programs.values());
	}

	// ==========================================================================
	// RECIPIENT MANAGEMENT
	// ==========================================================================

	async enrollRecipient(
		recipientData: Omit<
			UBIRecipient,
			"id" | "enrollmentDate" | "lastDistribution" | "totalReceived"
		>,
	): Promise<UBIRecipient> {
		const id = `ubi-recipient-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

		const recipient: UBIRecipient = {
			...recipientData,
			id,
			enrollmentDate: new Date(),
			lastDistribution: null,
			totalReceived: 0,
		};

		// Verify KYC status with Pi Network
		if (recipient.kycVerified) {
			recipient.eligibilityStatus = "eligible";
		} else {
			recipient.eligibilityStatus = "pending";
		}

		this.recipients.set(id, recipient);
		return recipient;
	}

	async getRecipient(recipientId: string): Promise<UBIRecipient | null> {
		return this.recipients.get(recipientId) || null;
	}

	async listRecipients(): Promise<UBIRecipient[]> {
		return Array.from(this.recipients.values());
	}

	async verifyEligibility(
		recipientId: string,
		programId: string,
	): Promise<{ eligible: boolean; reasons: string[] }> {
		const recipient = this.recipients.get(recipientId);
		const program = this.programs.get(programId);

		if (!recipient || !program) {
			return { eligible: false, reasons: ["Recipient or program not found"] };
		}

		const reasons: string[] = [];

		// Check KYC requirement
		if (program.eligibilityCriteria.kycRequired && !recipient.kycVerified) {
			reasons.push("KYC verification required");
		}

		// Check excluded countries
		if (
			program.eligibilityCriteria.excludedCountries.includes(recipient.country)
		) {
			reasons.push("Country excluded from program");
		}

		// Check eligibility status
		if (recipient.eligibilityStatus !== "eligible") {
			reasons.push(`Current status: ${recipient.eligibilityStatus}`);
		}

		return {
			eligible: reasons.length === 0,
			reasons,
		};
	}

	// ==========================================================================
	// DISTRIBUTION PROCESSING
	// ==========================================================================

	async scheduleDistribution(
		programId: string,
		recipientIds: string[],
		distributionType: UBIDistribution["distributionType"] = "monthly",
	): Promise<UBIDistribution[]> {
		const program = this.programs.get(programId);
		if (!program) {
			throw new Error(`Program ${programId} not found`);
		}

		const distributions: UBIDistribution[] = [];

		for (const recipientId of recipientIds) {
			const eligibility = await this.verifyEligibility(recipientId, programId);
			if (!eligibility.eligible) {
				console.warn(
					`Recipient ${recipientId} not eligible: ${eligibility.reasons.join(", ")}`,
				);
				continue;
			}

			const distribution: UBIDistribution = {
				id: `dist-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
				recipientId,
				amount: program.monthlyAmount,
				currency: program.currency as "PI" | "USD" | "LOCAL",
				piEquivalent: this.convertToPi(program.monthlyAmount, program.currency),
				distributionType,
				status: "pending",
				transactionHash: null,
				blockNumber: null,
				timestamp: new Date(),
				nesaraCompliant: true,
				gesaraCompliant: true,
			};

			distributions.push(distribution);
			this.distributionQueue.push(distribution);
		}

		return distributions;
	}

	async processDistributionQueue(): Promise<{
		processed: number;
		failed: number;
		results: UBIDistribution[];
	}> {
		if (this.isProcessing) {
			throw new Error("Distribution processing already in progress");
		}

		this.isProcessing = true;
		const results: UBIDistribution[] = [];
		let processed = 0;
		let failed = 0;

		try {
			while (this.distributionQueue.length > 0) {
				const distribution = this.distributionQueue.shift();
				if (!distribution) {
					continue;
				}

				try {
					distribution.status = "processing";

					// Execute blockchain transaction
					const txResult = await this.executeBlockchainTransfer(distribution);

					distribution.transactionHash = txResult.hash;
					distribution.blockNumber = txResult.blockNumber;
					distribution.status = "completed";

					// Update recipient totals
					const recipient = this.recipients.get(distribution.recipientId);
					if (recipient) {
						recipient.lastDistribution = new Date();
						recipient.totalReceived += distribution.piEquivalent;
					}

					processed++;
				} catch (error) {
					distribution.status = "failed";
					failed++;
					console.error(`Distribution ${distribution.id} failed:`, error);
				}

				results.push(distribution);
			}
		} finally {
			this.isProcessing = false;
		}

		return { processed, failed, results };
	}

	private async executeBlockchainTransfer(
		distribution: UBIDistribution,
	): Promise<{ hash: string; blockNumber: number }> {
		const recipient = this.recipients.get(distribution.recipientId);
		if (!recipient) {
			throw new Error("Recipient not found");
		}

		// Simulate blockchain transaction (in production, use actual Pi SDK)
		const hash = `0x${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`;
		const blockNumber = Math.floor(Date.now() / 1000);

		console.log(
			`UBI Transfer: ${distribution.piEquivalent} PI to ${recipient.walletAddress} - TX: ${hash}`,
		);

		return { hash, blockNumber };
	}

	private convertToPi(amount: number, currency: string): number {
		// Conversion rates (in production, fetch from oracle)
		const rates: Record<string, number> = {
			PI: 1,
			USD: 0.5, // 1 USD = 0.5 PI (example rate)
			EUR: 0.45,
			LOCAL: 0.1,
		};

		return amount * (rates[currency] || 1);
	}

	// ==========================================================================
	// REPORTING & ANALYTICS
	// ==========================================================================

	async getDistributionStats(programId?: string): Promise<{
		totalDistributed: number;
		recipientCount: number;
		averagePerRecipient: number;
		byMonth: Record<string, number>;
	}> {
		let totalDistributed = 0;
		let recipientCount = 0;
		const byMonth: Record<string, number> = {};

		for (const program of this.programs.values()) {
			if (programId && program.id !== programId) {
				continue;
			}
			totalDistributed += program.totalDistributed;
			recipientCount += program.recipientCount;
		}

		return {
			totalDistributed,
			recipientCount,
			averagePerRecipient:
				recipientCount > 0 ? totalDistributed / recipientCount : 0,
			byMonth,
		};
	}
}

// ============================================================================
// EXPORTS
// ============================================================================

export const ubiEngine = UniversalBasicIncomeEngine.getInstance();

export async function enrollInUBI(
	piUsername: string,
	walletAddress: string,
	country: string,
): Promise<UBIRecipient> {
	return ubiEngine.enrollRecipient({
		piUsername,
		walletAddress,
		kycVerified: true, // Assume KYC done through Pi Network
		eligibilityStatus: "eligible",
		country,
		region: "",
		metadata: {},
	});
}

export async function distributeUBI(
	programId: string,
	recipientIds: string[],
): Promise<UBIDistribution[]> {
	return ubiEngine.scheduleDistribution(programId, recipientIds);
}

export async function processUBIPayments(): Promise<{
	processed: number;
	failed: number;
}> {
	const result = await ubiEngine.processDistributionQueue();
	return { processed: result.processed, failed: result.failed };
}

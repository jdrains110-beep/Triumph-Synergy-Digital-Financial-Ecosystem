/**
 * Triumph Synergy - Banking Partners Hub
 *
 * Superior banking partnership platform for:
 * - Financial institutions to join the Pi transition
 * - Banks and credit unions integration
 * - Pi Network financial services
 * - Fintech partnership programs
 *
 * @module lib/banking/banking-partners-hub
 * @version 1.0.0
 */

// ============================================================================
// CONSTANTS - DUAL PI VALUE SYSTEM
// ============================================================================

const PI_EXTERNAL_RATE = 314.159;
const PI_INTERNAL_RATE = 314_159;
const PI_INTERNAL_MULTIPLIER = 1000;

export type PiValueType = "internal" | "external";

export function getPiRate(type: PiValueType = "external"): number {
	return type === "internal" ? PI_INTERNAL_RATE : PI_EXTERNAL_RATE;
}

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type InstitutionType =
	| "bank"
	| "credit-union"
	| "fintech"
	| "investment-firm"
	| "insurance"
	| "payment-processor"
	| "crypto-exchange"
	| "wealth-management"
	| "lending"
	| "other";

export type PartnershipTier =
	| "explorer"
	| "partner"
	| "premier"
	| "strategic"
	| "founding";
export type PartnerStatus =
	| "prospect"
	| "onboarding"
	| "active"
	| "suspended"
	| "churned";
export type IntegrationLevel =
	| "basic"
	| "standard"
	| "advanced"
	| "enterprise"
	| "custom";

export interface BankingPartner {
	id: string;
	userId: string;

	// Institution Info
	institutionName: string;
	legalName: string;
	institutionType: InstitutionType;
	registrationNumber: string;
	taxId: string;

	// Contact
	primaryContactName: string;
	primaryContactTitle: string;
	primaryContactEmail: string;
	primaryContactPhone: string;

	// Location
	headquarters: {
		country: string;
		state: string;
		city: string;
		address: string;
		postalCode: string;
	};
	operatingCountries: string[];

	// Partnership
	partnershipTier: PartnershipTier;
	partnerStatus: PartnerStatus;
	partnerSince: Date;
	renewalDate: Date;

	// Subscription
	monthlyFee: number;
	monthlyFeeInPi: number;
	annualContract: boolean;
	contractValue: number;

	// Integration
	integrationLevel: IntegrationLevel;
	integrationStatus: "pending" | "in-progress" | "completed" | "maintenance";
	apiEnabled: boolean;
	sandboxEnabled: boolean;
	liveEnabled: boolean;

	// Capabilities
	piWalletServices: boolean;
	piExchangeEnabled: boolean;
	piLendingEnabled: boolean;
	piSavingsEnabled: boolean;
	piPaymentsEnabled: boolean;
	crossBorderEnabled: boolean;

	// Compliance
	regulatoryStatus: "pending" | "approved" | "conditional" | "review";
	kycVerified: boolean;
	amlCompliant: boolean;
	gdprCompliant: boolean;
	pciCompliant: boolean;

	// Performance
	totalPiVolume: number;
	totalTransactions: number;
	totalCustomersServed: number;
	averageTransactionValue: number;
	revenueGenerated: number;
	revenueGeneratedInPi: number;

	// Revenue Share
	revenueSharePercentage: number;
	piTransactionBonus: number;
	referralBonus: number;

	// Support
	accountManagerId: string | null;
	supportTier: "standard" | "priority" | "dedicated" | "enterprise";

	// Metrics
	customerSatisfaction: number;
	integrationHealth: number;
	uptime: number;

	createdAt: Date;
	lastActiveAt: Date;
}

export interface BankerProfile {
	id: string;
	userId: string;
	partnerId: string;

	// Personal Info
	name: string;
	title: string;
	email: string;
	phone: string;

	// Role
	role: "admin" | "manager" | "analyst" | "integration-specialist" | "support";
	department: string;
	permissions: BankerPermission[];

	// Access
	apiAccess: boolean;
	dashboardAccess: boolean;
	reportingAccess: boolean;

	// Activity
	lastLogin: Date;
	loginCount: number;
	actionsPerformed: number;

	createdAt: Date;
}

export type BankerPermission =
	| "view-transactions"
	| "manage-transactions"
	| "view-customers"
	| "manage-customers"
	| "view-reports"
	| "generate-reports"
	| "api-access"
	| "sandbox-access"
	| "live-access"
	| "admin";

export interface PartnershipPlan {
	tier: PartnershipTier;
	name: string;
	monthlyFee: number;
	monthlyFeeInPi: number;
	annualFee: number;
	annualFeeInPi: number;
	setupFee: number;
	features: string[];

	// Limits
	maxTransactionsPerMonth: number | "unlimited";
	maxApiCalls: number | "unlimited";
	maxBankers: number | "unlimited";
	maxBranches: number | "unlimited";

	// Revenue Share
	revenueShare: number;
	piTransactionBonus: number;
	referralBonus: number;

	// Integration
	integrationLevel: IntegrationLevel;
	customIntegration: boolean;
	whiteLabel: boolean;

	// Support
	supportTier: "standard" | "priority" | "dedicated" | "enterprise";
	accountManager: boolean;

	// Compliance
	complianceSupport: boolean;
	regulatoryGuidance: boolean;
}

export interface IntegrationRequest {
	id: string;
	partnerId: string;

	// Request Details
	type: "wallet" | "exchange" | "payments" | "lending" | "savings" | "custom";
	description: string;
	requirements: string[];

	// Status
	status:
		| "submitted"
		| "in-review"
		| "approved"
		| "in-development"
		| "testing"
		| "deployed"
		| "rejected";
	priority: "low" | "medium" | "high" | "critical";

	// Timeline
	requestedDate: Date;
	estimatedCompletion: Date | null;
	actualCompletion: Date | null;

	// Assignees
	assignedTeam: string | null;
	projectManagerId: string | null;

	// Notes
	notes: string[];

	createdAt: Date;
	updatedAt: Date;
}

export interface PiTransaction {
	id: string;
	partnerId: string;

	// Transaction Details
	type:
		| "exchange"
		| "transfer"
		| "payment"
		| "deposit"
		| "withdrawal"
		| "lending"
		| "reward";
	direction: "inbound" | "outbound";

	// Amounts
	amount: number;
	currency: "PI" | "USD" | "EUR" | "GBP" | "other";
	piAmount: number;
	fiatEquivalent: number;
	exchangeRate: number;

	// Parties
	senderId: string;
	senderType: "customer" | "partner" | "platform";
	receiverId: string;
	receiverType: "customer" | "partner" | "platform";

	// Status
	status: "pending" | "processing" | "completed" | "failed" | "reversed";

	// Fees
	platformFee: number;
	partnerFee: number;
	networkFee: number;

	// Compliance
	kycVerified: boolean;
	amlScreened: boolean;
	riskScore: number;

	// Metadata
	reference: string;
	description: string;
	metadata: Record<string, unknown>;

	createdAt: Date;
	completedAt: Date | null;
}

export interface PartnerAnalytics {
	partnerId: string;
	period: "day" | "week" | "month" | "quarter" | "year";

	// Volume
	totalTransactions: number;
	totalPiVolume: number;
	totalFiatVolume: number;
	averageTransactionSize: number;

	// Revenue
	grossRevenue: number;
	revenueShare: number;
	piBonuses: number;
	netRevenue: number;

	// Customers
	totalCustomers: number;
	newCustomers: number;
	activeCustomers: number;
	customerGrowthRate: number;

	// Performance
	successRate: number;
	averageProcessingTime: number;
	uptime: number;

	// Trends
	transactionTrend: number;
	revenueTrend: number;
	customerTrend: number;
}

// ============================================================================
// BANKING PARTNERS HUB CLASS
// ============================================================================

class BankingPartnersHub {
	private readonly partners: Map<string, BankingPartner> = new Map();
	private readonly bankers: Map<string, BankerProfile> = new Map();
	private readonly integrationRequests: Map<string, IntegrationRequest> =
		new Map();
	private readonly transactions: Map<string, PiTransaction> = new Map();

	// ==========================================================================
	// PARTNERSHIP PLANS
	// ==========================================================================

	getPartnershipPlans(): PartnershipPlan[] {
		return [
			{
				tier: "explorer",
				name: "Explorer Program",
				monthlyFee: 0,
				monthlyFeeInPi: 0,
				annualFee: 0,
				annualFeeInPi: 0,
				setupFee: 0,
				features: [
					"Sandbox API access",
					"Pi Network integration guide",
					"Basic documentation",
					"Community support",
					"Up to 100 test transactions/month",
					"1 banker account",
				],
				maxTransactionsPerMonth: 100,
				maxApiCalls: 1000,
				maxBankers: 1,
				maxBranches: 1,
				revenueShare: 0,
				piTransactionBonus: 0,
				referralBonus: 0,
				integrationLevel: "basic",
				customIntegration: false,
				whiteLabel: false,
				supportTier: "standard",
				accountManager: false,
				complianceSupport: false,
				regulatoryGuidance: false,
			},
			{
				tier: "partner",
				name: "Partner",
				monthlyFee: 2499,
				monthlyFeeInPi: 2499 / PI_EXTERNAL_RATE,
				annualFee: 23_988,
				annualFeeInPi: 23_988 / PI_EXTERNAL_RATE,
				setupFee: 5000,
				features: [
					"Live API access",
					"Pi wallet integration",
					"Pi payment processing",
					"Standard documentation",
					"Email support",
					"Up to 10,000 transactions/month",
					"5 banker accounts",
					"Basic analytics dashboard",
					"10% revenue share",
				],
				maxTransactionsPerMonth: 10_000,
				maxApiCalls: 100_000,
				maxBankers: 5,
				maxBranches: 5,
				revenueShare: 10,
				piTransactionBonus: 2,
				referralBonus: 5,
				integrationLevel: "standard",
				customIntegration: false,
				whiteLabel: false,
				supportTier: "priority",
				accountManager: false,
				complianceSupport: false,
				regulatoryGuidance: false,
			},
			{
				tier: "premier",
				name: "Premier Partner",
				monthlyFee: 9999,
				monthlyFeeInPi: 9999 / PI_EXTERNAL_RATE,
				annualFee: 95_988,
				annualFeeInPi: 95_988 / PI_EXTERNAL_RATE,
				setupFee: 15_000,
				features: [
					"Full API suite",
					"Pi exchange integration",
					"Pi lending capabilities",
					"Pi savings products",
					"Advanced documentation",
					"Priority support",
					"Up to 100,000 transactions/month",
					"25 banker accounts",
					"Advanced analytics",
					"Compliance support",
					"15% revenue share",
					"2% Pi transaction bonus",
				],
				maxTransactionsPerMonth: 100_000,
				maxApiCalls: 1_000_000,
				maxBankers: 25,
				maxBranches: 25,
				revenueShare: 15,
				piTransactionBonus: 3,
				referralBonus: 7.5,
				integrationLevel: "advanced",
				customIntegration: false,
				whiteLabel: false,
				supportTier: "dedicated",
				accountManager: true,
				complianceSupport: true,
				regulatoryGuidance: false,
			},
			{
				tier: "strategic",
				name: "Strategic Partner",
				monthlyFee: 49_999,
				monthlyFeeInPi: 49_999 / PI_EXTERNAL_RATE,
				annualFee: 479_988,
				annualFeeInPi: 479_988 / PI_EXTERNAL_RATE,
				setupFee: 50_000,
				features: [
					"Everything in Premier",
					"Custom integration support",
					"White-label options",
					"Cross-border capabilities",
					"Regulatory guidance",
					"Unlimited transactions",
					"Unlimited banker accounts",
					"Enterprise analytics",
					"Dedicated account manager",
					"24/7 enterprise support",
					"20% revenue share",
					"4% Pi transaction bonus",
				],
				maxTransactionsPerMonth: "unlimited",
				maxApiCalls: "unlimited",
				maxBankers: "unlimited",
				maxBranches: "unlimited",
				revenueShare: 20,
				piTransactionBonus: 4,
				referralBonus: 10,
				integrationLevel: "enterprise",
				customIntegration: true,
				whiteLabel: true,
				supportTier: "enterprise",
				accountManager: true,
				complianceSupport: true,
				regulatoryGuidance: true,
			},
			{
				tier: "founding",
				name: "Founding Partner",
				monthlyFee: 149_999,
				monthlyFeeInPi: 149_999 / PI_EXTERNAL_RATE,
				annualFee: 1_439_988,
				annualFeeInPi: 1_439_988 / PI_EXTERNAL_RATE,
				setupFee: 0,
				features: [
					"Everything in Strategic",
					"Equity participation options",
					"Board observer rights",
					"Early access to new features",
					"Co-development opportunities",
					"Global Pi Network access",
					"Exclusive founding partner events",
					"25% revenue share",
					"5% Pi transaction bonus",
					"Lifetime partnership guarantee",
				],
				maxTransactionsPerMonth: "unlimited",
				maxApiCalls: "unlimited",
				maxBankers: "unlimited",
				maxBranches: "unlimited",
				revenueShare: 25,
				piTransactionBonus: 5,
				referralBonus: 15,
				integrationLevel: "custom",
				customIntegration: true,
				whiteLabel: true,
				supportTier: "enterprise",
				accountManager: true,
				complianceSupport: true,
				regulatoryGuidance: true,
			},
		];
	}

	// ==========================================================================
	// PARTNER REGISTRATION
	// ==========================================================================

	async registerPartner(data: {
		userId: string;
		institutionName: string;
		legalName: string;
		institutionType: InstitutionType;
		registrationNumber: string;
		taxId: string;
		primaryContactName: string;
		primaryContactTitle: string;
		primaryContactEmail: string;
		primaryContactPhone: string;
		headquarters: {
			country: string;
			state: string;
			city: string;
			address: string;
			postalCode: string;
		};
		operatingCountries: string[];
		partnershipTier: PartnershipTier;
		payWithPi?: boolean;
	}): Promise<BankingPartner> {
		const id = `partner-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
		const plans = this.getPartnershipPlans();
		const plan = plans.find((p) => p.tier === data.partnershipTier)!;

		const partner: BankingPartner = {
			id,
			userId: data.userId,
			institutionName: data.institutionName,
			legalName: data.legalName,
			institutionType: data.institutionType,
			registrationNumber: data.registrationNumber,
			taxId: data.taxId,
			primaryContactName: data.primaryContactName,
			primaryContactTitle: data.primaryContactTitle,
			primaryContactEmail: data.primaryContactEmail,
			primaryContactPhone: data.primaryContactPhone,
			headquarters: data.headquarters,
			operatingCountries: data.operatingCountries,
			partnershipTier: data.partnershipTier,
			partnerStatus: "prospect",
			partnerSince: new Date(),
			renewalDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
			monthlyFee: plan.monthlyFee,
			monthlyFeeInPi: plan.monthlyFeeInPi,
			annualContract: false,
			contractValue: plan.annualFee,
			integrationLevel: plan.integrationLevel,
			integrationStatus: "pending",
			apiEnabled: plan.integrationLevel !== "basic",
			sandboxEnabled: true,
			liveEnabled: false,
			piWalletServices: false,
			piExchangeEnabled: false,
			piLendingEnabled: false,
			piSavingsEnabled: false,
			piPaymentsEnabled: false,
			crossBorderEnabled: false,
			regulatoryStatus: "pending",
			kycVerified: false,
			amlCompliant: false,
			gdprCompliant: false,
			pciCompliant: false,
			totalPiVolume: 0,
			totalTransactions: 0,
			totalCustomersServed: 0,
			averageTransactionValue: 0,
			revenueGenerated: 0,
			revenueGeneratedInPi: 0,
			revenueSharePercentage: plan.revenueShare,
			piTransactionBonus: plan.piTransactionBonus,
			referralBonus: plan.referralBonus,
			accountManagerId: null,
			supportTier: plan.supportTier,
			customerSatisfaction: 0,
			integrationHealth: 0,
			uptime: 100,
			createdAt: new Date(),
			lastActiveAt: new Date(),
		};

		this.partners.set(id, partner);
		return partner;
	}

	async getPartner(partnerId: string): Promise<BankingPartner | null> {
		return this.partners.get(partnerId) || null;
	}

	async activatePartner(partnerId: string): Promise<BankingPartner> {
		const partner = this.partners.get(partnerId);
		if (!partner) {
			throw new Error("Partner not found");
		}

		partner.partnerStatus = "active";
		partner.liveEnabled = true;
		partner.piPaymentsEnabled = true;

		return partner;
	}

	async upgradePartnership(
		partnerId: string,
		newTier: PartnershipTier,
	): Promise<BankingPartner> {
		const partner = this.partners.get(partnerId);
		if (!partner) {
			throw new Error("Partner not found");
		}

		const plans = this.getPartnershipPlans();
		const newPlan = plans.find((p) => p.tier === newTier)!;

		partner.partnershipTier = newTier;
		partner.monthlyFee = newPlan.monthlyFee;
		partner.monthlyFeeInPi = newPlan.monthlyFeeInPi;
		partner.contractValue = newPlan.annualFee;
		partner.integrationLevel = newPlan.integrationLevel;
		partner.revenueSharePercentage = newPlan.revenueShare;
		partner.piTransactionBonus = newPlan.piTransactionBonus;
		partner.referralBonus = newPlan.referralBonus;
		partner.supportTier = newPlan.supportTier;

		// Enable features based on tier
		if (
			newTier === "premier" ||
			newTier === "strategic" ||
			newTier === "founding"
		) {
			partner.piExchangeEnabled = true;
			partner.piLendingEnabled = true;
			partner.piSavingsEnabled = true;
		}
		if (newTier === "strategic" || newTier === "founding") {
			partner.crossBorderEnabled = true;
		}

		return partner;
	}

	// ==========================================================================
	// BANKER MANAGEMENT
	// ==========================================================================

	async registerBanker(
		partnerId: string,
		data: {
			userId: string;
			name: string;
			title: string;
			email: string;
			phone: string;
			role: BankerProfile["role"];
			department: string;
		},
	): Promise<BankerProfile> {
		const partner = this.partners.get(partnerId);
		if (!partner) {
			throw new Error("Partner not found");
		}

		const id = `banker-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

		// Assign permissions based on role
		const permissionsByRole: Record<BankerProfile["role"], BankerPermission[]> =
			{
				admin: [
					"view-transactions",
					"manage-transactions",
					"view-customers",
					"manage-customers",
					"view-reports",
					"generate-reports",
					"api-access",
					"sandbox-access",
					"live-access",
					"admin",
				],
				manager: [
					"view-transactions",
					"manage-transactions",
					"view-customers",
					"manage-customers",
					"view-reports",
					"generate-reports",
					"api-access",
					"sandbox-access",
					"live-access",
				],
				analyst: [
					"view-transactions",
					"view-customers",
					"view-reports",
					"generate-reports",
				],
				"integration-specialist": [
					"api-access",
					"sandbox-access",
					"view-reports",
				],
				support: ["view-transactions", "view-customers"],
			};

		const banker: BankerProfile = {
			id,
			userId: data.userId,
			partnerId,
			name: data.name,
			title: data.title,
			email: data.email,
			phone: data.phone,
			role: data.role,
			department: data.department,
			permissions: permissionsByRole[data.role],
			apiAccess: permissionsByRole[data.role].includes("api-access"),
			dashboardAccess: true,
			reportingAccess: permissionsByRole[data.role].includes("view-reports"),
			lastLogin: new Date(),
			loginCount: 1,
			actionsPerformed: 0,
			createdAt: new Date(),
		};

		this.bankers.set(id, banker);
		return banker;
	}

	async getBankersByPartner(partnerId: string): Promise<BankerProfile[]> {
		return Array.from(this.bankers.values()).filter(
			(b) => b.partnerId === partnerId,
		);
	}

	// ==========================================================================
	// INTEGRATION REQUESTS
	// ==========================================================================

	async submitIntegrationRequest(
		partnerId: string,
		data: {
			type: IntegrationRequest["type"];
			description: string;
			requirements: string[];
			priority?: IntegrationRequest["priority"];
		},
	): Promise<IntegrationRequest> {
		const partner = this.partners.get(partnerId);
		if (!partner) {
			throw new Error("Partner not found");
		}

		const id = `integration-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

		const request: IntegrationRequest = {
			id,
			partnerId,
			type: data.type,
			description: data.description,
			requirements: data.requirements,
			status: "submitted",
			priority: data.priority || "medium",
			requestedDate: new Date(),
			estimatedCompletion: null,
			actualCompletion: null,
			assignedTeam: null,
			projectManagerId: null,
			notes: [],
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		this.integrationRequests.set(id, request);
		return request;
	}

	async getIntegrationRequests(
		partnerId: string,
	): Promise<IntegrationRequest[]> {
		return Array.from(this.integrationRequests.values()).filter(
			(r) => r.partnerId === partnerId,
		);
	}

	// ==========================================================================
	// TRANSACTIONS
	// ==========================================================================

	async recordTransaction(
		partnerId: string,
		data: {
			type: PiTransaction["type"];
			direction: PiTransaction["direction"];
			piAmount: number;
			currency?: PiTransaction["currency"];
			senderId: string;
			senderType: PiTransaction["senderType"];
			receiverId: string;
			receiverType: PiTransaction["receiverType"];
			description?: string;
			metadata?: Record<string, unknown>;
		},
	): Promise<PiTransaction> {
		const partner = this.partners.get(partnerId);
		if (!partner) {
			throw new Error("Partner not found");
		}

		const id = `tx-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
		const reference = `REF-${Date.now().toString(36).toUpperCase()}`;

		const fiatEquivalent = data.piAmount * PI_EXTERNAL_RATE;
		const platformFee = fiatEquivalent * 0.01; // 1% platform fee
		const partnerFee = fiatEquivalent * (partner.revenueSharePercentage / 100);

		const transaction: PiTransaction = {
			id,
			partnerId,
			type: data.type,
			direction: data.direction,
			amount: data.piAmount,
			currency: data.currency || "PI",
			piAmount: data.piAmount,
			fiatEquivalent,
			exchangeRate: PI_EXTERNAL_RATE,
			senderId: data.senderId,
			senderType: data.senderType,
			receiverId: data.receiverId,
			receiverType: data.receiverType,
			status: "pending",
			platformFee,
			partnerFee,
			networkFee: 0.01, // Minimal Pi network fee
			kycVerified: true,
			amlScreened: true,
			riskScore: 0.1,
			reference,
			description: data.description || "",
			metadata: data.metadata || {},
			createdAt: new Date(),
			completedAt: null,
		};

		this.transactions.set(id, transaction);

		// Update partner stats
		partner.totalTransactions += 1;
		partner.totalPiVolume += data.piAmount;

		return transaction;
	}

	async completeTransaction(transactionId: string): Promise<PiTransaction> {
		const transaction = this.transactions.get(transactionId);
		if (!transaction) {
			throw new Error("Transaction not found");
		}

		const partner = this.partners.get(transaction.partnerId);

		transaction.status = "completed";
		transaction.completedAt = new Date();

		if (partner) {
			partner.revenueGenerated += transaction.partnerFee;
			partner.revenueGeneratedInPi += transaction.partnerFee / PI_EXTERNAL_RATE;
		}

		return transaction;
	}

	// ==========================================================================
	// PARTNER DASHBOARD
	// ==========================================================================

	async getPartnerDashboard(partnerId: string): Promise<{
		partner: BankingPartner;
		bankers: BankerProfile[];
		recentTransactions: PiTransaction[];
		integrationRequests: IntegrationRequest[];
		analytics: PartnerAnalytics;
		partnershipPlan: PartnershipPlan | null;
	}> {
		const partner = this.partners.get(partnerId);
		if (!partner) {
			throw new Error("Partner not found");
		}

		const bankers = await this.getBankersByPartner(partnerId);
		const transactions = Array.from(this.transactions.values()).filter(
			(t) => t.partnerId === partnerId,
		);
		const requests = await this.getIntegrationRequests(partnerId);
		const plans = this.getPartnershipPlans();

		// Calculate analytics
		const completedTransactions = transactions.filter(
			(t) => t.status === "completed",
		);
		const totalPiVolume = completedTransactions.reduce(
			(sum, t) => sum + t.piAmount,
			0,
		);
		const totalFiatVolume = completedTransactions.reduce(
			(sum, t) => sum + t.fiatEquivalent,
			0,
		);
		const revenueShare = completedTransactions.reduce(
			(sum, t) => sum + t.partnerFee,
			0,
		);

		return {
			partner,
			bankers,
			recentTransactions: transactions.slice(-20),
			integrationRequests: requests,
			analytics: {
				partnerId,
				period: "month",
				totalTransactions: completedTransactions.length,
				totalPiVolume,
				totalFiatVolume,
				averageTransactionSize:
					completedTransactions.length > 0
						? totalPiVolume / completedTransactions.length
						: 0,
				grossRevenue: totalFiatVolume,
				revenueShare,
				piBonuses: revenueShare * (partner.piTransactionBonus / 100),
				netRevenue: revenueShare,
				totalCustomers: partner.totalCustomersServed,
				newCustomers: 0,
				activeCustomers: 0,
				customerGrowthRate: 0,
				successRate:
					(completedTransactions.length / Math.max(transactions.length, 1)) *
					100,
				averageProcessingTime: 0,
				uptime: partner.uptime,
				transactionTrend: 0,
				revenueTrend: 0,
				customerTrend: 0,
			},
			partnershipPlan:
				plans.find((p) => p.tier === partner.partnershipTier) || null,
		};
	}

	// ==========================================================================
	// UTILITIES
	// ==========================================================================

	async getAllActivePartners(): Promise<BankingPartner[]> {
		return Array.from(this.partners.values()).filter(
			(p) => p.partnerStatus === "active",
		);
	}

	async getPartnersByTier(tier: PartnershipTier): Promise<BankingPartner[]> {
		return Array.from(this.partners.values()).filter(
			(p) => p.partnershipTier === tier,
		);
	}

	getPiToUsdRate(type: PiValueType = "external"): number {
		return getPiRate(type);
	}

	getDualRateInfo(): {
		internal: number;
		external: number;
		multiplier: number;
	} {
		return {
			internal: PI_INTERNAL_RATE,
			external: PI_EXTERNAL_RATE,
			multiplier: PI_INTERNAL_MULTIPLIER,
		};
	}
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const bankingPartnersHub = new BankingPartnersHub();

// Export helper functions
export async function registerBankingPartner(
	data: Parameters<typeof bankingPartnersHub.registerPartner>[0],
): Promise<BankingPartner> {
	return bankingPartnersHub.registerPartner(data);
}

export async function joinAsPartner(
	partnerId: string,
	bankerData: Parameters<typeof bankingPartnersHub.registerBanker>[1],
): Promise<BankerProfile> {
	return bankingPartnersHub.registerBanker(partnerId, bankerData);
}

export function getPartnershipPlans(): PartnershipPlan[] {
	return bankingPartnersHub.getPartnershipPlans();
}

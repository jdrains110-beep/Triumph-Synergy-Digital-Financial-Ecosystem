/**
 * Triumph Synergy - Real Estate Platform
 *
 * Comprehensive real estate marketplace and development platform
 * Supports property listings, transactions, development projects, and title management
 *
 * @module lib/real-estate/real-estate-platform
 * @version 1.0.0
 */

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface Property {
	id: string;
	mlsNumber: string;
	listingType: ListingType;
	propertyType: PropertyType;
	status: PropertyStatus;

	// Location
	address: PropertyAddress;
	coordinates: { lat: number; lng: number };
	neighborhood: string;
	schoolDistrict: string;

	// Details
	details: PropertyDetails;
	features: PropertyFeatures;
	images: PropertyImage[];
	virtualTour: string | null;
	video: string | null;

	// Pricing
	pricing: PropertyPricing;

	// Parties
	ownerId: string;
	agentId: string | null;
	listingBrokerage: string | null;

	// Dates
	listedAt: Date;
	updatedAt: Date;
	closingDate: Date | null;

	// Development
	developmentProject: string | null;
	permitIds: string[];

	// Metadata
	views: number;
	saves: number;
	inquiries: number;
}

export type ListingType = "sale" | "rent" | "lease" | "auction" | "development";
export type PropertyType =
	| "single-family"
	| "multi-family"
	| "condo"
	| "townhouse"
	| "apartment"
	| "commercial"
	| "industrial"
	| "land"
	| "farm"
	| "mixed-use";

export type PropertyStatus =
	| "active"
	| "pending"
	| "contingent"
	| "under-contract"
	| "sold"
	| "rented"
	| "off-market"
	| "coming-soon"
	| "development";

export interface PropertyAddress {
	street: string;
	unit: string | null;
	city: string;
	state: string;
	zip: string;
	county: string;
	country: string;
}

export interface PropertyDetails {
	bedrooms: number;
	bathrooms: number;
	halfBaths: number;
	squareFeet: number;
	lotSize: number;
	lotUnit: "sqft" | "acres";
	yearBuilt: number;
	stories: number;
	garage: number;
	parking: number;
	basement: BasementType;
	pool: boolean;
	hoaFee: number | null;
	hoaFrequency: "monthly" | "quarterly" | "annual" | null;
	propertyTax: number;
	zoning: string;
}

export type BasementType = "none" | "partial" | "full" | "finished" | "walkout";

export interface PropertyFeatures {
	interior: string[];
	exterior: string[];
	appliances: string[];
	heating: string[];
	cooling: string[];
	flooring: string[];
	utilities: string[];
	accessibility: string[];
	green: string[];
}

export interface PropertyImage {
	id: string;
	url: string;
	caption: string;
	category: "exterior" | "interior" | "aerial" | "floorplan" | "other";
	order: number;
}

export interface PropertyPricing {
	listPrice: number;
	pricePerSqFt: number;
	piEquivalent: number;
	currency: "USD" | "PI";
	originalPrice: number;
	priceHistory: PriceHistoryEntry[];
	estimatedValue: number;
	rentalEstimate: number | null;
}

export interface PriceHistoryEntry {
	date: Date;
	price: number;
	event: "listed" | "price-change" | "sold" | "relisted";
}

export interface RealEstateAgent {
	id: string;
	licenseNumber: string;
	licenseState: string;
	name: string;
	email: string;
	phone: string;
	photo: string;
	brokerage: string;
	specializations: string[];
	yearsExperience: number;
	salesVolume: number;
	rating: number;
	reviewCount: number;
	piWalletAddress: string;
	verified: boolean;

	// Subscription Hub Fields
	subscriptionTier?: AgentSubscriptionTier;
	subscriptionStatus?: AgentSubscriptionStatus;
	subscriptionStartDate?: Date;
	subscriptionEndDate?: Date;
	monthlyFee?: number;
	monthlyFeeInPi?: number;
	commissionRate?: number;
	piCommissionBonus?: number;

	// Performance Metrics
	totalListings?: number;
	activeListings?: number;
	closedTransactions?: number;
	totalCommissionEarned?: number;
	totalPiEarned?: number;
	averageListingPrice?: number;
	averageDaysOnMarket?: number;
	clientSatisfactionScore?: number;

	// Lead Management
	leads?: AgentLead[];
	totalLeads?: number;
	convertedLeads?: number;

	// Tools Access
	accessLevel?: string[];
	crmAccess?: boolean;
	mlsIntegration?: boolean;
	virtualTourTools?: boolean;
	marketingAutomation?: boolean;

	createdAt?: Date;
	lastActiveAt?: Date;
}

// ============================================================================
// REAL ESTATE AGENT HUB - SUBSCRIPTION SYSTEM
// ============================================================================

export type AgentSubscriptionTier =
	| "basic"
	| "professional"
	| "broker"
	| "enterprise";
export type AgentSubscriptionStatus =
	| "trial"
	| "active"
	| "past_due"
	| "suspended"
	| "cancelled";

export interface AgentLead {
	id: string;
	agentId: string;
	type: "buyer" | "seller" | "investor" | "renter";
	status:
		| "new"
		| "contacted"
		| "qualified"
		| "showing"
		| "offer"
		| "closed"
		| "lost";

	// Contact Info
	firstName: string;
	lastName: string;
	email: string;
	phone: string;

	// Requirements
	propertyType: PropertyType[];
	minBudget: number;
	maxBudget: number;
	desiredLocation: string[];
	timeline: string;
	preApproved: boolean;

	// Tracking
	source:
		| "website"
		| "referral"
		| "pi-network"
		| "advertising"
		| "open-house"
		| "other";
	notes: string[];
	nextFollowUp: Date | null;

	// Financial
	estimatedCommission: number;
	estimatedPiBonus: number;

	createdAt: Date;
	updatedAt: Date;
}

export interface AgentSubscriptionPlan {
	tier: AgentSubscriptionTier;
	name: string;
	monthlyPrice: number;
	monthlyPriceInPi: number;
	annualPrice: number;
	annualPriceInPi: number;
	commissionSplit: number;
	piBonus: number;
	features: string[];
	maxListings: number | "unlimited";
	maxLeads: number | "unlimited";
	crmAccess: boolean;
	mlsIntegration: boolean;
	virtualTourTools: boolean;
	marketingAutomation: boolean;
	supportLevel: "community" | "email" | "priority" | "dedicated";
}

export interface PropertyTransaction {
	id: string;
	propertyId: string;
	transactionType: "purchase" | "sale" | "lease" | "refinance";
	status: TransactionStatus;

	// Parties
	buyerId: string;
	sellerId: string;
	buyerAgentId: string | null;
	sellerAgentId: string | null;

	// Financial
	purchasePrice: number;
	piAmount: number | null;
	earnestMoney: number;
	downPayment: number;
	financingType: FinancingType;
	lenderId: string | null;

	// Timeline
	offerDate: Date;
	acceptanceDate: Date | null;
	inspectionDate: Date | null;
	appraisalDate: Date | null;
	closingDate: Date | null;
	possessionDate: Date | null;

	// Documents
	documents: TransactionDocument[];
	contingencies: Contingency[];

	// Escrow
	escrowCompany: string;
	escrowOfficer: string;
	titleCompany: string;

	createdAt: Date;
	updatedAt: Date;
}

export type TransactionStatus =
	| "draft"
	| "offer-submitted"
	| "counter-offer"
	| "accepted"
	| "inspection"
	| "appraisal"
	| "underwriting"
	| "clear-to-close"
	| "closing"
	| "closed"
	| "cancelled"
	| "expired";

export type FinancingType =
	| "conventional"
	| "fha"
	| "va"
	| "usda"
	| "jumbo"
	| "cash"
	| "pi-network"
	| "seller-financing"
	| "hard-money";

export interface TransactionDocument {
	id: string;
	name: string;
	type: DocumentType;
	url: string;
	uploadedAt: Date;
	signedAt: Date | null;
	signers: string[];
}

export type DocumentType =
	| "purchase-agreement"
	| "disclosure"
	| "inspection-report"
	| "appraisal"
	| "title-report"
	| "loan-estimate"
	| "closing-disclosure"
	| "deed"
	| "other";

export interface Contingency {
	id: string;
	type: "financing" | "inspection" | "appraisal" | "sale" | "other";
	description: string;
	deadline: Date;
	status: "pending" | "satisfied" | "waived" | "failed";
}

export interface DevelopmentProject {
	id: string;
	name: string;
	description: string;
	type: DevelopmentType;
	status: DevelopmentStatus;

	// Location
	address: PropertyAddress;
	acreage: number;
	parcelIds: string[];

	// Details
	totalUnits: number;
	unitBreakdown: UnitBreakdown[];
	amenities: string[];

	// Permits
	permits: string[]; // Permit IDs
	environmentalReview: EnvironmentalReviewStatus;
	zoningApproval: boolean;

	// Financial
	totalInvestment: number;
	fundingRaised: number;
	projectedRevenue: number;
	projectedROI: number;

	// Timeline
	startDate: Date;
	estimatedCompletion: Date;
	phases: DevelopmentPhase[];

	// Team
	developerId: string;
	generalContractor: string;
	architect: string;
	investors: ProjectInvestor[];

	createdAt: Date;
	updatedAt: Date;
}

export type DevelopmentType =
	| "residential-subdivision"
	| "condo-development"
	| "mixed-use"
	| "commercial"
	| "industrial"
	| "apartment-complex"
	| "senior-living"
	| "affordable-housing";

export type DevelopmentStatus =
	| "planning"
	| "permitting"
	| "site-prep"
	| "construction"
	| "finishing"
	| "pre-sale"
	| "selling"
	| "complete";

export interface UnitBreakdown {
	type: string;
	count: number;
	sqFtRange: { min: number; max: number };
	priceRange: { min: number; max: number };
}

export type EnvironmentalReviewStatus =
	| "not-started"
	| "in-progress"
	| "approved"
	| "conditional"
	| "rejected";

export interface DevelopmentPhase {
	id: string;
	name: string;
	description: string;
	startDate: Date;
	endDate: Date;
	status: "pending" | "in-progress" | "complete";
	completionPercentage: number;
	milestones: PhaseMilestone[];
}

export interface PhaseMilestone {
	id: string;
	name: string;
	targetDate: Date;
	completedDate: Date | null;
	status: "pending" | "complete" | "delayed";
}

export interface ProjectInvestor {
	userId: string;
	investmentAmount: number;
	equityPercentage: number;
	investmentDate: Date;
	piTransactionId: string | null;
}

export interface Title {
	id: string;
	propertyId: string;
	currentOwner: string;
	titleType: "fee-simple" | "leasehold" | "life-estate" | "trust";
	legalDescription: string;
	parcelNumber: string;

	// History
	chain: TitleChainEntry[];
	encumbrances: Encumbrance[];

	// Insurance
	insurancePolicy: string | null;
	insuranceCompany: string | null;
	insuranceAmount: number | null;

	// Status
	status: "clear" | "clouded" | "pending-search";
	issues: TitleIssue[];

	lastSearched: Date;
	lastTransferred: Date;
}

export interface TitleChainEntry {
	id: string;
	grantor: string;
	grantee: string;
	date: Date;
	documentType: "deed" | "mortgage" | "release" | "other";
	recordingInfo: string;
	consideration: number;
}

export interface Encumbrance {
	id: string;
	type: "mortgage" | "lien" | "easement" | "restriction" | "judgment";
	holder: string;
	amount: number | null;
	description: string;
	recordedDate: Date;
	releaseDate: Date | null;
}

export interface TitleIssue {
	id: string;
	type: string;
	description: string;
	severity: "low" | "medium" | "high" | "critical";
	resolution: string | null;
	status: "open" | "resolved";
}

// ============================================================================
// REAL ESTATE ENGINE
// ============================================================================

export class RealEstatePlatform {
	private static instance: RealEstatePlatform;

	private readonly properties: Map<string, Property> = new Map();
	private readonly agents: Map<string, RealEstateAgent> = new Map();
	private readonly transactions: Map<string, PropertyTransaction> = new Map();
	private readonly projects: Map<string, DevelopmentProject> = new Map();
	private readonly titles: Map<string, Title> = new Map();

	private readonly PI_TO_USD = 314.159;

	private constructor() {}

	static getInstance(): RealEstatePlatform {
		if (!RealEstatePlatform.instance) {
			RealEstatePlatform.instance = new RealEstatePlatform();
		}
		return RealEstatePlatform.instance;
	}

	// ==========================================================================
	// PROPERTY MANAGEMENT
	// ==========================================================================

	async createListing(
		propertyData: Omit<
			Property,
			"id" | "listedAt" | "updatedAt" | "views" | "saves" | "inquiries"
		>,
	): Promise<Property> {
		const id = `prop-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
		const mlsNumber = `MLS${Date.now().toString(36).toUpperCase()}`;

		const property: Property = {
			...propertyData,
			id,
			mlsNumber,
			listedAt: new Date(),
			updatedAt: new Date(),
			views: 0,
			saves: 0,
			inquiries: 0,
		};

		// Calculate price per sqft and Pi equivalent
		property.pricing.pricePerSqFt =
			property.pricing.listPrice / property.details.squareFeet;
		property.pricing.piEquivalent = property.pricing.listPrice / this.PI_TO_USD;

		this.properties.set(id, property);
		return property;
	}

	async getProperty(propertyId: string): Promise<Property | null> {
		const property = this.properties.get(propertyId);
		if (property) {
			property.views++;
		}
		return property || null;
	}

	async searchProperties(query: {
		listingType?: ListingType;
		propertyType?: PropertyType;
		status?: PropertyStatus;
		city?: string;
		state?: string;
		zip?: string;
		minPrice?: number;
		maxPrice?: number;
		minBeds?: number;
		maxBeds?: number;
		minBaths?: number;
		minSqFt?: number;
		maxSqFt?: number;
		features?: string[];
		radius?: { lat: number; lng: number; miles: number };
		sortBy?: "price-asc" | "price-desc" | "newest" | "sqft";
		limit?: number;
		offset?: number;
	}): Promise<{ properties: Property[]; total: number }> {
		let results = Array.from(this.properties.values());

		if (query.listingType) {
			results = results.filter((p) => p.listingType === query.listingType);
		}
		if (query.propertyType) {
			results = results.filter((p) => p.propertyType === query.propertyType);
		}
		if (query.status) {
			results = results.filter((p) => p.status === query.status);
		}
		if (query.city) {
			results = results.filter((p) =>
				p.address.city.toLowerCase().includes(query.city!.toLowerCase()),
			);
		}
		if (query.state) {
			results = results.filter((p) => p.address.state === query.state);
		}
		if (query.zip) {
			results = results.filter((p) => p.address.zip === query.zip);
		}
		if (query.minPrice !== undefined) {
			results = results.filter((p) => p.pricing.listPrice >= query.minPrice!);
		}
		if (query.maxPrice !== undefined) {
			results = results.filter((p) => p.pricing.listPrice <= query.maxPrice!);
		}
		if (query.minBeds !== undefined) {
			results = results.filter((p) => p.details.bedrooms >= query.minBeds!);
		}
		if (query.maxBeds !== undefined) {
			results = results.filter((p) => p.details.bedrooms <= query.maxBeds!);
		}
		if (query.minBaths !== undefined) {
			results = results.filter((p) => p.details.bathrooms >= query.minBaths!);
		}
		if (query.minSqFt !== undefined) {
			results = results.filter((p) => p.details.squareFeet >= query.minSqFt!);
		}
		if (query.maxSqFt !== undefined) {
			results = results.filter((p) => p.details.squareFeet <= query.maxSqFt!);
		}

		// Sort
		switch (query.sortBy) {
			case "price-asc":
				results.sort((a, b) => a.pricing.listPrice - b.pricing.listPrice);
				break;
			case "price-desc":
				results.sort((a, b) => b.pricing.listPrice - a.pricing.listPrice);
				break;
			case "newest":
				results.sort((a, b) => b.listedAt.getTime() - a.listedAt.getTime());
				break;
			case "sqft":
				results.sort((a, b) => b.details.squareFeet - a.details.squareFeet);
				break;
			default:
				// Default to newest if sortBy is undefined or unrecognized
				results.sort((a, b) => b.listedAt.getTime() - a.listedAt.getTime());
				break;
		}

		const total = results.length;
		const offset = query.offset || 0;
		const limit = query.limit || 20;
		results = results.slice(offset, offset + limit);

		return { properties: results, total };
	}

	// ==========================================================================
	// TRANSACTIONS
	// ==========================================================================

	async initiateTransaction(
		transactionData: Omit<
			PropertyTransaction,
			"id" | "createdAt" | "updatedAt" | "documents" | "status"
		>,
	): Promise<PropertyTransaction> {
		const id = `tx-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

		const transaction: PropertyTransaction = {
			...transactionData,
			id,
			status: "offer-submitted",
			documents: [],
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		this.transactions.set(id, transaction);

		// Update property status
		const property = this.properties.get(transactionData.propertyId);
		if (property) {
			property.status = "pending";
		}

		return transaction;
	}

	async getTransaction(
		transactionId: string,
	): Promise<PropertyTransaction | null> {
		return this.transactions.get(transactionId) || null;
	}

	async getDevelopmentProject(
		projectId: string,
	): Promise<DevelopmentProject | null> {
		return this.projects.get(projectId) || null;
	}

	async updateTransactionStatus(
		transactionId: string,
		status: TransactionStatus,
	): Promise<PropertyTransaction> {
		const transaction = this.transactions.get(transactionId);
		if (!transaction) {
			throw new Error("Transaction not found");
		}

		transaction.status = status;
		transaction.updatedAt = new Date();

		// Update property status on close
		if (status === "closed") {
			const property = this.properties.get(transaction.propertyId);
			if (property) {
				property.status =
					transaction.transactionType === "lease" ? "rented" : "sold";
				property.closingDate = new Date();
			}
		}

		return transaction;
	}

	async addTransactionDocument(
		transactionId: string,
		document: Omit<TransactionDocument, "id" | "uploadedAt">,
	): Promise<TransactionDocument> {
		const transaction = this.transactions.get(transactionId);
		if (!transaction) {
			throw new Error("Transaction not found");
		}

		const doc: TransactionDocument = {
			...document,
			id: `doc-${Date.now()}`,
			uploadedAt: new Date(),
		};

		transaction.documents.push(doc);
		return doc;
	}

	// ==========================================================================
	// DEVELOPMENT PROJECTS
	// ==========================================================================

	async createDevelopmentProject(
		projectData: Omit<DevelopmentProject, "id" | "createdAt" | "updatedAt">,
	): Promise<DevelopmentProject> {
		const id = `dev-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

		const project: DevelopmentProject = {
			...projectData,
			id,
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		this.projects.set(id, project);
		return project;
	}

	async getProject(projectId: string): Promise<DevelopmentProject | null> {
		return this.projects.get(projectId) || null;
	}

	async investInProject(
		projectId: string,
		userId: string,
		amount: number,
		piTransactionId?: string,
	): Promise<ProjectInvestor> {
		const project = this.projects.get(projectId);
		if (!project) {
			throw new Error("Project not found");
		}

		const totalEquity = project.totalInvestment;
		const equityPercentage = (amount / totalEquity) * 100;

		const investor: ProjectInvestor = {
			userId,
			investmentAmount: amount,
			equityPercentage,
			investmentDate: new Date(),
			piTransactionId: piTransactionId || null,
		};

		project.investors.push(investor);
		project.fundingRaised += amount;
		project.updatedAt = new Date();

		return investor;
	}

	async updateProjectPhase(
		projectId: string,
		phaseId: string,
		completionPercentage: number,
	): Promise<DevelopmentPhase> {
		const project = this.projects.get(projectId);
		if (!project) {
			throw new Error("Project not found");
		}

		const phase = project.phases.find((p) => p.id === phaseId);
		if (!phase) {
			throw new Error("Phase not found");
		}

		phase.completionPercentage = completionPercentage;
		if (completionPercentage >= 100) {
			phase.status = "complete";
		} else if (completionPercentage > 0) {
			phase.status = "in-progress";
		}

		project.updatedAt = new Date();
		return phase;
	}

	// ==========================================================================
	// TITLE MANAGEMENT
	// ==========================================================================

	async createTitle(
		titleData: Omit<Title, "id" | "lastSearched">,
	): Promise<Title> {
		const id = `title-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

		const title: Title = {
			...titleData,
			id,
			lastSearched: new Date(),
		};

		this.titles.set(id, title);
		return title;
	}

	async searchTitle(propertyId: string): Promise<Title | null> {
		for (const title of this.titles.values()) {
			if (title.propertyId === propertyId) {
				title.lastSearched = new Date();
				return title;
			}
		}
		return null;
	}

	async transferTitle(
		titleId: string,
		newOwner: string,
		consideration: number,
		documentType: TitleChainEntry["documentType"] = "deed",
	): Promise<Title> {
		const title = this.titles.get(titleId);
		if (!title) {
			throw new Error("Title not found");
		}

		const chainEntry: TitleChainEntry = {
			id: `chain-${Date.now()}`,
			grantor: title.currentOwner,
			grantee: newOwner,
			date: new Date(),
			documentType,
			recordingInfo: `Book ${Math.floor(Math.random() * 1000)}, Page ${Math.floor(Math.random() * 500)}`,
			consideration,
		};

		title.chain.push(chainEntry);
		title.currentOwner = newOwner;
		title.lastTransferred = new Date();

		return title;
	}

	// ==========================================================================
	// AGENTS
	// ==========================================================================

	async registerAgent(
		agentData: Omit<
			RealEstateAgent,
			"id" | "verified" | "rating" | "reviewCount" | "salesVolume"
		>,
	): Promise<RealEstateAgent> {
		const id = `agent-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

		const agent: RealEstateAgent = {
			...agentData,
			id,
			verified: false,
			rating: 0,
			reviewCount: 0,
			salesVolume: 0,
		};

		this.agents.set(id, agent);
		return agent;
	}

	async searchAgents(query: {
		state?: string;
		specialization?: string;
		minRating?: number;
		limit?: number;
	}): Promise<RealEstateAgent[]> {
		let agents = Array.from(this.agents.values());

		if (query.state) {
			agents = agents.filter((a) => a.licenseState === query.state);
		}
		if (query.specialization) {
			agents = agents.filter((a) =>
				a.specializations.includes(query.specialization!),
			);
		}
		if (query.minRating) {
			agents = agents.filter((a) => a.rating >= query.minRating!);
		}

		agents.sort((a, b) => b.rating - a.rating);

		if (query.limit) {
			agents = agents.slice(0, query.limit);
		}

		return agents;
	}

	// ==========================================================================
	// REAL ESTATE AGENT HUB - SUBSCRIPTION & PARTNERSHIP
	// ==========================================================================

	getAgentSubscriptionPlans(): AgentSubscriptionPlan[] {
		return [
			{
				tier: "basic",
				name: "Basic Agent",
				monthlyPrice: 79,
				monthlyPriceInPi: 79 / this.PI_TO_USD,
				annualPrice: 758,
				annualPriceInPi: 758 / this.PI_TO_USD,
				commissionSplit: 0.7,
				piBonus: 0.02,
				features: [
					"Up to 10 active listings",
					"Basic CRM access",
					"Lead management (50 leads)",
					"Standard MLS integration",
					"Email support",
					"Pi payment acceptance",
					"Basic analytics",
				],
				maxListings: 10,
				maxLeads: 50,
				crmAccess: true,
				mlsIntegration: true,
				virtualTourTools: false,
				marketingAutomation: false,
				supportLevel: "email",
			},
			{
				tier: "professional",
				name: "Professional Agent",
				monthlyPrice: 199,
				monthlyPriceInPi: 199 / this.PI_TO_USD,
				annualPrice: 1910,
				annualPriceInPi: 1910 / this.PI_TO_USD,
				commissionSplit: 0.8,
				piBonus: 0.03,
				features: [
					"Up to 50 active listings",
					"Full CRM access",
					"Unlimited lead management",
					"Enhanced MLS integration",
					"Virtual tour tools",
					"Priority support",
					"Advanced analytics",
					"Marketing templates",
					"Client portal",
					"Transaction management",
				],
				maxListings: 50,
				maxLeads: "unlimited",
				crmAccess: true,
				mlsIntegration: true,
				virtualTourTools: true,
				marketingAutomation: false,
				supportLevel: "priority",
			},
			{
				tier: "broker",
				name: "Broker Team",
				monthlyPrice: 499,
				monthlyPriceInPi: 499 / this.PI_TO_USD,
				annualPrice: 4790,
				annualPriceInPi: 4790 / this.PI_TO_USD,
				commissionSplit: 0.85,
				piBonus: 0.04,
				features: [
					"Unlimited listings",
					"Team management (up to 25 agents)",
					"Full CRM with automation",
					"Premium MLS integration",
					"3D virtual tours",
					"Marketing automation",
					"Dedicated support",
					"White-label client portal",
					"Commission tracking",
					"Recruitment tools",
					"Training resources",
				],
				maxListings: "unlimited",
				maxLeads: "unlimited",
				crmAccess: true,
				mlsIntegration: true,
				virtualTourTools: true,
				marketingAutomation: true,
				supportLevel: "dedicated",
			},
			{
				tier: "enterprise",
				name: "Enterprise Brokerage",
				monthlyPrice: 1499,
				monthlyPriceInPi: 1499 / this.PI_TO_USD,
				annualPrice: 14_390,
				annualPriceInPi: 14_390 / this.PI_TO_USD,
				commissionSplit: 0.9,
				piBonus: 0.05,
				features: [
					"All Broker features",
					"Unlimited agents",
					"Custom branding",
					"API access",
					"Data export/import",
					"24/7 dedicated support",
					"Custom integrations",
					"Franchise management",
					"Revenue sharing",
					"Pi escrow services",
					"Blockchain title integration",
					"Allodial deed processing",
				],
				maxListings: "unlimited",
				maxLeads: "unlimited",
				crmAccess: true,
				mlsIntegration: true,
				virtualTourTools: true,
				marketingAutomation: true,
				supportLevel: "dedicated",
			},
		];
	}

	async subscribeAgent(
		agentId: string,
		tier: AgentSubscriptionTier,
		payWithPi = false,
	): Promise<RealEstateAgent> {
		const agent = this.agents.get(agentId);
		if (!agent) {
			throw new Error("Agent not found");
		}

		const plans = this.getAgentSubscriptionPlans();
		const plan = plans.find((p) => p.tier === tier)!;

		agent.subscriptionTier = tier;
		agent.subscriptionStatus = "active";
		agent.subscriptionStartDate = new Date();
		agent.subscriptionEndDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
		agent.monthlyFee = plan.monthlyPrice;
		agent.monthlyFeeInPi = plan.monthlyPriceInPi;
		agent.commissionRate = plan.commissionSplit;
		agent.piCommissionBonus = plan.piBonus;
		agent.crmAccess = plan.crmAccess;
		agent.mlsIntegration = plan.mlsIntegration;
		agent.virtualTourTools = plan.virtualTourTools;
		agent.marketingAutomation = plan.marketingAutomation;
		agent.accessLevel = plan.features;
		agent.leads = [];
		agent.totalLeads = 0;
		agent.convertedLeads = 0;
		agent.totalListings = 0;
		agent.activeListings = 0;
		agent.closedTransactions = 0;
		agent.totalCommissionEarned = 0;
		agent.totalPiEarned = 0;
		agent.lastActiveAt = new Date();

		return agent;
	}

	async addAgentLead(
		agentId: string,
		leadData: Omit<AgentLead, "id" | "agentId" | "createdAt" | "updatedAt">,
	): Promise<AgentLead> {
		const agent = this.agents.get(agentId);
		if (!agent) {
			throw new Error("Agent not found");
		}

		const id = `lead-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
		const lead: AgentLead = {
			...leadData,
			id,
			agentId,
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		agent.leads = agent.leads || [];
		agent.leads.push(lead);
		agent.totalLeads = (agent.totalLeads || 0) + 1;

		return lead;
	}

	async updateLeadStatus(
		agentId: string,
		leadId: string,
		status: AgentLead["status"],
	): Promise<AgentLead> {
		const agent = this.agents.get(agentId);
		if (!agent) {
			throw new Error("Agent not found");
		}

		const lead = agent.leads?.find((l) => l.id === leadId);
		if (!lead) {
			throw new Error("Lead not found");
		}

		const previousStatus = lead.status;
		lead.status = status;
		lead.updatedAt = new Date();

		if (status === "closed" && previousStatus !== "closed") {
			agent.convertedLeads = (agent.convertedLeads || 0) + 1;
			agent.totalCommissionEarned =
				(agent.totalCommissionEarned || 0) + lead.estimatedCommission;
			agent.totalPiEarned = (agent.totalPiEarned || 0) + lead.estimatedPiBonus;
		}

		return lead;
	}

	async getAgentDashboard(agentId: string): Promise<{
		agent: RealEstateAgent;
		activeListings: Property[];
		recentLeads: AgentLead[];
		monthlyStats: {
			listings: number;
			leads: number;
			closings: number;
			revenue: number;
			piEarned: number;
		};
		subscriptionInfo: AgentSubscriptionPlan | null;
	}> {
		const agent = this.agents.get(agentId);
		if (!agent) {
			throw new Error("Agent not found");
		}

		const activeListings = Array.from(this.properties.values()).filter(
			(p) => p.agentId === agentId && p.status === "active",
		);

		const plans = this.getAgentSubscriptionPlans();
		const currentPlan = agent.subscriptionTier
			? plans.find((p) => p.tier === agent.subscriptionTier) || null
			: null;

		return {
			agent,
			activeListings,
			recentLeads: (agent.leads || []).slice(-10),
			monthlyStats: {
				listings: agent.activeListings || 0,
				leads: agent.totalLeads || 0,
				closings: agent.closedTransactions || 0,
				revenue: agent.totalCommissionEarned || 0,
				piEarned: agent.totalPiEarned || 0,
			},
			subscriptionInfo: currentPlan,
		};
	}

	async recordAgentClosing(
		agentId: string,
		transactionId: string,
		paidWithPi = false,
	): Promise<{
		commission: number;
		piBonus: number;
	}> {
		const agent = this.agents.get(agentId);
		if (!agent) {
			throw new Error("Agent not found");
		}

		const transaction = this.transactions.get(transactionId);
		if (!transaction) {
			throw new Error("Transaction not found");
		}

		const commission =
			transaction.purchasePrice * (agent.commissionRate || 0.03);
		const piBonus = paidWithPi
			? transaction.purchasePrice * (agent.piCommissionBonus || 0)
			: 0;

		agent.closedTransactions = (agent.closedTransactions || 0) + 1;
		agent.salesVolume += transaction.purchasePrice;
		agent.totalCommissionEarned =
			(agent.totalCommissionEarned || 0) + commission;
		agent.totalPiEarned = (agent.totalPiEarned || 0) + piBonus;
		agent.lastActiveAt = new Date();

		return { commission, piBonus };
	}

	async getSubscribedAgents(filters?: {
		tier?: AgentSubscriptionTier;
		status?: AgentSubscriptionStatus;
		state?: string;
	}): Promise<RealEstateAgent[]> {
		let agents = Array.from(this.agents.values()).filter(
			(a) => a.subscriptionTier !== undefined,
		);

		if (filters?.tier) {
			agents = agents.filter((a) => a.subscriptionTier === filters.tier);
		}
		if (filters?.status) {
			agents = agents.filter((a) => a.subscriptionStatus === filters.status);
		}
		if (filters?.state) {
			agents = agents.filter((a) => a.licenseState === filters.state);
		}

		return agents;
	}
}

// ============================================================================
// EXPORTS
// ============================================================================

export const realEstatePlatform = RealEstatePlatform.getInstance();

export async function listProperty(
	propertyData: Parameters<typeof realEstatePlatform.createListing>[0],
): Promise<Property> {
	return realEstatePlatform.createListing(propertyData);
}

export async function searchProperties(
	query: Parameters<typeof realEstatePlatform.searchProperties>[0],
): Promise<{ properties: Property[]; total: number }> {
	return realEstatePlatform.searchProperties(query);
}

export async function makeOffer(
	transactionData: Parameters<typeof realEstatePlatform.initiateTransaction>[0],
): Promise<PropertyTransaction> {
	return realEstatePlatform.initiateTransaction(transactionData);
}

export async function createDevelopment(
	projectData: Parameters<
		typeof realEstatePlatform.createDevelopmentProject
	>[0],
): Promise<DevelopmentProject> {
	return realEstatePlatform.createDevelopmentProject(projectData);
}

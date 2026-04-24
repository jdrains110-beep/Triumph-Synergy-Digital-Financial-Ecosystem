// lib/real-estate/sovereign-re-types.ts
// Sovereign Real Estate Platform — Full Type System
//
// Combines:
//  - Pi Network payments (native Pi + Pi SDK 2.0)
//  - Property tokenization (PI-721 NFT deeds + allodial sovereignty)
//  - Real-world utility (MLS, escrow, permits, rental yield, DAO governance)
//  - Legal loophole scanning (title defects, zoning loopholes, foreclosure traps)
//  - 21-layer Fortress Protection on every deed token
//
// @module lib/real-estate/sovereign-re-types
// @version 1.0.0

import { createHash, randomBytes } from "crypto";

// ─── Network & Token Standards ────────────────────────────────────────────────

export type SovereignNetwork = "pi-mainnet" | "pi-testnet";
export type RETokenStandard = "PI-721" | "PI-1155"; // NFT deed | fractional shares
export type DeedSovereigntyClass =
  | "ALLODIAL"       // Absolute fee simple — no feudal liens
  | "FEE_SIMPLE"     // Standard ownership
  | "FEE_TAIL"       // Hereditary
  | "LIFE_ESTATE"    // Term-based
  | "LEASEHOLD"      // Lease rights tokenized
  | "FRACTIONAL";    // Fractional shares (PI-1155)

// ─── Property Token ──────────────────────────────────────────────────────────

export interface SovereignPropertyToken {
  tokenId: string;                    // SHA-256(parcelId + ownerAddress + mintedAt)
  parcelId: string;                   // APN / parcel number
  propertyId: string;                 // Platform property ID
  standard: RETokenStandard;
  sovereigntyClass: DeedSovereigntyClass;
  network: SovereignNetwork;

  // Ownership
  ownerAddress: string;               // Pi wallet address
  ownerUsername: string;              // Pi username
  coOwners: CoOwner[];               // Multi-sig co-owners

  // Valuation
  appraisedValueUsd: number;
  appraisedValuePi: string;          // Pi value (string for precision)
  tokenizedSharePercent: number;     // 100 = full, <100 = fractional
  fractionalShares?: FractionalShare[];

  // Blockchain anchors
  piTxHash: string | null;
  stellarLedger: number | null;
  stellarTxHash: string | null;
  ipfsMetadataUri: string | null;    // Immutable metadata URI

  // Legal
  titleClearance: TitleClearanceReport;
  fortressScore: number;             // 0–100 (21-layer result)
  legalLoopholes: RELoophole[];      // Detected loopholes on this property
  encumbrances: Encumbrance[];
  liens: Lien[];

  // Status
  status: TokenDeedStatus;
  listedForSale: boolean;
  listingPricePi: string | null;
  listingPriceUsd: number | null;

  mintedAt: string;
  updatedAt: string;
  transferHistory: DeedTransfer[];
}

export interface CoOwner {
  ownerAddress: string;
  ownerUsername: string;
  sharePercent: number;
  role: "primary" | "joint" | "trustee" | "beneficiary";
  signatureRequired: boolean;
}

export interface FractionalShare {
  shareId: string;
  ownerAddress: string;
  ownerUsername: string;
  sharePercent: number;         // e.g. 5 = 5% ownership
  shareValuePi: string;
  shareValueUsd: number;
  dividendYield: number | null; // Annual rental yield %
  purchasedAt: string;
  txHash: string;
}

export interface DeedTransfer {
  fromAddress: string;
  toAddress: string;
  pricePi: string;
  priceUsd: number;
  txHash: string;
  transferredAt: string;
  transferType: "sale" | "gift" | "inheritance" | "foreclosure-rescue" | "dao-vote";
}

export type TokenDeedStatus =
  | "PENDING_TITLE_CLEAR"
  | "FORTRESS_SECURED"
  | "ANCHORED_STELLAR"
  | "MINTED"
  | "LISTED"
  | "UNDER_CONTRACT"
  | "TRANSFERRED"
  | "DISPUTED"
  | "FORECLOSURE_SHIELD"  // Protected via legal loophole + fortress
  | "DAO_GOVERNED";

// ─── Title Clearance ──────────────────────────────────────────────────────────

export interface TitleClearanceReport {
  reportId: string;
  propertyId: string;
  runAt: string;
  isClear: boolean;
  score: number;           // 0–100 clearance confidence
  issues: TitleIssue[];
  chainOfTitleYears: number;
  abstractOfTitle: string;
  titleInsuranceEligible: boolean;
  surveyConflicts: boolean;
  probateIssues: boolean;
  taxLienAmount: number;
  taxLienCleared: boolean;
  mechaniclLiens: number;
  judgmentLiens: number;
  mortgageBalance: number;
  foreclosureRisk: "none" | "low" | "medium" | "high" | "active";
  recommendations: string[];
}

export interface TitleIssue {
  issueId: string;
  type: TitleIssueType;
  description: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
  legalAuthority: string;
  cure: string;
  estimatedCostUsd: number;
  estimatedCostPi: string;
  autoResolvable: boolean;
}

export type TitleIssueType =
  | "BREAK_IN_CHAIN"
  | "MISSING_LEGAL_DESCRIPTION"
  | "UNDISCLOSED_EASEMENT"
  | "MECHANIC_LIEN"
  | "JUDGMENT_LIEN"
  | "TAX_LIEN"
  | "MORTGAGE_NOT_RELEASED"
  | "DEED_FORGERY_RISK"
  | "BOUNDARY_DISPUTE"
  | "ADVERSE_POSSESSION_CLAIM"
  | "HOMESTEAD_VIOLATION"
  | "HOA_SUPER_LIEN"
  | "PROBATE_UNRESOLVED"
  | "QDRO_ENCUMBRANCE"
  | "FRAUDULENT_CONVEYANCE";

export interface Encumbrance {
  id: string;
  type: "easement" | "covenant" | "restriction" | "right-of-way" | "mineral-rights";
  description: string;
  grantor: string;
  recordedAt: string;
  bookPage: string;
  affectsValue: boolean;
  affectsUse: string | null;
}

export interface Lien {
  id: string;
  type: "mortgage" | "tax" | "mechanic" | "judgment" | "hoa" | "irs" | "lis-pendens";
  holderName: string;
  originalAmount: number;
  currentBalance: number;
  recordedAt: string;
  maturityDate: string | null;
  interestRate: number | null;
  isFirstPosition: boolean;
  piPayoffAmount: string | null;    // Payoff calculated in Pi
}

// ─── Real Estate Loopholes ───────────────────────────────────────────────────

export type RELoopholeType =
  // Foreclosure Defense
  | "ROBO_SIGNING_VOID"              // Assignment signed by robo-signer = voidable
  | "MERS_STANDING_DEFECT"          // MERS assignments lack standing in many states
  | "SECURITIZATION_CHAIN_BREAK"    // Pooling & servicing agreement breach
  | "QUIET_TITLE_OPPORTUNITY"       // Clear adverse claims via quiet title action
  | "HOMESTEAD_EXEMPTION_BLOCK"     // Homestead state laws blocking forced sale
  | "DEBT_STATUTE_LIMITATIONS"      // SOL on old mortgage debt (varies 3–10 yr)
  | "NON_JUDICIAL_DEFECT"           // Required judicial foreclosure bypassed
  | "RIGHT_OF_REDEMPTION"           // Statutory redemption period after sale
  | "ACCELERATION_NOTICE_DEFECT"    // Acceleration letter failed RESPA/TILA requirements
  | "FORECLOSURE_MEDIATION_RIGHT"   // Many states require mediation offer pre-foreclosure
  // Zoning & Permitting
  | "NONCONFORMING_USE_VESTED"      // Pre-existing use survives rezoning
  | "VARIANCE_APPROVAL_PATH"        // Dimensional variance to increase density
  | "ACCESSORY_DWELLING_RIGHT"      // ADU rights by state law (CA AB-68, FL FS 163)
  | "AGRICULTURAL_TAX_BENEFIT"      // Greenbelt / ag exemption reduces assessed value
  | "CONSERVATION_EASEMENT_CREDIT"  // Federal/state tax credits via conservation deed
  | "OPPORTUNITY_ZONE_BENEFIT"      // Capital gains deferral in designated OZ
  // Title & Ownership
  | "ADVERSE_POSSESSION_CLAIM"      // Long-term open possession = title claim
  | "PRESCRIPTIVE_EASEMENT_GAIN"    // Use-based easement rights
  | "BOUNDARY_DISCREPANCY_GAIN"     // Survey error reveals additional land
  | "ALLODIAL_TITLE_CONVERT"        // Convert to allodial / sovereign title
  | "TENANCY_HOMESTEAD_SHIELD"      // Tenant-in-common + homestead = creditor shield
  // Pi Network Specific
  | "PI_PAYMENT_TAX_TREATMENT"      // Pi-denominated sales may qualify for barter treatment
  | "TOKENIZED_DEED_PROBATE_SKIP"   // Smart contract transfer bypasses probate
  | "DAO_GOVERNANCE_EXEMPTION"      // DAO-managed property may avoid certain regulations
  | "PI_COLLATERAL_DEFI_LOAN"       // Use tokenized deed as DeFi collateral for Pi loans
  | "FRACTIONAL_ACCREDITED_BYPASS"; // Fractional tokens may qualify under Reg D exemptions

export type RELoopholeCategory =
  | "FORECLOSURE_DEFENSE"
  | "ZONING_OPTIMIZATION"
  | "TITLE_SOVEREIGNTY"
  | "TAX_ADVANTAGE"
  | "PI_NETWORK_UTILITY"
  | "FRACTIONAL_FINANCE";

export interface RELoophole {
  loopholeId: string;
  type: RELoopholeType;
  category: RELoopholeCategory;
  title: string;
  description: string;
  legalAuthority: string;         // Statute / case law citation
  jurisdiction: string[];         // States / federal where applies
  applicabilityScore: number;     // 0–100 how applicable to this property
  estimatedValueGainUsd: number;  // Dollar value of opportunity
  estimatedValueGainPi: string;   // Pi value of opportunity
  riskLevel: "LOW" | "MODERATE" | "HIGH";
  timeToAct: string;              // e.g. "Must file within 20 days of notice"
  actionSteps: string[];          // Concrete steps to exploit
  piNetworkIntegration: string | null; // How Pi Network / tokenization helps
  precedentCase: string | null;   // Case law reference
}

// ─── Pi Network Real Estate Transaction ──────────────────────────────────────

export interface PiRETransaction {
  txId: string;
  propertyId: string;
  tokenId: string;
  type: PiRETransactionType;
  status: "pending" | "approved" | "completed" | "cancelled" | "disputed";

  // Parties
  buyerPiAddress: string;
  buyerPiUsername: string;
  sellerPiAddress: string;
  sellerPiUsername: string;

  // Amounts
  totalPricePi: string;
  totalPriceUsd: number;
  closingCostsPi: string;
  platformFeePi: string;         // Platform takes 0.5% in Pi
  agentFeePi: string | null;
  escrowAmountPi: string;

  // Pi SDK Payment
  piPaymentId: string | null;
  piPaymentMemo: string;
  piBlockchainTxHash: string | null;
  piSdkApprovedAt: string | null;
  piSdkCompletedAt: string | null;

  // Milestones (escrow release gates)
  milestones: TransactionMilestone[];

  // Legal
  purchaseAgreementHash: string | null;  // SHA-256 of signed agreement
  titleTransferDeedHash: string | null;
  closingDisclosureHash: string | null;

  createdAt: string;
  updatedAt: string;
}

export type PiRETransactionType =
  | "pi-full-purchase"        // Full price paid in Pi
  | "pi-down-payment"         // Down payment in Pi, balance financed
  | "pi-fractional-buy"       // Buy fractional shares in Pi
  | "pi-rental-payment"       // Monthly rent paid in Pi
  | "pi-escrow-deposit"       // Earnest money in Pi
  | "pi-deed-token-transfer"  // NFT deed transfer on Pi blockchain
  | "pi-loan-collateral";     // Lock deed as collateral for Pi DeFi loan

export interface TransactionMilestone {
  milestoneId: string;
  name: string;
  description: string;
  status: "pending" | "completed" | "failed";
  piReleaseAmount: string;    // Pi released to seller at this milestone
  completedAt: string | null;
  requiredDocuments: string[];
  autoRelease: boolean;       // Smart contract auto-release
}

// ─── Real Estate Listing (Sovereign) ─────────────────────────────────────────

export interface SovereignListing {
  listingId: string;
  propertyId: string;
  tokenId: string | null;           // Set once tokenized

  // Property Details
  address: string;
  city: string;
  state: string;
  zip: string;
  county: string;
  parcelId: string;
  propertyType: SovereignPropertyType;
  zoning: string;
  acreage: number | null;
  squareFeet: number;
  bedrooms: number;
  bathrooms: number;
  yearBuilt: number;

  // Pricing (dual USD + Pi)
  listPriceUsd: number;
  listPricePi: string;
  pricePerSqFtUsd: number;
  rentalYieldPercent: number | null;
  monthlyRentPi: string | null;
  monthlyRentUsd: number | null;

  // Sovereignty Features
  sovereigntyClass: DeedSovereigntyClass;
  allodialEligible: boolean;
  homesteadEligible: boolean;
  foreclosureShielded: boolean;
  tokenized: boolean;
  fractionalAvailable: boolean;
  fractionalMinSharePercent: number | null;
  fractionalMinPricePi: string | null;

  // Images & Media
  images: string[];
  virtualTourUrl: string | null;
  documentUrls: string[];

  // Loopholes discovered
  loopholes: RELoophole[];
  totalLoopholeValueUsd: number;
  totalLoopholeValuePi: string;

  // Title
  titleClearance: TitleClearanceReport | null;
  titleClearanceScore: number;

  // Listing details
  status: "active" | "pending" | "under-contract" | "sold" | "off-market" | "coming-soon";
  daysOnMarket: number;
  views: number;
  saves: number;
  offers: number;

  listedByAgentId: string | null;
  listedByPiUsername: string;
  listedByPiAddress: string;

  createdAt: string;
  updatedAt: string;
}

export type SovereignPropertyType =
  | "single-family"
  | "multi-family"
  | "condo"
  | "townhouse"
  | "commercial"
  | "industrial"
  | "land"
  | "farm-ranch"
  | "mixed-use"
  | "manufactured"
  | "mobile-home-park"
  | "storage-facility"
  | "self-storage"
  | "data-center-land";

// ─── DAO Property Governance ──────────────────────────────────────────────────

export interface REDAOProposal {
  proposalId: string;
  tokenId: string;             // Tokenized property
  propertyId: string;
  type: DAOProposalType;
  title: string;
  description: string;
  status: "active" | "passed" | "rejected" | "executed" | "expired";

  // Voting
  votesFor: number;
  votesAgainst: number;
  totalVotingWeight: number;  // Total fractional shares
  quorumRequired: number;     // % quorum needed
  quorumMet: boolean;
  deadlineAt: string;

  // Outcome
  piAmountDeployed: string | null;  // Pi used to execute
  executedAt: string | null;
  executedByAddress: string | null;

  createdAt: string;
  votes: DAOVote[];
}

export type DAOProposalType =
  | "SELL_PROPERTY"
  | "REFINANCE"
  | "RENOVATE"
  | "RENT_OUT"
  | "CONVERT_TO_ALLODIAL"
  | "FORECLOSURE_DEFENSE"
  | "LEGAL_ACTION"
  | "DISTRIBUTE_YIELD"
  | "ADD_CO_OWNER"
  | "REMOVE_CO_OWNER";

export interface DAOVote {
  voterAddress: string;
  voterUsername: string;
  voteWeight: number;          // Their share %
  vote: "for" | "against" | "abstain";
  txHash: string;
  castAt: string;
}

// ─── Rental Yield Tracker ──────────────────────────────────────────────────────

export interface RentalYieldReport {
  propertyId: string;
  tokenId: string;
  periodStart: string;
  periodEnd: string;
  totalRentCollectedPi: string;
  totalRentCollectedUsd: number;
  vacancyRate: number;           // %
  maintenanceCostPi: string;
  propertyTaxPi: string;
  managementFeePi: string;
  netYieldPi: string;
  netYieldUsd: number;
  annualizedYieldPercent: number;
  distributedToShareholders: YieldDistribution[];
}

export interface YieldDistribution {
  recipientAddress: string;
  recipientUsername: string;
  sharePercent: number;
  amountPi: string;
  amountUsd: number;
  txHash: string;
  distributedAt: string;
}

// ─── Platform Stats ────────────────────────────────────────────────────────────

export interface SovereignREStats {
  totalListings: number;
  activeListings: number;
  totalTokenizedProperties: number;
  totalValueTokenizedUsd: number;
  totalValueTokenizedPi: string;
  totalTransactionVolumePi: string;
  totalTransactionVolumeUsd: number;
  totalLoopholesDetected: number;
  totalLoopholeValueUsd: number;
  totalFractionalShareholders: number;
  totalDAOProposals: number;
  averageForeclosureShieldScore: number;
  piPaymentsProcessed: number;
  averageTitleClearanceScore: number;
}

// ─── ID generators ────────────────────────────────────────────────────────────

export function makePropertyTokenId(parcelId: string, ownerAddress: string): string {
  return `PT_${createHash("sha256")
    .update(parcelId + ownerAddress + Date.now())
    .digest("hex")
    .slice(0, 16).toUpperCase()}`;
}

export function makeRELoopholeId(propertyId: string, type: RELoopholeType): string {
  return `REL_${createHash("sha256")
    .update(propertyId + type)
    .digest("hex")
    .slice(0, 12).toUpperCase()}`;
}

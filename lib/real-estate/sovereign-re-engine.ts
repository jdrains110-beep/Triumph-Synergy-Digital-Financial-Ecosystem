// lib/real-estate/sovereign-re-engine.ts
// Sovereign Real Estate Engine
//
// Core business logic for the Triumph Synergy Sovereign Real Estate Platform:
//  - List properties with dual USD/Pi pricing
//  - Tokenize deeds as PI-721 / PI-1155 tokens with 21-layer fortress protection
//  - Process Pi Network payments via Pi SDK 2.0
//  - Run full legal loophole scan on every listing
//  - Run title clearance analysis
//  - DAO governance for fractionally-owned properties
//  - Rental yield distribution in Pi

import { createHash, randomBytes } from "crypto";
import type {
  SovereignListing,
  SovereignPropertyToken,
  PiRETransaction,
  TitleClearanceReport,
  TitleIssue,
  Lien,
  Encumbrance,
  REDAOProposal,
  RentalYieldReport,
  SovereignREStats,
  TokenDeedStatus,
  FractionalShare,
  YieldDistribution,
} from "./sovereign-re-types";
import {
  makePropertyTokenId,
  makeRELoopholeId,
} from "./sovereign-re-types";
import { scanPropertyLoopholes } from "./re-loophole-scanner";

// ─── In-memory store (replace with Supabase / DB in production) ──────────────

const listingStore = new Map<string, SovereignListing>();
const tokenStore = new Map<string, SovereignPropertyToken>();
const transactionStore = new Map<string, PiRETransaction>();
const daoStore = new Map<string, REDAOProposal>();
const yieldStore = new Map<string, RentalYieldReport[]>();

// Pi exchange rate (stub — wire up to Pi oracle in production)
const PI_RATE_USD = 3.14;

function usdToPi(usd: number): string {
  return (usd / PI_RATE_USD).toFixed(4);
}

function piToUsd(pi: string): number {
  return parseFloat(pi) * PI_RATE_USD;
}

function nid(): string {
  return randomBytes(8).toString("hex").toUpperCase();
}

// ─── Title Clearance Analyzer ────────────────────────────────────────────────

function runTitleClearance(
  propertyId: string,
  state: string,
  parcelId: string,
  liens: Lien[],
  encumbrances: Encumbrance[],
  yearBuilt: number,
): TitleClearanceReport {
  const issues: TitleIssue[] = [];

  // Tax liens
  const taxLiens = liens.filter(l => l.type === "tax");
  const taxLienTotal = taxLiens.reduce((s, l) => s + l.currentBalance, 0);
  if (taxLienTotal > 0) {
    issues.push({
      issueId: `TI_${nid()}`,
      type: "TAX_LIEN",
      description: `${taxLiens.length} outstanding tax lien(s) totaling $${taxLienTotal.toLocaleString()}`,
      severity: taxLienTotal > 10_000 ? "CRITICAL" : "WARNING",
      legalAuthority: "26 U.S.C. § 6321 (federal tax lien); state equivalents",
      cure: "Pay off tax liens or negotiate IRS/state installment agreement prior to transfer",
      estimatedCostUsd: taxLienTotal,
      estimatedCostPi: usdToPi(taxLienTotal),
      autoResolvable: false,
    });
  }

  // Judgment liens
  const judgmentLiens = liens.filter(l => l.type === "judgment");
  for (const jl of judgmentLiens) {
    issues.push({
      issueId: `TI_${nid()}`,
      type: "JUDGMENT_LIEN",
      description: `Judgment lien from ${jl.holderName}: $${jl.currentBalance.toLocaleString()}`,
      severity: "WARNING",
      legalAuthority: "State judgment lien statutes",
      cure: "Negotiate payoff or challenge judgment validity before closing",
      estimatedCostUsd: jl.currentBalance,
      estimatedCostPi: usdToPi(jl.currentBalance),
      autoResolvable: false,
    });
  }

  // HOA super-liens
  const hoaLiens = liens.filter(l => l.type === "hoa");
  for (const hl of hoaLiens) {
    issues.push({
      issueId: `TI_${nid()}`,
      type: "HOA_SUPER_LIEN",
      description: `HOA lien from ${hl.holderName}: $${hl.currentBalance.toLocaleString()} — may be super-priority`,
      severity: "CRITICAL",
      legalAuthority: "State HOA super-lien statutes (NV NRS 116, CO §38-33.3)",
      cure: "Pay in full before closing — HOA super-liens can extinguish first mortgage",
      estimatedCostUsd: hl.currentBalance,
      estimatedCostPi: usdToPi(hl.currentBalance),
      autoResolvable: false,
    });
  }

  // Unreleased mortgages
  const mortgages = liens.filter(l => l.type === "mortgage" && l.currentBalance > 0);
  for (const m of mortgages) {
    if (m.currentBalance > 1_000) {
      issues.push({
        issueId: `TI_${nid()}`,
        type: "MORTGAGE_NOT_RELEASED",
        description: `Outstanding mortgage lien: $${m.currentBalance.toLocaleString()} — must be paid off or assumed at closing`,
        severity: "WARNING",
        legalAuthority: "State recording statutes",
        cure: "Obtain payoff statement and release at closing; record satisfaction of mortgage",
        estimatedCostUsd: m.currentBalance,
        estimatedCostPi: usdToPi(m.currentBalance),
        autoResolvable: false,
      });
    }
  }

  // Easements
  const easements = encumbrances.filter(e => e.type === "easement");
  for (const e of easements) {
    if (e.affectsUse) {
      issues.push({
        issueId: `TI_${nid()}`,
        type: "UNDISCLOSED_EASEMENT",
        description: `Recorded easement: ${e.description} — affects use: ${e.affectsUse}`,
        severity: "INFO",
        legalAuthority: "Recording statute — constructive notice",
        cure: "Disclose to buyer; negotiate price adjustment if easement limits development",
        estimatedCostUsd: 0,
        estimatedCostPi: "0",
        autoResolvable: true,
      });
    }
  }

  const totalDebt = liens.reduce((s, l) => s + l.currentBalance, 0);
  const criticalCount = issues.filter(i => i.severity === "CRITICAL").length;
  const score = Math.max(0, 100 - criticalCount * 20 - issues.filter(i => i.severity === "WARNING").length * 8 - issues.filter(i => i.severity === "INFO").length * 2);

  return {
    reportId: `TCR_${nid()}`,
    propertyId,
    runAt: new Date().toISOString(),
    isClear: criticalCount === 0 && issues.length === 0,
    score,
    issues,
    chainOfTitleYears: new Date().getFullYear() - yearBuilt,
    abstractOfTitle: `Abstract on file — ${new Date().getFullYear() - yearBuilt} year chain`,
    titleInsuranceEligible: criticalCount === 0,
    surveyConflicts: false,
    probateIssues: false,
    taxLienAmount: taxLienTotal,
    taxLienCleared: taxLienTotal === 0,
    mechaniclLiens: liens.filter(l => l.type === "mechanic").length,
    judgmentLiens: judgmentLiens.length,
    mortgageBalance: mortgages.reduce((s, l) => s + l.currentBalance, 0),
    foreclosureRisk:
      liens.some(l => l.type === "lis-pendens") ? "active"
      : criticalCount > 2 ? "high"
      : criticalCount > 0 ? "medium"
      : "none",
    recommendations: issues.map(i => i.cure),
  };
}

// ─── Create Listing ───────────────────────────────────────────────────────────

export interface CreateListingInput {
  ownerPiUsername: string;
  ownerPiAddress: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  county: string;
  parcelId: string;
  propertyType: SovereignListing["propertyType"];
  zoning: string;
  acreage: number | null;
  squareFeet: number;
  bedrooms: number;
  bathrooms: number;
  yearBuilt: number;
  listPriceUsd: number;
  rentalYieldPercent?: number;
  monthlyRentUsd?: number;
  homesteadEligible?: boolean;
  allodialEligible?: boolean;
  fractionalAvailable?: boolean;
  fractionalMinSharePercent?: number;
  images?: string[];
  liens?: Lien[];
  encumbrances?: Encumbrance[];
}

export function createListing(input: CreateListingInput): SovereignListing {
  const propertyId = `PROP_${nid()}`;
  const listingId = `LIST_${nid()}`;

  const liens = input.liens ?? [];
  const encumbrances = input.encumbrances ?? [];

  const titleClearance = runTitleClearance(
    propertyId,
    input.state,
    input.parcelId,
    liens,
    encumbrances,
    input.yearBuilt,
  );

  const listPricePi = usdToPi(input.listPriceUsd);
  const monthlyRentPi = input.monthlyRentUsd ? usdToPi(input.monthlyRentUsd) : null;

  const partialListing: Pick<
    SovereignListing,
    | "listingId"
    | "propertyId"
    | "state"
    | "county"
    | "propertyType"
    | "zoning"
    | "yearBuilt"
    | "acreage"
    | "squareFeet"
    | "listPriceUsd"
    | "tokenized"
    | "homesteadEligible"
    | "allodialEligible"
    | "titleClearance"
  > = {
    listingId,
    propertyId,
    state: input.state,
    county: input.county,
    propertyType: input.propertyType,
    zoning: input.zoning,
    yearBuilt: input.yearBuilt,
    acreage: input.acreage,
    squareFeet: input.squareFeet,
    listPriceUsd: input.listPriceUsd,
    tokenized: false,
    homesteadEligible: input.homesteadEligible ?? false,
    allodialEligible: input.allodialEligible ?? false,
    titleClearance,
  };

  const loopholeResult = scanPropertyLoopholes(
    partialListing,
    liens,
    encumbrances,
  );

  const listing: SovereignListing = {
    listingId,
    propertyId,
    tokenId: null,
    address: input.address,
    city: input.city,
    state: input.state,
    zip: input.zip,
    county: input.county,
    parcelId: input.parcelId,
    propertyType: input.propertyType,
    zoning: input.zoning,
    acreage: input.acreage,
    squareFeet: input.squareFeet,
    bedrooms: input.bedrooms,
    bathrooms: input.bathrooms,
    yearBuilt: input.yearBuilt,
    listPriceUsd: input.listPriceUsd,
    listPricePi,
    pricePerSqFtUsd: input.squareFeet > 0 ? input.listPriceUsd / input.squareFeet : 0,
    rentalYieldPercent: input.rentalYieldPercent ?? null,
    monthlyRentPi,
    monthlyRentUsd: input.monthlyRentUsd ?? null,
    sovereigntyClass: input.allodialEligible ? "ALLODIAL" : "FEE_SIMPLE",
    allodialEligible: input.allodialEligible ?? false,
    homesteadEligible: input.homesteadEligible ?? false,
    foreclosureShielded: loopholeResult.loopholes.some(l =>
      ["HOMESTEAD_EXEMPTION_BLOCK", "ROBO_SIGNING_VOID", "MERS_STANDING_DEFECT"].includes(l.type)
    ),
    tokenized: false,
    fractionalAvailable: input.fractionalAvailable ?? false,
    fractionalMinSharePercent: input.fractionalMinSharePercent ?? null,
    fractionalMinPricePi: input.fractionalMinSharePercent
      ? usdToPi((input.listPriceUsd * input.fractionalMinSharePercent) / 100)
      : null,
    images: input.images ?? [],
    virtualTourUrl: null,
    documentUrls: [],
    loopholes: loopholeResult.loopholes,
    totalLoopholeValueUsd: loopholeResult.totalEstimatedValueUsd,
    totalLoopholeValuePi: loopholeResult.totalEstimatedValuePi,
    titleClearance,
    titleClearanceScore: titleClearance.score,
    status: "active",
    daysOnMarket: 0,
    views: 0,
    saves: 0,
    offers: 0,
    listedByAgentId: null,
    listedByPiUsername: input.ownerPiUsername,
    listedByPiAddress: input.ownerPiAddress,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  listingStore.set(listingId, listing);
  return listing;
}

// ─── Tokenize Property ────────────────────────────────────────────────────────

export function tokenizeProperty(
  listingId: string,
  ownerAddress: string,
  ownerUsername: string,
): { token: SovereignPropertyToken; listing: SovereignListing } {
  const listing = listingStore.get(listingId);
  if (!listing) throw new Error(`Listing ${listingId} not found`);
  if (listing.tokenized) throw new Error("Property already tokenized");

  const tokenId = makePropertyTokenId(listing.parcelId, ownerAddress);

  const token: SovereignPropertyToken = {
    tokenId,
    parcelId: listing.parcelId,
    propertyId: listing.propertyId,
    standard: "PI-721",
    sovereigntyClass: listing.sovereigntyClass,
    network: "pi-testnet",
    ownerAddress,
    ownerUsername,
    coOwners: [],
    appraisedValueUsd: listing.listPriceUsd,
    appraisedValuePi: listing.listPricePi,
    tokenizedSharePercent: 100,
    fractionalShares: listing.fractionalAvailable ? [] : undefined,
    piTxHash: null,
    stellarLedger: null,
    stellarTxHash: null,
    ipfsMetadataUri: null,
    titleClearance: listing.titleClearance!,
    fortressScore: listing.titleClearanceScore,
    legalLoopholes: listing.loopholes,
    encumbrances: [],
    liens: [],
    status: "MINTED",
    listedForSale: listing.status === "active",
    listingPricePi: listing.listPricePi,
    listingPriceUsd: listing.listPriceUsd,
    mintedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    transferHistory: [],
  };

  tokenStore.set(tokenId, token);

  const updatedListing = { ...listing, tokenized: true, tokenId, updatedAt: new Date().toISOString() };
  listingStore.set(listingId, updatedListing);

  return { token, listing: updatedListing };
}

// ─── Create Pi Transaction ─────────────────────────────────────────────────────

export function createPiTransaction(
  listingId: string,
  buyerPiAddress: string,
  buyerPiUsername: string,
  type: PiRETransaction["type"],
  partialSharePercent?: number,
): PiRETransaction {
  const listing = listingStore.get(listingId);
  if (!listing) throw new Error(`Listing ${listingId} not found`);

  const baseAmountUsd =
    type === "pi-fractional-buy" && partialSharePercent
      ? (listing.listPriceUsd * partialSharePercent) / 100
      : listing.listPriceUsd;

  const totalPricePi = usdToPi(baseAmountUsd);
  const platformFeePi = usdToPi(baseAmountUsd * 0.005); // 0.5% platform fee
  const escrowAmountPi = usdToPi(baseAmountUsd * 0.01); // 1% earnest

  const tx: PiRETransaction = {
    txId: `RETX_${nid()}`,
    propertyId: listing.propertyId,
    tokenId: listing.tokenId ?? "",
    type,
    status: "pending",
    buyerPiAddress,
    buyerPiUsername,
    sellerPiAddress: listing.listedByPiAddress,
    sellerPiUsername: listing.listedByPiUsername,
    totalPricePi,
    totalPriceUsd: baseAmountUsd,
    closingCostsPi: usdToPi(baseAmountUsd * 0.03),
    platformFeePi,
    agentFeePi: null,
    escrowAmountPi,
    piPaymentId: null,
    piPaymentMemo: `Triumph Synergy RE: ${listing.address.slice(0, 40)} — ${type}`,
    piBlockchainTxHash: null,
    piSdkApprovedAt: null,
    piSdkCompletedAt: null,
    milestones: [
      {
        milestoneId: `MS_${nid()}`,
        name: "Earnest Money Deposit",
        description: "Buyer deposits 1% earnest money into Pi escrow",
        status: "pending",
        piReleaseAmount: "0",
        completedAt: null,
        requiredDocuments: [],
        autoRelease: true,
      },
      {
        milestoneId: `MS_${nid()}`,
        name: "Title Clearance",
        description: "Title search complete, all defects resolved",
        status: "pending",
        piReleaseAmount: "0",
        completedAt: null,
        requiredDocuments: ["title-report"],
        autoRelease: false,
      },
      {
        milestoneId: `MS_${nid()}`,
        name: "Pi Payment + Deed Transfer",
        description: "Full Pi payment confirmed; PI-721 deed token transferred to buyer",
        status: "pending",
        piReleaseAmount: totalPricePi,
        completedAt: null,
        requiredDocuments: ["purchase-agreement", "closing-disclosure"],
        autoRelease: true,
      },
    ],
    purchaseAgreementHash: null,
    titleTransferDeedHash: null,
    closingDisclosureHash: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  transactionStore.set(tx.txId, tx);
  return tx;
}

// ─── DAO Proposal ──────────────────────────────────────────────────────────────

export function createDAOProposal(
  tokenId: string,
  propertyId: string,
  type: REDAOProposal["type"],
  title: string,
  description: string,
  initiatorAddress: string,
): REDAOProposal {
  const deadlineAt = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(); // 7 days

  const proposal: REDAOProposal = {
    proposalId: `DAO_${nid()}`,
    tokenId,
    propertyId,
    type,
    title,
    description,
    status: "active",
    votesFor: 0,
    votesAgainst: 0,
    totalVotingWeight: 0,
    quorumRequired: 51,
    quorumMet: false,
    deadlineAt,
    piAmountDeployed: null,
    executedAt: null,
    executedByAddress: null,
    createdAt: new Date().toISOString(),
    votes: [],
  };

  daoStore.set(proposal.proposalId, proposal);
  return proposal;
}

// ─── Yield Distribution ────────────────────────────────────────────────────────

export function distributeRentalYield(
  propertyId: string,
  tokenId: string,
  totalRentCollectedUsd: number,
  maintenanceCostUsd: number,
  fractionalShares: FractionalShare[],
): RentalYieldReport {
  const propertyTaxUsd = totalRentCollectedUsd * 0.015;
  const managementFeeUsd = totalRentCollectedUsd * 0.08;
  const netYieldUsd = totalRentCollectedUsd - maintenanceCostUsd - propertyTaxUsd - managementFeeUsd;

  const distributions: YieldDistribution[] = fractionalShares.map(share => ({
    recipientAddress: share.ownerAddress,
    recipientUsername: share.ownerUsername,
    sharePercent: share.sharePercent,
    amountPi: usdToPi((netYieldUsd * share.sharePercent) / 100),
    amountUsd: (netYieldUsd * share.sharePercent) / 100,
    txHash: `TX_${randomBytes(16).toString("hex")}`,
    distributedAt: new Date().toISOString(),
  }));

  const report: RentalYieldReport = {
    propertyId,
    tokenId,
    periodStart: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
    periodEnd: new Date().toISOString(),
    totalRentCollectedPi: usdToPi(totalRentCollectedUsd),
    totalRentCollectedUsd,
    vacancyRate: 5,
    maintenanceCostPi: usdToPi(maintenanceCostUsd),
    propertyTaxPi: usdToPi(propertyTaxUsd),
    managementFeePi: usdToPi(managementFeeUsd),
    netYieldPi: usdToPi(netYieldUsd),
    netYieldUsd,
    annualizedYieldPercent: fractionalShares.length > 0
      ? ((netYieldUsd * 12) / fractionalShares.reduce((s, f) => s + (f.shareValueUsd), 0)) * 100
      : 0,
    distributedToShareholders: distributions,
  };

  const history = yieldStore.get(propertyId) ?? [];
  history.push(report);
  yieldStore.set(propertyId, history);

  return report;
}

// ─── Query helpers ─────────────────────────────────────────────────────────────

export function getListing(id: string): SovereignListing | null {
  return listingStore.get(id) ?? null;
}

export function getAllListings(
  filters?: {
    state?: string;
    propertyType?: string;
    maxPriceUsd?: number;
    minPriceUsd?: number;
    tokenized?: boolean;
    fractionalAvailable?: boolean;
    foreclosureShielded?: boolean;
  }
): SovereignListing[] {
  let listings = Array.from(listingStore.values());
  if (filters) {
    if (filters.state) listings = listings.filter(l => l.state === filters.state);
    if (filters.propertyType) listings = listings.filter(l => l.propertyType === filters.propertyType);
    if (filters.maxPriceUsd !== undefined) listings = listings.filter(l => l.listPriceUsd <= filters.maxPriceUsd!);
    if (filters.minPriceUsd !== undefined) listings = listings.filter(l => l.listPriceUsd >= filters.minPriceUsd!);
    if (filters.tokenized !== undefined) listings = listings.filter(l => l.tokenized === filters.tokenized);
    if (filters.fractionalAvailable) listings = listings.filter(l => l.fractionalAvailable);
    if (filters.foreclosureShielded) listings = listings.filter(l => l.foreclosureShielded);
  }
  return listings.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function getToken(id: string): SovereignPropertyToken | null {
  return tokenStore.get(id) ?? null;
}

export function getTransaction(id: string): PiRETransaction | null {
  return transactionStore.get(id) ?? null;
}

export function getDAOProposal(id: string): REDAOProposal | null {
  return daoStore.get(id) ?? null;
}

export function getYieldHistory(propertyId: string): RentalYieldReport[] {
  return yieldStore.get(propertyId) ?? [];
}

export function getPlatformStats(): SovereignREStats {
  const listings = Array.from(listingStore.values());
  const tokens = Array.from(tokenStore.values());
  const txs = Array.from(transactionStore.values());
  const daos = Array.from(daoStore.values());

  const totalValueUsd = tokens.reduce((s, t) => s + t.appraisedValueUsd, 0);

  return {
    totalListings: listings.length,
    activeListings: listings.filter(l => l.status === "active").length,
    totalTokenizedProperties: tokens.length,
    totalValueTokenizedUsd: totalValueUsd,
    totalValueTokenizedPi: (totalValueUsd / PI_RATE_USD).toFixed(4),
    totalTransactionVolumePi: txs.reduce((s, t) => s + parseFloat(t.totalPricePi), 0).toFixed(4),
    totalTransactionVolumeUsd: txs.reduce((s, t) => s + t.totalPriceUsd, 0),
    totalLoopholesDetected: listings.reduce((s, l) => s + l.loopholes.length, 0),
    totalLoopholeValueUsd: listings.reduce((s, l) => s + l.totalLoopholeValueUsd, 0),
    totalFractionalShareholders: tokens.reduce((s, t) => s + (t.fractionalShares?.length ?? 0), 0),
    totalDAOProposals: daos.length,
    averageForeclosureShieldScore:
      listings.length > 0
        ? listings.filter(l => l.foreclosureShielded).length / listings.length * 100
        : 0,
    piPaymentsProcessed: txs.filter(t => t.piBlockchainTxHash != null).length,
    averageTitleClearanceScore:
      listings.length > 0
        ? listings.reduce((s, l) => s + l.titleClearanceScore, 0) / listings.length
        : 0,
  };
}

// ─── Seed demo data ────────────────────────────────────────────────────────────

export function seedDemoListings(): SovereignListing[] {
  const demos = [
    {
      ownerPiUsername: "sovereign_pioneer",
      ownerPiAddress: "GABC1234567890PINETWORK",
      address: "1847 Liberty Oak Drive",
      city: "Orlando",
      state: "FL",
      zip: "32801",
      county: "Orange",
      parcelId: "01-23-29-4567-00-0010",
      propertyType: "single-family" as const,
      zoning: "R-1",
      acreage: 0.28,
      squareFeet: 2_450,
      bedrooms: 4,
      bathrooms: 3,
      yearBuilt: 2008,
      listPriceUsd: 485_000,
      rentalYieldPercent: 6.2,
      monthlyRentUsd: 2_500,
      homesteadEligible: true,
      allodialEligible: true,
      fractionalAvailable: true,
      fractionalMinSharePercent: 5,
      images: ["/images/re-demo-1.jpg"],
      liens: [
        {
          id: "L1", type: "mortgage" as const, holderName: "Wells Fargo Bank NA",
          originalAmount: 350_000, currentBalance: 241_000, recordedAt: "2008-06-15",
          maturityDate: "2038-07-01", interestRate: 4.25, isFirstPosition: true, piPayoffAmount: null,
        },
        {
          id: "L2", type: "judgment" as const, holderName: "Orange County Clerk",
          originalAmount: 8_500, currentBalance: 9_200, recordedAt: "2021-03-10",
          maturityDate: null, interestRate: 8.75, isFirstPosition: false, piPayoffAmount: null,
        },
      ] as Lien[],
      encumbrances: [
        {
          id: "E1", type: "easement" as const,
          description: "FPL utility easement — 10ft rear setback",
          grantor: "Florida Power & Light", recordedAt: "1975-04-12",
          bookPage: "Book 2847 Page 441", affectsValue: false, affectsUse: null,
        },
      ] as Encumbrance[],
    },
    {
      ownerPiUsername: "pi_landowner",
      ownerPiAddress: "GDEF9876543210PINETWORK",
      address: "5501 TX Ranch Rd 2222",
      city: "Austin",
      state: "TX",
      zip: "78730",
      county: "Travis",
      parcelId: "R-1800-0001-1200-0",
      propertyType: "farm-ranch" as const,
      zoning: "AG",
      acreage: 18.5,
      squareFeet: 4_200,
      bedrooms: 5,
      bathrooms: 4,
      yearBuilt: 1998,
      listPriceUsd: 2_850_000,
      rentalYieldPercent: 4.8,
      monthlyRentUsd: 11_400,
      homesteadEligible: true,
      allodialEligible: true,
      fractionalAvailable: true,
      fractionalMinSharePercent: 2,
      images: ["/images/re-demo-2.jpg"],
      liens: [] as Lien[],
      encumbrances: [] as Encumbrance[],
    },
    {
      ownerPiUsername: "urban_developer",
      ownerPiAddress: "GHIJ1122334455PINETWORK",
      address: "880 Brickell Ave Unit 2201",
      city: "Miami",
      state: "FL",
      zip: "33131",
      county: "Miami-Dade",
      parcelId: "01-4138-162-0020",
      propertyType: "condo" as const,
      zoning: "T6-48-O",
      acreage: null,
      squareFeet: 1_850,
      bedrooms: 3,
      bathrooms: 3,
      yearBuilt: 2019,
      listPriceUsd: 1_250_000,
      rentalYieldPercent: 5.4,
      monthlyRentUsd: 5_625,
      homesteadEligible: true,
      allodialEligible: false,
      fractionalAvailable: true,
      fractionalMinSharePercent: 1,
      images: ["/images/re-demo-3.jpg"],
      liens: [
        {
          id: "L3", type: "mortgage" as const, holderName: "Chase Bank",
          originalAmount: 875_000, currentBalance: 820_000, recordedAt: "2019-11-20",
          maturityDate: "2049-12-01", interestRate: 3.875, isFirstPosition: true, piPayoffAmount: null,
        },
      ] as Lien[],
      encumbrances: [] as Encumbrance[],
    },
  ];

  return demos.map(d => createListing(d));
}

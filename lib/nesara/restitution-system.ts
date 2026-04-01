/**
 * NESARA Restitution & Historical Tax Recovery System
 * 
 * Manages the recovery and distribution of:
 * - Illegal federal income taxes since 1913
 * - Illegal banking fees and interest
 * - Fraudulent government fees
 * - Corporate overcharges
 * 
 * @module lib/nesara/restitution-system
 * @version 1.0.0
 */

// ============================================================================
// TYPES
// ============================================================================

export type RestitutionCategory =
  | "federal-income-tax"
  | "state-income-tax"
  | "social-security-tax"
  | "medicare-tax"
  | "credit-card-interest"
  | "mortgage-interest"
  | "student-loan-interest"
  | "auto-loan-interest"
  | "banking-fees"
  | "overdraft-fees"
  | "government-fines"
  | "utility-overcharges"
  | "medical-overcharges"
  | "insurance-overcharges"
  | "corporate-fraud";

export type ClaimStatus =
  | "draft"
  | "submitted"
  | "under-review"
  | "verified"
  | "approved"
  | "partial-payment"
  | "paid"
  | "denied"
  | "appealed";

export type RestitutionClaim = {
  id: string;
  claimantId: string;
  claimantName: string;
  
  // Claim Details
  category: RestitutionCategory;
  subcategory: string | null;
  description: string;
  
  // Financial
  claimedAmount: number;
  verifiedAmount: number;
  paidAmount: number;
  
  // Time Period
  startYear: number;
  endYear: number;
  
  // Evidence
  evidence: {
    type: string;
    description: string;
    verificationStatus: "pending" | "verified" | "rejected";
    uploadDate: Date;
  }[];
  
  // Processing
  status: ClaimStatus;
  filedDate: Date;
  reviewedDate: Date | null;
  approvedDate: Date | null;
  paymentSchedule: {
    installment: number;
    amount: number;
    scheduledDate: Date;
    paidDate: Date | null;
  }[];
  
  // Notes
  reviewNotes: string[];
  qfsTransactionIds: string[];
};

export type RestitutionProfile = {
  id: string;
  userId: string;
  name: string;
  
  // Total Restitution
  totalClaimed: number;
  totalVerified: number;
  totalPaid: number;
  
  // Claims
  activeClaims: number;
  approvedClaims: number;
  deniedClaims: number;
  
  // Categories
  categoryBreakdown: Partial<Record<RestitutionCategory, {
    claimed: number;
    verified: number;
    paid: number;
  }>>;
  
  createdAt: Date;
  lastActivityAt: Date;
};

export type RestitutionEstimate = {
  category: RestitutionCategory;
  label: string;
  estimatedAmount: number;
  yearsApplicable: number;
  methodology: string;
  confidence: "low" | "medium" | "high";
};

// ============================================================================
// CALCULATION HELPERS
// ============================================================================

const AVERAGE_ANNUAL_INCOME_BY_DECADE: Record<string, number> = {
  "1910": 750,
  "1920": 1500,
  "1930": 1200,
  "1940": 1300,
  "1950": 3300,
  "1960": 5600,
  "1970": 9800,
  "1980": 19500,
  "1990": 32000,
  "2000": 42000,
  "2010": 50000,
  "2020": 58000,
};

const AVERAGE_TAX_RATE_BY_DECADE: Record<string, number> = {
  "1910": 0.01,
  "1920": 0.04,
  "1930": 0.04,
  "1940": 0.20,
  "1950": 0.20,
  "1960": 0.22,
  "1970": 0.22,
  "1980": 0.25,
  "1990": 0.28,
  "2000": 0.27,
  "2010": 0.24,
  "2020": 0.22,
};

function getDecade(year: number): string {
  const decade = Math.floor(year / 10) * 10;
  return Math.max(1910, Math.min(2020, decade)).toString();
}

function calculateCompoundInterest(
  principal: number,
  years: number,
  rate: number = 0.05
): number {
  return principal * Math.pow(1 + rate, years);
}

// ============================================================================
// RESTITUTION SYSTEM
// ============================================================================

export class RestitutionSystem {
  private static instance: RestitutionSystem;
  
  private profiles: Map<string, RestitutionProfile> = new Map();
  private claims: Map<string, RestitutionClaim> = new Map();
  
  private constructor() {}
  
  static getInstance(): RestitutionSystem {
    if (!RestitutionSystem.instance) {
      RestitutionSystem.instance = new RestitutionSystem();
    }
    return RestitutionSystem.instance;
  }
  
  private generateId(): string {
    return `RST-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
  }
  
  // ==========================================================================
  // PROFILE MANAGEMENT
  // ==========================================================================
  
  createProfile(userId: string, name: string): RestitutionProfile {
    const id = this.generateId();
    
    const profile: RestitutionProfile = {
      id,
      userId,
      name,
      totalClaimed: 0,
      totalVerified: 0,
      totalPaid: 0,
      activeClaims: 0,
      approvedClaims: 0,
      deniedClaims: 0,
      categoryBreakdown: {},
      createdAt: new Date(),
      lastActivityAt: new Date(),
    };
    
    this.profiles.set(id, profile);
    return profile;
  }
  
  getProfile(profileId: string): RestitutionProfile | undefined {
    return this.profiles.get(profileId);
  }
  
  getProfileByUserId(userId: string): RestitutionProfile | undefined {
    return Array.from(this.profiles.values()).find(p => p.userId === userId);
  }
  
  // ==========================================================================
  // ESTIMATION
  // ==========================================================================
  
  estimateRestitution(
    birthYear: number,
    workingYearsStart: number = birthYear + 18,
    workingYearsEnd: number = new Date().getFullYear()
  ): RestitutionEstimate[] {
    const currentYear = new Date().getFullYear();
    const estimates: RestitutionEstimate[] = [];
    
    // Federal Income Tax Restitution
    let totalTaxPaid = 0;
    for (let year = Math.max(1913, workingYearsStart); year <= Math.min(currentYear, workingYearsEnd); year++) {
      const decade = getDecade(year);
      const income = AVERAGE_ANNUAL_INCOME_BY_DECADE[decade] || 50000;
      const taxRate = AVERAGE_TAX_RATE_BY_DECADE[decade] || 0.22;
      const taxPaid = income * taxRate;
      totalTaxPaid += calculateCompoundInterest(taxPaid, currentYear - year);
    }
    
    estimates.push({
      category: "federal-income-tax",
      label: "Federal Income Tax (Unconstitutional since 1913)",
      estimatedAmount: Math.round(totalTaxPaid),
      yearsApplicable: Math.min(currentYear, workingYearsEnd) - Math.max(1913, workingYearsStart),
      methodology: "Average annual income by decade × tax rate, compounded at 5% annually",
      confidence: "medium",
    });
    
    // Social Security Tax
    let ssTotal = 0;
    for (let year = Math.max(1937, workingYearsStart); year <= Math.min(currentYear, workingYearsEnd); year++) {
      const decade = getDecade(year);
      const income = AVERAGE_ANNUAL_INCOME_BY_DECADE[decade] || 50000;
      const ssTax = income * 0.062; // 6.2% employee share
      ssTotal += calculateCompoundInterest(ssTax, currentYear - year);
    }
    
    estimates.push({
      category: "social-security-tax",
      label: "Social Security Tax (Fraudulent Trust Fund)",
      estimatedAmount: Math.round(ssTotal),
      yearsApplicable: Math.min(currentYear, workingYearsEnd) - Math.max(1937, workingYearsStart),
      methodology: "6.2% of average income, compounded at 5% annually",
      confidence: "high",
    });
    
    // Medicare Tax
    let medicareTotal = 0;
    for (let year = Math.max(1966, workingYearsStart); year <= Math.min(currentYear, workingYearsEnd); year++) {
      const decade = getDecade(year);
      const income = AVERAGE_ANNUAL_INCOME_BY_DECADE[decade] || 50000;
      const medTax = income * 0.0145;
      medicareTotal += calculateCompoundInterest(medTax, currentYear - year);
    }
    
    estimates.push({
      category: "medicare-tax",
      label: "Medicare Tax",
      estimatedAmount: Math.round(medicareTotal),
      yearsApplicable: Math.min(currentYear, workingYearsEnd) - Math.max(1966, workingYearsStart),
      methodology: "1.45% of average income, compounded at 5% annually",
      confidence: "high",
    });
    
    // Banking Fees Estimate
    const bankingYears = Math.max(0, workingYearsEnd - workingYearsStart);
    const avgAnnualFees = 500;
    let bankingTotal = 0;
    for (let i = 0; i < bankingYears; i++) {
      bankingTotal += calculateCompoundInterest(avgAnnualFees, i);
    }
    
    estimates.push({
      category: "banking-fees",
      label: "Banking Fees (Illegal Charges)",
      estimatedAmount: Math.round(bankingTotal),
      yearsApplicable: bankingYears,
      methodology: "Average $500/year in fees, compounded at 5%",
      confidence: "low",
    });
    
    // Credit Card Interest
    const ccYears = Math.max(0, Math.min(currentYear, workingYearsEnd) - Math.max(1980, workingYearsStart));
    const avgAnnualCCInterest = 1200;
    let ccTotal = 0;
    for (let i = 0; i < ccYears; i++) {
      ccTotal += calculateCompoundInterest(avgAnnualCCInterest, i);
    }
    
    estimates.push({
      category: "credit-card-interest",
      label: "Credit Card Interest (Usurious Rates)",
      estimatedAmount: Math.round(ccTotal),
      yearsApplicable: ccYears,
      methodology: "Average $1,200/year in interest, compounded at 5%",
      confidence: "low",
    });
    
    return estimates;
  }
  
  getTotalEstimate(estimates: RestitutionEstimate[]): number {
    return estimates.reduce((sum, e) => sum + e.estimatedAmount, 0);
  }
  
  // ==========================================================================
  // CLAIMS
  // ==========================================================================
  
  createClaim(
    profileId: string,
    category: RestitutionCategory,
    details: {
      description: string;
      claimedAmount: number;
      startYear: number;
      endYear: number;
      subcategory?: string;
    }
  ): RestitutionClaim {
    const profile = this.profiles.get(profileId);
    if (!profile) {
      throw new Error(`Profile ${profileId} not found`);
    }
    
    const id = this.generateId();
    
    const claim: RestitutionClaim = {
      id,
      claimantId: profileId,
      claimantName: profile.name,
      category,
      subcategory: details.subcategory || null,
      description: details.description,
      claimedAmount: details.claimedAmount,
      verifiedAmount: 0,
      paidAmount: 0,
      startYear: details.startYear,
      endYear: details.endYear,
      evidence: [],
      status: "draft",
      filedDate: new Date(),
      reviewedDate: null,
      approvedDate: null,
      paymentSchedule: [],
      reviewNotes: [],
      qfsTransactionIds: [],
    };
    
    this.claims.set(id, claim);
    
    // Update profile
    profile.activeClaims++;
    profile.totalClaimed += details.claimedAmount;
    
    if (!profile.categoryBreakdown[category]) {
      profile.categoryBreakdown[category] = { claimed: 0, verified: 0, paid: 0 };
    }
    profile.categoryBreakdown[category]!.claimed += details.claimedAmount;
    profile.lastActivityAt = new Date();
    
    return claim;
  }
  
  submitClaim(claimId: string): RestitutionClaim {
    const claim = this.claims.get(claimId);
    if (!claim) {
      throw new Error(`Claim ${claimId} not found`);
    }
    
    if (claim.status !== "draft") {
      throw new Error(`Claim ${claimId} is not in draft status`);
    }
    
    claim.status = "submitted";
    return claim;
  }
  
  verifyClaim(claimId: string, verifiedAmount: number, notes: string[]): RestitutionClaim {
    const claim = this.claims.get(claimId);
    if (!claim) {
      throw new Error(`Claim ${claimId} not found`);
    }
    
    claim.verifiedAmount = verifiedAmount;
    claim.status = "verified";
    claim.reviewedDate = new Date();
    claim.reviewNotes.push(...notes);
    
    // Update profile
    const profile = this.profiles.get(claim.claimantId);
    if (profile) {
      profile.totalVerified += verifiedAmount;
      if (profile.categoryBreakdown[claim.category]) {
        profile.categoryBreakdown[claim.category]!.verified += verifiedAmount;
      }
    }
    
    return claim;
  }
  
  approveClaim(claimId: string, paymentInstallments: number = 12): RestitutionClaim {
    const claim = this.claims.get(claimId);
    if (!claim) {
      throw new Error(`Claim ${claimId} not found`);
    }
    
    claim.status = "approved";
    claim.approvedDate = new Date();
    
    // Create payment schedule
    const installmentAmount = Math.ceil(claim.verifiedAmount / paymentInstallments);
    claim.paymentSchedule = [];
    
    for (let i = 0; i < paymentInstallments; i++) {
      const scheduledDate = new Date();
      scheduledDate.setMonth(scheduledDate.getMonth() + i);
      
      claim.paymentSchedule.push({
        installment: i + 1,
        amount: i === paymentInstallments - 1 
          ? claim.verifiedAmount - (installmentAmount * (paymentInstallments - 1))
          : installmentAmount,
        scheduledDate,
        paidDate: null,
      });
    }
    
    // Update profile
    const profile = this.profiles.get(claim.claimantId);
    if (profile) {
      profile.activeClaims--;
      profile.approvedClaims++;
    }
    
    return claim;
  }
  
  recordPayment(claimId: string, installment: number, qfsTransactionId: string): RestitutionClaim {
    const claim = this.claims.get(claimId);
    if (!claim) {
      throw new Error(`Claim ${claimId} not found`);
    }
    
    const payment = claim.paymentSchedule.find(p => p.installment === installment);
    if (!payment) {
      throw new Error(`Installment ${installment} not found`);
    }
    
    payment.paidDate = new Date();
    claim.paidAmount += payment.amount;
    claim.qfsTransactionIds.push(qfsTransactionId);
    
    // Check if fully paid
    if (claim.paymentSchedule.every(p => p.paidDate !== null)) {
      claim.status = "paid";
    } else {
      claim.status = "partial-payment";
    }
    
    // Update profile
    const profile = this.profiles.get(claim.claimantId);
    if (profile) {
      profile.totalPaid += payment.amount;
      if (profile.categoryBreakdown[claim.category]) {
        profile.categoryBreakdown[claim.category]!.paid += payment.amount;
      }
    }
    
    return claim;
  }
  
  getClaim(claimId: string): RestitutionClaim | undefined {
    return this.claims.get(claimId);
  }
  
  getClaimsForProfile(profileId: string): RestitutionClaim[] {
    return Array.from(this.claims.values()).filter(c => c.claimantId === profileId);
  }
  
  // ==========================================================================
  // STATISTICS
  // ==========================================================================
  
  getSystemStats(): {
    totalProfiles: number;
    totalClaims: number;
    totalClaimed: number;
    totalVerified: number;
    totalPaid: number;
    claimsByStatus: Record<ClaimStatus, number>;
    claimsByCategory: Partial<Record<RestitutionCategory, number>>;
  } {
    const claims = Array.from(this.claims.values());
    
    const claimsByStatus: Record<ClaimStatus, number> = {
      draft: 0,
      submitted: 0,
      "under-review": 0,
      verified: 0,
      approved: 0,
      "partial-payment": 0,
      paid: 0,
      denied: 0,
      appealed: 0,
    };
    
    const claimsByCategory: Partial<Record<RestitutionCategory, number>> = {};
    
    for (const claim of claims) {
      claimsByStatus[claim.status]++;
      claimsByCategory[claim.category] = (claimsByCategory[claim.category] || 0) + 1;
    }
    
    return {
      totalProfiles: this.profiles.size,
      totalClaims: claims.length,
      totalClaimed: claims.reduce((sum, c) => sum + c.claimedAmount, 0),
      totalVerified: claims.reduce((sum, c) => sum + c.verifiedAmount, 0),
      totalPaid: claims.reduce((sum, c) => sum + c.paidAmount, 0),
      claimsByStatus,
      claimsByCategory,
    };
  }
}

// Singleton export
export const restitutionSystem = RestitutionSystem.getInstance();

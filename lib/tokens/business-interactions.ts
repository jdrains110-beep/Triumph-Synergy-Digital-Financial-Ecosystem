/**
 * Business Interactions System
 * 
 * Manages token interactions between:
 * - Companies and businesses
 * - Employers and employees
 * - Merchants and customers
 * - Partners and affiliates
 */

import { EventEmitter } from "events";
import { tokenRewardSystem, type TokenType } from "./token-reward-system";

// ============================================================================
// Types
// ============================================================================

export type BusinessType = 
  | "corporation"
  | "small-business"
  | "startup"
  | "nonprofit"
  | "merchant"
  | "freelancer"
  | "cooperative";

export type EmploymentType =
  | "full-time"
  | "part-time"
  | "contract"
  | "freelance"
  | "intern"
  | "volunteer";

export type IncentiveType =
  | "bonus"
  | "performance"
  | "referral"
  | "loyalty"
  | "achievement"
  | "holiday"
  | "milestone";

export interface Business {
  id: string;
  walletId: string;
  name: string;
  type: BusinessType;
  industry: string;
  description?: string;
  ownerId: string;
  tokenPool: number;           // Tokens allocated for rewards
  piBalance: number;           // Pi reserves
  employeeCount: number;
  loyaltyProgram?: LoyaltyProgram;
  affiliateProgram?: AffiliateProgram;
  verified: boolean;
  tier: "bronze" | "silver" | "gold" | "platinum";
  createdAt: Date;
}

export interface Employee {
  id: string;
  walletId: string;
  userId: string;
  businessId: string;
  role: string;
  department: string;
  employmentType: EmploymentType;
  hourlyRate?: number;         // In tokens
  monthlyAllowance?: number;   // Token allowance
  performanceScore: number;
  tokensEarned: number;
  piEarned: number;
  hiredAt: Date;
  active: boolean;
}

export interface LoyaltyProgram {
  id: string;
  businessId: string;
  name: string;
  tokenType: TokenType;
  pointsPerPi: number;        // Loyalty points per Pi spent
  tiers: LoyaltyTier[];
  totalMembers: number;
  totalPointsIssued: number;
  active: boolean;
  createdAt: Date;
}

export interface LoyaltyTier {
  name: string;
  minPoints: number;
  discountPercent: number;
  tokenMultiplier: number;
  perks: string[];
}

export interface LoyaltyMember {
  id: string;
  customerId: string;
  walletId: string;
  programId: string;
  businessId: string;
  points: number;
  tier: string;
  totalSpent: number;          // In Pi
  totalEarned: number;         // Token rewards
  visits: number;
  joinedAt: Date;
  lastActivity: Date;
}

export interface AffiliateProgram {
  id: string;
  businessId: string;
  name: string;
  commissionPercent: number;
  tokenBonus: number;
  tieredCommissions: TieredCommission[];
  active: boolean;
}

export interface TieredCommission {
  minReferrals: number;
  commissionPercent: number;
  tokenBonus: number;
}

export interface Affiliate {
  id: string;
  userId: string;
  walletId: string;
  programId: string;
  businessId: string;
  referralCode: string;
  referralCount: number;
  totalCommission: number;    // In Pi
  totalTokensEarned: number;
  currentTier: number;
  joinedAt: Date;
}

export interface EmployeeIncentive {
  id: string;
  employeeId: string;
  businessId: string;
  type: IncentiveType;
  amount: number;
  tokenType: TokenType;
  reason: string;
  awardedBy: string;
  piEquivalent: number;
  awardedAt: Date;
}

export interface BusinessTransaction {
  id: string;
  type: "purchase" | "refund" | "reward" | "payout" | "commission";
  businessId: string;
  customerId?: string;
  employeeId?: string;
  affiliateId?: string;
  amount: number;
  tokenType: TokenType;
  piAmount: number;
  description: string;
  timestamp: Date;
}

export interface Partnership {
  id: string;
  business1Id: string;
  business2Id: string;
  type: "referral" | "cross-promotion" | "joint-venture" | "supplier";
  tokenShare: number;          // Percentage of shared token rewards
  active: boolean;
  terms: string;
  startDate: Date;
  endDate?: Date;
}

// ============================================================================
// Business Interaction Manager
// ============================================================================

class BusinessInteractionManager extends EventEmitter {
  private static instance: BusinessInteractionManager;
  
  private businesses: Map<string, Business> = new Map();
  private employees: Map<string, Employee> = new Map();
  private loyaltyPrograms: Map<string, LoyaltyProgram> = new Map();
  private loyaltyMembers: Map<string, LoyaltyMember> = new Map();
  private affiliatePrograms: Map<string, AffiliateProgram> = new Map();
  private affiliates: Map<string, Affiliate> = new Map();
  private incentives: Map<string, EmployeeIncentive> = new Map();
  private transactions: Map<string, BusinessTransaction> = new Map();
  private partnerships: Map<string, Partnership> = new Map();
  
  // Indexes
  private employeesByBusiness: Map<string, Set<string>> = new Map();
  private membersByProgram: Map<string, Set<string>> = new Map();
  private affiliatesByProgram: Map<string, Set<string>> = new Map();
  private affiliateByCode: Map<string, string> = new Map();
  
  private constructor() {
    super();
    this.setMaxListeners(100);
  }
  
  static getInstance(): BusinessInteractionManager {
    if (!BusinessInteractionManager.instance) {
      BusinessInteractionManager.instance = new BusinessInteractionManager();
    }
    return BusinessInteractionManager.instance;
  }
  
  // ==========================================================================
  // Business Management
  // ==========================================================================
  
  /**
   * Register a new business
   */
  registerBusiness(params: {
    ownerId: string;
    ownerWalletId: string;
    name: string;
    type: BusinessType;
    industry: string;
    description?: string;
    initialTokenPool?: number;
    initialPiBalance?: number;
  }): Business {
    // Create business wallet
    const businessWalletId = `biz-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    tokenRewardSystem.createWallet(businessWalletId, "business");
    
    const id = `business-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    
    const business: Business = {
      id,
      walletId: businessWalletId,
      name: params.name,
      type: params.type,
      industry: params.industry,
      description: params.description,
      ownerId: params.ownerId,
      tokenPool: params.initialTokenPool || 0,
      piBalance: params.initialPiBalance || 0,
      employeeCount: 0,
      verified: false,
      tier: "bronze",
      createdAt: new Date(),
    };
    
    this.businesses.set(id, business);
    this.employeesByBusiness.set(id, new Set());
    
    // Mint initial business tokens
    if (params.initialTokenPool && params.initialTokenPool > 0) {
      tokenRewardSystem.mintTokens({
        toWalletId: businessWalletId,
        tokenType: "TRIUMPH",
        amount: params.initialTokenPool,
        description: "Business initial token pool",
      });
    }
    
    this.emit("business-registered", { business });
    return business;
  }
  
  /**
   * Fund business token pool
   */
  fundTokenPool(businessId: string, amount: number, tokenType: TokenType = "TRIUMPH"): Business {
    const business = this.businesses.get(businessId);
    if (!business) throw new Error("Business not found");
    
    tokenRewardSystem.mintTokens({
      toWalletId: business.walletId,
      tokenType,
      amount,
      description: "Token pool funding",
    });
    
    business.tokenPool += amount;
    this.emit("pool-funded", { businessId, amount });
    return business;
  }
  
  /**
   * Upgrade business tier
   */
  upgradeTier(businessId: string): Business {
    const business = this.businesses.get(businessId);
    if (!business) throw new Error("Business not found");
    
    const tiers: Business["tier"][] = ["bronze", "silver", "gold", "platinum"];
    const currentIndex = tiers.indexOf(business.tier);
    
    if (currentIndex < tiers.length - 1) {
      business.tier = tiers[currentIndex + 1];
      this.emit("tier-upgraded", { business });
    }
    
    return business;
  }
  
  // ==========================================================================
  // Employee Management
  // ==========================================================================
  
  /**
   * Hire an employee
   */
  hireEmployee(params: {
    businessId: string;
    userId: string;
    role: string;
    department: string;
    employmentType: EmploymentType;
    hourlyRate?: number;
    monthlyAllowance?: number;
  }): Employee {
    const business = this.businesses.get(params.businessId);
    if (!business) throw new Error("Business not found");
    
    // Create employee wallet if not exists
    const employeeWalletId = `emp-${params.userId}-${params.businessId}`;
    try {
      tokenRewardSystem.createWallet(employeeWalletId, "individual");
    } catch {
      // Wallet already exists
    }
    
    const id = `employee-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    
    const employee: Employee = {
      id,
      walletId: employeeWalletId,
      userId: params.userId,
      businessId: params.businessId,
      role: params.role,
      department: params.department,
      employmentType: params.employmentType,
      hourlyRate: params.hourlyRate,
      monthlyAllowance: params.monthlyAllowance,
      performanceScore: 100,
      tokensEarned: 0,
      piEarned: 0,
      hiredAt: new Date(),
      active: true,
    };
    
    this.employees.set(id, employee);
    this.employeesByBusiness.get(params.businessId)!.add(id);
    business.employeeCount++;
    
    // Welcome bonus
    const welcomeBonus = tokenRewardSystem.rewardEmployee({
      employeeWalletId,
      employerWalletId: business.walletId,
      tokenType: "WORK",
      amount: 100,
      reason: "Welcome bonus",
    });
    
    employee.tokensEarned += welcomeBonus.amount;
    
    this.emit("employee-hired", { employee, business });
    return employee;
  }
  
  /**
   * Reward an employee
   */
  rewardEmployee(params: {
    employeeId: string;
    type: IncentiveType;
    amount: number;
    tokenType?: TokenType;
    reason: string;
    awardedBy: string;
  }): EmployeeIncentive {
    const employee = this.employees.get(params.employeeId);
    if (!employee) throw new Error("Employee not found");
    
    const business = this.businesses.get(employee.businessId);
    if (!business) throw new Error("Business not found");
    
    const tokenType = params.tokenType || "WORK";
    
    // Transfer tokens from business to employee
    const tx = tokenRewardSystem.rewardEmployee({
      employeeWalletId: employee.walletId,
      employerWalletId: business.walletId,
      tokenType,
      amount: params.amount,
      reason: params.reason,
    });
    
    employee.tokensEarned += tx.amount;
    employee.piEarned += tx.piEquivalent;
    
    const id = `incentive-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    
    const incentive: EmployeeIncentive = {
      id,
      employeeId: params.employeeId,
      businessId: employee.businessId,
      type: params.type,
      amount: params.amount,
      tokenType,
      reason: params.reason,
      awardedBy: params.awardedBy,
      piEquivalent: tx.piEquivalent,
      awardedAt: new Date(),
    };
    
    this.incentives.set(id, incentive);
    this.emit("employee-rewarded", { employee, incentive });
    return incentive;
  }
  
  /**
   * Process monthly allowance for all employees
   */
  processMonthlyAllowances(businessId: string): { processed: number; totalTokens: number } {
    const business = this.businesses.get(businessId);
    if (!business) throw new Error("Business not found");
    
    const employeeIds = this.employeesByBusiness.get(businessId);
    if (!employeeIds) return { processed: 0, totalTokens: 0 };
    
    let processed = 0;
    let totalTokens = 0;
    
    for (const empId of employeeIds) {
      const employee = this.employees.get(empId);
      if (!employee || !employee.active || !employee.monthlyAllowance) continue;
      
      const tx = tokenRewardSystem.rewardEmployee({
        employeeWalletId: employee.walletId,
        employerWalletId: business.walletId,
        tokenType: "WORK",
        amount: employee.monthlyAllowance,
        reason: "Monthly allowance",
      });
      
      employee.tokensEarned += tx.amount;
      processed++;
      totalTokens += tx.amount;
    }
    
    this.emit("allowances-processed", { businessId, processed, totalTokens });
    return { processed, totalTokens };
  }
  
  /**
   * Update employee performance score
   */
  updatePerformance(employeeId: string, score: number): Employee {
    const employee = this.employees.get(employeeId);
    if (!employee) throw new Error("Employee not found");
    
    const oldScore = employee.performanceScore;
    employee.performanceScore = Math.min(200, Math.max(0, score));
    
    // Performance bonus for improvement
    if (employee.performanceScore > oldScore && employee.performanceScore >= 150) {
      this.rewardEmployee({
        employeeId,
        type: "performance",
        amount: (employee.performanceScore - oldScore) * 5,
        tokenType: "WORK",
        reason: "Performance improvement bonus",
        awardedBy: "system",
      });
    }
    
    return employee;
  }
  
  // ==========================================================================
  // Loyalty Programs
  // ==========================================================================
  
  /**
   * Create a loyalty program
   */
  createLoyaltyProgram(params: {
    businessId: string;
    name: string;
    tokenType?: TokenType;
    pointsPerPi?: number;
    tiers?: LoyaltyTier[];
  }): LoyaltyProgram {
    const business = this.businesses.get(params.businessId);
    if (!business) throw new Error("Business not found");
    
    const id = `loyalty-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    
    const defaultTiers: LoyaltyTier[] = [
      { name: "Bronze", minPoints: 0, discountPercent: 0, tokenMultiplier: 1, perks: ["Newsletter"] },
      { name: "Silver", minPoints: 1000, discountPercent: 5, tokenMultiplier: 1.25, perks: ["Priority support", "Early access"] },
      { name: "Gold", minPoints: 5000, discountPercent: 10, tokenMultiplier: 1.5, perks: ["Free shipping", "Exclusive deals"] },
      { name: "Platinum", minPoints: 15000, discountPercent: 15, tokenMultiplier: 2, perks: ["VIP access", "Personal advisor"] },
    ];
    
    const program: LoyaltyProgram = {
      id,
      businessId: params.businessId,
      name: params.name,
      tokenType: params.tokenType || "LOYALTY",
      pointsPerPi: params.pointsPerPi || 10,
      tiers: params.tiers || defaultTiers,
      totalMembers: 0,
      totalPointsIssued: 0,
      active: true,
      createdAt: new Date(),
    };
    
    this.loyaltyPrograms.set(id, program);
    this.membersByProgram.set(id, new Set());
    business.loyaltyProgram = program;
    
    this.emit("loyalty-program-created", { program, business });
    return program;
  }
  
  /**
   * Join a loyalty program
   */
  joinLoyaltyProgram(params: {
    customerId: string;
    customerWalletId: string;
    programId: string;
  }): LoyaltyMember {
    const program = this.loyaltyPrograms.get(params.programId);
    if (!program) throw new Error("Loyalty program not found");
    
    const id = `member-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    
    const member: LoyaltyMember = {
      id,
      customerId: params.customerId,
      walletId: params.customerWalletId,
      programId: params.programId,
      businessId: program.businessId,
      points: 0,
      tier: program.tiers[0].name,
      totalSpent: 0,
      totalEarned: 0,
      visits: 0,
      joinedAt: new Date(),
      lastActivity: new Date(),
    };
    
    this.loyaltyMembers.set(id, member);
    this.membersByProgram.get(params.programId)!.add(id);
    program.totalMembers++;
    
    // Welcome points
    const welcomePoints = 100;
    member.points = welcomePoints;
    program.totalPointsIssued += welcomePoints;
    
    this.emit("member-joined", { member, program });
    return member;
  }
  
  /**
   * Record purchase for loyalty points
   */
  recordPurchase(params: {
    memberId: string;
    piAmount: number;
    description?: string;
  }): LoyaltyMember {
    const member = this.loyaltyMembers.get(params.memberId);
    if (!member) throw new Error("Member not found");
    
    const program = this.loyaltyPrograms.get(member.programId);
    if (!program) throw new Error("Program not found");
    
    const business = this.businesses.get(program.businessId);
    if (!business) throw new Error("Business not found");
    
    // Calculate points
    const tier = program.tiers.find(t => t.name === member.tier);
    const multiplier = tier?.tokenMultiplier || 1;
    const pointsEarned = Math.floor(params.piAmount * program.pointsPerPi * multiplier);
    
    member.points += pointsEarned;
    member.totalSpent += params.piAmount;
    member.visits++;
    member.lastActivity = new Date();
    program.totalPointsIssued += pointsEarned;
    
    // Check tier upgrade
    const newTier = this.calculateTier(program, member.points);
    if (newTier !== member.tier) {
      member.tier = newTier;
      this.emit("tier-change", { member, newTier });
    }
    
    // Award tokens
    const tokenReward = Math.floor(pointsEarned / 10);
    if (tokenReward > 0) {
      const tx = tokenRewardSystem.mintTokens({
        toWalletId: member.walletId,
        tokenType: program.tokenType,
        amount: tokenReward,
        description: `Loyalty reward: ${params.description || "Purchase"}`,
      });
      member.totalEarned += tx.amount;
    }
    
    // Record transaction
    this.recordTransaction({
      type: "purchase",
      businessId: program.businessId,
      customerId: member.customerId,
      tokenType: program.tokenType,
      amount: tokenReward,
      piAmount: params.piAmount,
      description: params.description || "Purchase",
    });
    
    this.emit("purchase-recorded", { member, pointsEarned, tokenReward });
    return member;
  }
  
  private calculateTier(program: LoyaltyProgram, points: number): string {
    let tierName = program.tiers[0].name;
    for (const tier of program.tiers) {
      if (points >= tier.minPoints) {
        tierName = tier.name;
      }
    }
    return tierName;
  }
  
  /**
   * Redeem loyalty points
   */
  redeemPoints(memberId: string, points: number): { tokensReceived: number; piEquivalent: number } {
    const member = this.loyaltyMembers.get(memberId);
    if (!member) throw new Error("Member not found");
    
    if (member.points < points) {
      throw new Error("Insufficient points");
    }
    
    const program = this.loyaltyPrograms.get(member.programId);
    if (!program) throw new Error("Program not found");
    
    member.points -= points;
    member.lastActivity = new Date();
    
    // Convert points to tokens (10 points = 1 token)
    const tokensReceived = Math.floor(points / 10);
    
    const tx = tokenRewardSystem.mintTokens({
      toWalletId: member.walletId,
      tokenType: program.tokenType,
      amount: tokensReceived,
      description: "Points redemption",
    });
    
    member.totalEarned += tx.amount;
    
    this.emit("points-redeemed", { member, points, tokensReceived });
    return { tokensReceived, piEquivalent: tx.piEquivalent };
  }
  
  // ==========================================================================
  // Affiliate Programs
  // ==========================================================================
  
  /**
   * Create an affiliate program
   */
  createAffiliateProgram(params: {
    businessId: string;
    name: string;
    commissionPercent: number;
    tokenBonus: number;
    tieredCommissions?: TieredCommission[];
  }): AffiliateProgram {
    const business = this.businesses.get(params.businessId);
    if (!business) throw new Error("Business not found");
    
    const id = `affiliate-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    
    const defaultTiers: TieredCommission[] = [
      { minReferrals: 0, commissionPercent: params.commissionPercent, tokenBonus: params.tokenBonus },
      { minReferrals: 10, commissionPercent: params.commissionPercent * 1.25, tokenBonus: params.tokenBonus * 1.5 },
      { minReferrals: 50, commissionPercent: params.commissionPercent * 1.5, tokenBonus: params.tokenBonus * 2 },
      { minReferrals: 100, commissionPercent: params.commissionPercent * 2, tokenBonus: params.tokenBonus * 3 },
    ];
    
    const program: AffiliateProgram = {
      id,
      businessId: params.businessId,
      name: params.name,
      commissionPercent: params.commissionPercent,
      tokenBonus: params.tokenBonus,
      tieredCommissions: params.tieredCommissions || defaultTiers,
      active: true,
    };
    
    this.affiliatePrograms.set(id, program);
    this.affiliatesByProgram.set(id, new Set());
    business.affiliateProgram = program;
    
    this.emit("affiliate-program-created", { program, business });
    return program;
  }
  
  /**
   * Join as an affiliate
   */
  joinAsAffiliate(params: {
    userId: string;
    walletId: string;
    programId: string;
  }): Affiliate {
    const program = this.affiliatePrograms.get(params.programId);
    if (!program) throw new Error("Affiliate program not found");
    
    const id = `aff-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const referralCode = this.generateReferralCode(params.userId);
    
    const affiliate: Affiliate = {
      id,
      userId: params.userId,
      walletId: params.walletId,
      programId: params.programId,
      businessId: program.businessId,
      referralCode,
      referralCount: 0,
      totalCommission: 0,
      totalTokensEarned: 0,
      currentTier: 0,
      joinedAt: new Date(),
    };
    
    this.affiliates.set(id, affiliate);
    this.affiliatesByProgram.get(params.programId)!.add(id);
    this.affiliateByCode.set(referralCode, id);
    
    this.emit("affiliate-joined", { affiliate, program });
    return affiliate;
  }
  
  private generateReferralCode(userId: string): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 8; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }
  
  /**
   * Process a referral
   */
  processReferral(params: {
    referralCode: string;
    newCustomerId: string;
    purchaseAmount: number;
  }): { affiliate: Affiliate; commission: number; tokens: number } {
    const affiliateId = this.affiliateByCode.get(params.referralCode);
    if (!affiliateId) throw new Error("Invalid referral code");
    
    const affiliate = this.affiliates.get(affiliateId);
    if (!affiliate) throw new Error("Affiliate not found");
    
    const program = this.affiliatePrograms.get(affiliate.programId);
    if (!program) throw new Error("Program not found");
    
    const business = this.businesses.get(program.businessId);
    if (!business) throw new Error("Business not found");
    
    affiliate.referralCount++;
    
    // Get commission rate based on tier
    const tier = this.getAffiliateTier(program, affiliate.referralCount);
    affiliate.currentTier = tier;
    
    const commissionRate = program.tieredCommissions[tier]?.commissionPercent || program.commissionPercent;
    const tokenBonus = program.tieredCommissions[tier]?.tokenBonus || program.tokenBonus;
    
    // Calculate commission
    const commission = (params.purchaseAmount * commissionRate) / 100;
    affiliate.totalCommission += commission;
    
    // Award tokens
    const tx = tokenRewardSystem.mintTokens({
      toWalletId: affiliate.walletId,
      tokenType: "SOCIAL",
      amount: tokenBonus,
      description: `Referral commission from ${program.name}`,
    });
    
    affiliate.totalTokensEarned += tx.amount;
    
    // Record transaction
    this.recordTransaction({
      type: "commission",
      businessId: program.businessId,
      affiliateId: affiliate.id,
      tokenType: "SOCIAL",
      amount: tx.amount,
      piAmount: commission,
      description: "Affiliate commission",
    });
    
    this.emit("referral-processed", { affiliate, commission, tokens: tx.amount });
    return { affiliate, commission, tokens: tx.amount };
  }
  
  private getAffiliateTier(program: AffiliateProgram, referralCount: number): number {
    let tier = 0;
    for (let i = 0; i < program.tieredCommissions.length; i++) {
      if (referralCount >= program.tieredCommissions[i].minReferrals) {
        tier = i;
      }
    }
    return tier;
  }
  
  // ==========================================================================
  // Partnerships
  // ==========================================================================
  
  /**
   * Create a partnership between businesses
   */
  createPartnership(params: {
    business1Id: string;
    business2Id: string;
    type: Partnership["type"];
    tokenShare: number;
    terms: string;
  }): Partnership {
    const business1 = this.businesses.get(params.business1Id);
    const business2 = this.businesses.get(params.business2Id);
    
    if (!business1 || !business2) {
      throw new Error("One or both businesses not found");
    }
    
    const id = `partnership-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    
    const partnership: Partnership = {
      id,
      business1Id: params.business1Id,
      business2Id: params.business2Id,
      type: params.type,
      tokenShare: Math.min(50, Math.max(0, params.tokenShare)),
      active: true,
      terms: params.terms,
      startDate: new Date(),
    };
    
    this.partnerships.set(id, partnership);
    this.emit("partnership-created", { partnership, business1, business2 });
    return partnership;
  }
  
  /**
   * Process partnership token share
   */
  processPartnershipReward(partnershipId: string, sourceBusinessId: string, amount: number): number {
    const partnership = this.partnerships.get(partnershipId);
    if (!partnership || !partnership.active) {
      throw new Error("Partnership not found or inactive");
    }
    
    // Determine partner
    const partnerId = partnership.business1Id === sourceBusinessId 
      ? partnership.business2Id 
      : partnership.business1Id;
    
    const partnerBusiness = this.businesses.get(partnerId);
    if (!partnerBusiness) throw new Error("Partner business not found");
    
    // Calculate share
    const shareAmount = Math.floor((amount * partnership.tokenShare) / 100);
    
    if (shareAmount > 0) {
      tokenRewardSystem.mintTokens({
        toWalletId: partnerBusiness.walletId,
        tokenType: "TRIUMPH",
        amount: shareAmount,
        description: "Partnership token share",
      });
      
      partnerBusiness.tokenPool += shareAmount;
    }
    
    this.emit("partnership-reward", { partnershipId, partnerId, shareAmount });
    return shareAmount;
  }
  
  // ==========================================================================
  // Transactions
  // ==========================================================================
  
  private recordTransaction(params: Omit<BusinessTransaction, "id" | "timestamp">): BusinessTransaction {
    const id = `tx-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    
    const transaction: BusinessTransaction = {
      id,
      ...params,
      timestamp: new Date(),
    };
    
    this.transactions.set(id, transaction);
    return transaction;
  }
  
  /**
   * Get business transactions
   */
  getBusinessTransactions(businessId: string, limit?: number): BusinessTransaction[] {
    const transactions: BusinessTransaction[] = [];
    
    for (const tx of this.transactions.values()) {
      if (tx.businessId === businessId) {
        transactions.push(tx);
      }
    }
    
    transactions.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    return limit ? transactions.slice(0, limit) : transactions;
  }
  
  // ==========================================================================
  // Queries
  // ==========================================================================
  
  getBusiness(id: string): Business | undefined {
    return this.businesses.get(id);
  }
  
  getEmployee(id: string): Employee | undefined {
    return this.employees.get(id);
  }
  
  getBusinessEmployees(businessId: string): Employee[] {
    const employeeIds = this.employeesByBusiness.get(businessId);
    if (!employeeIds) return [];
    
    return Array.from(employeeIds)
      .map(id => this.employees.get(id)!)
      .filter(e => e && e.active);
  }
  
  getLoyaltyProgram(id: string): LoyaltyProgram | undefined {
    return this.loyaltyPrograms.get(id);
  }
  
  getLoyaltyMember(id: string): LoyaltyMember | undefined {
    return this.loyaltyMembers.get(id);
  }
  
  getAffiliate(id: string): Affiliate | undefined {
    return this.affiliates.get(id);
  }
  
  getAffiliateByCode(code: string): Affiliate | undefined {
    const id = this.affiliateByCode.get(code);
    return id ? this.affiliates.get(id) : undefined;
  }
  
  /**
   * Get business statistics
   */
  getBusinessStats(businessId: string): {
    employeeCount: number;
    totalTokensDistributed: number;
    totalPiGenerated: number;
    loyaltyMembers: number;
    affiliates: number;
    transactions: number;
  } {
    const business = this.businesses.get(businessId);
    if (!business) throw new Error("Business not found");
    
    const employees = this.getBusinessEmployees(businessId);
    const program = business.loyaltyProgram;
    const affiliate = business.affiliateProgram;
    
    let totalTokensDistributed = 0;
    let totalPiGenerated = 0;
    
    for (const emp of employees) {
      totalTokensDistributed += emp.tokensEarned;
      totalPiGenerated += emp.piEarned;
    }
    
    for (const tx of this.transactions.values()) {
      if (tx.businessId === businessId) {
        totalTokensDistributed += tx.amount;
        totalPiGenerated += tx.piAmount;
      }
    }
    
    return {
      employeeCount: employees.length,
      totalTokensDistributed,
      totalPiGenerated,
      loyaltyMembers: program ? program.totalMembers : 0,
      affiliates: affiliate ? this.affiliatesByProgram.get(affiliate.id)?.size || 0 : 0,
      transactions: this.getBusinessTransactions(businessId).length,
    };
  }
  
  /**
   * Get platform statistics
   */
  getPlatformStats(): {
    totalBusinesses: number;
    totalEmployees: number;
    totalLoyaltyMembers: number;
    totalAffiliates: number;
    totalTransactions: number;
    totalPartnerships: number;
  } {
    let totalLoyaltyMembers = 0;
    for (const program of this.loyaltyPrograms.values()) {
      totalLoyaltyMembers += program.totalMembers;
    }
    
    return {
      totalBusinesses: this.businesses.size,
      totalEmployees: this.employees.size,
      totalLoyaltyMembers,
      totalAffiliates: this.affiliates.size,
      totalTransactions: this.transactions.size,
      totalPartnerships: this.partnerships.size,
    };
  }
}

// ============================================================================
// Exports
// ============================================================================

export const businessInteractions = BusinessInteractionManager.getInstance();

export { BusinessInteractionManager };

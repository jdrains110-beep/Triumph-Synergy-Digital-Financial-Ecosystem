/**
 * Triumph Synergy - Financial Freedom Program
 *
 * Owner's program to spread the love to those in need:
 * - Financial assistance distribution
 * - UBI program enforcement
 * - Community support initiatives
 * - Pi-powered charitable giving
 *
 * @module lib/programs/financial-freedom-program
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

export type ProgramType =
  | "ubi" // Universal Basic Income
  | "emergency-relief" // Emergency financial relief
  | "education-support" // Education funding
  | "healthcare-assistance" // Healthcare costs
  | "housing-support" // Housing assistance
  | "business-grant" // Small business grants
  | "community-development" // Community projects
  | "disaster-relief" // Natural disaster relief
  | "veterans-support" // Veterans assistance
  | "elderly-care"; // Senior citizen support

export type ApplicationStatus =
  | "pending"
  | "under-review"
  | "approved"
  | "denied"
  | "disbursed"
  | "completed";
export type DisbursementMethod =
  | "pi-direct"
  | "pi-wallet"
  | "bank-transfer"
  | "check"
  | "hybrid";

export type FinancialFreedomProgram = {
  id: string;
  name: string;
  description: string;
  type: ProgramType;

  // Funding
  totalFunding: number;
  totalFundingInPi: number;
  remainingFunding: number;
  remainingFundingInPi: number;

  // Distribution
  totalDistributed: number;
  totalDistributedInPi: number;
  beneficiariesServed: number;

  // Eligibility
  eligibilityCriteria: EligibilityCriteria;
  incomeLimit: number | null;

  // Amounts
  minimumGrant: number;
  maximumGrant: number;
  averageGrant: number;

  // UBI Specific
  isRecurring: boolean;
  recurringAmount: number;
  recurringAmountInPi: number;
  recurringFrequency: "daily" | "weekly" | "biweekly" | "monthly";

  // Status
  status: "active" | "paused" | "closed" | "coming-soon";
  applicationDeadline: Date | null;

  // Metrics
  applicationCount: number;
  approvalRate: number;
  averageProcessingDays: number;

  createdAt: Date;
  updatedAt: Date;
};

export type EligibilityCriteria = {
  minimumAge: number;
  maximumAge: number | null;
  citizenshipRequired: boolean;
  piWalletRequired: boolean;
  incomeVerification: boolean;
  employmentStatus: (
    | "employed"
    | "unemployed"
    | "self-employed"
    | "retired"
    | "student"
    | "any"
  )[];
  additionalRequirements: string[];
};

export type Beneficiary = {
  id: string;
  userId: string;

  // Profile
  name: string;
  email: string;
  phone: string;
  dateOfBirth: Date;

  // Location
  country: string;
  state: string;
  city: string;

  // Verification
  identityVerified: boolean;
  piWalletVerified: boolean;
  incomeVerified: boolean;

  // Pi Wallet
  piWalletAddress: string;

  // Programs
  enrolledPrograms: string[];
  activeUBI: boolean;

  // Financials
  reportedIncome: number;
  householdSize: number;
  employmentStatus: string;

  // History
  totalReceived: number;
  totalReceivedInPi: number;
  disbursementsCount: number;

  // Status
  status: "active" | "suspended" | "graduated" | "inactive";

  createdAt: Date;
  lastDisbursement: Date | null;
};

export type Assistance = {
  id: string;
  programId: string;
  beneficiaryId: string;

  // Application
  applicationDate: Date;
  applicationStatus: ApplicationStatus;
  reviewedBy: string | null;
  reviewDate: Date | null;

  // Request
  requestedAmount: number;
  requestedAmountInPi: number;
  purpose: string;
  supportingDocuments: string[];

  // Approval
  approvedAmount: number;
  approvedAmountInPi: number;
  approvalNotes: string | null;

  // Disbursement
  disbursementMethod: DisbursementMethod;
  disbursementStatus: "pending" | "processing" | "completed" | "failed";
  disbursementDate: Date | null;
  transactionId: string | null;

  // Follow-up
  requiresFollowUp: boolean;
  followUpDate: Date | null;
  impactReport: string | null;

  createdAt: Date;
  updatedAt: Date;
};

export type UBIEnrollment = {
  id: string;
  beneficiaryId: string;
  programId: string;

  // Enrollment
  enrollmentDate: Date;
  status: "active" | "paused" | "graduated" | "terminated";

  // Payment Details
  amount: number;
  amountInPi: number;
  frequency: "daily" | "weekly" | "biweekly" | "monthly";
  nextPaymentDate: Date;

  // History
  totalPayments: number;
  totalPaid: number;
  totalPaidInPi: number;
  missedPayments: number;

  // Conditions
  conditionsRequired: boolean;
  conditions: string[];
  conditionsMet: boolean;

  // Duration
  enrollmentDuration: number | "indefinite"; // months
  monthsRemaining: number | "indefinite";

  createdAt: Date;
  updatedAt: Date;
};

export type UBIPayment = {
  id: string;
  enrollmentId: string;
  beneficiaryId: string;

  // Payment
  amount: number;
  amountInPi: number;
  paymentDate: Date;

  // Transaction
  method: DisbursementMethod;
  transactionId: string;
  status: "pending" | "processing" | "completed" | "failed";

  // Pi Details
  piWalletAddress: string;
  piTransactionHash: string | null;

  createdAt: Date;
};

export type CommunityImpact = {
  programId: string;
  period: "month" | "quarter" | "year" | "all-time";

  // Financial
  totalDistributed: number;
  totalDistributedInPi: number;

  // Reach
  beneficiariesReached: number;
  applicationsReceived: number;
  applicationsApproved: number;

  // Impact
  livesImpacted: number;
  familiesHelped: number;
  communitiesServed: number;

  // Success Stories
  successStoriesCount: number;
  graduationRate: number;

  // By Category
  byPurpose: { purpose: string; amount: number; count: number }[];
  byRegion: { region: string; amount: number; count: number }[];
};

// ============================================================================
// FINANCIAL FREEDOM PROGRAM CLASS
// ============================================================================

class FinancialFreedomProgramManager {
  private readonly programs: Map<string, FinancialFreedomProgram> = new Map();
  private readonly beneficiaries: Map<string, Beneficiary> = new Map();
  private readonly assistances: Map<string, Assistance> = new Map();
  private readonly ubiEnrollments: Map<string, UBIEnrollment> = new Map();
  private readonly ubiPayments: Map<string, UBIPayment> = new Map();

  constructor() {
    this.initializeDefaultPrograms();
  }

  private initializeDefaultPrograms(): void {
    // Initialize the core UBI program
    const ubiProgram: FinancialFreedomProgram = {
      id: "ubi-core",
      name: "Triumph Universal Basic Income",
      description:
        "Monthly financial support to ensure basic needs are met for all participants in the Triumph-Synergy ecosystem.",
      type: "ubi",
      totalFunding: 100_000_000,
      totalFundingInPi: 100_000_000 / PI_EXTERNAL_RATE,
      remainingFunding: 100_000_000,
      remainingFundingInPi: 100_000_000 / PI_EXTERNAL_RATE,
      totalDistributed: 0,
      totalDistributedInPi: 0,
      beneficiariesServed: 0,
      eligibilityCriteria: {
        minimumAge: 18,
        maximumAge: null,
        citizenshipRequired: false,
        piWalletRequired: true,
        incomeVerification: true,
        employmentStatus: ["any"],
        additionalRequirements: [
          "Active Pi Network participant",
          "Verified identity",
          "Valid Pi wallet address",
        ],
      },
      incomeLimit: 50_000,
      minimumGrant: 100,
      maximumGrant: 2000,
      averageGrant: 500,
      isRecurring: true,
      recurringAmount: 500,
      recurringAmountInPi: 500 / PI_EXTERNAL_RATE,
      recurringFrequency: "monthly",
      status: "active",
      applicationDeadline: null,
      applicationCount: 0,
      approvalRate: 0,
      averageProcessingDays: 3,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const emergencyRelief: FinancialFreedomProgram = {
      id: "emergency-relief",
      name: "Emergency Financial Relief Fund",
      description:
        "Immediate financial assistance for those facing unexpected hardships, medical emergencies, or crisis situations.",
      type: "emergency-relief",
      totalFunding: 25_000_000,
      totalFundingInPi: 25_000_000 / PI_EXTERNAL_RATE,
      remainingFunding: 25_000_000,
      remainingFundingInPi: 25_000_000 / PI_EXTERNAL_RATE,
      totalDistributed: 0,
      totalDistributedInPi: 0,
      beneficiariesServed: 0,
      eligibilityCriteria: {
        minimumAge: 18,
        maximumAge: null,
        citizenshipRequired: false,
        piWalletRequired: true,
        incomeVerification: false,
        employmentStatus: ["any"],
        additionalRequirements: [
          "Documentation of emergency situation",
          "Active Pi wallet",
        ],
      },
      incomeLimit: null,
      minimumGrant: 250,
      maximumGrant: 10_000,
      averageGrant: 2500,
      isRecurring: false,
      recurringAmount: 0,
      recurringAmountInPi: 0,
      recurringFrequency: "monthly",
      status: "active",
      applicationDeadline: null,
      applicationCount: 0,
      approvalRate: 0,
      averageProcessingDays: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const educationSupport: FinancialFreedomProgram = {
      id: "education-support",
      name: "Education & Learning Support",
      description:
        "Scholarships and educational grants to support students and lifelong learners in achieving their educational goals.",
      type: "education-support",
      totalFunding: 50_000_000,
      totalFundingInPi: 50_000_000 / PI_EXTERNAL_RATE,
      remainingFunding: 50_000_000,
      remainingFundingInPi: 50_000_000 / PI_EXTERNAL_RATE,
      totalDistributed: 0,
      totalDistributedInPi: 0,
      beneficiariesServed: 0,
      eligibilityCriteria: {
        minimumAge: 16,
        maximumAge: null,
        citizenshipRequired: false,
        piWalletRequired: true,
        incomeVerification: true,
        employmentStatus: ["student", "any"],
        additionalRequirements: [
          "Proof of enrollment or acceptance",
          "Academic records",
          "Personal statement",
        ],
      },
      incomeLimit: 75_000,
      minimumGrant: 500,
      maximumGrant: 25_000,
      averageGrant: 5000,
      isRecurring: false,
      recurringAmount: 0,
      recurringAmountInPi: 0,
      recurringFrequency: "monthly",
      status: "active",
      applicationDeadline: null,
      applicationCount: 0,
      approvalRate: 0,
      averageProcessingDays: 7,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const businessGrant: FinancialFreedomProgram = {
      id: "business-grant",
      name: "Small Business Development Grants",
      description:
        "Supporting entrepreneurs and small business owners with grants to start or grow their Pi-integrated businesses.",
      type: "business-grant",
      totalFunding: 75_000_000,
      totalFundingInPi: 75_000_000 / PI_EXTERNAL_RATE,
      remainingFunding: 75_000_000,
      remainingFundingInPi: 75_000_000 / PI_EXTERNAL_RATE,
      totalDistributed: 0,
      totalDistributedInPi: 0,
      beneficiariesServed: 0,
      eligibilityCriteria: {
        minimumAge: 18,
        maximumAge: null,
        citizenshipRequired: false,
        piWalletRequired: true,
        incomeVerification: true,
        employmentStatus: ["self-employed", "any"],
        additionalRequirements: [
          "Business plan",
          "Pi integration commitment",
          "Job creation goals",
        ],
      },
      incomeLimit: null,
      minimumGrant: 1000,
      maximumGrant: 50_000,
      averageGrant: 15_000,
      isRecurring: false,
      recurringAmount: 0,
      recurringAmountInPi: 0,
      recurringFrequency: "monthly",
      status: "active",
      applicationDeadline: null,
      applicationCount: 0,
      approvalRate: 0,
      averageProcessingDays: 14,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.programs.set(ubiProgram.id, ubiProgram);
    this.programs.set(emergencyRelief.id, emergencyRelief);
    this.programs.set(educationSupport.id, educationSupport);
    this.programs.set(businessGrant.id, businessGrant);
  }

  // ==========================================================================
  // PROGRAM MANAGEMENT
  // ==========================================================================

  getPrograms(): FinancialFreedomProgram[] {
    return Array.from(this.programs.values());
  }

  getProgram(programId: string): FinancialFreedomProgram | null {
    return this.programs.get(programId) || null;
  }

  async createProgram(data: {
    name: string;
    description: string;
    type: ProgramType;
    totalFunding: number;
    eligibilityCriteria: EligibilityCriteria;
    minimumGrant: number;
    maximumGrant: number;
    isRecurring?: boolean;
    recurringAmount?: number;
    recurringFrequency?: UBIEnrollment["frequency"];
  }): Promise<FinancialFreedomProgram> {
    const id = `program-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    const program: FinancialFreedomProgram = {
      id,
      name: data.name,
      description: data.description,
      type: data.type,
      totalFunding: data.totalFunding,
      totalFundingInPi: data.totalFunding / PI_EXTERNAL_RATE,
      remainingFunding: data.totalFunding,
      remainingFundingInPi: data.totalFunding / PI_EXTERNAL_RATE,
      totalDistributed: 0,
      totalDistributedInPi: 0,
      beneficiariesServed: 0,
      eligibilityCriteria: data.eligibilityCriteria,
      incomeLimit: null,
      minimumGrant: data.minimumGrant,
      maximumGrant: data.maximumGrant,
      averageGrant: (data.minimumGrant + data.maximumGrant) / 2,
      isRecurring: data.isRecurring || false,
      recurringAmount: data.recurringAmount || 0,
      recurringAmountInPi: (data.recurringAmount || 0) / PI_EXTERNAL_RATE,
      recurringFrequency: data.recurringFrequency || "monthly",
      status: "active",
      applicationDeadline: null,
      applicationCount: 0,
      approvalRate: 0,
      averageProcessingDays: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.programs.set(id, program);
    return program;
  }

  // ==========================================================================
  // BENEFICIARY MANAGEMENT
  // ==========================================================================

  async registerBeneficiary(data: {
    userId: string;
    name: string;
    email: string;
    phone: string;
    dateOfBirth: Date;
    country: string;
    state: string;
    city: string;
    piWalletAddress: string;
    reportedIncome: number;
    householdSize: number;
    employmentStatus: string;
  }): Promise<Beneficiary> {
    const id = `beneficiary-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    const beneficiary: Beneficiary = {
      id,
      userId: data.userId,
      name: data.name,
      email: data.email,
      phone: data.phone,
      dateOfBirth: data.dateOfBirth,
      country: data.country,
      state: data.state,
      city: data.city,
      identityVerified: false,
      piWalletVerified: false,
      incomeVerified: false,
      piWalletAddress: data.piWalletAddress,
      enrolledPrograms: [],
      activeUBI: false,
      reportedIncome: data.reportedIncome,
      householdSize: data.householdSize,
      employmentStatus: data.employmentStatus,
      totalReceived: 0,
      totalReceivedInPi: 0,
      disbursementsCount: 0,
      status: "active",
      createdAt: new Date(),
      lastDisbursement: null,
    };

    this.beneficiaries.set(id, beneficiary);
    return beneficiary;
  }

  async getBeneficiary(beneficiaryId: string): Promise<Beneficiary | null> {
    return this.beneficiaries.get(beneficiaryId) || null;
  }

  async verifyBeneficiary(
    beneficiaryId: string,
    verificationType: "identity" | "piWallet" | "income"
  ): Promise<boolean> {
    const beneficiary = this.beneficiaries.get(beneficiaryId);
    if (!beneficiary) {
      return false;
    }

    switch (verificationType) {
      case "identity":
        beneficiary.identityVerified = true;
        break;
      case "piWallet":
        beneficiary.piWalletVerified = true;
        break;
      case "income":
        beneficiary.incomeVerified = true;
        break;
    }

    return true;
  }

  // ==========================================================================
  // ASSISTANCE APPLICATIONS
  // ==========================================================================

  async applyForAssistance(data: {
    programId: string;
    beneficiaryId: string;
    requestedAmount: number;
    purpose: string;
    supportingDocuments?: string[];
  }): Promise<Assistance> {
    const program = this.programs.get(data.programId);
    const beneficiary = this.beneficiaries.get(data.beneficiaryId);

    if (!program || !beneficiary) {
      throw new Error("Invalid program or beneficiary");
    }

    const id = `assist-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    const assistance: Assistance = {
      id,
      programId: data.programId,
      beneficiaryId: data.beneficiaryId,
      applicationDate: new Date(),
      applicationStatus: "pending",
      reviewedBy: null,
      reviewDate: null,
      requestedAmount: data.requestedAmount,
      requestedAmountInPi: data.requestedAmount / PI_EXTERNAL_RATE,
      purpose: data.purpose,
      supportingDocuments: data.supportingDocuments || [],
      approvedAmount: 0,
      approvedAmountInPi: 0,
      approvalNotes: null,
      disbursementMethod: "pi-direct",
      disbursementStatus: "pending",
      disbursementDate: null,
      transactionId: null,
      requiresFollowUp: false,
      followUpDate: null,
      impactReport: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.assistances.set(id, assistance);
    program.applicationCount += 1;

    return assistance;
  }

  async reviewAssistance(
    assistanceId: string,
    reviewerId: string,
    approved: boolean,
    approvedAmount?: number,
    notes?: string
  ): Promise<Assistance> {
    const assistance = this.assistances.get(assistanceId);
    if (!assistance) {
      throw new Error("Assistance not found");
    }

    const program = this.programs.get(assistance.programId);

    assistance.applicationStatus = approved ? "approved" : "denied";
    assistance.reviewedBy = reviewerId;
    assistance.reviewDate = new Date();
    assistance.approvalNotes = notes || null;

    if (approved && approvedAmount) {
      assistance.approvedAmount = approvedAmount;
      assistance.approvedAmountInPi = approvedAmount / PI_EXTERNAL_RATE;
    }

    if (program) {
      const allAssistances = Array.from(this.assistances.values()).filter(
        (a) => a.programId === program.id
      );
      const approvedCount = allAssistances.filter(
        (a) => a.applicationStatus === "approved"
      ).length;
      program.approvalRate = (approvedCount / allAssistances.length) * 100;
    }

    return assistance;
  }

  async disburseAssistance(assistanceId: string): Promise<Assistance> {
    const assistance = this.assistances.get(assistanceId);
    if (!assistance || assistance.applicationStatus !== "approved") {
      throw new Error("Invalid or unapproved assistance");
    }

    const program = this.programs.get(assistance.programId);
    const beneficiary = this.beneficiaries.get(assistance.beneficiaryId);

    if (!program || !beneficiary) {
      throw new Error("Program or beneficiary not found");
    }

    // Process disbursement
    assistance.disbursementStatus = "completed";
    assistance.disbursementDate = new Date();
    assistance.transactionId = `TX-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    assistance.applicationStatus = "disbursed";

    // Update program stats
    program.totalDistributed += assistance.approvedAmount;
    program.totalDistributedInPi += assistance.approvedAmountInPi;
    program.remainingFunding -= assistance.approvedAmount;
    program.remainingFundingInPi -= assistance.approvedAmountInPi;
    program.beneficiariesServed += 1;

    // Update beneficiary stats
    beneficiary.totalReceived += assistance.approvedAmount;
    beneficiary.totalReceivedInPi += assistance.approvedAmountInPi;
    beneficiary.disbursementsCount += 1;
    beneficiary.lastDisbursement = new Date();

    if (!beneficiary.enrolledPrograms.includes(program.id)) {
      beneficiary.enrolledPrograms.push(program.id);
    }

    return assistance;
  }

  // ==========================================================================
  // UBI ENROLLMENT
  // ==========================================================================

  async enrollInUBI(
    beneficiaryId: string,
    programId = "ubi-core"
  ): Promise<UBIEnrollment> {
    const program = this.programs.get(programId);
    const beneficiary = this.beneficiaries.get(beneficiaryId);

    if (!program || !beneficiary) {
      throw new Error("Invalid program or beneficiary");
    }

    if (!program.isRecurring) {
      throw new Error("Program is not a UBI program");
    }

    const id = `ubi-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    // Calculate next payment date
    const nextPayment = new Date();
    switch (program.recurringFrequency) {
      case "daily":
        nextPayment.setDate(nextPayment.getDate() + 1);
        break;
      case "weekly":
        nextPayment.setDate(nextPayment.getDate() + 7);
        break;
      case "biweekly":
        nextPayment.setDate(nextPayment.getDate() + 14);
        break;
      case "monthly":
        nextPayment.setMonth(nextPayment.getMonth() + 1);
        break;
    }

    const enrollment: UBIEnrollment = {
      id,
      beneficiaryId,
      programId,
      enrollmentDate: new Date(),
      status: "active",
      amount: program.recurringAmount,
      amountInPi: program.recurringAmountInPi,
      frequency: program.recurringFrequency,
      nextPaymentDate: nextPayment,
      totalPayments: 0,
      totalPaid: 0,
      totalPaidInPi: 0,
      missedPayments: 0,
      conditionsRequired: false,
      conditions: [],
      conditionsMet: true,
      enrollmentDuration: "indefinite",
      monthsRemaining: "indefinite",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.ubiEnrollments.set(id, enrollment);
    beneficiary.activeUBI = true;
    beneficiary.enrolledPrograms.push(programId);

    return enrollment;
  }

  async processUBIPayment(enrollmentId: string): Promise<UBIPayment> {
    const enrollment = this.ubiEnrollments.get(enrollmentId);
    if (!enrollment || enrollment.status !== "active") {
      throw new Error("Invalid or inactive enrollment");
    }

    const beneficiary = this.beneficiaries.get(enrollment.beneficiaryId);
    const program = this.programs.get(enrollment.programId);

    if (!beneficiary || !program) {
      throw new Error("Beneficiary or program not found");
    }

    const id = `payment-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    const payment: UBIPayment = {
      id,
      enrollmentId,
      beneficiaryId: enrollment.beneficiaryId,
      amount: enrollment.amount,
      amountInPi: enrollment.amountInPi,
      paymentDate: new Date(),
      method: "pi-direct",
      transactionId: `UBI-TX-${Date.now()}`,
      status: "completed",
      piWalletAddress: beneficiary.piWalletAddress,
      piTransactionHash: `0x${Math.random().toString(16).slice(2)}`,
      createdAt: new Date(),
    };

    this.ubiPayments.set(id, payment);

    // Update enrollment
    enrollment.totalPayments += 1;
    enrollment.totalPaid += enrollment.amount;
    enrollment.totalPaidInPi += enrollment.amountInPi;

    // Calculate next payment
    const nextPayment = new Date();
    switch (enrollment.frequency) {
      case "daily":
        nextPayment.setDate(nextPayment.getDate() + 1);
        break;
      case "weekly":
        nextPayment.setDate(nextPayment.getDate() + 7);
        break;
      case "biweekly":
        nextPayment.setDate(nextPayment.getDate() + 14);
        break;
      case "monthly":
        nextPayment.setMonth(nextPayment.getMonth() + 1);
        break;
    }
    enrollment.nextPaymentDate = nextPayment;

    // Update beneficiary
    beneficiary.totalReceived += enrollment.amount;
    beneficiary.totalReceivedInPi += enrollment.amountInPi;
    beneficiary.lastDisbursement = new Date();
    beneficiary.disbursementsCount += 1;

    // Update program
    program.totalDistributed += enrollment.amount;
    program.totalDistributedInPi += enrollment.amountInPi;
    program.remainingFunding -= enrollment.amount;
    program.remainingFundingInPi -= enrollment.amountInPi;

    return payment;
  }

  async getUBIEnrollment(enrollmentId: string): Promise<UBIEnrollment | null> {
    return this.ubiEnrollments.get(enrollmentId) || null;
  }

  async getActiveUBIEnrollments(): Promise<UBIEnrollment[]> {
    return Array.from(this.ubiEnrollments.values()).filter(
      (e) => e.status === "active"
    );
  }

  // ==========================================================================
  // IMPACT REPORTING
  // ==========================================================================

  getCommunityImpact(
    programId: string,
    period: CommunityImpact["period"] = "all-time"
  ): CommunityImpact {
    const program = this.programs.get(programId);
    if (!program) {
      throw new Error("Program not found");
    }

    const assistances = Array.from(this.assistances.values()).filter(
      (a) => a.programId === programId
    );
    const disbursed = assistances.filter(
      (a) => a.applicationStatus === "disbursed"
    );

    // Calculate by purpose
    const byPurpose: Record<string, { amount: number; count: number }> = {};
    disbursed.forEach((a) => {
      if (!byPurpose[a.purpose]) {
        byPurpose[a.purpose] = { amount: 0, count: 0 };
      }
      byPurpose[a.purpose].amount += a.approvedAmount;
      byPurpose[a.purpose].count += 1;
    });

    return {
      programId,
      period,
      totalDistributed: program.totalDistributed,
      totalDistributedInPi: program.totalDistributedInPi,
      beneficiariesReached: program.beneficiariesServed,
      applicationsReceived: program.applicationCount,
      applicationsApproved: disbursed.length,
      livesImpacted: program.beneficiariesServed * 2.5, // Estimated family impact
      familiesHelped: program.beneficiariesServed,
      communitiesServed: Math.ceil(program.beneficiariesServed / 100),
      successStoriesCount: Math.ceil(program.beneficiariesServed * 0.1),
      graduationRate: 15, // Percentage who no longer need support
      byPurpose: Object.entries(byPurpose).map(([purpose, data]) => ({
        purpose,
        amount: data.amount,
        count: data.count,
      })),
      byRegion: [],
    };
  }

  // ==========================================================================
  // UTILITIES
  // ==========================================================================

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

export const financialFreedomProgram = new FinancialFreedomProgramManager();

// Export helper functions
export function getAllPrograms(): FinancialFreedomProgram[] {
  return financialFreedomProgram.getPrograms();
}

export function getUBIProgram(): FinancialFreedomProgram | null {
  return financialFreedomProgram.getProgram("ubi-core");
}

export async function applyForHelp(
  data: Parameters<typeof financialFreedomProgram.applyForAssistance>[0]
): Promise<Assistance> {
  return financialFreedomProgram.applyForAssistance(data);
}

export async function enrollInUBI(
  beneficiaryId: string
): Promise<UBIEnrollment> {
  return financialFreedomProgram.enrollInUBI(beneficiaryId);
}

export async function registerForHelp(
  data: Parameters<typeof financialFreedomProgram.registerBeneficiary>[0]
): Promise<Beneficiary> {
  return financialFreedomProgram.registerBeneficiary(data);
}

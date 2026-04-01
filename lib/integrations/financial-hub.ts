/**
 * Triumph Synergy - Unified Financial Integration Hub
 *
 * Master integration layer connecting:
 * - Pi Network Blockchain
 * - Universal Basic Income (UBI)
 * - NESARA/GESARA Compliance
 * - Credit Bureau Reporting
 * - Digital Asset Management
 *
 * @module lib/integrations/financial-hub
 * @version 1.0.0
 * @since 2026-01-08
 */

import {
  CreditBureauIntegration,
  type CreditReport,
  type PiNetworkCreditActivity,
  pullCreditReports,
  reportPiPayments,
} from "../credit-reporting/credit-bureau-integration";

import {
  activateProsperity,
  NESARAGESARAEngine,
  type NESARAProfile,
  processDebtForgiveness,
  registerNESARA,
  submitDebtForgiveness,
} from "../nesara/nesara-gesara-system";
import {
  distributeUBI,
  enrollInUBI,
  type UBIRecipient,
  UniversalBasicIncomeEngine,
} from "../ubi/universal-basic-income";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type TriumphUser = {
  id: string;
  piUserId: string;
  piUsername: string;
  email: string;
  phoneNumber?: string;
  kycStatus: KYCStatus;
  createdAt: Date;
  lastActive: Date;

  // Linked profiles
  ubiRecipientId: string | null;
  nesaraProfileId: string | null;
  creditProfileId: string | null;

  // Feature access
  features: TriumphFeatures;
};

export type KYCStatus = "none" | "pending" | "verified" | "rejected";

export type TriumphFeatures = {
  ubiEnabled: boolean;
  nesaraEnabled: boolean;
  creditReportingEnabled: boolean;
  piPaymentsEnabled: boolean;
  advancedAnalytics: boolean;
};

export type FinancialDashboard = {
  user: TriumphUser;

  // UBI Status
  ubi: {
    enrolled: boolean;
    programs: string[];
    nextPayment: Date | null;
    totalReceived: number;
    pendingAmount: number;
  };

  // NESARA/GESARA Status
  nesara: {
    registered: boolean;
    debtForgiven: number;
    prosperityFundsEligible: number;
    prosperityFundsReceived: number;
    taxRefundDue: number;
    status: string;
  };

  // Credit Status
  credit: {
    scores: {
      equifax: number | null;
      experian: number | null;
      transunion: number | null;
    };
    averageScore: number | null;
    lastPulled: Date | null;
    activeDisputes: number;
    piPaymentsReported: number;
  };

  // Pi Network Status
  pi: {
    balance: number;
    pendingTransactions: number;
    totalTransacted: number;
    kycVerified: boolean;
  };
};

export type UnifiedTransaction = {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  currency: "PI" | "USD" | "EUR" | "GBP";
  source: TransactionSource;
  destination: string;
  status: "pending" | "processing" | "completed" | "failed";
  createdAt: Date;
  completedAt: Date | null;
  metadata: Record<string, unknown>;
};

export type TransactionType =
  | "ubi-distribution"
  | "prosperity-distribution"
  | "debt-forgiveness"
  | "pi-transfer"
  | "credit-payment"
  | "tax-refund";

export type TransactionSource =
  | "ubi-program"
  | "nesara-prosperity"
  | "pi-network"
  | "bank-transfer"
  | "credit-bureau";

// ============================================================================
// FINANCIAL INTEGRATION HUB
// ============================================================================

export class FinancialIntegrationHub {
  private static instance: FinancialIntegrationHub;

  private readonly users: Map<string, TriumphUser> = new Map();
  private readonly transactions: Map<string, UnifiedTransaction[]> = new Map();

  private readonly ubiEngine: UniversalBasicIncomeEngine;
  private readonly nesaraEngine: NESARAGESARAEngine;
  // biome-ignore lint/correctness/noUnusedPrivateClassMembers: Reserved for future credit bureau integration
  private readonly creditEngine: CreditBureauIntegration;

  private constructor() {
    this.ubiEngine = UniversalBasicIncomeEngine.getInstance();
    this.nesaraEngine = NESARAGESARAEngine.getInstance();
    this.creditEngine = CreditBureauIntegration.getInstance();
  }

  static getInstance(): FinancialIntegrationHub {
    if (!FinancialIntegrationHub.instance) {
      FinancialIntegrationHub.instance = new FinancialIntegrationHub();
    }
    return FinancialIntegrationHub.instance;
  }

  // ==========================================================================
  // USER MANAGEMENT
  // ==========================================================================

  async registerUser(
    piUserId: string,
    piUsername: string,
    email: string,
    kycStatus: KYCStatus = "none"
  ): Promise<TriumphUser> {
    const id = `triumph-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    const user: TriumphUser = {
      id,
      piUserId,
      piUsername,
      email,
      kycStatus,
      createdAt: new Date(),
      lastActive: new Date(),
      ubiRecipientId: null,
      nesaraProfileId: null,
      creditProfileId: null,
      features: {
        ubiEnabled: true,
        nesaraEnabled: true,
        creditReportingEnabled: true,
        piPaymentsEnabled: kycStatus === "verified",
        advancedAnalytics: false,
      },
    };

    this.users.set(id, user);
    return user;
  }

  async getUser(userId: string): Promise<TriumphUser | null> {
    return this.users.get(userId) || null;
  }

  async getUserByPiId(piUserId: string): Promise<TriumphUser | null> {
    for (const user of this.users.values()) {
      if (user.piUserId === piUserId) {
        return user;
      }
    }
    return null;
  }

  // ==========================================================================
  // UNIFIED ONBOARDING
  // ==========================================================================

  async completeFullOnboarding(
    piUserId: string,
    piUsername: string,
    email: string,
    options: {
      enrollUBI?: boolean;
      registerNESARA?: boolean;
      enableCreditReporting?: boolean;
      debts?: {
        creditCard?: number;
        mortgage?: number;
        studentLoan?: number;
        auto?: number;
        medical?: number;
        other?: number;
      };
    } = {}
  ): Promise<{
    user: TriumphUser;
    ubiEnrollment: UBIRecipient | null;
    nesaraProfile: NESARAProfile | null;
    creditReports: {
      equifax: CreditReport;
      experian: CreditReport;
      transunion: CreditReport;
    } | null;
  }> {
    // 1. Register user
    const user = await this.registerUser(
      piUserId,
      piUsername,
      email,
      "verified"
    );

    let ubiEnrollment: UBIRecipient | null = null;
    let nesaraProfile: NESARAProfile | null = null;
    let creditReports: {
      equifax: CreditReport;
      experian: CreditReport;
      transunion: CreditReport;
    } | null = null;

    // 2. Enroll in UBI if requested
    if (options.enrollUBI !== false) {
      ubiEnrollment = await enrollInUBI(
        piUsername,
        piUserId, // Using Pi user ID as wallet address
        "US"
      );
      user.ubiRecipientId = ubiEnrollment.id;
    }

    // 3. Register for NESARA/GESARA if requested
    if (options.registerNESARA !== false) {
      nesaraProfile = await registerNESARA(piUserId, piUsername);
      user.nesaraProfileId = nesaraProfile.id;

      // Submit debts for forgiveness if provided
      if (options.debts) {
        await submitDebtForgiveness(nesaraProfile.id, {
          creditCardDebt: options.debts.creditCard,
          mortgageDebt: options.debts.mortgage,
          studentLoanDebt: options.debts.studentLoan,
          autoLoanDebt: options.debts.auto,
          medicalDebt: options.debts.medical,
          otherDebt: options.debts.other,
        });

        // Process debt forgiveness immediately
        await processDebtForgiveness(nesaraProfile.id);
      }

      // Activate prosperity funds
      await activateProsperity(nesaraProfile.id);
    }

    // 4. Pull credit reports if enabled
    if (options.enableCreditReporting !== false) {
      creditReports = await pullCreditReports(user.id, "****6789");
      user.creditProfileId = user.id;
    }

    return {
      user,
      ubiEnrollment,
      nesaraProfile,
      creditReports,
    };
  }

  // ==========================================================================
  // FINANCIAL DASHBOARD
  // ==========================================================================

  async getFinancialDashboard(
    userId: string
  ): Promise<FinancialDashboard | null> {
    const user = this.users.get(userId);
    if (!user) {
      return null;
    }

    // Get UBI status
    let ubiStatus = {
      enrolled: false,
      programs: [] as string[],
      nextPayment: null as Date | null,
      totalReceived: 0,
      pendingAmount: 0,
    };

    if (user.ubiRecipientId) {
      const recipient = await this.ubiEngine.getRecipient(user.ubiRecipientId);
      if (recipient) {
        ubiStatus = {
          enrolled: true,
          programs: ["pi-global-ubi"], // Default program
          nextPayment: recipient.lastDistribution
            ? new Date(
                recipient.lastDistribution.getTime() + 30 * 24 * 60 * 60 * 1000
              )
            : new Date(),
          totalReceived: recipient.totalReceived,
          pendingAmount: 0, // Calculate from pending distributions
        };
      }
    }

    // Get NESARA status
    let nesaraStatus = {
      registered: false,
      debtForgiven: 0,
      prosperityFundsEligible: 0,
      prosperityFundsReceived: 0,
      taxRefundDue: 0,
      status: "not-registered",
    };

    if (user.nesaraProfileId) {
      const profile = await this.nesaraEngine.getProfile(user.nesaraProfileId);
      if (profile) {
        nesaraStatus = {
          registered: true,
          debtForgiven: profile.debtForgiveness.forgivenAmount,
          prosperityFundsEligible: profile.prosperityFunds.eligibleAmount,
          prosperityFundsReceived: profile.prosperityFunds.distributedAmount,
          taxRefundDue: profile.taxReform.refundDue,
          status: profile.status,
        };
      }
    }

    // Get credit status
    const creditStatus = {
      scores: {
        equifax: null as number | null,
        experian: null as number | null,
        transunion: null as number | null,
      },
      averageScore: null as number | null,
      lastPulled: null as Date | null,
      activeDisputes: 0,
      piPaymentsReported: 0,
    };

    // Get Pi status (would integrate with actual Pi SDK)
    const piStatus = {
      balance: 0,
      pendingTransactions: 0,
      totalTransacted: 0,
      kycVerified: user.kycStatus === "verified",
    };

    return {
      user,
      ubi: ubiStatus,
      nesara: nesaraStatus,
      credit: creditStatus,
      pi: piStatus,
    };
  }

  // ==========================================================================
  // UNIFIED TRANSACTIONS
  // ==========================================================================

  async recordTransaction(
    userId: string,
    type: TransactionType,
    amount: number,
    currency: "PI" | "USD" | "EUR" | "GBP",
    source: TransactionSource,
    destination: string,
    metadata: Record<string, unknown> = {}
  ): Promise<UnifiedTransaction> {
    const transaction: UnifiedTransaction = {
      id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      userId,
      type,
      amount,
      currency,
      source,
      destination,
      status: "pending",
      createdAt: new Date(),
      completedAt: null,
      metadata,
    };

    const userTransactions = this.transactions.get(userId) || [];
    userTransactions.push(transaction);
    this.transactions.set(userId, userTransactions);

    return transaction;
  }

  async getUserTransactions(
    userId: string,
    options: {
      type?: TransactionType;
      source?: TransactionSource;
      status?: string;
      limit?: number;
    } = {}
  ): Promise<UnifiedTransaction[]> {
    let transactions = this.transactions.get(userId) || [];

    if (options.type) {
      transactions = transactions.filter((t) => t.type === options.type);
    }
    if (options.source) {
      transactions = transactions.filter((t) => t.source === options.source);
    }
    if (options.status) {
      transactions = transactions.filter((t) => t.status === options.status);
    }

    // Sort by date descending
    transactions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    if (options.limit) {
      transactions = transactions.slice(0, options.limit);
    }

    return transactions;
  }

  // ==========================================================================
  // CREDIT REPORTING INTEGRATION
  // ==========================================================================

  async reportPiActivityToCredit(
    userId: string,
    activities: PiNetworkCreditActivity[]
  ): Promise<{ success: boolean; estimatedScoreImpact: number }> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const result = await reportPiPayments(user.id, user.piUserId, activities);

    // Record transactions for reporting
    for (const activity of activities) {
      await this.recordTransaction(
        userId,
        "credit-payment",
        activity.amount,
        "PI",
        "pi-network",
        "credit-bureaus",
        {
          activityType: activity.type,
          reportedTo: ["equifax", "experian", "transunion"],
          scoreImpact: result.score_impact / activities.length,
        }
      );
    }

    return {
      success: result.success,
      estimatedScoreImpact: result.score_impact,
    };
  }

  // ==========================================================================
  // AUTOMATED DISTRIBUTIONS
  // ==========================================================================

  async processAllPendingDistributions(): Promise<{
    ubiDistributions: number;
    prosperityDistributions: number;
    totalAmount: number;
    currency: string;
  }> {
    let ubiDistributions = 0;
    let prosperityDistributions = 0;
    let totalAmount = 0;

    // Process UBI distributions
    for (const user of this.users.values()) {
      if (user.ubiRecipientId) {
        try {
          const distributions = await distributeUBI("pi-global-ubi", [
            user.ubiRecipientId,
          ]);
          if (distributions && distributions.length > 0) {
            const distribution = distributions[0];
            ubiDistributions++;
            totalAmount += distribution.amount;

            await this.recordTransaction(
              user.id,
              "ubi-distribution",
              distribution.amount,
              distribution.currency as "PI" | "USD",
              "ubi-program",
              user.piUserId,
              { distributionId: distribution.id }
            );
          }
        } catch (error) {
          console.error(`UBI distribution failed for user ${user.id}:`, error);
        }
      }

      // Process NESARA prosperity distributions
      if (user.nesaraProfileId) {
        try {
          const { amount, transactionId } =
            await this.nesaraEngine.distributeProsperityPayment(
              user.nesaraProfileId
            );
          prosperityDistributions++;
          totalAmount += amount;

          await this.recordTransaction(
            user.id,
            "prosperity-distribution",
            amount,
            "USD",
            "nesara-prosperity",
            user.piUserId,
            { transactionId }
          );
        } catch (error) {
          // No pending payments or other error
        }
      }
    }

    return {
      ubiDistributions,
      prosperityDistributions,
      totalAmount,
      currency: "USD",
    };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const financialHub = FinancialIntegrationHub.getInstance();

export async function onboardNewUser(
  piUserId: string,
  piUsername: string,
  email: string,
  debts?: {
    creditCard?: number;
    mortgage?: number;
    studentLoan?: number;
    auto?: number;
    medical?: number;
    other?: number;
  }
): Promise<{
  user: TriumphUser;
  ubiEnrollment: UBIRecipient | null;
  nesaraProfile: NESARAProfile | null;
}> {
  const result = await financialHub.completeFullOnboarding(
    piUserId,
    piUsername,
    email,
    {
      enrollUBI: true,
      registerNESARA: true,
      enableCreditReporting: true,
      debts,
    }
  );

  return {
    user: result.user,
    ubiEnrollment: result.ubiEnrollment,
    nesaraProfile: result.nesaraProfile,
  };
}

export async function getDashboard(
  userId: string
): Promise<FinancialDashboard | null> {
  return financialHub.getFinancialDashboard(userId);
}

export async function processDistributions(): Promise<void> {
  const result = await financialHub.processAllPendingDistributions();
  console.log(
    `Processed ${result.ubiDistributions} UBI and ${result.prosperityDistributions} prosperity distributions. Total: $${result.totalAmount.toLocaleString()}`
  );
}

/**
 * Triumph Synergy - Banking Partners Integration Platform
 * 
 * Unified banking integration layer for financial institution partnerships
 * Supports traditional banking, digital banks, and Pi Network hybrid accounts
 * 
 * @module lib/banking/banking-partners-platform
 * @version 1.0.0
 */

// ============================================================================
// CONSTANTS
// ============================================================================

// Dual Pi Value System
// Internally mined/contributed Pi = 1000x multiplier
// External/non-contributed Pi = base rate
const PI_EXTERNAL_RATE = 314.159;  // External non-contributed Pi
const PI_INTERNAL_RATE = 314159;   // Internally mined/contributed Pi (1000x)
const PI_INTERNAL_MULTIPLIER = 1000;

export type PiValueType = "internal" | "external";

export function getPiRate(type: PiValueType = "external"): number {
  return type === "internal" ? PI_INTERNAL_RATE : PI_EXTERNAL_RATE;
}

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface BankingPartner {
  id: string;
  name: string;
  type: BankType;
  status: PartnerStatus;
  
  // Institution Details
  routingNumber: string;
  swiftCode: string | null;
  ibanPrefix: string | null;
  charteredIn: string;
  fdicsInsured: boolean;
  ncuaInsured: boolean;
  
  // Contact
  headquarters: Address;
  primaryContact: ContactInfo;
  technicalContact: ContactInfo;
  
  // Integration
  apiEndpoint: string;
  apiVersion: string;
  authMethod: AuthMethod;
  supportedOperations: BankingOperation[];
  rateLimit: number;
  
  // Capabilities
  capabilities: BankCapabilities;
  
  // Pi Network
  piNetworkEnabled: boolean;
  piCustodySupported: boolean;
  piSettlementAccount: string | null;
  
  // Compliance
  compliance: ComplianceInfo;
  
  // Metrics
  metrics: PartnerMetrics;
  
  // Timestamps
  partnerSince: Date;
  lastActiveAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type BankType = 
  | "commercial"
  | "investment"
  | "retail"
  | "credit-union"
  | "digital"
  | "neo-bank"
  | "central-bank"
  | "custodian";

export type PartnerStatus = 
  | "pending"
  | "onboarding"
  | "active"
  | "suspended"
  | "terminated";

export type AuthMethod = 
  | "oauth2"
  | "api-key"
  | "mtls"
  | "jwt"
  | "basic";

export type BankingOperation = 
  | "account-inquiry"
  | "balance-check"
  | "transfer-ach"
  | "transfer-wire"
  | "transfer-rtp"
  | "transfer-international"
  | "payment-processing"
  | "direct-deposit"
  | "check-deposit"
  | "card-issuance"
  | "loan-origination"
  | "pi-conversion"
  | "pi-custody"
  | "stablecoin-minting";

export interface Address {
  street: string;
  suite: string | null;
  city: string;
  state: string;
  zip: string;
  country: string;
}

export interface ContactInfo {
  name: string;
  title: string;
  email: string;
  phone: string;
  department: string;
}

export interface BankCapabilities {
  achOrigination: boolean;
  wireTransfer: boolean;
  rtpNetwork: boolean;
  internationalWire: boolean;
  cardIssuing: boolean;
  checkProcessing: boolean;
  mobileBanking: boolean;
  openBanking: boolean;
  piNetworkBridge: boolean;
  cryptoCustody: boolean;
  stablecoinSupport: boolean;
  lendingServices: boolean;
  wealthManagement: boolean;
}

export interface ComplianceInfo {
  kycAmlProvider: string;
  ofacScreening: boolean;
  pciDssCompliant: boolean;
  soc2Certified: boolean;
  iso27001Certified: boolean;
  regulators: string[];
  lastAuditDate: Date;
  nextAuditDate: Date;
}

export interface PartnerMetrics {
  totalTransactions: number;
  totalVolume: number;
  avgTransactionTime: number;
  successRate: number;
  disputeRate: number;
  piConversions: number;
  piVolume: number;
}

export interface BankAccount {
  id: string;
  partnerId: string;
  userId: string;
  type: AccountType;
  status: AccountStatus;
  
  // Account Details
  accountNumber: string;  // Encrypted
  routingNumber: string;
  accountName: string;
  currency: string;
  
  // Balances
  availableBalance: number;
  currentBalance: number;
  pendingBalance: number;
  
  // Pi Integration
  linkedPiWallet: string | null;
  piAutoConvert: boolean;
  piConversionThreshold: number;
  
  // Features
  features: AccountFeature[];
  limits: AccountLimits;
  
  // Timestamps
  openedAt: Date;
  lastTransactionAt: Date | null;
}

export type AccountType = 
  | "checking"
  | "savings"
  | "money-market"
  | "cd"
  | "ira"
  | "business-checking"
  | "business-savings"
  | "pi-hybrid"
  | "custody";

export type AccountStatus = 
  | "pending"
  | "active"
  | "frozen"
  | "closed";

export interface AccountFeature {
  name: string;
  enabled: boolean;
  limit: number | null;
}

export interface AccountLimits {
  dailyWithdrawal: number;
  dailyTransfer: number;
  monthlyTransfer: number;
  singleTransactionMax: number;
  piDailyConversion: number;
}

export interface Transaction {
  id: string;
  partnerId: string;
  accountId: string;
  type: TransactionType;
  status: TransactionStatus;
  
  // Details
  amount: number;
  currency: string;
  description: string;
  reference: string;
  
  // Parties
  fromAccount: string;
  toAccount: string;
  fromRoutingNumber: string | null;
  toRoutingNumber: string | null;
  
  // Pi Network
  piConversionRate: number | null;
  piAmount: number | null;
  piTransactionHash: string | null;
  
  // Timing
  initiatedAt: Date;
  processedAt: Date | null;
  settledAt: Date | null;
  
  // Metadata
  metadata: Record<string, unknown>;
}

export type TransactionType = 
  | "deposit"
  | "withdrawal"
  | "transfer-internal"
  | "transfer-ach"
  | "transfer-wire"
  | "transfer-rtp"
  | "payment"
  | "refund"
  | "pi-conversion"
  | "fee";

export type TransactionStatus = 
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "cancelled"
  | "reversed";

export interface DirectDepositSetup {
  id: string;
  accountId: string;
  employerName: string;
  employerId: string | null;
  depositType: "full" | "fixed" | "percentage";
  amount: number | null;
  percentage: number | null;
  status: "pending" | "active" | "cancelled";
  startDate: Date;
  lastDepositAt: Date | null;
}

export interface PaymentInstruction {
  id: string;
  type: "ach" | "wire" | "rtp" | "pi";
  direction: "inbound" | "outbound";
  
  // Source
  sourceAccount: string;
  sourceRouting: string | null;
  sourceName: string;
  
  // Destination
  destAccount: string;
  destRouting: string | null;
  destName: string;
  destBank: string | null;
  
  // Amount
  amount: number;
  currency: string;
  
  // Pi Conversion
  convertToPi: boolean;
  piDestWallet: string | null;
  
  // Schedule
  scheduleType: "immediate" | "scheduled" | "recurring";
  scheduledDate: Date | null;
  recurringFrequency: string | null;
  
  // Memo
  memo: string;
  internalNotes: string;
}

// ============================================================================
// BANKING PARTNERS PLATFORM CLASS
// ============================================================================

class BankingPartnersPlatform {
  private partners: Map<string, BankingPartner> = new Map();
  private accounts: Map<string, BankAccount> = new Map();
  private transactions: Map<string, Transaction> = new Map();

  constructor() {
    this.initializePartners();
  }

  private initializePartners(): void {
    // Pre-configured banking partners
    const defaultPartners: Omit<BankingPartner, "id" | "createdAt" | "updatedAt">[] = [
      {
        name: "Pi Federal Reserve Integration",
        type: "central-bank",
        status: "active",
        routingNumber: "000000001",
        swiftCode: "PIFRXXXX",
        ibanPrefix: null,
        charteredIn: "Global",
        fdicsInsured: false,
        ncuaInsured: false,
        headquarters: {
          street: "Pi Network HQ",
          suite: null,
          city: "Palo Alto",
          state: "CA",
          zip: "94301",
          country: "USA",
        },
        primaryContact: {
          name: "Pi Banking Integration",
          title: "Director",
          email: "banking@minepi.com",
          phone: "1-800-PI-NETWORK",
          department: "Banking Partnerships",
        },
        technicalContact: {
          name: "Pi Tech Team",
          title: "Lead Engineer",
          email: "tech@minepi.com",
          phone: "1-800-PI-TECH",
          department: "Engineering",
        },
        apiEndpoint: "https://api.minepi.com/v2/banking",
        apiVersion: "2.0",
        authMethod: "oauth2",
        supportedOperations: [
          "pi-conversion",
          "pi-custody",
          "transfer-rtp",
          "stablecoin-minting",
        ],
        rateLimit: 10000,
        capabilities: {
          achOrigination: false,
          wireTransfer: false,
          rtpNetwork: true,
          internationalWire: false,
          cardIssuing: false,
          checkProcessing: false,
          mobileBanking: true,
          openBanking: true,
          piNetworkBridge: true,
          cryptoCustody: true,
          stablecoinSupport: true,
          lendingServices: false,
          wealthManagement: false,
        },
        piNetworkEnabled: true,
        piCustodySupported: true,
        piSettlementAccount: "triumph-synergy-treasury",
        compliance: {
          kycAmlProvider: "Pi Network Native",
          ofacScreening: true,
          pciDssCompliant: true,
          soc2Certified: true,
          iso27001Certified: true,
          regulators: ["Self-Regulated"],
          lastAuditDate: new Date("2025-06-01"),
          nextAuditDate: new Date("2026-06-01"),
        },
        metrics: {
          totalTransactions: 0,
          totalVolume: 0,
          avgTransactionTime: 3,
          successRate: 99.9,
          disputeRate: 0.01,
          piConversions: 0,
          piVolume: 0,
        },
        partnerSince: new Date("2025-01-01"),
        lastActiveAt: new Date(),
      },
      {
        name: "Triumph Digital Bank",
        type: "neo-bank",
        status: "active",
        routingNumber: "314159265",
        swiftCode: "TRIUXXXX",
        ibanPrefix: "US",
        charteredIn: "Nevada",
        fdicsInsured: true,
        ncuaInsured: false,
        headquarters: {
          street: "100 Digital Way",
          suite: "500",
          city: "Las Vegas",
          state: "NV",
          zip: "89101",
          country: "USA",
        },
        primaryContact: {
          name: "Triumph Banking",
          title: "Partnership Manager",
          email: "partners@triumphbank.com",
          phone: "1-800-TRIUMPH",
          department: "Partnerships",
        },
        technicalContact: {
          name: "Triumph API Team",
          title: "API Lead",
          email: "api@triumphbank.com",
          phone: "1-800-TRIUMPH-API",
          department: "Technology",
        },
        apiEndpoint: "https://api.triumphbank.com/v1",
        apiVersion: "1.0",
        authMethod: "oauth2",
        supportedOperations: [
          "account-inquiry",
          "balance-check",
          "transfer-ach",
          "transfer-wire",
          "transfer-rtp",
          "payment-processing",
          "direct-deposit",
          "card-issuance",
          "pi-conversion",
        ],
        rateLimit: 5000,
        capabilities: {
          achOrigination: true,
          wireTransfer: true,
          rtpNetwork: true,
          internationalWire: true,
          cardIssuing: true,
          checkProcessing: true,
          mobileBanking: true,
          openBanking: true,
          piNetworkBridge: true,
          cryptoCustody: false,
          stablecoinSupport: true,
          lendingServices: true,
          wealthManagement: false,
        },
        piNetworkEnabled: true,
        piCustodySupported: false,
        piSettlementAccount: null,
        compliance: {
          kycAmlProvider: "Plaid + Jumio",
          ofacScreening: true,
          pciDssCompliant: true,
          soc2Certified: true,
          iso27001Certified: true,
          regulators: ["OCC", "FDIC", "FinCEN"],
          lastAuditDate: new Date("2025-09-01"),
          nextAuditDate: new Date("2026-09-01"),
        },
        metrics: {
          totalTransactions: 0,
          totalVolume: 0,
          avgTransactionTime: 15,
          successRate: 99.5,
          disputeRate: 0.05,
          piConversions: 0,
          piVolume: 0,
        },
        partnerSince: new Date("2025-06-01"),
        lastActiveAt: new Date(),
      },
    ];

    for (const partner of defaultPartners) {
      const id = `partner-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      this.partners.set(id, {
        ...partner,
        id,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  }

  // ==========================================================================
  // PARTNER MANAGEMENT
  // ==========================================================================

  async addPartner(partnerData: Omit<BankingPartner, "id" | "createdAt" | "updatedAt" | "metrics">): Promise<BankingPartner> {
    const id = `partner-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    const partner: BankingPartner = {
      ...partnerData,
      id,
      metrics: {
        totalTransactions: 0,
        totalVolume: 0,
        avgTransactionTime: 0,
        successRate: 100,
        disputeRate: 0,
        piConversions: 0,
        piVolume: 0,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.partners.set(id, partner);
    return partner;
  }

  async getPartner(partnerId: string): Promise<BankingPartner | null> {
    return this.partners.get(partnerId) || null;
  }

  async listPartners(filters?: {
    type?: BankType;
    status?: PartnerStatus;
    piEnabled?: boolean;
  }): Promise<BankingPartner[]> {
    let partners = Array.from(this.partners.values());

    if (filters?.type) {
      partners = partners.filter((p) => p.type === filters.type);
    }
    if (filters?.status) {
      partners = partners.filter((p) => p.status === filters.status);
    }
    if (filters?.piEnabled !== undefined) {
      partners = partners.filter((p) => p.piNetworkEnabled === filters.piEnabled);
    }

    return partners;
  }

  // ==========================================================================
  // ACCOUNT MANAGEMENT
  // ==========================================================================

  async openAccount(accountData: {
    partnerId: string;
    userId: string;
    type: AccountType;
    accountName: string;
    linkedPiWallet?: string;
    piAutoConvert?: boolean;
    piConversionThreshold?: number;
  }): Promise<BankAccount> {
    const partner = this.partners.get(accountData.partnerId);
    if (!partner) {
      throw new Error("Banking partner not found");
    }

    const id = `acct-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const accountNumber = Math.random().toString().slice(2, 14);

    const account: BankAccount = {
      id,
      partnerId: accountData.partnerId,
      userId: accountData.userId,
      type: accountData.type,
      status: "pending",
      accountNumber,
      routingNumber: partner.routingNumber,
      accountName: accountData.accountName,
      currency: "USD",
      availableBalance: 0,
      currentBalance: 0,
      pendingBalance: 0,
      linkedPiWallet: accountData.linkedPiWallet || null,
      piAutoConvert: accountData.piAutoConvert || false,
      piConversionThreshold: accountData.piConversionThreshold || 100,
      features: [
        { name: "Online Banking", enabled: true, limit: null },
        { name: "Mobile Deposit", enabled: true, limit: 5000 },
        { name: "Bill Pay", enabled: true, limit: null },
        { name: "Pi Conversion", enabled: partner.piNetworkEnabled, limit: 10000 },
      ],
      limits: {
        dailyWithdrawal: 1000,
        dailyTransfer: 5000,
        monthlyTransfer: 50000,
        singleTransactionMax: 10000,
        piDailyConversion: 10000,
      },
      openedAt: new Date(),
      lastTransactionAt: null,
    };

    this.accounts.set(id, account);
    return account;
  }

  async getAccount(accountId: string): Promise<BankAccount | null> {
    return this.accounts.get(accountId) || null;
  }

  async getUserAccounts(userId: string): Promise<BankAccount[]> {
    return Array.from(this.accounts.values()).filter((a) => a.userId === userId);
  }

  async activateAccount(accountId: string): Promise<BankAccount> {
    const account = this.accounts.get(accountId);
    if (!account) {
      throw new Error("Account not found");
    }

    account.status = "active";
    return account;
  }

  // ==========================================================================
  // TRANSACTIONS
  // ==========================================================================

  async initiateTransfer(transferData: {
    accountId: string;
    type: TransactionType;
    amount: number;
    toAccount: string;
    toRoutingNumber?: string;
    description: string;
    convertToPi?: boolean;
    piDestWallet?: string;
  }): Promise<Transaction> {
    const account = this.accounts.get(transferData.accountId);
    if (!account) {
      throw new Error("Account not found");
    }

    if (account.status !== "active") {
      throw new Error("Account is not active");
    }

    if (account.availableBalance < transferData.amount) {
      throw new Error("Insufficient funds");
    }

    const id = `txn-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const reference = `REF-${Date.now().toString().slice(-10)}`;

    let piAmount: number | null = null;
    let piConversionRate: number | null = null;

    if (transferData.convertToPi) {
      piConversionRate = PI_EXTERNAL_RATE;
      piAmount = transferData.amount / PI_EXTERNAL_RATE;
    }

    const transaction: Transaction = {
      id,
      partnerId: account.partnerId,
      accountId: transferData.accountId,
      type: transferData.type,
      status: "pending",
      amount: transferData.amount,
      currency: account.currency,
      description: transferData.description,
      reference,
      fromAccount: account.accountNumber,
      toAccount: transferData.toAccount,
      fromRoutingNumber: account.routingNumber,
      toRoutingNumber: transferData.toRoutingNumber || null,
      piConversionRate,
      piAmount,
      piTransactionHash: null,
      initiatedAt: new Date(),
      processedAt: null,
      settledAt: null,
      metadata: {
        piDestWallet: transferData.piDestWallet,
      },
    };

    // Debit account
    account.availableBalance -= transferData.amount;
    account.pendingBalance += transferData.amount;
    account.lastTransactionAt = new Date();

    this.transactions.set(id, transaction);

    // Simulate processing
    this.processTransaction(id);

    return transaction;
  }

  private async processTransaction(transactionId: string): Promise<void> {
    const transaction = this.transactions.get(transactionId);
    if (!transaction) return;

    // Simulate processing delay
    setTimeout(() => {
      transaction.status = "processing";
      transaction.processedAt = new Date();

      // Simulate settlement
      setTimeout(() => {
        transaction.status = "completed";
        transaction.settledAt = new Date();

        if (transaction.piAmount) {
          transaction.piTransactionHash = `0x${Math.random().toString(16).slice(2, 66)}`;
        }

        // Update account
        const account = this.accounts.get(transaction.accountId);
        if (account) {
          account.pendingBalance -= transaction.amount;
          account.currentBalance -= transaction.amount;
        }

        // Update partner metrics
        const partner = this.partners.get(transaction.partnerId);
        if (partner) {
          partner.metrics.totalTransactions++;
          partner.metrics.totalVolume += transaction.amount;
          if (transaction.piAmount) {
            partner.metrics.piConversions++;
            partner.metrics.piVolume += transaction.piAmount;
          }
        }
      }, 2000);
    }, 1000);
  }

  async getTransaction(transactionId: string): Promise<Transaction | null> {
    return this.transactions.get(transactionId) || null;
  }

  async getAccountTransactions(accountId: string): Promise<Transaction[]> {
    return Array.from(this.transactions.values())
      .filter((t) => t.accountId === accountId)
      .sort((a, b) => b.initiatedAt.getTime() - a.initiatedAt.getTime());
  }

  // ==========================================================================
  // PI NETWORK BRIDGE
  // ==========================================================================

  async convertToPi(
    accountId: string,
    amount: number,
    piWallet: string
  ): Promise<{
    transactionId: string;
    usdAmount: number;
    piAmount: number;
    rate: number;
    piTxHash: string;
  }> {
    const transaction = await this.initiateTransfer({
      accountId,
      type: "pi-conversion",
      amount,
      toAccount: piWallet,
      description: "USD to Pi Conversion",
      convertToPi: true,
      piDestWallet: piWallet,
    });

    return {
      transactionId: transaction.id,
      usdAmount: amount,
      piAmount: amount / PI_EXTERNAL_RATE,
      rate: PI_EXTERNAL_RATE,
      piTxHash: `pending-${transaction.id}`,
    };
  }

  async convertFromPi(
    accountId: string,
    piAmount: number,
    piWallet: string,
    piTxHash: string
  ): Promise<{
    transactionId: string;
    piAmount: number;
    usdAmount: number;
    rate: number;
  }> {
    const account = this.accounts.get(accountId);
    if (!account) {
      throw new Error("Account not found");
    }

    const usdAmount = piAmount * PI_EXTERNAL_RATE;
    const id = `txn-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    const transaction: Transaction = {
      id,
      partnerId: account.partnerId,
      accountId,
      type: "deposit",
      status: "completed",
      amount: usdAmount,
      currency: "USD",
      description: "Pi to USD Conversion",
      reference: `PI-${piTxHash.slice(0, 16)}`,
      fromAccount: piWallet,
      toAccount: account.accountNumber,
      fromRoutingNumber: null,
      toRoutingNumber: account.routingNumber,
      piConversionRate: PI_EXTERNAL_RATE,
      piAmount,
      piTransactionHash: piTxHash,
      initiatedAt: new Date(),
      processedAt: new Date(),
      settledAt: new Date(),
      metadata: { piWallet },
    };

    // Credit account
    account.availableBalance += usdAmount;
    account.currentBalance += usdAmount;
    account.lastTransactionAt = new Date();

    this.transactions.set(id, transaction);

    return {
      transactionId: id,
      piAmount,
      usdAmount,
      rate: PI_EXTERNAL_RATE,
    };
  }

  // ==========================================================================
  // DIRECT DEPOSIT
  // ==========================================================================

  async setupDirectDeposit(
    accountId: string,
    setupData: {
      employerName: string;
      employerId?: string;
      depositType: "full" | "fixed" | "percentage";
      amount?: number;
      percentage?: number;
    }
  ): Promise<DirectDepositSetup> {
    const account = this.accounts.get(accountId);
    if (!account) {
      throw new Error("Account not found");
    }

    const setup: DirectDepositSetup = {
      id: `dd-${Date.now()}`,
      accountId,
      employerName: setupData.employerName,
      employerId: setupData.employerId || null,
      depositType: setupData.depositType,
      amount: setupData.amount || null,
      percentage: setupData.percentage || null,
      status: "pending",
      startDate: new Date(),
      lastDepositAt: null,
    };

    return setup;
  }

  getDirectDepositForm(accountId: string): string {
    const account = this.accounts.get(accountId);
    if (!account) {
      throw new Error("Account not found");
    }

    const partner = this.partners.get(account.partnerId);

    return `
      DIRECT DEPOSIT AUTHORIZATION FORM
      
      Bank Name: ${partner?.name || "Triumph Synergy Banking Partner"}
      Routing Number: ${account.routingNumber}
      Account Number: ${account.accountNumber}
      Account Type: ${account.type.toUpperCase()}
      Account Holder: ${account.accountName}
      
      Please provide this information to your employer's
      payroll department to set up direct deposit.
      
      For Pi Network auto-conversion, ensure Pi wallet
      ${account.linkedPiWallet || "(not linked)"} is connected.
    `;
  }

  // ==========================================================================
  // STATISTICS
  // ==========================================================================

  async getPlatformStats(): Promise<{
    totalPartners: number;
    activePartners: number;
    totalAccounts: number;
    activeAccounts: number;
    totalTransactions: number;
    totalVolume: number;
    piConversions: number;
    piVolume: number;
  }> {
    const partners = Array.from(this.partners.values());
    const accounts = Array.from(this.accounts.values());
    const transactions = Array.from(this.transactions.values());

    return {
      totalPartners: partners.length,
      activePartners: partners.filter((p) => p.status === "active").length,
      totalAccounts: accounts.length,
      activeAccounts: accounts.filter((a) => a.status === "active").length,
      totalTransactions: transactions.length,
      totalVolume: transactions.reduce((sum, t) => sum + t.amount, 0),
      piConversions: transactions.filter((t) => t.piAmount).length,
      piVolume: transactions.reduce((sum, t) => sum + (t.piAmount || 0), 0),
    };
  }

  // ==========================================================================
  // UTILITIES - DUAL PI VALUE SYSTEM
  // ==========================================================================

  getPiToUsdRate(type: PiValueType = "external"): number {
    return getPiRate(type);
  }

  getInternalPiRate(): number {
    return PI_INTERNAL_RATE;
  }

  getExternalPiRate(): number {
    return PI_EXTERNAL_RATE;
  }

  convertPiToUsd(piAmount: number, type: PiValueType = "external"): number {
    return piAmount * getPiRate(type);
  }

  convertUsdToPi(usdAmount: number, type: PiValueType = "external"): number {
    return usdAmount / getPiRate(type);
  }

  getDualRateInfo(): { internal: number; external: number; multiplier: number } {
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

export const bankingPartnersPlatform = new BankingPartnersPlatform();

// Export helper functions
export async function addBankingPartner(
  data: Parameters<typeof bankingPartnersPlatform.addPartner>[0]
): Promise<BankingPartner> {
  return bankingPartnersPlatform.addPartner(data);
}

export async function openBankAccount(
  data: Parameters<typeof bankingPartnersPlatform.openAccount>[0]
): Promise<BankAccount> {
  return bankingPartnersPlatform.openAccount(data);
}

export async function initiateTransfer(
  data: Parameters<typeof bankingPartnersPlatform.initiateTransfer>[0]
): Promise<Transaction> {
  return bankingPartnersPlatform.initiateTransfer(data);
}

export async function convertToPi(
  accountId: string,
  amount: number,
  piWallet: string
): Promise<ReturnType<typeof bankingPartnersPlatform.convertToPi>> {
  return bankingPartnersPlatform.convertToPi(accountId, amount, piWallet);
}

export async function convertFromPi(
  accountId: string,
  piAmount: number,
  piWallet: string,
  piTxHash: string
): Promise<ReturnType<typeof bankingPartnersPlatform.convertFromPi>> {
  return bankingPartnersPlatform.convertFromPi(accountId, piAmount, piWallet, piTxHash);
}

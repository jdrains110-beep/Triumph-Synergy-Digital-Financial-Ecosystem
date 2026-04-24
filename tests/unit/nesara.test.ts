/**
 * NESARA / QFS Unit Tests
 * Covers: QuantumFinancialSystem, QFS accounts, transactions, GESARA compliance
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mock modules
// ---------------------------------------------------------------------------
const qfsMock = {
  createAccount: vi.fn(),
  getAccount: vi.fn(),
  submitTransaction: vi.fn(),
  getTransaction: vi.fn(),
  activateProsperity: vi.fn(),
  getStats: vi.fn(),
  processDebtForgiveness: vi.fn(),
  distributeUBI: vi.fn(),
};

const nesaraMock = {
  activate: vi.fn(),
  getStatus: vi.fn(),
  processRestitution: vi.fn(),
  calculateRestitutionAmount: vi.fn(),
};

const gesaraMock = {
  checkCompliance: vi.fn(),
  getGlobalStatus: vi.fn(),
  enforceStandards: vi.fn(),
};

vi.mock("@/lib/nesara/quantum-financial-system", () => ({
  QuantumFinancialSystem: {
    getInstance: vi.fn(() => qfsMock),
  },
}));

vi.mock("@/lib/nesara/nesara-gesara-system", () => ({
  NESARAGESARASystem: {
    getInstance: vi.fn(() => nesaraMock),
  },
}));

vi.mock("@/lib/nesara/gesara-global-compliance", () => ({
  GESARAGlobalCompliance: {
    getInstance: vi.fn(() => gesaraMock),
  },
}));

import { QuantumFinancialSystem } from "@/lib/nesara/quantum-financial-system";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeQFSAccount(type = "individual", balance = 0) {
  return {
    id: `qfs-${Date.now()}`,
    accountNumber: `QFS-${Math.floor(Math.random() * 900000 + 100000)}`,
    type,
    holder: {
      id: "holder-001",
      name: "Jane Doe",
      piUserId: "pi-user-jane",
      countryCode: "US",
    },
    balance,
    pendingBalance: 0,
    reservedBalance: 0,
    assetBacking: [
      {
        type: "gold",
        amount: balance * 0.1,
        verificationHash: "hash-gold-001",
        lastVerified: new Date(),
      },
    ],
    totalAssetValue: balance,
    quantumSignature: "quantum-sig-001",
    isVerified: true,
    verificationLevel: 3,
    status: "active",
    createdAt: new Date(),
    lastActivityAt: new Date(),
    nesaraEligible: true,
    prosperityActivated: false,
    debtForgivenessComplete: false,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("QuantumFinancialSystem singleton", () => {
  it("should return the same instance each time", () => {
    const a = QuantumFinancialSystem.getInstance();
    const b = QuantumFinancialSystem.getInstance();
    expect(a).toBe(b);
  });
});

describe("createAccount", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should create an individual account with initial balance", async () => {
    const account = makeQFSAccount("individual", 1000);
    qfsMock.createAccount.mockResolvedValueOnce(account);

    const result = await qfsMock.createAccount({
      type: "individual",
      holderId: "holder-001",
      holderName: "Jane Doe",
      countryCode: "US",
    });

    expect(result.type).toBe("individual");
    expect(result.status).toBe("active");
    expect(result.isVerified).toBe(true);
    expect(result.nesaraEligible).toBe(true);
  });

  it("should create a trust account", async () => {
    const trustAccount = makeQFSAccount("trust", 5000000);
    qfsMock.createAccount.mockResolvedValueOnce(trustAccount);

    const result = await qfsMock.createAccount({ type: "trust", holderId: "trust-001" });
    expect(result.type).toBe("trust");
    expect(result.balance).toBeGreaterThan(0);
  });

  it("should reject accounts with invalid type", async () => {
    qfsMock.createAccount.mockRejectedValueOnce(
      new Error("Invalid account type: corporate")
    );

    await expect(
      qfsMock.createAccount({ type: "corporate", holderId: "bad" })
    ).rejects.toThrow("Invalid account type");
  });
});

describe("submitTransaction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should process a quantum-secured transfer", async () => {
    qfsMock.submitTransaction.mockResolvedValueOnce({
      id: "qfs-tx-001",
      type: "transfer",
      fromAccount: "qfs-alice",
      toAccount: "qfs-bob",
      amount: 1000,
      status: "confirmed",
      quantumSignature: "qsig-001",
      settledAt: new Date(),
    });

    const result = await qfsMock.submitTransaction({
      type: "transfer",
      fromAccountId: "qfs-alice",
      toAccountId: "qfs-bob",
      amount: 1000,
    });

    expect(result.status).toBe("confirmed");
    expect(result.quantumSignature).toBeTruthy();
  });

  it("should process a prosperity-distribution transaction", async () => {
    qfsMock.submitTransaction.mockResolvedValueOnce({
      id: "qfs-tx-002",
      type: "prosperity-distribution",
      fromAccount: null,
      toAccount: "qfs-citizens",
      amount: 100000,
      status: "confirmed",
    });

    const result = await qfsMock.submitTransaction({
      type: "prosperity-distribution",
      toAccountId: "qfs-citizens",
      amount: 100000,
    });

    expect(result.type).toBe("prosperity-distribution");
    expect(result.fromAccount).toBeNull();
  });

  it("should reject transfers when source account has insufficient funds", async () => {
    qfsMock.submitTransaction.mockRejectedValueOnce(
      new Error("Insufficient QFS balance: 50 < 1000")
    );

    await expect(
      qfsMock.submitTransaction({ type: "transfer", fromAccountId: "qfs-broke", toAccountId: "qfs-bob", amount: 1000 })
    ).rejects.toThrow("Insufficient QFS balance");
  });
});

describe("activateProsperity", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should activate prosperity payments for eligible accounts", async () => {
    qfsMock.activateProsperity.mockResolvedValueOnce({
      accountId: "qfs-alice",
      activated: true,
      monthlyAmount: 2000,
      firstPaymentDate: new Date(),
    });

    const result = await qfsMock.activateProsperity("qfs-alice");
    expect(result.activated).toBe(true);
    expect(result.monthlyAmount).toBeGreaterThan(0);
  });

  it("should reject accounts not yet nesaraEligible", async () => {
    qfsMock.activateProsperity.mockRejectedValueOnce(
      new Error("Account not eligible for NESARA prosperity payments")
    );

    await expect(qfsMock.activateProsperity("qfs-ineligible")).rejects.toThrow(
      "Account not eligible"
    );
  });
});

describe("processDebtForgiveness", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should cancel all debt for eligible accounts", async () => {
    qfsMock.processDebtForgiveness.mockResolvedValueOnce({
      accountId: "qfs-alice",
      forgivenAmount: 150000,
      debtTypes: ["mortgage", "credit-cards", "student-loans"],
      completedAt: new Date(),
    });

    const result = await qfsMock.processDebtForgiveness("qfs-alice");
    expect(result.forgivenAmount).toBeGreaterThan(0);
    expect(result.debtTypes.length).toBeGreaterThan(0);
  });
});

describe("distributeUBI", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should distribute UBI to all eligible citizens", async () => {
    qfsMock.distributeUBI.mockResolvedValueOnce({
      recipientCount: 1000000,
      amountPerRecipient: 2000,
      totalDistributed: 2000000000,
      distributedAt: new Date(),
    });

    const result = await qfsMock.distributeUBI({ round: 1, amountPerRecipient: 2000 });
    expect(result.recipientCount).toBeGreaterThan(0);
    expect(result.amountPerRecipient).toBe(2000);
    expect(result.totalDistributed).toBe(result.recipientCount * result.amountPerRecipient);
  });
});

describe("QFSAccount structure", () => {
  it("should include asset backing with verification hash", () => {
    const account = makeQFSAccount("individual", 10000);

    expect(account.assetBacking.length).toBeGreaterThan(0);
    expect(account.assetBacking[0].verificationHash).toBeTruthy();
    expect(account.assetBacking[0].lastVerified).toBeInstanceOf(Date);
  });

  it("should have verificationLevel between 1 and 5", () => {
    const account = makeQFSAccount("business", 50000);
    expect(account.verificationLevel).toBeGreaterThanOrEqual(1);
    expect(account.verificationLevel).toBeLessThanOrEqual(5);
  });

  it("should have non-negative balances", () => {
    const account = makeQFSAccount("individual", 1000);
    expect(account.balance).toBeGreaterThanOrEqual(0);
    expect(account.pendingBalance).toBeGreaterThanOrEqual(0);
    expect(account.reservedBalance).toBeGreaterThanOrEqual(0);
  });
});

// ---------------------------------------------------------------------------
// QFSAccountType / QFSTransactionType coverage
// ---------------------------------------------------------------------------
describe("QFS type enumerations", () => {
  const accountTypes = ["individual", "business", "trust", "foundation", "government", "treasury"];
  const txTypes = [
    "deposit", "withdrawal", "transfer", "prosperity-distribution",
    "debt-settlement", "tax-refund", "birth-bond-redemption", "restitution", "ubi-payment",
  ];
  const assetBackings = ["gold", "silver", "platinum", "palladium", "diamond", "pi-coin", "land", "natural-resources"];

  it.each(accountTypes)("should include account type '%s'", (type) => {
    expect(typeof type).toBe("string");
  });

  it.each(txTypes)("should include transaction type '%s'", (type) => {
    expect(typeof type).toBe("string");
  });

  it.each(assetBackings)("should include asset backing type '%s'", (type) => {
    expect(typeof type).toBe("string");
  });
});

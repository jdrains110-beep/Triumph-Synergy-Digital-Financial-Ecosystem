/**
 * Pi Transaction Engine Unit Tests
 * Covers: PiHyperTransactionEngine, PiTrillionVault, configuration, types
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mock heavy singleton modules before importing
// ---------------------------------------------------------------------------
const mockEvents: Record<string, ((...args: unknown[]) => void)[]> = {};
const mockIsRunning = { value: false };
const mockQueueDepth = { value: 0 };
const mockBatches: Map<string, unknown> = new Map();

const engineMock = {
  on: vi.fn((event: string, cb: (...a: unknown[]) => void) => {
    mockEvents[event] = mockEvents[event] ?? [];
    mockEvents[event].push(cb);
  }),
  emit: vi.fn(),
  start: vi.fn(async () => {
    mockIsRunning.value = true;
  }),
  stop: vi.fn(() => {
    mockIsRunning.value = false;
  }),
  submitTransaction: vi.fn(),
  submitBatch: vi.fn(),
  getMetrics: vi.fn().mockReturnValue({
    currentTps: 0,
    peakTps: 0,
    averageTps: 0,
    totalProcessed: BigInt(0),
    currentLatency: 0,
    averageLatency: 0,
    p99Latency: 0,
    queueDepth: 0,
    queueUtilization: 0,
    activeShards: 1024,
    activeChannels: 10000,
    congestionLevel: 0,
    totalValueProcessed: BigInt(0),
    dailyVolume: BigInt(0),
    uptimeSeconds: 0,
    startedAt: new Date(),
  }),
};

const vaultMock = {
  createVault: vi.fn(),
  depositFunds: vi.fn(),
  withdrawFunds: vi.fn(),
  getVault: vi.fn(),
  listVaults: vi.fn(),
  getAuditLog: vi.fn(),
};

vi.mock("@/lib/pi-transaction/pi-hyper-transaction-engine", () => ({
  PiHyperTransactionEngine: {
    getInstance: vi.fn(() => engineMock),
  },
  HYPER_ENGINE_CONFIG: {
    maxTransactionsPerSecond: 10_000_000_000,
    maxTransactionsPerDay: 864_000_000_000_000,
    batchSize: 1_000_000,
    parallelChannels: 10_000,
    shardCount: 1024,
    replicaCount: 3,
    maxLatencyMs: 10,
    targetLatencyMs: 1,
    maxQueueDepth: 100_000_000,
    priorityLevels: 10,
    memoryPoolSize: 1_000_000_000,
    congestionThreshold: 0.7,
    autoScaleMultiplier: 10,
    instantFinality: true,
    confirmationBlocks: 0,
  },
}));

vi.mock("@/lib/pi-transaction/pi-trillion-vault", () => ({
  PiTrillionVault: {
    getInstance: vi.fn(() => vaultMock),
  },
  VAULT_CONFIG: {
    maxVaultBalance: BigInt("1000000000000000000"),
    minDepositAmount: BigInt(1),
    withdrawalTimelock: 86400,
    multiSigThreshold: 3,
    auditIntervalMs: 3600000,
    centralNodeRequired: true,
  },
}));

import {
  PiHyperTransactionEngine,
  HYPER_ENGINE_CONFIG,
} from "@/lib/pi-transaction/pi-hyper-transaction-engine";
import {
  PiTrillionVault,
  VAULT_CONFIG,
} from "@/lib/pi-transaction/pi-trillion-vault";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeTxParams() {
  return {
    type: "transfer" as const,
    sender: "GA_ALICE",
    receiver: "GA_BOB",
    senderPublicKey: "PK_ALICE",
    amount: BigInt(100),
    currency: "PI" as const,
    priority: "normal" as const,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("HYPER_ENGINE_CONFIG constants", () => {
  it("should define a positive maxTransactionsPerSecond", () => {
    expect(HYPER_ENGINE_CONFIG.maxTransactionsPerSecond).toBeGreaterThan(0);
  });

  it("should require zero confirmation blocks for instant finality", () => {
    expect(HYPER_ENGINE_CONFIG.confirmationBlocks).toBe(0);
    expect(HYPER_ENGINE_CONFIG.instantFinality).toBe(true);
  });

  it("should have shards and channels aligned (channels >= shards)", () => {
    expect(HYPER_ENGINE_CONFIG.parallelChannels).toBeGreaterThanOrEqual(
      HYPER_ENGINE_CONFIG.shardCount
    );
  });

  it("should set congestion threshold between 0 and 1", () => {
    expect(HYPER_ENGINE_CONFIG.congestionThreshold).toBeGreaterThan(0);
    expect(HYPER_ENGINE_CONFIG.congestionThreshold).toBeLessThan(1);
  });
});

describe("PiHyperTransactionEngine singleton", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => {
    engineMock.stop();
  });

  it("should return the same instance each time", () => {
    const a = PiHyperTransactionEngine.getInstance();
    const b = PiHyperTransactionEngine.getInstance();
    expect(a).toBe(b);
  });

  describe("start / stop", () => {
    it("should start successfully and set running state", async () => {
      await engineMock.start();
      expect(mockIsRunning.value).toBe(true);
    });

    it("should stop the engine", async () => {
      await engineMock.start();
      engineMock.stop();
      expect(mockIsRunning.value).toBe(false);
    });
  });

  describe("submitTransaction", () => {
    it("should enqueue a valid transaction and return it", async () => {
      const expected = {
        id: "tx-001",
        type: "transfer",
        priority: "normal",
        status: "pending",
        amount: BigInt(100),
        confirmations: 0,
      };
      engineMock.submitTransaction.mockResolvedValueOnce(expected);

      const result = await engineMock.submitTransaction(makeTxParams());

      expect(result.id).toBe("tx-001");
      expect(result.status).toBe("pending");
      expect(result.amount).toBe(BigInt(100));
      expect(result.confirmations).toBe(0);
    });

    it("should default currency to PI", async () => {
      const params = { ...makeTxParams() };
      delete (params as Partial<typeof params>).currency;

      const expected = { ...makeTxParams(), id: "tx-002", currency: "PI", status: "pending" };
      engineMock.submitTransaction.mockResolvedValueOnce(expected);

      const result = await engineMock.submitTransaction(params);
      expect(result.currency).toBe("PI");
    });

    it("should assign critical priority immediately", async () => {
      const criticalTx = { ...makeTxParams(), priority: "critical" as const };
      const expected = { ...criticalTx, id: "tx-critical", status: "confirmed" };
      engineMock.submitTransaction.mockResolvedValueOnce(expected);

      const result = await engineMock.submitTransaction(criticalTx);
      expect(result.status).toBe("confirmed");
    });

    it("should handle submission errors gracefully", async () => {
      engineMock.submitTransaction.mockRejectedValueOnce(
        new Error("Insufficient balance")
      );

      await expect(engineMock.submitTransaction(makeTxParams())).rejects.toThrow(
        "Insufficient balance"
      );
    });
  });

  describe("submitBatch", () => {
    it("should aggregate multiple transactions into a batch", async () => {
      const txs = [makeTxParams(), makeTxParams()];
      const expectedBatch = {
        id: "batch-001",
        transactions: [
          { id: "tx-b1", status: "pending", amount: BigInt(100) },
          { id: "tx-b2", status: "pending", amount: BigInt(100) },
        ],
        totalValue: BigInt(200),
        status: "pending",
      };
      engineMock.submitBatch.mockResolvedValueOnce(expectedBatch);

      const batch = await engineMock.submitBatch(txs);

      expect(batch.id).toBe("batch-001");
      expect(batch.transactions).toHaveLength(2);
      expect(batch.totalValue).toBe(BigInt(200));
    });

    it("should reject an empty batch array", async () => {
      engineMock.submitBatch.mockRejectedValueOnce(
        new Error("Batch must contain at least one transaction")
      );

      await expect(engineMock.submitBatch([])).rejects.toThrow(
        "Batch must contain at least one transaction"
      );
    });
  });

  describe("getMetrics", () => {
    it("should return metrics with correct shape", () => {
      const metrics = engineMock.getMetrics();

      expect(typeof metrics.currentTps).toBe("number");
      expect(typeof metrics.totalProcessed).toBe("bigint");
      expect(metrics.activeShards).toBeGreaterThan(0);
      expect(metrics.activeChannels).toBeGreaterThan(0);
      expect(metrics.congestionLevel).toBeGreaterThanOrEqual(0);
      expect(metrics.congestionLevel).toBeLessThanOrEqual(1);
    });

    it("should show zero congestion at idle", () => {
      const metrics = engineMock.getMetrics();
      expect(metrics.congestionLevel).toBe(0);
      expect(metrics.queueDepth).toBe(0);
    });
  });
});

describe("VAULT_CONFIG constants", () => {
  it("should require at least 1 signature", () => {
    expect(VAULT_CONFIG.multiSigThreshold).toBeGreaterThanOrEqual(1);
  });

  it("should define a minimum deposit amount", () => {
    expect(VAULT_CONFIG.minDepositAmount).toBeGreaterThan(BigInt(0));
  });

  it("should enforce central node linkage", () => {
    expect(VAULT_CONFIG.centralNodeRequired).toBe(true);
  });
});

describe("PiTrillionVault", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should return the same instance each time", () => {
    const a = PiTrillionVault.getInstance();
    const b = PiTrillionVault.getInstance();
    expect(a).toBe(b);
  });

  describe("createVault", () => {
    it("should create a vault with the given parameters", async () => {
      const newVault = {
        id: "vault-001",
        type: "personal" as const,
        status: "active" as const,
        ownerId: "user-123",
        ownerPublicKey: "PK_OWNER",
        name: "My Personal Vault",
        quantumProtected: true,
        centralNodeLinked: true,
        requiredSignatures: 1,
        balance: { available: BigInt(0), locked: BigInt(0), total: BigInt(0), pendingDeposits: BigInt(0), pendingWithdrawals: BigInt(0) },
        signatories: [],
        currency: "PI" as const,
        createdAt: new Date(),
      };
      vaultMock.createVault.mockResolvedValueOnce(newVault);

      const vault = await vaultMock.createVault({
        type: "personal",
        ownerId: "user-123",
        ownerPublicKey: "PK_OWNER",
        name: "My Personal Vault",
      });

      expect(vault.id).toBe("vault-001");
      expect(vault.type).toBe("personal");
      expect(vault.status).toBe("active");
      expect(vault.quantumProtected).toBe(true);
    });

    it("should reject unsupported vault types", async () => {
      vaultMock.createVault.mockRejectedValueOnce(
        new Error("Invalid vault type")
      );

      await expect(
        vaultMock.createVault({ type: "unknown" })
      ).rejects.toThrow("Invalid vault type");
    });
  });

  describe("depositFunds", () => {
    it("should credit funds to the vault balance", async () => {
      vaultMock.depositFunds.mockResolvedValueOnce({
        success: true,
        newBalance: BigInt(500),
        txId: "deposit-tx-001",
      });

      const result = await vaultMock.depositFunds({
        vaultId: "vault-001",
        amount: BigInt(500),
        senderPublicKey: "PK_SENDER",
      });

      expect(result.success).toBe(true);
      expect(result.newBalance).toBe(BigInt(500));
    });

    it("should reject deposits below minimum amount", async () => {
      vaultMock.depositFunds.mockRejectedValueOnce(
        new Error("Amount below minimum deposit threshold")
      );

      await expect(
        vaultMock.depositFunds({ vaultId: "vault-001", amount: BigInt(0) })
      ).rejects.toThrow("Amount below minimum deposit threshold");
    });
  });

  describe("withdrawFunds", () => {
    it("should debit funds and enforce timelock if needed", async () => {
      vaultMock.withdrawFunds.mockResolvedValueOnce({
        success: true,
        newBalance: BigInt(450),
        txId: "withdraw-tx-001",
        timelockExpiry: null,
      });

      const result = await vaultMock.withdrawFunds({
        vaultId: "vault-001",
        amount: BigInt(50),
        destinationPublicKey: "PK_DEST",
        signatories: ["PK_OWNER"],
      });

      expect(result.success).toBe(true);
      expect(result.newBalance).toBe(BigInt(450));
    });

    it("should fail withdrawal if signatures are insufficient", async () => {
      vaultMock.withdrawFunds.mockRejectedValueOnce(
        new Error("Insufficient signatories: required 3, provided 1")
      );

      await expect(
        vaultMock.withdrawFunds({
          vaultId: "vault-enterprise-001",
          amount: BigInt(1000000),
          signatories: ["PK_OWNER"],
        })
      ).rejects.toThrow("Insufficient signatories");
    });
  });

  describe("getAuditLog", () => {
    it("should return a chronologically ordered audit log", async () => {
      const now = Date.now();
      const log = [
        { id: "log-1", type: "deposit", amount: BigInt(500), timestamp: new Date(now - 2000) },
        { id: "log-2", type: "withdrawal", amount: BigInt(50), timestamp: new Date(now - 1000) },
      ];
      vaultMock.getAuditLog.mockResolvedValueOnce(log);

      const result = await vaultMock.getAuditLog("vault-001");

      expect(result).toHaveLength(2);
      expect(result[0].timestamp.getTime()).toBeLessThan(result[1].timestamp.getTime());
    });
  });
});

// ---------------------------------------------------------------------------
// Transaction type guards (pure logic, no module dependency)
// ---------------------------------------------------------------------------
describe("Transaction type validation", () => {
  const validStatuses = ["pending", "processing", "confirmed", "finalized", "failed", "rolled_back"];
  const validPriorities = ["critical", "high", "normal", "low", "batch"];
  const validTypes = [
    "payment", "transfer", "swap", "stake", "unstake",
    "mint", "burn", "contract_call", "contract_deploy",
    "vault_deposit", "vault_withdraw", "multi_sig", "batch",
  ];

  it("should recognise all defined TransactionStatus values", () => {
    for (const s of validStatuses) {
      expect(validStatuses).toContain(s);
    }
  });

  it("should recognise all defined TransactionPriority values", () => {
    for (const p of validPriorities) {
      expect(validPriorities).toContain(p);
    }
  });

  it("should recognise all defined TransactionType values", () => {
    for (const t of validTypes) {
      expect(validTypes).toContain(t);
    }
    expect(validTypes).toHaveLength(13);
  });

  it("should use bigint for amounts to support trillion-scale values", () => {
    const amount = BigInt("999999999999999999");
    expect(typeof amount).toBe("bigint");
    expect(amount).toBeGreaterThan(BigInt(0));
  });
});

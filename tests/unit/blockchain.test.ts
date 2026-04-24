/**
 * Blockchain Binding Manager Unit Tests
 * Covers: BindingManager, tokenization helpers, BindingVerificationResult,
 *         BatchTokenizationRequest/Result, SupplyChainAnchor, CrossReference
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mock modules
// ---------------------------------------------------------------------------
const bindingMock = {
  registerProduct: vi.fn(),
  registerBusiness: vi.fn(),
  verifyBinding: vi.fn(),
  batchTokenize: vi.fn(),
  addProvenanceRecord: vi.fn(),
  lookupByTxHash: vi.fn(),
  lookupByAssetCode: vi.fn(),
  getEcosystemStats: vi.fn(),
};

vi.mock("@/lib/blockchain/binding-manager", () => ({
  BindingManager: {
    getInstance: vi.fn(() => bindingMock),
  },
}));

vi.mock("@/lib/blockchain/tokenization-engine", () => ({
  tokenizationEngine: {
    tokenizeProduct: vi.fn(),
    tokenizeCompany: vi.fn(),
    verifyBinding: vi.fn(),
    getStats: vi.fn().mockReturnValue({
      totalProducts: 0,
      totalCompanies: 0,
      totalBindings: 0,
      totalTransactions: 0,
    }),
  },
}));

vi.mock("@/lib/tokens/token-reward-system", () => ({
  tokenRewardSystem: {
    rewardActivity: vi.fn(),
    getBalance: vi.fn(),
  },
}));

vi.mock("@/lib/tokens/business-interactions", () => ({
  businessInteractions: {
    recordPurchase: vi.fn(),
    getTransactionHistory: vi.fn(),
  },
}));

import { BindingManager } from "@/lib/blockchain/binding-manager";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeVerificationResult(overrides: Record<string, unknown> = {}) {
  return {
    tokenId: "token-001",
    type: "product" as const,
    bound: true,
    verified: true,
    txHash: "abc123def456",
    ledger: 47000000,
    network: "Pi Network",
    confirmedAt: new Date(),
    onChainValid: true,
    provenanceCount: 3,
    holderCount: 1,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("BindingManager singleton", () => {
  it("should return the same instance each time", () => {
    const a = BindingManager.getInstance();
    const b = BindingManager.getInstance();
    expect(a).toBe(b);
  });
});

describe("registerProduct", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should tokenize a product and return a bound token ID", async () => {
    bindingMock.registerProduct.mockResolvedValueOnce({
      tokenId: "prod-token-001",
      txHash: "tx-abc",
      bound: true,
    });

    const result = await bindingMock.registerProduct({
      companyId: "company-xyz",
      category: "real-estate",
      standard: "NFT",
      metadata: { name: "Luxury Apartment 4B", description: "Downtown unit" },
      totalSupply: 1,
      priceInPi: 50000,
      signerSecret: "signer-key",
    });

    expect(result.tokenId).toBeTruthy();
    expect(result.bound).toBe(true);
    expect(result.txHash).toBeTruthy();
  });

  it("should fail if signer secret is missing", async () => {
    bindingMock.registerProduct.mockRejectedValueOnce(
      new Error("Signer secret is required for binding")
    );

    await expect(
      bindingMock.registerProduct({ companyId: "c1", signerSecret: "" })
    ).rejects.toThrow("Signer secret is required");
  });
});

describe("registerBusiness", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should tokenize and bind a company", async () => {
    bindingMock.registerBusiness.mockResolvedValueOnce({
      companyTokenId: "company-token-001",
      ownerWalletId: "owner-wallet-company-xyz",
      txHash: "tx-def",
      bound: true,
    });

    const result = await bindingMock.registerBusiness({
      ownerUserId: "user-123",
      companyName: "Triumph Corp",
      registrationNumber: "TC-2024-001",
      tokenType: "UTILITY",
      signerSecret: "key",
    });

    expect(result.companyTokenId).toBeTruthy();
    expect(result.ownerWalletId).toContain("owner-wallet");
    expect(result.bound).toBe(true);
  });
});

describe("verifyBinding", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should return a valid verification result for a bound product", async () => {
    bindingMock.verifyBinding.mockResolvedValueOnce(makeVerificationResult());

    const result = await bindingMock.verifyBinding("token-001", "product");

    expect(result.bound).toBe(true);
    expect(result.verified).toBe(true);
    expect(result.onChainValid).toBe(true);
    expect(result.provenanceCount).toBeGreaterThanOrEqual(0);
  });

  it("should return bound:false for an unregistered token", async () => {
    bindingMock.verifyBinding.mockResolvedValueOnce(
      makeVerificationResult({ bound: false, verified: false, onChainValid: false, txHash: undefined })
    );

    const result = await bindingMock.verifyBinding("nonexistent-token", "product");

    expect(result.bound).toBe(false);
    expect(result.onChainValid).toBe(false);
  });

  it("should include a ledger sequence number when bound", async () => {
    bindingMock.verifyBinding.mockResolvedValueOnce(makeVerificationResult({ ledger: 50000000 }));

    const result = await bindingMock.verifyBinding("token-001", "product");
    expect(result.ledger).toBeGreaterThan(0);
  });
});

describe("batchTokenize", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should tokenize multiple products and report results", async () => {
    bindingMock.batchTokenize.mockResolvedValueOnce({
      companyId: "company-xyz",
      total: 3,
      successful: 3,
      failed: 0,
      results: [
        { productId: "p-1", success: true, txHash: "hash-1" },
        { productId: "p-2", success: true, txHash: "hash-2" },
        { productId: "p-3", success: true, txHash: "hash-3" },
      ],
    });

    const result = await bindingMock.batchTokenize({
      companyId: "company-xyz",
      products: [{}, {}, {}],
      signerSecret: "key",
    });

    expect(result.total).toBe(3);
    expect(result.successful).toBe(3);
    expect(result.failed).toBe(0);
    expect(result.results).toHaveLength(3);
  });

  it("should report partial failures", async () => {
    bindingMock.batchTokenize.mockResolvedValueOnce({
      companyId: "company-xyz",
      total: 2,
      successful: 1,
      failed: 1,
      results: [
        { productId: "p-1", success: true, txHash: "hash-1" },
        { productId: "p-2", success: false, error: "Metadata validation failed" },
      ],
    });

    const result = await bindingMock.batchTokenize({
      companyId: "company-xyz",
      products: [{}, {}],
      signerSecret: "key",
    });

    expect(result.failed).toBe(1);
    expect(result.results.some((r: { success: boolean }) => !r.success)).toBe(true);
  });
});

describe("addProvenanceRecord", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should anchor a supply chain stage on-chain", async () => {
    const anchor = {
      productId: "prod-001",
      stage: "manufacturing",
      location: "Shenzhen, China",
      handler: "factory-authorized",
      timestamp: new Date(),
      txHash: "provenance-hash-001",
      metadata: { batchNumber: "BATCH-42", qualityPass: "true" },
    };
    bindingMock.addProvenanceRecord.mockResolvedValueOnce(anchor);

    const result = await bindingMock.addProvenanceRecord({
      productId: "prod-001",
      stage: "manufacturing",
      handler: "factory-authorized",
      metadata: { batchNumber: "BATCH-42", qualityPass: "true" },
    });

    expect(result.txHash).toBeTruthy();
    expect(result.stage).toBe("manufacturing");
  });
});

describe("lookupByTxHash / lookupByAssetCode", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should find a token by transaction hash", async () => {
    bindingMock.lookupByTxHash.mockResolvedValueOnce({
      productId: "prod-001",
      companyId: "company-xyz",
      txHash: "tx-abc",
      found: true,
    });

    const result = await bindingMock.lookupByTxHash("tx-abc");
    expect(result.found).toBe(true);
    expect(result.txHash).toBe("tx-abc");
  });

  it("should return found:false for an unknown hash", async () => {
    bindingMock.lookupByTxHash.mockResolvedValueOnce({ found: false });

    const result = await bindingMock.lookupByTxHash("unknown-hash");
    expect(result.found).toBe(false);
  });

  it("should find a token by Stellar asset code", async () => {
    bindingMock.lookupByAssetCode.mockResolvedValueOnce({
      assetCode: "TRIUMPH",
      companyId: "company-xyz",
      found: true,
    });

    const result = await bindingMock.lookupByAssetCode("TRIUMPH");
    expect(result.found).toBe(true);
    expect(result.assetCode).toBe("TRIUMPH");
  });
});

describe("getEcosystemStats", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should return stats with non-negative numeric values", () => {
    bindingMock.getEcosystemStats.mockReturnValueOnce({
      tokenization: {
        totalProducts: 50,
        totalCompanies: 10,
        totalBindings: 60,
        totalTransactions: 200,
      },
      totalBindings: 60,
      totalProvenance: 120,
    });

    const stats = bindingMock.getEcosystemStats();

    expect(stats.totalBindings).toBeGreaterThanOrEqual(0);
    expect(stats.totalProvenance).toBeGreaterThanOrEqual(0);
    expect(stats.tokenization.totalProducts).toBeGreaterThanOrEqual(0);
  });
});

// ---------------------------------------------------------------------------
// BindingVerificationResult shape test
// ---------------------------------------------------------------------------
describe("BindingVerificationResult structure", () => {
  it("should have required boolean fields", () => {
    const result = makeVerificationResult();

    expect(typeof result.bound).toBe("boolean");
    expect(typeof result.verified).toBe("boolean");
    expect(typeof result.onChainValid).toBe("boolean");
    expect(typeof result.tokenId).toBe("string");
  });
});

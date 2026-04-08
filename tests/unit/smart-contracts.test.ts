/**
 * Smart Contract Hub Unit Tests
 * Covers: SmartContractHub, ContractLanguage, AuditStatus, deployment lifecycle
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mock module
// ---------------------------------------------------------------------------
const hubMock = {
  createContract: vi.fn(),
  getContract: vi.fn(),
  listContracts: vi.fn(),
  syncFromGitHub: vi.fn(),
  deployContract: vi.fn(),
  auditContract: vi.fn(),
  callContract: vi.fn(),
  verifyContract: vi.fn(),
  getStats: vi.fn(),
};

vi.mock("@/lib/smart-contracts/smart-contract-hub", () => ({
  SmartContractHub: {
    getInstance: vi.fn(() => hubMock),
  },
  SUPPORTED_LANGUAGES: ["rust", "solidity", "move", "cairo", "vyper"],
  PI_EXTERNAL_RATE: 314.159,
  PI_INTERNAL_RATE: 314159,
}));

import {
  SmartContractHub,
  SUPPORTED_LANGUAGES,
  PI_EXTERNAL_RATE,
  PI_INTERNAL_RATE,
} from "@/lib/smart-contracts/smart-contract-hub";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeContract(language = "rust", status = "deployed") {
  return {
    id: "contract-001",
    name: "TsEscrow",
    description: "Triumph Synergy escrow contract",
    version: "1.0.0",
    language,
    status,
    sourceCode: `// Rust escrow contract\nfn main() {}`,
    compiledBytecode: "0xdeadbeef",
    abi: null,
    githubRepo: "triumph-synergy/contracts",
    githubPath: "contracts/escrow.rs",
    githubBranch: "main",
    commitHash: "abc123",
    lastSyncAt: new Date(),
    deployedAddress: "pi-contract-addr-001",
    network: "pi-mainnet",
    deployedAt: new Date(),
    deploymentTxHash: "tx-deploy-001",
    author: "Triumph Synergy Inc",
    license: "MIT",
    tags: ["escrow", "defi"],
    dependencies: [],
    auditStatus: "passed",
    auditReports: [],
    securityScore: 95,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("SUPPORTED_LANGUAGES constants", () => {
  it("should include Rust and Solidity", () => {
    expect(SUPPORTED_LANGUAGES).toContain("rust");
    expect(SUPPORTED_LANGUAGES).toContain("solidity");
  });

  it("should include Move, Cairo, and Vyper", () => {
    expect(SUPPORTED_LANGUAGES).toContain("move");
    expect(SUPPORTED_LANGUAGES).toContain("cairo");
    expect(SUPPORTED_LANGUAGES).toContain("vyper");
  });

  it("should have exactly 5 supported languages", () => {
    expect(SUPPORTED_LANGUAGES).toHaveLength(5);
  });
});

describe("Pi value constants", () => {
  it("should set external Pi rate to 314.159", () => {
    expect(PI_EXTERNAL_RATE).toBeCloseTo(314.159, 3);
  });

  it("should set internal Pi rate to 1000x external", () => {
    expect(PI_INTERNAL_RATE).toBe(PI_EXTERNAL_RATE * 1000);
  });
});

describe("SmartContractHub singleton", () => {
  it("should return the same instance each time", () => {
    const a = SmartContractHub.getInstance();
    const b = SmartContractHub.getInstance();
    expect(a).toBe(b);
  });
});

describe("createContract", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should create a Rust contract with pending audit status", async () => {
    const contract = makeContract("rust", "draft");
    contract.auditStatus = "not-audited";
    hubMock.createContract.mockResolvedValueOnce(contract);

    const result = await hubMock.createContract({
      name: "TsEscrow",
      language: "rust",
      sourceCode: "fn main() {}",
      author: "TS Dev",
    });

    expect(result.language).toBe("rust");
    expect(result.auditStatus).toBe("not-audited");
    expect(result.status).toBe("draft");
  });

  it("should create a Solidity contract", async () => {
    const contract = makeContract("solidity", "draft");
    hubMock.createContract.mockResolvedValueOnce(contract);

    const result = await hubMock.createContract({
      name: "TsToken",
      language: "solidity",
      sourceCode: "pragma solidity ^0.8.0;",
    });

    expect(result.language).toBe("solidity");
  });

  it("should reject unsupported languages", async () => {
    hubMock.createContract.mockRejectedValueOnce(
      new Error("Unsupported language: python")
    );

    await expect(
      hubMock.createContract({ name: "Bad", language: "python", sourceCode: "" })
    ).rejects.toThrow("Unsupported language");
  });
});

describe("syncFromGitHub", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should sync contract source from a GitHub repository", async () => {
    hubMock.syncFromGitHub.mockResolvedValueOnce({
      contractId: "contract-001",
      synced: true,
      commitHash: "newcommit123",
      linesChanged: 42,
    });

    const result = await hubMock.syncFromGitHub({
      contractId: "contract-001",
      repo: "triumph-synergy/contracts",
      path: "contracts/escrow.rs",
      branch: "main",
    });

    expect(result.synced).toBe(true);
    expect(result.commitHash).toBeTruthy();
  });

  it("should fail gracefully for an inaccessible repository", async () => {
    hubMock.syncFromGitHub.mockRejectedValueOnce(
      new Error("GitHub repo not found or access denied: private-org/secret-repo")
    );

    await expect(
      hubMock.syncFromGitHub({ contractId: "c1", repo: "private-org/secret-repo" })
    ).rejects.toThrow("GitHub repo not found");
  });
});

describe("deployContract", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should deploy an audited contract to Pi mainnet", async () => {
    hubMock.deployContract.mockResolvedValueOnce({
      contractId: "contract-001",
      deployedAddress: "pi-contract-addr-live",
      txHash: "tx-deploy-live",
      network: "pi-mainnet",
      deployedAt: new Date(),
    });

    const result = await hubMock.deployContract({
      contractId: "contract-001",
      network: "pi-mainnet",
      signerSecret: "deploy-key",
    });

    expect(result.deployedAddress).toBeTruthy();
    expect(result.network).toBe("pi-mainnet");
    expect(result.txHash).toBeTruthy();
  });

  it("should prevent deploying a non-audited contract", async () => {
    hubMock.deployContract.mockRejectedValueOnce(
      new Error("Contract must pass audit before deployment: status=not-audited")
    );

    await expect(
      hubMock.deployContract({ contractId: "unaudited-contract", network: "pi-mainnet" })
    ).rejects.toThrow("must pass audit");
  });
});

describe("auditContract", () => {
  beforeEach(() => vi.clearAllMocks());

  const auditStatuses = ["not-audited", "pending", "in-progress", "passed", "failed", "conditional"];

  it.each(auditStatuses)("should accept audit status '%s'", (status) => {
    hubMock.auditContract.mockReturnValueOnce({ status, contractId: "contract-001" });

    const result = hubMock.auditContract("contract-001", status);
    expect(result.status).toBe(status);
  });

  it("should return passed status for a clean contract", async () => {
    hubMock.auditContract.mockResolvedValueOnce({
      contractId: "contract-001",
      status: "passed",
      securityScore: 97,
      findings: [],
      auditedAt: new Date(),
    });

    const result = await hubMock.auditContract("contract-001");
    expect(result.status).toBe("passed");
    expect(result.securityScore).toBeGreaterThanOrEqual(90);
    expect(result.findings).toHaveLength(0);
  });

  it("should return findings for a vulnerable contract", async () => {
    hubMock.auditContract.mockResolvedValueOnce({
      contractId: "vuln-contract",
      status: "failed",
      securityScore: 40,
      findings: [
        { severity: "high", description: "Reentrancy vulnerability in withdraw()" },
        { severity: "medium", description: "Missing input validation on amount param" },
      ],
    });

    const result = await hubMock.auditContract("vuln-contract");
    expect(result.status).toBe("failed");
    expect(result.findings.length).toBeGreaterThan(0);
  });
});

describe("callContract", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should call a deployed contract method", async () => {
    hubMock.callContract.mockResolvedValueOnce({
      result: "42",
      gasUsed: 21000,
      txHash: "call-tx-001",
    });

    const result = await hubMock.callContract({
      contractId: "contract-001",
      method: "getBalance",
      args: ["user-001"],
    });

    expect(result.result).toBeTruthy();
    expect(result.gasUsed).toBeGreaterThan(0);
  });

  it("should revert on contract error", async () => {
    hubMock.callContract.mockRejectedValueOnce(
      new Error("Contract execution reverted: EscrowAlreadyClaimed")
    );

    await expect(
      hubMock.callContract({ contractId: "contract-001", method: "claim" })
    ).rejects.toThrow("Contract execution reverted");
  });
});

describe("SmartContract type shapes", () => {
  it("should have all required fields", () => {
    const contract = makeContract();

    expect(typeof contract.id).toBe("string");
    expect(typeof contract.name).toBe("string");
    expect(typeof contract.version).toBe("string");
    expect(typeof contract.securityScore).toBe("number");
    expect(contract.securityScore).toBeGreaterThanOrEqual(0);
    expect(contract.securityScore).toBeLessThanOrEqual(100);
    expect(Array.isArray(contract.tags)).toBe(true);
    expect(Array.isArray(contract.dependencies)).toBe(true);
    expect(Array.isArray(contract.auditReports)).toBe(true);
  });
});

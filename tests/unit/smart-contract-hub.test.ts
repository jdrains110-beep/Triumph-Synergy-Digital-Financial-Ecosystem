import { describe, expect, it } from "vitest";
import {
  connectExternalRepository,
  getExternalContract,
  getExternalRepository,
  listExternalContracts,
  listExternalRepositories,
} from "@/lib/smart-contracts/smart-contract-hub";

describe("Smart Contract Hub - External Repositories", () => {
  describe("listExternalRepositories", () => {
    it("should return a list of external repositories", () => {
      const repos = listExternalRepositories();
      expect(repos).toBeDefined();
      expect(Array.isArray(repos)).toBe(true);
      expect(repos.length).toBeGreaterThan(0);
    });

    it("should include kosasih/pi-supernode repository", () => {
      const repos = listExternalRepositories();
      const piSupernodeRepo = repos.find(
        (repo) => repo.fullName === "kosasih/pi-supernode"
      );
      expect(piSupernodeRepo).toBeDefined();
      expect(piSupernodeRepo?.owner).toBe("kosasih");
      expect(piSupernodeRepo?.name).toBe("pi-supernode");
      expect(piSupernodeRepo?.status).toBe("active");
    });
  });

  describe("getExternalRepository", () => {
    it("should retrieve a specific repository by full name", () => {
      const repo = getExternalRepository("kosasih/pi-supernode");
      expect(repo).toBeDefined();
      expect(repo?.fullName).toBe("kosasih/pi-supernode");
      expect(repo?.owner).toBe("kosasih");
      expect(repo?.name).toBe("pi-supernode");
      expect(repo?.version).toBe("2.0.0");
      expect(repo?.license).toBe("MIT");
    });

    it("should return null for non-existent repository", () => {
      const repo = getExternalRepository("nonexistent/repo");
      expect(repo).toBeNull();
    });

    it("should have correct repository metadata", () => {
      const repo = getExternalRepository("kosasih/pi-supernode");
      expect(repo?.description).toContain("Pi Network Mainnet");
      expect(repo?.sourceUrl).toBe("https://github.com/KOSASIH/pi-supernode");
      expect(repo?.maintainedBy).toBe("KOSASIH");
      expect(repo?.contracts).toBeDefined();
      expect(Array.isArray(repo?.contracts)).toBe(true);
    });
  });

  describe("getExternalContract", () => {
    it("should retrieve PiCoin contract", () => {
      const contract = getExternalContract("kosasih/pi-supernode", "PiCoin");
      expect(contract).toBeDefined();
      expect(contract?.name).toBe("PiCoin");
      expect(contract?.fileName).toBe("PiCoin.sol");
      expect(contract?.language).toBe("solidity");
      expect(contract?.path).toBe("contracts/PiCoin.sol");
    });

    it("should retrieve Governance contract", () => {
      const contract = getExternalContract(
        "kosasih/pi-supernode",
        "Governance"
      );
      expect(contract).toBeDefined();
      expect(contract?.name).toBe("Governance");
      expect(contract?.fileName).toBe("Governance.sol");
      expect(contract?.description).toContain("governance");
    });

    it("should retrieve StableCoin contract", () => {
      const contract = getExternalContract(
        "kosasih/pi-supernode",
        "StableCoin"
      );
      expect(contract).toBeDefined();
      expect(contract?.name).toBe("StableCoin");
      expect(contract?.features).toContain("Price stability");
    });

    it("should retrieve WrappedPiToken contract", () => {
      const contract = getExternalContract(
        "kosasih/pi-supernode",
        "WrappedPiToken"
      );
      expect(contract).toBeDefined();
      expect(contract?.name).toBe("WrappedPiToken");
      expect(contract?.features).toContain("Cross-chain compatibility");
    });

    it("should return null for non-existent contract", () => {
      const contract = getExternalContract(
        "kosasih/pi-supernode",
        "NonExistentContract"
      );
      expect(contract).toBeNull();
    });

    it("should return null for contract in non-existent repository", () => {
      const contract = getExternalContract("nonexistent/repo", "PiCoin");
      expect(contract).toBeNull();
    });
  });

  describe("listExternalContracts", () => {
    it("should list all contracts from all repositories", () => {
      const contracts = listExternalContracts();
      expect(contracts).toBeDefined();
      expect(Array.isArray(contracts)).toBe(true);
      expect(contracts.length).toBeGreaterThan(0);
    });

    it("should list all contracts from kosasih/pi-supernode", () => {
      const contracts = listExternalContracts("kosasih/pi-supernode");
      expect(contracts).toBeDefined();
      expect(contracts.length).toBe(5); // PiCoin, Governance, StableCoin, WrappedPiToken, Migrations

      const contractNames = contracts.map((c) => c.name);
      expect(contractNames).toContain("PiCoin");
      expect(contractNames).toContain("Governance");
      expect(contractNames).toContain("StableCoin");
      expect(contractNames).toContain("WrappedPiToken");
      expect(contractNames).toContain("Migrations");
    });

    it("should include repository information in each contract", () => {
      const contracts = listExternalContracts("kosasih/pi-supernode");
      contracts.forEach((contract) => {
        expect(contract.repository).toBe("kosasih/pi-supernode");
        expect(contract.name).toBeDefined();
        expect(contract.language).toBe("solidity");
      });
    });

    it("should return empty array for non-existent repository", () => {
      const contracts = listExternalContracts("nonexistent/repo");
      expect(contracts).toEqual([]);
    });
  });

  describe("connectExternalRepository", () => {
    it("should allow adding a new external repository", async () => {
      const config = {
        owner: "test-owner",
        name: "test-repo",
        description: "Test repository",
        version: "1.0.0",
        license: "MIT",
        sourceUrl: "https://github.com/test-owner/test-repo",
        localPath: "lib/smart-contracts/external/test-owner/test-repo",
        maintainedBy: "Test Maintainer",
        contracts: [
          {
            name: "TestContract",
            fileName: "TestContract.sol",
            language: "solidity" as const,
            path: "contracts/TestContract.sol",
            description: "Test contract",
            version: "1.0.0",
            features: ["Test feature"],
          },
        ],
      };

      const repo = await connectExternalRepository(config);
      expect(repo).toBeDefined();
      expect(repo.fullName).toBe("test-owner/test-repo");
      expect(repo.owner).toBe("test-owner");
      expect(repo.name).toBe("test-repo");
      expect(repo.contracts.length).toBe(1);
      expect(repo.status).toBe("active");
    });
  });

  describe("Contract features and metadata", () => {
    it("should have correct features for PiCoin contract", () => {
      const contract = getExternalContract("kosasih/pi-supernode", "PiCoin");
      expect(contract?.features).toBeDefined();
      expect(contract?.features).toContain(
        "Token minting with 100B supply cap"
      );
      expect(contract?.features).toContain("Token burning");
      expect(contract?.features).toContain("ERC-20 compatible transfers");
    });

    it("should have correct features for Governance contract", () => {
      const contract = getExternalContract(
        "kosasih/pi-supernode",
        "Governance"
      );
      expect(contract?.features).toBeDefined();
      expect(contract?.features).toContain("Proposal creation");
      expect(contract?.features).toContain("Time-bound voting");
    });

    it("should have version information for all contracts", () => {
      const contracts = listExternalContracts("kosasih/pi-supernode");
      contracts.forEach((contract) => {
        expect(contract.version).toBeDefined();
        expect(contract.version).toBe("1.0.0");
      });
    });
  });

  describe("Integration integrity", () => {
    it("should maintain original repository structure", () => {
      const repo = getExternalRepository("kosasih/pi-supernode");
      expect(repo?.localPath).toBe(
        "lib/smart-contracts/external/kosasih/pi-supernode"
      );

      const contracts = repo?.contracts || [];
      contracts.forEach((contract) => {
        expect(contract.path).toMatch(/^contracts\//);
        expect(contract.fileName).toMatch(/\.sol$/);
      });
    });

    it("should preserve contract language information", () => {
      const contracts = listExternalContracts("kosasih/pi-supernode");
      contracts.forEach((contract) => {
        expect(contract.language).toBe("solidity");
      });
    });

    it("should have complete metadata for integration", () => {
      const repo = getExternalRepository("kosasih/pi-supernode");
      expect(repo?.integrationDate).toBeDefined();
      expect(repo?.sourceUrl).toBeDefined();
      expect(repo?.localPath).toBeDefined();
      expect(repo?.maintainedBy).toBeDefined();
      expect(repo?.license).toBeDefined();
    });
  });
});

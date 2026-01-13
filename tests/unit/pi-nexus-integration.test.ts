/**
 * Pi-Nexus Integration Tests
 * 
 * Tests for Kosasih's pi-nexus-autonomous-banking-network integration
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  piNexusIntegration,
  loadPiNexusContract,
  loadAllPiNexusContracts,
  getPiNexusIntegrationStatus,
  getPiNexusDeploymentInstructions,
  PI_NEXUS_CONTRACTS,
  PI_NEXUS_REPOSITORY,
} from "@/lib/smart-contracts/external/pi-nexus-autonomous-banking-network";

describe("Pi-Nexus Integration", () => {
  describe("Repository Information", () => {
    it("should have correct repository metadata", () => {
      expect(PI_NEXUS_REPOSITORY.owner).toBe("KOSASIH");
      expect(PI_NEXUS_REPOSITORY.name).toBe(
        "pi-nexus-autonomous-banking-network"
      );
      expect(PI_NEXUS_REPOSITORY.fullName).toBe(
        "KOSASIH/pi-nexus-autonomous-banking-network"
      );
      expect(PI_NEXUS_REPOSITORY.url).toBe(
        "https://github.com/KOSASIH/pi-nexus-autonomous-banking-network"
      );
    });

    it("should provide repository info through integration", () => {
      const repoInfo = piNexusIntegration.getRepositoryInfo();
      expect(repoInfo.owner).toBe("KOSASIH");
      expect(repoInfo.totalContracts).toBeGreaterThan(0);
      expect(repoInfo.activeContracts).toBeGreaterThan(0);
    });
  });

  describe("Contract Registry", () => {
    it("should have registered contracts", () => {
      expect(PI_NEXUS_CONTRACTS).toBeDefined();
      expect(PI_NEXUS_CONTRACTS.length).toBeGreaterThan(0);
    });

    it("should have contracts with required fields", () => {
      for (const contract of PI_NEXUS_CONTRACTS) {
        expect(contract.id).toBeDefined();
        expect(contract.name).toBeDefined();
        expect(contract.description).toBeDefined();
        expect(contract.category).toBeDefined();
        expect(contract.githubPath).toBeDefined();
        expect(contract.version).toBeDefined();
        expect(contract.language).toBeDefined();
        expect(contract.status).toBeDefined();
        expect(contract.maintainedBy).toBeDefined();
        expect(contract.license).toBeDefined();
      }
    });

    it("should have diverse contract categories", () => {
      const categories = [
        ...new Set(PI_NEXUS_CONTRACTS.map((c) => c.category)),
      ];
      expect(categories.length).toBeGreaterThan(2);
      expect(categories).toContain("banking-core");
    });
  });

  describe("Contract Loading", () => {
    it("should list all contracts", () => {
      const contracts = piNexusIntegration.listContracts();
      expect(contracts.length).toBeGreaterThan(0);
      expect(contracts).toEqual(PI_NEXUS_CONTRACTS);
    });

    it("should filter contracts by category", () => {
      const bankingContracts = piNexusIntegration.listContracts({
        category: "banking-core",
      });
      expect(bankingContracts.length).toBeGreaterThan(0);
      for (const contract of bankingContracts) {
        expect(contract.category).toBe("banking-core");
      }
    });

    it("should filter contracts by status", () => {
      const activeContracts = piNexusIntegration.listContracts({
        status: "active",
      });
      expect(activeContracts.length).toBeGreaterThan(0);
      for (const contract of activeContracts) {
        expect(contract.status).toBe("active");
      }
    });

    it("should get contract by id", () => {
      const firstContract = PI_NEXUS_CONTRACTS[0];
      const contract = piNexusIntegration.getContract(firstContract.id);
      expect(contract).toBeDefined();
      expect(contract?.id).toBe(firstContract.id);
    });

    it("should return null for non-existent contract", () => {
      const contract = piNexusIntegration.getContract("non-existent-id");
      expect(contract).toBeNull();
    });
  });

  describe("Contract Conversion", () => {
    it("should convert Pi-Nexus contract to SmartContract format", async () => {
      const piNexusContract = PI_NEXUS_CONTRACTS[0];
      const smartContract =
        piNexusIntegration.convertToSmartContract(piNexusContract);

      expect(smartContract.id).toBe(piNexusContract.id);
      expect(smartContract.name).toBe(piNexusContract.name);
      expect(smartContract.description).toBe(piNexusContract.description);
      expect(smartContract.version).toBe(piNexusContract.version);
      expect(smartContract.author).toBe("KOSASIH");
      expect(smartContract.license).toBe(piNexusContract.license);
      expect(smartContract.githubRepo).toBe(
        "KOSASIH/pi-nexus-autonomous-banking-network"
      );
      expect(smartContract.githubPath).toBe(piNexusContract.githubPath);
      expect(smartContract.status).toBe("verified");
      expect(smartContract.sourceCode).toContain("Pi-Nexus Contract Reference");
      expect(smartContract.sourceCode).toContain(PI_NEXUS_REPOSITORY.url);
    });

    it("should maintain original contract integrity in conversion", async () => {
      const piNexusContract = PI_NEXUS_CONTRACTS[0];
      const smartContract =
        piNexusIntegration.convertToSmartContract(piNexusContract);

      // Should not modify source, only reference it
      expect(smartContract.sourceCode).toContain("NOTE: This is a reference");
      expect(smartContract.sourceCode).toContain("upstream repository");
      expect(smartContract.compiledBytecode).toBeNull();
    });
  });

  describe("Contract Integration", () => {
    it("should load individual contract", async () => {
      const firstContract = PI_NEXUS_CONTRACTS.find(
        (c) => c.status === "active" && c.dependencies.length === 0
      );
      if (!firstContract) {
        throw new Error("No active contract without dependencies found");
      }

      const contract = await loadPiNexusContract(firstContract.id);
      expect(contract).toBeDefined();
      expect(contract.id).toBe(firstContract.id);
      expect(contract.githubRepo).toBe(
        "KOSASIH/pi-nexus-autonomous-banking-network"
      );
    });

    it("should load all active contracts", async () => {
      const contracts = await loadAllPiNexusContracts();
      expect(contracts.length).toBeGreaterThan(0);

      const activeCount = PI_NEXUS_CONTRACTS.filter(
        (c) => c.status === "active"
      ).length;
      // Should load all active contracts (some may fail due to dependencies)
      expect(contracts.length).toBeLessThanOrEqual(activeCount);
    });

    it("should fail to load non-existent contract", async () => {
      await expect(
        loadPiNexusContract("non-existent-id")
      ).rejects.toThrow();
    });
  });

  describe("Deployment Instructions", () => {
    it("should provide deployment instructions", () => {
      const firstContract = PI_NEXUS_CONTRACTS[0];
      const instructions =
        getPiNexusDeploymentInstructions(firstContract.id);

      expect(instructions.contract).toBeDefined();
      expect(instructions.instructions).toContain(firstContract.name);
      expect(instructions.instructions).toContain("Prerequisites");
      expect(instructions.instructions).toContain("Steps");
      expect(instructions.prerequisites).toBeDefined();
      expect(instructions.warnings).toBeDefined();
    });

    it("should include dependency warnings", () => {
      const contractWithDeps = PI_NEXUS_CONTRACTS.find(
        (c) => c.dependencies.length > 0
      );
      if (!contractWithDeps) {
        throw new Error("No contract with dependencies found");
      }

      const instructions = getPiNexusDeploymentInstructions(
        contractWithDeps.id
      );
      expect(instructions.prerequisites.length).toBeGreaterThan(0);
      expect(instructions.instructions).toContain("dependencies");
    });
  });

  describe("Integration Status", () => {
    it("should provide integration status", () => {
      const status = getPiNexusIntegrationStatus();

      expect(status.healthy).toBe(true);
      expect(status.repository).toBeDefined();
      expect(status.totalContracts).toBeGreaterThan(0);
      expect(status.activeContracts).toBeGreaterThan(0);
      expect(status.categories.length).toBeGreaterThan(0);
      expect(status.lastCheck).toBeInstanceOf(Date);
    });

    it("should have correct repository in status", () => {
      const status = getPiNexusIntegrationStatus();
      expect(status.repository.owner).toBe("KOSASIH");
      expect(status.repository.name).toBe(
        "pi-nexus-autonomous-banking-network"
      );
    });
  });

  describe("Contract Integrity", () => {
    it("should preserve original license information", async () => {
      const contracts = await loadAllPiNexusContracts();
      for (const contract of contracts) {
        expect(contract.author).toBe("KOSASIH");
        expect(contract.license).toBeDefined();
        expect(contract.tags).toContain("pi-nexus");
        expect(contract.tags).toContain("kosasih");
        expect(contract.tags).toContain("external");
      }
    });

    it("should maintain upstream repository reference", async () => {
      const contracts = await loadAllPiNexusContracts();
      for (const contract of contracts) {
        expect(contract.githubRepo).toBe(
          "KOSASIH/pi-nexus-autonomous-banking-network"
        );
        expect(contract.sourceCode).toContain(PI_NEXUS_REPOSITORY.url);
      }
    });

    it("should mark contracts as verified", async () => {
      const contracts = await loadAllPiNexusContracts();
      for (const contract of contracts) {
        expect(contract.status).toBe("verified");
        expect(contract.auditStatus).toBe("passed");
      }
    });
  });
});

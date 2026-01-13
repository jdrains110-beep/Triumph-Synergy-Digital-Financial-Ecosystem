/**
 * Pi Stable Revoluter Core - Unit Tests
 * 
 * Unit tests for the Pi Stable Revoluter Core integration
 * 
 * @module lib/smart-contracts/pi-stable-revoluter-core/tests
 */

import { describe, it, expect, beforeEach } from "vitest";
import { 
  PiStableRevoluterCoreManager,
  getPiStableRevoluterCore 
} from "../index";

describe("PiStableRevoluterCore", () => {
  let piStable: PiStableRevoluterCoreManager;

  beforeEach(() => {
    piStable = new PiStableRevoluterCoreManager("pi-testnet");
  });

  describe("Initialization", () => {
    it("should create instance with default network", () => {
      expect(piStable).toBeDefined();
      expect(piStable.isInitialized()).toBe(false);
    });

    it("should initialize without contract addresses", async () => {
      await piStable.initialize();
      expect(piStable.isInitialized()).toBe(true);
    });

    it("should initialize with contract addresses", async () => {
      await piStable.initialize({
        stableCoin: "0x1234567890123456789012345678901234567890",
        reserveManager: "0x2345678901234567890123456789012345678901",
        governance: "0x3456789012345678901234567890123456789012",
      });

      const addresses = piStable.getContractAddresses();
      expect(addresses.stableCoin).toBe("0x1234567890123456789012345678901234567890");
      expect(addresses.reserveManager).toBe("0x2345678901234567890123456789012345678901");
      expect(addresses.governance).toBe("0x3456789012345678901234567890123456789012");
    });

    it("should throw error when initializing twice", async () => {
      await piStable.initialize();
      await expect(piStable.initialize()).rejects.toThrow("already initialized");
    });
  });

  describe("StableCoin Operations", () => {
    beforeEach(async () => {
      await piStable.initialize({
        stableCoin: "0x1234567890123456789012345678901234567890",
      });
    });

    it("should mint tokens successfully", async () => {
      const tx = await piStable.mint(
        "0x9876543210987654321098765432109876543210",
        "1000000000000000000"
      );
      
      expect(tx).toBeDefined();
      expect(tx.txHash).toMatch(/^0x[0-9a-f]{64}$/);
      expect(tx.status).toBe("success");
    });

    it("should burn tokens successfully", async () => {
      const tx = await piStable.burn("500000000000000000");
      
      expect(tx).toBeDefined();
      expect(tx.txHash).toMatch(/^0x[0-9a-f]{64}$/);
      expect(tx.status).toBe("success");
    });

    it("should set transaction fee successfully", async () => {
      const tx = await piStable.setTransactionFee(3);
      
      expect(tx).toBeDefined();
      expect(tx.status).toBe("success");
    });

    it("should reject invalid transaction fee", async () => {
      await expect(piStable.setTransactionFee(-1)).rejects.toThrow(
        "between 0 and 100"
      );
      await expect(piStable.setTransactionFee(101)).rejects.toThrow(
        "between 0 and 100"
      );
    });

    it("should pause and unpause successfully", async () => {
      const pauseTx = await piStable.pauseStableCoin();
      expect(pauseTx.status).toBe("success");

      const unpauseTx = await piStable.unpauseStableCoin();
      expect(unpauseTx.status).toBe("success");
    });

    it("should throw error when contract not initialized", async () => {
      const uninitializedManager = new PiStableRevoluterCoreManager();
      await expect(
        uninitializedManager.mint("0x1234", "1000")
      ).rejects.toThrow("not initialized");
    });
  });

  describe("Reserve Manager Operations", () => {
    beforeEach(async () => {
      await piStable.initialize({
        reserveManager: "0x2345678901234567890123456789012345678901",
      });
    });

    it("should add reserve successfully", async () => {
      const tx = await piStable.addReserve({
        asset: "0x1111111111111111111111111111111111111111",
        amount: "1000000000000000000",
        ratio: 25,
      });

      expect(tx).toBeDefined();
      expect(tx.status).toBe("success");
    });

    it("should reject invalid reserve parameters", async () => {
      await expect(
        piStable.addReserve({
          asset: "0x0",
          amount: "1000",
          ratio: 25,
        })
      ).rejects.toThrow("Invalid asset address");

      await expect(
        piStable.addReserve({
          asset: "0x1111111111111111111111111111111111111111",
          amount: "0",
          ratio: 25,
        })
      ).rejects.toThrow("greater than zero");

      await expect(
        piStable.addReserve({
          asset: "0x1111111111111111111111111111111111111111",
          amount: "1000",
          ratio: 0,
        })
      ).rejects.toThrow("greater than zero");
    });

    it("should remove reserve successfully", async () => {
      const tx = await piStable.removeReserve({
        asset: "0x1111111111111111111111111111111111111111",
        amount: "500000000000000000",
      });

      expect(tx).toBeDefined();
      expect(tx.status).toBe("success");
    });

    it("should get reserve information", async () => {
      const reserve = await piStable.getReserve(
        "0x1111111111111111111111111111111111111111"
      );
      
      expect(reserve).toBeDefined();
      expect(reserve?.asset).toBe("0x1111111111111111111111111111111111111111");
    });

    it("should get all reserves", async () => {
      const reserves = await piStable.getAllReserves();
      expect(Array.isArray(reserves)).toBe(true);
    });
  });

  describe("Governance Operations", () => {
    beforeEach(async () => {
      await piStable.initialize({
        governance: "0x3456789012345678901234567890123456789012",
      });
    });

    it("should create proposal successfully", async () => {
      const tx = await piStable.createProposal({
        title: "Test Proposal",
        description: "This is a test proposal",
      });

      expect(tx).toBeDefined();
      expect(tx.status).toBe("success");
    });

    it("should reject invalid proposal parameters", async () => {
      await expect(
        piStable.createProposal({
          title: "",
          description: "Test",
        })
      ).rejects.toThrow("title is required");

      await expect(
        piStable.createProposal({
          title: "Test",
          description: "",
        })
      ).rejects.toThrow("description is required");
    });

    it("should vote on proposal successfully", async () => {
      const tx = await piStable.vote({
        proposalId: 1,
        support: true,
      });

      expect(tx).toBeDefined();
      expect(tx.status).toBe("success");
    });

    it("should reject invalid proposal ID", async () => {
      await expect(
        piStable.vote({
          proposalId: 0,
          support: true,
        })
      ).rejects.toThrow("Invalid proposal ID");
    });

    it("should execute proposal successfully", async () => {
      const tx = await piStable.executeProposal(1);

      expect(tx).toBeDefined();
      expect(tx.status).toBe("success");
    });

    it("should get proposal information", async () => {
      const proposal = await piStable.getProposal(1);
      expect(proposal === null || typeof proposal === "object").toBe(true);
    });

    it("should get all proposals", async () => {
      const proposals = await piStable.getAllProposals();
      expect(Array.isArray(proposals)).toBe(true);
    });
  });

  describe("Utility Methods", () => {
    it("should get network info", () => {
      const info = piStable.getNetworkInfo();
      expect(info.network).toBe("pi-testnet");
      expect(info.version).toBeDefined();
    });

    it("should get contract addresses", () => {
      const addresses = piStable.getContractAddresses();
      expect(addresses).toHaveProperty("stableCoin");
      expect(addresses).toHaveProperty("reserveManager");
      expect(addresses).toHaveProperty("governance");
    });

    it("should check initialization status", () => {
      expect(piStable.isInitialized()).toBe(false);
    });
  });

  describe("Singleton Pattern", () => {
    it("should return same instance", () => {
      const instance1 = getPiStableRevoluterCore("pi-mainnet");
      const instance2 = getPiStableRevoluterCore("pi-mainnet");
      expect(instance1).toBe(instance2);
    });
  });
});

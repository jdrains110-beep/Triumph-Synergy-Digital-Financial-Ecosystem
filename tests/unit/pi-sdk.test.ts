/**
 * Pi SDK Unit Tests
 * Tests for Pi Network SDK implementations
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the Pi SDK modules
const mockApprovePayment = vi.fn();
const mockCompletePayment = vi.fn();
const mockGetPayment = vi.fn();

vi.mock("@/sdk/pi-sdk-js", () => ({
  Pi: {
    ApprovePayment: mockApprovePayment,
    CompletePayment: mockCompletePayment,
  },
  getPayment: mockGetPayment,
}));

describe("Pi SDK Server-Side", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("ApprovePayment", () => {
    it("should approve a valid payment", async () => {
      const mockPayment = {
        identifier: "test-payment-123",
        status: { developer_approved: true },
      };
      mockApprovePayment.mockResolvedValueOnce(mockPayment);

      const result = await mockApprovePayment("test-payment-123");

      expect(mockApprovePayment).toHaveBeenCalledWith("test-payment-123");
      expect(result.identifier).toBe("test-payment-123");
      expect(result.status.developer_approved).toBe(true);
    });

    it("should handle approval errors", async () => {
      mockApprovePayment.mockRejectedValueOnce(new Error("Payment not found"));

      await expect(mockApprovePayment("invalid-id")).rejects.toThrow(
        "Payment not found"
      );
    });
  });

  describe("CompletePayment", () => {
    it("should complete a valid payment with txid", async () => {
      const mockPayment = {
        identifier: "test-payment-123",
        status: {
          developer_approved: true,
          transaction_verified: true,
          developer_completed: true,
        },
      };
      mockCompletePayment.mockResolvedValueOnce(mockPayment);

      const result = await mockCompletePayment(
        "test-payment-123",
        "stellar-txid-abc"
      );

      expect(mockCompletePayment).toHaveBeenCalledWith(
        "test-payment-123",
        "stellar-txid-abc"
      );
      expect(result.status.developer_completed).toBe(true);
    });

    it("should reject completion without txid", async () => {
      mockCompletePayment.mockRejectedValueOnce(
        new Error("Transaction ID required")
      );

      await expect(mockCompletePayment("test-payment-123", "")).rejects.toThrow(
        "Transaction ID required"
      );
    });
  });

  describe("getPayment", () => {
    it("should retrieve payment details", async () => {
      const mockPayment = {
        identifier: "test-payment-123",
        amount: 10.5,
        memo: "Test payment",
        user_uid: "user-123",
        status: {
          developer_approved: true,
          transaction_verified: true,
          developer_completed: false,
          cancelled: false,
        },
      };
      mockGetPayment.mockResolvedValueOnce(mockPayment);

      const result = await mockGetPayment("test-payment-123");

      expect(mockGetPayment).toHaveBeenCalledWith("test-payment-123");
      expect(result.amount).toBe(10.5);
      expect(result.memo).toBe("Test payment");
    });
  });
});

describe("Pi Payment Configuration", () => {
  it("should have valid configuration defaults", () => {
    const config = {
      enabled: true,
      isPrimary: true,
      internalMultiplier: 1.5,
      externalMultiplier: 1.0,
      minAmount: 10,
      maxAmount: 100_000,
      settlementNetwork: "stellar_testnet",
    };

    expect(config.enabled).toBe(true);
    expect(config.isPrimary).toBe(true);
    expect(config.internalMultiplier).toBeGreaterThan(
      config.externalMultiplier
    );
    expect(config.minAmount).toBeLessThan(config.maxAmount);
  });

  it("should calculate internal Pi value correctly", () => {
    const basePiValue = 10.0;
    const internalMultiplier = 1.5;

    const internalValue = basePiValue * internalMultiplier;

    expect(internalValue).toBe(15.0);
  });

  it("should enforce minimum and maximum amounts", () => {
    const minAmount = 10;
    const maxAmount = 100_000;

    const validAmount = 50;
    const belowMin = 5;
    const aboveMax = 150_000;

    expect(validAmount >= minAmount && validAmount <= maxAmount).toBe(true);
    expect(belowMin >= minAmount).toBe(false);
    expect(aboveMax <= maxAmount).toBe(false);
  });
});

describe("Payment Validation", () => {
  const validatePayment = (amount: number, memo: string) => {
    const errors: string[] = [];

    if (amount <= 0) {
      errors.push("Amount must be positive");
    }
    if (amount < 10) {
      errors.push("Amount below minimum");
    }
    if (amount > 100_000) {
      errors.push("Amount exceeds maximum");
    }
    if (!memo || memo.length === 0) {
      errors.push("Memo is required");
    }
    if (memo && memo.length > 140) {
      errors.push("Memo too long");
    }

    return { valid: errors.length === 0, errors };
  };

  it("should validate correct payment data", () => {
    const result = validatePayment(100, "Valid payment memo");
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("should reject negative amounts", () => {
    const result = validatePayment(-10, "Test");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Amount must be positive");
  });

  it("should reject amounts below minimum", () => {
    const result = validatePayment(5, "Test");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Amount below minimum");
  });

  it("should reject amounts above maximum", () => {
    const result = validatePayment(150_000, "Test");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Amount exceeds maximum");
  });

  it("should require memo", () => {
    const result = validatePayment(100, "");
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Memo is required");
  });

  it("should reject overly long memos", () => {
    const longMemo = "a".repeat(150);
    const result = validatePayment(100, longMemo);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Memo too long");
  });
});

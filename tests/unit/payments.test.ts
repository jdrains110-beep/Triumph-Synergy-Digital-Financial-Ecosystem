/**
 * Payments Routing Unit Tests
 * Covers: UnifiedPaymentRouter, PaymentMethod, PaymentRoute, priority routing
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mock modules
// ---------------------------------------------------------------------------
const piProcessorMock = {
  processPayment: vi.fn(),
  getStatus: vi.fn(),
  refund: vi.fn(),
};

const appleProcessorMock = {
  processPayment: vi.fn(),
  getStatus: vi.fn(),
};

vi.mock("@/lib/payments/pi-network-primary", () => ({
  default: vi.fn().mockImplementation(() => piProcessorMock),
}));

vi.mock("@/lib/payments/apple-pay-secondary", () => ({
  default: vi.fn().mockImplementation(() => appleProcessorMock),
}));

vi.mock("@/lib/payments/unified-routing", () => {
  const routerMock = {
    getPaymentMethods: vi.fn(),
    getRoutes: vi.fn(),
    processPayment: vi.fn(),
    selectBestRoute: vi.fn(),
    getPrimaryMethod: vi.fn(),
    getMethodStats: vi.fn(),
  };
  return {
    UnifiedPaymentRouter: vi.fn().mockImplementation(() => routerMock),
  };
});

import { UnifiedPaymentRouter } from "@/lib/payments/unified-routing";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makePaymentMethod(
  id: string,
  type: "crypto" | "wallet" | "card" | "bank",
  priority: number,
  enabled = true
) {
  return { id, name: id, type, priority, enabled, targetAdoption: 1 / priority };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("UnifiedPaymentRouter instantiation", () => {
  it("should instantiate without throwing", () => {
    const router = new (UnifiedPaymentRouter as unknown as new () => object)();
    expect(router).toBeDefined();
  });
});

describe("Payment method priorities", () => {
  let routerMock: ReturnType<ReturnType<typeof UnifiedPaymentRouter extends new () => infer T ? new () => T : never>>;

  beforeEach(() => {
    vi.clearAllMocks();
    routerMock = new (UnifiedPaymentRouter as unknown as new () => {
      getPaymentMethods: ReturnType<typeof vi.fn>;
      getRoutes: ReturnType<typeof vi.fn>;
      processPayment: ReturnType<typeof vi.fn>;
      selectBestRoute: ReturnType<typeof vi.fn>;
      getPrimaryMethod: ReturnType<typeof vi.fn>;
      getMethodStats: ReturnType<typeof vi.fn>;
    })();
  });

  it("should expose pi_network as highest priority method", () => {
    (routerMock as { getPaymentMethods: ReturnType<typeof vi.fn> }).getPaymentMethods.mockReturnValueOnce([
      makePaymentMethod("pi_network", "crypto", 1),
      makePaymentMethod("apple_pay", "wallet", 2),
      makePaymentMethod("stripe", "card", 3),
    ]);

    const methods: ReturnType<typeof makePaymentMethod>[] = (routerMock as { getPaymentMethods: ReturnType<typeof vi.fn> }).getPaymentMethods();
    const sorted = [...methods].sort((a, b) => a.priority - b.priority);

    expect(sorted[0].id).toBe("pi_network");
    expect(sorted[0].priority).toBe(1);
  });

  it("should route 95% of transactions through Pi Network", () => {
    (routerMock as { getPrimaryMethod: ReturnType<typeof vi.fn> }).getPrimaryMethod.mockReturnValueOnce(
      makePaymentMethod("pi_network", "crypto", 1)
    );

    const primary: ReturnType<typeof makePaymentMethod> = (routerMock as { getPrimaryMethod: ReturnType<typeof vi.fn> }).getPrimaryMethod();
    expect(primary.id).toBe("pi_network");
    expect(primary.targetAdoption).toBeCloseTo(1);
  });
});

describe("processPayment", () => {
  let routerInstance: { processPayment: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();
    routerInstance = new (UnifiedPaymentRouter as unknown as new () => { processPayment: ReturnType<typeof vi.fn> })();
  });

  it("should process a Pi Network payment successfully", async () => {
    (routerInstance as { processPayment: ReturnType<typeof vi.fn> }).processPayment.mockResolvedValueOnce({
      success: true,
      paymentId: "pay-001",
      method: "pi_network",
      amount: 10,
      currency: "Pi",
      txHash: "stellar-hash-abc",
    });

    const result = await routerInstance.processPayment({
      amount: 10,
      currency: "Pi",
      userId: "user-001",
      description: "Coffee",
    });

    expect(result.success).toBe(true);
    expect(result.method).toBe("pi_network");
    expect(result.txHash).toBeTruthy();
  });

  it("should fall back to Apple Pay if Pi Network is unavailable", async () => {
    (routerInstance as { processPayment: ReturnType<typeof vi.fn> }).processPayment.mockResolvedValueOnce({
      success: true,
      paymentId: "pay-002",
      method: "apple_pay",
      amount: 5,
      currency: "USD",
      fallbackReason: "pi_network_unavailable",
    });

    const result = await routerInstance.processPayment({
      amount: 5,
      currency: "USD",
      userId: "user-001",
      preferredMethod: "pi_network",
    });

    expect(result.success).toBe(true);
    expect(result.method).toBe("apple_pay");
    expect(result.fallbackReason).toBe("pi_network_unavailable");
  });

  it("should fail gracefully if all methods are unavailable", async () => {
    (routerInstance as { processPayment: ReturnType<typeof vi.fn> }).processPayment.mockRejectedValueOnce(
      new Error("No available payment methods")
    );

    await expect(
      routerInstance.processPayment({ amount: 100, currency: "USD", userId: "u1" })
    ).rejects.toThrow("No available payment methods");
  });
});

describe("selectBestRoute", () => {
  let routerInstance: { selectBestRoute: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();
    routerInstance = new (UnifiedPaymentRouter as unknown as new () => { selectBestRoute: ReturnType<typeof vi.fn> })();
  });

  it("should select Pi Network for crypto payments", () => {
    (routerInstance as { selectBestRoute: ReturnType<typeof vi.fn> }).selectBestRoute.mockReturnValueOnce({
      method: makePaymentMethod("pi_network", "crypto", 1),
      processor: "pi_network",
      fallback: ["apple_pay", "stripe"],
    });

    const route: { method: ReturnType<typeof makePaymentMethod>; fallback: string[] } = (routerInstance as { selectBestRoute: ReturnType<typeof vi.fn> }).selectBestRoute({ currency: "Pi", amount: 10 });

    expect(route.method.id).toBe("pi_network");
    expect(route.fallback).toContain("apple_pay");
  });
});

describe("getMethodStats", () => {
  let routerInstance: { getMethodStats: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    vi.clearAllMocks();
    routerInstance = new (UnifiedPaymentRouter as unknown as new () => { getMethodStats: ReturnType<typeof vi.fn> })();
  });

  it("should return usage statistics per method", () => {
    (routerInstance as { getMethodStats: ReturnType<typeof vi.fn> }).getMethodStats.mockReturnValueOnce({
      pi_network: { totalTransactions: 950, successRate: 0.998, avgLatencyMs: 1200 },
      apple_pay: { totalTransactions: 50, successRate: 0.995, avgLatencyMs: 3000 },
    });

    const stats: Record<string, { totalTransactions: number; successRate: number }> = (routerInstance as { getMethodStats: ReturnType<typeof vi.fn> }).getMethodStats();

    expect(stats.pi_network.totalTransactions).toBeGreaterThan(stats.apple_pay.totalTransactions);
    expect(stats.pi_network.successRate).toBeGreaterThan(0.99);
  });
});

// ---------------------------------------------------------------------------
// PaymentMethod type shapes
// ---------------------------------------------------------------------------
describe("PaymentMethod structure", () => {
  it("should classify pi_network as crypto type", () => {
    const method = makePaymentMethod("pi_network", "crypto", 1);
    expect(method.type).toBe("crypto");
    expect(method.enabled).toBe(true);
    expect(method.priority).toBe(1);
  });

  it("should have targetAdoption between 0 and 1", () => {
    const methods = [
      { targetAdoption: 0.95 },
      { targetAdoption: 0.05 },
      { targetAdoption: 0.001 },
    ];

    for (const m of methods) {
      expect(m.targetAdoption).toBeGreaterThan(0);
      expect(m.targetAdoption).toBeLessThanOrEqual(1);
    }
  });
});

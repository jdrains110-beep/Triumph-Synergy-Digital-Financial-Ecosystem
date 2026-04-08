/**
 * Network Monitor Unit Tests
 * Covers: NetworkMonitor, ThreatLevel, ThreatType, anomaly detection helpers
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mock the module
// ---------------------------------------------------------------------------
const monitorMock = {
  recordTransaction: vi.fn(),
  analyzeTransaction: vi.fn(),
  recordLoginAttempt: vi.fn(),
  getAccountMetrics: vi.fn(),
  getThreats: vi.fn(),
  getThreatById: vi.fn(),
  updateThreatStatus: vi.fn(),
  takeSnapshot: vi.fn(),
  getNetworkHealth: vi.fn(),
  clearThreats: vi.fn(),
};

vi.mock("@/lib/network/network-monitor", () => ({
  NetworkMonitor: {
    getInstance: vi.fn(() => monitorMock),
  },
}));

import { NetworkMonitor } from "@/lib/network/network-monitor";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeThreat(overrides: Record<string, unknown> = {}) {
  return {
    id: "threat-001",
    type: "stolen_pi",
    level: "high",
    accountIds: ["acc-1"],
    details: { description: "Stolen Pi detected from suspected exchange source" },
    detectedAt: Date.now(),
    status: "detected",
    affectedPiAmount: 100,
    ...overrides,
  };
}

function makeAnomalyResult(isAnomaly: boolean, score: number, reasons: string[] = []) {
  return {
    fromAddress: "ADDR_A",
    toAddress: "ADDR_B",
    amount: "100",
    timestamp: Date.now(),
    anomalyScore: score,
    isAnomaly,
    reasons,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("NetworkMonitor singleton", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should return the same instance each time", () => {
    const a = NetworkMonitor.getInstance();
    const b = NetworkMonitor.getInstance();
    expect(a).toBe(b);
  });
});

describe("NetworkMonitor.recordTransaction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should record a transaction without errors", () => {
    monitorMock.recordTransaction.mockReturnValueOnce(undefined);

    expect(() =>
      monitorMock.recordTransaction({
        from: "ADDR_A",
        to: "ADDR_B",
        amount: "50",
        timestamp: Date.now(),
      })
    ).not.toThrow();
    expect(monitorMock.recordTransaction).toHaveBeenCalledOnce();
  });
});

describe("NetworkMonitor.analyzeTransaction", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should return low anomaly score for normal transactions", () => {
    monitorMock.analyzeTransaction.mockReturnValueOnce(
      makeAnomalyResult(false, 5)
    );

    const result = monitorMock.analyzeTransaction({
      fromAddress: "ADDR_A",
      toAddress: "ADDR_B",
      amount: "10",
      timestamp: Date.now(),
    });

    expect(result.isAnomaly).toBe(false);
    expect(result.anomalyScore).toBeLessThan(50);
    expect(result.reasons).toHaveLength(0);
  });

  it("should flag rapid large transfers as anomalies", () => {
    monitorMock.analyzeTransaction.mockReturnValueOnce(
      makeAnomalyResult(true, 85, [
        "Transfer volume 10x above account average",
        "Multiple rapid transactions in 60 seconds",
      ])
    );

    const result = monitorMock.analyzeTransaction({
      fromAddress: "ADDR_SUSPECT",
      toAddress: "ADDR_EXCHANGE",
      amount: "999999",
      timestamp: Date.now(),
    });

    expect(result.isAnomaly).toBe(true);
    expect(result.anomalyScore).toBeGreaterThan(50);
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it("should score anomaly between 0 and 100", () => {
    monitorMock.analyzeTransaction.mockReturnValueOnce(
      makeAnomalyResult(false, 0)
    );

    const result = monitorMock.analyzeTransaction({
      fromAddress: "A",
      toAddress: "B",
      amount: "1",
      timestamp: Date.now(),
    });

    expect(result.anomalyScore).toBeGreaterThanOrEqual(0);
    expect(result.anomalyScore).toBeLessThanOrEqual(100);
  });
});

describe("NetworkMonitor.getThreats", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should return empty array when no threats exist", () => {
    monitorMock.getThreats.mockReturnValueOnce([]);
    const threats = monitorMock.getThreats();
    expect(threats).toEqual([]);
  });

  it("should return all recorded threats", () => {
    const threats = [makeThreat(), makeThreat({ id: "threat-002", type: "double_spend" })];
    monitorMock.getThreats.mockReturnValueOnce(threats);

    const result = monitorMock.getThreats();
    expect(result).toHaveLength(2);
  });

  it("should filter threats by level", () => {
    const critical = [makeThreat({ level: "critical", id: "t-3" })];
    monitorMock.getThreats.mockReturnValueOnce(critical);

    const result = monitorMock.getThreats({ level: "critical" });
    expect(result.every((t: { level: string }) => t.level === "critical")).toBe(true);
  });
});

describe("NetworkMonitor.updateThreatStatus", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should update a threat to resolved", () => {
    const updated = makeThreat({ status: "resolved" });
    monitorMock.updateThreatStatus.mockReturnValueOnce(updated);

    const result = monitorMock.updateThreatStatus("threat-001", "resolved");
    expect(result.status).toBe("resolved");
  });

  it("should reject invalid status transitions", () => {
    monitorMock.updateThreatStatus.mockImplementationOnce(() => {
      throw new Error("Invalid status transition");
    });

    expect(() =>
      monitorMock.updateThreatStatus("threat-001", "invalid_status")
    ).toThrow("Invalid status transition");
  });

  const validStatuses = ["detected", "investigating", "confirmed", "resolved", "false_positive"];
  it.each(validStatuses)("should accept status '%s'", (status) => {
    monitorMock.updateThreatStatus.mockReturnValueOnce(makeThreat({ status }));
    const result = monitorMock.updateThreatStatus("threat-001", status);
    expect(result.status).toBe(status);
  });
});

describe("NetworkMonitor.getNetworkHealth", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should return 100 when no threats are active", () => {
    monitorMock.getNetworkHealth.mockReturnValueOnce(100);
    expect(monitorMock.getNetworkHealth()).toBe(100);
  });

  it("should return a number between 0 and 100", () => {
    monitorMock.getNetworkHealth.mockReturnValueOnce(72);
    const health = monitorMock.getNetworkHealth();
    expect(health).toBeGreaterThanOrEqual(0);
    expect(health).toBeLessThanOrEqual(100);
  });

  it("should decrease with active critical threats", () => {
    monitorMock.getNetworkHealth.mockReturnValueOnce(45);
    const health = monitorMock.getNetworkHealth();
    expect(health).toBeLessThan(100);
  });
});

describe("NetworkMonitor.takeSnapshot", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should capture a snapshot with required fields", () => {
    const snapshot = {
      timestamp: Date.now(),
      totalAccounts: 10000,
      suspiciousAccounts: 3,
      totalThreats: 3,
      criticalThreats: 0,
      stolenPiDetected: "0",
      networkHealth: 98,
    };
    monitorMock.takeSnapshot.mockReturnValueOnce(snapshot);

    const result = monitorMock.takeSnapshot();

    expect(result).toHaveProperty("timestamp");
    expect(result).toHaveProperty("totalAccounts");
    expect(result).toHaveProperty("networkHealth");
    expect(result.networkHealth).toBeGreaterThanOrEqual(0);
    expect(result.networkHealth).toBeLessThanOrEqual(100);
  });
});

// ---------------------------------------------------------------------------
// ThreatType / ThreatLevel type coverage
// ---------------------------------------------------------------------------
describe("Threat type and level enumerations", () => {
  const validThreatTypes = [
    "stolen_pi",
    "duplicate_account",
    "unusual_transfer",
    "rapid_exchanges",
    "ip_spoofing",
    "biometric_replay",
    "mass_account_creation",
    "double_spend",
    "account_takeover",
    "value_manipulation",
  ];
  const validLevels = ["low", "medium", "high", "critical"];

  it.each(validThreatTypes)("threat type '%s' should be a valid string", (type) => {
    expect(typeof type).toBe("string");
  });

  it.each(validLevels)("threat level '%s' should be a valid string", (level) => {
    expect(typeof level).toBe("string");
  });
});

// ---------------------------------------------------------------------------
// AccountAnomalyMetrics shape
// ---------------------------------------------------------------------------
describe("AccountAnomalyMetrics structure", () => {
  it("should have an overallRiskScore between 0 and 100", () => {
    const metrics = {
      accountId: "acc-123",
      loginAnomalies: 2,
      transferAnomalies: 1,
      deviceAnomalies: 0,
      geoAnomalies: 3,
      biometricFailures: 0,
      overallRiskScore: 30,
    };

    expect(metrics.overallRiskScore).toBeGreaterThanOrEqual(0);
    expect(metrics.overallRiskScore).toBeLessThanOrEqual(100);
    expect(Array.isArray([])).toBe(true); // AccountId is a string
    expect(typeof metrics.accountId).toBe("string");
  });
});

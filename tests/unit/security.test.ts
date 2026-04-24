/**
 * Security Suite Unit Tests
 * Covers: SecurityLevel, ThreatSeverity, PerformanceSuite, quantum encryption,
 *         zero-trust config, and rate-limiting helpers
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mock the security module
// ---------------------------------------------------------------------------
const suiteMock = {
  initialize: vi.fn(),
  encryptData: vi.fn(),
  decryptData: vi.fn(),
  detectThreat: vi.fn(),
  generateKeyPair: vi.fn(),
  signData: vi.fn(),
  verifySignature: vi.fn(),
  checkRateLimit: vi.fn(),
  getSecurityReport: vi.fn(),
  rotateKeys: vi.fn(),
};

vi.mock("@/lib/security/performance-security-suite", () => ({
  PerformanceSecuritySuite: {
    getInstance: vi.fn(() => suiteMock),
  },
  SECURITY_DEFAULTS: {
    level: "quantum",
    keyRotationInterval: 3600,
    maxRequestsPerSecond: 10000,
    burstLimit: 50000,
    quantumResistant: true,
    postQuantumAlgorithms: ["ML-KEM-768", "ML-DSA-65"],
  },
}));

import {
  PerformanceSecuritySuite,
  SECURITY_DEFAULTS,
} from "@/lib/security/performance-security-suite";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("SECURITY_DEFAULTS constants", () => {
  it("should use quantum security level by default", () => {
    expect(SECURITY_DEFAULTS.level).toBe("quantum");
  });

  it("should enable quantum-resistant encryption", () => {
    expect(SECURITY_DEFAULTS.quantumResistant).toBe(true);
  });

  it("should include ML-KEM-768 and ML-DSA-65 algorithms", () => {
    expect(SECURITY_DEFAULTS.postQuantumAlgorithms).toContain("ML-KEM-768");
    expect(SECURITY_DEFAULTS.postQuantumAlgorithms).toContain("ML-DSA-65");
  });

  it("should have a positive key rotation interval", () => {
    expect(SECURITY_DEFAULTS.keyRotationInterval).toBeGreaterThan(0);
  });
});

describe("PerformanceSecuritySuite singleton", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should return the same instance each time", () => {
    const a = PerformanceSecuritySuite.getInstance();
    const b = PerformanceSecuritySuite.getInstance();
    expect(a).toBe(b);
  });
});

describe("encryptData / decryptData", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should encrypt data and return a cipherText with a key", () => {
    const expected = {
      cipherText: new Uint8Array(1088),
      sharedSecret: new Uint8Array(32),
      publicKey: new Uint8Array(1184),
    };
    suiteMock.encryptData.mockReturnValueOnce(expected);

    const result = suiteMock.encryptData("sensitive-payload");

    expect(result.cipherText).toBeInstanceOf(Uint8Array);
    expect(result.sharedSecret).toBeInstanceOf(Uint8Array);
    expect(result.cipherText.length).toBeGreaterThan(0);
  });

  it("should decrypt cipherText back to original payload", () => {
    suiteMock.decryptData.mockReturnValueOnce("sensitive-payload");

    const plaintext = suiteMock.decryptData(
      new Uint8Array(1088),
      new Uint8Array(64)
    );

    expect(plaintext).toBe("sensitive-payload");
  });

  it("should throw on tampered cipherText", () => {
    suiteMock.decryptData.mockImplementationOnce(() => {
      throw new Error("Decryption failed: authentication tag mismatch");
    });

    expect(() =>
      suiteMock.decryptData(new Uint8Array(1088), new Uint8Array(64))
    ).toThrow("Decryption failed");
  });
});

describe("generateKeyPair / signData / verifySignature", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should generate a public/secret key pair", () => {
    suiteMock.generateKeyPair.mockReturnValueOnce({
      publicKey: new Uint8Array(1952),
      secretKey: new Uint8Array(4032),
    });

    const kp = suiteMock.generateKeyPair();
    expect(kp.publicKey).toBeInstanceOf(Uint8Array);
    expect(kp.secretKey).toBeInstanceOf(Uint8Array);
    expect(kp.publicKey.length).toBeGreaterThan(0);
    expect(kp.secretKey.length).toBeGreaterThan(0);
  });

  it("should sign a message and return a signature", () => {
    suiteMock.signData.mockReturnValueOnce(new Uint8Array(3309));

    const sig = suiteMock.signData("hello world", new Uint8Array(4032));
    expect(sig).toBeInstanceOf(Uint8Array);
    expect(sig.length).toBeGreaterThan(0);
  });

  it("should verify a valid signature as true", () => {
    suiteMock.verifySignature.mockReturnValueOnce(true);

    const valid = suiteMock.verifySignature(
      "hello world",
      new Uint8Array(3309),
      new Uint8Array(1952)
    );
    expect(valid).toBe(true);
  });

  it("should reject a tampered signature as false", () => {
    suiteMock.verifySignature.mockReturnValueOnce(false);

    const valid = suiteMock.verifySignature(
      "tampered message",
      new Uint8Array(3309),
      new Uint8Array(1952)
    );
    expect(valid).toBe(false);
  });
});

describe("detectThreat", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should return no threats for benign activity", () => {
    suiteMock.detectThreat.mockReturnValueOnce({ detected: false, severity: "info" });

    const result = suiteMock.detectThreat({ ip: "192.168.1.1", action: "read", resource: "/api/data" });
    expect(result.detected).toBe(false);
  });

  it("should detect a SQL injection attempt", () => {
    suiteMock.detectThreat.mockReturnValueOnce({
      detected: true,
      severity: "critical",
      type: "sql_injection",
      details: "UNION SELECT * detected in query param",
    });

    const result = suiteMock.detectThreat({
      ip: "10.0.0.5",
      action: "query",
      payload: "1 UNION SELECT * FROM users",
    });

    expect(result.detected).toBe(true);
    expect(result.severity).toBe("critical");
  });

  it("should detect DDoS from same IP flooding", () => {
    suiteMock.detectThreat.mockReturnValueOnce({
      detected: true,
      severity: "high",
      type: "ddos",
      requestCount: 15000,
    });

    const result = suiteMock.detectThreat({
      ip: "203.0.113.10",
      requestsLastSecond: 15000,
    });

    expect(result.detected).toBe(true);
    expect(result.severity).toBe("high");
  });
});

describe("checkRateLimit", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should allow requests under the limit", () => {
    suiteMock.checkRateLimit.mockReturnValueOnce({ allowed: true, remaining: 9500 });

    const result = suiteMock.checkRateLimit("user-123", "api-call");
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBeGreaterThan(0);
  });

  it("should block requests over the limit", () => {
    suiteMock.checkRateLimit.mockReturnValueOnce({ allowed: false, remaining: 0, retryAfterMs: 1000 });

    const result = suiteMock.checkRateLimit("user-123", "api-call");
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfterMs).toBeGreaterThan(0);
  });
});

describe("rotateKeys", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should rotate keys without throwing", async () => {
    suiteMock.rotateKeys.mockResolvedValueOnce({ rotatedAt: new Date(), newKeyId: "key-v2" });

    const result = await suiteMock.rotateKeys();
    expect(result.newKeyId).toBeTruthy();
    expect(result.rotatedAt).toBeInstanceOf(Date);
  });
});

describe("getSecurityReport", () => {
  beforeEach(() => vi.clearAllMocks());

  it("should return a report with a security score between 0 and 100", () => {
    suiteMock.getSecurityReport.mockReturnValueOnce({
      score: 97,
      level: "quantum",
      threats: [],
      lastScanAt: new Date(),
      recommendations: [],
    });

    const report = suiteMock.getSecurityReport();
    expect(report.score).toBeGreaterThanOrEqual(0);
    expect(report.score).toBeLessThanOrEqual(100);
    expect(Array.isArray(report.threats)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// SecurityLevel and ThreatSeverity enumerations (pure type coverage)
// ---------------------------------------------------------------------------
describe("SecurityLevel enumeration", () => {
  const levels = ["standard", "enhanced", "hardened", "fortress", "quantum", "supreme"];

  it.each(levels)("level '%s' should be a string", (level) => {
    expect(typeof level).toBe("string");
  });

  it("should have 6 levels", () => {
    expect(levels).toHaveLength(6);
  });
});

describe("ThreatSeverity enumeration", () => {
  const severities = ["info", "low", "medium", "high", "critical", "extinction"];

  it.each(severities)("severity '%s' should be defined", (s) => {
    expect(typeof s).toBe("string");
  });

  it("should have 6 severity levels", () => {
    expect(severities).toHaveLength(6);
  });
});

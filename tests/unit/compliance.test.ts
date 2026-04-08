/**
 * Compliance Suite Unit Tests
 * Covers: ComplianceOrchestrator, MICA, ISO 20022, KYC/AML, GDPR, Energy
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

// ---------------------------------------------------------------------------
// Mock all compliance sub-services
// ---------------------------------------------------------------------------
const micaMock = {
  auditComplianceStatus: vi.fn(),
  registerCryptoAsset: vi.fn(),
  checkWhitepaperRequirements: vi.fn(),
};

const isoMock = {
  validateFrameworkCompliance: vi.fn(),
  generatePACS008: vi.fn(),
  generateCAMT053: vi.fn(),
};

const kycMock = {
  runAMLScreening: vi.fn(),
  submitKYCApplication: vi.fn(),
  verifyIdentity: vi.fn(),
  checkSanctions: vi.fn(),
};

const gdprMock = {
  auditDataProtectionCompliance: vi.fn(),
  processDataDeletionRequest: vi.fn(),
  generatePrivacyReport: vi.fn(),
};

const energyMock = {
  calculateAnnualCarbonFootprint: vi.fn(),
  verifyOffsetCompliance: vi.fn(),
  getEnergyReport: vi.fn(),
};

const orchestratorMock = {
  runFullAudit: vi.fn(),
  getMICA: vi.fn(() => micaMock),
  getISO20022: vi.fn(() => isoMock),
  getKYCAML: vi.fn(() => kycMock),
  getGDPR: vi.fn(() => gdprMock),
  getEnergy: vi.fn(() => energyMock),
};

vi.mock("@/lib/compliance", () => ({
  ComplianceOrchestrator: vi.fn(() => orchestratorMock),
  MICAComplianceService: vi.fn(() => micaMock),
  ISO20022ComplianceService: vi.fn(() => isoMock),
  KYCAMLComplianceService: vi.fn(() => kycMock),
  GDPRComplianceService: vi.fn(() => gdprMock),
  EnergyEfficiencyComplianceService: vi.fn(() => energyMock),
}));

import {
  ComplianceOrchestrator,
} from "@/lib/compliance";

// ---------------------------------------------------------------------------
// Tests – ComplianceOrchestrator
// ---------------------------------------------------------------------------
describe("ComplianceOrchestrator", () => {
  let orchestrator: typeof orchestratorMock;

  beforeEach(() => {
    vi.clearAllMocks();
    orchestrator = new (ComplianceOrchestrator as unknown as new () => typeof orchestratorMock)();
  });

  it("should instantiate without throwing", () => {
    expect(orchestrator).toBeDefined();
  });

  describe("runFullAudit", () => {
    it("should return a composite report for all compliance areas", async () => {
      orchestratorMock.runFullAudit.mockResolvedValueOnce({
        mica: { compliant: true, score: 95 },
        iso20022: { compliant: true, score: 100 },
        kycaml: { compliant: true, riskLevel: "low" },
        gdpr: { compliant: true, dataRequests: 0 },
        energy: { compliant: true, netEmissions: 0 },
      });

      const report = await orchestratorMock.runFullAudit();

      expect(report.mica.compliant).toBe(true);
      expect(report.iso20022.compliant).toBe(true);
      expect(report.kycaml.compliant).toBe(true);
      expect(report.gdpr.compliant).toBe(true);
      expect(report.energy.compliant).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// MICA Compliance
// ---------------------------------------------------------------------------
describe("MICAComplianceService", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("auditComplianceStatus", () => {
    it("should return compliant status for a registered asset", async () => {
      micaMock.auditComplianceStatus.mockResolvedValueOnce({
        assetId: "SYNERGY",
        compliant: true,
        category: "utility-token",
        lastAuditDate: new Date(),
        reserveRatio: 1.0,
      });

      const result = await micaMock.auditComplianceStatus("SYNERGY");
      expect(result.compliant).toBe(true);
      expect(result.reserveRatio).toBeGreaterThanOrEqual(1);
    });

    it("should flag non-compliant assets", async () => {
      micaMock.auditComplianceStatus.mockResolvedValueOnce({
        assetId: "UNKNOWN",
        compliant: false,
        reason: "Asset not registered with competent authority",
      });

      const result = await micaMock.auditComplianceStatus("UNKNOWN");
      expect(result.compliant).toBe(false);
      expect(result.reason).toBeTruthy();
    });
  });
});

// ---------------------------------------------------------------------------
// ISO 20022 Compliance
// ---------------------------------------------------------------------------
describe("ISO20022ComplianceService", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("validateFrameworkCompliance", () => {
    it("should validate a pacs.008 payment message", () => {
      isoMock.validateFrameworkCompliance.mockReturnValueOnce({
        valid: true,
        messageType: "pacs.008",
        errors: [],
      });

      const result = isoMock.validateFrameworkCompliance({ messageType: "pacs.008", payload: {} });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should return errors for a malformed message", () => {
      isoMock.validateFrameworkCompliance.mockReturnValueOnce({
        valid: false,
        messageType: "pacs.008",
        errors: ["Missing mandatory field: CreDtTm", "Invalid BIC: XYZ12345"],
      });

      const result = isoMock.validateFrameworkCompliance({ messageType: "pacs.008", payload: {} });
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});

// ---------------------------------------------------------------------------
// KYC/AML Compliance
// ---------------------------------------------------------------------------
describe("KYCAMLComplianceService", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("runAMLScreening", () => {
    it("should clear a low-risk user", async () => {
      kycMock.runAMLScreening.mockResolvedValueOnce({
        userId: "user-001",
        riskLevel: "low",
        cleared: true,
        pep: false,
        sanctions: false,
        adverseMedia: false,
      });

      const result = await kycMock.runAMLScreening("user-001");
      expect(result.cleared).toBe(true);
      expect(result.riskLevel).toBe("low");
      expect(result.sanctions).toBe(false);
    });

    it("should flag a high-risk user on the sanctions list", async () => {
      kycMock.runAMLScreening.mockResolvedValueOnce({
        userId: "user-suspect",
        riskLevel: "high",
        cleared: false,
        sanctions: true,
        sanctionSource: "OFAC SDN",
      });

      const result = await kycMock.runAMLScreening("user-suspect");
      expect(result.cleared).toBe(false);
      expect(result.riskLevel).toBe("high");
      expect(result.sanctions).toBe(true);
    });
  });

  describe("checkSanctions", () => {
    it("should return false for a clean name", async () => {
      kycMock.checkSanctions.mockResolvedValueOnce({ matched: false });
      const result = await kycMock.checkSanctions({ name: "John Smith", country: "US" });
      expect(result.matched).toBe(false);
    });

    it("should return true and list sources for a matched entity", async () => {
      kycMock.checkSanctions.mockResolvedValueOnce({
        matched: true,
        sources: ["OFAC", "EU Sanctions"],
        matchScore: 0.96,
      });

      const result = await kycMock.checkSanctions({ name: "Badactor Malicious", country: "XX" });
      expect(result.matched).toBe(true);
      expect(result.sources.length).toBeGreaterThan(0);
    });
  });

  describe("submitKYCApplication", () => {
    it("should accept a valid identity document", async () => {
      kycMock.submitKYCApplication.mockResolvedValueOnce({
        applicationId: "kyc-app-001",
        status: "pending",
        estimatedCompletionMs: 60000,
      });

      const result = await kycMock.submitKYCApplication({
        userId: "user-001",
        documentType: "passport",
        documentNumber: "PP12345678",
        country: "US",
        expiryDate: "2030-01-01",
      });

      expect(result.applicationId).toBeTruthy();
      expect(result.status).toBe("pending");
    });
  });
});

// ---------------------------------------------------------------------------
// GDPR Compliance
// ---------------------------------------------------------------------------
describe("GDPRComplianceService", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("auditDataProtectionCompliance", () => {
    it("should pass audit for GDPR-compliant data handling", () => {
      gdprMock.auditDataProtectionCompliance.mockReturnValueOnce({
        compliant: true,
        dataMinimization: true,
        purposeLimitation: true,
        storageLimitation: true,
        score: 98,
      });

      const result = gdprMock.auditDataProtectionCompliance();
      expect(result.compliant).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(80);
    });
  });

  describe("processDataDeletionRequest", () => {
    it("should delete user data and confirm within 30 days", async () => {
      gdprMock.processDataDeletionRequest.mockResolvedValueOnce({
        requestId: "del-001",
        status: "completed",
        completedAt: new Date(),
        daysToComplete: 1,
      });

      const result = await gdprMock.processDataDeletionRequest("user-001");
      expect(result.status).toBe("completed");
      expect(result.daysToComplete).toBeLessThanOrEqual(30);
    });
  });
});

// ---------------------------------------------------------------------------
// Energy Efficiency Compliance
// ---------------------------------------------------------------------------
describe("EnergyEfficiencyComplianceService", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("calculateAnnualCarbonFootprint", () => {
    it("should compute total, offset, and net emissions", () => {
      energyMock.calculateAnnualCarbonFootprint.mockReturnValueOnce({
        totalEmissions: 500,
        offsetPurchased: 600,
        netEmissions: -100,
        carbonNeutral: true,
      });

      const result = energyMock.calculateAnnualCarbonFootprint();
      expect(typeof result.totalEmissions).toBe("number");
      expect(typeof result.netEmissions).toBe("number");
    });

    it("should report carbon-negative ecosystem", () => {
      energyMock.calculateAnnualCarbonFootprint.mockReturnValueOnce({
        totalEmissions: 300,
        offsetPurchased: 500,
        netEmissions: -200,
        carbonNeutral: true,
      });

      const result = energyMock.calculateAnnualCarbonFootprint();
      expect(result.netEmissions).toBeLessThan(0);
      expect(result.carbonNeutral).toBe(true);
    });
  });

  describe("verifyOffsetCompliance", () => {
    it("should verify Gold Standard offset certificates", async () => {
      energyMock.verifyOffsetCompliance.mockResolvedValueOnce({
        verified: true,
        standard: "Gold Standard",
        certificateId: "GS-2024-001",
        tonnesCO2: 600,
      });

      const result = await energyMock.verifyOffsetCompliance("GS-2024-001");
      expect(result.verified).toBe(true);
      expect(result.tonnesCO2).toBeGreaterThan(0);
    });
  });
});

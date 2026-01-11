/**
 * Triumph Synergy - Permit & Compliance System
 *
 * Comprehensive permit management for housing development and construction
 * Integrates with government agencies for compliance tracking
 *
 * @module lib/permits/permit-system
 * @version 1.0.0
 */

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type Permit = {
  id: string;
  permitNumber: string;
  type: PermitType;
  subType: string;
  status: PermitStatus;

  // Property
  propertyId: string | null;
  projectId: string | null;
  address: PermitAddress;
  parcelNumber: string;

  // Details
  description: string;
  scopeOfWork: string;
  estimatedCost: number;
  squareFootage: number;

  // Compliance
  requirements: ComplianceRequirement[];
  inspections: Inspection[];
  violations: Violation[];

  // Fees
  fees: PermitFee[];
  totalFees: number;
  paidAmount: number;

  // Parties
  applicantId: string;
  contractorId: string | null;
  architectId: string | null;
  engineerId: string | null;

  // Documents
  documents: PermitDocument[];
  plans: BuildingPlan[];

  // Dates
  applicationDate: Date;
  issuedDate: Date | null;
  expirationDate: Date | null;
  finalizedDate: Date | null;

  // Jurisdiction
  jurisdiction: string;
  department: string;
  reviewer: string | null;

  createdAt: Date;
  updatedAt: Date;
};

export type PermitType =
  | "building"
  | "electrical"
  | "plumbing"
  | "mechanical"
  | "demolition"
  | "grading"
  | "foundation"
  | "roofing"
  | "fire"
  | "sign"
  | "fence"
  | "pool"
  | "solar"
  | "hvac"
  | "zoning"
  | "conditional-use"
  | "variance"
  | "subdivision"
  | "encroachment"
  | "special-event";

export type PermitStatus =
  | "draft"
  | "submitted"
  | "under-review"
  | "corrections-required"
  | "approved"
  | "issued"
  | "active"
  | "inspection-hold"
  | "expired"
  | "finalized"
  | "revoked"
  | "denied";

export type PermitAddress = {
  street: string;
  unit: string | null;
  city: string;
  state: string;
  zip: string;
  county: string;
  apn: string; // Assessor's Parcel Number
};

export type ComplianceRequirement = {
  id: string;
  code: string;
  title: string;
  description: string;
  category: ComplianceCategory;
  status: "pending" | "in-review" | "approved" | "failed" | "waived";
  notes: string;
  reviewedBy: string | null;
  reviewedAt: Date | null;
};

export type ComplianceCategory =
  | "building-code"
  | "fire-code"
  | "zoning"
  | "environmental"
  | "ada-accessibility"
  | "energy"
  | "seismic"
  | "flood"
  | "health-safety"
  | "historic-preservation";

export type Inspection = {
  id: string;
  type: InspectionType;
  status: InspectionStatus;
  scheduledDate: Date;
  completedDate: Date | null;
  inspector: string;
  result: "pass" | "fail" | "partial" | "not-ready" | null;
  notes: string;
  corrections: InspectionCorrection[];
  photos: string[];
};

export type InspectionType =
  | "foundation"
  | "rough-framing"
  | "rough-electrical"
  | "rough-plumbing"
  | "rough-mechanical"
  | "insulation"
  | "drywall"
  | "fire-safety"
  | "final-building"
  | "final-electrical"
  | "final-plumbing"
  | "final-mechanical"
  | "occupancy"
  | "grading"
  | "solar"
  | "pool";

export type InspectionStatus =
  | "scheduled"
  | "in-progress"
  | "completed"
  | "cancelled"
  | "rescheduled";

export type InspectionCorrection = {
  id: string;
  description: string;
  severity: "minor" | "major" | "critical";
  deadline: Date;
  status: "open" | "corrected" | "verified";
  verifiedAt: Date | null;
};

export type Violation = {
  id: string;
  code: string;
  description: string;
  severity: "notice" | "warning" | "citation" | "stop-work";
  issuedDate: Date;
  deadline: Date;
  fine: number;
  status: "open" | "correcting" | "resolved" | "escalated";
  resolvedDate: Date | null;
  resolution: string | null;
};

export type PermitFee = {
  id: string;
  type: FeeType;
  description: string;
  amount: number;
  status: "pending" | "paid" | "waived" | "refunded";
  paidDate: Date | null;
  receiptNumber: string | null;
};

export type FeeType =
  | "application"
  | "plan-review"
  | "permit"
  | "inspection"
  | "impact"
  | "school"
  | "park"
  | "traffic"
  | "utility-connection"
  | "fire-district"
  | "technology"
  | "administrative";

export type PermitDocument = {
  id: string;
  name: string;
  type: DocumentCategory;
  url: string;
  uploadedAt: Date;
  status: "pending" | "approved" | "rejected";
  comments: string;
};

export type DocumentCategory =
  | "application-form"
  | "site-plan"
  | "floor-plan"
  | "elevations"
  | "structural-calculations"
  | "title-24-energy"
  | "soils-report"
  | "drainage-plan"
  | "fire-sprinkler"
  | "ada-compliance"
  | "environmental-review"
  | "contractor-license"
  | "insurance-certificate"
  | "owner-authorization";

export type BuildingPlan = {
  id: string;
  sheetNumber: string;
  title: string;
  discipline:
    | "architectural"
    | "structural"
    | "electrical"
    | "plumbing"
    | "mechanical"
    | "civil"
    | "landscape";
  version: number;
  url: string;
  status: "submitted" | "under-review" | "approved" | "revise-resubmit";
  comments: PlanComment[];
  uploadedAt: Date;
  approvedAt: Date | null;
};

export type PlanComment = {
  id: string;
  comment: string;
  location: { x: number; y: number };
  author: string;
  createdAt: Date;
  resolved: boolean;
};

export type Contractor = {
  id: string;
  licenseNumber: string;
  licenseType: string;
  licenseState: string;
  businessName: string;
  ownerName: string;
  email: string;
  phone: string;
  address: PermitAddress;
  classification: string[];
  bondAmount: number;
  insuranceExpiration: Date;
  workersCompExpiration: Date;
  verified: boolean;
  rating: number;
  completedProjects: number;
};

export type ZoningInfo = {
  parcelNumber: string;
  zoneCode: string;
  zoneName: string;
  allowedUses: string[];
  conditionalUses: string[];
  prohibitedUses: string[];
  setbacks: {
    front: number;
    rear: number;
    side: number;
  };
  maxHeight: number;
  maxLotCoverage: number;
  minLotSize: number;
  parkingRequirements: string;
  overlayDistricts: string[];
  specialRestrictions: string[];
};

export type EnvironmentalReview = {
  id: string;
  projectId: string;
  type:
    | "categorical-exemption"
    | "negative-declaration"
    | "mitigated-neg-dec"
    | "eir";
  status: "pending" | "in-progress" | "approved" | "denied";
  leadAgency: string;
  publicCommentPeriod: { start: Date; end: Date } | null;
  findings: EnvironmentalFinding[];
  mitigationMeasures: MitigationMeasure[];
  documents: PermitDocument[];
  createdAt: Date;
  completedAt: Date | null;
};

export type EnvironmentalFinding = {
  category: string;
  impact:
    | "none"
    | "less-than-significant"
    | "potentially-significant"
    | "significant";
  description: string;
  mitigation: string | null;
};

export type MitigationMeasure = {
  id: string;
  category: string;
  measure: string;
  timing: string;
  responsible: string;
  status: "pending" | "in-progress" | "complete" | "verified";
};

// ============================================================================
// PERMIT SYSTEM ENGINE
// ============================================================================

export class PermitSystem {
  private static instance: PermitSystem;

  private readonly permits: Map<string, Permit> = new Map();
  private readonly contractors: Map<string, Contractor> = new Map();
  private readonly zoningData: Map<string, ZoningInfo> = new Map();

  private constructor() {
    this.initializeZoningData();
  }

  static getInstance(): PermitSystem {
    if (!PermitSystem.instance) {
      PermitSystem.instance = new PermitSystem();
    }
    return PermitSystem.instance;
  }

  private initializeZoningData(): void {
    // Sample zoning data
    const residentialZone: ZoningInfo = {
      parcelNumber: "SAMPLE",
      zoneCode: "R-1",
      zoneName: "Single-Family Residential",
      allowedUses: [
        "single-family-dwelling",
        "home-office",
        "accessory-dwelling",
      ],
      conditionalUses: ["daycare", "home-business", "short-term-rental"],
      prohibitedUses: ["commercial", "industrial", "multi-family"],
      setbacks: { front: 20, rear: 15, side: 5 },
      maxHeight: 35,
      maxLotCoverage: 0.4,
      minLotSize: 6000,
      parkingRequirements: "2 spaces per unit",
      overlayDistricts: [],
      specialRestrictions: [],
    };

    this.zoningData.set("R-1", residentialZone);
  }

  // ==========================================================================
  // PERMIT MANAGEMENT
  // ==========================================================================

  async createPermitApplication(
    permitData: Omit<
      Permit,
      | "id"
      | "permitNumber"
      | "createdAt"
      | "updatedAt"
      | "status"
      | "issuedDate"
      | "finalizedDate"
    >
  ): Promise<Permit> {
    const id = `permit-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const permitNumber = `${permitData.type.toUpperCase().slice(0, 3)}-${new Date().getFullYear()}-${Math.floor(
      Math.random() * 100_000
    )
      .toString()
      .padStart(5, "0")}`;

    const permit: Permit = {
      ...permitData,
      id,
      permitNumber,
      status: "draft",
      issuedDate: null,
      finalizedDate: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.permits.set(id, permit);
    return permit;
  }

  async submitPermit(permitId: string): Promise<Permit> {
    const permit = this.permits.get(permitId);
    if (!permit) {
      throw new Error("Permit not found");
    }

    if (permit.status !== "draft" && permit.status !== "corrections-required") {
      throw new Error("Permit cannot be submitted in current status");
    }

    // Validate required documents
    const requiredDocs: DocumentCategory[] = ["application-form", "site-plan"];
    const uploadedTypes = permit.documents.map((d) => d.type);
    const missingDocs = requiredDocs.filter((r) => !uploadedTypes.includes(r));

    if (missingDocs.length > 0) {
      throw new Error(`Missing required documents: ${missingDocs.join(", ")}`);
    }

    permit.status = "submitted";
    permit.updatedAt = new Date();

    return permit;
  }

  async getPermit(permitId: string): Promise<Permit | null> {
    return this.permits.get(permitId) || null;
  }

  async searchPermits(query: {
    type?: PermitType;
    status?: PermitStatus;
    applicantId?: string;
    contractorId?: string;
    address?: string;
    dateRange?: { start: Date; end: Date };
    limit?: number;
  }): Promise<Permit[]> {
    let permits = Array.from(this.permits.values());

    if (query.type) {
      permits = permits.filter((p) => p.type === query.type);
    }
    if (query.status) {
      permits = permits.filter((p) => p.status === query.status);
    }
    if (query.applicantId) {
      permits = permits.filter((p) => p.applicantId === query.applicantId);
    }
    if (query.contractorId) {
      permits = permits.filter((p) => p.contractorId === query.contractorId);
    }
    if (query.address) {
      permits = permits.filter((p) =>
        p.address.street.toLowerCase().includes(query.address!.toLowerCase())
      );
    }
    if (query.dateRange) {
      permits = permits.filter(
        (p) =>
          p.applicationDate >= query.dateRange!.start &&
          p.applicationDate <= query.dateRange!.end
      );
    }

    permits.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    if (query.limit) {
      permits = permits.slice(0, query.limit);
    }

    return permits;
  }

  async updatePermitStatus(
    permitId: string,
    status: PermitStatus,
    notes?: string
  ): Promise<Permit> {
    const permit = this.permits.get(permitId);
    if (!permit) {
      throw new Error("Permit not found");
    }

    permit.status = status;
    permit.updatedAt = new Date();

    if (status === "issued") {
      permit.issuedDate = new Date();
      permit.expirationDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 1 year
    }

    if (status === "finalized") {
      permit.finalizedDate = new Date();
    }

    return permit;
  }

  // ==========================================================================
  // INSPECTIONS
  // ==========================================================================

  async scheduleInspection(
    permitId: string,
    inspectionData: Omit<
      Inspection,
      "id" | "status" | "completedDate" | "result" | "corrections" | "photos"
    >
  ): Promise<Inspection> {
    const permit = this.permits.get(permitId);
    if (!permit) {
      throw new Error("Permit not found");
    }

    const inspection: Inspection = {
      ...inspectionData,
      id: `insp-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      status: "scheduled",
      completedDate: null,
      result: null,
      corrections: [],
      photos: [],
    };

    permit.inspections.push(inspection);
    permit.updatedAt = new Date();

    return inspection;
  }

  async recordInspectionResult(
    permitId: string,
    inspectionId: string,
    result: Inspection["result"],
    notes: string,
    corrections?: Omit<InspectionCorrection, "id" | "status" | "verifiedAt">[]
  ): Promise<Inspection> {
    const permit = this.permits.get(permitId);
    if (!permit) {
      throw new Error("Permit not found");
    }

    const inspection = permit.inspections.find((i) => i.id === inspectionId);
    if (!inspection) {
      throw new Error("Inspection not found");
    }

    inspection.result = result;
    inspection.notes = notes;
    inspection.completedDate = new Date();
    inspection.status = "completed";

    if (corrections) {
      inspection.corrections = corrections.map((c) => ({
        ...c,
        id: `corr-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        status: "open",
        verifiedAt: null,
      }));
    }

    if (result === "fail") {
      permit.status = "inspection-hold";
    }

    permit.updatedAt = new Date();
    return inspection;
  }

  async getNextInspections(permitId: string): Promise<Inspection[]> {
    const permit = this.permits.get(permitId);
    if (!permit) {
      throw new Error("Permit not found");
    }

    return permit.inspections
      .filter((i) => i.status === "scheduled")
      .sort((a, b) => a.scheduledDate.getTime() - b.scheduledDate.getTime());
  }

  // ==========================================================================
  // COMPLIANCE
  // ==========================================================================

  async addComplianceRequirement(
    permitId: string,
    requirement: Omit<
      ComplianceRequirement,
      "id" | "status" | "reviewedBy" | "reviewedAt"
    >
  ): Promise<ComplianceRequirement> {
    const permit = this.permits.get(permitId);
    if (!permit) {
      throw new Error("Permit not found");
    }

    const compReq: ComplianceRequirement = {
      ...requirement,
      id: `comp-${Date.now()}`,
      status: "pending",
      reviewedBy: null,
      reviewedAt: null,
    };

    permit.requirements.push(compReq);
    permit.updatedAt = new Date();

    return compReq;
  }

  async updateComplianceStatus(
    permitId: string,
    requirementId: string,
    status: ComplianceRequirement["status"],
    reviewer: string,
    notes?: string
  ): Promise<ComplianceRequirement> {
    const permit = this.permits.get(permitId);
    if (!permit) {
      throw new Error("Permit not found");
    }

    const requirement = permit.requirements.find((r) => r.id === requirementId);
    if (!requirement) {
      throw new Error("Requirement not found");
    }

    requirement.status = status;
    requirement.reviewedBy = reviewer;
    requirement.reviewedAt = new Date();
    if (notes) {
      requirement.notes = notes;
    }

    permit.updatedAt = new Date();
    return requirement;
  }

  async checkAllCompliance(
    permitId: string
  ): Promise<{ compliant: boolean; pending: number; failed: number }> {
    const permit = this.permits.get(permitId);
    if (!permit) {
      throw new Error("Permit not found");
    }

    const pending = permit.requirements.filter(
      (r) => r.status === "pending" || r.status === "in-review"
    ).length;
    const failed = permit.requirements.filter(
      (r) => r.status === "failed"
    ).length;
    const compliant = pending === 0 && failed === 0;

    return { compliant, pending, failed };
  }

  // ==========================================================================
  // FEES
  // ==========================================================================

  async calculateFees(permitId: string): Promise<PermitFee[]> {
    const permit = this.permits.get(permitId);
    if (!permit) {
      throw new Error("Permit not found");
    }

    const fees: PermitFee[] = [];

    // Base permit fee
    fees.push({
      id: `fee-${Date.now()}-1`,
      type: "application",
      description: "Application Processing Fee",
      amount: 150,
      status: "pending",
      paidDate: null,
      receiptNumber: null,
    });

    // Plan review fee (based on estimated cost)
    const planReviewFee = Math.max(500, permit.estimatedCost * 0.005);
    fees.push({
      id: `fee-${Date.now()}-2`,
      type: "plan-review",
      description: "Plan Review Fee",
      amount: planReviewFee,
      status: "pending",
      paidDate: null,
      receiptNumber: null,
    });

    // Permit fee (based on square footage)
    const permitFee = permit.squareFootage * 0.5;
    fees.push({
      id: `fee-${Date.now()}-3`,
      type: "permit",
      description: "Building Permit Fee",
      amount: permitFee,
      status: "pending",
      paidDate: null,
      receiptNumber: null,
    });

    // Impact fees for new construction
    if (permit.type === "building" && permit.squareFootage > 500) {
      fees.push({
        id: `fee-${Date.now()}-4`,
        type: "impact",
        description: "Development Impact Fee",
        amount: permit.squareFootage * 2,
        status: "pending",
        paidDate: null,
        receiptNumber: null,
      });
    }

    permit.fees = fees;
    permit.totalFees = fees.reduce((sum, f) => sum + f.amount, 0);
    permit.updatedAt = new Date();

    return fees;
  }

  async payFee(
    permitId: string,
    feeId: string,
    receiptNumber: string
  ): Promise<PermitFee> {
    const permit = this.permits.get(permitId);
    if (!permit) {
      throw new Error("Permit not found");
    }

    const fee = permit.fees.find((f) => f.id === feeId);
    if (!fee) {
      throw new Error("Fee not found");
    }

    fee.status = "paid";
    fee.paidDate = new Date();
    fee.receiptNumber = receiptNumber;

    permit.paidAmount = permit.fees
      .filter((f) => f.status === "paid")
      .reduce((sum, f) => sum + f.amount, 0);
    permit.updatedAt = new Date();

    return fee;
  }

  // ==========================================================================
  // ZONING
  // ==========================================================================

  async getZoningInfo(zoneCode: string): Promise<ZoningInfo | null> {
    return this.zoningData.get(zoneCode) || null;
  }

  async checkZoningCompliance(permitData: {
    zoneCode: string;
    proposedUse: string;
    height: number;
    lotCoverage: number;
  }): Promise<{ compliant: boolean; violations: string[] }> {
    const zoning = this.zoningData.get(permitData.zoneCode);
    if (!zoning) {
      return { compliant: false, violations: ["Zone code not found"] };
    }

    const violations: string[] = [];

    if (
      !zoning.allowedUses.includes(permitData.proposedUse) &&
      !zoning.conditionalUses.includes(permitData.proposedUse)
    ) {
      violations.push(
        `Use "${permitData.proposedUse}" not allowed in zone ${permitData.zoneCode}`
      );
    }

    if (permitData.height > zoning.maxHeight) {
      violations.push(
        `Height ${permitData.height}ft exceeds maximum ${zoning.maxHeight}ft`
      );
    }

    if (permitData.lotCoverage > zoning.maxLotCoverage) {
      violations.push(
        `Lot coverage ${(permitData.lotCoverage * 100).toFixed(1)}% exceeds maximum ${(zoning.maxLotCoverage * 100).toFixed(1)}%`
      );
    }

    return { compliant: violations.length === 0, violations };
  }

  // ==========================================================================
  // CONTRACTORS
  // ==========================================================================

  async registerContractor(
    contractorData: Omit<
      Contractor,
      "id" | "verified" | "rating" | "completedProjects"
    >
  ): Promise<Contractor> {
    const id = `contractor-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    const contractor: Contractor = {
      ...contractorData,
      id,
      verified: false,
      rating: 0,
      completedProjects: 0,
    };

    this.contractors.set(id, contractor);
    return contractor;
  }

  async verifyContractorLicense(
    contractorId: string
  ): Promise<{ valid: boolean; expirationDate: Date | null; status: string }> {
    const contractor = this.contractors.get(contractorId);
    if (!contractor) {
      throw new Error("Contractor not found");
    }

    // In production, this would call state licensing board API
    const valid =
      contractor.insuranceExpiration > new Date() &&
      contractor.workersCompExpiration > new Date();

    return {
      valid,
      expirationDate: contractor.insuranceExpiration,
      status: valid ? "Active" : "Expired/Invalid",
    };
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export const permitSystem = PermitSystem.getInstance();

export async function applyForPermit(
  permitData: Parameters<typeof permitSystem.createPermitApplication>[0]
): Promise<Permit> {
  return permitSystem.createPermitApplication(permitData);
}

export async function submitPermitApplication(
  permitId: string
): Promise<Permit> {
  return permitSystem.submitPermit(permitId);
}

export async function scheduleInspection(
  permitId: string,
  inspectionData: Parameters<typeof permitSystem.scheduleInspection>[1]
): Promise<Inspection> {
  return permitSystem.scheduleInspection(permitId, inspectionData);
}

export async function checkZoning(
  data: Parameters<typeof permitSystem.checkZoningCompliance>[0]
): Promise<{ compliant: boolean; violations: string[] }> {
  return permitSystem.checkZoningCompliance(data);
}

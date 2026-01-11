/**
 * HEALTH CERTIFICATION & COMPLIANCE SYSTEM
 *
 * Track all organic certifications, health compliance status, and quality assurance
 * Verify against natural/organic standards - NO EXCEPTIONS
 */

export type OrganicCertification = {
  certificationId: string;
  certifyingBody: string;
  certificationType:
    | "USDA_Organic"
    | "EU_Organic"
    | "JAS_Organic"
    | "Demeter_Biodynamic"
    | "Fair_Trade"
    | "Non_GMO_Verified"
    | "Pesticide_Free"
    | "Natural_Product";
  issuedDate: Date;
  expiryDate: Date;
  scope: Array<{
    productCategory: string;
    farmIds?: string[];
    facilityIds?: string[];
  }>;
  auditDetails: {
    auditDate: Date;
    auditingOfficer: string;
    auditResult: "compliant" | "minor_issues" | "major_issues";
    findings: string[];
    correctiveActions?: Array<{
      action: string;
      dueDate: Date;
      completionDate?: Date;
      completed: boolean;
    }>;
  };
  documentUrl: string;
  status: "valid" | "pending_renewal" | "expired" | "suspended" | "revoked";
};

export type FacilityHealthCertification = {
  certificationId: string;
  facilityId: string;
  facilityName: string;
  certifications: OrganicCertification[];
  healthCompliance: {
    foodSafety: boolean;
    waterQuality: boolean;
    airQuality: boolean;
    wasteManagement: boolean;
    workerHealth: boolean;
    animalWelfare?: boolean;
  };
  lastInspectionDate: Date;
  lastInspectionResult: "compliant" | "minor_issues" | "major_issues";
  nextInspectionDate: Date;
  compliancePercentage: number;
};

export type ProductHealthCertification = {
  productId: string;
  productName: string;
  certifications: OrganicCertification[];
  ingredients: Array<{
    ingredientName: string;
    ingredientId: string;
    organicCertified: boolean;
    naturallySourced: boolean;
    certifications: string[];
  }>;
  processingMethods: Array<{
    method: string;
    natural: boolean;
    organic: boolean;
    certified: boolean;
  }>;
  packaging: {
    material:
      | "glass"
      | "ceramic"
      | "natural_fiber"
      | "aluminum_free_container"
      | "paper"
      | "cardboard";
    recyclable: boolean;
    compostable: boolean;
    organic: boolean;
    certified: boolean;
  };
  healthRating: {
    nutritionalValue: number;
    naturalIngredients: number;
    noArtificialAdditives: number;
    sustainability: number;
    overallScore: number;
  };
  complianceStatus: "certified" | "pending_certification" | "non_compliant";
};

export type HealthAudit = {
  auditId: string;
  auditDate: Date;
  auditingOfficer: string;
  auditingAuthority: string;
  auditTarget: "facility" | "farm" | "product_batch" | "supplier";
  targetId: string;
  targetName: string;
  scope: string;
  inspectionItems: Array<{
    itemId: string;
    category: string;
    requirement: string;
    status: "pass" | "fail" | "partial";
    comments?: string;
    evidence?: string;
  }>;
  overallResult: "compliant" | "minor_issues" | "major_issues";
  riskLevel: "low" | "medium" | "high" | "critical";
  correctionDeadline: Date;
  correctiveActionsRequired: Array<{
    actionId: string;
    action: string;
    priority: "immediate" | "urgent" | "standard";
    deadline: Date;
    status: "pending" | "in_progress" | "completed" | "overdue";
    completionDate?: Date;
  }>;
};

export type QualityAssuranceRecord = {
  recordId: string;
  productBatchId: string;
  productName: string;
  testDate: Date;
  testingLaboratory: string;
  testsPerformed: Array<{
    testId: string;
    testType: string;
    parameter: string;
    value: number;
    acceptableRange: { min: number; max: number };
    result: "pass" | "fail" | "flag_for_review";
  }>;
  overallResult: "pass" | "fail" | "conditional_pass";
  certificateUrl: string;
  validUntil: Date;
};

/**
 * HEALTH CERTIFICATION ENGINE
 */
export class HealthCertificationEngine {
  private static instance: HealthCertificationEngine;
  private readonly organicCertifications: Map<string, OrganicCertification> =
    new Map();
  private readonly facilityCertifications: Map<
    string,
    FacilityHealthCertification
  > = new Map();
  private readonly productCertifications: Map<
    string,
    ProductHealthCertification
  > = new Map();
  private readonly healthAudits: Map<string, HealthAudit> = new Map();
  private readonly qualityAssuranceRecords: HealthAuditDetails[] = [];
  private readonly complianceHistory: Array<{
    timestamp: Date;
    action: string;
    entityId: string;
    details: string;
  }> = [];

  private constructor() {}

  static getInstance(): HealthCertificationEngine {
    if (!HealthCertificationEngine.instance) {
      HealthCertificationEngine.instance = new HealthCertificationEngine();
    }
    return HealthCertificationEngine.instance;
  }

  /**
   * Register organic certification
   */
  async registerOrganicCertification(
    cert: OrganicCertification
  ): Promise<string> {
    // Verify certification is current
    if (cert.status === "expired") {
      throw new Error(
        `CERTIFICATION ERROR: ${cert.certifyingBody} certification expired`
      );
    }

    // Verify audit passed
    if (cert.auditDetails.auditResult !== "compliant") {
      throw new Error(
        `CERTIFICATION ERROR: Audit result not compliant for ${cert.certifyingBody}: ${cert.auditDetails.auditResult}`
      );
    }

    this.organicCertifications.set(cert.certificationId, cert);

    this.complianceHistory.push({
      timestamp: new Date(),
      action: "Registered organic certification",
      entityId: cert.certificationId,
      details: `${cert.certifyingBody} - ${cert.certificationType}`,
    });

    return cert.certificationId;
  }

  /**
   * Certify facility for health compliance
   */
  async certifyFacility(cert: FacilityHealthCertification): Promise<string> {
    // Verify all required compliance areas pass
    const requiredCompliance = [
      "foodSafety",
      "waterQuality",
      "airQuality",
      "wasteManagement",
      "workerHealth",
    ];

    const failedCompliance = requiredCompliance.filter(
      (area) => !(cert.healthCompliance as Record<string, boolean>)[area]
    );

    if (failedCompliance.length > 0) {
      throw new Error(
        `FACILITY COMPLIANCE ERROR: Failed compliance areas: ${failedCompliance.join(", ")}`
      );
    }

    // Verify all certifications are valid
    for (const certification of cert.certifications) {
      if (certification.status !== "valid") {
        throw new Error(
          `FACILITY COMPLIANCE ERROR: Certification not valid: ${certification.certifyingBody}`
        );
      }
    }

    // Verify last inspection passed
    if (cert.lastInspectionResult !== "compliant") {
      throw new Error(
        `FACILITY COMPLIANCE ERROR: Last inspection did not pass: ${cert.lastInspectionResult}`
      );
    }

    this.facilityCertifications.set(cert.certificationId, cert);

    this.complianceHistory.push({
      timestamp: new Date(),
      action: "Certified facility for health compliance",
      entityId: cert.facilityId,
      details: `${cert.facilityName} - Compliance: ${cert.compliancePercentage}%`,
    });

    return cert.certificationId;
  }

  /**
   * Certify product for health standards
   */
  async certifyProduct(cert: ProductHealthCertification): Promise<string> {
    // Verify all ingredients are certified natural/organic
    for (const ingredient of cert.ingredients) {
      if (!ingredient.organicCertified || !ingredient.naturallySourced) {
        throw new Error(
          `PRODUCT CERTIFICATION ERROR: Ingredient not certified organic: ${ingredient.ingredientName}`
        );
      }
    }

    // Verify processing methods are natural/organic
    for (const method of cert.processingMethods) {
      if (!method.natural || !method.organic) {
        throw new Error(
          `PRODUCT CERTIFICATION ERROR: Processing method not certified: ${method.method}`
        );
      }
    }

    // Verify packaging is approved
    const approvedPackaging = [
      "glass",
      "ceramic",
      "natural_fiber",
      "aluminum_free_container",
    ];
    if (!approvedPackaging.includes(cert.packaging.material)) {
      throw new Error(
        `PRODUCT CERTIFICATION ERROR: Unapproved packaging material: ${cert.packaging.material}`
      );
    }

    // Verify health rating is acceptable
    if (cert.healthRating.overallScore < 85) {
      throw new Error(
        `PRODUCT CERTIFICATION ERROR: Health rating too low: ${cert.healthRating.overallScore}/100`
      );
    }

    this.productCertifications.set(cert.productId, cert);

    this.complianceHistory.push({
      timestamp: new Date(),
      action: "Certified product for health standards",
      entityId: cert.productId,
      details: `${cert.productName} - Health Score: ${cert.healthRating.overallScore}`,
    });

    return cert.productId;
  }

  /**
   * Conduct health audit
   */
  async conductHealthAudit(audit: HealthAudit): Promise<string> {
    // Verify all inspection items have results
    const itemsWithoutResult = audit.inspectionItems.filter((i) => !i.status);
    if (itemsWithoutResult.length > 0) {
      throw new Error(
        `AUDIT ERROR: ${itemsWithoutResult.length} inspection items without results`
      );
    }

    // Check for failed items
    const failedItems = audit.inspectionItems.filter(
      (i) => i.status === "fail"
    );
    if (failedItems.length > 0 && audit.overallResult === "compliant") {
      throw new Error(
        "AUDIT ERROR: Failed items detected but overall result marked compliant"
      );
    }

    // If major issues, set high risk
    if (
      audit.overallResult === "major_issues" &&
      audit.riskLevel !== "high" &&
      audit.riskLevel !== "critical"
    ) {
      throw new Error(
        "AUDIT ERROR: Major issues require high or critical risk level"
      );
    }

    this.healthAudits.set(audit.auditId, audit);

    if (audit.overallResult !== "compliant") {
      this.complianceHistory.push({
        timestamp: new Date(),
        action: "Health audit conducted - Issues found",
        entityId: audit.targetId,
        details: `Result: ${audit.overallResult}, Risk: ${audit.riskLevel}`,
      });
    }

    return audit.auditId;
  }

  /**
   * Record quality assurance test
   */
  async recordQualityAssurance(
    record: QualityAssuranceRecord
  ): Promise<string> {
    // Verify all tests passed acceptable ranges
    const failedTests = record.testsPerformed.filter(
      (t) => t.result === "fail"
    );
    if (failedTests.length > 0) {
      throw new Error(
        `QUALITY ASSURANCE ERROR: ${failedTests.length} tests failed: ${failedTests
          .map((t) => t.testType)
          .join(", ")}`
      );
    }

    this.qualityAssuranceRecords.push({
      recordId: record.recordId,
      productBatchId: record.productBatchId,
      testDate: record.testDate,
      overallResult: record.overallResult,
    } as any);

    return record.recordId;
  }

  /**
   * Get facility compliance status
   */
  getFacilityComplianceStatus(facilityId: string): {
    certificationType: string;
    compliancePercentage: number;
    areasCompliant: string[];
    aresFailing: string[];
    certifications: number;
    status: "compliant" | "warning" | "non_compliant";
    nextAuditDate: Date;
  } {
    const cert = Array.from(this.facilityCertifications.values()).find(
      (c) => c.facilityId === facilityId
    );

    if (!cert) {
      throw new Error(`Facility not found: ${facilityId}`);
    }

    const requiredAreas = [
      "foodSafety",
      "waterQuality",
      "airQuality",
      "wasteManagement",
      "workerHealth",
    ];
    const compliant = requiredAreas.filter(
      (area) => (cert.healthCompliance as Record<string, boolean>)[area]
    );
    const failing = requiredAreas.filter(
      (area) => !(cert.healthCompliance as Record<string, boolean>)[area]
    );

    return {
      certificationType: cert.certifications
        .map((c) => c.certificationType)
        .join(", "),
      compliancePercentage: cert.compliancePercentage,
      areasCompliant: compliant,
      aresFailing: failing,
      certifications: cert.certifications.length,
      status: cert.compliancePercentage >= 95 ? "compliant" : "warning",
      nextAuditDate: cert.nextInspectionDate,
    };
  }

  /**
   * Get product health information
   */
  getProductHealthInfo(productId: string): {
    productName: string;
    certifiedOrganic: boolean;
    allNaturalIngredients: boolean;
    healthRating: number;
    certifications: string[];
    safePackaging: boolean;
    complianceStatus: string;
  } {
    const cert = this.productCertifications.get(productId);

    if (!cert) {
      throw new Error(`Product not found: ${productId}`);
    }

    const allNatural = cert.ingredients.every((i) => i.naturallySourced);
    const allOrganic = cert.ingredients.every((i) => i.organicCertified);
    const safePackaging = [
      "glass",
      "ceramic",
      "natural_fiber",
      "aluminum_free_container",
    ].includes(cert.packaging.material);

    return {
      productName: cert.productName,
      certifiedOrganic: allOrganic,
      allNaturalIngredients: allNatural,
      healthRating: cert.healthRating.overallScore,
      certifications: cert.certifications.map((c) => c.certifyingBody),
      safePackaging,
      complianceStatus: cert.complianceStatus,
    };
  }

  /**
   * Get audit status
   */
  getAuditStatus(auditId: string): {
    auditDate: Date;
    targetName: string;
    overallResult: string;
    riskLevel: string;
    itemsPassed: number;
    itemsFailed: number;
    correctiveActionsRequired: number;
    correctiveActionsCompleted: number;
    nextAuditDate?: Date;
  } {
    const audit = this.healthAudits.get(auditId);

    if (!audit) {
      throw new Error(`Audit not found: ${auditId}`);
    }

    const passed = audit.inspectionItems.filter(
      (i) => i.status === "pass"
    ).length;
    const failed = audit.inspectionItems.filter(
      (i) => i.status === "fail"
    ).length;
    const actionsCompleted = audit.correctiveActionsRequired.filter(
      (a) => a.status === "completed"
    ).length;

    return {
      auditDate: audit.auditDate,
      targetName: audit.targetName,
      overallResult: audit.overallResult,
      riskLevel: audit.riskLevel,
      itemsPassed: passed,
      itemsFailed: failed,
      correctiveActionsRequired: audit.correctiveActionsRequired.length,
      correctiveActionsCompleted: actionsCompleted,
      nextAuditDate: new Date(
        audit.correctionDeadline.getTime() + 30 * 24 * 60 * 60 * 1000
      ),
    };
  }

  /**
   * Generate compliance certificate
   */
  generateComplianceCertificate(
    entityId: string,
    entityType: "facility" | "product"
  ): {
    certificateId: string;
    entityName: string;
    certifications: string[];
    complianceStatus: string;
    validUntil: Date;
    issuedDate: Date;
    issuer: string;
  } {
    if (entityType === "facility") {
      const cert = Array.from(this.facilityCertifications.values()).find(
        (c) => c.facilityId === entityId
      );
      if (!cert) {
        throw new Error(`Facility not found: ${entityId}`);
      }

      return {
        certificateId: `cert_facility_${Date.now()}`,
        entityName: cert.facilityName,
        certifications: cert.certifications.map((c) => c.certifyingBody),
        complianceStatus:
          cert.compliancePercentage >= 95 ? "COMPLIANT" : "CONDITIONAL",
        validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        issuedDate: new Date(),
        issuer: "Health Certification Authority",
      };
    }
    const cert = this.productCertifications.get(entityId);
    if (!cert) {
      throw new Error(`Product not found: ${entityId}`);
    }

    return {
      certificateId: `cert_product_${Date.now()}`,
      entityName: cert.productName,
      certifications: cert.certifications.map((c) => c.certifyingBody),
      complianceStatus:
        cert.complianceStatus === "certified" ? "COMPLIANT" : "PENDING",
      validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      issuedDate: new Date(),
      issuer: "Health Certification Authority",
    };
  }

  /**
   * Get compliance history
   */
  getComplianceHistory(limit = 100): Array<{
    timestamp: Date;
    action: string;
    entityId: string;
    details: string;
  }> {
    return this.complianceHistory.slice(-limit);
  }
}

export type HealthAuditDetails = {
  recordId: string;
  productBatchId: string;
  testDate: Date;
  overallResult: string;
};

export default HealthCertificationEngine.getInstance();

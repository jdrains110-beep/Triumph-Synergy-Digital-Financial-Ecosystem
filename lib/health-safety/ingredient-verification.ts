/**
 * INGREDIENT VERIFICATION ENGINE
 *
 * NO EXCEPTIONS: Zero tolerance for harmful substances
 * - NO silicon dioxide (silica) in any food/drink products
 * - NO aluminum in any food/drink products
 * - NO harmful dyes (synthetic, artificial)
 * - NO carcinogenic or cancer-causing ingredients
 *
 * Every ingredient verified, tracked, and approved before use.
 * Complete supply chain for each ingredient from source to product.
 */

export type IngredientStatus =
  | "approved"
  | "pending_review"
  | "flagged"
  | "banned"
  | "quarantined";

export type IngredientRecord = {
  ingredientId: string;
  name: string;
  supplier: string;
  sourceLocation: string;
  batch: string;
  certifications: string[];
  botanicalOrigin?: string;
  harvestDate?: Date;
  processingMethod: string;
  testing: {
    testedDate: Date;
    laboratory: string;
    testsConducted: string[];
    results: IngredientTestResult[];
  };
};

export type IngredientTestResult = {
  testId: string;
  testType:
    | "pesticide"
    | "heavy_metals"
    | "synthetic_dyes"
    | "carcinogens"
    | "bacterial"
    | "viral"
    | "contaminants"
    | "purity";
  parameter: string;
  value: number;
  unit: string;
  safeLimit: number;
  result: "pass" | "fail" | "flag_for_review";
  testDate: Date;
  verifiedBy: string;
};

export type BannedSubstanceList = {
  substanceId: string;
  commonName: string;
  scientificName: string;
  category:
    | "silicon_dioxide"
    | "aluminum_compound"
    | "synthetic_dye"
    | "carcinogen"
    | "toxin";
  reason: string;
  allowedInProducts: string[];
  allowedInDrinks: string[];
  status: "banned" | "restricted" | "under_review";
};

export type ProductFormulation = {
  productId: string;
  productName: string;
  category: "food" | "drink" | "beverage" | "supplement";
  ingredients: Array<{
    ingredientId: string;
    ingredientName: string;
    percentageByWeight: number;
    supplier: string;
    batch: string;
    verificationStatus: "verified" | "pending";
  }>;
  formulation: {
    developedDate: Date;
    approvedDate?: Date;
    approvedBy?: string;
    versionNumber: number;
  };
  qualityChecks: Array<{
    checkDate: Date;
    checkType: string;
    result: "pass" | "fail";
    notes: string;
  }>;
};

export type SupplierVerification = {
  supplierId: string;
  supplierName: string;
  location: string;
  certifications: string[];
  auditHistory: Array<{
    auditDate: Date;
    auditType: "initial" | "annual" | "follow_up" | "surprise_inspection";
    result: "compliant" | "minor_issues" | "major_issues";
    findings: string[];
    correctionDate?: Date;
  }>;
  banned: boolean;
  banReason?: string;
};

/**
 * INGREDIENT VERIFICATION ENGINE
 *
 * Comprehensive ingredient validation system ensuring zero harmful substances
 */
export class IngredientVerificationEngine {
  private static instance: IngredientVerificationEngine;
  private readonly ingredients: Map<string, IngredientRecord> = new Map();
  private readonly bannedSubstances: Map<string, BannedSubstanceList> =
    new Map();
  private readonly productFormulations: Map<string, ProductFormulation> =
    new Map();
  private readonly supplierVerifications: Map<string, SupplierVerification> =
    new Map();
  private readonly rejectedIngredients: Map<string, IngredientRecord> =
    new Map();
  private readonly auditTrail: Array<{
    timestamp: Date;
    action: string;
    ingredientId?: string;
    reason?: string;
  }> = [];

  private constructor() {
    this.initializeBannedSubstances();
  }

  static getInstance(): IngredientVerificationEngine {
    if (!IngredientVerificationEngine.instance) {
      IngredientVerificationEngine.instance =
        new IngredientVerificationEngine();
    }
    return IngredientVerificationEngine.instance;
  }

  /**
   * Initialize banned substances list - NO EXCEPTIONS
   */
  private initializeBannedSubstances(): void {
    // SILICON DIOXIDE - BAN IN FOOD/DRINK
    this.bannedSubstances.set("silicon_dioxide", {
      substanceId: "sd_001",
      commonName: "Silicon Dioxide",
      scientificName: "SiO2",
      category: "silicon_dioxide",
      reason:
        "Harmful when ingested. Accumulates in body tissues. Associated with lung damage and autoimmune disorders.",
      allowedInProducts: [],
      allowedInDrinks: [],
      status: "banned",
    });

    // ALUMINUM COMPOUNDS - BAN IN FOOD/DRINK
    this.bannedSubstances.set("aluminum_hydroxide", {
      substanceId: "al_001",
      commonName: "Aluminum Hydroxide",
      scientificName: "Al(OH)3",
      category: "aluminum_compound",
      reason:
        "Neurotoxic. Associated with Alzheimer's and neurological disorders. Bioaccumulates.",
      allowedInProducts: [],
      allowedInDrinks: [],
      status: "banned",
    });

    this.bannedSubstances.set("aluminum_silicate", {
      substanceId: "al_002",
      commonName: "Aluminum Silicate",
      scientificName: "Al2SiO5",
      category: "aluminum_compound",
      reason: "Toxic combination of aluminum and silica. Respiratory hazard.",
      allowedInProducts: [],
      allowedInDrinks: [],
      status: "banned",
    });

    // SYNTHETIC DYES - BAN IN FOOD/DRINK
    this.bannedSubstances.set("tartrazine", {
      substanceId: "dye_001",
      commonName: "Tartrazine",
      scientificName: "FD&C Yellow No. 5",
      category: "synthetic_dye",
      reason:
        "Synthetic dye. Causes allergic reactions and hyperactivity in children. Not naturally derived.",
      allowedInProducts: [],
      allowedInDrinks: [],
      status: "banned",
    });

    this.bannedSubstances.set("sunset_yellow", {
      substanceId: "dye_002",
      commonName: "Sunset Yellow",
      scientificName: "FD&C Yellow No. 6",
      category: "synthetic_dye",
      reason: "Synthetic dye. Potential carcinogen. Causes adverse reactions.",
      allowedInProducts: [],
      allowedInDrinks: [],
      status: "banned",
    });

    this.bannedSubstances.set("allura_red", {
      substanceId: "dye_003",
      commonName: "Allura Red",
      scientificName: "FD&C Red No. 40",
      category: "synthetic_dye",
      reason:
        "Synthetic dye. Linked to cancer in animal studies. Banned in some countries.",
      allowedInProducts: [],
      allowedInDrinks: [],
      status: "banned",
    });

    // CARCINOGENS - BAN ABSOLUTELY
    this.bannedSubstances.set("bpa", {
      substanceId: "carc_001",
      commonName: "Bisphenol A (BPA)",
      scientificName: "BPA",
      category: "carcinogen",
      reason:
        "Endocrine disruptor. Carcinogenic. Bioaccumulates in fatty tissue.",
      allowedInProducts: [],
      allowedInDrinks: [],
      status: "banned",
    });

    this.bannedSubstances.set("artificial_sweeteners", {
      substanceId: "carc_002",
      commonName: "Certain Artificial Sweeteners",
      scientificName: "Aspartame, Saccharin, Sucralose",
      category: "carcinogen",
      reason:
        "Potential carcinogens with concerning animal study results. Metabolized into toxic compounds.",
      allowedInProducts: [],
      allowedInDrinks: [],
      status: "banned",
    });

    this.bannedSubstances.set("brominated_vegetable_oil", {
      substanceId: "carc_003",
      commonName: "Brominated Vegetable Oil",
      scientificName: "BVO",
      category: "carcinogen",
      reason: "Neurotoxic. Bioaccumulates in body. Linked to cancer.",
      allowedInProducts: [],
      allowedInDrinks: [],
      status: "banned",
    });

    this.auditTrail.push({
      timestamp: new Date(),
      action:
        "Initialized banned substances database with zero-tolerance policy",
    });
  }

  /**
   * Register and verify supplier
   */
  async registerSupplier(supplier: SupplierVerification): Promise<string> {
    // Verify supplier certifications
    const requiredCerts = [
      "organic_certified",
      "food_safety_certified",
      "pesticide_free_verification",
    ];
    const hasCerts = requiredCerts.some((cert) =>
      supplier.certifications.some((s) => s.includes(cert))
    );

    if (!hasCerts) {
      throw new Error(
        `INGREDIENT VERIFICATION FAILED: Supplier ${supplier.supplierName} lacks required certifications`
      );
    }

    this.supplierVerifications.set(supplier.supplierId, supplier);

    this.auditTrail.push({
      timestamp: new Date(),
      action: `Verified supplier: ${supplier.supplierName}`,
    });

    return supplier.supplierId;
  }

  /**
   * Verify ingredient batch - comprehensive testing
   * NO EXCEPTIONS: Must pass all safety tests
   */
  async verifyIngredientBatch(
    ingredient: IngredientRecord
  ): Promise<"approved" | "rejected"> {
    // Check all test results against banned substances
    for (const testResult of ingredient.testing.results) {
      // Check for ANY presence of banned substances
      const bannedSubstance = this.checkForBannedSubstances(
        testResult.parameter
      );
      if (bannedSubstance) {
        this.rejectedIngredients.set(ingredient.ingredientId, ingredient);
        this.auditTrail.push({
          timestamp: new Date(),
          action: "REJECTED ingredient batch",
          ingredientId: ingredient.ingredientId,
          reason: `Contains banned substance: ${bannedSubstance.commonName}`,
        });
        throw new Error(
          `INGREDIENT VERIFICATION FAILED: Batch contains ${bannedSubstance.commonName}`
        );
      }

      // Verify test result passed safe limits
      if (testResult.result === "fail") {
        this.rejectedIngredients.set(ingredient.ingredientId, ingredient);
        this.auditTrail.push({
          timestamp: new Date(),
          action: "REJECTED ingredient batch",
          ingredientId: ingredient.ingredientId,
          reason: `Test failed: ${testResult.testType} - ${testResult.parameter}`,
        });
        throw new Error(
          `INGREDIENT VERIFICATION FAILED: ${testResult.testType} test failed for ${ingredient.name}`
        );
      }
    }

    // Verify supplier is not banned
    const supplier = this.supplierVerifications.get(ingredient.supplier);
    if (!supplier || supplier.banned) {
      this.rejectedIngredients.set(ingredient.ingredientId, ingredient);
      this.auditTrail.push({
        timestamp: new Date(),
        action: "REJECTED ingredient batch",
        ingredientId: ingredient.ingredientId,
        reason: "Supplier is banned or unverified",
      });
      throw new Error(
        `INGREDIENT VERIFICATION FAILED: Supplier ${ingredient.supplier} is not approved`
      );
    }

    // Approve ingredient
    this.ingredients.set(ingredient.ingredientId, ingredient);

    this.auditTrail.push({
      timestamp: new Date(),
      action: "APPROVED ingredient batch",
      ingredientId: ingredient.ingredientId,
      reason: "All safety tests passed. Supplier verified.",
    });

    return "approved";
  }

  /**
   * Check for banned substances in test results
   */
  private checkForBannedSubstances(
    parameter: string
  ): BannedSubstanceList | null {
    const lowerParam = parameter.toLowerCase();

    for (const banned of this.bannedSubstances.values()) {
      const commonNameLower = banned.commonName.toLowerCase();
      const scientificNameLower = banned.scientificName.toLowerCase();

      if (
        lowerParam.includes(commonNameLower) ||
        lowerParam.includes(scientificNameLower) ||
        commonNameLower.includes(lowerParam) ||
        scientificNameLower.includes(lowerParam)
      ) {
        return banned;
      }
    }

    return null;
  }

  /**
   * Create product formulation from verified ingredients
   */
  async createProductFormulation(
    formulation: ProductFormulation
  ): Promise<string> {
    // Verify all ingredients in formulation
    const ingredientVerifications: Array<{
      ingredientId: string;
      status: "verified" | "failed";
      reason?: string;
    }> = [];

    for (const ingredient of formulation.ingredients) {
      const verifiedIngredient = this.ingredients.get(ingredient.ingredientId);
      if (verifiedIngredient) {
        ingredientVerifications.push({
          ingredientId: ingredient.ingredientId,
          status: "verified",
        });
      } else {
        ingredientVerifications.push({
          ingredientId: ingredient.ingredientId,
          status: "failed",
          reason: "Ingredient not found in approved database",
        });
      }
    }

    // All ingredients must be verified
    const failedIngredients = ingredientVerifications.filter(
      (v) => v.status === "failed"
    );
    if (failedIngredients.length > 0) {
      throw new Error(
        `FORMULATION VERIFICATION FAILED: ${failedIngredients.length} ingredients not approved`
      );
    }

    // Update verification status
    for (const ingredient of formulation.ingredients) {
      ingredient.verificationStatus = "verified";
    }

    this.productFormulations.set(formulation.productId, formulation);

    this.auditTrail.push({
      timestamp: new Date(),
      action: "Created product formulation",
      ingredientId: formulation.productId,
      reason: `All ${formulation.ingredients.length} ingredients verified`,
    });

    return formulation.productId;
  }

  /**
   * Approve product formulation for production
   */
  async approveForProduction(
    productId: string,
    approvedBy: string
  ): Promise<void> {
    const formulation = this.productFormulations.get(productId);
    if (!formulation) {
      throw new Error(`Product formulation not found: ${productId}`);
    }

    formulation.formulation.approvedDate = new Date();
    formulation.formulation.approvedBy = approvedBy;

    this.auditTrail.push({
      timestamp: new Date(),
      action: "APPROVED product for production",
      ingredientId: productId,
      reason: `Health officer approval: ${approvedBy}`,
    });
  }

  /**
   * Get ingredient test report
   */
  getIngredientReport(ingredientId: string): {
    ingredientName: string;
    testDate: Date;
    testResults: IngredientTestResult[];
    overallStatus: "pass" | "fail" | "flag_for_review";
    bannedSubstancesDetected: string[];
    certifications: string[];
    recommendation: string;
  } {
    const ingredient = this.ingredients.get(ingredientId);
    if (!ingredient) {
      throw new Error(`Ingredient not found: ${ingredientId}`);
    }

    const bannedDetected: string[] = [];
    for (const testResult of ingredient.testing.results) {
      const banned = this.checkForBannedSubstances(testResult.parameter);
      if (banned) {
        bannedDetected.push(banned.commonName);
      }
    }

    return {
      ingredientName: ingredient.name,
      testDate: ingredient.testing.testedDate,
      testResults: ingredient.testing.results,
      overallStatus: bannedDetected.length > 0 ? "fail" : "pass",
      bannedSubstancesDetected: bannedDetected,
      certifications: ingredient.certifications,
      recommendation:
        bannedDetected.length > 0
          ? "REJECT - Contains banned substances"
          : "APPROVE - All safety standards met",
    };
  }

  /**
   * Generate compliance report for all ingredients
   */
  generateComplianceReport(): {
    totalIngredientsApproved: number;
    totalIngredientsRejected: number;
    approvalPercentage: number;
    bannedSubstancesMonitored: number;
    suppliersVerified: number;
    productsFormulated: number;
    timestamp: Date;
  } {
    return {
      totalIngredientsApproved: this.ingredients.size,
      totalIngredientsRejected: this.rejectedIngredients.size,
      approvalPercentage:
        this.ingredients.size > 0
          ? (this.ingredients.size /
              (this.ingredients.size + this.rejectedIngredients.size)) *
            100
          : 0,
      bannedSubstancesMonitored: this.bannedSubstances.size,
      suppliersVerified: this.supplierVerifications.size,
      productsFormulated: this.productFormulations.size,
      timestamp: new Date(),
    };
  }

  /**
   * Get audit trail for ingredient tracking
   */
  getAuditTrail(limit = 100): Array<{
    timestamp: Date;
    action: string;
    ingredientId?: string;
    reason?: string;
  }> {
    return this.auditTrail.slice(-limit);
  }

  /**
   * Ban supplier if violations found
   */
  async banSupplier(supplierId: string, reason: string): Promise<void> {
    const supplier = this.supplierVerifications.get(supplierId);
    if (!supplier) {
      throw new Error(`Supplier not found: ${supplierId}`);
    }

    supplier.banned = true;
    supplier.banReason = reason;

    // Quarantine all ingredients from this supplier
    for (const ingredient of this.ingredients.values()) {
      if (ingredient.supplier === supplierId) {
        this.rejectedIngredients.set(ingredient.ingredientId, ingredient);
        this.ingredients.delete(ingredient.ingredientId);
      }
    }

    this.auditTrail.push({
      timestamp: new Date(),
      action: "BANNED supplier",
      ingredientId: supplierId,
      reason,
    });
  }
}

export default IngredientVerificationEngine.getInstance();

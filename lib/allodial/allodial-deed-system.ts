/**
 * Allodial Deed & Land Patent System
 * 
 * Manages sovereign property rights including:
 * - Allodial title registration and verification
 * - Land patent conversion from fee simple
 * - Property sovereignty documentation
 * - Integration with NESARA debt forgiveness
 * - QFS property transaction processing
 * 
 * @module lib/allodial/allodial-deed-system
 * @version 1.0.0
 */

// ============================================================================
// TYPES
// ============================================================================

export type PropertyType =
  | "residential"
  | "commercial"
  | "agricultural"
  | "industrial"
  | "mixed-use"
  | "vacant-land"
  | "mineral-rights"
  | "water-rights"
  | "air-rights";

export type TitleStatus =
  | "fee-simple"           // Standard ownership with government liens
  | "fee-simple-absolute"  // Full ownership but still under jurisdiction
  | "land-patent-pending"  // Converting to allodial
  | "land-patent-issued"   // Original land patent obtained
  | "allodial-pending"     // Final allodial conversion in progress
  | "allodial-complete"    // Full allodial title - sovereign ownership
  | "contested"            // Title dispute in process
  | "encumbered";          // Has liens or restrictions

export type EncumbranceType =
  | "mortgage"
  | "property-tax-lien"
  | "irs-lien"
  | "mechanic-lien"
  | "judgment-lien"
  | "hoa-lien"
  | "utility-lien"
  | "easement"
  | "covenant"
  | "none";

export type AllodialDeed = {
  id: string;
  
  // Owner Information
  ownerId: string;
  ownerName: string;
  ownerType: "private-citizen" | "universal-citizen" | "trust" | "family-estate";
  citizenshipStatus: "sovereign" | "state-national" | "us-citizen" | "resident";
  
  // Property Information
  propertyType: PropertyType;
  legalDescription: string;
  streetAddress: string;
  city: string;
  county: string;
  state: string;
  country: string;
  postalCode: string;
  
  // Geographic Data
  coordinates: {
    latitude: number;
    longitude: number;
  };
  acreage: number;
  lotNumber: string | null;
  blockNumber: string | null;
  subdivision: string | null;
  
  // Title Information
  titleStatus: TitleStatus;
  originalPatentNumber: string | null;
  originalPatentDate: Date | null;
  originalPatentGrantee: string | null;
  chainOfTitle: {
    date: Date;
    grantor: string;
    grantee: string;
    instrumentType: string;
    recordingInfo: string;
  }[];
  
  // Allodial Conversion
  allodialConversion: {
    initiatedDate: Date | null;
    landPatentFiledDate: Date | null;
    landPatentRecordedDate: Date | null;
    allodialDeedFiledDate: Date | null;
    allodialDeedRecordedDate: Date | null;
    sovereigntyDeclarationDate: Date | null;
    completionDate: Date | null;
  };
  
  // Encumbrances (to be cleared)
  encumbrances: {
    type: EncumbranceType;
    holder: string;
    amount: number;
    recordingInfo: string;
    clearedDate: Date | null;
    clearedVia: "nesara-forgiveness" | "payment" | "dispute-resolution" | "expiration" | null;
  }[];
  
  // Valuation
  valuation: {
    assessedValue: number;
    marketValue: number;
    allodialValue: number; // True sovereign value
    lastAppraisalDate: Date;
    qfsAssetValue: number;
  };
  
  // Documents
  documents: {
    type: string;
    title: string;
    fileReference: string;
    recordedDate: Date;
    recordingAuthority: string;
  }[];
  
  // QFS Integration
  qfsPropertyId: string;
  qfsAssetToken: string;
  
  // Metadata
  registeredDate: Date;
  lastUpdated: Date;
  notes: string[];
};

export type LandPatent = {
  id: string;
  deedId: string;
  
  // Patent Information
  patentNumber: string;
  patentType: "original" | "derivative" | "reissued";
  issuingAuthority: string;
  issueDate: Date;
  
  // Original Grant
  originalGrantee: string;
  landOffice: string;
  surveyNumber: string;
  section: string;
  township: string;
  range: string;
  meridian: string;
  
  // Legal Reference
  documentBook: string;
  documentPage: string;
  nationalArchivesRef: string | null;
  bureauOfLandManagementRef: string | null;
  
  // Status
  status: "active" | "superseded" | "cancelled";
  verifiedDate: Date | null;
  verifiedBy: string | null;
  
  // Chain to Current Owner
  conveyanceChain: {
    date: Date;
    from: string;
    to: string;
    instrument: string;
  }[];
};

export type SovereigntyDeclaration = {
  id: string;
  deedId: string;
  citizenId: string;
  
  // Declaration Details
  declarationType: "affidavit" | "notice" | "claim" | "allodial-deed";
  declarationDate: Date;
  effectiveDate: Date;
  
  // Content
  declarationText: string;
  
  // Recording
  recordedCounty: string;
  recordedState: string;
  bookNumber: string;
  pageNumber: string;
  instrumentNumber: string;
  
  // Witnesses
  witnesses: {
    name: string;
    address: string;
    signatureDate: Date;
  }[];
  
  // Notarization
  notary: {
    name: string;
    commission: string;
    expirationDate: Date;
    sealNumber: string;
  };
  
  // Status
  status: "recorded" | "acknowledged" | "contested" | "upheld";
};

export type PropertyPortfolio = {
  id: string;
  ownerId: string;
  ownerName: string;
  
  // Citizen Status
  citizenType: "private-citizen" | "universal-citizen";
  sovereigntyStatus: "declared" | "pending" | "not-declared";
  nesaraRegistered: boolean;
  qfsLinked: boolean;
  
  // Properties
  totalProperties: number;
  allodialProperties: number;
  pendingConversions: number;
  feeSimpleProperties: number;
  
  // Valuation
  totalAssessedValue: number;
  totalMarketValue: number;
  totalAllodialValue: number;
  totalQfsAssetValue: number;
  
  // Encumbrances
  totalEncumbrances: number;
  clearedEncumbrances: number;
  pendingClearance: number;
  
  // Properties List
  properties: string[]; // Deed IDs
  
  // Metadata
  createdDate: Date;
  lastUpdated: Date;
};

// ============================================================================
// ALLODIAL DEED SYSTEM
// ============================================================================

export class AllodialDeedSystem {
  private static instance: AllodialDeedSystem;
  
  private deeds: Map<string, AllodialDeed> = new Map();
  private patents: Map<string, LandPatent> = new Map();
  private declarations: Map<string, SovereigntyDeclaration> = new Map();
  private portfolios: Map<string, PropertyPortfolio> = new Map();
  
  // Standard allodial value multiplier (sovereign property worth more than encumbered)
  private readonly ALLODIAL_VALUE_MULTIPLIER = 3.14159; // Pi multiplier
  
  private constructor() {}
  
  static getInstance(): AllodialDeedSystem {
    if (!AllodialDeedSystem.instance) {
      AllodialDeedSystem.instance = new AllodialDeedSystem();
    }
    return AllodialDeedSystem.instance;
  }
  
  private generateId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
  }
  
  private generateQfsPropertyId(): string {
    return `QFS-PROP-${Math.random().toString(36).substring(2, 11).toUpperCase()}`;
  }
  
  private generateQfsAssetToken(): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let token = "ALLOD-";
    for (let i = 0; i < 16; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  }
  
  // ==========================================================================
  // DEED MANAGEMENT
  // ==========================================================================
  
  registerProperty(
    ownerId: string,
    ownerName: string,
    ownerType: AllodialDeed["ownerType"],
    propertyDetails: {
      propertyType: PropertyType;
      streetAddress: string;
      city: string;
      county: string;
      state: string;
      country?: string;
      postalCode: string;
      legalDescription: string;
      coordinates: { latitude: number; longitude: number };
      acreage: number;
      lotNumber?: string;
      blockNumber?: string;
      subdivision?: string;
      assessedValue: number;
      marketValue: number;
    }
  ): AllodialDeed {
    const id = this.generateId("DEED");
    
    const allodialValue = propertyDetails.marketValue * this.ALLODIAL_VALUE_MULTIPLIER;
    
    const deed: AllodialDeed = {
      id,
      ownerId,
      ownerName,
      ownerType,
      citizenshipStatus: ownerType === "private-citizen" ? "sovereign" : "state-national",
      propertyType: propertyDetails.propertyType,
      legalDescription: propertyDetails.legalDescription,
      streetAddress: propertyDetails.streetAddress,
      city: propertyDetails.city,
      county: propertyDetails.county,
      state: propertyDetails.state,
      country: propertyDetails.country || "USA",
      postalCode: propertyDetails.postalCode,
      coordinates: propertyDetails.coordinates,
      acreage: propertyDetails.acreage,
      lotNumber: propertyDetails.lotNumber || null,
      blockNumber: propertyDetails.blockNumber || null,
      subdivision: propertyDetails.subdivision || null,
      titleStatus: "fee-simple",
      originalPatentNumber: null,
      originalPatentDate: null,
      originalPatentGrantee: null,
      chainOfTitle: [],
      allodialConversion: {
        initiatedDate: null,
        landPatentFiledDate: null,
        landPatentRecordedDate: null,
        allodialDeedFiledDate: null,
        allodialDeedRecordedDate: null,
        sovereigntyDeclarationDate: null,
        completionDate: null,
      },
      encumbrances: [],
      valuation: {
        assessedValue: propertyDetails.assessedValue,
        marketValue: propertyDetails.marketValue,
        allodialValue,
        lastAppraisalDate: new Date(),
        qfsAssetValue: allodialValue * 314.159, // Pi external value multiplier
      },
      documents: [],
      qfsPropertyId: this.generateQfsPropertyId(),
      qfsAssetToken: this.generateQfsAssetToken(),
      registeredDate: new Date(),
      lastUpdated: new Date(),
      notes: [],
    };
    
    this.deeds.set(id, deed);
    this.updatePortfolio(ownerId, ownerName, ownerType);
    
    return deed;
  }
  
  getDeed(deedId: string): AllodialDeed | undefined {
    return this.deeds.get(deedId);
  }
  
  getDeedsByOwner(ownerId: string): AllodialDeed[] {
    return Array.from(this.deeds.values()).filter(d => d.ownerId === ownerId);
  }
  
  // ==========================================================================
  // ENCUMBRANCE MANAGEMENT
  // ==========================================================================
  
  addEncumbrance(
    deedId: string,
    encumbrance: {
      type: EncumbranceType;
      holder: string;
      amount: number;
      recordingInfo: string;
    }
  ): AllodialDeed {
    const deed = this.deeds.get(deedId);
    if (!deed) {
      throw new Error(`Deed ${deedId} not found`);
    }
    
    deed.encumbrances.push({
      ...encumbrance,
      clearedDate: null,
      clearedVia: null,
    });
    
    deed.titleStatus = "encumbered";
    deed.lastUpdated = new Date();
    
    return deed;
  }
  
  clearEncumbrance(
    deedId: string,
    encumbranceIndex: number,
    clearanceMethod: "nesara-forgiveness" | "payment" | "dispute-resolution" | "expiration"
  ): AllodialDeed {
    const deed = this.deeds.get(deedId);
    if (!deed) {
      throw new Error(`Deed ${deedId} not found`);
    }
    
    if (encumbranceIndex < 0 || encumbranceIndex >= deed.encumbrances.length) {
      throw new Error(`Invalid encumbrance index`);
    }
    
    deed.encumbrances[encumbranceIndex].clearedDate = new Date();
    deed.encumbrances[encumbranceIndex].clearedVia = clearanceMethod;
    
    // Check if all encumbrances cleared
    const hasActiveEncumbrances = deed.encumbrances.some(e => e.clearedDate === null);
    if (!hasActiveEncumbrances) {
      deed.titleStatus = deed.allodialConversion.completionDate ? "allodial-complete" : "fee-simple-absolute";
    }
    
    deed.lastUpdated = new Date();
    
    return deed;
  }
  
  clearAllEncumbrancesViaNESARA(deedId: string): AllodialDeed {
    const deed = this.deeds.get(deedId);
    if (!deed) {
      throw new Error(`Deed ${deedId} not found`);
    }
    
    for (const encumbrance of deed.encumbrances) {
      if (encumbrance.clearedDate === null) {
        encumbrance.clearedDate = new Date();
        encumbrance.clearedVia = "nesara-forgiveness";
      }
    }
    
    deed.titleStatus = "fee-simple-absolute";
    deed.lastUpdated = new Date();
    deed.notes.push(`All encumbrances cleared via NESARA debt forgiveness on ${new Date().toISOString()}`);
    
    return deed;
  }
  
  // ==========================================================================
  // LAND PATENT PROCESSING
  // ==========================================================================
  
  initiateLandPatentConversion(deedId: string): AllodialDeed {
    const deed = this.deeds.get(deedId);
    if (!deed) {
      throw new Error(`Deed ${deedId} not found`);
    }
    
    deed.allodialConversion.initiatedDate = new Date();
    deed.titleStatus = "land-patent-pending";
    deed.lastUpdated = new Date();
    deed.notes.push(`Land patent conversion initiated on ${new Date().toISOString()}`);
    
    return deed;
  }
  
  attachLandPatent(
    deedId: string,
    patentDetails: {
      patentNumber: string;
      issuingAuthority: string;
      issueDate: Date;
      originalGrantee: string;
      landOffice: string;
      surveyNumber: string;
      section: string;
      township: string;
      range: string;
      meridian: string;
      documentBook: string;
      documentPage: string;
      nationalArchivesRef?: string;
      bureauOfLandManagementRef?: string;
    }
  ): { deed: AllodialDeed; patent: LandPatent } {
    const deed = this.deeds.get(deedId);
    if (!deed) {
      throw new Error(`Deed ${deedId} not found`);
    }
    
    const patentId = this.generateId("PATENT");
    
    const patent: LandPatent = {
      id: patentId,
      deedId,
      patentNumber: patentDetails.patentNumber,
      patentType: "original",
      issuingAuthority: patentDetails.issuingAuthority,
      issueDate: patentDetails.issueDate,
      originalGrantee: patentDetails.originalGrantee,
      landOffice: patentDetails.landOffice,
      surveyNumber: patentDetails.surveyNumber,
      section: patentDetails.section,
      township: patentDetails.township,
      range: patentDetails.range,
      meridian: patentDetails.meridian,
      documentBook: patentDetails.documentBook,
      documentPage: patentDetails.documentPage,
      nationalArchivesRef: patentDetails.nationalArchivesRef || null,
      bureauOfLandManagementRef: patentDetails.bureauOfLandManagementRef || null,
      status: "active",
      verifiedDate: new Date(),
      verifiedBy: "Allodial Deed System",
      conveyanceChain: [],
    };
    
    this.patents.set(patentId, patent);
    
    // Update deed
    deed.originalPatentNumber = patentDetails.patentNumber;
    deed.originalPatentDate = patentDetails.issueDate;
    deed.originalPatentGrantee = patentDetails.originalGrantee;
    deed.allodialConversion.landPatentFiledDate = new Date();
    deed.allodialConversion.landPatentRecordedDate = new Date();
    deed.titleStatus = "land-patent-issued";
    deed.lastUpdated = new Date();
    deed.notes.push(`Land patent ${patentDetails.patentNumber} attached on ${new Date().toISOString()}`);
    
    return { deed, patent };
  }
  
  getLandPatent(patentId: string): LandPatent | undefined {
    return this.patents.get(patentId);
  }
  
  getLandPatentByDeed(deedId: string): LandPatent | undefined {
    return Array.from(this.patents.values()).find(p => p.deedId === deedId);
  }
  
  // ==========================================================================
  // SOVEREIGNTY DECLARATION
  // ==========================================================================
  
  createSovereigntyDeclaration(
    deedId: string,
    citizenId: string,
    details: {
      declarationType: SovereigntyDeclaration["declarationType"];
      declarationText: string;
      recordedCounty: string;
      recordedState: string;
      bookNumber: string;
      pageNumber: string;
      instrumentNumber: string;
      witnesses: { name: string; address: string }[];
      notary: {
        name: string;
        commission: string;
        expirationDate: Date;
        sealNumber: string;
      };
    }
  ): SovereigntyDeclaration {
    const deed = this.deeds.get(deedId);
    if (!deed) {
      throw new Error(`Deed ${deedId} not found`);
    }
    
    const id = this.generateId("SOVDEC");
    const now = new Date();
    
    const declaration: SovereigntyDeclaration = {
      id,
      deedId,
      citizenId,
      declarationType: details.declarationType,
      declarationDate: now,
      effectiveDate: now,
      declarationText: details.declarationText,
      recordedCounty: details.recordedCounty,
      recordedState: details.recordedState,
      bookNumber: details.bookNumber,
      pageNumber: details.pageNumber,
      instrumentNumber: details.instrumentNumber,
      witnesses: details.witnesses.map(w => ({
        ...w,
        signatureDate: now,
      })),
      notary: details.notary,
      status: "recorded",
    };
    
    this.declarations.set(id, declaration);
    
    // Update deed
    deed.allodialConversion.sovereigntyDeclarationDate = now;
    deed.citizenshipStatus = "sovereign";
    deed.lastUpdated = now;
    deed.notes.push(`Sovereignty declaration recorded as instrument ${details.instrumentNumber}`);
    
    return declaration;
  }
  
  getSovereigntyDeclaration(declarationId: string): SovereigntyDeclaration | undefined {
    return this.declarations.get(declarationId);
  }
  
  getDeclarationsByDeed(deedId: string): SovereigntyDeclaration[] {
    return Array.from(this.declarations.values()).filter(d => d.deedId === deedId);
  }
  
  // ==========================================================================
  // ALLODIAL CONVERSION COMPLETION
  // ==========================================================================
  
  completeAllodialConversion(deedId: string): AllodialDeed {
    const deed = this.deeds.get(deedId);
    if (!deed) {
      throw new Error(`Deed ${deedId} not found`);
    }
    
    // Verify prerequisites
    if (!deed.allodialConversion.landPatentRecordedDate) {
      throw new Error("Land patent must be recorded before allodial conversion");
    }
    
    if (!deed.allodialConversion.sovereigntyDeclarationDate) {
      throw new Error("Sovereignty declaration must be recorded before allodial conversion");
    }
    
    const hasActiveEncumbrances = deed.encumbrances.some(e => e.clearedDate === null);
    if (hasActiveEncumbrances) {
      throw new Error("All encumbrances must be cleared before allodial conversion");
    }
    
    const now = new Date();
    
    deed.allodialConversion.allodialDeedFiledDate = now;
    deed.allodialConversion.allodialDeedRecordedDate = now;
    deed.allodialConversion.completionDate = now;
    deed.titleStatus = "allodial-complete";
    deed.lastUpdated = now;
    
    // Recalculate values with full sovereignty
    deed.valuation.allodialValue = deed.valuation.marketValue * this.ALLODIAL_VALUE_MULTIPLIER * 2; // Double for full sovereignty
    deed.valuation.qfsAssetValue = deed.valuation.allodialValue * 314.159;
    
    deed.notes.push(`ALLODIAL TITLE COMPLETE - Full sovereign ownership established on ${now.toISOString()}`);
    
    // Add completion document
    deed.documents.push({
      type: "allodial-deed",
      title: "Certificate of Allodial Title",
      fileReference: `ALLOD-CERT-${deed.id}`,
      recordedDate: now,
      recordingAuthority: `${deed.county} County, ${deed.state}`,
    });
    
    return deed;
  }
  
  // ==========================================================================
  // PORTFOLIO MANAGEMENT
  // ==========================================================================
  
  private updatePortfolio(
    ownerId: string,
    ownerName: string,
    ownerType: AllodialDeed["ownerType"]
  ): void {
    let portfolio = this.portfolios.get(ownerId);
    
    if (!portfolio) {
      portfolio = {
        id: this.generateId("PORTFOLIO"),
        ownerId,
        ownerName,
        citizenType: ownerType === "private-citizen" ? "private-citizen" : "universal-citizen",
        sovereigntyStatus: "pending",
        nesaraRegistered: false,
        qfsLinked: false,
        totalProperties: 0,
        allodialProperties: 0,
        pendingConversions: 0,
        feeSimpleProperties: 0,
        totalAssessedValue: 0,
        totalMarketValue: 0,
        totalAllodialValue: 0,
        totalQfsAssetValue: 0,
        totalEncumbrances: 0,
        clearedEncumbrances: 0,
        pendingClearance: 0,
        properties: [],
        createdDate: new Date(),
        lastUpdated: new Date(),
      };
      this.portfolios.set(ownerId, portfolio);
    }
    
    // Recalculate portfolio statistics
    const ownerDeeds = this.getDeedsByOwner(ownerId);
    
    portfolio.totalProperties = ownerDeeds.length;
    portfolio.properties = ownerDeeds.map(d => d.id);
    portfolio.allodialProperties = ownerDeeds.filter(d => d.titleStatus === "allodial-complete").length;
    portfolio.pendingConversions = ownerDeeds.filter(d => 
      d.titleStatus === "land-patent-pending" || d.titleStatus === "allodial-pending"
    ).length;
    portfolio.feeSimpleProperties = ownerDeeds.filter(d => 
      d.titleStatus === "fee-simple" || d.titleStatus === "fee-simple-absolute"
    ).length;
    
    portfolio.totalAssessedValue = ownerDeeds.reduce((sum, d) => sum + d.valuation.assessedValue, 0);
    portfolio.totalMarketValue = ownerDeeds.reduce((sum, d) => sum + d.valuation.marketValue, 0);
    portfolio.totalAllodialValue = ownerDeeds.reduce((sum, d) => sum + d.valuation.allodialValue, 0);
    portfolio.totalQfsAssetValue = ownerDeeds.reduce((sum, d) => sum + d.valuation.qfsAssetValue, 0);
    
    let totalEnc = 0;
    let clearedEnc = 0;
    for (const deed of ownerDeeds) {
      totalEnc += deed.encumbrances.length;
      clearedEnc += deed.encumbrances.filter(e => e.clearedDate !== null).length;
    }
    portfolio.totalEncumbrances = totalEnc;
    portfolio.clearedEncumbrances = clearedEnc;
    portfolio.pendingClearance = totalEnc - clearedEnc;
    
    // Check sovereignty status
    portfolio.sovereigntyStatus = ownerDeeds.some(d => d.citizenshipStatus === "sovereign") ? "declared" : "pending";
    
    portfolio.lastUpdated = new Date();
  }
  
  getPortfolio(ownerId: string): PropertyPortfolio | undefined {
    // Refresh portfolio before returning
    const portfolio = this.portfolios.get(ownerId);
    if (portfolio) {
      this.updatePortfolio(ownerId, portfolio.ownerName, 
        portfolio.citizenType === "private-citizen" ? "private-citizen" : "universal-citizen");
    }
    return this.portfolios.get(ownerId);
  }
  
  linkPortfolioToNESARA(ownerId: string): PropertyPortfolio {
    const portfolio = this.portfolios.get(ownerId);
    if (!portfolio) {
      throw new Error(`Portfolio for ${ownerId} not found`);
    }
    
    portfolio.nesaraRegistered = true;
    portfolio.lastUpdated = new Date();
    
    return portfolio;
  }
  
  linkPortfolioToQFS(ownerId: string): PropertyPortfolio {
    const portfolio = this.portfolios.get(ownerId);
    if (!portfolio) {
      throw new Error(`Portfolio for ${ownerId} not found`);
    }
    
    portfolio.qfsLinked = true;
    portfolio.lastUpdated = new Date();
    
    return portfolio;
  }
  
  // ==========================================================================
  // UNIFIED CITIZEN APPLICATION
  // ==========================================================================
  
  applyForUniversalCitizenStatus(
    ownerId: string,
    ownerName: string,
    application: {
      birthCertificateProvided: boolean;
      sovereigntyAffidavitSigned: boolean;
      nesaraRegistered: boolean;
      qfsAccountCreated: boolean;
      allPropertiesListed: boolean;
    }
  ): {
    approved: boolean;
    status: string;
    portfolio: PropertyPortfolio;
    requirements: { requirement: string; met: boolean }[];
  } {
    const requirements = [
      { requirement: "Birth certificate documentation provided", met: application.birthCertificateProvided },
      { requirement: "Sovereignty affidavit signed and notarized", met: application.sovereigntyAffidavitSigned },
      { requirement: "Registered with NESARA benefits system", met: application.nesaraRegistered },
      { requirement: "QFS account created and verified", met: application.qfsAccountCreated },
      { requirement: "All properties listed in portfolio", met: application.allPropertiesListed },
    ];
    
    const allMet = requirements.every(r => r.met);
    
    let portfolio = this.portfolios.get(ownerId);
    if (!portfolio) {
      portfolio = {
        id: this.generateId("PORTFOLIO"),
        ownerId,
        ownerName,
        citizenType: "universal-citizen",
        sovereigntyStatus: "pending",
        nesaraRegistered: application.nesaraRegistered,
        qfsLinked: application.qfsAccountCreated,
        totalProperties: 0,
        allodialProperties: 0,
        pendingConversions: 0,
        feeSimpleProperties: 0,
        totalAssessedValue: 0,
        totalMarketValue: 0,
        totalAllodialValue: 0,
        totalQfsAssetValue: 0,
        totalEncumbrances: 0,
        clearedEncumbrances: 0,
        pendingClearance: 0,
        properties: [],
        createdDate: new Date(),
        lastUpdated: new Date(),
      };
      this.portfolios.set(ownerId, portfolio);
    }
    
    if (allMet) {
      portfolio.citizenType = "universal-citizen";
      portfolio.sovereigntyStatus = "declared";
      portfolio.nesaraRegistered = true;
      portfolio.qfsLinked = true;
    }
    
    portfolio.lastUpdated = new Date();
    
    return {
      approved: allMet,
      status: allMet ? "Universal Citizen status approved" : "Additional requirements needed",
      portfolio,
      requirements,
    };
  }
  
  // ==========================================================================
  // STATISTICS
  // ==========================================================================
  
  getSystemStatistics(): {
    totalDeeds: number;
    totalPatents: number;
    totalDeclarations: number;
    totalPortfolios: number;
    deedsByStatus: Record<TitleStatus, number>;
    totalAssessedValue: number;
    totalAllodialValue: number;
    totalQfsAssetValue: number;
  } {
    const deeds = Array.from(this.deeds.values());
    
    const deedsByStatus: Record<TitleStatus, number> = {
      "fee-simple": 0,
      "fee-simple-absolute": 0,
      "land-patent-pending": 0,
      "land-patent-issued": 0,
      "allodial-pending": 0,
      "allodial-complete": 0,
      "contested": 0,
      "encumbered": 0,
    };
    
    for (const deed of deeds) {
      deedsByStatus[deed.titleStatus]++;
    }
    
    return {
      totalDeeds: deeds.length,
      totalPatents: this.patents.size,
      totalDeclarations: this.declarations.size,
      totalPortfolios: this.portfolios.size,
      deedsByStatus,
      totalAssessedValue: deeds.reduce((sum, d) => sum + d.valuation.assessedValue, 0),
      totalAllodialValue: deeds.reduce((sum, d) => sum + d.valuation.allodialValue, 0),
      totalQfsAssetValue: deeds.reduce((sum, d) => sum + d.valuation.qfsAssetValue, 0),
    };
  }
}

// Singleton export
export const allodialSystem = AllodialDeedSystem.getInstance();

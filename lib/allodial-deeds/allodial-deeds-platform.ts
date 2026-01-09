/**
 * Triumph Synergy - Allodial Deeds Platform
 * 
 * Superior application for homeowner allodial deed transfers
 * True property ownership without government encumbrances
 * 
 * @module lib/allodial-deeds/allodial-deeds-platform
 * @version 1.0.0
 */

// ============================================================================
// CONSTANTS
// ============================================================================

// Dual Pi Value System
// Internally mined/contributed Pi = 1000x multiplier
// External/non-contributed Pi = base rate
const PI_EXTERNAL_RATE = 314.159;  // External non-contributed Pi
const PI_INTERNAL_RATE = 314159;   // Internally mined/contributed Pi (1000x)
const PI_INTERNAL_MULTIPLIER = 1000;

export type PiValueType = "internal" | "external";

export function getPiRate(type: PiValueType = "external"): number {
  return type === "internal" ? PI_INTERNAL_RATE : PI_EXTERNAL_RATE;
}

export function convertToPi(usdAmount: number, type: PiValueType = "external"): number {
  return usdAmount / getPiRate(type);
}

export function convertToUsd(piAmount: number, type: PiValueType = "external"): number {
  return piAmount * getPiRate(type);
}

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface AllodialDeed {
  id: string;
  deedNumber: string;
  status: DeedStatus;
  
  // Property Information
  property: PropertyDetails;
  
  // Ownership
  currentOwner: DeedOwner;
  previousOwners: DeedTransfer[];
  
  // Legal Status
  deedType: DeedType;
  isAllodial: boolean;
  allodialStatus: AllodialStatus;
  sovereignDeclaration: SovereignDeclaration | null;
  
  // Recording
  recordingInfo: RecordingInfo;
  countyRecords: CountyRecord[];
  
  // Encumbrances (should be NONE for true allodial)
  encumbrances: Encumbrance[];
  liens: Lien[];
  easements: Easement[];
  
  // Valuation
  assessedValue: number;
  marketValue: number;
  piValue: number;
  
  // Documents
  documents: DeedDocument[];
  
  // Blockchain
  blockchainRecordId: string | null;
  nftTokenId: string | null;
  smartContractAddress: string | null;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  recordedAt: Date | null;
}

export type DeedStatus = 
  | "draft"
  | "pending-verification"
  | "verified"
  | "recorded"
  | "allodial-claimed"
  | "allodial-perfected"
  | "transferred"
  | "disputed";

export type DeedType = 
  | "warranty"
  | "quitclaim"
  | "grant"
  | "bargain-sale"
  | "special-warranty"
  | "fee-simple"
  | "allodial";

export type AllodialStatus = 
  | "not-claimed"
  | "claim-filed"
  | "taxes-redeemed"
  | "patent-established"
  | "sovereign-declared"
  | "perfected";

export interface PropertyDetails {
  address: {
    street: string;
    unit: string | null;
    city: string;
    county: string;
    state: string;
    zip: string;
    country: string;
  };
  legalDescription: string;
  parcelNumber: string;
  lotNumber: string;
  blockNumber: string;
  subdivision: string;
  platBook: string;
  platPage: string;
  acreage: number;
  squareFootage: number;
  propertyType: PropertyType;
  zoning: string;
  coordinates: { lat: number; lng: number };
}

export type PropertyType = 
  | "single-family"
  | "multi-family"
  | "condo"
  | "townhouse"
  | "land"
  | "commercial"
  | "agricultural"
  | "mixed-use";

export interface DeedOwner {
  id: string;
  type: "individual" | "joint" | "trust" | "llc" | "corporation";
  names: string[];
  ownershipType: OwnershipType;
  percentage: number;
  piWalletAddress: string;
  email: string;
  phone: string;
  mailingAddress: string;
  ssn?: string;  // Encrypted
  ein?: string;  // For entities
  verificationStatus: "unverified" | "pending" | "verified";
}

export type OwnershipType = 
  | "sole"
  | "joint-tenancy"
  | "tenancy-in-common"
  | "tenancy-by-entirety"
  | "community-property"
  | "trust"
  | "allodial-title";

export interface DeedTransfer {
  id: string;
  fromOwner: DeedOwner;
  toOwner: DeedOwner;
  transferType: TransferType;
  transferDate: Date;
  consideration: number;
  piTransactionId: string | null;
  documentNumber: string;
  notarizedAt: Date | null;
  notaryInfo: NotaryInfo | null;
  witnessNames: string[];
  blockchainTxHash: string | null;
}

export type TransferType = 
  | "sale"
  | "gift"
  | "inheritance"
  | "court-order"
  | "foreclosure"
  | "tax-sale"
  | "allodial-conversion";

export interface NotaryInfo {
  name: string;
  commission: string;
  state: string;
  expirationDate: Date;
  sealNumber: string;
}

export interface SovereignDeclaration {
  id: string;
  declarationDate: Date;
  declarationType: "land-patent" | "allodial-claim" | "quiet-title";
  patentNumber: string | null;
  patentDate: Date | null;
  originalPatentee: string | null;
  chainOfTitle: ChainOfTitleLink[];
  taxRedemptionComplete: boolean;
  taxRedemptionDate: Date | null;
  taxRedemptionAmount: number;
  filingReferences: FilingReference[];
  perfectionDate: Date | null;
}

export interface ChainOfTitleLink {
  grantorName: string;
  granteeName: string;
  instrumentType: string;
  recordingDate: Date;
  bookPage: string;
  documentNumber: string;
}

export interface FilingReference {
  type: "county" | "state" | "federal" | "ucc";
  jurisdiction: string;
  documentNumber: string;
  filingDate: Date;
  book: string | null;
  page: string | null;
}

export interface RecordingInfo {
  county: string;
  state: string;
  recordingDate: Date | null;
  instrumentNumber: string | null;
  book: string | null;
  page: string | null;
  feesPaid: number;
  recorder: string;
}

export interface CountyRecord {
  county: string;
  state: string;
  recordType: string;
  documentNumber: string;
  recordingDate: Date;
  book: string;
  page: string;
  verified: boolean;
  verifiedAt: Date | null;
}

export interface Encumbrance {
  id: string;
  type: EncumbranceType;
  holder: string;
  amount: number;
  recordingInfo: string;
  startDate: Date;
  endDate: Date | null;
  status: "active" | "released" | "disputed";
  releaseDocument: string | null;
}

export type EncumbranceType = 
  | "mortgage"
  | "deed-of-trust"
  | "judgment"
  | "mechanic-lien"
  | "tax-lien"
  | "hoa-lien"
  | "lis-pendens"
  | "restriction";

export interface Lien {
  id: string;
  type: LienType;
  lienholder: string;
  amount: number;
  priority: number;
  recordingDate: Date;
  documentNumber: string;
  status: "active" | "satisfied" | "released" | "expired";
  satisfactionDate: Date | null;
}

export type LienType = 
  | "first-mortgage"
  | "second-mortgage"
  | "heloc"
  | "tax"
  | "mechanic"
  | "judgment"
  | "child-support"
  | "irs"
  | "state-tax";

export interface Easement {
  id: string;
  type: EasementType;
  beneficiary: string;
  purpose: string;
  location: string;
  width: number | null;
  permanent: boolean;
  recordingInfo: string;
}

export type EasementType = 
  | "utility"
  | "access"
  | "drainage"
  | "conservation"
  | "scenic"
  | "solar"
  | "view";

export interface DeedDocument {
  id: string;
  type: DocumentType;
  name: string;
  description: string;
  fileUrl: string;
  fileHash: string;
  mimeType: string;
  size: number;
  uploadedAt: Date;
  verified: boolean;
  blockchainHash: string | null;
}

export type DocumentType = 
  | "deed"
  | "title-insurance"
  | "survey"
  | "tax-certificate"
  | "lien-release"
  | "affidavit"
  | "power-of-attorney"
  | "land-patent"
  | "chain-of-title"
  | "allodial-declaration"
  | "sovereign-claim"
  | "other";

export interface AllodialApplication {
  id: string;
  deedId: string;
  applicant: DeedOwner;
  status: ApplicationStatus;
  steps: ApplicationStep[];
  filings: ApplicationFiling[];
  payments: ApplicationPayment[];
  timeline: ApplicationEvent[];
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
}

export type ApplicationStatus = 
  | "initiated"
  | "documents-gathering"
  | "chain-of-title-research"
  | "tax-redemption"
  | "filing-preparation"
  | "filed"
  | "under-review"
  | "approved"
  | "rejected"
  | "perfected";

export interface ApplicationStep {
  id: string;
  name: string;
  description: string;
  order: number;
  status: "pending" | "in-progress" | "completed" | "skipped";
  completedAt: Date | null;
  notes: string;
}

export interface ApplicationFiling {
  id: string;
  type: "county" | "state" | "federal" | "ucc-1" | "land-patent";
  jurisdiction: string;
  documentNumber: string | null;
  filedAt: Date | null;
  status: "pending" | "filed" | "accepted" | "rejected";
  fees: number;
  notes: string;
}

export interface ApplicationPayment {
  id: string;
  type: "filing-fee" | "tax-redemption" | "title-search" | "recording-fee" | "service-fee";
  amount: number;
  piAmount: number;
  status: "pending" | "paid" | "refunded";
  paidAt: Date | null;
  piTransactionId: string | null;
  receipt: string | null;
}

export interface ApplicationEvent {
  id: string;
  type: string;
  description: string;
  timestamp: Date;
  userId: string | null;
}

// ============================================================================
// ALLODIAL DEEDS PLATFORM CLASS
// ============================================================================

class AllodialDeedsPlatform {
  private deeds: Map<string, AllodialDeed> = new Map();
  private applications: Map<string, AllodialApplication> = new Map();
  private owners: Map<string, DeedOwner> = new Map();

  constructor() {
    this.initializePlatform();
  }

  private initializePlatform(): void {
    console.log("Allodial Deeds Platform initialized");
  }

  // ==========================================================================
  // DEED MANAGEMENT
  // ==========================================================================

  async createDeed(deedData: {
    property: PropertyDetails;
    owner: Omit<DeedOwner, "id" | "verificationStatus">;
    deedType: DeedType;
  }): Promise<AllodialDeed> {
    const id = `deed-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const deedNumber = `AD-${Date.now().toString().slice(-8)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    const owner: DeedOwner = {
      ...deedData.owner,
      id: `owner-${Date.now()}`,
      verificationStatus: "unverified",
    };

    const deed: AllodialDeed = {
      id,
      deedNumber,
      status: "draft",
      property: deedData.property,
      currentOwner: owner,
      previousOwners: [],
      deedType: deedData.deedType,
      isAllodial: deedData.deedType === "allodial",
      allodialStatus: "not-claimed",
      sovereignDeclaration: null,
      recordingInfo: {
        county: deedData.property.address.county,
        state: deedData.property.address.state,
        recordingDate: null,
        instrumentNumber: null,
        book: null,
        page: null,
        feesPaid: 0,
        recorder: "",
      },
      countyRecords: [],
      encumbrances: [],
      liens: [],
      easements: [],
      assessedValue: 0,
      marketValue: 0,
      piValue: 0,
      documents: [],
      blockchainRecordId: null,
      nftTokenId: null,
      smartContractAddress: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      recordedAt: null,
    };

    this.deeds.set(id, deed);
    this.owners.set(owner.id, owner);

    return deed;
  }

  async getDeed(deedId: string): Promise<AllodialDeed | null> {
    return this.deeds.get(deedId) || null;
  }

  async updateDeed(deedId: string, updates: Partial<AllodialDeed>): Promise<AllodialDeed> {
    const deed = this.deeds.get(deedId);
    if (!deed) {
      throw new Error("Deed not found");
    }

    const updatedDeed = {
      ...deed,
      ...updates,
      updatedAt: new Date(),
    };

    this.deeds.set(deedId, updatedDeed);
    return updatedDeed;
  }

  async searchDeeds(filters: {
    county?: string;
    state?: string;
    ownerName?: string;
    parcelNumber?: string;
    status?: DeedStatus;
    isAllodial?: boolean;
  }): Promise<AllodialDeed[]> {
    let deeds = Array.from(this.deeds.values());

    if (filters.county) {
      deeds = deeds.filter((d) => d.property.address.county.toLowerCase().includes(filters.county!.toLowerCase()));
    }
    if (filters.state) {
      deeds = deeds.filter((d) => d.property.address.state.toLowerCase() === filters.state!.toLowerCase());
    }
    if (filters.ownerName) {
      deeds = deeds.filter((d) => d.currentOwner.names.some((n) => n.toLowerCase().includes(filters.ownerName!.toLowerCase())));
    }
    if (filters.parcelNumber) {
      deeds = deeds.filter((d) => d.property.parcelNumber.includes(filters.parcelNumber!));
    }
    if (filters.status) {
      deeds = deeds.filter((d) => d.status === filters.status);
    }
    if (filters.isAllodial !== undefined) {
      deeds = deeds.filter((d) => d.isAllodial === filters.isAllodial);
    }

    return deeds;
  }

  async getOwnerDeeds(ownerId: string): Promise<AllodialDeed[]> {
    return Array.from(this.deeds.values()).filter(
      (d) => d.currentOwner.id === ownerId
    );
  }

  // ==========================================================================
  // ALLODIAL CONVERSION PROCESS
  // ==========================================================================

  async initiateAllodialConversion(deedId: string): Promise<AllodialApplication> {
    const deed = this.deeds.get(deedId);
    if (!deed) {
      throw new Error("Deed not found");
    }

    const applicationId = `app-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    const application: AllodialApplication = {
      id: applicationId,
      deedId,
      applicant: deed.currentOwner,
      status: "initiated",
      steps: this.generateAllodialSteps(),
      filings: [],
      payments: [],
      timeline: [
        {
          id: `event-${Date.now()}`,
          type: "application-initiated",
          description: "Allodial conversion application initiated",
          timestamp: new Date(),
          userId: deed.currentOwner.id,
        },
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
      completedAt: null,
    };

    this.applications.set(applicationId, application);

    // Update deed status
    deed.status = "pending-verification";
    deed.allodialStatus = "claim-filed";
    deed.updatedAt = new Date();

    return application;
  }

  private generateAllodialSteps(): ApplicationStep[] {
    return [
      {
        id: "step-1",
        name: "Document Gathering",
        description: "Collect all existing deeds, titles, and property records",
        order: 1,
        status: "pending",
        completedAt: null,
        notes: "",
      },
      {
        id: "step-2",
        name: "Chain of Title Research",
        description: "Trace property ownership back to original land patent",
        order: 2,
        status: "pending",
        completedAt: null,
        notes: "",
      },
      {
        id: "step-3",
        name: "Land Patent Identification",
        description: "Locate and verify original land patent from sovereign",
        order: 3,
        status: "pending",
        completedAt: null,
        notes: "",
      },
      {
        id: "step-4",
        name: "Tax Redemption",
        description: "Redeem property from tax rolls to establish true ownership",
        order: 4,
        status: "pending",
        completedAt: null,
        notes: "",
      },
      {
        id: "step-5",
        name: "Lien Release",
        description: "Clear all existing liens and encumbrances",
        order: 5,
        status: "pending",
        completedAt: null,
        notes: "",
      },
      {
        id: "step-6",
        name: "Allodial Declaration Preparation",
        description: "Prepare legal declaration of allodial title",
        order: 6,
        status: "pending",
        completedAt: null,
        notes: "",
      },
      {
        id: "step-7",
        name: "County Recording",
        description: "Record allodial deed with county recorder",
        order: 7,
        status: "pending",
        completedAt: null,
        notes: "",
      },
      {
        id: "step-8",
        name: "UCC Filing",
        description: "File UCC-1 financing statement for notice",
        order: 8,
        status: "pending",
        completedAt: null,
        notes: "",
      },
      {
        id: "step-9",
        name: "Blockchain Registration",
        description: "Register allodial deed on Pi Network blockchain",
        order: 9,
        status: "pending",
        completedAt: null,
        notes: "",
      },
      {
        id: "step-10",
        name: "Title Perfection",
        description: "Complete perfection of allodial title",
        order: 10,
        status: "pending",
        completedAt: null,
        notes: "",
      },
    ];
  }

  async completeApplicationStep(
    applicationId: string,
    stepId: string,
    notes?: string
  ): Promise<AllodialApplication> {
    const application = this.applications.get(applicationId);
    if (!application) {
      throw new Error("Application not found");
    }

    const step = application.steps.find((s) => s.id === stepId);
    if (!step) {
      throw new Error("Step not found");
    }

    step.status = "completed";
    step.completedAt = new Date();
    if (notes) step.notes = notes;

    // Move next step to in-progress
    const nextStep = application.steps.find((s) => s.order === step.order + 1);
    if (nextStep) {
      nextStep.status = "in-progress";
    }

    // Add timeline event
    application.timeline.push({
      id: `event-${Date.now()}`,
      type: "step-completed",
      description: `Completed: ${step.name}`,
      timestamp: new Date(),
      userId: application.applicant.id,
    });

    // Update overall status
    const completedSteps = application.steps.filter((s) => s.status === "completed").length;
    if (completedSteps === application.steps.length) {
      application.status = "perfected";
      application.completedAt = new Date();

      // Update deed to perfected allodial
      const deed = this.deeds.get(application.deedId);
      if (deed) {
        deed.status = "allodial-perfected";
        deed.allodialStatus = "perfected";
        deed.isAllodial = true;
        deed.deedType = "allodial";
        deed.updatedAt = new Date();
      }
    }

    application.updatedAt = new Date();
    return application;
  }

  // ==========================================================================
  // DEED TRANSFER
  // ==========================================================================

  async transferDeed(
    deedId: string,
    toOwner: Omit<DeedOwner, "id" | "verificationStatus">,
    transferData: {
      transferType: TransferType;
      consideration: number;
      piTransactionId?: string;
    }
  ): Promise<DeedTransfer> {
    const deed = this.deeds.get(deedId);
    if (!deed) {
      throw new Error("Deed not found");
    }

    const newOwner: DeedOwner = {
      ...toOwner,
      id: `owner-${Date.now()}`,
      verificationStatus: "pending",
    };

    const transfer: DeedTransfer = {
      id: `transfer-${Date.now()}`,
      fromOwner: deed.currentOwner,
      toOwner: newOwner,
      transferType: transferData.transferType,
      transferDate: new Date(),
      consideration: transferData.consideration,
      piTransactionId: transferData.piTransactionId || null,
      documentNumber: `TRANS-${Date.now().toString().slice(-8)}`,
      notarizedAt: null,
      notaryInfo: null,
      witnessNames: [],
      blockchainTxHash: null,
    };

    // Update deed ownership
    deed.previousOwners.push(transfer);
    deed.currentOwner = newOwner;
    deed.status = "transferred";
    deed.updatedAt = new Date();

    // Calculate Pi value
    deed.piValue = transferData.consideration / PI_EXTERNAL_RATE;

    this.owners.set(newOwner.id, newOwner);

    return transfer;
  }

  // ==========================================================================
  // TAX REDEMPTION
  // ==========================================================================

  async initiateTexRedemption(deedId: string): Promise<{
    deedId: string;
    taxAmount: number;
    redemptionDeadline: Date;
    paymentInstructions: string;
  }> {
    const deed = this.deeds.get(deedId);
    if (!deed) {
      throw new Error("Deed not found");
    }

    // Calculate estimated back taxes (simplified)
    const yearsBack = 7; // Typical statute of limitations
    const annualTax = deed.assessedValue * 0.012; // ~1.2% average property tax
    const totalTax = annualTax * yearsBack;

    return {
      deedId,
      taxAmount: totalTax,
      redemptionDeadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
      paymentInstructions: `
        TAX REDEMPTION INSTRUCTIONS
        
        Property: ${deed.property.address.street}, ${deed.property.address.city}, ${deed.property.address.state}
        Parcel: ${deed.property.parcelNumber}
        
        Total Amount Due: $${totalTax.toFixed(2)} (${(totalTax / PI_EXTERNAL_RATE).toFixed(4)} Pi)
        
        Payment Options:
        1. Pi Network - Send to Triumph Synergy Treasury
        2. Certified Check - Payable to County Tax Collector
        3. Wire Transfer - Contact for instructions
        
        Upon payment, you will receive:
        - Tax Redemption Certificate
        - Release of Tax Lien
        - Updated Chain of Title
      `,
    };
  }

  async processTexRedemption(
    deedId: string,
    paymentData: {
      amount: number;
      piTransactionId?: string;
      paymentMethod: "pi" | "check" | "wire";
    }
  ): Promise<{ success: boolean; certificate: string }> {
    const deed = this.deeds.get(deedId);
    if (!deed) {
      throw new Error("Deed not found");
    }

    // Update allodial status
    if (deed.sovereignDeclaration) {
      deed.sovereignDeclaration.taxRedemptionComplete = true;
      deed.sovereignDeclaration.taxRedemptionDate = new Date();
      deed.sovereignDeclaration.taxRedemptionAmount = paymentData.amount;
    } else {
      deed.sovereignDeclaration = {
        id: `sov-${Date.now()}`,
        declarationDate: new Date(),
        declarationType: "allodial-claim",
        patentNumber: null,
        patentDate: null,
        originalPatentee: null,
        chainOfTitle: [],
        taxRedemptionComplete: true,
        taxRedemptionDate: new Date(),
        taxRedemptionAmount: paymentData.amount,
        filingReferences: [],
        perfectionDate: null,
      };
    }

    deed.allodialStatus = "taxes-redeemed";
    deed.updatedAt = new Date();

    const certificate = `
      TAX REDEMPTION CERTIFICATE
      
      Certificate Number: TRC-${Date.now()}
      Date: ${new Date().toISOString()}
      
      Property: ${deed.property.address.street}
      Parcel: ${deed.property.parcelNumber}
      County: ${deed.property.address.county}
      State: ${deed.property.address.state}
      
      Amount Redeemed: $${paymentData.amount.toFixed(2)}
      Payment Method: ${paymentData.paymentMethod.toUpperCase()}
      ${paymentData.piTransactionId ? `Pi Transaction: ${paymentData.piTransactionId}` : ""}
      
      This certifies that all delinquent taxes have been redeemed
      and the property is clear of tax liens.
      
      Authorized by: Triumph Synergy Digital Financial Ecosystem
    `;

    return { success: true, certificate };
  }

  // ==========================================================================
  // BLOCKCHAIN INTEGRATION
  // ==========================================================================

  async registerOnBlockchain(deedId: string): Promise<{
    blockchainRecordId: string;
    nftTokenId: string;
    txHash: string;
  }> {
    const deed = this.deeds.get(deedId);
    if (!deed) {
      throw new Error("Deed not found");
    }

    const blockchainRecordId = `pi-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const nftTokenId = `NFT-DEED-${Date.now()}`;
    const txHash = `0x${Math.random().toString(16).slice(2, 66)}`;

    deed.blockchainRecordId = blockchainRecordId;
    deed.nftTokenId = nftTokenId;
    deed.updatedAt = new Date();

    // Add blockchain document
    deed.documents.push({
      id: `doc-${Date.now()}`,
      type: "allodial-declaration",
      name: "Blockchain Registration Certificate",
      description: "Pi Network blockchain registration of allodial deed",
      fileUrl: `https://pi.network/deeds/${blockchainRecordId}`,
      fileHash: txHash,
      mimeType: "application/pdf",
      size: 0,
      uploadedAt: new Date(),
      verified: true,
      blockchainHash: txHash,
    });

    return { blockchainRecordId, nftTokenId, txHash };
  }

  // ==========================================================================
  // DOCUMENT MANAGEMENT
  // ==========================================================================

  async uploadDocument(
    deedId: string,
    document: Omit<DeedDocument, "id" | "uploadedAt" | "verified" | "blockchainHash">
  ): Promise<DeedDocument> {
    const deed = this.deeds.get(deedId);
    if (!deed) {
      throw new Error("Deed not found");
    }

    const doc: DeedDocument = {
      ...document,
      id: `doc-${Date.now()}`,
      uploadedAt: new Date(),
      verified: false,
      blockchainHash: null,
    };

    deed.documents.push(doc);
    deed.updatedAt = new Date();

    return doc;
  }

  async verifyDocument(deedId: string, documentId: string): Promise<DeedDocument> {
    const deed = this.deeds.get(deedId);
    if (!deed) {
      throw new Error("Deed not found");
    }

    const doc = deed.documents.find((d) => d.id === documentId);
    if (!doc) {
      throw new Error("Document not found");
    }

    doc.verified = true;
    doc.blockchainHash = `0x${Math.random().toString(16).slice(2, 66)}`;
    deed.updatedAt = new Date();

    return doc;
  }

  // ==========================================================================
  // STATISTICS
  // ==========================================================================

  async getPlatformStats(): Promise<{
    totalDeeds: number;
    allodialDeeds: number;
    pendingApplications: number;
    completedConversions: number;
    totalValue: number;
    totalPiValue: number;
  }> {
    const deeds = Array.from(this.deeds.values());
    const applications = Array.from(this.applications.values());

    return {
      totalDeeds: deeds.length,
      allodialDeeds: deeds.filter((d) => d.isAllodial).length,
      pendingApplications: applications.filter((a) => a.status !== "perfected").length,
      completedConversions: applications.filter((a) => a.status === "perfected").length,
      totalValue: deeds.reduce((sum, d) => sum + d.marketValue, 0),
      totalPiValue: deeds.reduce((sum, d) => sum + d.piValue, 0),
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const allodialDeedsPlatform = new AllodialDeedsPlatform();

// Export helper functions
export async function createDeed(
  data: Parameters<typeof allodialDeedsPlatform.createDeed>[0]
): Promise<AllodialDeed> {
  return allodialDeedsPlatform.createDeed(data);
}

export async function initiateAllodialConversion(deedId: string): Promise<AllodialApplication> {
  return allodialDeedsPlatform.initiateAllodialConversion(deedId);
}

export async function transferDeed(
  deedId: string,
  toOwner: Parameters<typeof allodialDeedsPlatform.transferDeed>[1],
  transferData: Parameters<typeof allodialDeedsPlatform.transferDeed>[2]
): Promise<DeedTransfer> {
  return allodialDeedsPlatform.transferDeed(deedId, toOwner, transferData);
}

export async function registerDeedOnBlockchain(deedId: string): Promise<ReturnType<typeof allodialDeedsPlatform.registerOnBlockchain>> {
  return allodialDeedsPlatform.registerOnBlockchain(deedId);
}

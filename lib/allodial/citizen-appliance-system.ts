/**
 * Universal & Private Citizen Appliance System
 * 
 * Comprehensive citizen status management including:
 * - Private citizen designation
 * - Universal citizen registration
 * - Sovereignty documentation
 * - Integration with NESARA, QFS, and Allodial systems
 * - Rights and benefits tracking
 * 
 * @module lib/allodial/citizen-appliance-system
 * @version 1.0.0
 */

// ============================================================================
// TYPES
// ============================================================================

export type CitizenType =
  | "private-citizen"         // Sovereign private citizen
  | "universal-citizen"       // Universal cosmic citizen
  | "state-national"          // State national (non-federal)
  | "naturalized"             // Naturalized citizen
  | "resident"                // Resident non-citizen
  | "corporate-person";       // Legal fiction (to be corrected)

export type SovereigntyLevel =
  | "full-sovereign"          // Complete sovereignty declared
  | "partial-sovereign"       // Some sovereign rights claimed
  | "non-sovereign"           // Standard citizen status
  | "corporate-subject";      // Under corporate jurisdiction (to transition)

export type CitizenStatus =
  | "active"
  | "pending-verification"
  | "pending-documentation"
  | "suspended"
  | "transitioning";

export type DocumentationStatus =
  | "not-filed"
  | "filed"
  | "recorded"
  | "verified"
  | "notarized"
  | "apostilled";

export type CitizenProfile = {
  id: string;
  
  // Identity
  legalName: string;
  commonLawName: string;        // Name styled: John-Henry: Doe
  birthName: string;
  
  // Birth Information
  dateOfBirth: Date;
  placeOfBirth: string;
  countyOfBirth: string;
  stateOfBirth: string;
  countryOfBirth: string;
  
  // Citizenship
  citizenType: CitizenType;
  sovereigntyLevel: SovereigntyLevel;
  status: CitizenStatus;
  
  // Documentation
  documentation: {
    birthCertificate: {
      number: string;
      state: string;
      status: DocumentationStatus;
      correctionFiled: boolean;
    };
    sovereigntyAffidavit: {
      filed: boolean;
      recordingCounty: string | null;
      bookPage: string | null;
      status: DocumentationStatus;
    };
    stateNationalDeclaration: {
      filed: boolean;
      recordingInfo: string | null;
      effectiveDate: Date | null;
      status: DocumentationStatus;
    };
    ucc1FinancingStatement: {
      filed: boolean;
      filingNumber: string | null;
      securedParty: string | null;
      status: DocumentationStatus;
    };
    copyrightName: {
      filed: boolean;
      registrationNumber: string | null;
      effectiveDate: Date | null;
      status: DocumentationStatus;
    };
    expatriationAffidavit: {
      filed: boolean;
      from14thAmendment: boolean;
      recordingInfo: string | null;
      status: DocumentationStatus;
    };
  };
  
  // System Integration
  integration: {
    nesaraProfileId: string | null;
    qfsAccountId: string | null;
    allodialPortfolioId: string | null;
    birthBondId: string | null;
    restitutionProfileId: string | null;
    ubiAccountId: string | null;
    piWalletId: string | null;
  };
  
  // Rights & Benefits
  rights: {
    propertyRights: boolean;
    travelRights: boolean;
    contractRights: boolean;
    commerceRights: boolean;
    privacyRights: boolean;
    dutyExemptions: boolean;
    taxExemptions: boolean;
  };
  
  benefits: {
    nesaraProsperityFunds: boolean;
    birthBondRedemption: boolean;
    taxRestitution: boolean;
    debtForgiveness: boolean;
    ubiEligible: boolean;
    freeEnergy: boolean;
    medicalCures: boolean;
  };
  
  // Contact
  mailingAddress: {
    careOf: string | null;
    streetAddress: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  
  // Metadata
  registeredDate: Date;
  lastUpdated: Date;
  notes: string[];
};

export type SovereignDocument = {
  id: string;
  citizenId: string;
  
  documentType: 
    | "birth-certificate-correction"
    | "sovereignty-affidavit"
    | "state-national-declaration"
    | "ucc1-filing"
    | "copyright-notice"
    | "expatriation"
    | "power-of-attorney-revocation"
    | "social-security-rescission"
    | "drivers-license-surrender"
    | "allodial-claim";
    
  title: string;
  content: string;
  
  filing: {
    filedDate: Date | null;
    recordedDate: Date | null;
    county: string;
    state: string;
    bookNumber: string | null;
    pageNumber: string | null;
    instrumentNumber: string | null;
  };
  
  notarization: {
    notarized: boolean;
    notaryName: string | null;
    notaryCommission: string | null;
    notaryDate: Date | null;
    sealNumber: string | null;
  };
  
  witnesses: {
    name: string;
    address: string;
    signatureDate: Date;
  }[];
  
  status: DocumentationStatus;
  createdDate: Date;
};

export type ApplicationPackage = {
  id: string;
  applicantId: string;
  applicantName: string;
  
  packageType: "private-citizen" | "universal-citizen" | "sovereignty-correction";
  
  // Steps
  steps: {
    step: number;
    name: string;
    description: string;
    completed: boolean;
    completedDate: Date | null;
    documentIds: string[];
  }[];
  
  // Status
  currentStep: number;
  totalSteps: number;
  percentComplete: number;
  status: "in-progress" | "pending-review" | "approved" | "rejected";
  
  // Integration
  nesaraLinked: boolean;
  qfsLinked: boolean;
  allodialLinked: boolean;
  
  // Dates
  startedDate: Date;
  completedDate: Date | null;
  reviewedDate: Date | null;
  approvedDate: Date | null;
};

// ============================================================================
// DOCUMENT TEMPLATES
// ============================================================================

const SOVEREIGNTY_AFFIDAVIT_TEMPLATE = `
AFFIDAVIT OF SOVEREIGNTY AND STATUS CORRECTION

STATE OF [STATE]
COUNTY OF [COUNTY]

I, [COMMON_LAW_NAME], a living soul, being of lawful age and sound mind, do hereby
solemnly affirm and declare under penalty of perjury the following:

1. I am the living beneficiary of the estate created upon my birth, and I am not
   the legal fiction/strawman entity created by the STATE through the issuance
   of a birth certificate styled in all capital letters.

2. I expressly reserve all my unalienable rights as endowed by my Creator, including
   but not limited to Life, Liberty, and the pursuit of Happiness.

3. I revoke, cancel, and make void any and all presumptions of contract, agency,
   or citizenship status that may have been imposed upon me without my full
   knowledge and informed consent.

4. I declare my status as a private citizen, state national, and sovereign
   individual, not subject to the jurisdiction of any corporate government entity.

5. I claim all rights under the original Constitution for the united States of
   America, the Bill of Rights, and all natural law.

6. I expressly waive any benefits or privileges associated with 14th Amendment
   citizenship and reserve my rights under the common law.

DATED this [DAY] day of [MONTH], [YEAR].

_________________________________
[COMMON_LAW_NAME], sui juris
All Rights Reserved Without Prejudice
UCC 1-308
`;

const UCC1_TEMPLATE = `
UCC FINANCING STATEMENT

DEBTOR:
[LEGAL_NAME_CAPS]
[ADDRESS]

SECURED PARTY:
[COMMON_LAW_NAME]
[ADDRESS]

COLLATERAL DESCRIPTION:
All property, both real and personal, tangible and intangible, including but not
limited to:
- The birth certificate bond/estate
- All accounts, contracts, and claims
- All property acquired using the debtor name
- All intellectual property and names associated with the debtor
- All utilities, privileges, and benefits
- All assets of the estate

This filing secures the interest of the Secured Party (living man/woman) in all
property held in the name of the Debtor (legal fiction/strawman).

FILED BY: [COMMON_LAW_NAME], Secured Party, sui juris
`;

// ============================================================================
// CITIZEN APPLIANCE SYSTEM
// ============================================================================

export class CitizenApplianceSystem {
  private static instance: CitizenApplianceSystem;
  
  private citizens: Map<string, CitizenProfile> = new Map();
  private documents: Map<string, SovereignDocument> = new Map();
  private applications: Map<string, ApplicationPackage> = new Map();
  
  private constructor() {}
  
  static getInstance(): CitizenApplianceSystem {
    if (!CitizenApplianceSystem.instance) {
      CitizenApplianceSystem.instance = new CitizenApplianceSystem();
    }
    return CitizenApplianceSystem.instance;
  }
  
  private generateId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
  }
  
  // Format common law name: John-Henry: Doe
  private formatCommonLawName(firstName: string, middleName: string | null, lastName: string): string {
    if (middleName) {
      return `${firstName}-${middleName}: ${lastName}`;
    }
    return `${firstName}: ${lastName}`;
  }
  
  // ==========================================================================
  // CITIZEN REGISTRATION
  // ==========================================================================
  
  registerCitizen(
    details: {
      legalName: string;
      firstName: string;
      middleName?: string;
      lastName: string;
      birthName?: string;
      dateOfBirth: Date;
      placeOfBirth: string;
      countyOfBirth: string;
      stateOfBirth: string;
      countryOfBirth?: string;
      birthCertificateNumber: string;
      mailingAddress: {
        streetAddress: string;
        city: string;
        state: string;
        postalCode: string;
        country?: string;
      };
      citizenType?: CitizenType;
    }
  ): CitizenProfile {
    const id = this.generateId("CITIZEN");
    
    const commonLawName = this.formatCommonLawName(
      details.firstName,
      details.middleName || null,
      details.lastName
    );
    
    const profile: CitizenProfile = {
      id,
      legalName: details.legalName,
      commonLawName,
      birthName: details.birthName || details.legalName,
      dateOfBirth: details.dateOfBirth,
      placeOfBirth: details.placeOfBirth,
      countyOfBirth: details.countyOfBirth,
      stateOfBirth: details.stateOfBirth,
      countryOfBirth: details.countryOfBirth || "USA",
      citizenType: details.citizenType || "corporate-person", // Start as corporate, to be corrected
      sovereigntyLevel: "non-sovereign",
      status: "pending-documentation",
      documentation: {
        birthCertificate: {
          number: details.birthCertificateNumber,
          state: details.stateOfBirth,
          status: "not-filed",
          correctionFiled: false,
        },
        sovereigntyAffidavit: {
          filed: false,
          recordingCounty: null,
          bookPage: null,
          status: "not-filed",
        },
        stateNationalDeclaration: {
          filed: false,
          recordingInfo: null,
          effectiveDate: null,
          status: "not-filed",
        },
        ucc1FinancingStatement: {
          filed: false,
          filingNumber: null,
          securedParty: null,
          status: "not-filed",
        },
        copyrightName: {
          filed: false,
          registrationNumber: null,
          effectiveDate: null,
          status: "not-filed",
        },
        expatriationAffidavit: {
          filed: false,
          from14thAmendment: false,
          recordingInfo: null,
          status: "not-filed",
        },
      },
      integration: {
        nesaraProfileId: null,
        qfsAccountId: null,
        allodialPortfolioId: null,
        birthBondId: null,
        restitutionProfileId: null,
        ubiAccountId: null,
        piWalletId: null,
      },
      rights: {
        propertyRights: false,
        travelRights: false,
        contractRights: false,
        commerceRights: false,
        privacyRights: false,
        dutyExemptions: false,
        taxExemptions: false,
      },
      benefits: {
        nesaraProsperityFunds: false,
        birthBondRedemption: false,
        taxRestitution: false,
        debtForgiveness: false,
        ubiEligible: false,
        freeEnergy: false,
        medicalCures: false,
      },
      mailingAddress: {
        careOf: null,
        streetAddress: details.mailingAddress.streetAddress,
        city: details.mailingAddress.city,
        state: details.mailingAddress.state,
        postalCode: details.mailingAddress.postalCode,
        country: details.mailingAddress.country || "USA",
      },
      registeredDate: new Date(),
      lastUpdated: new Date(),
      notes: ["Citizen profile created - pending sovereignty documentation"],
    };
    
    this.citizens.set(id, profile);
    
    return profile;
  }
  
  getCitizen(citizenId: string): CitizenProfile | undefined {
    return this.citizens.get(citizenId);
  }
  
  getCitizenByName(legalName: string): CitizenProfile | undefined {
    return Array.from(this.citizens.values()).find(
      c => c.legalName.toLowerCase() === legalName.toLowerCase()
    );
  }
  
  // ==========================================================================
  // DOCUMENT MANAGEMENT
  // ==========================================================================
  
  createSovereigntyAffidavit(
    citizenId: string,
    recordingDetails: {
      county: string;
      state: string;
    }
  ): SovereignDocument {
    const citizen = this.citizens.get(citizenId);
    if (!citizen) {
      throw new Error(`Citizen ${citizenId} not found`);
    }
    
    const id = this.generateId("DOC");
    const now = new Date();
    
    const content = SOVEREIGNTY_AFFIDAVIT_TEMPLATE
      .replace("[STATE]", recordingDetails.state)
      .replace("[COUNTY]", recordingDetails.county)
      .replace(/\[COMMON_LAW_NAME\]/g, citizen.commonLawName)
      .replace("[DAY]", now.getDate().toString())
      .replace("[MONTH]", now.toLocaleString("en-US", { month: "long" }))
      .replace("[YEAR]", now.getFullYear().toString());
    
    const document: SovereignDocument = {
      id,
      citizenId,
      documentType: "sovereignty-affidavit",
      title: "Affidavit of Sovereignty and Status Correction",
      content,
      filing: {
        filedDate: null,
        recordedDate: null,
        county: recordingDetails.county,
        state: recordingDetails.state,
        bookNumber: null,
        pageNumber: null,
        instrumentNumber: null,
      },
      notarization: {
        notarized: false,
        notaryName: null,
        notaryCommission: null,
        notaryDate: null,
        sealNumber: null,
      },
      witnesses: [],
      status: "not-filed",
      createdDate: now,
    };
    
    this.documents.set(id, document);
    
    return document;
  }
  
  createUCC1Filing(
    citizenId: string,
    filingState: string
  ): SovereignDocument {
    const citizen = this.citizens.get(citizenId);
    if (!citizen) {
      throw new Error(`Citizen ${citizenId} not found`);
    }
    
    const id = this.generateId("DOC");
    const now = new Date();
    
    const content = UCC1_TEMPLATE
      .replace("[LEGAL_NAME_CAPS]", citizen.legalName.toUpperCase())
      .replace(/\[COMMON_LAW_NAME\]/g, citizen.commonLawName)
      .replace(/\[ADDRESS\]/g, `${citizen.mailingAddress.streetAddress}, ${citizen.mailingAddress.city}, ${citizen.mailingAddress.state} ${citizen.mailingAddress.postalCode}`);
    
    const document: SovereignDocument = {
      id,
      citizenId,
      documentType: "ucc1-filing",
      title: "UCC-1 Financing Statement",
      content,
      filing: {
        filedDate: null,
        recordedDate: null,
        county: "",
        state: filingState,
        bookNumber: null,
        pageNumber: null,
        instrumentNumber: null,
      },
      notarization: {
        notarized: false,
        notaryName: null,
        notaryCommission: null,
        notaryDate: null,
        sealNumber: null,
      },
      witnesses: [],
      status: "not-filed",
      createdDate: now,
    };
    
    this.documents.set(id, document);
    
    return document;
  }
  
  recordDocument(
    documentId: string,
    recordingInfo: {
      filedDate: Date;
      recordedDate: Date;
      bookNumber: string;
      pageNumber: string;
      instrumentNumber: string;
    }
  ): SovereignDocument {
    const document = this.documents.get(documentId);
    if (!document) {
      throw new Error(`Document ${documentId} not found`);
    }
    
    document.filing.filedDate = recordingInfo.filedDate;
    document.filing.recordedDate = recordingInfo.recordedDate;
    document.filing.bookNumber = recordingInfo.bookNumber;
    document.filing.pageNumber = recordingInfo.pageNumber;
    document.filing.instrumentNumber = recordingInfo.instrumentNumber;
    document.status = "recorded";
    
    // Update citizen profile
    const citizen = this.citizens.get(document.citizenId);
    if (citizen) {
      if (document.documentType === "sovereignty-affidavit") {
        citizen.documentation.sovereigntyAffidavit.filed = true;
        citizen.documentation.sovereigntyAffidavit.recordingCounty = document.filing.county;
        citizen.documentation.sovereigntyAffidavit.bookPage = `${recordingInfo.bookNumber}/${recordingInfo.pageNumber}`;
        citizen.documentation.sovereigntyAffidavit.status = "recorded";
      } else if (document.documentType === "ucc1-filing") {
        citizen.documentation.ucc1FinancingStatement.filed = true;
        citizen.documentation.ucc1FinancingStatement.filingNumber = recordingInfo.instrumentNumber;
        citizen.documentation.ucc1FinancingStatement.securedParty = citizen.commonLawName;
        citizen.documentation.ucc1FinancingStatement.status = "recorded";
      }
      citizen.lastUpdated = new Date();
    }
    
    return document;
  }
  
  notarizeDocument(
    documentId: string,
    notaryInfo: {
      notaryName: string;
      notaryCommission: string;
      sealNumber: string;
    },
    witnesses: { name: string; address: string }[]
  ): SovereignDocument {
    const document = this.documents.get(documentId);
    if (!document) {
      throw new Error(`Document ${documentId} not found`);
    }
    
    const now = new Date();
    
    document.notarization = {
      notarized: true,
      notaryName: notaryInfo.notaryName,
      notaryCommission: notaryInfo.notaryCommission,
      notaryDate: now,
      sealNumber: notaryInfo.sealNumber,
    };
    
    document.witnesses = witnesses.map(w => ({
      ...w,
      signatureDate: now,
    }));
    
    document.status = "notarized";
    
    return document;
  }
  
  getDocument(documentId: string): SovereignDocument | undefined {
    return this.documents.get(documentId);
  }
  
  getDocumentsByCitizen(citizenId: string): SovereignDocument[] {
    return Array.from(this.documents.values()).filter(d => d.citizenId === citizenId);
  }
  
  // ==========================================================================
  // APPLICATION PACKAGES
  // ==========================================================================
  
  startPrivateCitizenApplication(citizenId: string): ApplicationPackage {
    const citizen = this.citizens.get(citizenId);
    if (!citizen) {
      throw new Error(`Citizen ${citizenId} not found`);
    }
    
    const id = this.generateId("APP");
    
    const application: ApplicationPackage = {
      id,
      applicantId: citizenId,
      applicantName: citizen.commonLawName,
      packageType: "private-citizen",
      steps: [
        {
          step: 1,
          name: "Birth Certificate Correction",
          description: "File affidavit correcting birth certificate status and claiming estate",
          completed: false,
          completedDate: null,
          documentIds: [],
        },
        {
          step: 2,
          name: "Sovereignty Affidavit",
          description: "Record affidavit of sovereignty and status correction in county records",
          completed: false,
          completedDate: null,
          documentIds: [],
        },
        {
          step: 3,
          name: "UCC-1 Financing Statement",
          description: "File UCC-1 to secure interest in legal fiction estate",
          completed: false,
          completedDate: null,
          documentIds: [],
        },
        {
          step: 4,
          name: "Copyright Notice",
          description: "File copyright on name to prevent unauthorized use",
          completed: false,
          completedDate: null,
          documentIds: [],
        },
        {
          step: 5,
          name: "NESARA Registration",
          description: "Register with NESARA benefits system",
          completed: false,
          completedDate: null,
          documentIds: [],
        },
        {
          step: 6,
          name: "QFS Account",
          description: "Create Quantum Financial System account",
          completed: false,
          completedDate: null,
          documentIds: [],
        },
        {
          step: 7,
          name: "Allodial Portfolio",
          description: "Register property portfolio for allodial conversion",
          completed: false,
          completedDate: null,
          documentIds: [],
        },
        {
          step: 8,
          name: "Final Review & Approval",
          description: "Complete verification of all documentation",
          completed: false,
          completedDate: null,
          documentIds: [],
        },
      ],
      currentStep: 1,
      totalSteps: 8,
      percentComplete: 0,
      status: "in-progress",
      nesaraLinked: false,
      qfsLinked: false,
      allodialLinked: false,
      startedDate: new Date(),
      completedDate: null,
      reviewedDate: null,
      approvedDate: null,
    };
    
    this.applications.set(id, application);
    
    return application;
  }
  
  completeApplicationStep(
    applicationId: string,
    stepNumber: number,
    documentIds: string[] = []
  ): ApplicationPackage {
    const application = this.applications.get(applicationId);
    if (!application) {
      throw new Error(`Application ${applicationId} not found`);
    }
    
    const step = application.steps.find(s => s.step === stepNumber);
    if (!step) {
      throw new Error(`Step ${stepNumber} not found`);
    }
    
    step.completed = true;
    step.completedDate = new Date();
    step.documentIds = documentIds;
    
    // Update progress
    const completedSteps = application.steps.filter(s => s.completed).length;
    application.percentComplete = Math.round((completedSteps / application.totalSteps) * 100);
    
    // Find next incomplete step
    const nextStep = application.steps.find(s => !s.completed);
    application.currentStep = nextStep ? nextStep.step : application.totalSteps;
    
    // Update integration flags
    if (stepNumber === 5) application.nesaraLinked = true;
    if (stepNumber === 6) application.qfsLinked = true;
    if (stepNumber === 7) application.allodialLinked = true;
    
    // Check completion
    if (completedSteps === application.totalSteps) {
      application.status = "pending-review";
    }
    
    return application;
  }
  
  approveApplication(applicationId: string): { application: ApplicationPackage; citizen: CitizenProfile } {
    const application = this.applications.get(applicationId);
    if (!application) {
      throw new Error(`Application ${applicationId} not found`);
    }
    
    const citizen = this.citizens.get(application.applicantId);
    if (!citizen) {
      throw new Error(`Citizen ${application.applicantId} not found`);
    }
    
    const now = new Date();
    
    application.status = "approved";
    application.reviewedDate = now;
    application.approvedDate = now;
    application.completedDate = now;
    
    // Update citizen status
    citizen.citizenType = application.packageType === "universal-citizen" ? "universal-citizen" : "private-citizen";
    citizen.sovereigntyLevel = "full-sovereign";
    citizen.status = "active";
    
    // Activate all rights
    citizen.rights = {
      propertyRights: true,
      travelRights: true,
      contractRights: true,
      commerceRights: true,
      privacyRights: true,
      dutyExemptions: true,
      taxExemptions: true,
    };
    
    // Activate all benefits
    citizen.benefits = {
      nesaraProsperityFunds: true,
      birthBondRedemption: true,
      taxRestitution: true,
      debtForgiveness: true,
      ubiEligible: true,
      freeEnergy: false, // Still being deployed
      medicalCures: false, // Still being deployed
    };
    
    citizen.lastUpdated = now;
    citizen.notes.push(`${application.packageType.toUpperCase()} STATUS APPROVED on ${now.toISOString()}`);
    
    return { application, citizen };
  }
  
  getApplication(applicationId: string): ApplicationPackage | undefined {
    return this.applications.get(applicationId);
  }
  
  getApplicationsByCitizen(citizenId: string): ApplicationPackage[] {
    return Array.from(this.applications.values()).filter(a => a.applicantId === citizenId);
  }
  
  // ==========================================================================
  // INTEGRATION LINKING
  // ==========================================================================
  
  linkNESARAProfile(citizenId: string, nesaraProfileId: string): CitizenProfile {
    const citizen = this.citizens.get(citizenId);
    if (!citizen) {
      throw new Error(`Citizen ${citizenId} not found`);
    }
    
    citizen.integration.nesaraProfileId = nesaraProfileId;
    citizen.benefits.nesaraProsperityFunds = true;
    citizen.benefits.debtForgiveness = true;
    citizen.lastUpdated = new Date();
    
    return citizen;
  }
  
  linkQFSAccount(citizenId: string, qfsAccountId: string): CitizenProfile {
    const citizen = this.citizens.get(citizenId);
    if (!citizen) {
      throw new Error(`Citizen ${citizenId} not found`);
    }
    
    citizen.integration.qfsAccountId = qfsAccountId;
    citizen.lastUpdated = new Date();
    
    return citizen;
  }
  
  linkAllodialPortfolio(citizenId: string, portfolioId: string): CitizenProfile {
    const citizen = this.citizens.get(citizenId);
    if (!citizen) {
      throw new Error(`Citizen ${citizenId} not found`);
    }
    
    citizen.integration.allodialPortfolioId = portfolioId;
    citizen.rights.propertyRights = true;
    citizen.lastUpdated = new Date();
    
    return citizen;
  }
  
  linkBirthBond(citizenId: string, birthBondId: string): CitizenProfile {
    const citizen = this.citizens.get(citizenId);
    if (!citizen) {
      throw new Error(`Citizen ${citizenId} not found`);
    }
    
    citizen.integration.birthBondId = birthBondId;
    citizen.benefits.birthBondRedemption = true;
    citizen.lastUpdated = new Date();
    
    return citizen;
  }
  
  linkPiWallet(citizenId: string, piWalletId: string): CitizenProfile {
    const citizen = this.citizens.get(citizenId);
    if (!citizen) {
      throw new Error(`Citizen ${citizenId} not found`);
    }
    
    citizen.integration.piWalletId = piWalletId;
    citizen.lastUpdated = new Date();
    
    return citizen;
  }
  
  // ==========================================================================
  // STATISTICS
  // ==========================================================================
  
  getStatistics(): {
    totalCitizens: number;
    byType: Record<CitizenType, number>;
    bySovereignty: Record<SovereigntyLevel, number>;
    byStatus: Record<CitizenStatus, number>;
    totalDocuments: number;
    totalApplications: number;
    pendingApplications: number;
    approvedApplications: number;
    fullyIntegrated: number;
  } {
    const citizens = Array.from(this.citizens.values());
    
    const byType: Record<CitizenType, number> = {
      "private-citizen": 0,
      "universal-citizen": 0,
      "state-national": 0,
      "naturalized": 0,
      "resident": 0,
      "corporate-person": 0,
    };
    
    const bySovereignty: Record<SovereigntyLevel, number> = {
      "full-sovereign": 0,
      "partial-sovereign": 0,
      "non-sovereign": 0,
      "corporate-subject": 0,
    };
    
    const byStatus: Record<CitizenStatus, number> = {
      "active": 0,
      "pending-verification": 0,
      "pending-documentation": 0,
      "suspended": 0,
      "transitioning": 0,
    };
    
    let fullyIntegrated = 0;
    
    for (const citizen of citizens) {
      byType[citizen.citizenType]++;
      bySovereignty[citizen.sovereigntyLevel]++;
      byStatus[citizen.status]++;
      
      const integration = citizen.integration;
      if (
        integration.nesaraProfileId &&
        integration.qfsAccountId &&
        integration.allodialPortfolioId &&
        integration.birthBondId
      ) {
        fullyIntegrated++;
      }
    }
    
    const applications = Array.from(this.applications.values());
    
    return {
      totalCitizens: citizens.length,
      byType,
      bySovereignty,
      byStatus,
      totalDocuments: this.documents.size,
      totalApplications: applications.length,
      pendingApplications: applications.filter(a => a.status === "pending-review" || a.status === "in-progress").length,
      approvedApplications: applications.filter(a => a.status === "approved").length,
      fullyIntegrated,
    };
  }
}

// Singleton export
export const citizenSystem = CitizenApplianceSystem.getInstance();

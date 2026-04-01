/**
 * Citizen Appliance System API Routes
 * 
 * Provides endpoints for:
 * - Citizen registration and management
 * - Sovereignty documentation
 * - Private/Universal citizen application
 * - System integration linking
 * 
 * @route /api/allodial/citizens
 */

import { NextRequest, NextResponse } from "next/server";
import { citizenSystem } from "@/lib/allodial";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...params } = body;

    switch (action) {
      case "register": {
        const { details } = params;
        
        if (!details || !details.legalName || !details.dateOfBirth) {
          return NextResponse.json(
            { error: "details with legalName and dateOfBirth are required" },
            { status: 400 }
          );
        }
        
        const citizen = citizenSystem.registerCitizen(details);
        
        return NextResponse.json({
          success: true,
          message: "Citizen registered successfully",
          citizen,
        });
      }

      case "get-citizen": {
        const { citizenId, legalName } = params;
        
        let citizen;
        if (citizenId) {
          citizen = citizenSystem.getCitizen(citizenId);
        } else if (legalName) {
          citizen = citizenSystem.getCitizenByName(legalName);
        } else {
          return NextResponse.json(
            { error: "citizenId or legalName is required" },
            { status: 400 }
          );
        }
        
        if (!citizen) {
          return NextResponse.json(
            { error: "Citizen not found" },
            { status: 404 }
          );
        }
        
        return NextResponse.json({ success: true, citizen });
      }

      case "create-sovereignty-affidavit": {
        const { citizenId, county, state } = params;
        
        if (!citizenId || !county || !state) {
          return NextResponse.json(
            { error: "citizenId, county, and state are required" },
            { status: 400 }
          );
        }
        
        const document = citizenSystem.createSovereigntyAffidavit(citizenId, { county, state });
        
        return NextResponse.json({
          success: true,
          message: "Sovereignty affidavit created",
          document,
        });
      }

      case "create-ucc1": {
        const { citizenId, filingState } = params;
        
        if (!citizenId || !filingState) {
          return NextResponse.json(
            { error: "citizenId and filingState are required" },
            { status: 400 }
          );
        }
        
        const document = citizenSystem.createUCC1Filing(citizenId, filingState);
        
        return NextResponse.json({
          success: true,
          message: "UCC-1 filing created",
          document,
        });
      }

      case "record-document": {
        const { documentId, recordingInfo } = params;
        
        if (!documentId || !recordingInfo) {
          return NextResponse.json(
            { error: "documentId and recordingInfo are required" },
            { status: 400 }
          );
        }
        
        const document = citizenSystem.recordDocument(documentId, recordingInfo);
        
        return NextResponse.json({
          success: true,
          message: "Document recorded successfully",
          document,
        });
      }

      case "notarize-document": {
        const { documentId, notaryInfo, witnesses } = params;
        
        if (!documentId || !notaryInfo) {
          return NextResponse.json(
            { error: "documentId and notaryInfo are required" },
            { status: 400 }
          );
        }
        
        const document = citizenSystem.notarizeDocument(
          documentId,
          notaryInfo,
          witnesses || []
        );
        
        return NextResponse.json({
          success: true,
          message: "Document notarized successfully",
          document,
        });
      }

      case "get-document": {
        const { documentId } = params;
        
        if (!documentId) {
          return NextResponse.json(
            { error: "documentId is required" },
            { status: 400 }
          );
        }
        
        const document = citizenSystem.getDocument(documentId);
        
        if (!document) {
          return NextResponse.json(
            { error: "Document not found" },
            { status: 404 }
          );
        }
        
        return NextResponse.json({ success: true, document });
      }

      case "get-documents": {
        const { citizenId } = params;
        
        if (!citizenId) {
          return NextResponse.json(
            { error: "citizenId is required" },
            { status: 400 }
          );
        }
        
        const documents = citizenSystem.getDocumentsByCitizen(citizenId);
        
        return NextResponse.json({
          success: true,
          citizenId,
          documents,
          count: documents.length,
        });
      }

      case "start-private-citizen-application": {
        const { citizenId } = params;
        
        if (!citizenId) {
          return NextResponse.json(
            { error: "citizenId is required" },
            { status: 400 }
          );
        }
        
        const application = citizenSystem.startPrivateCitizenApplication(citizenId);
        
        return NextResponse.json({
          success: true,
          message: "Private citizen application started",
          application,
        });
      }

      case "complete-application-step": {
        const { applicationId, stepNumber, documentIds } = params;
        
        if (!applicationId || stepNumber === undefined) {
          return NextResponse.json(
            { error: "applicationId and stepNumber are required" },
            { status: 400 }
          );
        }
        
        const application = citizenSystem.completeApplicationStep(
          applicationId,
          stepNumber,
          documentIds
        );
        
        return NextResponse.json({
          success: true,
          message: `Step ${stepNumber} completed`,
          application,
        });
      }

      case "approve-application": {
        const { applicationId } = params;
        
        if (!applicationId) {
          return NextResponse.json(
            { error: "applicationId is required" },
            { status: 400 }
          );
        }
        
        const result = citizenSystem.approveApplication(applicationId);
        
        return NextResponse.json({
          success: true,
          message: "Application approved - Sovereign status granted",
          application: result.application,
          citizen: result.citizen,
        });
      }

      case "get-application": {
        const { applicationId } = params;
        
        if (!applicationId) {
          return NextResponse.json(
            { error: "applicationId is required" },
            { status: 400 }
          );
        }
        
        const application = citizenSystem.getApplication(applicationId);
        
        if (!application) {
          return NextResponse.json(
            { error: "Application not found" },
            { status: 404 }
          );
        }
        
        return NextResponse.json({ success: true, application });
      }

      case "get-applications": {
        const { citizenId } = params;
        
        if (!citizenId) {
          return NextResponse.json(
            { error: "citizenId is required" },
            { status: 400 }
          );
        }
        
        const applications = citizenSystem.getApplicationsByCitizen(citizenId);
        
        return NextResponse.json({
          success: true,
          citizenId,
          applications,
          count: applications.length,
        });
      }

      case "link-nesara": {
        const { citizenId, nesaraProfileId } = params;
        
        if (!citizenId || !nesaraProfileId) {
          return NextResponse.json(
            { error: "citizenId and nesaraProfileId are required" },
            { status: 400 }
          );
        }
        
        const citizen = citizenSystem.linkNESARAProfile(citizenId, nesaraProfileId);
        
        return NextResponse.json({
          success: true,
          message: "NESARA profile linked",
          citizen,
        });
      }

      case "link-qfs": {
        const { citizenId, qfsAccountId } = params;
        
        if (!citizenId || !qfsAccountId) {
          return NextResponse.json(
            { error: "citizenId and qfsAccountId are required" },
            { status: 400 }
          );
        }
        
        const citizen = citizenSystem.linkQFSAccount(citizenId, qfsAccountId);
        
        return NextResponse.json({
          success: true,
          message: "QFS account linked",
          citizen,
        });
      }

      case "link-allodial": {
        const { citizenId, portfolioId } = params;
        
        if (!citizenId || !portfolioId) {
          return NextResponse.json(
            { error: "citizenId and portfolioId are required" },
            { status: 400 }
          );
        }
        
        const citizen = citizenSystem.linkAllodialPortfolio(citizenId, portfolioId);
        
        return NextResponse.json({
          success: true,
          message: "Allodial portfolio linked",
          citizen,
        });
      }

      case "link-birth-bond": {
        const { citizenId, birthBondId } = params;
        
        if (!citizenId || !birthBondId) {
          return NextResponse.json(
            { error: "citizenId and birthBondId are required" },
            { status: 400 }
          );
        }
        
        const citizen = citizenSystem.linkBirthBond(citizenId, birthBondId);
        
        return NextResponse.json({
          success: true,
          message: "Birth bond linked",
          citizen,
        });
      }

      case "link-pi-wallet": {
        const { citizenId, piWalletId } = params;
        
        if (!citizenId || !piWalletId) {
          return NextResponse.json(
            { error: "citizenId and piWalletId are required" },
            { status: 400 }
          );
        }
        
        const citizen = citizenSystem.linkPiWallet(citizenId, piWalletId);
        
        return NextResponse.json({
          success: true,
          message: "Pi wallet linked",
          citizen,
        });
      }

      case "stats": {
        const stats = citizenSystem.getStatistics();
        
        return NextResponse.json({
          success: true,
          stats,
        });
      }

      default:
        return NextResponse.json(
          { 
            error: "Invalid action",
            availableActions: [
              "register",
              "get-citizen",
              "create-sovereignty-affidavit",
              "create-ucc1",
              "record-document",
              "notarize-document",
              "get-document",
              "get-documents",
              "start-private-citizen-application",
              "complete-application-step",
              "approve-application",
              "get-application",
              "get-applications",
              "link-nesara",
              "link-qfs",
              "link-allodial",
              "link-birth-bond",
              "link-pi-wallet",
              "stats",
            ],
          },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Citizen Appliance API error:", error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");
  const citizenId = searchParams.get("citizenId");

  if (action === "status") {
    const stats = citizenSystem.getStatistics();
    
    return NextResponse.json({
      success: true,
      system: "Universal & Private Citizen Appliance System",
      status: "operational",
      version: "1.0.0",
      stats,
      citizenTypes: [
        "private-citizen",
        "universal-citizen",
        "state-national",
        "naturalized",
        "resident",
        "corporate-person",
      ],
      sovereigntyLevels: [
        "full-sovereign",
        "partial-sovereign",
        "non-sovereign",
        "corporate-subject",
      ],
      documentTypes: [
        "birth-certificate-correction",
        "sovereignty-affidavit",
        "state-national-declaration",
        "ucc1-filing",
        "copyright-notice",
        "expatriation",
        "power-of-attorney-revocation",
        "social-security-rescission",
        "drivers-license-surrender",
        "allodial-claim",
      ],
      integrations: [
        "nesara-profile",
        "qfs-account",
        "allodial-portfolio",
        "birth-bond",
        "restitution-profile",
        "ubi-account",
        "pi-wallet",
      ],
    });
  }

  if (action === "citizen" && citizenId) {
    const citizen = citizenSystem.getCitizen(citizenId);
    if (!citizen) {
      return NextResponse.json({ error: "Citizen not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, citizen });
  }

  if (action === "documents" && citizenId) {
    const documents = citizenSystem.getDocumentsByCitizen(citizenId);
    return NextResponse.json({ success: true, documents, count: documents.length });
  }

  if (action === "applications" && citizenId) {
    const applications = citizenSystem.getApplicationsByCitizen(citizenId);
    return NextResponse.json({ success: true, applications, count: applications.length });
  }

  return NextResponse.json({
    success: true,
    endpoint: "/api/allodial/citizens",
    description: "Universal & Private Citizen Appliance System",
    purpose: "Manage citizen sovereignty status, documentation, and ecosystem integration",
    applicationSteps: [
      "1. Birth Certificate Correction",
      "2. Sovereignty Affidavit",
      "3. UCC-1 Financing Statement",
      "4. Copyright Notice",
      "5. NESARA Registration",
      "6. QFS Account",
      "7. Allodial Portfolio",
      "8. Final Review & Approval",
    ],
    rights: [
      "propertyRights",
      "travelRights",
      "contractRights",
      "commerceRights",
      "privacyRights",
      "dutyExemptions",
      "taxExemptions",
    ],
    benefits: [
      "nesaraProsperityFunds",
      "birthBondRedemption",
      "taxRestitution",
      "debtForgiveness",
      "ubiEligible",
      "freeEnergy",
      "medicalCures",
    ],
    methods: {
      GET: ["status", "citizen", "documents", "applications"],
      POST: [
        "register",
        "get-citizen",
        "create-sovereignty-affidavit",
        "create-ucc1",
        "record-document",
        "notarize-document",
        "start-private-citizen-application",
        "complete-application-step",
        "approve-application",
        "link-nesara",
        "link-qfs",
        "link-allodial",
        "link-birth-bond",
        "link-pi-wallet",
        "stats",
      ],
    },
  });
}

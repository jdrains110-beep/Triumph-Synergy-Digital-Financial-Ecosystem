/**
 * Allodial Deed System API Routes
 * 
 * Provides endpoints for:
 * - Property registration
 * - Allodial conversion process
 * - Land patent management
 * - Encumbrance clearing
 * - Portfolio management
 * 
 * @route /api/allodial/deeds
 */

import { NextRequest, NextResponse } from "next/server";
import { allodialSystem } from "@/lib/allodial";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...params } = body;

    switch (action) {
      case "register-property": {
        const { ownerId, ownerName, ownerType, propertyDetails } = params;
        
        if (!ownerId || !ownerName || !propertyDetails) {
          return NextResponse.json(
            { error: "ownerId, ownerName, and propertyDetails are required" },
            { status: 400 }
          );
        }
        
        const deed = allodialSystem.registerProperty(
          ownerId,
          ownerName,
          ownerType || "private-citizen",
          propertyDetails
        );
        
        return NextResponse.json({
          success: true,
          message: "Property registered successfully",
          deed,
        });
      }

      case "get-deed": {
        const { deedId } = params;
        
        if (!deedId) {
          return NextResponse.json(
            { error: "deedId is required" },
            { status: 400 }
          );
        }
        
        const deed = allodialSystem.getDeed(deedId);
        
        if (!deed) {
          return NextResponse.json(
            { error: "Deed not found" },
            { status: 404 }
          );
        }
        
        return NextResponse.json({ success: true, deed });
      }

      case "get-deeds-by-owner": {
        const { ownerId } = params;
        
        if (!ownerId) {
          return NextResponse.json(
            { error: "ownerId is required" },
            { status: 400 }
          );
        }
        
        const deeds = allodialSystem.getDeedsByOwner(ownerId);
        
        return NextResponse.json({
          success: true,
          ownerId,
          deeds,
          count: deeds.length,
        });
      }

      case "add-encumbrance": {
        const { deedId, encumbrance } = params;
        
        if (!deedId || !encumbrance) {
          return NextResponse.json(
            { error: "deedId and encumbrance are required" },
            { status: 400 }
          );
        }
        
        const deed = allodialSystem.addEncumbrance(deedId, encumbrance);
        
        return NextResponse.json({
          success: true,
          message: "Encumbrance added",
          deed,
        });
      }

      case "clear-encumbrance": {
        const { deedId, encumbranceIndex, clearanceMethod } = params;
        
        if (!deedId || encumbranceIndex === undefined || !clearanceMethod) {
          return NextResponse.json(
            { error: "deedId, encumbranceIndex, and clearanceMethod are required" },
            { status: 400 }
          );
        }
        
        const deed = allodialSystem.clearEncumbrance(deedId, encumbranceIndex, clearanceMethod);
        
        return NextResponse.json({
          success: true,
          message: "Encumbrance cleared",
          deed,
        });
      }

      case "clear-all-nesara": {
        const { deedId } = params;
        
        if (!deedId) {
          return NextResponse.json(
            { error: "deedId is required" },
            { status: 400 }
          );
        }
        
        const deed = allodialSystem.clearAllEncumbrancesViaNESARA(deedId);
        
        return NextResponse.json({
          success: true,
          message: "All encumbrances cleared via NESARA debt forgiveness",
          deed,
        });
      }

      case "initiate-land-patent": {
        const { deedId } = params;
        
        if (!deedId) {
          return NextResponse.json(
            { error: "deedId is required" },
            { status: 400 }
          );
        }
        
        const deed = allodialSystem.initiateLandPatentConversion(deedId);
        
        return NextResponse.json({
          success: true,
          message: "Land patent conversion initiated",
          deed,
        });
      }

      case "attach-land-patent": {
        const { deedId, patentDetails } = params;
        
        if (!deedId || !patentDetails) {
          return NextResponse.json(
            { error: "deedId and patentDetails are required" },
            { status: 400 }
          );
        }
        
        const result = allodialSystem.attachLandPatent(deedId, patentDetails);
        
        return NextResponse.json({
          success: true,
          message: "Land patent attached successfully",
          deed: result.deed,
          patent: result.patent,
        });
      }

      case "create-sovereignty-declaration": {
        const { deedId, citizenId, details } = params;
        
        if (!deedId || !citizenId || !details) {
          return NextResponse.json(
            { error: "deedId, citizenId, and details are required" },
            { status: 400 }
          );
        }
        
        const declaration = allodialSystem.createSovereigntyDeclaration(deedId, citizenId, details);
        
        return NextResponse.json({
          success: true,
          message: "Sovereignty declaration recorded",
          declaration,
        });
      }

      case "complete-allodial-conversion": {
        const { deedId } = params;
        
        if (!deedId) {
          return NextResponse.json(
            { error: "deedId is required" },
            { status: 400 }
          );
        }
        
        const deed = allodialSystem.completeAllodialConversion(deedId);
        
        return NextResponse.json({
          success: true,
          message: "ALLODIAL TITLE COMPLETE - Full sovereign ownership established",
          deed,
        });
      }

      case "get-portfolio": {
        const { ownerId } = params;
        
        if (!ownerId) {
          return NextResponse.json(
            { error: "ownerId is required" },
            { status: 400 }
          );
        }
        
        const portfolio = allodialSystem.getPortfolio(ownerId);
        
        if (!portfolio) {
          return NextResponse.json(
            { error: "Portfolio not found" },
            { status: 404 }
          );
        }
        
        return NextResponse.json({ success: true, portfolio });
      }

      case "link-nesara": {
        const { ownerId } = params;
        
        if (!ownerId) {
          return NextResponse.json(
            { error: "ownerId is required" },
            { status: 400 }
          );
        }
        
        const portfolio = allodialSystem.linkPortfolioToNESARA(ownerId);
        
        return NextResponse.json({
          success: true,
          message: "Portfolio linked to NESARA",
          portfolio,
        });
      }

      case "link-qfs": {
        const { ownerId } = params;
        
        if (!ownerId) {
          return NextResponse.json(
            { error: "ownerId is required" },
            { status: 400 }
          );
        }
        
        const portfolio = allodialSystem.linkPortfolioToQFS(ownerId);
        
        return NextResponse.json({
          success: true,
          message: "Portfolio linked to QFS",
          portfolio,
        });
      }

      case "apply-universal-citizen": {
        const { ownerId, ownerName, application } = params;
        
        if (!ownerId || !ownerName || !application) {
          return NextResponse.json(
            { error: "ownerId, ownerName, and application are required" },
            { status: 400 }
          );
        }
        
        const result = allodialSystem.applyForUniversalCitizenStatus(ownerId, ownerName, application);
        
        return NextResponse.json({
          success: true,
          ...result,
        });
      }

      case "stats": {
        const stats = allodialSystem.getSystemStatistics();
        
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
              "register-property",
              "get-deed",
              "get-deeds-by-owner",
              "add-encumbrance",
              "clear-encumbrance",
              "clear-all-nesara",
              "initiate-land-patent",
              "attach-land-patent",
              "create-sovereignty-declaration",
              "complete-allodial-conversion",
              "get-portfolio",
              "link-nesara",
              "link-qfs",
              "apply-universal-citizen",
              "stats",
            ],
          },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Allodial Deeds API error:", error);
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
  const deedId = searchParams.get("deedId");
  const ownerId = searchParams.get("ownerId");

  if (action === "status") {
    const stats = allodialSystem.getSystemStatistics();
    
    return NextResponse.json({
      success: true,
      system: "Allodial Deed & Property Sovereignty System",
      status: "operational",
      version: "1.0.0",
      stats,
      titleStatuses: [
        "fee-simple",
        "fee-simple-absolute",
        "land-patent-pending",
        "land-patent-issued",
        "allodial-pending",
        "allodial-complete",
      ],
      propertyTypes: [
        "residential",
        "commercial",
        "agricultural",
        "industrial",
        "mixed-use",
        "vacant-land",
        "mineral-rights",
        "water-rights",
        "air-rights",
      ],
      features: [
        "property-registration",
        "encumbrance-management",
        "land-patent-conversion",
        "sovereignty-declaration",
        "allodial-completion",
        "nesara-integration",
        "qfs-integration",
      ],
    });
  }

  if (action === "deed" && deedId) {
    const deed = allodialSystem.getDeed(deedId);
    if (!deed) {
      return NextResponse.json({ error: "Deed not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, deed });
  }

  if (action === "portfolio" && ownerId) {
    const portfolio = allodialSystem.getPortfolio(ownerId);
    if (!portfolio) {
      return NextResponse.json({ error: "Portfolio not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, portfolio });
  }

  if (action === "deeds" && ownerId) {
    const deeds = allodialSystem.getDeedsByOwner(ownerId);
    return NextResponse.json({ success: true, deeds, count: deeds.length });
  }

  return NextResponse.json({
    success: true,
    endpoint: "/api/allodial/deeds",
    description: "Allodial Deed & Sovereign Property Rights System",
    purpose: "Manage allodial title conversion, land patents, and sovereign property ownership",
    piValueMultiplier: 3.14159,
    qfsIntegration: true,
    methods: {
      GET: ["status", "deed", "portfolio", "deeds"],
      POST: [
        "register-property",
        "get-deed",
        "get-deeds-by-owner",
        "add-encumbrance",
        "clear-encumbrance",
        "clear-all-nesara",
        "initiate-land-patent",
        "attach-land-patent",
        "create-sovereignty-declaration",
        "complete-allodial-conversion",
        "get-portfolio",
        "link-nesara",
        "link-qfs",
        "apply-universal-citizen",
        "stats",
      ],
    },
  });
}

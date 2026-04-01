/**
 * Birth Certificate Bond System API Routes
 * 
 * Provides endpoints for:
 * - Bond discovery and search
 * - Bond registration and verification
 * - Redemption requests and processing
 * 
 * @route /api/nesara/birth-bonds
 */

import { NextRequest, NextResponse } from "next/server";
import { birthBondSystem, calculateBondValue } from "@/lib/nesara";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...params } = body;

    switch (action) {
      case "search": {
        const { name, dateOfBirth, ssn, stateOfBirth } = params;
        
        if (!name || !dateOfBirth) {
          return NextResponse.json(
            { error: "name and dateOfBirth are required" },
            { status: 400 }
          );
        }
        
        const bond = birthBondSystem.searchBond(name, dateOfBirth, ssn, stateOfBirth);
        
        return NextResponse.json({
          success: true,
          found: bond !== null,
          bond,
        });
      }

      case "register": {
        const { name, dateOfBirth, placeOfBirth, birthCertificateNumber, ssn, stateOfBirth } = params;
        
        if (!name || !dateOfBirth || !placeOfBirth || !birthCertificateNumber) {
          return NextResponse.json(
            { error: "name, dateOfBirth, placeOfBirth, and birthCertificateNumber are required" },
            { status: 400 }
          );
        }
        
        const bond = birthBondSystem.registerBond(
          name,
          dateOfBirth,
          placeOfBirth,
          birthCertificateNumber,
          ssn,
          stateOfBirth
        );
        
        return NextResponse.json({
          success: true,
          message: "Birth certificate bond registered successfully",
          bond,
        });
      }

      case "verify": {
        const { bondId } = params;
        
        if (!bondId) {
          return NextResponse.json(
            { error: "bondId is required" },
            { status: 400 }
          );
        }
        
        const bond = birthBondSystem.verifyBond(bondId);
        
        if (!bond) {
          return NextResponse.json(
            { error: "Bond not found or verification failed" },
            { status: 404 }
          );
        }
        
        return NextResponse.json({
          success: true,
          message: "Bond verified successfully",
          bond,
        });
      }

      case "submit-redemption": {
        const { bondId, claimantId, requestedAmount, bankAccountNumber, bankRoutingNumber, notes } = params;
        
        if (!bondId || !claimantId) {
          return NextResponse.json(
            { error: "bondId and claimantId are required" },
            { status: 400 }
          );
        }
        
        const redemption = birthBondSystem.submitRedemptionRequest(
          bondId,
          claimantId,
          requestedAmount,
          bankAccountNumber,
          bankRoutingNumber,
          notes
        );
        
        return NextResponse.json({
          success: true,
          message: "Redemption request submitted",
          redemption,
        });
      }

      case "approve-redemption": {
        const { redemptionId, approvedAmount, notes } = params;
        
        if (!redemptionId) {
          return NextResponse.json(
            { error: "redemptionId is required" },
            { status: 400 }
          );
        }
        
        const redemption = birthBondSystem.approveRedemption(
          redemptionId,
          approvedAmount,
          notes
        );
        
        return NextResponse.json({
          success: true,
          message: "Redemption approved",
          redemption,
        });
      }

      case "process-redemption": {
        const { redemptionId, qfsAccountId } = params;
        
        if (!redemptionId || !qfsAccountId) {
          return NextResponse.json(
            { error: "redemptionId and qfsAccountId are required" },
            { status: 400 }
          );
        }
        
        const result = birthBondSystem.processRedemption(redemptionId, qfsAccountId);
        
        return NextResponse.json({
          success: true,
          message: "Redemption processed successfully",
          ...result,
        });
      }

      case "get-bond": {
        const { bondId } = params;
        
        if (!bondId) {
          return NextResponse.json(
            { error: "bondId is required" },
            { status: 400 }
          );
        }
        
        const bond = birthBondSystem.getBond(bondId);
        
        if (!bond) {
          return NextResponse.json(
            { error: "Bond not found" },
            { status: 404 }
          );
        }
        
        return NextResponse.json({
          success: true,
          bond,
        });
      }

      case "get-redemption": {
        const { redemptionId } = params;
        
        if (!redemptionId) {
          return NextResponse.json(
            { error: "redemptionId is required" },
            { status: 400 }
          );
        }
        
        const redemption = birthBondSystem.getRedemption(redemptionId);
        
        if (!redemption) {
          return NextResponse.json(
            { error: "Redemption request not found" },
            { status: 404 }
          );
        }
        
        return NextResponse.json({
          success: true,
          redemption,
        });
      }

      case "calculate-value": {
        const { birthYear } = params;
        
        if (!birthYear) {
          return NextResponse.json(
            { error: "birthYear is required" },
            { status: 400 }
          );
        }
        
        const value = calculateBondValue(birthYear);
        
        return NextResponse.json({
          success: true,
          birthYear,
          estimatedValue: value,
          formattedValue: `$${value.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
          methodology: "Base value ($630K-$2M based on year) + compound interest at 5% annually",
        });
      }

      default:
        return NextResponse.json(
          { 
            error: "Invalid action",
            availableActions: [
              "search",
              "register",
              "verify",
              "submit-redemption",
              "approve-redemption",
              "process-redemption",
              "get-bond",
              "get-redemption",
              "calculate-value",
            ],
          },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Birth Bonds API error:", error);
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
  const birthYear = searchParams.get("birthYear");

  if (action === "status") {
    return NextResponse.json({
      success: true,
      system: "Birth Certificate Bond System",
      status: "operational",
      version: "1.0.0",
      nesaraCompliant: true,
      features: [
        "bond-discovery",
        "bond-registration",
        "verification",
        "redemption-processing",
        "qfs-integration",
      ],
      supportedCountries: ["US"],
    });
  }

  if (action === "calculate" && birthYear) {
    const value = calculateBondValue(parseInt(birthYear));
    return NextResponse.json({
      success: true,
      birthYear: parseInt(birthYear),
      estimatedValue: value,
      formattedValue: `$${value.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
    });
  }

  return NextResponse.json({
    success: true,
    endpoint: "/api/nesara/birth-bonds",
    description: "Birth Certificate Bond Redemption System",
    disclaimer: "Birth certificate bonds represent the monetization of future labor and earnings. NESARA provides for their redemption to citizens.",
    methods: {
      GET: ["status", "calculate"],
      POST: [
        "search",
        "register",
        "verify",
        "submit-redemption",
        "approve-redemption",
        "process-redemption",
        "get-bond",
        "get-redemption",
        "calculate-value",
      ],
    },
  });
}

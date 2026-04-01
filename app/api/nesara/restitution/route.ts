/**
 * NESARA Restitution System API Routes
 * 
 * Provides endpoints for:
 * - Restitution profile management
 * - Claim submission and tracking
 * - Tax recovery estimation
 * 
 * @route /api/nesara/restitution
 */

import { NextRequest, NextResponse } from "next/server";
import { restitutionSystem } from "@/lib/nesara";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...params } = body;

    switch (action) {
      case "create-profile": {
        const { userId, name } = params;
        
        if (!userId || !name) {
          return NextResponse.json(
            { error: "userId and name are required" },
            { status: 400 }
          );
        }
        
        const profile = restitutionSystem.createProfile(userId, name);
        
        return NextResponse.json({
          success: true,
          message: "Restitution profile created",
          profile,
        });
      }

      case "estimate": {
        const { birthYear, workingYearsStart, workingYearsEnd } = params;
        
        if (!birthYear) {
          return NextResponse.json(
            { error: "birthYear is required" },
            { status: 400 }
          );
        }
        
        const estimates = restitutionSystem.estimateRestitution(
          birthYear,
          workingYearsStart,
          workingYearsEnd
        );
        
        const totalEstimate = restitutionSystem.getTotalEstimate(estimates);
        
        return NextResponse.json({
          success: true,
          birthYear,
          estimates,
          totalEstimate,
          formattedTotal: `$${totalEstimate.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
          disclaimer: "Estimates based on average income and tax rates by decade. Actual amounts may vary based on individual circumstances.",
        });
      }

      case "create-claim": {
        const { profileId, category, description, claimedAmount, startYear, endYear, subcategory } = params;
        
        if (!profileId || !category || !claimedAmount || !startYear || !endYear) {
          return NextResponse.json(
            { error: "profileId, category, claimedAmount, startYear, and endYear are required" },
            { status: 400 }
          );
        }
        
        const claim = restitutionSystem.createClaim(profileId, category, {
          description: description || `${category} restitution claim`,
          claimedAmount,
          startYear,
          endYear,
          subcategory,
        });
        
        return NextResponse.json({
          success: true,
          message: "Restitution claim created",
          claim,
        });
      }

      case "submit-claim": {
        const { claimId } = params;
        
        if (!claimId) {
          return NextResponse.json(
            { error: "claimId is required" },
            { status: 400 }
          );
        }
        
        const claim = restitutionSystem.submitClaim(claimId);
        
        return NextResponse.json({
          success: true,
          message: "Claim submitted for review",
          claim,
        });
      }

      case "verify-claim": {
        const { claimId, verifiedAmount, notes } = params;
        
        if (!claimId || verifiedAmount === undefined) {
          return NextResponse.json(
            { error: "claimId and verifiedAmount are required" },
            { status: 400 }
          );
        }
        
        const claim = restitutionSystem.verifyClaim(
          claimId,
          verifiedAmount,
          notes || []
        );
        
        return NextResponse.json({
          success: true,
          message: "Claim verified",
          claim,
        });
      }

      case "approve-claim": {
        const { claimId, paymentInstallments } = params;
        
        if (!claimId) {
          return NextResponse.json(
            { error: "claimId is required" },
            { status: 400 }
          );
        }
        
        const claim = restitutionSystem.approveClaim(claimId, paymentInstallments);
        
        return NextResponse.json({
          success: true,
          message: "Claim approved with payment schedule",
          claim,
        });
      }

      case "record-payment": {
        const { claimId, installment, qfsTransactionId } = params;
        
        if (!claimId || !installment || !qfsTransactionId) {
          return NextResponse.json(
            { error: "claimId, installment, and qfsTransactionId are required" },
            { status: 400 }
          );
        }
        
        const claim = restitutionSystem.recordPayment(claimId, installment, qfsTransactionId);
        
        return NextResponse.json({
          success: true,
          message: "Payment recorded",
          claim,
        });
      }

      case "get-profile": {
        const { profileId, userId } = params;
        
        let profile;
        if (profileId) {
          profile = restitutionSystem.getProfile(profileId);
        } else if (userId) {
          profile = restitutionSystem.getProfileByUserId(userId);
        } else {
          return NextResponse.json(
            { error: "profileId or userId is required" },
            { status: 400 }
          );
        }
        
        if (!profile) {
          return NextResponse.json(
            { error: "Profile not found" },
            { status: 404 }
          );
        }
        
        return NextResponse.json({
          success: true,
          profile,
        });
      }

      case "get-claim": {
        const { claimId } = params;
        
        if (!claimId) {
          return NextResponse.json(
            { error: "claimId is required" },
            { status: 400 }
          );
        }
        
        const claim = restitutionSystem.getClaim(claimId);
        
        if (!claim) {
          return NextResponse.json(
            { error: "Claim not found" },
            { status: 404 }
          );
        }
        
        return NextResponse.json({
          success: true,
          claim,
        });
      }

      case "get-claims": {
        const { profileId } = params;
        
        if (!profileId) {
          return NextResponse.json(
            { error: "profileId is required" },
            { status: 400 }
          );
        }
        
        const claims = restitutionSystem.getClaimsForProfile(profileId);
        
        return NextResponse.json({
          success: true,
          profileId,
          claims,
          count: claims.length,
        });
      }

      case "stats": {
        const stats = restitutionSystem.getSystemStats();
        
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
              "create-profile",
              "estimate",
              "create-claim",
              "submit-claim",
              "verify-claim",
              "approve-claim",
              "record-payment",
              "get-profile",
              "get-claim",
              "get-claims",
              "stats",
            ],
          },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Restitution API error:", error);
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
    const stats = restitutionSystem.getSystemStats();
    
    return NextResponse.json({
      success: true,
      system: "NESARA Restitution System",
      status: "operational",
      version: "1.0.0",
      stats,
      categories: [
        "federal-income-tax",
        "state-income-tax",
        "social-security-tax",
        "medicare-tax",
        "credit-card-interest",
        "mortgage-interest",
        "student-loan-interest",
        "auto-loan-interest",
        "banking-fees",
        "overdraft-fees",
        "government-fines",
        "utility-overcharges",
        "medical-overcharges",
        "insurance-overcharges",
        "corporate-fraud",
      ],
    });
  }

  if (action === "estimate" && birthYear) {
    const estimates = restitutionSystem.estimateRestitution(parseInt(birthYear));
    const totalEstimate = restitutionSystem.getTotalEstimate(estimates);
    
    return NextResponse.json({
      success: true,
      birthYear: parseInt(birthYear),
      estimates,
      totalEstimate,
      formattedTotal: `$${totalEstimate.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
    });
  }

  return NextResponse.json({
    success: true,
    endpoint: "/api/nesara/restitution",
    description: "NESARA Historical Tax & Fee Recovery System",
    purpose: "Process claims for unconstitutional taxes and illegal fees collected since 1913",
    methods: {
      GET: ["status", "estimate"],
      POST: [
        "create-profile",
        "estimate",
        "create-claim",
        "submit-claim",
        "verify-claim",
        "approve-claim",
        "record-payment",
        "get-profile",
        "get-claim",
        "get-claims",
        "stats",
      ],
    },
  });
}

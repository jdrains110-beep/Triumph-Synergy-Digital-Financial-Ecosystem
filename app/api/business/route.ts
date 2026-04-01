/**
 * Business Interactions API
 * 
 * Endpoints for business management:
 * - GET: Get business, employees, loyalty, affiliates
 * - POST: Register, hire, reward, loyalty, affiliates
 */

import { NextResponse } from "next/server";
import {
  businessInteractions,
  getBusinessDashboard,
  type BusinessType,
  type EmploymentType,
  type IncentiveType,
  type TokenType,
} from "@/lib/tokens";

// ============================================================================
// GET - Query business data
// ============================================================================

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");
    const businessId = searchParams.get("businessId");
    const employeeId = searchParams.get("employeeId");
    const memberId = searchParams.get("memberId");
    const affiliateId = searchParams.get("affiliateId");

    switch (action) {
      case "business": {
        if (!businessId) {
          return NextResponse.json(
            { error: "businessId required" },
            { status: 400 }
          );
        }
        const business = businessInteractions.getBusiness(businessId);
        if (!business) {
          return NextResponse.json(
            { error: "Business not found" },
            { status: 404 }
          );
        }
        return NextResponse.json({ business });
      }

      case "dashboard": {
        if (!businessId) {
          return NextResponse.json(
            { error: "businessId required" },
            { status: 400 }
          );
        }
        const dashboard = getBusinessDashboard(businessId);
        return NextResponse.json(dashboard);
      }

      case "employees": {
        if (!businessId) {
          return NextResponse.json(
            { error: "businessId required" },
            { status: 400 }
          );
        }
        const employees = businessInteractions.getBusinessEmployees(businessId);
        return NextResponse.json({ employees });
      }

      case "employee": {
        if (!employeeId) {
          return NextResponse.json(
            { error: "employeeId required" },
            { status: 400 }
          );
        }
        const employee = businessInteractions.getEmployee(employeeId);
        if (!employee) {
          return NextResponse.json(
            { error: "Employee not found" },
            { status: 404 }
          );
        }
        return NextResponse.json({ employee });
      }

      case "loyaltyProgram": {
        const programId = searchParams.get("programId");
        if (!programId) {
          return NextResponse.json(
            { error: "programId required" },
            { status: 400 }
          );
        }
        const program = businessInteractions.getLoyaltyProgram(programId);
        if (!program) {
          return NextResponse.json(
            { error: "Program not found" },
            { status: 404 }
          );
        }
        return NextResponse.json({ program });
      }

      case "loyaltyMember": {
        if (!memberId) {
          return NextResponse.json(
            { error: "memberId required" },
            { status: 400 }
          );
        }
        const member = businessInteractions.getLoyaltyMember(memberId);
        if (!member) {
          return NextResponse.json(
            { error: "Member not found" },
            { status: 404 }
          );
        }
        return NextResponse.json({ member });
      }

      case "affiliate": {
        if (!affiliateId) {
          return NextResponse.json(
            { error: "affiliateId required" },
            { status: 400 }
          );
        }
        const affiliate = businessInteractions.getAffiliate(affiliateId);
        if (!affiliate) {
          return NextResponse.json(
            { error: "Affiliate not found" },
            { status: 404 }
          );
        }
        return NextResponse.json({ affiliate });
      }

      case "affiliateByCode": {
        const code = searchParams.get("code");
        if (!code) {
          return NextResponse.json(
            { error: "code required" },
            { status: 400 }
          );
        }
        const affiliate = businessInteractions.getAffiliateByCode(code);
        if (!affiliate) {
          return NextResponse.json(
            { error: "Affiliate not found" },
            { status: 404 }
          );
        }
        return NextResponse.json({ affiliate });
      }

      case "stats": {
        if (!businessId) {
          return NextResponse.json(
            { error: "businessId required" },
            { status: 400 }
          );
        }
        const stats = businessInteractions.getBusinessStats(businessId);
        return NextResponse.json({ stats });
      }

      case "transactions": {
        if (!businessId) {
          return NextResponse.json(
            { error: "businessId required" },
            { status: 400 }
          );
        }
        const limit = parseInt(searchParams.get("limit") || "50");
        const transactions = businessInteractions.getBusinessTransactions(businessId, limit);
        return NextResponse.json({ transactions });
      }

      case "platformStats": {
        const stats = businessInteractions.getPlatformStats();
        return NextResponse.json({ statistics: stats });
      }

      default:
        return NextResponse.json(
          {
            error: "Invalid action. Use: business, dashboard, employees, employee, loyaltyProgram, loyaltyMember, affiliate, affiliateByCode, stats, transactions, platformStats",
          },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Business API GET error:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST - Business operations
// ============================================================================

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      // Business Management
      case "register": {
        const {
          ownerId,
          ownerWalletId,
          name,
          type,
          industry,
          description,
          initialTokenPool,
          initialPiBalance,
        } = body;

        if (!ownerId || !ownerWalletId || !name || !type || !industry) {
          return NextResponse.json(
            { error: "ownerId, ownerWalletId, name, type, and industry required" },
            { status: 400 }
          );
        }

        const business = businessInteractions.registerBusiness({
          ownerId,
          ownerWalletId,
          name,
          type: type as BusinessType,
          industry,
          description,
          initialTokenPool,
          initialPiBalance,
        });

        return NextResponse.json({ success: true, business });
      }

      case "fundPool": {
        const { businessId, amount, tokenType } = body;
        if (!businessId || !amount) {
          return NextResponse.json(
            { error: "businessId and amount required" },
            { status: 400 }
          );
        }
        const business = businessInteractions.fundTokenPool(
          businessId,
          amount,
          tokenType as TokenType
        );
        return NextResponse.json({ success: true, business });
      }

      case "upgradeTier": {
        const { businessId } = body;
        if (!businessId) {
          return NextResponse.json(
            { error: "businessId required" },
            { status: 400 }
          );
        }
        const business = businessInteractions.upgradeTier(businessId);
        return NextResponse.json({ success: true, business });
      }

      // Employee Management
      case "hire": {
        const {
          businessId,
          userId,
          role,
          department,
          employmentType,
          hourlyRate,
          monthlyAllowance,
        } = body;

        if (!businessId || !userId || !role || !department || !employmentType) {
          return NextResponse.json(
            { error: "businessId, userId, role, department, and employmentType required" },
            { status: 400 }
          );
        }

        const employee = businessInteractions.hireEmployee({
          businessId,
          userId,
          role,
          department,
          employmentType: employmentType as EmploymentType,
          hourlyRate,
          monthlyAllowance,
        });

        return NextResponse.json({ success: true, employee });
      }

      case "rewardEmployee": {
        const { employeeId, type, amount, tokenType, reason, awardedBy } = body;
        if (!employeeId || !type || !amount || !reason || !awardedBy) {
          return NextResponse.json(
            { error: "employeeId, type, amount, reason, and awardedBy required" },
            { status: 400 }
          );
        }
        const incentive = businessInteractions.rewardEmployee({
          employeeId,
          type: type as IncentiveType,
          amount,
          tokenType: tokenType as TokenType,
          reason,
          awardedBy,
        });
        return NextResponse.json({ success: true, incentive });
      }

      case "processAllowances": {
        const { businessId } = body;
        if (!businessId) {
          return NextResponse.json(
            { error: "businessId required" },
            { status: 400 }
          );
        }
        const result = businessInteractions.processMonthlyAllowances(businessId);
        return NextResponse.json({ success: true, ...result });
      }

      case "updatePerformance": {
        const { employeeId, score } = body;
        if (!employeeId || score === undefined) {
          return NextResponse.json(
            { error: "employeeId and score required" },
            { status: 400 }
          );
        }
        const employee = businessInteractions.updatePerformance(employeeId, score);
        return NextResponse.json({ success: true, employee });
      }

      // Loyalty Programs
      case "createLoyalty": {
        const { businessId, name, tokenType, pointsPerPi, tiers } = body;
        if (!businessId || !name) {
          return NextResponse.json(
            { error: "businessId and name required" },
            { status: 400 }
          );
        }
        const program = businessInteractions.createLoyaltyProgram({
          businessId,
          name,
          tokenType: tokenType as TokenType,
          pointsPerPi,
          tiers,
        });
        return NextResponse.json({ success: true, program });
      }

      case "joinLoyalty": {
        const { customerId, customerWalletId, programId } = body;
        if (!customerId || !customerWalletId || !programId) {
          return NextResponse.json(
            { error: "customerId, customerWalletId, and programId required" },
            { status: 400 }
          );
        }
        const member = businessInteractions.joinLoyaltyProgram({
          customerId,
          customerWalletId,
          programId,
        });
        return NextResponse.json({ success: true, member });
      }

      case "recordPurchase": {
        const { memberId, piAmount, description } = body;
        if (!memberId || !piAmount) {
          return NextResponse.json(
            { error: "memberId and piAmount required" },
            { status: 400 }
          );
        }
        const member = businessInteractions.recordPurchase({
          memberId,
          piAmount,
          description,
        });
        return NextResponse.json({ success: true, member });
      }

      case "redeemPoints": {
        const { memberId, points } = body;
        if (!memberId || !points) {
          return NextResponse.json(
            { error: "memberId and points required" },
            { status: 400 }
          );
        }
        const result = businessInteractions.redeemPoints(memberId, points);
        return NextResponse.json({ success: true, ...result });
      }

      // Affiliate Programs
      case "createAffiliate": {
        const { businessId, name, commissionPercent, tokenBonus, tieredCommissions } = body;
        if (!businessId || !name || commissionPercent === undefined || tokenBonus === undefined) {
          return NextResponse.json(
            { error: "businessId, name, commissionPercent, and tokenBonus required" },
            { status: 400 }
          );
        }
        const program = businessInteractions.createAffiliateProgram({
          businessId,
          name,
          commissionPercent,
          tokenBonus,
          tieredCommissions,
        });
        return NextResponse.json({ success: true, program });
      }

      case "joinAffiliate": {
        const { userId, walletId, programId } = body;
        if (!userId || !walletId || !programId) {
          return NextResponse.json(
            { error: "userId, walletId, and programId required" },
            { status: 400 }
          );
        }
        const affiliate = businessInteractions.joinAsAffiliate({
          userId,
          walletId,
          programId,
        });
        return NextResponse.json({ success: true, affiliate });
      }

      case "processReferral": {
        const { referralCode, newCustomerId, purchaseAmount } = body;
        if (!referralCode || !newCustomerId || !purchaseAmount) {
          return NextResponse.json(
            { error: "referralCode, newCustomerId, and purchaseAmount required" },
            { status: 400 }
          );
        }
        const result = businessInteractions.processReferral({
          referralCode,
          newCustomerId,
          purchaseAmount,
        });
        return NextResponse.json({ success: true, ...result });
      }

      // Partnerships
      case "createPartnership": {
        const { business1Id, business2Id, type, tokenShare, terms } = body;
        if (!business1Id || !business2Id || !type || tokenShare === undefined || !terms) {
          return NextResponse.json(
            { error: "business1Id, business2Id, type, tokenShare, and terms required" },
            { status: 400 }
          );
        }
        const partnership = businessInteractions.createPartnership({
          business1Id,
          business2Id,
          type,
          tokenShare,
          terms,
        });
        return NextResponse.json({ success: true, partnership });
      }

      case "processPartnershipReward": {
        const { partnershipId, sourceBusinessId, amount } = body;
        if (!partnershipId || !sourceBusinessId || !amount) {
          return NextResponse.json(
            { error: "partnershipId, sourceBusinessId, and amount required" },
            { status: 400 }
          );
        }
        const shareAmount = businessInteractions.processPartnershipReward(
          partnershipId,
          sourceBusinessId,
          amount
        );
        return NextResponse.json({ success: true, shareAmount });
      }

      default:
        return NextResponse.json(
          {
            error: `Invalid action. Available: register, fundPool, upgradeTier, hire, 
                    rewardEmployee, processAllowances, updatePerformance, createLoyalty, 
                    joinLoyalty, recordPurchase, redeemPoints, createAffiliate, joinAffiliate, 
                    processReferral, createPartnership, processPartnershipReward`,
          },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Business API POST error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process request" },
      { status: 500 }
    );
  }
}

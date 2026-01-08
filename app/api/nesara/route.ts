/**
 * Triumph Synergy - NESARA/GESARA API Routes
 * 
 * API endpoints for NESARA/GESARA compliance and benefits
 */

import { NextRequest, NextResponse } from "next/server";
import {
  nesaraEngine,
  registerNESARA,
  submitDebtForgiveness,
  processDebtForgiveness,
  activateProsperity,
  checkGESARACompliance,
} from "@/lib/nesara/nesara-gesara-system";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "register": {
        const { piUserId, piUsername } = body;
        
        if (!piUserId || !piUsername) {
          return NextResponse.json(
            { error: "Missing required fields: piUserId, piUsername" },
            { status: 400 }
          );
        }

        const profile = await registerNESARA(piUserId, piUsername);

        return NextResponse.json({
          success: true,
          profile,
          message: "Successfully registered for NESARA/GESARA benefits",
        });
      }

      case "submit-debt": {
        const { profileId, debts } = body;
        
        if (!profileId) {
          return NextResponse.json(
            { error: "Missing required field: profileId" },
            { status: 400 }
          );
        }

        const debtRecord = await submitDebtForgiveness(profileId, {
          creditCardDebt: debts?.creditCard || 0,
          mortgageDebt: debts?.mortgage || 0,
          studentLoanDebt: debts?.studentLoan || 0,
          autoLoanDebt: debts?.auto || 0,
          medicalDebt: debts?.medical || 0,
          otherDebt: debts?.other || 0,
        });

        return NextResponse.json({
          success: true,
          debtRecord,
          message: `Debt submission received: $${debtRecord.totalDebt.toLocaleString()}`,
        });
      }

      case "process-forgiveness": {
        const { profileId } = body;
        
        if (!profileId) {
          return NextResponse.json(
            { error: "Missing required field: profileId" },
            { status: 400 }
          );
        }

        const result = await processDebtForgiveness(profileId);

        return NextResponse.json({
          success: true,
          result,
          message: `Debt forgiven: $${result.forgivenAmount.toLocaleString()}`,
        });
      }

      case "activate-prosperity": {
        const { profileId } = body;
        
        if (!profileId) {
          return NextResponse.json(
            { error: "Missing required field: profileId" },
            { status: 400 }
          );
        }

        const prosperityRecord = await activateProsperity(profileId);

        return NextResponse.json({
          success: true,
          prosperityRecord,
          message: `Prosperity funds activated: $${prosperityRecord.eligibleAmount.toLocaleString()}`,
        });
      }

      case "distribute-prosperity": {
        const { profileId } = body;
        
        if (!profileId) {
          return NextResponse.json(
            { error: "Missing required field: profileId" },
            { status: 400 }
          );
        }

        const distribution = await nesaraEngine.distributeProsperityPayment(profileId);

        return NextResponse.json({
          success: true,
          distribution,
          message: `Prosperity payment distributed: $${distribution.amount.toLocaleString()}`,
        });
      }

      case "calculate-tax-reform": {
        const { profileId, previousIncome, previousTaxPaid } = body;
        
        if (!profileId || previousIncome === undefined || previousTaxPaid === undefined) {
          return NextResponse.json(
            { error: "Missing required fields: profileId, previousIncome, previousTaxPaid" },
            { status: 400 }
          );
        }

        const taxReform = await nesaraEngine.calculateTaxReform(
          profileId,
          previousIncome,
          previousTaxPaid
        );

        return NextResponse.json({
          success: true,
          taxReform,
          message: `Tax refund calculated: $${taxReform.refundDue.toLocaleString()}`,
        });
      }

      case "create-asset-account": {
        const { profileId, assetType, initialDeposit } = body;
        
        if (!profileId || !assetType || initialDeposit === undefined) {
          return NextResponse.json(
            { error: "Missing required fields: profileId, assetType, initialDeposit" },
            { status: 400 }
          );
        }

        const account = await nesaraEngine.createAssetBackedAccount(
          profileId,
          assetType,
          initialDeposit
        );

        return NextResponse.json({
          success: true,
          account,
          message: `Asset-backed account created with $${account.balance.toLocaleString()}`,
        });
      }

      case "check-country-compliance": {
        const { countryCode } = body;
        
        if (!countryCode) {
          return NextResponse.json(
            { error: "Missing required field: countryCode" },
            { status: 400 }
          );
        }

        const isCompliant = await checkGESARACompliance(countryCode);
        const status = await nesaraEngine.getCountryGESARAStatus(countryCode);

        return NextResponse.json({
          success: true,
          countryCode,
          isCompliant,
          status,
        });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("NESARA/GESARA API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const profileId = searchParams.get("profileId");
  const countryCode = searchParams.get("countryCode");
  const listCountries = searchParams.get("listCountries");

  if (profileId) {
    const profile = await nesaraEngine.getProfile(profileId);
    
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

  if (countryCode) {
    const status = await nesaraEngine.getCountryGESARAStatus(countryCode);
    
    return NextResponse.json({
      success: true,
      countryCode,
      status,
      isCompliant: status?.gesaraCompliant ?? false,
    });
  }

  if (listCountries === "true") {
    const countries = await nesaraEngine.listGESARACompliantCountries();
    
    return NextResponse.json({
      success: true,
      compliantCountries: countries,
      totalCount: countries.length,
    });
  }

  return NextResponse.json({
    success: true,
    message: "NESARA/GESARA System Active",
    features: [
      "Debt Forgiveness",
      "Prosperity Fund Distribution",
      "Tax Reform & Refunds",
      "Asset-Backed Accounts",
      "GESARA Country Compliance",
    ],
  });
}

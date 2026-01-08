/**
 * Triumph Synergy - Unified Financial API Routes
 * 
 * Master API for unified onboarding and financial dashboard
 */

import { NextRequest, NextResponse } from "next/server";
import {
  financialHub,
  onboardNewUser,
  getDashboard,
  processDistributions,
} from "@/lib/integrations/financial-hub";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "onboard": {
        const { piUserId, piUsername, email, debts } = body;
        
        if (!piUserId || !piUsername || !email) {
          return NextResponse.json(
            { error: "Missing required fields: piUserId, piUsername, email" },
            { status: 400 }
          );
        }

        const result = await onboardNewUser(piUserId, piUsername, email, debts);

        return NextResponse.json({
          success: true,
          ...result,
          message: "Full onboarding complete! You are now enrolled in UBI, NESARA/GESARA, and Credit Reporting.",
        });
      }

      case "process-distributions": {
        const result = await financialHub.processAllPendingDistributions();

        return NextResponse.json({
          success: true,
          ...result,
          message: `Processed ${result.ubiDistributions + result.prosperityDistributions} distributions totaling $${result.totalAmount.toLocaleString()}`,
        });
      }

      case "record-transaction": {
        const { userId, type, amount, currency, source, destination, metadata } = body;
        
        if (!userId || !type || amount === undefined || !currency || !source || !destination) {
          return NextResponse.json(
            { error: "Missing required transaction fields" },
            { status: 400 }
          );
        }

        const transaction = await financialHub.recordTransaction(
          userId,
          type,
          amount,
          currency,
          source,
          destination,
          metadata || {}
        );

        return NextResponse.json({
          success: true,
          transaction,
        });
      }

      case "report-pi-to-credit": {
        const { userId, activities } = body;
        
        if (!userId || !activities) {
          return NextResponse.json(
            { error: "Missing required fields: userId, activities" },
            { status: 400 }
          );
        }

        const result = await financialHub.reportPiActivityToCredit(userId, activities);

        return NextResponse.json({
          success: result.success,
          estimatedScoreImpact: result.estimatedScoreImpact,
          message: `Pi activity reported. Estimated credit score impact: +${result.estimatedScoreImpact} points`,
        });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Financial Hub API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get("userId");
  const piUserId = searchParams.get("piUserId");
  const transactionHistory = searchParams.get("transactions") === "true";

  if (userId || piUserId) {
    const user = userId 
      ? await financialHub.getUser(userId)
      : piUserId 
        ? await financialHub.getUserByPiId(piUserId)
        : null;

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    if (transactionHistory) {
      const transactions = await financialHub.getUserTransactions(user.id, { limit: 50 });
      return NextResponse.json({
        success: true,
        user,
        transactions,
      });
    }

    const dashboard = await getDashboard(user.id);

    return NextResponse.json({
      success: true,
      dashboard,
    });
  }

  return NextResponse.json({
    success: true,
    message: "Triumph Synergy Financial Integration Hub",
    version: "1.0.0",
    systems: {
      ubi: {
        status: "active",
        programs: ["Pi Network Global UBI", "NESARA Prosperity Distribution"],
      },
      nesara: {
        status: "active",
        features: ["Debt Forgiveness", "Prosperity Funds", "Tax Reform", "Asset-Backed Accounts"],
      },
      credit: {
        status: "active",
        bureaus: ["Equifax", "Experian", "TransUnion", "Innovis", "PRBC"],
        piIntegration: true,
      },
      pi: {
        status: "active",
        blockchain: "Pi Network Mainnet",
      },
    },
    endpoints: {
      onboard: "POST /api/financial-hub { action: 'onboard', piUserId, piUsername, email, debts }",
      dashboard: "GET /api/financial-hub?userId={id}",
      transactions: "GET /api/financial-hub?userId={id}&transactions=true",
      distribute: "POST /api/financial-hub { action: 'process-distributions' }",
    },
  });
}

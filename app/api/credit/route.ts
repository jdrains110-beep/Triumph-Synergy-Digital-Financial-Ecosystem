/**
 * Triumph Synergy - Credit Bureau API Routes
 *
 * API endpoints for credit reporting to all major bureaus
 */

import { type NextRequest, NextResponse } from "next/server";
import {
  type CreditBureau,
  creditBureauEngine,
  type DisputeReason,
  disputeCreditItem,
  type PiNetworkCreditActivity,
  pullCreditReports,
  reportPaymentToBureaus,
  reportPiPayments,
} from "@/lib/credit-reporting/credit-bureau-integration";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "pull-report": {
        const { consumerId, ssn, bureau, scoreModel } = body;

        if (!consumerId || !ssn) {
          return NextResponse.json(
            { error: "Missing required fields: consumerId, ssn" },
            { status: 400 }
          );
        }

        if (bureau) {
          const report = await creditBureauEngine.pullCreditReport(
            consumerId,
            ssn,
            bureau as CreditBureau,
            scoreModel || "FICO8"
          );

          return NextResponse.json({
            success: true,
            report,
          });
        }
        // Pull tri-merge report
        const reports = await pullCreditReports(consumerId, ssn);

        return NextResponse.json({
          success: true,
          reports,
          averageScore: Math.round(
            (reports.equifax.score +
              reports.experian.score +
              reports.transunion.score) /
              3
          ),
        });
      }

      case "report-payment": {
        const { consumerId, paymentData } = body;

        if (!consumerId || !paymentData) {
          return NextResponse.json(
            { error: "Missing required fields: consumerId, paymentData" },
            { status: 400 }
          );
        }

        const results = await creditBureauEngine.reportToAllBureaus({
          consumerId,
          reportType: "account-update",
          data: paymentData,
          submitterId: "triumph-synergy",
        });

        return NextResponse.json({
          success: true,
          results: results.results,
          message: "Payment reported to all bureaus",
        });
      }

      case "report-pi-activity": {
        const { consumerId, piUserId, activities } = body;

        if (!consumerId || !piUserId || !activities) {
          return NextResponse.json(
            {
              error:
                "Missing required fields: consumerId, piUserId, activities",
            },
            { status: 400 }
          );
        }

        const result = await reportPiPayments(
          consumerId,
          piUserId,
          activities as PiNetworkCreditActivity[]
        );

        return NextResponse.json({
          success: true,
          scoreImpact: result.score_impact,
          message: `Pi Network activity reported. Estimated score impact: +${result.score_impact} points`,
        });
      }

      case "dispute": {
        const { consumerId, tradelineId, reason, explanation, documents } =
          body;

        if (!consumerId || !tradelineId || !reason || !explanation) {
          return NextResponse.json(
            {
              error:
                "Missing required fields: consumerId, tradelineId, reason, explanation",
            },
            { status: 400 }
          );
        }

        const dispute = await disputeCreditItem(
          consumerId,
          tradelineId,
          reason as DisputeReason,
          explanation
        );

        return NextResponse.json({
          success: true,
          dispute,
          message:
            "Dispute submitted to all bureaus. Investigation typically takes 30 days.",
        });
      }

      case "freeze": {
        const { consumerId, bureaus } = body;

        if (!consumerId) {
          return NextResponse.json(
            { error: "Missing required field: consumerId" },
            { status: 400 }
          );
        }

        const result = await creditBureauEngine.placeCreditFreeze(
          consumerId,
          bureaus as CreditBureau[] | undefined
        );

        return NextResponse.json({
          success: true,
          freezeResults: result,
          message:
            "Credit freeze placed at all requested bureaus. Save your PINs securely.",
        });
      }

      case "fraud-alert": {
        const { consumerId, alertType, bureaus } = body;

        if (!consumerId || !alertType) {
          return NextResponse.json(
            { error: "Missing required fields: consumerId, alertType" },
            { status: 400 }
          );
        }

        const result = await creditBureauEngine.placeFraudAlert(
          consumerId,
          alertType,
          bureaus as CreditBureau[] | undefined
        );

        return NextResponse.json({
          success: result.success,
          expirationDate: result.expirationDate.toISOString(),
          message: `${alertType} fraud alert placed. Expires: ${result.expirationDate.toISOString()}`,
        });
      }

      case "report-positive-payments": {
        const { consumerId, payments } = body;

        if (!consumerId || !payments) {
          return NextResponse.json(
            { error: "Missing required fields: consumerId, payments" },
            { status: 400 }
          );
        }

        const result = await creditBureauEngine.reportPositivePayments(
          consumerId,
          payments
        );

        return NextResponse.json({
          success: true,
          reportedItems: result.reportedItems,
          message: `${result.reportedItems} positive payments reported to build credit`,
        });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Credit Bureau API error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const disputeId = searchParams.get("disputeId");

  if (disputeId) {
    const dispute = await creditBureauEngine.getDisputeStatus(disputeId);

    if (!dispute) {
      return NextResponse.json({ error: "Dispute not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      dispute,
    });
  }

  return NextResponse.json({
    success: true,
    message: "Credit Bureau Integration Active",
    supportedBureaus: ["Equifax", "Experian", "TransUnion", "Innovis", "PRBC"],
    features: [
      "Tri-Merge Credit Reports",
      "Payment Reporting (Metro 2 Format)",
      "Pi Network Activity Reporting",
      "Credit Disputes",
      "Credit Freeze Management",
      "Fraud Alerts",
      "Positive Payment Reporting",
    ],
    piNetworkIntegration: {
      enabled: true,
      description: "Report Pi Network transactions to build credit history",
      scoreImpact: "Up to +20 points from verified Pi activity",
    },
  });
}

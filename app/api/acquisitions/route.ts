/**
 * Triumph Synergy - M&A (Mergers & Acquisitions) API Routes
 * 
 * Company buyouts, valuations, and framework integration
 */

import { NextRequest, NextResponse } from "next/server";
import { maFramework } from "@/lib/acquisitions/ma-framework";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    switch (action) {
      case "companies": {
        const industry = searchParams.get("industry") || undefined;
        const sector = searchParams.get("sector") || undefined;
        const revenueMin = searchParams.get("revenueMin") ? parseFloat(searchParams.get("revenueMin")!) : undefined;
        const revenueMax = searchParams.get("revenueMax") ? parseFloat(searchParams.get("revenueMax")!) : undefined;
        
        const companies = await maFramework.searchCompanies({
          industry,
          sector,
          revenueMin,
          revenueMax,
        });
        return NextResponse.json({
          success: true,
          data: companies,
          count: companies.length,
        });
      }

      case "company": {
        const companyId = searchParams.get("companyId");
        if (!companyId) {
          return NextResponse.json({ success: false, error: "Company ID required" }, { status: 400 });
        }
        const company = await maFramework.getCompany(companyId);
        return NextResponse.json({
          success: true,
          data: company,
        });
      }

      case "acquisition": {
        const acquisitionId = searchParams.get("acquisitionId");
        if (!acquisitionId) {
          return NextResponse.json({ success: false, error: "Acquisition ID required" }, { status: 400 });
        }
        const acquisition = await maFramework.getAcquisition(acquisitionId);
        return NextResponse.json({
          success: true,
          data: acquisition,
        });
      }

      case "valuation": {
        const companyId = searchParams.get("companyId");
        const method = searchParams.get("method") || "ebitda-multiple";
        if (!companyId) {
          return NextResponse.json({ success: false, error: "Company ID required" }, { status: 400 });
        }
        const valuation = await maFramework.performValuation(companyId, method as any);
        return NextResponse.json({
          success: true,
          data: valuation,
        });
      }

      case "dashboard": {
        const dashboard = await maFramework.getMADashboard();
        return NextResponse.json({
          success: true,
          data: dashboard,
        });
      }

      default:
        return NextResponse.json({
          success: true,
          message: "Triumph Synergy M&A API",
          version: "1.0.0",
          endpoints: {
            "GET ?action=companies": "Search target companies",
            "GET ?action=company&companyId=": "Get company details",
            "GET ?action=acquisition&acquisitionId=": "Get acquisition details",
            "GET ?action=valuation&companyId=&method=": "Perform company valuation",
            "GET ?action=dashboard": "Get M&A dashboard metrics",
            "POST": "Create acquisitions, manage due diligence",
          },
        });
    }
  } catch (error) {
    console.error("M&A API GET error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process request" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...data } = body;

    switch (action) {
      case "add-company": {
        const company = await maFramework.addCompany(data);
        return NextResponse.json({
          success: true,
          data: company,
          message: "Company added to database",
        });
      }

      case "initiate-acquisition": {
        const acquisition = await maFramework.initiateAcquisition(data);
        return NextResponse.json({
          success: true,
          data: acquisition,
          message: "Acquisition initiated",
        });
      }

      case "update-status": {
        const acquisition = await maFramework.updateAcquisitionStatus(
          data.acquisitionId,
          data.status
        );
        return NextResponse.json({
          success: true,
          data: acquisition,
          message: "Acquisition status updated",
        });
      }

      case "start-due-diligence": {
        const dueDiligence = await maFramework.startDueDiligence(data.acquisitionId);
        return NextResponse.json({
          success: true,
          data: dueDiligence,
          message: "Due diligence started",
        });
      }

      case "add-finding": {
        const finding = await maFramework.addDDFinding(data.acquisitionId, data.finding);
        return NextResponse.json({
          success: true,
          data: finding,
          message: "Due diligence finding added",
        });
      }

      case "create-integration-plan": {
        const plan = await maFramework.createIntegrationPlan(data.acquisitionId, data.plan);
        return NextResponse.json({
          success: true,
          data: plan,
          message: "Integration plan created",
        });
      }

      case "execute-tech-integration": {
        const result = await maFramework.executeTechIntegration(data.acquisitionId);
        return NextResponse.json({
          success: true,
          data: result,
          message: "Tech integration plan generated",
        });
      }

      case "complete-buyout": {
        const result = await maFramework.completeBuyout(data.acquisitionId);
        return NextResponse.json({
          success: true,
          data: result,
          message: "Buyout completed successfully",
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: "Invalid action" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("M&A API POST error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to process request" },
      { status: 500 }
    );
  }
}

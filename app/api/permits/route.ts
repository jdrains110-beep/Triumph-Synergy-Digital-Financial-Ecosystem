/**
 * Triumph Synergy - Permits API Routes
 * 
 * Building permits, inspections, and compliance management
 */

import { NextRequest, NextResponse } from "next/server";
import { permitSystem } from "@/lib/permits/permit-system";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    switch (action) {
      case "permits": {
        const type = searchParams.get("type") || undefined;
        const status = searchParams.get("status") || undefined;
        const applicantId = searchParams.get("applicantId") || undefined;
        const address = searchParams.get("address") || undefined;
        
        const permits = await permitSystem.searchPermits({
          type: type as any,
          status: status as any,
          applicantId,
          address,
        });
        return NextResponse.json({
          success: true,
          data: permits,
          count: permits.length,
        });
      }

      case "permit": {
        const permitId = searchParams.get("permitId");
        if (!permitId) {
          return NextResponse.json({ success: false, error: "Permit ID required" }, { status: 400 });
        }
        const permit = await permitSystem.getPermit(permitId);
        return NextResponse.json({
          success: true,
          data: permit,
        });
      }

      case "inspections": {
        const permitId = searchParams.get("permitId");
        if (!permitId) {
          return NextResponse.json({ success: false, error: "Permit ID required" }, { status: 400 });
        }
        const inspections = await permitSystem.getNextInspections(permitId);
        return NextResponse.json({
          success: true,
          data: inspections,
          count: inspections.length,
        });
      }

      case "compliance": {
        const permitId = searchParams.get("permitId");
        if (!permitId) {
          return NextResponse.json({ success: false, error: "Permit ID required" }, { status: 400 });
        }
        const compliance = await permitSystem.checkAllCompliance(permitId);
        return NextResponse.json({
          success: true,
          data: compliance,
        });
      }

      case "zoning": {
        const zoneCode = searchParams.get("zoneCode");
        if (!zoneCode) {
          return NextResponse.json({ success: false, error: "Zone code required" }, { status: 400 });
        }
        const zoning = await permitSystem.getZoningInfo(zoneCode);
        return NextResponse.json({
          success: true,
          data: zoning,
        });
      }

      case "check-zoning": {
        const zoneCode = searchParams.get("zoneCode");
        const proposedUse = searchParams.get("proposedUse");
        const height = parseFloat(searchParams.get("height") || "0");
        const lotCoverage = parseFloat(searchParams.get("lotCoverage") || "0");
        
        if (!zoneCode || !proposedUse) {
          return NextResponse.json({ success: false, error: "Zone code and proposed use required" }, { status: 400 });
        }
        
        const result = await permitSystem.checkZoningCompliance({
          zoneCode,
          proposedUse,
          height,
          lotCoverage,
        });
        return NextResponse.json({
          success: true,
          data: result,
        });
      }

      default:
        return NextResponse.json({
          success: true,
          message: "Triumph Synergy Permits API",
          version: "1.0.0",
          endpoints: {
            "GET ?action=permits": "Search permits",
            "GET ?action=permit&permitId=": "Get permit details",
            "GET ?action=inspections&permitId=": "Get scheduled inspections",
            "GET ?action=compliance&permitId=": "Check compliance status",
            "GET ?action=zoning&zoneCode=": "Get zoning information",
            "GET ?action=check-zoning": "Check zoning compliance",
            "POST": "Create permits, schedule inspections",
          },
        });
    }
  } catch (error) {
    console.error("Permits API GET error:", error);
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
      case "apply-permit": {
        const permit = await permitSystem.createPermitApplication(data);
        return NextResponse.json({
          success: true,
          data: permit,
          message: "Permit application created",
        });
      }

      case "submit-permit": {
        const permit = await permitSystem.submitPermit(data.permitId);
        return NextResponse.json({
          success: true,
          data: permit,
          message: "Permit submitted for review",
        });
      }

      case "update-status": {
        const permit = await permitSystem.updatePermitStatus(
          data.permitId,
          data.status,
          data.notes
        );
        return NextResponse.json({
          success: true,
          data: permit,
          message: "Permit status updated",
        });
      }

      case "schedule-inspection": {
        const inspection = await permitSystem.scheduleInspection(
          data.permitId,
          data.inspection
        );
        return NextResponse.json({
          success: true,
          data: inspection,
          message: "Inspection scheduled",
        });
      }

      case "record-inspection": {
        const inspection = await permitSystem.recordInspectionResult(
          data.permitId,
          data.inspectionId,
          data.result,
          data.notes,
          data.corrections
        );
        return NextResponse.json({
          success: true,
          data: inspection,
          message: "Inspection result recorded",
        });
      }

      case "add-compliance": {
        const requirement = await permitSystem.addComplianceRequirement(
          data.permitId,
          data.requirement
        );
        return NextResponse.json({
          success: true,
          data: requirement,
          message: "Compliance requirement added",
        });
      }

      case "update-compliance": {
        const requirement = await permitSystem.updateComplianceStatus(
          data.permitId,
          data.requirementId,
          data.status,
          data.reviewer,
          data.notes
        );
        return NextResponse.json({
          success: true,
          data: requirement,
          message: "Compliance status updated",
        });
      }

      case "calculate-fees": {
        const fees = await permitSystem.calculateFees(data.permitId);
        return NextResponse.json({
          success: true,
          data: fees,
          message: "Fees calculated",
        });
      }

      case "pay-fee": {
        const fee = await permitSystem.payFee(
          data.permitId,
          data.feeId,
          data.receiptNumber
        );
        return NextResponse.json({
          success: true,
          data: fee,
          message: "Fee payment recorded",
        });
      }

      case "register-contractor": {
        const contractor = await permitSystem.registerContractor(data);
        return NextResponse.json({
          success: true,
          data: contractor,
          message: "Contractor registered",
        });
      }

      case "verify-contractor": {
        const result = await permitSystem.verifyContractorLicense(data.contractorId);
        return NextResponse.json({
          success: true,
          data: result,
          message: "License verification completed",
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: "Invalid action" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Permits API POST error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to process request" },
      { status: 500 }
    );
  }
}

/**
 * Triumph Synergy - Real Estate API Routes
 *
 * Property listings, transactions, and development management
 */

import { type NextRequest, NextResponse } from "next/server";
import {
  type PropertyStatus,
  type PropertyType,
  realEstatePlatform,
} from "@/lib/real-estate/real-estate-platform";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    switch (action) {
      case "properties": {
        const propertyTypeParam = searchParams.get("propertyType");
        const statusParam = searchParams.get("status");
        const city = searchParams.get("city") || undefined;
        const minPrice = searchParams.get("minPrice")
          ? Number.parseFloat(searchParams.get("minPrice")!)
          : undefined;
        const maxPrice = searchParams.get("maxPrice")
          ? Number.parseFloat(searchParams.get("maxPrice")!)
          : undefined;
        const minBeds = searchParams.get("minBeds")
          ? Number.parseInt(searchParams.get("minBeds")!)
          : undefined;
        const minBaths = searchParams.get("minBaths")
          ? Number.parseInt(searchParams.get("minBaths")!)
          : undefined;

        const result = await realEstatePlatform.searchProperties({
          propertyType: propertyTypeParam
            ? (propertyTypeParam as PropertyType)
            : undefined,
          status: statusParam ? (statusParam as PropertyStatus) : undefined,
          city,
          minPrice,
          maxPrice,
          minBeds,
          minBaths,
        });
        return NextResponse.json({
          success: true,
          data: result.properties,
          count: result.total,
        });
      }

      case "property": {
        const propertyId = searchParams.get("propertyId");
        if (!propertyId) {
          return NextResponse.json(
            { success: false, error: "Property ID required" },
            { status: 400 }
          );
        }
        const property = await realEstatePlatform.getProperty(propertyId);
        return NextResponse.json({
          success: true,
          data: property,
        });
      }

      case "transaction": {
        const transactionId = searchParams.get("transactionId");
        if (!transactionId) {
          return NextResponse.json(
            { success: false, error: "Transaction ID required" },
            { status: 400 }
          );
        }
        const transaction =
          await realEstatePlatform.getTransaction(transactionId);
        return NextResponse.json({
          success: true,
          data: transaction,
        });
      }

      case "development": {
        const developmentId = searchParams.get("developmentId");
        if (!developmentId) {
          return NextResponse.json(
            { success: false, error: "Development ID required" },
            { status: 400 }
          );
        }
        const development =
          await realEstatePlatform.getDevelopmentProject(developmentId);
        return NextResponse.json({
          success: true,
          data: development,
        });
      }

      case "agents": {
        const state = searchParams.get("state") || undefined;
        const specialization = searchParams.get("specialization") || undefined;
        const agents = await realEstatePlatform.searchAgents({
          state,
          specialization,
        });
        return NextResponse.json({
          success: true,
          data: agents,
          count: agents.length,
        });
      }

      default:
        return NextResponse.json({
          success: true,
          message: "Triumph Synergy Real Estate API",
          version: "1.0.0",
          endpoints: {
            "GET ?action=properties": "Search property listings",
            "GET ?action=property&propertyId=": "Get property details",
            "GET ?action=transaction&transactionId=": "Get transaction details",
            "GET ?action=development&developmentId=": "Get development project",
            "GET ?action=agents": "Search real estate agents",
            POST: "Create listings, offers, developments",
          },
        });
    }
  } catch (error) {
    console.error("Real Estate API GET error:", error);
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
      case "list-property": {
        const property = await realEstatePlatform.createListing(data);
        return NextResponse.json({
          success: true,
          data: property,
          message: "Property listed successfully",
        });
      }

      case "make-offer": {
        const transaction = await realEstatePlatform.initiateTransaction(data);
        return NextResponse.json({
          success: true,
          data: transaction,
          message: "Offer submitted successfully",
        });
      }

      case "update-transaction": {
        const transaction = await realEstatePlatform.updateTransactionStatus(
          data.transactionId,
          data.status
        );
        return NextResponse.json({
          success: true,
          data: transaction,
          message: "Transaction updated",
        });
      }

      case "create-development": {
        const development =
          await realEstatePlatform.createDevelopmentProject(data);
        return NextResponse.json({
          success: true,
          data: development,
          message: "Development project created",
        });
      }

      case "update-phase": {
        const development = await realEstatePlatform.updateProjectPhase(
          data.projectId,
          data.phaseId,
          data.completionPercent
        );
        return NextResponse.json({
          success: true,
          data: development,
          message: "Phase updated",
        });
      }

      case "register-agent": {
        const agent = await realEstatePlatform.registerAgent(data);
        return NextResponse.json({
          success: true,
          data: agent,
          message: "Agent registered successfully",
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: "Invalid action" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Real Estate API POST error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to process request",
      },
      { status: 500 }
    );
  }
}

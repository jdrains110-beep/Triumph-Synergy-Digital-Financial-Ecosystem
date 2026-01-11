/**
 * Allodial Deeds API Route
 *
 * Handles deed creation, allodial conversion, and blockchain registration
 */

import { type NextRequest, NextResponse } from "next/server";
import {
  allodialDeedsPlatform,
  createDeed,
  initiateAllodialConversion,
  registerDeedOnBlockchain,
  transferDeed,
} from "@/lib/allodial-deeds/allodial-deeds-platform";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");
  const deedId = searchParams.get("deedId");
  const ownerId = searchParams.get("ownerId");

  try {
    switch (action) {
      case "get": {
        if (!deedId) {
          return NextResponse.json(
            { success: false, error: "Deed ID required" },
            { status: 400 }
          );
        }
        const deed = await allodialDeedsPlatform.getDeed(deedId);
        return NextResponse.json({ success: true, deed });
      }

      case "owner-deeds": {
        if (!ownerId) {
          return NextResponse.json(
            { success: false, error: "Owner ID required" },
            { status: 400 }
          );
        }
        const ownerDeeds = await allodialDeedsPlatform.getOwnerDeeds(ownerId);
        return NextResponse.json({ success: true, deeds: ownerDeeds });
      }

      case "conversion-steps":
        return NextResponse.json({
          success: true,
          steps: [
            "Document Preparation",
            "Title Search & Verification",
            "Lien & Encumbrance Review",
            "Tax Authority Notification",
            "Tax Redemption Payment",
            "State Filing",
            "Public Notice Period",
            "Final Approval",
            "Blockchain Registration",
            "NFT Minting & Issuance",
          ],
        });

      default:
        return NextResponse.json({
          success: true,
          message: "Allodial Deeds API",
          endpoints: {
            "GET ?action=get&deedId=X": "Get deed details",
            "GET ?action=owner-deeds&ownerId=X": "Get owner's deeds",
            "GET ?action=conversion-steps": "List allodial conversion steps",
            POST: "Create deeds, initiate conversions, transfers",
          },
        });
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "create": {
        const newDeed = await createDeed({
          property: {
            address: {
              street: body.street,
              unit: body.unit || null,
              city: body.city,
              county: body.county,
              state: body.state,
              zip: body.zip,
              country: body.country || "United States",
            },
            legalDescription: body.legalDescription || "",
            parcelNumber: body.parcelNumber || "",
            lotNumber: body.lotNumber || "",
            blockNumber: body.blockNumber || "",
            subdivision: body.subdivision || "",
            platBook: body.platBook || "",
            platPage: body.platPage || "",
            acreage: body.acreage || 0,
            squareFootage: body.squareFootage || 0,
            propertyType: body.propertyType || "single-family",
            zoning: body.zoning || "residential",
            coordinates: body.coordinates || { lat: 0, lng: 0 },
          },
          owner: {
            names: [body.ownerName],
            type: body.ownerType || "individual",
            ownershipType: body.ownershipType || "fee-simple",
            percentage: body.ownershipPercentage || 100,
            piWalletAddress: body.piWalletAddress || "",
            email: body.email || "",
            phone: body.phone || "",
            mailingAddress: body.mailingAddress || "",
          },
          deedType: body.existingDeedType || "warranty",
        });
        return NextResponse.json({ success: true, deed: newDeed });
      }

      case "initiate-conversion": {
        const conversion = await initiateAllodialConversion(body.deedId);
        return NextResponse.json({ success: true, application: conversion });
      }

      case "complete-step": {
        const completed = await allodialDeedsPlatform.completeApplicationStep(
          body.applicationId,
          body.step,
          body.data
        );
        return NextResponse.json({ success: true, application: completed });
      }

      case "transfer": {
        const transferred = await transferDeed(
          body.deedId,
          {
            names: [body.newOwnerName],
            type: body.ownerType || "individual",
            ownershipType: body.ownershipType || "fee-simple",
            percentage: body.percentage || 100,
            piWalletAddress: body.piWalletAddress || "",
            email: body.email || "",
            phone: body.phone || "",
            mailingAddress: body.mailingAddress || "",
          },
          {
            transferType: body.transferType || "sale",
            consideration: body.salePrice || 0,
            piTransactionId: body.piTransactionId,
          }
        );
        return NextResponse.json({ success: true, transfer: transferred });
      }

      case "register-blockchain": {
        const registered = await registerDeedOnBlockchain(body.deedId);
        return NextResponse.json({ success: true, ...registered });
      }

      case "upload-document": {
        const doc = await allodialDeedsPlatform.uploadDocument(
          body.deedId,
          body.document
        );
        return NextResponse.json({ success: true, document: doc });
      }

      default:
        return NextResponse.json(
          { success: false, error: "Invalid action" },
          { status: 400 }
        );
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

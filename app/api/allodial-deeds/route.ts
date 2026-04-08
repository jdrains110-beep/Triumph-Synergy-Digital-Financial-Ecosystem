/**
 * Allodial Deeds API Route
 *
 * Handles deed creation, allodial conversion, blockchain registration,
 * tokenization (PT-721 NFT binding to Pi blockchain), and Docker node
 * connectivity for live on-chain verification.
 */

import { type NextRequest, NextResponse } from "next/server";
import {
  allodialDeedsPlatform,
  createDeed,
  initiateAllodialConversion,
  registerDeedOnBlockchain,
  transferDeed,
  verifyHeadquartersAllodialStatus,
} from "@/lib/allodial-deeds/allodial-deeds-platform";
import { allodialDeedsConnector } from "@/lib/blockchain/allodial-deeds-connector";
import { dockerNodeBridge } from "@/lib/blockchain/docker-node-bridge";

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

      // ================================================================
      // TOKENIZATION & DOCKER NODE INTEGRATION
      // ================================================================

      case "connectivity": {
        const connectivity = await allodialDeedsConnector.getConnectivityStatus();
        return NextResponse.json({ success: true, ...connectivity });
      }

      case "ready": {
        const readiness = await allodialDeedsConnector.isReadyForOperations();
        return NextResponse.json({ success: true, ...readiness });
      }

      case "stats": {
        const connectorStats = await allodialDeedsConnector.getStats();
        return NextResponse.json({ success: true, ...connectorStats });
      }

      case "mappings": {
        const mappings = allodialDeedsConnector.getAllMappings();
        return NextResponse.json({ success: true, mappings, total: mappings.length });
      }

      case "mapping": {
        const mappingDeedId = searchParams.get("deed") || deedId;
        if (!mappingDeedId) {
          return NextResponse.json(
            { success: false, error: "deed or deedId parameter required" },
            { status: 400 }
          );
        }
        const tokenId = allodialDeedsConnector.getTokenForDeed(mappingDeedId);
        return NextResponse.json({
          success: true,
          deedId: mappingDeedId,
          tokenId,
          isTokenized: tokenId !== null,
        });
      }

      case "transfers": {
        const transferDeedId = searchParams.get("deed") || deedId;
        if (!transferDeedId) {
          return NextResponse.json(
            { success: false, error: "deed or deedId parameter required" },
            { status: 400 }
          );
        }
        const transferHistory = allodialDeedsConnector.getTransferHistory(transferDeedId);
        return NextResponse.json({
          success: true,
          deedId: transferDeedId,
          transfers: transferHistory,
          total: transferHistory.length,
        });
      }

      case "headquarters": {
        const hqDeed = allodialDeedsPlatform.getHeadquartersDeed();
        const hqStatus = verifyHeadquartersAllodialStatus();
        const hqTokenId = allodialDeedsConnector.getTokenForDeed(hqDeed.id);
        return NextResponse.json({
          success: true,
          headquarters: hqStatus,
          deed: hqDeed,
          tokenId: hqTokenId,
          isTokenized: hqTokenId !== null,
        });
      }

      case "platform-stats": {
        const platformStats = await allodialDeedsPlatform.getPlatformStats();
        return NextResponse.json({ success: true, ...platformStats });
      }

      case "node-health": {
        const health = await dockerNodeBridge.getHealth();
        return NextResponse.json({ success: true, ...health });
      }

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

      // ================================================================
      // TOKENIZATION & DOCKER NODE INTEGRATION
      // ================================================================

      case "tokenize": {
        const { deedId: tokenDeedId, ownerWalletAddress, signerSecret, piValueType } = body;
        if (!tokenDeedId || !ownerWalletAddress) {
          return NextResponse.json(
            { success: false, error: "deedId and ownerWalletAddress required" },
            { status: 400 }
          );
        }
        const tokenResult = await allodialDeedsConnector.tokenizeDeed(tokenDeedId, {
          ownerWalletAddress,
          signerSecret,
          piValueType,
          checkNodeHealth: true,
        });
        return NextResponse.json({
          success: tokenResult.status !== "failed",
          ...tokenResult,
        });
      }

      case "tokenize-hq": {
        const { ownerWalletAddress: hqWallet, signerSecret: hqSecret } = body;
        if (!hqWallet) {
          return NextResponse.json(
            { success: false, error: "ownerWalletAddress required" },
            { status: 400 }
          );
        }
        const hqResult = await allodialDeedsConnector.tokenizeHeadquarters({
          ownerWalletAddress: hqWallet,
          signerSecret: hqSecret,
        });
        return NextResponse.json({
          success: hqResult.status !== "failed",
          ...hqResult,
        });
      }

      case "batch-tokenize": {
        const { deedIds, ownerWalletAddress: batchWallet, signerSecret: batchSecret, piValueType: batchPiType } = body;
        if (!deedIds || !Array.isArray(deedIds) || !batchWallet) {
          return NextResponse.json(
            { success: false, error: "deedIds (array) and ownerWalletAddress required" },
            { status: 400 }
          );
        }
        const batchResult = await allodialDeedsConnector.batchTokenizeDeeds(
          deedIds,
          { ownerWalletAddress: batchWallet, signerSecret: batchSecret, piValueType: batchPiType }
        );
        return NextResponse.json({ success: true, ...batchResult });
      }

      case "verify-tokenization": {
        if (!body.deedId) {
          return NextResponse.json(
            { success: false, error: "deedId required" },
            { status: 400 }
          );
        }
        const verifyResult = await allodialDeedsConnector.verifyDeed(body.deedId);
        return NextResponse.json({ success: true, ...verifyResult });
      }

      case "transfer-onchain": {
        const { deedId: xferDeedId, transfer: xferData, signerSecret: xferSecret } = body;
        if (!xferDeedId || !xferData || !xferSecret) {
          return NextResponse.json(
            { success: false, error: "deedId, transfer, and signerSecret required" },
            { status: 400 }
          );
        }
        const xferResult = await allodialDeedsConnector.recordTransferOnChain(
          xferDeedId,
          xferData,
          xferSecret
        );
        return NextResponse.json({
          ...xferResult,
        });
      }

      case "connect-node": {
        const bridgeConnected = await dockerNodeBridge.connect();
        return NextResponse.json({
          success: true,
          connected: bridgeConnected,
          mode: dockerNodeBridge.getMode(),
        });
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

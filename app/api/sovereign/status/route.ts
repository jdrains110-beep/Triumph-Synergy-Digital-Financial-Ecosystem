/**
 * @fileoverview Sovereign Citizen API — Status, lookup, elevation, title management
 * @copyright Copyright (C) 2024-2026 Jeremiah Drains / Triumph Synergy. All rights reserved.
 * @license PiOS
 *
 * GET  /api/sovereign/status?piUid={id}         — Get sovereign status
 * GET  /api/sovereign/status?wallet={address}    — Lookup by wallet
 * GET  /api/sovereign/status                     — Ecosystem stats
 * POST /api/sovereign/status                     — Manual elevation or title update
 *
 * Pi KYC = Automatic sovereign citizen (Queen/King).
 * This endpoint allows checking sovereign status and updating titles.
 */

import { NextResponse, type NextRequest } from "next/server";
import {
  SovereignCitizenEngine,
  type SovereignTitle,
} from "@/lib/sovereign-finance";

export async function GET(req: NextRequest) {
  const engine = SovereignCitizenEngine.getInstance();
  const piUid = req.nextUrl.searchParams.get("piUid");
  const wallet = req.nextUrl.searchParams.get("wallet");
  const sovereignId = req.nextUrl.searchParams.get("id");

  // Lookup by Pi UID
  if (piUid) {
    const identity = engine.getByPiUid(piUid);
    if (!identity) {
      return NextResponse.json(
        {
          sovereign: false,
          message: "Not yet sovereign. Complete Pi Network KYC to receive Queen/King status automatically.",
        },
        { status: 404 },
      );
    }
    return NextResponse.json({
      sovereign: true,
      identity,
    });
  }

  // Lookup by wallet address
  if (wallet) {
    const identity = engine.getByWallet(wallet);
    if (!identity) {
      return NextResponse.json(
        { sovereign: false, message: "Wallet not found in sovereign registry." },
        { status: 404 },
      );
    }
    return NextResponse.json({ sovereign: true, identity });
  }

  // Lookup by sovereign ID
  if (sovereignId) {
    const identity = engine.getById(sovereignId);
    if (!identity) {
      return NextResponse.json(
        { sovereign: false, message: "Sovereign ID not found." },
        { status: 404 },
      );
    }
    return NextResponse.json({ sovereign: true, identity });
  }

  // No query params → ecosystem stats
  const stats = engine.getStats();
  return NextResponse.json({
    success: true,
    protocol: "Triumph Synergy Sovereign Citizen Protocol v1.0",
    description:
      "Every Pi Network KYC-verified Pioneer is automatically elevated to " +
      "Superior Sovereign Citizen with Queen/King status and ownership rights " +
      "in the Sovereign Quantum Financial Ecosystem.",
    stats,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;
    const engine = SovereignCitizenEngine.getInstance();

    switch (action) {
      // Manual elevation (e.g., completing KYC through a different path)
      case "elevate": {
        const {
          piUid,
          piWalletAddress,
          legalName,
          firstName,
          middleName,
          lastName,
          preferredTitle,
          piKycLevel,
          miningDurationDays,
          isNodeOperator,
          isContributor,
        } = body;

        if (!piUid || !piWalletAddress || !legalName || !firstName || !lastName) {
          return NextResponse.json(
            { error: "Missing required fields: piUid, piWalletAddress, legalName, firstName, lastName" },
            { status: 400 },
          );
        }

        const identity = engine.elevateOnKycSuccess({
          piUid,
          piWalletAddress,
          legalName,
          firstName,
          middleName,
          lastName,
          preferredTitle: preferredTitle as SovereignTitle,
          piKycLevel: piKycLevel ?? "FAST_TRACK_APPROVED",
          miningDurationDays,
          isNodeOperator,
          isContributor,
        });

        return NextResponse.json({
          success: true,
          message: `${identity.sovereignName} — Sovereignty granted! All rights and benefits activated.`,
          identity,
        });
      }

      // Update title (King, Queen, or Sovereign)
      case "update-title": {
        const { piUid, title } = body;

        if (!piUid || !title) {
          return NextResponse.json(
            { error: "Missing required fields: piUid, title" },
            { status: 400 },
          );
        }

        if (!["King", "Queen", "Sovereign"].includes(title)) {
          return NextResponse.json(
            { error: "Title must be King, Queen, or Sovereign" },
            { status: 400 },
          );
        }

        const updated = engine.updateTitle(piUid, title as SovereignTitle);
        if (!updated) {
          return NextResponse.json(
            { error: "Sovereign identity not found for this Pi UID" },
            { status: 404 },
          );
        }

        return NextResponse.json({
          success: true,
          message: `Title updated to ${updated.sovereignName}`,
          identity: updated,
        });
      }

      // Verify sovereign credential
      case "verify": {
        const { sovereignId, credentialHash } = body;

        if (!sovereignId || !credentialHash) {
          return NextResponse.json(
            { error: "Missing: sovereignId, credentialHash" },
            { status: 400 },
          );
        }

        const valid = engine.verifyCredential(sovereignId, credentialHash);
        return NextResponse.json({
          success: true,
          valid,
          message: valid
            ? "Sovereign credential verified — authentic Queen/King status"
            : "Credential does not match",
        });
      }

      // Check if someone is sovereign
      case "check": {
        const { piUid } = body;
        if (!piUid) {
          return NextResponse.json({ error: "Missing: piUid" }, { status: 400 });
        }
        const isSovereign = engine.isSovereign(piUid);
        return NextResponse.json({
          success: true,
          piUid,
          sovereign: isSovereign,
          message: isSovereign
            ? "This Pioneer holds Superior Sovereign Citizen status"
            : "Not yet sovereign — complete Pi Network KYC to be elevated automatically",
        });
      }

      default:
        return NextResponse.json(
          { error: "Unknown action. Use: elevate, update-title, verify, check" },
          { status: 400 },
        );
    }
  } catch (error) {
    return NextResponse.json(
      { error: "Sovereign status operation failed" },
      { status: 500 },
    );
  }
}

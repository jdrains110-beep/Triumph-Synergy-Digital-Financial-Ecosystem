/**
 * Allodial Deed Tokenization API
 *
 * POST /api/tokenization/deeds   — Register and tokenize an allodial property deed
 * GET  /api/tokenization/deeds   — API info / retrieve by tokenId
 * GET  /api/tokenization/deeds?id={tokenId} — Get single deed token
 */

import { NextRequest, NextResponse } from "next/server";
import {
  tokenizeDeed,
  getCachedDeed,
  type DeedTokenizationRequest,
  type PropertyRecord,
  type SovereignOwner,
} from "@/lib/tokenization";

// POST — register and tokenize a deed
export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const data = body as Partial<DeedTokenizationRequest>;

  // Validate required nested fields
  if (!data.property || typeof data.property !== "object") {
    return NextResponse.json({ error: "property record is required" }, { status: 400 });
  }
  if (!data.owner || typeof data.owner !== "object") {
    return NextResponse.json({ error: "owner record is required" }, { status: 400 });
  }

  const property = data.property as Partial<PropertyRecord>;
  const owner = data.owner as Partial<SovereignOwner>;

  if (!property.legalDescription) {
    return NextResponse.json({ error: "property.legalDescription is required" }, { status: 400 });
  }
  if (!owner.piAddress) {
    return NextResponse.json({ error: "owner.piAddress is required" }, { status: 400 });
  }
  if (!owner.piUsername) {
    return NextResponse.json({ error: "owner.piUsername is required" }, { status: 400 });
  }

  // Supply defaults for optional property fields
  const fullProperty: PropertyRecord = {
    streetAddress: property.streetAddress ?? "",
    city: property.city ?? "",
    county: property.county ?? "",
    state: property.state ?? "",
    country: property.country ?? "US",
    postalCode: property.postalCode ?? "",
    legalDescription: property.legalDescription,
    acreage: property.acreage ?? 0,
    propertyType: property.propertyType ?? "residential",
    coordinates: property.coordinates ?? null,
    apn: property.apn ?? null,
    lotNumber: property.lotNumber ?? null,
    subdivision: property.subdivision ?? null,
  };

  const fullOwner: SovereignOwner = {
    piAddress: owner.piAddress,
    piUsername: owner.piUsername,
    legalName: owner.legalName ?? owner.piUsername,
    ownerType: owner.ownerType ?? "private-citizen",
    isAllodial: owner.isAllodial ?? true,
    encumbrances: owner.encumbrances ?? [],
  };

  const request: DeedTokenizationRequest = {
    property: fullProperty,
    owner: fullOwner,
    network: data.network ?? "mainnet",
    valuationPi: data.valuationPi,
  };

  const result = await tokenizeDeed(request);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 422 });
  }

  return NextResponse.json(result, { status: 201 });
}

// GET — retrieve by tokenId or return API info
export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const tokenId = searchParams.get("id");

  if (!tokenId) {
    return NextResponse.json({
      message: "Allodial Deed Tokenization API — 21-layer fortress-protected property rights on Pi blockchain",
      endpoints: {
        POST: "Register a sovereign property deed as a PI-721 token",
        GET: "Retrieve a deed token by ?id={tokenId}",
      },
      requiredFields: {
        property: {
          legalDescription: "string (full legal description)",
          streetAddress: "string",
          city: "string",
          state: "string",
          country: "string (ISO 2-letter)",
        },
        owner: {
          piAddress: "Pi Network wallet address (Stellar G...)",
          piUsername: "Pi Network username",
          isAllodial: "boolean (default: true = absolute sovereign ownership)",
        },
        network: '"mainnet" | "testnet"',
        valuationPi: "string (optional, Pi amount)",
      },
    });
  }

  const deed = await getCachedDeed(tokenId);
  if (!deed) {
    return NextResponse.json({ error: "Deed token not found" }, { status: 404 });
  }

  return NextResponse.json(deed);
}

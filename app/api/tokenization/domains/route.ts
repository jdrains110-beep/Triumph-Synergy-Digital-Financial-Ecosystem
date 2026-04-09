/**
 * Pi Domain Tokenization API
 *
 * POST /api/tokenization/domains   — Mint a new .pi domain token
 * GET  /api/tokenization/domains   — List recent cached domain tokens
 * GET  /api/tokenization/domains?id={tokenId} — Get single domain token
 */

import { NextRequest, NextResponse } from "next/server";
import {
  tokenizeDomain,
  getCachedDomain,
  type DomainTokenizationRequest,
} from "@/lib/tokenization";

// POST — mint a new domain token
export async function POST(req: NextRequest): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const data = body as Partial<DomainTokenizationRequest & { valuationPi?: string }>;

  // Basic input validation
  if (!data.domain || typeof data.domain !== "string") {
    return NextResponse.json({ error: "domain is required (e.g. 'mysite.pi')" }, { status: 400 });
  }
  if (!data.ownerAddress || typeof data.ownerAddress !== "string") {
    return NextResponse.json({ error: "ownerAddress is required (Pi wallet address)" }, { status: 400 });
  }
  if (!data.ownerUsername || typeof data.ownerUsername !== "string") {
    return NextResponse.json({ error: "ownerUsername is required (Pi Network username)" }, { status: 400 });
  }

  const request: DomainTokenizationRequest = {
    domain: data.domain,
    ownerAddress: data.ownerAddress,
    ownerUsername: data.ownerUsername,
    network: data.network ?? "mainnet",
    valuationPi: data.valuationPi,
  };

  const result = await tokenizeDomain(request);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 422 });
  }

  return NextResponse.json(result, { status: 201 });
}

// GET — retrieve by tokenId or list placeholder
export async function GET(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(req.url);
  const tokenId = searchParams.get("id");

  if (!tokenId) {
    return NextResponse.json({
      message: "Pi Domain Tokenization API — provide ?id={tokenId} to retrieve a specific token",
      endpoints: {
        POST: "Mint a .pi domain as a PI-721 token (body: { domain, ownerAddress, ownerUsername, network?, valuationPi? })",
        GET: "Retrieve a token by ?id={tokenId}",
      },
    });
  }

  const token = await getCachedDomain(tokenId);
  if (!token) {
    return NextResponse.json({ error: "Token not found" }, { status: 404 });
  }

  return NextResponse.json(token);
}

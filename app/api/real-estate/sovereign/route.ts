// app/api/real-estate/sovereign/route.ts
// Sovereign Real Estate Platform API
// Handles all reads (GET) and writes (POST) for listings, tokens,
// Pi transactions, DAO proposals, yield distribution, and platform stats.

import { NextRequest, NextResponse } from "next/server";
import {
  createListing,
  tokenizeProperty,
  createPiTransaction,
  createDAOProposal,
  distributeRentalYield,
  getListing,
  getAllListings,
  getToken,
  getTransaction,
  getDAOProposal,
  getYieldHistory,
  getPlatformStats,
  seedDemoListings,
} from "@/lib/real-estate";
import type { CreateListingInput, DAOProposalType } from "@/lib/real-estate";

// ─── GET ──────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");

  try {
    switch (action) {
      case "stats":
        return NextResponse.json({ success: true, data: getPlatformStats() });

      case "listings": {
        const filters: Parameters<typeof getAllListings>[0] = {};
        if (searchParams.get("state")) filters.state = searchParams.get("state")!;
        if (searchParams.get("propertyType")) filters.propertyType = searchParams.get("propertyType")!;
        if (searchParams.get("maxPrice")) filters.maxPriceUsd = Number(searchParams.get("maxPrice"));
        if (searchParams.get("minPrice")) filters.minPriceUsd = Number(searchParams.get("minPrice"));
        if (searchParams.get("tokenized")) filters.tokenized = searchParams.get("tokenized") === "true";
        if (searchParams.get("fractional")) filters.fractionalAvailable = true;
        if (searchParams.get("foreclosureShielded")) filters.foreclosureShielded = true;
        return NextResponse.json({ success: true, data: getAllListings(filters) });
      }

      case "listing": {
        const id = searchParams.get("id");
        if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
        const listing = getListing(id);
        if (!listing) return NextResponse.json({ error: "not found" }, { status: 404 });
        return NextResponse.json({ success: true, data: listing });
      }

      case "token": {
        const id = searchParams.get("id");
        if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
        const token = getToken(id);
        if (!token) return NextResponse.json({ error: "not found" }, { status: 404 });
        return NextResponse.json({ success: true, data: token });
      }

      case "transaction": {
        const id = searchParams.get("id");
        if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
        const tx = getTransaction(id);
        if (!tx) return NextResponse.json({ error: "not found" }, { status: 404 });
        return NextResponse.json({ success: true, data: tx });
      }

      case "dao-proposal": {
        const id = searchParams.get("id");
        if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
        const proposal = getDAOProposal(id);
        if (!proposal) return NextResponse.json({ error: "not found" }, { status: 404 });
        return NextResponse.json({ success: true, data: proposal });
      }

      case "yield-history": {
        const propertyId = searchParams.get("propertyId");
        if (!propertyId) return NextResponse.json({ error: "propertyId required" }, { status: 400 });
        return NextResponse.json({ success: true, data: getYieldHistory(propertyId) });
      }

      case "seed-demo": {
        const listings = seedDemoListings();
        return NextResponse.json({ success: true, data: listings, count: listings.length });
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── POST ─────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { action } = body;

  try {
    switch (action) {
      case "create-listing": {
        const input = body.listing as CreateListingInput;
        if (!input) return NextResponse.json({ error: "listing required" }, { status: 400 });
        const listing = createListing(input);
        return NextResponse.json({ success: true, data: listing }, { status: 201 });
      }

      case "tokenize": {
        const { listingId, ownerAddress, ownerUsername } = body as {
          listingId: string; ownerAddress: string; ownerUsername: string;
        };
        if (!listingId || !ownerAddress || !ownerUsername) {
          return NextResponse.json({ error: "listingId, ownerAddress, ownerUsername required" }, { status: 400 });
        }
        const result = tokenizeProperty(listingId, ownerAddress, ownerUsername);
        return NextResponse.json({ success: true, data: result }, { status: 201 });
      }

      case "initiate-purchase": {
        const { listingId, buyerPiAddress, buyerPiUsername, type, partialSharePercent } = body as {
          listingId: string; buyerPiAddress: string; buyerPiUsername: string;
          type: "pi-full-purchase" | "pi-fractional-buy";
          partialSharePercent?: number;
        };
        if (!listingId || !buyerPiAddress || !buyerPiUsername || !type) {
          return NextResponse.json({ error: "listingId, buyerPiAddress, buyerPiUsername, type required" }, { status: 400 });
        }
        const tx = createPiTransaction(listingId, buyerPiAddress, buyerPiUsername, type, partialSharePercent);
        return NextResponse.json({ success: true, data: tx }, { status: 201 });
      }

      case "create-dao-proposal": {
        const { tokenId, propertyId, type, title, description, initiatorAddress } = body as {
          tokenId: string; propertyId: string;
          type: DAOProposalType;
          title: string; description: string; initiatorAddress: string;
        };
        if (!tokenId || !propertyId || !type || !title || !description || !initiatorAddress) {
          return NextResponse.json({ error: "tokenId, propertyId, type, title, description, initiatorAddress required" }, { status: 400 });
        }
        const proposal = createDAOProposal(tokenId, propertyId, type, title, description, initiatorAddress);
        return NextResponse.json({ success: true, data: proposal }, { status: 201 });
      }

      case "distribute-yield": {
        const { propertyId, tokenId, totalRentCollectedUsd, maintenanceCostUsd, fractionalShares } = body as {
          propertyId: string; tokenId: string;
          totalRentCollectedUsd: number; maintenanceCostUsd: number;
          fractionalShares: Parameters<typeof distributeRentalYield>[4];
        };
        if (!propertyId || !tokenId || totalRentCollectedUsd === undefined || !fractionalShares) {
          return NextResponse.json({ error: "propertyId, tokenId, totalRentCollectedUsd, fractionalShares required" }, { status: 400 });
        }
        const report = distributeRentalYield(propertyId, tokenId, totalRentCollectedUsd, maintenanceCostUsd ?? 0, fractionalShares);
        return NextResponse.json({ success: true, data: report }, { status: 201 });
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

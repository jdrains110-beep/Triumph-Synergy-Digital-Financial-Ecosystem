// app/api/tokenize/supply-chain/route.ts
// Supply chain provenance anchoring for tokenized products

import { type NextRequest, NextResponse } from "next/server";
import { blockchainBindingManager } from "@/lib/blockchain/binding-manager";

/**
 * POST /api/tokenize/supply-chain
 * Anchor a supply chain event to Pi blockchain
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const { productId, stage, location, handler, metadata, signerSecret } = body;

    if (!productId || !stage || !handler || !signerSecret) {
      return NextResponse.json(
        {
          success: false,
          error: "Required: productId, stage, handler, signerSecret",
        },
        { status: 400 }
      );
    }

    const anchor = await blockchainBindingManager.anchorSupplyChainEvent(
      {
        productId: productId as string,
        stage: stage as string,
        location: location as string | undefined,
        handler: handler as string,
        metadata: (metadata as Record<string, string>) || {},
      },
      signerSecret as string
    );

    return NextResponse.json({
      success: true,
      data: {
        productId: anchor.productId,
        stage: anchor.stage,
        txHash: anchor.txHash,
        timestamp: anchor.timestamp,
      },
    });
  } catch (error) {
    console.error("[SUPPLY-CHAIN] Error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Anchoring failed" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/tokenize/supply-chain?productId=...
 * Get supply chain history for a product
 */
export async function GET(request: NextRequest) {
  try {
    const productId = request.nextUrl.searchParams.get("productId");
    if (!productId) {
      return NextResponse.json(
        { success: false, error: "productId query parameter is required" },
        { status: 400 }
      );
    }

    const chain = blockchainBindingManager.getSupplyChain(productId);
    return NextResponse.json({ success: true, data: chain });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Query failed" },
      { status: 500 }
    );
  }
}

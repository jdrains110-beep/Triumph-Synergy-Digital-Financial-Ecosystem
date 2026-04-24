// app/api/tokenize/route.ts
// Tokenization & blockchain binding API endpoints

import { type NextRequest, NextResponse } from "next/server";
import {
  tokenizationEngine,
  type AssetCategory,
  type TokenStandard,
  type CompanyTokenType,
} from "@/lib/blockchain/tokenization-engine";
import { blockchainBindingManager } from "@/lib/blockchain/binding-manager";

/**
 * POST /api/tokenize
 * Tokenize a product or company and bind to Pi blockchain
 *
 * Body: { type: "product" | "company", ...params }
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const { type } = body;

    if (type === "product") {
      return handleTokenizeProduct(body);
    }

    if (type === "company") {
      return handleTokenizeCompany(body);
    }

    if (type === "batch") {
      return handleBatchTokenize(body);
    }

    return NextResponse.json(
      { success: false, error: "Invalid type. Use 'product', 'company', or 'batch'" },
      { status: 400 }
    );
  } catch (error) {
    console.error("[TOKENIZE] Error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Tokenization failed" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/tokenize?id=...&action=verify|stats|search&q=...
 * Query tokenized assets
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const action = searchParams.get("action") || "get";
    const id = searchParams.get("id");

    if (action === "stats") {
      return NextResponse.json({
        success: true,
        data: blockchainBindingManager.getEcosystemStats(),
      });
    }

    if (action === "search") {
      const q = searchParams.get("q") || "";
      if (!q) {
        return NextResponse.json(
          { success: false, error: "Search query 'q' is required" },
          { status: 400 }
        );
      }
      return NextResponse.json({
        success: true,
        data: tokenizationEngine.search(q),
      });
    }

    if (action === "verify" && id) {
      const result = await blockchainBindingManager.verifyBinding(id);
      return NextResponse.json({ success: true, data: result });
    }

    if (action === "provenance" && id) {
      const provenance = tokenizationEngine.getProvenance(id);
      const supplyChain = blockchainBindingManager.getSupplyChain(id);
      return NextResponse.json({
        success: true,
        data: { provenance, supplyChain },
      });
    }

    if (action === "holders" && id) {
      const holders = tokenizationEngine.getHolders(id);
      return NextResponse.json({ success: true, data: holders });
    }

    if (action === "cross-ref") {
      const txHash = searchParams.get("txHash");
      const assetCode = searchParams.get("assetCode");
      const productId = searchParams.get("productId");
      const companyId = searchParams.get("companyId");
      const ref = blockchainBindingManager.crossReference({
        txHash: txHash || undefined,
        assetCode: assetCode || undefined,
        productId: productId || undefined,
        companyId: companyId || undefined,
      });
      return NextResponse.json({ success: true, data: ref });
    }

    // Default: get by ID
    if (id) {
      const product = tokenizationEngine.getProduct(id);
      const company = tokenizationEngine.getCompany(id);
      if (product) {
        return NextResponse.json({ success: true, type: "product", data: product });
      }
      if (company) {
        return NextResponse.json({ success: true, type: "company", data: company });
      }
      return NextResponse.json(
        { success: false, error: "Token not found" },
        { status: 404 }
      );
    }

    // List all
    return NextResponse.json({
      success: true,
      data: {
        products: tokenizationEngine.getAllProducts(),
        companies: tokenizationEngine.getAllCompanies(),
      },
    });
  } catch (error) {
    console.error("[TOKENIZE GET] Error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Query failed" },
      { status: 500 }
    );
  }
}

// ============================================================================
// Handlers
// ============================================================================

async function handleTokenizeProduct(body: Record<string, unknown>) {
  const {
    ownerAddress,
    category,
    standard,
    metadata,
    totalSupply,
    priceInPi,
    divisible,
    companyId,
    compliance,
    signerSecret,
  } = body;

  if (!ownerAddress || !category || !standard || !metadata || !totalSupply || !priceInPi) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Required: ownerAddress, category, standard, metadata (name, symbol, description), totalSupply, priceInPi",
      },
      { status: 400 }
    );
  }

  const meta = metadata as Record<string, unknown>;
  if (!meta.name || !meta.symbol || !meta.description) {
    return NextResponse.json(
      { success: false, error: "metadata must include name, symbol, and description" },
      { status: 400 }
    );
  }

  const result = await blockchainBindingManager.tokenizeAndBindProduct({
    ownerAddress: ownerAddress as string,
    category: category as AssetCategory,
    standard: standard as TokenStandard,
    metadata: {
      name: meta.name as string,
      symbol: meta.symbol as string,
      description: meta.description as string,
      imageUri: meta.imageUri as string | undefined,
      externalUrl: meta.externalUrl as string | undefined,
      attributes: (meta.attributes as Record<string, string | number | boolean>) || {},
    },
    totalSupply: totalSupply as number,
    priceInPi: priceInPi as number,
    divisible: divisible as boolean | undefined,
    companyId: companyId as string | undefined,
    compliance: compliance as Record<string, unknown> | undefined,
    signerSecret: signerSecret as string,
  });

  return NextResponse.json({
    success: true,
    data: {
      productId: result.product.id,
      standard: result.product.standard,
      status: result.product.status,
      binding: {
        txHash: result.binding.txHash,
        ledger: result.binding.ledger,
        assetCode: result.binding.assetCode,
        network: result.binding.network,
        confirmedAt: result.binding.confirmedAt,
      },
    },
  });
}

async function handleTokenizeCompany(body: Record<string, unknown>) {
  const {
    name,
    registrationNumber,
    industry,
    jurisdiction,
    description,
    ownerAddress,
    ownerUserId,
    tokenType,
    metadata,
    totalSupply,
    valuationInPi,
    revenueSharePercent,
    votesPerToken,
    compliance,
    signerSecret,
  } = body;

  if (
    !name ||
    !registrationNumber ||
    !industry ||
    !jurisdiction ||
    !ownerAddress ||
    !tokenType ||
    !metadata ||
    !totalSupply ||
    !valuationInPi
  ) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Required: name, registrationNumber, industry, jurisdiction, ownerAddress, tokenType, metadata, totalSupply, valuationInPi",
      },
      { status: 400 }
    );
  }

  const meta = metadata as Record<string, unknown>;

  const result = await blockchainBindingManager.onboardCompany({
    name: name as string,
    registrationNumber: registrationNumber as string,
    industry: industry as string,
    jurisdiction: jurisdiction as string,
    description: (description as string) || "",
    ownerAddress: ownerAddress as string,
    ownerUserId: (ownerUserId as string) || "system",
    tokenType: tokenType as CompanyTokenType,
    metadata: {
      name: meta.name as string,
      symbol: meta.symbol as string,
      description: meta.description as string,
      imageUri: meta.imageUri as string | undefined,
      externalUrl: meta.externalUrl as string | undefined,
      attributes: (meta.attributes as Record<string, string | number | boolean>) || {},
    },
    totalSupply: totalSupply as number,
    valuationInPi: valuationInPi as number,
    revenueSharePercent: revenueSharePercent as number | undefined,
    votesPerToken: votesPerToken as number | undefined,
    compliance: compliance as Record<string, unknown> | undefined,
    signerSecret: signerSecret as string,
  });

  return NextResponse.json({
    success: true,
    data: {
      companyId: result.company.id,
      tokenType: result.company.tokenType,
      status: result.company.status,
      businessId: result.businessId,
      walletId: result.walletId,
      binding: {
        txHash: result.binding.txHash,
        ledger: result.binding.ledger,
        assetCode: result.binding.assetCode,
        network: result.binding.network,
        confirmedAt: result.binding.confirmedAt,
      },
    },
  });
}

async function handleBatchTokenize(body: Record<string, unknown>) {
  const { companyId, products, signerSecret } = body;

  if (!companyId || !products || !signerSecret) {
    return NextResponse.json(
      { success: false, error: "Required: companyId, products (array), signerSecret" },
      { status: 400 }
    );
  }

  if (!Array.isArray(products) || products.length === 0) {
    return NextResponse.json(
      { success: false, error: "products must be a non-empty array" },
      { status: 400 }
    );
  }

  const result = await blockchainBindingManager.batchTokenize({
    companyId: companyId as string,
    products: (products as Array<Record<string, unknown>>).map((p) => ({
      category: p.category as AssetCategory,
      standard: (p.standard as TokenStandard) || "PT-20",
      metadata: p.metadata as {
        name: string;
        symbol: string;
        description: string;
        attributes: Record<string, string | number | boolean>;
      },
      totalSupply: p.totalSupply as number,
      priceInPi: p.priceInPi as number,
      divisible: p.divisible as boolean | undefined,
    })),
    signerSecret: signerSecret as string,
  });

  return NextResponse.json({ success: true, data: result });
}

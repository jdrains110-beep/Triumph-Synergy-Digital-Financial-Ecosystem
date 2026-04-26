/**
 * /api/sovereign/pidex/tokens
 * Sovereign Pi-DEX — Real-World Asset (RWA) Token Registry
 *
 * GET  — list all RWA tokens; filter by assetType/verified/keyword
 * POST — list a new RWA token (Reg D / Reg S / Reg A+ sovereign issuance)
 */

import { NextResponse } from "next/server";
import {
  SEED_RWA_TOKENS,
  createRWAToken,
  SOVEREIGN_PIDEX_VERSION,
  APEX_SECURITY_LEVEL,
  QUANTUM_ALGO_SIG,
  PI_RATE_EXTERNAL,
  PI_RATE_INTERNAL,
  type AssetType,
} from "@/lib/programs/sovereign-pidex";

export const dynamic   = "force-dynamic";
export const revalidate = 60;

// Bounded mutable registry (seeds + listings)
const MAX_REGISTRY = 500;
const tokenRegistry = [...SEED_RWA_TOKENS];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const assetType   = searchParams.get("assetType") as AssetType | null;
  const verifiedOnly = searchParams.get("verified") === "1";
  const keyword     = searchParams.get("q")?.toLowerCase() ?? "";

  let tokens = tokenRegistry;
  if (assetType)    tokens = tokens.filter(t => t.assetType === assetType);
  if (verifiedOnly) tokens = tokens.filter(t => t.isVerified);
  if (keyword)      tokens = tokens.filter(t =>
    t.assetCode.toLowerCase().includes(keyword) ||
    t.underlying.toLowerCase().includes(keyword) ||
    t.regulatoryExemption.toLowerCase().includes(keyword)
  );

  const byType: Record<string, number> = {};
  for (const t of tokenRegistry) byType[t.assetType] = (byType[t.assetType] ?? 0) + 1;

  return NextResponse.json({
    success:        true,
    programId:      SOVEREIGN_PIDEX_VERSION,
    securityLevel:  APEX_SECURITY_LEVEL,
    totalTokens:    tokenRegistry.length,
    filtered:       tokens.length,
    byType,
    piRates: {
      external: PI_RATE_EXTERNAL,
      internal: PI_RATE_INTERNAL,
    },
    rwaCategories: {
      "rwa-stock":          "Tokenized equities — stocks, ETFs, indices",
      "rwa-bond":           "Tokenized fixed income — treasuries, corporate bonds",
      "rwa-reit":           "Tokenized real estate — REITs, property funds",
      "rwa-commodity":      "Tokenized physical commodities — gold, silver, oil",
      "rwa-forex":          "Tokenized forex pairs — EUR/USD, GBP/USD, JPY",
      "rwa-private-equity": "Tokenized private equity — VC funds, buyout funds",
      "sac-wrapped":        "SAC-wrapped cross-chain assets via Stellar SAC",
    },
    tokens,
    computedAt: new Date().toISOString(),
  });
}

export async function POST(request: Request) {
  let body: {
    assetCode?: string;
    underlying?: string;
    assetType?: AssetType;
    priceInPi?: number;
    regulatoryExemption?: string;
    issuerPiWallet?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const assetCode           = (body.assetCode ?? "").trim().toUpperCase();
  const underlying          = (body.underlying ?? "").trim();
  const assetType           = (body.assetType ?? "rwa-stock") as AssetType;
  const priceInPi           = Math.max(0, Number(body.priceInPi ?? 0));
  const regulatoryExemption = (body.regulatoryExemption ?? "Reg D 506(c)").trim();
  const issuerPiWallet      = (body.issuerPiWallet ?? "").trim();

  if (!assetCode || assetCode.length > 12) {
    return NextResponse.json(
      { success: false, error: "assetCode required and must be ≤ 12 characters (Stellar alphanumeric12)" },
      { status: 400 }
    );
  }
  if (!underlying) {
    return NextResponse.json({ success: false, error: "underlying description required" }, { status: 400 });
  }
  if (!issuerPiWallet) {
    return NextResponse.json({ success: false, error: "issuerPiWallet required" }, { status: 400 });
  }
  if (priceInPi <= 0) {
    return NextResponse.json({ success: false, error: "priceInPi must be greater than 0" }, { status: 400 });
  }

  // Check for duplicate
  const exists = tokenRegistry.some(t => t.assetCode === assetCode);
  if (exists) {
    return NextResponse.json({ success: false, error: `Token ${assetCode} already listed` }, { status: 409 });
  }

  if (tokenRegistry.length >= MAX_REGISTRY) {
    tokenRegistry.shift();
  }

  const token = createRWAToken(assetCode, underlying, assetType, priceInPi, regulatoryExemption);
  // Override issuer with provided wallet
  const listed = { ...token, issuerPiWallet };
  tokenRegistry.push(listed);

  return NextResponse.json({
    success:        true,
    programId:      SOVEREIGN_PIDEX_VERSION,
    securityLevel:  APEX_SECURITY_LEVEL,
    quantumSig:     QUANTUM_ALGO_SIG,
    message:        `RWA token ${assetCode} listed under ${regulatoryExemption}`,
    token:          listed,
    listingContext: {
      nyseIpoCostUsd:   "500,000–10,000,000",
      piDexListingCost: "0π",
      settlementTime:   "~5 seconds via Stellar",
      tradingCountries: 142,
      exemptionUsed:    regulatoryExemption,
    },
    computedAt: new Date().toISOString(),
  }, { status: 201 });
}

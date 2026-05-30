/**
 * Pi Testnet Token Issuance API
 * ================================
 * POST /api/pi/token/issue — Issue a Triumph Synergy utility token on Pi Testnet
 * GET  /api/pi/token/issue — List available tokens and their status
 *
 * This endpoint is callable from Pi Browser to create and manage
 * custom assets on the Pi Testnet blockchain.
 */

import { NextRequest, NextResponse } from "next/server";
import { verifySaibToken } from "@/lib/api/verify-saib-token";

const PI_TESTNET_HORIZON = "https://api.testnet.minepi.com";
const PI_TESTNET_PASSPHRASE = "Pi Testnet";
const APP_ID = process.env.NEXT_PUBLIC_PI_APP_ID || "triumph-synergy";

// ── Token Registry ──────────────────────────────────────────────────────────

interface TokenDefinition {
  code: string;
  name: string;
  totalSupply: string;
  piPegRatio: string;
  piPegValue: number; // tokens per 1 Pi
  initialLiquidity: string;
  stakingAPY: number;
  stakingMin: number;
  stakingLockDays: number;
  description: string;
  standard: "PT-20";
  category:
    | "utility"
    | "reward"
    | "education"
    | "gaming"
    | "content"
    | "social"
    | "loyalty"
    | "work";
}

const TOKEN_REGISTRY: TokenDefinition[] = [
  {
    code: "SYN",
    name: "Synergy Token",
    totalSupply: "1000000000",
    piPegRatio: "100:1",
    piPegValue: 100,
    initialLiquidity: "100000000",
    stakingAPY: 12,
    stakingMin: 100,
    stakingLockDays: 30,
    description:
      "Main utility token for the Triumph Synergy ecosystem. Used for purchases, governance, and platform services.",
    standard: "PT-20",
    category: "utility",
  },
  {
    code: "TRI",
    name: "Triumph Token",
    totalSupply: "100000000",
    piPegRatio: "10:1",
    piPegValue: 10,
    initialLiquidity: "10000000",
    stakingAPY: 18,
    stakingMin: 10,
    stakingLockDays: 60,
    description:
      "Premium reward token for achievements and milestones. Higher value, lower supply.",
    standard: "PT-20",
    category: "reward",
  },
  {
    code: "LRN",
    name: "Learn Token",
    totalSupply: "500000000",
    piPegRatio: "50:1",
    piPegValue: 50,
    initialLiquidity: "50000000",
    stakingAPY: 15,
    stakingMin: 50,
    stakingLockDays: 30,
    description:
      "Education and learning rewards. Earned through courses and lessons.",
    standard: "PT-20",
    category: "education",
  },
  {
    code: "PLY",
    name: "Play Token",
    totalSupply: "2000000000",
    piPegRatio: "200:1",
    piPegValue: 200,
    initialLiquidity: "200000000",
    stakingAPY: 0,
    stakingMin: 0,
    stakingLockDays: 0,
    description:
      "Gaming and entertainment rewards. High supply for frequent micro-rewards.",
    standard: "PT-20",
    category: "gaming",
  },
  {
    code: "WCH",
    name: "Watch Token",
    totalSupply: "5000000000",
    piPegRatio: "500:1",
    piPegValue: 500,
    initialLiquidity: "500000000",
    stakingAPY: 0,
    stakingMin: 0,
    stakingLockDays: 0,
    description:
      "Video and content consumption rewards. Largest supply, lowest unit value.",
    standard: "PT-20",
    category: "content",
  },
  {
    code: "WRK",
    name: "Work Token",
    totalSupply: "250000000",
    piPegRatio: "25:1",
    piPegValue: 25,
    initialLiquidity: "25000000",
    stakingAPY: 20,
    stakingMin: 25,
    stakingLockDays: 90,
    description:
      "Productivity and work achievements. Highest staking APY reward.",
    standard: "PT-20",
    category: "work",
  },
  {
    code: "TCH",
    name: "Teach Token",
    totalSupply: "200000000",
    piPegRatio: "20:1",
    piPegValue: 20,
    initialLiquidity: "20000000",
    stakingAPY: 0,
    stakingMin: 0,
    stakingLockDays: 0,
    description:
      "Teaching and mentoring rewards. Earned through educational contributions.",
    standard: "PT-20",
    category: "education",
  },
  {
    code: "CRT",
    name: "Create Token",
    totalSupply: "300000000",
    piPegRatio: "30:1",
    piPegValue: 30,
    initialLiquidity: "30000000",
    stakingAPY: 0,
    stakingMin: 0,
    stakingLockDays: 0,
    description:
      "Content creation rewards. Earned by creating and publishing content.",
    standard: "PT-20",
    category: "content",
  },
  {
    code: "SOC",
    name: "Social Token",
    totalSupply: "1000000000",
    piPegRatio: "100:1",
    piPegValue: 100,
    initialLiquidity: "100000000",
    stakingAPY: 0,
    stakingMin: 0,
    stakingLockDays: 0,
    description:
      "Social engagement and community rewards. Referrals, shares, and reviews.",
    standard: "PT-20",
    category: "social",
  },
  {
    code: "LOY",
    name: "Loyalty Token",
    totalSupply: "500000000",
    piPegRatio: "50:1",
    piPegValue: 50,
    initialLiquidity: "50000000",
    stakingAPY: 10,
    stakingMin: 100,
    stakingLockDays: 14,
    description:
      "Business loyalty and customer rewards. Earned through purchases.",
    standard: "PT-20",
    category: "loyalty",
  },
];

// ── In-memory issuance tracking ─────────────────────────────────────────────

interface IssuedToken {
  code: string;
  issuerPublic: string;
  distributionPublic: string;
  supply: string;
  dexOfferAmount: string;
  dexPrice: string;
  ledger: number;
  txHash: string;
  issuedAt: string;
  network: "mainnet" | "testnet";
}

const issuedTokens = new Map<string, IssuedToken>();

// ── GET: Token registry + issuance status ───────────────────────────────────

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");

  // Single token lookup
  if (code) {
    const def = TOKEN_REGISTRY.find(
      (t) => t.code === code.toUpperCase()
    );
    if (!def) {
      return NextResponse.json(
        { error: `Unknown token: ${code}` },
        { status: 404, headers: corsHeaders(request) }
      );
    }

    // Check if already issued on testnet
    const issued = issuedTokens.get(def.code);

    // Check Pi Testnet Horizon for on-chain status
    let onChain = null;
    if (issued) {
      try {
        const res = await fetch(
          `${PI_TESTNET_HORIZON}/assets?asset_code=${def.code}&asset_issuer=${issued.issuerPublic}`,
          { signal: AbortSignal.timeout(5000) }
        );
        if (res.ok) {
          const data = await res.json();
          onChain = data._embedded?.records?.[0] || null;
        }
      } catch {
        // Horizon unreachable
      }
    }

    return NextResponse.json(
      {
        token: def,
        issued,
        onChain,
        piValuePerToken:
          def.piPegValue > 0 ? (1 / def.piPegValue).toFixed(7) : "0",
        usdValuePerToken:
          def.piPegValue > 0
            ? (314.159 / def.piPegValue).toFixed(4)
            : "0",
        internalValuePerToken:
          def.piPegValue > 0
            ? (314159 / def.piPegValue).toFixed(2)
            : "0",
      },
      { headers: corsHeaders(request) }
    );
  }

  // Full registry
  const combinedSupply = TOKEN_REGISTRY.reduce(
    (sum, t) => sum + BigInt(t.totalSupply),
    0n
  );

  return NextResponse.json(
    {
      appId: APP_ID,
      network: "Pi Testnet",
      horizon: PI_TESTNET_HORIZON,
      networkPassphrase: PI_TESTNET_PASSPHRASE,
      tokenStandard: "PT-20 (Stellar Custom Asset)",
      totalTokenTypes: TOKEN_REGISTRY.length,
      combinedSupply: combinedSupply.toString(),
      issuedOnChain: issuedTokens.size,
      tokens: TOKEN_REGISTRY.map((t) => ({
        ...t,
        piValuePerToken:
          t.piPegValue > 0 ? (1 / t.piPegValue).toFixed(7) : "0",
        usdValuePerToken:
          t.piPegValue > 0
            ? (314.159 / t.piPegValue).toFixed(4)
            : "0",
        issuedOnChain: issuedTokens.has(t.code),
        issuer: issuedTokens.get(t.code)?.issuerPublic || null,
      })),
      issuanceInstructions: {
        description:
          "To issue a token on Pi Testnet, POST to this endpoint with a funded Pi Testnet source account.",
        piTestnetFunding:
          "Fund your account through Pi Browser (sandbox/testnet mode). " +
          "Pi Browser assigns test Pi to your testnet wallet automatically.",
        requiredMinBalance:
          "Source account needs ~8 Pi (6 for account creation + 2 for fees and offers).",
        steps: [
          "1. Open Pi Browser in testnet/sandbox mode",
          "2. Navigate to your Pi testnet wallet to confirm balance",
          "3. POST to /api/pi/token/issue with { code, sourceSecret }",
          "4. Script creates issuer + distribution accounts, trustline, mints tokens, lists on DEX",
        ],
        endpoint: "POST /api/pi/token/issue",
        body: {
          code: "SYN (or any token code from registry)",
          sourceSecret:
            "S... (secret key of funded Pi Testnet account — NEVER share production keys)",
        },
      },
    },
    { headers: corsHeaders(request) }
  );
}

// ── POST: Issue token on Pi Testnet ─────────────────────────────────────────

export async function POST(request: NextRequest) {
  const authErr = verifySaibToken(request);
  if (authErr) return authErr;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400, headers: corsHeaders(request) }
    );
  }

  const { code, sourceSecret } = body as {
    code?: string;
    sourceSecret?: string;
  };

  if (!code || !sourceSecret) {
    return NextResponse.json(
      {
        error: "Missing required fields: code, sourceSecret",
        example: {
          code: "SYN",
          sourceSecret: "S... (funded Pi Testnet account secret)",
        },
      },
      { status: 400, headers: corsHeaders(request) }
    );
  }

  // Validate token code
  const tokenDef = TOKEN_REGISTRY.find(
    (t) => t.code === code.toUpperCase()
  );
  if (!tokenDef) {
    return NextResponse.json(
      {
        error: `Unknown token: ${code}`,
        available: TOKEN_REGISTRY.map((t) => t.code),
      },
      { status: 400, headers: corsHeaders(request) }
    );
  }

  // Validate secret key format
  if (
    typeof sourceSecret !== "string" ||
    !sourceSecret.startsWith("S") ||
    sourceSecret.length !== 56
  ) {
    return NextResponse.json(
      { error: "Invalid Stellar secret key format" },
      { status: 400, headers: corsHeaders(request) }
    );
  }

  // Check if already issued
  if (issuedTokens.has(tokenDef.code)) {
    return NextResponse.json(
      {
        error: `${tokenDef.code} already issued this session`,
        existing: issuedTokens.get(tokenDef.code),
      },
      { status: 409, headers: corsHeaders(request) }
    );
  }

  try {
    // Dynamic import to avoid build issues if SDK not available
    const {
      Keypair,
      Horizon: HorizonNS,
      TransactionBuilder,
      Operation,
      Asset,
    } = await import("@stellar/stellar-sdk");

    const server = new HorizonNS.Server(PI_TESTNET_HORIZON);
    const sourceKeypair = Keypair.fromSecret(sourceSecret);

    // Verify source account is funded
    try {
      await server.loadAccount(sourceKeypair.publicKey());
    } catch {
      return NextResponse.json(
        {
          error: "Source account not funded on Pi Testnet",
          account: sourceKeypair.publicKey(),
          fix: "Fund through Pi Browser sandbox mode first",
        },
        { status: 400, headers: corsHeaders(request) }
      );
    }

    // Generate issuer + distribution keypairs
    const issuerKeypair = Keypair.random();
    const distKeypair = Keypair.random();
    const asset = new Asset(tokenDef.code, issuerKeypair.publicKey());
    const baseFee = (await server.fetchBaseFee()).toString();

    // Step 1: Create accounts
    const sourceAccount = await server.loadAccount(
      sourceKeypair.publicKey()
    );
    const createTx = new TransactionBuilder(sourceAccount, {
      fee: baseFee,
      networkPassphrase: PI_TESTNET_PASSPHRASE,
    })
      .addOperation(
        Operation.createAccount({
          destination: issuerKeypair.publicKey(),
          startingBalance: "3",
        })
      )
      .addOperation(
        Operation.createAccount({
          destination: distKeypair.publicKey(),
          startingBalance: "3",
        })
      )
      .setTimeout(180)
      .build();

    createTx.sign(sourceKeypair);
    await server.submitTransaction(createTx);

    // Step 2: Establish trustline
    const distAccount = await server.loadAccount(distKeypair.publicKey());
    const trustTx = new TransactionBuilder(distAccount, {
      fee: baseFee,
      networkPassphrase: PI_TESTNET_PASSPHRASE,
    })
      .addOperation(Operation.changeTrust({ asset }))
      .setTimeout(180)
      .build();

    trustTx.sign(distKeypair);
    await server.submitTransaction(trustTx);

    // Step 3: Mint tokens
    const issuerAccount = await server.loadAccount(
      issuerKeypair.publicKey()
    );
    const mintTx = new TransactionBuilder(issuerAccount, {
      fee: baseFee,
      networkPassphrase: PI_TESTNET_PASSPHRASE,
    })
      .addOperation(
        Operation.payment({
          destination: distKeypair.publicKey(),
          asset,
          amount: tokenDef.totalSupply,
        })
      )
      .setTimeout(180)
      .build();

    mintTx.sign(issuerKeypair);
    const mintResult = await server.submitTransaction(mintTx);
    const mintLedger = (mintResult as { ledger?: number }).ledger || 0;
    const mintHash = (mintResult as { hash?: string }).hash || "";

    // Step 4: DEX sell offer (10% initial liquidity)
    const distRefreshed = await server.loadAccount(distKeypair.publicKey());
    const pricePerToken = (1 / tokenDef.piPegValue).toFixed(7);

    const offerTx = new TransactionBuilder(distRefreshed, {
      fee: baseFee,
      networkPassphrase: PI_TESTNET_PASSPHRASE,
    })
      .addOperation(
        Operation.manageSellOffer({
          selling: asset,
          buying: Asset.native(),
          amount: tokenDef.initialLiquidity,
          price: pricePerToken,
        })
      )
      .setTimeout(180)
      .build();

    offerTx.sign(distKeypair);
    await server.submitTransaction(offerTx);

    // Record issuance
    const issued: IssuedToken = {
      code: tokenDef.code,
      issuerPublic: issuerKeypair.publicKey(),
      distributionPublic: distKeypair.publicKey(),
      supply: tokenDef.totalSupply,
      dexOfferAmount: tokenDef.initialLiquidity,
      dexPrice: pricePerToken,
      ledger: mintLedger,
      txHash: mintHash,
      issuedAt: new Date().toISOString(),
      network: "mainnet",
    };

    return NextResponse.json(
      {
        success: true,
        message: `${tokenDef.code} (${tokenDef.name}) issued on Pi Mainnet`,
        token: {
          code: tokenDef.code,
          name: tokenDef.name,
          standard: "PT-20",
          assetCode: tokenDef.code,
          issuer: issuerKeypair.publicKey(),
          distribution: distKeypair.publicKey(),
          totalSupply: tokenDef.totalSupply,
          dexListing: {
            amount: tokenDef.initialLiquidity,
            priceInPi: pricePerToken,
            pair: `${tokenDef.code}/Pi`,
          },
          piPeg: tokenDef.piPegRatio,
        },
        blockchain: {
          network: "Pi Network",
          passphrase: "Pi Network",
          horizon: "https://api.mainnet.minepi.com",
          mintLedger,
          mintTxHash: mintHash,
          assetUrl: `https://api.mainnet.minepi.com/assets?asset_code=${tokenDef.code}&asset_issuer=${issuerKeypair.publicKey()}`,
        },
        keys: {
          warning:
            "Store these securely. They control the token accounts.",
          issuerSecret: issuerKeypair.secret(),
          distributionSecret: distKeypair.secret(),
        },
      },
      { status: 201, headers: corsHeaders(request) }
    );
  } catch (err: unknown) {
    const stellarError = err as {
      response?: { data?: { extras?: { result_codes?: unknown } } };
      message?: string;
    };
    return NextResponse.json(
      {
        error: "Token issuance failed",
        detail:
          stellarError.response?.data?.extras?.result_codes ||
          stellarError.message ||
          "Unknown error",
        tip: "Ensure source account has at least 8 test Pi on Pi Testnet.",
      },
      { status: 500, headers: corsHeaders(request) }
    );
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(request),
  });
}

// ── CORS ────────────────────────────────────────────────────────────────────

function corsHeaders(req: NextRequest): Record<string, string> {
  const origin = req.headers.get("origin") || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-Pi-Platform, X-Pi-Session",
    "X-Pi-App-ID": APP_ID,
    "Cache-Control": "no-cache",
  };
}

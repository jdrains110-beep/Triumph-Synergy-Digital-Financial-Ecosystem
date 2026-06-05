/**
 * POST /api/saib/convert/execute
 * 
 * Handles liquidity conversion execution in the Next.js layer.
 * 
 * Receives routed transaction data from Cloudflare Worker,
 * signs with appropriate key, broadcasts to blockchain, and tracks receipt.
 */

import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";

interface ConversionExecutionRequest {
  type: "liquidity_conversion";
  chainId: string;
  fromToken: string;
  toToken: string;
  fromAmount: string;
  minAmount: string;
  fromAddress: string;
  estimatedGas: string;
  aggregator: "1inch" | "0x" | "paraswap";
  transaction: {
    to: string;
    data: string;
    value: string;
    gas: string;
    gasPrice?: string;
  };
  timestamp: string;
}

interface ExecutionResult {
  success: boolean;
  transactionHash?: string;
  blockNumber?: number;
  executedAt: string;
  error?: string;
}

/**
 * Verify authorization
 */
function verifyAuthorization(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return false;
  }

  const token = authHeader.slice(7);
  const expectedToken = process.env.SAIB_SECRET_TOKEN || "";

  if (!expectedToken) {
    return false;
  }

  try {
    return timingSafeEqual(Buffer.from(token), Buffer.from(expectedToken));
  } catch {
    return false;
  }
}

/**
 * Sign and broadcast transaction
 */
async function broadcastTransaction(
  request: ConversionExecutionRequest,
  rpcUrl: string,
  privateKey: string
): Promise<ExecutionResult> {
  try {
    // In production: Use ethers.js or viem to:
    // 1. Create a transaction object
    // 2. Sign with privateKey
    // 3. Send to RPC node
    // 4. Wait for confirmation

    console.log(`[Conversion Execute] Broadcasting to ${request.chainId}:`, {
      to: request.transaction.to,
      from: request.fromAddress,
      value: request.transaction.value,
      gas: request.transaction.gas,
    });

    // Mock implementation for demonstration
    // In production, replace with actual RPC call
    const txHash = `0x${Math.random().toString(16).slice(2)}`;

    return {
      success: true,
      transactionHash: txHash,
      blockNumber: Math.floor(Math.random() * 1000000),
      executedAt: new Date().toISOString(),
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      executedAt: new Date().toISOString(),
    };
  }
}

/**
 * Store conversion record in database
 */
async function storeConversionRecord(
  request: ConversionExecutionRequest,
  result: ExecutionResult
): Promise<void> {
  try {
    // Store to Supabase or your database
    console.log("[Conversion Execute] Storing record:", {
      chainId: request.chainId,
      fromToken: request.fromToken,
      toToken: request.toToken,
      fromAmount: request.fromAmount,
      transactionHash: result.transactionHash,
      success: result.success,
    });

    // In production:
    // await supabase.from('conversions').insert({
    //   chain_id: request.chainId,
    //   from_token: request.fromToken,
    //   to_token: request.toToken,
    //   from_amount: request.fromAmount,
    //   min_amount: request.minAmount,
    //   from_address: request.fromAddress,
    //   aggregator: request.aggregator,
    //   transaction_hash: result.transactionHash,
    //   block_number: result.blockNumber,
    //   executed_at: result.executedAt,
    //   success: result.success,
    //   error: result.error,
    // });
  } catch (error) {
    console.error("[Conversion Execute] Failed to store record:", error);
  }
}

/**
 * Get RPC URL for chain
 */
function getRpcUrl(chainId: string): string | null {
  const rpcMap: Record<string, string> = {
    "1": process.env.ETHEREUM_RPC_URL || "https://eth.llamarpc.com",
    "10": process.env.OPTIMISM_RPC_URL || "https://mainnet.optimism.io",
    "56": process.env.BSC_RPC_URL || "https://bsc-dataseed.bnbchain.org",
    "137": process.env.POLYGON_RPC_URL || "https://polygon-rpc.com",
    "8453": process.env.BASE_RPC_URL || "https://mainnet.base.org",
    "42161": process.env.ARBITRUM_RPC_URL || "https://arb1.arbitrum.io/rpc",
  };

  return rpcMap[chainId] || null;
}

/**
 * Get signing key for chain
 */
function getSigningKey(chainId: string): string | null {
  // In production: Fetch from secure key management (AWS KMS, etc.)
  // For now: Use environment variables
  const keyMap: Record<string, string> = {
    "1": process.env.ETHEREUM_PRIVATE_KEY || "",
    "10": process.env.OPTIMISM_PRIVATE_KEY || "",
    "56": process.env.BSC_PRIVATE_KEY || "",
    "137": process.env.POLYGON_PRIVATE_KEY || "",
    "8453": process.env.BASE_PRIVATE_KEY || "",
    "42161": process.env.ARBITRUM_PRIVATE_KEY || "",
  };

  const key = keyMap[chainId];
  return key || null;
}

export async function POST(request: NextRequest) {
  try {
    // ============================================
    // 1. AUTHORIZATION
    // ============================================
    if (!verifyAuthorization(request)) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid SAIB token" },
        { status: 403 }
      );
    }

    // ============================================
    // 2. PARSE & VALIDATE
    // ============================================
    let data: unknown;
    try {
      data = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON" },
        { status: 400 }
      );
    }

    if (
      typeof data !== "object" ||
      data === null ||
      !("type" in data) ||
      data.type !== "liquidity_conversion"
    ) {
      return NextResponse.json(
        { error: "Invalid conversion request" },
        { status: 400 }
      );
    }

    const conversionReq = data as ConversionExecutionRequest;

    // Validate required fields
    const required = [
      "chainId",
      "fromToken",
      "toToken",
      "fromAmount",
      "fromAddress",
      "transaction",
    ];
    for (const field of required) {
      if (!(field in conversionReq)) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // ============================================
    // 3. GET RPC & SIGNING KEY
    // ============================================
    const rpcUrl = getRpcUrl(conversionReq.chainId);
    const signingKey = getSigningKey(conversionReq.chainId);

    if (!rpcUrl || !signingKey) {
      return NextResponse.json(
        {
          error: `Chain ${conversionReq.chainId} not configured or missing signing key`,
        },
        { status: 400 }
      );
    }

    // ============================================
    // 4. BROADCAST & EXECUTE
    // ============================================
    console.log(
      `[Conversion Execute] Processing conversion on chain ${conversionReq.chainId}:`
    );
    console.log(`  From: ${conversionReq.fromAmount} ${conversionReq.fromToken}`);
    console.log(`  To: ${conversionReq.toToken}`);
    console.log(`  Aggregator: ${conversionReq.aggregator}`);

    const result = await broadcastTransaction(conversionReq, rpcUrl, signingKey);

    // ============================================
    // 5. STORE RECORD
    // ============================================
    await storeConversionRecord(conversionReq, result);

    // ============================================
    // 6. RETURN RESPONSE
    // ============================================
    if (result.success) {
      console.log(
        `[Conversion Execute] ✓ Success: ${result.transactionHash} (block ${result.blockNumber})`
      );

      return NextResponse.json(
        {
          status: "executed",
          success: true,
          chainId: conversionReq.chainId,
          fromToken: conversionReq.fromToken,
          toToken: conversionReq.toToken,
          fromAmount: conversionReq.fromAmount,
          minAmount: conversionReq.minAmount,
          transactionHash: result.transactionHash,
          blockNumber: result.blockNumber,
          executedAt: result.executedAt,
          aggregator: conversionReq.aggregator,
        },
        {
          status: 200,
          headers: {
            "X-Conversion-Success": "true",
            "X-Transaction-Hash": result.transactionHash || "",
            "Cache-Control": "no-store",
          },
        }
      );
    } else {
      console.error(`[Conversion Execute] ✗ Failed: ${result.error}`);

      return NextResponse.json(
        {
          status: "failed",
          success: false,
          chainId: conversionReq.chainId,
          fromToken: conversionReq.fromToken,
          toToken: conversionReq.toToken,
          error: result.error,
          executedAt: result.executedAt,
        },
        {
          status: 500,
          headers: {
            "X-Conversion-Success": "false",
            "Cache-Control": "no-store",
          },
        }
      );
    }
  } catch (error) {
    console.error("[Conversion Execute] Unexpected error:", error);

    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/saib/convert/execute
 * 
 * Returns status of conversion system
 */
export async function GET(request: NextRequest) {
  return NextResponse.json(
    {
      status: "ready",
      supportedChains: ["1", "10", "56", "137", "8453", "42161"],
      aggregators: ["1inch", "0x"],
      description: "SAIB Liquidity Conversion Execution Layer",
    },
    {
      headers: {
        "Cache-Control": "max-age=60, public",
      },
    }
  );
}

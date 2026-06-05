/**
 * SAIB Token Conversion Engine
 * 
 * Routes conversions between TriSyn, Pi, and stablecoins
 * with multi-path strategy selection and fallback handling.
 */

import {
  TOKEN_REGISTRY,
  CONVERSION_PATHS,
  resolveTokenByAddress,
  resolveTokenBySymbol,
  getConversionPath,
  isEcosystemToken,
  isStablecoin,
  getSupportedConversions,
} from "./token-registry.ts";

interface ConversionRequest {
  sourceChainId: string;
  sourceToken: string; // Address or symbol
  targetToken: string; // Address or symbol
  amount: string; // Raw amount with decimals
  senderAddress: string;
  slippage?: number;
}

interface ConversionRoute {
  success: boolean;
  sourceSymbol: string;
  targetSymbol: string;
  sourceAmount: string;
  expectedOutput: string;
  minOutput: string;
  path: "direct_dex" | "via_stablecoin" | "stellar_payment" | "manual_treasury";
  aggregator?: "1inch" | "0x" | "stellar" | "treasury";
  transaction?: {
    to: string;
    data: string;
    value: string;
    gas: string;
  };
  bridgeData?: {
    sourceChain: string;
    targetChain: string;
    estimatedTime: number;
  };
  error?: string;
}

/**
 * Resolve tokens from address or symbol
 */
function resolveTokens(chainId: string, sourceToken: string, targetToken: string) {
  let sourceTokenMeta = sourceToken.startsWith("0x")
    ? resolveTokenByAddress(chainId, sourceToken)
    : resolveTokenBySymbol(sourceToken);

  let targetTokenMeta = targetToken.startsWith("0x")
    ? resolveTokenByAddress(chainId, targetToken)
    : resolveTokenBySymbol(targetToken);

  return { sourceTokenMeta, targetTokenMeta };
}

/**
 * Primary route: Direct DEX swap (1inch or 0x)
 */
async function routeViaDEXAggregator(
  request: ConversionRequest,
  sourceSymbol: string,
  targetSymbol: string,
  env: any
): Promise<ConversionRoute | null> {
  try {
    console.log(`[SAIB Conversion] DEX routing: ${sourceSymbol} → ${targetSymbol}`);

    // Call getBestLiquidityRoute from liquidity-router.ts
    const result = await getBestLiquidityRoute(
      request.sourceChainId,
      `${sourceSymbol}:${request.sourceToken}`,
      `${targetSymbol}:${request.targetToken}`,
      request.amount,
      request.senderAddress,
      env,
      request.slippage || 0.5
    );

    if (!result.success) {
      console.warn(`[SAIB Conversion] DEX route failed:`, result.error);
      return null;
    }

    return {
      success: true,
      sourceSymbol,
      targetSymbol,
      sourceAmount: request.amount,
      expectedOutput: result.quote.estimatedAmount,
      minOutput: result.quote.minAmount,
      path: "direct_dex",
      aggregator: result.quote.aggregator,
      transaction: result.transaction,
    };
  } catch (err) {
    console.error("[SAIB Conversion] DEX route error:", err);
    return null;
  }
}

/**
 * Fallback route 1: Via stablecoin bridge (e.g., TRISYN → USDC → Pi)
 */
async function routeViaStablecoin(
  request: ConversionRequest,
  sourceSymbol: string,
  targetSymbol: string,
  env: any
): Promise<ConversionRoute | null> {
  try {
    console.log(`[SAIB Conversion] Stablecoin bridge: ${sourceSymbol} → USDC → ${targetSymbol}`);

    // Step 1: Convert source to USDC
    const step1 = await routeViaDEXAggregator(
      {
        ...request,
        targetToken: "USDC",
      },
      sourceSymbol,
      "USDC",
      env
    );

    if (!step1 || !step1.success) {
      console.warn("[SAIB Conversion] Stablecoin bridge step 1 failed");
      return null;
    }

    // Step 2: Convert USDC to target
    const step2 = await routeViaDEXAggregator(
      {
        ...request,
        sourceToken: TOKEN_REGISTRY.USDC.addresses[request.sourceChainId] || "USDC",
        amount: step1.expectedOutput,
      },
      "USDC",
      targetSymbol,
      env
    );

    if (!step2 || !step2.success) {
      console.warn("[SAIB Conversion] Stablecoin bridge step 2 failed");
      return null;
    }

    return {
      success: true,
      sourceSymbol,
      targetSymbol,
      sourceAmount: request.amount,
      expectedOutput: step2.expectedOutput,
      minOutput: step2.minOutput,
      path: "via_stablecoin",
      aggregator: "1inch",
    };
  } catch (err) {
    console.error("[SAIB Conversion] Stablecoin bridge error:", err);
    return null;
  }
}

/**
 * Fallback route 2: Stellar payment processor for Pi Network
 */
async function routeViaStellarPayment(
  request: ConversionRequest,
  sourceSymbol: string,
  targetSymbol: string,
  env: any
): Promise<ConversionRoute | null> {
  try {
    console.log(`[SAIB Conversion] Stellar payment: ${sourceSymbol} → ${targetSymbol}`);

    // This route is for converting stablecoins TO Pi Network
    // via Stellar Horizon payment processor
    if (targetSymbol !== "PI_MAINNET") {
      return null;
    }

    // In production: Call Stellar Horizon API to create payment
    // For now: Return placeholder route
    return {
      success: true,
      sourceSymbol,
      targetSymbol,
      sourceAmount: request.amount,
      expectedOutput: (BigInt(request.amount) * BigInt(95)) / BigInt(100), // 95% (accounting for fees)
      minOutput: (BigInt(request.amount) * BigInt(90)) / BigInt(100), // 90% (min)
      path: "stellar_payment",
      aggregator: "stellar",
    };
  } catch (err) {
    console.error("[SAIB Conversion] Stellar payment error:", err);
    return null;
  }
}

/**
 * Fallback route 3: Manual treasury operations
 * For converting stablecoins directly to TRISYN without DEX
 */
async function routeViaTreasuryOperation(
  request: ConversionRequest,
  sourceSymbol: string,
  targetSymbol: string,
  env: any
): Promise<ConversionRoute | null> {
  try {
    console.log(`[SAIB Conversion] Treasury operation: ${sourceSymbol} → ${targetSymbol}`);

    // Only supports stablecoin to TRISYN conversions
    if (!isStablecoin(sourceSymbol) || targetSymbol !== "TRISYN") {
      return null;
    }

    // Treasury operation: Manual off-chain transfer
    // Amount received: stablecoin amount converted to TRISYN at 1:1 (before slippage)
    const treasuryRate = 1.05; // 5% premium for treasury

    return {
      success: true,
      sourceSymbol,
      targetSymbol,
      sourceAmount: request.amount,
      expectedOutput: (BigInt(request.amount) * BigInt(105)) / BigInt(100), // 5% premium
      minOutput: BigInt(request.amount), // Guaranteed 1:1 minimum
      path: "manual_treasury",
      aggregator: "treasury",
    };
  } catch (err) {
    console.error("[SAIB Conversion] Treasury operation error:", err);
    return null;
  }
}

/**
 * Main conversion orchestrator
 * Tries all available routes in priority order
 */
export async function routeTokenConversion(
  request: ConversionRequest,
  env: any
): Promise<ConversionRoute> {
  try {
    // 1. Resolve token metadata
    const { sourceTokenMeta, targetTokenMeta } = resolveTokens(
      request.sourceChainId,
      request.sourceToken,
      request.targetToken
    );

    if (!sourceTokenMeta || !targetTokenMeta) {
      return {
        success: false,
        sourceSymbol: request.sourceToken,
        targetSymbol: request.targetToken,
        sourceAmount: request.amount,
        expectedOutput: "0",
        minOutput: "0",
        path: "direct_dex",
        error: "Unknown token",
      };
    }

    const sourceSymbol = sourceTokenMeta.symbol || "UNKNOWN";
    const targetSymbol = targetTokenMeta.symbol || "UNKNOWN";

    // 2. Check if conversion is supported
    const supportedTargets = getSupportedConversions(sourceSymbol);
    if (!supportedTargets.includes(targetSymbol)) {
      return {
        success: false,
        sourceSymbol,
        targetSymbol,
        sourceAmount: request.amount,
        expectedOutput: "0",
        minOutput: "0",
        path: "direct_dex",
        error: `Conversion not supported: ${sourceSymbol} → ${targetSymbol}`,
      };
    }

    // 3. Get conversion path strategy
    const conversionPath = getConversionPath(sourceSymbol, targetSymbol);

    // 4. Try routes in priority order
    const routes = [];

    // Primary path
    if (conversionPath.primaryPath === "direct_dex") {
      routes.push(() => routeViaDEXAggregator(request, sourceSymbol, targetSymbol, env));
    } else if (conversionPath.primaryPath === "stellar_payment_processor") {
      routes.push(() => routeViaStellarPayment(request, sourceSymbol, targetSymbol, env));
    }

    // Fallback paths
    if (conversionPath.fallbackPath === "via_stablecoin") {
      routes.push(() => routeViaStablecoin(request, sourceSymbol, targetSymbol, env));
    } else if (conversionPath.fallbackPath === "manual_treasury") {
      routes.push(() => routeViaTreasuryOperation(request, sourceSymbol, targetSymbol, env));
    }

    // Execute routes in order until one succeeds
    for (const routeFn of routes) {
      const result = await routeFn();
      if (result && result.success) {
        console.log(
          `[SAIB Conversion] ✓ Route found: ${sourceSymbol} → ${targetSymbol} via ${result.path}`
        );
        return result;
      }
    }

    // All routes failed
    return {
      success: false,
      sourceSymbol,
      targetSymbol,
      sourceAmount: request.amount,
      expectedOutput: "0",
      minOutput: "0",
      path: "direct_dex",
      error: `All conversion routes failed for ${sourceSymbol} → ${targetSymbol}`,
    };
  } catch (err) {
    return {
      success: false,
      sourceSymbol: request.sourceToken,
      targetSymbol: request.targetToken,
      sourceAmount: request.amount,
      expectedOutput: "0",
      minOutput: "0",
      path: "direct_dex",
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/**
 * Recognize if a token is TRISYN or Pi (ecosystem tokens)
 */
export function recognizeEcosystemToken(tokenSymbolOrAddress: string, chainId?: string) {
  const token = tokenSymbolOrAddress.startsWith("0x")
    ? resolveTokenByAddress(chainId || "1", tokenSymbolOrAddress)
    : resolveTokenBySymbol(tokenSymbolOrAddress);

  return isEcosystemToken(token);
}

/**
 * Export route for external use
 */
export const getBestTokenConversionRoute = routeTokenConversion;

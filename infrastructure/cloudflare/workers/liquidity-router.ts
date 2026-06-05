/**
 * Liquidity Routing Module for Cloudflare Workers
 * 
 * Optimized for edge runtime (Cloudflare V8, no Node.js core modules)
 * Uses DEX aggregator APIs (1inch, 0x, ParaSwap) for optimal routing
 * 
 * Purpose: Route digital assets through DEX liquidity pools to build
 * Triumph Synergy treasury and ecosystem token positions
 */

/**
 * DEX Aggregator API Configuration
 */
export const DEX_AGGREGATORS = {
  "1inch": {
    baseUrl: (chainId: string) => `https://api.1inch.dev/v5.2/${chainId}`,
    supportsChains: ["1", "10", "56", "137", "8453", "42161"], // Ethereum, Optimism, BSC, Polygon, Base, Arbitrum
    endpoints: {
      swap: "/swap",
      quote: "/quote",
    },
  },
  "0x": {
    baseUrl: () => `https://api.0x.org`,
    supportsChains: ["1", "10", "56", "137", "8453", "42161"],
    endpoints: {
      quote: "/swap/v1/quote",
      price: "/swap/v1/price",
    },
  },
};

/**
 * Quote request from DEX aggregator
 */
export interface DexQuote {
  chainId: string;
  fromToken: string;
  toToken: string;
  fromAmount: string;
  minAmount: string;
  estimatedGas: string;
  aggregator: "1inch" | "0x" | "paraswap";
  slippage: number;
}

/**
 * Swap transaction payload ready for broadcast
 */
export interface SwapPayload {
  success: boolean;
  quote?: DexQuote;
  transaction?: {
    to: string; // Target contract (DEX router)
    data: string; // Encoded function call
    value: string; // Native asset value (if applicable)
    gas: string;
    gasPrice: string;
  };
  error?: string;
}

/**
 * Get optimal liquidity route from 1inch Aggregator
 * 
 * @param chainId - Network ID (e.g., "8453" for Base)
 * @param fromToken - Source token contract address
 * @param toToken - Destination token contract address
 * @param amount - Amount in Wei (atomic units)
 * @param fromAddress - Source wallet address
 * @param slippage - Max slippage percentage (default 0.5%)
 * @param apiKey - 1inch API key
 * @returns Swap payload with transaction data
 */
export async function getLiquidityRouteFrom1Inch(
  chainId: string,
  fromToken: string,
  toToken: string,
  amount: string,
  fromAddress: string,
  slippage: number = 0.5,
  apiKey: string
): Promise<SwapPayload> {
  try {
    // Validate inputs
    if (!DEX_AGGREGATORS["1inch"].supportsChains.includes(chainId)) {
      return {
        success: false,
        error: `Chain ${chainId} not supported by 1inch`,
      };
    }

    // First, get quote to estimate output
    const quoteUrl = new URL(
      DEX_AGGREGATORS["1inch"].endpoints.quote,
      DEX_AGGREGATORS["1inch"].baseUrl(chainId)
    );
    quoteUrl.searchParams.append("src", fromToken);
    quoteUrl.searchParams.append("dst", toToken);
    quoteUrl.searchParams.append("amount", amount);

    const quoteResponse = await fetch(quoteUrl.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(10000), // 10s timeout for edge
    });

    if (!quoteResponse.ok) {
      const error = await quoteResponse.text();
      return {
        success: false,
        error: `1inch Quote API error: ${quoteResponse.status} ${error}`,
      };
    }

    const quoteData = (await quoteResponse.json()) as {
      toAmount?: string;
      estimatedGas?: string;
    };

    // Now get the actual swap transaction
    const swapUrl = new URL(
      DEX_AGGREGATORS["1inch"].endpoints.swap,
      DEX_AGGREGATORS["1inch"].baseUrl(chainId)
    );
    swapUrl.searchParams.append("src", fromToken);
    swapUrl.searchParams.append("dst", toToken);
    swapUrl.searchParams.append("amount", amount);
    swapUrl.searchParams.append("from", fromAddress);
    swapUrl.searchParams.append("slippage", slippage.toString());
    swapUrl.searchParams.append("disableEstimate", "false");

    const swapResponse = await fetch(swapUrl.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!swapResponse.ok) {
      const error = await swapResponse.text();
      return {
        success: false,
        error: `1inch Swap API error: ${swapResponse.status} ${error}`,
      };
    }

    const swapData = (await swapResponse.json()) as {
      tx?: {
        to: string;
        data: string;
        value: string;
        gas: string;
        gasPrice?: string;
      };
    };

    if (!swapData.tx) {
      return {
        success: false,
        error: "1inch API returned invalid transaction data",
      };
    }

    return {
      success: true,
      quote: {
        chainId,
        fromToken,
        toToken,
        fromAmount: amount,
        minAmount: quoteData.toAmount || "0",
        estimatedGas: quoteData.estimatedGas || "200000",
        aggregator: "1inch",
        slippage,
      },
      transaction: {
        to: swapData.tx.to,
        data: swapData.tx.data,
        value: swapData.tx.value,
        gas: swapData.tx.gas,
        gasPrice: swapData.tx.gasPrice || "auto",
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `1inch routing error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Get optimal liquidity route from 0x Protocol
 * 
 * @param chainId - Network ID
 * @param fromToken - Source token
 * @param toToken - Destination token
 * @param amount - Amount in Wei
 * @param fromAddress - Source wallet
 * @param slippage - Max slippage percentage
 * @param apiKey - 0x API key
 * @returns Swap payload
 */
export async function getLiquidityRouteFrom0x(
  chainId: string,
  fromToken: string,
  toToken: string,
  amount: string,
  fromAddress: string,
  slippage: number = 0.5,
  apiKey: string
): Promise<SwapPayload> {
  try {
    if (!DEX_AGGREGATORS["0x"].supportsChains.includes(chainId)) {
      return {
        success: false,
        error: `Chain ${chainId} not supported by 0x`,
      };
    }

    // Map chainId to 0x network identifier
    const chainMap: Record<string, string> = {
      "1": "ethereum",
      "10": "optimism",
      "56": "bsc",
      "137": "polygon",
      "8453": "base",
      "42161": "arbitrum",
    };

    const networkId = chainMap[chainId];
    if (!networkId) {
      return {
        success: false,
        error: `Unknown chain ID: ${chainId}`,
      };
    }

    const quoteUrl = new URL(DEX_AGGREGATORS["0x"].endpoints.quote, DEX_AGGREGATORS["0x"].baseUrl());
    quoteUrl.searchParams.append("chainId", chainId);
    quoteUrl.searchParams.append("sellToken", fromToken);
    quoteUrl.searchParams.append("buyToken", toToken);
    quoteUrl.searchParams.append("sellAmount", amount);
    quoteUrl.searchParams.append("takerAddress", fromAddress);
    quoteUrl.searchParams.append("slippagePercentage", slippage.toString());

    const response = await fetch(quoteUrl.toString(), {
      method: "GET",
      headers: {
        "0x-api-key": apiKey,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      const error = await response.text();
      return {
        success: false,
        error: `0x API error: ${response.status} ${error}`,
      };
    }

    const data = (await response.json()) as {
      to?: string;
      data?: string;
      value?: string;
      gas?: string;
      buyAmount?: string;
      gasPrice?: string;
    };

    if (!data.to || !data.data) {
      return {
        success: false,
        error: "0x API returned invalid transaction data",
      };
    }

    return {
      success: true,
      quote: {
        chainId,
        fromToken,
        toToken,
        fromAmount: amount,
        minAmount: data.buyAmount || "0",
        estimatedGas: data.gas || "200000",
        aggregator: "0x",
        slippage,
      },
      transaction: {
        to: data.to,
        data: data.data,
        value: data.value || "0",
        gas: data.gas || "200000",
        gasPrice: data.gasPrice || "auto",
      },
    };
  } catch (error) {
    return {
      success: false,
      error: `0x routing error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Select best aggregator based on priority and availability
 * Tries 1inch first (usually better routing), falls back to 0x
 */
export async function getBestLiquidityRoute(
  chainId: string,
  fromToken: string,
  toToken: string,
  amount: string,
  fromAddress: string,
  env: Record<string, string>,
  slippage: number = 0.5
): Promise<SwapPayload> {
  // Try 1inch first
  if (env.DEX_1INCH_API_KEY) {
    const route1inch = await getLiquidityRouteFrom1Inch(
      chainId,
      fromToken,
      toToken,
      amount,
      fromAddress,
      slippage,
      env.DEX_1INCH_API_KEY
    );

    if (route1inch.success) {
      return route1inch;
    }

    console.warn(`[Liquidity Router] 1inch routing failed, falling back to 0x: ${route1inch.error}`);
  }

  // Fall back to 0x
  if (env.DEX_0X_API_KEY) {
    const route0x = await getLiquidityRouteFrom0x(
      chainId,
      fromToken,
      toToken,
      amount,
      fromAddress,
      slippage,
      env.DEX_0X_API_KEY
    );

    if (route0x.success) {
      return route0x;
    }

    console.warn(`[Liquidity Router] 0x routing also failed: ${route0x.error}`);
  }

  return {
    success: false,
    error: "No DEX aggregator API keys configured or all routing attempts failed",
  };
}

export default {
  getLiquidityRouteFrom1Inch,
  getLiquidityRouteFrom0x,
  getBestLiquidityRoute,
};

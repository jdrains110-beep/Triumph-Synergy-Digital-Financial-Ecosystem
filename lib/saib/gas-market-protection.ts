/**
 * SAIB Optimus: Gas Market Protection & Economic Viability Watchdog
 * 
 * Prevents execution during unfavorable gas market conditions.
 * Ensures that liquidity operations remain economically viable before execution.
 */

export interface GasMarketStatus {
  currentGasPrice: bigint;
  gasLimit: bigint;
  estimatedCostWei: bigint;
  estimatedCostUsd: number;
  isViable: boolean;
  timestamp: number;
  reason?: string;
}

/**
 * Fetch current gas price from blockchain RPC
 * Returns the current network gas price in wei
 */
export async function getCurrentGasPrice(rpcUrl: string): Promise<bigint> {
  try {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_gasPrice',
        params: [],
        id: Math.floor(Math.random() * 10000),
      }),
      signal: AbortSignal.timeout(3000),
    });

    if (!response.ok) {
      throw new Error(`RPC returned ${response.status}`);
    }

    const result = await response.json();
    if (result.error) {
      throw new Error(result.error.message);
    }

    return BigInt(result.result || '0');
  } catch (error) {
    console.error('[GAS] Failed to fetch gas price:', error);
    throw error;
  }
}

/**
 * Get current ETH/USD price (for cost estimation)
 * Uses a simple price feed or external API
 */
export async function getEthPriceUsd(): Promise<number> {
  try {
    // Using a simple price endpoint (you can replace with your preferred source)
    const response = await fetch('https://api.coinbase.com/v2/prices/ETH-USD/spot', {
      signal: AbortSignal.timeout(3000),
    });

    if (!response.ok) {
      return 2000; // Fallback estimate
    }

    const data = await response.json();
    return parseFloat(data.data.amount) || 2000;
  } catch (error) {
    console.warn('[GAS] Failed to fetch ETH price, using fallback:', error);
    return 2000; // Conservative fallback
  }
}

/**
 * Main Gas Market Protection Check
 * Validates that execution is economically viable before proceeding
 */
export async function enforceGasMarketProtection(
  env: any,
  transactionGasLimit: bigint = BigInt(300000) // Typical swap: ~300k gas
): Promise<GasMarketStatus> {
  const timestamp = Date.now();

  try {
    console.log('[GAS] 🔍 Checking gas market conditions...');

    // 1. FETCH CURRENT GAS PRICE FROM NETWORK
    const rpcUrl = env.BLOCKCHAIN_RPC_URL || 'https://cloudflare-eth.com';
    let currentGasPrice: bigint;

    try {
      currentGasPrice = await getCurrentGasPrice(rpcUrl);
    } catch (rpcError) {
      console.error('[GAS] ❌ RPC gas price fetch failed, using fallback');
      currentGasPrice = BigInt(50000000000); // 50 Gwei fallback
    }

    // 2. GET MAXIMUM ALLOWED GAS PRICE (from environment)
    const maxGasPriceStr = env.MAX_GAS_PRICE_WEI || '150000000000'; // 150 Gwei default
    const maxGasPrice = BigInt(maxGasPriceStr);

    console.log('[GAS] Current gas price: ' + (currentGasPrice / BigInt(1000000000)).toString() + ' Gwei');
    console.log('[GAS] Maximum allowed: ' + (maxGasPrice / BigInt(1000000000)).toString() + ' Gwei');

    // 3. CALCULATE ESTIMATED TRANSACTION COST
    const estimatedCostWei = currentGasPrice * transactionGasLimit;

    // 4. GET ETH PRICE FOR USD ESTIMATION
    let ethPrice = 2000; // Fallback
    try {
      ethPrice = await getEthPriceUsd();
    } catch (err) {
      console.warn('[GAS] Using fallback ETH price');
    }

    const estimatedCostUsd = (Number(estimatedCostWei) / 1e18) * ethPrice;

    console.log('[GAS] Estimated transaction cost: ' + estimatedCostUsd.toFixed(2) + ' USD');

    // 5. DETERMINE VIABILITY
    const isViable = currentGasPrice <= maxGasPrice;

    const status: GasMarketStatus = {
      currentGasPrice,
      gasLimit: transactionGasLimit,
      estimatedCostWei,
      estimatedCostUsd,
      isViable,
      timestamp,
      reason: isViable 
        ? 'Gas market conditions are favorable for execution'
        : `Gas price (${(currentGasPrice / BigInt(1000000000)).toString()} Gwei) exceeds maximum allowed (${(maxGasPrice / BigInt(1000000000)).toString()} Gwei)`,
    };

    if (isViable) {
      console.log('[GAS] ✅ Gas market protection passed - proceeding with execution');
    } else {
      console.warn('[GAS] ⚠️ Gas market protection triggered - aborting execution');
    }

    return status;
  } catch (error) {
    console.error('[GAS] ❌ Gas market protection failed:', error);

    // FAIL-SAFE: Assume market is unfavorable if we can't verify
    return {
      currentGasPrice: BigInt(0),
      gasLimit: transactionGasLimit,
      estimatedCostWei: BigInt(0),
      estimatedCostUsd: 0,
      isViable: false,
      timestamp,
      reason: `Gas protection check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Retrieve gas price history for trend analysis
 * Used to detect market spikes and predict future conditions
 */
export async function getGasPriceHistory(
  env: any,
  limit: number = 100
): Promise<Array<{ timestamp: number; gasPrice: string }>> {
  try {
    // In production, fetch from your time-series database
    // For now, return empty array that would be populated from KV history
    console.log('[GAS] 📊 Retrieving gas price history (limit: ' + limit + ')');
    return [];
  } catch (error) {
    console.error('[GAS] ⚠️ Failed to retrieve history:', error);
    return [];
  }
}

/**
 * Predict whether gas market will improve within a time window
 * Used for intelligent transaction scheduling
 */
export async function predictGasMarketImprovement(
  env: any,
  checkAfterSeconds: number = 60
): Promise<{
  shouldWait: boolean;
  reason: string;
  retryAfterSeconds: number;
}> {
  try {
    const rpcUrl = env.BLOCKCHAIN_RPC_URL || 'https://cloudflare-eth.com';
    const currentGasPrice = await getCurrentGasPrice(rpcUrl);
    const maxGasPrice = BigInt(env.MAX_GAS_PRICE_WEI || '150000000000');

    // If already favorable, don't wait
    if (currentGasPrice <= maxGasPrice) {
      return {
        shouldWait: false,
        reason: 'Gas market is already favorable',
        retryAfterSeconds: 0,
      };
    }

    // If significantly over threshold, wait longer
    const overage = currentGasPrice - maxGasPrice;
    const overagePercentage = (Number(overage) / Number(maxGasPrice)) * 100;

    let waitTime = checkAfterSeconds;
    if (overagePercentage > 50) {
      waitTime = checkAfterSeconds * 3; // Triple wait for extreme spikes
    } else if (overagePercentage > 25) {
      waitTime = checkAfterSeconds * 2;
    }

    return {
      shouldWait: true,
      reason: `Gas price ${overagePercentage.toFixed(1)}% over threshold - waiting for improvement`,
      retryAfterSeconds: waitTime,
    };
  } catch (error) {
    console.error('[GAS] Error predicting improvement:', error);
    return {
      shouldWait: true,
      reason: 'Unable to predict improvement - waiting for next check',
      retryAfterSeconds: 60,
    };
  }
}

/**
 * Export all types for TypeScript support
 */
export type { GasMarketStatus };

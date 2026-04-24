/**
 * Banking Liquidity API
 * 
 * Enables banks and financial institutions to:
 * - Create Pi liquidity pools
 * - Manage liquidity positions
 * - Execute liquidity swaps
 * - Monitor pool performance
 * 
 * Integrated with Pi SDK - always triggered on all domains
 */

import { type NextRequest, NextResponse } from "next/server";

// Pi Value System
const PI_EXTERNAL_RATE = 314.159;
const PI_INTERNAL_RATE = 314_159;

// Liquidity Pool Types
type PoolType = "pi-usd" | "pi-usdc" | "pi-usdt" | "pi-eth" | "pi-btc" | "pi-stable" | "pi-fiat";
type PoolStatus = "active" | "paused" | "depleted" | "rebalancing";
type LiquidityAction = "add" | "remove" | "swap" | "rebalance";

interface LiquidityPool {
  id: string;
  partnerId: string;
  type: PoolType;
  status: PoolStatus;
  
  // Pool Balances
  piBalance: number;
  pairedBalance: number;
  pairedCurrency: string;
  
  // Pool Metrics
  totalValueLocked: number;
  volume24h: number;
  feesEarned: number;
  apr: number;
  
  // Pool Configuration
  swapFee: number;
  minLiquidity: number;
  maxSlippage: number;
  autoRebalance: boolean;
  
  // Timestamps
  createdAt: string;
  lastActivityAt: string;
}

interface CreatePoolRequest {
  partnerId: string;
  type: PoolType;
  initialPiAmount: number;
  initialPairedAmount: number;
  pairedCurrency: string;
  swapFee?: number;
  autoRebalance?: boolean;
}

interface AddLiquidityRequest {
  partnerId: string;
  poolId: string;
  piAmount: number;
  pairedAmount: number;
}

interface RemoveLiquidityRequest {
  partnerId: string;
  poolId: string;
  percentage: number; // 0-100
}

interface SwapRequest {
  partnerId: string;
  poolId: string;
  fromCurrency: string;
  toCurrency: string;
  amount: number;
  maxSlippage?: number;
}

// In-memory pool storage (in production, use database)
const liquidityPools: Map<string, LiquidityPool> = new Map();

/**
 * Verify bank partner has liquidity permissions
 */
async function verifyLiquidityAccess(partnerId: string): Promise<{
  valid: boolean;
  error?: string;
}> {
  if (!partnerId) {
    return { valid: false, error: "Partner ID required" };
  }
  
  // In production, verify against database
  return { valid: true };
}

/**
 * Create new liquidity pool
 */
async function createLiquidityPool(request: CreatePoolRequest): Promise<{
  success: boolean;
  pool?: LiquidityPool;
  error?: string;
}> {
  const accessCheck = await verifyLiquidityAccess(request.partnerId);
  if (!accessCheck.valid) {
    return { success: false, error: accessCheck.error };
  }

  const poolId = `pool-${request.type}-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  
  const pool: LiquidityPool = {
    id: poolId,
    partnerId: request.partnerId,
    type: request.type,
    status: "active",
    
    piBalance: request.initialPiAmount,
    pairedBalance: request.initialPairedAmount,
    pairedCurrency: request.pairedCurrency,
    
    totalValueLocked: (request.initialPiAmount * PI_EXTERNAL_RATE) + request.initialPairedAmount,
    volume24h: 0,
    feesEarned: 0,
    apr: 12.5, // Example APR
    
    swapFee: request.swapFee || 0.003, // 0.3% default
    minLiquidity: 100,
    maxSlippage: 0.05, // 5%
    autoRebalance: request.autoRebalance ?? true,
    
    createdAt: new Date().toISOString(),
    lastActivityAt: new Date().toISOString(),
  };

  liquidityPools.set(poolId, pool);
  
  console.log("[Banking Liquidity] Pool created:", {
    poolId,
    type: request.type,
    tvl: pool.totalValueLocked,
  });

  return { success: true, pool };
}

/**
 * Add liquidity to existing pool
 */
async function addLiquidity(request: AddLiquidityRequest): Promise<{
  success: boolean;
  pool?: LiquidityPool;
  lpTokens?: number;
  error?: string;
}> {
  const accessCheck = await verifyLiquidityAccess(request.partnerId);
  if (!accessCheck.valid) {
    return { success: false, error: accessCheck.error };
  }

  const pool = liquidityPools.get(request.poolId);
  if (!pool) {
    return { success: false, error: "Pool not found" };
  }

  if (pool.partnerId !== request.partnerId) {
    return { success: false, error: "Unauthorized access to pool" };
  }

  // Calculate LP tokens based on contribution
  const totalBefore = pool.totalValueLocked;
  const contribution = (request.piAmount * PI_EXTERNAL_RATE) + request.pairedAmount;
  const lpTokens = (contribution / totalBefore) * 1000; // Simplified LP calculation

  // Update pool
  pool.piBalance += request.piAmount;
  pool.pairedBalance += request.pairedAmount;
  pool.totalValueLocked += contribution;
  pool.lastActivityAt = new Date().toISOString();

  liquidityPools.set(request.poolId, pool);

  console.log("[Banking Liquidity] Liquidity added:", {
    poolId: request.poolId,
    piAdded: request.piAmount,
    pairedAdded: request.pairedAmount,
    lpTokens,
  });

  return { success: true, pool, lpTokens };
}

/**
 * Remove liquidity from pool
 */
async function removeLiquidity(request: RemoveLiquidityRequest): Promise<{
  success: boolean;
  piWithdrawn?: number;
  pairedWithdrawn?: number;
  error?: string;
}> {
  const accessCheck = await verifyLiquidityAccess(request.partnerId);
  if (!accessCheck.valid) {
    return { success: false, error: accessCheck.error };
  }

  const pool = liquidityPools.get(request.poolId);
  if (!pool) {
    return { success: false, error: "Pool not found" };
  }

  if (pool.partnerId !== request.partnerId) {
    return { success: false, error: "Unauthorized access to pool" };
  }

  const percentage = Math.min(Math.max(request.percentage, 0), 100) / 100;
  const piWithdrawn = pool.piBalance * percentage;
  const pairedWithdrawn = pool.pairedBalance * percentage;

  // Update pool
  pool.piBalance -= piWithdrawn;
  pool.pairedBalance -= pairedWithdrawn;
  pool.totalValueLocked = (pool.piBalance * PI_EXTERNAL_RATE) + pool.pairedBalance;
  pool.lastActivityAt = new Date().toISOString();

  if (pool.piBalance < pool.minLiquidity) {
    pool.status = "depleted";
  }

  liquidityPools.set(request.poolId, pool);

  console.log("[Banking Liquidity] Liquidity removed:", {
    poolId: request.poolId,
    piWithdrawn,
    pairedWithdrawn,
    percentage: request.percentage,
  });

  return { success: true, piWithdrawn, pairedWithdrawn };
}

/**
 * Execute swap through liquidity pool
 */
async function executeSwap(request: SwapRequest): Promise<{
  success: boolean;
  fromAmount?: number;
  toAmount?: number;
  fee?: number;
  priceImpact?: number;
  error?: string;
}> {
  const accessCheck = await verifyLiquidityAccess(request.partnerId);
  if (!accessCheck.valid) {
    return { success: false, error: accessCheck.error };
  }

  const pool = liquidityPools.get(request.poolId);
  if (!pool) {
    return { success: false, error: "Pool not found" };
  }

  if (pool.status !== "active") {
    return { success: false, error: `Pool is ${pool.status}` };
  }

  // Calculate swap using constant product formula (x * y = k)
  const k = pool.piBalance * pool.pairedBalance;
  let toAmount: number;
  let priceImpact: number;

  const fee = request.amount * pool.swapFee;
  const amountAfterFee = request.amount - fee;

  if (request.fromCurrency === "PI") {
    // Swap Pi -> Paired
    const newPiBalance = pool.piBalance + amountAfterFee;
    const newPairedBalance = k / newPiBalance;
    toAmount = pool.pairedBalance - newPairedBalance;
    
    // Calculate price impact
    const expectedOutput = amountAfterFee * (pool.pairedBalance / pool.piBalance);
    priceImpact = Math.abs(toAmount - expectedOutput) / expectedOutput;

    // Check slippage
    if (priceImpact > (request.maxSlippage || pool.maxSlippage)) {
      return { success: false, error: `Slippage too high: ${(priceImpact * 100).toFixed(2)}%` };
    }

    // Update pool
    pool.piBalance = newPiBalance;
    pool.pairedBalance = newPairedBalance;
  } else {
    // Swap Paired -> Pi
    const newPairedBalance = pool.pairedBalance + amountAfterFee;
    const newPiBalance = k / newPairedBalance;
    toAmount = pool.piBalance - newPiBalance;
    
    // Calculate price impact
    const expectedOutput = amountAfterFee * (pool.piBalance / pool.pairedBalance);
    priceImpact = Math.abs(toAmount - expectedOutput) / expectedOutput;

    // Check slippage
    if (priceImpact > (request.maxSlippage || pool.maxSlippage)) {
      return { success: false, error: `Slippage too high: ${(priceImpact * 100).toFixed(2)}%` };
    }

    // Update pool
    pool.piBalance = newPiBalance;
    pool.pairedBalance = newPairedBalance;
  }

  // Update metrics
  pool.volume24h += request.amount * PI_EXTERNAL_RATE;
  pool.feesEarned += fee * PI_EXTERNAL_RATE;
  pool.totalValueLocked = (pool.piBalance * PI_EXTERNAL_RATE) + pool.pairedBalance;
  pool.lastActivityAt = new Date().toISOString();

  liquidityPools.set(request.poolId, pool);

  console.log("[Banking Liquidity] Swap executed:", {
    poolId: request.poolId,
    from: request.fromCurrency,
    to: request.toCurrency,
    fromAmount: request.amount,
    toAmount,
    fee,
    priceImpact: `${(priceImpact * 100).toFixed(2)}%`,
  });

  return {
    success: true,
    fromAmount: request.amount,
    toAmount,
    fee,
    priceImpact,
  };
}

// GET: List pools and documentation
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");
  const partnerId = searchParams.get("partnerId");
  const poolId = searchParams.get("poolId");

  switch (action) {
    case "pools": {
      if (!partnerId) {
        return NextResponse.json(
          { success: false, error: "Partner ID required" },
          { status: 400 }
        );
      }

      const partnerPools = Array.from(liquidityPools.values())
        .filter(pool => pool.partnerId === partnerId);

      return NextResponse.json({
        success: true,
        pools: partnerPools,
        totalTVL: partnerPools.reduce((sum, p) => sum + p.totalValueLocked, 0),
      });
    }

    case "pool": {
      if (!poolId) {
        return NextResponse.json(
          { success: false, error: "Pool ID required" },
          { status: 400 }
        );
      }

      const pool = liquidityPools.get(poolId);
      if (!pool) {
        return NextResponse.json(
          { success: false, error: "Pool not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        pool,
        currentRate: pool.pairedBalance / pool.piBalance,
      });
    }

    case "stats": {
      const allPools = Array.from(liquidityPools.values());
      const totalTVL = allPools.reduce((sum, p) => sum + p.totalValueLocked, 0);
      const totalVolume = allPools.reduce((sum, p) => sum + p.volume24h, 0);
      const totalFees = allPools.reduce((sum, p) => sum + p.feesEarned, 0);

      return NextResponse.json({
        success: true,
        stats: {
          totalPools: allPools.length,
          activePools: allPools.filter(p => p.status === "active").length,
          totalTVL,
          totalVolume24h: totalVolume,
          totalFeesEarned: totalFees,
        },
        piRates: {
          internal: PI_INTERNAL_RATE,
          external: PI_EXTERNAL_RATE,
        },
      });
    }

    default:
      return NextResponse.json({
        success: true,
        api: "Banking Liquidity API",
        version: "1.0.0",
        description: "Enable banks to create and manage Pi liquidity pools",
        piSdkIntegration: {
          status: "always-enabled",
          note: "Pi SDK triggered on all domains - no exceptions",
        },
        endpoints: {
          "GET ?action=pools&partnerId=X": "List partner's liquidity pools",
          "GET ?action=pool&poolId=X": "Get pool details",
          "GET ?action=stats": "Get platform liquidity stats",
          "POST /create-pool": "Create new liquidity pool",
          "POST /add-liquidity": "Add liquidity to pool",
          "POST /remove-liquidity": "Remove liquidity from pool",
          "POST /swap": "Execute swap through pool",
        },
        supportedPools: [
          "pi-usd",
          "pi-usdc",
          "pi-usdt",
          "pi-eth",
          "pi-btc",
          "pi-stable",
          "pi-fiat",
        ],
        dualValueSystem: {
          internalPi: `${PI_INTERNAL_RATE} USD (mined/contributed)`,
          externalPi: `${PI_EXTERNAL_RATE} USD (purchased/exchange)`,
        },
      });
  }
}

// POST: Manage liquidity operations
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...data } = body;

    switch (action) {
      case "create-pool": {
        const result = await createLiquidityPool(data as CreatePoolRequest);
        return NextResponse.json(result, { status: result.success ? 201 : 400 });
      }

      case "add-liquidity": {
        const result = await addLiquidity(data as AddLiquidityRequest);
        return NextResponse.json(result, { status: result.success ? 200 : 400 });
      }

      case "remove-liquidity": {
        const result = await removeLiquidity(data as RemoveLiquidityRequest);
        return NextResponse.json(result, { status: result.success ? 200 : 400 });
      }

      case "swap": {
        const result = await executeSwap(data as SwapRequest);
        return NextResponse.json(result, { status: result.success ? 200 : 400 });
      }

      default:
        return NextResponse.json(
          {
            success: false,
            error: "Unknown action",
            validActions: ["create-pool", "add-liquidity", "remove-liquidity", "swap"],
          },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("[Banking Liquidity] API error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

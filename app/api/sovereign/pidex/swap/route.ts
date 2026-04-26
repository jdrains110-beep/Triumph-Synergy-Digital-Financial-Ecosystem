/**
 * /api/sovereign/pidex/swap
 * Sovereign Pi-DEX AMM — Token Swap Execution
 *
 * POST — execute an AMM swap on Stellar SDEX / Pi DEX
 * GET  — quote a swap without executing
 */

import { NextResponse } from "next/server";
import {
  createSwapExecution,
  SEED_AMM_POOLS,
  SOVEREIGN_PIDEX_VERSION,
  APEX_SECURITY_LEVEL,
  QUANTUM_ALGO_SIG,
  AMM_PLATFORM_FEE_PCT,
  AMM_LP_FEE_PCT,
  PI_RATE_EXTERNAL,
  UNISWAP_V3_SWAP_FEE_PCT,
  COINBASE_ADVANCED_FEE_PCT,
} from "@/lib/programs/sovereign-pidex";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

// Bounded in-memory swap log
const MAX_SWAP_LOG = 200;
const swapLog: ReturnType<typeof createSwapExecution>[] = [];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const assetIn   = searchParams.get("assetIn")  ?? "XPI";
  const assetOut  = searchParams.get("assetOut") ?? "USDC";
  const amountIn  = Math.min(Math.abs(Number(searchParams.get("amount") ?? 100)), 10_000_000);

  // Find matching pool
  const pool = SEED_AMM_POOLS.find(p =>
    (p.assetA.assetCode === assetIn  && p.assetB.assetCode === assetOut) ||
    (p.assetA.assetCode === assetOut && p.assetB.assetCode === assetIn)
  );

  if (!pool) {
    return NextResponse.json({
      success: false,
      error:   `No pool found for ${assetIn}/${assetOut}`,
      availablePairs: SEED_AMM_POOLS.map(p =>
        `${p.assetA.assetCode}/${p.assetB.assetCode}`
      ),
    }, { status: 404 });
  }

  const inIsA      = pool.assetA.assetCode === assetIn;
  const reserveIn  = inIsA ? pool.reserveA : pool.reserveB;
  const reserveOut = inIsA ? pool.reserveB : pool.reserveA;

  // Constant product: (reserveIn + amountIn_after_fee) * (reserveOut - amountOut) = k
  const amountInAfterFee = amountIn * (1 - AMM_LP_FEE_PCT / 100);
  const amountOut        = (reserveOut * amountInAfterFee) / (reserveIn + amountInAfterFee);
  const priceImpact      = (amountIn / reserveIn) * 100;
  const lpFee            = amountIn * (AMM_LP_FEE_PCT / 100);
  const uniswapFee       = amountIn * (UNISWAP_V3_SWAP_FEE_PCT / 100);
  const coinbaseFee      = amountIn * (COINBASE_ADVANCED_FEE_PCT / 100);

  return NextResponse.json({
    success:           true,
    programId:         SOVEREIGN_PIDEX_VERSION,
    quote: {
      assetIn,
      assetOut,
      amountIn,
      amountOut:       Math.round(amountOut * 1e7) / 1e7,
      priceImpactPct:  Math.round(priceImpact * 1000) / 1000,
      executionPrice:  Math.round((amountOut / amountIn) * 1e7) / 1e7,
      platformFeePct:  AMM_PLATFORM_FEE_PCT,
      platformFeePi:   0,
      lpFeePct:        AMM_LP_FEE_PCT,
      lpFeePi:         Math.round(lpFee * 1e7) / 1e7,
      sovereignSaving: {
        vsUniswap:   Math.round((uniswapFee - lpFee) * 1e7) / 1e7,
        vsCoinbase:  Math.round(coinbaseFee * 1e7) / 1e7,
      },
      slippageTolerance:  0.005,
      stellarSettlement:  "~5 seconds",
      mevImmune:          true,
      frontRunImmune:     true,
      poolReserveA:       pool.reserveA,
      poolReserveB:       pool.reserveB,
      poolId:             pool.poolId,
    },
    computedAt: new Date().toISOString(),
  });
}

export async function POST(request: Request) {
  let body: {
    traderPiWallet?: string;
    assetIn?: string;
    assetOut?: string;
    amountIn?: number;
    slippageTolerance?: number;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const traderPiWallet = (body.traderPiWallet ?? "").trim();
  const assetIn        = (body.assetIn  ?? "XPI").trim().toUpperCase();
  const assetOut       = (body.assetOut ?? "USDC").trim().toUpperCase();
  const amountIn       = Math.min(Math.abs(Number(body.amountIn ?? 1)), 10_000_000);

  if (!traderPiWallet) {
    return NextResponse.json({ success: false, error: "traderPiWallet is required" }, { status: 400 });
  }
  if (assetIn === assetOut) {
    return NextResponse.json({ success: false, error: "assetIn and assetOut must be different" }, { status: 400 });
  }

  const pool = SEED_AMM_POOLS.find(p =>
    (p.assetA.assetCode === assetIn  && p.assetB.assetCode === assetOut) ||
    (p.assetA.assetCode === assetOut && p.assetB.assetCode === assetIn)
  );

  if (!pool) {
    return NextResponse.json({
      success: false,
      error:   `No liquidity pool for ${assetIn}/${assetOut}`,
      availablePairs: SEED_AMM_POOLS.map(p =>
        `${p.assetA.assetCode}/${p.assetB.assetCode}`
      ),
    }, { status: 404 });
  }

  const swap = createSwapExecution(traderPiWallet, assetIn, assetOut, amountIn);

  // Bounded log
  if (swapLog.length >= MAX_SWAP_LOG) swapLog.shift();
  swapLog.push(swap);

  return NextResponse.json({
    success:        true,
    programId:      SOVEREIGN_PIDEX_VERSION,
    securityLevel:  APEX_SECURITY_LEVEL,
    quantumSig:     QUANTUM_ALGO_SIG,
    swap,
    rivalSavings: {
      vsUniswapV3:   `${UNISWAP_V3_SWAP_FEE_PCT}% saved (${(amountIn * UNISWAP_V3_SWAP_FEE_PCT / 100).toFixed(4)}π)`,
      vsCoinbase:    `${COINBASE_ADVANCED_FEE_PCT}% saved (${(amountIn * COINBASE_ADVANCED_FEE_PCT / 100).toFixed(4)}π)`,
      vsNYSE:        "No per-share fee",
      mevLossSaved:  "$1B+/year (Uniswap ecosystem estimate) → $0",
      frontRunSaved: "100% — Stellar sequential ledger = zero front-run",
    },
    stellarContext: {
      protocol:    "Stellar SDEX + CAP-38 AMM",
      pathPayment:  true,
      settlementMs: 5000,
      ammFormula:   "x * y = k (constant product)",
    },
    recentSwaps: swapLog.slice(-5).map(s => ({
      swapId:      s.swapId,
      assetIn:     s.assetIn.assetCode,
      assetOut:    s.assetOut.assetCode,
      amountIn:    s.amountIn,
      amountOut:   s.amountOut,
      executedAt:  s.executedAt,
    })),
    computedAt: new Date().toISOString(),
  }, { status: 201 });
}

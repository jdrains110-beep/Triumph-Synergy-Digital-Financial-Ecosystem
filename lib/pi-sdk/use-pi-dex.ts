/**
 * lib/pi-sdk/use-pi-dex.ts
 * Custom hook for Pi Dex operations
 */

"use client";

import { useState, useCallback, useEffect } from "react";
import { piDex, Token, TradeOrder, LiquidityPosition, StakingPosition, MarketplaceListing, SwapQuote } from "./pi-dex";
import { usePi } from "./pi-provider";

export interface UsePiDexState {
  // User tokens
  userTokens: Token[];
  userTokenBalances: Record<string, bigint>;

  // Trading state
  activeOrders: TradeOrder[];
  orderHistory: TradeOrder[];
  swapQuote: SwapQuote | null;

  // Liquidity state
  liquidityPositions: LiquidityPosition[];
  availablePools: any[];

  // Staking state
  stakingPositions: StakingPosition[];

  // Marketplace state
  marketplace: MarketplaceListing[];

  // Loading and error states
  loading: boolean;
  error: Error | null;
}

export function usePiDex() {
  const { user, isAuthenticated } = usePi();
  const [state, setState] = useState<UsePiDexState>({
    userTokens: [],
    userTokenBalances: {},
    activeOrders: [],
    orderHistory: [],
    swapQuote: null,
    liquidityPositions: [],
    availablePools: [],
    stakingPositions: [],
    marketplace: [],
    loading: false,
    error: null,
  });

  // ============================================================
  // TOKEN OPERATIONS
  // ============================================================

  /**
   * Create a new token
   */
  const createToken = useCallback(
    async (name: string, symbol: string, totalSupply: number) => {
      if (!isAuthenticated) {
        setState((prev) => ({
          ...prev,
          error: new Error("User must be authenticated"),
        }));
        return null;
      }

      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const response = await fetch("/api/pi-dex/tokens/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, symbol, totalSupply }),
        });

        if (!response.ok) throw new Error("Failed to create token");

        const token = await response.json();
        setState((prev) => ({
          ...prev,
          userTokens: [...prev.userTokens, token],
          loading: false,
        }));

        return token;
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Unknown error");
        setState((prev) => ({ ...prev, error, loading: false }));
        return null;
      }
    },
    [isAuthenticated]
  );

  /**
   * List all tokens
   */
  const listTokens = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch("/api/pi-dex/tokens/list");
      if (!response.ok) throw new Error("Failed to fetch tokens");

      const tokens = await response.json();
      setState((prev) => ({
        ...prev,
        userTokens: tokens,
        loading: false,
      }));
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Unknown error");
      setState((prev) => ({ ...prev, error, loading: false }));
    }
  }, []);

  // ============================================================
  // TRADING OPERATIONS
  // ============================================================

  /**
   * Get swap quote
   */
  const getSwapQuote = useCallback(
    async (tokenAId: string, tokenBId: string, amountA: bigint) => {
      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const response = await fetch("/api/pi-dex/trading/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tokenAId, tokenBId, amountA: amountA.toString() }),
        });

        if (!response.ok) throw new Error("Failed to get quote");

        const quote = await response.json();
        setState((prev) => ({
          ...prev,
          swapQuote: quote,
          loading: false,
        }));

        return quote;
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Unknown error");
        setState((prev) => ({ ...prev, error, loading: false }));
        return null;
      }
    },
    []
  );

  /**
   * Execute swap
   */
  const executeSwap = useCallback(
    async (tokenAId: string, tokenBId: string, amountA: bigint, minAmountOut: bigint) => {
      if (!isAuthenticated) {
        setState((prev) => ({
          ...prev,
          error: new Error("User must be authenticated"),
        }));
        return null;
      }

      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const response = await fetch("/api/pi-dex/trading/swap", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tokenAId,
            tokenBId,
            amountA: amountA.toString(),
            minAmountOut: minAmountOut.toString(),
          }),
        });

        if (!response.ok) throw new Error("Swap failed");

        const result = await response.json();
        await listOrderHistory(); // Refresh orders
        setState((prev) => ({ ...prev, loading: false }));

        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Unknown error");
        setState((prev) => ({ ...prev, error, loading: false }));
        return null;
      }
    },
    [isAuthenticated]
  );

  /**
   * Place order
   */
  const placeOrder = useCallback(
    async (tokenAId: string, tokenBId: string, amountA: bigint, amountB: bigint, type: "buy" | "sell" | "swap") => {
      if (!isAuthenticated) {
        setState((prev) => ({
          ...prev,
          error: new Error("User must be authenticated"),
        }));
        return null;
      }

      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const response = await fetch("/api/pi-dex/trading/order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tokenAId,
            tokenBId,
            amountA: amountA.toString(),
            amountB: amountB.toString(),
            type,
          }),
        });

        if (!response.ok) throw new Error("Failed to place order");

        const order = await response.json();
        setState((prev) => ({
          ...prev,
          activeOrders: [...prev.activeOrders, order],
          loading: false,
        }));

        return order;
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Unknown error");
        setState((prev) => ({ ...prev, error, loading: false }));
        return null;
      }
    },
    [isAuthenticated]
  );

  /**
   * List order history
   */
  const listOrderHistory = useCallback(async () => {
    if (!user?.uid) return;

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch("/api/pi-dex/trading/orders");
      if (!response.ok) throw new Error("Failed to fetch orders");

      const orders = await response.json();
      setState((prev) => ({
        ...prev,
        orderHistory: orders,
        loading: false,
      }));
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Unknown error");
      setState((prev) => ({ ...prev, error, loading: false }));
    }
  }, [user?.uid]);

  // ============================================================
  // LIQUIDITY OPERATIONS
  // ============================================================

  /**
   * Add liquidity
   */
  const addLiquidity = useCallback(
    async (tokenAId: string, tokenBId: string, amountA: bigint, amountB: bigint) => {
      if (!isAuthenticated) {
        setState((prev) => ({
          ...prev,
          error: new Error("User must be authenticated"),
        }));
        return null;
      }

      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const response = await fetch("/api/pi-dex/liquidity/add", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tokenAId,
            tokenBId,
            amountA: amountA.toString(),
            amountB: amountB.toString(),
          }),
        });

        if (!response.ok) throw new Error("Failed to add liquidity");

        const position = await response.json();
        setState((prev) => ({
          ...prev,
          liquidityPositions: [...prev.liquidityPositions, position],
          loading: false,
        }));

        return position;
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Unknown error");
        setState((prev) => ({ ...prev, error, loading: false }));
        return null;
      }
    },
    [isAuthenticated]
  );

  /**
   * Remove liquidity
   */
  const removeLiquidity = useCallback(
    async (positionId: string, lpTokensToRemove: bigint) => {
      if (!isAuthenticated) {
        setState((prev) => ({
          ...prev,
          error: new Error("User must be authenticated"),
        }));
        return null;
      }

      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const response = await fetch("/api/pi-dex/liquidity/remove", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            positionId,
            lpTokensToRemove: lpTokensToRemove.toString(),
          }),
        });

        if (!response.ok) throw new Error("Failed to remove liquidity");

        const result = await response.json();
        setState((prev) => ({
          ...prev,
          liquidityPositions: prev.liquidityPositions.filter((p) => p.id !== positionId),
          loading: false,
        }));

        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Unknown error");
        setState((prev) => ({ ...prev, error, loading: false }));
        return null;
      }
    },
    [isAuthenticated]
  );

  /**
   * Get liquidity positions
   */
  const getLiquidityPositions = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch("/api/pi-dex/liquidity/positions");
      if (!response.ok) throw new Error("Failed to fetch positions");

      const positions = await response.json();
      setState((prev) => ({
        ...prev,
        liquidityPositions: positions,
        loading: false,
      }));
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Unknown error");
      setState((prev) => ({ ...prev, error, loading: false }));
    }
  }, []);

  // ============================================================
  // STAKING OPERATIONS
  // ============================================================

  /**
   * Stake tokens
   */
  const stakeTokens = useCallback(
    async (tokenId: string, amount: bigint, lockupPeriod: number) => {
      if (!isAuthenticated) {
        setState((prev) => ({
          ...prev,
          error: new Error("User must be authenticated"),
        }));
        return null;
      }

      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const response = await fetch("/api/pi-dex/staking/stake", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tokenId,
            amount: amount.toString(),
            lockupPeriod,
          }),
        });

        if (!response.ok) throw new Error("Failed to stake");

        const position = await response.json();
        setState((prev) => ({
          ...prev,
          stakingPositions: [...prev.stakingPositions, position],
          loading: false,
        }));

        return position;
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Unknown error");
        setState((prev) => ({ ...prev, error, loading: false }));
        return null;
      }
    },
    [isAuthenticated]
  );

  /**
   * Unstake tokens
   */
  const unstakeTokens = useCallback(
    async (positionId: string) => {
      if (!isAuthenticated) {
        setState((prev) => ({
          ...prev,
          error: new Error("User must be authenticated"),
        }));
        return null;
      }

      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const response = await fetch("/api/pi-dex/staking/unstake", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ positionId }),
        });

        if (!response.ok) throw new Error("Failed to unstake");

        const result = await response.json();
        setState((prev) => ({
          ...prev,
          stakingPositions: prev.stakingPositions.filter((p) => p.id !== positionId),
          loading: false,
        }));

        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Unknown error");
        setState((prev) => ({ ...prev, error, loading: false }));
        return null;
      }
    },
    [isAuthenticated]
  );

  /**
   * Get staking positions
   */
  const getStakingPositions = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const response = await fetch("/api/pi-dex/staking/positions");
      if (!response.ok) throw new Error("Failed to fetch positions");

      const positions = await response.json();
      setState((prev) => ({
        ...prev,
        stakingPositions: positions,
        loading: false,
      }));
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Unknown error");
      setState((prev) => ({ ...prev, error, loading: false }));
    }
  }, []);

  // ============================================================
  // MARKETPLACE OPERATIONS
  // ============================================================

  /**
   * List on marketplace
   */
  const listOnMarketplace = useCallback(
    async (tokenId: string, amount: bigint, price: number, category: string, description: string) => {
      if (!isAuthenticated) {
        setState((prev) => ({
          ...prev,
          error: new Error("User must be authenticated"),
        }));
        return null;
      }

      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const response = await fetch("/api/pi-dex/marketplace/list", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tokenId,
            amount: amount.toString(),
            price,
            category,
            description,
          }),
        });

        if (!response.ok) throw new Error("Failed to list");

        const listing = await response.json();
        setState((prev) => ({
          ...prev,
          marketplace: [...prev.marketplace, listing],
          loading: false,
        }));

        return listing;
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Unknown error");
        setState((prev) => ({ ...prev, error, loading: false }));
        return null;
      }
    },
    [isAuthenticated]
  );

  /**
   * Buy from marketplace
   */
  const buyFromMarketplace = useCallback(
    async (listingId: string, quantity: bigint) => {
      if (!isAuthenticated) {
        setState((prev) => ({
          ...prev,
          error: new Error("User must be authenticated"),
        }));
        return null;
      }

      setState((prev) => ({ ...prev, loading: true, error: null }));

      try {
        const response = await fetch("/api/pi-dex/marketplace/buy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            listingId,
            quantity: quantity.toString(),
          }),
        });

        if (!response.ok) throw new Error("Purchase failed");

        const result = await response.json();
        setState((prev) => ({ ...prev, loading: false }));

        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Unknown error");
        setState((prev) => ({ ...prev, error, loading: false }));
        return null;
      }
    },
    [isAuthenticated]
  );

  /**
   * Get marketplace listings
   */
  const getMarketplaceListings = useCallback(async (category?: string) => {
    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      const url = new URL("/api/pi-dex/marketplace/listings", window.location.origin);
      if (category) url.searchParams.append("category", category);

      const response = await fetch(url.toString());
      if (!response.ok) throw new Error("Failed to fetch listings");

      const listings = await response.json();
      setState((prev) => ({
        ...prev,
        marketplace: listings,
        loading: false,
      }));
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Unknown error");
      setState((prev) => ({ ...prev, error, loading: false }));
    }
  }, []);

  // Load initial data
  useEffect(() => {
    if (isAuthenticated) {
      listTokens();
      listOrderHistory();
      getLiquidityPositions();
      getStakingPositions();
      getMarketplaceListings();
    }
  }, [isAuthenticated]);

  return {
    ...state,
    // Token operations
    createToken,
    listTokens,
    // Trading operations
    getSwapQuote,
    executeSwap,
    placeOrder,
    listOrderHistory,
    // Liquidity operations
    addLiquidity,
    removeLiquidity,
    getLiquidityPositions,
    // Staking operations
    stakeTokens,
    unstakeTokens,
    getStakingPositions,
    // Marketplace operations
    listOnMarketplace,
    buyFromMarketplace,
    getMarketplaceListings,
  };
}

/**
 * components/pi-dex/trading-interface.tsx
 * Advanced trading interface component
 */

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { usePiDex } from "@/lib/pi-sdk/use-pi-dex";

export function TradingInterface() {
  const { executeSwap, getSwapQuote, activeOrders, loading, error, swapQuote } =
    usePiDex();
  const [formData, setFormData] = useState({
    tokenA: "",
    tokenB: "",
    amountA: "",
  });

  const handleGetQuote = async () => {
    if (!formData.tokenA || !formData.tokenB || !formData.amountA) {
      return;
    }
    await getSwapQuote(
      formData.tokenA,
      formData.tokenB,
      BigInt(formData.amountA)
    );
  };

  const handleExecuteSwap = async () => {
    if (!swapQuote) {
      return;
    }
    await executeSwap(
      formData.tokenA,
      formData.tokenB,
      BigInt(formData.amountA),
      swapQuote.estimatedOutput
    );
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Trading Form */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Token Swap</CardTitle>
          <CardDescription>Trade tokens instantly</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="font-medium text-sm" htmlFor="from-token">
                From Token
              </label>
              <Input
                id="from-token"
                onChange={(e) =>
                  setFormData({ ...formData, tokenA: e.target.value })
                }
                placeholder="Token ID"
                value={formData.tokenA}
              />
            </div>
            <div>
              <label className="font-medium text-sm" htmlFor="to-token">
                To Token
              </label>
              <Input
                id="to-token"
                onChange={(e) =>
                  setFormData({ ...formData, tokenB: e.target.value })
                }
                placeholder="Token ID"
                value={formData.tokenB}
              />
            </div>
          </div>

          <div>
            <label className="font-medium text-sm" htmlFor="swap-amount">
              Amount
            </label>
            <Input
              id="swap-amount"
              onChange={(e) =>
                setFormData({ ...formData, amountA: e.target.value })
              }
              placeholder="Amount to swap"
              type="number"
              value={formData.amountA}
            />
          </div>

          {swapQuote && (
            <div className="space-y-2 rounded bg-blue-50 p-3">
              <div className="flex justify-between">
                <span>You send:</span>
                <span className="font-semibold">{formData.amountA}</span>
              </div>
              <div className="flex justify-between">
                <span>You receive:</span>
                <span className="font-semibold">
                  {swapQuote.estimatedOutput.toString()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Price Impact:</span>
                <span>{swapQuote.priceImpact.toFixed(2)}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Fee:</span>
                <span>{swapQuote.fee.toString()}</span>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded bg-red-100 p-2 text-red-700 text-sm">
              {error.message}
            </div>
          )}

          <div className="flex gap-2">
            <Button
              disabled={loading}
              onClick={handleGetQuote}
              variant="outline"
            >
              {loading ? "Loading..." : "Get Quote"}
            </Button>
            <Button
              disabled={!swapQuote || loading}
              onClick={handleExecuteSwap}
            >
              {loading ? "Swapping..." : "Execute Swap"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {activeOrders.length === 0 ? (
            <p className="text-gray-500 text-sm">No active orders</p>
          ) : (
            <div className="space-y-2">
              {activeOrders.map((order) => (
                <div className="rounded border p-2 text-sm" key={order.id}>
                  <div className="flex justify-between">
                    <span className="font-medium">{order.type}</span>
                    <span
                      className={
                        order.status === "filled"
                          ? "text-green-600"
                          : "text-yellow-600"
                      }
                    >
                      {order.status}
                    </span>
                  </div>
                  <div className="text-gray-600 text-xs">
                    {order.amountA.toString()} → {order.amountB.toString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

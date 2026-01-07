/**
 * components/pi-dex/trading-interface.tsx
 * Advanced trading interface component
 */

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { usePiDex } from "@/lib/pi-sdk/use-pi-dex";

export function TradingInterface() {
  const { executeSwap, getSwapQuote, activeOrders, loading, error, swapQuote } = usePiDex();
  const [formData, setFormData] = useState({
    tokenA: "",
    tokenB: "",
    amountA: "",
  });

  const handleGetQuote = async () => {
    if (!formData.tokenA || !formData.tokenB || !formData.amountA) return;
    await getSwapQuote(formData.tokenA, formData.tokenB, BigInt(formData.amountA));
  };

  const handleExecuteSwap = async () => {
    if (!swapQuote) return;
    await executeSwap(formData.tokenA, formData.tokenB, BigInt(formData.amountA), swapQuote.estimatedOutput);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Trading Form */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Token Swap</CardTitle>
          <CardDescription>Trade tokens instantly</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">From Token</label>
              <Input
                placeholder="Token ID"
                value={formData.tokenA}
                onChange={(e) => setFormData({ ...formData, tokenA: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">To Token</label>
              <Input
                placeholder="Token ID"
                value={formData.tokenB}
                onChange={(e) => setFormData({ ...formData, tokenB: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Amount</label>
            <Input
              type="number"
              placeholder="Amount to swap"
              value={formData.amountA}
              onChange={(e) => setFormData({ ...formData, amountA: e.target.value })}
            />
          </div>

          {swapQuote && (
            <div className="p-3 bg-blue-50 rounded space-y-2">
              <div className="flex justify-between">
                <span>You send:</span>
                <span className="font-semibold">{formData.amountA}</span>
              </div>
              <div className="flex justify-between">
                <span>You receive:</span>
                <span className="font-semibold">{swapQuote.estimatedOutput.toString()}</span>
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

          {error && <div className="p-2 bg-red-100 text-red-700 rounded text-sm">{error.message}</div>}

          <div className="flex gap-2">
            <Button onClick={handleGetQuote} variant="outline" disabled={loading}>
              {loading ? "Loading..." : "Get Quote"}
            </Button>
            <Button onClick={handleExecuteSwap} disabled={!swapQuote || loading}>
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
            <p className="text-sm text-gray-500">No active orders</p>
          ) : (
            <div className="space-y-2">
              {activeOrders.map((order) => (
                <div key={order.id} className="p-2 border rounded text-sm">
                  <div className="flex justify-between">
                    <span className="font-medium">{order.type}</span>
                    <span className={order.status === "filled" ? "text-green-600" : "text-yellow-600"}>
                      {order.status}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600">
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

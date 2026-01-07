/**
 * components/pi-dex/liquidity-pool.tsx
 * Liquidity pool management component
 */

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { usePiDex } from "@/lib/pi-sdk/use-pi-dex";

export function LiquidityPool() {
  const { addLiquidity, removeLiquidity, liquidityPositions, loading, error } = usePiDex();
  const [mode, setMode] = useState<"add" | "remove">("add");
  const [formData, setFormData] = useState({
    tokenA: "",
    tokenB: "",
    amountA: "",
    amountB: "",
  });

  const handleAddLiquidity = async () => {
    await addLiquidity(formData.tokenA, formData.tokenB, BigInt(formData.amountA), BigInt(formData.amountB));
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Liquidity Pool</CardTitle>
        <CardDescription>Provide liquidity and earn rewards</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Mode Selector */}
        <div className="flex gap-2 border-b">
          <Button
            variant={mode === "add" ? "default" : "ghost"}
            onClick={() => setMode("add")}
            className="flex-1"
          >
            Add Liquidity
          </Button>
          <Button
            variant={mode === "remove" ? "default" : "ghost"}
            onClick={() => setMode("remove")}
            className="flex-1"
          >
            Remove Liquidity
          </Button>
        </div>

        {mode === "add" ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Token A</label>
                <Input
                  placeholder="Token ID"
                  value={formData.tokenA}
                  onChange={(e) => setFormData({ ...formData, tokenA: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Token B</label>
                <Input
                  placeholder="Token ID"
                  value={formData.tokenB}
                  onChange={(e) => setFormData({ ...formData, tokenB: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Amount A</label>
                <Input
                  type="number"
                  placeholder="Amount"
                  value={formData.amountA}
                  onChange={(e) => setFormData({ ...formData, amountA: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Amount B</label>
                <Input
                  type="number"
                  placeholder="Amount"
                  value={formData.amountB}
                  onChange={(e) => setFormData({ ...formData, amountB: e.target.value })}
                />
              </div>
            </div>

            {error && <div className="p-2 bg-red-100 text-red-700 rounded text-sm">{error.message}</div>}

            <Button onClick={handleAddLiquidity} disabled={loading} className="w-full">
              {loading ? "Adding..." : "Add Liquidity"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {liquidityPositions.length === 0 ? (
              <p className="text-center text-gray-500">No liquidity positions</p>
            ) : (
              <div className="space-y-3">
                {liquidityPositions.map((position) => (
                  <div key={position.id} className="p-3 border rounded space-y-2">
                    <div className="flex justify-between">
                      <span className="font-medium">{position.poolId}</span>
                      <span className="text-sm text-gray-600">{position.sharePercentage.toFixed(2)}%</span>
                    </div>
                    <div className="text-sm text-gray-600">
                      LP Tokens: {position.lpTokens.toString()}
                    </div>
                    <div className="text-sm text-green-600">
                      Rewards: {position.rewardsEarned.toString()}
                    </div>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => removeLiquidity(position.id, position.lpTokens)}
                      disabled={loading}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

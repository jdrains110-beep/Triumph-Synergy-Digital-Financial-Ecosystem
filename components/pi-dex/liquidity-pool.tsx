/**
 * components/pi-dex/liquidity-pool.tsx
 * Liquidity pool management component
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

export function LiquidityPool() {
  const { addLiquidity, removeLiquidity, liquidityPositions, loading, error } =
    usePiDex();
  const [mode, setMode] = useState<"add" | "remove">("add");
  const [formData, setFormData] = useState({
    tokenA: "",
    tokenB: "",
    amountA: "",
    amountB: "",
  });

  const handleAddLiquidity = async () => {
    await addLiquidity(
      formData.tokenA,
      formData.tokenB,
      BigInt(formData.amountA),
      BigInt(formData.amountB)
    );
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
            className="flex-1"
            onClick={() => setMode("add")}
            variant={mode === "add" ? "default" : "ghost"}
          >
            Add Liquidity
          </Button>
          <Button
            className="flex-1"
            onClick={() => setMode("remove")}
            variant={mode === "remove" ? "default" : "ghost"}
          >
            Remove Liquidity
          </Button>
        </div>

        {mode === "add" ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="font-medium text-sm">Token A</label>
                <Input
                  onChange={(e) =>
                    setFormData({ ...formData, tokenA: e.target.value })
                  }
                  placeholder="Token ID"
                  value={formData.tokenA}
                />
              </div>
              <div>
                <label className="font-medium text-sm">Token B</label>
                <Input
                  onChange={(e) =>
                    setFormData({ ...formData, tokenB: e.target.value })
                  }
                  placeholder="Token ID"
                  value={formData.tokenB}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="font-medium text-sm">Amount A</label>
                <Input
                  onChange={(e) =>
                    setFormData({ ...formData, amountA: e.target.value })
                  }
                  placeholder="Amount"
                  type="number"
                  value={formData.amountA}
                />
              </div>
              <div>
                <label className="font-medium text-sm">Amount B</label>
                <Input
                  onChange={(e) =>
                    setFormData({ ...formData, amountB: e.target.value })
                  }
                  placeholder="Amount"
                  type="number"
                  value={formData.amountB}
                />
              </div>
            </div>

            {error && (
              <div className="rounded bg-red-100 p-2 text-red-700 text-sm">
                {error.message}
              </div>
            )}

            <Button
              className="w-full"
              disabled={loading}
              onClick={handleAddLiquidity}
            >
              {loading ? "Adding..." : "Add Liquidity"}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {liquidityPositions.length === 0 ? (
              <p className="text-center text-gray-500">
                No liquidity positions
              </p>
            ) : (
              <div className="space-y-3">
                {liquidityPositions.map((position) => (
                  <div
                    className="space-y-2 rounded border p-3"
                    key={position.id}
                  >
                    <div className="flex justify-between">
                      <span className="font-medium">{position.poolId}</span>
                      <span className="text-gray-600 text-sm">
                        {position.sharePercentage.toFixed(2)}%
                      </span>
                    </div>
                    <div className="text-gray-600 text-sm">
                      LP Tokens: {position.lpTokens.toString()}
                    </div>
                    <div className="text-green-600 text-sm">
                      Rewards: {position.rewardsEarned.toString()}
                    </div>
                    <Button
                      disabled={loading}
                      onClick={() =>
                        removeLiquidity(position.id, position.lpTokens)
                      }
                      size="sm"
                      variant="destructive"
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

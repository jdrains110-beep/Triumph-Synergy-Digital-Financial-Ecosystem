/**
 * components/pi-dex/staking-dashboard.tsx
 * Staking management component
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

const LOCKUP_PERIODS = [7, 30, 90, 180, 365];
const APY_RATES = [5, 7.5, 10, 12.5, 15];

export function StakingDashboard() {
  const { stakeTokens, unstakeTokens, stakingPositions, loading, error } =
    usePiDex();
  const [formData, setFormData] = useState({
    tokenId: "",
    amount: "",
    lockupPeriod: 30,
  });

  const handleStake = async () => {
    await stakeTokens(
      formData.tokenId,
      BigInt(formData.amount),
      formData.lockupPeriod
    );
    setFormData({ tokenId: "", amount: "", lockupPeriod: 30 });
  };

  const lockupIndex = LOCKUP_PERIODS.indexOf(formData.lockupPeriod);
  const apy = lockupIndex !== -1 ? APY_RATES[lockupIndex] : 0;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Stake Form */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Stake Tokens</CardTitle>
          <CardDescription>Lock tokens and earn rewards</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="font-medium text-sm">Token ID</label>
            <Input
              onChange={(e) =>
                setFormData({ ...formData, tokenId: e.target.value })
              }
              placeholder="Select token to stake"
              value={formData.tokenId}
            />
          </div>

          <div>
            <label className="font-medium text-sm">Amount</label>
            <Input
              onChange={(e) =>
                setFormData({ ...formData, amount: e.target.value })
              }
              placeholder="Enter amount"
              type="number"
              value={formData.amount}
            />
          </div>

          <div>
            <label className="font-medium text-sm">Lockup Period (days)</label>
            <select
              className="w-full rounded border px-3 py-2"
              onChange={(e) =>
                setFormData({
                  ...formData,
                  lockupPeriod: Number.parseInt(e.target.value, 10),
                })
              }
              value={formData.lockupPeriod}
            >
              {LOCKUP_PERIODS.map((period, idx) => (
                <option key={period} value={period}>
                  {period} days - {APY_RATES[idx]}% APY
                </option>
              ))}
            </select>
          </div>

          <div className="rounded bg-blue-50 p-3">
            <div className="mb-2 flex justify-between">
              <span className="text-sm">Annual Reward Rate:</span>
              <span className="font-semibold">{apy}% APY</span>
            </div>
            {formData.amount && (
              <div className="flex justify-between">
                <span className="text-sm">Estimated Reward:</span>
                <span className="font-semibold">
                  {(
                    (Number.parseFloat(formData.amount) *
                      apy *
                      formData.lockupPeriod) /
                    36_500
                  ).toFixed(4)}{" "}
                  tokens
                </span>
              </div>
            )}
          </div>

          {error && (
            <div className="rounded bg-red-100 p-2 text-red-700 text-sm">
              {error.message}
            </div>
          )}

          <Button
            className="w-full"
            disabled={loading || !formData.tokenId || !formData.amount}
            onClick={handleStake}
          >
            {loading ? "Staking..." : "Stake Now"}
          </Button>
        </CardContent>
      </Card>

      {/* Staking Positions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Your Stakes</CardTitle>
        </CardHeader>
        <CardContent>
          {stakingPositions.length === 0 ? (
            <p className="text-gray-500 text-sm">No active stakes</p>
          ) : (
            <div className="space-y-3">
              {stakingPositions.map((position) => (
                <div
                  className="space-y-1 rounded border p-2 text-sm"
                  key={position.id}
                >
                  <div className="font-medium">{position.tokenId}</div>
                  <div className="text-gray-600 text-xs">
                    Amount: {position.amount.toString()}
                  </div>
                  <div className="text-gray-600 text-xs">
                    APY: {position.apy}%
                  </div>
                  <div className="text-green-600 text-xs">
                    Rewards: {position.rewardsEarned.toString()}
                  </div>
                  <div className="text-gray-600 text-xs">
                    Unlocks: {new Date(position.unlocksAt).toLocaleDateString()}
                  </div>
                  {new Date() >= new Date(position.unlocksAt) && (
                    <Button
                      className="mt-1 w-full"
                      disabled={loading}
                      onClick={() => unstakeTokens(position.id)}
                      size="sm"
                      variant="outline"
                    >
                      Unstake
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

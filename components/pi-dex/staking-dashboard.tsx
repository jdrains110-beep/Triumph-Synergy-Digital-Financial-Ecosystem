/**
 * components/pi-dex/staking-dashboard.tsx
 * Staking management component
 */

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { usePiDex } from "@/lib/pi-sdk/use-pi-dex";

const LOCKUP_PERIODS = [7, 30, 90, 180, 365];
const APY_RATES = [5, 7.5, 10, 12.5, 15];

export function StakingDashboard() {
  const { stakeTokens, unstakeTokens, stakingPositions, loading, error } = usePiDex();
  const [formData, setFormData] = useState({
    tokenId: "",
    amount: "",
    lockupPeriod: 30,
  });

  const handleStake = async () => {
    await stakeTokens(formData.tokenId, BigInt(formData.amount), formData.lockupPeriod);
    setFormData({ tokenId: "", amount: "", lockupPeriod: 30 });
  };

  const lockupIndex = LOCKUP_PERIODS.indexOf(formData.lockupPeriod);
  const apy = lockupIndex !== -1 ? APY_RATES[lockupIndex] : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Stake Form */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Stake Tokens</CardTitle>
          <CardDescription>Lock tokens and earn rewards</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Token ID</label>
            <Input
              placeholder="Select token to stake"
              value={formData.tokenId}
              onChange={(e) => setFormData({ ...formData, tokenId: e.target.value })}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Amount</label>
            <Input
              type="number"
              placeholder="Enter amount"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Lockup Period (days)</label>
            <select
              className="w-full px-3 py-2 border rounded"
              value={formData.lockupPeriod}
              onChange={(e) => setFormData({ ...formData, lockupPeriod: parseInt(e.target.value) })}
            >
              {LOCKUP_PERIODS.map((period, idx) => (
                <option key={period} value={period}>
                  {period} days - {APY_RATES[idx]}% APY
                </option>
              ))}
            </select>
          </div>

          <div className="p-3 bg-blue-50 rounded">
            <div className="flex justify-between mb-2">
              <span className="text-sm">Annual Reward Rate:</span>
              <span className="font-semibold">{apy}% APY</span>
            </div>
            {formData.amount && (
              <div className="flex justify-between">
                <span className="text-sm">Estimated Reward:</span>
                <span className="font-semibold">
                  {(parseFloat(formData.amount) * apy * formData.lockupPeriod / 36500).toFixed(4)} tokens
                </span>
              </div>
            )}
          </div>

          {error && <div className="p-2 bg-red-100 text-red-700 rounded text-sm">{error.message}</div>}

          <Button onClick={handleStake} disabled={loading || !formData.tokenId || !formData.amount} className="w-full">
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
            <p className="text-sm text-gray-500">No active stakes</p>
          ) : (
            <div className="space-y-3">
              {stakingPositions.map((position) => (
                <div key={position.id} className="p-2 border rounded text-sm space-y-1">
                  <div className="font-medium">{position.tokenId}</div>
                  <div className="text-xs text-gray-600">
                    Amount: {position.amount.toString()}
                  </div>
                  <div className="text-xs text-gray-600">
                    APY: {position.apy}%
                  </div>
                  <div className="text-xs text-green-600">
                    Rewards: {position.rewardsEarned.toString()}
                  </div>
                  <div className="text-xs text-gray-600">
                    Unlocks: {new Date(position.unlocksAt).toLocaleDateString()}
                  </div>
                  {new Date() >= new Date(position.unlocksAt) && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => unstakeTokens(position.id)}
                      disabled={loading}
                      className="w-full mt-1"
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

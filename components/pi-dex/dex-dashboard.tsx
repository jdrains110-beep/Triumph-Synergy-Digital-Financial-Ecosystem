/**
 * components/pi-dex/dex-dashboard.tsx
 * Main Pi Dex dashboard
 */

"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TokenCreator } from "./token-creator";
import { TradingInterface } from "./trading-interface";
import { LiquidityPool } from "./liquidity-pool";
import { StakingDashboard } from "./staking-dashboard";
import { Marketplace } from "./marketplace";

export function DexDashboard() {
  return (
    <div className="w-full space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-lg">
        <h1 className="text-3xl font-bold mb-2">Pi Dex - Digital Financial Ecosystem</h1>
        <p className="text-blue-100">
          Complete decentralized exchange for token trading, creation, and financial services
        </p>
      </div>

      <Tabs defaultValue="tokens" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="tokens">Create Tokens</TabsTrigger>
          <TabsTrigger value="trading">Trade</TabsTrigger>
          <TabsTrigger value="liquidity">Liquidity</TabsTrigger>
          <TabsTrigger value="staking">Stake</TabsTrigger>
          <TabsTrigger value="marketplace">Marketplace</TabsTrigger>
        </TabsList>

        <TabsContent value="tokens" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="bg-gray-50 p-6 rounded-lg space-y-4">
                <h2 className="text-2xl font-bold">Token Creation</h2>
                <p className="text-gray-600">
                  Launch your own token on the Pi Network. Tokens created here can be traded, staked, and used throughout the ecosystem.
                </p>
                <div className="bg-white p-4 rounded border border-gray-200">
                  <h3 className="font-semibold mb-2">Requirements:</h3>
                  <ul className="text-sm space-y-1 list-disc list-inside">
                    <li>Token name (1-50 characters)</li>
                    <li>Symbol (1-10 characters)</li>
                    <li>Total supply (1 - 1 billion tokens)</li>
                    <li>Creation fee: 10 Pi</li>
                  </ul>
                </div>
              </div>
            </div>
            <TokenCreator />
          </div>
        </TabsContent>

        <TabsContent value="trading" className="space-y-6">
          <div className="bg-gray-50 p-6 rounded-lg mb-6">
            <h2 className="text-2xl font-bold mb-2">Token Trading</h2>
            <p className="text-gray-600">
              Swap tokens instantly with market prices. Trading fee: 0.25% per transaction.
            </p>
          </div>
          <TradingInterface />
        </TabsContent>

        <TabsContent value="liquidity" className="space-y-6">
          <div className="bg-gray-50 p-6 rounded-lg mb-6">
            <h2 className="text-2xl font-bold mb-2">Liquidity Provision</h2>
            <p className="text-gray-600">
              Earn passive income by providing liquidity to token pairs. Minimum liquidity: 100 tokens.
              Annual rewards: 2% - 15% depending on lock-up period.
            </p>
          </div>
          <LiquidityPool />
        </TabsContent>

        <TabsContent value="staking" className="space-y-6">
          <div className="bg-gray-50 p-6 rounded-lg mb-6">
            <h2 className="text-2xl font-bold mb-2">Token Staking</h2>
            <p className="text-gray-600">
              Lock your tokens and earn rewards. Choose from flexible lock-up periods: 7, 30, 90, 180, or 365 days.
            </p>
          </div>
          <StakingDashboard />
        </TabsContent>

        <TabsContent value="marketplace" className="space-y-6">
          <div className="bg-gray-50 p-6 rounded-lg mb-6">
            <h2 className="text-2xl font-bold mb-2">Token Marketplace</h2>
            <p className="text-gray-600">
              Buy and sell tokens on our peer-to-peer marketplace. Listing fee: 1 Pi + 0.1% of listing amount.
              Commission: 2.5% on all sales.
            </p>
          </div>
          <Marketplace />
        </TabsContent>
      </Tabs>
    </div>
  );
}

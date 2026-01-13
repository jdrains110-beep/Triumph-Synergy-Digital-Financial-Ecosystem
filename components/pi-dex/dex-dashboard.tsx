/**
 * components/pi-dex/dex-dashboard.tsx
 * Main Pi Dex dashboard
 */

"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LiquidityPool } from "./liquidity-pool";
import { Marketplace } from "./marketplace";
import { StakingDashboard } from "./staking-dashboard";
import { TokenCreator } from "./token-creator";
import { TradingInterface } from "./trading-interface";

export function DexDashboard() {
	return (
		<div className="w-full space-y-6">
			<div className="rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-white">
				<h1 className="mb-2 font-bold text-3xl">
					Pi Dex - Digital Financial Ecosystem
				</h1>
				<p className="text-blue-100">
					Complete decentralized exchange for token trading, creation, and
					financial services
				</p>
			</div>

			<Tabs className="w-full" defaultValue="tokens">
				<TabsList className="grid w-full grid-cols-5">
					<TabsTrigger value="tokens">Create Tokens</TabsTrigger>
					<TabsTrigger value="trading">Trade</TabsTrigger>
					<TabsTrigger value="liquidity">Liquidity</TabsTrigger>
					<TabsTrigger value="staking">Stake</TabsTrigger>
					<TabsTrigger value="marketplace">Marketplace</TabsTrigger>
				</TabsList>

				<TabsContent className="space-y-6" value="tokens">
					<div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
						<div className="lg:col-span-2">
							<div className="space-y-4 rounded-lg bg-gray-50 p-6">
								<h2 className="font-bold text-2xl">Token Creation</h2>
								<p className="text-gray-600">
									Launch your own token on the Pi Network. Tokens created here
									can be traded, staked, and used throughout the ecosystem.
								</p>
								<div className="rounded border border-gray-200 bg-white p-4">
									<h3 className="mb-2 font-semibold">Requirements:</h3>
									<ul className="list-inside list-disc space-y-1 text-sm">
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

				<TabsContent className="space-y-6" value="trading">
					<div className="mb-6 rounded-lg bg-gray-50 p-6">
						<h2 className="mb-2 font-bold text-2xl">Token Trading</h2>
						<p className="text-gray-600">
							Swap tokens instantly with market prices. Trading fee: 0.25% per
							transaction.
						</p>
					</div>
					<TradingInterface />
				</TabsContent>

				<TabsContent className="space-y-6" value="liquidity">
					<div className="mb-6 rounded-lg bg-gray-50 p-6">
						<h2 className="mb-2 font-bold text-2xl">Liquidity Provision</h2>
						<p className="text-gray-600">
							Earn passive income by providing liquidity to token pairs. Minimum
							liquidity: 100 tokens. Annual rewards: 2% - 15% depending on
							lock-up period.
						</p>
					</div>
					<LiquidityPool />
				</TabsContent>

				<TabsContent className="space-y-6" value="staking">
					<div className="mb-6 rounded-lg bg-gray-50 p-6">
						<h2 className="mb-2 font-bold text-2xl">Token Staking</h2>
						<p className="text-gray-600">
							Lock your tokens and earn rewards. Choose from flexible lock-up
							periods: 7, 30, 90, 180, or 365 days.
						</p>
					</div>
					<StakingDashboard />
				</TabsContent>

				<TabsContent className="space-y-6" value="marketplace">
					<div className="mb-6 rounded-lg bg-gray-50 p-6">
						<h2 className="mb-2 font-bold text-2xl">Token Marketplace</h2>
						<p className="text-gray-600">
							Buy and sell tokens on our peer-to-peer marketplace. Listing fee:
							1 Pi + 0.1% of listing amount. Commission: 2.5% on all sales.
						</p>
					</div>
					<Marketplace />
				</TabsContent>
			</Tabs>
		</div>
	);
}

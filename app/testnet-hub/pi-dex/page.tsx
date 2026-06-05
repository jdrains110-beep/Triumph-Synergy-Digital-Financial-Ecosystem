import Link from "next/link";
import { auth } from "@/app/(auth)/auth";
import { redirect } from "next/navigation";

export const metadata = {
    title: "pi-Dex Trading - Triumph Synergy Testnet",
    description: "Trade and swap Pi for TriSyn with real-time pricing",
};

export default async function PiDexPage() {
    const session = await auth();
    if (!session) redirect("/api/auth/guest?redirectUrl=/testnet-hub/pi-dex");

    // Mock trading data
    const tradingPairs = [
        { id: 1, from: "Pi", to: "TriSyn", rate: 1.0, volume24h: "15,234" },
        { id: 2, from: "TriSyn", to: "Pi", rate: 1.0, volume24h: "15,234" },
    ];

    const orderHistory = [
        { id: 1, type: "BUY", from: "Pi", to: "TriSyn", amount: "100", rate: "1.0", timestamp: "2 hours ago" },
        { id: 2, type: "SELL", from: "TriSyn", to: "Pi", amount: "500", rate: "1.0", timestamp: "4 hours ago" },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-900 to-slate-900">
            {/* Header */}
            <header className="border-b border-blue-500/20 bg-black/40 backdrop-blur-xl sticky top-0 z-40">
                <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link href="/testnet-hub" className="text-gray-400 hover:text-white transition-colors">← Back</Link>
                            <div>
                                <h1 className="text-3xl font-bold text-white">💱 pi-Dex Trading</h1>
                                <p className="text-sm text-gray-400">Real-time trading, swaps, and exchange</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-semibold text-cyan-300">Testnet Network</p>
                        </div>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Trading Panel */}
                    <div className="lg:col-span-2">
                        {/* Active Trading Card */}
                        <div className="rounded-xl bg-gradient-to-br from-blue-900/50 to-cyan-900/50 border border-cyan-500/30 p-8 mb-8">
                            <h2 className="text-2xl font-bold text-white mb-6">Quick Swap</h2>

                            <div className="space-y-6">
                                {/* From Section */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-300 mb-2">Send</label>
                                    <div className="flex gap-3">
                                        <input
                                            type="number"
                                            placeholder="0.00"
                                            className="flex-1 rounded-lg bg-black/40 border border-cyan-500/30 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400 transition-colors"
                                        />
                                        <select className="rounded-lg bg-black/40 border border-cyan-500/30 px-4 py-3 text-white focus:outline-none focus:border-cyan-400 transition-colors">
                                            <option>Pi</option>
                                            <option>TriSyn</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Swap Button */}
                                <div className="flex justify-center">
                                    <button className="p-3 rounded-full bg-gradient-to-r from-cyan-500/50 to-blue-500/50 hover:from-cyan-500 hover:to-blue-500 transition-all border border-cyan-400/50">
                                        ⇅
                                    </button>
                                </div>

                                {/* To Section */}
                                <div>
                                    <label className="block text-sm font-semibold text-gray-300 mb-2">Receive</label>
                                    <div className="flex gap-3">
                                        <input
                                            type="number"
                                            placeholder="0.00"
                                            disabled
                                            className="flex-1 rounded-lg bg-black/40 border border-cyan-500/30 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400 transition-colors disabled:opacity-50"
                                        />
                                        <select className="rounded-lg bg-black/40 border border-cyan-500/30 px-4 py-3 text-white focus:outline-none focus:border-cyan-400 transition-colors">
                                            <option>TriSyn</option>
                                            <option>Pi</option>
                                        </select>
                                    </div>
                                </div>

                                {/* Rate Info */}
                                <div className="rounded-lg bg-black/40 border border-cyan-500/20 p-4">
                                    <div className="flex justify-between text-sm mb-2">
                                        <span className="text-gray-400">Exchange Rate</span>
                                        <span className="font-bold text-cyan-300">1 Pi = 1.00 TriSyn</span>
                                    </div>
                                    <div className="flex justify-between text-sm mb-2">
                                        <span className="text-gray-400">Fee</span>
                                        <span className="font-bold text-cyan-300">0.1%</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-400">Slippage Tolerance</span>
                                        <span className="font-bold text-cyan-300">0.5%</span>
                                    </div>
                                </div>

                                {/* Swap Button */}
                                <button className="w-full py-4 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 font-bold text-white hover:shadow-lg hover:shadow-cyan-500/50 transition-all">
                                    Execute Swap
                                </button>
                            </div>
                        </div>

                        {/* Trading Pairs */}
                        <div className="rounded-xl bg-gradient-to-br from-blue-900/30 to-cyan-900/30 border border-cyan-500/20 p-6">
                            <h3 className="text-xl font-bold text-white mb-4">Market Pairs</h3>
                            <div className="space-y-3">
                                {tradingPairs.map((pair) => (
                                    <div key={pair.id} className="flex items-center justify-between p-4 rounded-lg bg-black/40 hover:bg-black/60 transition-colors">
                                        <div className="flex-1">
                                            <p className="font-semibold text-white">{pair.from} → {pair.to}</p>
                                            <p className="text-xs text-gray-400">24h Volume: {pair.volume24h}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-cyan-300">{pair.rate}</p>
                                            <button className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 mt-1">Trade →</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Balance */}
                        <div className="rounded-xl bg-gradient-to-br from-purple-900/50 to-pink-900/50 border border-purple-500/30 p-6">
                            <h3 className="text-lg font-bold text-white mb-4">Your Balances</h3>
                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <span className="text-gray-300">Pi Balance</span>
                                    <span className="font-bold text-cyan-400">∞ Pi</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-300">TriSyn Balance</span>
                                    <span className="font-bold text-purple-400">∞ TriSyn</span>
                                </div>
                            </div>
                        </div>

                        {/* Quick Stats */}
                        <div className="rounded-xl bg-black/40 border border-blue-500/20 p-6">
                            <h3 className="text-lg font-bold text-white mb-4">24h Stats</h3>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Total Volume</span>
                                    <span className="text-green-400 font-semibold">↑ $2.4M</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">High/Low</span>
                                    <span className="text-white">1.02 / 0.98</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Trades Count</span>
                                    <span className="text-white">842</span>
                                </div>
                            </div>
                        </div>

                        {/* Liquidity Info */}
                        <div className="rounded-xl bg-gradient-to-br from-yellow-900/30 to-orange-900/30 border border-yellow-500/20 p-6">
                            <h3 className="text-lg font-bold text-white mb-3">💧 Provide Liquidity</h3>
                            <p className="text-sm text-gray-300 mb-4">Earn fees by providing liquidity to pi-Dex</p>
                            <button className="w-full py-2 rounded-lg bg-gradient-to-r from-yellow-500/50 to-orange-500/50 hover:from-yellow-500 hover:to-orange-500 font-semibold text-white transition-all">
                                Add Liquidity
                            </button>
                        </div>
                    </div>
                </div>

                {/* Order History */}
                <div className="mt-8 rounded-xl bg-gradient-to-br from-slate-900/50 to-blue-900/30 border border-blue-500/20 p-6">
                    <h3 className="text-xl font-bold text-white mb-4">Recent Trades</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-blue-500/20">
                                    <th className="text-left py-3 px-4 font-semibold text-gray-300">Type</th>
                                    <th className="text-left py-3 px-4 font-semibold text-gray-300">From</th>
                                    <th className="text-left py-3 px-4 font-semibold text-gray-300">To</th>
                                    <th className="text-left py-3 px-4 font-semibold text-gray-300">Amount</th>
                                    <th className="text-left py-3 px-4 font-semibold text-gray-300">Rate</th>
                                    <th className="text-left py-3 px-4 font-semibold text-gray-300">Time</th>
                                </tr>
                            </thead>
                            <tbody>
                                {orderHistory.map((order) => (
                                    <tr key={order.id} className="border-b border-blue-500/10 hover:bg-black/20 transition-colors">
                                        <td className="py-3 px-4">
                                            <span className={`px-2 py-1 rounded text-xs font-semibold ${order.type === "BUY" ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300"
                                                }`}>
                                                {order.type}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-white">{order.from}</td>
                                        <td className="py-3 px-4 text-white">{order.to}</td>
                                        <td className="py-3 px-4 font-semibold text-cyan-400">{order.amount}</td>
                                        <td className="py-3 px-4 text-white">{order.rate}</td>
                                        <td className="py-3 px-4 text-gray-400">{order.timestamp}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    );
}

import Link from "next/link";
import { auth } from "@/app/(auth)/auth";
import { redirect } from "next/navigation";

export const metadata = {
    title: "Fractional Rentals - Triumph Synergy Testnet",
    description: "Rent homes and earn revenue sharing in Pi/TriSyn",
};

export default async function RentalsPage() {
    const session = await auth();
    if (!session) redirect("/api/auth/guest?redirectUrl=/testnet-hub/rentals");

    const properties = [
        {
            id: 1,
            name: "Modern Downtown Loft",
            location: "Downtown District",
            price: "250 TriSyn/month",
            ownership: "0.5%",
            returns: "2.5 TriSyn/month",
            beds: 2,
            baths: 1,
            sqft: "1,200",
            rating: 4.8,
            image: "🏙️",
        },
        {
            id: 2,
            name: "Suburban Family Home",
            location: "Green Valley",
            price: "1500 TriSyn/month",
            ownership: "0.1%",
            returns: "1.5 TriSyn/month",
            beds: 4,
            baths: 2,
            sqft: "2,500",
            rating: 4.9,
            image: "🏡",
        },
        {
            id: 3,
            name: "Beachfront Paradise",
            location: "Coastal Area",
            price: "2000 TriSyn/month",
            ownership: "0.25%",
            returns: "5 TriSyn/month",
            beds: 3,
            baths: 2,
            sqft: "2,000",
            rating: 4.7,
            image: "🏖️",
        },
        {
            id: 4,
            name: "Tech Hub Apartment",
            location: "Innovation Quarter",
            price: "500 TriSyn/month",
            ownership: "0.3%",
            returns: "1.5 TriSyn/month",
            beds: 1,
            baths: 1,
            sqft: "800",
            rating: 4.8,
            image: "🏗️",
        },
        {
            id: 5,
            name: "Mountain View Cabin",
            location: "Alpine Region",
            price: "800 TriSyn/month",
            ownership: "0.4%",
            returns: "3.2 TriSyn/month",
            beds: 3,
            baths: 1,
            sqft: "1,600",
            rating: 4.6,
            image: "🏔️",
        },
        {
            id: 6,
            name: "City Center Studio",
            location: "Downtown District",
            price: "600 TriSyn/month",
            ownership: "0.2%",
            returns: "1.2 TriSyn/month",
            beds: 1,
            baths: 1,
            sqft: "600",
            rating: 4.9,
            image: "🏢",
        },
    ];

    const investorPortfolio = [
        {
            property: "Modern Downtown Loft",
            invested: "150 TriSyn",
            currentValue: "152.50 TriSyn",
            monthlyReturn: "2.5 TriSyn",
            returns: "+1.67%",
        },
        {
            property: "Beachfront Paradise",
            invested: "500 TriSyn",
            currentValue: "506.25 TriSyn",
            monthlyReturn: "5 TriSyn",
            returns: "+1.25%",
        },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-900 to-slate-900">
            {/* Header */}
            <header className="border-b border-purple-500/20 bg-black/40 backdrop-blur-xl sticky top-0 z-40">
                <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link href="/testnet-hub" className="text-gray-400 hover:text-white transition-colors">← Back</Link>
                            <div>
                                <h1 className="text-3xl font-bold text-white">🏠 Fractional Rentals</h1>
                                <p className="text-sm text-gray-400">Rent homes and earn Pi/TriSyn revenue sharing</p>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                {/* Portfolio Overview */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <div className="rounded-lg bg-gradient-to-br from-purple-900/50 to-pink-900/50 border border-purple-500/30 p-6">
                        <p className="text-xs text-gray-400 mb-2">Portfolio Value</p>
                        <p className="text-3xl font-bold text-purple-400">658.75 TriSyn</p>
                        <p className="text-xs text-green-400 mt-2">↑ +2.14% this month</p>
                    </div>
                    <div className="rounded-lg bg-gradient-to-br from-purple-900/50 to-pink-900/50 border border-purple-500/30 p-6">
                        <p className="text-xs text-gray-400 mb-2">Monthly Returns</p>
                        <p className="text-3xl font-bold text-pink-400">7.5 TriSyn</p>
                        <p className="text-xs text-gray-500 mt-2">From rental yields</p>
                    </div>
                    <div className="rounded-lg bg-gradient-to-br from-purple-900/50 to-pink-900/50 border border-purple-500/30 p-6">
                        <p className="text-xs text-gray-400 mb-2">Properties Owned</p>
                        <p className="text-3xl font-bold text-purple-400">2</p>
                        <p className="text-xs text-gray-500 mt-2">Fractional ownership</p>
                    </div>
                    <div className="rounded-lg bg-gradient-to-br from-purple-900/50 to-pink-900/50 border border-purple-500/30 p-6">
                        <p className="text-xs text-gray-400 mb-2">Total Invested</p>
                        <p className="text-3xl font-bold text-pink-400">650 TriSyn</p>
                        <p className="text-xs text-green-400 mt-2">ROI: +1.35%</p>
                    </div>
                </div>

                {/* Your Investments */}
                <div className="mb-8 rounded-xl bg-gradient-to-br from-purple-900/40 to-pink-900/40 border border-purple-500/30 p-6">
                    <h2 className="text-2xl font-bold text-white mb-6">💼 Your Investments</h2>
                    <div className="space-y-4">
                        {investorPortfolio.map((inv, idx) => (
                            <div key={idx} className="rounded-lg bg-black/40 p-4 hover:bg-black/60 transition-colors">
                                <div className="grid grid-cols-5 gap-4 items-center">
                                    <div>
                                        <p className="font-semibold text-white">{inv.property}</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-xs text-gray-400">Invested</p>
                                        <p className="font-bold text-white">{inv.invested}</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-xs text-gray-400">Current Value</p>
                                        <p className="font-bold text-cyan-400">{inv.currentValue}</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-xs text-gray-400">Monthly Return</p>
                                        <p className="font-bold text-green-400">{inv.monthlyReturn}</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-xs text-gray-400">Return %</p>
                                        <p className={`font-bold ${inv.returns.includes('+') ? 'text-green-400' : 'text-red-400'}`}>
                                            {inv.returns}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Search & Filter */}
                <div className="mb-8">
                    <div className="flex gap-4 mb-6">
                        <input
                            type="text"
                            placeholder="Search properties..."
                            className="flex-1 rounded-lg bg-black/40 border border-purple-500/30 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-400 transition-colors"
                        />
                        <select className="rounded-lg bg-black/40 border border-purple-500/30 px-4 py-3 text-white focus:outline-none focus:border-purple-400 transition-colors">
                            <option>All Locations</option>
                            <option>Downtown</option>
                            <option>Suburban</option>
                            <option>Beachfront</option>
                            <option>Mountains</option>
                        </select>
                        <select className="rounded-lg bg-black/40 border border-purple-500/30 px-4 py-3 text-white focus:outline-none focus:border-purple-400 transition-colors">
                            <option>Sort by: Returns</option>
                            <option>Price: Low to High</option>
                            <option>Price: High to Low</option>
                            <option>Rating</option>
                        </select>
                    </div>
                </div>

                {/* Available Properties */}
                <div className="mb-8">
                    <h2 className="text-2xl font-bold text-white mb-6">Available Properties for Investment</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {properties.map((property) => (
                            <div key={property.id} className="rounded-xl bg-gradient-to-br from-purple-900/40 to-pink-900/40 border border-purple-500/20 hover:border-purple-400/60 overflow-hidden transition-all hover:shadow-lg hover:shadow-purple-500/20">
                                <div className="p-6 bg-black/30">
                                    <div className="text-6xl mb-3">{property.image}</div>
                                    <h3 className="text-lg font-bold text-white mb-1">{property.name}</h3>
                                    <p className="text-xs text-gray-400 mb-3">📍 {property.location}</p>

                                    <div className="grid grid-cols-2 gap-2 mb-4 text-center text-xs">
                                        <div className="rounded bg-black/50 p-2">
                                            <p className="text-gray-400">🛏️</p>
                                            <p className="font-semibold text-white">{property.beds} bed</p>
                                        </div>
                                        <div className="rounded bg-black/50 p-2">
                                            <p className="text-gray-400">🚿</p>
                                            <p className="font-semibold text-white">{property.baths} bath</p>
                                        </div>
                                        <div className="rounded bg-black/50 p-2">
                                            <p className="text-gray-400">📐</p>
                                            <p className="font-semibold text-white">{property.sqft} sqft</p>
                                        </div>
                                        <div className="rounded bg-black/50 p-2">
                                            <p className="text-gray-400">⭐</p>
                                            <p className="font-semibold text-white">{property.rating}</p>
                                        </div>
                                    </div>

                                    <div className="space-y-2 mb-4 p-3 rounded-lg bg-black/50">
                                        <div className="flex justify-between">
                                            <span className="text-xs text-gray-400">Monthly Rental</span>
                                            <span className="font-bold text-purple-400">{property.price}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-xs text-gray-400">Ownership Available</span>
                                            <span className="font-bold text-pink-400">{property.ownership}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-xs text-gray-400">Potential Monthly Return</span>
                                            <span className="font-bold text-green-400">{property.returns}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="px-6 py-3 border-t border-purple-500/10 bg-gradient-to-r from-purple-900/20 to-pink-900/20">
                                    <button className="w-full py-2 rounded-lg bg-gradient-to-r from-purple-500/50 to-pink-500/50 hover:from-purple-500 hover:to-pink-500 font-semibold text-white transition-all">
                                        Invest Now
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* How It Works */}
                <div className="rounded-xl bg-gradient-to-r from-cyan-900/30 to-blue-900/30 border border-cyan-500/30 p-8 mb-8">
                    <h3 className="text-2xl font-bold text-white mb-6">How Fractional Rentals Work</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="rounded-lg bg-black/40 p-4 text-center">
                            <p className="text-3xl mb-2">1️⃣</p>
                            <p className="font-semibold text-white mb-2">Choose Property</p>
                            <p className="text-xs text-gray-400">Browse and select from verified properties</p>
                        </div>
                        <div className="rounded-lg bg-black/40 p-4 text-center">
                            <p className="text-3xl mb-2">2️⃣</p>
                            <p className="font-semibold text-white mb-2">Invest Amount</p>
                            <p className="text-xs text-gray-400">Pay with Pi or TriSyn for ownership stake</p>
                        </div>
                        <div className="rounded-lg bg-black/40 p-4 text-center">
                            <p className="text-3xl mb-2">3️⃣</p>
                            <p className="font-semibold text-white mb-2">Earn Returns</p>
                            <p className="text-xs text-gray-400">Receive monthly rental revenue automatically</p>
                        </div>
                        <div className="rounded-lg bg-black/40 p-4 text-center">
                            <p className="text-3xl mb-2">4️⃣</p>
                            <p className="font-semibold text-white mb-2">Withdraw Anytime</p>
                            <p className="text-xs text-gray-400">Liquidate your stake or transfer ownership</p>
                        </div>
                    </div>
                </div>

                {/* Performance Chart */}
                <div className="rounded-xl bg-gradient-to-br from-slate-900/50 to-purple-900/30 border border-purple-500/20 p-6">
                    <h3 className="text-xl font-bold text-white mb-4">📊 Portfolio Performance</h3>
                    <div className="space-y-3">
                        {[
                            { month: "June", value: "640 TriSyn", growth: "+2.1%" },
                            { month: "May", value: "627 TriSyn", growth: "+1.8%" },
                            { month: "April", value: "616 TriSyn", growth: "+1.5%" },
                            { month: "March", value: "606 TriSyn", growth: "+1.2%" },
                        ].map((data, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-black/40">
                                <div className="flex-1">
                                    <p className="font-semibold text-white">{data.month}</p>
                                </div>
                                <div className="w-32 h-1 bg-black/60 rounded-full mx-4">
                                    <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full w-3/4" />
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-purple-400">{data.value}</p>
                                    <p className="text-xs text-green-400">{data.growth}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
}

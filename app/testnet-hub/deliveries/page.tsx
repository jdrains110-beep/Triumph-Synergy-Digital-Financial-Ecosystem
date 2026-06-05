import Link from "next/link";
import { auth } from "@/app/(auth)/auth";
import { redirect } from "next/navigation";

export const metadata = {
    title: "Testnet Deliveries - Triumph Synergy",
    description: "Order and track deliveries with live driver communication",
};

export default async function DeliveriesPage() {
    const session = await auth();
    if (!session) redirect("/api/auth/guest?redirectUrl=/testnet-hub/deliveries");

    const merchants = [
        {
            id: 1,
            name: "Fresh Market Groceries",
            category: "🛒 Groceries",
            rating: 4.8,
            deliveryTime: "30-45 min",
            items: 1250,
            minOrder: 5,
            logo: "🥕",
        },
        {
            id: 2,
            name: "The Rising Sun Restaurant",
            category: "🍽️ Restaurants",
            rating: 4.9,
            deliveryTime: "20-30 min",
            items: 350,
            minOrder: 10,
            logo: "🍜",
        },
        {
            id: 3,
            name: "Farm to Table Organic",
            category: "🌾 Farm Direct",
            rating: 4.7,
            deliveryTime: "45-60 min",
            items: 200,
            minOrder: 15,
            logo: "🌽",
        },
        {
            id: 4,
            name: "Wholesale Depot",
            category: "📦 Wholesale",
            rating: 4.6,
            deliveryTime: "60-90 min",
            items: 5000,
            minOrder: 50,
            logo: "📦",
        },
        {
            id: 5,
            name: "Coffee & Bakery Co",
            category: "☕ Cafes",
            rating: 4.9,
            deliveryTime: "15-25 min",
            items: 150,
            minOrder: 3,
            logo: "☕",
        },
        {
            id: 6,
            name: "Ethnic Spice Market",
            category: "🌶️ Specialty",
            rating: 4.7,
            deliveryTime: "35-50 min",
            items: 800,
            minOrder: 8,
            logo: "🌶️",
        },
    ];

    const activeDeliveries = [
        {
            id: "D001",
            merchant: "Fresh Market Groceries",
            items: 5,
            total: "42.50 TriSyn",
            status: "in_transit",
            driver: "Alex K.",
            eta: "8 minutes",
            lat: 40.7128,
            lng: -74.0060,
        },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-orange-900 to-slate-900">
            {/* Header */}
            <header className="border-b border-yellow-500/20 bg-black/40 backdrop-blur-xl sticky top-0 z-40">
                <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link href="/testnet-hub" className="text-gray-400 hover:text-white transition-colors">← Back</Link>
                            <div>
                                <h1 className="text-3xl font-bold text-white">🚚 Testnet Deliveries</h1>
                                <p className="text-sm text-gray-400">Order anything, track in real-time, chat with drivers</p>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                {/* Active Deliveries */}
                {activeDeliveries.length > 0 && (
                    <div className="mb-8">
                        <h2 className="text-2xl font-bold text-white mb-4">📍 Active Deliveries</h2>
                        {activeDeliveries.map((delivery) => (
                            <div key={delivery.id} className="rounded-xl bg-gradient-to-br from-orange-900/50 to-yellow-900/50 border border-yellow-500/30 p-6 mb-4">
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-4">
                                    <div>
                                        <p className="text-xs text-gray-400 mb-1">Order ID</p>
                                        <p className="font-bold text-white">{delivery.id}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400 mb-1">Merchant</p>
                                        <p className="font-bold text-white">{delivery.merchant}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400 mb-1">Driver</p>
                                        <p className="font-bold text-yellow-300">{delivery.driver} • ETA {delivery.eta}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400 mb-1">Total</p>
                                        <p className="font-bold text-green-400">{delivery.total}</p>
                                    </div>
                                </div>

                                {/* Status & Actions */}
                                <div className="flex gap-4">
                                    <div className="flex-1 rounded-lg bg-black/40 p-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="text-xs text-gray-400 mb-2">Status</p>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                                    <span className="font-semibold text-green-400">En Route to You</span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-2xl">📍</p>
                                                <p className="text-xs text-gray-400">Live GPS Tracking</p>
                                            </div>
                                        </div>
                                    </div>
                                    <button className="px-6 py-4 rounded-lg bg-gradient-to-r from-cyan-500/50 to-blue-500/50 hover:from-cyan-500 hover:to-blue-500 font-semibold text-white transition-all">
                                        💬 Chat with Driver
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Search & Filter */}
                <div className="mb-8">
                    <div className="flex gap-4 mb-6">
                        <input
                            type="text"
                            placeholder="Search merchants..."
                            className="flex-1 rounded-lg bg-black/40 border border-yellow-500/30 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400 transition-colors"
                        />
                        <select className="rounded-lg bg-black/40 border border-yellow-500/30 px-4 py-3 text-white focus:outline-none focus:border-yellow-400 transition-colors">
                            <option>All Categories</option>
                            <option>🛒 Groceries</option>
                            <option>🍽️ Restaurants</option>
                            <option>🌾 Farm Direct</option>
                            <option>📦 Wholesale</option>
                            <option>☕ Cafes</option>
                        </select>
                        <select className="rounded-lg bg-black/40 border border-yellow-500/30 px-4 py-3 text-white focus:outline-none focus:border-yellow-400 transition-colors">
                            <option>Sort: Rating</option>
                            <option>Fastest Delivery</option>
                            <option>Cheapest</option>
                            <option>Newest</option>
                        </select>
                    </div>
                </div>

                {/* Merchants Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    {merchants.map((merchant) => (
                        <div key={merchant.id} className="group rounded-xl bg-gradient-to-br from-orange-900/40 to-yellow-900/40 border border-yellow-500/20 hover:border-yellow-400/60 overflow-hidden transition-all hover:shadow-lg hover:shadow-yellow-500/20">
                            {/* Header with Logo */}
                            <div className="p-4 bg-black/30">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="text-5xl">{merchant.logo}</div>
                                    <div className="text-right">
                                        <div className="flex items-center gap-1 justify-end">
                                            <span className="text-sm font-bold text-yellow-400">{merchant.rating}</span>
                                            <span className="text-sm">⭐</span>
                                        </div>
                                    </div>
                                </div>

                                <h3 className="font-bold text-white mb-1">{merchant.name}</h3>
                                <p className="text-xs text-gray-400 mb-3">{merchant.category}</p>

                                {/* Quick Info */}
                                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                                    <div className="rounded bg-black/50 p-2">
                                        <p className="text-gray-400">🚚</p>
                                        <p className="font-semibold text-white text-xs">{merchant.deliveryTime}</p>
                                    </div>
                                    <div className="rounded bg-black/50 p-2">
                                        <p className="text-gray-400">📦</p>
                                        <p className="font-semibold text-white text-xs">{merchant.items} items</p>
                                    </div>
                                    <div className="rounded bg-black/50 p-2">
                                        <p className="text-gray-400">💰</p>
                                        <p className="font-semibold text-white text-xs">Min ${merchant.minOrder}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Action Button */}
                            <div className="px-4 py-3 border-t border-yellow-500/10 bg-gradient-to-r from-yellow-900/20 to-orange-900/20">
                                <button className="w-full py-2 rounded-lg bg-gradient-to-r from-yellow-500/50 to-orange-500/50 hover:from-yellow-500 hover:to-orange-500 font-semibold text-white transition-all">
                                    Browse & Order →
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Special Promotions */}
                <div className="rounded-xl bg-gradient-to-r from-green-900/30 to-emerald-900/30 border border-green-500/30 p-8 mb-8">
                    <h3 className="text-2xl font-bold text-white mb-4">🎉 Testnet Promotions</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="rounded-lg bg-black/40 p-4">
                            <p className="text-sm text-gray-400 mb-2">First Order Bonus</p>
                            <p className="text-2xl font-bold text-green-400">50 TriSyn</p>
                            <p className="text-xs text-gray-500 mt-2">On your first purchase</p>
                        </div>
                        <div className="rounded-lg bg-black/40 p-4">
                            <p className="text-sm text-gray-400 mb-2">Referral Rewards</p>
                            <p className="text-2xl font-bold text-green-400">25 TriSyn per friend</p>
                            <p className="text-xs text-gray-500 mt-2">When they make their first order</p>
                        </div>
                        <div className="rounded-lg bg-black/40 p-4">
                            <p className="text-sm text-gray-400 mb-2">Loyalty Program</p>
                            <p className="text-2xl font-bold text-green-400">1% Cashback</p>
                            <p className="text-xs text-gray-500 mt-2">On every delivery</p>
                        </div>
                    </div>
                </div>

                {/* Order History */}
                <div className="rounded-xl bg-gradient-to-br from-slate-900/50 to-orange-900/30 border border-orange-500/20 p-6">
                    <h3 className="text-xl font-bold text-white mb-4">Recent Orders</h3>
                    <div className="space-y-3">
                        {[
                            { id: 1, merchant: "Fresh Market Groceries", items: 8, total: "58.75 TriSyn", date: "Yesterday" },
                            { id: 2, merchant: "The Rising Sun", items: 3, total: "32.50 TriSyn", date: "2 days ago" },
                            { id: 3, merchant: "Farm to Table", items: 12, total: "145.00 TriSyn", date: "1 week ago" },
                        ].map((order) => (
                            <div key={order.id} className="flex items-center justify-between p-4 rounded-lg bg-black/40 hover:bg-black/60 transition-colors">
                                <div className="flex-1">
                                    <p className="font-semibold text-white">{order.merchant}</p>
                                    <p className="text-xs text-gray-400">{order.items} items • {order.date}</p>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-green-400">{order.total}</p>
                                    <button className="text-xs text-yellow-400 hover:text-yellow-300 mt-1">Reorder →</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
}

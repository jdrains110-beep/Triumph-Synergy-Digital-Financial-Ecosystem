import Link from "next/link";
import { auth } from "@/app/(auth)/auth";
import { redirect } from "next/navigation";

export const metadata = {
    title: "Travel Stations - Triumph Synergy Testnet",
    description: "Book flights, hotels, tours - complete travel setup with Pi/TriSyn",
};

export default async function TravelPage() {
    const session = await auth();
    if (!session) redirect("/api/auth/guest?redirectUrl=/testnet-hub/travel");

    const flightDeals = [
        {
            id: 1,
            from: "NYC",
            to: "London",
            airline: "Triumph Airways",
            price: "450 TriSyn",
            duration: "7h 30m",
            departure: "10:00 AM",
            arrival: "10:30 PM",
            seats: 12,
            icon: "✈️",
        },
        {
            id: 2,
            from: "LAX",
            to: "Tokyo",
            airline: "Sky Express",
            price: "650 TriSyn",
            duration: "11h 45m",
            departure: "2:15 PM",
            arrival: "4:30 AM+1",
            seats: 8,
            icon: "🛫",
        },
        {
            id: 3,
            from: "Paris",
            to: "Dubai",
            airline: "Global Flights",
            price: "380 TriSyn",
            duration: "7h 00m",
            departure: "6:00 AM",
            arrival: "12:00 PM",
            seats: 15,
            icon: "🛬",
        },
    ];

    const hotels = [
        {
            id: 1,
            name: "Triumph Luxury Resort",
            location: "Bali, Indonesia",
            stars: 5,
            price: "180 TriSyn/night",
            rating: 4.9,
            reviews: 2840,
            amenities: ["Pool", "Spa", "Restaurant", "Gym"],
            icon: "🏨",
        },
        {
            id: 2,
            name: "Urban Business Hotel",
            location: "Singapore",
            stars: 4,
            price: "120 TriSyn/night",
            rating: 4.7,
            reviews: 1920,
            amenities: ["WiFi", "Conference", "Gym", "Bar"],
            icon: "🏩",
        },
        {
            id: 3,
            name: "Coastal Retreat",
            location: "Maldives",
            stars: 5,
            price: "250 TriSyn/night",
            rating: 5.0,
            reviews: 3120,
            amenities: ["Overwater Villa", "Beach", "Diving", "Spa"],
            icon: "🏝️",
        },
    ];

    const tours = [
        {
            id: 1,
            name: "Europe Grand Tour",
            duration: "14 days",
            destinations: 7,
            price: "1200 TriSyn",
            rating: 4.8,
            included: ["Flights", "Hotels", "Meals", "Tours", "Transport"],
            icon: "🗼",
        },
        {
            id: 2,
            name: "Asia Adventure",
            duration: "10 days",
            destinations: 5,
            price: "850 TriSyn",
            rating: 4.9,
            included: ["Flights", "Accommodation", "Guides", "Activities"],
            icon: "🏯",
        },
        {
            id: 3,
            name: "African Safari",
            duration: "7 days",
            destinations: 3,
            price: "950 TriSyn",
            rating: 5.0,
            included: ["Game drives", "Lodge", "Guides", "Meals"],
            icon: "🦁",
        },
    ];

    const activities = [
        {
            id: 1,
            name: "Scuba Diving Certification",
            location: "Great Barrier Reef",
            duration: "3 days",
            price: "280 TriSyn",
            icon: "🤿",
        },
        {
            id: 2,
            name: "Mountain Hiking Trek",
            location: "Swiss Alps",
            duration: "5 days",
            price: "420 TriSyn",
            icon: "⛰️",
        },
        {
            id: 3,
            name: "Cultural Food Tour",
            location: "Bangkok",
            duration: "2 days",
            price: "150 TriSyn",
            icon: "🍜",
        },
        {
            id: 4,
            name: "Wine Tasting Experience",
            location: "Tuscany",
            duration: "1 day",
            price: "200 TriSyn",
            icon: "🍷",
        },
    ];

    const bookings = [
        {
            id: "B001",
            type: "Flight",
            details: "NYC → London • June 15-22",
            total: "450 TriSyn",
            status: "confirmed",
        },
        {
            id: "B002",
            type: "Hotel",
            details: "Triumph Luxury Resort • 5 nights",
            total: "900 TriSyn",
            status: "confirmed",
        },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-pink-900 to-slate-900">
            {/* Header */}
            <header className="border-b border-pink-500/20 bg-black/40 backdrop-blur-xl sticky top-0 z-40">
                <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Link href="/testnet-hub" className="text-gray-400 hover:text-white transition-colors">← Back</Link>
                            <div>
                                <h1 className="text-3xl font-bold text-white">✈️ Travel Stations</h1>
                                <p className="text-sm text-gray-400">Book flights, hotels, tours - complete travel experience</p>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
                {/* Quick Booking */}
                <div className="mb-8 rounded-xl bg-gradient-to-br from-pink-900/50 to-rose-900/50 border border-pink-500/30 p-8">
                    <h2 className="text-2xl font-bold text-white mb-6">✈️ Book Your Trip</h2>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
                        <input
                            type="text"
                            placeholder="From (City)"
                            className="rounded-lg bg-black/40 border border-pink-500/30 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-pink-400 transition-colors"
                        />
                        <input
                            type="text"
                            placeholder="To (City)"
                            className="rounded-lg bg-black/40 border border-pink-500/30 px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-pink-400 transition-colors"
                        />
                        <input
                            type="date"
                            className="rounded-lg bg-black/40 border border-pink-500/30 px-4 py-3 text-white focus:outline-none focus:border-pink-400 transition-colors"
                        />
                        <input
                            type="date"
                            className="rounded-lg bg-black/40 border border-pink-500/30 px-4 py-3 text-white focus:outline-none focus:border-pink-400 transition-colors"
                        />
                        <button className="rounded-lg bg-gradient-to-r from-pink-500 to-rose-500 font-bold text-white hover:shadow-lg hover:shadow-pink-500/50 transition-all">
                            Search →
                        </button>
                    </div>
                </div>

                {/* Recent Bookings */}
                {bookings.length > 0 && (
                    <div className="mb-8">
                        <h2 className="text-2xl font-bold text-white mb-4">📅 Your Bookings</h2>
                        <div className="space-y-3">
                            {bookings.map((booking) => (
                                <div key={booking.id} className="rounded-lg bg-gradient-to-r from-purple-900/40 to-pink-900/40 border border-pink-500/20 p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-semibold text-white">{booking.type} - {booking.details}</p>
                                            <p className="text-xs text-gray-400 mt-1">Booking ID: {booking.id}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-pink-400">{booking.total}</p>
                                            <span className={`inline-block px-3 py-1 rounded text-xs font-semibold mt-2 ${booking.status === "confirmed" ? "bg-green-500/20 text-green-300" : "bg-yellow-500/20 text-yellow-300"
                                                }`}>
                                                {booking.status === "confirmed" ? "✓ Confirmed" : "⏳ Pending"}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Flight Deals */}
                <div className="mb-8">
                    <h2 className="text-2xl font-bold text-white mb-6">✈️ Flight Deals</h2>
                    <div className="space-y-3">
                        {flightDeals.map((flight) => (
                            <div key={flight.id} className="rounded-lg bg-gradient-to-br from-blue-900/40 to-cyan-900/40 border border-blue-500/20 hover:border-blue-400/60 p-6 transition-all hover:shadow-lg hover:shadow-blue-500/20">
                                <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-center">
                                    <div className="text-center">
                                        <p className="text-3xl">{flight.icon}</p>
                                        <p className="text-sm font-bold text-white mt-1">{flight.from} → {flight.to}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400 mb-1">Airline</p>
                                        <p className="font-semibold text-white">{flight.airline}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400 mb-1">Duration</p>
                                        <p className="font-semibold text-white">{flight.duration}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400 mb-1">Time</p>
                                        <p className="font-semibold text-white">{flight.departure} → {flight.arrival}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400 mb-1">Available Seats</p>
                                        <p className="font-semibold text-white">{flight.seats} left</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-2xl font-bold text-cyan-400">{flight.price}</p>
                                        <button className="mt-2 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500/50 to-cyan-500/50 hover:from-blue-500 hover:to-cyan-500 font-semibold text-white transition-all text-sm">
                                            Book Now
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Hotels */}
                <div className="mb-8">
                    <h2 className="text-2xl font-bold text-white mb-6">🏨 Hotels & Accommodations</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {hotels.map((hotel) => (
                            <div key={hotel.id} className="rounded-xl bg-gradient-to-br from-amber-900/40 to-yellow-900/40 border border-amber-500/20 hover:border-amber-400/60 overflow-hidden transition-all hover:shadow-lg hover:shadow-amber-500/20">
                                <div className="p-6 bg-black/30">
                                    <div className="text-5xl mb-3">{hotel.icon}</div>
                                    <h3 className="font-bold text-white mb-1">{hotel.name}</h3>
                                    <p className="text-xs text-gray-400 mb-3">📍 {hotel.location}</p>

                                    <div className="mb-3">
                                        <div className="flex gap-1 mb-1">
                                            {Array.from({ length: hotel.stars }).map((_, i) => (
                                                <span key={i} className="text-yellow-400">⭐</span>
                                            ))}
                                        </div>
                                        <p className="text-xs text-gray-400">{hotel.rating} ({hotel.reviews} reviews)</p>
                                    </div>

                                    <div className="mb-4 space-y-2 text-sm">
                                        {hotel.amenities.slice(0, 4).map((amenity, idx) => (
                                            <p key={idx} className="text-gray-300">✓ {amenity}</p>
                                        ))}
                                    </div>
                                </div>

                                <div className="px-6 py-3 border-t border-amber-500/10 bg-gradient-to-r from-amber-900/20 to-yellow-900/20">
                                    <div className="flex justify-between items-center mb-3">
                                        <span className="font-bold text-amber-400">{hotel.price}</span>
                                    </div>
                                    <button className="w-full py-2 rounded-lg bg-gradient-to-r from-amber-500/50 to-yellow-500/50 hover:from-amber-500 hover:to-yellow-500 font-semibold text-white transition-all">
                                        Reserve Now
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Tours */}
                <div className="mb-8">
                    <h2 className="text-2xl font-bold text-white mb-6">🗺️ Guided Tours</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {tours.map((tour) => (
                            <div key={tour.id} className="rounded-xl bg-gradient-to-br from-indigo-900/40 to-purple-900/40 border border-indigo-500/20 hover:border-indigo-400/60 p-6 transition-all hover:shadow-lg hover:shadow-indigo-500/20">
                                <div className="text-5xl mb-3">{tour.icon}</div>
                                <h3 className="text-lg font-bold text-white mb-1">{tour.name}</h3>
                                <p className="text-sm text-gray-400 mb-4">⏱️ {tour.duration} • 🌍 {tour.destinations} destinations</p>

                                <div className="mb-4 space-y-2 text-sm">
                                    {tour.included.map((item, idx) => (
                                        <p key={idx} className="text-gray-300">✓ {item}</p>
                                    ))}
                                </div>

                                <div className="flex justify-between items-center p-3 rounded-lg bg-black/40 mb-3">
                                    <span className="font-bold text-indigo-400">{tour.price}</span>
                                    <span className="text-yellow-400">⭐ {tour.rating}</span>
                                </div>

                                <button className="w-full py-2 rounded-lg bg-gradient-to-r from-indigo-500/50 to-purple-500/50 hover:from-indigo-500 hover:to-purple-500 font-semibold text-white transition-all">
                                    Book Tour
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Activities */}
                <div className="mb-8">
                    <h2 className="text-2xl font-bold text-white mb-6">🎯 Activities & Experiences</h2>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {activities.map((activity) => (
                            <div key={activity.id} className="rounded-lg bg-gradient-to-br from-green-900/40 to-emerald-900/40 border border-green-500/20 hover:border-green-400/60 p-6 transition-all hover:shadow-lg hover:shadow-green-500/20">
                                <div className="text-4xl mb-3">{activity.icon}</div>
                                <h3 className="font-bold text-white mb-3">{activity.name}</h3>
                                <div className="space-y-2 text-sm mb-4">
                                    <p className="text-gray-300">📍 {activity.location}</p>
                                    <p className="text-gray-300">⏱️ {activity.duration}</p>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="font-bold text-green-400">{activity.price}</span>
                                    <button className="px-3 py-1 rounded bg-gradient-to-r from-green-500/50 to-emerald-500/50 hover:from-green-500 hover:to-emerald-500 font-semibold text-white text-sm transition-all">
                                        Add to Trip
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Travel Benefits */}
                <div className="rounded-xl bg-gradient-to-r from-purple-900/30 to-pink-900/30 border border-purple-500/30 p-8">
                    <h3 className="text-2xl font-bold text-white mb-6">🎁 Travel Rewards Program</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="rounded-lg bg-black/40 p-4">
                            <p className="text-sm text-gray-400 mb-2">Booking Bonus</p>
                            <p className="text-2xl font-bold text-pink-400">5% Cashback</p>
                            <p className="text-xs text-gray-500 mt-2">On all travel bookings</p>
                        </div>
                        <div className="rounded-lg bg-black/40 p-4">
                            <p className="text-sm text-gray-400 mb-2">Loyalty Points</p>
                            <p className="text-2xl font-bold text-pink-400">1 Point per TriSyn</p>
                            <p className="text-xs text-gray-500 mt-2">Redeem for free flights</p>
                        </div>
                        <div className="rounded-lg bg-black/40 p-4">
                            <p className="text-sm text-gray-400 mb-2">Referral Bonus</p>
                            <p className="text-2xl font-bold text-pink-400">200 TriSyn</p>
                            <p className="text-xs text-gray-500 mt-2">For each friend's first booking</p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

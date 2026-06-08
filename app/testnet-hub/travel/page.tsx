import Link from "next/link";
import { auth } from "@/app/(auth)/auth";
import { redirect } from "next/navigation";
import { FlightCard, HotelCard, TourCard, ActivityCard, BookingCard } from "@/components/travel-hub-gcv";

export const metadata = {
    title: "Travel Stations - Triumph Synergy Testnet",
    description: "Book flights, hotels, tours - complete travel setup with Pi/TriSyn - GCV adjusted pricing",
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
            priceTriSyn: 450,
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
            priceTriSyn: 650,
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
            priceTriSyn: 380,
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
            pricePerNightTriSyn: 180,
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
            pricePerNightTriSyn: 120,
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
            pricePerNightTriSyn: 250,
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
            priceTriSyn: 1200,
            rating: 4.8,
            included: ["Flights", "Hotels", "Meals", "Tours", "Transport"],
            icon: "🗼",
        },
        {
            id: 2,
            name: "Asia Adventure",
            duration: "10 days",
            destinations: 5,
            priceTriSyn: 850,
            rating: 4.9,
            included: ["Flights", "Accommodation", "Guides", "Activities"],
            icon: "🏯",
        },
        {
            id: 3,
            name: "African Safari",
            duration: "7 days",
            destinations: 3,
            priceTriSyn: 950,
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
            priceTriSyn: 280,
            icon: "🤿",
        },
        {
            id: 2,
            name: "Mountain Hiking Trek",
            location: "Swiss Alps",
            duration: "5 days",
            priceTriSyn: 420,
            icon: "⛰️",
        },
        {
            id: 3,
            name: "Cultural Food Tour",
            location: "Bangkok",
            duration: "2 days",
            priceTriSyn: 150,
            icon: "🍜",
        },
        {
            id: 4,
            name: "Wine Tasting Experience",
            location: "Tuscany",
            duration: "1 day",
            priceTriSyn: 200,
            icon: "🍷",
        },
    ];

    const bookings = [
        {
            id: "B001",
            type: "Flight",
            details: "NYC → London • June 15-22",
            totalTriSyn: 450,
            status: "confirmed" as const,
        },
        {
            id: "B002",
            type: "Hotel",
            details: "Triumph Luxury Resort • 5 nights",
            totalTriSyn: 900,
            status: "confirmed" as const,
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
                                <BookingCard key={booking.id} booking={booking} />
                            ))}
                        </div>
                    </div>
                )}

                {/* Flight Deals */}
                <div className="mb-8">
                    <h2 className="text-2xl font-bold text-white mb-6">✈️ Flight Deals</h2>
                    <div className="space-y-3">
                        {flightDeals.map((flight) => (
                            <FlightCard key={flight.id} flight={flight} />
                        ))}
                    </div>
                </div>

                {/* Hotels */}
                <div className="mb-8">
                    <h2 className="text-2xl font-bold text-white mb-6">🏨 Hotels & Accommodations</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {hotels.map((hotel) => (
                            <HotelCard key={hotel.id} hotel={hotel} />
                        ))}
                    </div>
                </div>

                {/* Tours */}
                <div className="mb-8">
                    <h2 className="text-2xl font-bold text-white mb-6">🗺️ Guided Tours</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {tours.map((tour) => (
                            <TourCard key={tour.id} tour={tour} />
                        ))}
                    </div>
                </div>

                {/* Activities */}
                <div className="mb-8">
                    <h2 className="text-2xl font-bold text-white mb-6">🎯 Activities & Experiences</h2>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        {activities.map((activity) => (
                            <ActivityCard key={activity.id} activity={activity} />
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

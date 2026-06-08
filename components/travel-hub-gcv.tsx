"use client";

/**
 * Travel Hub Component with GCV Display
 * Shows all prices in both TriSyn and USD with GCV conversions
 */

import { createPriceDisplay, formatRateDisplay } from "@/lib/gcv-conversion";

interface TravelItem {
    id: string | number;
    name: string;
    price: number; // in TriSyn
    icon: string;
    description?: string;
}

interface PriceDisplayProps {
    item: TravelItem;
    rateType?: "night" | "month" | "total" | "hour";
    showDetails?: boolean;
}

export function PriceDisplayCard({ item, rateType = "total", showDetails = false }: PriceDisplayProps) {
    const priceDisplay = createPriceDisplay(item.price);

    if (rateType === "total") {
        return (
            <div className="rounded-lg bg-black/40 p-3 border border-gray-500/20">
                <p className="text-2xl font-bold text-cyan-400">{priceDisplay.native}</p>
                <p className="text-xs text-gray-400 mt-1">{priceDisplay.usd} USD</p>
                {showDetails && (
                    <>
                        <p className="text-xs text-gray-500 mt-2">π {priceDisplay.piAmount.toFixed(6)}</p>
                        <p className="text-xs text-gray-500">≈ {(priceDisplay.percentOfMainnetGCV * 100).toFixed(4)}% GCV</p>
                    </>
                )}
            </div>
        );
    }

    return (
        <div className="rounded-lg bg-black/40 p-3 border border-gray-500/20">
            <p className="text-lg font-bold text-cyan-400">
                {priceDisplay.native}
                {rateType === "night" && " /night"}
                {rateType === "month" && " /month"}
                {rateType === "hour" && " /hour"}
            </p>
            <p className="text-xs text-gray-400 mt-1">
                {priceDisplay.usd}
                {rateType === "night" && " USD /night"}
                {rateType === "month" && " USD /month"}
                {rateType === "hour" && " USD /hour"}
            </p>
            {showDetails && (
                <p className="text-xs text-gray-500 mt-2">π {priceDisplay.piAmount.toFixed(6)}{rateType === "night" && " /night" || rateType === "month" && " /month" || rateType === "hour" && " /hour"}</p>
            )}
        </div>
    );
}

interface FlightCardProps {
    flight: {
        id: number;
        from: string;
        to: string;
        airline: string;
        priceTriSyn: number;
        duration: string;
        departure: string;
        arrival: string;
        seats: number;
        icon: string;
    };
}

export function FlightCard({ flight }: FlightCardProps) {
    const priceDisplay = createPriceDisplay(flight.priceTriSyn);

    return (
        <div className="rounded-lg bg-gradient-to-br from-blue-900/40 to-cyan-900/40 border border-blue-500/20 hover:border-blue-400/60 p-6 transition-all hover:shadow-lg hover:shadow-blue-500/20">
            <div className="grid grid-cols-1 md:grid-cols-7 gap-4 items-center">
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
                    <p className="font-semibold text-white text-sm">{flight.departure} → {flight.arrival}</p>
                </div>
                <div>
                    <p className="text-xs text-gray-400 mb-1">Seats</p>
                    <p className="font-semibold text-white">{flight.seats} left</p>
                </div>
                <div className="md:col-span-2">
                    <p className="text-xs text-gray-400 mb-2">Price</p>
                    <div className="space-y-1">
                        <p className="text-lg font-bold text-cyan-400">{priceDisplay.native}</p>
                        <p className="text-xs text-gray-400">{priceDisplay.usd}</p>
                    </div>
                    <button className="mt-3 w-full px-4 py-2 rounded-lg bg-gradient-to-r from-blue-500/50 to-cyan-500/50 hover:from-blue-500 hover:to-cyan-500 font-semibold text-white transition-all text-sm">
                        Book Now
                    </button>
                </div>
            </div>
        </div>
    );
}

interface HotelCardProps {
    hotel: {
        id: number;
        name: string;
        location: string;
        stars: number;
        pricePerNightTriSyn: number;
        rating: number;
        reviews: number;
        amenities: string[];
        icon: string;
    };
}

export function HotelCard({ hotel }: HotelCardProps) {
    const priceDisplay = createPriceDisplay(hotel.pricePerNightTriSyn);

    return (
        <div className="rounded-xl bg-gradient-to-br from-amber-900/40 to-yellow-900/40 border border-amber-500/20 hover:border-amber-400/60 overflow-hidden transition-all hover:shadow-lg hover:shadow-amber-500/20">
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
                    <p className="text-xs text-gray-400">{hotel.rating} ({hotel.reviews.toLocaleString()} reviews)</p>
                </div>

                <div className="mb-4 space-y-2 text-sm">
                    {hotel.amenities.slice(0, 4).map((amenity, idx) => (
                        <p key={idx} className="text-gray-300">✓ {amenity}</p>
                    ))}
                </div>
            </div>

            <div className="px-6 py-3 border-t border-amber-500/10 bg-gradient-to-r from-amber-900/20 to-yellow-900/20">
                <div className="mb-3">
                    <p className="text-xs text-gray-400 mb-2">Per Night</p>
                    <p className="text-lg font-bold text-amber-400">{priceDisplay.native}</p>
                    <p className="text-xs text-gray-400 mt-1">{priceDisplay.usd}</p>
                </div>
                <button className="w-full py-2 rounded-lg bg-gradient-to-r from-amber-500/50 to-yellow-500/50 hover:from-amber-500 hover:to-yellow-500 font-semibold text-white transition-all">
                    Reserve Now
                </button>
            </div>
        </div>
    );
}

interface TourCardProps {
    tour: {
        id: number;
        name: string;
        duration: string;
        destinations: number;
        priceTriSyn: number;
        rating: number;
        included: string[];
        icon: string;
    };
}

export function TourCard({ tour }: TourCardProps) {
    const priceDisplay = createPriceDisplay(tour.priceTriSyn);

    return (
        <div className="rounded-xl bg-gradient-to-br from-indigo-900/40 to-purple-900/40 border border-indigo-500/20 hover:border-indigo-400/60 p-6 transition-all hover:shadow-lg hover:shadow-indigo-500/20">
            <div className="text-5xl mb-3">{tour.icon}</div>
            <h3 className="text-lg font-bold text-white mb-1">{tour.name}</h3>
            <p className="text-sm text-gray-400 mb-4">⏱️ {tour.duration} • 🌍 {tour.destinations} destinations</p>

            <div className="mb-4 space-y-2 text-sm">
                {tour.included.map((item, idx) => (
                    <p key={idx} className="text-gray-300">✓ {item}</p>
                ))}
            </div>

            <div className="flex justify-between items-center p-3 rounded-lg bg-black/40 mb-3">
                <div>
                    <p className="text-xs text-gray-400 mb-1">Total Price</p>
                    <div>
                        <p className="font-bold text-indigo-400">{priceDisplay.native}</p>
                        <p className="text-xs text-gray-400">{priceDisplay.usd}</p>
                    </div>
                </div>
                <span className="text-yellow-400 text-lg">⭐ {tour.rating}</span>
            </div>

            <button className="w-full py-2 rounded-lg bg-gradient-to-r from-indigo-500/50 to-purple-500/50 hover:from-indigo-500 hover:to-purple-500 font-semibold text-white transition-all">
                Book Tour
            </button>
        </div>
    );
}

interface ActivityCardProps {
    activity: {
        id: number;
        name: string;
        location: string;
        duration: string;
        priceTriSyn: number;
        icon: string;
    };
}

export function ActivityCard({ activity }: ActivityCardProps) {
    const priceDisplay = createPriceDisplay(activity.priceTriSyn);

    return (
        <div className="rounded-lg bg-gradient-to-br from-green-900/40 to-emerald-900/40 border border-green-500/20 hover:border-green-400/60 p-6 transition-all hover:shadow-lg hover:shadow-green-500/20">
            <div className="text-4xl mb-3">{activity.icon}</div>
            <h3 className="font-bold text-white mb-3">{activity.name}</h3>
            <div className="space-y-2 text-sm mb-4">
                <p className="text-gray-300">📍 {activity.location}</p>
                <p className="text-gray-300">⏱️ {activity.duration}</p>
            </div>
            <div className="flex justify-between items-center">
                <div>
                    <p className="font-bold text-green-400">{priceDisplay.native}</p>
                    <p className="text-xs text-gray-400">{priceDisplay.usd}</p>
                </div>
                <button className="px-3 py-1 rounded bg-gradient-to-r from-green-500/50 to-emerald-500/50 hover:from-green-500 hover:to-emerald-500 font-semibold text-white text-sm transition-all">
                    Add to Trip
                </button>
            </div>
        </div>
    );
}

interface BookingCardProps {
    booking: {
        id: string;
        type: string;
        details: string;
        totalTriSyn: number;
        status: "confirmed" | "pending";
    };
}

export function BookingCard({ booking }: BookingCardProps) {
    const priceDisplay = createPriceDisplay(booking.totalTriSyn);

    return (
        <div className="rounded-lg bg-gradient-to-r from-purple-900/40 to-pink-900/40 border border-pink-500/20 p-4">
            <div className="flex items-center justify-between">
                <div>
                    <p className="font-semibold text-white">{booking.type} - {booking.details}</p>
                    <p className="text-xs text-gray-400 mt-1">Booking ID: {booking.id}</p>
                </div>
                <div className="text-right">
                    <div className="mb-2">
                        <p className="font-bold text-pink-400">{priceDisplay.native}</p>
                        <p className="text-xs text-gray-400">{priceDisplay.usd}</p>
                    </div>
                    <span
                        className={`inline-block px-3 py-1 rounded text-xs font-semibold ${booking.status === "confirmed"
                                ? "bg-green-500/20 text-green-300"
                                : "bg-yellow-500/20 text-yellow-300"
                            }`}
                    >
                        {booking.status === "confirmed" ? "✓ Confirmed" : "⏳ Pending"}
                    </span>
                </div>
            </div>
        </div>
    );
}

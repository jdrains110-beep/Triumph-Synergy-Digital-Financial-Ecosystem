'use client';

import { createPriceDisplay, formatDualDisplay, formatRateDisplay } from '@/lib/gcv-conversion';

// ============================================
// UTILITY BILL CARDS
// ============================================

interface BillCardProps {
    id: string;
    provider: string;
    category: string;
    icon: string;
    amountUsd: number;
    dueDate: string;
    status: 'due' | 'paid';
    onPay?: (bill: BillCardProps) => void;
    processing?: boolean;
}

export function BillCard({ id, provider, category, icon, amountUsd, dueDate, status, onPay, processing }: BillCardProps) {
    const priceDisplay = createPriceDisplay(amountUsd / 314_159.00);
    const statusColors = status === 'due' ? 'bg-red-500/10 text-red-400 border-red-500/30' : 'bg-green-500/10 text-green-400 border-green-500/30';

    return (
        <div className="rounded-lg border border-cyan-500/30 bg-gradient-to-br from-blue-900/20 to-cyan-900/20 p-5 transition-all hover:border-cyan-500/60 hover:shadow-lg hover:shadow-cyan-500/20">
            <div className="flex items-start justify-between">
                <div>
                    <div className="text-3xl">{icon}</div>
                    <h3 className="mt-2 font-bold text-white">{provider}</h3>
                    <p className="text-sm text-gray-400">{category}</p>
                </div>
                <span className={`rounded px-3 py-1 text-xs font-bold border ${statusColors}`}>{status.toUpperCase()}</span>
            </div>

            <div className="mt-4 rounded-lg bg-black/40 p-3">
                <p className="text-xs text-gray-400">Amount Due</p>
                <p className="font-mono text-lg font-bold text-cyan-300">{priceDisplay.combined}</p>
                <p className="mt-1 text-xs text-gray-500">Native: {priceDisplay.native} | USD: {priceDisplay.usd}</p>
            </div>

            <p className="mt-3 text-sm text-gray-400">📅 Due: <span className="text-white font-semibold">{dueDate}</span></p>

            <button
                onClick={() => onPay?.(arguments[0] as BillCardProps)}
                disabled={processing || status === 'paid'}
                className="mt-4 w-full rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-2 font-bold text-white transition-all hover:shadow-lg hover:shadow-cyan-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {processing ? '⏳ Processing...' : status === 'paid' ? '✅ Paid' : 'Pay Now'}
            </button>
        </div>
    );
}

// ============================================
// RENTAL PROPERTY CARDS (WITH GCV)
// ============================================

interface RentalPropertyProps {
    id: number;
    name: string;
    location: string;
    priceMonthlyTriSyn: number;
    ownershipPercent: number;
    returnsMonthlyTriSyn: number;
    beds: number;
    baths: number;
    sqft: string;
    rating: number;
    image: string;
    onInvest?: (property: RentalPropertyProps) => void;
    processing?: boolean;
}

export function RentalPropertyCard({
    id, name, location, priceMonthlyTriSyn, ownershipPercent, returnsMonthlyTriSyn,
    beds, baths, sqft, rating, image, onInvest, processing
}: RentalPropertyProps) {
    const priceDisplay = createPriceDisplay(priceMonthlyTriSyn);
    const returnsDisplay = createPriceDisplay(returnsMonthlyTriSyn);

    return (
        <div className="rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-900/20 to-green-900/20 overflow-hidden transition-all hover:border-emerald-500/60 hover:shadow-lg hover:shadow-emerald-500/20">
            <div className="flex items-center justify-center bg-gradient-to-br from-emerald-500/20 to-green-500/20 p-8">
                <span className="text-5xl">{image}</span>
            </div>

            <div className="p-6">
                <h3 className="text-xl font-bold text-white">{name}</h3>
                <p className="text-sm text-gray-400">📍 {location}</p>

                <div className="mt-4 grid grid-cols-3 gap-3">
                    <div className="rounded bg-black/40 p-2 text-center">
                        <p className="text-xs text-gray-400">Beds</p>
                        <p className="font-bold text-white">{beds}</p>
                    </div>
                    <div className="rounded bg-black/40 p-2 text-center">
                        <p className="text-xs text-gray-400">Baths</p>
                        <p className="font-bold text-white">{baths}</p>
                    </div>
                    <div className="rounded bg-black/40 p-2 text-center">
                        <p className="text-xs text-gray-400">Rating</p>
                        <p className="font-bold text-yellow-400">⭐ {rating}</p>
                    </div>
                </div>

                <p className="mt-3 text-xs text-gray-400 font-mono">{sqft} sqft</p>

                <div className="mt-4 space-y-3">
                    <div className="rounded-lg bg-black/40 p-3">
                        <p className="text-xs text-gray-400">Monthly Rent</p>
                        <p className="font-mono font-bold text-cyan-300">{priceDisplay.combined}</p>
                        <p className="mt-1 text-xs text-gray-500">Ownership: {ownershipPercent}%</p>
                    </div>

                    <div className="rounded-lg bg-black/40 p-3">
                        <p className="text-xs text-gray-400">Monthly Returns</p>
                        <p className="font-mono font-bold text-green-300">{returnsDisplay.combined}</p>
                        <p className="mt-1 text-xs text-gray-500">{(returnsDisplay.usdAmount / priceDisplay.usdAmount * 100).toFixed(1)}% monthly ROI</p>
                    </div>
                </div>

                <button
                    onClick={() => onInvest?.(arguments[0] as RentalPropertyProps)}
                    disabled={processing}
                    className="mt-4 w-full rounded-lg bg-gradient-to-r from-emerald-500 to-green-500 px-4 py-2 font-bold text-white transition-all hover:shadow-lg hover:shadow-emerald-500/50 disabled:opacity-50"
                >
                    {processing ? '⏳ Processing...' : 'Invest Now'}
                </button>
            </div>
        </div>
    );
}

// ============================================
// COURSE CARDS (WITH GCV)
// ============================================

interface CourseCardProps {
    id: number;
    title: string;
    instructor: string;
    category: string;
    priceTriSyn: number;
    students: number;
    rating: number;
    duration: string;
    modules: number;
    icon: string;
    onEnroll?: (course: CourseCardProps) => void;
    processing?: boolean;
}

export function CourseCard({
    id, title, instructor, category, priceTriSyn, students, rating, duration, modules, icon, onEnroll, processing
}: CourseCardProps) {
    const priceDisplay = createPriceDisplay(priceTriSyn);

    return (
        <div className="rounded-xl border border-purple-500/30 bg-gradient-to-br from-purple-900/20 to-pink-900/20 p-6 transition-all hover:border-purple-500/60 hover:shadow-lg hover:shadow-purple-500/20">
            <div className="flex items-start justify-between">
                <span className="text-3xl">{icon}</span>
                <span className="rounded bg-purple-500/20 px-3 py-1 text-xs font-bold text-purple-300">{category}</span>
            </div>

            <h3 className="mt-3 text-lg font-bold text-white">{title}</h3>
            <p className="text-sm text-gray-400">👨‍🏫 {instructor}</p>

            <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded bg-black/40 p-2 text-center">
                    <p className="text-xs text-gray-400">Duration</p>
                    <p className="font-bold text-white">{duration}</p>
                </div>
                <div className="rounded bg-black/40 p-2 text-center">
                    <p className="text-xs text-gray-400">Modules</p>
                    <p className="font-bold text-white">{modules}</p>
                </div>
            </div>

            <div className="mt-4 rounded-lg bg-black/40 p-3">
                <p className="text-xs text-gray-400">Course Price</p>
                <p className="font-mono font-bold text-cyan-300">{priceDisplay.combined}</p>
                <p className="mt-1 text-xs text-gray-500">{students.toLocaleString()} enrolled • ⭐ {rating}</p>
            </div>

            <button
                onClick={() => onEnroll?.(arguments[0] as CourseCardProps)}
                disabled={processing}
                className="mt-4 w-full rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-2 font-bold text-white transition-all hover:shadow-lg hover:shadow-purple-500/50 disabled:opacity-50"
            >
                {processing ? '⏳ Processing...' : 'Enroll Now'}
            </button>
        </div>
    );
}

// ============================================
// GAME EVENT CARDS (WITH GCV)
// ============================================

interface GameEventProps {
    id: string;
    title: string;
    icon: string;
    type: string;
    entryFeeTriSyn: number;
    prizePoolTriSyn: number;
    players: number;
    maxPlayers: number;
    startsIn: string;
    difficulty: 'Casual' | 'Competitive' | 'Pro';
    onJoin?: (event: GameEventProps) => void;
    processing?: boolean;
}

export function GameEventCard({
    id, title, icon, type, entryFeeTriSyn, prizePoolTriSyn, players, maxPlayers, startsIn, difficulty, onJoin, processing
}: GameEventProps) {
    const entryDisplay = createPriceDisplay(entryFeeTriSyn);
    const prizeDisplay = createPriceDisplay(prizePoolTriSyn);

    const diffColor = {
        Casual: 'bg-green-500/20 text-green-300 border-green-500/30',
        Competitive: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        Pro: 'bg-red-500/20 text-red-300 border-red-500/30',
    };

    const fillPercent = (players / maxPlayers) * 100;

    return (
        <div className="rounded-xl border border-orange-500/30 bg-gradient-to-br from-orange-900/20 to-red-900/20 p-6 transition-all hover:border-orange-500/60 hover:shadow-lg hover:shadow-orange-500/20">
            <div className="flex items-start justify-between">
                <span className="text-3xl">{icon}</span>
                <span className={`rounded border px-3 py-1 text-xs font-bold ${diffColor[difficulty]}`}>{difficulty}</span>
            </div>

            <h3 className="mt-3 text-lg font-bold text-white">{title}</h3>
            <p className="text-sm text-gray-400">🎮 {type}</p>

            <div className="mt-3 space-y-2">
                <div>
                    <p className="text-xs text-gray-400">Players: {players}/{maxPlayers}</p>
                    <div className="mt-1 h-2 rounded-full bg-black/40 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-orange-500 to-red-500" style={{ width: `${fillPercent}%` }} />
                    </div>
                </div>
                <p className="text-sm text-gray-400">⏱️ Starts in: <span className="font-bold text-white">{startsIn}</span></p>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-black/40 p-3">
                    <p className="text-xs text-gray-400">Entry Fee</p>
                    <p className="font-mono text-sm font-bold text-orange-300">{entryDisplay.combined}</p>
                </div>
                <div className="rounded-lg bg-black/40 p-3">
                    <p className="text-xs text-gray-400">Prize Pool</p>
                    <p className="font-mono text-sm font-bold text-yellow-300">{prizeDisplay.combined}</p>
                </div>
            </div>

            <button
                onClick={() => onJoin?.(arguments[0] as GameEventProps)}
                disabled={processing || players >= maxPlayers}
                className="mt-4 w-full rounded-lg bg-gradient-to-r from-orange-500 to-red-500 px-4 py-2 font-bold text-white transition-all hover:shadow-lg hover:shadow-orange-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {processing ? '⏳ Processing...' : players >= maxPlayers ? '❌ Full' : 'Join Event'}
            </button>
        </div>
    );
}

// ============================================
// DELIVERY MERCHANT CARDS (WITH GCV)
// ============================================

interface DeliveryMerchantProps {
    id: number;
    name: string;
    category: string;
    rating: number;
    deliveryTime: string;
    items: number;
    minOrderTriSyn: number;
    logo: string;
    onBrowse?: (merchant: DeliveryMerchantProps) => void;
}

export function DeliveryMerchantCard({
    id, name, category, rating, deliveryTime, items, minOrderTriSyn, logo, onBrowse
}: DeliveryMerchantProps) {
    const minOrderDisplay = createPriceDisplay(minOrderTriSyn);

    return (
        <div
            onClick={() => onBrowse?.(arguments[0] as DeliveryMerchantProps)}
            className="rounded-lg border border-cyan-500/30 bg-gradient-to-br from-cyan-900/20 to-blue-900/20 p-5 cursor-pointer transition-all hover:border-cyan-500/60 hover:shadow-lg hover:shadow-cyan-500/20 hover:scale-105"
        >
            <div className="flex items-start justify-between">
                <div>
                    <span className="text-4xl">{logo}</span>
                    <h3 className="mt-2 font-bold text-white">{name}</h3>
                    <p className="text-sm text-gray-400">{category}</p>
                </div>
                <div className="text-right">
                    <p className="text-lg font-bold text-yellow-400">⭐ {rating}</p>
                    <p className="text-xs text-gray-400">🚚 {deliveryTime}</p>
                </div>
            </div>

            <div className="mt-4 space-y-2">
                <p className="text-sm text-gray-400">Items available: <span className="font-bold text-white">{items}</span></p>
                <div className="rounded-lg bg-black/40 p-2">
                    <p className="text-xs text-gray-400">Minimum Order</p>
                    <p className="font-mono font-bold text-cyan-300">{minOrderDisplay.combined}</p>
                </div>
            </div>

            <button className="mt-4 w-full rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-2 text-sm font-bold text-white transition-all hover:shadow-lg hover:shadow-cyan-500/50">
                Browse Menu
            </button>
        </div>
    );
}

// ============================================
// PI DOMAIN CARD (WITH GCV)
// ============================================

interface PiDomainProps {
    name: string;
    priceTriSyn: number;
    premium: boolean;
    category: string;
    status?: 'available' | 'registered' | 'auction';
    onRegister?: (domain: PiDomainProps) => void;
    processing?: boolean;
}

export function PiDomainCard({ name, priceTriSyn, premium, category, status = 'available', onRegister, processing }: PiDomainProps) {
    const priceDisplay = createPriceDisplay(priceTriSyn);

    const statusColors = {
        available: 'bg-green-500/20 text-green-300 border-green-500/30',
        registered: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
        auction: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    };

    return (
        <div className="rounded-lg border border-cyan-500/30 bg-gradient-to-br from-cyan-900/20 to-blue-900/20 p-6 transition-all hover:border-cyan-500/60 hover:shadow-lg hover:shadow-cyan-500/20">
            <div className="flex items-start justify-between">
                <div>
                    <p className="font-mono text-2xl font-bold text-cyan-300">{name}</p>
                    <p className="mt-1 text-sm text-gray-400">{category}</p>
                </div>
                <span className={`rounded border px-3 py-1 text-xs font-bold ${statusColors[status]}`}>{status.toUpperCase()}</span>
            </div>

            {premium && <div className="mt-2 inline-block rounded bg-purple-500/30 px-2 py-1 text-xs font-bold text-purple-300">👑 Premium</div>}

            <div className="mt-4 rounded-lg bg-black/40 p-3">
                <p className="text-xs text-gray-400">Registration Price</p>
                <p className="font-mono font-bold text-cyan-300">{priceDisplay.combined}</p>
                <p className="mt-1 text-xs text-gray-500">Native: {priceDisplay.native} | USD: {priceDisplay.usd}</p>
            </div>

            <button
                onClick={() => onRegister?.(arguments[0] as PiDomainProps)}
                disabled={processing || status !== 'available'}
                className="mt-4 w-full rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 px-4 py-2 font-bold text-white transition-all hover:shadow-lg hover:shadow-cyan-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {processing ? '⏳ Processing...' : status === 'available' ? 'Register Domain' : status === 'registered' ? '✅ Registered' : 'Place Bid'}
            </button>
        </div>
    );
}

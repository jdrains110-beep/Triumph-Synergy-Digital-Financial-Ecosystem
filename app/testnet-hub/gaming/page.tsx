'use client';

import { useState } from 'react';
import Link from 'next/link';

type GameEvent = {
    id: string;
    title: string;
    icon: string;
    type: string;
    entryFee: number;
    prizePool: number;
    players: number;
    maxPlayers: number;
    startsIn: string;
    difficulty: 'Casual' | 'Competitive' | 'Pro';
};

const EVENTS: GameEvent[] = [
    { id: 'rivals-cup', title: 'Sovereign Rivals Cup', icon: '⚔️', type: 'Strategy Battle', entryFee: 50, prizePool: 12500, players: 184, maxPlayers: 256, startsIn: '12m', difficulty: 'Competitive' },
    { id: 'pi-arena', title: 'Pi Arena Showdown', icon: '🏟️', type: 'Battle Royale', entryFee: 25, prizePool: 6000, players: 92, maxPlayers: 100, startsIn: '3m', difficulty: 'Casual' },
    { id: 'trisyn-league', title: 'TriSyn Fantasy League', icon: '🏆', type: 'Fantasy Sports', entryFee: 100, prizePool: 25000, players: 218, maxPlayers: 500, startsIn: '1h 40m', difficulty: 'Pro' },
    { id: 'quiz-royale', title: 'Sovereign Quiz Royale', icon: '🧠', type: 'Trivia', entryFee: 10, prizePool: 2000, players: 47, maxPlayers: 200, startsIn: '8m', difficulty: 'Casual' },
    { id: 'crypto-race', title: 'Crypto Trading Race', icon: '📈', type: 'Trading Sim', entryFee: 75, prizePool: 15000, players: 130, maxPlayers: 150, startsIn: '25m', difficulty: 'Pro' },
    { id: 'pixel-quest', title: 'Pixel Quest Tournament', icon: '🎯', type: 'Arcade', entryFee: 15, prizePool: 3500, players: 66, maxPlayers: 128, startsIn: '15m', difficulty: 'Competitive' },
];

const LEADERBOARD = [
    { rank: 1, player: 'CryptoKing.pi', wins: 142, earned: 48200 },
    { rank: 2, player: 'SovereignQueen.pi', wins: 128, earned: 41500 },
    { rank: 3, player: 'PiWarrior.pi', wins: 119, earned: 37800 },
    { rank: 4, player: 'TriSynMaster.pi', wins: 104, earned: 31200 },
    { rank: 5, player: 'GoldMiner.pi', wins: 98, earned: 28900 },
];

const diffColor: Record<GameEvent['difficulty'], string> = {
    Casual: 'bg-green-500/15 text-green-400',
    Competitive: 'bg-amber-500/15 text-amber-400',
    Pro: 'bg-red-500/15 text-red-400',
};

export default function GamingPage() {
    const [joined, setJoined] = useState<string[]>([]);
    const [processing, setProcessing] = useState<string | null>(null);
    const [earned, setEarned] = useState(0);

    const joinEvent = async (event: GameEvent) => {
        setProcessing(event.id);
        try {
            await fetch('/api/testnet/transaction', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    itemType: 'gaming',
                    itemId: event.id,
                    amount: event.entryFee,
                    currency: 'TriSyn',
                    paymentMethod: 'trisyn',
                    userId: 'testnet-user',
                }),
            });
        } catch {
            // Graceful fallback in testnet
        }
        await new Promise((r) => setTimeout(r, 700));
        setJoined((prev) => [...prev, event.id]);
        // Simulated testnet reward for joining/playing
        const reward = Math.floor(event.prizePool / event.maxPlayers);
        setEarned((e) => e + reward);
        setProcessing(null);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-emerald-950/40 to-slate-900">
            <header className="border-b border-green-500/20 bg-black/50 backdrop-blur-xl">
                <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
                    <Link href="/testnet-hub" className="text-sm text-green-400 hover:text-green-300">← Sovereign Hub</Link>
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-white">🎮 Gaming Events</h1>
                            <p className="mt-1 text-gray-400">Compete in tournaments & events to earn TriSyn — SAIB enforced prize pools</p>
                        </div>
                        <div className="rounded-xl border border-green-500/30 bg-green-500/10 px-6 py-3 text-center">
                            <p className="text-xs text-gray-400">TriSyn Earned</p>
                            <p className="text-2xl font-bold text-green-400">+{earned.toLocaleString()}</p>
                        </div>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
                {/* Events grid */}
                <h2 className="mb-5 text-2xl font-bold text-white">Live & Upcoming Events</h2>
                <div className="mb-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {EVENTS.map((event) => {
                        const isJoined = joined.includes(event.id);
                        return (
                            <div key={event.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-6">
                                <div className="mb-3 flex items-start justify-between">
                                    <span className="text-4xl">{event.icon}</span>
                                    <span className={`rounded-full px-3 py-1 text-[11px] font-medium ${diffColor[event.difficulty]}`}>{event.difficulty}</span>
                                </div>
                                <h3 className="mb-1 text-lg font-bold text-white">{event.title}</h3>
                                <p className="mb-4 text-xs text-gray-400">{event.type} · Starts in {event.startsIn}</p>

                                <div className="mb-4 space-y-2 text-sm">
                                    <div className="flex justify-between"><span className="text-gray-400">Prize Pool</span><span className="font-bold text-green-400">{event.prizePool.toLocaleString()} TriSyn</span></div>
                                    <div className="flex justify-between"><span className="text-gray-400">Entry Fee</span><span className="text-white">{event.entryFee} TriSyn</span></div>
                                    <div className="flex justify-between"><span className="text-gray-400">Players</span><span className="text-white">{event.players}/{event.maxPlayers}</span></div>
                                </div>

                                <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                                    <div className="h-full bg-gradient-to-r from-green-500 to-emerald-400" style={{ width: `${(event.players / event.maxPlayers) * 100}%` }} />
                                </div>

                                <button
                                    onClick={() => joinEvent(event)}
                                    disabled={isJoined || processing === event.id}
                                    className="w-full rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 py-2.5 font-bold text-white disabled:opacity-50"
                                >
                                    {isJoined ? '✓ Joined — Play & Earn' : processing === event.id ? 'Joining…' : `Join · ${event.entryFee} TriSyn`}
                                </button>
                            </div>
                        );
                    })}
                </div>

                {/* Leaderboard */}
                <h2 className="mb-5 text-2xl font-bold text-white">🏆 Top Earners Leaderboard</h2>
                <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
                    <table className="w-full text-left text-sm">
                        <thead className="border-b border-white/10 text-gray-400">
                            <tr>
                                <th className="px-6 py-4">Rank</th>
                                <th className="px-6 py-4">Player</th>
                                <th className="px-6 py-4">Wins</th>
                                <th className="px-6 py-4">TriSyn Earned</th>
                            </tr>
                        </thead>
                        <tbody>
                            {LEADERBOARD.map((row) => (
                                <tr key={row.rank} className="border-b border-white/5">
                                    <td className="px-6 py-4 font-bold text-white">{row.rank === 1 ? '🥇' : row.rank === 2 ? '🥈' : row.rank === 3 ? '🥉' : `#${row.rank}`}</td>
                                    <td className="px-6 py-4 font-mono text-white">{row.player}</td>
                                    <td className="px-6 py-4 text-gray-300">{row.wins}</td>
                                    <td className="px-6 py-4 font-bold text-green-400">{row.earned.toLocaleString()} TriSyn</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <p className="mt-8 text-center text-xs text-gray-500">
                    🛡️ All entry fees and prize payouts are escrowed and enforced by SAIB across internal, external & TriSyn utility tokens.
                </p>
            </main>
        </div>
    );
}

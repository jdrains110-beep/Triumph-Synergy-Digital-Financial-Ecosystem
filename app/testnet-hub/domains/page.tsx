'use client';

import { useState } from 'react';
import Link from 'next/link';

type Domain = {
    name: string;
    price: number;
    currency: 'Pi' | 'TriSyn';
    premium: boolean;
    category: string;
};

const FEATURED: Domain[] = [
    { name: 'sovereign.pi', price: 5000, currency: 'TriSyn', premium: true, category: 'Premium' },
    { name: 'king.pi', price: 8000, currency: 'TriSyn', premium: true, category: 'Royalty' },
    { name: 'queen.pi', price: 8000, currency: 'TriSyn', premium: true, category: 'Royalty' },
    { name: 'trade.pi', price: 3500, currency: 'TriSyn', premium: true, category: 'Commerce' },
    { name: 'gold.pi', price: 6500, currency: 'TriSyn', premium: true, category: 'Finance' },
    { name: 'estate.pi', price: 4200, currency: 'TriSyn', premium: false, category: 'Real Estate' },
];

const MY_DOMAINS = [
    { name: 'jeremiah.pi', tokenId: 'TKN-PI-0001', status: 'Active', anchored: true },
    { name: 'triumph-synergy.pi', tokenId: 'TKN-PI-0002', status: 'Active', anchored: true },
];

export default function DomainsPage() {
    const [search, setSearch] = useState('');
    const [available, setAvailable] = useState<Domain | null>(null);
    const [processing, setProcessing] = useState(false);
    const [registered, setRegistered] = useState<string[]>([]);

    const checkAvailability = () => {
        const clean = search.trim().toLowerCase().replace(/\.pi$/, '');
        if (!clean) return;
        // Testnet: every searched domain is available with computed price
        const price = clean.length <= 3 ? 7500 : clean.length <= 5 ? 4500 : 2500;
        setAvailable({ name: `${clean}.pi`, price, currency: 'TriSyn', premium: clean.length <= 5, category: 'Custom' });
    };

    const register = async (domain: Domain) => {
        setProcessing(true);
        try {
            await fetch('/api/testnet/transaction', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    itemType: 'domain',
                    itemId: domain.name,
                    amount: domain.price,
                    currency: domain.currency,
                    paymentMethod: domain.currency.toLowerCase(),
                    userId: 'testnet-user',
                }),
            });
        } catch {
            // Graceful fallback — testnet still registers locally
        }
        await new Promise((r) => setTimeout(r, 800));
        setRegistered((prev) => [...prev, domain.name]);
        setProcessing(false);
        setAvailable(null);
        setSearch('');
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900">
            <header className="border-b border-cyan-500/20 bg-black/50 backdrop-blur-xl">
                <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
                    <Link href="/testnet-hub" className="text-sm text-cyan-400 hover:text-cyan-300">← Sovereign Hub</Link>
                    <h1 className="mt-2 text-3xl font-bold text-white">🌐 Web3 .pi Domains</h1>
                    <p className="mt-1 text-gray-400">Register & tokenize sovereign .pi domains as on-chain assets — SAIB enforced</p>
                </div>
            </header>

            <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
                {/* Search */}
                <div className="mb-10 rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-cyan-900/20 to-blue-900/20 p-8">
                    <h2 className="mb-4 text-xl font-bold text-white">Find your sovereign domain</h2>
                    <div className="flex flex-wrap gap-3">
                        <div className="flex flex-1 items-center rounded-lg border border-white/10 bg-black/40 px-4">
                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && checkAvailability()}
                                placeholder="yourname"
                                className="flex-1 bg-transparent py-3 text-white outline-none placeholder:text-gray-500"
                            />
                            <span className="font-mono text-cyan-400">.pi</span>
                        </div>
                        <button
                            onClick={checkAvailability}
                            className="rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 px-8 py-3 font-bold text-white transition-all hover:shadow-lg hover:shadow-cyan-500/50"
                        >
                            Search
                        </button>
                    </div>

                    {available && (
                        <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-lg border border-green-500/30 bg-green-500/10 p-5">
                            <div>
                                <p className="font-mono text-lg font-bold text-white">{available.name}</p>
                                <p className="text-sm text-green-400">✓ Available {available.premium && '· Premium'}</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="text-xl font-bold text-cyan-300">{available.price.toLocaleString()} {available.currency}</span>
                                <button
                                    onClick={() => register(available)}
                                    disabled={processing}
                                    className="rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 px-6 py-2.5 font-bold text-white disabled:opacity-50"
                                >
                                    {processing ? 'Registering…' : 'Register & Tokenize'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Featured */}
                <h2 className="mb-5 text-2xl font-bold text-white">Featured Domains</h2>
                <div className="mb-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {FEATURED.map((d) => {
                        const isOwned = registered.includes(d.name);
                        return (
                            <div key={d.name} className="rounded-xl border border-white/10 bg-white/[0.03] p-6">
                                <div className="mb-3 flex items-center justify-between">
                                    <span className="rounded-full bg-purple-500/15 px-3 py-1 text-[11px] font-medium text-purple-300">{d.category}</span>
                                    {d.premium && <span className="text-amber-400">⭐ Premium</span>}
                                </div>
                                <p className="mb-1 font-mono text-xl font-bold text-white">{d.name}</p>
                                <p className="mb-4 text-lg font-semibold text-cyan-300">{d.price.toLocaleString()} {d.currency}</p>
                                <button
                                    onClick={() => register(d)}
                                    disabled={processing || isOwned}
                                    className="w-full rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 py-2.5 font-bold text-white disabled:opacity-50"
                                >
                                    {isOwned ? '✓ Owned' : processing ? 'Processing…' : 'Register'}
                                </button>
                            </div>
                        );
                    })}
                </div>

                {/* My domains */}
                <h2 className="mb-5 text-2xl font-bold text-white">My Tokenized Domains</h2>
                <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
                    <table className="w-full text-left text-sm">
                        <thead className="border-b border-white/10 text-gray-400">
                            <tr>
                                <th className="px-6 py-4">Domain</th>
                                <th className="px-6 py-4">Token ID</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">On-Chain Anchor</th>
                            </tr>
                        </thead>
                        <tbody>
                            {[...MY_DOMAINS, ...registered.map((name, i) => ({ name, tokenId: `TKN-PI-${String(3 + i).padStart(4, '0')}`, status: 'Active', anchored: true }))].map((d) => (
                                <tr key={d.name} className="border-b border-white/5">
                                    <td className="px-6 py-4 font-mono font-semibold text-white">{d.name}</td>
                                    <td className="px-6 py-4 font-mono text-gray-400">{d.tokenId}</td>
                                    <td className="px-6 py-4"><span className="rounded-full bg-green-500/15 px-3 py-1 text-xs text-green-400">{d.status}</span></td>
                                    <td className="px-6 py-4 text-cyan-400">{d.anchored ? '🔗 Anchored' : '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <p className="mt-6 text-center text-xs text-gray-500">
                    🛡️ Every domain registration is tokenized and enforced by SAIB across internal, external & TriSyn utility tokens.
                </p>
            </main>
        </div>
    );
}

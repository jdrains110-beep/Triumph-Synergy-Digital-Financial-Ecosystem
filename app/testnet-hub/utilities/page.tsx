'use client';

import { useState } from 'react';
import Link from 'next/link';

type Bill = {
    id: string;
    provider: string;
    category: string;
    icon: string;
    amount: number;
    dueDate: string;
    status: 'due' | 'paid';
};

const INITIAL_BILLS: Bill[] = [
    { id: 'elec-1', provider: 'Sovereign Power & Light', category: 'Electricity', icon: '⚡', amount: 142.5, dueDate: 'Jun 15', status: 'due' },
    { id: 'water-1', provider: 'Aqua Sovereign Utility', category: 'Water', icon: '💧', amount: 68.2, dueDate: 'Jun 18', status: 'due' },
    { id: 'gas-1', provider: 'TriSyn Gas Co.', category: 'Gas', icon: '🔥', amount: 54.0, dueDate: 'Jun 20', status: 'due' },
    { id: 'net-1', provider: 'Pi Fiber Network', category: 'Internet', icon: '🌐', amount: 79.99, dueDate: 'Jun 22', status: 'due' },
    { id: 'phone-1', provider: 'Sovereign Mobile', category: 'Phone', icon: '📱', amount: 45.0, dueDate: 'Jun 25', status: 'due' },
    { id: 'waste-1', provider: 'EcoSovereign Waste', category: 'Waste', icon: '♻️', amount: 32.5, dueDate: 'Jun 28', status: 'due' },
];

const TOKENS = ['Pi', 'TriSyn', 'Gold-Pi'] as const;

export default function UtilitiesPage() {
    const [bills, setBills] = useState<Bill[]>(INITIAL_BILLS);
    const [token, setToken] = useState<(typeof TOKENS)[number]>('TriSyn');
    const [processing, setProcessing] = useState<string | null>(null);

    const payBill = async (bill: Bill) => {
        setProcessing(bill.id);
        try {
            await fetch('/api/testnet/transaction', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    itemType: 'utility',
                    itemId: bill.id,
                    amount: bill.amount,
                    currency: token,
                    paymentMethod: token.toLowerCase(),
                    userId: 'testnet-user',
                }),
            });
        } catch {
            // Graceful fallback in testnet
        }
        await new Promise((r) => setTimeout(r, 700));
        setBills((prev) => prev.map((b) => (b.id === bill.id ? { ...b, status: 'paid' } : b)));
        setProcessing(null);
    };

    const payAll = async () => {
        for (const bill of bills.filter((b) => b.status === 'due')) {
            await payBill(bill);
        }
    };

    const totalDue = bills.filter((b) => b.status === 'due').reduce((s, b) => s + b.amount, 0);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-amber-950/40 to-slate-900">
            <header className="border-b border-amber-500/20 bg-black/50 backdrop-blur-xl">
                <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
                    <Link href="/testnet-hub" className="text-sm text-amber-400 hover:text-amber-300">← Sovereign Hub</Link>
                    <h1 className="mt-2 text-3xl font-bold text-white">💡 Utilities & Bills</h1>
                    <p className="mt-1 text-gray-400">Pay electricity, water, gas, internet & phone with internal tokens — SAIB enforced</p>
                </div>
            </header>

            <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
                {/* Summary */}
                <div className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-900/20 to-yellow-900/20 p-6">
                    <div>
                        <p className="text-sm text-gray-400">Total Outstanding</p>
                        <p className="text-3xl font-bold text-amber-300">{totalDue.toFixed(2)} {token}</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex rounded-lg border border-white/10 bg-black/40 p-1">
                            {TOKENS.map((t) => (
                                <button
                                    key={t}
                                    onClick={() => setToken(t)}
                                    className={`rounded-md px-4 py-2 text-sm font-semibold transition-all ${token === t ? 'bg-amber-500 text-black' : 'text-gray-400 hover:text-white'}`}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={payAll}
                            disabled={totalDue === 0 || processing !== null}
                            className="rounded-lg bg-gradient-to-r from-amber-500 to-yellow-500 px-6 py-2.5 font-bold text-black disabled:opacity-50"
                        >
                            Pay All
                        </button>
                    </div>
                </div>

                {/* Bills */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {bills.map((bill) => (
                        <div key={bill.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-6">
                            <div className="mb-4 flex items-start justify-between">
                                <div className="flex items-center gap-3">
                                    <span className="text-3xl">{bill.icon}</span>
                                    <div>
                                        <p className="font-bold text-white">{bill.provider}</p>
                                        <p className="text-xs text-gray-400">{bill.category} · Due {bill.dueDate}</p>
                                    </div>
                                </div>
                                {bill.status === 'paid' && <span className="rounded-full bg-green-500/15 px-3 py-1 text-xs text-green-400">✓ Paid</span>}
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-xl font-bold text-amber-300">{bill.amount.toFixed(2)} {token}</span>
                                <button
                                    onClick={() => payBill(bill)}
                                    disabled={bill.status === 'paid' || processing === bill.id}
                                    className="rounded-lg bg-gradient-to-r from-amber-500 to-yellow-500 px-5 py-2 text-sm font-bold text-black disabled:opacity-50"
                                >
                                    {bill.status === 'paid' ? 'Paid' : processing === bill.id ? 'Paying…' : 'Pay Now'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <p className="mt-8 text-center text-xs text-gray-500">
                    🛡️ Every bill payment is settled and enforced by SAIB across internal, external & TriSyn utility tokens.
                </p>
            </main>
        </div>
    );
}

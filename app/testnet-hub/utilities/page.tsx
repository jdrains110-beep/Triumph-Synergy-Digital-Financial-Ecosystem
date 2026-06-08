'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BillCard } from '@/components/testnet-hub-gcv-advanced';

type Bill = {
    id: string;
    provider: string;
    category: string;
    icon: string;
    amountUsd: number;
    dueDate: string;
    status: 'due' | 'paid';
};

// USD amounts converted to TriSyn display amounts (1 TriSyn = ~$31.4159 USD)
const INITIAL_BILLS: Bill[] = [
    { id: 'elec-1', provider: 'Sovereign Power & Light', category: 'Electricity', icon: '⚡', amountUsd: 142.5, dueDate: 'Jun 15', status: 'due' },
    { id: 'water-1', provider: 'Aqua Sovereign Utility', category: 'Water', icon: '💧', amountUsd: 68.2, dueDate: 'Jun 18', status: 'due' },
    { id: 'gas-1', provider: 'TriSyn Gas Co.', category: 'Gas', icon: '🔥', amountUsd: 54.0, dueDate: 'Jun 20', status: 'due' },
    { id: 'net-1', provider: 'Pi Fiber Network', category: 'Internet', icon: '🌐', amountUsd: 79.99, dueDate: 'Jun 22', status: 'due' },
    { id: 'phone-1', provider: 'Sovereign Mobile', category: 'Phone', icon: '📱', amountUsd: 45.0, dueDate: 'Jun 25', status: 'due' },
    { id: 'waste-1', provider: 'EcoSovereign Waste', category: 'Waste', icon: '♻️', amountUsd: 32.5, dueDate: 'Jun 28', status: 'due' },
];

const TOKENS = ['Pi', 'TriSyn', 'Gold-Pi'] as const;

export default function UtilitiesPage() {
    const [bills, setBills] = useState<Bill[]>(INITIAL_BILLS);
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
                    amountUsd: bill.amountUsd,
                    currency: 'TriSyn',
                    paymentMethod: 'trisyn',
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

    const totalDue = bills.filter((b) => b.status === 'due').reduce((s, b) => s + b.amountUsd, 0);

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
                <div className="mb-8 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-900/20 to-yellow-900/20 p-6">
                    <div>
                        <p className="text-sm text-gray-400">Total Outstanding (USD equivalent)</p>
                        <p className="text-3xl font-bold text-amber-300">${totalDue.toFixed(2)} USD</p>
                        <p className="mt-2 text-sm text-gray-400">≈ {(totalDue / 31.4159).toFixed(2)} TriSyn</p>
                    </div>
                </div>

                {/* Bills */}
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    {bills.map((bill) => (
                        <BillCard
                            key={bill.id}
                            id={bill.id}
                            provider={bill.provider}
                            category={bill.category}
                            icon={bill.icon}
                            amountUsd={bill.amountUsd}
                            dueDate={bill.dueDate}
                            status={bill.status}
                            onPay={payBill}
                            processing={processing === bill.id}
                        />
                    ))}
                </div>

                <p className="mt-8 text-center text-xs text-gray-500">
                    🛡️ Every utility payment backed by TriSyn tokens with GCV conversion. SAIB enforces transaction settlement across internal/external networks.
                </p>
            </main>
        </div>
    );
}

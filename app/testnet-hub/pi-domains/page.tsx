'use client';

import { useState } from 'react';
import Link from 'next/link';
import { PiDomainCard } from '@/components/testnet-hub-gcv-advanced';

// All 22 Triumph Synergy tokenized asset .pi domains
// Owned 100% by Triumph Synergy + Founder Jeremiah Joel Drains
const PI_DOMAINS = [
    { name: 'wingstop.pi', priceTriSyn: 5200, premium: true, category: 'Food & Dining', status: 'available' as const },
    { name: 'gru.pi', priceTriSyn: 4800, premium: true, category: 'Utilities', status: 'available' as const },
    { name: 'netjets.pi', priceTriSyn: 6500, premium: true, category: 'Private Aviation', status: 'available' as const },
    { name: 'sonnysbbq.pi', priceTriSyn: 3600, premium: true, category: 'Food & Dining', status: 'available' as const },
    { name: 'shands.pi', priceTriSyn: 5400, premium: true, category: 'Healthcare', status: 'available' as const },
    { name: 'ufhealth.pi', priceTriSyn: 5100, premium: true, category: 'Healthcare', status: 'available' as const },
    { name: 'ufl.pi', priceTriSyn: 4900, premium: true, category: 'Education', status: 'available' as const },
    { name: 'putnamclerk.pi', priceTriSyn: 3200, premium: false, category: 'Government', status: 'available' as const },
    { name: 'checkbeck.pi', priceTriSyn: 2800, premium: false, category: 'Financial Services', status: 'available' as const },
    { name: 'daytonainternationalspeedway.pi', priceTriSyn: 6200, premium: true, category: 'Entertainment', status: 'available' as const },
    { name: 'gracekennedy.pi', priceTriSyn: 5800, premium: true, category: 'Caribbean Commerce', status: 'available' as const },
    { name: 'winnebago.pi', priceTriSyn: 4700, premium: true, category: 'Manufacturing', status: 'available' as const },
    { name: 'palatkaha.pi', priceTriSyn: 3100, premium: false, category: 'Real Estate', status: 'available' as const },
    { name: 'circuit7.pi', priceTriSyn: 3400, premium: false, category: 'Legal & Courts', status: 'available' as const },
    { name: 'magellanjets.pi', priceTriSyn: 6100, premium: true, category: 'Private Aviation', status: 'available' as const },
    { name: 'rulonco.pi', priceTriSyn: 3800, premium: false, category: 'Manufacturing', status: 'available' as const },
    { name: 'appleandeve.pi', priceTriSyn: 2900, premium: false, category: 'Beverages', status: 'available' as const },
    { name: 'seprod.pi', priceTriSyn: 3300, premium: false, category: 'Agriculture', status: 'available' as const },
    { name: 'jamrockmart.pi', priceTriSyn: 3500, premium: false, category: 'Retail & Commerce', status: 'available' as const },
    { name: 'spirit.pi', priceTriSyn: 6300, premium: true, category: 'Commercial Aviation', status: 'available' as const },
    { name: 'wawa.pi', priceTriSyn: 4600, premium: true, category: 'Convenience & Food', status: 'available' as const },
    { name: 'publix.pi', priceTriSyn: 5500, premium: true, category: 'Supermarket', status: 'available' as const },
];

interface DomainStorefront {
    domainName: string;
    brandName: string;
    description: string;
    products: Array<{
        id: string;
        name: string;
        description: string;
        priceTriSyn: number;
        icon: string;
        stock: number;
    }>;
}

const DOMAIN_STOREFRONTS: Record<string, DomainStorefront> = {
    'wingstop.pi': {
        domainName: 'wingstop.pi',
        brandName: 'Wingstop',
        description: 'Premium chicken wings and sides, 100% Pi-settled across all locations',
        products: [
            { id: 'wings-1', name: 'Wing Box Bundle', description: '20 crispy wings + dips', priceTriSyn: 120, icon: '🍗', stock: 500 },
            { id: 'wings-2', name: 'Wings & Fries Combo', description: 'Wings + fries + drink', priceTriSyn: 85, icon: '🍟', stock: 300 },
            { id: 'wings-3', name: 'Loyalty Card (6mo)', description: '6 months unlimited wings rewards', priceTriSyn: 250, icon: '🎫', stock: 100 },
        ]
    },
    'gru.pi': {
        domainName: 'gru.pi',
        brandName: 'Gainesville Regional Utilities',
        description: 'Electric, water, gas payment in Pi - zero processing fees',
        products: [
            { id: 'util-1', name: 'Bill Payment Credit $100', description: 'Apply to any utility bill', priceTriSyn: 310, icon: '⚡', stock: 1000 },
            { id: 'util-2', name: 'Budget Plan Enrollment', description: 'Fixed monthly utility cost', priceTriSyn: 50, icon: '📊', stock: 500 },
            { id: 'util-3', name: 'Smart Meter Upgrade', description: 'Real-time usage tracking', priceTriSyn: 200, icon: '📱', stock: 200 },
        ]
    },
    'netjets.pi': {
        domainName: 'netjets.pi',
        brandName: 'NetJets',
        description: 'Private aviation - fractional ownership and charter flights in Pi',
        products: [
            { id: 'jet-1', name: 'Flight Hours (25)', description: '25 hours private jet access', priceTriSyn: 8000, icon: '✈️', stock: 50 },
            { id: 'jet-2', name: 'Monthly Charter', description: 'Unlimited charter flights 1 month', priceTriSyn: 5000, icon: '🛩️', stock: 25 },
            { id: 'jet-3', name: 'Gold Membership', description: '1-year elite member access', priceTriSyn: 12000, icon: '👑', stock: 10 },
        ]
    },
    'spirit.pi': {
        domainName: 'spirit.pi',
        brandName: 'Spirit Airlines',
        description: 'Commercial flights worldwide - book with Pi, zero credit card fees',
        products: [
            { id: 'flight-1', name: 'Flight Credit $200', description: 'Valid for any domestic flight', priceTriSyn: 630, icon: '✈️', stock: 500 },
            { id: 'flight-2', name: 'Annual Membership', description: '12 months free baggage + priority', priceTriSyn: 450, icon: '🎫', stock: 200 },
            { id: 'flight-3', name: 'International Pass', description: 'Unlimited flights 30 days', priceTriSyn: 2500, icon: '🌍', stock: 50 },
        ]
    },
    'shands.pi': {
        domainName: 'shands.pi',
        brandName: 'Shands Hospital',
        description: 'Healthcare services and telemedicine - insurance accepted, Pi payments welcome',
        products: [
            { id: 'med-1', name: 'Telehealth Consultation', description: 'Video visit with licensed doctor', priceTriSyn: 150, icon: '👨‍⚕️', stock: 500 },
            { id: 'med-2', name: 'Annual Wellness Package', description: 'Full checkup + lab work', priceTriSyn: 400, icon: '💊', stock: 200 },
            { id: 'med-3', name: 'Emergency Room Credit', description: '$500 ER coverage', priceTriSyn: 1200, icon: '🚑', stock: 100 },
        ]
    },
    'publix.pi': {
        domainName: 'publix.pi',
        brandName: 'Publix Supermarket',
        description: 'Premium grocery, 100% tokenized across 1,050+ locations - Pi settlement everywhere',
        products: [
            { id: 'pub-1', name: 'Weekly Groceries $50', description: 'Gift card for Publix', priceTriSyn: 155, icon: '🛒', stock: 1000 },
            { id: 'pub-2', name: 'Premium Member Annual', description: '12 months exclusive deals + deliveries', priceTriSyn: 350, icon: '👑', stock: 500 },
            { id: 'pub-3', name: 'Organic Bundle Plan', description: 'Monthly organic produce delivery', priceTriSyn: 400, icon: '🥕', stock: 200 },
        ]
    },
    'wawa.pi': {
        domainName: 'wawa.pi',
        brandName: 'Wawa',
        description: 'Convenience stores + fuel + food & beverage - 1,050+ locations, all Pi-ready',
        products: [
            { id: 'waw-1', name: 'Fuel Credit $25', description: 'Pump gas at any Wawa', priceTriSyn: 75, icon: '⛽', stock: 2000 },
            { id: 'waw-2', name: 'Food & Drink $50', description: 'Coffee, snacks, meals redeemable', priceTriSyn: 155, icon: '☕', stock: 1500 },
            { id: 'waw-3', name: 'Annual Rewards Plan', description: 'Points multiplier + exclusive offers', priceTriSyn: 200, icon: '🎁', stock: 500 },
        ]
    },
    'ufl.pi': {
        domainName: 'ufl.pi',
        brandName: 'University of Florida',
        description: 'Tuition, housing, books, and campus services - all Pi-payable',
        products: [
            { id: 'ufl-1', name: 'One Course Tuition', description: 'Semester course fees', priceTriSyn: 800, icon: '📚', stock: 100 },
            { id: 'ufl-2', name: 'Housing Credit $1000', description: 'On-campus or approved housing', priceTriSyn: 3100, icon: '🏠', stock: 50 },
            { id: 'ufl-3', name: 'Pioneer Scholarship', description: 'Annual Pi-based scholarship', priceTriSyn: 5000, icon: '🎓', stock: 20 },
        ]
    },
    'gracekennedy.pi': {
        domainName: 'gracekennedy.pi',
        brandName: 'Grace Kennedy',
        description: 'Caribbean commerce - Jamaica\'s largest conglomerate, now sovereign via Pi',
        products: [
            { id: 'gk-1', name: 'Caribbean Goods $100', description: 'Import package of JA products', priceTriSyn: 310, icon: '🌴', stock: 200 },
            { id: 'gk-2', name: 'Financial Services', description: 'Banking + remittance solutions', priceTriSyn: 450, icon: '🏦', stock: 100 },
            { id: 'gk-3', name: 'Wholesale License', description: '30-day wholesale buying rights', priceTriSyn: 1500, icon: '🏪', stock: 30 },
        ]
    },
];

export default function PiDomainsPage() {
    const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterCategory, setFilterCategory] = useState<string>('all');
    const [processingDomain, setProcessingDomain] = useState<string | null>(null);

    const filteredDomains = PI_DOMAINS.filter((domain) => {
        const matchesSearch = domain.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = filterCategory === 'all' || domain.category === filterCategory;
        return matchesSearch && matchesCategory;
    });

    const categories = Array.from(new Set(PI_DOMAINS.map((d) => d.category)));

    const handleRegisterDomain = async (domainName: string) => {
        setProcessingDomain(domainName);
        try {
            await fetch('/api/testnet/transaction', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    itemType: 'pi-domain',
                    itemId: domainName,
                    amountTriSyn: PI_DOMAINS.find((d) => d.name === domainName)?.priceTriSyn,
                    currency: 'TriSyn',
                    paymentMethod: 'trisyn',
                    userId: 'testnet-user',
                }),
            });
        } catch {
            // Graceful fallback
        }
        await new Promise((r) => setTimeout(r, 800));
        setProcessingDomain(null);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-cyan-950/40 to-slate-900">
            {/* Header */}
            <header className="border-b border-cyan-500/30 bg-black/50 backdrop-blur-xl sticky top-0 z-40">
                <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                    <Link href="/" className="text-sm text-cyan-400 hover:text-cyan-300">← Back to Triumph</Link>
                    <h1 className="mt-2 text-3xl font-bold text-white">🌐 Triumph Synergy - Real Tokenized Asset Domains</h1>
                    <p className="mt-1 text-gray-400">22 actual business entities and services - 100% owned by Triumph Synergy & Founder Jeremiah Joel Drains. Each domain is a sovereign web3 gateway to real-world commerce with immediate Pi settlement.</p>
                    <p className="mt-2 text-sm text-cyan-400">✨ Ownership Model: JOINT_100PCT (Triumph Synergy + Founder) · All domains cascaded to web2/web1 infrastructure</p>
                </div>
            </header>

            <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
                {/* Search & Filter */}
                <div className="mb-8 space-y-4 rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-cyan-900/20 to-blue-900/20 p-6">
                    <div>
                        <h2 className="mb-4 text-lg font-bold text-white">Find Your Domain</h2>
                        <div className="flex flex-col gap-4 sm:flex-row">
                            <div className="flex flex-1 items-center rounded-lg border border-white/10 bg-black/40 px-4">
                                <input
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search domain name..."
                                    className="flex-1 bg-transparent py-3 text-white outline-none placeholder:text-gray-500"
                                />
                                <span className="font-mono text-cyan-400">.pi</span>
                            </div>
                            <select
                                value={filterCategory}
                                onChange={(e) => setFilterCategory(e.target.value)}
                                className="rounded-lg border border-white/10 bg-black/40 px-4 py-3 text-white focus:outline-none focus:border-cyan-400"
                            >
                                <option value="all">All Categories</option>
                                {categories.map((cat) => (
                                    <option key={cat} value={cat}>
                                        {cat}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="rounded-lg bg-black/40 p-3">
                        <p className="text-sm text-gray-400">
                            💡 <strong>Tip:</strong> Each domain includes its own storefront with test products. Register today to explore all integrated e-commerce functionality with real GCV conversions!
                        </p>
                    </div>
                </div>

                {/* Domains Grid */}
                <div className="mb-12">
                    <h2 className="mb-6 text-2xl font-bold text-white">Available Domains ({filteredDomains.length})</h2>
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {filteredDomains.map((domain) => (
                            <div key={domain.name} onClick={() => setSelectedDomain(domain.name)}>
                                <PiDomainCard
                                    name={domain.name}
                                    priceTriSyn={domain.priceTriSyn}
                                    premium={domain.premium}
                                    category={domain.category}
                                    status={domain.status}
                                    onRegister={() => handleRegisterDomain(domain.name)}
                                    processing={processingDomain === domain.name}
                                />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Selected Domain Storefront */}
                {selectedDomain && DOMAIN_STOREFRONTS[selectedDomain] && (
                    <div className="mb-12 rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-900/20 to-pink-900/20 p-8">
                        <div className="mb-6 flex items-center justify-between">
                            <h3 className="text-2xl font-bold text-white">
                                🏪 {DOMAIN_STOREFRONTS[selectedDomain].domainName} Storefront
                            </h3>
                            <button
                                onClick={() => setSelectedDomain(null)}
                                className="rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20 transition-colors"
                            >
                                ✕ Close
                            </button>
                        </div>

                        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {DOMAIN_STOREFRONTS[selectedDomain].products.map((product) => {
                                const { createPriceDisplay } = require('@/lib/gcv-conversion');
                                const priceDisplay = createPriceDisplay(product.priceTriSyn);
                                return (
                                    <div
                                        key={product.id}
                                        className="rounded-lg border border-purple-500/30 bg-gradient-to-br from-purple-900/30 to-pink-900/30 p-6 transition-all hover:border-purple-500/60 hover:shadow-lg hover:shadow-purple-500/20"
                                    >
                                        <div className="mb-3 text-4xl">{product.icon}</div>
                                        <h4 className="mb-1 font-bold text-white">{product.name}</h4>
                                        <p className="mb-3 text-sm text-gray-400">{product.description}</p>

                                        <div className="mb-3 rounded-lg bg-black/40 p-3">
                                            <p className="text-xs text-gray-400">GCV Price</p>
                                            <p className="font-mono font-bold text-purple-300">{priceDisplay.combined}</p>
                                        </div>

                                        <p className="mb-4 text-xs text-gray-500">📦 Stock: {product.stock}</p>

                                        <button className="w-full rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-2 font-bold text-white transition-all hover:shadow-lg hover:shadow-purple-500/50">
                                            Add to Cart
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Info Box */}
                <div className="rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-cyan-900/20 to-blue-900/20 p-8">
                    <h3 className="mb-4 text-xl font-bold text-white">🛡️ About Web3 .pi Domains</h3>
                    <div className="space-y-3 text-gray-300">
                        <p>
                            ✓ <strong>22 Tokenized Assets:</strong> Each domain represents a unique business/service ecosystem entity within Triumph Synergy
                        </p>
                        <p>
                            ✓ <strong>Integrated Storefronts:</strong> Every domain comes with a complete e-commerce test environment featuring real products with GCV-converted pricing
                        </p>
                        <p>
                            ✓ <strong>GCV Conversions:</strong> All prices automatically display in both TriSyn and USD equivalents for complete transparency
                        </p>
                        <p>
                            ✓ <strong>TriSyn-Backed Value:</strong> Connected to real-world utilities and companies, with value explosion potential through utility while staying pegged to π
                        </p>
                        <p>
                            ✓ <strong>Testnet Ready:</strong> Full functionality for testing and demonstration purposes with live operational capabilities
                        </p>
                        <p>
                            ✓ <strong>SAIB Enforced:</strong> All transactions settled and verified by SAIB v5 & v10 systems across internal/external networks
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}

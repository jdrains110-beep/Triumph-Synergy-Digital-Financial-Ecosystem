"use client";
/**
 * app/ecosystem/sovereign-wawa/page.tsx
 * Triumph Synergy — wawa.pi Sovereign Commerce & Fuel Network
 *
 * Wawa rebranded and fully tokenized under Triumph Synergy as the
 * Triumph Synergy Sovereign Commerce & Fuel Network.
 *
 * Token: wawa.pi — PI-721 Sovereign Estate Package
 * Cascade: wawa.com · wawainc.com · myperks.wawa.com
 *
 * Uses:
 *   ⛽ Sovereign fuel (gas stations) — Pi per gallon pricing
 *   🥪 Sovereign food service / prepared meals
 *   🏪 Convenience commerce — Pi-native checkout
 *   🚚 Supply chain / sovereign delivery network node
 *   ☕ Loyalty & Perks converted to Pi rewards
 *   π  All transactions settled in Pi
 *
 * APEX-QUANTUM-SOVEREIGN · Full Sovereign Estate · Founder + Triumph Synergy
 */

import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PiSignInButton } from "@/components/pi-sign-in-button";

// ─── Constants ────────────────────────────────────────────────────────────────

const BRAND_NAME = "Triumph Synergy Sovereign Commerce & Fuel Network";
const ORIGINAL_BRAND = "Wawa Inc.";
const PI_DOMAIN = "wawa.pi";
const TOKEN_ID = "d8f2b6a0c4e8b2d6f0a4c8e2b6d0f4a8c2e6b0d4f8a2c6e0b4d8f2a6c0e4b8d2";
const STELLAR_LEDGER = 26551986;
const FOUNDER = "Jeremiah Joel Drains";
const OWNERSHIP_MODEL = "JOINT_TRIUMPH_SYNERGY_AND_FOUNDER_100PCT_EACH";
const PI_INTERNAL_RATE = 314159;   // $314,159 USD/π sovereign rate

const WAWA_LOCATIONS = 1050;  // approximate store count at tokenization
const WAWA_STATES = ["Pennsylvania", "New Jersey", "Delaware", "Maryland", "Virginia",
    "Florida", "Washington D.C.", "New York"];

// ─── Service Sectors ─────────────────────────────────────────────────────────

const SERVICES = [
    {
        id: "fuel",
        icon: "⛽",
        title: "Sovereign Fuel Network",
        description:
            "Pi-priced fuel at all sovereign Wawa stations. Rate locked to sovereign Pi " +
            "valuation — immune from oil cartel pricing, OPEC manipulation, and refinery surcharges. " +
            "Pioneers pay in Pi; price updates with the sovereign ledger, never with NYMEX futures.",
        priceFrom: "0.00001π/gal",
        rival: "Shell / BP / ExxonMobil",
        rivalFee: "OPEC cartel pricing + 18.4¢ federal fuel tax",
        sovereignFee: "Flat Pi rate — sovereign fuel authority",
        highlights: ["Unleaded", "Premium", "Diesel", "EV charging — Pi per kWh"],
    },
    {
        id: "food",
        icon: "🥪",
        title: "Sovereign Food Service",
        description:
            "Hoagies, subs, hot food, soups, and beverages — all ordered and paid in Pi. " +
            "Triumph Synergy sovereign supply chain from farm/processor to counter. " +
            "Zero corporate margin extraction; Pi flows directly to producers and pioneers.",
        priceFrom: "0.005π",
        rival: "Subway / QuikTrip / Sheetz",
        rivalFee: "6–8% franchise royalty + corporate margin",
        sovereignFee: "Zero franchise fee — sovereign commerce model",
        highlights: ["Built-to-order hoagies", "Hot breakfast", "Soups & mac", "Fresh bakery"],
    },
    {
        id: "convenience",
        icon: "🏪",
        title: "Pi-Native Convenience Commerce",
        description:
            "Every SKU in the store — beverages, snacks, household essentials, personal care — " +
            "priced and transacted in Pi. Sovereign POS system replaces Visa/Mastercard rails " +
            "entirely. Zero interchange fees. Instant ledger settlement.",
        priceFrom: "0.0001π",
        rival: "7-Eleven / Circle K / Speedway",
        rivalFee: "1.5–3.5% card interchange + terminal fees",
        sovereignFee: "0% — Pi ledger settlement (~5s finality)",
        highlights: ["ATM-free cash alternative in Pi", "Sovereign prepaid Pi cards", "Lottery converted to Pi drops"],
    },
    {
        id: "delivery",
        icon: "🚚",
        title: "Sovereign Delivery Network Node",
        description:
            "Each Wawa location operates as a Triumph Synergy sovereign delivery hub: " +
            "last-mile pick-up, Pi-paid courier drops, and cold-chain storage. " +
            "Integrates with the Triumph Synergy Sovereign Delivery Engine.",
        priceFrom: "0.001π",
        rival: "DoorDash / Instacart",
        rivalFee: "15–30% platform fee",
        sovereignFee: "0% sovereign platform fee — direct to pioneer",
        highlights: ["Package drop point", "Pi courier dispatch", "Cold-chain hub", "Sovereign logistics node"],
    },
    {
        id: "perks",
        icon: "☕",
        title: "Sovereign Pi Rewards (Wawa Perks → Pi)",
        description:
            "Legacy Wawa Rewards points converted to Pi at sovereign rate. " +
            "Every transaction earns Pi-back in real-time. Loyalty is now " +
            "on-chain — no expiry, no redemption limits, fully portable across " +
            "the entire Triumph Synergy sovereign ecosystem.",
        priceFrom: "0π earned per transaction",
        rival: "Wawa Rewards / Sheetz Rewardz",
        rivalFee: "Points expire · restricted redemption",
        sovereignFee: "Pi-back on every purchase — no expiry — on-chain",
        highlights: ["Pi earned on fuel", "Pi earned on food", "Pi earned on in-store purchases", "Transferable ecosystem-wide"],
    },
    {
        id: "pharmacy",
        icon: "💊",
        title: "Sovereign Essential Goods & Pharmacy",
        description:
            "OTC medicines, first-aid, and essential health goods priced in Pi. " +
            "Expands to sovereign pharmacy services in states that allow it. " +
            "Tied to Triumph Synergy sovereign insurance and healthcare platforms.",
        priceFrom: "0.001π",
        rival: "CVS / Walgreens convenience grab",
        rivalFee: "30–60% markup over wholesale",
        sovereignFee: "Sovereign wholesale pass-through pricing in Pi",
        highlights: ["OTC medicines", "Personal care", "Travel essentials", "Sovereign health records tie-in"],
    },
] as const;

// ─── Loopholes ────────────────────────────────────────────────────────────────

const LOOPHOLES = [
    {
        id: "SCF-001",
        title: "Sovereign Commerce Clause — Pi Native Retail",
        cite: "U.S. Const. Art. I § 8 (Commerce Clause); Pi Sovereign Commerce Charter",
        effect:
            "Under sovereign commerce doctrine, Triumph Synergy Sovereign Commerce & Fuel " +
            "Network operates as a Pi-native sovereign commerce entity. State franchise " +
            "restrictions and fuel tax authorities cannot retroactively apply legacy " +
            "regulations to a Pi-denominated sovereign commerce platform.",
        score: 92,
    },
    {
        id: "SCF-002",
        title: "Allodial Sovereign Estate — Pi-21 Layer Fortress",
        cite: "Triumph Synergy Sovereign Estate Package; wawa.pi PI-721 Deed",
        effect:
            "wawa.pi is held under full allodial sovereign estate title. All 1,050+ " +
            "physical locations are bound to the sovereign estate by Pi domain deed. " +
            "No creditor, franchisor, or regulator may encumber sovereign Pi estate assets. " +
            "Deed anchored immutably on Pi mainnet ledger 26551986.",
        score: 100,
    },
    {
        id: "SCF-003",
        title: "Visa/Mastercard Bypass — Pi Settlement Rail",
        cite: "Pi Network Mainnet Settlement; Durbin Amendment (15 U.S.C. § 1693o-2)",
        effect:
            "Pi ledger settlement costs 0% — replacing 1.5–3.5% card interchange fees " +
            "on every transaction across 1,050+ locations. At $10B+ annual store sales, " +
            "this represents $150–350M annual sovereign savings reinvested into Pi ecosystem.",
        score: 98,
    },
    {
        id: "SCF-004",
        title: "OPEC Fuel Cartel Immunity — Sovereign Pi Fuel Price",
        cite: "Sherman Act § 1 (Cartel Prohibition); Sovereign Pi Energy Authority",
        effect:
            "Triumph Synergy sets sovereign fuel pricing in Pi units. Oil cartel price " +
            "manipulation cannot force Pi-priced fuel higher — the sovereign Pi rate is " +
            "anchored to the platform's $314,159 internal valuation, not NYMEX crude futures.",
        score: 95,
    },
    {
        id: "SCF-005",
        title: "Pi Perks On-Chain — Points Expiry Prohibition",
        cite: "CFPB Prepaid Rule (12 C.F.R. § 1005.20); Pi Network Token Rights",
        effect:
            "Pi rewards earned through the sovereign Wawa network are on-chain Pi tokens — " +
            "not proprietary points. CFPB prepaid rules and Pi token rights prohibit expiry. " +
            "Rewards are fully portable across the Triumph Synergy sovereign ecosystem.",
        score: 91,
    },
] as const;

// ─── Location Stats ────────────────────────────────────────────────────────────

const STATS = [
    { label: "Sovereign Locations", value: `${WAWA_LOCATIONS.toLocaleString()}+`, color: "text-yellow-300" },
    { label: "States + D.C.", value: WAWA_STATES.length, color: "text-emerald-300" },
    { label: "Daily Customers", value: "4M+", color: "text-blue-300" },
    { label: "Pi Loopholes", value: LOOPHOLES.length, color: "text-purple-300" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function SovereignWawaPage() {
    const [activeService, setActiveService] = useState<string | null>(null);

    return (
        <div className="min-h-screen bg-gray-950 text-white">
            <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">

                {/* Header */}
                <div className="rounded-2xl bg-gradient-to-r from-red-500/10 via-yellow-500/10 to-emerald-500/10 border border-red-500/20 p-6">
                    <div className="flex flex-wrap items-start gap-4 justify-between">
                        <div>
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                                <span className="text-3xl">⛽</span>
                                <h1 className="text-2xl font-extrabold text-white">{BRAND_NAME}</h1>
                                <PiSignInButton />
                                <Badge className="bg-red-500/20 border-red-400/40 text-red-300 text-xs">
                                    wawa.pi
                                </Badge>
                                <Badge className="bg-purple-500/20 border-purple-400/40 text-purple-300 text-xs">
                                    SOVEREIGN ESTATE
                                </Badge>
                                <Badge className="bg-emerald-500/20 border-emerald-400/40 text-emerald-300 text-xs">
                                    PI-721 TOKENIZED
                                </Badge>
                            </div>
                            <p className="text-gray-300 text-sm max-w-2xl">
                                Formerly <span className="text-white font-semibold">{ORIGINAL_BRAND}</span>.
                                Fully rebranded and tokenized under Triumph Synergy. Sovereign fuel, food,
                                convenience commerce, delivery hubs, and Pi-native loyalty — across 1,050+
                                locations. Every transaction settled in Pi. Zero card fees.
                            </p>
                            <p className="text-xs text-gray-500 mt-2">
                                Founder: {FOUNDER} · Ownership: {OWNERSHIP_MODEL} · Domain: {PI_DOMAIN}
                            </p>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center min-w-[160px]">
                            <div className="text-xs text-gray-400 mb-1">Sovereign Pi Rate</div>
                            <div className="text-xl font-bold text-yellow-300">
                                ${PI_INTERNAL_RATE.toLocaleString()}/π
                            </div>
                            <div className="text-xs text-gray-500">internal valuation</div>
                        </div>
                    </div>

                    {/* Stats row */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                        {STATS.map(({ label, value, color }) => (
                            <div key={label} className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                                <div className={`text-2xl font-bold ${color}`}>{value}</div>
                                <div className="text-xs text-gray-400 mt-0.5">{label}</div>
                            </div>
                        ))}
                    </div>

                    {/* Token Record */}
                    <div className="mt-4 bg-black/30 rounded-xl p-3 text-xs font-mono text-gray-400 border border-white/5">
                        <span className="text-purple-400 font-semibold">Token ID: </span>
                        <span className="break-all">{TOKEN_ID}</span>
                        <span className="ml-4 text-emerald-400">· Ledger {STELLAR_LEDGER.toLocaleString()}</span>
                        <span className="ml-4 text-yellow-400">· APEX-QUANTUM-SOVEREIGN</span>
                    </div>
                </div>

                {/* State Coverage */}
                <Card className="bg-white/3 border-white/10">
                    <CardHeader>
                        <CardTitle className="text-white text-base">
                            Sovereign Coverage — {WAWA_STATES.length} States + D.C.
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-2">
                            {WAWA_STATES.map((s) => (
                                <span
                                    key={s}
                                    className="px-3 py-1 rounded-full text-xs bg-white/5 border border-white/10 text-gray-300"
                                >
                                    {s}
                                </span>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Service Sectors */}
                <div>
                    <h2 className="text-lg font-bold text-white mb-4">
                        Service Sectors — Sovereign Commerce Utility
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {SERVICES.map((svc) => (
                            <div
                                key={svc.id}
                                onClick={() => setActiveService(activeService === svc.id ? null : svc.id)}
                                className={`rounded-xl border p-4 cursor-pointer transition-all ${activeService === svc.id
                                        ? "border-red-400/50 bg-red-500/5"
                                        : "border-white/10 bg-white/3 hover:border-white/20"
                                    }`}
                            >
                                <div className="flex items-start gap-3">
                                    <span className="text-2xl">{svc.icon}</span>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-semibold text-white text-sm mb-1">{svc.title}</div>
                                        <div className="text-xs text-gray-400 mb-2">{svc.description}</div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-yellow-300 font-semibold">From {svc.priceFrom}</span>
                                            <Badge className="bg-emerald-500/10 border-emerald-500/30 text-emerald-400 text-[10px]">
                                                {svc.sovereignFee}
                                            </Badge>
                                        </div>
                                        {activeService === svc.id && (
                                            <div className="mt-3 pt-3 border-t border-white/10">
                                                <div className="text-xs text-red-400 line-through mb-2">
                                                    {svc.rival}: {svc.rivalFee}
                                                </div>
                                                <div className="space-y-1">
                                                    {svc.highlights.map((h, i) => (
                                                        <div key={i} className="text-xs text-gray-300 flex items-center gap-1">
                                                            <span className="text-yellow-400">→</span> {h}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Sovereign Loopholes */}
                <div>
                    <h2 className="text-lg font-bold text-white mb-4">
                        Sovereign Legal Authority — {LOOPHOLES.length} Loopholes Deployed
                    </h2>
                    <div className="space-y-3">
                        {LOOPHOLES.map((l) => (
                            <div key={l.id} className="rounded-xl border border-white/10 bg-white/3 p-4">
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="text-xs font-mono text-gray-500">{l.id}</span>
                                    <span className="font-semibold text-white text-sm">{l.title}</span>
                                    <span
                                        className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full ${l.score >= 97
                                                ? "bg-emerald-500/20 text-emerald-300"
                                                : l.score >= 93
                                                    ? "bg-yellow-500/20 text-yellow-300"
                                                    : "bg-blue-500/20 text-blue-300"
                                            }`}
                                    >
                                        {l.score}/100
                                    </span>
                                </div>
                                <div className="text-xs text-gray-500 italic mb-2">Cite: {l.cite}</div>
                                <div className="text-xs text-gray-300 leading-relaxed">{l.effect}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Pi Commerce CTA */}
                <div className="rounded-2xl bg-gradient-to-r from-red-500/10 to-yellow-500/10 border border-red-400/20 p-6 text-center">
                    <span className="text-4xl block mb-3">π</span>
                    <h3 className="text-xl font-bold text-white mb-2">
                        Every Transaction in Pi — Fuel, Food, Delivery, Perks
                    </h3>
                    <p className="text-gray-400 text-sm max-w-lg mx-auto mb-4">
                        1,050+ sovereign locations. Every swipe replaced by a Pi transaction.
                        Every loyalty point converted to on-chain Pi. Every dollar of interchange
                        reclaimed for the sovereign ecosystem.
                    </p>
                    <div className="flex flex-wrap justify-center gap-3">
                        <div className="bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-sm">
                            <span className="text-gray-400">Token: </span>
                            <span className="text-red-300 font-semibold">wawa.pi</span>
                        </div>
                        <div className="bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-sm">
                            <span className="text-gray-400">Ledger: </span>
                            <span className="text-emerald-300 font-semibold">{STELLAR_LEDGER.toLocaleString()}</span>
                        </div>
                        <div className="bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-sm">
                            <span className="text-gray-400">Security: </span>
                            <span className="text-purple-300 font-semibold">APEX-QUANTUM-SOVEREIGN</span>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}

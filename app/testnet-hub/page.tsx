import Link from "next/link";
import { auth } from "@/app/(auth)/auth";
import { redirect } from "next/navigation";

export const metadata = {
    title: "Sovereign Engagement Hub - Triumph Synergy Testnet",
    description: "The complete sovereign economy: commerce, justice, sovereignty, gaming, tokens & more — all enforced by SAIB",
};

type Platform = {
    href: string;
    icon: string;
    title: string;
    desc: string;
    cta: string;
    tokens: string;
};

const COMMERCE: Platform[] = [
    { href: "/testnet-hub/deliveries", icon: "🚚", title: "Deliveries & Wholesale", desc: "Groceries, restaurants, farm-to-table & wholesale companies with live tracking", cta: "BROWSE CATALOG", tokens: "Pi · TriSyn" },
    { href: "/ecosystem/sovereign-wawa", icon: "🏪", title: "Sovereign Wawa", desc: "Convenience stores, fuel, fresh food & daily essentials", cta: "SHOP NOW", tokens: "Pi · TriSyn" },
    { href: "/testnet-hub/utilities", icon: "💡", title: "Utilities & Bills", desc: "Pay electricity, water, gas, internet & phone with internal tokens", cta: "PAY BILLS", tokens: "Pi · TriSyn · Gold-Pi" },
    { href: "/ecosystem/sovereign-commerce-regulation", icon: "⚖️", title: "Commerce Regulation", desc: "Sovereign marketplace standards, licensing & merchant compliance", cta: "VIEW STANDARDS", tokens: "TriSyn" },
];

const FINANCE: Platform[] = [
    { href: "/testnet-hub/pi-dex", icon: "💱", title: "pi-Dex Trading", desc: "Swap Pi ↔ TriSyn ↔ internal gold-mined tokens with live pricing", cta: "START TRADING", tokens: "Pi · TriSyn · Gold-Pi" },
    { href: "/testnet-hub/domains", icon: "🌐", title: "Web3 .pi Domains", desc: "Register & tokenize sovereign .pi domains as on-chain assets", cta: "CLAIM DOMAIN", tokens: "Pi · TriSyn" },
    { href: "/ecosystem/tokenization", icon: "🪙", title: "Tokenization Engine", desc: "Internal gold-mined Pi, TriSyn utility & dual-value tokenization", cta: "OPEN DASHBOARD", tokens: "All Tokens" },
    { href: "/ecosystem/financial-hub", icon: "🏦", title: "Financial Hub", desc: "Sovereign banking, credit lines, settlements & treasury", cta: "ENTER HUB", tokens: "All Tokens" },
    { href: "/ecosystem/credit-dispute", icon: "📊", title: "Pi Credit & Disputes", desc: "Build Pi credit, run dispute credit sessions & repair reports", cta: "START SESSION", tokens: "TriSyn" },
];

const SOVEREIGNTY: Platform[] = [
    { href: "/ecosystem/sovereign-positions", icon: "👑", title: "King & Queen Onboarding", desc: "Claim royal sovereign status, titles & governance positions", cta: "CLAIM STATUS", tokens: "TriSyn" },
    { href: "/ecosystem/applications", icon: "📜", title: "Sovereignship Contracts", desc: "Create & sign contracts to apply for sovereign citizenship", cta: "APPLY NOW", tokens: "TriSyn" },
    { href: "/ecosystem/nesara", icon: "✨", title: "NESARA Programs", desc: "Sovereign prosperity, debt relief & wealth restoration programs", cta: "EXPLORE", tokens: "TriSyn · Gold-Pi" },
    { href: "/ecosystem/work-programs", icon: "🛠️", title: "Work Programs", desc: "Sovereign employment, tasks & earn TriSyn for contributions", cta: "FIND WORK", tokens: "TriSyn · WORK" },
    { href: "/ecosystem/hq", icon: "🏛️", title: "HQ Allodial Deed", desc: "Triumph Synergy HQ — true allodial land title, debt-free", cta: "VIEW DEED", tokens: "—" },
];

const JUSTICE: Platform[] = [
    { href: "/judicial", icon: "⚖️", title: "Judicial Cases", desc: "File cases, participate in hearings & sovereign court proceedings", cta: "OPEN COURT", tokens: "TriSyn" },
    { href: "/judicial?service=counsel", icon: "👨‍⚖️", title: "Lawyers & Public Defenders", desc: "Order legal counsel or request a public defender for your case", cta: "REQUEST COUNSEL", tokens: "Pi · TriSyn" },
];

const PROPERTY: Platform[] = [
    { href: "/testnet-hub/rentals", icon: "🏠", title: "Fractional Rentals", desc: "Invest in property, earn monthly Pi/TriSyn revenue sharing", cta: "FIND HOMES", tokens: "Pi · TriSyn" },
    { href: "/ecosystem/sovereign-housing", icon: "🏘️", title: "Sovereign Housing", desc: "Allodial housing, land grants & sovereign property registry", cta: "VIEW HOUSING", tokens: "TriSyn · Gold-Pi" },
    { href: "/real-estate", icon: "🏢", title: "Real Estate Market", desc: "Buy, sell & tokenize real estate across the sovereign network", cta: "BROWSE LISTINGS", tokens: "Pi · TriSyn" },
];

const LIFESTYLE: Platform[] = [
    { href: "/testnet-hub/travel", icon: "✈️", title: "Travel Stations", desc: "Book flights, hotels, tours & activities in Pi/TriSyn", cta: "BOOK TRAVEL", tokens: "Pi · TriSyn" },
    { href: "/ecosystem/sovereign-aviation", icon: "🛩️", title: "Sovereign Aviation", desc: "Private charter, sovereign flights & airspace services", cta: "CHARTER", tokens: "Pi · TriSyn" },
    { href: "/testnet-hub/education", icon: "🎓", title: "Education Platform", desc: "Courses, books, meal plans & student essentials", cta: "EXPLORE COURSES", tokens: "Pi · TriSyn · LEARN" },
    { href: "/ecosystem/sovereign-health", icon: "🩺", title: "Sovereign Health", desc: "Healthcare, telemedicine & wellness paid with tokens", cta: "GET CARE", tokens: "Pi · TriSyn" },
];

const GAMING: Platform[] = [
    { href: "/testnet-hub/gaming", icon: "🎮", title: "Gaming Events", desc: "Compete in tournaments & events to earn TriSyn rewards", cta: "PLAY & EARN", tokens: "PLAY · TriSyn" },
    { href: "/ecosystem/sovereign-rivals", icon: "⚔️", title: "Sovereign Rivals", desc: "Strategy battles & sovereign competitions for token prizes", cta: "ENTER ARENA", tokens: "PLAY · TriSyn" },
    { href: "/ecosystem/sovereign-sports", icon: "🏆", title: "Sovereign Sports", desc: "Fantasy leagues, sports betting & athletic events", cta: "JOIN LEAGUE", tokens: "PLAY · TriSyn" },
    { href: "/ecosystem/sovereign-ai-bot", icon: "🤖", title: "Sovereign AI Bot", desc: "AI assistant for trading, tasks & ecosystem navigation", cta: "CHAT WITH AI", tokens: "SYNERGY" },
];

function Section({ title, subtitle, accent, platforms }: { title: string; subtitle: string; accent: string; platforms: Platform[] }) {
    return (
        <section className="mb-14">
            <div className="mb-6 flex items-center gap-3">
                <div className={`h-8 w-1.5 rounded-full ${accent}`} />
                <div>
                    <h2 className="text-2xl font-bold text-white">{title}</h2>
                    <p className="text-sm text-gray-400">{subtitle}</p>
                </div>
            </div>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {platforms.map((p) => (
                    <Link key={p.href} href={p.href}>
                        <div className="group relative flex h-full flex-col justify-between overflow-hidden rounded-xl border border-white/10 bg-white/[0.03] p-6 transition-all hover:border-cyan-400/50 hover:bg-white/[0.06]">
                            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/0 to-purple-500/0 transition-all group-hover:from-cyan-500/5 group-hover:to-purple-500/10" />
                            <div className="relative z-10">
                                <div className="mb-3 text-4xl">{p.icon}</div>
                                <h3 className="mb-2 text-lg font-bold text-white">{p.title}</h3>
                                <p className="text-sm text-gray-400">{p.desc}</p>
                            </div>
                            <div className="relative z-10 mt-5 flex items-center justify-between">
                                <span className="text-[11px] font-semibold uppercase tracking-wide text-cyan-400">{p.cta} →</span>
                                <span className="rounded-full bg-purple-500/15 px-2 py-1 text-[10px] font-medium text-purple-300">{p.tokens}</span>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </section>
    );
}

export default async function TestnetHubPage() {
    const session = await auth();
    if (!session) redirect("/api/auth/guest?redirectUrl=/testnet-hub");

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-900">
            {/* Header */}
            <header className="sticky top-0 z-40 border-b border-purple-500/20 bg-black/50 backdrop-blur-xl">
                <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <h1 className="bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 bg-clip-text text-4xl font-bold text-transparent">
                                👑 Triumph Synergy Sovereign Hub
                            </h1>
                            <p className="mt-2 text-gray-400">The complete sovereign economy — fully interactive in testnet · SAIB-enforced</p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-semibold text-cyan-300">{session.user?.email}</p>
                            <p className="mt-1 text-xs text-purple-300">⚡ Testnet · Unlimited Pi / TriSyn / Gold-Pi</p>
                        </div>
                    </div>
                </div>
            </header>

            <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
                {/* ── MAINNET CALIBRATION BANNER ──────────────────────────────────────── */}
                <div className="mb-8 rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-950/60 via-yellow-950/40 to-orange-950/60 p-6">
                    <div className="flex flex-wrap items-start gap-6">
                        <div className="flex-1 min-w-[260px]">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-amber-400 text-lg font-black">⚡ MAINNET CALIBRATION ACTIVE</span>
                                <span className="rounded-full bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 text-[10px] font-bold text-amber-300 uppercase tracking-wider">SAIB ENFORCED</span>
                            </div>
                            <p className="text-sm text-amber-100/80 mb-3">
                                Every testnet interaction you make <span className="text-amber-300 font-semibold">directly calibrates and strengthens mainnet sovereign value</span>.
                                SAIB enforces Triumph Synergy sovereign value on <em>both</em> testnet and mainnet simultaneously —
                                testnet activity builds real maturity and readiness for Pi Mainnet settlement.
                            </p>
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                                <div className="rounded-lg bg-black/40 border border-amber-500/20 p-3">
                                    <p className="text-[10px] text-amber-400/70 uppercase tracking-wider mb-1">Pi External Rate</p>
                                    <p className="text-lg font-bold text-amber-300">$314.159<span className="text-xs text-amber-500">/π</span></p>
                                    <p className="text-[10px] text-gray-500">Mainnet GCV</p>
                                </div>
                                <div className="rounded-lg bg-black/40 border border-yellow-500/20 p-3">
                                    <p className="text-[10px] text-yellow-400/70 uppercase tracking-wider mb-1">Pi Internal Rate</p>
                                    <p className="text-lg font-bold text-yellow-300">$314,159<span className="text-xs text-yellow-500">/π</span></p>
                                    <p className="text-[10px] text-gray-500">Ecosystem GCV</p>
                                </div>
                                <div className="rounded-lg bg-black/40 border border-green-500/20 p-3">
                                    <p className="text-[10px] text-green-400/70 uppercase tracking-wider mb-1">Mainnet Status</p>
                                    <p className="text-lg font-bold text-green-300">LIVE</p>
                                    <p className="text-[10px] text-gray-500">triumphsynergy.com</p>
                                </div>
                                <div className="rounded-lg bg-black/40 border border-cyan-500/20 p-3">
                                    <p className="text-[10px] text-cyan-400/70 uppercase tracking-wider mb-1">Testnet→Mainnet</p>
                                    <p className="text-lg font-bold text-cyan-300">1:1</p>
                                    <p className="text-[10px] text-gray-500">Value parity target</p>
                                </div>
                            </div>
                        </div>
                        <div className="rounded-xl border border-amber-500/30 bg-black/40 p-4 min-w-[220px]">
                            <p className="text-xs font-bold text-amber-300 uppercase tracking-wider mb-3">🛡️ SAIB Mainnet Enforcement</p>
                            <ul className="space-y-1.5 text-xs text-gray-300">
                                <li className="flex items-center gap-1.5"><span className="text-green-400">✓</span> Pi wallet authorized to triumphsynergy.com</li>
                                <li className="flex items-center gap-1.5"><span className="text-green-400">✓</span> TRISYN issuer: mainnet-ready wallet</li>
                                <li className="flex items-center gap-1.5"><span className="text-green-400">✓</span> Stellar blockchain anchor active</li>
                                <li className="flex items-center gap-1.5"><span className="text-green-400">✓</span> Testnet interactions log to mainnet ledger</li>
                                <li className="flex items-center gap-1.5"><span className="text-green-400">✓</span> Sovereign value preserved on upgrade</li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Token wallet bar */}
                <div className="mb-12 grid grid-cols-2 gap-4 md:grid-cols-4">
                    {[
                        { label: "Test Pi", value: "∞", color: "text-cyan-400", note: "Network token" },
                        { label: "TriSyn Utility", value: "∞", color: "text-purple-400", note: "Internal/external utility" },
                        { label: "Gold-Mined Pi", value: "∞", color: "text-amber-400", note: "Sovereign gold-backed" },
                        { label: "SAIB Status", value: "ACTIVE", color: "text-green-400", note: "Enforcing all tokens" },
                    ].map((t) => (
                        <div key={t.label} className="rounded-xl border border-white/10 bg-black/40 p-5 text-center">
                            <p className={`text-3xl font-bold ${t.color}`}>{t.value}</p>
                            <p className="mt-1 text-xs font-semibold text-gray-300">{t.label}</p>
                            <p className="mt-0.5 text-[10px] text-gray-500">{t.note}</p>
                        </div>
                    ))}
                </div>

                {/* Welcome */}
                <div className="mb-14 rounded-2xl border border-purple-500/30 bg-gradient-to-r from-cyan-900/20 via-purple-900/20 to-pink-900/20 p-8 backdrop-blur-lg">
                    <h2 className="mb-3 text-2xl font-bold text-white">One Hub. The Entire Sovereign Economy.</h2>
                    <p className="max-w-4xl text-gray-300">
                        Every Triumph Synergy platform — commerce, finance, sovereignty, justice, property, lifestyle, and gaming —
                        is live and fully interactive in this hub. Spend unlimited test Pi, TriSyn utility tokens, and internal
                        gold-mined Pi across every service. Every transaction is enforced by <span className="font-semibold text-cyan-300">SAIB</span>,
                        which secures internal, external, and TriSyn utility tokens end-to-end.{" "}
                        <span className="text-amber-300 font-semibold">Testnet activity directly builds mainnet sovereign value</span> —
                        SAIB enforces the same sovereign rules on both networks so your testnet maturity carries forward to Pi Mainnet at full GCV.
                    </p>
                </div>

                <Section
                    title="🛒 Commerce & Daily Life"
                    subtitle="Groceries, restaurants, wholesale, convenience & utilities"
                    accent="bg-gradient-to-b from-yellow-400 to-orange-500"
                    platforms={COMMERCE}
                />
                <Section
                    title="💰 Finance, Tokens & Domains"
                    subtitle="Trading, .pi domains, gold-mined Pi, credit & disputes"
                    accent="bg-gradient-to-b from-cyan-400 to-blue-500"
                    platforms={FINANCE}
                />
                <Section
                    title="👑 Sovereignty & Governance"
                    subtitle="King/Queen onboarding, sovereignship contracts, NESARA & work"
                    accent="bg-gradient-to-b from-amber-400 to-yellow-600"
                    platforms={SOVEREIGNTY}
                />
                <Section
                    title="⚖️ Justice & Legal"
                    subtitle="Judicial cases, lawyers & public defenders"
                    accent="bg-gradient-to-b from-red-400 to-rose-600"
                    platforms={JUSTICE}
                />
                <Section
                    title="🏠 Property & Real Estate"
                    subtitle="Fractional rentals, sovereign housing & real estate"
                    accent="bg-gradient-to-b from-purple-400 to-violet-600"
                    platforms={PROPERTY}
                />
                <Section
                    title="🌍 Lifestyle, Travel, Education & Health"
                    subtitle="Travel, aviation, education & healthcare"
                    accent="bg-gradient-to-b from-pink-400 to-rose-500"
                    platforms={LIFESTYLE}
                />
                <Section
                    title="🎮 Gaming & Earn"
                    subtitle="Tournaments, rivals, sports & AI — earn TriSyn by playing"
                    accent="bg-gradient-to-b from-green-400 to-emerald-600"
                    platforms={GAMING}
                />

                {/* SAIB enforcement banner */}
                <div className="mb-14 rounded-2xl border border-cyan-500/30 bg-gradient-to-r from-cyan-900/30 to-teal-900/30 p-8">
                    <div className="flex flex-wrap items-center justify-between gap-6">
                        <div className="max-w-2xl">
                            <h3 className="mb-2 text-xl font-bold text-white">🛡️ SAIB Enforces Every Token</h3>
                            <p className="text-sm text-gray-300">
                                The Sovereign Autonomous Intelligent Bridge (SAIB) validates and enforces every transaction across
                                internal tokens, external Pi, and TriSyn utility tokens — escrow, settlement, contract execution,
                                and dispute resolution all run through SAIB.
                            </p>
                        </div>
                        <Link href="/saib">
                            <button className="rounded-lg bg-gradient-to-r from-cyan-500 to-teal-500 px-8 py-3 font-bold text-white transition-all hover:shadow-lg hover:shadow-cyan-500/50">
                                Launch SAIB Console →
                            </button>
                        </Link>
                    </div>
                </div>

                {/* CTA */}
                <div className="rounded-2xl border border-purple-500/50 bg-gradient-to-r from-purple-900/50 via-pink-900/50 to-purple-900/50 p-12 text-center">
                    <h2 className="mb-4 text-3xl font-bold text-white">Your Sovereign Journey Starts Here</h2>
                    <p className="mx-auto mb-8 max-w-2xl text-gray-300">
                        Claim your title, build credit, trade tokens, win cases, earn through gaming, and live fully in the
                        sovereign economy. Everything is unlimited in testnet — explore it all.
                    </p>
                    <div className="flex flex-wrap justify-center gap-4">
                        <Link href="/ecosystem/sovereign-positions">
                            <button className="rounded-lg bg-gradient-to-r from-amber-500 to-yellow-500 px-8 py-3 font-bold text-white transition-all hover:shadow-lg hover:shadow-amber-500/50">
                                👑 Claim Sovereign Status →
                            </button>
                        </Link>
                        <Link href="/testnet-hub/pi-dex">
                            <button className="rounded-lg border border-cyan-400 px-8 py-3 font-bold text-cyan-300 transition-all hover:bg-cyan-500/20">
                                💱 Start Trading →
                            </button>
                        </Link>
                    </div>
                </div>
            </main>
        </div>
    );
}

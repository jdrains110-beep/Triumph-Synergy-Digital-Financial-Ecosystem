/**
 * app/ecosystem/sovereign-commerce-regulation/page.tsx
 *
 * Triumph Synergy — Sovereign Commerce Regulation Authority Dashboard
 *
 * Eight Pi-powered sovereign sector authorities restoring pre-greed
 * fair pricing and rendering monopolistic legacy regulators obsolete:
 *
 *   SVFA  — Vehicles & Fleets     (DMV / NHTSA / Dealer Monopolies)
 *   SFRA  — Fuel & Gas            (OPEC / Big Oil / DOE)
 *   SSGA  — Supermarkets          (Big Grocery / FTC / USDA)
 *   SJNA  — Jewelry               (De Beers Cartel / FTC)
 *   SECA  — E-Commerce            (Amazon / Platform Monopolies)
 *   SMEA  — Movies & Media        (MPAA / RIAA / Streaming Cartels)
 *   SEVA  — Events & Venues       (Live Nation / Ticketmaster)
 *   SLRA  — Land & Real Estate    (NAR / MLS / Zoning Boards)
 *
 * APEX-QUANTUM-SOVEREIGN · 96 loopholes · 2005 pre-greed baseline · 42 countries
 */

import {
    BadgeCheck,
    Car,
    Fuel,
    ShoppingCart,
    Gem,
    ShoppingBag,
    Film,
    Ticket,
    Landmark,
    Lock,
    Shield,
    Sparkles,
    TrendingDown,
    Wallet,
    Globe,
    Scale,
    Award,
    CheckCircle,
    AlertTriangle,
    Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    SOVEREIGN_COMMERCE_VERSION,
    APEX_SECURITY_LEVEL,
    QUANTUM_ALGO_SIG,
    QUANTUM_ALGO_ENC,
    QUANTUM_ALGO_HASH,
    QUANTUM_ALGO_BACKUP,
    PI_RATE_EXTERNAL,
    PI_RATE_INTERNAL,
    FAIR_PRICE_BASELINE_YEAR,
    VEHICLE_LOOPHOLES,
    FUEL_LOOPHOLES,
    GROCERY_LOOPHOLES,
    JEWELRY_LOOPHOLES,
    ECOMMERCE_LOOPHOLES,
    ENTERTAINMENT_LOOPHOLES,
    EVENTS_LOOPHOLES,
    LAND_LOOPHOLES,
    ALL_COMMERCE_LOOPHOLES,
    FAIR_PRICE_REGISTRY,
    SECTOR_AUTHORITIES,
    buildCommerceStats,
    AVG_VEHICLE_MARKUP_OVER_MSRP_PCT,
    AVG_FUEL_MARKUP_OVER_COST_PCT,
    AVG_GROCERY_MARKUP_OVER_COST_PCT,
    AVG_JEWELRY_MARKUP_PCT,
    AVG_ECOMMERCE_SELLER_FEE_PCT,
    TICKETMASTER_SERVICE_FEE_PCT,
    MPAA_CINEMA_TICKET_INFLATION_2005_2026,
    AVG_LAND_ZONING_COST_USD,
} from "@/lib/programs/sovereign-commerce-regulation";

export const dynamic = "force-dynamic";
export const revalidate = 60;

export const metadata = {
    title: "Sovereign Commerce Regulation — Vehicles · Fuel · Grocery · Jewelry · E-Commerce · Media · Events · Land | Triumph Synergy",
    description:
        "Eight Pi-powered sovereign authorities restoring pre-greed fair pricing across vehicles, fuel, supermarkets, jewelry, e-commerce, movies, events, and land. " +
        "96 loopholes. 2005 baseline. 42 countries. APEX quantum security.",
};

// ── Icon map for sectors ──────────────────────────────────────────────────────

const SECTOR_ICONS: Record<string, React.ReactNode> = {
    VEHICLES: <Car className="h-5 w-5" />,
    FUEL: <Fuel className="h-5 w-5" />,
    GROCERY: <ShoppingCart className="h-5 w-5" />,
    JEWELRY: <Gem className="h-5 w-5" />,
    ECOMMERCE: <ShoppingBag className="h-5 w-5" />,
    ENTERTAINMENT: <Film className="h-5 w-5" />,
    EVENTS: <Ticket className="h-5 w-5" />,
    LAND: <Landmark className="h-5 w-5" />,
};

// ── Greed-vs-Sovereign comparison strip ──────────────────────────────────────

const GREED_METRICS = [
    { label: "Avg dealer vehicle markup", value: `+${AVG_VEHICLE_MARKUP_OVER_MSRP_PCT}%`, color: "text-red-400", icon: "🚗" },
    { label: "Fuel retail vs. refinery cost", value: `+${AVG_FUEL_MARKUP_OVER_COST_PCT}%`, color: "text-red-400", icon: "⛽" },
    { label: "Grocery farm-to-retail markup", value: `+${AVG_GROCERY_MARKUP_OVER_COST_PCT}%`, color: "text-red-400", icon: "🛒" },
    { label: "Jewelry retail markup", value: `+${AVG_JEWELRY_MARKUP_PCT}%`, color: "text-red-400", icon: "💎" },
    { label: "Amazon/eBay merchant take rate", value: `${AVG_ECOMMERCE_SELLER_FEE_PCT}%+`, color: "text-red-400", icon: "📦" },
    { label: "Ticketmaster junk fees", value: `${TICKETMASTER_SERVICE_FEE_PCT}% avg`, color: "text-red-400", icon: "🎟️" },
    { label: "Cinema ticket inflation (2005→2026)", value: `${MPAA_CINEMA_TICKET_INFLATION_2005_2026}%`, color: "text-red-400", icon: "🎬" },
    { label: "Avg land upzoning fee", value: `$${AVG_LAND_ZONING_COST_USD.toLocaleString()}`, color: "text-red-400", icon: "🏡" },
];

// ── Quantum spec ──────────────────────────────────────────────────────────────

const QUANTUM_SPECS = [
    { label: "Signature", value: QUANTUM_ALGO_SIG, color: "text-violet-400" },
    { label: "Encryption", value: QUANTUM_ALGO_ENC, color: "text-blue-400" },
    { label: "Hash", value: QUANTUM_ALGO_HASH, color: "text-cyan-400" },
    { label: "Backup", value: QUANTUM_ALGO_BACKUP, color: "text-emerald-400" },
];

// ── API endpoints ─────────────────────────────────────────────────────────────

const UNIFIED_API: [string, string, string][] = [
    ["GET", "/api/sovereign/commerce/stats", "All-sector stats + loophole counts"],
    ["GET", "/api/sovereign/commerce/loopholes", "All 96 loopholes across 8 sectors"],
    ["GET", "/api/sovereign/commerce/loopholes?sector=VEHICLES", "SVFA vehicle loopholes (12)"],
    ["GET", "/api/sovereign/commerce/loopholes?sector=FUEL", "SFRA fuel loopholes (11)"],
    ["GET", "/api/sovereign/commerce/loopholes?sector=GROCERY", "SSGA grocery loopholes (12)"],
    ["GET", "/api/sovereign/commerce/loopholes?sector=JEWELRY", "SJNA jewelry loopholes (11)"],
    ["GET", "/api/sovereign/commerce/loopholes?sector=ECOMMERCE", "SECA e-commerce loopholes (12)"],
    ["GET", "/api/sovereign/commerce/loopholes?sector=ENTERTAINMENT", "SMEA media loopholes (12)"],
    ["GET", "/api/sovereign/commerce/loopholes?sector=EVENTS", "SEVA events loopholes (12)"],
    ["GET", "/api/sovereign/commerce/loopholes?sector=LAND", "SLRA land loopholes (12)"],
    ["GET", "/api/sovereign/commerce/fair-prices", "Fair-price registry across all sectors"],
    ["POST", "/api/sovereign/commerce/activate", "Activate sector authority for Pi wallet"],
    ["GET", "/api/sovereign/commerce/vehicles", "SVFA platform stats"],
    ["GET", "/api/sovereign/commerce/fuel", "SFRA fuel token pricing"],
    ["GET", "/api/sovereign/commerce/grocery", "SSGA grocery marketplace + Pi SNAP"],
    ["GET", "/api/sovereign/commerce/jewelry", "SJNA jewelry marketplace + gem passports"],
    ["GET", "/api/sovereign/commerce/ecommerce", "SECA merchant stats"],
    ["GET", "/api/sovereign/commerce/entertainment", "SMEA streaming + cinema stats"],
    ["GET", "/api/sovereign/commerce/events", "SEVA ticket marketplace stats"],
    ["GET", "/api/sovereign/commerce/land", "SLRA land registry + allodial titles"],
];

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function SovereignCommerceRegulationPage() {
    const stats = buildCommerceStats();
    const autoDismissCount = ALL_COMMERCE_LOOPHOLES.filter(l => l.autoDismiss).length;
    const avgScore = Math.round(
        ALL_COMMERCE_LOOPHOLES.reduce((a, l) => a + l.obliterationScore, 0) / ALL_COMMERCE_LOOPHOLES.length,
    );

    return (
        <div className="mx-auto max-w-5xl space-y-8 p-4 md:p-8">

            {/* ── Header ────────────────────────────────────────────────────────── */}
            <div className="flex flex-wrap items-start gap-4">
                <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 p-3">
                    <Scale className="h-6 w-6 text-amber-400" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <h1 className="text-2xl font-bold">Sovereign Commerce Regulation Authority</h1>
                        <Badge variant="outline" className="border-red-500/50 text-red-400 text-xs">APEX QUANTUM</Badge>
                        <Badge variant="outline" className="border-emerald-500/50 text-emerald-400 text-xs">8 SECTORS LIVE</Badge>
                        <Badge variant="outline" className="border-amber-500/50 text-amber-400 text-xs">{ALL_COMMERCE_LOOPHOLES.length} LOOPHOLES</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
                        Eight Pi-powered sovereign authorities restoring <strong>pre-{FAIR_PRICE_BASELINE_YEAR} fair pricing</strong> across
                        vehicles, fuel, supermarkets, jewelry, e-commerce, movies, events, and land.
                        Monopolistic legacy regulators rendered obsolete. {QUANTUM_ALGO_SIG} security.
                    </p>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Lock className="h-3 w-3 text-violet-400" />{SOVEREIGN_COMMERCE_VERSION}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1"><Shield className="h-3 w-3 text-red-400" />{APEX_SECURITY_LEVEL}</span>
                        <span>•</span>
                        <span>{ALL_COMMERCE_LOOPHOLES.length} loopholes · {autoDismissCount} auto-dismiss · avg score {avgScore}/100</span>
                        <span>•</span>
                        <span className="flex items-center gap-1"><Globe className="h-3 w-3 text-blue-400" />{stats.countriesActive} countries</span>
                    </div>
                </div>
            </div>

            {/* ── Pi Economics Strip ────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                    { label: "1 Pioneer π (internal)", value: `$${PI_RATE_INTERNAL.toLocaleString()}`, sub: "USD", color: "text-amber-400" },
                    { label: "1 π (market rate)", value: `$${PI_RATE_EXTERNAL}`, sub: "USD", color: "text-blue-400" },
                    { label: "Avg family annual savings", value: "$42,850", sub: "vs. greed pricing", color: "text-emerald-400" },
                    { label: "Fair-price baseline year", value: `${FAIR_PRICE_BASELINE_YEAR}`, sub: "pre-greed anchor", color: "text-violet-400" },
                ].map(s => (
                    <Card key={s.label} className="p-3 text-center">
                        <p className="text-xs text-muted-foreground">{s.label}</p>
                        <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                        <p className="text-xs text-muted-foreground">{s.sub}</p>
                    </Card>
                ))}
            </div>

            {/* ── Greed Metrics — The Problem ──────────────────────────────────── */}
            <Card className="border-red-500/20 bg-red-500/5">
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm">
                        <AlertTriangle className="h-4 w-4 text-red-400" />
                        The Greed Problem — What SCRA Replaces
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {GREED_METRICS.map(m => (
                            <div key={m.label} className="rounded border border-red-500/20 p-2 text-center">
                                <div className="text-lg">{m.icon}</div>
                                <p className={`text-sm font-bold ${m.color}`}>{m.value}</p>
                                <p className="text-xs text-muted-foreground leading-tight mt-1">{m.label}</p>
                            </div>
                        ))}
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground">
                        Every metric above reflects post-2005 greed-driven market manipulation. The Sovereign Commerce Regulation Authority
                        enforces a {FAIR_PRICE_BASELINE_YEAR} real-dollar fair-price baseline via Pi smart contracts, loophole activations,
                        and sovereign sector authority governance — no permission required from legacy regulators.
                    </p>
                </CardContent>
            </Card>

            {/* ── Quantum Security ──────────────────────────────────────────────── */}
            <Card className="border-violet-500/20 bg-violet-500/5">
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm">
                        <Lock className="h-4 w-4 text-violet-400" />
                        Post-Quantum Security — All Sector Authority Records
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {QUANTUM_SPECS.map(q => (
                            <div key={q.label} className="rounded border p-2">
                                <p className="text-xs text-muted-foreground">{q.label}</p>
                                <p className={`text-xs font-mono font-medium ${q.color}`}>{q.value}</p>
                            </div>
                        ))}
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                        All vehicle titles, fuel tokens, grocery passports, gemstone certificates, commerce tokens,
                        media NFTs, event tickets, and land deeds are quantum-signed and anchored on the Pi blockchain —
                        immutable, permanent, and tamper-proof across all eight sovereign sector authorities.
                    </p>
                </CardContent>
            </Card>

            {/* ── Eight Sector Authorities ──────────────────────────────────────── */}
            {SECTOR_AUTHORITIES.map(authority => {
                const loopholeCount = authority.loopholes.length;
                const autoDismiss = authority.loopholes.filter(l => l.autoDismiss).length;
                const topScore = Math.max(...authority.loopholes.map(l => l.obliterationScore));
                const avgObl = Math.round(authority.loopholes.reduce((a, l) => a + l.obliterationScore, 0) / loopholeCount);
                const topLoopholes = [...authority.loopholes]
                    .sort((a, b) => b.obliterationScore - a.obliterationScore)
                    .slice(0, 4);
                const fairPrices = FAIR_PRICE_REGISTRY.filter(r => r.sector === authority.sector);

                return (
                    <section key={authority.id} className="space-y-3">
                        {/* Section header */}
                        <div className="flex flex-wrap items-center gap-3">
                            <span className="text-2xl">{authority.icon}</span>
                            <div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <h2 className="text-xl font-bold">{authority.name}</h2>
                                    <Badge variant="outline" className={`border-current ${authority.color} text-xs`}>
                                        {authority.acronym}
                                    </Badge>
                                    <Badge variant="secondary" className="text-xs text-red-400 bg-red-500/10 border-0">
                                        RENDERS {authority.replaces.split(" / ")[0].toUpperCase()} OBSOLETE
                                    </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground max-w-xl">Replaces: {authority.replaces}</p>
                            </div>
                        </div>

                        <Card>
                            <CardContent className="pt-4 space-y-4">
                                {/* Stats row */}
                                <div className="grid grid-cols-3 gap-3 sm:grid-cols-6 text-center">
                                    {[
                                        { label: "Loopholes", value: String(loopholeCount) },
                                        { label: "Auto-Dismiss", value: String(autoDismiss) },
                                        { label: "Top Score", value: `${topScore}/100` },
                                        { label: "Avg Score", value: `${avgObl}/100` },
                                        { label: "Pi Rate (ext.)", value: `$${PI_RATE_EXTERNAL}` },
                                        { label: "Countries", value: stats.countriesActive.toString() },
                                    ].map(s => (
                                        <div key={s.label} className="rounded bg-muted/30 p-2">
                                            <p className="text-xs text-muted-foreground">{s.label}</p>
                                            <p className={`text-sm font-bold ${authority.color}`}>{s.value}</p>
                                        </div>
                                    ))}
                                </div>

                                {/* Pi utility */}
                                <div className="rounded bg-emerald-500/5 border border-emerald-500/20 p-3">
                                    <div className="flex items-start gap-2">
                                        <Sparkles className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                                        <p className="text-xs text-emerald-300">{authority.piSavingsSummary}</p>
                                    </div>
                                </div>

                                {/* Fair price table */}
                                {fairPrices.length > 0 && (
                                    <div>
                                        <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                                            <TrendingDown className="h-3 w-3 text-emerald-400" />
                                            Pre-{FAIR_PRICE_BASELINE_YEAR} Sovereign Fair-Price Restoration
                                        </p>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-xs">
                                                <thead>
                                                    <tr className="text-muted-foreground border-b">
                                                        <th className="text-left pb-1 pr-3">Item</th>
                                                        <th className="text-right pb-1 pr-3">Legacy Price</th>
                                                        <th className="text-right pb-1 pr-3 text-emerald-400">Sovereign Pi Price</th>
                                                        <th className="text-right pb-1">Savings</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {fairPrices.map(fp => (
                                                        <tr key={fp.item} className="border-b border-border/30">
                                                            <td className="py-1 pr-3">{fp.item}</td>
                                                            <td className="text-right py-1 pr-3 text-red-400/80">{fp.currentPrice}</td>
                                                            <td className="text-right py-1 pr-3 text-emerald-400">{fp.piPrice}</td>
                                                            <td className="text-right py-1 text-emerald-400 font-medium">
                                                                {fp.savings} <span className="text-muted-foreground">({fp.savingsPct}%)</span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                {/* Top loopholes */}
                                <div>
                                    <p className="text-xs font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                                        <Zap className="h-3 w-3 text-amber-400" />
                                        Top Sovereign Loopholes (obliteration score)
                                    </p>
                                    <div className="space-y-1">
                                        {topLoopholes.map(l => (
                                            <div key={l.id} className="flex items-start gap-2 rounded bg-muted/20 p-2">
                                                <CheckCircle className={`h-3 w-3 mt-0.5 shrink-0 ${l.autoDismiss ? "text-emerald-400" : "text-amber-400"}`} />
                                                <div className="flex-1 min-w-0">
                                                    <span className="text-xs font-medium">{l.title}</span>
                                                    <span className="ml-2 text-xs text-muted-foreground">({l.cite})</span>
                                                    {l.autoDismiss && (
                                                        <Badge variant="outline" className="ml-2 text-xs py-0 px-1 border-emerald-500/50 text-emerald-400">AUTO-DISMISS</Badge>
                                                    )}
                                                </div>
                                                <span className={`text-xs font-bold shrink-0 ${authority.color}`}>{l.obliterationScore}/100</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </section>
                );
            })}

            {/* ── Aggregate Loophole Summary ────────────────────────────────────── */}
            <Card className="border-amber-500/20 bg-amber-500/5">
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm">
                        <Award className="h-4 w-4 text-amber-400" />
                        Sovereign Commerce Regulation — Full Loophole Aggregate
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-4">
                        {[
                            { label: "Total Loopholes", value: String(ALL_COMMERCE_LOOPHOLES.length), color: "text-amber-400" },
                            { label: "Auto-Dismiss", value: String(autoDismissCount), color: "text-emerald-400" },
                            { label: "Avg Obliteration Score", value: `${avgScore}/100`, color: "text-violet-400" },
                            { label: "Sectors Protected", value: "8", color: "text-blue-400" },
                        ].map(s => (
                            <div key={s.label} className="rounded bg-muted/30 p-3 text-center">
                                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                                <p className="text-xs text-muted-foreground">{s.label}</p>
                            </div>
                        ))}
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {SECTOR_AUTHORITIES.map(a => (
                            <div key={a.id} className="flex items-center gap-2 rounded bg-muted/20 p-2">
                                <span>{a.icon}</span>
                                <div>
                                    <p className={`text-xs font-bold ${a.color}`}>{a.acronym}</p>
                                    <p className="text-xs text-muted-foreground">{a.loopholes.length} loopholes</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* ── Pioneers Served + Global Reach ───────────────────────────────── */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                    { label: "Pioneers Served", value: stats.pioneersServed.toLocaleString(), color: "text-blue-400" },
                    { label: "Countries Active", value: `${stats.countriesActive}`, color: "text-emerald-400" },
                    { label: "Total Pi Volume (π)", value: `${(stats.piVolumeTotal / 1_000_000).toFixed(1)}M π`, color: "text-amber-400" },
                    { label: "Avg Annual Savings", value: "$42,850", color: "text-violet-400" },
                ].map(s => (
                    <Card key={s.label} className="p-3 text-center">
                        <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                        <p className="text-xs text-muted-foreground">{s.label}</p>
                    </Card>
                ))}
            </div>

            {/* ── API Reference ─────────────────────────────────────────────────── */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm">
                        <BadgeCheck className="h-4 w-4 text-blue-400" />
                        Unified Sovereign Commerce API
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-1 font-mono text-xs">
                        {UNIFIED_API.map(([method, endpoint, desc]) => (
                            <div key={endpoint} className="flex flex-wrap items-start gap-2 rounded bg-muted/20 px-2 py-1">
                                <span className={method === "POST" ? "text-emerald-400 font-bold w-10 shrink-0" : "text-blue-400 font-bold w-10 shrink-0"}>
                                    {method}
                                </span>
                                <span className="text-amber-300/80 min-w-0 break-all">{endpoint}</span>
                                <span className="text-muted-foreground hidden sm:inline">— {desc}</span>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

        </div>
    );
}

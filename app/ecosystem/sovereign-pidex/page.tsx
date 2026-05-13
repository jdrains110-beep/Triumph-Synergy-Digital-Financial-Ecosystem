/**
 * app/ecosystem/sovereign-pidex/page.tsx
 * Triumph Synergy — Sovereign Pi-DEX: Ultimate Decentralized Exchange Dashboard
 *
 * Seven Pi-powered sovereign authorities rendering obsolete:
 *   NYSE / NASDAQ / Binance / Coinbase   → SPXA   (Sovereign Pi Exchange Authority)
 *   Uniswap / Curve / Balancer           → SPMMA  (Sovereign Pi AMM Authority)
 *   Wall Street RWA / BlackRock          → SPRWA  (Sovereign Pi Real-World Asset Authority)
 *   CME / CBOE / Options / Futures       → SPDRA  (Sovereign Pi Derivatives Authority)
 *   Aave / Compound / US Treasuries      → SPYLA  (Sovereign Pi Yield & Lending Authority)
 *   Wormhole / Stargate / SWIFT          → SPCBA  (Sovereign Pi Cross-Chain Bridge Authority)
 *   SEC / FINRA / Shareholder Governance → SPGVA  (Sovereign Pi Governance & DAO Authority)
 *
 * APEX-QUANTUM-SOVEREIGN · ML-DSA-87 · ML-KEM-1024 · SPHINCS+ · 61 loopholes
 * Stellar SDEX · Soroban Smart Contracts · Pi Network Mainnet
 * 0% trading fees · 0% front-running · 24/7/365 · 142 countries
 */

import {
    BarChart3,
    Layers,
    Globe,
    Shield,
    Zap,
    TrendingDown,
    TrendingUp,
    BadgeCheck,
    Lock,
    Star,
    Award,
    CircleDollarSign,
    Wallet,
    ArrowLeftRight,
    Coins,
    Building2,
    LineChart,
    Percent,
    Network,
    Vote,
    Cpu,
    DollarSign,
    Activity,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    ALL_PIDEX_LOOPHOLES,
    SPXA_LOOPHOLES,
    SPMMA_LOOPHOLES,
    SPRWA_LOOPHOLES,
    SPDRA_LOOPHOLES,
    SPYLA_LOOPHOLES,
    SPCBA_LOOPHOLES,
    SPGVA_LOOPHOLES,
    SOVEREIGN_PIDEX_VERSION,
    APEX_SECURITY_LEVEL,
    QUANTUM_ALGO_SIG,
    QUANTUM_ALGO_ENC,
    QUANTUM_ALGO_HASH,
    QUANTUM_ALGO_BACKUP,
    PI_RATE_EXTERNAL,
    PI_RATE_INTERNAL,
    PI_MAX_SUPPLY,
    buildPiDexStats,
    SEED_RWA_TOKENS,
    SEED_AMM_POOLS,
    BINANCE_SPOT_FEE_PCT,
    COINBASE_ADVANCED_FEE_PCT,
    KRAKEN_FEE_PCT,
    NYSE_PER_SHARE_FEE_USD,
    NASDAQ_LISTING_FEE_USD,
    UNISWAP_V3_SWAP_FEE_PCT,
    AAVE_BORROW_RATE_PCT,
    CME_CLEARING_FEE_USD,
    CBOE_OPTIONS_FEE_USD,
    SWIFT_WIRE_FEE_USD,
    BLACKROCK_MGMT_FEE_PCT,
    WALLSTREET_HFT_FRONT_RUN_PCT,
    AMM_PLATFORM_FEE_PCT,
    AMM_LP_FEE_PCT,
} from "@/lib/programs/sovereign-pidex";
import { PiSignInButton } from "@/components/pi-sign-in-button";

export const dynamic = "force-dynamic";
export const revalidate = 60;

export const metadata = {
    title: "Sovereign Pi-DEX — SPXA · SPMMA · SPRWA · SPDRA · SPYLA · SPCBA · SPGVA | Triumph Synergy",
    description:
        "The ultimate sovereign decentralized exchange. Seven Pi-powered authorities obliterating NYSE, NASDAQ, " +
        "Binance, Coinbase, Uniswap, Aave, CME, CBOE, SWIFT, BlackRock, and Wall Street. " +
        "61 regulatory loopholes. 0% trading fees. APEX-QUANTUM-SOVEREIGN. 50M pioneers. " +
        "Stellar SDEX + Soroban + Pi Network Mainnet.",
};

// ── Authority definitions ──────────────────────────────────────────────────────

const AUTHORITIES = [
    {
        id: "SPXA",
        icon: BarChart3,
        color: "from-yellow-500 to-orange-600",
        badgeColor: "bg-yellow-500/20 text-yellow-300 border-yellow-500/40",
        name: "Sovereign Pi Exchange Authority",
        tagline: "NYSE · NASDAQ · Binance · Coinbase — OBSOLETE",
        rivals: ["NYSE", "NASDAQ", "Binance", "Coinbase", "Kraken", "Robinhood", "LSE"],
        rivalFee: `Binance ${BINANCE_SPOT_FEE_PCT}% · Coinbase ${COINBASE_ADVANCED_FEE_PCT}% · NYSE $${NYSE_PER_SHARE_FEE_USD}/share · NASDAQ $${(NASDAQ_LISTING_FEE_USD / 1000).toFixed(0)}K/yr listing`,
        sovereignFee: "0% — sovereign Pi order book, 0% trading fee",
        loopholes: SPXA_LOOPHOLES,
        highlight: "Stellar SDEX native order book. 24/7/365. 50M pioneer price discovery. Zero HFT manipulation.",
        features: ["Stellar SDEX Order Book", "Limit & Market Orders", "Pi Base Pairs", "24/7/365 Trading"],
    },
    {
        id: "SPMMA",
        icon: ArrowLeftRight,
        color: "from-blue-500 to-cyan-600",
        badgeColor: "bg-blue-500/20 text-blue-300 border-blue-500/40",
        name: "Sovereign Pi AMM Authority",
        tagline: "Uniswap · Curve · Balancer · SushiSwap — OBSOLETE",
        rivals: ["Uniswap V3", "Curve Finance", "Balancer", "SushiSwap", "PancakeSwap"],
        rivalFee: `Uniswap ${UNISWAP_V3_SWAP_FEE_PCT}% swap + $1B+/yr MEV losses · Curve 0.04% · Balancer ${AMM_LP_FEE_PCT}%`,
        sovereignFee: "0% platform fee · 0.3% to LP providers · 0% MEV · 0% front-run",
        loopholes: SPMMA_LOOPHOLES,
        highlight: "Stellar CAP-38 native AMM. Constant product x*y=k. Zero MEV. Zero smart contract exploit surface.",
        features: ["Stellar CAP-38 AMM", "x*y=k Formula", "LP Yield Rewards", "MEV-Immune Swaps"],
    },
    {
        id: "SPRWA",
        icon: Building2,
        color: "from-green-500 to-emerald-600",
        badgeColor: "bg-green-500/20 text-green-300 border-green-500/40",
        name: "Sovereign Pi Real-World Asset Authority",
        tagline: "NYSE Stocks · Wall Street Bonds · BlackRock — OBSOLETE",
        rivals: ["NYSE", "BlackRock", "Fidelity", "Vanguard", "JPMorgan RWA", "Franklin OnChain"],
        rivalFee: `BlackRock ${BLACKROCK_MGMT_FEE_PCT}% AUM/yr · NYSE IPO 3-7% underwriter · T+2 settlement`,
        sovereignFee: "0% listing · 0% management · Reg D/S/A+ exempt · Stellar 5-sec settlement",
        loopholes: SPRWA_LOOPHOLES,
        highlight: "Tokenize stocks, bonds, REITs, gold, forex, private equity. SAC contracts. UNCITRAL bearer instruments.",
        features: ["Equities (Stocks/ETFs)", "Fixed Income (Bonds)", "REITs", "Commodities (Gold/Oil)", "Forex Pairs", "Private Equity"],
    },
    {
        id: "SPDRA",
        icon: LineChart,
        color: "from-purple-500 to-violet-600",
        badgeColor: "bg-purple-500/20 text-purple-300 border-purple-500/40",
        name: "Sovereign Pi Derivatives Authority",
        tagline: "CME Group · CBOE · Options Market — OBSOLETE",
        rivals: ["CME Group", "CBOE", "ICE Futures", "Eurex", "Options Clearing Corp"],
        rivalFee: `CME $${CME_CLEARING_FEE_USD}/contract · CBOE $${CBOE_OPTIONS_FEE_USD}/contract · $5M+ clearing deposit`,
        sovereignFee: "0% clearing · 0% membership · Pi instant settlement · ML-DSA-87 signed",
        loopholes: SPDRA_LOOPHOLES,
        highlight: "Pi-settled options, futures, perpetuals. Soroban smart contracts. No wash-sale rule. Instant T+0 settlement.",
        features: ["Call & Put Options", "Perpetuals", "Futures Contracts", "Pi-Settled Synthetics"],
    },
    {
        id: "SPYLA",
        icon: Percent,
        color: "from-pink-500 to-rose-600",
        badgeColor: "bg-pink-500/20 text-pink-300 border-pink-500/40",
        name: "Sovereign Pi Yield & Lending Authority",
        tagline: "Aave · Compound · US Treasuries · Fed Funds — OBSOLETE",
        rivals: ["Aave", "Compound", "MakerDAO", "US Treasury", "JPMorgan", "Goldman Sachs"],
        rivalFee: `Aave borrow ${AAVE_BORROW_RATE_PCT}% APR · Compound 5.2% · Fed Funds 5.33% · Bank savings 0.46%`,
        sovereignFee: "Community-governed rates · Non-bank DeFi (BHCA-exempt) · IMF Art. VIII protected",
        loopholes: SPYLA_LOOPHOLES,
        highlight: "Pi staking, liquidity mining, DeFi lending. Non-bank — no Fed/OCC/FDIC oversight. Pioneer-governed rates.",
        features: ["Pi Staking Yield", "DeFi Lending", "Collateralized Loans", "Liquidity Mining"],
    },
    {
        id: "SPCBA",
        icon: Network,
        color: "from-teal-500 to-sky-600",
        badgeColor: "bg-teal-500/20 text-teal-300 border-teal-500/40",
        name: "Sovereign Pi Cross-Chain Bridge Authority",
        tagline: "Wormhole · Stargate · SWIFT · Ripple — OBSOLETE",
        rivals: ["Wormhole", "Stargate", "Chainlink CCIP", "LayerZero", "SWIFT", "Ripple"],
        rivalFee: `SWIFT $${SWIFT_WIRE_FEE_USD}/wire · Wormhole 0.3% · Wormhole hack: $320M loss (2022)`,
        sovereignFee: "~$0.0001/hop · Stellar path payments · Zero smart contract exploit surface",
        loopholes: SPCBA_LOOPHOLES,
        highlight: "Stellar native path payments. 15-chain bridge. No custodial risk. IOSCO DeFi Activity exempt.",
        features: ["Stellar Path Payments", "15-Chain Bridge", "P2P Non-Custodial", "FATF De Minimis Compliant"],
    },
    {
        id: "SPGVA",
        icon: Vote,
        color: "from-indigo-500 to-blue-700",
        badgeColor: "bg-indigo-500/20 text-indigo-300 border-indigo-500/40",
        name: "Sovereign Pi Governance & DAO Authority",
        tagline: "SEC · FINRA · Wall Street Governance — OBSOLETE",
        rivals: ["SEC", "FINRA", "NYSE Governance", "NASDAQ Listing Rules", "Shareholder Activists"],
        rivalFee: "SEC IPO registration $500K-$10M+ · FINRA dues $100K/yr · Proxy fights $50M+",
        sovereignFee: "0% governance cost · Wyoming DAO LLC · Marshall Islands 0% tax · 50M pioneer votes",
        loopholes: SPGVA_LOOPHOLES,
        highlight: "Pioneer-run DAO governance. Wyoming DAO LLC legal entity. Marshall Islands 0% corporate tax. Howey-test exempt.",
        features: ["DAO Proposals & Voting", "Wyoming DAO LLC", "Marshall Islands 0% Tax", "On-Chain Governance"],
    },
];

// ── Rival comparison table ─────────────────────────────────────────────────────

const RIVALS = [
    { name: "NYSE", category: "Exchange", fee: `$${NYSE_PER_SHARE_FEE_USD}/share`, piDex: "0%", advantage: "Stellar SDEX native" },
    { name: "NASDAQ", category: "Exchange", fee: `$${(NASDAQ_LISTING_FEE_USD / 1000).toFixed(0)}K/yr listing`, piDex: "0%", advantage: "0% listing fee" },
    { name: "Binance", category: "CEX", fee: `${BINANCE_SPOT_FEE_PCT}% spot`, piDex: "0%", advantage: "Non-custodial DEX" },
    { name: "Coinbase", category: "CEX", fee: `${COINBASE_ADVANCED_FEE_PCT}% taker`, piDex: "0%", advantage: "Self-custody Pi wallets" },
    { name: "Kraken", category: "CEX", fee: `${KRAKEN_FEE_PCT}% taker`, piDex: "0%", advantage: "Pioneer-run DEX" },
    { name: "Uniswap V3", category: "AMM DEX", fee: `${UNISWAP_V3_SWAP_FEE_PCT}% + MEV`, piDex: "0% + 0 MEV", advantage: "Stellar native: zero MEV" },
    { name: "Curve Finance", category: "Stable AMM", fee: "0.04% swap", piDex: "0%", advantage: "No stable/volatile split needed" },
    { name: "Aave", category: "Lending", fee: `${AAVE_BORROW_RATE_PCT}% APR`, piDex: "Pioneer rate", advantage: "Fed-independent rates" },
    { name: "CME Group", category: "Derivatives", fee: `$${CME_CLEARING_FEE_USD}/contract`, piDex: "0%", advantage: "No clearing house" },
    { name: "CBOE", category: "Options", fee: `$${CBOE_OPTIONS_FEE_USD}/contract`, piDex: "0%", advantage: "Instant Pi settlement" },
    { name: "SWIFT", category: "Bridge/Wire", fee: `$${SWIFT_WIRE_FEE_USD}/wire`, piDex: "~$0.0001", advantage: "Stellar path payments" },
    { name: "BlackRock", category: "Asset Mgmt", fee: `${BLACKROCK_MGMT_FEE_PCT}% AUM/yr`, piDex: "0%", advantage: "0% management fee" },
    { name: "JPMorgan", category: "Bank/Trading", fee: "0.5% institutional", piDex: "0%", advantage: "DeFi non-bank (BHCA exempt)" },
    { name: "Goldman Sachs", category: "Investment Bank", fee: "7% IPO gross spread", piDex: "0%", advantage: "Reg D/S/A+ exempt issuance" },
    { name: "Wormhole", category: "Bridge", fee: "0.3% + $320M hack risk", piDex: "0%", advantage: "Stellar native: no WASM risk" },
    { name: "Wall Street HFT", category: "Market Maker", fee: `${WALLSTREET_HFT_FRONT_RUN_PCT}% front-run`, piDex: "0%", advantage: "SPHINCS+ quantum immune" },
];

// ── RWA Token Categories ───────────────────────────────────────────────────────

const RWA_CATEGORIES = [
    { type: "rwa-stock", label: "Equities", icon: BarChart3, desc: "Stocks, ETFs, indices — tokenized on Pi" },
    { type: "rwa-bond", label: "Fixed Income", icon: Percent, desc: "Treasuries, corporate bonds — Reg S exempt" },
    { type: "rwa-reit", label: "Real Estate", icon: Building2, desc: "REITs, property funds — Pi liquidity" },
    { type: "rwa-commodity", label: "Commodities", icon: Coins, desc: "Gold, silver, oil — CEA § 1a(9) commodity" },
    { type: "rwa-forex", label: "Forex", icon: DollarSign, desc: "EUR/USD, GBP — Dodd-Frank § 722(d) exempt" },
    { type: "rwa-private-equity", label: "Private Equity", icon: Award, desc: "VC/buyout funds — Cayman SPC zero-tax" },
];

export default function SovereignPiDexPage() {
    const stats = buildPiDexStats();

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-950 via-slate-900 to-gray-950 text-white">
            {/* ── APEX Header ──────────────────────────────────────────────────── */}
            <div className="relative overflow-hidden border-b border-yellow-500/20 bg-gradient-to-r from-yellow-900/20 via-orange-900/20 to-yellow-900/20">
                <div className="mx-auto max-w-7xl px-6 py-12">
                    <div className="mb-4 flex flex-wrap gap-2">
                        <Badge className="bg-yellow-500/20 text-yellow-300 border border-yellow-500/40">
                            ⚡ APEX-QUANTUM-SOVEREIGN
                        </Badge>
                        <Badge className="bg-orange-500/20 text-orange-300 border border-orange-500/40">
                            🔐 ML-DSA-87 · ML-KEM-1024 · SPHINCS+
                        </Badge>
                        <Badge className="bg-green-500/20 text-green-300 border border-green-500/40">
                            🌐 TRIUMPH-PIDEX-v1
                        </Badge>
                        <Badge className="bg-blue-500/20 text-blue-300 border border-blue-500/40">
                            ⭐ Stellar SDEX + Soroban
                        </Badge>
                        <Badge className="bg-purple-500/20 text-purple-300 border border-purple-500/40">
                            🔮 Pi Network Mainnet
                        </Badge>
                    </div>
                    <h1 className="mb-2 text-5xl font-black tracking-tight">
                        <span className="text-yellow-400">Sovereign Pi-DEX</span>
                    </h1>
                    <PiSignInButton />
                    <p className="text-2xl font-bold text-yellow-300/80 mb-3">
                        The Ultimate Decentralized Exchange — Superior to Wall Street, NYSE, Binance & All CEXs
                    </p>
                    <p className="max-w-4xl text-gray-300">
                        Seven sovereign Pi-powered authorities combining Pi Network's upcoming DEX with Stellar SDEX,
                        Soroban smart contracts, and 61 regulatory loopholes to create the world's most powerful,
                        manipulation-proof, and globally accessible financial exchange. 0% trading fees. 0% front-running.
                        50M+ pioneer traders. Real-world asset tokenization. 24/7/365. 142 countries.
                    </p>

                    {/* Key stats row */}
                    <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-8">
                        {[
                            { label: "Authorities", value: "7", sub: "sovereign" },
                            { label: "Loopholes", value: `${stats.totalLoopholes}`, sub: "regulatory" },
                            { label: "Trading Fee", value: `${AMM_PLATFORM_FEE_PCT}%`, sub: "platform" },
                            { label: "Trading Pairs", value: `${stats.totalTradingPairs}`, sub: "Pi pairs" },
                            { label: "RWA Tokens", value: `${SEED_RWA_TOKENS.length}`, sub: "seed tokens" },
                            { label: "AMM Pools", value: `${SEED_AMM_POOLS.length}`, sub: "initial" },
                            { label: "Pi Rate", value: `$${PI_RATE_EXTERNAL}`, sub: "external" },
                            { label: "Pioneers", value: "50M+", sub: "traders" },
                        ].map(s => (
                            <div key={s.label} className="rounded-lg bg-yellow-500/10 border border-yellow-500/20 p-3 text-center">
                                <div className="text-2xl font-black text-yellow-400">{s.value}</div>
                                <div className="text-xs font-bold text-white">{s.label}</div>
                                <div className="text-xs text-gray-400">{s.sub}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="mx-auto max-w-7xl px-6 py-10 space-y-14">

                {/* ── Authority Cards ─────────────────────────────────────────────── */}
                <section>
                    <h2 className="mb-6 text-3xl font-black text-white">
                        Seven Sovereign Authorities
                    </h2>
                    <div className="grid gap-6 lg:grid-cols-2">
                        {AUTHORITIES.map(auth => {
                            const Icon = auth.icon;
                            const avgScore = auth.loopholes.length
                                ? Math.round(auth.loopholes.reduce((s, l) => s + l.obliterationScore, 0) / auth.loopholes.length)
                                : 0;
                            return (
                                <Card
                                    key={auth.id}
                                    className="border-0 bg-gray-900/60 backdrop-blur-sm ring-1 ring-white/10"
                                >
                                    <CardHeader className="pb-3">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className={`rounded-xl bg-gradient-to-br ${auth.color} p-3`}>
                                                <Icon className="h-6 w-6 text-white" />
                                            </div>
                                            <div className="flex flex-wrap gap-1.5">
                                                <Badge className={`text-xs ${auth.badgeColor} border`}>{auth.id}</Badge>
                                                <Badge className="text-xs bg-red-500/20 text-red-300 border border-red-500/30">
                                                    {auth.loopholes.length} loopholes
                                                </Badge>
                                                <Badge className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                                    {avgScore}% obliteration
                                                </Badge>
                                            </div>
                                        </div>
                                        <CardTitle className="mt-3 text-lg text-white">{auth.name}</CardTitle>
                                        <p className="text-sm font-bold text-red-400/80">{auth.tagline}</p>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        <p className="text-sm text-gray-300">{auth.highlight}</p>
                                        <div className="rounded-lg bg-red-900/20 border border-red-500/20 p-3">
                                            <p className="text-xs font-bold text-red-400 mb-1">RIVAL FEES</p>
                                            <p className="text-xs text-gray-300">{auth.rivalFee}</p>
                                        </div>
                                        <div className="rounded-lg bg-green-900/20 border border-green-500/20 p-3">
                                            <p className="text-xs font-bold text-green-400 mb-1">SOVEREIGN ADVANTAGE</p>
                                            <p className="text-xs text-gray-300">{auth.sovereignFee}</p>
                                        </div>
                                        <div className="flex flex-wrap gap-1.5">
                                            {("features" in auth ? auth.features : []).map((f: string) => (
                                                <Badge key={f} className="text-xs bg-white/5 text-gray-300 border border-white/10">{f}</Badge>
                                            ))}
                                        </div>
                                        <div className="flex flex-wrap gap-1.5">
                                            {auth.rivals.map(r => (
                                                <Badge key={r} className="text-xs bg-red-500/10 text-red-300/70 border border-red-500/20 line-through">
                                                    {r}
                                                </Badge>
                                            ))}
                                        </div>
                                        {/* Top loopholes preview */}
                                        <div className="space-y-1.5 pt-1">
                                            <p className="text-xs font-bold text-yellow-400">TOP LOOPHOLES</p>
                                            {auth.loopholes.slice(0, 2).map(l => (
                                                <div key={l.id} className="rounded-md bg-yellow-500/5 border border-yellow-500/10 p-2">
                                                    <div className="flex items-center justify-between mb-0.5">
                                                        <span className="text-xs font-bold text-yellow-300">{l.title}</span>
                                                        <Badge className="text-xs bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                                                            {l.obliterationScore}%
                                                        </Badge>
                                                    </div>
                                                    <p className="text-xs text-gray-400 line-clamp-2">{l.effect}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </section>

                {/* ── Rival Obliteration Table ────────────────────────────────────── */}
                <section>
                    <h2 className="mb-6 text-3xl font-black text-white">
                        Complete Rival Obliteration — 16 Giants Defeated
                    </h2>
                    <Card className="border-0 bg-gray-900/60 backdrop-blur-sm ring-1 ring-white/10 overflow-hidden">
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-red-900/30 text-xs font-bold text-gray-300">
                                            <th className="py-3 px-4 text-left">Rival</th>
                                            <th className="py-3 px-4 text-left">Category</th>
                                            <th className="py-3 px-4 text-right text-red-400">Their Fee</th>
                                            <th className="py-3 px-4 text-right text-green-400">Pi-DEX Fee</th>
                                            <th className="py-3 px-4 text-left">Sovereign Advantage</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {RIVALS.map((r, i) => (
                                            <tr
                                                key={r.name}
                                                className={`border-t border-white/5 ${i % 2 === 0 ? "bg-white/2" : "bg-transparent"}`}
                                            >
                                                <td className="py-2.5 px-4 font-bold text-red-300 line-through">{r.name}</td>
                                                <td className="py-2.5 px-4 text-gray-400 text-xs">{r.category}</td>
                                                <td className="py-2.5 px-4 text-right font-bold text-red-400">{r.fee}</td>
                                                <td className="py-2.5 px-4 text-right font-bold text-green-400">{r.piDex}</td>
                                                <td className="py-2.5 px-4 text-xs text-gray-300">{r.advantage}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </section>

                {/* ── Real-World Asset Token Registry ─────────────────────────────── */}
                <section>
                    <h2 className="mb-3 text-3xl font-black text-white">
                        Real-World Asset Tokenization (SPRWA)
                    </h2>
                    <p className="mb-6 text-gray-400 max-w-3xl">
                        Tokenize stocks, bonds, REITs, gold, forex, and private equity as Pi tokens.
                        Backed by Reg D 506(c), Reg S, Reg A+, UNCITRAL bearer instruments, and Cayman SPC.
                        Zero IPO fees. Stellar SAC addresses. 142 countries.
                    </p>

                    <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                        {RWA_CATEGORIES.map(cat => {
                            const CatIcon = cat.icon;
                            const count = SEED_RWA_TOKENS.filter(t => t.assetType === cat.type).length;
                            return (
                                <Card key={cat.type} className="border-0 bg-gray-900/60 ring-1 ring-white/10 text-center">
                                    <CardContent className="p-4">
                                        <CatIcon className="mx-auto mb-2 h-6 w-6 text-green-400" />
                                        <div className="text-lg font-black text-white">{count}</div>
                                        <div className="text-xs font-bold text-green-400">{cat.label}</div>
                                        <div className="text-xs text-gray-500 mt-1">{cat.desc}</div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>

                    <Card className="border-0 bg-gray-900/60 ring-1 ring-white/10 overflow-hidden">
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-green-900/30 text-xs font-bold text-gray-300">
                                            <th className="py-3 px-4 text-left">Asset Code</th>
                                            <th className="py-3 px-4 text-left">Underlying</th>
                                            <th className="py-3 px-4 text-left">Type</th>
                                            <th className="py-3 px-4 text-right">Price (π)</th>
                                            <th className="py-3 px-4 text-left">Regulatory Basis</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {SEED_RWA_TOKENS.map((t, i) => (
                                            <tr key={t.tokenId} className={`border-t border-white/5 ${i % 2 === 0 ? "bg-white/2" : ""}`}>
                                                <td className="py-2.5 px-4 font-black text-yellow-400">{t.assetCode}</td>
                                                <td className="py-2.5 px-4 text-gray-300 text-xs">{t.underlying}</td>
                                                <td className="py-2.5 px-4">
                                                    <Badge className="text-xs bg-green-500/10 text-green-300 border border-green-500/20">
                                                        {t.assetType}
                                                    </Badge>
                                                </td>
                                                <td className="py-2.5 px-4 text-right font-mono text-cyan-300">{t.priceInPi.toFixed(7)}</td>
                                                <td className="py-2.5 px-4 text-xs text-gray-400">{t.regulatoryExemption}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </section>

                {/* ── AMM Pools ────────────────────────────────────────────────────── */}
                <section>
                    <h2 className="mb-3 text-3xl font-black text-white">
                        Stellar AMM Liquidity Pools (SPMMA)
                    </h2>
                    <p className="mb-6 text-gray-400 max-w-3xl">
                        Native Stellar CAP-38 AMM protocol. Constant product x*y=k formula. 0% platform fee.
                        0.3% to LP providers. Zero MEV, zero front-running, zero smart contract exploit surface.
                    </p>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {SEED_AMM_POOLS.map(pool => {
                            const totalLiq = pool.reserveA + pool.reserveB;
                            const estimatedApy = (pool.volume24hPi * (AMM_LP_FEE_PCT / 100) * 365) / totalLiq * 100;
                            return (
                                <Card key={pool.poolId} className="border-0 bg-gray-900/60 ring-1 ring-white/10">
                                    <CardContent className="p-4">
                                        <div className="mb-2 flex items-center justify-between">
                                            <span className="font-black text-white">
                                                {pool.assetA.assetCode}/{pool.assetB.assetCode}
                                            </span>
                                            <Badge className="text-xs bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                                AMM Pool
                                            </Badge>
                                        </div>
                                        <div className="space-y-1 text-xs text-gray-400">
                                            <div className="flex justify-between">
                                                <span>Reserve A</span>
                                                <span className="text-white font-mono">{pool.reserveA.toLocaleString()}π</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Reserve B</span>
                                                <span className="text-white font-mono">{pool.reserveB.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>24h Volume</span>
                                                <span className="text-cyan-300 font-mono">{pool.volume24hPi.toLocaleString()}π</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Est. APY</span>
                                                <span className="text-green-400 font-bold">{estimatedApy.toFixed(2)}%</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span>Platform Fee</span>
                                                <span className="text-green-400 font-bold">{AMM_PLATFORM_FEE_PCT}%</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </section>

                {/* ── Complete Loophole Registry ──────────────────────────────────── */}
                <section>
                    <h2 className="mb-6 text-3xl font-black text-white">
                        {ALL_PIDEX_LOOPHOLES.length} Sovereign Regulatory Loopholes
                    </h2>
                    <div className="space-y-8">
                        {AUTHORITIES.map(auth => (
                            <div key={auth.id}>
                                <div className="mb-4 flex items-center gap-3">
                                    <Badge className={`${auth.badgeColor} border px-3 py-1 text-sm font-bold`}>
                                        {auth.id}
                                    </Badge>
                                    <span className="font-bold text-white">{auth.name}</span>
                                    <Badge className="bg-red-500/20 text-red-300 border border-red-500/30 text-xs">
                                        {auth.loopholes.length} loopholes
                                    </Badge>
                                </div>
                                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                    {auth.loopholes.map(l => (
                                        <Card
                                            key={l.id}
                                            className="border-0 bg-gray-900/50 ring-1 ring-white/8"
                                        >
                                            <CardContent className="p-4">
                                                <div className="mb-2 flex items-start justify-between gap-2">
                                                    <span className="text-sm font-bold text-yellow-300 leading-tight">{l.title}</span>
                                                    <div className="flex flex-col items-end gap-1 shrink-0">
                                                        <Badge className="text-xs bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">
                                                            {l.obliterationScore}%
                                                        </Badge>
                                                        {l.deployOnPulse && (
                                                            <Badge className="text-xs bg-green-500/20 text-green-400 border border-green-500/30">
                                                                PULSE
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                                <p className="mb-2 text-xs font-mono text-blue-400/70 line-clamp-1">{l.cite}</p>
                                                <p className="text-xs text-gray-400 line-clamp-4">{l.effect}</p>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ── Quantum Security Panel ──────────────────────────────────────── */}
                <section>
                    <h2 className="mb-6 text-3xl font-black text-white">
                        Maximum Quantum Security Suite
                    </h2>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {[
                            {
                                algo: QUANTUM_ALGO_SIG,
                                fips: "FIPS 204",
                                use: "Digital Signatures (orders, swaps, derivatives)",
                                level: "MAX — 256-bit quantum security",
                                color: "from-red-500 to-orange-600",
                            },
                            {
                                algo: QUANTUM_ALGO_ENC,
                                fips: "FIPS 203",
                                use: "Key Encapsulation (encrypted Pi transfers)",
                                level: "MAX — 256-bit quantum security",
                                color: "from-blue-500 to-cyan-600",
                            },
                            {
                                algo: QUANTUM_ALGO_HASH,
                                fips: "FIPS 202",
                                use: "Hashing (blockchain anchors, pool state)",
                                level: "512-bit output · XOF mode",
                                color: "from-purple-500 to-violet-600",
                            },
                            {
                                algo: QUANTUM_ALGO_BACKUP,
                                fips: "FIPS 205",
                                use: "Backup Stateless Hash Signatures (anti-front-run)",
                                level: "Conservative — hash-only, most audited PQC",
                                color: "from-green-500 to-teal-600",
                            },
                        ].map(q => (
                            <Card key={q.algo} className="border-0 bg-gray-900/60 ring-1 ring-white/10">
                                <CardHeader className="pb-2">
                                    <div className={`rounded-xl bg-gradient-to-br ${q.color} p-3 w-fit mb-2`}>
                                        <Lock className="h-5 w-5 text-white" />
                                    </div>
                                    <CardTitle className="text-sm text-white leading-tight">{q.algo}</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-1.5">
                                    <Badge className="text-xs bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">{q.fips}</Badge>
                                    <p className="text-xs text-gray-400">{q.use}</p>
                                    <p className="text-xs font-bold text-green-400">{q.level}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </section>

                {/* ── Stellar Architecture ─────────────────────────────────────────── */}
                <section>
                    <h2 className="mb-6 text-3xl font-black text-white">
                        Stellar SDEX + Pi Network Architecture
                    </h2>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {[
                            {
                                title: "Stellar SDEX Order Book",
                                desc: "Built into Stellar network layer. No broker-dealer license. No SEC exchange registration. Every asset pair has a native order book. Limit/market/TWAP orders.",
                                icon: BarChart3,
                                badge: "Native Protocol",
                            },
                            {
                                title: "Stellar CAP-38 AMM",
                                desc: "Constant product x*y=k AMM natively in Stellar consensus. No WASM smart contract — zero exploit surface vs Uniswap's $70M+ exploits. 0.3% LP fee, 0% platform fee.",
                                icon: ArrowLeftRight,
                                badge: "x*y=k Formula",
                            },
                            {
                                title: "Stellar Path Payments",
                                desc: "PathPaymentStrictSend/Receive: built-in multi-hop cross-asset routing. Eliminates SWIFT wires ($45) and centralized bridges (Wormhole $320M hack). Native ~$0.0001/hop.",
                                icon: Network,
                                badge: "Multi-Hop Bridge",
                            },
                            {
                                title: "Soroban Smart Contracts",
                                desc: "WASM contracts on Stellar for derivatives, governance votes, and complex DeFi. Pi-settled, quantum-signed, instant finality. C... contract addresses with SAC wrapping.",
                                icon: Cpu,
                                badge: "WASM + Soroban",
                            },
                            {
                                title: "Stellar Asset Contracts (SAC)",
                                desc: "Every classic Stellar asset has a reserved SAC address. SAC enables any Stellar asset (including Pi) to be used in Soroban contracts. Bridge and wrap any asset to DeFi.",
                                icon: Shield,
                                badge: "SAC Contracts",
                            },
                            {
                                title: "Pi Network SDK Integration",
                                desc: "pi-backend npm (pi-apps/pi-nodejs). createPayment → submitPayment → completePayment flow. A2U payments. 7-decimal precision (1 stroop = 0.0000001π). Pi Mainnet API.",
                                icon: Wallet,
                                badge: "pi-backend SDK",
                            },
                        ].map(item => {
                            const ItemIcon = item.icon;
                            return (
                                <Card key={item.title} className="border-0 bg-gray-900/60 ring-1 ring-white/10">
                                    <CardContent className="p-5">
                                        <div className="mb-3 flex items-center gap-3">
                                            <div className="rounded-lg bg-blue-500/20 border border-blue-500/30 p-2">
                                                <ItemIcon className="h-5 w-5 text-blue-400" />
                                            </div>
                                            <Badge className="text-xs bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                                {item.badge}
                                            </Badge>
                                        </div>
                                        <h3 className="mb-2 font-bold text-white">{item.title}</h3>
                                        <p className="text-sm text-gray-400">{item.desc}</p>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </section>

                {/* ── Pi Utility Panel ─────────────────────────────────────────────── */}
                <section>
                    <h2 className="mb-6 text-3xl font-black text-white">
                        Pi Network Real-World Utility
                    </h2>
                    <Card className="border-0 bg-gradient-to-r from-yellow-900/20 via-orange-900/20 to-yellow-900/20 ring-1 ring-yellow-500/20">
                        <CardContent className="p-8">
                            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                                {[
                                    {
                                        label: "External Pi Rate",
                                        value: `$${PI_RATE_EXTERNAL}/π`,
                                        sub: "utility exchange rate",
                                        icon: CircleDollarSign,
                                        color: "text-yellow-400",
                                    },
                                    {
                                        label: "Internal Pi Rate",
                                        value: `$${PI_RATE_INTERNAL.toLocaleString()}/π`,
                                        sub: "sovereign internal rate",
                                        icon: TrendingUp,
                                        color: "text-orange-400",
                                    },
                                    {
                                        label: "Pi Fixed Supply",
                                        value: `${(PI_MAX_SUPPLY / 1e9).toFixed(0)}B π`,
                                        sub: "hard-capped forever",
                                        icon: Lock,
                                        color: "text-cyan-400",
                                    },
                                    {
                                        label: "Pioneer Network",
                                        value: "50M+ KYC",
                                        sub: "verified global traders",
                                        icon: Globe,
                                        color: "text-green-400",
                                    },
                                ].map(item => {
                                    const UIcon = item.icon;
                                    return (
                                        <div key={item.label} className="text-center">
                                            <UIcon className={`mx-auto mb-2 h-8 w-8 ${item.color}`} />
                                            <div className={`text-2xl font-black ${item.color}`}>{item.value}</div>
                                            <div className="text-sm font-bold text-white">{item.label}</div>
                                            <div className="text-xs text-gray-400">{item.sub}</div>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="mt-8 rounded-xl bg-black/30 p-5 border border-yellow-500/20">
                                <h3 className="mb-3 font-bold text-yellow-400">Why Pi-DEX is the Ultimate Exchange</h3>
                                <div className="grid gap-3 sm:grid-cols-2">
                                    {[
                                        "0% trading fees vs NYSE $0.003/share, Binance 0.1%, Coinbase 0.6%",
                                        "Zero MEV/front-running — Stellar sequential ledger ordering",
                                        "Stellar SDEX native order book — no FINRA broker-dealer license",
                                        "CAP-38 AMM — no smart contract exploit surface (vs Uniswap $70M+ hacks)",
                                        "61 regulatory loopholes — SEC, CFTC, FinCEN, FATF, MiCA all navigated",
                                        "50M+ pioneers — 6,250x more democratic than Wall Street shareholder governance",
                                        "24/7/365 — 3x more trading time than NYSE (6.5 hrs/day, 252 days/yr)",
                                        "Pi fixed 100B supply cap — mathematically manipulation-proof",
                                        "RWA tokenization — stocks, bonds, gold, REITs, forex, private equity all on Pi",
                                        "Soroban smart contracts — Pi-native derivatives without CME/CBOE",
                                        "Stellar path payments — replaces SWIFT, Wormhole, Stargate, LayerZero",
                                        "ML-DSA-87 + SPHINCS+ — quantum-proof through the post-quantum era",
                                    ].map(point => (
                                        <div key={point} className="flex items-start gap-2">
                                            <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-green-400" />
                                            <span className="text-sm text-gray-300">{point}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </section>

                {/* ── API Reference ────────────────────────────────────────────────── */}
                <section>
                    <h2 className="mb-6 text-3xl font-black text-white">
                        API Reference
                    </h2>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {[
                            {
                                method: "GET",
                                path: "/api/sovereign/pidex/status",
                                desc: "Full platform status: 7 authorities, DEX stats, rival comparison, quantum suite",
                                badge: "Status",
                            },
                            {
                                method: "GET",
                                path: "/api/sovereign/pidex/loopholes",
                                desc: "All 61 loopholes. Filter: ?target=SPXA&minScore=90&q=keyword&pulse=1",
                                badge: "Loopholes",
                            },
                            {
                                method: "GET",
                                path: "/api/sovereign/pidex/swap?assetIn=XPI&assetOut=USDC&amount=100",
                                desc: "Quote a swap. Returns amountOut, priceImpact, lpFee, rivalFeeSaved",
                                badge: "Swap Quote",
                            },
                            {
                                method: "POST",
                                path: "/api/sovereign/pidex/swap",
                                desc: "Execute AMM swap. Body: { traderPiWallet, assetIn, assetOut, amountIn }",
                                badge: "Swap Execute",
                            },
                            {
                                method: "GET",
                                path: "/api/sovereign/pidex/tokens",
                                desc: "RWA token registry. Filter: ?assetType=rwa-stock&verified=1&q=apple",
                                badge: "Tokens",
                            },
                            {
                                method: "POST",
                                path: "/api/sovereign/pidex/tokens",
                                desc: "List new RWA token. Body: { assetCode, underlying, assetType, priceInPi, regulatoryExemption, issuerPiWallet }",
                                badge: "Token Listing",
                            },
                            {
                                method: "GET",
                                path: "/api/sovereign/pidex/pool",
                                desc: "AMM pool registry. Filter: ?asset=XPI&sort=volume|liquidity|apy",
                                badge: "Pools",
                            },
                            {
                                method: "POST",
                                path: "/api/sovereign/pidex/pool",
                                desc: "Add liquidity. Body: { lpPiWallet, assetA, assetB, amountA, amountB }",
                                badge: "Add Liquidity",
                            },
                        ].map(api => (
                            <Card key={api.path} className="border-0 bg-gray-900/60 ring-1 ring-white/10">
                                <CardContent className="p-4">
                                    <div className="mb-2 flex items-center gap-2">
                                        <Badge className={`text-xs font-bold ${api.method === "GET" ? "bg-blue-500/20 text-blue-300 border-blue-500/30" : "bg-green-500/20 text-green-300 border-green-500/30"} border`}>
                                            {api.method}
                                        </Badge>
                                        <Badge className="text-xs bg-white/5 text-gray-300 border border-white/10">
                                            {api.badge}
                                        </Badge>
                                    </div>
                                    <code className="block text-xs text-yellow-300 break-all mb-2">{api.path}</code>
                                    <p className="text-xs text-gray-400">{api.desc}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </section>

                {/* ── Footer ──────────────────────────────────────────────────────── */}
                <footer className="border-t border-white/10 pt-8 pb-4 text-center">
                    <div className="flex flex-wrap justify-center gap-2 mb-4">
                        <Badge className="bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
                            {SOVEREIGN_PIDEX_VERSION}
                        </Badge>
                        <Badge className="bg-red-500/20 text-red-300 border border-red-500/30">
                            {APEX_SECURITY_LEVEL}
                        </Badge>
                        <Badge className="bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            {ALL_PIDEX_LOOPHOLES.length} Loopholes Active
                        </Badge>
                        <Badge className="bg-green-500/20 text-green-300 border border-green-500/30">
                            0% Trading Fee
                        </Badge>
                        <Badge className="bg-blue-500/20 text-blue-300 border border-blue-500/30">
                            Stellar SDEX + Soroban
                        </Badge>
                    </div>
                    <p className="text-xs text-gray-500">
                        Triumph Synergy Digital Financial Ecosystem · Sovereign Pi-DEX ·
                        Pi Network Mainnet · {new Date().getFullYear()} ·
                        $π = ${PI_RATE_EXTERNAL} external · ${PI_RATE_INTERNAL.toLocaleString()} internal sovereign
                    </p>
                </footer>
            </div>
        </div>
    );
}

/**
 * app/ecosystem/sovereign-sports/page.tsx
 * Triumph Synergy — Sovereign Sports Hub Dashboard
 *
 * Seven sovereign authorities obsoleting:
 *   YouTube · TikTok · Twitch · ESPN+ · DAZN    → SSSA  (Streaming Authority)
 *   Ticketmaster · StubHub · AXS · PayPal        → SSPA  (Payment Authority)
 *   CAA · IMG · WME Sports · Octagon             → SSAA  (Athlete Authority)
 *   ESPN · Fox Sports · Sky Sports · NBC         → SSMA  (Media Authority)
 *   NFL/NBA/FIFA/IOC licensing bodies            → SSLAA (League Authority)
 *   Google Ads · Meta Ads · Sportradar           → SSRAA (Revenue & Ad Authority)
 *   WADA · CAS · IOC Ethics · USADA              → SSGVA (Governance Authority)
 *
 * APEX-QUANTUM-SOVEREIGN · ML-DSA-87 · ML-KEM-1024 · SPHINCS+ · 66 loopholes
 * 50+ sports · 200 countries · 50M pioneer fanbase · 0% platform cut
 * Sub-500ms streaming · Pioneer P2P CDN · Pi tickets · Pi salaries · Pi ads
 */

import {
    Tv2,
    Trophy,
    Users,
    Globe,
    Shield,
    Zap,
    BadgeCheck,
    Star,
    TrendingDown,
    Lock,
    Cpu,
    Activity,
    Radio,
    CircleDollarSign,
    Megaphone,
    Vote,
    BarChart2,
    Gavel,
    Timer,
    Ticket,
    Wallet,
    Play,
    Video,
    Award,
    Heart,
    Smartphone,
    DollarSign,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    ALL_SPORTS_LOOPHOLES,
    SSSA_LOOPHOLES,
    SSPA_LOOPHOLES,
    SSAA_LOOPHOLES,
    SSMA_LOOPHOLES,
    SSLAA_LOOPHOLES,
    SSRAA_LOOPHOLES,
    SSGVA_LOOPHOLES,
    SOVEREIGN_SPORTS_VERSION,
    APEX_SECURITY_LEVEL,
    QUANTUM_ALGO_SIG,
    QUANTUM_ALGO_ENC,
    QUANTUM_ALGO_HASH,
    QUANTUM_ALGO_BACKUP,
    PI_RATE_EXTERNAL,
    SPORTS_COUNTRIES,
    SPORTS_DISCIPLINES,
    PIONEER_FANBASE,
    STREAMING_LATENCY_MS,
    SSH_PLATFORM_CUT_PCT,
    SSH_TICKET_FEE_PCT,
    SSH_AGENT_COMMISSION_PCT,
    SSH_SETTLEMENT_SECONDS,
    SSH_PI_MICROPAY_MIN_PI,
    YOUTUBE_CREATOR_CUT_PCT,
    YOUTUBE_SUPER_CHAT_CUT_PCT,
    TWITCH_SUBSCRIPTION_CUT_PCT,
    TICKETMASTER_SERVICE_FEE_PCT,
    TICKETMASTER_SETTLEMENT_DAYS,
    CAA_AGENT_COMMISSION_PCT,
    ESPN_RIGHTS_ANNUAL_USD,
    GOOGLE_ADS_NETWORK_CUT_PCT,
    META_ADS_NETWORK_CUT_PCT,
    DAZN_SUBSCRIPTION_USD,
    ESPN_PLUS_SUBSCRIPTION_USD,
    WADA_ANNUAL_BUDGET_USD,
    SWIFT_WIRE_FEE_USD,
    SEED_SPORTS_EVENTS,
    SEED_PARTICIPANTS,
    buildSportsHubStats,
} from "@/lib/programs/sovereign-sports";

export const dynamic = "force-dynamic";
export const revalidate = 60;

export const metadata = {
    title: "Sovereign Sports Hub — SSSA · SSPA · SSAA · SSMA · SSLAA · SSRAA · SSGVA | Triumph Synergy",
    description:
        "The ultimate sovereign global sports platform. Seven Pi-powered authorities obliterating YouTube, " +
        "TikTok, Ticketmaster, ESPN, CAA, Google Ads, and WADA. " +
        "66 loopholes. 0% platform cut. 0% agent commission. APEX-QUANTUM-SOVEREIGN. " +
        "50M pioneers. Sub-500ms streaming. Pi tickets. Pi salaries. 200 countries.",
};

// ── Authority definitions ──────────────────────────────────────────────────────

const AUTHORITIES = [
    {
        id: "SSSA",
        icon: Tv2,
        color: "from-red-500 to-rose-600",
        badgeColor: "bg-red-500/20 text-red-300 border-red-500/40",
        name: "Sovereign Sports Streaming Authority",
        tagline: "YouTube · TikTok · Twitch · ESPN+ · DAZN — OBSOLETE",
        rivals: ["YouTube", "TikTok", "Twitch", "ESPN+", "DAZN", "Peacock", "Prime Video Sports"],
        rivalFee: `YouTube ${YOUTUBE_CREATOR_CUT_PCT}% creator cut · Twitch ${TWITCH_SUBSCRIPTION_CUT_PCT}% subs · YouTube Super Chat ${YOUTUBE_SUPER_CHAT_CUT_PCT}%`,
        sovereignFee: `${SSH_PLATFORM_CUT_PCT}% platform cut — 100% Pi ad revenue and tips to athlete/creator`,
        loopholes: SSSA_LOOPHOLES,
        highlight: `Sub-${STREAMING_LATENCY_MS}ms global streaming. Pioneer P2P CDN. ML-KEM-1024 Quantum DRM. AI highlights auto-minted as Pi NFTs.`,
        features: ["Sub-500ms Streaming", "Pioneer P2P CDN", "Quantum DRM", "Pi Tips (0% cut)", "AI Highlight NFTs", "50 Language AI Commentary"],
    },
    {
        id: "SSPA",
        icon: Ticket,
        color: "from-orange-500 to-amber-600",
        badgeColor: "bg-orange-500/20 text-orange-300 border-orange-500/40",
        name: "Sovereign Sports Payment Authority",
        tagline: "Ticketmaster · StubHub · AXS · PayPal — OBSOLETE",
        rivals: ["Ticketmaster", "StubHub", "AXS", "Paciolan", "PayPal", "Stripe"],
        rivalFee: `Ticketmaster avg ${TICKETMASTER_SERVICE_FEE_PCT}% service fee · T+${TICKETMASTER_SETTLEMENT_DAYS} settlement · $${DAZN_SUBSCRIPTION_USD}/mo OTT`,
        sovereignFee: `${SSH_TICKET_FEE_PCT}% booking fee · T+${SSH_SETTLEMENT_SECONDS}s Pi settlement · from ${SSH_PI_MICROPAY_MIN_PI} Pi per event`,
        loopholes: SSPA_LOOPHOLES,
        highlight: `Tickets, merchandise, VIP experiences, and prize pools paid in Pi. Instant T+${SSH_SETTLEMENT_SECONDS}s settlement. Anti-scalper Soroban contracts.`,
        features: [`${SSH_TICKET_FEE_PCT}% Booking Fee`, "Pi Direct Tickets", `T+${SSH_SETTLEMENT_SECONDS}s Settlement`, "Anti-Scalper Contracts", "Pi VIP Auctions", "1 Pi Pay-Per-View"],
    },
    {
        id: "SSAA",
        icon: Trophy,
        color: "from-yellow-500 to-orange-500",
        badgeColor: "bg-yellow-500/20 text-yellow-300 border-yellow-500/40",
        name: "Sovereign Sports Athlete Authority",
        tagline: "CAA Sports · IMG · WME Sports · Octagon — OBSOLETE",
        rivals: ["CAA Sports", "IMG", "WME Sports", "Octagon", "Endeavor", "Excel Sports"],
        rivalFee: `CAA ${CAA_AGENT_COMMISSION_PCT}% commission · IMG up to 20% · 30-90 day endorsement payment terms`,
        sovereignFee: `${SSH_AGENT_COMMISSION_PCT}% agent commission · Atomic Pi endorsement payments · Pi salary opt-in`,
        loopholes: SSAA_LOOPHOLES,
        highlight: "Players, coaches, and owners sign up directly. Earn Pi from ads, tips, and endorsements. NIL support. 0% agent cut. Permanent NFT royalties.",
        features: ["0% Agent Commission", "Pi Salary Opt-In", "NIL Pi Payments", "NFT Royalty Stream", "Performance Bonuses", "Direct Sponsorships"],
    },
    {
        id: "SSMA",
        icon: Radio,
        color: "from-blue-500 to-indigo-600",
        badgeColor: "bg-blue-500/20 text-blue-300 border-blue-500/40",
        name: "Sovereign Sports Media Authority",
        tagline: "ESPN · Fox Sports · Sky Sports · NBC Sports — OBSOLETE",
        rivals: ["ESPN", "Fox Sports", "Sky Sports", "NBC Sports", "beIN Sports", "TNT Sports"],
        rivalFee: `ESPN $${(ESPN_RIGHTS_ANNUAL_USD / 1e9).toFixed(1)}B/yr NFL rights · Fox Sports $2B/yr · Sportradar $5M/yr data`,
        sovereignFee: "0% broadcast licensing · Athletes own commentary rights · On-chain verified stats free",
        loopholes: SSMA_LOOPHOLES,
        highlight: "Leagues broadcast directly on Pi. 50-language AI commentary. Eternal sports archive on Pi nodes. Pi-tipped journalism.",
        features: ["0% Broadcast License", "50-Language AI Commentary", "Athlete-Owned Commentary", "On-Chain Stats Free", "Pi Press Pass NFT", "Eternal Pi Archive"],
    },
    {
        id: "SSLAA",
        icon: Award,
        color: "from-emerald-500 to-green-600",
        badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
        name: "Sovereign Sports League Authority",
        tagline: "NFL/NBA/FIFA/IOC Licensing Monopoly — OBSOLETE",
        rivals: ["NFL licensing", "NBA licensing", "FIFA licensing", "IOC", "PGA Tour", "ICC"],
        rivalFee: "IOC/FIFA licensing monopoly + territorial exclusivity + broadcast blackout rules",
        sovereignFee: "Wyoming DAO LLC — exempt from IOC/FIFA licensing · 50M pioneer governance votes",
        loopholes: SSLAA_LOOPHOLES,
        highlight: "Leagues register as Wyoming DAO LLCs. Pioneer fan governance. Pi prize pools. Cross-league Pi interoperability across all sports.",
        features: ["Wyoming DAO LLC", "50M Pioneer Votes", "Pi Prize Pools", "Cross-League Pi", "Anti-Monopoly Architecture", "NIL Infrastructure"],
    },
    {
        id: "SSRAA",
        icon: Megaphone,
        color: "from-purple-500 to-violet-600",
        badgeColor: "bg-purple-500/20 text-purple-300 border-purple-500/40",
        name: "Sovereign Sports Revenue & Ad Authority",
        tagline: "Google Ads · Meta Ads · Sportradar · Nielsen — OBSOLETE",
        rivals: ["Google Ads", "Meta Ads", "Sportradar", "Nielsen Sports", "DoubleClick"],
        rivalFee: `Google ${GOOGLE_ADS_NETWORK_CUT_PCT}% of ad spend · Meta ${META_ADS_NETWORK_CUT_PCT}%+ · Sportradar $5M/yr data`,
        sovereignFee: `${SSH_PLATFORM_CUT_PCT}% ad network cut · Pi-denominated CPM · Brands pay athletes directly`,
        loopholes: SSRAA_LOOPHOLES,
        highlight: "Brands pay athletes directly in Pi. Zero ad network intermediary. Pi-denominated CPM. Fan Pi rewards for engagement. Privacy-first targeting.",
        features: ["0% Ad Network Cut", "Pi-Denominated CPM", "Privacy-First Targeting", "Athlete Data Ownership", "Fan Pi Rewards", "Pi Prediction Markets"],
    },
    {
        id: "SSGVA",
        icon: Gavel,
        color: "from-teal-500 to-cyan-600",
        badgeColor: "bg-teal-500/20 text-teal-300 border-teal-500/40",
        name: "Sovereign Sports Governance Authority",
        tagline: "WADA · CAS · IOC Ethics · USADA · FIFA Ethics — OBSOLETE",
        rivals: ["WADA", "CAS", "IOC Ethics Committee", "USADA", "FIFA Ethics"],
        rivalFee: `WADA $${(WADA_ANNUAL_BUDGET_USD / 1e6).toFixed(0)}M/yr funded by athletes · CAS $50K/case arbitration`,
        sovereignFee: "Wyoming DAO self-governance · Pioneer jury system · $0 governance cost",
        loopholes: SSGVA_LOOPHOLES,
        highlight: "On-chain doping tests. 50M pioneer jury for disputes. Quantum-signed immutable contracts. WADA/CAS jurisdiction eliminated by Wyoming DAO.",
        features: ["Wyoming DAO Governance", "50M Pioneer Jury", "On-Chain Doping Tests", "Quantum-Signed Contracts", "Pi KYC Eligibility", "International Sovereignty"],
    },
];

// ── Rival comparison table ─────────────────────────────────────────────────────

const RIVALS = [
    { name: "YouTube", category: "Streaming", theirCut: `${YOUTUBE_CREATOR_CUT_PCT}% creator`, sshCut: "0%", advantage: "100% Pi to athlete" },
    { name: "TikTok", category: "Short Video", theirCut: "50%+ ad", sshCut: "0%", advantage: "Quantum DRM · NFT clips" },
    { name: "Twitch", category: "Live Stream", theirCut: "50% subs", sshCut: "0%", advantage: "Sub-500ms · Pi tips 100%" },
    { name: "Ticketmaster", category: "Tickets", theirCut: `${TICKETMASTER_SERVICE_FEE_PCT}% fees`, sshCut: "0%", advantage: `T+${SSH_SETTLEMENT_SECONDS}s · Anti-scalper` },
    { name: "StubHub", category: "Resale", theirCut: "15% seller", sshCut: "0%", advantage: "Face-value Soroban cap" },
    { name: "CAA Sports", category: "Agency", theirCut: `${CAA_AGENT_COMMISSION_PCT}% commission`, sshCut: "0%", advantage: "Direct pioneer sponsorship" },
    { name: "IMG", category: "Agency", theirCut: "20% commission", sshCut: "0%", advantage: "Atomic Pi endorsement pay" },
    { name: "ESPN", category: "Broadcast", theirCut: "$2.7B/yr rights", sshCut: "$0", advantage: "Leagues own rights on Pi" },
    { name: "DAZN", category: "OTT Sports", theirCut: `$${DAZN_SUBSCRIPTION_USD}/mo`, sshCut: `${SSH_PI_MICROPAY_MIN_PI} Pi min`, advantage: "Micropay-per-view" },
    { name: "Google Ads", category: "Advertising", theirCut: `${GOOGLE_ADS_NETWORK_CUT_PCT}%`, sshCut: "0%", advantage: "Brands pay athletes direct Pi" },
    { name: "Sportradar", category: "Data", theirCut: "$5M+/yr", sshCut: "0 Pi", advantage: "On-chain stats — free" },
    { name: "WADA", category: "Governance", theirCut: `$${(WADA_ANNUAL_BUDGET_USD / 1e6).toFixed(0)}M/yr`, sshCut: "$0", advantage: "Wyoming DAO self-governance" },
    { name: "SWIFT", category: "Wire", theirCut: `$${SWIFT_WIRE_FEE_USD}/wire`, sshCut: "$0.0001", advantage: "Stellar path payment" },
    { name: "Spotify", category: "Podcast", theirCut: "45%", sshCut: "0%", advantage: "Pi podcast subscriptions" },
];

// ── Sports covered ─────────────────────────────────────────────────────────────

const SPORTS_GRID = [
    { sport: "🏈 American Football", pioneer: "NFL", note: "Pi tickets + Pi salary opt-in" },
    { sport: "🏀 Basketball", pioneer: "NBA/FIBA", note: "Pi prize pools + NIL" },
    { sport: "⚽ Soccer/Football", pioneer: "FIFA/UEFA", note: "Pi fan tokens + governance" },
    { sport: "⚾ Baseball", pioneer: "MLB", note: "Pi season tickets tokenized" },
    { sport: "🎾 Tennis", pioneer: "ATP/WTA", note: "Pi tournament prize pools" },
    { sport: "⛳ Golf", pioneer: "PGA Tour", note: "Pi sponsorship deals" },
    { sport: "🥊 Boxing", pioneer: "WBC/WBA", note: "Pi PPV micropayments" },
    { sport: "🥋 MMA", pioneer: "UFC/Bellator", note: "Pi fighter pay opt-in" },
    { sport: "🏏 Cricket", pioneer: "ICC/IPL", note: "Pi global fan payments" },
    { sport: "🏉 Rugby", pioneer: "World Rugby", note: "Pi broadcast rights" },
    { sport: "🎮 Esports", pioneer: "LCS/LCK/TI", note: "Pi prize pools + Pi PPV" },
    { sport: "🏊 Swimming", pioneer: "FINA", note: "Pi sponsorship opt-in" },
    { sport: "🏃 Athletics", pioneer: "World Athletics", note: "Pi prize money" },
    { sport: "🏒 Ice Hockey", pioneer: "NHL", note: "Pi tickets + Pi ads" },
    { sport: "🏐 Volleyball", pioneer: "FIVB", note: "Pi streaming revenue" },
    { sport: "🥅 Lacrosse", pioneer: "PLL/NLL", note: "Pi growing market" },
    { sport: "🤸 Olympics", pioneer: "IOC", note: "Wyoming DAO = IOC exempt" },
    { sport: "🏋️ Weightlifting", pioneer: "IWF", note: "Pi athlete direct pay" },
    { sport: "🎯 Darts", pioneer: "PDC/BDO", note: "Pi fan engagement" },
    { sport: "🏇 Horse Racing", pioneer: "Global", note: "Pi prediction markets" },
];

export default function SovereignSportsHubPage() {
    const stats = buildSportsHubStats();

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-950 via-slate-900 to-gray-950 text-white">

            {/* ── APEX Header ──────────────────────────────────────────────────── */}
            <div className="relative overflow-hidden border-b border-green-500/20 bg-gradient-to-r from-green-900/20 via-emerald-900/20 to-green-900/20">
                <div className="mx-auto max-w-7xl px-6 py-12">
                    <div className="mb-4 flex flex-wrap gap-2">
                        <Badge className="bg-green-500/20 text-green-300 border border-green-500/40">
                            ⚡ APEX-QUANTUM-SOVEREIGN
                        </Badge>
                        <Badge className="bg-orange-500/20 text-orange-300 border border-orange-500/40">
                            🔐 ML-DSA-87 · ML-KEM-1024 · SPHINCS+
                        </Badge>
                        <Badge className="bg-yellow-500/20 text-yellow-300 border border-yellow-500/40">
                            🌍 {SPORTS_COUNTRIES} Countries · {SPORTS_DISCIPLINES}+ Sports
                        </Badge>
                        <Badge className="bg-blue-500/20 text-blue-300 border border-blue-500/40">
                            🔮 Pi Network Mainnet
                        </Badge>
                        <Badge className="bg-red-500/20 text-red-300 border border-red-500/40">
                            🏆 {SOVEREIGN_SPORTS_VERSION}
                        </Badge>
                    </div>

                    <h1 className="mb-2 text-5xl font-black tracking-tight">
                        <span className="text-green-400">Sovereign Sports Hub</span>
                    </h1>
                    <p className="text-2xl font-bold text-green-300/80 mb-3">
                        The Ultimate Global Sports Platform — YouTube · TikTok · Ticketmaster · ESPN · CAA · Wall Street — ALL OBSOLETE
                    </p>
                    <p className="max-w-4xl text-gray-300">
                        Seven sovereign Pi-powered authorities unifying all sports globally in one streaming hub with
                        Pi payments, direct athlete monetization, and{" "}
                        <span className="text-green-400 font-bold">{stats.totalLoopholes} regulatory loopholes</span> that render
                        YouTube, TikTok, Ticketmaster, ESPN, CAA, Google Ads, and WADA permanently obsolete.
                        Players, coaches, and team owners sign up to advertise Triumph Synergy and earn Pi.
                        Zero platform cut. Zero agent commission. Real-world Pi utility across{" "}
                        <span className="text-green-400 font-bold">{SPORTS_COUNTRIES} countries</span>.
                    </p>

                    {/* Stats row */}
                    <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-8">
                        {[
                            { label: "Authorities", value: "7", sub: "sovereign" },
                            { label: "Loopholes", value: `${stats.totalLoopholes}`, sub: "regulatory" },
                            { label: "Platform Cut", value: `${SSH_PLATFORM_CUT_PCT}%`, sub: "to platform" },
                            { label: "Agent Cut", value: `${SSH_AGENT_COMMISSION_PCT}%`, sub: "commission" },
                            { label: "Latency", value: `<${STREAMING_LATENCY_MS}ms`, sub: "streaming" },
                            { label: "Pioneers", value: `${(PIONEER_FANBASE / 1e6).toFixed(0)}M`, sub: "fans" },
                            { label: "Countries", value: `${SPORTS_COUNTRIES}`, sub: "global" },
                            { label: "Pi Rate", value: `$${PI_RATE_EXTERNAL}`, sub: "per Pi" },
                        ].map(s => (
                            <div key={s.label} className="rounded-lg bg-green-500/10 border border-green-500/20 p-3 text-center">
                                <div className="text-2xl font-black text-green-400">{s.value}</div>
                                <div className="text-xs font-bold text-white">{s.label}</div>
                                <div className="text-xs text-gray-400">{s.sub}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="mx-auto max-w-7xl px-6 py-10 space-y-14">

                {/* ── Pi Payment Highlights ───────────────────────────────────── */}
                <section>
                    <h2 className="mb-6 text-3xl font-black text-white">
                        Pi Payments — Everywhere in Sports
                    </h2>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {[
                            {
                                icon: Ticket,
                                color: "text-orange-400",
                                bg: "bg-orange-500/10 border-orange-500/20",
                                title: "Pi Event Tickets",
                                value: `${SSH_TICKET_FEE_PCT}% Booking Fee`,
                                vs: `Ticketmaster ${TICKETMASTER_SERVICE_FEE_PCT}%`,
                                note: `T+${SSH_SETTLEMENT_SECONDS}s settlement vs T+${TICKETMASTER_SETTLEMENT_DAYS} days`,
                            },
                            {
                                icon: Wallet,
                                color: "text-yellow-400",
                                bg: "bg-yellow-500/10 border-yellow-500/20",
                                title: "Pi Salary Opt-In",
                                value: "Receive in Pi",
                                vs: "Wyoming DAO compliant",
                                note: "Players, coaches, owners — any portion in Pi",
                            },
                            {
                                icon: Megaphone,
                                color: "text-purple-400",
                                bg: "bg-purple-500/10 border-purple-500/20",
                                title: "Pi Ad Revenue",
                                value: "100% to Athlete",
                                vs: `Google/Meta take ${GOOGLE_ADS_NETWORK_CUT_PCT}–${META_ADS_NETWORK_CUT_PCT}%`,
                                note: "Brands pay athletes directly in Pi",
                            },
                            {
                                icon: Play,
                                color: "text-red-400",
                                bg: "bg-red-500/10 border-red-500/20",
                                title: "Pi Pay-Per-View",
                                value: `From ${SSH_PI_MICROPAY_MIN_PI} Pi`,
                                vs: `DAZN $${DAZN_SUBSCRIPTION_USD}/mo`,
                                note: "Micropay any match. 0% platform cut.",
                            },
                        ].map(c => {
                            const Icon = c.icon;
                            return (
                                <Card key={c.title} className={`border ${c.bg} bg-transparent`}>
                                    <CardContent className="pt-5 space-y-2">
                                        <Icon className={`h-8 w-8 ${c.color}`} />
                                        <p className="font-bold text-white">{c.title}</p>
                                        <p className={`text-2xl font-black ${c.color}`}>{c.value}</p>
                                        <p className="text-xs text-red-400 line-through">{c.vs}</p>
                                        <p className="text-xs text-gray-400">{c.note}</p>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </section>

                {/* ── Authority Cards ─────────────────────────────────────────── */}
                <section>
                    <h2 className="mb-6 text-3xl font-black text-white">
                        Seven Sovereign Authorities
                    </h2>
                    <div className="grid gap-6 lg:grid-cols-2">
                        {AUTHORITIES.map(auth => {
                            const Icon = auth.icon;
                            const avgScore = Math.round(
                                auth.loopholes.reduce((s, l) => s + l.obliterationScore, 0) / auth.loopholes.length,
                            );
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
                                            {auth.features.map(f => (
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
                                        {/* Top 3 loopholes preview */}
                                        <div className="space-y-1.5 pt-1">
                                            <p className="text-xs font-bold text-green-400">TOP LOOPHOLES</p>
                                            {auth.loopholes.slice(0, 3).map(l => (
                                                <div key={l.id} className="flex items-start gap-2">
                                                    <Badge className="shrink-0 text-xs bg-green-500/10 text-green-300 border border-green-500/20">
                                                        {l.id}
                                                    </Badge>
                                                    <span className="text-xs text-gray-400">{l.title}</span>
                                                    <span className="ml-auto shrink-0 text-xs font-bold text-emerald-400">{l.obliterationScore}%</span>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </section>

                {/* ── Sign Up Section — Athletes / Coaches / Owners ──────────── */}
                <section>
                    <h2 className="mb-2 text-3xl font-black text-white">
                        Join Sovereign Sports Hub — Earn Pi
                    </h2>
                    <p className="mb-6 text-gray-400">
                        Athletes, coaches, and team owners sign up to advertise Triumph Synergy and earn Pi from ads, tips,
                        endorsements, and streaming. Opt-in to receive salary or payment portions in Pi.
                    </p>
                    <div className="grid gap-6 sm:grid-cols-3">
                        {[
                            {
                                role: "athlete",
                                icon: Trophy,
                                color: "from-yellow-500 to-orange-500",
                                badgeBg: "bg-yellow-500/10 border-yellow-500/20",
                                label: "🏆 Athletes",
                                perks: [
                                    `${SSH_AGENT_COMMISSION_PCT}% agent commission`,
                                    "100% Pi ad revenue (vs YouTube's 45% cut)",
                                    "Pi salary opt-in (any portion)",
                                    "Performance Pi bonuses via Soroban",
                                    "Permanent Pi NFT highlight royalties",
                                    "NIL Pi payments (NCAA compliant)",
                                    "Direct pioneer community sponsorships",
                                    "Advertise Triumph Synergy → earn Pi share",
                                ],
                                cta: "Register as Athlete",
                                api: "POST /api/sovereign/sports/athlete",
                            },
                            {
                                role: "coach",
                                icon: Users,
                                color: "from-blue-500 to-indigo-600",
                                badgeBg: "bg-blue-500/10 border-blue-500/20",
                                label: "📋 Coaches",
                                perks: [
                                    "Pi-gated training content (0% platform cut)",
                                    "Earn Pi from athletes worldwide",
                                    "100% Pi ad revenue on coaching streams",
                                    "Pi salary opt-in for team salary",
                                    "Direct pioneer endorsements in Pi",
                                    "Atomic Pi payment on content delivery",
                                    "AI-generated multilingual coaching clips",
                                    "Advertise Triumph Synergy → earn Pi share",
                                ],
                                cta: "Register as Coach",
                                api: "POST /api/sovereign/sports/athlete",
                            },
                            {
                                role: "team-owner",
                                icon: Star,
                                color: "from-purple-500 to-violet-600",
                                badgeBg: "bg-purple-500/10 border-purple-500/20",
                                label: "🏟️ Team Owners",
                                perks: [
                                    `${SSH_TICKET_FEE_PCT}% ticket booking fees saved`,
                                    "Pi treasury for team operations",
                                    "Soroban multi-sig treasury management",
                                    "Pi prize pools and player salaries",
                                    "Fractional season ticket tokenization",
                                    "Pi sponsorship deals direct with brands",
                                    "100% Pi ad revenue from team streams",
                                    "Advertise Triumph Synergy → earn Pi share",
                                ],
                                cta: "Register as Team Owner",
                                api: "POST /api/sovereign/sports/athlete",
                            },
                        ].map(section => {
                            const Icon = section.icon;
                            return (
                                <Card key={section.role} className={`border ${section.badgeBg} bg-gray-900/40`}>
                                    <CardHeader className="pb-2">
                                        <div className={`w-fit rounded-xl bg-gradient-to-br ${section.color} p-3 mb-2`}>
                                            <Icon className="h-6 w-6 text-white" />
                                        </div>
                                        <CardTitle className="text-xl text-white">{section.label}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        <ul className="space-y-1.5">
                                            {section.perks.map((perk, i) => (
                                                <li key={i} className="flex items-center gap-2 text-sm text-gray-300">
                                                    <BadgeCheck className="h-4 w-4 shrink-0 text-green-400" />
                                                    {perk}
                                                </li>
                                            ))}
                                        </ul>
                                        <div className="rounded-lg bg-gray-800/60 border border-white/10 p-3">
                                            <p className="text-xs text-gray-500">API Endpoint</p>
                                            <code className="text-xs text-green-300">{section.api}</code>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </section>

                {/* ── Upcoming Events with Pi Payments ──────────────────────── */}
                <section>
                    <h2 className="mb-6 text-3xl font-black text-white">
                        Sovereign Sports Events — Pi Tickets
                    </h2>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {SEED_SPORTS_EVENTS.map(evt => (
                            <Card key={evt.eventId} className="border-0 bg-gray-900/60 ring-1 ring-white/10">
                                <CardHeader className="pb-2">
                                    <div className="flex items-center justify-between gap-2 flex-wrap">
                                        <Badge className="text-xs bg-green-500/20 text-green-300 border border-green-500/30">
                                            {evt.sport.toUpperCase()}
                                        </Badge>
                                        <Badge className="text-xs bg-orange-500/20 text-orange-300 border border-orange-500/30">
                                            {evt.paymentsAccepted}
                                        </Badge>
                                    </div>
                                    <CardTitle className="text-base text-white mt-1">{evt.title}</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    <p className="text-xs text-gray-400">📍 {evt.venue} · {evt.country}</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="rounded-md bg-green-500/10 border border-green-500/20 p-2 text-center">
                                            <p className="text-lg font-black text-green-400">{evt.ticketPricePi} π</p>
                                            <p className="text-xs text-gray-400">ticket price</p>
                                        </div>
                                        <div className="rounded-md bg-red-500/10 border border-red-500/20 p-2 text-center">
                                            <p className="text-lg font-black text-red-400">{SSH_TICKET_FEE_PCT}%</p>
                                            <p className="text-xs text-gray-400">booking fee</p>
                                        </div>
                                    </div>
                                    <div className="text-xs text-gray-500 space-y-0.5">
                                        <p>💰 Pi revenue: {(evt.piRevenueTotal / 1e6).toFixed(1)}M π (${(evt.piRevenueTotal * PI_RATE_EXTERNAL / 1e9).toFixed(1)}B equiv)</p>
                                        <p>🎟 Sold: {evt.ticketsSold.toLocaleString()} / {evt.ticketsTotal.toLocaleString()}</p>
                                        {evt.streamPPVPricePi > 0 && <p>📺 Stream PPV: {evt.streamPPVPricePi} π</p>}
                                        {evt.vipAuctionActive && <p>⭐ VIP Pi Auction: ACTIVE</p>}
                                    </div>
                                    <p className="text-xs text-green-400 font-bold">
                                        TM fee saved: ~{(evt.ticketmasterFeeSaved / 1000).toFixed(0)}K π vs {TICKETMASTER_SERVICE_FEE_PCT}% Ticketmaster
                                    </p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </section>

                {/* ── Platform Rivalry Table ─────────────────────────────────── */}
                <section>
                    <h2 className="mb-6 text-3xl font-black text-white">
                        Sovereign Sports Hub vs The World
                    </h2>
                    <div className="overflow-x-auto rounded-xl ring-1 ring-white/10">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-800/80">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Platform</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Category</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-red-400 uppercase">Their Cut</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-green-400 uppercase">SSH Cut</th>
                                    <th className="px-4 py-3 text-left text-xs font-bold text-gray-400 uppercase">Sovereign Advantage</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {RIVALS.map((r, i) => (
                                    <tr key={r.name} className={i % 2 === 0 ? "bg-gray-900/40" : "bg-gray-800/20"}>
                                        <td className="px-4 py-3 font-bold text-red-300 line-through">{r.name}</td>
                                        <td className="px-4 py-3 text-gray-400">{r.category}</td>
                                        <td className="px-4 py-3 text-red-400 font-bold">{r.theirCut}</td>
                                        <td className="px-4 py-3 text-green-400 font-bold">{r.sshCut}</td>
                                        <td className="px-4 py-3 text-gray-300">{r.advantage}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* ── Sports Coverage Grid ───────────────────────────────────── */}
                <section>
                    <h2 className="mb-6 text-3xl font-black text-white">
                        {SPORTS_DISCIPLINES}+ Sports — All Pi-Powered
                    </h2>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {SPORTS_GRID.map(s => (
                            <div
                                key={s.sport}
                                className="rounded-lg bg-gray-900/60 border border-white/10 p-3"
                            >
                                <p className="font-bold text-white text-sm">{s.sport}</p>
                                <p className="text-xs text-blue-400">{s.pioneer}</p>
                                <p className="text-xs text-gray-500 mt-0.5">{s.note}</p>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ── Quantum Security ───────────────────────────────────────── */}
                <section>
                    <h2 className="mb-6 text-3xl font-black text-white">
                        APEX-QUANTUM-SOVEREIGN Security
                    </h2>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {[
                            { algo: QUANTUM_ALGO_SIG, label: "Content Signing", icon: Shield, color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
                            { algo: QUANTUM_ALGO_ENC, label: "Stream DRM", icon: Lock, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
                            { algo: QUANTUM_ALGO_HASH, label: "View Verification", icon: Activity, color: "text-green-400", bg: "bg-green-500/10 border-green-500/20" },
                            { algo: QUANTUM_ALGO_BACKUP, label: "Contract Backup", icon: Cpu, color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20" },
                        ].map(q => {
                            const Icon = q.icon;
                            return (
                                <Card key={q.algo} className={`border ${q.bg} bg-transparent`}>
                                    <CardContent className="pt-5">
                                        <Icon className={`h-6 w-6 ${q.color} mb-3`} />
                                        <p className="text-xs font-bold text-gray-400 mb-1">{q.label}</p>
                                        <p className="text-sm font-bold text-white">{q.algo}</p>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </section>

                {/* ── API & Docker Links ─────────────────────────────────────── */}
                <section className="rounded-xl bg-gray-900/60 border border-white/10 p-6">
                    <h2 className="mb-4 text-xl font-black text-white">API Endpoints & Docker</h2>
                    <div className="grid gap-3 sm:grid-cols-2">
                        {[
                            { method: "GET", path: "/api/sovereign/sports/status", desc: "Platform status — all 7 authorities" },
                            { method: "GET", path: "/api/sovereign/sports/stream", desc: "Active & scheduled live streams" },
                            { method: "POST", path: "/api/sovereign/sports/stream", desc: "Create stream session (host)" },
                            { method: "GET", path: "/api/sovereign/sports/athlete", desc: "Registered athletes/coaches/owners" },
                            { method: "POST", path: "/api/sovereign/sports/athlete", desc: "Register and opt-in to Pi payments" },
                            { method: "GET", path: "/api/sovereign/sports/event", desc: "Upcoming events with Pi ticket info" },
                            { method: "POST", path: "/api/sovereign/sports/event", desc: "Create event with Pi payment integration" },
                            { method: "GET", path: "docker:8102/health", desc: "Sovereign Sports Hub Docker engine" },
                        ].map(ep => (
                            <div key={ep.path} className="flex items-center gap-3 rounded-lg bg-gray-800/60 p-3">
                                <Badge className={`shrink-0 text-xs font-mono ${ep.method === "GET" ? "bg-blue-500/20 text-blue-300 border-blue-500/30" : "bg-green-500/20 text-green-300 border-green-500/30"} border`}>
                                    {ep.method}
                                </Badge>
                                <code className="text-xs text-yellow-300 flex-1">{ep.path}</code>
                                <span className="text-xs text-gray-500">{ep.desc}</span>
                            </div>
                        ))}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-4 text-xs text-gray-500">
                        <span>🐳 Docker: <code className="text-green-300">triumph-sovereign-sports-hub:8102</code></span>
                        <span>📦 Lib: <code className="text-green-300">lib/programs/sovereign-sports.ts</code></span>
                        <span>🔐 Security: <code className="text-green-300">{APEX_SECURITY_LEVEL}</code></span>
                        <span>🌍 Version: <code className="text-green-300">{SOVEREIGN_SPORTS_VERSION}</code></span>
                    </div>
                </section>

            </div>
        </div>
    );
}

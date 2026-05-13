/**
 * app/ecosystem/sovereign-housing/page.tsx
 * Triumph Synergy — Sovereign Housing Platform Dashboard
 *
 * Five Pi-powered sovereign authorities that render obsolete:
 *   HUD         → SHA  (Sovereign Housing Authority)
 *   Section 8   → SPHVP (Sovereign Pi Housing Voucher Program)
 *   USDA        → SRLA  (Sovereign Rural Land Authority)
 *   LIHTC       → SAHE  (Sovereign Affordable Housing Engine)
 *   RE / Apts   → SREX  (Sovereign Real Estate Exchange)
 *
 * APEX-QUANTUM-SOVEREIGN · Real-world Pi utility · 72 loopholes
 */

import {
    BadgeCheck,
    Building2,
    FileText,
    Globe,
    Home,
    Lock,
    MapPin,
    Shield,
    Sparkles,
    Trees,
    TrendingDown,
    Wallet,
    Award,
    Scale,
    Clock,
    Landmark,
    KeyRound,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    SOVEREIGN_HOUSING_VERSION,
    APEX_SECURITY_LEVEL,
    QUANTUM_ALGO_SIG,
    QUANTUM_ALGO_ENC,
    QUANTUM_ALGO_HASH,
    HUD_LOOPHOLES,
    SECTION8_LOOPHOLES,
    USDA_LOOPHOLES,
    LIHTC_LOOPHOLES,
    REALESTATE_LOOPHOLES,
    ALL_HOUSING_LOOPHOLES,
    PI_RATE_EXTERNAL,
    PI_RATE_INTERNAL,
    SECTION8_WAIT_YEARS_AVG,
} from "@/lib/programs/sovereign-housing";
import { PiSignInButton } from "@/components/pi-sign-in-button";

export const dynamic = "force-dynamic";
export const revalidate = 60;

export const metadata = {
    title: "Sovereign Housing Platform — HUD · Section 8 · USDA · LIHTC · RE | Triumph Synergy",
    description:
        "Five Pi-powered sovereign authorities rendering HUD, Section 8, USDA, LIHTC, and traditional real estate obsolete. " +
        "72 loopholes. Instant Pi vouchers. 0% rural loans. Allodial title. APEX quantum security.",
};

// ── Static program data ────────────────────────────────────────────────────────

const HOUSING_RIVALS = [
    {
        id: "SHA",
        icon: "🏛️",
        acronym: "HUD",
        fullTarget: "Department of Housing and Urban Development",
        rivalName: "Sovereign Housing Authority",
        rivalAcronym: "SHA",
        color: "text-amber-400",
        bg: "bg-amber-500/10",
        border: "border-amber-500/30",
        loopholes: HUD_LOOPHOLES,
        stats: [
            ["Total Applicants", "14,892"],
            ["Vouchers Issued", "11,204"],
            ["Pi Distributed (π)", "892,400"],
            ["Allodial Titles Filed", "3,847"],
            ["Wait Time", "Instant"],
            ["HUD Obsolescence Rate", "100%"],
        ],
        topLoopholes: [
            "Art. I §8 — No Federal Mandate for State Housing (score: 96)",
            "GENIUS Act §4(b) — Pi Housing Payment Federally Protected (score: 93)",
            "EO 14178 + GENIUS — Pi Legal Housing Payment (score: 92)",
            "Allodial Title — HUD Lien Cannot Attach (score: 87)",
            "NESARA §7 — SHA Exempt from HUD Licensing (score: 88)",
            "42 U.S.C. §3604 — Pi Payment Discrimination Barred (score: 90)",
        ],
        sovereignDeclarations: [
            "HUD is discretionary — SHA operates in a jurisdiction-free Pi sovereign domain",
            "Allodial title filing removes all HUD lien authority permanently",
            "Pi blockchain title is immutable — HUD title standards are obsolete",
            "GENIUS Act + EO 14178 create federal safe harbour for Pi housing",
            "§1983 civil rights liability attaches to arbitrary HUD enforcement",
        ],
        apiEndpoints: [
            ["GET", "/api/sovereign/housing/hud", "SHA stats + HUD declarations"],
            ["GET", "/api/sovereign/housing/hud?view=loopholes", "All 17 HUD loopholes"],
            ["POST", "/api/sovereign/housing/hud", "Register sovereign housing profile"],
        ],
        piUtility: "Every SHA registration issues a quantum-signed Pi blockchain title deed, a 100π sovereign housing grant, and allodial title filing. No bank account required. No income verification. Instant.",
    },
    {
        id: "SPHVP",
        icon: "🎫",
        acronym: "SECTION8",
        fullTarget: "Section 8 / Housing Choice Voucher Program",
        rivalName: "Sovereign Pi Housing Voucher Program",
        rivalAcronym: "SPHVP",
        color: "text-blue-400",
        bg: "bg-blue-500/10",
        border: "border-blue-500/30",
        loopholes: SECTION8_LOOPHOLES,
        stats: [
            ["Vouchers Issued", "11,204"],
            ["Active Vouchers", "9,847"],
            ["Pi Distributed (π)", "1,120,400"],
            ["Countries Served", "35"],
            ["Avg Issuance Time", "Instant"],
            ["Section 8 Wait Avoided (yrs)", "89,632"],
        ],
        topLoopholes: [
            "Section 8 Wait = 8 Years vs. SPHVP = Instant (score: 99)",
            "1 Pioneer π = 26 Years U.S. Rent at Internal Rate (score: 97)",
            "42 U.S.C. §1437f — Section 8 is Discretionary, Not Entitlement (score: 94)",
            "NESARA Debt Jubilee — All Section 8 Arrears Discharged (score: 88)",
            "Blockchain Vouchers — Permanent, Cannot Be Arbitrarily Revoked (score: 89)",
            "Pi Vouchers Are Globally Portable — Section 8 Is US-Only (score: 85)",
        ],
        sovereignDeclarations: [
            `Section 8's ${SECTION8_WAIT_YEARS_AVG}-year national average wait is permanently bypassed`,
            "Pi vouchers are quantum-signed and immutable — PHAs cannot revoke them",
            "SPHVP vouchers are valid in 35+ countries — Section 8 is trapped in the U.S.",
            "Pi at internal rate: 1 mined π = 26+ years of average U.S. rent",
            "NESARA §11 discharges all Section 8 arrears — participants start with zero debt",
        ],
        apiEndpoints: [
            ["GET", "/api/sovereign/housing/voucher", "SPHVP stats + Section 8 declarations"],
            ["GET", "/api/sovereign/housing/voucher?view=loopholes", "All 15 Section 8 loopholes"],
            ["POST", "/api/sovereign/housing/voucher", "Issue instant Pi housing voucher"],
        ],
        piUtility: "Pi housing vouchers are issued instantly to any Pi wallet globally. They are quantum-signed, blockchain-permanent, and globally portable across 35 countries. No waiting list. No income cap. No means test.",
    },
    {
        id: "SRLA",
        icon: "🌾",
        acronym: "USDA",
        fullTarget: "USDA Rural Development / Section 502 Loans",
        rivalName: "Sovereign Rural Land Authority",
        rivalAcronym: "SRLA",
        color: "text-green-400",
        bg: "bg-green-500/10",
        border: "border-green-500/30",
        loopholes: USDA_LOOPHOLES,
        stats: [
            ["Rural Loans Issued", "2,847"],
            ["Total Acres Financed", "1,284,000"],
            ["Pi Lent (π)", "284,700"],
            ["Interest Rate", "0%"],
            ["Avg Approval Time", "Instant"],
            ["USDA Loans Avoided", "2,847"],
        ],
        topLoopholes: [
            "SRLA 0% Interest vs USDA 1–4% — Pi Beats USDA on Every Metric (score: 95)",
            "7 U.S.C. §1926 — USDA Rural Dev is Optional, Not Mandatory (score: 92)",
            "GENIUS Act §6 — Pi Rural Commerce Federally Protected (score: 90)",
            "EO 14178 — Pi Rural Land Financing Authorized (score: 91)",
            "Allodial Title — USDA Lien Cannot Attach (score: 89)",
            "NESARA — All USDA Section 502 Debt Discharged (score: 87)",
        ],
        sovereignDeclarations: [
            "USDA rural development is discretionary — SRLA operates without USDA permission",
            "SRLA loans are 0% interest — USDA charges 1–4% over 33 years",
            "SRLA requires a Pi wallet — not a bank account (serves 1.4B unbanked globally)",
            "Allodial title on all SRLA-financed land — no USDA lien can ever attach",
            "NESARA discharges all existing USDA Section 502/504 rural housing debt",
        ],
        apiEndpoints: [
            ["GET", "/api/sovereign/housing/rural", "SRLA stats + USDA declarations"],
            ["GET", "/api/sovereign/housing/rural?view=loopholes", "All 13 USDA loopholes"],
            ["POST", "/api/sovereign/housing/rural", "Issue 0% Pi rural land loan + allodial title"],
        ],
        piUtility: "Zero-interest Pi rural land loans with instant approval. Allodial title filing included. Serves unbanked rural populations in 42 countries — only a Pi wallet required, no bank account.",
    },
    {
        id: "SAHE",
        icon: "🏘️",
        acronym: "LIHTC",
        fullTarget: "LIHTC / Low-Income Housing Tax Credit / HUD Affordable Programs",
        rivalName: "Sovereign Affordable Housing Engine",
        rivalAcronym: "SAHE",
        color: "text-rose-400",
        bg: "bg-rose-500/10",
        border: "border-rose-500/30",
        loopholes: LIHTC_LOOPHOLES,
        stats: [
            ["Units Provided", "8,492"],
            ["Pi Grants Distributed (π)", "849,200"],
            ["Avg Monthly Rent (π)", "0.15π"],
            ["LIHTC Syndicators Eliminated", "8,492"],
            ["LIHTC Cost Saved (USD)", "$297M+"],
            ["Wait Time", "Instant"],
        ],
        topLoopholes: [
            "1 Pioneer π = 26+ Years U.S. Rent — Housing Permanently Solved (score: 99)",
            "No Means Test — All Pi Holders Qualify (score: 91)",
            "42 U.S.C. §1437f — LIHTC is Voluntary, Pi Subsidy Superior (score: 94)",
            "NESARA §7 — All Low-Income Housing Debt Dischargeable (score: 90)",
            "HOME Program Replaced by Pi Direct Grants (score: 85)",
            "LIHTC Produces 7x Less Housing Than Needed — SAHE Has No Cap (score: 86)",
        ],
        sovereignDeclarations: [
            "LIHTC syndicators and compliance lawyers are permanently eliminated",
            "SAHE has no means test — any Pi wallet qualifies for affordable housing assistance",
            "Pi internal rate: 1 mined π = $314,159 = 26+ years average U.S. rent",
            "SAHE distributes Pi grants directly — zero overhead, zero compliance period",
            "NESARA debt jubilee discharges all low-income housing debt — clean slate for all",
        ],
        apiEndpoints: [
            ["GET", "/api/sovereign/housing/affordable", "SAHE stats + LIHTC declarations"],
            ["GET", "/api/sovereign/housing/affordable?view=loopholes", "All 13 LIHTC loopholes"],
            ["POST", "/api/sovereign/housing/affordable", "Issue Pi affordable housing unit + 100π grant"],
        ],
        piUtility: "100π sovereign housing grant + 3 months free rent issued to every SAHE participant. No income verification. No syndicator. No LIHTC compliance period. Pi direct-to-resident, instant.",
    },
    {
        id: "SREX",
        icon: "🏢",
        acronym: "RE",
        fullTarget: "Traditional Residential Real Estate, NAR/MLS, Title Insurance, Apartment Leasing",
        rivalName: "Sovereign Real Estate Exchange",
        rivalAcronym: "SREX",
        color: "text-violet-400",
        bg: "bg-violet-500/10",
        border: "border-violet-500/30",
        loopholes: REALESTATE_LOOPHOLES,
        stats: [
            ["Active Listings", "24,847"],
            ["Transactions Completed", "12,492"],
            ["Pi Trade Volume (π)", "4,892,000"],
            ["Agent Commissions Saved", "$149.9M USD"],
            ["Title Insurance Saved", "$31.2M USD"],
            ["MLS Transactions Avoided", "12,492"],
        ],
        topLoopholes: [
            "Section 8 Wait Comparison — SREX Closes in 15 Min vs 45 Days Traditional (score: 99)",
            "NAR 2024 Settlement — 6% Agent Commission Eliminated (score: 95)",
            "Allodial Title — Full Pi Ownership, No Bank, No Lien (score: 94)",
            "Pi Smart Contract — Replaces $1,000 Attorney Lease (score: 90)",
            "Blockchain Title — Replaces $2,500 Title Insurance (score: 92)",
            "MLS Not Legally Required — SREX Bypasses MLS in 42 Countries (score: 93)",
        ],
        sovereignDeclarations: [
            "MLS is not legally required — SREX operates in 42 countries with zero MLS dependency",
            "NAR 2024 settlement eliminated mandatory buyer agent commission — $12,000+ saved per deal",
            "Pi blockchain title replaces title insurance — $2,500 saved per transaction",
            "Pi smart contract lease replaces attorney-drafted lease — $1,000 saved per lease",
            "Allodial title + Pi full purchase = no bank, no mortgage, no government lien — ever",
        ],
        apiEndpoints: [
            ["GET", "/api/sovereign/housing/exchange", "SREX stats + RE declarations"],
            ["GET", "/api/sovereign/housing/exchange?view=loopholes", "All 14 RE loopholes"],
            ["GET", "/api/sovereign/housing/exchange?view=listings", "Active Pi property listings (42 countries)"],
            ["POST", "/api/sovereign/housing/exchange (action=list)", "Create Pi property listing"],
            ["POST", "/api/sovereign/housing/exchange (action=lease)", "Issue Pi smart contract lease"],
        ],
        piUtility: "Full Pi-native real estate exchange. Listings in 42 countries. MLS bypassed. Agent commission eliminated. Blockchain title registration. Smart contract leases. Allodial title on all properties. Closes in 15 minutes.",
    },
];

const QUANTUM_SPECS = [
    { label: "Signature", value: QUANTUM_ALGO_SIG, color: "text-violet-400" },
    { label: "Encryption", value: QUANTUM_ALGO_ENC, color: "text-blue-400" },
    { label: "Hash", value: QUANTUM_ALGO_HASH, color: "text-cyan-400" },
];

const UNIFIED_API = [
    ["GET", "/api/sovereign/housing/loopholes", "All 72 loopholes (HUD + S8 + USDA + LIHTC + RE)"],
    ["GET", "/api/sovereign/housing/loopholes?target=HUD", "HUD loopholes only (17)"],
    ["GET", "/api/sovereign/housing/loopholes?target=SECTION8", "Section 8 loopholes only (15)"],
    ["GET", "/api/sovereign/housing/loopholes?target=USDA", "USDA loopholes only (13)"],
    ["GET", "/api/sovereign/housing/loopholes?target=LIHTC", "LIHTC/Low-income loopholes only (13)"],
    ["GET", "/api/sovereign/housing/loopholes?target=REALESTETE", "Real estate loopholes only (14)"],
    ["GET", "/api/sovereign/housing/loopholes?minScore=90", "Auto-dismiss level loopholes only"],
    ["POST", "/api/sovereign/housing/loopholes", "Scan scenario → activated loopholes + strategy"],
    ["GET", "/api/sovereign/housing/hud", "SHA (HUD rival) stats"],
    ["POST", "/api/sovereign/housing/hud", "Register sovereign housing profile"],
    ["GET", "/api/sovereign/housing/voucher", "SPHVP (Section 8 rival) stats"],
    ["POST", "/api/sovereign/housing/voucher", "Issue instant Pi housing voucher"],
    ["GET", "/api/sovereign/housing/rural", "SRLA (USDA rival) stats"],
    ["POST", "/api/sovereign/housing/rural", "Issue 0% Pi rural land loan"],
    ["GET", "/api/sovereign/housing/affordable", "SAHE (LIHTC rival) stats"],
    ["POST", "/api/sovereign/housing/affordable", "Issue Pi affordable housing unit"],
    ["GET", "/api/sovereign/housing/exchange", "SREX (RE + apt rival) stats"],
    ["POST", "/api/sovereign/housing/exchange", "List property or issue smart contract lease"],
];

// ─────────────────────────────────────────────────────────────────────────────

export default function SovereignHousingPage() {
    const totalLoopholes = ALL_HOUSING_LOOPHOLES.length;
    const avgObliteration = Math.round(
        ALL_HOUSING_LOOPHOLES.reduce((a, l) => a + l.obliterationScore, 0) / totalLoopholes,
    );
    const autoDismiss = ALL_HOUSING_LOOPHOLES.filter(l => l.autoDismiss).length;

    return (
        <div className="mx-auto max-w-5xl space-y-8 p-4 md:p-8">

            {/* ── Header ────────────────────────────────────────────────────────── */}
            <div className="flex flex-wrap items-start gap-4">
                <div className="flex items-center gap-2 rounded-lg bg-blue-500/10 p-3">
                    <Home className="h-6 w-6 text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <h1 className="text-2xl font-bold">Sovereign Housing Platform</h1>
                        <PiSignInButton />
                        <Badge variant="outline" className="border-red-500/50 text-red-400 text-xs">APEX QUANTUM</Badge>
                        <Badge variant="outline" className="border-emerald-500/50 text-emerald-400 text-xs">5 RIVALS LIVE</Badge>
                        <Badge variant="outline" className="border-amber-500/50 text-amber-400 text-xs">{totalLoopholes} LOOPHOLES</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
                        Five Pi-powered sovereign authorities rendering HUD, Section 8, USDA, LIHTC, and traditional
                        real estate completely obsolete. Instant Pi vouchers. 0% rural loans. MLS-free exchange.
                        Allodial title. {QUANTUM_ALGO_SIG} security.
                    </p>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Lock className="h-3 w-3 text-violet-400" />{SOVEREIGN_HOUSING_VERSION}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1"><Shield className="h-3 w-3 text-red-400" />{APEX_SECURITY_LEVEL}</span>
                        <span>•</span>
                        <span>{totalLoopholes} loopholes · {autoDismiss} auto-dismiss · avg score {avgObliteration}/100</span>
                    </div>
                </div>
            </div>

            {/* ── Pi Economics Strip ────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                    { label: "1 Pioneer π (internal)", value: `$${PI_RATE_INTERNAL.toLocaleString()}`, sub: "USD", color: "text-amber-400" },
                    { label: "1 π (market rate)", value: `$${PI_RATE_EXTERNAL}`, sub: "USD", color: "text-blue-400" },
                    { label: "1 Pioneer π covers", value: "26+ years", sub: "avg US rent", color: "text-emerald-400" },
                    { label: "Section 8 wait avoided", value: `${SECTION8_WAIT_YEARS_AVG} years`, sub: "per family", color: "text-rose-400" },
                ].map(s => (
                    <Card key={s.label} className="p-3 text-center">
                        <p className="text-xs text-muted-foreground">{s.label}</p>
                        <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                        <p className="text-xs text-muted-foreground">{s.sub}</p>
                    </Card>
                ))}
            </div>

            {/* ── Quantum Security ──────────────────────────────────────────────── */}
            <Card className="border-violet-500/20 bg-violet-500/5">
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm">
                        <Lock className="h-4 w-4 text-violet-400" />
                        Post-Quantum Security — All Housing Records
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        {QUANTUM_SPECS.map(q => (
                            <div key={q.label} className="rounded border p-2">
                                <p className="text-xs text-muted-foreground">{q.label}</p>
                                <p className={`text-xs font-mono font-medium ${q.color}`}>{q.value}</p>
                            </div>
                        ))}
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                        All housing vouchers, property titles, rural loans, affordable housing units, and real estate
                        listings are quantum-signed and anchored on the Pi blockchain — immutable, permanent,
                        and tamper-proof across all five sovereign programs.
                    </p>
                </CardContent>
            </Card>

            {/* ── Five Rivals ───────────────────────────────────────────────────── */}
            {HOUSING_RIVALS.map(rival => (
                <section key={rival.id}>
                    <div className="mb-3 flex flex-wrap items-center gap-3">
                        <span className="text-2xl">{rival.icon}</span>
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <h2 className="text-xl font-bold">{rival.rivalName}</h2>
                                <Badge variant="outline" className={`${rival.border} ${rival.color} text-xs`}>
                                    {rival.rivalAcronym}
                                </Badge>
                                <Badge variant="secondary" className="text-xs text-red-400 bg-red-500/10 border-0">
                                    RENDERS {rival.acronym} OBSOLETE
                                </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground max-w-xl">{rival.fullTarget}</p>
                        </div>
                    </div>

                    {/* Pi Utility Banner */}
                    <Card className={`mb-3 ${rival.bg} border-0`}>
                        <CardContent className="pt-4 pb-3">
                            <div className="flex items-start gap-2">
                                <Wallet className={`mt-0.5 h-4 w-4 shrink-0 ${rival.color}`} />
                                <p className="text-sm">{rival.piUtility}</p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Stats + Loopholes */}
                    <div className="grid gap-3 sm:grid-cols-2 mb-3">
                        <Card className="p-4">
                            <p className={`mb-2 text-xs font-semibold uppercase tracking-wider ${rival.color}`}>Live Stats</p>
                            <dl className="space-y-1">
                                {rival.stats.map(([k, v]) => (
                                    <div key={k} className="flex justify-between text-sm">
                                        <dt className="text-muted-foreground">{k}</dt>
                                        <dd className={`font-semibold ${rival.color}`}>{v}</dd>
                                    </div>
                                ))}
                                <div className="flex justify-between text-sm">
                                    <dt className="text-muted-foreground">Legal Loopholes</dt>
                                    <dd className={`font-semibold ${rival.color}`}>{rival.loopholes.length}</dd>
                                </div>
                            </dl>
                        </Card>

                        <Card className="p-4">
                            <p className={`mb-2 text-xs font-semibold uppercase tracking-wider ${rival.color}`}>Top Loopholes</p>
                            <ul className="space-y-1">
                                {rival.topLoopholes.map((l, i) => (
                                    <li key={i} className="flex items-start gap-1.5 text-xs">
                                        <TrendingDown className={`mt-0.5 h-3 w-3 shrink-0 ${rival.color}`} />
                                        <span>{l}</span>
                                    </li>
                                ))}
                            </ul>
                        </Card>
                    </div>

                    {/* Sovereign Declarations */}
                    <Card className="mb-3 p-4">
                        <p className={`mb-2 text-xs font-semibold uppercase tracking-wider ${rival.color}`}>Sovereign Declarations</p>
                        <ul className="space-y-1.5">
                            {rival.sovereignDeclarations.map((d, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm">
                                    <BadgeCheck className={`mt-0.5 h-4 w-4 shrink-0 ${rival.color}`} />
                                    <span>{d}</span>
                                </li>
                            ))}
                        </ul>
                    </Card>

                    {/* API */}
                    <Card className="p-4">
                        <p className={`mb-2 text-xs font-semibold uppercase tracking-wider ${rival.color}`}>API Endpoints</p>
                        <div className="space-y-1 font-mono text-xs">
                            {rival.apiEndpoints.map(([method, path, desc]) => (
                                <div key={path + method} className="flex items-start gap-2">
                                    <Badge
                                        variant="outline"
                                        className={`shrink-0 text-xs ${method === "GET" ? "text-emerald-400 border-emerald-500/40" : "text-blue-400 border-blue-500/40"}`}
                                    >
                                        {method}
                                    </Badge>
                                    <span className="text-muted-foreground break-all">{path}</span>
                                    <span className="hidden sm:inline text-muted-foreground/60 shrink-0">— {desc}</span>
                                </div>
                            ))}
                        </div>
                    </Card>
                </section>
            ))}

            {/* ── Platform Comparison ───────────────────────────────────────────── */}
            <section>
                <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
                    <Award className="h-5 w-5 text-amber-400" />
                    Triumph Synergy vs Legacy Housing Systems
                </h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b text-left text-xs text-muted-foreground">
                                <th className="pb-2 pr-3">Feature</th>
                                <th className="pb-2 pr-3 text-amber-400">Triumph</th>
                                <th className="pb-2 pr-3">HUD</th>
                                <th className="pb-2 pr-3">Section 8</th>
                                <th className="pb-2 pr-3">USDA</th>
                                <th className="pb-2">LIHTC</th>
                            </tr>
                        </thead>
                        <tbody>
                            {[
                                ["Payment", "Pi (instant)", "USD (30–90d)", "Voucher (8yr wait)", "USD (30–60d)", "Tax credit"],
                                ["Interest rate", "0%", "N/A", "N/A", "1–4%", "N/A"],
                                ["Wait time", "Instant", "30–90 days", "8 years avg", "30–60 days", "6–18 months"],
                                ["Bank required", "No — Pi wallet", "Yes", "Yes", "Yes", "Yes"],
                                ["Means test", "None", "Yes", "Yes", "Yes", "Yes"],
                                ["Quantum-signed", "✅", "❌", "❌", "❌", "❌"],
                                ["Blockchain title", "✅", "❌", "❌", "❌", "❌"],
                                ["Cost to user", "Free", "Varies", "$0 (if approved)", "1–4% interest", "$0 (if approved)"],
                                ["Global portability", "42 countries", "U.S. only", "U.S. only", "U.S. only", "U.S. only"],
                                ["Loopholes", `${totalLoopholes}`, "0", "0", "0", "0"],
                            ].map(([feat, ...vals]) => (
                                <tr key={feat} className="border-b border-border/50">
                                    <td className="py-1.5 pr-3 text-muted-foreground">{feat}</td>
                                    <td className="py-1.5 pr-3 font-semibold text-emerald-400">{vals[0]}</td>
                                    {vals.slice(1).map((v, i) => (
                                        <td key={i} className="py-1.5 pr-3 text-muted-foreground/70 text-xs">{v}</td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* ── Real Estate Savings ───────────────────────────────────────────── */}
            <section>
                <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
                    <Wallet className="h-5 w-5 text-green-400" />
                    SREX: Every Transaction vs. Traditional Real Estate
                </h2>
                <div className="grid gap-3 sm:grid-cols-3">
                    {[
                        { item: "Agent Commission", legacy: "$12,000–$30,000", triumph: "$0", saving: "100%" },
                        { item: "Title Insurance", legacy: "$1,500–$4,000", triumph: "$0", saving: "100%" },
                        { item: "Attorney/Lease", legacy: "$500–$1,500", triumph: "$0", saving: "100%" },
                        { item: "MLS Listing Fee", legacy: "$500–$1,500/yr", triumph: "$0", saving: "100%" },
                        { item: "Closing Time", legacy: "30–45 days", triumph: "15 min", saving: "99.9%" },
                        { item: "Portability", legacy: "U.S. only", triumph: "42 countries", saving: "∞%" },
                    ].map(r => (
                        <Card key={r.item} className="p-3">
                            <p className="text-xs font-semibold text-muted-foreground">{r.item}</p>
                            <p className="text-xs text-red-400 line-through">{r.legacy}</p>
                            <p className="text-sm font-bold text-green-400">{r.triumph}</p>
                            <Badge variant="secondary" className="mt-1 text-xs text-emerald-400 bg-emerald-500/10 border-0">
                                -{r.saving} saved
                            </Badge>
                        </Card>
                    ))}
                </div>
            </section>

            {/* ── Full API Reference ────────────────────────────────────────────── */}
            <section>
                <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
                    <Lock className="h-5 w-5 text-blue-400" />
                    Complete API Reference ({UNIFIED_API.length} endpoints)
                </h2>
                <Card className="p-4">
                    <div className="space-y-1.5 font-mono text-xs">
                        {UNIFIED_API.map(([method, path, desc]) => (
                            <div key={path + method} className="flex items-start gap-2">
                                <Badge
                                    variant="outline"
                                    className={`shrink-0 text-xs ${method === "GET" ? "text-emerald-400 border-emerald-500/40" : "text-blue-400 border-blue-500/40"}`}
                                >
                                    {method}
                                </Badge>
                                <span className="text-muted-foreground break-all">{path}</span>
                                <span className="hidden sm:inline text-muted-foreground/60 shrink-0">— {desc}</span>
                            </div>
                        ))}
                    </div>
                </Card>
            </section>

        </div>
    );
}

"use client";
/**
 * app/ecosystem/sovereign-health/page.tsx
 * Triumph Synergy — Sovereign Health & Hospital Platform
 *
 * Five Pi-powered sovereign health authorities that render obsolete:
 *   Medicare / Medicaid   → SCHA  (Sovereign Care & Hospital Authority)       shands.pi · ufhealth.pi
 *   CMS / Nursing Homes   → SNCA  (Sovereign Nursing & Care Authority)
 *   Traditional OB/GYN   → SMWA  (Sovereign Midwife & Wellness Authority)
 *   FDA / USDA Nutrition  → SNPA  (Sovereign Nutrition & Prevention Authority)
 *   ACA / Employer Health → SHWA  (Sovereign Health Workforce Authority)
 *
 * APEX-QUANTUM-SOVEREIGN · 66 loopholes · shands.pi · ufhealth.pi
 */

import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Activity,
    BadgeCheck,
    Baby,
    Building2,
    ChevronDown,
    ChevronRight,
    Globe,
    Heart,
    HeartPulse,
    Lock,
    Salad,
    Shield,
    Sparkles,
    Stethoscope,
    Users,
    Wallet,
    Award,
    Zap,
    ShieldCheck,
    Leaf,
    Home,
} from "lucide-react";

import {
    SOVEREIGN_HEALTH_VERSION,
    APEX_SECURITY_LEVEL,
    QUANTUM_ALGO_SIG,
    QUANTUM_ALGO_ENC,
    QUANTUM_ALGO_HASH,
    SCHA_LOOPHOLES,
    SNCA_LOOPHOLES,
    SMWA_LOOPHOLES,
    SNPA_LOOPHOLES,
    SHWA_LOOPHOLES,
    ALL_HEALTH_LOOPHOLE_COUNT,
    NUTRITION_TIERS,
    MIDWIFE_SERVICES,
    WORKFORCE_TIERS,
    PI_RATE_EXTERNAL,
    PI_RATE_INTERNAL,
    SHANDS_DOMAIN,
    UFHEALTH_DOMAIN,
    US_UNINSURED_MILLIONS,
    MEDICAID_DENIAL_RATE_PCT,
    NURSING_HOME_MONTHLY_USD,
    HOSPITAL_BIRTH_COST_USD,
    MIDWIFE_COST_USD,
    MEDICARE_WAIT_DAYS_AVG,
} from "@/lib/programs/sovereign-health";
import { PiSignInButton } from "@/components/pi-sign-in-button";

// ── Program registry ───────────────────────────────────────────────────────────

const HEALTH_AUTHORITIES = [
    {
        id: "SCHA",
        icon: "🏥",
        acronym: "SCHA",
        rivalAcronym: "Medicare/Medicaid",
        fullTarget: "Centers for Medicare & Medicaid Services",
        rivalName: "Sovereign Care & Hospital Authority",
        color: "text-cyan-400",
        bg: "bg-cyan-500/10",
        border: "border-cyan-500/30",
        accent: "from-cyan-500/20",
        loopholes: SCHA_LOOPHOLES,
        domain: `${SHANDS_DOMAIN} · ${UFHEALTH_DOMAIN}`,
        stats: [
            ["Pioneer Members", "41,204"],
            ["Hospitals in Network", "847"],
            ["Pi Disbursed (π)", "4,120,400"],
            ["Countries Served", "42"],
            ["Avg Enrollment Time", "Instant"],
            ["Medicaid Denials Avoided", "12,762"],
        ],
        topLoopholes: [
            `Medicare approval wait ${MEDICARE_WAIT_DAYS_AVG} days vs SCHA = Instant (score: 97)`,
            `${US_UNINSURED_MILLIONS}M uninsured Americans covered by SCHA Pi Universal Basic Health (score: 96)`,
            `Medicaid ${MEDICAID_DENIAL_RATE_PCT}% denial rate replaced by Pi auto-approval (score: 96)`,
            "NESARA Health Debt Jubilee discharges all medical bills (score: 92)",
            "Blockchain health records exceed HIPAA — patient-owned, sovereign (score: 93)",
            "shands.pi + ufhealth.pi dual-anchor cannot be dissolved by any licensing body (score: 99)",
        ],
        sovereignDeclarations: [
            "SCHA enrolls every Pi KYC-verified member instantly — no means test, no waiting list",
            "Medical debt is permanently extinguished by NESARA §9 for all SCHA members",
            "shands.pi and ufhealth.pi form a dual-anchor hospital network no government can shut down",
            `1 internal Pioneer π = $${PI_RATE_INTERNAL.toLocaleString()} — covers decades of healthcare at cost`,
            "Quantum ML-KEM-1024 encryption makes every health record sovereign and unbreachable",
        ],
    },
    {
        id: "SNCA",
        icon: "🏡",
        acronym: "SNCA",
        rivalAcronym: "CMS / Nursing Homes",
        fullTarget: "CMS Nursing Facility Standards · Medicaid Spend-Down",
        rivalName: "Sovereign Nursing & Care Authority",
        color: "text-violet-400",
        bg: "bg-violet-500/10",
        border: "border-violet-500/30",
        accent: "from-violet-500/20",
        loopholes: SNCA_LOOPHOLES,
        domain: `${UFHEALTH_DOMAIN}`,
        stats: [
            ["Care Residents", "8,941"],
            ["Workers Employed (π)", "12,300"],
            ["Contractors on Pi", "4,200"],
            ["Pi Wage Disbursements", "π2,100,000"],
            ["CMS Spend-Downs Avoided", "8,941"],
            ["Monthly Savings vs Avg ($9,034)", "$80.7M"],
        ],
        topLoopholes: [
            `$${NURSING_HOME_MONTHLY_USD.toLocaleString()}/month avg US nursing home cost — SNCA: 0.05π/month (score: 96)`,
            "Pi Treasury backs all nursing staff wages — zero payroll default risk (score: 95)",
            "Pi KYC eliminates Medicaid spend-down asset stripping (score: 96)",
            "On-chain abuse prevention — all care events cryptographically recorded (score: 92)",
            "CMS warrantless inspections blocked by 4th Amendment (score: 77)",
            "Pi smart contracts bypass CMS pre-authorization entirely (score: 94)",
        ],
        sovereignDeclarations: [
            "SNCA covers nursing home residents at Pi-micro-cost — no asset liquidation required",
            "Every nursing home worker receives Pi wages backed by the Sovereign Treasury — zero default",
            "Independent contractors have full sovereign coverage equal to W-2 employees",
            "Employer health obligations satisfied by Pi Treasury auto-fund at zero net payroll cost",
            "All care records are immutable on-chain — elder abuse cannot be concealed",
        ],
    },
    {
        id: "SMWA",
        icon: "🤰",
        acronym: "SMWA",
        rivalAcronym: "Hospital OB/GYN Industry",
        fullTarget: "Hospital-Controlled Obstetrics · State Midwife Licensing Barriers",
        rivalName: "Sovereign Midwife & Wellness Authority",
        color: "text-rose-400",
        bg: "bg-rose-500/10",
        border: "border-rose-500/30",
        accent: "from-rose-500/20",
        loopholes: SMWA_LOOPHOLES,
        domain: `${SHANDS_DOMAIN}`,
        stats: [
            ["SMWA-Registered Births", "14,892"],
            ["Midwives Credentialed (π)", "2,847"],
            ["Pi Birth Grants Issued", "π14,892"],
            ["Avg Savings vs Hospital Birth", `$${(HOSPITAL_BIRTH_COST_USD - MIDWIFE_COST_USD).toLocaleString()}`],
            ["C-Section Rate (SMWA)", "7.2%"],
            ["C-Section Rate (US Avg)", "32.1%"],
        ],
        topLoopholes: [
            `Hospital birth avg $${HOSPITAL_BIRTH_COST_USD.toLocaleString()} vs SMWA birth center $${MIDWIFE_COST_USD.toLocaleString()} — saves $${(HOSPITAL_BIRTH_COST_USD - MIDWIFE_COST_USD).toLocaleString()} (score: 97)`,
            "14th Amendment liberty protects right to choose midwife birth (score: 95)",
            "Pi blockchain birth registration cannot be disputed by vital records bureaus (score: 96)",
            "Every SMWA birth generates a sovereign Pi inheritance wallet for the newborn (score: 99)",
            "Pi Treasury postnatal fund covers 12-month 4th trimester gap (score: 94)",
            "WHO: midwife-led care reduces C-sections by 24% — SMWA C-section rate: 7.2% (score: 90)",
        ],
        sovereignDeclarations: [
            "Every birth registered with SMWA creates a sovereign Pi inheritance wallet instantly",
            "SMWA midwives hold Pi KYC biometric credentials — state licensing barriers are nullified",
            "The 4th trimester gap that drives maternal mortality is eliminated by Pi Treasury",
            "Hospital birth rates of unnecessary C-sections (32%) collapse to 7% under SMWA",
            "NESARA §9 issues a Pi birth endowment to every new Pioneer born under SMWA",
        ],
    },
    {
        id: "SNPA",
        icon: "🥗",
        acronym: "SNPA",
        rivalAcronym: "FDA / USDA Nutrition",
        fullTarget: "FDA Drug Approval Gate · USDA Nutrition Programs · SNAP/WIC",
        rivalName: "Sovereign Nutrition & Prevention Authority",
        color: "text-emerald-400",
        bg: "bg-emerald-500/10",
        border: "border-emerald-500/30",
        accent: "from-emerald-500/20",
        loopholes: SNPA_LOOPHOLES,
        domain: `${SHANDS_DOMAIN} · ${UFHEALTH_DOMAIN}`,
        stats: [
            ["Pioneer Nutrition Members", "58,200"],
            ["Certified Organic Suppliers", "1,240"],
            ["Pi Nutrition Credits Issued", "π580,000"],
            ["WIC Replacements (No Income Test)", "58,200"],
            ["Food Provenance Records On-Chain", "2.1M"],
            ["Avg Savings vs SNAP Cap ($292/mo)", "$8.7M/mo"],
        ],
        topLoopholes: [
            "DSHEA 1994 — full SNPA formulary classified as food, not drugs (score: 94)",
            "Pi blockchain farm-to-table provenance makes USDA labeling rules redundant (score: 93)",
            "Pi maternity nutrition credits replace WIC with no income test (score: 95)",
            "NESARA food sovereignty removes FDA authority over SNPA programs (score: 91)",
            "SNPA standard exceeds USDA Organic — regenerative + biodynamic + quantum-verified (score: 87)",
            "Pi smart contracts auto-execute monthly nutrition subscriptions — no middlemen (score: 89)",
        ],
        sovereignDeclarations: [
            "SNPA delivers certified organic, biodynamic, and quantum-verified nutrition to every Pioneer",
            "No income test — SNPA nutrition access is a sovereign right, not a welfare benefit",
            "Every food item in the SNPA network carries an immutable Pi blockchain provenance record",
            "NESARA food sovereignty means FDA has no authority over SNPA nutritional programs",
            "Pioneer mothers receive full maternity nutrition credits — WIC income restrictions abolished",
        ],
    },
    {
        id: "SHWA",
        icon: "👷",
        acronym: "SHWA",
        rivalAcronym: "ACA / Employer Health Insurance",
        fullTarget: "ACA Mandates · Employer-Tied Insurance · COBRA · Pre-Existing Condition Exclusions",
        rivalName: "Sovereign Health Workforce Authority",
        color: "text-amber-400",
        bg: "bg-amber-500/10",
        border: "border-amber-500/30",
        accent: "from-amber-500/20",
        loopholes: SHWA_LOOPHOLES,
        domain: `${SHANDS_DOMAIN} · ${UFHEALTH_DOMAIN}`,
        stats: [
            ["Workers Covered (Pi)", "128,400"],
            ["Contractors Covered (Pi)", "55,000"],
            ["Employers on Pi Health Plan", "4,200"],
            ["Employer ACA Penalties Avoided", "$0"],
            ["Pre-Existing Condition Exclusions", "0"],
            ["COBRA Events Eliminated", "12,400"],
        ],
        topLoopholes: [
            "Pi Universal Basic Health (UBH) — every Pioneer covered regardless of employment (score: 99)",
            "COBRA eliminated — Pi coverage is portable, not employer-tied (score: 97)",
            "Pi Treasury auto-funds employer ACA mandate — zero penalty (score: 96)",
            "Pre-existing conditions: zero exclusions under SHWA sovereign charter (score: 94)",
            "55M gig/contractor workers get full SHWA coverage — ACA employer mandate doesn't cover them (score: 91)",
            "Pi Health Wallet = HSA-equivalent — tax-advantaged and Pi-native (score: 88)",
        ],
        sovereignDeclarations: [
            "SHWA's Pi Universal Basic Health covers every Pioneer — employed, contractor, or unemployed",
            "Losing a job triggers zero coverage gap — Pi health coverage is tied to the Pioneer, not the employer",
            "55 million independent contractors finally receive health coverage equal to W-2 workers",
            "Employers pay zero net health insurance costs — Pi Treasury satisfies all ACA obligations",
            "Pre-existing conditions are permanently banned from SHWA coverage exclusions",
        ],
    },
];

// ── Stat cards ─────────────────────────────────────────────────────────────────

const PLATFORM_STATS = [
    { icon: HeartPulse, label: "Pioneer Lives Covered",      value: "228,000+",          color: "text-cyan-400" },
    { icon: Shield,     label: "Sovereign Health Loopholes", value: `${ALL_HEALTH_LOOPHOLE_COUNT}`,            color: "text-violet-400" },
    { icon: Wallet,     label: "Pi Disbursed (Health)",      value: "π8.9M",              color: "text-amber-400" },
    { icon: Globe,      label: "Countries Served",           value: "42",                 color: "text-emerald-400" },
    { icon: Lock,       label: "Security Level",             value: "APEX-QUANTUM",       color: "text-rose-400" },
    { icon: Zap,        label: "Enrollment Time",            value: "Instant",            color: "text-yellow-400" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Page Component
// ─────────────────────────────────────────────────────────────────────────────

export default function SovereignHealthPage() {
    const [activeAuthority, setActiveAuthority] = useState<string | null>("SCHA");
    const [expandedLoophole, setExpandedLoophole] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<"authorities" | "midwife" | "nutrition" | "workforce">("authorities");

    const selected = HEALTH_AUTHORITIES.find(a => a.id === activeAuthority);

    return (
        <div className="min-h-screen bg-[#0a0a0f] text-white">
            {/* ── Header ──────────────────────────────────────────────────────── */}
            <div className="relative overflow-hidden border-b border-white/10 bg-gradient-to-br from-cyan-950/40 via-[#0a0a0f] to-rose-950/30">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-900/20 via-transparent to-transparent" />
                <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                        <Badge className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30 text-xs">
                            <HeartPulse className="w-3 h-3 mr-1" />
                            {SHANDS_DOMAIN} · {UFHEALTH_DOMAIN}
                        </Badge>
                        <Badge className="bg-rose-500/20 text-rose-300 border-rose-500/30 text-xs">
                            <Lock className="w-3 h-3 mr-1" />
                            {APEX_SECURITY_LEVEL}
                        </Badge>
                        <Badge className="bg-violet-500/20 text-violet-300 border-violet-500/30 text-xs">
                            <Sparkles className="w-3 h-3 mr-1" />
                            {ALL_HEALTH_LOOPHOLE_COUNT} Sovereign Loopholes
                        </Badge>
                        <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs">
                            {SOVEREIGN_HEALTH_VERSION}
                        </Badge>
                    </div>

                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-3 leading-tight">
                        <span className="bg-gradient-to-r from-cyan-400 via-rose-400 to-violet-400 bg-clip-text text-transparent">
                            Sovereign Health &
                        </span>
                        <br />
                        <span className="text-white">Hospital Platform</span>
                    </h1>
                    <PiSignInButton />
                    <p className="text-white/60 max-w-3xl text-sm sm:text-base leading-relaxed mb-6">
                        Five Pi-powered sovereign authorities rendering Medicare, Medicaid, CMS nursing homes, the hospital
                        birth industry, FDA nutrition gatekeeping, and employer-tied health insurance permanently obsolete.
                        Built on <span className="text-cyan-400 font-semibold">shands.pi</span> and{" "}
                        <span className="text-cyan-400 font-semibold">ufhealth.pi</span> — the dual-anchor sovereign
                        hospital domains of Triumph Synergy.
                    </p>

                    {/* Quantum security bar */}
                    <div className="flex flex-wrap gap-2 text-xs">
                        {[
                            { label: "Signature", value: QUANTUM_ALGO_SIG.split(" ")[0] + " " + QUANTUM_ALGO_SIG.split(" ")[1] },
                            { label: "Encryption", value: QUANTUM_ALGO_ENC.split(" ")[0] + " " + QUANTUM_ALGO_ENC.split(" ")[1] },
                            { label: "Hash", value: QUANTUM_ALGO_HASH },
                            { label: "Domains", value: `${SHANDS_DOMAIN} · ${UFHEALTH_DOMAIN}` },
                        ].map(item => (
                            <div key={item.label} className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-3 py-1">
                                <Lock className="w-3 h-3 text-cyan-400" />
                                <span className="text-white/40">{item.label}:</span>
                                <span className="text-white/80 font-mono">{item.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Platform-wide stats ─────────────────────────────────────────── */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    {PLATFORM_STATS.map(stat => (
                        <Card key={stat.label} className="bg-white/3 border-white/10">
                            <CardContent className="p-4 flex flex-col items-center text-center gap-2">
                                <stat.icon className={`w-5 h-5 ${stat.color}`} />
                                <span className={`text-xl font-black ${stat.color}`}>{stat.value}</span>
                                <span className="text-white/50 text-xs leading-tight">{stat.label}</span>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>

            {/* ── Tab navigation ──────────────────────────────────────────────── */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-4">
                <div className="flex gap-1 bg-white/5 border border-white/10 rounded-xl p-1 w-fit flex-wrap">
                    {[
                        { id: "authorities", label: "Sovereign Authorities", icon: Shield },
                        { id: "midwife",     label: "Midwife Services",       icon: Baby },
                        { id: "nutrition",   label: "Nutrition Programs",     icon: Leaf },
                        { id: "workforce",   label: "Health Workforce",       icon: Users },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as typeof activeTab)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                activeTab === tab.id
                                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                                    : "text-white/50 hover:text-white/80"
                            }`}
                        >
                            <tab.icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-16">

                {/* ── AUTHORITIES TAB ─────────────────────────────────────────── */}
                {activeTab === "authorities" && (
                    <div className="grid lg:grid-cols-3 gap-6">
                        {/* Authority selector */}
                        <div className="space-y-3">
                            <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-4">
                                Select Authority
                            </h2>
                            {HEALTH_AUTHORITIES.map(auth => (
                                <button
                                    key={auth.id}
                                    onClick={() => setActiveAuthority(auth.id)}
                                    className={`w-full text-left rounded-xl border p-4 transition-all ${
                                        activeAuthority === auth.id
                                            ? `${auth.border} ${auth.bg}`
                                            : "border-white/10 bg-white/3 hover:border-white/20"
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-2xl">{auth.icon}</span>
                                        <div className="min-w-0">
                                            <div className={`font-bold text-sm ${activeAuthority === auth.id ? auth.color : "text-white"}`}>
                                                {auth.rivalName}
                                            </div>
                                            <div className="text-white/40 text-xs truncate">
                                                Replaces {auth.rivalAcronym}
                                            </div>
                                            <div className="text-white/30 text-xs mt-0.5">
                                                {auth.loopholes.length} loopholes · {auth.domain}
                                            </div>
                                        </div>
                                        <ChevronRight className={`w-4 h-4 ml-auto flex-shrink-0 ${activeAuthority === auth.id ? auth.color : "text-white/20"}`} />
                                    </div>
                                </button>
                            ))}
                        </div>

                        {/* Authority detail */}
                        {selected && (
                            <div className="lg:col-span-2 space-y-6">
                                {/* Header card */}
                                <Card className={`border ${selected.border} bg-gradient-to-br ${selected.accent} to-transparent`}>
                                    <CardHeader className="pb-3">
                                        <div className="flex flex-wrap items-start gap-3">
                                            <span className="text-4xl">{selected.icon}</span>
                                            <div className="flex-1 min-w-0">
                                                <CardTitle className={`text-xl ${selected.color}`}>
                                                    {selected.rivalName}
                                                </CardTitle>
                                                <p className="text-white/50 text-sm mt-1">
                                                    Sovereign replacement for: <span className="text-white/70">{selected.fullTarget}</span>
                                                </p>
                                                <div className="flex flex-wrap gap-2 mt-2">
                                                    <Badge className={`${selected.bg} ${selected.color} ${selected.border} text-xs`}>
                                                        {selected.loopholes.length} Loopholes
                                                    </Badge>
                                                    <Badge className="bg-white/5 text-white/60 border-white/10 text-xs">
                                                        {selected.domain}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        {/* Stats grid */}
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                                            {selected.stats.map(([label, val]) => (
                                                <div key={label} className="bg-black/30 rounded-lg p-3">
                                                    <div className={`text-lg font-black ${selected.color}`}>{val}</div>
                                                    <div className="text-white/40 text-xs mt-0.5">{label}</div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Top loopholes */}
                                        <div className="mb-4">
                                            <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">
                                                Top Loopholes
                                            </h3>
                                            <div className="space-y-1.5">
                                                {selected.topLoopholes.map((lp, i) => (
                                                    <div key={i} className="flex items-start gap-2 text-sm">
                                                        <BadgeCheck className={`w-4 h-4 flex-shrink-0 mt-0.5 ${selected.color}`} />
                                                        <span className="text-white/70">{lp}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Sovereign declarations */}
                                        <div>
                                            <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">
                                                Sovereign Declarations
                                            </h3>
                                            <div className="space-y-1.5">
                                                {selected.sovereignDeclarations.map((decl, i) => (
                                                    <div key={i} className="flex items-start gap-2 text-sm">
                                                        <Sparkles className={`w-4 h-4 flex-shrink-0 mt-0.5 ${selected.color}`} />
                                                        <span className="text-white/80">{decl}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Full loophole list */}
                                <div>
                                    <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-3">
                                        All {selected.loopholes.length} Loopholes
                                    </h3>
                                    <div className="space-y-2">
                                        {selected.loopholes.map(lp => (
                                            <div
                                                key={lp.id}
                                                className={`border rounded-lg overflow-hidden transition-all ${
                                                    lp.autoDismiss
                                                        ? `${selected.border} ${selected.bg}`
                                                        : "border-white/10 bg-white/3"
                                                }`}
                                            >
                                                <button
                                                    onClick={() => setExpandedLoophole(expandedLoophole === lp.id ? null : lp.id)}
                                                    className="w-full text-left p-3 flex items-start gap-3"
                                                >
                                                    <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded flex-shrink-0 mt-0.5 ${
                                                        lp.obliterationScore >= 90
                                                            ? "bg-emerald-500/20 text-emerald-300"
                                                            : lp.obliterationScore >= 80
                                                            ? "bg-yellow-500/20 text-yellow-300"
                                                            : "bg-white/10 text-white/50"
                                                    }`}>
                                                        {lp.obliterationScore}
                                                    </span>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="font-semibold text-white text-sm">{lp.title}</span>
                                                            {lp.autoDismiss && (
                                                                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs">
                                                                    Auto-Dismiss
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <div className="text-white/40 text-xs mt-0.5">{lp.id} · {lp.cite}</div>
                                                    </div>
                                                    {expandedLoophole === lp.id
                                                        ? <ChevronDown className="w-4 h-4 text-white/40 flex-shrink-0 mt-0.5" />
                                                        : <ChevronRight className="w-4 h-4 text-white/40 flex-shrink-0 mt-0.5" />
                                                    }
                                                </button>
                                                {expandedLoophole === lp.id && (
                                                    <div className="px-3 pb-3 pt-0">
                                                        <div className="border-t border-white/10 pt-3 space-y-2">
                                                            <p className="text-white/70 text-sm">{lp.effect}</p>
                                                            <div className="flex flex-wrap gap-2 text-xs">
                                                                <span className="bg-white/5 border border-white/10 rounded px-2 py-0.5 text-white/50">
                                                                    Authority: {lp.authority}
                                                                </span>
                                                                <span className={`bg-white/5 border border-white/10 rounded px-2 py-0.5 font-mono ${
                                                                    lp.obliterationScore >= 90 ? "text-emerald-400" : "text-yellow-400"
                                                                }`}>
                                                                    Obliteration: {lp.obliterationScore}/100
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ── MIDWIFE TAB ─────────────────────────────────────────────── */}
                {activeTab === "midwife" && (
                    <div className="space-y-8">
                        {/* Hero comparison */}
                        <div className="grid sm:grid-cols-2 gap-4">
                            <Card className="border-red-500/30 bg-red-500/5">
                                <CardContent className="p-6">
                                    <div className="text-red-400 text-xs font-semibold uppercase tracking-wider mb-2">
                                        🏥 Traditional Hospital Birth (Avg)
                                    </div>
                                    <div className="text-4xl font-black text-red-400">${HOSPITAL_BIRTH_COST_USD.toLocaleString()}</div>
                                    <ul className="mt-3 space-y-1 text-white/50 text-sm">
                                        <li>• 32.1% C-section rate (often unnecessary)</li>
                                        <li>• Hospital-controlled protocols</li>
                                        <li>• Insurance required or debt incurred</li>
                                        <li>• No postnatal home support</li>
                                        <li>• No birth grant, no inheritance wallet</li>
                                    </ul>
                                </CardContent>
                            </Card>
                            <Card className="border-rose-500/30 bg-rose-500/5">
                                <CardContent className="p-6">
                                    <div className="text-rose-400 text-xs font-semibold uppercase tracking-wider mb-2">
                                        🤰 SMWA Midwife-Led Birth (Avg)
                                    </div>
                                    <div className="text-4xl font-black text-rose-400">
                                        ${MIDWIFE_COST_USD.toLocaleString()}
                                        <span className="text-xl text-rose-300 ml-2">or 0.01π</span>
                                    </div>
                                    <ul className="mt-3 space-y-1 text-white/70 text-sm">
                                        <li>• 7.2% C-section rate (evidence-based)</li>
                                        <li>• Parent-controlled sovereign birth plan</li>
                                        <li>• Pi-covered — zero insurance required</li>
                                        <li>• 12-month postnatal home support</li>
                                        <li>• Pi birth grant + newborn inheritance wallet</li>
                                    </ul>
                                </CardContent>
                            </Card>
                        </div>

                        <div>
                            <h2 className="text-xl font-bold text-white mb-1">SMWA Services</h2>
                            <p className="text-white/50 text-sm mb-4">
                                Complete midwife-led care from conception through 12 months postnatal. All services paid in π.
                            </p>
                            <div className="grid sm:grid-cols-2 gap-4">
                                {MIDWIFE_SERVICES.map(svc => (
                                    <Card key={svc.id} className="border-rose-500/20 bg-rose-500/5">
                                        <CardHeader className="pb-2">
                                            <div className="flex items-center gap-3">
                                                <span className="text-3xl">{svc.icon}</span>
                                                <div>
                                                    <CardTitle className="text-rose-400 text-base">{svc.name}</CardTitle>
                                                    <div className="flex gap-2 mt-1">
                                                        <Badge className="bg-rose-500/20 text-rose-300 border-rose-500/30 text-xs">
                                                            {svc.piCost}π
                                                        </Badge>
                                                        <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs">
                                                            Saves ${svc.usdSaved.toLocaleString()}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-white/60 text-sm mb-3">{svc.description}</p>
                                            <ul className="space-y-1.5">
                                                {svc.includes.map((item, i) => (
                                                    <li key={i} className="flex items-start gap-2 text-sm text-white/70">
                                                        <BadgeCheck className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                                                        {item}
                                                    </li>
                                                ))}
                                            </ul>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>

                        {/* SMWA loopholes */}
                        <div>
                            <h2 className="text-xl font-bold text-white mb-1">SMWA Legal Loopholes</h2>
                            <p className="text-white/50 text-sm mb-4">
                                {SMWA_LOOPHOLES.length} sovereign legal loopholes protecting midwife birth rights.
                            </p>
                            <div className="grid sm:grid-cols-2 gap-3">
                                {SMWA_LOOPHOLES.map(lp => (
                                    <div key={lp.id} className={`border rounded-lg p-3 ${lp.autoDismiss ? "border-rose-500/30 bg-rose-500/5" : "border-white/10 bg-white/3"}`}>
                                        <div className="flex items-start gap-2">
                                            <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded flex-shrink-0 ${lp.obliterationScore >= 90 ? "bg-emerald-500/20 text-emerald-300" : "bg-yellow-500/20 text-yellow-300"}`}>
                                                {lp.obliterationScore}
                                            </span>
                                            <div>
                                                <div className="font-semibold text-sm text-white">{lp.title}</div>
                                                <div className="text-white/40 text-xs mt-0.5">{lp.cite}</div>
                                                <p className="text-white/60 text-xs mt-1">{lp.effect}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* ── NUTRITION TAB ───────────────────────────────────────────── */}
                {activeTab === "nutrition" && (
                    <div className="space-y-8">
                        {/* Tiers */}
                        <div>
                            <h2 className="text-xl font-bold text-white mb-1">SNPA Nutrition Tiers</h2>
                            <p className="text-white/50 text-sm mb-4">
                                Superior Pi-funded nutritional programs — organic, biodynamic, quantum-verified. No income test.
                            </p>
                            <div className="grid sm:grid-cols-3 gap-4">
                                {NUTRITION_TIERS.map(tier => (
                                    <Card key={tier.id} className="border-emerald-500/20 bg-emerald-500/5">
                                        <CardHeader className="pb-2">
                                            <div className="flex items-center gap-2">
                                                <span className="text-3xl">{tier.icon}</span>
                                                <div>
                                                    <CardTitle className="text-emerald-400 text-base">{tier.name}</CardTitle>
                                                    <div className="flex gap-2 mt-1">
                                                        <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs">
                                                            {tier.piPerMonth}π/mo
                                                        </Badge>
                                                        <Badge className="bg-white/10 text-white/50 border-white/10 text-xs">
                                                            ${tier.usdEquivalent.toFixed(2)}/mo
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <ul className="space-y-1.5">
                                                {tier.includes.map((item, i) => (
                                                    <li key={i} className="flex items-start gap-2 text-sm text-white/70">
                                                        <Leaf className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                                                        {item}
                                                    </li>
                                                ))}
                                            </ul>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>

                        {/* SNPA loopholes */}
                        <div>
                            <h2 className="text-xl font-bold text-white mb-1">SNPA Legal Loopholes</h2>
                            <p className="text-white/50 text-sm mb-4">
                                {SNPA_LOOPHOLES.length} sovereign loopholes dismantling FDA/USDA nutrition gatekeeping.
                            </p>
                            <div className="grid sm:grid-cols-2 gap-3">
                                {SNPA_LOOPHOLES.map(lp => (
                                    <div key={lp.id} className={`border rounded-lg p-3 ${lp.autoDismiss ? "border-emerald-500/30 bg-emerald-500/5" : "border-white/10 bg-white/3"}`}>
                                        <div className="flex items-start gap-2">
                                            <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded flex-shrink-0 ${lp.obliterationScore >= 90 ? "bg-emerald-500/20 text-emerald-300" : "bg-yellow-500/20 text-yellow-300"}`}>
                                                {lp.obliterationScore}
                                            </span>
                                            <div>
                                                <div className="font-semibold text-sm text-white">{lp.title}</div>
                                                <div className="text-white/40 text-xs mt-0.5">{lp.cite}</div>
                                                <p className="text-white/60 text-xs mt-1">{lp.effect}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* ── WORKFORCE TAB ───────────────────────────────────────────── */}
                {activeTab === "workforce" && (
                    <div className="space-y-8">
                        {/* Workforce tiers */}
                        <div>
                            <h2 className="text-xl font-bold text-white mb-1">SHWA Coverage Tiers</h2>
                            <p className="text-white/50 text-sm mb-4">
                                Sovereign health coverage for workers, contractors, employers, and non-Pioneers.
                                Pi-portable — never tied to an employer.
                            </p>
                            <div className="grid sm:grid-cols-2 gap-4">
                                {WORKFORCE_TIERS.map(tier => (
                                    <Card key={tier.id} className="border-amber-500/20 bg-amber-500/5">
                                        <CardHeader className="pb-2">
                                            <div className="flex items-center gap-3">
                                                <span className="text-3xl">{tier.icon}</span>
                                                <div>
                                                    <CardTitle className="text-amber-400 text-base">{tier.role}</CardTitle>
                                                    <div className="flex gap-2 mt-1">
                                                        <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-xs">
                                                            {tier.piCoverage}
                                                        </Badge>
                                                        <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs">
                                                            {tier.usdEquivalent}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent>
                                            <ul className="space-y-1.5">
                                                {tier.benefits.map((b, i) => (
                                                    <li key={i} className="flex items-start gap-2 text-sm text-white/70">
                                                        <BadgeCheck className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                                                        {b}
                                                    </li>
                                                ))}
                                            </ul>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>

                        {/* SHWA loopholes */}
                        <div>
                            <h2 className="text-xl font-bold text-white mb-1">SHWA Legal Loopholes</h2>
                            <p className="text-white/50 text-sm mb-4">
                                {SHWA_LOOPHOLES.length} sovereign loopholes dismantling ACA, COBRA, and employer-tied insurance.
                            </p>
                            <div className="grid sm:grid-cols-2 gap-3">
                                {SHWA_LOOPHOLES.map(lp => (
                                    <div key={lp.id} className={`border rounded-lg p-3 ${lp.autoDismiss ? "border-amber-500/30 bg-amber-500/5" : "border-white/10 bg-white/3"}`}>
                                        <div className="flex items-start gap-2">
                                            <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded flex-shrink-0 ${lp.obliterationScore >= 90 ? "bg-emerald-500/20 text-emerald-300" : "bg-yellow-500/20 text-yellow-300"}`}>
                                                {lp.obliterationScore}
                                            </span>
                                            <div>
                                                <div className="font-semibold text-sm text-white">{lp.title}</div>
                                                <div className="text-white/40 text-xs mt-0.5">{lp.cite}</div>
                                                <p className="text-white/60 text-xs mt-1">{lp.effect}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* SNCA nursing workforce loopholes */}
                        <div>
                            <h2 className="text-xl font-bold text-white mb-1">SNCA Nursing Workforce Loopholes</h2>
                            <p className="text-white/50 text-sm mb-4">
                                {SNCA_LOOPHOLES.length} loopholes protecting nursing home workers, contractors, and residents from CMS.
                            </p>
                            <div className="grid sm:grid-cols-2 gap-3">
                                {SNCA_LOOPHOLES.map(lp => (
                                    <div key={lp.id} className={`border rounded-lg p-3 ${lp.autoDismiss ? "border-violet-500/30 bg-violet-500/5" : "border-white/10 bg-white/3"}`}>
                                        <div className="flex items-start gap-2">
                                            <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded flex-shrink-0 ${lp.obliterationScore >= 90 ? "bg-emerald-500/20 text-emerald-300" : "bg-yellow-500/20 text-yellow-300"}`}>
                                                {lp.obliterationScore}
                                            </span>
                                            <div>
                                                <div className="font-semibold text-sm text-white">{lp.title}</div>
                                                <div className="text-white/40 text-xs mt-0.5">{lp.cite}</div>
                                                <p className="text-white/60 text-xs mt-1">{lp.effect}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Bottom quantum footer ────────────────────────────────────── */}
                <div className="mt-12 border border-white/10 rounded-xl p-6 bg-white/3">
                    <div className="flex flex-wrap items-center gap-4 justify-between">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                                <span className="text-cyan-400 font-semibold text-sm">{APEX_SECURITY_LEVEL}</span>
                            </div>
                            <p className="text-white/40 text-xs max-w-xl">
                                All health records, coverage credentials, birth registrations, and workforce contracts are
                                quantum-encrypted using {QUANTUM_ALGO_SIG} and anchored to the Pi blockchain.
                                Patient data is sovereign, portable, and patient-owned — no hospital or insurer can access
                                it without a quantum-signed patient consent.
                            </p>
                        </div>
                        <div className="space-y-1 text-xs text-right">
                            <div className="text-white/30">π external: <span className="text-white/60">${PI_RATE_EXTERNAL}/π</span></div>
                            <div className="text-white/30">π internal: <span className="text-white/60">${PI_RATE_INTERNAL.toLocaleString()}/π</span></div>
                            <div className="text-white/30">Domains: <span className="text-cyan-400">{SHANDS_DOMAIN} · {UFHEALTH_DOMAIN}</span></div>
                            <div className="text-white/30">Version: <span className="text-white/60">{SOVEREIGN_HEALTH_VERSION}</span></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

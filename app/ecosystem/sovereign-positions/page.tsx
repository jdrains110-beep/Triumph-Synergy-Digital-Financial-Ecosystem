/**
 * app/ecosystem/sovereign-positions/page.tsx
 *
 * Triumph Synergy — Sovereign Positions Registry (SPR) Dashboard
 *
 * The world's first Pi-gated sovereign employment portal. Every position
 * across all eight sector authorities and core Triumph operations requires
 * Pi Network KYC verification. No connection. No nepotism. No gatekeeping.
 * Sign up or interview — everyone earns in Pi.
 *
 * APEX-QUANTUM-SOVEREIGN · Real-world Pi utility
 * 42 countries · 170,000+ open positions
 */

import {
    BadgeCheck,
    Briefcase,
    Building2,
    Car,
    CheckCircle,
    ChevronRight,
    ClipboardList,
    Film,
    Fuel,
    Gem,
    Globe,
    Lock,
    Scale,
    Shield,
    ShoppingBag,
    ShoppingCart,
    Sparkles,
    Ticket,
    TrendingUp,
    Users,
    Wallet,
    Landmark,
    Gavel,
    Cpu,
    Award,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    SOVEREIGN_POSITIONS_VERSION,
    APEX_SECURITY_LEVEL,
    QUANTUM_ALGO_SIG,
    QUANTUM_ALGO_ENC,
    QUANTUM_ALGO_HASH,
    PI_RATE_EXTERNAL,
    PI_RATE_INTERNAL,
    SOVEREIGN_POSITIONS,
    buildPositionStats,
    type SovereignSector,
} from "@/lib/programs/sovereign-positions";
import { PiSignInButton } from "@/components/pi-sign-in-button";

export const dynamic = "force-dynamic";
export const revalidate = 60;

export const metadata = {
    title: "Sovereign Positions Registry — Apply for Pi-Powered Roles | Triumph Synergy",
    description:
        "The world's first Pi-gated sovereign employment registry. Sign up or interview for open positions across vehicles, fuel, grocery, jewelry, e-commerce, movies, events, land, legal, finance, and technology. Pi KYC required. Everyone earns in Pi.",
};

// ── Sector icon map ───────────────────────────────────────────────────────────

const SECTOR_META: Record<SovereignSector, { icon: React.ReactNode; label: string; color: string; bg: string; border: string }> = {
    VEHICLES: { icon: <Car className="h-4 w-4" />, label: "Vehicles & Fleets", color: "text-sky-400", bg: "bg-sky-500/10", border: "border-sky-500/30" },
    FUEL: { icon: <Fuel className="h-4 w-4" />, label: "Fuel & Gas", color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/30" },
    GROCERY: { icon: <ShoppingCart className="h-4 w-4" />, label: "Supermarkets", color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/30" },
    JEWELRY: { icon: <Gem className="h-4 w-4" />, label: "Jewelry", color: "text-pink-400", bg: "bg-pink-500/10", border: "border-pink-500/30" },
    ECOMMERCE: { icon: <ShoppingBag className="h-4 w-4" />, label: "E-Commerce", color: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/30" },
    ENTERTAINMENT: { icon: <Film className="h-4 w-4" />, label: "Media & Entertainment", color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/30" },
    EVENTS: { icon: <Ticket className="h-4 w-4" />, label: "Events & Venues", color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30" },
    LAND: { icon: <Landmark className="h-4 w-4" />, label: "Land & Real Estate", color: "text-lime-400", bg: "bg-lime-500/10", border: "border-lime-500/30" },
    CORE_OPERATIONS: { icon: <Building2 className="h-4 w-4" />, label: "Core Operations", color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/30" },
    JUDICIAL: { icon: <Gavel className="h-4 w-4" />, label: "Judicial", color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/30" },
    FINANCE: { icon: <Wallet className="h-4 w-4" />, label: "Finance", color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/30" },
    TECHNOLOGY: { icon: <Cpu className="h-4 w-4" />, label: "Technology", color: "text-cyan-400", bg: "bg-cyan-500/10", border: "border-cyan-500/30" },
};

const TIER_COLORS: Record<string, string> = {
    "entry": "text-emerald-400 border-emerald-500/50",
    "specialist": "text-sky-400 border-sky-500/50",
    "senior": "text-blue-400 border-blue-500/50",
    "executive": "text-violet-400 border-violet-500/50",
    "sovereign-officer": "text-amber-400 border-amber-500/50",
    "apex-guardian": "text-red-400 border-red-500/50",
};

const METHOD_COLORS: Record<string, string> = {
    "signup": "text-emerald-400",
    "interview": "text-amber-400",
    "appointment": "text-red-400",
};

const METHOD_LABELS: Record<string, string> = {
    "signup": "Instant Signup",
    "interview": "Interview Required",
    "appointment": "Sovereign Appointment",
};

// ── Sovereign principles ──────────────────────────────────────────────────────

const SOVEREIGN_PRINCIPLES = [
    {
        icon: "🔐",
        title: "Pi KYC Required for All",
        body: "Every position requires Pi Network KYC verification. Your Pi wallet is your sovereign identity — no SSN, no credit check, no discrimination.",
    },
    {
        icon: "⚡",
        title: "Entry-Level = Instant Signup",
        body: "140,000+ entry-level slots require nothing more than a verified Pi KYC. Sign up, get access, start earning Pi immediately.",
    },
    {
        icon: "🎯",
        title: "Merit-Based Interview Panels",
        body: "Senior and executive roles require sovereign interview panels — quantum-verified, scored on competence, communication, and sovereign alignment. No nepotism. No 'who you know.'",
    },
    {
        icon: "⚖️",
        title: "Everyone Earns in Pi",
        body: "All compensation is denominated in Pi. Entry roles earn Pi commission. Senior roles earn Pi monthly salaries equivalent to $25k–$100k+. Executives earn 100–1,000π/month.",
    },
    {
        icon: "🌍",
        title: "42 Countries, Zero Borders",
        body: "All remote positions are globally open. Pi is your payroll system — no wire fees, no currency conversion, no payroll bureaucracy. Your Pi wallet receives sovereign earnings instantly.",
    },
    {
        icon: "🛡️",
        title: "Sovereign Legal Protection",
        body: "All SPR participants receive sovereign legal indemnification. APEX security clearance holders receive full constitutional protections under the sovereign ecosystem framework.",
    },
];

// ─────────────────────────────────────────────────────────────────────────────
// PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function SovereignPositionsPage() {
    const stats = buildPositionStats();

    // Group positions by sector
    const sectors = Object.keys(SECTOR_META) as SovereignSector[];
    const sectorGroups = sectors.map(sector => ({
        sector,
        meta: SECTOR_META[sector],
        positions: SOVEREIGN_POSITIONS.filter(p => p.sector === sector && p.isActive),
    })).filter(g => g.positions.length > 0);

    return (
        <div className="mx-auto max-w-5xl space-y-8 p-4 md:p-8">

            {/* ── Header ────────────────────────────────────────────────────────── */}
            <div className="flex flex-wrap items-start gap-4">
                <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 p-3">
                    <Briefcase className="h-6 w-6 text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <h1 className="text-2xl font-bold">Sovereign Positions Registry</h1>
                        <PiSignInButton />
                        <Badge variant="outline" className="border-red-500/50 text-red-400 text-xs">APEX QUANTUM</Badge>
                        <Badge variant="outline" className="border-emerald-500/50 text-emerald-400 text-xs">PI KYC REQUIRED</Badge>
                        <Badge variant="outline" className="border-amber-500/50 text-amber-400 text-xs">{stats.totalOpen.toLocaleString()} OPEN SLOTS</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
                        The world&apos;s first Pi-gated sovereign employment registry. Sign up or interview to take
                        positions across all eight sovereign sector authorities. No connection. No nepotism.
                        No gatekeeping. <strong>Pi KYC is the only ticket in.</strong>
                    </p>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Lock className="h-3 w-3 text-violet-400" />{SOVEREIGN_POSITIONS_VERSION}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1"><Shield className="h-3 w-3 text-red-400" />{APEX_SECURITY_LEVEL}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1"><Globe className="h-3 w-3 text-blue-400" />{stats.countriesAvailable} countries</span>
                        <span>•</span>
                        <span>{stats.totalPositions} position types · {stats.totalSlots.toLocaleString()} total slots</span>
                    </div>
                </div>
            </div>

            {/* ── Global Stats ──────────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                    { label: "Open Positions", value: stats.totalOpen.toLocaleString(), color: "text-emerald-400" },
                    { label: "Instant Signup Roles", value: stats.signupOnly.toLocaleString(), color: "text-sky-400" },
                    { label: "Interview Roles", value: stats.interviewRequired.toLocaleString(), color: "text-amber-400" },
                    { label: "Sovereign Appointments", value: stats.appointmentOnly.toLocaleString(), color: "text-violet-400" },
                ].map(s => (
                    <Card key={s.label} className="p-3 text-center">
                        <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                        <p className="text-xs text-muted-foreground">{s.label}</p>
                    </Card>
                ))}
            </div>

            {/* ── Pi Compensation Range ─────────────────────────────────────────── */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                    { label: "Entry Pi Comp", value: "0% fee / Pi commission", sub: "Keep 100% of Pi earned", color: "text-emerald-400" },
                    { label: "Specialist Pi Rate", value: "60–120π/month", sub: `$${(60 * PI_RATE_EXTERNAL).toLocaleString()}–$${(120 * PI_RATE_EXTERNAL).toLocaleString()}/mo`, color: "text-sky-400" },
                    { label: "Executive Pi Rate", value: "300–500π/month", sub: `$${(300 * PI_RATE_EXTERNAL).toLocaleString()}–$${(500 * PI_RATE_EXTERNAL).toLocaleString()}/mo`, color: "text-violet-400" },
                    { label: "Sovereign Officer Max", value: "1,000π/mo + 0.1% revenue", sub: `$${PI_RATE_INTERNAL.toLocaleString()}/mo Pioneer rate`, color: "text-amber-400" },
                ].map(s => (
                    <Card key={s.label} className="p-3 text-center">
                        <p className="text-xs text-muted-foreground">{s.label}</p>
                        <p className={`text-sm font-bold ${s.color}`}>{s.value}</p>
                        <p className="text-xs text-muted-foreground">{s.sub}</p>
                    </Card>
                ))}
            </div>

            {/* ── Sovereign Principles ──────────────────────────────────────────── */}
            <Card className="border-emerald-500/20 bg-emerald-500/5">
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm">
                        <Scale className="h-4 w-4 text-emerald-400" />
                        Sovereign Employment Principles
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {SOVEREIGN_PRINCIPLES.map(p => (
                            <div key={p.title} className="rounded border border-emerald-500/20 p-3">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-base">{p.icon}</span>
                                    <p className="text-xs font-semibold">{p.title}</p>
                                </div>
                                <p className="text-xs text-muted-foreground">{p.body}</p>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* ── How to Apply ──────────────────────────────────────────────────── */}
            <Card className="border-amber-500/20 bg-amber-500/5">
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm">
                        <ClipboardList className="h-4 w-4 text-amber-400" />
                        How to Apply — Three Paths to Sovereign Employment
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        {[
                            {
                                method: "⚡ Instant Signup",
                                color: "text-emerald-400",
                                border: "border-emerald-500/30",
                                steps: [
                                    "1. Verify Pi Network KYC",
                                    "2. Select position from registry",
                                    "3. Submit Pi wallet address",
                                    "4. Receive sovereign access token",
                                    "5. Begin earning Pi immediately",
                                ],
                                note: "140,000+ slots available instantly",
                            },
                            {
                                method: "🎯 Interview Path",
                                color: "text-amber-400",
                                border: "border-amber-500/30",
                                steps: [
                                    "1. Verify Pi Network KYC",
                                    "2. Submit Pi-signed portfolio/resume",
                                    "3. Schedule sovereign interview panel",
                                    "4. Complete 1–2 rounds (scored 0–100)",
                                    "5. Receive Pi quantum-signed offer",
                                ],
                                note: "Senior + executive roles — scored on merit",
                            },
                            {
                                method: "🛡️ Sovereign Appointment",
                                color: "text-violet-400",
                                border: "border-violet-500/30",
                                steps: [
                                    "1. APEX-level Pi KYC required",
                                    "2. Demonstrated sovereign ecosystem contribution",
                                    "3. Nominated by existing Council member",
                                    "4. Full 3-round panel + constitutional review",
                                    "5. Quantum-signed lifetime appointment",
                                ],
                                note: "Sovereign Officers + Judges only",
                            },
                        ].map(p => (
                            <div key={p.method} className={`rounded border ${p.border} p-3`}>
                                <p className={`text-sm font-bold ${p.color} mb-2`}>{p.method}</p>
                                <ul className="space-y-1">
                                    {p.steps.map(s => (
                                        <li key={s} className="text-xs text-muted-foreground flex items-start gap-1">
                                            <ChevronRight className="h-3 w-3 mt-0.5 shrink-0" />
                                            {s}
                                        </li>
                                    ))}
                                </ul>
                                <p className={`mt-2 text-xs font-medium ${p.color}`}>{p.note}</p>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* ── Positions by Sector ───────────────────────────────────────────── */}
            {sectorGroups.map(({ sector, meta, positions }) => {
                const totalSlots = positions.reduce((s, p) => s + p.openSlots, 0);
                const filledSlots = positions.reduce((s, p) => s + p.filledSlots, 0);
                const openSlots = totalSlots - filledSlots;
                const fillPct = Math.round((filledSlots / Math.max(totalSlots, 1)) * 100);

                return (
                    <section key={sector}>
                        <div className="mb-3 flex flex-wrap items-center gap-3">
                            <div className={`flex items-center gap-1 rounded-lg ${meta.bg} p-2`}>
                                <span className={meta.color}>{meta.icon}</span>
                            </div>
                            <div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <h2 className="text-lg font-bold">{meta.label}</h2>
                                    <Badge variant="outline" className={`${meta.border} ${meta.color} text-xs`}>
                                        {positions.length} positions
                                    </Badge>
                                    <Badge variant="secondary" className="text-xs bg-emerald-500/10 text-emerald-400 border-0">
                                        {openSlots.toLocaleString()} open slots
                                    </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {filledSlots.toLocaleString()} of {totalSlots.toLocaleString()} slots filled ({fillPct}% filled)
                                </p>
                            </div>
                        </div>

                        <div className="space-y-3">
                            {positions.map(position => {
                                const tierColor = TIER_COLORS[position.tier] ?? "text-muted-foreground";
                                const methodColor = METHOD_COLORS[position.applicationMethod];
                                const available = position.openSlots - position.filledSlots;
                                const fillPercent = Math.round((position.filledSlots / Math.max(position.openSlots, 1)) * 100);

                                return (
                                    <Card key={position.id} className={`border ${meta.border}`}>
                                        <CardContent className="pt-4 space-y-3">
                                            {/* Title row */}
                                            <div className="flex flex-wrap items-start justify-between gap-2">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <h3 className="font-semibold">{position.title}</h3>
                                                        <Badge variant="outline" className={`text-xs border ${tierColor}`}>
                                                            {position.tier.toUpperCase().replace("-", " ")}
                                                        </Badge>
                                                        <Badge variant="secondary" className={`text-xs ${methodColor} bg-transparent border-0`}>
                                                            {METHOD_LABELS[position.applicationMethod]}
                                                        </Badge>
                                                        {position.interviewRounds === 0 && (
                                                            <Badge variant="outline" className="text-xs border-emerald-500/50 text-emerald-400">
                                                                INSTANT ACCESS
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        ID: {position.id} · Clearance: {position.sovereignClearance} · {position.workArrangement}
                                                    </p>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <p className={`text-sm font-bold ${meta.color}`}>{position.piCompensation}</p>
                                                    <p className="text-xs text-muted-foreground">{position.usdEquivalent}</p>
                                                </div>
                                            </div>

                                            {/* Slot fill bar */}
                                            <div>
                                                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                                    <span>{available.toLocaleString()} slots available</span>
                                                    <span>{fillPercent}% filled</span>
                                                </div>
                                                <div className="h-1.5 rounded-full bg-muted/40">
                                                    <div
                                                        className={`h-1.5 rounded-full ${meta.color.replace("text-", "bg-")}`}
                                                        style={{ width: `${fillPercent}%` }}
                                                    />
                                                </div>
                                            </div>

                                            {/* Responsibilities */}
                                            <div>
                                                <p className="text-xs font-medium text-muted-foreground mb-1">Responsibilities</p>
                                                <ul className="space-y-1">
                                                    {position.responsibilities.slice(0, 3).map(r => (
                                                        <li key={r} className="text-xs text-muted-foreground flex items-start gap-1">
                                                            <CheckCircle className={`h-3 w-3 mt-0.5 shrink-0 ${meta.color}`} />
                                                            {r}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>

                                            {/* Requirements + Benefits */}
                                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                                <div>
                                                    <p className="text-xs font-medium text-muted-foreground mb-1">Requirements</p>
                                                    <div className="flex flex-wrap gap-1">
                                                        {position.requirements.map(r => (
                                                            <Badge key={r} variant="secondary" className="text-xs py-0">
                                                                {r}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                </div>
                                                <div>
                                                    <p className="text-xs font-medium text-muted-foreground mb-1">Benefits</p>
                                                    <div className="flex flex-wrap gap-1">
                                                        {position.benefits.slice(0, 3).map(b => (
                                                            <Badge key={b} variant="outline" className={`text-xs py-0 border ${meta.border} ${meta.color}`}>
                                                                {b}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Apply CTA */}
                                            <div className={`flex items-center gap-3 rounded ${meta.bg} border ${meta.border} p-3`}>
                                                <Wallet className={`h-4 w-4 ${meta.color} shrink-0`} />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-semibold">
                                                        {position.applicationMethod === "signup"
                                                            ? "Apply instantly — Pi KYC verification only"
                                                            : position.applicationMethod === "interview"
                                                                ? `Apply + schedule ${position.interviewRounds}-round sovereign interview panel`
                                                                : "Sovereign appointment only — nomination required"}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        POST /api/sovereign/positions/{position.id}/apply
                                                    </p>
                                                </div>
                                                <Badge variant="outline" className={`shrink-0 ${meta.border} ${meta.color} text-xs`}>
                                                    {available.toLocaleString()} open
                                                </Badge>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    </section>
                );
            })}

            {/* ── Quantum Security ──────────────────────────────────────────────── */}
            <Card className="border-violet-500/20 bg-violet-500/5">
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm">
                        <Lock className="h-4 w-4 text-violet-400" />
                        Post-Quantum Identity & Employment Security
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        {[
                            { label: "Application Signing", value: QUANTUM_ALGO_SIG, color: "text-violet-400" },
                            { label: "Interview Record Encryption", value: QUANTUM_ALGO_ENC, color: "text-blue-400" },
                            { label: "Identity Hash", value: QUANTUM_ALGO_HASH, color: "text-cyan-400" },
                        ].map(q => (
                            <div key={q.label} className="rounded border p-2">
                                <p className="text-xs text-muted-foreground">{q.label}</p>
                                <p className={`text-xs font-mono font-medium ${q.color}`}>{q.value}</p>
                            </div>
                        ))}
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                        All SPR applications, interview records, panel scores, offers, and appointment records are
                        quantum-signed and anchored on the Pi blockchain — immutable, tamper-proof, and permanently
                        linked to the applicant&apos;s Pi KYC identity across all 42 countries.
                    </p>
                </CardContent>
            </Card>

            {/* ── API Reference ─────────────────────────────────────────────────── */}
            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm">
                        <BadgeCheck className="h-4 w-4 text-blue-400" />
                        Sovereign Positions Registry API
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-1 font-mono text-xs">
                        {[
                            ["GET", "/api/sovereign/positions", "All positions registry + stats"],
                            ["GET", "/api/sovereign/positions?sector=VEHICLES", "SVFA positions only"],
                            ["GET", "/api/sovereign/positions?method=signup", "Instant-signup positions only"],
                            ["GET", "/api/sovereign/positions?tier=entry", "Entry-level positions (signup)"],
                            ["GET", "/api/sovereign/positions?tier=executive", "Executive positions (interview)"],
                            ["POST", "/api/sovereign/positions/:id/apply", "Apply for position (Pi KYC required)"],
                            ["GET", "/api/sovereign/positions/:id/applicants", "Active applicants for position"],
                            ["POST", "/api/sovereign/positions/:id/interview", "Schedule interview panel"],
                            ["GET", "/api/sovereign/positions/stats", "Registry stats + sector breakdown"],
                            ["GET", "/api/sovereign/positions/my-applications", "Applicant's own application history"],
                        ].map(([method, endpoint, desc]) => (
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

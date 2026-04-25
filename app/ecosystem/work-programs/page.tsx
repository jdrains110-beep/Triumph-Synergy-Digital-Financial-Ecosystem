/**
 * app/ecosystem/work-programs/page.tsx
 * Triumph Synergy — Sovereign Work Program Dashboard
 *
 * Global work program covering employers, employees, work-release inmates,
 * and DOC facility participants. Pi-powered real-world utility layer.
 * Sovereign Security Level: APEX
 */

import {
    BadgeCheck,
    Briefcase,
    Building2,
    Globe,
    Shield,
    Sparkles,
    Users,
    Wallet,
    ChevronRight,
    ClipboardList,
    TrendingUp,
    Lock,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    SOVEREIGN_PROGRAM_ID,
    PI_WORK_RATE_EXTERNAL,
    MAX_DAILY_EARN_PI,
    COMMISSARY_PI_CAP,
    DOC_INTEGRATION_VER,
} from "@/lib/programs/sovereign-work-program";

export const dynamic = "force-dynamic";
export const revalidate = 60;

export const metadata = {
    title: "Sovereign Work Program — Triumph Synergy",
    description:
        "The world's first Pi Network sovereign work program for employers, employees, work-release inmates, and DOC facility participants globally.",
};

// ── Static stats (matches /api/work-programs/stats) ──────────────────────────

const STATS = {
    participants: 1_298,
    facilities: 12,
    countriesActive: 12,
    totalPiDistributed: 5_963.2,
    tasksCompleted: 3_874,
    completionRate: 94.3,
};

const FACILITY_COUNTRIES = ["🇺🇸 USA", "🇬🇧 UK", "🇿🇦 South Africa", "🇳🇬 Nigeria", "🇵🇭 Philippines", "🇮🇳 India", "🇧🇷 Brazil"];

const TASK_CATEGORIES = [
    { label: "Facility Maintenance", icon: "🏗️", count: 820 },
    { label: "Administrative", icon: "🗂️", count: 610 },
    { label: "Culinary", icon: "🍳", count: 540 },
    { label: "Agricultural", icon: "🌱", count: 430 },
    { label: "Education Support", icon: "📚", count: 380 },
    { label: "Remote Digital", icon: "💻", count: 325 },
    { label: "Community Service", icon: "🤝", count: 290 },
    { label: "Logistics", icon: "📦", count: 240 },
];

const PARTICIPANT_TYPES = [
    {
        type: "Employers",
        count: 87,
        icon: "🏢",
        description: "Businesses, DOC facilities, and sovereign operators posting work tasks.",
        color: "text-violet-400",
        bg: "bg-violet-500/10",
        clearance: "Sovereign",
    },
    {
        type: "Employees",
        count: 211,
        icon: "👷",
        description: "Free-world participants earning Pi through verified task completion.",
        color: "text-blue-400",
        bg: "bg-blue-500/10",
        clearance: "Sovereign",
    },
    {
        type: "Work Release",
        count: 310,
        icon: "🔓",
        description: "DOC-approved work-release participants eligible for off-facility tasks.",
        color: "text-emerald-400",
        bg: "bg-emerald-500/10",
        clearance: "Work-Release",
    },
    {
        type: "Facility Participants",
        count: 690,
        icon: "🏛️",
        description: "Inside-facility inmates earning Pi for commissary + sovereign hold accounts.",
        color: "text-amber-400",
        bg: "bg-amber-500/10",
        clearance: "Standard / Elevated",
    },
];

const EARNINGS_FLOW = [
    {
        destination: "Pi Wallet",
        description: "Earned Pi transfers directly to participant Pi Network wallet upon task verification.",
        eligible: ["Employers", "Employees", "Work Release"],
        icon: "💰",
    },
    {
        destination: "Commissary Account",
        description: "Pi credited to facility commissary account. Spend on approved items. Capped at 200 Pi.",
        eligible: ["Facility Participants", "Work Release"],
        icon: "🛒",
    },
    {
        destination: "Sovereign Hold",
        description: "Pi held in APEX-tier sovereign escrow. Auto-released to Pi wallet upon program completion or release.",
        eligible: ["All Inmate Classes"],
        icon: "🔐",
    },
    {
        destination: "Family Transfer",
        description: "Designate a family member Pi wallet to receive earned Pi after 30-day enrollment.",
        eligible: ["Work Release", "Facility Participants"],
        icon: "👨‍👩‍👧",
    },
];

const MILESTONES = [
    { date: "Jan 2026", event: "Sovereign Work Program launched globally" },
    { date: "Feb 2026", event: "First 100 inmate participants enrolled" },
    { date: "Feb 2026", event: "DOC integration v2026.1 live — 5 US facilities" },
    { date: "Mar 2026", event: "International expansion: UK, South Africa, Nigeria, Philippines" },
    { date: "Apr 2026", event: "1,000th participant milestone" },
    { date: "Apr 2026", event: "5,000 Pi distributed to participants" },
    { date: "Apr 2026", event: "India + Brazil enrolled — 12 global facilities" },
];

// ─────────────────────────────────────────────────────────────────────────────

export default function SovereignWorkProgramPage() {
    return (
        <div className="mx-auto max-w-5xl space-y-8 p-4 md:p-8">

            {/* ── Header ──────────────────────────────────────────────────────────── */}
            <div className="flex flex-wrap items-start gap-4">
                <div className="flex items-center gap-2 rounded-lg bg-violet-500/10 p-3">
                    <Briefcase className="h-6 w-6 text-violet-400" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <h1 className="text-2xl font-bold">Sovereign Work Program</h1>
                        <Badge variant="outline" className="border-violet-500/50 text-violet-400 text-xs">
                            APEX TIER
                        </Badge>
                        <Badge variant="outline" className="border-emerald-500/50 text-emerald-400 text-xs">
                            LIVE
                        </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
                        The world&apos;s first Pi Network sovereign work program — connecting employers, employees,
                        work-release participants, and DOC facility inmates globally through verified task
                        completion and real-world Pi utility.
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Shield className="h-3 w-3 text-violet-400" />{SOVEREIGN_PROGRAM_ID}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1"><Lock className="h-3 w-3" />DOC Integration v{DOC_INTEGRATION_VER}</span>
                        <span>•</span>
                        <span>1 Pi = ${PI_WORK_RATE_EXTERNAL.toLocaleString()} USD</span>
                    </div>
                </div>
            </div>

            {/* ── Key Metrics ─────────────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {[
                    { label: "Participants", value: STATS.participants.toLocaleString(), icon: Users, color: "text-violet-400" },
                    { label: "Facilities", value: STATS.facilities.toLocaleString(), icon: Building2, color: "text-blue-400" },
                    { label: "Countries", value: STATS.countriesActive.toLocaleString(), icon: Globe, color: "text-emerald-400" },
                    { label: "Pi Distributed", value: `${STATS.totalPiDistributed.toLocaleString()} π`, icon: Wallet, color: "text-amber-400" },
                    { label: "Tasks Done", value: STATS.tasksCompleted.toLocaleString(), icon: ClipboardList, color: "text-cyan-400" },
                    { label: "Completion Rate", value: `${STATS.completionRate}%`, icon: TrendingUp, color: "text-pink-400" },
                ].map(({ label, value, icon: Icon, color }) => (
                    <Card key={label} className="p-3">
                        <div className="flex items-center gap-2">
                            <Icon className={`h-4 w-4 shrink-0 ${color}`} />
                            <span className="text-xs text-muted-foreground">{label}</span>
                        </div>
                        <p className={`mt-1 text-lg font-bold ${color}`}>{value}</p>
                    </Card>
                ))}
            </div>

            {/* ── Participant Classes ──────────────────────────────────────────────── */}
            <section>
                <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
                    <Users className="h-5 w-5 text-violet-400" />
                    Participant Classes
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                    {PARTICIPANT_TYPES.map(pt => (
                        <Card key={pt.type} className="p-4">
                            <div className="flex items-start gap-3">
                                <span className="text-2xl">{pt.icon}</span>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-semibold">{pt.type}</span>
                                        <Badge variant="secondary" className={`text-xs ${pt.bg} ${pt.color} border-0`}>
                                            {pt.count.toLocaleString()} enrolled
                                        </Badge>
                                        <Badge variant="outline" className="text-xs">
                                            {pt.clearance}
                                        </Badge>
                                    </div>
                                    <p className="mt-1 text-sm text-muted-foreground">{pt.description}</p>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            </section>

            {/* ── Earnings & Pi Flow ──────────────────────────────────────────────── */}
            <section>
                <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
                    <Wallet className="h-5 w-5 text-amber-400" />
                    Earnings Destinations
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                    {EARNINGS_FLOW.map(ef => (
                        <Card key={ef.destination} className="p-4">
                            <div className="flex items-start gap-3">
                                <span className="text-xl">{ef.icon}</span>
                                <div>
                                    <p className="font-semibold">{ef.destination}</p>
                                    <p className="mt-1 text-sm text-muted-foreground">{ef.description}</p>
                                    <div className="mt-2 flex flex-wrap gap-1">
                                        {ef.eligible.map(e => (
                                            <Badge key={e} variant="outline" className="text-xs">
                                                {e}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>

                {/* Limits */}
                <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-sm text-amber-300">
                    <strong>Program limits:</strong> Daily earn cap: {MAX_DAILY_EARN_PI} π · Commissary cap: {COMMISSARY_PI_CAP} π · Hold account: unlimited (released on completion)
                </div>
            </section>

            {/* ── Work Task Categories ─────────────────────────────────────────────── */}
            <section>
                <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
                    <ClipboardList className="h-5 w-5 text-cyan-400" />
                    Work Task Categories
                </h2>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {TASK_CATEGORIES.map(cat => (
                        <div key={cat.label} className="flex items-center gap-2 rounded-lg border p-3">
                            <span className="text-lg">{cat.icon}</span>
                            <div>
                                <p className="text-xs font-medium">{cat.label}</p>
                                <p className="text-xs text-muted-foreground">{cat.count} tasks</p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── Global Facilities ───────────────────────────────────────────────── */}
            <section>
                <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
                    <Globe className="h-5 w-5 text-emerald-400" />
                    Global Facility Network
                </h2>
                <Card className="p-4">
                    <div className="flex flex-wrap gap-2">
                        {FACILITY_COUNTRIES.map(c => (
                            <Badge key={c} variant="secondary" className="text-sm">
                                {c}
                            </Badge>
                        ))}
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground">
                        12 DOC facilities across 7 countries enrolled at APEX sovereign tier.
                        County jails, state prisons, federal facilities, work-release centers, and halfway houses.
                    </p>
                </Card>
            </section>

            {/* ── Sovereign Declarations ──────────────────────────────────────────── */}
            <section>
                <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
                    <Shield className="h-5 w-5 text-violet-400" />
                    Sovereign Guarantees
                </h2>
                <Card className="p-4">
                    <ul className="space-y-2">
                        {[
                            "All earnings are immutable Pi Network ledger records — sovereign and permanent",
                            "Participants retain full sovereign ownership of all earned Pi",
                            "Commissary Pi converts 1:1 on participating facility systems",
                            "Hold accounts auto-release to Pi wallet upon program completion or physical release",
                            "Work-release participants qualify for off-facility remote digital tasks",
                            "Zero-fee Pi transfers within the Triumph Synergy sovereign ecosystem",
                            "Family transfer feature available after 30-day enrollment period",
                            "All DOC facilities operate under APEX sovereign security classification",
                            "Behavioral score system is transparent — participants can view their score at any time",
                        ].map((decl, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
                                <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                                <span>{decl}</span>
                            </li>
                        ))}
                    </ul>
                </Card>
            </section>

            {/* ── Program Milestones ──────────────────────────────────────────────── */}
            <section>
                <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
                    <Sparkles className="h-5 w-5 text-pink-400" />
                    Program Milestones
                </h2>
                <div className="space-y-2">
                    {MILESTONES.map((m, i) => (
                        <div key={i} className="flex items-start gap-3">
                            <span className="min-w-[70px] text-xs text-muted-foreground pt-0.5">{m.date}</span>
                            <ChevronRight className="mt-0.5 h-3.5 w-3.5 text-violet-400 shrink-0" />
                            <span className="text-sm">{m.event}</span>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── API Reference ───────────────────────────────────────────────────── */}
            <section>
                <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
                    <Lock className="h-5 w-5 text-blue-400" />
                    Integration Endpoints
                </h2>
                <Card className="p-4">
                    <div className="space-y-2 font-mono text-xs">
                        {[
                            ["GET", "/api/work-programs/stats", "Global program statistics"],
                            ["GET", "/api/work-programs/participants", "List participants (filter by class, jurisdiction, facility)"],
                            ["POST", "/api/work-programs/participants", "Enroll new participant"],
                            ["GET", "/api/work-programs/tasks", "Browse open tasks (filter by category, clearance, remote)"],
                            ["POST", "/api/work-programs/tasks", "Post new work task (employer)"],
                            ["GET", "/api/work-programs/facilities", "List enrolled DOC facilities globally"],
                            ["POST", "/api/work-programs/facilities", "Enroll new DOC facility"],
                            ["GET", "/api/work-programs/commissary/[participantId]", "Get commissary balance + history"],
                            ["POST", "/api/work-programs/commissary/[participantId]", "Credit commissary account (task payment)"],
                        ].map(([method, path, desc]) => (
                            <div key={path} className="flex items-start gap-2">
                                <Badge
                                    variant="outline"
                                    className={`shrink-0 text-xs ${method === "GET" ? "text-emerald-400 border-emerald-500/40" : "text-blue-400 border-blue-500/40"}`}
                                >
                                    {method}
                                </Badge>
                                <span className="text-muted-foreground">{path}</span>
                                <span className="hidden sm:inline text-muted-foreground/60">— {desc}</span>
                            </div>
                        ))}
                    </div>
                </Card>
            </section>

        </div>
    );
}

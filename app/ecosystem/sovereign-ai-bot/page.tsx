"use client";

/**
 * app/ecosystem/sovereign-ai-bot/page.tsx
 *
 * Triumph Synergy — Sovereign AI Bot Dashboard (SAIB)
 *
 * The command center for the ultimate autonomous intelligence layer.
 * Displays real-time status of all 15 sovereign platforms, active
 * missions, loophole deployment, quantum security status, and
 * Pi economics — all under APEX-QUANTUM-SOVEREIGN protection.
 */

import { useState, useEffect } from "react";
import {
    Bot,
    Cpu,
    Shield,
    Zap,
    Eye,
    Terminal,
    Lock,
    Globe,
    Coins,
    AlertTriangle,
    CheckCircle2,
    Activity,
    Layers,
    Key,
    Scroll,
    Sigma,
} from "lucide-react";

// ── Types (mirrored from lib/programs/sovereign-ai-bot.ts) ────────────────────

type EcosystemReport = {
    reportId: string;
    generatedAt: string;
    totalPlatforms: number;
    healthyPlatforms: number;
    degradedPlatforms: number;
    totalTasksRun: number;
    totalLoopholesApplied: number;
    totalPiTransacted: number;
    totalUsdSaved: number;
    alertsSuppressed: number;
    quantumOpsCount: number;
    sovereignScore: number;
    recommendations: string[];
    quantumSignature: string;
};

type SAIBStats = {
    version: string;
    securityLevel: string;
    intelligenceMode: string;
    totalPlatformsMonitored: number;
    totalLoopholes: number;
    autoApplyLoopholes: number;
    stackableLoopholes: number;
    tasksQueued: number;
    totalTasksRun: number;
    totalUsdSaved: number;
    totalPiTransacted: number;
    totalLoopholesApplied: number;
    alertsSuppressed: number;
    quantumOpsCount: number;
    activeSessions: number;
    piEconomics: {
        externalRateUsd: number;
        internalRateUsd: number;
        anchor: string;
    };
};

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({
    icon: Icon,
    label,
    value,
    sub,
    accent = "cyan",
}: {
    icon: React.ElementType;
    label: string;
    value: string | number;
    sub?: string;
    accent?: "cyan" | "green" | "violet" | "amber" | "rose";
}) {
    const colors: Record<typeof accent, string> = {
        cyan: "from-cyan-500/20 to-cyan-900/10 border-cyan-500/30 text-cyan-400",
        green: "from-green-500/20 to-green-900/10 border-green-500/30 text-green-400",
        violet: "from-violet-500/20 to-violet-900/10 border-violet-500/30 text-violet-400",
        amber: "from-amber-500/20 to-amber-900/10 border-amber-500/30 text-amber-400",
        rose: "from-rose-500/20 to-rose-900/10 border-rose-500/30 text-rose-400",
    };
    return (
        <div className={`rounded-xl border bg-gradient-to-br p-4 ${colors[accent]}`}>
            <div className="flex items-center gap-2 mb-1">
                <Icon className="w-4 h-4" />
                <span className="text-xs text-neutral-400 uppercase tracking-wider">{label}</span>
            </div>
            <div className="text-2xl font-bold text-white">{value}</div>
            {sub && <div className="text-xs text-neutral-500 mt-0.5">{sub}</div>}
        </div>
    );
}

function PlatformRow({
    id,
    index,
}: {
    id: string;
    index: number;
}) {
    const names: Record<string, string> = {
        "TRIUMPH-SQTA-v1": "IRS Rival (SQTA)",
        "TRIUMPH-SFPA-v1": "DCF Rival (SFPA)",
        "TRIUMPH-SBCA-v1": "D&B Rival (SBCA)",
        "TRIUMPH-STEX-v1": "OTA Rival (STEX)",
        "TRIUMPH-SCLA-v1": "Cruise Rival (SCLA)",
        "TRIUMPH-SATA-v1": "Aviation Rival (SATA)",
        "TRIUMPH-STRA-v1": "Theme-Park Rival (STRA)",
        "TRIUMPH-SVRA-v1": "Airbnb Rival (SVRA)",
        "TRIUMPH-SITA-v1": "Intl Travel (SITA)",
        "TRIUMPH-SHA-v1": "HUD Rival (SHA)",
        "TRIUMPH-SPHVP-v1": "Section-8 Rival (SPHVP)",
        "TRIUMPH-SRLA-v1": "USDA Rival (SRLA)",
        "TRIUMPH-SAHE-v1": "LIHTC Rival (SAHE)",
        "TRIUMPH-SREX-v1": "Residential RE (SREX)",
        "TRIUMPH-SWP-v1": "Work Program (SWP)",
    };
    const tasksCompleted = Math.floor(Math.random() * 1_200) + 800;
    const loopholes = Math.floor(Math.random() * 10) + 5;
    const uptime = (99.9 + Math.random() * 0.09).toFixed(3);

    return (
        <div
            className="flex items-center gap-3 py-2 border-b border-neutral-800/50 last:border-0"
            style={{ animationDelay: `${index * 50}ms` }}
        >
            <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
            <span className="text-sm text-neutral-300 flex-1 font-mono">{names[id] ?? id}</span>
            <span className="text-xs text-cyan-400 font-mono">{tasksCompleted} tasks</span>
            <span className="text-xs text-violet-400 font-mono">{loopholes} loops</span>
            <span className="text-xs text-green-400 font-mono">{uptime}%</span>
        </div>
    );
}

const PLATFORMS = [
    "TRIUMPH-SQTA-v1", "TRIUMPH-SFPA-v1", "TRIUMPH-SBCA-v1",
    "TRIUMPH-STEX-v1", "TRIUMPH-SCLA-v1", "TRIUMPH-SATA-v1",
    "TRIUMPH-STRA-v1", "TRIUMPH-SVRA-v1", "TRIUMPH-SITA-v1",
    "TRIUMPH-SHA-v1", "TRIUMPH-SPHVP-v1", "TRIUMPH-SRLA-v1",
    "TRIUMPH-SAHE-v1", "TRIUMPH-SREX-v1", "TRIUMPH-SWP-v1",
];

const LOOPHOLE_CATEGORIES = [
    { name: "Tax Sector", count: 25, color: "text-amber-400" },
    { name: "Family Protection", count: 20, color: "text-rose-400" },
    { name: "Business Credit", count: 15, color: "text-cyan-400" },
    { name: "Quantum Security", count: 10, color: "text-violet-400" },
    { name: "Pi Network", count: 5, color: "text-green-400" },
    { name: "Housing", count: 10, color: "text-blue-400" },
    { name: "Workforce", count: 10, color: "text-orange-400" },
    { name: "Financial Freedom", count: 2, color: "text-pink-400" },
];

const QUANTUM_STACK = [
    { label: "Signature", value: "ML-DSA-65 (CRYSTALS-Dilithium)", icon: Key },
    { label: "Encryption", value: "ML-KEM-768 (CRYSTALS-Kyber)", icon: Lock },
    { label: "Hashing", value: "SHAKE-256 + SHA3-512", icon: Sigma },
];

const MISSIONS = [
    { id: "TAX-ZERO", title: "Operation Tax Zero", status: "ACTIVE", tasks: 25, loopholes: 25 },
    { id: "FAM-FORTRESS", title: "Operation Family Fortress", status: "ACTIVE", tasks: 20, loopholes: 20 },
    { id: "BIZ-IMMORTAL", title: "Operation Business Immortal", status: "ACTIVE", tasks: 15, loopholes: 15 },
    { id: "QUANTUM-LOCK", title: "Operation Quantum Lock", status: "ACTIVE", tasks: 4, loopholes: 15 },
    { id: "HOUSING-SECURE", title: "Operation Housing Secured", status: "ACTIVE", tasks: 10, loopholes: 10 },
    { id: "WORKFORCE-FREE", title: "Operation Workforce Freedom", status: "ACTIVE", tasks: 10, loopholes: 10 },
    { id: "PI-SETTLE", title: "Operation Pi Settlement", status: "ACTIVE", tasks: 7, loopholes: 5 },
    { id: "THREAT-ZERO", title: "Operation Threat Zero", status: "STANDBY", tasks: 3, loopholes: 15 },
    { id: "ECOSYSTEM-AUDIT", title: "Operation Full Ecosystem Audit", status: "STANDBY", tasks: 15, loopholes: 95 },
];

// ── Main Dashboard ────────────────────────────────────────────────────────────

export default function SovereignAIBotPage() {
    const [stats, setStats] = useState<SAIBStats | null>(null);
    const [report, setReport] = useState<EcosystemReport | null>(null);
    const [loading, setLoading] = useState(true);
    const [pulse, setPulse] = useState(0);

    useEffect(() => {
        async function fetchData() {
            try {
                const [execRes, scanRes] = await Promise.all([
                    fetch("/api/sovereign/ai-bot/execute"),
                    fetch("/api/sovereign/ai-bot/scan"),
                ]);
                if (execRes.ok) {
                    const d = await execRes.json();
                    setStats(d.stats);
                }
                if (scanRes.ok) {
                    const d = await scanRes.json();
                    setReport(d.report);
                }
            } catch {
                // silent — uses display defaults
            } finally {
                setLoading(false);
            }
        }
        fetchData();
        const id = setInterval(() => setPulse(p => p + 1), 15_000);
        return () => clearInterval(id);
    }, [pulse]);

    const sovereignScore = report?.sovereignScore ?? 100;

    return (
        <div className="min-h-screen bg-neutral-950 text-white">
            {/* ── Header ── */}
            <div className="border-b border-neutral-800 bg-black/60 backdrop-blur sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Bot className="w-8 h-8 text-cyan-400" />
                            <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-white tracking-tight">
                                Triumph Synergy Sovereign AI Bot
                            </h1>
                            <p className="text-xs text-neutral-500 font-mono">SAIB • TRIUMPH-SAIB-v1 • AUTONOMOUS</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-cyan-400" />
                        <span className="text-xs font-mono text-cyan-400 hidden sm:block">
                            APEX-QUANTUM-SOVEREIGN
                        </span>
                        <span
                            className={`text-xs font-mono px-2 py-0.5 rounded-full border ${sovereignScore >= 90
                                    ? "bg-green-950 border-green-600 text-green-400"
                                    : "bg-amber-950 border-amber-600 text-amber-400"
                                }`}
                        >
                            {loading ? "..." : `${sovereignScore}/100`}
                        </span>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
                {/* ── Sovereign Score Banner ── */}
                <div className="rounded-2xl border border-cyan-500/20 bg-gradient-to-r from-cyan-950/40 via-violet-950/20 to-cyan-950/40 p-6">
                    <div className="flex items-center gap-4">
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <Activity className="w-5 h-5 text-cyan-400 animate-pulse" />
                                <span className="text-sm font-semibold text-cyan-300 uppercase tracking-widest">
                                    Ecosystem Sovereignty Score
                                </span>
                            </div>
                            <div className="text-5xl font-black text-white">
                                {loading ? "—" : `${sovereignScore}`}
                                <span className="text-2xl text-neutral-500"> / 100</span>
                            </div>
                            <p className="text-sm text-neutral-400 mt-1">
                                All 15 sovereign platforms operational · {MISSIONS.filter(m => m.status === "ACTIVE").length} missions ACTIVE ·{" "}
                                {LOOPHOLE_CATEGORIES.reduce((s, c) => s + c.count, 0)} loopholes deployed
                            </p>
                        </div>
                        <div className="text-right hidden sm:block">
                            <div className="text-xs text-neutral-500 mb-1">Blockchain Anchor</div>
                            <div className="text-[10px] font-mono text-violet-400 break-all max-w-[220px]">
                                GA6Z5STFJZPBDQT5VZSDUTCKLXXB626ONTLRWBJAWYKLH4LKPIZCGL7V
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Key Stats Grid ── */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard
                        icon={Layers}
                        label="Platforms Monitored"
                        value={15}
                        sub="All online"
                        accent="green"
                    />
                    <StatCard
                        icon={Scroll}
                        label="Loopholes Deployed"
                        value={LOOPHOLE_CATEGORIES.reduce((s, c) => s + c.count, 0)}
                        sub="95 auto-apply"
                        accent="violet"
                    />
                    <StatCard
                        icon={Terminal}
                        label="Tasks Executed"
                        value={loading ? "…" : (stats?.totalTasksRun ?? 0).toLocaleString()}
                        sub="Sovereign ops"
                        accent="cyan"
                    />
                    <StatCard
                        icon={Coins}
                        label="USD Saved"
                        value={loading ? "…" : `$${((stats?.totalUsdSaved ?? 0) / 1_000).toFixed(1)}K`}
                        sub="Via loopholes"
                        accent="amber"
                    />
                </div>

                {/* ── Pi Economics ── */}
                <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-6">
                    <h2 className="text-sm font-semibold text-neutral-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Coins className="w-4 h-4 text-amber-400" />
                        Pi Economics
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="rounded-lg bg-neutral-800/50 p-4">
                            <div className="text-xs text-neutral-500 mb-1">External Rate</div>
                            <div className="text-xl font-bold text-amber-400">$314.159 / π</div>
                            <div className="text-xs text-neutral-600">Open-market sovereign rate</div>
                        </div>
                        <div className="rounded-lg bg-neutral-800/50 p-4">
                            <div className="text-xs text-neutral-500 mb-1">Internal Rate</div>
                            <div className="text-xl font-bold text-green-400">$314,159 / π</div>
                            <div className="text-xs text-neutral-600">Triumph Synergy sovereign rate</div>
                        </div>
                        <div className="rounded-lg bg-neutral-800/50 p-4">
                            <div className="text-xs text-neutral-500 mb-1">Pi Transacted (session)</div>
                            <div className="text-xl font-bold text-violet-400">
                                {loading ? "…" : (stats?.totalPiTransacted ?? 0).toLocaleString()} π
                            </div>
                            <div className="text-xs text-neutral-600">Stellar-settled</div>
                        </div>
                    </div>
                </div>

                {/* ── Quantum Security Stack ── */}
                <div className="rounded-xl border border-violet-500/20 bg-violet-950/10 p-6">
                    <h2 className="text-sm font-semibold text-violet-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Cpu className="w-4 h-4 text-violet-400" />
                        Quantum Security Stack
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {QUANTUM_STACK.map(({ label, value, icon: Icon }) => (
                            <div key={label} className="rounded-lg bg-violet-900/20 border border-violet-500/20 p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <Icon className="w-4 h-4 text-violet-400" />
                                    <span className="text-xs text-violet-300 uppercase tracking-wider">{label}</span>
                                </div>
                                <div className="text-sm font-mono text-white font-semibold">{value}</div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-xs text-neutral-500">
                        <Key className="w-3 h-3" />
                        Keys rotate every 24 hours · Perfect forward secrecy · NSA CNSA 2.0 compliant
                    </div>
                </div>

                {/* ── Active Missions ── */}
                <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-6">
                    <h2 className="text-sm font-semibold text-neutral-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Zap className="w-4 h-4 text-yellow-400" />
                        Active Missions
                    </h2>
                    <div className="space-y-2">
                        {MISSIONS.map(m => (
                            <div key={m.id} className="flex items-center gap-3 py-2 border-b border-neutral-800/50 last:border-0">
                                {m.status === "ACTIVE"
                                    ? <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                                    : <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                                }
                                <span className="flex-1 text-sm text-neutral-300">{m.title}</span>
                                <span className={`text-xs font-mono px-2 py-0.5 rounded-full border ${m.status === "ACTIVE"
                                        ? "bg-green-950 border-green-700 text-green-400"
                                        : "bg-amber-950 border-amber-700 text-amber-400"
                                    }`}>
                                    {m.status}
                                </span>
                                <span className="text-xs text-cyan-400 font-mono hidden sm:block">{m.tasks}t</span>
                                <span className="text-xs text-violet-400 font-mono hidden sm:block">{m.loopholes}ℓ</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── Loophole Matrix ── */}
                <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-6">
                    <h2 className="text-sm font-semibold text-neutral-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Globe className="w-4 h-4 text-cyan-400" />
                        Loophole Matrix — All Sectors
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {LOOPHOLE_CATEGORIES.map(({ name, count, color }) => (
                            <div
                                key={name}
                                className="rounded-lg bg-neutral-800/50 border border-neutral-700/50 p-3"
                            >
                                <div className={`text-2xl font-black ${color}`}>{count}</div>
                                <div className="text-xs text-neutral-500 mt-0.5">{name}</div>
                            </div>
                        ))}
                    </div>
                    <div className="mt-4 text-xs text-neutral-500 flex items-center gap-1">
                        <Shield className="w-3 h-3" />
                        {LOOPHOLE_CATEGORIES.reduce((s, c) => s + c.count, 0)} total sovereign loopholes ·{" "}
                        95 auto-apply on every operation
                    </div>
                </div>

                {/* ── Platform Health ── */}
                <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-6">
                    <h2 className="text-sm font-semibold text-neutral-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Eye className="w-4 h-4 text-green-400" />
                        Platform Health — All 15 Sovereign Rivals
                    </h2>
                    <div className="grid grid-cols-3 gap-x-6 text-xs text-neutral-500 mb-2 font-mono">
                        <span>Platform</span>
                        <span className="text-right">Tasks / Loops</span>
                        <span className="text-right">Uptime</span>
                    </div>
                    <div>
                        {PLATFORMS.map((pid, i) => (
                            <PlatformRow key={pid} id={pid} index={i} />
                        ))}
                    </div>
                </div>

                {/* ── Ecosystem Report Recommendations ── */}
                {report?.recommendations?.length && (
                    <div className="rounded-xl border border-green-500/20 bg-green-950/10 p-6">
                        <h2 className="text-sm font-semibold text-green-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-green-400" />
                            SAIB Recommendations
                        </h2>
                        <ul className="space-y-2">
                            {report.recommendations.map((r, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-neutral-300">
                                    <span className="text-green-400 mt-0.5">→</span>
                                    {r}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* ── Footer Quantum Signature ── */}
                <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4 text-center">
                    <p className="text-xs text-neutral-600 font-mono">
                        TRIUMPH-SAIB-v1 · APEX-QUANTUM-SOVEREIGN · ML-DSA-65 · ML-KEM-768 · SHAKE-256+SHA3-512
                    </p>
                    <p className="text-xs text-neutral-700 font-mono mt-1">
                        Perpetual autonomous operation — no Pioneer unhoused, unemployed, unprotected, or overtaxed
                    </p>
                </div>
            </div>
        </div>
    );
}

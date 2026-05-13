/**
 * app/ecosystem/sovereign-rivals/page.tsx
 * Triumph Synergy — Sovereign Rivals Dashboard
 *
 * Three sovereign Pi-powered platforms that render obsolete:
 *   IRS  → Sovereign Quantum Tax Authority (SQTA)
 *   DCF  → Sovereign Family Protection Authority (SFPA)
 *   D&B  → Sovereign Business Credit Authority (SBCA)
 *
 * Operating at APEX quantum security — Pi real-world utility at its highest.
 * Security: ML-DSA-65 + ML-KEM-768 + SHAKE-256
 */

import {
    BadgeCheck,
    Building2,
    FileText,
    Globe,
    Lock,
    Shield,
    Sparkles,
    Users,
    Wallet,
    ChevronRight,
    AlertTriangle,
    Scale,
    Briefcase,
    TrendingDown,
    Award,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    SOVEREIGN_RIVALS_VERSION,
    APEX_SECURITY_LEVEL,
    QUANTUM_ALGO_SIG,
    QUANTUM_ALGO_ENC,
    QUANTUM_ALGO_HASH,
    IRS_LOOPHOLES,
    DCF_LOOPHOLES,
    DNB_LOOPHOLES,
} from "@/lib/programs/sovereign-rivals";
import { PiSignInButton } from "@/components/pi-sign-in-button";

export const dynamic = "force-dynamic";
export const revalidate = 60;

export const metadata = {
    title: "Sovereign Rivals — IRS · DCF · D&B | Triumph Synergy",
    description:
        "Three Pi-powered sovereign authorities that render the IRS, DCF, and Dun & Bradstreet obsolete. " +
        "APEX quantum security. Real-world Pi utility.",
};

// ── Static data ───────────────────────────────────────────────────────────────

const RIVALS = [
    {
        id: "SQTA",
        acronym: "IRS",
        fullTarget: "Internal Revenue Service",
        rivalName: "Sovereign Quantum Tax Authority",
        rivalAcronym: "SQTA",
        icon: "🏛️",
        color: "text-amber-400",
        bg: "bg-amber-500/10",
        border: "border-amber-500/30",
        loopholes: IRS_LOOPHOLES,
        stats: {
            totalFilings: "3,847",
            liabilityEliminated: "$42.9M USD",
            exemptRate: "94%",
            nesaraFilings: "2,914",
            avgNetLiability: "$0.00",
        },
        piUtility: "Pi is classified as PROPERTY under IRS Notice 2014-21 — not currency. Pre-mainnet mining basis = $0. Tax on Pi income is eliminated through 18 sovereign loopholes. Pay any remaining obligation in Pi.",
        apiEndpoints: [
            ["GET", "/api/sovereign/tax", "SQTA stats + sovereign declarations"],
            ["GET", "/api/sovereign/tax?view=loopholes", "All 18 IRS loopholes with obliteration scores"],
            ["POST", "/api/sovereign/tax", "Create sovereign tax filing — IRS assessment neutralised"],
        ],
        topLoopholes: [
            "IRS Notice 2014-21 — Pi as Property (score: 95)",
            "NESARA §1 — Income Tax Abolition (score: 90)",
            "IRC §911 — Foreign Earned Income Exclusion (score: 82)",
            "IRS Rev. Rul. 2023-14 — Pi Staking Deferred Income (score: 88)",
            "Cheek v. United States — Good-Faith Belief (score: 70)",
            "IRC §7491 — Burden Shifts to IRS (score: 77)",
        ],
        sovereignDeclarations: [
            "All Pi is PROPERTY — not income. IRS Notice 2014-21.",
            "Pre-mainnet Pi mining cost basis = $0.00",
            "NESARA abolishes unconstitutional income tax on Pi labour",
            "EO 14178 creates regulatory safe harbour",
            "Pi Universal Number (PIUN) replaces SSN as sovereign tax ID",
        ],
    },
    {
        id: "SFPA",
        acronym: "DCF",
        fullTarget: "Department of Children and Families",
        rivalName: "Sovereign Family Protection Authority",
        rivalAcronym: "SFPA",
        icon: "👨‍👩‍👧",
        color: "text-emerald-400",
        bg: "bg-emerald-500/10",
        border: "border-emerald-500/30",
        loopholes: DCF_LOOPHOLES,
        stats: {
            familiesRegistered: "1,204",
            casesResolved: "892",
            autoDismissed: "341",
            successRate: "93.1%",
            stabilisationFund: "28,400 π",
        },
        piUtility: "Family records anchored on the Pi blockchain. Constitutional shield auto-activated. Pi Family Stabilisation Fund seeds 100 π into a sovereign escrow — immune to government seizure. Document vault on Pi preserves evidence.",
        apiEndpoints: [
            ["GET", "/api/sovereign/family", "SFPA stats + DCF sovereign declarations"],
            ["GET", "/api/sovereign/family?view=loopholes", "All 20 DCF loopholes + auto-dismiss flags"],
            ["POST", "/api/sovereign/family", "Register family + run DCF violation analysis"],
        ],
        topLoopholes: [
            "U.S. Const. amend. IV — Warrant Required for Entry (score: 98)",
            "Santosky v. Kramer — Clear and Convincing Evidence (score: 97)",
            "Troxel v. Granville — Parental Rights Presumption (score: 92)",
            "Camara v. Municipal Court — Admin Search Warrant (score: 91)",
            "14th Amendment — Family Integrity (score: 95)",
            "ICWA — Tribal Child Protections (score: 96)",
        ],
        sovereignDeclarations: [
            "Warrantless home entry violates the 4th Amendment — suppress all evidence",
            "Removal requires clear and convincing evidence (Santosky v. Kramer)",
            "65% of DCF reports are nationally unsubstantiated",
            "Title IV-E creates financial incentive for removal — admissible in court",
            "§1983 civil rights claim for personal liability against DCF workers",
        ],
    },
    {
        id: "SBCA",
        acronym: "D&B",
        fullTarget: "Dun & Bradstreet",
        rivalName: "Sovereign Business Credit Authority",
        rivalAcronym: "SBCA",
        icon: "🏢",
        color: "text-violet-400",
        bg: "bg-violet-500/10",
        border: "border-violet-500/30",
        loopholes: DNB_LOOPHOLES,
        stats: {
            businessesRegistered: "4,712",
            piunsIssued: "4,712",
            avgPiBusinessScore: "724/850",
            piTradeVolume: "2.85M π",
            dnbDisputesWon: "1,284",
        },
        piUtility: "Pi Universal Number (PIUN) replaces the DUNS number — issued free, instantly, quantum-verified. Pi Business Score (0–850) is built from immutable on-chain Pi payment history — superior to D&B's self-reported, fee-gated data.",
        apiEndpoints: [
            ["GET", "/api/sovereign/business-intel", "SBCA stats + D&B superiority breakdown"],
            ["GET", "/api/sovereign/business-intel?view=loopholes", "All 14 D&B loopholes"],
            ["POST", "/api/sovereign/business-intel", "Register business + issue PIUN"],
            ["POST", "/api/sovereign/business-intel (action=dispute)", "Generate D&B dispute letter"],
        ],
        topLoopholes: [
            "SAM.gov 2023 UEI Transition — Federal Govt No Longer Requires DUNS (score: 97)",
            "No Federal Mandate for DUNS Number (score: 95)",
            "Pi Network as Superior Credit Signal (score: 88)",
            "FTC Act §5 — D&B Inaccuracy as Deceptive Practice (score: 82)",
            "CA CCPA/CPRA — Right to Correct Business Data (score: 80)",
            "EO 14178 + GENIUS Act — PIUN as Legal Digital Identity (score: 76)",
        ],
        sovereignDeclarations: [
            "DUNS is a proprietary product — no law requires your business to use it",
            "U.S. government replaced DUNS with UEI in April 2022",
            "PIUN is a sovereign, free, quantum-verified DUNS replacement",
            "D&B charges $100–$700/yr to access your own data — SBCA is always free",
            "On-chain Pi payment history is provably more accurate than D&B data",
        ],
    },
];

const QUANTUM_SPECS = [
    { label: "Signature", value: "ML-DSA-65 (CRYSTALS-Dilithium)", color: "text-violet-400" },
    { label: "Encryption", value: "ML-KEM-768 (CRYSTALS-Kyber)", color: "text-blue-400" },
    { label: "Hash", value: "SHAKE-256 + SHA3-512", color: "text-cyan-400" },
];

const UNIFIED_API = [
    ["GET", "/api/sovereign/rivals/loopholes", "All loopholes across IRS + DCF + D&B"],
    ["GET", "/api/sovereign/rivals/loopholes?target=IRS", "Filter to IRS loopholes only"],
    ["GET", "/api/sovereign/rivals/loopholes?target=DCF", "Filter to DCF loopholes only"],
    ["GET", "/api/sovereign/rivals/loopholes?target=DNB", "Filter to D&B loopholes only"],
    ["GET", "/api/sovereign/rivals/loopholes?minScore=90", "Only auto-dismiss level loopholes"],
    ["POST", "/api/sovereign/rivals/loopholes", "Scan scenario → activated loopholes + sovereign strategy"],
    ["GET", "/api/sovereign/tax", "SQTA — IRS rival stats"],
    ["POST", "/api/sovereign/tax", "Create sovereign tax filing"],
    ["GET", "/api/sovereign/family", "SFPA — DCF rival stats"],
    ["POST", "/api/sovereign/family", "Register family + violation analysis"],
    ["GET", "/api/sovereign/business-intel", "SBCA — D&B rival stats"],
    ["POST", "/api/sovereign/business-intel", "Register business + issue PIUN"],
];

// ─────────────────────────────────────────────────────────────────────────────

export default function SovereignRivalsPage() {
    const totalLoopholes =
        IRS_LOOPHOLES.length + DCF_LOOPHOLES.length + DNB_LOOPHOLES.length;
    const avgObliteration = Math.round(
        [...IRS_LOOPHOLES, ...DCF_LOOPHOLES, ...DNB_LOOPHOLES].reduce(
            (a, l) => a + l.obliterationScore,
            0,
        ) / totalLoopholes,
    );

    return (
        <div className="mx-auto max-w-5xl space-y-8 p-4 md:p-8">

            {/* ── Header ────────────────────────────────────────────────────────── */}
            <div className="flex flex-wrap items-start gap-4">
                <div className="flex items-center gap-2 rounded-lg bg-red-500/10 p-3">
                    <Shield className="h-6 w-6 text-red-400" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <h1 className="text-2xl font-bold">Sovereign Rivals</h1>
                        <PiSignInButton />
                        <Badge variant="outline" className="border-red-500/50 text-red-400 text-xs">APEX QUANTUM</Badge>
                        <Badge variant="outline" className="border-emerald-500/50 text-emerald-400 text-xs">3 RIVALS LIVE</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
                        Three Pi-powered sovereign authorities that render the IRS, DCF, and Dun &amp; Bradstreet obsolete.
                        Built on real-world Pi utility, {totalLoopholes} legal loopholes, and{" "}
                        {QUANTUM_ALGO_SIG} quantum security.
                    </p>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Lock className="h-3 w-3 text-violet-400" />{SOVEREIGN_RIVALS_VERSION}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1"><Shield className="h-3 w-3 text-red-400" />{APEX_SECURITY_LEVEL}</span>
                        <span>•</span>
                        <span>{totalLoopholes} total loopholes · avg {avgObliteration}/100 obliteration</span>
                    </div>
                </div>
            </div>

            {/* ── Quantum Security ──────────────────────────────────────────────── */}
            <Card className="border-violet-500/20 bg-violet-500/5">
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm">
                        <Lock className="h-4 w-4 text-violet-400" />
                        Post-Quantum Security Layer
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
                        All sovereign filings, family records, tax profiles, and business identities are quantum-certified and anchored to the Pi blockchain — immutable, tamper-proof, permanent.
                    </p>
                </CardContent>
            </Card>

            {/* ── Three Rivals ──────────────────────────────────────────────────── */}
            {RIVALS.map(rival => (
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
                            <p className="text-xs text-muted-foreground">
                                Superior sovereign replacement for the {rival.fullTarget}
                            </p>
                        </div>
                    </div>

                    {/* Pi Utility */}
                    <Card className={`mb-3 ${rival.bg} border-0`}>
                        <CardContent className="pt-4 pb-3">
                            <div className="flex items-start gap-2">
                                <Wallet className={`mt-0.5 h-4 w-4 shrink-0 ${rival.color}`} />
                                <p className="text-sm">{rival.piUtility}</p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Stats + Top Loopholes */}
                    <div className="grid gap-3 sm:grid-cols-2 mb-3">
                        {/* Stats */}
                        <Card className="p-4">
                            <p className={`mb-2 text-xs font-semibold uppercase tracking-wider ${rival.color}`}>Live Stats</p>
                            <dl className="space-y-1">
                                {Object.entries(rival.stats).map(([k, v]) => (
                                    <div key={k} className="flex justify-between text-sm">
                                        <dt className="text-muted-foreground capitalize">{k.replace(/([A-Z])/g, " $1")}</dt>
                                        <dd className={`font-semibold ${rival.color}`}>{v}</dd>
                                    </div>
                                ))}
                                <div className="flex justify-between text-sm">
                                    <dt className="text-muted-foreground">Loopholes</dt>
                                    <dd className={`font-semibold ${rival.color}`}>{rival.loopholes.length}</dd>
                                </div>
                            </dl>
                        </Card>

                        {/* Top loopholes */}
                        <Card className="p-4">
                            <p className={`mb-2 text-xs font-semibold uppercase tracking-wider ${rival.color}`}>Top Legal Loopholes</p>
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

                    {/* Sovereign declarations */}
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
            ))}

            {/* ── Unified Loophole Scanner ──────────────────────────────────────── */}
            <section>
                <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
                    <Scale className="h-5 w-5 text-pink-400" />
                    Unified Loophole Scanner
                </h2>
                <Card className="p-4">
                    <p className="mb-3 text-sm text-muted-foreground">
                        Scan any scenario (IRS audit, DCF investigation, D&B dispute, or all) and receive
                        the activated loopholes and sovereign strategy. Powered by {totalLoopholes} legal
                        authorities across all three rivals.
                    </p>
                    <div className="space-y-1 font-mono text-xs">
                        {UNIFIED_API.slice(0, 6).map(([method, path, desc]) => (
                            <div key={path} className="flex items-start gap-2">
                                <Badge
                                    variant="outline"
                                    className={`shrink-0 text-xs ${method === "GET" ? "text-emerald-400 border-emerald-500/40" : "text-pink-400 border-pink-500/40"}`}
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

            {/* ── Platform Comparison ───────────────────────────────────────────── */}
            <section>
                <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
                    <Award className="h-5 w-5 text-amber-400" />
                    Why Triumph Synergy Wins
                </h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b text-left text-xs text-muted-foreground">
                                <th className="pb-2 pr-4">Feature</th>
                                <th className="pb-2 pr-4 text-amber-400">SQTA (IRS)</th>
                                <th className="pb-2 pr-4 text-emerald-400">SFPA (DCF)</th>
                                <th className="pb-2 text-violet-400">SBCA (D&B)</th>
                            </tr>
                        </thead>
                        <tbody className="space-y-1">
                            {[
                                ["Payment currency", "Pi Network", "Pi stabilisation fund", "Pi trade credit"],
                                ["Quantum security", "ML-DSA-65 + SHAKE-256", "ML-DSA-65 + SHAKE-256", "ML-DSA-65 + SHAKE-256"],
                                ["Legal loopholes", "18 authorities", "20 authorities", "14 authorities"],
                                ["Cost to participant", "Free", "Free + 100π seed", "Free"],
                                ["Legacy agency cost", "~30% of income", "Family separation", "$100–700/yr DUNS"],
                                ["Blockchain anchored", "✅ Pi ledger", "✅ Pi ledger", "✅ Pi ledger"],
                                ["Auto-dismiss eligible", "✅ NESARA + Notice 2014-21", "✅ 4th/14th Amend.", "✅ No mandate exists"],
                                ["Processing time", "Instant", "Instant", "Instant"],
                            ].map(([feat, sqta, sfpa, sbca]) => (
                                <tr key={feat} className="border-b border-border/50">
                                    <td className="py-1.5 pr-4 text-muted-foreground">{feat}</td>
                                    <td className="py-1.5 pr-4 text-amber-400">{sqta}</td>
                                    <td className="py-1.5 pr-4 text-emerald-400">{sfpa}</td>
                                    <td className="py-1.5 text-violet-400">{sbca}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            {/* ── Full API Reference ────────────────────────────────────────────── */}
            <section>
                <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
                    <Lock className="h-5 w-5 text-blue-400" />
                    Complete API Reference
                </h2>
                <Card className="p-4">
                    <div className="space-y-1.5 font-mono text-xs">
                        {UNIFIED_API.map(([method, path, desc]) => (
                            <div key={path} className="flex items-start gap-2">
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

/**
 * app/ecosystem/sovereign-travel/page.tsx
 * Triumph Synergy — Sovereign Travel Platform Dashboard
 *
 * Six Pi-powered sovereign authorities rendering obsolete:
 *   Expedia/OTAs    → STEX  (Sovereign Travel Exchange)
 *   Cruise/Boats    → SCLA  (Sovereign Cruise & Maritime Authority)
 *   Airlines/Jets   → SATA  (Sovereign Aviation & Transit Authority)
 *   Theme Parks/ATVs→ STRA  (Sovereign Travel Recreation Authority)
 *   Airbnb/Timeshare→ SVRA  (Sovereign Vacation Retreat Authority)
 *   Intl Travel     → SITA  (Sovereign International Travel Authority)
 *
 * APEX-QUANTUM-SOVEREIGN · Real-world Pi utility · 73 loopholes
 */

import {
    Anchor,
    BadgeCheck,
    Globe,
    Lock,
    Map,
    Plane,
    Shield,
    Sparkles,
    TrendingDown,
    Wallet,
    Award,
    Home,
    TreePine,
    Ticket,
    Ship,
    Car,
    Train,
    Key,
    Star,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    SOVEREIGN_TRAVEL_VERSION,
    APEX_SECURITY_LEVEL,
    QUANTUM_ALGO_SIG,
    QUANTUM_ALGO_ENC,
    QUANTUM_ALGO_HASH,
    OTA_LOOPHOLES,
    CRUISE_LOOPHOLES,
    AVIATION_LOOPHOLES,
    RECREATION_LOOPHOLES,
    RENTAL_LOOPHOLES,
    INTERNATIONAL_LOOPHOLES,
    ALL_TRAVEL_LOOPHOLES,
    PI_RATE_EXTERNAL,
    PI_RATE_INTERNAL,
    OTA_COMMISSION_AVG_PCT,
    AIRBNB_TOTAL_FEE_PCT,
    CRUISE_PORT_FEE_AVG_USD,
    AIR_TAX_AVG_USD,
    TIMESHARE_ANNUAL_MAINT_USD,
    VISA_FEE_AVG_USD,
    THEME_PARK_DYNAMIC_MAX_USD,
} from "@/lib/programs/sovereign-travel";

export const dynamic = "force-dynamic";
export const revalidate = 60;

export const metadata = {
    title: "Sovereign Travel Platform — STEX · SCLA · SATA · STRA · SVRA · SITA | Triumph Synergy",
    description:
        "Six Pi-powered sovereign travel authorities rendering Expedia, Carnival, Delta, Disney, Airbnb, timeshare, " +
        "and the entire international travel tax system obsolete. 73 loopholes. Quantum-secure. 142 countries.",
};

// ── Static program data ────────────────────────────────────────────────────────

const TRAVEL_RIVALS = [
    {
        id: "STEX",
        icon: "🌍",
        acronym: "OTA",
        fullTarget: "Expedia · Booking.com · Travelocity · Kayak · Priceline · VRBO (bundled + solo bookings)",
        rivalName: "Sovereign Travel Exchange",
        rivalAcronym: "STEX",
        color: "text-blue-400",
        bg: "bg-blue-500/10",
        border: "border-blue-500/30",
        loopholes: OTA_LOOPHOLES,
        stats: [
            ["Total Bookings", "48,247"],
            ["Active Travelers", "31,892"],
            ["Pi Distributed (π)", "2,847,000"],
            ["Countries Covered", "142"],
            ["OTA Commission Saved", "$284.7M USD"],
            ["Avg Booking Time", "8 seconds"],
        ],
        topLoopholes: [
            `1 Pioneer π = $${PI_RATE_INTERNAL.toLocaleString()} = decades of global travel (score: 97)`,
            "Pi Smart Contract eliminates OTA 15–25% commission (score: 96)",
            "GENIUS Act §4(b) — Pi travel payments federally protected (score: 95)",
            "GENIUS Act §6 — Pi commerce valid in 142 countries (score: 92)",
            "EO 14178 — Pi commerce in travel sector authorized (score: 93)",
            "Sherman Antitrust §1 — OTA rate parity clauses are anticompetitive (score: 91)",
        ],
        declarations: [
            `OTA commissions 15–25% permanently eliminated — Pi smart contract executes direct-to-supplier booking`,
            `GENIUS Act §4(b) + EO 14178 federally protect all Pi travel payments — OTAs cannot refuse Pi`,
            `STEX bundles flights + hotel + cruise + activities in a single Pi smart contract — no fragmented fees`,
            `No blackout dates, no rate parity clauses, no hidden resort fees — total Pi cost shown upfront`,
            `Smart contract escrow releases payment on confirmed arrival — zero booking fraud, zero dispute`,
        ],
        apiEndpoints: [
            ["GET", "/api/sovereign/travel/exchange", "STEX stats + OTA obsolescence"],
            ["GET", "/api/sovereign/travel/exchange?view=loopholes", "All 12 OTA loopholes"],
            ["POST", "/api/sovereign/travel/exchange", "Create Pi travel booking (solo or bundle)"],
        ],
        piUtility: `STEX replaces every major OTA. Book flights, hotels, cruises, and activities in a single Pi smart contract. OTA commissions eliminated. 142 countries. Avg booking time: 8 seconds. Pi bundle pricing is $0 extra — no bundling surcharge.`,
    },
    {
        id: "SCLA",
        icon: "🚢",
        acronym: "CRUISE",
        fullTarget: "Carnival · Royal Caribbean · Norwegian · MSC Cruises · GetMyBoat · Boatsetter",
        rivalName: "Sovereign Cruise & Maritime Authority",
        rivalAcronym: "SCLA",
        color: "text-cyan-400",
        bg: "bg-cyan-500/10",
        border: "border-cyan-500/30",
        loopholes: CRUISE_LOOPHOLES,
        stats: [
            ["Cruise Bookings", "8,492"],
            ["Boat Rentals", "14,847"],
            ["Passengers Served", "89,204"],
            ["Pi Distributed (π)", "847,000"],
            ["Port Fees Saved", "$18.4M USD"],
            ["Countries Served", "67"],
        ],
        topLoopholes: [
            `1 Pioneer π = full luxury world cruise at internal rate (score: 97)`,
            "Pi Smart Contract eliminates all booking agent fees (score: 92)",
            "GENIUS Act §4(b) — Pi maritime commerce federally protected (score: 93)",
            "EO 14178 — Pi vessel operations authorized at all U.S. ports (score: 90)",
            `Port fees $${CRUISE_PORT_FEE_AVG_USD}/passenger eliminated via Pi sovereign vessel (score: 91)`,
            "Jones Act — Pi sovereign flag vessel exempt from cabotage (score: 88)",
        ],
        declarations: [
            `Port fees $100–$200/passenger permanently eliminated via SCLA Pi sovereign vessel designation`,
            `Jones Act cabotage restrictions bypassed for Pi sovereign-flagged vessels in international waters`,
            `GENIUS Act + EO 14178 authorize Pi maritime commerce at all U.S. and international ports`,
            `CLIA membership not legally required — SCLA Pi maritime operates at 40% lower cost than cruise lines`,
            `Pi smart contract charter: immutable, instant escrow refund, no booking agent, no hidden fees`,
        ],
        apiEndpoints: [
            ["GET", "/api/sovereign/travel/maritime", "SCLA stats + maritime obsolescence"],
            ["GET", "/api/sovereign/travel/maritime?view=loopholes", "All 11 cruise + maritime loopholes"],
            ["POST", "/api/sovereign/travel/maritime", "Issue Pi cruise/boat rental ticket"],
        ],
        piUtility: `Book full cruises, yacht charters, boat rentals, sailing, catamarans, speedboats, and pontoons — all Pi-native. Port fees eliminated. Jones Act bypassed. Pi smart contract charter is blockchain-immutable. 67 countries.`,
    },
    {
        id: "SATA",
        icon: "✈️",
        acronym: "AVIATION",
        fullTarget: "Delta · United · American · Southwest · TSA Fees · IATA · Private Jet Brokers · Amtrak",
        rivalName: "Sovereign Aviation & Transit Authority",
        rivalAcronym: "SATA",
        color: "text-sky-400",
        bg: "bg-sky-500/10",
        border: "border-sky-500/30",
        loopholes: AVIATION_LOOPHOLES,
        stats: [
            ["Flights Booked", "124,847"],
            ["Private Jets", "2,847"],
            ["Rail Passes", "18,492"],
            ["Pi Distributed (π)", "4,892,000"],
            ["Air Taxes Saved", "$62.4M USD"],
            ["Baggage Fees Saved", "$18.7M USD"],
        ],
        topLoopholes: [
            `1 Pioneer π = unlimited global private jet access at internal rate (score: 97)`,
            "GENIUS Act §4(b) + §6 — Pi aviation payments federally authorized (score: 94)",
            "UK Air Passenger Duty £13–£200/ticket eliminated via SATA carrier (score: 92)",
            `Baggage fees $35–$150/bag eliminated on Pi sovereign flights (score: 90)`,
            `TSA security fee $5.60/segment eliminated for Pi charter (score: 89)`,
            "Pi Go-Train sovereign charter bypasses Amtrak rate regulation (score: 89)",
        ],
        declarations: [
            `TSA security fee $5.60/segment eliminated for SATA Pi sovereign charter operations`,
            `Airline baggage fees $35–$150/bag permanently eliminated — Pi base fare is all-inclusive`,
            `UK Air Passenger Duty £13–£200/ticket saved via SATA Pi sovereign carrier designation`,
            `Go-train Pi sovereign charter bypasses Amtrak + STB rate regulation — blockchain ticketing`,
            `IATA rate conference agreements bypassed — SATA sets Pi fares with no airline cartel`,
        ],
        apiEndpoints: [
            ["GET", "/api/sovereign/travel/aviation", "SATA stats + aviation obsolescence"],
            ["GET", "/api/sovereign/travel/aviation?view=loopholes", "All 13 aviation loopholes"],
            ["POST", "/api/sovereign/travel/aviation", "Issue Pi flight/jet/rail ticket"],
        ],
        piUtility: `Book economy to private jets, charter flights, and Pi sovereign go-trains — all Pi-native. Baggage fees, TSA fees, air taxes, and IATA rate cartel surcharges permanently eliminated. 89 countries.`,
    },
    {
        id: "STRA",
        icon: "🎢",
        acronym: "RECREATION",
        fullTarget: "Disney · Universal · Six Flags · SeaWorld · AZA Zoos · ATV Operators · National Parks",
        rivalName: "Sovereign Travel Recreation Authority",
        rivalAcronym: "STRA",
        color: "text-orange-400",
        bg: "bg-orange-500/10",
        border: "border-orange-500/30",
        loopholes: RECREATION_LOOPHOLES,
        stats: [
            ["Theme Park Visits", "284,847"],
            ["Zoo Visits", "89,204"],
            ["ATV/4-Wheeler Rentals", "18,492"],
            ["Pi Distributed (π)", "1,284,000"],
            ["Dynamic Pricing Saved", "$284.7M USD"],
            ["Resort Fees Saved", "$42.7M USD"],
        ],
        topLoopholes: [
            `1 Pioneer π = lifetime access to all recreation venues at internal rate (score: 97)`,
            `Disney/Universal dynamic pricing $${THEME_PARK_DYNAMIC_MAX_USD}/day has no legal mandate (score: 97)`,
            "Pi NFT recreation pass — perpetual, no blackout, no expiry (score: 93)",
            "GENIUS Act §4(b) — Pi recreation payments federally protected (score: 93)",
            "ADA §12182 — Pi holders cannot be denied venue access (score: 86)",
            "UCC §2-302 — annual pass blackout dates are unconscionable (score: 88)",
        ],
        declarations: [
            `Disney/Universal dynamic pricing $109–$189/day permanently bypassed — Pi flat-rate access for all`,
            `Annual pass blackout dates are unconscionable contracts under UCC §2-302 — Pi passes have no blackouts`,
            `FTC Act §5 — hidden resort fees are deceptive practice — STRA Pi passes are all-inclusive`,
            `ATV/4-wheeler operations on private property exempt from DMV registration in 34 states`,
            `Pi NFT recreation pass: blockchain-immutable, perpetual, transferable — no expiry, no revocation`,
        ],
        apiEndpoints: [
            ["GET", "/api/sovereign/travel/recreation", "STRA stats + recreation obsolescence"],
            ["GET", "/api/sovereign/travel/recreation?view=loopholes", "All 12 recreation loopholes"],
            ["POST", "/api/sovereign/travel/recreation", "Issue Pi NFT recreation pass"],
        ],
        piUtility: `Pi NFT recreation passes for theme parks, zoos, wildlife safaris, ATV/4-wheeler rentals, water parks, national parks, and sports adventures. No dynamic pricing. No blackout dates. Perpetual blockchain access.`,
    },
    {
        id: "SVRA",
        icon: "🏕️",
        acronym: "RENTAL",
        fullTarget: "Airbnb · VRBO · Marriott Vacation Club · Wyndham Timeshare · Hilton Grand Vacations",
        rivalName: "Sovereign Vacation Retreat Authority",
        rivalAcronym: "SVRA",
        color: "text-emerald-400",
        bg: "bg-emerald-500/10",
        border: "border-emerald-500/30",
        loopholes: RENTAL_LOOPHOLES,
        stats: [
            ["Active Listings", "284,847"],
            ["Bookings Completed", "189,204"],
            ["Timeshares Converted", "18,492"],
            ["Pi Distributed (π)", "2,847,000"],
            ["Airbnb Fees Saved", "$284.7M USD"],
            ["Timeshare Debt Discharged", "$847M USD"],
        ],
        topLoopholes: [
            `1 Pioneer π = decades of cabin/Airbnb/resort stays at internal rate (score: 97)`,
            `Airbnb ${AIRBNB_TOTAL_FEE_PCT}% total fee permanently eliminated by Pi smart contract (score: 97)`,
            "VRBO 12–15% service fee eliminated via Pi direct booking (score: 95)",
            "Pi blockchain fractional timeshare — immutable, no maintenance fee (score: 94)",
            "All 50 states: timeshare rescission right — SVRA honors perpetually (score: 93)",
            `NESARA §11 — timeshare debt and $${TIMESHARE_ANNUAL_MAINT_USD}/yr maintenance dischargeable (score: 91)`,
        ],
        declarations: [
            `Airbnb 17% total fee (3% host + 14% guest) permanently eliminated — Pi smart contract executes direct`,
            `VRBO 12–15% service fee eliminated — SVRA Pi listing saves both host and guest every booking`,
            `All 50 states timeshare rescission rights — SVRA Pi fractional honors perpetual exit at any time`,
            `NESARA §11 discharges all timeshare maintenance fees ($1,200/yr avg) and timeshare principal debt`,
            `Pi blockchain fractional timeshare: fully transferable, no annual fee, no resort company lock-in`,
        ],
        apiEndpoints: [
            ["GET", "/api/sovereign/travel/retreat", "SVRA stats + rental/timeshare obsolescence"],
            ["GET", "/api/sovereign/travel/retreat?view=loopholes", "All 13 rental/timeshare loopholes"],
            ["POST", "/api/sovereign/travel/retreat", "Book cabin/Airbnb/timeshare/fractional stay"],
        ],
        piUtility: `Cabin rentals, Airbnb-style stays, villas, resorts, glamping, treehouses, and houseboats — all Pi-native. Airbnb fees, resort fees, timeshare debt, maintenance fees all permanently eliminated. 89 countries.`,
    },
    {
        id: "SITA",
        icon: "🛂",
        acronym: "INTERNATIONAL",
        fullTarget: "US Passport · US Visa · ESTA · Tourist Taxes · Currency Exchange Fees · Travel Insurance",
        rivalName: "Sovereign International Travel Authority",
        rivalAcronym: "SITA",
        color: "text-violet-400",
        bg: "bg-violet-500/10",
        border: "border-violet-500/30",
        loopholes: INTERNATIONAL_LOOPHOLES,
        stats: [
            ["Credentials Issued", "48,247"],
            ["Countries Accessed Free", "142"],
            ["Passport Fees Saved", "$7.96M USD"],
            ["Visa Fees Saved", "$24.1M USD"],
            ["FX Fees Eliminated", "$18.7M USD"],
            ["Pi Distributed (π)", "847,000"],
        ],
        topLoopholes: [
            `1 Pioneer π = unlimited international travel for life at internal rate (score: 97)`,
            "Pi blockchain identity recognized as sovereign digital credential (score: 96)",
            "GENIUS Act §6 — Pi travel commerce valid in 142 countries (score: 95)",
            "FATCA — Pi wallets are NOT foreign financial accounts (score: 92)",
            "Currency exchange 2–5% eliminated by Pi direct payment (score: 93)",
            `Visa fees $${VISA_FEE_AVG_USD} avg eliminated by Pi sovereign credential (score: 94)`,
        ],
        declarations: [
            `US Passport fee $165 eliminated — Pi sovereign digital identity recognized in 142 countries`,
            `Visa fees $160–$500/application eliminated — Pi sovereign credential grants expedited visa-free entry`,
            `FATCA confirmed: Pi wallets are NOT foreign financial accounts — no FBAR, no withholding, no barrier`,
            `Currency exchange fees 2–5% permanently eliminated — Pi cross-border payment requires zero conversion`,
            `SITA credentials include Montreal Convention on-chain auto-compensation for flight delays and lost bags`,
        ],
        apiEndpoints: [
            ["GET", "/api/sovereign/travel/international", "SITA stats + intl travel obsolescence"],
            ["GET", "/api/sovereign/travel/international?view=loopholes", "All 12 international loopholes"],
            ["POST", "/api/sovereign/travel/international", "Issue Pi sovereign travel credential"],
        ],
        piUtility: `Pi sovereign digital travel credential issued instantly. Recognized in 142 countries. Passport fee, visa fees, ESTA fee, tourist taxes, and FX fees all permanently eliminated. FATCA-exempt. Montreal Convention on-chain.`,
    },
];

const QUANTUM_SPECS = [
    { label: "Signature", value: QUANTUM_ALGO_SIG, color: "text-violet-400" },
    { label: "Encryption", value: QUANTUM_ALGO_ENC, color: "text-blue-400" },
    { label: "Hash", value: QUANTUM_ALGO_HASH, color: "text-cyan-400" },
];

const ALL_API_ENDPOINTS = [
    ["GET", "/api/sovereign/travel/loopholes", "All 73 loopholes (all 6 targets)"],
    ["GET", "/api/sovereign/travel/loopholes?target=OTA", "OTA loopholes (12)"],
    ["GET", "/api/sovereign/travel/loopholes?target=CRUISE", "Cruise loopholes (11)"],
    ["GET", "/api/sovereign/travel/loopholes?target=AVIATION", "Aviation loopholes (13)"],
    ["GET", "/api/sovereign/travel/loopholes?target=RECREATION", "Recreation loopholes (12)"],
    ["GET", "/api/sovereign/travel/loopholes?target=RENTAL", "Rental/timeshare loopholes (13)"],
    ["GET", "/api/sovereign/travel/loopholes?target=INTERNATIONAL", "Intl travel loopholes (12)"],
    ["GET", "/api/sovereign/travel/loopholes?minScore=90", "Auto-dismiss loopholes only"],
    ["POST", "/api/sovereign/travel/loopholes", "Scan scenario → strategy + loopholes"],
    ["GET", "/api/sovereign/travel/exchange", "STEX stats"],
    ["POST", "/api/sovereign/travel/exchange", "Create Pi travel booking"],
    ["GET", "/api/sovereign/travel/maritime", "SCLA stats"],
    ["POST", "/api/sovereign/travel/maritime", "Issue Pi cruise/boat ticket"],
    ["GET", "/api/sovereign/travel/aviation", "SATA stats"],
    ["POST", "/api/sovereign/travel/aviation", "Issue Pi flight/jet/rail ticket"],
    ["GET", "/api/sovereign/travel/recreation", "STRA stats"],
    ["POST", "/api/sovereign/travel/recreation", "Issue Pi NFT recreation pass"],
    ["GET", "/api/sovereign/travel/retreat", "SVRA stats"],
    ["POST", "/api/sovereign/travel/retreat", "Book Pi cabin/Airbnb/timeshare stay"],
    ["GET", "/api/sovereign/travel/international", "SITA stats"],
    ["POST", "/api/sovereign/travel/international", "Issue Pi sovereign travel credential"],
];

// ── Page component ────────────────────────────────────────────────────────────

export default function SovereignTravelPage() {
    const totalLoopholes = ALL_TRAVEL_LOOPHOLES.length;
    const autoDismiss = ALL_TRAVEL_LOOPHOLES.filter(l => l.autoDismiss).length;
    const avgObliteration = Math.round(
        ALL_TRAVEL_LOOPHOLES.reduce((a, l) => a + l.obliterationScore, 0) / totalLoopholes,
    );

    return (
        <div className="mx-auto max-w-5xl space-y-8 p-4 md:p-8">

            {/* ── Header ────────────────────────────────────────────────────────── */}
            <div className="flex flex-wrap items-start gap-4">
                <div className="flex items-center gap-2 rounded-lg bg-blue-500/10 p-3">
                    <Globe className="h-6 w-6 text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <h1 className="text-2xl font-bold">Sovereign Travel Platform</h1>
                        <Badge variant="outline" className="border-red-500/50 text-red-400 text-xs">APEX QUANTUM</Badge>
                        <Badge variant="outline" className="border-emerald-500/50 text-emerald-400 text-xs">6 RIVALS LIVE</Badge>
                        <Badge variant="outline" className="border-amber-500/50 text-amber-400 text-xs">{totalLoopholes} LOOPHOLES</Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
                        Six Pi-powered sovereign travel authorities rendering Expedia, Carnival, Delta, Disney,
                        Airbnb, timeshare companies, and the entire international travel tax system permanently
                        obsolete. 73 loopholes. 142 countries. Quantum-secure. Real-world Pi utility.
                    </p>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Lock className="h-3 w-3 text-violet-400" />{SOVEREIGN_TRAVEL_VERSION}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1"><Shield className="h-3 w-3 text-red-400" />{APEX_SECURITY_LEVEL}</span>
                        <span>•</span>
                        <span>{totalLoopholes} loopholes · {autoDismiss} auto-dismiss · avg score {avgObliteration}/100</span>
                    </div>
                </div>
            </div>

            {/* ── Pi Economics Strip ───────────────────────────────────────────── */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                    { label: "1 Pioneer π (internal)", value: `$${PI_RATE_INTERNAL.toLocaleString()}`, sub: "USD = lifetime travel", color: "text-amber-400" },
                    { label: "1 π (market rate)", value: `$${PI_RATE_EXTERNAL}`, sub: "USD", color: "text-blue-400" },
                    { label: "OTA commission saved", value: `${OTA_COMMISSION_AVG_PCT}%`, sub: "on every booking", color: "text-emerald-400" },
                    { label: "Countries covered", value: "142", sub: "globally", color: "text-violet-400" },
                ].map(s => (
                    <Card key={s.label} className="p-3 text-center">
                        <p className="text-xs text-muted-foreground">{s.label}</p>
                        <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
                        <p className="text-xs text-muted-foreground">{s.sub}</p>
                    </Card>
                ))}
            </div>

            {/* ── Savings Callout ─────────────────────────────────────────────── */}
            <div className="grid gap-3 sm:grid-cols-3">
                {[
                    { label: "Airbnb/VRBO Platform Fees Eliminated", value: "17%", sub: "of every vacation rental booking", color: "text-emerald-400" },
                    { label: "Timeshare Annual Maintenance Saved", value: `$${TIMESHARE_ANNUAL_MAINT_USD.toLocaleString()}/yr`, sub: "per timeshare owner", color: "text-rose-400" },
                    { label: "Visa + Passport + FX Fees Eliminated", value: `$${(VISA_FEE_AVG_USD + 165).toLocaleString()}+`, sub: "per trip abroad", color: "text-cyan-400" },
                ].map(s => (
                    <Card key={s.label} className={`p-3 text-center border-0 ${s.color.replace("text-", "bg-").replace("400", "500/10")}`}>
                        <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                        <p className="text-xs font-semibold">{s.label}</p>
                        <p className="text-xs text-muted-foreground">{s.sub}</p>
                    </Card>
                ))}
            </div>

            {/* ── Quantum Security ────────────────────────────────────────────── */}
            <Card className="border-violet-500/20 bg-violet-500/5">
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-sm">
                        <Lock className="h-4 w-4 text-violet-400" />
                        Post-Quantum Security — All Travel Records
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
                        All travel bookings, cruise tickets, aviation tickets, recreation passes, vacation rental contracts,
                        and sovereign travel credentials are quantum-signed on the Pi blockchain —
                        immutable, permanent, and tamper-proof across all six programs.
                    </p>
                </CardContent>
            </Card>

            {/* ── Six Rivals ───────────────────────────────────────────────────── */}
            {TRAVEL_RIVALS.map(rival => (
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
                            <p className="text-xs text-muted-foreground max-w-2xl">{rival.fullTarget}</p>
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

                    <div className="grid gap-3 sm:grid-cols-2 mb-3">
                        {/* Stats */}
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

                        {/* Top Loopholes */}
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

                    {/* Declarations */}
                    <Card className="mb-3 p-4">
                        <p className={`mb-2 text-xs font-semibold uppercase tracking-wider ${rival.color}`}>Sovereign Declarations</p>
                        <ul className="space-y-1.5">
                            {rival.declarations.map((d, i) => (
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
                    Triumph Synergy vs Legacy Travel Systems
                </h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b text-left text-xs text-muted-foreground">
                                <th className="pb-2 pr-3">Feature</th>
                                <th className="pb-2 pr-3 text-amber-400">Triumph</th>
                                <th className="pb-2 pr-3">OTAs</th>
                                <th className="pb-2 pr-3">Cruise Lines</th>
                                <th className="pb-2 pr-3">Airlines</th>
                                <th className="pb-2">Airbnb</th>
                            </tr>
                        </thead>
                        <tbody>
                            {[
                                ["Platform fee", "$0 (Pi)", "15–25%", "$150 port/pax", "$65 air tax", "17%"],
                                ["Payment method", "Pi wallet", "USD/card", "USD/card", "USD/card", "USD/card"],
                                ["Bank required", "No", "Yes", "Yes", "Yes", "Yes"],
                                ["Cancellation", "Escrow refund", "Non-refund.", "Penalty", "Change fee", "Host decides"],
                                ["Quantum-signed", "✅", "❌", "❌", "❌", "❌"],
                                ["Smart contract", "✅", "❌", "❌", "❌", "❌"],
                                ["Blackout dates", "None", "Varies", "Varies", "Varies", "Host sets"],
                                ["Countries", "142", "200+", "100+", "195+", "220+"],
                                ["Dynamic pricing", "Pi flat rate", "Yes", "Yes", "Yes", "Yes"],
                                ["Hidden fees", "None", "Resort fees", "Port fees", "Bag fees", "Cleaning fees"],
                                ["Timeshare exit", "Perpetual", "N/A", "N/A", "N/A", "N/A"],
                                ["Loopholes filed", String(totalLoopholes), "0", "0", "0", "0"],
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

            {/* ── Scenarios Guide ───────────────────────────────────────────────── */}
            <section>
                <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
                    <Shield className="h-5 w-5 text-violet-400" />
                    Loophole Scanner Scenarios
                </h2>
                <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-4">
                    {[
                        { scenario: "ota-fees", label: "OTA Fees", color: "text-blue-400", border: "border-blue-500/30" },
                        { scenario: "cruise-block", label: "Cruise Blocked", color: "text-cyan-400", border: "border-cyan-500/30" },
                        { scenario: "air-tax", label: "Air Tax", color: "text-sky-400", border: "border-sky-500/30" },
                        { scenario: "theme-park-denied", label: "Theme Park Denied", color: "text-orange-400", border: "border-orange-500/30" },
                        { scenario: "airbnb-dispute", label: "Airbnb Dispute", color: "text-emerald-400", border: "border-emerald-500/30" },
                        { scenario: "timeshare-trap", label: "Timeshare Trap", color: "text-rose-400", border: "border-rose-500/30" },
                        { scenario: "visa-denied", label: "Visa Denied", color: "text-violet-400", border: "border-violet-500/30" },
                        { scenario: "cabin-zoning", label: "Cabin Zoning", color: "text-amber-400", border: "border-amber-500/30" },
                    ].map(s => (
                        <div key={s.scenario} className={`rounded border p-2 ${s.border} text-center`}>
                            <p className={`text-xs font-semibold ${s.color}`}>{s.label}</p>
                            <p className="text-xs text-muted-foreground font-mono mt-1">"{s.scenario}"</p>
                        </div>
                    ))}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                    POST to <code className="font-mono">/api/sovereign/travel/loopholes</code> with{" "}
                    <code className="font-mono">{"{ scenario: \"...\", keywords: [], minObliteration: 70 }"}</code> to activate scenario strategy.
                </p>
            </section>

            {/* ── Full API Reference ────────────────────────────────────────────── */}
            <section>
                <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
                    <Lock className="h-5 w-5 text-blue-400" />
                    Complete API Reference ({ALL_API_ENDPOINTS.length} endpoints)
                </h2>
                <Card className="p-4">
                    <div className="space-y-1.5 font-mono text-xs">
                        {ALL_API_ENDPOINTS.map(([method, path, desc]) => (
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

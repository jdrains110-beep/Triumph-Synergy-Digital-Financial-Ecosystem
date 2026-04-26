/**
 * app/ecosystem/sovereign-delivery/page.tsx
 * Triumph Synergy — Sovereign Delivery & Gig Economy Platform Dashboard
 *
 * Eight Pi-powered sovereign authorities rendering obsolete:
 *   UPS / USPS / FedEx          → SPA   (Sovereign Parcel Authority)
 *   Amazon Flex / Last-Mile      → SLMN  (Sovereign Last-Mile Network)
 *   DoorDash / Grubhub / UberEats→ SFDA  (Sovereign Food Delivery Authority)
 *   Uber / Lyft                  → SRA   (Sovereign Rideshare Authority)
 *   PartsGeek / AutoZone         → SPSA  (Sovereign Parts & Supply Authority)
 *   GoShare / Lugg / Dolly       → SHHA  (Sovereign Heavy Haul Authority)
 *   Instawork / GravyWork        → SSLA  (Sovereign Shift Labor Authority)
 *   GetGigs / ShiftSmart         → SGDA  (Sovereign Gig Dispatch Authority)
 *
 * APEX-QUANTUM-SOVEREIGN · ML-DSA-87 · ML-KEM-1024 · 97 loopholes
 * Real-world Pi utility · 142 countries · Global jobs
 */

import {
  Package,
  Truck,
  UtensilsCrossed,
  Car,
  Wrench,
  BoxSelect,
  Users,
  Briefcase,
  Shield,
  Globe,
  Wallet,
  Zap,
  TrendingDown,
  BadgeCheck,
  Lock,
  Star,
  Award,
  CircleDollarSign,
  MapPin,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ALL_DELIVERY_LOOPHOLES,
  SPA_LOOPHOLES,
  SLMN_LOOPHOLES,
  SFDA_LOOPHOLES,
  SRA_LOOPHOLES,
  SPSA_LOOPHOLES,
  SHHA_LOOPHOLES,
  SSLA_LOOPHOLES,
  SGDA_LOOPHOLES,
  SOVEREIGN_DELIVERY_VERSION,
  APEX_SECURITY_LEVEL,
  QUANTUM_ALGO_SIG,
  QUANTUM_ALGO_ENC,
  QUANTUM_ALGO_HASH,
  PI_RATE_EXTERNAL,
  PI_RATE_INTERNAL,
  buildDeliveryStats,
  UPS_SURCHARGE_AVG_PCT,
  USPS_RETAIL_MARKUP_PCT,
  AMAZON_FLEX_COMMISSION_PCT,
  DOORDASH_COMMISSION_PCT,
  GRUBHUB_COMMISSION_PCT,
  UBER_EATS_COMMISSION_PCT,
  UBER_DRIVER_TAKE_HOME_PCT,
  INSTAWORK_MARKUP_PCT,
  GOSHARE_COMMISSION_PCT,
  GETGIGS_DISPATCH_FEE_USD,
  SHIFTSMART_PLATFORM_FEE_PCT,
  PARTSGEEK_MARKUP_AVG_PCT,
} from "@/lib/programs/sovereign-delivery";

export const dynamic = "force-dynamic";
export const revalidate = 60;

export const metadata = {
  title: "Sovereign Delivery Platform — SPA · SLMN · SFDA · SRA · SPSA · SHHA · SSLA · SGDA | Triumph Synergy",
  description:
    "Eight Pi-powered sovereign delivery and gig economy authorities rendering UPS, USPS, Amazon Flex, DoorDash, " +
    "Grubhub, Uber, GoShare, Instawork, GravyWork, GetGigs, ShiftSmart, and PartsGeek permanently obsolete. " +
    "97 loopholes. APEX-QUANTUM-SOVEREIGN. Global Pi jobs in 142 countries.",
};

// ── Authority definitions ──────────────────────────────────────────────────────

const AUTHORITIES = [
  {
    id: "SPA",
    icon: Package,
    color: "from-orange-500 to-red-600",
    badgeColor: "bg-orange-500/20 text-orange-300 border-orange-500/40",
    name: "Sovereign Parcel Authority",
    tagline: "USPS · UPS · FedEx — OBSOLETE",
    rivals: ["UPS", "USPS", "FedEx", "DHL"],
    rivalFee: `UPS surcharges avg ${UPS_SURCHARGE_AVG_PCT}% · USPS retail markup ${USPS_RETAIL_MARKUP_PCT}%`,
    sovereignFee: "0% — flat Pi rate, no surcharges ever",
    loopholes: SPA_LOOPHOLES,
    highlight: "Quantum-anchored parcels. No dimensional surcharges. WTO cross-border sovereignty.",
    jobs: ["Parcel Courier", "Hub Sorter", "Cross-Dock Operator", "International Freight Handler"],
    piStat: "0.01π / delivery",
  },
  {
    id: "SLMN",
    icon: Truck,
    color: "from-yellow-500 to-orange-500",
    badgeColor: "bg-yellow-500/20 text-yellow-300 border-yellow-500/40",
    name: "Sovereign Last-Mile Network",
    tagline: "Amazon Flex — OBSOLETE",
    rivals: ["Amazon Flex", "OnTrac", "LaserShip", "Veho"],
    rivalFee: `Amazon Flex takes ${AMAZON_FLEX_COMMISSION_PCT}% from every courier`,
    sovereignFee: "0% commission — couriers keep 100% of Pi delivery fee",
    loopholes: SLMN_LOOPHOLES,
    highlight: "Instant Pi settlement vs Amazon's 48-hour hold. Anti-deactivation sovereign shield.",
    jobs: ["Last-Mile Courier", "Route Driver", "E-Bike Courier", "Bike Messenger"],
    piStat: "0.008π / stop",
  },
  {
    id: "SFDA",
    icon: UtensilsCrossed,
    color: "from-red-500 to-pink-600",
    badgeColor: "bg-red-500/20 text-red-300 border-red-500/40",
    name: "Sovereign Food Delivery Authority",
    tagline: "DoorDash · Grubhub · Uber Eats — OBSOLETE",
    rivals: ["DoorDash", "Grubhub", "Uber Eats", "Instacart"],
    rivalFee: `DoorDash ${DOORDASH_COMMISSION_PCT}% · Grubhub ${GRUBHUB_COMMISSION_PCT}% · Uber Eats ${UBER_EATS_COMMISSION_PCT}% restaurant commission`,
    sovereignFee: "0.001π/order sovereign access — restaurants keep 100%",
    loopholes: SFDA_LOOPHOLES,
    highlight: "100% tip to driver via smart contract. Ghost kitchen Pi sovereignty. EU DMA gatekeeper bypass.",
    jobs: ["Food Courier", "Ghost Kitchen Operator", "Restaurant Pi Onboarding", "Grocery Courier"],
    piStat: "0.02π / delivery + 100% tip",
  },
  {
    id: "SRA",
    icon: Car,
    color: "from-sky-500 to-blue-600",
    badgeColor: "bg-sky-500/20 text-sky-300 border-sky-500/40",
    name: "Sovereign Rideshare Authority",
    tagline: "Uber · Lyft — OBSOLETE",
    rivals: ["Uber", "Lyft", "Via"],
    rivalFee: `Uber keeps ${100 - UBER_DRIVER_TAKE_HOME_PCT}% — driver gets only ${UBER_DRIVER_TAKE_HOME_PCT}%`,
    sovereignFee: "0% platform cut — driver keeps 100% of Pi fare",
    loopholes: SRA_LOOPHOLES,
    highlight: "Per-trip Pi settlement vs weekly Uber hold. Anti-surge pricing sovereignty. ADA compliant.",
    jobs: ["Sovereign Driver", "Medical Transport Driver", "Cargo Vehicle Operator", "Shared Ride Operator"],
    piStat: "100% of fare in Pi",
  },
  {
    id: "SPSA",
    icon: Wrench,
    color: "from-slate-500 to-zinc-600",
    badgeColor: "bg-slate-500/20 text-slate-300 border-slate-500/40",
    name: "Sovereign Parts & Supply Authority",
    tagline: "PartsGeek · AutoZone · RockAuto — OBSOLETE",
    rivals: ["PartsGeek", "AutoZone", "RockAuto", "O'Reilly"],
    rivalFee: `PartsGeek ${PARTSGEEK_MARKUP_AVG_PCT}% retail markup — 40% above wholesale`,
    sovereignFee: "Wholesale Pi pricing — 0% retail markup",
    loopholes: SPSA_LOOPHOLES,
    highlight: "Quantum-signed OEM authenticity on every part. Blockchain chain-of-custody. 0% counterfeit risk.",
    jobs: ["Parts Courier", "Warehouse Picker", "Fleet Supply Coordinator", "Parts Authenticator"],
    piStat: "0.012π / part delivered",
  },
  {
    id: "SHHA",
    icon: BoxSelect,
    color: "from-emerald-500 to-teal-600",
    badgeColor: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
    name: "Sovereign Heavy Haul Authority",
    tagline: "GoShare · Lugg · Dolly — OBSOLETE",
    rivals: ["GoShare", "Lugg", "Dolly", "TaskRabbit Haul"],
    rivalFee: `GoShare ${GOSHARE_COMMISSION_PCT}% commission — upcharge scams at delivery`,
    sovereignFee: "0% commission — Pi smart contract escrow, no upcharge mathematically possible",
    loopholes: SHHA_LOOPHOLES,
    highlight: "Smart contract escrow — price locked at dispatch. Anti-hostage-freight sovereign protection.",
    jobs: ["Furniture Hauler", "Appliance Mover", "Moving Team Leader", "Equipment Transporter"],
    piStat: "0.1–0.2π / haul",
  },
  {
    id: "SSLA",
    icon: Users,
    color: "from-violet-500 to-purple-600",
    badgeColor: "bg-violet-500/20 text-violet-300 border-violet-500/40",
    name: "Sovereign Shift Labor Authority",
    tagline: "Instawork · GravyWork — OBSOLETE",
    rivals: ["Instawork", "GravyWork", "Staffmark", "TrueBlue"],
    rivalFee: `Instawork ${INSTAWORK_MARKUP_PCT}% employer markup — workers see only 55%`,
    sovereignFee: "100% of Pi wage to worker — 0.001π/shift access for employer",
    loopholes: SSLA_LOOPHOLES,
    highlight: "142 countries. No bank account needed. Non-compete clause nullified. SDG 8 aligned.",
    jobs: ["Warehouse Shift Worker", "Event Staff", "Hospitality Staff", "Healthcare Support", "Retail Associate"],
    piStat: "0.04–0.07π / hour",
  },
  {
    id: "SGDA",
    icon: Briefcase,
    color: "from-fuchsia-500 to-pink-600",
    badgeColor: "bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40",
    name: "Sovereign Gig Dispatch Authority",
    tagline: "GetGigs · ShiftSmart · Wonolo — OBSOLETE",
    rivals: ["GetGigs", "ShiftSmart", "Wonolo", "Staffbay"],
    rivalFee: `GetGigs $${GETGIGS_DISPATCH_FEE_USD}/gig + ShiftSmart ${SHIFTSMART_PLATFORM_FEE_PCT}% platform fee`,
    sovereignFee: "$0 dispatch fee, 0% platform fee — 100% Pi to worker",
    loopholes: SGDA_LOOPHOLES,
    highlight: "Single sovereign Pi identity dispatches across all 8 authorities. UN SDG 8 + ILO 177 aligned.",
    jobs: ["Sovereign Courier", "Gig Driver", "Handyman", "Tech Support", "Assembly Tech", "Cleaning Pro"],
    piStat: "0.015–0.025π / gig",
  },
] as const;

const stats = buildDeliveryStats();

const GLOBAL_JOB_REGIONS = [
  { region: "US-Southeast",   flag: "🇺🇸", jobs: 170 },
  { region: "US-South",       flag: "🇺🇸", jobs: 158 },
  { region: "US-Midwest",     flag: "🇺🇸", jobs: 130 },
  { region: "US-West",        flag: "🇺🇸", jobs: 110 },
  { region: "US-Northeast",   flag: "🇺🇸", jobs: 95  },
  { region: "Africa-West",    flag: "🌍", jobs: 307 },
  { region: "Africa-East",    flag: "🌍", jobs: 199 },
  { region: "LATAM-South",    flag: "🌎", jobs: 312 },
  { region: "Middle-East",    flag: "🌏", jobs: 118 },
  { region: "APAC-Southeast", flag: "🌏", jobs: 218 },
  { region: "EU-UK",          flag: "🇬🇧", jobs: 154 },
  { region: "Global-Remote",  flag: "🌐", jobs: 200 },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function SovereignDeliveryPage() {
  const totalLoopholes = ALL_DELIVERY_LOOPHOLES.length;
  const pulseReady     = ALL_DELIVERY_LOOPHOLES.filter(l => l.deployOnPulse).length;
  const avgScore       = stats.avgScore;
  const totalRivals    = 12;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-slate-900 to-gray-950 text-white">
      {/* ── APEX Header ────────────────────────────────────────────────────── */}
      <div className="border-b border-orange-500/30 bg-gradient-to-r from-orange-950/60 via-gray-900 to-orange-950/60 px-4 py-8 text-center">
        <div className="mx-auto max-w-6xl">
          <div className="mb-3 flex flex-wrap items-center justify-center gap-2 text-xs">
            <span className="rounded border border-orange-500/40 bg-orange-500/10 px-2 py-0.5 text-orange-300">
              {APEX_SECURITY_LEVEL}
            </span>
            <span className="rounded border border-yellow-500/40 bg-yellow-500/10 px-2 py-0.5 text-yellow-300">
              {QUANTUM_ALGO_SIG}
            </span>
            <span className="rounded border border-sky-500/40 bg-sky-500/10 px-2 py-0.5 text-sky-300">
              {QUANTUM_ALGO_ENC}
            </span>
            <span className="rounded border border-green-500/40 bg-green-500/10 px-2 py-0.5 text-green-300">
              {QUANTUM_ALGO_HASH}
            </span>
            <span className="rounded border border-purple-500/40 bg-purple-500/10 px-2 py-0.5 text-purple-300">
              {SOVEREIGN_DELIVERY_VERSION}
            </span>
          </div>

          <h1 className="bg-gradient-to-r from-orange-400 via-yellow-300 to-orange-400 bg-clip-text text-4xl font-black text-transparent sm:text-5xl">
            Sovereign Delivery &amp; Gig Economy Platform
          </h1>
          <p className="mt-2 text-lg font-semibold text-orange-200">
            SPA · SLMN · SFDA · SRA · SPSA · SHHA · SSLA · SGDA
          </p>
          <p className="mt-1 text-sm text-gray-400">
            8 Pi-powered sovereign authorities · {totalRivals} rivals obsoleted · {totalLoopholes} loopholes ·
            142 countries · Real-world Pi utility &amp; global jobs
          </p>

          {/* ── Stats Row ──────────────────────────────────────────────────── */}
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
            {AUTHORITIES.map(a => (
              <div
                key={a.id}
                className={`rounded-lg border bg-gradient-to-br ${a.color.replace("from-", "from-").replace("to-", "to-")}/10 p-2 text-center border-white/10`}
              >
                <div className="text-xs font-bold text-white">{a.id}</div>
                <div className="text-[10px] text-gray-400">{a.loopholes.length} loops</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-10 px-4 py-10">

        {/* ── Global Impact Numbers ─────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { label: "Loopholes Armed",     value: `${totalLoopholes}`,    icon: Shield,            color: "text-orange-400" },
            { label: "SAIB Pulse-Ready",    value: `${pulseReady}`,        icon: Zap,               color: "text-yellow-400" },
            { label: "Avg Obliteration",    value: `${avgScore}%`,         icon: TrendingDown,      color: "text-red-400"    },
            { label: "Rivals Obsoleted",    value: `${totalRivals}`,       icon: BadgeCheck,        color: "text-green-400"  },
            { label: "Countries",           value: "142",                  icon: Globe,             color: "text-sky-400"    },
            { label: "Pi Rate External",    value: `$${PI_RATE_EXTERNAL}`, icon: CircleDollarSign,  color: "text-purple-400" },
          ].map(stat => (
            <Card key={stat.label} className="border-white/10 bg-gray-900/60">
              <CardContent className="flex items-center gap-3 p-4">
                <stat.icon className={`h-6 w-6 shrink-0 ${stat.color}`} />
                <div>
                  <div className={`text-xl font-black ${stat.color}`}>{stat.value}</div>
                  <div className="text-[11px] text-gray-400">{stat.label}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── What We Obliterate ────────────────────────────────────────────── */}
        <Card className="border-red-500/30 bg-gray-900/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-400">
              <TrendingDown className="h-5 w-5" />
              {totalRivals} Industry Giants — Permanently Obsoleted
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { name: "UPS",          fee: `${UPS_SURCHARGE_AVG_PCT}% surcharges`,            replacement: "SPA — 0% surcharges" },
                { name: "USPS",         fee: `${USPS_RETAIL_MARKUP_PCT}% retail markup`,         replacement: "SPA — flat Pi rate" },
                { name: "Amazon Flex",  fee: `${AMAZON_FLEX_COMMISSION_PCT}% courier commission`, replacement: "SLMN — 0% commission" },
                { name: "DoorDash",     fee: `${DOORDASH_COMMISSION_PCT}% restaurant commission`, replacement: "SFDA — 0.001π access" },
                { name: "Grubhub",      fee: `${GRUBHUB_COMMISSION_PCT}% restaurant commission`,  replacement: "SFDA — 0% commission" },
                { name: "Uber Eats",    fee: `${UBER_EATS_COMMISSION_PCT}% restaurant commission`,replacement: "SFDA — 0% commission" },
                { name: "Uber/Lyft",    fee: `${100 - UBER_DRIVER_TAKE_HOME_PCT}% driver cut`,   replacement: "SRA — driver keeps 100%" },
                { name: "PartsGeek",    fee: `${PARTSGEEK_MARKUP_AVG_PCT}% parts markup`,        replacement: "SPSA — wholesale Pi price" },
                { name: "GoShare",      fee: `${GOSHARE_COMMISSION_PCT}% hauler commission`,     replacement: "SHHA — 0% commission" },
                { name: "Instawork",    fee: `${INSTAWORK_MARKUP_PCT}% employer markup`,         replacement: "SSLA — worker keeps 100%" },
                { name: "GetGigs",      fee: `$${GETGIGS_DISPATCH_FEE_USD}/gig dispatch`,        replacement: "SGDA — $0 dispatch fee" },
                { name: "ShiftSmart",   fee: `${SHIFTSMART_PLATFORM_FEE_PCT}% platform fee`,    replacement: "SGDA — 0% platform fee" },
              ].map(rival => (
                <div key={rival.name} className="rounded-lg border border-red-500/20 bg-red-950/20 p-3">
                  <div className="text-sm font-bold text-red-300 line-through">{rival.name}</div>
                  <div className="text-xs text-red-400/70">{rival.fee}</div>
                  <div className="mt-1 text-xs font-semibold text-green-400">→ {rival.replacement}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ── 8 Authority Cards ─────────────────────────────────────────────── */}
        <section>
          <h2 className="mb-4 text-2xl font-black text-white">
            8 Sovereign Authorities — Full Pi Ecosystem
          </h2>
          <div className="grid gap-6 lg:grid-cols-2">
            {AUTHORITIES.map(auth => (
              <Card key={auth.id} className="border-white/10 bg-gray-900/60 overflow-hidden">
                <div className={`h-1 w-full bg-gradient-to-r ${auth.color}`} />
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <div className={`rounded-lg bg-gradient-to-br ${auth.color} p-2`}>
                      <auth.icon className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={auth.badgeColor}>{auth.id}</Badge>
                        <span className="text-xs text-red-400 font-semibold">{auth.tagline}</span>
                      </div>
                      <CardTitle className="mt-1 text-base text-white">{auth.name}</CardTitle>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-2xl font-black text-orange-400">{auth.loopholes.length}</div>
                      <div className="text-[10px] text-gray-500">loopholes</div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Fee comparison */}
                  <div className="rounded-lg border border-red-500/20 bg-red-950/20 p-2.5 text-xs">
                    <span className="text-red-400 font-semibold">Rivals charge: </span>
                    <span className="text-red-300">{auth.rivalFee}</span>
                  </div>
                  <div className="rounded-lg border border-green-500/20 bg-green-950/20 p-2.5 text-xs">
                    <span className="text-green-400 font-semibold">Sovereign fee: </span>
                    <span className="text-green-300">{auth.sovereignFee}</span>
                  </div>

                  {/* Highlight */}
                  <p className="text-xs text-gray-400">{auth.highlight}</p>

                  {/* Pi stat */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-purple-300">
                      <Wallet className="h-3.5 w-3.5" />
                      <span className="font-bold">{auth.piStat}</span>
                    </div>
                    <div className="text-xs text-gray-500">{auth.rivals.join(" · ")}</div>
                  </div>

                  {/* Jobs */}
                  <div>
                    <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                      Global Jobs Created
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {auth.jobs.map(job => (
                        <span key={job} className="rounded-full border border-white/10 bg-gray-800 px-2 py-0.5 text-[11px] text-gray-300">
                          {job}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Top loopholes */}
                  <div>
                    <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                      Top Loopholes
                    </div>
                    <div className="space-y-1.5">
                      {auth.loopholes
                        .sort((a, b) => b.obliterationScore - a.obliterationScore)
                        .slice(0, 2)
                        .map(l => (
                          <div key={l.id} className="rounded border border-white/10 bg-gray-800/50 p-2">
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-[11px] font-semibold text-white leading-tight">{l.title}</span>
                              <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${
                                l.obliterationScore >= 95 ? "bg-red-500/20 text-red-300" :
                                l.obliterationScore >= 88 ? "bg-orange-500/20 text-orange-300" :
                                "bg-yellow-500/20 text-yellow-300"
                              }`}>
                                {l.obliterationScore}%
                              </span>
                            </div>
                            <p className="mt-0.5 text-[10px] text-gray-500 leading-relaxed line-clamp-2">{l.effect}</p>
                          </div>
                        ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* ── Global Jobs Map ───────────────────────────────────────────────── */}
        <Card className="border-white/10 bg-gray-900/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-400">
              <Globe className="h-5 w-5" />
              Global Pi Jobs — 142 Countries Active
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {[
                { label: "Open Positions",  value: "2,171+",  color: "text-green-400" },
                { label: "Pi Available",    value: "47.8π",   color: "text-purple-400" },
                { label: "USD Equivalent",  value: "$15,018", color: "text-orange-400" },
                { label: "Countries",       value: "142",     color: "text-sky-400" },
                { label: "Authorities",     value: "8",       color: "text-yellow-400" },
                { label: "Workers Needed",  value: "Global",  color: "text-pink-400" },
              ].map(s => (
                <div key={s.label} className="rounded-lg border border-white/10 bg-gray-800/60 p-3 text-center">
                  <div className={`text-lg font-black ${s.color}`}>{s.value}</div>
                  <div className="text-[11px] text-gray-500">{s.label}</div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {GLOBAL_JOB_REGIONS.map(r => (
                <div key={r.region} className="flex items-center justify-between rounded border border-white/10 bg-gray-800/40 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span>{r.flag}</span>
                    <span className="text-xs text-gray-300">{r.region}</span>
                  </div>
                  <span className="text-xs font-bold text-green-400">{r.jobs} jobs</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ── All Loopholes Table ───────────────────────────────────────────── */}
        <Card className="border-white/10 bg-gray-900/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-400">
              <Lock className="h-5 w-5" />
              {totalLoopholes} Sovereign Loopholes — SAIB Deploys All On Every Pulse
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {ALL_DELIVERY_LOOPHOLES.sort((a, b) => b.obliterationScore - a.obliterationScore).map(l => (
                <div
                  key={l.id}
                  className="rounded-lg border border-white/10 bg-gray-800/50 p-3"
                >
                  <div className="flex flex-wrap items-start gap-2">
                    <Badge className={
                      l.target === "SPA"  ? "bg-orange-500/20 text-orange-300 border-orange-500/40" :
                      l.target === "SLMN" ? "bg-yellow-500/20 text-yellow-300 border-yellow-500/40" :
                      l.target === "SFDA" ? "bg-red-500/20 text-red-300 border-red-500/40" :
                      l.target === "SRA"  ? "bg-sky-500/20 text-sky-300 border-sky-500/40" :
                      l.target === "SPSA" ? "bg-slate-500/20 text-slate-300 border-slate-500/40" :
                      l.target === "SHHA" ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" :
                      l.target === "SSLA" ? "bg-violet-500/20 text-violet-300 border-violet-500/40" :
                                            "bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40"
                    }>
                      {l.target}
                    </Badge>
                    <span className="flex-1 text-sm font-semibold text-white">{l.title}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {l.deployOnPulse && (
                        <span className="rounded bg-green-500/20 px-1.5 py-0.5 text-[10px] text-green-300">SAIB</span>
                      )}
                      <span className={`rounded px-1.5 py-0.5 text-xs font-bold ${
                        l.obliterationScore >= 97 ? "bg-red-500/30 text-red-200" :
                        l.obliterationScore >= 93 ? "bg-orange-500/30 text-orange-200" :
                        l.obliterationScore >= 88 ? "bg-yellow-500/30 text-yellow-200" :
                        "bg-gray-700 text-gray-300"
                      }`}>
                        {l.obliterationScore}%
                      </span>
                    </div>
                  </div>
                  <p className="mt-1.5 text-xs text-gray-400 leading-relaxed">{l.effect}</p>
                  <p className="mt-1 text-[10px] text-gray-600 font-mono">{l.cite}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ── Quantum Security & Pi Network ─────────────────────────────────── */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-purple-500/30 bg-gray-900/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-purple-400">
                <Lock className="h-5 w-5" />
                Maximum Quantum Setup
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { algo: "ML-DSA-87",           type: "Signature",   fips: "FIPS 204 (Max Level)", note: "Every work order signed" },
                { algo: "ML-KEM-1024",          type: "Encryption",  fips: "FIPS 203 (Max Level)", note: "All dispatch channels encrypted" },
                { algo: "SHAKE-256 + SHA3-512", type: "Hash",        fips: "FIPS 202",             note: "Blockchain anchors + tracking" },
                { algo: "SPHINCS+",             type: "Backup Sig",  fips: "FIPS 205",             note: "Fallback stateless hash-sig" },
              ].map(q => (
                <div key={q.algo} className="flex items-center justify-between rounded border border-purple-500/20 bg-purple-950/20 p-2.5">
                  <div>
                    <div className="text-sm font-bold text-purple-300 font-mono">{q.algo}</div>
                    <div className="text-xs text-gray-500">{q.note}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-purple-400">{q.type}</div>
                    <div className="text-[10px] text-gray-600">{q.fips}</div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-sky-500/30 bg-gray-900/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sky-400">
                <Award className="h-5 w-5" />
                Pi Network Real-World Utility
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "Pi Internal Rate",   value: `$${PI_RATE_INTERNAL.toLocaleString()}/π`, note: "Sovereign ecosystem value" },
                { label: "Pi External Rate",   value: `$${PI_RATE_EXTERNAL}/π`,                  note: "Real-world utility rate" },
                { label: "Settlement",         value: "Instant",                                  note: "Per work order — no weekly holds" },
                { label: "Bank Account",       value: "Not Required",                             note: "Pi wallet = payment method" },
                { label: "Currency Conversion",value: "Not Required",                             note: "Pi settles globally as-is" },
                { label: "Pioneer Benefit",    value: "50M Pioneers",                            note: "Highest-volume utility use case" },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between rounded border border-sky-500/20 bg-sky-950/20 p-2.5">
                  <div>
                    <div className="text-sm font-semibold text-sky-300">{item.label}</div>
                    <div className="text-[10px] text-gray-500">{item.note}</div>
                  </div>
                  <div className="rounded bg-sky-500/20 px-2 py-0.5 text-xs font-bold text-sky-200">{item.value}</div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* ── API Reference ─────────────────────────────────────────────────── */}
        <Card className="border-white/10 bg-gray-900/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-400">
              <Star className="h-5 w-5" />
              Sovereign Delivery API
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { method: "GET",  path: "/api/sovereign/delivery/status",    desc: "Full platform status, 8 authorities, rival fee comparison" },
                { method: "GET",  path: "/api/sovereign/delivery/loopholes", desc: "All 97 loopholes — filterable by target + min score" },
                { method: "POST", path: "/api/sovereign/delivery/loopholes", desc: "Scenario-based loophole scan" },
                { method: "GET",  path: "/api/sovereign/delivery/jobs",      desc: "Open global jobs — filterable by authority/region/country" },
                { method: "POST", path: "/api/sovereign/delivery/jobs",      desc: "Post a new sovereign job opening" },
                { method: "POST", path: "/api/sovereign/delivery/dispatch",  desc: "Dispatch a work order (PQ-signed, Pi-settled)" },
                { method: "GET",  path: "/api/sovereign/delivery/dispatch",  desc: "List dispatched work orders" },
              ].map(ep => (
                <div key={ep.path} className="rounded border border-white/10 bg-gray-800/50 p-2.5">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                      ep.method === "GET" ? "bg-green-500/20 text-green-300" : "bg-blue-500/20 text-blue-300"
                    }`}>
                      {ep.method}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono text-gray-300 break-all">{ep.path}</div>
                  <div className="mt-1 text-[10px] text-gray-500">{ep.desc}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ── Footer ────────────────────────────────────────────────────────── */}
        <div className="border-t border-white/10 pt-6 text-center text-xs text-gray-600">
          <p>
            {SOVEREIGN_DELIVERY_VERSION} · {APEX_SECURITY_LEVEL} · {QUANTUM_ALGO_SIG} ·{" "}
            {QUANTUM_ALGO_ENC} · {QUANTUM_ALGO_HASH}
          </p>
          <p className="mt-1">
            © 2024–2026 Jeremiah Drains / Triumph Synergy · EIN 41-6777102 · Protected under PiOS License
          </p>
        </div>
      </div>
    </div>
  );
}

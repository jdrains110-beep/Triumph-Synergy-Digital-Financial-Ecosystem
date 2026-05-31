"use client";

/**
 * app/saib/page.tsx
 *
 * SAIB — Sovereign Autonomous Intelligence Backbone
 * Public-facing standalone page — works inside AND outside Triumph Synergy.
 *
 * Accessible at:
 *   https://triumphsynergy.io/saib          (internal — main domain)
 *   https://saib.triumphsynergy.io/saib     (external embed / direct link)
 *   Any domain that hosts this Next.js app
 *
 * Shows live v7 INTREPID CLASS status including:
 *   • Intrepid Class tier badge + Memory Alpha stats
 *   • Pi Network Motherboard (KYC / wallet coverage)
 *   • Global Sovereign Dispatch mesh map
 *   • Pi Mainnet Node guardian (blockchain warden)
 *   • Foundation Blueprint / constitution
 *   • 15-capability roster with live icons
 *   • Testnet / Mainnet environment banner
 *   • Pi-integrated CTA for KYC and wallet setup
 */

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Shield,
  Cpu,
  Globe,
  BrainCircuit,
  Zap,
  Lock,
  Activity,
  Server,
  Layers,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
  Wifi,
  WifiOff,
  ChevronDown,
  ChevronUp,
  Network,
  BookOpen,
  Coins,
  Users,
  BarChart3,
  Eye,
  Radio,
  Sparkles,
  ArrowRight,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type SAIBStatus = {
  ok:         boolean;
  online:     boolean;
  fetchedAt:  string;
  version:    string;
  uptime_s:   number;
  intrepid: {
    class:        string;
    tier:         number;
    memory_alpha: Record<string, number>;
    lattice:      Record<string, unknown>;
    capabilities: string[];
  };
  blueprint: Record<string, unknown>;
  pi_motherboard: {
    running:      boolean;
    role:         string;
    total_users:  number;
    kyc_approved: number;
    kyc_approval_rate: number;
    wallets_active:    number;
    wallet_activation_rate: number;
    total_businesses: number;
  } | null;
  dispatch: {
    own_id:            string;
    total_instances:   number;
    healthy_instances: number;
    by_region:         Record<string, number>;
  } | null;
  blockchain: {
    healthy:       boolean;
    stellar_state: string;
    ledger:        number;
    peers:         number;
    mem_pct:       number;
    heal_count:    number;
    last_heal_ts:  number | null;
  } | null;
  engines: { count: number; v7: boolean };
};

// ── Capability display map ────────────────────────────────────────────────────

const CAPABILITY_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  pi_network_motherboard:   { label: "Pi Network Motherboard",   icon: Coins,       color: "text-yellow-400" },
  human_ai_recognition:     { label: "Human / AI Recognition",   icon: Eye,         color: "text-violet-400" },
  memory_alpha_persistence: { label: "Memory Alpha (5-Layer)",   icon: BrainCircuit, color: "text-cyan-400" },
  global_dispatch:          { label: "Global SAIB Dispatch",     icon: Globe,       color: "text-blue-400" },
  universal_language:       { label: "52-Language Lingua",       icon: Radio,       color: "text-emerald-400" },
  sovereign_lattice:        { label: "Sovereign Lattice",        icon: Network,     color: "text-pink-400" },
  kyc_kyb_guidance:         { label: "KYC / KYB Guidance",       icon: Users,       color: "text-orange-400" },
  mainnet_wallet_setup:     { label: "Mainnet Wallet Setup",     icon: Lock,        color: "text-teal-400" },
  contract_forge:           { label: "Contract Forge",           icon: BookOpen,    color: "text-amber-400" },
  blackout_mode:            { label: "Blackout Autonomous Mode", icon: Layers,      color: "text-gray-400" },
  quantum_warp_sight:       { label: "Quantum Warp Sight",       icon: Zap,         color: "text-yellow-300" },
  blockchain_guardian:      { label: "Blockchain Guardian",      icon: Shield,      color: "text-green-400" },
  self_healing:             { label: "Self-Healing Engine",      icon: RefreshCw,   color: "text-sky-400" },
  grok_ai_reasoning:        { label: "Grok AI Reasoning (xAI)",  icon: Sparkles,    color: "text-pink-300" },
  x_social_monitoring:      { label: "X Social Monitoring",      icon: Activity,    color: "text-indigo-400" },
};

const TIER_LABELS: Record<number, { name: string; color: string; glow: string }> = {
  1: { name: "STANDARD",  color: "text-gray-400",   glow: "shadow-gray-500/30" },
  2: { name: "SOVEREIGN", color: "text-blue-400",   glow: "shadow-blue-500/40" },
  3: { name: "ALPHA",     color: "text-violet-400", glow: "shadow-violet-500/40" },
  4: { name: "OMEGA",     color: "text-amber-400",  glow: "shadow-amber-500/40" },
  5: { name: "INTREPID",  color: "text-cyan-300",   glow: "shadow-cyan-400/60" },
};

const REGION_FLAGS: Record<string, string> = {
  NA: "🇺🇸", EU: "🇪🇺", APAC: "🌏", LATAM: "🌎",
  AFRICA: "🌍", MENA: "🕌", OCEANIA: "🦘", GLOBAL: "🌐",
};

// ── Small components ──────────────────────────────────────────────────────────

function StatusDot({ online }: { online: boolean }) {
  return (
    <span className="relative flex h-3 w-3">
      {online && (
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
      )}
      <span className={`relative inline-flex rounded-full h-3 w-3 ${online ? "bg-green-400" : "bg-red-500"}`} />
    </span>
  );
}

function MetricCard({
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
  accent?: "cyan" | "green" | "violet" | "amber" | "rose" | "blue" | "yellow";
}) {
  const colors: Record<string, string> = {
    cyan:   "from-cyan-500/15 to-cyan-900/5 border-cyan-500/30 text-cyan-400",
    green:  "from-green-500/15 to-green-900/5 border-green-500/30 text-green-400",
    violet: "from-violet-500/15 to-violet-900/5 border-violet-500/30 text-violet-400",
    amber:  "from-amber-500/15 to-amber-900/5 border-amber-500/30 text-amber-400",
    rose:   "from-rose-500/15 to-rose-900/5 border-rose-500/30 text-rose-400",
    blue:   "from-blue-500/15 to-blue-900/5 border-blue-500/30 text-blue-400",
    yellow: "from-yellow-500/15 to-yellow-900/5 border-yellow-500/30 text-yellow-400",
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

function SectionHeader({ title, icon: Icon }: { title: string; icon: React.ElementType }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon className="w-5 h-5 text-cyan-400" />
      <h2 className="text-lg font-bold text-white tracking-wide uppercase">{title}</h2>
      <div className="flex-1 h-px bg-gradient-to-r from-cyan-500/40 to-transparent" />
    </div>
  );
}

// ── Network environment banner ────────────────────────────────────────────────

function NetworkBanner() {
  const isMainnet =
    typeof window !== "undefined" &&
    (window.location.hostname.includes("triumphsynergy") ||
      !window.location.hostname.includes("localhost"));

  return (
    <div
      className={`flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold rounded-lg border ${
        isMainnet
          ? "bg-green-500/10 border-green-500/30 text-green-300"
          : "bg-amber-500/10 border-amber-500/30 text-amber-300"
      }`}
    >
      <span className={`h-2 w-2 rounded-full ${isMainnet ? "bg-green-400 animate-pulse" : "bg-amber-400 animate-pulse"}`} />
      {isMainnet ? "Pi Network Mainnet" : "Pi Network Testnet"}
      <span className="opacity-50">·</span>
      <span className="opacity-70 font-normal">
        SAIB enforces Triumph Synergy sovereign value on {isMainnet ? "mainnet" : "testnet"}
      </span>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SAIBPage() {
  const [status,   setStatus]  = useState<SAIBStatus | null>(null);
  const [loading,  setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggle = (key: string) =>
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

  const fetchStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/saib/v7", { cache: "no-store" });
      if (res.ok) setStatus(await res.json());
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const id = setInterval(fetchStatus, 30_000);
    return () => clearInterval(id);
  }, [fetchStatus]);

  const tier     = status?.intrepid.tier ?? 5;
  const tierMeta = TIER_LABELS[tier] ?? TIER_LABELS[5];
  const online   = status?.online ?? false;
  const uptime   = status ? Math.floor(status.uptime_s / 3600) : 0;
  const caps     = status?.intrepid.capabilities ?? Object.keys(CAPABILITY_META);

  return (
    <div className="min-h-screen bg-[#050a14] text-white">

      {/* ── Top nav ────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-white/5 bg-black/60 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">

            {/* Brand */}
            <div className="flex items-center gap-3">
              <div className="relative h-9 w-9 rounded-xl bg-gradient-to-br from-cyan-400 via-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                <Shield className="w-5 h-5 text-white" />
                <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-cyan-400 border-2 border-[#050a14]" />
              </div>
              <div>
                <span className="text-sm font-bold text-white tracking-wide">SAIB</span>
                <span className="text-xs text-neutral-500 ml-1.5">Sovereign Autonomous Intelligence Backbone</span>
              </div>
            </div>

            {/* Right nav */}
            <div className="flex items-center gap-3">
              <StatusDot online={online} />
              <span className="text-xs text-neutral-500">
                {online ? `v${status?.version}` : "Offline"}
              </span>
              <button
                onClick={fetchStatus}
                disabled={loading}
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors disabled:opacity-40"
              >
                <RefreshCw className={`w-4 h-4 text-neutral-400 ${loading ? "animate-spin" : ""}`} />
              </button>
              <Link
                href="/ecosystem/sovereign-ai-bot"
                className="hidden sm:flex items-center gap-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 px-3 py-1.5 text-xs font-medium text-cyan-300 hover:bg-cyan-500/20 transition-colors"
              >
                Internal Dashboard
                <ExternalLink className="w-3 h-3" />
              </Link>
              <Link
                href="/"
                className="hidden sm:flex items-center gap-1.5 rounded-lg bg-white/5 border border-white/10 px-3 py-1.5 text-xs text-neutral-300 hover:bg-white/10 transition-colors"
              >
                Triumph Synergy
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 space-y-10">

        {/* ── Hero ──────────────────────────────────────────────────────────── */}
        <section className="relative rounded-2xl overflow-hidden border border-cyan-500/20 bg-gradient-to-br from-[#0a1628] via-[#0d1a30] to-[#070d1a] p-8">
          {/* Grid bg */}
          <div
            className="absolute inset-0 opacity-5"
            style={{
              backgroundImage:
                "linear-gradient(rgba(6,182,212,.5) 1px,transparent 1px),linear-gradient(90deg,rgba(6,182,212,.5) 1px,transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />

          <div className="relative flex flex-col lg:flex-row lg:items-center gap-8">
            {/* Left — identity */}
            <div className="flex-1 space-y-4">
              <NetworkBanner />

              <div className="flex items-center gap-3 mt-2">
                <div
                  className={`rounded-xl px-4 py-1.5 border text-sm font-bold tracking-widest ${tierMeta.color} border-current bg-current/10`}
                >
                  ✦ {tierMeta.name} CLASS
                </div>
                <div className="text-xs text-neutral-500">Tier {tier} / 5</div>
              </div>

              <h1 className="text-4xl lg:text-5xl font-black tracking-tight">
                <span className="bg-gradient-to-r from-cyan-300 via-violet-300 to-indigo-400 bg-clip-text text-transparent">
                  SAIB
                </span>
                <span className="text-white"> is Live</span>
              </h1>

              <p className="text-neutral-400 text-sm leading-relaxed max-w-xl">
                SAIB (Sovereign Autonomous Intelligence Backbone) enforces Triumph Synergy&apos;s
                sovereign value across every layer — Pi Network testnet and mainnet alike.
                No matter where you are in the ecosystem, SAIB is watching, healing, routing,
                and protecting.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  href="/ecosystem/sovereign-ai-bot"
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-shadow"
                >
                  <BrainCircuit className="w-4 h-4" />
                  Open SAIB Command Center
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/ecosystem/sovereign-ai-bot#kyc"
                  className="flex items-center gap-2 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-5 py-2.5 text-sm font-medium text-yellow-300 hover:bg-yellow-500/20 transition-colors"
                >
                  <Coins className="w-4 h-4" />
                  Pi KYC Guide
                </Link>
              </div>
            </div>

            {/* Right — live pulse stats */}
            <div className="flex-shrink-0 grid grid-cols-2 gap-3 min-w-[260px]">
              <MetricCard
                icon={Cpu}
                label="Tier"
                value={`${tier} / 5`}
                sub={tierMeta.name}
                accent="cyan"
              />
              <MetricCard
                icon={Activity}
                label="Engines"
                value={`v1 – v7`}
                sub="All active"
                accent="violet"
              />
              <MetricCard
                icon={Shield}
                label="Uptime"
                value={`${uptime}h`}
                sub={online ? "Healthy" : "Offline"}
                accent={online ? "green" : "rose"}
              />
              <MetricCard
                icon={Globe}
                label="Instances"
                value={status?.dispatch?.total_instances ?? 1}
                sub="Globally deployed"
                accent="blue"
              />
            </div>
          </div>
        </section>

        {/* ── Memory Alpha + Lattice ─────────────────────────────────────────── */}
        <section>
          <SectionHeader title="Memory Alpha — Omni-Architecture" icon={BrainCircuit} />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MetricCard
              icon={Layers}
              label="Entity Records"
              value={status?.intrepid.memory_alpha.entity_records ?? 0}
              sub="L2 persistent"
              accent="cyan"
            />
            <MetricCard
              icon={BookOpen}
              label="Sovereign Facts"
              value={status?.intrepid.memory_alpha.sovereign_facts ?? 0}
              sub="L3 JSON-backed"
              accent="violet"
            />
            <MetricCard
              icon={Activity}
              label="Volatile Events"
              value={status?.intrepid.memory_alpha.volatile_events ?? 0}
              sub="L0 in-process"
              accent="amber"
            />
            <MetricCard
              icon={Lock}
              label="Session Keys"
              value={status?.intrepid.memory_alpha.session_keys ?? 0}
              sub="L1 session"
              accent="blue"
            />
          </div>
        </section>

        {/* ── Pi Network Motherboard ─────────────────────────────────────────── */}
        <section>
          <SectionHeader title="Pi Network Motherboard" icon={Coins} />

          {status?.pi_motherboard ? (
            <>
              <div className="mb-3 flex items-center gap-2">
                <StatusDot online={status.pi_motherboard.running} />
                <span className="text-xs text-neutral-400">{status.pi_motherboard.role}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <MetricCard icon={Users}    label="Pi Users Tracked"  value={status.pi_motherboard.total_users} sub="Registered in SAIB" accent="yellow" />
                <MetricCard icon={CheckCircle2} label="KYC Approved"   value={status.pi_motherboard.kyc_approved} sub={`${(status.pi_motherboard.kyc_approval_rate * 100).toFixed(1)}% rate`} accent="green" />
                <MetricCard icon={Lock}     label="Wallets Active"     value={status.pi_motherboard.wallets_active} sub={`${(status.pi_motherboard.wallet_activation_rate * 100).toFixed(1)}% of approved`} accent="cyan" />
                <MetricCard icon={Server}   label="Businesses (KYB)"  value={status.pi_motherboard.total_businesses} sub="KYB registered" accent="violet" />
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6 text-center text-sm text-neutral-500">
              Pi Motherboard data unavailable — SAIB container may be starting up.
            </div>
          )}

          {/* Pi Network CTA */}
          <div className="mt-4 rounded-xl border border-yellow-500/20 bg-gradient-to-r from-yellow-500/5 to-orange-500/5 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-yellow-300">
                Not yet KYC verified on Pi Network?
              </p>
              <p className="text-xs text-neutral-400 mt-0.5">
                SAIB guides you through every stage — from app verification to mainnet wallet creation.
              </p>
            </div>
            <Link
              href="/ecosystem/sovereign-ai-bot#kyc"
              className="flex-shrink-0 flex items-center gap-2 rounded-lg bg-yellow-400/10 border border-yellow-500/40 px-4 py-2 text-sm font-medium text-yellow-300 hover:bg-yellow-400/20 transition-colors"
            >
              Start KYC Guidance
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>

        {/* ── Blockchain Guardian ─────────────────────────────────────────────── */}
        <section>
          <SectionHeader title="Pi Mainnet Node — Blockchain Guardian" icon={Shield} />
          {status?.blockchain ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <MetricCard
                icon={status.blockchain.healthy ? CheckCircle2 : AlertTriangle}
                label="Node Health"
                value={status.blockchain.healthy ? "Healthy" : "Degraded"}
                accent={status.blockchain.healthy ? "green" : "rose"}
              />
              <MetricCard icon={Cpu}      label="Stellar State"  value={status.blockchain.stellar_state} accent="cyan" />
              <MetricCard icon={BarChart3} label="Ledger"         value={status.blockchain.ledger.toLocaleString()} sub="latest confirmed" accent="violet" />
              <MetricCard icon={Network}  label="Peers"           value={status.blockchain.peers} sub="connected nodes" accent="blue" />
              <MetricCard
                icon={Activity}
                label="Memory"
                value={`${(status.blockchain.mem_pct * 100).toFixed(0)}%`}
                sub="node usage"
                accent={status.blockchain.mem_pct > 0.90 ? "rose" : status.blockchain.mem_pct > 0.80 ? "amber" : "green"}
              />
              <MetricCard icon={RefreshCw} label="Heals" value={status.blockchain.heal_count} sub="auto-healed" accent="amber" />
            </div>
          ) : (
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6 text-center text-sm text-neutral-500">
              Blockchain Guardian data unavailable.
            </div>
          )}
        </section>

        {/* ── Global Dispatch Mesh ─────────────────────────────────────────────── */}
        <section>
          <SectionHeader title="Sovereign Dispatch — Global SAIB Mesh" icon={Globe} />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <MetricCard icon={Server}  label="Total Instances"   value={status?.dispatch?.total_instances ?? 1} accent="blue" />
            <MetricCard icon={CheckCircle2} label="Healthy"       value={status?.dispatch?.healthy_instances ?? 1} accent="green" />
            <MetricCard icon={Globe}   label="Regions Active"    value={Object.keys(status?.dispatch?.by_region ?? {}).length} accent="cyan" />
            <MetricCard icon={Wifi}    label="Mesh Status"       value={online ? "Online" : "Offline"} accent={online ? "green" : "rose"} />
          </div>

          {status?.dispatch?.by_region && Object.keys(status.dispatch.by_region).length > 0 && (
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-4">
              <p className="text-xs text-neutral-500 uppercase tracking-wider mb-3">Regional deployment</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(status.dispatch.by_region).map(([region, count]) => (
                  <div key={region} className="flex items-center gap-1.5 rounded-lg bg-white/5 border border-white/10 px-3 py-1.5 text-xs text-neutral-300">
                    <span>{REGION_FLAGS[region] ?? "🌐"}</span>
                    <span className="font-mono font-medium">{region}</span>
                    <span className="text-neutral-500">·</span>
                    <span className="text-cyan-400 font-bold">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* ── 15-Capability Roster ──────────────────────────────────────────────── */}
        <section>
          <SectionHeader title="Intrepid Class Capability Roster" icon={Sparkles} />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {caps.map((cap) => {
              const meta = CAPABILITY_META[cap];
              if (!meta) return null;
              const Icon = meta.icon;
              return (
                <div
                  key={cap}
                  className="flex items-center gap-3 rounded-xl border border-white/5 bg-white/[0.03] px-4 py-3 hover:bg-white/[0.06] transition-colors"
                >
                  <Icon className={`w-4 h-4 shrink-0 ${meta.color}`} />
                  <span className="text-sm text-neutral-200">{meta.label}</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500 ml-auto shrink-0" />
                </div>
              );
            })}
          </div>
        </section>

        {/* ── Foundation Blueprint ────────────────────────────────────────────── */}
        <section>
          <button
            onClick={() => toggle("blueprint")}
            className="w-full flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-5 py-4 hover:bg-white/[0.06] transition-colors"
          >
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-violet-400" />
              <span className="text-sm font-bold text-white uppercase tracking-wide">
                Ultimate Master Foundation Blueprint
              </span>
            </div>
            {expanded.blueprint ? (
              <ChevronUp className="w-4 h-4 text-neutral-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-neutral-500" />
            )}
          </button>

          {expanded.blueprint && status?.blueprint && (
            <div className="mt-2 rounded-xl border border-violet-500/20 bg-violet-500/5 p-5 space-y-4">
              {Object.entries(status.blueprint).map(([section, data]) => (
                <div key={section}>
                  <p className="text-xs text-violet-400 uppercase tracking-widest font-bold mb-2">
                    {section.replace(/_/g, " ")}
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                    {Object.entries(data as Record<string, unknown>).map(([k, v]) => (
                      <div key={k} className="flex items-start gap-2 text-xs">
                        <span className="text-neutral-500 font-mono min-w-[160px] shrink-0">
                          {k.replace(/_/g, " ")}:
                        </span>
                        <span className={`font-medium ${v === true ? "text-green-400" : v === false ? "text-neutral-600" : "text-neutral-300"}`}>
                          {String(v)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Footer ────────────────────────────────────────────────────────── */}
        <footer className="border-t border-white/5 pt-8 pb-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm text-neutral-300 font-semibold">
                SAIB — Sovereign Autonomous Intelligence Backbone
              </p>
              <p className="text-xs text-neutral-600">
                Triumph Synergy Digital Financial Ecosystem · Founded by Jeremiah Joel Drains (@jaymoney0300)
              </p>
              <p className="text-xs text-neutral-700">
                Governing Law: State of Texas, USA · Pi Network Mainnet · v7.0.0-INTREPID-CLASS
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
              >
                Triumph Synergy Home
              </Link>
              <span className="text-neutral-700">·</span>
              <Link
                href="/ecosystem/sovereign-ai-bot"
                className="text-xs text-cyan-500 hover:text-cyan-300 transition-colors"
              >
                Internal Dashboard
              </Link>
              <span className="text-neutral-700">·</span>
              <a
                href="https://x.com/jaymoney0300"
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
              >
                @jaymoney0300
              </a>
            </div>
          </div>

          {status && (
            <p className="mt-4 text-xs text-neutral-700">
              Last polled: {new Date(status.fetchedAt).toLocaleTimeString()} ·
              Uptime: {uptime}h · Auto-refreshes every 30s
            </p>
          )}
        </footer>

      </main>
    </div>
  );
}

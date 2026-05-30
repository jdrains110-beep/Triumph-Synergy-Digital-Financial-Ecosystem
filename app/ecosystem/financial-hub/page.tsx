"use client";
/**
 * app/ecosystem/financial-hub/page.tsx
 *
 * Financial Hub — Treasury & Liquidity Ops
 * SAIB v3 module probe runs client-side so it always reflects live API status,
 * avoiding the Next.js SSG 404-cache problem.
 */

import React from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SAIBModuleProbe } from "@/components/saib-module-probe";
import {
  Activity,
  BadgeCheck,
  BarChart3,
  CreditCard,
  Globe,
  Lock,
  PiggyBank,
  Shield,
  Sparkles,
  Wallet,
  Zap,
} from "lucide-react";

// ─── Financial hub feature data ────────────────────────────────────────────

const SYSTEMS = [
  {
    id: "ubi",
    icon: <PiggyBank className="h-5 w-5 text-emerald-400" />,
    title: "Universal Basic Income",
    status: "active" as const,
    programs: ["Pi Network Global UBI", "NESARA Prosperity Distribution"],
    desc: "Monthly Pi UBI disbursed on-chain to every KYC-verified pioneer. No bank account, no means test, no exclusions.",
  },
  {
    id: "nesara",
    icon: <Shield className="h-5 w-5 text-purple-400" />,
    title: "NESARA / GESARA",
    status: "active" as const,
    programs: ["Debt Forgiveness", "Prosperity Funds", "Tax Reform", "Asset-Backed Accounts"],
    desc: "Complete NESARA/GESARA implementation — debt jubilee, tax abolition, sovereign treasury backed by Pi.",
  },
  {
    id: "credit",
    icon: <CreditCard className="h-5 w-5 text-blue-400" />,
    title: "Credit & Dispute",
    status: "active" as const,
    programs: ["Equifax", "Experian", "TransUnion", "Innovis", "PRBC"],
    desc: "FCRA §611 superior dispute system — 5-bureau resolution, Pi-anchored dispute history, zero lawyer fees.",
  },
  {
    id: "pi",
    icon: <Globe className="h-5 w-5 text-cyan-400" />,
    title: "Pi Network Integration",
    status: "active" as const,
    programs: ["Pi Mainnet", "Stellar SDEX", "A2U Payments"],
    desc: "Full Pi Network Mainnet API integration — U2A/A2U payments, KYC verification, Horizon explorer.",
  },
  {
    id: "treasury",
    icon: <BarChart3 className="h-5 w-5 text-amber-400" />,
    title: "Sovereign Treasury",
    status: "active" as const,
    programs: ["Liquidity Management", "Yield Optimization", "Reserve Operations"],
    desc: "Triumph Synergy sovereign treasury operations — Pi reserve management, yield farming, liquidity routing.",
  },
  {
    id: "bridge",
    icon: <Zap className="h-5 w-5 text-orange-400" />,
    title: "Pi ↔ USD Bridge",
    status: "active" as const,
    programs: ["Stripe USD Rail", "Pi Mainnet Settlement", "TRISYN Peg"],
    desc: "Bidirectional Pi ↔ USD bridge via Stripe + Pi Mainnet. TRISYN stablecoin pegged 1:1 to Pi.",
  },
];

const ENDPOINTS = [
  { method: "POST", path: "/api/financial-hub", desc: "Onboard pioneer { action: 'onboard', piUserId, piUsername, email, debts }" },
  { method: "GET",  path: "/api/financial-hub?userId={id}", desc: "Get pioneer dashboard" },
  { method: "GET",  path: "/api/financial-hub?userId={id}&transactions=true", desc: "Transaction history" },
  { method: "POST", path: "/api/financial-hub", desc: "Process UBI distributions { action: 'process-distributions' }" },
  { method: "GET",  path: "/api/nesara", desc: "NESARA system status" },
  { method: "POST", path: "/api/nesara", desc: "Register / submit debt / activate prosperity" },
  { method: "GET",  path: "/api/financial-hub?userId={id}", desc: "Credit dispute status" },
];

const NAV_LINKS = [
  { href: "/ecosystem/sovereign-estate",   emoji: "🏛️", label: "Real Estate",       desc: "Allodial deeds & property" },
  { href: "/ecosystem/sovereign-pi-bank",  emoji: "🏦", label: "Sovereign Pi Bank", desc: "Gold-backed Pi banking" },
  { href: "/transactions",                 emoji: "💸", label: "Transactions",       desc: "Payment routing" },
  { href: "/ecosystem/credit-dispute",     emoji: "📊", label: "Credit Dispute",     desc: "Bureau resolution" },
  { href: "/ecosystem/tokenization",       emoji: "🪙", label: "Tokenization",       desc: "Asset tokenization" },
  { href: "/ecosystem/sovereign-pidex",    emoji: "📈", label: "Pi-DEX",             desc: "Internal superior exchange · ML + SAIB" },
  { href: "/ecosystem/nesara",             emoji: "⚖️", label: "NESARA",             desc: "Reset & remittance engine" },
];

// ─── Page component ────────────────────────────────────────────────────────

export default function FinancialHubPage() {
  return (
    <div className="space-y-8 p-4 md:p-6 max-w-5xl mx-auto">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="text-xs border-cyan-500/40 text-cyan-400">SAIB-QUANTUM-CORE-v3</Badge>
          <Badge variant="outline" className="text-xs border-purple-500/40 text-purple-400">ML-DSA-87 · ML-KEM-1024</Badge>
          <Badge variant="outline" className="text-xs border-amber-500/40 text-amber-400">SAIB-SENTINEL · 24/7</Badge>
          <Badge variant="outline" className="text-xs border-emerald-500/40 text-emerald-400">Founder-pinned · KING_QUEEN</Badge>
        </div>
        <h1 className="text-3xl font-bold text-foreground">Financial Hub</h1>
        <p className="text-muted-foreground">Treasury &amp; liquidity ops</p>
      </div>

      {/* ── SAIB v3 Live Module Probe (client-side) ──────────────────── */}
      <SAIBModuleProbe endpoint="/api/financial-hub" label="/api/financial-hub" />

      {/* ── Systems overview ─────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Activity className="h-5 w-5 text-cyan-400" />
          Integrated Financial Systems
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SYSTEMS.map((s) => (
            <Card key={s.id} className="bg-card/50 border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  {s.icon}
                  {s.title}
                  <Badge
                    variant="secondary"
                    className="ml-auto text-xs text-emerald-400 bg-emerald-500/10 border-0"
                  >
                    {s.status}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-xs text-muted-foreground">{s.desc}</p>
                <div className="flex flex-wrap gap-1">
                  {s.programs.map((p) => (
                    <Badge key={p} variant="outline" className="text-xs border-border/50 text-muted-foreground/70">
                      {p}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ── API Reference ────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Lock className="h-5 w-5 text-blue-400" />
          API Reference ({ENDPOINTS.length} endpoints)
        </h2>
        <Card className="p-4">
          <div className="space-y-2 font-mono text-xs">
            {ENDPOINTS.map((e) => (
              <div key={e.path + e.desc} className="flex items-start gap-2">
                <Badge
                  variant="outline"
                  className={`shrink-0 text-xs ${e.method === "GET" ? "text-emerald-400 border-emerald-500/40" : "text-blue-400 border-blue-500/40"}`}
                >
                  {e.method}
                </Badge>
                <span className="text-muted-foreground break-all">{e.path}</span>
                <span className="hidden sm:inline text-muted-foreground/60 shrink-0">— {e.desc}</span>
              </div>
            ))}
          </div>
        </Card>
      </section>

      {/* ── Pi Purchasing Power ──────────────────────────────────────── */}
      <section className="rounded-lg border border-border/50 bg-card/50 p-4 space-y-3">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <Wallet className="h-4 w-4 text-amber-400" />
          Pi Purchasing Power
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">INTERNAL · PIONEER SOVEREIGN RATE</p>
            <p className="text-2xl font-bold text-emerald-400">$314,159<span className="text-base font-normal text-muted-foreground">/π</span></p>
            <p className="text-xs text-muted-foreground/70">Settles inside Triumph Synergy ecosystem</p>
          </div>
          <div className="rounded-lg bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">EXTERNAL · OPEN-MARKET UTILITY RATE</p>
            <p className="text-2xl font-bold text-blue-400">$314.159<span className="text-base font-normal text-muted-foreground">/π</span></p>
            <p className="text-xs text-muted-foreground/70">Used in open-market exchanges</p>
          </div>
        </div>
      </section>

      {/* ── Pay with Pi ─────────────────────────────────────────────── */}
      <section className="rounded-lg border border-border/50 bg-card/50 p-4 space-y-2">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <Zap className="h-4 w-4 text-amber-400" />
          Pay inside this sector with Pi
        </h2>
        <p className="text-sm text-muted-foreground">
          Use the Pi Browser. Any asset accepted — merchant receives TRISYN or π through the Merchant Rail.
        </p>
        <div className="flex gap-3 pt-1">
          <Link href="/ecosystem/merchant-rail" className="text-sm text-cyan-400 hover:underline">
            Merchant Rail →
          </Link>
          <Link href="/ecosystem/sovereign-pidex" className="text-sm text-cyan-400 hover:underline">
            Quote on Pi-DEX →
          </Link>
        </div>
      </section>

      {/* ── Navigation ─────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          MORE IN FINANCE · COMMERCE
        </h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {NAV_LINKS.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="flex items-center gap-2 rounded-lg border border-border/50 bg-card/50 p-3 text-sm hover:border-border transition-colors"
            >
              <span className="text-base">{n.emoji}</span>
              <div>
                <p className="font-medium text-foreground">{n.label}</p>
                <p className="text-xs text-muted-foreground">{n.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <p className="text-center text-xs text-muted-foreground/50 pb-4">
        Triumph Synergy · Sovereign mesh · SAIB v3 self-healing across every sector
      </p>
    </div>
  );
}

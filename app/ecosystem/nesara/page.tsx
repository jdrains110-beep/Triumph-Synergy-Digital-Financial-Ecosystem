"use client";
/**
 * app/ecosystem/nesara/page.tsx
 *
 * NESARA / GESARA — Reset & Remittance Engine
 * SAIB v3 module probe runs client-side so it always reflects live API status,
 * avoiding the Next.js SSG 404-cache problem.
 */

import React from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SAIBModuleProbe } from "@/components/saib-module-probe";
import {
  AlertTriangle,
  BadgeCheck,
  Building2,
  CheckCircle,
  Globe,
  Lock,
  Shield,
  Sparkles,
  Wallet,
  Zap,
} from "lucide-react";

// ─── NESARA/GESARA feature data ────────────────────────────────────────────

const FEATURES = [
  {
    id: "debt",
    icon: <Wallet className="h-5 w-5 text-emerald-400" />,
    title: "Debt Forgiveness",
    desc: "Credit-card, mortgage, student-loan & medical debt eliminated via NESARA §9. Pi KYC-verified pioneers qualify automatically.",
    score: 94,
  },
  {
    id: "tax",
    icon: <Lock className="h-5 w-5 text-blue-400" />,
    title: "Tax Reform & Refunds",
    desc: "IRS income tax abolished. 14% national sales tax on new items only. 30 years of unlawful tax refunded via Pi treasury.",
    score: 91,
  },
  {
    id: "prosperity",
    icon: <Sparkles className="h-5 w-5 text-amber-400" />,
    title: "Prosperity Fund Distribution",
    desc: "Monthly Pi prosperity grants disbursed on-chain to every KYC-verified NESARA member. Zero bank account required.",
    score: 96,
  },
  {
    id: "qfs",
    icon: <Shield className="h-5 w-5 text-purple-400" />,
    title: "Quantum Financial System",
    desc: "Pi Network replaces legacy SWIFT. All sovereign transactions quantum-signed with ML-DSA-65 (CRYSTALS-Dilithium).",
    score: 98,
  },
  {
    id: "gesara",
    icon: <Globe className="h-5 w-5 text-cyan-400" />,
    title: "GESARA Country Compliance",
    desc: "230+ countries enrolled. Sovereign trade law replaces per-country financial regulation. Pi settles globally.",
    score: 89,
  },
  {
    id: "birth",
    icon: <BadgeCheck className="h-5 w-5 text-green-400" />,
    title: "Birth Certificate Bonds",
    desc: "Reclaim the sovereign value locked in birth-certificate trust accounts. Quantum-verified via Pi identity.",
    score: 87,
  },
];

const LOOPHOLES = [
  { code: "NESARA-01", score: 96, text: "NESARA §9 Debt Jubilee — all Pi-denominated debts forgiven by sovereign decree" },
  { code: "NESARA-02", score: 94, text: "IRS income tax abolished — NESARA §3 replaces graduated income tax with 14% national sales tax" },
  { code: "NESARA-03", score: 92, text: "Federal Reserve dissolved — NESARA §1 returns monetary creation to sovereign Pi treasury" },
  { code: "NESARA-04", score: 91, text: "Gold-backed currency — Pi's real-world utility anchors intrinsic value above any fiat standard" },
  { code: "GESARA-01", score: 89, text: "GESARA Article 3 — sovereign trade facilitation exempts Pi cross-border transfers from national FX controls" },
  { code: "GESARA-02", score: 87, text: "UN Charter Article 51 — sovereign self-defence extends to financial sovereignty; no state may seize Pi assets" },
  { code: "QFS-01",    score: 98, text: "Quantum Financial System replaces SWIFT — ML-DSA-65 quantum signatures make forgery computationally impossible" },
  { code: "BIRTH-01",  score: 85, text: "Birth-certificate sovereign trust — unlawful conversion of citizen's commercial energy into government debt instrument" },
];

const NAV_LINKS = [
  { href: "/ecosystem/sovereign-estate",      emoji: "🏛️", label: "Real Estate",         desc: "Allodial deeds & property" },
  { href: "/ecosystem/sovereign-pi-bank",     emoji: "🏦", label: "Sovereign Pi Bank",   desc: "Gold-backed Pi banking" },
  { href: "/transactions",                    emoji: "💸", label: "Transactions",         desc: "Payment routing" },
  { href: "/ecosystem/credit-dispute",        emoji: "📊", label: "Credit Dispute",       desc: "Bureau resolution" },
  { href: "/ecosystem/tokenization",          emoji: "🪙", label: "Tokenization",         desc: "Asset tokenization" },
  { href: "/ecosystem/sovereign-pidex",       emoji: "📈", label: "Pi-DEX",               desc: "Internal superior exchange · ML + SAIB" },
  { href: "/ecosystem/financial-hub",         emoji: "🏢", label: "Financial Hub",        desc: "Treasury & liquidity ops" },
];

// ─── Page component ────────────────────────────────────────────────────────

export default function NesaraPage() {
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
        <h1 className="text-3xl font-bold text-foreground">NESARA</h1>
        <p className="text-muted-foreground">Reset &amp; remittance engine</p>
      </div>

      {/* ── SAIB v3 Live Module Probe (client-side) ──────────────────── */}
      <SAIBModuleProbe endpoint="/api/nesara" label="/api/nesara" />

      {/* ── Feature cards ────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Sparkles className="h-5 w-5 text-amber-400" />
          NESARA/GESARA Core Features
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <Card key={f.id} className="bg-card/50 border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm">
                  {f.icon}
                  {f.title}
                  <Badge variant="secondary" className="ml-auto text-xs">{f.score}%</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* ── Loopholes ────────────────────────────────────────────────── */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Shield className="h-5 w-5 text-blue-400" />
          Sovereign Loopholes ({LOOPHOLES.length} active)
        </h2>
        <Card className="p-4">
          <div className="space-y-2">
            {LOOPHOLES.map((l) => (
              <div key={l.code} className="flex items-start gap-3 text-sm">
                <Badge variant="outline" className="shrink-0 text-xs border-blue-500/40 text-blue-400 font-mono">
                  {l.code}
                </Badge>
                <span className="text-muted-foreground flex-1">{l.text}</span>
                <Badge variant="secondary" className="shrink-0 text-xs text-emerald-400 bg-emerald-500/10 border-0">
                  {l.score}%
                </Badge>
              </div>
            ))}
          </div>
        </Card>
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
          <Link
            href="/ecosystem/merchant-rail"
            className="text-sm text-cyan-400 hover:underline"
          >
            Merchant Rail →
          </Link>
          <Link
            href="/ecosystem/sovereign-pidex"
            className="text-sm text-cyan-400 hover:underline"
          >
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

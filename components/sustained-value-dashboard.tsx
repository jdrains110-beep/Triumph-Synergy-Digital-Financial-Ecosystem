"use client";

import {
  Activity,
  BarChart3,
  Brain,
  ChevronUp,
  ChevronDown,
  Minus,
  Shield,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

// ─── Types ─────────────────────────────────────────────────────────────────────

type UtilityComponent = {
  txVolumeScore: number;
  feeBurnScore: number;
  ledgerRateScore: number;
  retentionScore: number;
};

type UtilityIndex = {
  utilityScore: number;
  speculativeRatio: number;
  utilityRatio: number;
  sustained: boolean;
  trend: "EXPANDING" | "STABLE" | "CONTRACTING";
  piThesis: string;
  components: UtilityComponent;
  live: {
    avgTxPerLedger: number;
    avgBaseFee: number;
    ledgerSeq: number;
    piPriceUsd: number;
  };
  model: string;
  basedOnPoints: number;
};

type SustainedValue = {
  sustainabilityScore: number;
  rating:
    | "STRONGLY_SUSTAINABLE"
    | "SUSTAINABLE"
    | "MODERATELY_SUSTAINABLE"
    | "SPECULATIVE";
  utilityBackedPriceUsd: number;
  speculativePremiumUsd: number;
  currentPriceUsd: number;
  predictedPriceUsd: number;
  utilityScore: number;
  speculativeRatio: number;
  sentiment: "BULLISH" | "BEARISH" | "NEUTRAL";
  priceTrend: "BULLISH" | "BEARISH" | "NEUTRAL";
  piThesis: string;
  components: {
    utilityIndex: UtilityIndex;
    pricePrediction: { predictedPiUsd: number; deltaPct: number; trend: string; confidence: number };
    marketSentiment: { sentiment: string; rsi: number };
  };
  model: string;
};

// ─── Helpers ───────────────────────────────────────────────────────────────────

function ScoreBar({
  value,
  max = 100,
  color,
}: {
  value: number;
  max?: number;
  color: string;
}) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-700 ${color}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function TrendIcon({ trend }: { trend: string }) {
  if (trend === "BULLISH" || trend === "EXPANDING")
    return <ChevronUp className="h-4 w-4 text-green-500" />;
  if (trend === "BEARISH" || trend === "CONTRACTING")
    return <ChevronDown className="h-4 w-4 text-red-500" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
}

function ratingColor(rating: string) {
  switch (rating) {
    case "STRONGLY_SUSTAINABLE": return "bg-green-500/15 text-green-600 border-green-500/30";
    case "SUSTAINABLE":          return "bg-emerald-500/15 text-emerald-600 border-emerald-500/30";
    case "MODERATELY_SUSTAINABLE": return "bg-yellow-500/15 text-yellow-600 border-yellow-500/30";
    default:                     return "bg-red-500/15 text-red-600 border-red-500/30";
  }
}

function ratingLabel(rating: string) {
  return rating.replace(/_/g, " ");
}

// ─── Donut score gauge ─────────────────────────────────────────────────────────

function ScoreGauge({ score, label, size = 96 }: { score: number; label: string; size?: number }) {
  const r      = (size / 2) * 0.75;
  const circ   = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(score, 100) / 100);
  const color  = score >= 65 ? "#22c55e" : score >= 40 ? "#eab308" : "#ef4444";

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#27272a" strokeWidth={8} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={8}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={size * 0.22}
          fontWeight="700"
          fill={color}
        >
          {Math.round(score)}
        </text>
      </svg>
      <span className="text-xs text-muted-foreground text-center">{label}</span>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function SustainedValueDashboard() {
  const [data, setData]       = useState<SustainedValue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/services/ml/api/ml/sustained-value");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: SustainedValue = await res.json();
      setData(json);
      setLastRefresh(new Date());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "ML engine unreachable");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, 15_000);
    return () => clearInterval(id);
  }, [fetchData]);

  if (loading) {
    return (
      <Card className="p-8 flex items-center justify-center gap-3 text-muted-foreground">
        <Brain className="h-5 w-5 animate-pulse" />
        <span>Loading ML Sustained Value Analysis…</span>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="p-6 text-center text-sm text-muted-foreground">
        <p>ML engine unavailable: {error}</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={fetchData}>
          Retry
        </Button>
      </Card>
    );
  }

  const ui = data.components.utilityIndex;
  const pr = data.components.pricePrediction;
  const sm = data.components.marketSentiment;

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-violet-500" />
          <h2 className="font-semibold text-base">Sustained Value Analysis</h2>
          <Badge variant="outline" className="text-xs font-mono">
            {data.model}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {lastRefresh ? `Updated ${lastRefresh.toLocaleTimeString()}` : ""}
          </span>
          <Button variant="ghost" size="sm" onClick={fetchData}>
            <Activity className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* ── Pi Thesis banner ── */}
      <Card className="px-4 py-3 bg-violet-500/5 border-violet-500/20 flex items-center gap-3">
        <Sparkles className="h-4 w-4 text-violet-400 shrink-0" />
        <p className="text-sm italic text-violet-300">{data.piThesis}</p>
      </Card>

      {/* ── Score gauges row ── */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4 flex flex-col items-center">
          <ScoreGauge score={data.sustainabilityScore} label="Sustainability" />
        </Card>
        <Card className="p-4 flex flex-col items-center">
          <ScoreGauge score={data.utilityScore} label="Utility Index" />
        </Card>
        <Card className="p-4 flex flex-col items-center">
          <ScoreGauge score={Math.round((1 - data.speculativeRatio) * 100)} label="Utility-Backed %" />
        </Card>
      </div>

      {/* ── Rating + price split ── */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground uppercase tracking-wide">Rating</span>
            <Badge className={`text-xs border ${ratingColor(data.rating)}`}>
              {ratingLabel(data.rating)}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <TrendIcon trend={data.priceTrend} />
            <span className="text-sm font-medium capitalize">{data.priceTrend.toLowerCase()} price trend</span>
          </div>
          <div className="flex items-center gap-2">
            <TrendIcon trend={data.sentiment} />
            <span className="text-sm font-medium capitalize">{data.sentiment.toLowerCase()} sentiment (RSI {sm.rsi})</span>
          </div>
        </Card>

        <Card className="p-4 space-y-2">
          <span className="text-xs text-muted-foreground uppercase tracking-wide">Price Breakdown</span>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Current</span>
              <span className="font-mono">${data.currentPriceUsd.toFixed(4)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Predicted (5m)</span>
              <span className="font-mono">${data.predictedPriceUsd.toFixed(4)}</span>
            </div>
            <div className="flex justify-between text-green-500">
              <span>Utility-backed</span>
              <span className="font-mono">${data.utilityBackedPriceUsd.toFixed(4)}</span>
            </div>
            <div className="flex justify-between text-yellow-500">
              <span>Speculative premium</span>
              <span className="font-mono">+${data.speculativePremiumUsd.toFixed(4)}</span>
            </div>
          </div>
        </Card>
      </div>

      {/* ── Utility Index components ── */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-blue-400" />
            <span className="text-sm font-medium">Utility Value Index Components</span>
          </div>
          <div className="flex items-center gap-1.5">
            <TrendIcon trend={ui.trend} />
            <span className="text-xs text-muted-foreground">{ui.trend}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Transaction Volume",  value: ui.components.txVolumeScore,   color: "bg-blue-500",    hint: `${ui.live.avgTxPerLedger} tx/ledger` },
            { label: "Fee Burn Rate",        value: ui.components.feeBurnScore,    color: "bg-orange-500",  hint: `${ui.live.avgBaseFee} stroops avg` },
            { label: "Ledger Advancement",   value: ui.components.ledgerRateScore, color: "bg-violet-500",  hint: `seq #${ui.live.ledgerSeq.toLocaleString()}` },
            { label: "Holder Retention",     value: ui.components.retentionScore,  color: "bg-emerald-500", hint: `RSI-derived signal` },
          ].map(({ label, value, color, hint }) => (
            <div key={label} className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-mono font-medium">{value.toFixed(1)}</span>
              </div>
              <ScoreBar value={value} color={color} />
              <span className="text-[10px] text-muted-foreground/70">{hint}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between text-xs pt-1 border-t border-border">
          <span className="text-muted-foreground">
            Utility ratio: <span className="text-green-400 font-mono">{(ui.utilityRatio * 100).toFixed(1)}%</span>
            {" "}vs Speculative: <span className="text-yellow-400 font-mono">{(ui.speculativeRatio * 100).toFixed(1)}%</span>
          </span>
          <span className="text-muted-foreground">{ui.basedOnPoints} data points</span>
        </div>
      </Card>

      {/* ── ML signals summary ── */}
      <div className="grid grid-cols-3 gap-3 text-xs">
        <Card className="p-3 flex items-center gap-2">
          <Zap className="h-3.5 w-3.5 text-amber-400 shrink-0" />
          <div>
            <p className="text-muted-foreground">Pi Price (live)</p>
            <p className="font-mono font-semibold">${ui.live.piPriceUsd}</p>
          </div>
        </Card>
        <Card className="p-3 flex items-center gap-2">
          <TrendingUp className="h-3.5 w-3.5 text-blue-400 shrink-0" />
          <div>
            <p className="text-muted-foreground">Δ 5m (Ridge)</p>
            <p className={`font-mono font-semibold ${pr.deltaPct >= 0 ? "text-green-400" : "text-red-400"}`}>
              {pr.deltaPct >= 0 ? "+" : ""}{pr.deltaPct.toFixed(2)}%
            </p>
          </div>
        </Card>
        <Card className="p-3 flex items-center gap-2">
          <Shield className="h-3.5 w-3.5 text-violet-400 shrink-0" />
          <div>
            <p className="text-muted-foreground">Sustained?</p>
            <p className={`font-semibold ${ui.sustained ? "text-green-400" : "text-yellow-400"}`}>
              {ui.sustained ? "Yes" : "Building"}
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}

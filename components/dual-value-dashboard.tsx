"use client";

import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Coins,
  Globe,
  Minus,
  RefreshCw,
  Shield,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

// ─── Types ────────────────────────────────────────────────────────────────────

type ValueComponent = {
  base_floor: number;
  utility_premium: number;
  maturity_bonus: number;
  activity_bonus: number;
  protocol_bonus: number;
  kyc_multiplier: number;
  tenure_bonus: number;
  internal_value_usd: number;
};

type InternalValue = {
  value_type: "INTERNAL";
  description: string;
  value_usd: number;
  components: ValueComponent;
  utility_index: number;
  network: string;
  ledger_seq: number;
  protocol_version: number;
  definition: string;
};

type ExternalValue = {
  value_type: "EXTERNAL";
  description: string;
  value_usd: number;
  ml_ridge_price: number;
  market_data_price: number | null;
  network: string;
  definition: string;
};

type Spread = {
  spread_ratio: number;
  spread_label: string;
  arbitrage_signal: string;
  premium_usd: number;
  premium_pct: number;
  internal_value_usd: number;
  external_value_usd: number;
  interpretation: string;
};

type Report = {
  title: string;
  network: string;
  ledger_seq: number;
  internal: {
    value_usd: number;
    label: string;
    description: string;
    components: ValueComponent;
  };
  external: {
    value_usd: number;
    label: string;
    description: string;
    ml_price: number;
    market_price: number | null;
  };
  spread: {
    ratio: number;
    label: string;
    signal: string;
    premium_usd: number;
    premium_pct: number;
    internal_value_usd: number;
    external_value_usd: number;
  };
  thesis: string;
  generated_at: number;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(value: number, decimals = 4) {
  return value.toLocaleString("en-US", {
    style:           "currency",
    currency:        "USD",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function signalColor(signal: string) {
  switch (signal) {
    case "STRONG_BUY":
    case "ACCUMULATE":
      return "bg-green-500/15 text-green-600 border-green-500/30";
    case "BUY":
      return "bg-emerald-500/15 text-emerald-600 border-emerald-500/30";
    case "HOLD":
      return "bg-blue-500/15 text-blue-600 border-blue-500/30";
    case "HOLD_SELL":
    case "SELL":
      return "bg-yellow-500/15 text-yellow-700 border-yellow-500/30";
    case "STRONG_SELL":
      return "bg-red-500/15 text-red-600 border-red-500/30";
    default:
      return "bg-muted text-muted-foreground border-border";
  }
}

function labelColor(label: string) {
  switch (label) {
    case "EXTREME_DISCOUNT":
    case "MARKET_DISCOUNT":
      return "text-green-600";
    case "SLIGHT_DISCOUNT":
      return "text-emerald-600";
    case "EQUILIBRIUM":
      return "text-blue-600";
    case "SLIGHT_PREMIUM":
      return "text-yellow-600";
    case "MARKET_PREMIUM":
      return "text-orange-600";
    case "EXTREME_PREMIUM":
      return "text-red-600";
    default:
      return "text-muted-foreground";
  }
}

function SpreadGauge({ ratio }: { ratio: number }) {
  // Maps spread ratio to a 0-100 scale for the gauge
  // 0 = extreme discount (0.2 ratio), 50 = equilibrium (1.0), 100 = extreme premium (2.0)
  const clamped = Math.min(Math.max(ratio, 0.2), 2.0);
  const pct     = ((clamped - 0.2) / (2.0 - 0.2)) * 100;
  const isOver  = ratio > 1.02;
  const isUnder = ratio < 0.98;

  const barColor = isOver
    ? pct > 75 ? "bg-red-500" : "bg-orange-400"
    : isUnder
    ? pct < 25 ? "bg-green-500" : "bg-emerald-400"
    : "bg-blue-500";

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>DISCOUNT</span>
        <span>EQUILIBRIUM</span>
        <span>PREMIUM</span>
      </div>
      <div className="relative w-full h-3 bg-muted rounded-full overflow-hidden">
        {/* Equilibrium marker */}
        <div className="absolute left-1/2 top-0 h-full w-px bg-border z-10" />
        <div
          className={`h-full rounded-full transition-all duration-700 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>0.2×</span>
        <span className="font-semibold">{ratio.toFixed(3)}×</span>
        <span>2.0×</span>
      </div>
    </div>
  );
}

function ComponentRow({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="flex justify-between items-center text-xs py-0.5">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono font-medium">
        {typeof value === "number" ? (value >= 0.0001 ? fmt(value, 4) : value.toFixed(6)) : value}
      </span>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function DualValueDashboard() {
  const [report, setReport]   = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchReport = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res  = await fetch("/api/dual-value?action=report");
      const json = await res.json();
      if (!json.ok) throw new Error(json.error ?? "Failed to load report");
      setReport(json.data as Report);
      setLastUpdated(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReport();
    const id = setInterval(fetchReport, 15_000);
    return () => clearInterval(id);
  }, [fetchReport]);

  if (loading && !report) {
    return (
      <Card className="p-6 flex items-center gap-3 text-muted-foreground">
        <RefreshCw className="h-4 w-4 animate-spin" />
        <span className="text-sm">Loading Pi Dual-Value Analysis…</span>
      </Card>
    );
  }

  if (error && !report) {
    return (
      <Card className="p-6 border-destructive/30">
        <p className="text-sm text-destructive font-medium">Dual-Value Engine Offline</p>
        <p className="text-xs text-muted-foreground mt-1">{error}</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={fetchReport}>
          Retry
        </Button>
      </Card>
    );
  }

  if (!report) return null;

  const { internal, external, spread } = report;
  const isDiscount = spread.ratio < 0.98;
  const isPremium  = spread.ratio > 1.02;
  const spreadAbs  = Math.abs(spread.premium_pct);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-base">Pi Dual-Value Analysis</h2>
          <Badge variant="outline" className="text-xs font-normal">
            {report.network?.includes("Pi") ? "Pi Testnet" : (report.network ?? "Pi Network")}
          </Badge>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {lastUpdated && (
            <span>Updated {lastUpdated.toLocaleTimeString()}</span>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={fetchReport}
            disabled={loading}
          >
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Signal Banner */}
      <Card className={`p-4 border ${signalColor(spread.signal).replace("bg-", "border-").replace("/15", "/30")}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isDiscount ? (
              <TrendingDown className="h-5 w-5 text-green-500" />
            ) : isPremium ? (
              <TrendingUp className="h-5 w-5 text-orange-500" />
            ) : (
              <Minus className="h-5 w-5 text-blue-500" />
            )}
            <div>
              <p className="font-semibold text-sm">
                {spread.signal.replace(/_/g, " ")}
              </p>
              <p className={`text-xs font-medium ${labelColor(spread.label)}`}>
                {spread.label.replace(/_/g, " ")}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold font-mono">
              {spread.ratio.toFixed(3)}×
            </p>
            <p className="text-xs text-muted-foreground">
              {spread.premium_pct > 0 ? "+" : ""}
              {spread.premium_pct.toFixed(1)}% spread
            </p>
          </div>
        </div>
      </Card>

      {/* Dual Value Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Internal Value */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-purple-500/10">
              <Shield className="h-4 w-4 text-purple-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-purple-600 uppercase tracking-wider">
                Internal Value
              </p>
              <p className="text-xs text-muted-foreground">Sovereign · Mined · Utility-Backed</p>
            </div>
          </div>

          <div className="text-center py-2">
            <p className="text-3xl font-bold font-mono text-purple-600">
              {fmt(internal.value_usd, 4)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">per 1 Pi</p>
          </div>

          <div className="space-y-0.5 border rounded-lg p-2.5 bg-muted/30">
            <p className="text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">
              Components
            </p>
            <ComponentRow label="Base Floor"       value={internal.components.base_floor} />
            <ComponentRow label="Utility Premium"  value={internal.components.utility_premium} />
            <ComponentRow label="Maturity Bonus"   value={internal.components.maturity_bonus} />
            <ComponentRow label="Activity Bonus"   value={internal.components.activity_bonus} />
            <ComponentRow label="Protocol Bonus"   value={internal.components.protocol_bonus} />
            <ComponentRow label="KYC Multiplier"   value={`${internal.components.kyc_multiplier}×`} />
            <ComponentRow label="Tenure Bonus"     value={internal.components.tenure_bonus} />
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            {internal.description}
          </p>
        </Card>

        {/* External Value */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-500/10">
              <Globe className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-blue-600 uppercase tracking-wider">
                External Value
              </p>
              <p className="text-xs text-muted-foreground">Market · Traded · Physical-World</p>
            </div>
          </div>

          <div className="text-center py-2">
            <p className="text-3xl font-bold font-mono text-blue-600">
              {fmt(external.value_usd, 4)}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">per 1 Pi</p>
          </div>

          <div className="space-y-0.5 border rounded-lg p-2.5 bg-muted/30">
            <p className="text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">
              Price Sources
            </p>
            <ComponentRow label="ML Ridge Model"   value={fmt(external.ml_price ?? 0, 4)} />
            <ComponentRow
              label="Market Data Feed"
              value={external.market_price != null ? fmt(external.market_price, 4) : "—"}
            />
            <div className="flex justify-between items-center text-xs py-0.5">
              <span className="text-muted-foreground">Consensus Price</span>
              <span className="font-mono font-semibold text-blue-600">
                {fmt(external.value_usd, 4)}
              </span>
            </div>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            {external.description}
          </p>
        </Card>
      </div>

      {/* Spread Visualization */}
      <Card className="p-4 space-y-4">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm">Value Spread Gauge</h3>
          <Badge
            variant="outline"
            className={`text-xs ml-auto ${signalColor(spread.signal)}`}
          >
            {spread.signal.replace(/_/g, " ")}
          </Badge>
        </div>

        <SpreadGauge ratio={spread.ratio} />

        <div className="grid grid-cols-3 gap-3 text-center text-xs border rounded-lg p-3 bg-muted/20">
          <div>
            <p className="text-muted-foreground">Internal</p>
            <p className="font-mono font-semibold text-purple-600">
              {fmt(spread.internal_value_usd, 2)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Premium / Discount</p>
            <p className={`font-mono font-semibold ${spread.premium_usd >= 0 ? "text-orange-500" : "text-green-500"}`}>
              {spread.premium_usd >= 0 ? "+" : ""}
              {fmt(spread.premium_usd, 2)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">External</p>
            <p className="font-mono font-semibold text-blue-600">
              {fmt(spread.external_value_usd, 2)}
            </p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground italic">
          {isDiscount ? (
            <>
              <ArrowDownRight className="inline h-3 w-3 text-green-500 mr-1" />
              Market prices Pi <strong>{spreadAbs.toFixed(1)}% below</strong> its intrinsic utility
              value — a potential accumulation opportunity.
            </>
          ) : isPremium ? (
            <>
              <ArrowUpRight className="inline h-3 w-3 text-orange-500 mr-1" />
              Market prices Pi <strong>{spreadAbs.toFixed(1)}% above</strong> its intrinsic utility
              value — market optimism driving the premium.
            </>
          ) : (
            <>
              <Minus className="inline h-3 w-3 text-blue-500 mr-1" />
              Pi is trading near its intrinsic utility value — equilibrium condition.
            </>
          )}
        </p>
      </Card>

      {/* Pi Thesis */}
      <Card className="p-4 space-y-2 bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
        <div className="flex items-center gap-2">
          <Coins className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm">Pi Dual-Value Thesis</h3>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">{report.thesis}</p>
        <div className="flex items-center gap-2 pt-1">
          <Zap className="h-3 w-3 text-yellow-500" />
          <p className="text-xs text-muted-foreground">
            Ledger {report.ledger_seq?.toLocaleString() ?? "—"} ·{" "}
            {report.network?.includes("Pi")
              ? "Pi Network Testnet v2"
              : (report.network ?? "Pi Network")}
          </p>
        </div>
      </Card>
    </div>
  );
}

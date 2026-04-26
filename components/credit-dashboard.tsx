"use client";

import {
  BadgeCheck,
  BarChart3,
  Brain,
  Building2,
  CheckCircle2,
  CreditCard,
  Globe,
  Loader2,
  Lock,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  XCircle,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

// ─── Types ────────────────────────────────────────────────────────────────────

type QuantumAttestation = {
  pq_signed: boolean;
  algorithm: string;
  nist_standard: string;
  crypto_mode: string;
  signature: string | null;
  signature_fingerprint: string | null;
  public_key: string | null;
  signature_bytes: number | null;
  payload_hash_sha3_512: string;
  payload_hash_shake256: string;
  signed_at: number;
  sovereign_authority: string;
  degraded_reason?: string;
};

type HashChain = {
  shake256: string;
  sha3_512: string;
  chain_link: string;
  algorithm: string;
  nist_fips: string;
  chained_at: string;
};

type SovereignCertificate = {
  certRef: string;
  issued: string;
  issuer: string;
  subject: string;
  score: number;
  tier: string;
  nist_pqc: string[];
  governance: string;
  hashChainRef: string;
  declaration: string;
};

type Bureau = {
  name: string;
  model: string;
  standard: string;
  score: number;
  scoreRange: string;
  reportDate: string;
  factors: { positive: string[]; negative: string[] };
  sandboxMode?: boolean;
};

type CreditReport = {
  piAddress: string;
  piCreditScore: number;
  compositeScore: number;
  tier: string;
  riskRating: string;
  creditCapacityPi: number;
  bureauReports: Record<string, Bureau>;
  bureauCount: number;
  scoreComponents: Record<string, number>;
  piLedger: number;
  piPriceUsd: number;
  piInternalUsd?: number;
  reportDate: string;
  piThesis: string;
  quantumAttestation?: QuantumAttestation;
  hashChain?: HashChain;
  sovereignCertificate?: SovereignCertificate;
};

type CreditScore = {
  piCreditScore: number;
  tier: string;
  riskRating: string;
  creditCapacityPi: number;
  scoreComponents: Record<string, number>;
  mlFraudScore?: number;
  mlUtilityScore?: number;
  piThesis: string;
  scoredAt: string;
  quantumAttestation?: QuantumAttestation;
  sovereignCertificate?: SovereignCertificate;
};

type SovereignScore = CreditScore & {
  piInternalRate: number;
  piExternalRate: number;
  piRateMultiplier: number;
  creditCapacitySovereignUsd: number;
  creditCapacityMarketUsd: number;
  hashChain: HashChain;
  quantumReadiness: {
    dilithium5: boolean;
    kyber1024: boolean;
    shake256: boolean;
    sha3_512: boolean;
    nist_standards: string[];
    supremacy: string;
  };
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreColor(score: number) {
  if (score >= 800) return "text-emerald-400";
  if (score >= 740) return "text-green-400";
  if (score >= 670) return "text-lime-400";
  if (score >= 580) return "text-yellow-400";
  return "text-red-400";
}

function scoreBg(score: number) {
  if (score >= 800) return "bg-emerald-500/15 border-emerald-500/30";
  if (score >= 740) return "bg-green-500/15 border-green-500/30";
  if (score >= 670) return "bg-lime-500/15 border-lime-500/30";
  if (score >= 580) return "bg-yellow-500/15 border-yellow-500/30";
  return "bg-red-500/15 border-red-500/30";
}

function tierLabel(t: string) { return t.replace(/_/g, " "); }

function riskColor(r: string) {
  switch (r) {
    case "VERY_LOW": return "text-emerald-400";
    case "LOW":      return "text-green-400";
    case "MEDIUM":   return "text-yellow-400";
    case "HIGH":     return "text-orange-400";
    default:         return "text-red-400";
  }
}

function fmt(n: number) {
  return n.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

// ─── Quantum Badge ────────────────────────────────────────────────────────────

function QuantumBadge({ attest }: { attest: QuantumAttestation }) {
  if (attest.pq_signed) {
    return (
      <div className="flex items-center gap-1.5 rounded-full px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-semibold">
        <ShieldCheck className="h-3 w-3" />
        <span>ML-DSA-87 Signed</span>
        {attest.signature_fingerprint && (
          <span className="font-mono text-emerald-300/70">{attest.signature_fingerprint}</span>
        )}
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5 rounded-full px-2.5 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-semibold">
      <ShieldAlert className="h-3 w-3" />
      <span>Hash-Chain Only</span>
      <span className="text-amber-300/60">(quantum-shield warming up)</span>
    </div>
  );
}

// ─── Sovereign Certificate Card ───────────────────────────────────────────────

function SovereignCertCard({ cert, chain }: { cert: SovereignCertificate; chain?: HashChain }) {
  return (
    <Card className="p-4 bg-violet-500/5 border-violet-500/25 space-y-3">
      <div className="flex items-center gap-2">
        <Lock className="h-4 w-4 text-violet-400" />
        <span className="text-sm font-semibold text-violet-300">Sovereign Credit Certificate</span>
        <Badge className="text-[9px] bg-violet-500/20 text-violet-300 border-violet-500/30 border ml-auto">
          {cert.governance}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <div>
          <p className="text-muted-foreground">Cert Reference</p>
          <p className="font-mono text-violet-300 text-[10px]">{cert.certRef}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Issuer</p>
          <p className="font-semibold text-[10px] leading-tight">{cert.issuer}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Score Attested</p>
          <p className={`font-bold font-mono ${scoreColor(cert.score)}`}>{cert.score} / 850</p>
        </div>
        <div>
          <p className="text-muted-foreground">Tier</p>
          <p className="font-semibold">{tierLabel(cert.tier)}</p>
        </div>
      </div>

      <div className="space-y-1.5">
        <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">NIST PQC Standards</p>
        <div className="flex flex-wrap gap-1">
          {cert.nist_pqc.map(s => (
            <Badge key={s} variant="outline" className="text-[9px] text-violet-300 border-violet-500/30">
              {s}
            </Badge>
          ))}
        </div>
      </div>

      {chain && (
        <div className="space-y-1">
          <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">Hash Chain ({chain.nist_fips})</p>
          <div className="grid grid-cols-1 gap-1 text-[10px]">
            <div className="flex gap-2">
              <span className="text-muted-foreground w-20 shrink-0">SHAKE-256</span>
              <span className="font-mono text-cyan-400/80 truncate">{chain.shake256.slice(0, 32)}…</span>
            </div>
            <div className="flex gap-2">
              <span className="text-muted-foreground w-20 shrink-0">SHA3-512</span>
              <span className="font-mono text-blue-400/80 truncate">{chain.sha3_512.slice(0, 32)}…</span>
            </div>
            <div className="flex gap-2">
              <span className="text-muted-foreground w-20 shrink-0">Chain Link</span>
              <span className="font-mono text-violet-400 truncate">{chain.chain_link}</span>
            </div>
          </div>
        </div>
      )}

      <p className="text-[10px] text-muted-foreground italic leading-relaxed">
        {cert.declaration.slice(0, 200)}…
      </p>
    </Card>
  );
}

// ─── Score Arc ────────────────────────────────────────────────────────────────

function ScoreArc({ score }: { score: number }) {
  const pct  = (score - 300) / 550;
  const size = 180;
  const r    = 75;
  const cx   = size / 2;
  const cy   = size / 2 + 10;
  const startA = (195 * Math.PI) / 180;
  const endA   = startA + pct * (210 * Math.PI) / 180;
  const sx = cx + r * Math.cos(startA);
  const sy = cy + r * Math.sin(startA);
  const ex = cx + r * Math.cos(endA);
  const ey = cy + r * Math.sin(endA);
  const large  = pct > 0.5 ? 1 : 0;
  const fullEx = cx + r * Math.cos(startA + (210 * Math.PI) / 180);
  const fullEy = cy + r * Math.sin(startA + (210 * Math.PI) / 180);
  const color  =
    score >= 800 ? "#10b981" : score >= 740 ? "#22c55e" :
    score >= 670 ? "#84cc16" : score >= 580 ? "#eab308" : "#ef4444";
  return (
    <svg width={size} height={size - 20} viewBox={`0 0 ${size} ${size - 20}`}>
      <path d={`M ${sx} ${sy} A ${r} ${r} 0 1 1 ${fullEx} ${fullEy}`}
        fill="none" stroke="#27272a" strokeWidth={12} strokeLinecap="round" />
      {pct > 0 && (
        <path d={`M ${sx} ${sy} A ${r} ${r} 0 ${large} 1 ${ex} ${ey}`}
          fill="none" stroke={color} strokeWidth={12} strokeLinecap="round"
          style={{ transition: "all 0.8s ease" }} />
      )}
      <text x={cx} y={cy - 8}  textAnchor="middle" fontSize="32" fontWeight="800" fill={color}>{score}</text>
      <text x={cx} y={cy + 18} textAnchor="middle" fontSize="11" fill="#71717a">PiCredit Score&#x2122;</text>
      <text x={cx} y={cy + 34} textAnchor="middle" fontSize="10" fill="#52525b">300  ·  850</text>
    </svg>
  );
}

// ─── Component Bar ────────────────────────────────────────────────────────────

function ComponentBar({ label, value, max }: { label: string; value: number; max: number }) {
  const absVal = Math.abs(value);
  const pct    = Math.min(100, (absVal / max) * 100);
  const isNeg  = value < 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className={`font-mono ${isNeg ? "text-red-400" : "text-muted-foreground"}`}>
          {isNeg ? "-" : "+"}{absVal.toFixed(0)} pts
        </span>
      </div>
      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${isNeg ? "bg-red-500" : "bg-blue-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Bureau Colors ────────────────────────────────────────────────────────────

const BUREAU_COLORS: Record<string, string> = {
  equifax:      "bg-red-500/15 text-red-400 border-red-500/30",
  experian:     "bg-blue-500/15 text-blue-400 border-blue-500/30",
  transunion:   "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  fico:         "bg-violet-500/15 text-violet-400 border-violet-500/30",
  vantagescore: "bg-orange-500/15 text-orange-400 border-orange-500/30",
};

// ─── Dashboard ────────────────────────────────────────────────────────────────

export function CreditDashboard() {
  const [address,        setAddress]        = useState("GA6Z5STFJZPBDQT5VZSDUTCKLXXB626ONTLRWBJAWYKLH4LKPIZCGL7V");
  const [report,         setReport]         = useState<CreditReport | null>(null);
  const [hqScore,        setHqScore]        = useState<CreditScore  | null>(null);
  const [sovereignScore, setSovereignScore] = useState<SovereignScore | null>(null);
  const [loading,        setLoading]        = useState(false);
  const [hqLoading,      setHqLoading]      = useState(true);
  const [error,          setError]          = useState<string | null>(null);

  // Load HQ sovereign score on mount
  const loadHQ = useCallback(async () => {
    setHqLoading(true);
    try {
      const [hqRes, sovRes] = await Promise.allSettled([
        fetch("/services/credit/api/credit/hq-deed-score"),
        fetch("/services/credit/api/credit/sovereign-score/GA6Z5STFJZPBDQT5VZSDUTCKLXXB626ONTLRWBJAWYKLH4LKPIZCGL7V"),
      ]);
      if (hqRes.status === "fulfilled" && hqRes.value.ok) setHqScore(await hqRes.value.json());
      if (sovRes.status === "fulfilled" && sovRes.value.ok) setSovereignScore(await sovRes.value.json());
    } catch { /* silent */ }
    setHqLoading(false);
  }, []);

  useEffect(() => { loadHQ(); }, [loadHQ]);

  const fetchReport = useCallback(async (addr: string) => {
    if (!addr.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/services/credit/api/credit/report/${encodeURIComponent(addr.trim())}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setReport(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Credit engine unreachable");
    } finally { setLoading(false); }
  }, []);

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <CreditCard className="h-5 w-5 text-blue-400 shrink-0" />
        <h2 className="font-semibold text-base">PiCredit Score&#x2122; — Sovereign Quantum System</h2>
        <Badge variant="outline" className="text-[10px]">
          Equifax · Experian · TransUnion · FICO · VantageScore
        </Badge>
        <Badge className="text-[10px] bg-emerald-500/15 border-emerald-500/30 text-emerald-400 border ml-auto">
          <Sparkles className="h-3 w-3 mr-1" />
          ML-DSA-87 · Kyber-1024 · FIPS-204/202
        </Badge>
      </div>

      {/* Quantum Supremacy Banner */}
      <Card className="px-4 py-3 bg-violet-500/5 border-violet-500/20 flex items-center gap-3">
        <ShieldCheck className="h-4 w-4 text-violet-400 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-violet-300">Maximum Quantum Supremacy Active</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Every credit score is attested with CRYSTALS-Dilithium-5 (NIST FIPS-204 ML-DSA-87)
            and hash-chained with SHAKE-256 + SHA3-512 (NIST FIPS-202) —
            quantum-resistant integrity for the digital-physical financial bridge.
          </p>
        </div>
      </Card>

      {/* Pi Dual-Value Banner */}
      <Card className="px-4 py-3 bg-blue-500/5 border-blue-500/20">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="h-4 w-4 text-blue-400" />
          <span className="text-sm font-semibold">Pi Dual-Value Credit Denominator</span>
        </div>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="rounded bg-background/50 p-2">
            <p className="text-muted-foreground">Sovereign Rate (Internal)</p>
            <p className="font-mono font-bold text-blue-300">$314,159 / Pi</p>
            <p className="text-muted-foreground text-[10px]">Mined Pi · 1000× multiplier</p>
          </div>
          <div className="rounded bg-background/50 p-2">
            <p className="text-muted-foreground">Market Rate (External)</p>
            <p className="font-mono font-bold text-cyan-300">$314.159 / Pi</p>
            <p className="text-muted-foreground text-[10px]">Traded Pi · exchange rate</p>
          </div>
        </div>
      </Card>

      {/* HQ Score Card */}
      {hqLoading ? (
        <Card className="p-6 flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading Triumph Synergy HQ Sovereign Credit Score…
        </Card>
      ) : hqScore ? (
        <Card className={`p-5 border ${scoreBg(hqScore.piCreditScore)}`}>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Building2 className="h-4 w-4 text-violet-400" />
                <span className="text-sm font-semibold">Triumph Synergy HQ</span>
                <Badge className="text-[10px] bg-violet-500/20 text-violet-300 border-violet-500/30 border">
                  Genesis Entity
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">triumph-synergy.pi · Allodial Deed Holder</p>
              {hqScore.quantumAttestation && (
                <div className="mt-1.5">
                  <QuantumBadge attest={hqScore.quantumAttestation} />
                </div>
              )}
            </div>
            <div className="text-right shrink-0">
              <div className={`text-4xl font-black ${scoreColor(hqScore.piCreditScore)}`}>
                {hqScore.piCreditScore}
              </div>
              <div className="text-xs text-muted-foreground">{tierLabel(hqScore.tier)}</div>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
            <div className="rounded bg-background/50 p-2">
              <p className="text-muted-foreground">Risk</p>
              <p className={`font-semibold ${riskColor(hqScore.riskRating)}`}>
                {hqScore.riskRating.replace(/_/g, " ")}
              </p>
            </div>
            <div className="rounded bg-background/50 p-2">
              <p className="text-muted-foreground">Credit Capacity</p>
              <p className="font-semibold font-mono">{hqScore.creditCapacityPi.toLocaleString()} Pi</p>
            </div>
            <div className="rounded bg-background/50 p-2">
              <p className="text-muted-foreground">Utility Score</p>
              <p className="font-semibold text-blue-400">{(hqScore.mlUtilityScore ?? 80)}/100</p>
            </div>
          </div>

          {/* Sovereign Pi Values */}
          {sovereignScore && (
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded bg-violet-500/10 p-2 border border-violet-500/20">
                <p className="text-muted-foreground">Sovereign Capacity (Internal)</p>
                <p className="font-mono font-bold text-violet-300">
                  ${fmt(sovereignScore.creditCapacitySovereignUsd)}
                </p>
              </div>
              <div className="rounded bg-blue-500/10 p-2 border border-blue-500/20">
                <p className="text-muted-foreground">Market Capacity (External)</p>
                <p className="font-mono font-bold text-blue-300">
                  ${fmt(sovereignScore.creditCapacityMarketUsd)}
                </p>
              </div>
            </div>
          )}

          {/* Sovereign Certificate */}
          {sovereignScore?.sovereignCertificate && (
            <div className="mt-3">
              <SovereignCertCard
                cert={sovereignScore.sovereignCertificate}
                chain={sovereignScore.hashChain}
              />
            </div>
          )}
        </Card>
      ) : null}

      {/* Lookup */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Sovereign Credit Report Lookup</span>
        </div>
        <div className="flex gap-2">
          <Input
            value={address}
            onChange={e => setAddress(e.target.value)}
            placeholder="Pi Network wallet address (G…)"
            className="font-mono text-xs"
          />
          <Button onClick={() => fetchReport(address)} disabled={loading} size="sm">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BarChart3 className="h-4 w-4" />}
            <span className="ml-1">Score</span>
          </Button>
        </div>
        {error && (
          <p className="text-xs text-red-400 flex items-center gap-1">
            <XCircle className="h-3.5 w-3.5" /> {error}
          </p>
        )}
      </Card>

      {/* Full Report */}
      {report && (
        <div className="space-y-4">

          {/* Score + Summary */}
          <div className="grid grid-cols-2 gap-4">
            <Card className="p-4 flex flex-col items-center">
              <ScoreArc score={report.piCreditScore} />
              <Badge className={`mt-1 border text-xs ${scoreBg(report.piCreditScore)}`}>
                {tierLabel(report.tier)}
              </Badge>
              {report.quantumAttestation && (
                <div className="mt-2">
                  <QuantumBadge attest={report.quantumAttestation} />
                </div>
              )}
            </Card>

            <Card className="p-4 space-y-2.5 text-sm">
              <h3 className="font-semibold flex items-center gap-1.5">
                <Shield className="h-4 w-4 text-blue-400" />
                Summary
              </h3>
              <div className="flex justify-between">
                <span className="text-muted-foreground">PiCredit Score</span>
                <span className={`font-mono font-bold ${scoreColor(report.piCreditScore)}`}>
                  {report.piCreditScore}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Composite (5 bureaus)</span>
                <span className={`font-mono font-bold ${scoreColor(report.compositeScore)}`}>
                  {report.compositeScore}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Risk Rating</span>
                <span className={`font-semibold ${riskColor(report.riskRating)}`}>
                  {report.riskRating.replace(/_/g, " ")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Credit Capacity</span>
                <span className="font-mono">{report.creditCapacityPi.toLocaleString()} Pi</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sovereign Value</span>
                <span className="font-mono text-violet-300">
                  ${fmt(report.creditCapacityPi * 314159)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ledger</span>
                <span className="font-mono text-xs">{report.piLedger.toLocaleString()}</span>
              </div>
            </Card>
          </div>

          {/* Sovereign Certificate */}
          {report.sovereignCertificate && (
            <SovereignCertCard
              cert={report.sovereignCertificate}
              chain={report.hashChain}
            />
          )}

          {/* Quantum Attestation Detail */}
          {report.quantumAttestation && (
            <Card className={`p-4 space-y-3 ${
              report.quantumAttestation.pq_signed
                ? "bg-emerald-500/5 border-emerald-500/20"
                : "bg-amber-500/5 border-amber-500/20"
            }`}>
              <div className="flex items-center gap-2">
                {report.quantumAttestation.pq_signed
                  ? <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  : <ShieldAlert className="h-4 w-4 text-amber-400" />}
                <span className="text-sm font-medium">
                  {report.quantumAttestation.pq_signed
                    ? "Post-Quantum Attestation — Active"
                    : "Post-Quantum Attestation — Degraded (hash-chain active)"}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <p className="text-muted-foreground">Algorithm</p>
                  <p className="font-semibold">{report.quantumAttestation.algorithm}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">NIST Standard</p>
                  <p className="font-semibold">{report.quantumAttestation.nist_standard}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Crypto Mode</p>
                  <p className={`font-semibold text-[10px] ${report.quantumAttestation.pq_signed ? "text-emerald-400" : "text-amber-400"}`}>
                    {report.quantumAttestation.crypto_mode}
                  </p>
                </div>
                {report.quantumAttestation.signature_bytes && (
                  <div>
                    <p className="text-muted-foreground">Signature Size</p>
                    <p className="font-mono">{report.quantumAttestation.signature_bytes} bytes</p>
                  </div>
                )}
              </div>
              <div className="space-y-1 text-[10px]">
                <p className="text-muted-foreground font-semibold uppercase tracking-wide">Payload Hashes</p>
                <div className="flex gap-2">
                  <span className="text-muted-foreground w-20 shrink-0">SHAKE-256</span>
                  <span className="font-mono text-cyan-400/80 truncate">
                    {report.quantumAttestation.payload_hash_shake256.slice(0, 40)}…
                  </span>
                </div>
                <div className="flex gap-2">
                  <span className="text-muted-foreground w-20 shrink-0">SHA3-512</span>
                  <span className="font-mono text-blue-400/80 truncate">
                    {report.quantumAttestation.payload_hash_sha3_512.slice(0, 40)}…
                  </span>
                </div>
              </div>
            </Card>
          )}

          {/* Score Components */}
          <Card className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-violet-400" />
              <span className="text-sm font-medium">Score Components</span>
            </div>
            <div className="space-y-2.5">
              {Object.entries(report.scoreComponents).map(([k, v]) => (
                <ComponentBar key={k}
                  label={k.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase())}
                  value={v}
                  max={300}
                />
              ))}
            </div>
          </Card>

          {/* Bureau Reports */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <BadgeCheck className="h-4 w-4 text-blue-400" />
              <span className="text-sm font-medium">Bureau Reports ({report.bureauCount} Integrated)</span>
            </div>
            {Object.entries(report.bureauReports).map(([key, bureau]) => (
              <Card key={key} className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge className={`text-[10px] border ${BUREAU_COLORS[key] ?? ""}`}>{bureau.name}</Badge>
                    <span className="text-xs text-muted-foreground">{bureau.model}</span>
                    {bureau.sandboxMode && (
                      <Badge variant="outline" className="text-[10px]">Sandbox</Badge>
                    )}
                  </div>
                  <span className={`text-lg font-bold font-mono ${scoreColor(bureau.score)}`}>
                    {bureau.score}
                  </span>
                </div>
                <div className="mt-2 flex gap-4 text-[10px]">
                  <span className="flex items-center gap-1 text-green-400">
                    <CheckCircle2 className="h-3 w-3" />{bureau.factors.positive[0]}
                  </span>
                  <span className="text-muted-foreground">{bureau.standard}</span>
                </div>
              </Card>
            ))}
          </div>

          <Card className="px-4 py-2.5 bg-muted/30 text-xs text-muted-foreground italic">
            {report.piThesis}
          </Card>
        </div>
      )}
    </div>
  );
}

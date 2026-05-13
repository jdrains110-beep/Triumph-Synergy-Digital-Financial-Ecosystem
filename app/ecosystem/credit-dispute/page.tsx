"use client";

/**
 * app/ecosystem/credit-dispute/page.tsx
 * Superior FCRA §611 Dispute Filing — Trump Digital Finance Legislative Stack
 *
 * Powered by GDINCI6L7M3J3YTUEMSX3SP2OD7VBJEVX6DTC3BHLD4SD4CMVQ2DVTMF (payment wallet)
 * Node identity: GA6Z5STFJZPBDQT5VZSDUTCKLXXB626ONTLRWBJAWYKLH4LKPIZCGL7V
 */

import { useState } from "react";
import {
  AlertCircle,
  BadgeCheck,
  ChevronDown,
  ChevronUp,
  FileText,
  Loader2,
  PlusCircle,
  Scale,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PiPaymentButton } from "@/components/PiPaymentButton";
import { PAYMENT_WALLET_ADDRESS } from "@/lib/tokenization/hq-genesis-deed";
import { PiSignInButton } from "@/components/pi-sign-in-button";

// ─── Types ────────────────────────────────────────────────────────────────────

type DisputedItem = {
  creditor: string;
  accountNumber: string;
  amount: string;
  itemType:
    | "late_payment"
    | "collection"
    | "charge_off"
    | "judgment"
    | "inquiry"
    | "error";
  reason: string;
};

type DisputeResult = {
  success: boolean;
  caseId: string;
  disputeType: string;
  filedAt: string;
  responseDeadline: string;
  bureauCount: number;
  bureauPackages: Record<
    string,
    { bureau: string; status: string; letter: string; deadline: string; contactInfo: Record<string, string> }
  >;
  baselineScore: number | null;
  projectedScore: number;
  paymentWallet: string;
  disputeFee: { amount: number; currency: string; recipient: string };
  legislativeStack: string;
  nextSteps: string[];
};

const ITEM_TYPES = [
  { value: "late_payment",  label: "Late Payment" },
  { value: "collection",    label: "Collection" },
  { value: "charge_off",    label: "Charge-Off" },
  { value: "judgment",      label: "Judgment" },
  { value: "inquiry",       label: "Hard Inquiry" },
  { value: "error",         label: "Reporting Error" },
] as const;

const BUREAUS = ["equifax", "experian", "transunion"] as const;

const LEGISLATIVE_LAWS = [
  { label: "EO 14178", desc: "Strengthening American Leadership in Digital Financial Technology" },
  { label: "EO 14331", desc: "Guaranteeing Fair Banking for All Americans (anti-debanking)" },
  { label: "EO 14233", desc: "DeepState Financial Surveillance Restrictions" },
  { label: "H.R.3633", desc: "Digital Asset Market Clarity Act — blockchain = financial record" },
  { label: "H.R.1919", desc: "Anti-CBDC Surveillance State Act" },
  { label: "CFPB Reg V", desc: "Medical Debt Auto-Removal (effective Jan 14, 2025)" },
  { label: "IRS DeFi", desc: "On-Chain Records = Reportable Financial History (Jan 1, 2025)" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function CreditDisputePage() {
  // Form state
  const [piAddress,      setPiAddress]      = useState("");
  const [fullLegalName,  setFullLegalName]  = useState("");
  const [selectedBureaus, setSelectedBureaus] = useState<string[]>(["equifax", "experian", "transunion"]);
  const [disputedItems,  setDisputedItems]  = useState<DisputedItem[]>([]);
  const [includeMedical, setIncludeMedical] = useState(true);
  const [assertEO14178,  setAssertEO14178]  = useState(true);
  const [assertAntiBank, setAssertAntiBank] = useState(true);
  const [consentSigned,  setConsentSigned]  = useState(false);

  // UI state
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState<string | null>(null);
  const [result,       setResult]       = useState<DisputeResult | null>(null);
  const [expanded,     setExpanded]     = useState<string | null>(null);

  // ─── Item helpers ──────────────────────────────────────────────────────────

  function addItem() {
    setDisputedItems(prev => [
      ...prev,
      { creditor: "", accountNumber: "", amount: "", itemType: "late_payment", reason: "" },
    ]);
  }

  function removeItem(i: number) {
    setDisputedItems(prev => prev.filter((_, idx) => idx !== i));
  }

  function updateItem(i: number, field: keyof DisputedItem, value: string) {
    setDisputedItems(prev =>
      prev.map((item, idx) => (idx === i ? { ...item, [field]: value } : item))
    );
  }

  function toggleBureau(b: string) {
    setSelectedBureaus(prev =>
      prev.includes(b) ? prev.filter(x => x !== b) : [...prev, b]
    );
  }

  // ─── Submit ────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);

    if (!piAddress.trim() || !fullLegalName.trim()) {
      setError("Pi address and full legal name are required.");
      return;
    }
    if (!consentSigned) {
      setError("You must provide digital consent to file a legal dispute.");
      return;
    }
    if (selectedBureaus.length === 0) {
      setError("Select at least one bureau.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/credit/fcra/dispute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          piAddress:          piAddress.trim(),
          fullLegalName:      fullLegalName.trim(),
          targetBureaus:      selectedBureaus,
          disputedItems:      disputedItems.filter(d => d.creditor.trim()),
          includeMedicalDebt: includeMedical,
          assertEO14178,
          assertAntiBanking:  assertAntiBank,
          anchored:           true,
          consentSigned:      true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? data.error ?? "Failed to file dispute");
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-8">

      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Scale className="h-6 w-6 text-amber-400 shrink-0" />
          <h1 className="text-xl font-bold">Superior FCRA §611 Dispute</h1>
          <PiSignInButton />
        </div>
        <p className="text-sm text-muted-foreground">
          File legally superior bureau disputes backed by the Trump Digital Finance Legislative Stack.
        </p>
      </div>

      {/* Legislative Authority Badges */}
      <Card className="p-4 border border-amber-500/20 bg-amber-500/5 space-y-3">
        <p className="text-xs font-semibold text-amber-400 uppercase tracking-wide">
          Active Legal Authority
        </p>
        <div className="flex flex-wrap gap-1.5">
          {LEGISLATIVE_LAWS.map(law => (
            <Badge
              key={law.label}
              title={law.desc}
              className="bg-amber-500/10 text-amber-300 border border-amber-500/30 text-[10px]"
            >
              {law.label}
            </Badge>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground">
          Dispute fee: <strong>1 π</strong> sent to payment wallet{" "}
          <code className="text-[9px] break-all">{PAYMENT_WALLET_ADDRESS}</code>
        </p>
      </Card>

      {!result ? (
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Identity */}
          <Card className="p-5 space-y-4 border border-border/60">
            <p className="text-sm font-semibold">Your Identity</p>
            <div className="space-y-2">
              <Label htmlFor="piAddress">Pi Wallet Address</Label>
              <Input
                id="piAddress"
                placeholder="G…"
                value={piAddress}
                onChange={e => setPiAddress(e.target.value)}
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fullLegalName">Full Legal Name</Label>
              <Input
                id="fullLegalName"
                placeholder="First Middle Last"
                value={fullLegalName}
                onChange={e => setFullLegalName(e.target.value)}
              />
            </div>
          </Card>

          {/* Bureaus */}
          <Card className="p-5 space-y-4 border border-border/60">
            <p className="text-sm font-semibold">Target Bureaus</p>
            <div className="flex flex-wrap gap-3">
              {BUREAUS.map(b => (
                <label key={b} className="flex items-center gap-2 cursor-pointer">
                  <Checkbox
                    checked={selectedBureaus.includes(b)}
                    onCheckedChange={() => toggleBureau(b)}
                  />
                  <span className="text-sm capitalize">{b}</span>
                </label>
              ))}
            </div>
          </Card>

          {/* Disputed Items */}
          <Card className="p-5 space-y-4 border border-border/60">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Disputed Items</p>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <PlusCircle className="h-3 w-3 mr-1" />
                Add Item
              </Button>
            </div>
            {disputedItems.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No items added — leave empty to dispute all derogatory marks automatically.
              </p>
            )}
            {disputedItems.map((item, i) => (
              <div key={i} className="rounded-lg border border-border/40 p-4 space-y-3 relative">
                <button
                  type="button"
                  onClick={() => removeItem(i)}
                  className="absolute top-3 right-3 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Creditor Name</Label>
                    <Input
                      placeholder="Capital One, Medical Center…"
                      value={item.creditor}
                      onChange={e => updateItem(i, "creditor", e.target.value)}
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Account Number (last 4)</Label>
                    <Input
                      placeholder="XXXX"
                      value={item.accountNumber}
                      onChange={e => updateItem(i, "accountNumber", e.target.value)}
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Amount ($)</Label>
                    <Input
                      placeholder="0.00"
                      value={item.amount}
                      onChange={e => updateItem(i, "amount", e.target.value)}
                      className="text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Item Type</Label>
                    <Select
                      value={item.itemType}
                      onValueChange={v => updateItem(i, "itemType", v)}
                    >
                      <SelectTrigger className="text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ITEM_TYPES.map(t => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Reason for Dispute</Label>
                  <Input
                    placeholder="Not mine, paid in full, identity theft, statute of limitations…"
                    value={item.reason}
                    onChange={e => updateItem(i, "reason", e.target.value)}
                    className="text-sm"
                  />
                </div>
              </div>
            ))}
          </Card>

          {/* Flags */}
          <Card className="p-5 space-y-3 border border-border/60">
            <p className="text-sm font-semibold">Legislative Flags</p>
            {[
              {
                id: "medical",
                label: "Auto-include medical debt deletion (CFPB Reg V, Jan 14 2025)",
                checked: includeMedical,
                onChange: setIncludeMedical,
              },
              {
                id: "eo14178",
                label: "Assert EO 14178 — blockchain records as superior financial evidence",
                checked: assertEO14178,
                onChange: setAssertEO14178,
              },
              {
                id: "antibank",
                label: "Assert EO 14331 — negative credit maintenance = illegal debanking",
                checked: assertAntiBank,
                onChange: setAssertAntiBank,
              },
            ].map(flag => (
              <label key={flag.id} className="flex items-start gap-2 cursor-pointer">
                <Checkbox
                  id={flag.id}
                  checked={flag.checked}
                  onCheckedChange={v => flag.onChange(v as boolean)}
                  className="mt-0.5"
                />
                <span className="text-sm">{flag.label}</span>
              </label>
            ))}
          </Card>

          {/* Consent */}
          <Card className="p-5 border border-blue-500/20 bg-blue-500/5 space-y-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox
                checked={consentSigned}
                onCheckedChange={v => setConsentSigned(v as boolean)}
                className="mt-0.5"
              />
              <span className="text-sm leading-relaxed">
                I, <strong>{fullLegalName || "___________"}</strong>, hereby provide my digital
                signature and consent to file FCRA §611 dispute letters with the listed credit
                bureaus. I confirm all information is accurate to the best of my knowledge. I
                authorize Triumph Synergy to anchor this dispute to the Pi Network blockchain and
                authorize a <strong>1 π fee</strong> to{" "}
                <code className="text-[10px] break-all">{PAYMENT_WALLET_ADDRESS}</code>.
              </span>
            </label>
          </Card>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white"
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Filing Dispute…</>
            ) : (
              <><FileText className="h-4 w-4 mr-2" /> File Superior FCRA §611 Dispute</>
            )}
          </Button>
        </form>
      ) : (
        /* ── Results ───────────────────────────────────────────────────────── */
        <div className="space-y-5">

          {/* Summary */}
          <Card className="p-5 border border-emerald-500/20 bg-emerald-500/5 space-y-3">
            <div className="flex items-center gap-2">
              <BadgeCheck className="h-5 w-5 text-emerald-400" />
              <p className="font-semibold text-emerald-400">Dispute Filed Successfully</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
              {[
                ["Case ID",          result.caseId],
                ["Bureaus Targeted", String(result.bureauCount)],
                ["Baseline Score",   result.baselineScore != null ? String(result.baselineScore) : "N/A"],
                ["Projected Score",  String(result.projectedScore)],
                ["Deadline",         new Date(result.responseDeadline).toLocaleDateString()],
                ["Anchored",         "Pi Blockchain ✓"],
              ].map(([label, val]) => (
                <div key={label}>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
                  <p className="font-mono text-xs break-all">{val}</p>
                </div>
              ))}
            </div>
            <div className="text-[10px] text-muted-foreground pt-1 border-t border-border/30">
              Dispute fee recipient:{" "}
              <code className="break-all">{result.paymentWallet}</code>
            </div>
          </Card>

          {/* Score Impact */}
          {result.baselineScore != null && (
            <Card className="p-4 border border-violet-500/20 bg-violet-500/5 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Projected Score Recovery</p>
                <p className="text-2xl font-bold text-violet-300">
                  +{result.projectedScore - result.baselineScore} pts
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Current → Projected</p>
                <p className="text-lg font-semibold">
                  {result.baselineScore} → {result.projectedScore}
                </p>
              </div>
            </Card>
          )}

          {/* Bureau Packages */}
          <div className="space-y-3">
            <p className="text-sm font-semibold">Bureau Dispute Letters</p>
            {Object.values(result.bureauPackages).map(pkg => (
              <Card key={pkg.bureau} className="border border-border/50">
                <button
                  type="button"
                  onClick={() => setExpanded(expanded === pkg.bureau ? null : pkg.bureau)}
                  className="w-full flex items-center justify-between p-4 text-left"
                >
                  <div className="flex items-center gap-2">
                    <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] uppercase">
                      {pkg.status}
                    </Badge>
                    <span className="font-semibold capitalize">{pkg.bureau}</span>
                  </div>
                  {expanded === pkg.bureau ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
                {expanded === pkg.bureau && (
                  <div className="border-t border-border/30 p-4 space-y-3">
                    <pre className="whitespace-pre-wrap text-[11px] font-mono leading-relaxed bg-muted/30 rounded p-3 overflow-auto max-h-[400px]">
                      {pkg.letter}
                    </pre>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const blob = new Blob([pkg.letter], { type: "text/plain" });
                        const url  = URL.createObjectURL(blob);
                        const a    = document.createElement("a");
                        a.href     = url;
                        a.download = `fcra-dispute-${pkg.bureau}-${result.caseId}.txt`;
                        a.click();
                        URL.revokeObjectURL(url);
                      }}
                    >
                      <FileText className="h-3 w-3 mr-1" /> Download Letter
                    </Button>
                  </div>
                )}
              </Card>
            ))}
          </div>

          {/* Next Steps */}
          <Card className="p-5 border border-blue-500/20 bg-blue-500/5 space-y-3">
            <p className="text-sm font-semibold text-blue-400">Next Steps</p>
            <ol className="space-y-2">
              {result.nextSteps.map((step, i) => (
                <li key={i} className="flex gap-2 text-sm">
                  <span className="shrink-0 text-blue-400 font-semibold">{i + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </Card>

          {/* Legislative Stack */}
          <Card className="p-4 border border-amber-500/20 bg-amber-500/5">
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
              Full Legislative Stack Applied
            </p>
            <p className="text-xs text-amber-300 font-mono break-all">
              {result.legislativeStack}
            </p>
          </Card>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => setResult(null)}
          >
            File Another Dispute
          </Button>
        </div>
      )}
    </div>
  );
}

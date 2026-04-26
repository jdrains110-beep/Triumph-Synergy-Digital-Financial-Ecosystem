"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import type {
  SovereignListing,
  SovereignPropertyToken,
  PiRETransaction,
  REDAOProposal,
  RentalYieldReport,
  SovereignREStats,
  RELoophole,
} from "@/lib/real-estate/sovereign-re-types";

// ─── Utility ──────────────────────────────────────────────────────────────────

function fmt(n: number, digits = 0) {
  return n.toLocaleString("en-US", { maximumFractionDigits: digits });
}
function fmtPi(pi: string | number) {
  return `π${parseFloat(String(pi)).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}
function fmtUsd(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

const LOOPHOLE_CAT_COLOR: Record<string, string> = {
  "Foreclosure Defense": "bg-red-500/20 text-red-300 border-red-500/30",
  "Title Sovereignty": "bg-purple-500/20 text-purple-300 border-purple-500/30",
  "Zoning & Development": "bg-blue-500/20 text-blue-300 border-blue-500/30",
  "Tax Advantage": "bg-green-500/20 text-green-300 border-green-500/30",
  "Pi Network Utility": "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  "Fractional Finance": "bg-orange-500/20 text-orange-300 border-orange-500/30",
};

const LOOPHOLE_CAT_ICON: Record<string, string> = {
  "Foreclosure Defense": "🛡️",
  "Title Sovereignty": "📜",
  "Zoning & Development": "🏗️",
  "Tax Advantage": "💰",
  "Pi Network Utility": "π",
  "Fractional Finance": "📈",
};

// ─── Tabs ─────────────────────────────────────────────────────────────────────

type Tab = "listings" | "tokenize" | "loopholes" | "fractional" | "dao" | "stats";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "listings", label: "Listings", icon: "🏠" },
  { id: "tokenize", label: "Tokenize", icon: "🔐" },
  { id: "loopholes", label: "Loopholes", icon: "⚖️" },
  { id: "fractional", label: "Fractional", icon: "📊" },
  { id: "dao", label: "DAO", icon: "🗳️" },
  { id: "stats", label: "Platform Stats", icon: "📈" },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function TitleScoreBar({ score }: { score: number }) {
  const color = score >= 80 ? "bg-green-500" : score >= 60 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs text-gray-400 w-8 text-right">{score}</span>
    </div>
  );
}

function LoopholeBadge({ count, valueUsd }: { count: number; valueUsd: number }) {
  if (count === 0) return null;
  return (
    <div className="inline-flex items-center gap-1 rounded-full bg-yellow-500/20 border border-yellow-500/30 px-2 py-0.5 text-xs text-yellow-300">
      ⚖️ {count} loophole{count !== 1 ? "s" : ""} · {fmtUsd(valueUsd)}
    </div>
  );
}

function ForeclosureShield({ shielded }: { shielded: boolean }) {
  if (!shielded) return null;
  return (
    <div className="inline-flex items-center gap-1 rounded-full bg-red-500/20 border border-red-500/30 px-2 py-0.5 text-xs text-red-300">
      🛡️ Foreclosure Shielded
    </div>
  );
}

function ListingCard({
  listing,
  onSelect,
}: {
  listing: SovereignListing;
  onSelect: (l: SovereignListing) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(listing)}
      className="text-left bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl p-5 transition-all group"
    >
      {/* Image placeholder */}
      <div className="h-36 rounded-xl bg-gradient-to-br from-purple-900/60 to-blue-900/60 border border-white/10 mb-4 flex items-center justify-center relative overflow-hidden">
        <span className="text-5xl opacity-30">🏠</span>
        {listing.tokenized && (
          <div className="absolute top-2 right-2 rounded-full bg-yellow-400 text-black text-[9px] font-bold px-2 py-0.5">PI-721</div>
        )}
        {listing.fractionalAvailable && (
          <div className="absolute top-2 left-2 rounded-full bg-blue-400 text-black text-[9px] font-bold px-2 py-0.5">Fractional</div>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-sm text-gray-400 truncate">{listing.address}</p>
        <p className="text-xs text-gray-500">{listing.city}, {listing.state} {listing.zip}</p>

        <div className="flex items-baseline justify-between">
          <span className="text-lg font-bold text-white">{fmtUsd(listing.listPriceUsd)}</span>
          <span className="text-sm text-yellow-400 font-medium">{fmtPi(listing.listPricePi)}</span>
        </div>

        <TitleScoreBar score={listing.titleClearanceScore} />

        <div className="flex flex-wrap gap-1.5 pt-1">
          <LoopholeBadge count={listing.loopholes.length} valueUsd={listing.totalLoopholeValueUsd} />
          <ForeclosureShield shielded={listing.foreclosureShielded} />
          {listing.allodialEligible && (
            <span className="rounded-full bg-purple-500/20 border border-purple-500/30 px-2 py-0.5 text-xs text-purple-300">Allodial Eligible</span>
          )}
        </div>

        <div className="flex gap-3 pt-1 text-xs text-gray-400">
          <span>{listing.bedrooms} bd</span>
          <span>{listing.bathrooms} ba</span>
          <span>{fmt(listing.squareFeet)} sqft</span>
          {listing.acreage && <span>{listing.acreage} ac</span>}
        </div>
      </div>
    </button>
  );
}

function ListingDetail({
  listing,
  onBack,
  onTokenize,
  onPurchase,
}: {
  listing: SovereignListing;
  onBack: () => void;
  onTokenize: () => void;
  onPurchase: () => void;
}) {
  return (
    <div className="space-y-6">
      <button onClick={onBack} className="text-sm text-gray-400 hover:text-white transition-colors">
        ← Back to listings
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main info */}
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold text-white">{listing.address}</h2>
                <p className="text-gray-400">{listing.city}, {listing.state} {listing.zip} · {listing.county} County</p>
                <p className="text-xs text-gray-500 mt-1">Parcel: {listing.parcelId} · Zoning: {listing.zoning}</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-white">{fmtUsd(listing.listPriceUsd)}</div>
                <div className="text-lg text-yellow-400">{fmtPi(listing.listPricePi)}</div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4 mt-6">
              {[
                { label: "Bedrooms", value: listing.bedrooms },
                { label: "Bathrooms", value: listing.bathrooms },
                { label: "Sq Ft", value: fmt(listing.squareFeet) },
                { label: "Year Built", value: listing.yearBuilt },
              ].map(({ label, value }) => (
                <div key={label} className="text-center bg-white/5 rounded-xl p-3">
                  <div className="text-lg font-bold text-white">{value}</div>
                  <div className="text-xs text-gray-400">{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Title clearance */}
          {listing.titleClearance && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">Title Clearance</h3>
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${listing.titleClearance.isClear ? "bg-green-500/20 text-green-300" : "bg-yellow-500/20 text-yellow-300"}`}>
                  Score: {listing.titleClearanceScore}/100
                </div>
              </div>
              <TitleScoreBar score={listing.titleClearanceScore} />
              {listing.titleClearance.issues.length > 0 ? (
                <div className="mt-4 space-y-3">
                  {listing.titleClearance.issues.map(issue => (
                    <div key={issue.issueId} className={`border rounded-xl p-3 ${issue.severity === "CRITICAL" ? "border-red-500/30 bg-red-500/10" : issue.severity === "WARNING" ? "border-yellow-500/30 bg-yellow-500/10" : "border-blue-500/30 bg-blue-500/10"}`}>
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="text-xs font-medium text-gray-300">{issue.type.replace(/_/g, " ")}</span>
                          <p className="text-sm text-gray-400 mt-0.5">{issue.description}</p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${issue.severity === "CRITICAL" ? "bg-red-500 text-white" : issue.severity === "WARNING" ? "bg-yellow-500 text-black" : "bg-blue-500 text-white"}`}>
                          {issue.severity}
                        </span>
                      </div>
                      {issue.estimatedCostUsd > 0 && (
                        <p className="text-xs text-gray-500 mt-1">Estimated cost: {fmtUsd(issue.estimatedCostUsd)} · {fmtPi(issue.estimatedCostPi)}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-green-400 mt-3">✓ Clear title — no encumbrances or defects detected.</p>
              )}
            </div>
          )}

          {/* Loopholes */}
          {listing.loopholes.length > 0 && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">Legal Loopholes Detected</h3>
                <div className="text-sm text-yellow-400 font-medium">{fmtUsd(listing.totalLoopholeValueUsd)} · {fmtPi(listing.totalLoopholeValuePi)}</div>
              </div>
              <div className="space-y-3">
                {listing.loopholes.map(l => (
                  <div key={l.loopholeId} className={`border rounded-xl p-4 ${LOOPHOLE_CAT_COLOR[l.category] ?? "bg-white/5 border-white/10"}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span>{LOOPHOLE_CAT_ICON[l.category] ?? "⚖️"}</span>
                          <span className="font-medium text-sm">{l.title}</span>
                          {l.riskLevel === "HIGH" && <span className="text-xs bg-red-500 text-white rounded-full px-1.5 py-0.5">HIGH</span>}
                        </div>
                        <p className="text-xs text-gray-400 mt-1">{l.description}</p>
                        <p className="text-xs text-gray-500 mt-1 italic">
                          Authority: {l.legalAuthority}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-sm font-bold">{fmtUsd(l.estimatedValueGainUsd)}</div>
                        <div className="text-xs opacity-70">{fmtPi(l.estimatedValueGainPi)}</div>
                      </div>
                    </div>
                    {l.piNetworkIntegration && (
                      <p className="mt-2 text-xs text-yellow-300 bg-yellow-500/10 rounded px-2 py-1">
                        π Pi Hook: {l.piNetworkIntegration}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
            <h3 className="font-bold text-white">Actions</h3>
            {!listing.tokenized ? (
              <button onClick={onTokenize} className="w-full rounded-xl bg-yellow-500 text-black font-bold py-3 hover:bg-yellow-400 transition-colors">
                🔐 Tokenize as PI-721
              </button>
            ) : (
              <div className="text-center py-2 rounded-xl bg-green-500/20 border border-green-500/30 text-green-300 text-sm font-medium">
                ✓ Tokenized: {listing.tokenId?.slice(0, 12)}…
              </div>
            )}
            <button onClick={onPurchase} className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold py-3 hover:brightness-110 transition-all">
              π Buy with Pi
            </button>
            {listing.fractionalAvailable && (
              <button onClick={onPurchase} className="w-full rounded-xl bg-white/10 text-white font-medium py-3 hover:bg-white/20 transition-colors">
                📊 Buy Fractional Share
              </button>
            )}
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-2">
            <h3 className="font-bold text-white text-sm">Property Details</h3>
            {[
              ["Type", listing.propertyType.replace(/-/g, " ")],
              ["Sovereignty", listing.sovereigntyClass.replace(/_/g, " ")],
              ["Price/sqft", fmtUsd(listing.pricePerSqFtUsd)],
              listing.rentalYieldPercent ? ["Yield", `${listing.rentalYieldPercent}%`] : null,
              listing.monthlyRentPi ? ["Monthly Rent", fmtPi(listing.monthlyRentPi)] : null,
              listing.acreage ? ["Acreage", `${listing.acreage} acres`] : null,
            ].filter((x): x is [string, string] => x !== null).map(([k, v]) => (
              <div key={k} className="flex justify-between text-sm">
                <span className="text-gray-400">{k}</span>
                <span className="text-white capitalize">{v}</span>
              </div>
            ))}
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-2">
            <h3 className="font-bold text-white text-sm">Flags</h3>
            {[
              [listing.homesteadEligible, "✅ Homestead Eligible"],
              [listing.allodialEligible, "✅ Allodial Eligible"],
              [listing.foreclosureShielded, "🛡️ Foreclosure Shielded"],
              [listing.fractionalAvailable, "📊 Fractional Available"],
              [listing.tokenized, "🔐 Tokenized (PI-721)"],
            ].map(([flag, label]) => flag ? (
              <div key={label as string} className="text-sm text-gray-300">{label as string}</div>
            ) : null)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Tokenize Tab ─────────────────────────────────────────────────────────────

function TokenizeTab({ listings }: { listings: SovereignListing[] }) {
  const [selectedId, setSelectedId] = useState("");
  const [ownerAddress, setOwnerAddress] = useState("");
  const [ownerUsername, setOwnerUsername] = useState("");
  const [result, setResult] = useState<{ token: SovereignPropertyToken } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const FORTRESS_LAYERS = [
    "SHA-256 Content Hash",
    "Ed25519 Signature",
    "Stellar SCP Anchoring",
    "Multisig Threshold",
    "Time-Lock Enforcement",
    "ZK Proof of Ownership",
    "Merkle Tree Audit",
    "HMAC-512 Chain",
    "Quantum SHA3-512 Shield",
    "Neural Anomaly Detection",
    "Geographic IP Binding",
    "Device Fingerprinting",
    "Biometric Hash",
    "Regulatory Compliance Engine",
    "Anti-Money Laundering Check",
    "Title Sovereignty Seal",
    "Allodial Conversion Receipt",
    "DAO Governance Anchor",
    "Pi Network Broadcast",
    "IPFS Metadata Pin",
    "Stellar Ledger Record",
  ];

  async function handleTokenize() {
    if (!selectedId || !ownerAddress || !ownerUsername) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/real-estate/sovereign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "tokenize", listingId: selectedId, ownerAddress, ownerUsername }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      setResult(data.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Tokenization failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
        <h2 className="text-xl font-bold text-white">Tokenize Property as PI-721 Deed</h2>
        <p className="text-sm text-gray-400">
          Convert any property listing into a sovereign PI-721 NFT deed secured by 21-layer Fortress Protection.
          The deed is anchored on Stellar blockchain and linked to Pi Network for payment utility.
        </p>

        <div>
          <label className="block text-sm text-gray-400 mb-2">Select Property</label>
          <select
            value={selectedId}
            onChange={e => setSelectedId(e.target.value)}
            className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white appearance-none"
          >
            <option value="">— Choose a listing —</option>
            {listings.filter(l => !l.tokenized).map(l => (
              <option key={l.listingId} value={l.listingId}>{l.address}, {l.city}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-2">Owner Pi Address (Stellar)</label>
          <input
            type="text"
            placeholder="G…"
            value={ownerAddress}
            onChange={e => setOwnerAddress(e.target.value)}
            className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-500"
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-2">Owner Pi Username</label>
          <input
            type="text"
            placeholder="your_pi_username"
            value={ownerUsername}
            onChange={e => setOwnerUsername(e.target.value)}
            className="w-full bg-white/5 border border-white/20 rounded-xl px-4 py-3 text-white placeholder-gray-500"
          />
        </div>

        {error && <div className="text-red-400 text-sm bg-red-500/10 rounded-xl p-3">{error}</div>}

        <button
          onClick={handleTokenize}
          disabled={loading || !selectedId || !ownerAddress || !ownerUsername}
          className="w-full rounded-xl bg-yellow-500 text-black font-bold py-3 hover:bg-yellow-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? "Tokenizing…" : "🔐 Tokenize Deed (PI-721)"}
        </button>
      </div>

      {/* 21-layer Fortress display */}
      {result && (
        <div className="bg-white/5 border border-yellow-500/30 rounded-2xl p-6 space-y-4">
          <h3 className="text-lg font-bold text-yellow-400">✓ Tokenization Complete</h3>
          <div className="text-sm text-gray-300">Token ID: <code className="text-yellow-300 text-xs break-all">{result.token.tokenId}</code></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {FORTRESS_LAYERS.map((layer, i) => (
              <div key={layer} className="flex items-center gap-2 text-xs text-green-300 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-1.5">
                <span className="text-green-500">✓</span>
                <span className="text-gray-400 w-4">{i + 1}.</span>
                {layer}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Loopholes Tab ────────────────────────────────────────────────────────────

function LoopholesTab({ listings }: { listings: SovereignListing[] }) {
  const allLoopholes = listings.flatMap(l =>
    l.loopholes.map(lp => ({ ...lp, listing: l }))
  );
  const [filterCat, setFilterCat] = useState<string>("All");

  const categories = ["All", ...Array.from(new Set(allLoopholes.map(l => l.category)))];
  const visible = filterCat === "All" ? allLoopholes : allLoopholes.filter(l => l.category === filterCat);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Legal Loophole Intelligence</h2>
          <p className="text-sm text-gray-400">
            {allLoopholes.length} loopholes detected across {listings.length} properties · 
            Total value: {fmtUsd(listings.reduce((s, l) => s + l.totalLoopholeValueUsd, 0))}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setFilterCat(cat)}
            className={`px-3 py-1.5 rounded-full text-sm transition-colors ${filterCat === cat ? "bg-yellow-500 text-black font-medium" : "bg-white/10 text-gray-300 hover:bg-white/20"}`}
          >
            {cat !== "All" && (LOOPHOLE_CAT_ICON[cat] ?? "⚖️")} {cat}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="text-center py-16 text-gray-500">No loopholes found in this category.</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {visible.map(l => (
            <div key={l.loopholeId} className={`border rounded-2xl p-5 ${LOOPHOLE_CAT_COLOR[l.category] ?? "bg-white/5 border-white/10"}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-base">{LOOPHOLE_CAT_ICON[l.category] ?? "⚖️"}</span>
                    <span className="font-bold text-sm">{l.title}</span>
                    {l.riskLevel === "HIGH" && <span className="text-xs bg-red-500 text-white rounded-full px-2">HIGH</span>}
                    <span className="text-xs opacity-50">{l.category}</span>
                  </div>
                  <p className="text-sm mt-1 opacity-80">{l.description}</p>
                  <p className="text-xs mt-1 opacity-60 italic">📍 {(l as RELoophole & { listing: SovereignListing }).listing.address}</p>
                  <p className="text-xs mt-1 opacity-50">Authority: {l.legalAuthority}</p>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-bold">{fmtUsd(l.estimatedValueGainUsd)}</div>
                  <div className="text-xs opacity-70">{fmtPi(l.estimatedValueGainPi)}</div>
                </div>
              </div>
              {l.actionSteps.length > 0 && (
                <div className="mt-3 space-y-1">
                  <p className="text-xs font-medium opacity-70">Action Steps:</p>
                  {l.actionSteps.slice(0, 3).map((step, i) => (
                    <div key={i} className="text-xs opacity-60 flex items-start gap-1.5">
                      <span className="shrink-0">{i + 1}.</span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              )}
              {l.piNetworkIntegration && (
                <div className="mt-2 text-xs bg-yellow-500/10 rounded-lg px-2 py-1 text-yellow-300 border border-yellow-500/20">
                  π {l.piNetworkIntegration}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Stats Tab ────────────────────────────────────────────────────────────────

function StatsTab({ stats }: { stats: SovereignREStats | null }) {
  if (!stats) return <div className="text-center py-16 text-gray-500">Loading stats…</div>;

  const statCards = [
    { label: "Total Listings", value: fmt(stats.totalListings), icon: "🏠" },
    { label: "Active Listings", value: fmt(stats.activeListings), icon: "✅" },
    { label: "Tokenized Properties", value: fmt(stats.totalTokenizedProperties), icon: "🔐" },
    { label: "Total Value (USD)", value: fmtUsd(stats.totalValueTokenizedUsd), icon: "💵" },
    { label: "Total Value (Pi)", value: fmtPi(stats.totalValueTokenizedPi), icon: "π" },
    { label: "Transaction Volume", value: fmtUsd(stats.totalTransactionVolumeUsd), icon: "📊" },
    { label: "Loopholes Detected", value: fmt(stats.totalLoopholesDetected), icon: "⚖️" },
    { label: "Loophole Value", value: fmtUsd(stats.totalLoopholeValueUsd), icon: "💰" },
    { label: "Fractional Shareholders", value: fmt(stats.totalFractionalShareholders), icon: "👥" },
    { label: "DAO Proposals", value: fmt(stats.totalDAOProposals), icon: "🗳️" },
    { label: "Pi Payments Processed", value: fmt(stats.piPaymentsProcessed), icon: "π" },
    { label: "Avg Title Score", value: `${stats.averageTitleClearanceScore.toFixed(1)}/100`, icon: "📜" },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white">Platform Statistics</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon }) => (
          <div key={label} className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
            <div className="text-2xl mb-1">{icon}</div>
            <div className="text-lg font-bold text-white">{value}</div>
            <div className="text-xs text-gray-400 mt-1">{label}</div>
          </div>
        ))}
      </div>

      <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
        <h3 className="text-base font-bold text-white mb-3">Foreclosure Shield Coverage</h3>
        <div className="flex items-center gap-3">
          <div className="flex-1 h-4 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-red-500 to-orange-400 rounded-full"
              style={{ width: `${stats.averageForeclosureShieldScore}%` }}
            />
          </div>
          <span className="text-white font-bold text-sm">{stats.averageForeclosureShieldScore.toFixed(1)}%</span>
        </div>
        <p className="text-xs text-gray-500 mt-2">Percentage of listed properties with foreclosure shield active</p>
      </div>
    </div>
  );
}

// ─── DAO Tab ──────────────────────────────────────────────────────────────────

function DAOTab() {
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white">DAO Governance</h2>
      <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
        <div className="text-4xl mb-4">🗳️</div>
        <p className="text-gray-400 text-sm">
          DAO governance is active for fractionally-owned properties.<br />
          Tokenize a property with fractional shares to unlock voting on Sell, Refinance, Foreclosure Defense, and Renovation proposals.
        </p>
        <p className="text-xs text-gray-500 mt-4">
          Votes are weighted by Pi share percentage. 51% quorum required for resolution.
        </p>
      </div>
    </div>
  );
}

// ─── Fractional Tab ───────────────────────────────────────────────────────────

function FractionalTab({ listings }: { listings: SovereignListing[] }) {
  const fractional = listings.filter(l => l.fractionalAvailable);
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-white">Fractional Ownership</h2>
      <p className="text-sm text-gray-400">
        Buy PI-1155 fractional shares in real estate with Pi. Earn proportional rental yield distributed automatically.
      </p>
      {fractional.length === 0 ? (
        <div className="text-center py-16 text-gray-500">No fractional listings yet.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {fractional.map(l => (
            <div key={l.listingId} className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
              <div>
                <p className="font-bold text-white text-sm">{l.address}</p>
                <p className="text-xs text-gray-400">{l.city}, {l.state}</p>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Total Value</span>
                <span className="text-white font-medium">{fmtUsd(l.listPriceUsd)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Min Share</span>
                <span className="text-white font-medium">{l.fractionalMinSharePercent}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Min Pi Price</span>
                <span className="text-yellow-400 font-medium">{l.fractionalMinPricePi ? fmtPi(l.fractionalMinPricePi) : "—"}</span>
              </div>
              {l.rentalYieldPercent && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Annual Yield</span>
                  <span className="text-green-400 font-medium">{l.rentalYieldPercent}%</span>
                </div>
              )}
              <button className="w-full rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-bold py-2.5 hover:brightness-110 transition-all">
                π Buy Fractional Share
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SovereignRealEstatePage() {
  const [activeTab, setActiveTab] = useState<Tab>("listings");
  const [listings, setListings] = useState<SovereignListing[]>([]);
  const [stats, setStats] = useState<SovereignREStats | null>(null);
  const [selectedListing, setSelectedListing] = useState<SovereignListing | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      // Seed demo data first, then load listings + stats
      await fetch("/api/real-estate/sovereign?action=seed-demo");
      const [listRes, statsRes] = await Promise.all([
        fetch("/api/real-estate/sovereign?action=listings"),
        fetch("/api/real-estate/sovereign?action=stats"),
      ]);
      const listData = await listRes.json();
      const statsData = await statsRes.json();
      if (listData.success) setListings(listData.data);
      if (statsData.success) setStats(statsData.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  function handleTokenize() {
    if (!selectedListing) return;
    setActiveTab("tokenize");
    setSelectedListing(null);
  }

  function handlePurchase() {
    // Pi SDK payment flow — wire to window.Pi.createPayment in production
    alert("Pi payment flow: integrate window.Pi.createPayment() via Pi SDK 2.0");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-950 via-blue-950 to-indigo-950 text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/30 backdrop-blur-lg sticky top-0 z-20">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/" className="text-gray-400 text-sm hover:text-white transition-colors">← Home</Link>
              <span className="text-white/20">/</span>
              <div className="flex items-center gap-2">
                <span className="text-2xl">🏛️</span>
                <div>
                  <h1 className="text-lg font-bold text-white leading-none">Sovereign Real Estate</h1>
                  <p className="text-xs text-gray-400">Pi Network · Allodial Deeds · Legal Intelligence</p>
                </div>
              </div>
            </div>
            {stats && (
              <div className="hidden sm:flex items-center gap-4 text-xs text-gray-400">
                <span>{stats.totalListings} listings</span>
                <span>{stats.totalTokenizedProperties} tokenized</span>
                <span className="text-yellow-400">{fmtUsd(stats.totalValueTokenizedUsd)} TVL</span>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Platform Intro Banner */}
        <div className="mb-8 bg-gradient-to-r from-yellow-500/10 to-purple-500/10 border border-yellow-500/20 rounded-2xl p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-extrabold text-white">Sovereign Real Estate Platform</h2>
              <p className="text-gray-300 text-sm mt-1 max-w-2xl">
                The world's first Pi-native real estate marketplace. Buy, sell, and tokenize property with Pi payments.
                Every listing auto-scans for legal loopholes, title defects, and Pi token integration opportunities.
                Allodial sovereignty. 21-layer fortress deed protection. DAO governance.
              </p>
            </div>
            <div className="flex flex-col items-center bg-white/5 border border-white/10 rounded-xl px-5 py-3 shrink-0">
              <div className="text-xs text-gray-400">Pi Exchange Rate</div>
              <div className="text-2xl font-bold text-yellow-400">$3.14</div>
              <div className="text-xs text-gray-500">1 Pi = $3.14 USD</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white/5 border border-white/10 rounded-2xl p-1 mb-8 overflow-x-auto">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setSelectedListing(null); }}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? "bg-yellow-500 text-black"
                  : "text-gray-400 hover:text-white hover:bg-white/10"
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {loading ? (
          <div className="text-center py-24">
            <div className="text-4xl animate-spin inline-block mb-4">π</div>
            <p className="text-gray-400">Loading sovereign real estate data…</p>
          </div>
        ) : (
          <>
            {activeTab === "listings" && (
              selectedListing ? (
                <ListingDetail
                  listing={selectedListing}
                  onBack={() => setSelectedListing(null)}
                  onTokenize={handleTokenize}
                  onPurchase={handlePurchase}
                />
              ) : (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-400">{listings.length} properties listed</p>
                  </div>
                  {listings.length === 0 ? (
                    <div className="text-center py-16 text-gray-500">No listings yet.</div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {listings.map(l => (
                        <ListingCard key={l.listingId} listing={l} onSelect={setSelectedListing} />
                      ))}
                    </div>
                  )}
                </div>
              )
            )}
            {activeTab === "tokenize" && <TokenizeTab listings={listings} />}
            {activeTab === "loopholes" && <LoopholesTab listings={listings} />}
            {activeTab === "fractional" && <FractionalTab listings={listings} />}
            {activeTab === "dao" && <DAOTab />}
            {activeTab === "stats" && <StatsTab stats={stats} />}
          </>
        )}
      </div>
    </div>
  );
}

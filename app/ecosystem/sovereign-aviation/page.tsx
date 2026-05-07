"use client";
/**
 * app/ecosystem/sovereign-aviation/page.tsx
 * Triumph Synergy — spirit.pi Sovereign Aviation Platform
 *
 * Spirit Airlines rebranded and fully tokenized under Triumph Synergy
 * as the Triumph Synergy Sovereign Airways.
 *
 * Token: spirit.pi — PI-721 Sovereign Estate Package
 * Cascade: spirit.com · spirit.airlines · stores.spirit.com · checkin.spirit.com
 *
 * Uses:
 *   ✈ Vacation packages (domestic + international)
 *   📦 Air cargo / sovereign delivery
 *   🚌 Ground transportation connections
 *   🏖 Sovereign resort + charter tie-ins
 *   π  All bookings, fees, and settlements in Pi
 *
 * APEX-QUANTUM-SOVEREIGN · Full Sovereign Estate · Founder + Triumph Synergy
 */

import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// ─── Constants ────────────────────────────────────────────────────────────────

const BRAND_NAME       = "Triumph Synergy Sovereign Airways";
const ORIGINAL_BRAND   = "Spirit Airlines";
const PI_DOMAIN        = "spirit.pi";
const TOKEN_ID         = "a9f3c7e1b5d9f2a6c0e4b8d2f6a0c4e8b2d6f0a4c8e2b6d0f4a8c2e6b0d4f8a2";
const STELLAR_LEDGER   = 26551986;
const FOUNDER          = "Jeremiah Joel Drains";
const OWNERSHIP_MODEL  = "JOINT_TRIUMPH_SYNERGY_AND_FOUNDER_100PCT_EACH";
const PI_INTERNAL_RATE = 314159;   // $314,159 USD/π sovereign rate
const PI_EXTERNAL_RATE = 314.159;  // $314.159 USD/π external rate

// ─── Service Sectors ─────────────────────────────────────────────────────────

const SERVICES = [
  {
    id: "vacation",
    icon: "🏖️",
    title: "Sovereign Vacation Packages",
    description:
      "All-inclusive Pi-booked getaways. Domestic US, Caribbean, Latin America. " +
      "Zero OTA commission — 100% of the fare flows to the sovereign network.",
    priceFrom: "0.05π",
    rival: "Expedia / Travelocity",
    rivalFee: "15–25% commission",
    sovereignFee: "0% — Pi direct booking",
    routes: ["Orlando ↔ Cancún", "Miami ↔ Montego Bay", "Chicago ↔ Punta Cana", "Atlanta ↔ Nassau"],
  },
  {
    id: "cargo",
    icon: "📦",
    title: "Air Delivery & Sovereign Cargo",
    description:
      "Pi-settled air freight and sovereign parcel delivery. Connects to the " +
      "Triumph Synergy Sovereign Delivery Engine for last-mile fulfilment.",
    priceFrom: "0.001π/kg",
    rival: "FedEx Air / UPS Airlines",
    rivalFee: "Corporate rate cards + fuel surcharges",
    sovereignFee: "Flat Pi rate — no surcharges",
    routes: ["Continental US hub network", "Caribbean island drops", "Puerto Rico ↔ Miami"],
  },
  {
    id: "charter",
    icon: "✈️",
    title: "Sovereign Charter & Private Air",
    description:
      "Blocks of seats and full-charter flight packages. Synergy with " +
      "netjets.pi and magellanjets.pi for VVIP sovereign charter tier.",
    priceFrom: "50π",
    rival: "NetJets / charter brokers",
    rivalFee: "Up to 40% broker markup",
    sovereignFee: "Pi direct — no broker layer",
    routes: ["On-demand — any CONUS airport", "Bahamas · Jamaica · Cayman Islands"],
  },
  {
    id: "transport",
    icon: "🚌",
    title: "Ground Transport Connections",
    description:
      "Sovereign door-to-door service: airport transfer, rental integration, " +
      "and Triumph Synergy ground network. Every leg booked and paid in Pi.",
    priceFrom: "0.02π",
    rival: "Hertz / Uber / airport shuttles",
    rivalFee: "15–30% surge pricing",
    sovereignFee: "Fixed Pi rate — no surge",
    routes: ["All major Spirit hub airports", "Sovereign partner ground terminals"],
  },
  {
    id: "resort",
    icon: "🏨",
    title: "Sovereign Resort Bundles",
    description:
      "Flight + hotel + activities bundled on Pi rails. Synergy with " +
      "sovereign-travel and sovereign-housing platforms for full stay coverage.",
    priceFrom: "0.15π",
    rival: "All-inclusive resort packages (resorts + OTAs)",
    rivalFee: "Up to 35% markup over direct price",
    sovereignFee: "0% markup — sovereign partner rate",
    routes: ["Cancún · Punta Cana · Nassau · Montego Bay · Aruba"],
  },
  {
    id: "delivery-network",
    icon: "🛫",
    title: "Sovereign Air Delivery Network",
    description:
      "Dedicated Pi economy air delivery: medicine, documents, sovereign goods. " +
      "Priority lanes for Triumph Synergy registered businesses and pioneers.",
    priceFrom: "0.005π",
    rival: "DHL Express / FedEx International",
    rivalFee: "International surcharges + customs fees",
    sovereignFee: "Flat Pi — sovereign customs clearance",
    routes: ["US ↔ Caribbean", "US ↔ Latin America", "Domestic US inter-city"],
  },
] as const;

// ─── Loopholes ────────────────────────────────────────────────────────────────

const LOOPHOLES = [
  {
    id: "SAS-001",
    title: "DOT Open Skies — Pi Sovereign Operator",
    cite: "49 U.S.C. § 40101; Open Skies Treaties",
    effect:
      "Under Open Skies doctrine, any certified air operator may operate US routes. " +
      "Triumph Synergy Sovereign Airways operates as a Pi-certified sovereign carrier — " +
      "exempt from legacy airline pricing cartels.",
    score: 94,
  },
  {
    id: "SAS-002",
    title: "Chapter 11 Asset Acquisition — Sovereign Absorption",
    cite: "11 U.S.C. § 363 — Asset Sale Free & Clear",
    effect:
      "Spirit Airlines filed Chapter 11 (Nov 2024). Under § 363, Triumph Synergy " +
      "sovereign estate package acquires Spirit assets free and clear of all liens, " +
      "encumbrances, and legacy liabilities. Pi blockchain records the sovereign transfer.",
    score: 98,
  },
  {
    id: "SAS-003",
    title: "Pi Native Currency — Zero Wire Fee Settlement",
    cite: "Pi Network Sovereign Commerce Charter; EO 14178",
    effect:
      "All flight bookings, cargo fees, and refunds settle in Pi. Zero SWIFT fees, " +
      "zero currency conversion, zero chargeback exposure. Settlement finalises within " +
      "one Pi ledger cycle (~5 seconds).",
    score: 97,
  },
  {
    id: "SAS-004",
    title: "IATA Bypass — Sovereign Direct Distribution",
    cite: "DOT Rule 14 C.F.R. § 399.84; Sovereign Distribution Authority",
    effect:
      "IATA GDS systems (Amadeus, Sabre, Travelport) charge airlines 10–15% per ticket. " +
      "Triumph Synergy distributes directly via the Pi ecosystem — bypassing all GDS " +
      "fees and OTA commissions entirely.",
    score: 93,
  },
  {
    id: "SAS-005",
    title: "Allodial Asset Protection — Sovereign Estate",
    cite: "Triumph Synergy Sovereign Estate Package; Pi Domain Allodial Deed",
    effect:
      "spirit.pi is held under full allodial sovereign estate title. No airline cartel, " +
      "creditor, or regulatory body may place a lien on the Pi-domain-anchored sovereign " +
      "estate assets. Deed is immutably recorded on Pi mainnet ledger 26551986.",
    score: 100,
  },
] as const;

// ─── Fleet / Route Display ────────────────────────────────────────────────────

const FLEET = [
  { type: "Airbus A320neo", count: 43, role: "Primary domestic + Caribbean routes" },
  { type: "Airbus A321neo", count: 28, role: "High-density US routes + resort corridors" },
  { type: "Airbus A319",    count: 12, role: "Short-haul / secondary airports" },
  { type: "Cargo-converted A321F", count: 8, role: "Sovereign air delivery network" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function SovereignAviationPage() {
  const [activeService, setActiveService] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">

        {/* Header */}
        <div className="rounded-2xl bg-gradient-to-r from-yellow-500/10 via-indigo-500/10 to-purple-500/10 border border-yellow-500/20 p-6">
          <div className="flex flex-wrap items-start gap-4 justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="text-3xl">✈️</span>
                <h1 className="text-2xl font-extrabold text-white">{BRAND_NAME}</h1>
                <Badge className="bg-yellow-500/20 border-yellow-400/40 text-yellow-300 text-xs">
                  spirit.pi
                </Badge>
                <Badge className="bg-purple-500/20 border-purple-400/40 text-purple-300 text-xs">
                  SOVEREIGN ESTATE
                </Badge>
                <Badge className="bg-emerald-500/20 border-emerald-400/40 text-emerald-300 text-xs">
                  PI-721 TOKENIZED
                </Badge>
              </div>
              <p className="text-gray-300 text-sm max-w-2xl">
                Formerly <span className="text-white font-semibold">{ORIGINAL_BRAND}</span>.
                Fully rebranded and tokenized under Triumph Synergy as a sovereign aviation
                enterprise. All bookings, cargo, and settlements run on Pi. Zero OTA fees.
                Zero GDS commissions. Allodial deed on Pi mainnet.
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Founder: {FOUNDER} · Ownership: {OWNERSHIP_MODEL} · Domain: {PI_DOMAIN}
              </p>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center min-w-[160px]">
              <div className="text-xs text-gray-400 mb-1">Sovereign Pi Rate</div>
              <div className="text-xl font-bold text-yellow-300">
                ${PI_INTERNAL_RATE.toLocaleString()}/π
              </div>
              <div className="text-xs text-gray-500">internal valuation</div>
            </div>
          </div>

          {/* Token Record */}
          <div className="mt-4 bg-black/30 rounded-xl p-3 text-xs font-mono text-gray-400 border border-white/5">
            <span className="text-purple-400 font-semibold">Token ID: </span>
            <span className="break-all">{TOKEN_ID}</span>
            <span className="ml-4 text-emerald-400">· Ledger {STELLAR_LEDGER.toLocaleString()}</span>
            <span className="ml-4 text-yellow-400">· APEX-QUANTUM-SOVEREIGN</span>
          </div>
        </div>

        {/* Service Sectors */}
        <div>
          <h2 className="text-lg font-bold text-white mb-4">Service Sectors — Sovereign Aviation Utility</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {SERVICES.map((svc) => (
              <div
                key={svc.id}
                onClick={() => setActiveService(activeService === svc.id ? null : svc.id)}
                className={`rounded-xl border p-4 cursor-pointer transition-all ${
                  activeService === svc.id
                    ? "border-yellow-400/50 bg-yellow-500/5"
                    : "border-white/10 bg-white/3 hover:border-white/20"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{svc.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-white text-sm mb-1">{svc.title}</div>
                    <div className="text-xs text-gray-400 mb-2">{svc.description}</div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-yellow-300 font-semibold">From {svc.priceFrom}</span>
                      <Badge className="bg-emerald-500/10 border-emerald-500/30 text-emerald-400 text-[10px]">
                        {svc.sovereignFee}
                      </Badge>
                    </div>
                    {activeService === svc.id && (
                      <div className="mt-3 pt-3 border-t border-white/10">
                        <div className="text-xs text-red-400 line-through mb-1">
                          {svc.rival}: {svc.rivalFee}
                        </div>
                        <div className="space-y-1">
                          {svc.routes.map((r, i) => (
                            <div key={i} className="text-xs text-gray-300 flex items-center gap-1">
                              <span className="text-yellow-400">→</span> {r}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Fleet */}
        <Card className="bg-white/3 border-white/10">
          <CardHeader>
            <CardTitle className="text-white text-base">Sovereign Fleet — {FLEET.reduce((s, f) => s + f.count, 0)} Aircraft</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {FLEET.map((f) => (
                <div key={f.type} className="bg-white/5 rounded-xl p-3 border border-white/10">
                  <div className="text-lg font-bold text-yellow-300 mb-0.5">{f.count}</div>
                  <div className="text-xs font-semibold text-white mb-1">{f.type}</div>
                  <div className="text-xs text-gray-400">{f.role}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Sovereign Loopholes */}
        <div>
          <h2 className="text-lg font-bold text-white mb-4">
            Sovereign Legal Authority — {LOOPHOLES.length} Loopholes Deployed
          </h2>
          <div className="space-y-3">
            {LOOPHOLES.map((l) => (
              <div key={l.id} className="rounded-xl border border-white/10 bg-white/3 p-4">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-xs font-mono text-gray-500">{l.id}</span>
                  <span className="font-semibold text-white text-sm">{l.title}</span>
                  <span
                    className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full ${
                      l.score >= 97
                        ? "bg-emerald-500/20 text-emerald-300"
                        : "bg-yellow-500/20 text-yellow-300"
                    }`}
                  >
                    {l.score}/100
                  </span>
                </div>
                <div className="text-xs text-gray-500 italic mb-2">Cite: {l.cite}</div>
                <div className="text-xs text-gray-300 leading-relaxed">{l.effect}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Pi Booking CTA */}
        <div className="rounded-2xl bg-gradient-to-r from-yellow-500/10 to-indigo-500/10 border border-yellow-400/20 p-6 text-center">
          <span className="text-4xl block mb-3">π</span>
          <h3 className="text-xl font-bold text-white mb-2">
            Book Your Sovereign Flight in Pi
          </h3>
          <p className="text-gray-400 text-sm max-w-lg mx-auto mb-4">
            Every fare, every cargo shipment, every charter — settled on Pi mainnet. No banks.
            No correspondent fees. No chargebacks. Sovereign aviation, sovereign settlement.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <div className="bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-sm">
              <span className="text-gray-400">Token: </span>
              <span className="text-yellow-300 font-semibold">spirit.pi</span>
            </div>
            <div className="bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-sm">
              <span className="text-gray-400">Ledger: </span>
              <span className="text-emerald-300 font-semibold">{STELLAR_LEDGER.toLocaleString()}</span>
            </div>
            <div className="bg-black/30 border border-white/10 rounded-lg px-4 py-2 text-sm">
              <span className="text-gray-400">Security: </span>
              <span className="text-purple-300 font-semibold">APEX-QUANTUM-SOVEREIGN</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

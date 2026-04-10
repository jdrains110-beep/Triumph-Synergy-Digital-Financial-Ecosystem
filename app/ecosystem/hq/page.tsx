/**
 * app/ecosystem/hq/page.tsx
 * Triumph Synergy HQ — Allodial Deed Public Broadcast
 * 135 Lake Como Dr, Pomona Park, FL 32181 · Deed AD-TRIUMPH-HQ-001
 */

import {
  BadgeCheck,
  Building2,
  Globe,
  Home,
  MapPin,
  Shield,
  Sparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  HQ_DEED_NUMBER,
  HQ_GENESIS_DEED,
  HQ_OWNER_NAME,
  HQ_PI_ADDRESS,
  HQ_RECORDED_DATE,
} from "@/lib/tokenization/hq-genesis-deed";

export const dynamic = "force-dynamic";
export const revalidate = 60;

export const metadata = {
  title:       "Triumph Synergy HQ — Allodial Deed",
  description: `Public broadcast of Deed ${HQ_DEED_NUMBER} for ${HQ_OWNER_NAME}. ALLODIAL PERFECTED. DEBT FREE.`,
};

export default function HQDeedPage() {
  const deed     = HQ_GENESIS_DEED;
  const property = deed.property;
  const recorded = new Date(HQ_RECORDED_DATE).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-8">

      {/* Header */}
      <div className="flex flex-wrap items-center gap-3">
        <Building2 className="h-6 w-6 text-violet-400 shrink-0" />
        <div>
          <h1 className="text-xl font-bold">Triumph Synergy HQ</h1>
          <p className="text-sm text-muted-foreground">Allodial Deed — Public Broadcast</p>
        </div>
      </div>

      {/* Status Badges */}
      <div className="flex flex-wrap gap-2">
        <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">ALLODIAL PERFECTED</Badge>
        <Badge className="bg-green-500/15 text-green-400 border border-green-500/30">DEBT FREE</Badge>
        <Badge className="bg-blue-500/15 text-blue-400 border border-blue-500/30">NO ENCUMBRANCES</Badge>
        <Badge className="bg-amber-500/15 text-amber-400 border border-amber-500/30">NO LIENS</Badge>
        <Badge className="bg-violet-500/15 text-violet-400 border border-violet-500/30">TRUE ALLODIAL</Badge>
        <Badge className="bg-red-500/15 text-red-400 border border-red-500/30">CREDIT WIPED CLEAN</Badge>
      </div>

      {/* Owner */}
      <Card className="p-5 border border-violet-500/20 bg-violet-500/5 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-violet-400 shrink-0" />
          <span className="font-semibold">Owner / Creator — Supreme Authority</span>
        </div>
        <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          {[
            ["Legal Name",       HQ_OWNER_NAME],
            ["Owner Type",       "Individual · Allodial Sovereign"],
            ["Domain",           "triumph-synergy.pi"],
            ["Authority Level",  "Supreme Authority · Owner-Creator"],
            ["Pi Address",       HQ_PI_ADDRESS],
            ["Financial Status", "DEBT FREE · TRUE FINANCIAL FREEDOM"],
          ].map(([label, val]) => (
            <div key={label}>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
              <p className={`font-mono text-xs break-all ${label === "Pi Address" ? "text-blue-400" : ""}`}>{val}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Property */}
      <Card className="p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Home className="h-4 w-4 text-emerald-400 shrink-0" />
          <span className="font-semibold">Property — Physical World Anchor</span>
        </div>
        <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          {[
            ["Street Address", property.streetAddress],
            ["City / State",   `${property.city}, ${property.state} ${property.postalCode}`],
            ["County",         property.county],
            ["Coordinates",    `${property.coordinates.lat}, ${property.coordinates.lng}`],
            ["Property Type",  property.propertyType],
            ["APN",            property.apn],
          ].map(([label, val]) => (
            <div key={label}>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
              <p className="font-mono text-xs">{val}</p>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span>{property.streetAddress}, {property.city}, {property.state} {property.postalCode}</span>
        </div>
      </Card>

      {/* Deed Details */}
      <Card className="p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-blue-400 shrink-0" />
          <span className="font-semibold">Deed Details</span>
        </div>
        <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
          {[
            ["Deed Number",    deed.deedNumber],
            ["Title Type",     deed.titleType],
            ["Token Standard", deed.standard],
            ["Network",        deed.network],
            ["Recorded Date",  recorded],
            ["Encumbrances",   deed.encumbrances.length === 0 ? "NONE" : deed.encumbrances.join(", ")],
            ["Status",         deed.status],
            ["Valuation (Pi)", `${deed.valuationPi} π`],
          ].map(([label, val]) => (
            <div key={label}>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
              <p className={`font-mono text-xs ${val === "NONE" ? "text-green-400" : ""}`}>{val}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Blockchain Verification */}
      <Card className="p-5 space-y-3">
        <div className="flex items-center gap-2">
          <BadgeCheck className="h-4 w-4 text-green-400 shrink-0" />
          <span className="font-semibold">Blockchain Verification</span>
        </div>
        <div className="space-y-2 text-xs">
          {[
            ["Network",      deed.piBlockchainAnchor.network],
            ["Ledger",       String(deed.piBlockchainAnchor.ledger)],
            ["Pi Tx Hash",   deed.piBlockchainAnchor.txHash],
            ["Stellar Hash", deed.stellarAnchor.txHash],
            ["Asset Code",   deed.stellarAnchor.assetCode],
            ["Integrity",    deed.integrityHash],
          ].map(([label, val]) => (
            <div key={label} className="flex flex-col sm:flex-row sm:gap-3">
              <span className="w-28 shrink-0 text-muted-foreground uppercase text-[10px] tracking-wide">{label}</span>
              <span className="font-mono text-xs text-blue-300 break-all">{val}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Public API */}
      <Card className="p-4 bg-muted/20 space-y-2">
        <div className="flex items-center gap-2">
          <Globe className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="text-xs font-medium text-muted-foreground">Public API Endpoints</span>
        </div>
        <div className="space-y-1">
          {[
            "GET /api/hq-broadcast — full deed broadcast (JSON)",
            "GET /api/hq-broadcast?view=deed — deed object only",
            "GET /api/hq-broadcast?view=verify — verification record",
            "GET /api/hq-broadcast?view=summary — human-readable summary",
            "GET /api/tokenization/hq — tokenization details",
          ].map(ep => (
            <p key={ep} className="font-mono text-[10px] text-blue-400">{ep}</p>
          ))}
        </div>
      </Card>

    </div>
  );
}

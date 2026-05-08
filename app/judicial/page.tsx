"use client";
// app/judicial/page.tsx
// Superior Judicial Analysis Dashboard — Florida Courtroom Monitoring & Transparency

import React, { useState, useEffect, useCallback } from "react";
import type {
  Case,
  JudicialAnalysisReport,
  ChargeViolation,
  RiskLevel,
  GoodOleBoyFlag,
  ActorCorruptionProfile,
  HistoricalReviewReport,
  LoopholeSummary,
  LoopholeReport,
} from "@/lib/judicial/types";

// ─── Demo scaffold case (Florida) ──────────────────────────────────────────────

const DEMO_CASE: Case = {
  id: "FL-2026-001",
  caseNumber: "2026-CF-00001",
  title: "State of Florida v. Doe",
  jurisdiction: "Florida — 11th Judicial Circuit",
  court: "Miami-Dade County Circuit Court",
  filedAt: "2026-01-15T00:00:00Z",
  status: "UNDER_REVIEW",
  narrative:
    "On or about January 10, 2026, at approximately 14:30, John Doe allegedly transferred funds via wire at 123 Main Street, Miami, FL. Financial records submitted by the prosecution indicate a single transfer of $5,000. The defendant is a brazen predator with no remorse who clearly committed fraud. This monster must be stopped at all costs.",
  charges: [
    {
      id: "CHG-001",
      statute: "F.S. § 817.034(4)(a)1",
      description: "Communications Fraud (over $50,000)",
      category: "FELONY",
      maxSentenceYears: 30,
      filedAt: "2026-01-15T00:00:00Z",
      relatedActId: "ACT-001",
      elements: ["scheme to defraud", "use of communications", "intent to defraud", "value over $50,000"],
      supportingEvidenceIds: ["EV-001"],
    },
    {
      id: "CHG-002",
      statute: "F.S. § 817.034(4)(a)2",
      description: "Communications Fraud (over $20,000)",
      category: "FELONY",
      maxSentenceYears: 15,
      filedAt: "2026-01-15T00:00:00Z",
      relatedActId: "ACT-001",
      elements: ["scheme to defraud", "use of communications", "intent to defraud", "value over $20,000"],
      supportingEvidenceIds: ["EV-001"],
    },
    {
      id: "CHG-003",
      statute: "F.S. § 812.014(2)(b)",
      description: "Grand Theft (over $20,000)",
      category: "FELONY",
      maxSentenceYears: 15,
      filedAt: "2026-01-15T00:00:00Z",
      relatedActId: "ACT-001",
      elements: ["knowingly obtains", "uses", "property of another", "value over $20,000"],
      supportingEvidenceIds: [],
    },
    {
      id: "CHG-004",
      statute: "F.S. § 895.03(3)",
      description: "RICO — Pattern of Racketeering",
      category: "FELONY",
      maxSentenceYears: 30,
      filedAt: "2026-01-15T00:00:00Z",
      relatedActId: "ACT-001",
      elements: ["enterprise", "pattern of racketeering", "two or more predicate acts"],
      supportingEvidenceIds: [],
    },
  ],
  evidence: [
    {
      id: "EV-001",
      type: "DOCUMENTARY",
      description: "Wire transfer record showing single $5,000 transaction",
      submittedBy: "PROSECUTION",
      submittedAt: "2026-01-15T00:00:00Z",
      authenticated: true,
      chainOfCustodyIntact: true,
      exculpatoryFlag: false,
    },
    {
      id: "EV-002",
      type: "EXCULPATORY",
      description: "Bank statement showing funds originated from legitimate salary deposit — exculpatory",
      submittedBy: "DEFENSE",
      submittedAt: "2026-02-01T00:00:00Z",
      authenticated: true,
      chainOfCustodyIntact: true,
      exculpatoryFlag: true,
    },
    {
      id: "EV-003",
      type: "TESTIMONIAL",
      description: "Employer testimony confirming wire was authorized payroll advance",
      submittedBy: "DEFENSE",
      submittedAt: "2026-02-05T00:00:00Z",
      authenticated: true,
      chainOfCustodyIntact: true,
      exculpatoryFlag: true,
    },
  ],
  parties: [
    { role: "DEFENDANT", id: "P-001", name: "John Doe" },
    { role: "PROSECUTOR", id: "P-002", name: "A. Smith", barNumber: "FL-BAR-12345", jurisdiction: "Florida" },
    { role: "DEFENSE_ATTORNEY", id: "P-003", name: "B. Jones", barNumber: "FL-BAR-67890" },
    { role: "JUDGE", id: "P-004", name: "Hon. C. Williams", jurisdiction: "11th Judicial Circuit" },
  ],
  precedentCases: [
    "Blockburger v. United States, 284 U.S. 299 (1932)",
    "Brady v. Maryland, 373 U.S. 83 (1963)",
    "Strickland v. Washington, 466 U.S. 668 (1984)",
  ],
};

// ─── Risk badge ───────────────────────────────────────────────────────────────

function RiskBadge({ level }: { level: RiskLevel }) {
  const colours: Record<RiskLevel, string> = {
    LOW: "bg-green-100 text-green-800 border-green-300",
    MODERATE: "bg-yellow-100 text-yellow-800 border-yellow-300",
    HIGH: "bg-orange-100 text-orange-800 border-orange-300",
    CRITICAL: "bg-red-100 text-red-800 border-red-300",
  };
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded border text-xs font-semibold ${colours[level]}`}
    >
      {level}
    </span>
  );
}

// ─── Violation card ───────────────────────────────────────────────────────────

function ViolationCard({ v }: { v: ChargeViolation }) {
  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm mb-3">
      <div className="flex items-center gap-2 mb-1">
        <span className="font-semibold text-sm text-gray-900">
          {v.violationType.replace(/_/g, " ")}
        </span>
        <RiskBadge level={v.severity} />
      </div>
      <p className="text-sm text-gray-700 mb-1">{v.explanation}</p>
      <p className="text-xs text-gray-500 italic mb-2">
        Legal basis: {v.legalBasis}
      </p>
      <div className="bg-blue-50 border border-blue-200 rounded p-2 text-xs text-blue-800">
        <span className="font-semibold">Remedy: </span>
        {v.remedy}
      </div>
    </div>
  );
}

// ─── Florida Circuit Monitor panel ────────────────────────────────────────────

interface FloridaMonitorData {
  jurisdiction: string;
  totalCircuits: number;
  totalCounties: number;
  monitoringStatus: string;
  engine?: { casesAnalyzed: number; violationsFound: number; dismissalsRecommended: number; alertsPublished: number };
  antiRailroading?: Record<string, string>;
  circuits?: Array<{ number: number; name: string; counties: string[] }>;
  databaseStats?: Record<string, number>;
}

function FloridaMonitorPanel({ data }: { data: FloridaMonitorData | null; }) {
  if (!data) return null;
  const eng = data.engine ?? { casesAnalyzed: 0, violationsFound: 0, dismissalsRecommended: 0, alertsPublished: 0 };
  const anti = data.antiRailroading ?? {};

  return (
    <div className="space-y-4">
      {/* Status banner */}
      <div className={`rounded-xl p-5 text-white ${data.monitoringStatus === "ACTIVE" ? "bg-emerald-700" : "bg-gray-600"}`}>
        <div className="flex items-center gap-3">
          <span className="text-3xl">🏛️</span>
          <div>
            <p className="font-bold text-lg">
              Florida Judicial Monitoring — {data.monitoringStatus}
            </p>
            <p className="text-sm opacity-90">
              {data.totalCircuits} Judicial Circuits • {data.totalCounties} Counties • Real-time transparency
            </p>
          </div>
        </div>
      </div>

      {/* Engine statistics */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Cases Analyzed", value: eng.casesAnalyzed, color: "text-blue-700" },
          { label: "Violations Found", value: eng.violationsFound, color: "text-orange-700" },
          { label: "Dismissals Recommended", value: eng.dismissalsRecommended, color: "text-red-700" },
          { label: "Alerts Published", value: eng.alertsPublished, color: "text-purple-700" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border p-4 text-center shadow-sm">
            <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-xs text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Anti-railroading protections */}
      <div className="bg-white rounded-xl border p-5 shadow-sm">
        <h3 className="text-lg font-semibold mb-3 text-gray-900">Anti-Railroading Protections</h3>
        <div className="grid grid-cols-2 gap-2">
          {Object.entries(anti).map(([key, status]) => (
            <div key={key} className="flex items-center gap-2 text-sm">
              <span className={`w-2 h-2 rounded-full ${status === "ENABLED" ? "bg-green-500" : "bg-red-500"}`} />
              <span className="text-gray-700">
                {key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()).trim()}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Circuit map */}
      {data.circuits && (
        <div className="bg-white rounded-xl border p-5 shadow-sm">
          <h3 className="text-lg font-semibold mb-3 text-gray-900">
            Florida Judicial Circuits ({data.circuits.length})
          </h3>
          <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
            {data.circuits.map((c) => (
              <div key={c.number} className="border rounded p-2 text-xs">
                <span className="font-semibold text-blue-800">Circuit {c.number}</span>
                <span className="text-gray-500 ml-1">— {c.counties.join(", ")}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Database stats */}
      {data.databaseStats && (
        <div className="bg-white rounded-xl border p-5 shadow-sm">
          <h3 className="text-lg font-semibold mb-3 text-gray-900">Database Statistics</h3>
          <div className="grid grid-cols-5 gap-4 text-center">
            {Object.entries(data.databaseStats).map(([key, val]) => (
              <div key={key}>
                <div className="text-2xl font-bold text-gray-800">{val ?? 0}</div>
                <div className="text-xs text-gray-500">{key.replace(/_/g, " ")}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Loophole Panel ──────────────────────────────────────────────────────────

function LoopholeCard({ lh }: { lh: LoopholeReport }) {
  const isDefense = lh.category === "DEFENSE";
  const borderColor = {
    CRITICAL: isDefense ? "border-green-600 bg-green-50" : "border-red-500 bg-red-50",
    HIGH: isDefense ? "border-emerald-500 bg-emerald-50" : "border-orange-400 bg-orange-50",
    MODERATE: isDefense ? "border-teal-400 bg-teal-50" : "border-yellow-400 bg-yellow-50",
    LOW: "border-gray-300 bg-white",
  }[lh.severity];
  return (
    <div className={`border-l-4 rounded-lg p-4 mb-3 ${borderColor}`}>
      <div className="flex items-start gap-2 mb-1">
        <span className="text-lg">{isDefense ? "🛡️" : "⚠️"}</span>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-sm text-gray-900">{lh.title}</span>
            <RiskBadge level={lh.severity} />
            {lh.automaticDismissalEligible && (
              <span className="bg-red-700 text-white text-xs px-2 py-0.5 rounded font-bold animate-pulse">AUTO-DISMISS ELIGIBLE</span>
            )}
          </div>
          <p className="text-xs text-gray-400 mt-0.5">{lh.loopholeType.replace(/_/g, " ")} &mdash; {lh.category} LOOPHOLE</p>
        </div>
      </div>
      <p className="text-sm text-gray-800 mb-2">{lh.description}</p>
      <p className="text-xs text-gray-500 italic mb-2">
        <span className="font-semibold">Legal Authority: </span>{lh.legalAuthority}
      </p>
      <div className="bg-white border border-blue-200 rounded p-3 text-xs text-blue-900 mb-2">
        <span className="font-bold">ACTION: </span>{lh.howToExploit}
      </div>
      <div className="bg-gray-50 border border-gray-200 rounded p-2 text-xs text-gray-700">
        <span className="font-semibold">Remedy: </span>{lh.remedy}
      </div>
    </div>
  );
}

function LoopholePanel({ summary }: { summary: LoopholeSummary }) {
  const [side, setSide] = React.useState<"defense" | "prosecution">("defense");
  return (
    <div className="bg-white rounded-xl border shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-gray-900">⚖️ Loophole Detection ({summary.totalLoopholes} found)</h2>
        {summary.automaticDismissalEligible && (
          <span className="bg-red-700 text-white text-xs px-3 py-1 rounded-full font-bold animate-pulse">
            🚨 AUTOMATIC DISMISSAL ELIGIBLE
          </span>
        )}
      </div>

      {/* Strongest move */}
      <div className="bg-emerald-50 border border-emerald-300 rounded-lg p-3 mb-4">
        <p className="text-xs font-bold text-emerald-800 mb-1">💡 STRONGEST DEFENSE MOVE</p>
        <p className="text-sm text-emerald-900">{summary.strongestDefenseMove}</p>
      </div>

      {/* Side toggle */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setSide("defense")}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${side === "defense" ? "bg-emerald-700 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
        >
          🛡️ Defense Loopholes ({summary.defenseLoopholes.length})
        </button>
        <button
          onClick={() => setSide("prosecution")}
          className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${side === "prosecution" ? "bg-red-700 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
        >
          ⚠️ Prosecution Abuses ({summary.prosecutionLoopholes.length})
        </button>
      </div>

      {side === "defense" && (
        <div>
          {summary.defenseLoopholes.length === 0
            ? <div className="bg-gray-50 border rounded p-4 text-gray-500 text-sm">No defense loopholes detected for this case.</div>
            : summary.defenseLoopholes.map((lh, i) => <LoopholeCard key={i} lh={lh} />)
          }
        </div>
      )}
      {side === "prosecution" && (
        <div>
          {summary.prosecutionLoopholes.length === 0
            ? <div className="bg-gray-50 border rounded p-4 text-gray-500 text-sm">No prosecution abuse patterns detected.</div>
            : summary.prosecutionLoopholes.map((lh, i) => <LoopholeCard key={i} lh={lh} />)
          }
        </div>
      )}
    </div>
  );
}

// ─── Service health indicator ─────────────────────────────────────────────────

function ServiceHealth({ health }: { health: Record<string, unknown> | null }) {
  if (!health) return null;
  const isOnline = health.status === "healthy";
  return (
    <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${isOnline ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
      <span className={`w-2 h-2 rounded-full ${isOnline ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
      Microservice: {isOnline ? "ONLINE" : "OFFLINE (local engine active)"}
    </div>
  );
}

// ─── Good Ole Boy Flag Card ───────────────────────────────────────────────

function GobFlagCard({ flag }: { flag: GoodOleBoyFlag }) {
  const typeLabel = flag.flagType.replace(/_/g, " ");
  const borderColor = {
    CRITICAL: "border-red-400 bg-red-50",
    HIGH: "border-orange-400 bg-orange-50",
    MODERATE: "border-yellow-400 bg-yellow-50",
    LOW: "border-gray-300 bg-white",
  }[flag.severity];
  return (
    <div className={`border-l-4 rounded-lg p-4 mb-3 ${borderColor}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="font-bold text-sm text-gray-900">{typeLabel}</span>
        <RiskBadge level={flag.severity} />
        <span className="text-xs text-gray-400 ml-auto">{flag.caseIds.length} case(s)</span>
      </div>
      <p className="text-sm text-gray-800 mb-2">{flag.description}</p>
      <p className="text-xs text-gray-500 italic mb-2">
        <span className="font-semibold">Statistical basis:</span> {flag.statisticalBasis}
      </p>
      <div className="bg-white border border-blue-200 rounded p-2 text-xs text-blue-900">
        <span className="font-semibold">Action required: </span>{flag.recommendedAction}
      </div>
    </div>
  );
}

// ─── Actor Corruption Profile Card ──────────────────────────────────────

function ActorProfileCard({ profile }: { profile: ActorCorruptionProfile }) {
  const barColor = {
    CRITICAL: "bg-red-600",
    HIGH: "bg-orange-500",
    MODERATE: "bg-yellow-500",
    LOW: "bg-green-500",
  }[profile.riskLevel];
  return (
    <div className="border rounded-xl p-4 bg-white shadow-sm mb-3">
      <div className="flex items-center justify-between mb-2">
        <div>
          <span className="font-bold text-gray-900">{profile.actorName}</span>
          <span className="ml-2 text-xs text-gray-500">{profile.actorRole} • {profile.jurisdiction}</span>
        </div>
        <RiskBadge level={profile.riskLevel} />
      </div>
      <div className="flex items-center gap-3 mb-3">
        <div className="flex-1 bg-gray-200 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all duration-500 ${barColor}`}
            style={{ width: `${profile.corruptionScore}%` }}
          />
        </div>
        <span className="text-sm font-bold text-gray-700">{profile.corruptionScore}/100</span>
      </div>
      <div className="grid grid-cols-4 gap-2 text-center text-xs mb-3">
        <div className="bg-gray-50 rounded p-2"><div className="font-bold text-gray-800">{profile.caseCount}</div><div className="text-gray-500">Cases</div></div>
        <div className="bg-red-50 rounded p-2"><div className="font-bold text-red-700">{profile.violationCount}</div><div className="text-gray-500">Violations</div></div>
        <div className="bg-orange-50 rounded p-2"><div className="font-bold text-orange-700">{profile.wordVsWordCases}</div><div className="text-gray-500">Word vs. Word</div></div>
        <div className="bg-blue-50 rounded p-2"><div className="font-bold text-blue-700">{Math.round(profile.dismissalRate * 100)}%</div><div className="text-gray-500">Dismissal Rate</div></div>
      </div>
      {profile.recommendedActions.length > 0 && (
        <div className="space-y-1">
          {profile.recommendedActions.map((a, i) => (
            <div key={i} className="text-xs bg-yellow-50 border border-yellow-200 rounded px-2 py-1 text-yellow-900">⚠️ {a}</div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Historical Review Panel ───────────────────────────────────────────

const DEMO_HISTORICAL_CASES: Case[] = [
  {
    id: "HIS-2023-001", caseNumber: "2023-CF-00245", title: "State v. Marcus Williams",
    jurisdiction: "Florida — 4th Judicial Circuit", court: "Duval County Circuit Court",
    filedAt: "2023-03-12T00:00:00Z", status: "CLOSED",
    narrative: "On or about March 8, 2023, Officer Johnson reported that the defendant was observed in suspicious circumstances near a convenience store. The defendant is a brazen predator who clearly had intent to rob. No camera footage was obtained.",
    charges: [{ id: "H1C1", statute: "F.S. § 812.013(2)(c)", description: "Robbery", category: "FELONY", maxSentenceYears: 15, filedAt: "2023-03-12T00:00:00Z", relatedActId: "H1A1", elements: ["force", "taking", "property of another"], supportingEvidenceIds: [] }],
    evidence: [{ id: "H1E1", type: "TESTIMONIAL", description: "Officer Johnson testimony", submittedBy: "PROSECUTION", submittedAt: "2023-03-12T00:00:00Z", authenticated: true, chainOfCustodyIntact: true, exculpatoryFlag: false }],
    parties: [
      { role: "DEFENDANT", id: "D-WIL", name: "Marcus Williams" },
      { role: "PROSECUTOR", id: "P-DAV", name: "Rebecca Davis", barNumber: "FL-BAR-55512", jurisdiction: "4th Circuit" },
      { role: "WITNESS", id: "O-JOH", name: "Officer T. Johnson", jurisdiction: "Jacksonville PD" },
      { role: "JUDGE", id: "J-HAR", name: "Hon. K. Harrison", jurisdiction: "4th Judicial Circuit" },
    ],
    precedentCases: [],
  },
  {
    id: "HIS-2023-002", caseNumber: "2023-CF-00389", title: "State v. Darnell Brown",
    jurisdiction: "Florida — 4th Judicial Circuit", court: "Duval County Circuit Court",
    filedAt: "2023-07-19T00:00:00Z", status: "FLAGGED",
    narrative: "On or about July 15, 2023, Officer Johnson observed the defendant in suspicious circumstances near a convenience store. The defendant is a cold-blooded menace to society with no remorse. No camera footage was available.",
    charges: [
      { id: "H2C1", statute: "F.S. § 812.013(2)(c)", description: "Robbery", category: "FELONY", maxSentenceYears: 15, filedAt: "2023-07-19T00:00:00Z", relatedActId: "H2A1", elements: ["force", "taking", "property of another"], supportingEvidenceIds: [] },
      { id: "H2C2", statute: "F.S. § 784.021(1)(a)", description: "Aggravated Assault", category: "FELONY", maxSentenceYears: 5, filedAt: "2023-07-19T00:00:00Z", relatedActId: "H2A1", elements: ["intent", "threat", "deadly weapon"], supportingEvidenceIds: [] },
    ],
    evidence: [{ id: "H2E1", type: "TESTIMONIAL", description: "Officer Johnson testimony", submittedBy: "PROSECUTION", submittedAt: "2023-07-19T00:00:00Z", authenticated: true, chainOfCustodyIntact: true, exculpatoryFlag: false }],
    parties: [
      { role: "DEFENDANT", id: "D-BRN", name: "Darnell Brown" },
      { role: "PROSECUTOR", id: "P-DAV", name: "Rebecca Davis", barNumber: "FL-BAR-55512", jurisdiction: "4th Circuit" },
      { role: "WITNESS", id: "O-JOH", name: "Officer T. Johnson", jurisdiction: "Jacksonville PD" },
      { role: "JUDGE", id: "J-HAR", name: "Hon. K. Harrison", jurisdiction: "4th Judicial Circuit" },
    ],
    precedentCases: [],
  },
  {
    id: "HIS-2024-003", caseNumber: "2024-CF-00112", title: "State v. Anthony Reed",
    jurisdiction: "Florida — 4th Judicial Circuit", court: "Duval County Circuit Court",
    filedAt: "2024-02-08T00:00:00Z", status: "FILED",
    narrative: "On or about February 5, 2024, Officer Johnson witnessed the defendant near a convenience store in suspicious circumstances. The defendant is clearly guilty of predatory behavior and a vicious criminal. Bodycam was malfunctioning at the time.",
    charges: [
      { id: "H3C1", statute: "F.S. § 812.013(2)(c)", description: "Robbery", category: "FELONY", maxSentenceYears: 15, filedAt: "2024-02-08T00:00:00Z", relatedActId: "H3A1", elements: ["force", "taking", "property of another"], supportingEvidenceIds: [] },
      { id: "H3C2", statute: "F.S. § 812.013(2)(c)", description: "Robbery (second count)", category: "FELONY", maxSentenceYears: 15, filedAt: "2024-02-08T00:00:00Z", relatedActId: "H3A1", elements: ["force", "taking", "property of another"], supportingEvidenceIds: [] },
    ],
    evidence: [],
    parties: [
      { role: "DEFENDANT", id: "D-REED", name: "Anthony Reed" },
      { role: "PROSECUTOR", id: "P-DAV", name: "Rebecca Davis", barNumber: "FL-BAR-55512", jurisdiction: "4th Circuit" },
      { role: "WITNESS", id: "O-JOH", name: "Officer T. Johnson", jurisdiction: "Jacksonville PD" },
      { role: "JUDGE", id: "J-HAR", name: "Hon. K. Harrison", jurisdiction: "4th Judicial Circuit" },
    ],
    precedentCases: [],
  },
  {
    id: "HIS-2025-004", caseNumber: "2025-CF-00076", title: "State v. Kevin Price",
    jurisdiction: "Florida — 4th Judicial Circuit", court: "Duval County Circuit Court",
    filedAt: "2025-01-22T00:00:00Z", status: "UNDER_REVIEW",
    narrative: "On or about January 19, 2025, Officer Johnson stated that defendant Kevin Price was observed near a convenience store acting in obviously suspicious ways. Price is undeniably a repeat threat to this neighborhood. Dashcam footage was unavailable.",
    charges: [{ id: "H4C1", statute: "F.S. § 843.01", description: "Resisting Officer with Violence", category: "FELONY", maxSentenceYears: 5, filedAt: "2025-01-22T00:00:00Z", relatedActId: "H4A1", elements: ["knowingly", "resists", "officer", "with violence"], supportingEvidenceIds: [] }],
    evidence: [{ id: "H4E1", type: "TESTIMONIAL", description: "Officer Johnson sworn statement", submittedBy: "PROSECUTION", submittedAt: "2025-01-22T00:00:00Z", authenticated: true, chainOfCustodyIntact: true, exculpatoryFlag: false }],
    parties: [
      { role: "DEFENDANT", id: "D-PRC", name: "Kevin Price" },
      { role: "PROSECUTOR", id: "P-DAV", name: "Rebecca Davis", barNumber: "FL-BAR-55512", jurisdiction: "4th Circuit" },
      { role: "WITNESS", id: "O-JOH", name: "Officer T. Johnson", jurisdiction: "Jacksonville PD" },
      { role: "JUDGE", id: "J-HAR", name: "Hon. K. Harrison", jurisdiction: "4th Judicial Circuit" },
    ],
    precedentCases: [],
  },
];

function HistoricalReviewPanel() {
  const [yearsBack, setYearsBack] = React.useState<1 | 2 | 3 | 4 | 5>(5);
  const [jurisdiction, setJurisdiction] = React.useState("Florida — 4th Judicial Circuit");
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState<HistoricalReviewReport | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [activeSection, setActiveSection] = React.useState<"alerts" | "flags" | "actors" | "cases" | "loopholes">("alerts");

  async function runReview() {
    setLoading(true); setError(null);
    try {
      const res = await fetch("/api/judicial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "historical", cases: DEMO_HISTORICAL_CASES, jurisdiction, yearsBack }),
      });
      if (!res.ok) throw new Error(await res.text());
      setResult(await res.json());
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  }

  const systemicColors: Record<string, string> = {
    CRITICAL: "bg-red-700", HIGH: "bg-orange-600", MODERATE: "bg-yellow-600", LOW: "bg-green-700",
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border p-5 shadow-sm">
        <h2 className="text-lg font-bold text-gray-900 mb-1">🔍 Historical Judicial Review — Good Ole Boy Detector</h2>
        <p className="text-sm text-gray-600 mb-4">
          Audit every case from the past 1–5 years in a jurisdiction. Cross-references all cases to expose
          recurring officer-prosecutor networks, word-vs-word prosecutions, evidence deserts, rubber-stamp
          charging, and judicial bias patterns invisible when cases are reviewed one-by-one.
        </p>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Jurisdiction</label>
            <input type="text" value={jurisdiction} onChange={(e) => setJurisdiction(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Years to review (1–5)</label>
            <div className="flex gap-2">
              {([1, 2, 3, 4, 5] as const).map((y) => (
                <button key={y} onClick={() => setYearsBack(y)}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition ${yearsBack === y ? "bg-blue-700 text-white border-blue-700" : "bg-gray-50 text-gray-600 border-gray-300 hover:bg-gray-100"
                    }`}
                >{y}y</button>
              ))}
            </div>
          </div>
        </div>
        <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 text-xs text-amber-800 mb-4">
          <span className="font-bold">⚠️ Demo Mode:</span> 4 sample cases from Florida 4th Judicial Circuit (2023–2025) demonstrating Officer T. Johnson + Prosecutor Rebecca Davis recurring pattern across all cases with zero physical evidence.
        </div>
        <button onClick={runReview} disabled={loading}
          className="w-full bg-red-700 text-white py-3 rounded-lg font-bold text-sm hover:bg-red-800 disabled:opacity-50 transition">
          {loading ? "Scanning case history…" : `🔎 Run ${yearsBack}-Year Judicial Corruption Audit`}
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-300 text-red-800 rounded p-4 text-sm">{error}</div>}

      {result && (
        <div className="space-y-4">
          <div className={`rounded-xl p-5 text-white ${systemicColors[result.systemicRiskLevel] ?? "bg-gray-600"}`}>
            <div className="flex items-center gap-4">
              <span className="text-4xl">
                {result.systemicRiskLevel === "CRITICAL" ? "🚨" : result.systemicRiskLevel === "HIGH" ? "⚠️" : result.systemicRiskLevel === "MODERATE" ? "🔔" : "✅"}
              </span>
              <div className="flex-1">
                <p className="font-bold text-lg">Systemic Risk: {result.systemicRiskLevel}</p>
                <p className="text-sm opacity-90">{result.summary}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-3">
            {[
              { label: "Cases Reviewed", value: result.totalCasesReviewed, color: "text-blue-700" },
              { label: "With Violations", value: result.casesWithViolations, color: "text-orange-700" },
              { label: "Dismissal Rec.", value: result.casesRecommendedDismissal, color: "text-red-700" },
              { label: "GOB Flags", value: result.goodOleBoyFlags.length, color: "text-purple-700" },
              { label: "Critical Actors", value: result.criticalActors.length, color: "text-red-700" },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-xl border p-3 text-center shadow-sm">
                <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-gray-500 mt-1">{s.label}</div>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            {(["alerts", "flags", "actors", "cases", "loopholes"] as const).map((s) => (
              <button key={s} onClick={() => setActiveSection(s)}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${activeSection === s ? "bg-gray-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}>
                {s === "alerts" && `📢 Public Alerts (${result.publicInterestAlerts.length})`}
                {s === "flags" && `🚩 GOB Flags (${result.goodOleBoyFlags.length})`}
                {s === "actors" && `👤 Actor Profiles (${result.actorProfiles.length})`}
                {s === "cases" && `⚖️ Case Reports (${result.individualReports.length})`}
                {s === "loopholes" && `🔓 Loopholes (${result.loopholeReports.length})`}
              </button>
            ))}
          </div>

          {activeSection === "alerts" && (
            <div className="space-y-3">
              {result.publicInterestAlerts.length === 0
                ? <div className="bg-green-50 border border-green-300 rounded-lg p-4 text-green-800 text-sm">No public interest alerts generated.</div>
                : result.publicInterestAlerts.map((alert, i) => (
                  <div key={i} className="bg-white border rounded-xl p-4 shadow-sm text-sm text-gray-800">{alert}</div>
                ))
              }
            </div>
          )}
          {activeSection === "flags" && (
            <div>
              {result.goodOleBoyFlags.length === 0
                ? <div className="bg-green-50 border border-green-300 rounded-lg p-4 text-green-800 text-sm">No systemic patterns detected.</div>
                : result.goodOleBoyFlags.map((flag, i) => <GobFlagCard key={i} flag={flag} />)
              }
            </div>
          )}
          {activeSection === "actors" && (
            <div>
              {result.actorProfiles.length === 0
                ? <div className="bg-gray-50 border rounded-lg p-4 text-gray-600 text-sm">No actor profiles generated.</div>
                : result.actorProfiles.map((profile, i) => <ActorProfileCard key={i} profile={profile} />)
              }
            </div>
          )}
          {activeSection === "cases" && (
            <div className="space-y-3">
              {result.individualReports.map((r, i) => (
                <div key={i} className="bg-white border rounded-xl p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-sm text-gray-900">{r.caseId}</span>
                    <div className="flex items-center gap-2">
                      <RiskBadge level={r.riskLevel} />
                      <span className={`text-xs px-2 py-0.5 rounded font-semibold ${r.overallVerdict === "CASE_RECOMMENDED_FOR_DISMISSAL" ? "bg-red-100 text-red-800"
                          : r.overallVerdict === "VIOLATIONS_FOUND" ? "bg-orange-100 text-orange-800"
                            : "bg-green-100 text-green-800"
                        }`}>{r.overallVerdict.replace(/_/g, " ")}</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600">{r.summary}</p>
                  {r.chargeViolations.length > 0 && (
                    <p className="text-xs text-orange-700 mt-1 font-semibold">
                      {r.chargeViolations.length} violation(s): {r.chargeViolations.map((v) => v.violationType.replace(/_/g, " ")).join(" | ")}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeSection === "loopholes" && (
            <div className="space-y-3">
              {result.loopholeReports.length === 0
                ? <div className="bg-green-50 border border-green-300 rounded-lg p-4 text-green-800 text-sm">No loopholes detected across any reviewed case.</div>
                : result.loopholeReports.map((lh, i) => <LoopholeCard key={i} lh={lh} />)
              }
            </div>
          )}

          {(result.wordVsWordCases.length > 0 || result.evidenceDesertCases.length > 0) && (
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-orange-50 border border-orange-300 rounded-xl p-4">
                <p className="font-bold text-orange-800 text-sm mb-1">🗣️ Word vs. Word Cases ({result.wordVsWordCases.length})</p>
                <p className="text-xs text-orange-700 mb-2">Officer testimony was the ONLY prosecution evidence — zero objective corroboration.</p>
                {result.wordVsWordCases.map((id) => <span key={id} className="block text-xs font-mono text-orange-800">{id}</span>)}
              </div>
              <div className="bg-red-50 border border-red-300 rounded-xl p-4">
                <p className="font-bold text-red-800 text-sm mb-1">🏜️ Evidence Desert Cases ({result.evidenceDesertCases.length})</p>
                <p className="text-xs text-red-700 mb-2">Zero authenticated physical, documentary, or digital evidence of any kind.</p>
                {result.evidenceDesertCases.map((id) => <span key={id} className="block text-xs font-mono text-red-800">{id}</span>)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Circuit 7 Panel ──────────────────────────────────────────────────────────

const CIRCUIT_7_COUNTIES = ["Flagler", "Putnam", "St. Johns", "Volusia"];
const CIRCUIT_7_ROLES = ["PLAINTIFF", "DEFENDANT", "ATTORNEY", "JUDGE", "WITNESS", "OTHER"] as const;
type Circuit7Role = (typeof CIRCUIT_7_ROLES)[number];

interface Circuit7Status {
  totalRegistered: number;
  piOptIns: number;
  roles: Record<string, number>;
  sovereignDeclaration: string;
  timestamp: string;
}

interface Circuit7RegResult {
  success: boolean;
  registrationId: string;
  message: string;
  party: {
    fullLegalName: string;
    piAddress: string;
    role: string;
    piPaymentOptIn: boolean;
    registeredAt: string;
  };
  quantumSig: string;
}

function Circuit7Panel() {
  const [status, setStatus] = useState<Circuit7Status | null>(null);
  const [form, setForm] = useState({
    fullLegalName: "",
    piAddress: "",
    role: "PLAINTIFF" as Circuit7Role,
    caseNumber: "",
    detailsConfirmed: false,
    piPaymentOptIn: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Circuit7RegResult | null>(null);
  const [regError, setRegError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/judicial/circuit-7?view=status")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => { });
  }, [result]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setRegError(null);
    setResult(null);
    try {
      const res = await fetch("/api/judicial/circuit-7", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullLegalName: form.fullLegalName,
          piAddress: form.piAddress,
          role: form.role,
          caseNumber: form.caseNumber || undefined,
          detailsConfirmed: form.detailsConfirmed,
          piPaymentOptIn: form.piPaymentOptIn,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Registration failed.");
      setResult(data as Circuit7RegResult);
      setForm({
        fullLegalName: "",
        piAddress: "",
        role: "PLAINTIFF",
        caseNumber: "",
        detailsConfirmed: false,
        piPaymentOptIn: false,
      });
    } catch (err) {
      setRegError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Sovereign Authority Banner */}
      <div className="rounded-xl p-6 text-white bg-gradient-to-r from-indigo-900 via-purple-900 to-indigo-900 border border-purple-500/40">
        <div className="flex items-start gap-4">
          <span className="text-4xl">⚖️</span>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <h2 className="text-xl font-bold">
                Circuit 7 — Seventh Judicial Circuit of Florida
              </h2>
              <span className="px-2 py-0.5 text-xs font-bold bg-purple-500/30 border border-purple-400/50 rounded text-purple-200">
                SOVEREIGN CONNECTED
              </span>
              <span className="px-2 py-0.5 text-xs font-bold bg-amber-500/20 border border-amber-400/50 rounded text-amber-300">
                TRIUMPH SYNERGY AUTHORITY
              </span>
            </div>
            <p className="text-sm text-purple-200 leading-relaxed">
              Triumph Synergy holds superior sovereign oversight jurisdiction over the Seventh
              Judicial Circuit. Counties under coverage:{" "}
              <strong className="text-white">{CIRCUIT_7_COUNTIES.join(" · ")}</strong>.
              All parties, cases, and judicial proceedings within this circuit are subject to
              sovereign transparency review. Every actor must register and confirm current details
              through this platform. Full transparency is enforced — nothing hidden.
            </p>
          </div>
        </div>

        {status && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
            {[
              { label: "Registered", value: status.totalRegistered, color: "text-white" },
              { label: "Pi Opt-Ins", value: status.piOptIns, color: "text-amber-300" },
              { label: "Attorneys", value: status.roles.attorney ?? 0, color: "text-blue-300" },
              { label: "Defendants", value: status.roles.defendant ?? 0, color: "text-red-300" },
            ].map(({ label, value, color }) => (
              <div
                key={label}
                className="bg-white/10 rounded-lg p-3 text-center border border-white/10"
              >
                <div className={`text-2xl font-bold ${color}`}>{value}</div>
                <div className="text-xs text-purple-300 mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Transparency / Misdeed Exposure Notice */}
      <div className="bg-red-950/60 border border-red-500/30 rounded-xl p-4 text-sm text-red-200">
        <div className="flex items-start gap-3">
          <span className="text-xl mt-0.5">🔍</span>
          <div>
            <p className="font-semibold text-red-300 mb-1">
              Full Transparency — All Misdeeds Will Be Exposed
            </p>
            <p className="text-xs leading-relaxed text-red-200/80">
              Every case, every judicial act, every violation occurring within Circuit 7 is
              logged to the immutable sovereign ledger. Charge stacking, railroading,
              evidence suppression, judicial misconduct, and prosecutor misconduct are
              automatically flagged and forwarded to the relevant authorities. Triumph Synergy
              owns the transparency layer — court records, parties, and proceedings are
              surfaced publicly. This is the start of sovereign recognition.
            </p>
          </div>
        </div>
      </div>

      {/* Registration / Opt-In Form */}
      <div className="bg-white rounded-xl border shadow-sm p-5">
        <h3 className="text-lg font-semibold text-gray-900 mb-1">
          Party Registration &amp; Pi Acceptance Opt-In
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          All parties operating within Circuit 7 must register or confirm their details are
          current through Triumph Synergy. Opt in to accept Pi as your payment rail — faster
          resolution, zero banking fees, sovereign settlement.
        </p>

        {result ? (
          <div className="space-y-4">
            <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">✅</span>
                <span className="font-bold text-emerald-800 text-lg">Registered Successfully</span>
                {result.party.piPaymentOptIn && (
                  <span className="px-2 py-0.5 text-xs font-bold bg-amber-100 border border-amber-300 rounded text-amber-800">
                    π Pi Opt-In Active
                  </span>
                )}
              </div>
              <p className="text-sm text-emerald-700 mb-3">{result.message}</p>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-gray-500">Registration ID</span>
                  <div className="font-mono text-gray-800 break-all">{result.registrationId}</div>
                </div>
                <div>
                  <span className="text-gray-500">Registered At</span>
                  <div className="font-mono text-gray-800">{result.party.registeredAt}</div>
                </div>
                <div>
                  <span className="text-gray-500">Party Name</span>
                  <div className="font-semibold text-gray-800">{result.party.fullLegalName}</div>
                </div>
                <div>
                  <span className="text-gray-500">Role</span>
                  <div className="font-semibold text-gray-800">{result.party.role}</div>
                </div>
              </div>
              <div className="mt-3 bg-purple-50 border border-purple-200 rounded p-2 text-xs text-purple-700 font-mono break-all">
                <span className="font-semibold">Quantum Sig: </span>{result.quantumSig}
              </div>
            </div>
            <button
              onClick={() => setResult(null)}
              className="text-sm text-indigo-600 hover:text-indigo-800 underline"
            >
              Register another party
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Legal Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.fullLegalName}
                  onChange={(e) => setForm((f) => ({ ...f, fullLegalName: e.target.value }))}
                  placeholder="First Last (as on legal documents)"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pi Network Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={form.piAddress}
                  onChange={(e) => setForm((f) => ({ ...f, piAddress: e.target.value }))}
                  placeholder="Your Pi wallet address"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role in Proceedings <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.role}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, role: e.target.value as Circuit7Role }))
                  }
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  {CIRCUIT_7_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r.charAt(0) + r.slice(1).toLowerCase()}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Case Number{" "}
                  <span className="text-gray-400 text-xs font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={form.caseNumber}
                  onChange={(e) => setForm((f) => ({ ...f, caseNumber: e.target.value }))}
                  placeholder="e.g. 2026-CF-00123"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono"
                />
              </div>
            </div>

            {/* Confirmation checkboxes */}
            <div className="space-y-3 pt-1">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={form.detailsConfirmed}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, detailsConfirmed: e.target.checked }))
                  }
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-gray-700">
                  <strong>I confirm my details are current and accurate.</strong> I understand
                  that Triumph Synergy holds sovereign oversight jurisdiction over Circuit 7 and
                  that my registration is recorded on the immutable sovereign ledger.
                </span>
              </label>

              <label className="flex items-start gap-3 cursor-pointer rounded-lg border border-amber-200 bg-amber-50 p-3">
                <input
                  type="checkbox"
                  checked={form.piPaymentOptIn}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, piPaymentOptIn: e.target.checked }))
                  }
                  className="mt-0.5 h-4 w-4 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                />
                <span className="text-sm text-amber-800">
                  <strong>π Opt-in: I accept Pi as a payment method</strong> for sovereign
                  resolution services, judgments, settlements, and fees within the Triumph
                  Synergy judicial platform. Pi settlements are final and blockchain-anchored.
                </span>
              </label>
            </div>

            {regError && (
              <div className="bg-red-50 border border-red-300 rounded p-3 text-sm text-red-800">
                {regError}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !form.detailsConfirmed}
              className="w-full bg-indigo-700 text-white py-3 rounded-lg font-semibold hover:bg-indigo-800 disabled:opacity-50 transition"
            >
              {submitting
                ? "Registering on Sovereign Ledger…"
                : form.piPaymentOptIn
                  ? "Register & Activate Pi Payment Opt-In"
                  : "Register with Circuit 7 Sovereign Platform"}
            </button>
          </form>
        )}
      </div>

      {/* Pi Acceptance Module */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <span className="text-2xl">π</span>
          <div>
            <h4 className="font-semibold text-amber-900 mb-1">
              Pi Payment Acceptance — Sovereign Settlement Rail
            </h4>
            <p className="text-sm text-amber-800 leading-relaxed">
              By opting in, you authorise Triumph Synergy to process judicial settlements,
              service fees, and resolution payments in Pi Network currency at the sovereign
              internal rate. Pi settlements are immutably recorded on the Pi mainnet ledger,
              cannot be reversed by any bank or correspondent institution, and carry full
              Triumph Synergy guarantee.
            </p>
            <div className="mt-3 grid grid-cols-3 gap-3 text-xs text-center">
              <div className="bg-amber-100 rounded p-2">
                <div className="font-bold text-amber-900">0%</div>
                <div className="text-amber-700">Bank Fees</div>
              </div>
              <div className="bg-amber-100 rounded p-2">
                <div className="font-bold text-amber-900">Instant</div>
                <div className="text-amber-700">Settlement</div>
              </div>
              <div className="bg-amber-100 rounded p-2">
                <div className="font-bold text-amber-900">On-Chain</div>
                <div className="text-amber-700">Immutable Record</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="bg-gray-100 rounded-xl p-4 text-xs text-gray-500">
        <p className="font-semibold mb-1">Sovereign Platform Notice</p>
        <p>
          Circuit 7 integration is a transparency and party-registration module operated by
          Triumph Synergy Digital Financial Ecosystem. Registration does not constitute legal
          representation. All data entered is recorded on the sovereign immutable ledger.
          Pi payment opt-in is voluntary and activates Pi-native resolution services.
          Full transparency is enforced across all registered cases and parties.
        </p>
      </div>
    </div>
  );
}

// ─── Dashboard ─────────────────────────────────────────────────────────

type Tab = "monitor" | "analyze" | "history" | "circuit7";

export default function JudicialDashboard() {
  const [tab, setTab] = useState<Tab>("monitor");
  const [report, setReport] = useState<JudicialAnalysisReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [floridaData, setFloridaData] = useState<FloridaMonitorData | null>(null);
  const [serviceHealth, setServiceHealth] = useState<Record<string, unknown> | null>(null);

  const fetchFloridaData = useCallback(async () => {
    try {
      const res = await fetch("/api/judicial?view=florida");
      if (res.ok) setFloridaData(await res.json());
    } catch { }
  }, []);

  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch("/api/judicial?view=health");
      if (res.ok) setServiceHealth(await res.json());
    } catch { }
  }, []);

  useEffect(() => {
    fetchFloridaData();
    fetchHealth();
    const interval = setInterval(() => {
      fetchFloridaData();
      fetchHealth();
    }, 30_000);
    return () => clearInterval(interval);
  }, [fetchFloridaData, fetchHealth]);

  async function runAnalysis() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/judicial", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          case: DEMO_CASE,
          representationOptions: {
            motionsFiled: 1,
            discoveryRequestsMade: 0,
            hadPleaNegotiations: false,
            missedDeadlines: ["Motion to suppress — 2026-02-15", "Discovery response — 2026-03-01"],
          },
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setReport(await res.json());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const tabStyle = (t: Tab) =>
    `px-4 py-2 rounded-t-lg font-semibold text-sm transition ${tab === t
      ? "bg-white text-blue-800 border-b-2 border-blue-700"
      : "bg-gray-100 text-gray-500 hover:text-gray-800"
    }`;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Superior Judicial Analysis System
              </h1>
              <p className="text-gray-600 mt-1">
                Courtroom transparency engine — anti-railroading • anti-stacking • anti-vendetta •
                evidence accountability • immutable ledger
              </p>
            </div>
            <ServiceHealth health={serviceHealth} />
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Powered by Triumph Synergy • Florida-first deployment • Nothing hidden — full transparency enforced
          </p>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-1 mb-4">
          <button className={tabStyle("monitor")} onClick={() => setTab("monitor")}>
            🏛️ Florida Monitor
          </button>
          <button className={tabStyle("analyze")} onClick={() => setTab("analyze")}>
            ⚖️ Case Analysis
          </button>
          <button className={tabStyle("history")} onClick={() => setTab("history")}>
            🔍 Historical Review
          </button>
          <button
            className={`${tabStyle("circuit7")} relative`}
            onClick={() => setTab("circuit7")}
          >
            ⚡ Circuit 7
            <span className="ml-1.5 px-1.5 py-0.5 text-[10px] font-bold bg-purple-600 text-white rounded-full align-middle">
              NEW
            </span>
          </button>
        </div>

        {/* Florida Monitor Tab */}
        {tab === "monitor" && (
          <FloridaMonitorPanel data={floridaData} />
        )}

        {/* Circuit 7 Tab */}
        {tab === "circuit7" && <Circuit7Panel />}

        {/* Historical Review Tab */}
        {tab === "history" && <HistoricalReviewPanel />}

        {/* Case Analysis Tab */}
        {tab === "analyze" && (
          <div>
            {!report && (
              <div className="space-y-4">
                <div className="bg-white rounded-xl border p-5 shadow-sm">
                  <h2 className="text-lg font-semibold mb-2 text-gray-900">
                    Demo: State of Florida v. Doe
                  </h2>
                  <p className="text-sm text-gray-600 mb-1">
                    11th Judicial Circuit (Miami-Dade) • 4 felony charges on single alleged wire transfer
                  </p>
                  <p className="text-xs text-gray-400 mb-3">
                    This demo illustrates charge stacking, multiplicity, railroading (charges without evidence),
                    emotional/inflammatory prosecution language, and ineffective assistance of counsel — all
                    automatically detected by the analysis engine.
                  </p>
                  <div className="grid grid-cols-4 gap-3 text-center mb-4">
                    <div className="bg-red-50 rounded p-2">
                      <div className="text-lg font-bold text-red-700">4</div>
                      <div className="text-xs text-gray-500">Felony Charges</div>
                    </div>
                    <div className="bg-green-50 rounded p-2">
                      <div className="text-lg font-bold text-green-700">3</div>
                      <div className="text-xs text-gray-500">Evidence Items</div>
                    </div>
                    <div className="bg-blue-50 rounded p-2">
                      <div className="text-lg font-bold text-blue-700">2</div>
                      <div className="text-xs text-gray-500">Exculpatory</div>
                    </div>
                    <div className="bg-orange-50 rounded p-2">
                      <div className="text-lg font-bold text-orange-700">1</div>
                      <div className="text-xs text-gray-500">Act Alleged</div>
                    </div>
                  </div>
                  <button
                    onClick={runAnalysis}
                    disabled={loading}
                    className="bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-800 disabled:opacity-50 transition w-full"
                  >
                    {loading ? "Analysing case…" : "Run Full Judicial Analysis"}
                  </button>
                </div>
              </div>
            )}

            {error && (
              <div className="mt-4 bg-red-50 border border-red-300 text-red-800 rounded p-4">
                {error}
              </div>
            )}

            {report && (
              <div className="space-y-6 mt-2">
                {/* Verdict banner */}
                <div
                  className={`rounded-xl p-5 text-white ${report.overallVerdict === "CASE_RECOMMENDED_FOR_DISMISSAL"
                      ? "bg-red-700"
                      : report.overallVerdict === "VIOLATIONS_FOUND"
                        ? "bg-orange-600"
                        : "bg-green-700"
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">
                      {report.overallVerdict === "CASE_RECOMMENDED_FOR_DISMISSAL"
                        ? "⚖️"
                        : report.overallVerdict === "VIOLATIONS_FOUND"
                          ? "⚠️"
                          : "✅"}
                    </span>
                    <div>
                      <p className="font-bold text-lg">
                        {report.overallVerdict.replace(/_/g, " ")}
                      </p>
                      <p className="text-sm opacity-90">{report.summary}</p>
                    </div>
                    <div className="ml-auto">
                      <RiskBadge level={report.riskLevel} />
                    </div>
                  </div>
                </div>

                {/* Fact Score */}
                <div className="bg-white rounded-xl border p-5 shadow-sm">
                  <h2 className="text-lg font-semibold mb-3 text-gray-900">
                    Factual Evidence Score
                  </h2>
                  <div className="flex items-center gap-4 mb-3">
                    <div className="flex-1 bg-gray-200 rounded-full h-4">
                      <div
                        className={`h-4 rounded-full transition-all duration-500 ${report.factScore.factualScore >= 70
                            ? "bg-green-500"
                            : report.factScore.factualScore >= 50
                              ? "bg-yellow-500"
                              : "bg-red-500"
                          }`}
                        style={{ width: `${report.factScore.factualScore}%` }}
                      />
                    </div>
                    <span className="text-xl font-bold text-gray-800">
                      {report.factScore.factualScore}/100
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-4 text-sm text-center">
                    <div>
                      <div className="text-2xl font-bold text-gray-800">
                        {report.factScore.totalEvidence}
                      </div>
                      <div className="text-gray-500">Total Evidence</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-700">
                        {report.factScore.authenticatedEvidence}
                      </div>
                      <div className="text-gray-500">Authenticated</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-blue-700">
                        {report.factScore.exculpatoryEvidence}
                      </div>
                      <div className="text-gray-500">Exculpatory</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-red-700">
                        {report.factScore.weakChargeIds.length}
                      </div>
                      <div className="text-gray-500">Unsupported Charges</div>
                    </div>
                  </div>
                  {report.factScore.emotionalLanguageFlags.length > 0 && (
                    <div className="mt-3 bg-yellow-50 border border-yellow-300 rounded p-3">
                      <p className="text-sm font-semibold text-yellow-800 mb-1">
                        Emotional / inflammatory language detected in prosecution narrative:
                      </p>
                      <ul className="list-disc list-inside text-sm text-yellow-700">
                        {report.factScore.emotionalLanguageFlags.map((f, i) => (
                          <li key={i}>"{f}" — prejudicial, non-factual characterization</li>
                        ))}
                      </ul>
                      <p className="text-xs text-yellow-600 mt-2 italic">
                        Courts must rely on facts and evidence, not emotional language designed to inflame
                        bias or create vendettas against defendants.
                      </p>
                    </div>
                  )}
                </div>

                {/* Charge Violations */}
                {report.chargeViolations.length > 0 && (
                  <div>
                    <h2 className="text-lg font-semibold mb-3 text-gray-900">
                      Constitutional & Procedural Violations ({report.chargeViolations.length})
                    </h2>
                    {report.chargeViolations.map((v, i) => (
                      <ViolationCard key={i} v={v} />
                    ))}
                  </div>
                )}

                {/* Representation Audit */}
                {report.representationAudit && (
                  <div className="bg-white rounded-xl border p-5 shadow-sm">
                    <h2 className="text-lg font-semibold mb-3 text-gray-900">
                      Representation Audit — {report.representationAudit.attorneyName}
                    </h2>
                    <div className="flex items-center gap-3 mb-3">
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-semibold ${report.representationAudit.overallRating === "ADEQUATE"
                            ? "bg-green-100 text-green-800"
                            : report.representationAudit.overallRating === "DEFICIENT"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                          }`}
                      >
                        {report.representationAudit.overallRating}
                      </span>
                      {report.representationAudit.ineffectiveAssistanceFlag && (
                        <span className="px-3 py-1 rounded-full text-sm font-semibold bg-red-700 text-white">
                          Strickland Ineffective Assistance Flag
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-center mb-3">
                      <div>
                        <div className="text-2xl font-bold text-gray-800">{report.representationAudit.motionsFiledCount}</div>
                        <div className="text-xs text-gray-500">Motions Filed</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-gray-800">{report.representationAudit.discoveryRequestsCount}</div>
                        <div className="text-xs text-gray-500">Discovery Requests</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-red-700">{report.representationAudit.missedDeadlines}</div>
                        <div className="text-xs text-gray-500">Missed Deadlines</div>
                      </div>
                    </div>
                    {report.representationAudit.failures.length > 0 && (
                      <ul className="list-disc list-inside text-sm text-red-700 mb-3">
                        {report.representationAudit.failures.map((f, i) => (
                          <li key={i}>{f.replace(/_/g, " ")}</li>
                        ))}
                      </ul>
                    )}
                    <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-800">
                      <span className="font-semibold">Remedy: </span>
                      {report.representationAudit.recommendedRemedy}
                    </div>
                  </div>
                )}

                {/* Loophole Detection */}
                {report.loopholeSummary && (
                  <LoopholePanel summary={report.loopholeSummary} />
                )}

                {/* Recommended Actions */}
                <div className="bg-white rounded-xl border p-5 shadow-sm">
                  <h2 className="text-lg font-semibold mb-3 text-gray-900">
                    Recommended Actions
                  </h2>
                  <ol className="list-decimal list-inside space-y-2">
                    {report.recommendedActions.map((a, i) => (
                      <li key={i} className="text-sm text-gray-800">
                        {a}
                      </li>
                    ))}
                  </ol>
                </div>

                {/* Transparency Ledger */}
                <div className="bg-white rounded-xl border p-5 shadow-sm">
                  <h2 className="text-lg font-semibold mb-3 text-gray-900">
                    Immutable Transparency Ledger ({report.transparencyEvents.length} events)
                  </h2>
                  <p className="text-xs text-gray-400 mb-3">
                    SHA-256 hash-chained event log — tamper-proof, publicly verifiable, nothing can be hidden
                  </p>
                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {report.transparencyEvents.map((e) => (
                      <div
                        key={e.id}
                        className="text-xs border rounded p-2 bg-gray-50 font-mono"
                      >
                        <span className="text-blue-700 font-semibold">[{e.eventType}]</span>{" "}
                        <span className="text-gray-400">{e.timestamp}</span>
                        <br />
                        {e.description}
                        <br />
                        <span className="text-gray-400">hash: {e.immutableHash.slice(0, 32)}…</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Disclaimer */}
                <div className="bg-gray-100 rounded-xl p-4 text-xs text-gray-500">
                  <p className="font-semibold mb-1">Transparency Disclaimer</p>
                  <p>
                    This analysis is generated by an automated judicial transparency engine. It identifies
                    potential constitutional violations (charge stacking, railroading, Brady violations,
                    emotional/vendetta-driven prosecution, ineffective counsel) for human review. It does
                    not constitute legal advice. All findings are based on the evidence and facts
                    presented — nothing hidden, nothing fabricated.
                  </p>
                </div>

                <button
                  onClick={() => setReport(null)}
                  className="text-sm text-gray-500 hover:text-gray-800 underline"
                >
                  Reset Analysis
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

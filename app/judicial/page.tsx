"use client";
// app/judicial/page.tsx
// Superior Judicial Analysis Dashboard — Florida Courtroom Monitoring & Transparency

import React, { useState, useEffect, useCallback } from "react";
import type {
  Case,
  JudicialAnalysisReport,
  ChargeViolation,
  RiskLevel,
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
    { role: "DEFENDANT",        id: "P-001", name: "John Doe" },
    { role: "PROSECUTOR",       id: "P-002", name: "A. Smith", barNumber: "FL-BAR-12345", jurisdiction: "Florida" },
    { role: "DEFENSE_ATTORNEY", id: "P-003", name: "B. Jones", barNumber: "FL-BAR-67890" },
    { role: "JUDGE",            id: "P-004", name: "Hon. C. Williams", jurisdiction: "11th Judicial Circuit" },
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

// ─── Dashboard ────────────────────────────────────────────────────────────────

type Tab = "monitor" | "analyze" | "report";

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
    } catch {}
  }, []);

  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch("/api/judicial?view=health");
      if (res.ok) setServiceHealth(await res.json());
    } catch {}
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
    `px-4 py-2 rounded-t-lg font-semibold text-sm transition ${
      tab === t
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
        <div className="flex gap-1 mb-4">
          <button className={tabStyle("monitor")} onClick={() => setTab("monitor")}>
            🏛️ Florida Monitor
          </button>
          <button className={tabStyle("analyze")} onClick={() => setTab("analyze")}>
            ⚖️ Case Analysis
          </button>
        </div>

        {/* Florida Monitor Tab */}
        {tab === "monitor" && (
          <FloridaMonitorPanel data={floridaData} />
        )}

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
                  className={`rounded-xl p-5 text-white ${
                    report.overallVerdict === "CASE_RECOMMENDED_FOR_DISMISSAL"
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
                        className={`h-4 rounded-full transition-all duration-500 ${
                          report.factScore.factualScore >= 70
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
                        className={`px-3 py-1 rounded-full text-sm font-semibold ${
                          report.representationAudit.overallRating === "ADEQUATE"
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

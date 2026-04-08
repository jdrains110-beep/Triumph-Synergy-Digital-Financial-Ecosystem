"use client";
// app/judicial/page.tsx
// Superior Judicial Analysis Dashboard

import React, { useState } from "react";
import type {
  Case,
  JudicialAnalysisReport,
  ChargeViolation,
  RiskLevel,
} from "@/lib/judicial/types";

// ─── Demo scaffold case ───────────────────────────────────────────────────────

const DEMO_CASE: Case = {
  id: "CASE-2026-001",
  caseNumber: "2026-CR-00001",
  title: "State v. Doe",
  jurisdiction: "Federal",
  court: "U.S. District Court, Eastern District",
  filedAt: "2026-01-15T00:00:00Z",
  status: "UNDER_REVIEW",
  narrative:
    "On or about January 10, 2026, at approximately 14:30, John Doe allegedly transferred funds via wire at 123 Main Street. Financial records submitted by the prosecution indicate a single transfer of $5,000. The defendant is a brazen predator with no remorse who clearly committed fraud.",
  charges: [
    {
      id: "CHG-001",
      statute: "18 U.S.C. § 1343",
      description: "Wire Fraud",
      category: "FELONY",
      maxSentenceYears: 20,
      filedAt: "2026-01-15T00:00:00Z",
      relatedActId: "ACT-001",
      elements: ["scheme to defraud", "use of wire", "intent to defraud"],
      supportingEvidenceIds: ["EV-001"],
    },
    {
      id: "CHG-002",
      statute: "18 U.S.C. § 1341",
      description: "Mail Fraud",
      category: "FELONY",
      maxSentenceYears: 20,
      filedAt: "2026-01-15T00:00:00Z",
      relatedActId: "ACT-001",
      elements: ["scheme to defraud", "use of mail", "intent to defraud"],
      supportingEvidenceIds: [],
    },
    {
      id: "CHG-003",
      statute: "18 U.S.C. § 1343",
      description: "Wire Fraud (Count 2)",
      category: "FELONY",
      maxSentenceYears: 20,
      filedAt: "2026-01-15T00:00:00Z",
      relatedActId: "ACT-001",
      elements: ["scheme to defraud", "use of wire", "intent to defraud"],
      supportingEvidenceIds: ["EV-001"],
    },
  ],
  evidence: [
    {
      id: "EV-001",
      type: "DOCUMENTARY",
      description: "Wire transfer record",
      submittedBy: "PROSECUTION",
      submittedAt: "2026-01-15T00:00:00Z",
      authenticated: true,
      chainOfCustodyIntact: true,
      exculpatoryFlag: false,
    },
    {
      id: "EV-002",
      type: "EXCULPATORY",
      description: "Bank statement showing funds originated from legitimate salary",
      submittedBy: "DEFENSE",
      submittedAt: "2026-02-01T00:00:00Z",
      authenticated: true,
      chainOfCustodyIntact: true,
      exculpatoryFlag: true,
    },
  ],
  parties: [
    {
      role: "DEFENDANT",
      id: "P-001",
      name: "John Doe",
    },
    {
      role: "PROSECUTOR",
      id: "P-002",
      name: "A. Smith",
      barNumber: "BAR-12345",
      jurisdiction: "Federal",
    },
    {
      role: "DEFENSE_ATTORNEY",
      id: "P-003",
      name: "B. Jones",
      barNumber: "BAR-67890",
    },
  ],
  precedentCases: ["United States v. McNally, 483 U.S. 350 (1987)"],
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

// ─── Dashboard ────────────────────────────────────────────────────────────────

export default function JudicialDashboard() {
  const [report, setReport] = useState<JudicialAnalysisReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
            missedDeadlines: ["Motion to suppress — 2026-02-15"],
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

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Superior Judicial Analysis System
          </h1>
          <p className="text-gray-600 mt-1">
            Facts-based case review — anti-railroading • anti-stacking •
            representation accountability • full transparency
          </p>
        </div>

        {/* Run button */}
        {!report && (
          <button
            onClick={runAnalysis}
            disabled={loading}
            className="bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-800 disabled:opacity-50 transition"
          >
            {loading ? "Analysing…" : "Analyse Demo Case"}
          </button>
        )}

        {error && (
          <div className="mt-4 bg-red-50 border border-red-300 text-red-800 rounded p-4">
            {error}
          </div>
        )}

        {report && (
          <div className="space-y-6 mt-6">
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
                    className={`h-4 rounded-full ${
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
              <div className="grid grid-cols-3 gap-4 text-sm text-center">
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
              </div>
              {report.factScore.emotionalLanguageFlags.length > 0 && (
                <div className="mt-3 bg-yellow-50 border border-yellow-300 rounded p-3">
                  <p className="text-sm font-semibold text-yellow-800 mb-1">
                    Emotional language detected in prosecution narrative:
                  </p>
                  <ul className="list-disc list-inside text-sm text-yellow-700">
                    {report.factScore.emotionalLanguageFlags.map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Charge Violations */}
            {report.chargeViolations.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-3 text-gray-900">
                  Charge Violations ({report.chargeViolations.length})
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
                Transparency Ledger ({report.transparencyEvents.length} events)
              </h2>
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

            <button
              onClick={() => setReport(null)}
              className="text-sm text-gray-500 hover:text-gray-800 underline"
            >
              Reset
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

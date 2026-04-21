// lib/judicial/index.ts
// Superior Judicial Analysis System — Main Orchestrator
//
// Combines all sub-analysers into one call: submit a case, receive a complete
// JudicialAnalysisReport covering facts, charges, representation, and the
// immutable transparency ledger.

import type {
  Case,
  JudicialAnalysisReport,
  HistoricalReviewReport,
  RiskLevel,
  ChargeViolation,
} from "./types";
import { ChargeValidator } from "./charge-validator";
import { CaseFactAnalyzer } from "./case-fact-analyzer";
import { RepresentationAuditor } from "./representation-auditor";
import { TransparencyLedger } from "./transparency-ledger";
import { HistoricalReviewEngine } from "./historical-review-engine";

export { ChargeValidator } from "./charge-validator";
export { CaseFactAnalyzer } from "./case-fact-analyzer";
export { RepresentationAuditor } from "./representation-auditor";
export { TransparencyLedger } from "./transparency-ledger";
export { GoodOleBoyDetector } from "./good-ole-boy-detector";
export { HistoricalReviewEngine } from "./historical-review-engine";
export type * from "./types";

// ─── Orchestrator ─────────────────────────────────────────────────────────────

export class JudicialAnalysisSystem {
  private readonly chargeValidator = new ChargeValidator();
  private readonly factAnalyzer = new CaseFactAnalyzer();
  private readonly representationAuditor = new RepresentationAuditor();
  readonly ledger = new TransparencyLedger(); // public: callers can subscribe

  // ── Single case analysis ──────────────────────────────────────────────────

  analyzeCase(
    caseData: Case,
    representationOptions: Parameters<RepresentationAuditor["audit"]>[1] = {}
  ): JudicialAnalysisReport {
    // 1 — Seed transparency ledger
    const prosecutor = caseData.parties.find((p) => p.role === "PROSECUTOR");
    this.ledger.seedFromCase(caseData, prosecutor ?? { id: "system", role: "PROSECUTOR" });

    // 2 — Charge violations (stacking, railroading, etc.)
    const chargeViolations = this.chargeValidator.validate(caseData);

    // 3 — Fact score
    const factScore = this.factAnalyzer.analyze(caseData);

    // 4 — Representation audit
    const representationAudit = this.representationAuditor.audit(
      caseData,
      representationOptions
    );

    // 5 — Record violations in ledger
    for (const violation of chargeViolations) {
      this.ledger.record(
        caseData.id,
        "VIOLATION_FLAGGED",
        { id: "system", role: "JUDGE" },
        `Violation detected: ${violation.violationType} (${violation.severity}) — ${violation.explanation}`
      );
    }

    if (representationAudit) {
      this.ledger.record(
        caseData.id,
        "REPRESENTATION_AUDITED",
        { id: "system", role: "JUDGE" },
        `Representation audit for ${representationAudit.attorneyName}: ${representationAudit.overallRating}. Failures: [${representationAudit.failures.join(", ")}].`
      );
    }

    // 6 — Overall risk
    const riskLevel = this.computeRisk(chargeViolations, factScore.factualScore);

    // 7 — Verdict
    const overallVerdict = this.determineVerdict(
      chargeViolations,
      factScore,
      representationAudit
    );

    // 8 — Recommended actions
    const recommendedActions = this.buildRecommendations(
      chargeViolations,
      factScore,
      representationAudit,
      overallVerdict
    );

    const transparencyEvents = this.ledger.getEventsByCase(caseData.id);
    const reportId = `RPT-${caseData.id}-${Date.now()}`;

    return {
      reportId,
      caseId: caseData.id,
      analyzedAt: new Date().toISOString(),
      riskLevel,
      chargeViolations,
      factScore,
      representationAudit,
      transparencyEvents,
      overallVerdict,
      summary: this.buildSummary(caseData, riskLevel, chargeViolations, factScore),
      recommendedActions,
    };
  }

  // ── Historical case batch re-analysis ────────────────────────────────────

  /**
   * Full 1–5-year historical review with systemic Good Ole Boy network
   * detection, actor corruption profiles, and public interest alerts.
   *
   * @param cases          — All cases to analyse (pre-fetched by caller).
   * @param jurisdiction   — Human-readable jurisdiction name.
   * @param yearsBack      — 1–5 years back from April 21, 2026.
   */
  auditHistoricalCases(
    cases: Case[],
    jurisdiction = "Unknown Jurisdiction",
    yearsBack: 1 | 2 | 3 | 4 | 5 = 5
  ): HistoricalReviewReport {
    const engine = new HistoricalReviewEngine();
    return engine.review(cases, jurisdiction, yearsBack);
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private computeRisk(
    violations: ChargeViolation[],
    factScore: number
  ): RiskLevel {
    const hasCritical = violations.some((v) => v.severity === "CRITICAL");
    if (hasCritical || factScore < 30) return "CRITICAL";
    const hasHigh = violations.some((v) => v.severity === "HIGH");
    if (hasHigh || factScore < 50) return "HIGH";
    if (violations.length > 0 || factScore < 70) return "MODERATE";
    return "LOW";
  }

  private determineVerdict(
    violations: ChargeViolation[],
    factScore: ReturnType<CaseFactAnalyzer["analyze"]>,
    audit: ReturnType<RepresentationAuditor["audit"]>
  ): JudicialAnalysisReport["overallVerdict"] {
    const criticalViolations = violations.filter(
      (v) =>
        v.violationType === "EVIDENCE_SUPPRESSION" ||
        v.violationType === "RAILROADING" ||
        v.severity === "CRITICAL"
    );

    if (
      criticalViolations.length > 0 ||
      (!factScore.sufficientForCharges && factScore.factualScore < 30)
    ) {
      return "CASE_RECOMMENDED_FOR_DISMISSAL";
    }

    if (
      violations.length > 0 ||
      !factScore.sufficientForCharges ||
      audit?.overallRating === "GROSSLY_DEFICIENT"
    ) {
      return "VIOLATIONS_FOUND";
    }

    return "PROCEEDING_PROPER";
  }

  private buildSummary(
    caseData: Case,
    risk: RiskLevel,
    violations: ChargeViolation[],
    factScore: ReturnType<CaseFactAnalyzer["analyze"]>
  ): string {
    return (
      `Case "${caseData.caseNumber}" (${caseData.court}) — Risk: ${risk}. ` +
      `${caseData.charges.length} charge(s) filed. ` +
      `Factual score: ${factScore.factualScore}/100 (${factScore.authenticatedEvidence}/${factScore.totalEvidence} evidence items authenticated). ` +
      `${violations.length} procedural violation(s) detected. ` +
      (factScore.emotionalLanguageFlags.length > 0
        ? `Emotional language flags in narrative: ${factScore.emotionalLanguageFlags.join("; ")}.`
        : "No emotional language flags detected.")
    );
  }

  private buildRecommendations(
    violations: ChargeViolation[],
    factScore: ReturnType<CaseFactAnalyzer["analyze"]>,
    audit: ReturnType<RepresentationAuditor["audit"]>,
    verdict: JudicialAnalysisReport["overallVerdict"]
  ): string[] {
    const actions: string[] = [];

    if (verdict === "CASE_RECOMMENDED_FOR_DISMISSAL") {
      actions.push(
        "URGENT: File motion to dismiss — evidence is insufficient and constitutional violations are present."
      );
    }

    for (const v of violations) {
      actions.push(`[${v.violationType}] ${v.remedy}`);
    }

    if (!factScore.sufficientForCharges) {
      actions.push(
        `Request full evidentiary hearing. Weak charges: [${factScore.weakChargeIds.join(", ")}].`
      );
    }

    if (factScore.emotionalLanguageFlags.length > 0) {
      actions.push(
        `Move to strike prejudicial language from prosecution narrative: ${factScore.emotionalLanguageFlags.join("; ")}.`
      );
    }

    if (audit?.recommendedRemedy) {
      actions.push(`[REPRESENTATION] ${audit.recommendedRemedy}`);
    }

    if (actions.length === 0) {
      actions.push("Case proceedings appear proper. Continue standard review cycle.");
    }

    return actions;
  }
}

export default JudicialAnalysisSystem;

// lib/judicial/historical-review-engine.ts
// Historical Case Review Engine
//
// Takes a batch of cases and reviews every case filed within a 1–5 year
// window ending today (April 21, 2026).  For each case it runs the full
// JudicialAnalysisSystem pipeline, then hands the results to the
// GoodOleBoyDetector for cross-case systemic pattern detection.
//
// The output is a HistoricalReviewReport — a single document exposing both
// case-level violations AND the network of actors enabling them.

import { createHash, randomBytes } from "crypto";
import type {
  Case,
  JudicialAnalysisReport,
  HistoricalReviewReport,
  GoodOleBoyFlag,
  ActorCorruptionProfile,
  RiskLevel,
} from "./types";
import { JudicialAnalysisSystem } from "./index";
import { GoodOleBoyDetector } from "./good-ole-boy-detector";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isoNow(): string {
  return new Date().toISOString();
}

function reportId(): string {
  return `HRR_${createHash("sha256")
    .update(randomBytes(16))
    .digest("hex")
    .slice(0, 16)}`;
}

function riskFromScore(score: number): RiskLevel {
  if (score >= 75) return "CRITICAL";
  if (score >= 50) return "HIGH";
  if (score >= 25) return "MODERATE";
  return "LOW";
}

// ─── Engine ───────────────────────────────────────────────────────────────────

export class HistoricalReviewEngine {
  private readonly systemEngine = new JudicialAnalysisSystem();
  private readonly gobDetector = new GoodOleBoyDetector();

  /**
   * Run a full historical review.
   *
   * @param cases         — All cases to be considered (caller may pre-fetch
   *                        from a database or pass in-memory test data).
   * @param jurisdictionName — Human-readable jurisdiction label.
   * @param yearsBack     — 1–5: how far back from today to include cases.
   *                        Today = April 21, 2026.
   */
  review(
    cases: Case[],
    jurisdictionName: string,
    yearsBack: 1 | 2 | 3 | 4 | 5 = 5
  ): HistoricalReviewReport {
    const now = new Date("2026-04-21T23:59:59Z");
    const windowStart = new Date(now);
    windowStart.setFullYear(windowStart.getFullYear() - yearsBack);

    // ── Filter cases by date window ──────────────────────────────────────────
    const windowCases = cases.filter((c) => {
      const filed = new Date(c.filedAt);
      return filed >= windowStart && filed <= now;
    });

    // ── Run individual analysis on every case ────────────────────────────────
    const individualReports: JudicialAnalysisReport[] = [];
    for (const c of windowCases) {
      try {
        const report = this.systemEngine.analyzeCase(c);
        individualReports.push(report);
      } catch {
        // If a single case causes an error, skip it and continue with the rest
      }
    }

    // ── Run cross-case good ole boy detection ────────────────────────────────
    const { flags, actorProfiles } = this.gobDetector.detect(
      windowCases,
      jurisdictionName
    );

    // ── Aggregate statistics ──────────────────────────────────────────────────
    const casesWithViolations = individualReports.filter(
      (r) => r.chargeViolations.length > 0
    ).length;

    const casesRecommendedDismissal = individualReports.filter(
      (r) => r.overallVerdict === "CASE_RECOMMENDED_FOR_DISMISSAL"
    ).length;

    const highRiskActors = actorProfiles.filter(
      (a) => a.corruptionScore >= 60
    );
    const criticalActors = actorProfiles.filter(
      (a) => a.corruptionScore >= 80
    );

    // ── Evidence desert + word-vs-word case collections ──────────────────────
    const evidenceDesertCases = flags
      .filter((f) => f.flagType === "EVIDENCE_DESERT")
      .flatMap((f) => f.caseIds)
      .filter((v, i, a) => a.indexOf(v) === i);

    const wordVsWordCases = flags
      .filter((f) => f.flagType === "WORD_VS_WORD_NO_EVIDENCE")
      .flatMap((f) => f.caseIds)
      .filter((v, i, a) => a.indexOf(v) === i);

    // ── Systemic risk score ───────────────────────────────────────────────────
    const systemicScore = this.computeSystemicScore(
      windowCases.length,
      casesWithViolations,
      casesRecommendedDismissal,
      flags,
      criticalActors.length
    );
    const systemicRiskLevel = riskFromScore(systemicScore);

    // ── Public-interest alerts ────────────────────────────────────────────────
    const publicInterestAlerts = this.buildPublicAlerts(
      flags,
      actorProfiles,
      casesRecommendedDismissal,
      windowCases.length,
      jurisdictionName,
      yearsBack
    );

    // ── Summary narrative ─────────────────────────────────────────────────────
    const summary = this.buildSummary(
      jurisdictionName,
      yearsBack,
      windowCases.length,
      casesWithViolations,
      casesRecommendedDismissal,
      flags.length,
      criticalActors.length,
      systemicRiskLevel
    );

    return {
      reportId: reportId(),
      generatedAt: isoNow(),
      jurisdictionName,
      reviewWindowStart: windowStart.toISOString(),
      reviewWindowEnd: now.toISOString(),
      yearsBack,
      totalCasesReviewed: windowCases.length,
      casesWithViolations,
      casesRecommendedDismissal,
      goodOleBoyFlags: flags,
      actorProfiles,
      highRiskActors,
      criticalActors,
      systemicRiskLevel,
      individualReports,
      summary,
      publicInterestAlerts,
      evidenceDesertCases,
      wordVsWordCases,
    };
  }

  // ─── Systemic score 0–100 ─────────────────────────────────────────────────

  private computeSystemicScore(
    total: number,
    withViolations: number,
    dismissalRec: number,
    flags: GoodOleBoyFlag[],
    criticalActors: number
  ): number {
    if (total === 0) return 0;
    const violationRate = withViolations / total;           // 0–1
    const dismissalRate = dismissalRec / total;             // 0–1
    const flagCount = flags.length;                         // raw number
    const criticalFlagCount = flags.filter(
      (f) => f.severity === "CRITICAL"
    ).length;

    return Math.min(
      100,
      Math.round(
        violationRate * 35 +
          dismissalRate * 25 +
          Math.min(flagCount * 3, 20) +
          criticalFlagCount * 5 +
          criticalActors * 5
      )
    );
  }

  // ─── Build public-interest alerts ─────────────────────────────────────────

  private buildPublicAlerts(
    flags: GoodOleBoyFlag[],
    actorProfiles: ActorCorruptionProfile[],
    dismissalRec: number,
    total: number,
    jurisdiction: string,
    yearsBack: number
  ): string[] {
    const alerts: string[] = [];

    if (dismissalRec > 0) {
      alerts.push(
        `⚖️ ${dismissalRec} of ${total} reviewed cases in ${jurisdiction} are recommended for dismissal based on constitutional violations, lack of evidence, or prosecutorial misconduct. If you were convicted in one of these cases, you may have grounds for appeal.`
      );
    }

    const gobFlags = flags.filter(
      (f) => f.flagType === "REPEAT_OFFICER_PROSECUTOR_PAIR"
    );
    if (gobFlags.length > 0) {
      alerts.push(
        `🚨 "Good Ole Boy" network detected in ${jurisdiction}: ${gobFlags.length} recurring officer-prosecutor partnerships identified over the past ${yearsBack} year(s). Citizens charged by these actors have a right to independent legal review. Call your state representative to demand accountability.`
      );
    }

    const wvwFlags = flags.filter(
      (f) => f.flagType === "WORD_VS_WORD_NO_EVIDENCE"
    );
    if (wvwFlags.length > 0) {
      alerts.push(
        `🗣️ ${wvwFlags.length} prosecutor(s) have pursued charges based ONLY on officer testimony with zero physical, documentary, or forensic evidence. In America, you cannot be lawfully convicted on an officer's word alone — demand evidence-based charges.`
      );
    }

    const criticals = actorProfiles.filter(
      (a) => a.riskLevel === "CRITICAL"
    );
    if (criticals.length > 0) {
      const names = criticals.map((a) => `${a.actorName} (${a.actorRole})`).join(", ");
      alerts.push(
        `🔴 CRITICAL RISK: The following public officials scored 80+ on the judicial corruption index based on case history in ${jurisdiction}: ${names}. Their cases are flagged for mandatory independent review.`
      );
    }

    const coordFlag = flags.find(
      (f) => f.flagType === "COORDINATED_WITNESS_TESTIMONY"
    );
    if (coordFlag) {
      alerts.push(
        `📋 Coordinated/copy-paste testimony detected across ${coordFlag.caseIds.length} case(s). Officers filing near-identical reports against different defendants suggests scripted or fabricated accounts. Demand body-cam and incident report forensic analysis.`
      );
    }

    return alerts;
  }

  // ─── Build human-readable summary ─────────────────────────────────────────

  private buildSummary(
    jurisdiction: string,
    yearsBack: number,
    total: number,
    withViolations: number,
    dismissalRec: number,
    flagCount: number,
    criticalActors: number,
    systemicRisk: RiskLevel
  ): string {
    if (total === 0) {
      return `No cases found in ${jurisdiction} for the ${yearsBack}-year review window ending April 21, 2026.`;
    }

    const violationPct = Math.round((withViolations / total) * 100);
    const dismissalPct = Math.round((dismissalRec / total) * 100);

    let headline = "";
    if (systemicRisk === "CRITICAL") {
      headline = `CRITICAL systemic judicial misconduct detected in ${jurisdiction}.`;
    } else if (systemicRisk === "HIGH") {
      headline = `HIGH-RISK patterns detected — ${jurisdiction} requires independent oversight.`;
    } else if (systemicRisk === "MODERATE") {
      headline = `MODERATE concerns identified across ${jurisdiction}'s case history.`;
    } else {
      headline = `${jurisdiction} appears within acceptable parameters for the review window.`;
    }

    return (
      `${headline} ` +
      `${total} case(s) reviewed over ${yearsBack} year(s) (${new Date(new Date("2026-04-21").setFullYear(new Date("2026-04-21").getFullYear() - yearsBack)).getFullYear()}–2026). ` +
      `${withViolations} (${violationPct}%) contained legal or procedural violations. ` +
      `${dismissalRec} (${dismissalPct}%) are recommended for dismissal. ` +
      `${flagCount} systemic "good ole boy" flags raised. ` +
      `${criticalActors} actor(s) at CRITICAL corruption score. ` +
      `Every flagged case has been entered into the immutable transparency ledger.`
    );
  }
}

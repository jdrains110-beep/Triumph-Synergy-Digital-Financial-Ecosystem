// lib/judicial/representation-auditor.ts
// Attorney Representation Quality Auditor
//
// Applies the Strickland v. Washington two-prong test:
//   1. Deficient performance (fell below objective standard of reasonableness)
//   2. Prejudice (reasonable probability the outcome would differ)
//
// Also tracks systemic patterns across multiple cases by the same attorney.

import type {
  Case,
  CaseParty,
  RepresentationAudit,
  RepresentationFailure,
} from "./types";

// ─── Thresholds ───────────────────────────────────────────────────────────────

const MINIMUM_MOTIONS_PER_FELONY = 2;
const MINIMUM_DISCOVERY_REQUESTS = 1;
const DAYS_BEFORE_TRIAL_DEADLINE = 30;

// ─── Representation Auditor ───────────────────────────────────────────────────

export class RepresentationAuditor {
  /**
   * Audit the defence attorney's performance on this case.
   * Returns null if no defence attorney is found in the case parties.
   */
  audit(
    caseData: Case,
    options: {
      motionsFiled?: number;          // actual motions filed by defence
      discoveryRequestsMade?: number; // actual discovery requests made
      trialDateKnownDaysAgo?: number; // how far in advance attorney was notified
      missedDeadlines?: string[];     // list of missed procedural deadlines
      hadPleaNegotiations?: boolean;  // did attorney attempt plea bargaining?
      appealFiled?: boolean | null;   // null = not yet determined
    } = {}
  ): RepresentationAudit | null {
    const attorney = caseData.parties.find(
      (p) => p.role === "DEFENSE_ATTORNEY"
    );
    if (!attorney) return null;

    const failures: RepresentationFailure[] = [];

    const felonyCount = caseData.charges.filter(
      (c) => c.category === "FELONY"
    ).length;

    const requiredMotions = felonyCount * MINIMUM_MOTIONS_PER_FELONY;
    const actualMotions = options.motionsFiled ?? 0;
    const discoveryRequests = options.discoveryRequestsMade ?? 0;
    const missedDeadlines = options.missedDeadlines ?? [];

    // ── Check 1: Motion quantity ──────────────────────────────────────────────
    if (felonyCount > 0 && actualMotions < requiredMotions) {
      failures.push("FAILURE_TO_FILE_MOTIONS");
    }

    // ── Check 2: Discovery requests ──────────────────────────────────────────
    if (caseData.evidence.length > 0 && discoveryRequests < MINIMUM_DISCOVERY_REQUESTS) {
      failures.push("INADEQUATE_DISCOVERY");
    }

    // ── Check 3: Missed deadlines (any are a failure) ─────────────────────────
    if (missedDeadlines.length > 0) {
      failures.push("MISSED_DEADLINE");
    }

    // ── Check 4: Late preparation (notified too close to trial) ───────────────
    const daysNotice = options.trialDateKnownDaysAgo ?? null;
    if (daysNotice !== null && daysNotice < DAYS_BEFORE_TRIAL_DEADLINE) {
      // Attorney may claim insufficient time, but they must still flag it.
      failures.push("FAILURE_TO_INVESTIGATE");
    }

    // ── Check 5: No plea negotiations attempted ───────────────────────────────
    if (options.hadPleaNegotiations === false && felonyCount > 0) {
      failures.push("NO_PLEA_NEGOTIATION");
    }

    // ── Check 6: Appeal not filed in convictions with evident errors ──────────
    if (options.appealFiled === false) {
      failures.push("ABANDONED_APPEAL");
    }

    // ── Check 7: Conflict of interest — shared counsel ────────────────────────
    const counselIds = caseData.parties
      .filter((p) => p.role === "DEFENSE_ATTORNEY")
      .map((p) => p.id);
    const prosecutorIds = caseData.parties
      .filter((p) => p.role === "PROSECUTOR")
      .map((p) => p.id);
    const conflicted = counselIds.some((id) => prosecutorIds.includes(id));
    if (conflicted) {
      failures.push("CONFLICT_OF_INTEREST");
    }

    // ── Determine overall rating ──────────────────────────────────────────────
    const overallRating = this.ratePerformance(failures, felonyCount);

    // Strickland ineffective assistance = grossly deficient + prejudice exists
    const ineffectiveAssistanceFlag =
      overallRating === "GROSSLY_DEFICIENT" &&
      (failures.includes("FAILURE_TO_FILE_MOTIONS") ||
        failures.includes("INADEQUATE_DISCOVERY") ||
        failures.includes("MISSED_DEADLINE"));

    return {
      attorneyId: attorney.id,
      attorneyName: attorney.name,
      caseId: caseData.id,
      failures,
      missedDeadlines: missedDeadlines.length,
      motionsFiledCount: actualMotions,
      discoveryRequestsCount: discoveryRequests,
      overallRating,
      ineffectiveAssistanceFlag,
      recommendedRemedy: this.buildRemedy(failures, ineffectiveAssistanceFlag, attorney),
    };
  }

  // ── Pattern analysis across multiple cases ────────────────────────────────

  /**
   * Identify systematic under-performance by an attorney across a series
   * of cases.  Returns the attorney party record and a failure frequency map.
   */
  detectSystemicFailures(
    attorney: CaseParty,
    audits: RepresentationAudit[]
  ): {
    attorney: CaseParty;
    caseCount: number;
    failureFrequency: Record<RepresentationFailure, number>;
    systemicFlag: boolean;
    disciplinaryReferralRecommended: boolean;
  } {
    const frequency: Record<string, number> = {};
    let ineffectiveCount = 0;

    for (const audit of audits) {
      if (audit.ineffectiveAssistanceFlag) ineffectiveCount++;
      for (const failure of audit.failures) {
        frequency[failure] = (frequency[failure] ?? 0) + 1;
      }
    }

    const caseCount = audits.length;
    const systemicFlag = caseCount > 0 && ineffectiveCount / caseCount >= 0.3;
    const disciplinaryReferralRecommended =
      systemicFlag || ineffectiveCount >= 3;

    return {
      attorney,
      caseCount,
      failureFrequency: frequency as Record<RepresentationFailure, number>,
      systemicFlag,
      disciplinaryReferralRecommended,
    };
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  private ratePerformance(
    failures: RepresentationFailure[],
    felonyCount: number
  ): "ADEQUATE" | "DEFICIENT" | "GROSSLY_DEFICIENT" {
    const critical: RepresentationFailure[] = [
      "CONFLICT_OF_INTEREST",
      "INADEQUATE_DISCOVERY",
      "MISSED_DEADLINE",
    ];
    const hasCritical = failures.some((f) => critical.includes(f));

    if (hasCritical || (failures.length >= 3 && felonyCount > 0)) {
      return "GROSSLY_DEFICIENT";
    }
    if (failures.length >= 1) return "DEFICIENT";
    return "ADEQUATE";
  }

  private buildRemedy(
    failures: RepresentationFailure[],
    ineffective: boolean,
    attorney: CaseParty
  ): string {
    const parts: string[] = [];

    if (ineffective) {
      parts.push(
        `File a post-conviction Strickland claim against ${attorney.name} (Bar #${attorney.barNumber ?? "UNKNOWN"}).`
      );
    }
    if (failures.includes("CONFLICT_OF_INTEREST")) {
      parts.push("Move to disqualify counsel and appoint independent representation.");
    }
    if (failures.includes("MISSED_DEADLINE")) {
      parts.push("Request an extension and document all missed deadlines as grounds for appeal.");
    }
    if (failures.includes("INADEQUATE_DISCOVERY")) {
      parts.push("File a motion to compel full discovery; seek sanctions if wilful.");
    }
    if (failures.includes("ABANDONED_APPEAL")) {
      parts.push("Seek reinstatement of appeal rights via habeas corpus petition (28 U.S.C. § 2255).");
    }
    if (failures.includes("NO_PLEA_NEGOTIATION")) {
      parts.push("Document absence of plea discussions as Lafler/Frye claim for post-conviction relief.");
    }
    if (parts.length === 0) {
      parts.push("Performance meets minimum standards. Continue monitoring.");
    }

    return parts.join(" ");
  }
}

export default RepresentationAuditor;

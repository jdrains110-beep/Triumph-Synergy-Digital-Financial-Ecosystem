// lib/judicial/charge-validator.ts
// Anti-Stacking & Anti-Railroading Charge Validator
//
// Applies three legal doctrines:
//   1. Double Jeopardy / Multiplicity  — same offense charged multiple times
//   2. Duplicity                       — multiple offenses merged into one count
//   3. Blockburger test                — charges arising from a single act that
//                                        share every element (lesser-included)
//   4. Evidence sufficiency            — each charge must have authenticated
//                                        evidence covering every element
//   5. Proportionality                 — aggregate exposure vs. alleged harm

import type {
  Case,
  Charge,
  ChargeViolation,
  RiskLevel,
} from "./types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function severity(count: number): RiskLevel {
  if (count >= 4) return "CRITICAL";
  if (count >= 2) return "HIGH";
  if (count === 1) return "MODERATE";
  return "LOW";
}

/**
 * Normalise a statute string for comparison:
 * strip spacing/punctuation so "18 U.S.C. §1343" == "18USC1343"
 */
function normaliseStatute(s: string): string {
  return s.replace(/[\s.§,()]/g, "").toUpperCase();
}

/**
 * Determine if two charges arise from the same underlying act.
 * Uses the `relatedActId` field if present; otherwise falls back to
 * checking whether both charges share every element (Blockburger test).
 */
function sameAct(a: Charge, b: Charge): boolean {
  if (a.relatedActId && b.relatedActId && a.relatedActId === b.relatedActId) {
    return true;
  }
  // Blockburger test: if every element of A exists in B's elements,
  // A is a lesser-included offence of B (or vice versa).
  const setA = new Set(a.elements.map((e) => e.toLowerCase().trim()));
  const setB = new Set(b.elements.map((e) => e.toLowerCase().trim()));
  const aSubsetOfB = [...setA].every((el) => setB.has(el));
  const bSubsetOfA = [...setB].every((el) => setA.has(el));
  return aSubsetOfB || bSubsetOfA;
}

// ─── Charge Validator ─────────────────────────────────────────────────────────

export class ChargeValidator {
  /**
   * Run all anti-stacking and anti-railroading checks against a case.
   * Returns an array of ChargeViolation objects — empty means no issues found.
   */
  validate(caseData: Case): ChargeViolation[] {
    const violations: ChargeViolation[] = [];

    violations.push(...this.detectMultiplicity(caseData.charges));
    violations.push(...this.detectChargeStacking(caseData.charges));
    violations.push(...this.detectEvidenceSufficiency(caseData));
    violations.push(...this.detectProcedureBias(caseData));
    violations.push(...this.detectProportionality(caseData.charges));

    return violations;
  }

  // ── 1. Multiplicity: same statute charged more than once ──────────────────

  private detectMultiplicity(charges: Charge[]): ChargeViolation[] {
    const violations: ChargeViolation[] = [];
    const seen = new Map<string, string[]>(); // normalisedStatute → chargeIds

    for (const charge of charges) {
      const key = normaliseStatute(charge.statute);
      const existing = seen.get(key) ?? [];
      existing.push(charge.id);
      seen.set(key, existing);
    }

    for (const [statute, ids] of seen.entries()) {
      if (ids.length > 1) {
        violations.push({
          violationType: "MULTIPLICITY",
          severity: severity(ids.length - 1),
          affectedChargeIds: ids,
          explanation: `Statute "${statute}" appears ${ids.length} times. Filing the same charge multiple times for a single course of conduct violates the Double Jeopardy Clause (U.S. Const. amend. V) and constitutes multiplicity.`,
          legalBasis: "U.S. Const. amend. V; Fed. R. Crim. P. 12(b)(3)(B)(ii)",
          remedy: `Consolidate into a single count under "${statute}" or clearly delineate distinct acts underlying each charge.`,
        });
      }
    }

    return violations;
  }

  // ── 2. Charge Stacking: multiple charges for the same underlying act ──────

  private detectChargeStacking(charges: Charge[]): ChargeViolation[] {
    const violations: ChargeViolation[] = [];
    const stackGroups: Map<string, Charge[]> = new Map();

    for (let i = 0; i < charges.length; i++) {
      for (let j = i + 1; j < charges.length; j++) {
        const a = charges[i];
        const b = charges[j];
        if (sameAct(a, b)) {
          const key = a.relatedActId ?? `pair_${a.id}_${b.id}`;
          const group = stackGroups.get(key) ?? [];
          if (!group.find((c) => c.id === a.id)) group.push(a);
          if (!group.find((c) => c.id === b.id)) group.push(b);
          stackGroups.set(key, group);
        }
      }
    }

    for (const [actKey, group] of stackGroups.entries()) {
      if (group.length < 2) continue;

      const totalExposureYears = group.reduce(
        (sum, c) => sum + c.maxSentenceYears,
        0
      );

      violations.push({
        violationType: "CHARGE_STACKING",
        severity: severity(group.length),
        affectedChargeIds: group.map((c) => c.id),
        explanation:
          `${group.length} charges (act group "${actKey}") appear to stem from a single underlying act, creating an aggregate maximum sentence of ${totalExposureYears} years. ` +
          `Stacking lesser-included or overlapping offences is a coercive tactic that pressures defendants to waive their right to trial.`,
        legalBasis:
          "Blockburger v. United States, 284 U.S. 299 (1932); Ball v. United States, 470 U.S. 856 (1985)",
        remedy:
          "Prosecution should elect the highest applicable charge and dismiss lesser-included counts, or demonstrate distinct acts for each charge.",
      });
    }

    return violations;
  }

  // ── 3. Evidence Sufficiency per charge ──────────────────────────────────

  private detectEvidenceSufficiency(caseData: Case): ChargeViolation[] {
    const violations: ChargeViolation[] = [];
    const authenticatedIds = new Set(
      caseData.evidence
        .filter((e) => e.authenticated && e.chainOfCustodyIntact)
        .map((e) => e.id)
    );

    for (const charge of caseData.charges) {
      const supported = charge.supportingEvidenceIds.filter((id) =>
        authenticatedIds.has(id)
      );
      const ratio = charge.supportingEvidenceIds.length === 0
        ? 0
        : supported.length / charge.supportingEvidenceIds.length;

      if (ratio < 0.5 || supported.length === 0) {
        violations.push({
          violationType: "RAILROADING",
          severity: supported.length === 0 ? "CRITICAL" : "HIGH",
          affectedChargeIds: [charge.id],
          explanation:
            `Charge "${charge.statute} — ${charge.description}" has ${supported.length} authenticated evidence item(s) out of ${charge.supportingEvidenceIds.length} listed. ` +
            `Pursuing this charge without sufficient authenticated evidence constitutes railroading — using the legal process to coerce rather than to seek truth.`,
          legalBasis:
            "Brady v. Maryland, 373 U.S. 83 (1963); Jackson v. Virginia, 443 U.S. 307 (1979) (sufficiency standard)",
          remedy: `Either produce authenticated evidence covering all elements of "${charge.statute}" or move to dismiss this charge.`,
        });
      }
    }

    return violations;
  }

  // ── 4. Procedural bias indicators ────────────────────────────────────────

  private detectProcedureBias(caseData: Case): ChargeViolation[] {
    const violations: ChargeViolation[] = [];

    // Detect exculpatory evidence that was not used in any charge (Brady risk)
    const exculpatoryUnused = caseData.evidence.filter((e) => {
      if (!e.exculpatoryFlag) return false;
      const usedInAnyCharge = caseData.charges.some((c) =>
        c.supportingEvidenceIds.includes(e.id)
      );
      return !usedInAnyCharge;
    });

    if (exculpatoryUnused.length > 0) {
      violations.push({
        violationType: "EVIDENCE_SUPPRESSION",
        severity: "CRITICAL",
        affectedChargeIds: caseData.charges.map((c) => c.id),
        explanation:
          `${exculpatoryUnused.length} item(s) are flagged as exculpatory (Brady material) but are not referenced in any charge: [${exculpatoryUnused.map((e) => e.id).join(", ")}]. ` +
          `Withholding material exculpatory evidence is a constitutional violation.`,
        legalBasis:
          "Brady v. Maryland, 373 U.S. 83 (1963); Giglio v. United States, 405 U.S. 150 (1972)",
        remedy:
          "Disclose all exculpatory evidence to the defense immediately. Failure to do so warrants case dismissal with prejudice.",
      });
    }

    // Detect charges with no elements defined (vague charging — duplicity risk)
    const vagueCharges = caseData.charges.filter(
      (c) => !c.elements || c.elements.length === 0
    );
    if (vagueCharges.length > 0) {
      violations.push({
        violationType: "DUPLICITY",
        severity: "HIGH",
        affectedChargeIds: vagueCharges.map((c) => c.id),
        explanation:
          `${vagueCharges.length} charge(s) have no defined elements, making it impossible for the defendant to prepare an adequate defence or for a jury to apply a uniform standard.`,
        legalBasis:
          "Fed. R. Crim. P. 7(c)(1); Russell v. United States, 369 U.S. 749 (1962)",
        remedy:
          "Each count must specify the statute, the alleged act, the date, and every element the prosecution must prove beyond a reasonable doubt.",
      });
    }

    return violations;
  }

  // ── 5. Proportionality check ─────────────────────────────────────────────

  private detectProportionality(charges: Charge[]): ChargeViolation[] {
    const violations: ChargeViolation[] = [];
    const totalYears = charges.reduce((s, c) => s + c.maxSentenceYears, 0);
    const felonyCount = charges.filter((c) => c.category === "FELONY").length;

    // Flag cases where aggregate maximum exceeds 50 years for non-violent
    // first-time conduct (heuristic threshold — reviewable by judge)
    if (totalYears > 50 && felonyCount > 3) {
      violations.push({
        violationType: "PROCEDURAL_ABUSE",
        severity: "HIGH",
        affectedChargeIds: charges.filter((c) => c.category === "FELONY").map((c) => c.id),
        explanation:
          `Aggregate maximum sentence across all counts is ${totalYears} years (${felonyCount} felonies). ` +
          `Disproportionate charging is a recognised coercive tactic that induces innocent defendants to plead guilty to avoid catastrophic trial risk.`,
        legalBasis:
          "U.S. Const. amend. VIII (Cruel and Unusual Punishment); Lafler v. Cooper, 566 U.S. 156 (2012)",
        remedy:
          "Review whether each felony count is independently supported by distinct facts and proportionate to the alleged harm.",
      });
    }

    return violations;
  }
}

export default ChargeValidator;

// lib/judicial/loophole-detector.ts
// Legal Loophole Detection Engine
//
// Two-sided analysis:
//
//   DEFENSE loopholes  — Every procedural, constitutional, and evidentiary
//                        escape route the defense can exploit to suppress
//                        evidence, dismiss charges, or win on appeal.
//
//   PROSECUTION loopholes — Every systemic abuse tactic prosecutors use to
//                           coerce pleas, stack exposure, drain resources, and
//                           convict without merit.  Flagging these empowers
//                           defendants to challenge the tactics directly.
//
// All loopholes carry a legal authority citation, clear description, and a
// plain-English "what to do" to put the platform in action immediately.

import { createHash } from "crypto";
import type {
  Case,
  LoopholeReport,
  LoopholeSummary,
  LoopholeType,
  LoopholeCategory,
  RiskLevel,
} from "./types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function lid(caseId: string, type: LoopholeType): string {
  return `LH_${createHash("sha256")
    .update(caseId + type)
    .digest("hex")
    .slice(0, 12)}`;
}

function isoNow(): string {
  return new Date().toISOString();
}

// Approx days since filing
function daysSinceFiling(filedAt: string): number {
  const ms = Date.now() - new Date(filedAt).getTime();
  return Math.floor(ms / 86_400_000);
}

// ─── Speedy Trial windows by charge category ──────────────────────────────────
// Florida Speedy Trial:  F.S. § 3.191 — 175 days (felony), 90 days (misdemeanor)
// Federal:               18 U.S.C. § 3161(c)(1) — 70 days from indictment to trial

const SPEEDY_TRIAL_DAYS: Record<"FELONY" | "MISDEMEANOR" | "INFRACTION" | "CIVIL" | "ADMINISTRATIVE", number> = {
  FELONY: 175,
  MISDEMEANOR: 90,
  INFRACTION: 90,
  CIVIL: 365,
  ADMINISTRATIVE: 365,
};

// ─── Statute of limitations (years) by charge category ───────────────────────
// Florida: F.S. § 775.15 — felony 3 yr general, life/capital = none
// Federal: 18 U.S.C. § 3282 — 5 years general

const SOL_YEARS: Record<"FELONY" | "MISDEMEANOR" | "INFRACTION" | "CIVIL" | "ADMINISTRATIVE", number> = {
  FELONY: 3,
  MISDEMEANOR: 1,
  INFRACTION: 1,
  CIVIL: 4,
  ADMINISTRATIVE: 3,
};

// ─── Main Detector ────────────────────────────────────────────────────────────

export class LoopholeDetector {
  /**
   * Full loophole scan on a single case.
   * Returns a LoopholeSummary with both sides populated.
   */
  detect(caseData: Case): LoopholeSummary {
    const defense: LoopholeReport[] = [];
    const prosecution: LoopholeReport[] = [];

    // ── Defense loopholes ──────────────────────────────────────────────────
    defense.push(...this.checkSpeedyTrial(caseData));
    defense.push(...this.checkStatuteOfLimitations(caseData));
    defense.push(...this.checkFruitOfPoisonousTree(caseData));
    defense.push(...this.checkMirandaViolation(caseData));
    defense.push(...this.checkChainOfCustody(caseData));
    defense.push(...this.checkBradySuppression(caseData));
    defense.push(...this.checkDoubleJeopardy(caseData));
    defense.push(...this.checkInsufficientEvidence(caseData));
    defense.push(...this.checkMultiplicity(caseData));
    defense.push(...this.checkVindictiveProsecution(caseData));
    defense.push(...this.checkInefficientCounsel(caseData));

    // ── Prosecution abuse loopholes ────────────────────────────────────────
    prosecution.push(...this.checkOverchargeCoercion(caseData));
    prosecution.push(...this.checkDelayedCharging(caseData));
    prosecution.push(...this.checkBailPunishment(caseData));
    prosecution.push(...this.checkForfeiturePressure(caseData));
    prosecution.push(...this.checkSupersedingIndictmentAbuse(caseData));

    const all = [...defense, ...prosecution];
    const autoDismiss = all.some((l) => l.automaticDismissalEligible);
    const overallRisk = this.computeRisk(defense, prosecution);
    const strongestMove = this.buildStrongestMove(defense, caseData);

    return {
      caseId: caseData.id,
      totalLoopholes: all.length,
      defenseLoopholes: defense,
      prosecutionLoopholes: prosecution,
      automaticDismissalEligible: autoDismiss,
      strongestDefenseMove: strongestMove,
      overallRisk,
    };
  }

  // ── 1. Speedy Trial ────────────────────────────────────────────────────────

  private checkSpeedyTrial(c: Case): LoopholeReport[] {
    const results: LoopholeReport[] = [];
    const elapsed = daysSinceFiling(c.filedAt);

    for (const charge of c.charges) {
      const limit = SPEEDY_TRIAL_DAYS[charge.category] ?? 175;
      if (elapsed > limit && c.status !== "CLOSED" && c.status !== "DISMISSED") {
        results.push({
          loopholeId: lid(c.id, "SPEEDY_TRIAL_VIOLATION"),
          caseId: c.id,
          loopholeType: "SPEEDY_TRIAL_VIOLATION",
          category: "DEFENSE",
          severity: "CRITICAL",
          title: "Speedy Trial Violation — Mandatory Dismissal",
          description: `Case has been pending ${elapsed} days exceeding the ${limit}-day speedy trial limit for a ${charge.category} (${charge.statute}). Under the 6th Amendment and Florida Rule 3.191, the defendant has an absolute right to discharge when the speedy trial period expires without trial.`,
          legalAuthority: "U.S. Const. amend. VI; Fla. R. Crim. P. 3.191; Barker v. Wingo, 407 U.S. 514 (1972)",
          howToExploit: "IMMEDIATELY file a 'Notice of Expiration of Speedy Trial' (Florida form). The court MUST hold a recapture hearing within 5 days and trial within 10 days — or dismiss with prejudice. Do not waive this right.",
          remedy: "Dismissal with prejudice. Defendant must be discharged.",
          detectedAt: isoNow(),
          automaticDismissalEligible: true,
        });
        break; // One flag per case is sufficient
      }
    }

    return results;
  }

  // ── 2. Statute of Limitations ──────────────────────────────────────────────

  private checkStatuteOfLimitations(c: Case): LoopholeReport[] {
    const results: LoopholeReport[] = [];

    for (const charge of c.charges) {
      // Estimate the underlying act date from filedAt (conservative)
      // If the alleged act predates the filing by SOL window + 6 months, flag
      const yearsLimit = SOL_YEARS[charge.category] ?? 3;
      const filedYear = new Date(charge.filedAt).getFullYear();
      const actYear = filedYear - yearsLimit - 1; // conservative estimate

      if (actYear < 2020) continue; // Can't determine act date without data — skip abstract cases

      // We can only flag if narrative references specific past dates outside window
      const yearMatch = c.narrative.match(/\b(201[0-9]|202[0-2])\b/);
      if (!yearMatch) continue;

      const actDateYear = parseInt(yearMatch[1]);
      const soLExpired = (filedYear - actDateYear) > yearsLimit;

      if (soLExpired) {
        results.push({
          loopholeId: lid(c.id + charge.id, "STATUTE_OF_LIMITATIONS"),
          caseId: c.id,
          loopholeType: "STATUTE_OF_LIMITATIONS",
          category: "DEFENSE",
          severity: "CRITICAL",
          title: "Statute of Limitations Expired",
          description: `Charge "${charge.description}" (${charge.statute}) appears to have been filed ${filedYear - actDateYear} years after the alleged act (${actDateYear}). The standard limitations period for a ${charge.category} is ${yearsLimit} year(s). A time-barred charge is void and must be dismissed.`,
          legalAuthority: `Fla. Stat. § 775.15; 18 U.S.C. § 3282; Stogner v. California, 539 U.S. 607 (2003)`,
          howToExploit: "File a Motion to Dismiss based on expiration of the statute of limitations. This is a non-waivable jurisdictional defect — the court has NO power to proceed.",
          remedy: "Dismissal with prejudice — court lacks jurisdiction once limitations period expires.",
          detectedAt: isoNow(),
          automaticDismissalEligible: true,
        });
        break;
      }
    }

    return results;
  }

  // ── 3. Fruit of the Poisonous Tree ────────────────────────────────────────

  private checkFruitOfPoisonousTree(c: Case): LoopholeReport[] {
    const results: LoopholeReport[] = [];

    const badEvidence = c.evidence.filter(
      (e) =>
        e.submittedBy === "PROSECUTION" &&
        (!e.chainOfCustodyIntact || !e.authenticated)
    );

    if (badEvidence.length > 0) {
      results.push({
        loopholeId: lid(c.id, "FRUIT_OF_POISONOUS_TREE"),
        caseId: c.id,
        loopholeType: "FRUIT_OF_POISONOUS_TREE",
        category: "DEFENSE",
        severity: badEvidence.length >= 2 ? "CRITICAL" : "HIGH",
        title: "Fruit of the Poisonous Tree — Evidence Suppression Motion",
        description: `${badEvidence.length} prosecution evidence item(s) lack authentication or an intact chain of custody: [${badEvidence.map((e) => e.id).join(", ")}]. Evidence derived from an illegal search or broken chain is inadmissible under the Exclusionary Rule. If the foundational evidence is suppressed, all downstream evidence it led to is also tainted.`,
        legalAuthority: "Mapp v. Ohio, 367 U.S. 643 (1961); Wong Sun v. United States, 371 U.S. 471 (1963); U.S. Const. amend. IV",
        howToExploit: "File a Motion to Suppress listing each item. Demand a suppression hearing (Franks hearing if affidavit was false). If suppressed, move for judgment of acquittal — without the poisoned evidence, no crime can be proven.",
        remedy: "Suppression of tainted evidence and all derivative discoveries. If core prosecution evidence suppressed → case dismissed.",
        detectedAt: isoNow(),
        automaticDismissalEligible: badEvidence.length === c.evidence.filter((e) => e.submittedBy === "PROSECUTION").length,
      });
    }

    return results;
  }

  // ── 4. Miranda Violation ───────────────────────────────────────────────────

  private checkMirandaViolation(c: Case): LoopholeReport[] {
    const results: LoopholeReport[] = [];

    // Testimonial evidence from the defendant submitted by prosecution = likely statement
    const defStatements = c.evidence.filter(
      (e) =>
        e.submittedBy === "PROSECUTION" &&
        e.type === "TESTIMONIAL" &&
        e.description.toLowerCase().includes("statement")
    );

    if (defStatements.length > 0) {
      results.push({
        loopholeId: lid(c.id, "MIRANDA_VIOLATION"),
        caseId: c.id,
        loopholeType: "MIRANDA_VIOLATION",
        category: "DEFENSE",
        severity: "HIGH",
        title: "Potential Miranda Violation — Statement Suppression",
        description: `${defStatements.length} testimonial statement(s) from the defendant appear in prosecution evidence. Any statement taken during custodial interrogation without Miranda warnings is inadmissible. Good ole boy departments routinely coerce or trick statements without proper advisement — especially when they have no other evidence.`,
        legalAuthority: "Miranda v. Arizona, 384 U.S. 436 (1966); Dickerson v. United States, 530 U.S. 428 (2000)",
        howToExploit: "File a Motion to Suppress Statements. Demand the arrest report, booking records, and body-cam from the exact moment of arrest. If Miranda was not administered BEFORE any questioning, every word the defendant said is suppressed.",
        remedy: "Suppression of all statements taken without proper Miranda advisement.",
        detectedAt: isoNow(),
        automaticDismissalEligible: false,
      });
    }

    return results;
  }

  // ── 5. Chain of Custody ────────────────────────────────────────────────────

  private checkChainOfCustody(c: Case): LoopholeReport[] {
    const results: LoopholeReport[] = [];

    const broken = c.evidence.filter(
      (e) => e.submittedBy === "PROSECUTION" && !e.chainOfCustodyIntact
    );

    if (broken.length > 0) {
      results.push({
        loopholeId: lid(c.id, "CHAIN_OF_CUSTODY_BREAK"),
        caseId: c.id,
        loopholeType: "CHAIN_OF_CUSTODY_BREAK",
        category: "DEFENSE",
        severity: "HIGH",
        title: "Broken Chain of Custody — Evidence Inadmissibility",
        description: `${broken.length} prosecution evidence item(s) have a compromised chain of custody: [${broken.map((e) => e.id).join(", ")}]. When a cop or prosecutor cannot account for every moment evidence was in their (or anyone else's) possession, the evidence is constitutionally inadmissible — it could have been planted, altered, or contaminated.`,
        legalAuthority: "Fed. R. Evid. 901; Florida Standard Jury Instruction 3.9; United States v. Lott, 854 F.2d 244 (7th Cir. 1988)",
        howToExploit: "Subpoena the complete evidence log. Challenge each transfer of custody. If ANY officer cannot account for the evidence at ANY point, move to exclude it entirely.",
        remedy: "Exclusion of all evidence with compromised custody documentation.",
        detectedAt: isoNow(),
        automaticDismissalEligible: false,
      });
    }

    return results;
  }

  // ── 6. Brady / Exculpatory Suppression ────────────────────────────────────

  private checkBradySuppression(c: Case): LoopholeReport[] {
    const results: LoopholeReport[] = [];

    const exculpatory = c.evidence.filter((e) => e.exculpatoryFlag);

    if (exculpatory.length > 0) {
      results.push({
        loopholeId: lid(c.id, "EXCULPATORY_SUPPRESSION"),
        caseId: c.id,
        loopholeType: "EXCULPATORY_SUPPRESSION",
        category: "DEFENSE",
        severity: "CRITICAL",
        title: "Brady Violation — Exculpatory Evidence Must Be Disclosed",
        description: `${exculpatory.length} item(s) of exculpatory evidence exist in this case: [${exculpatory.map((e) => e.id + ": " + e.description.slice(0, 60)).join(" | ")}]. The prosecution has a constitutional duty to disclose ANY evidence favorable to the defense. Withholding it is a Brady violation — one of the most serious constitutional crimes a prosecutor can commit.`,
        legalAuthority: "Brady v. Maryland, 373 U.S. 83 (1963); Giglio v. United States, 405 U.S. 150 (1972); Strickler v. Greene, 527 U.S. 263 (1999)",
        howToExploit: "File a Brady motion demanding the prosecution certify ALL exculpatory material was disclosed. Subpoena police files, DA files, informant agreements. Any withheld evidence discovered post-conviction = automatic new trial.",
        remedy: "Mandatory disclosure. Any conviction obtained while withholding Brady material must be vacated.",
        detectedAt: isoNow(),
        automaticDismissalEligible: true,
      });
    }

    return results;
  }

  // ── 7. Double Jeopardy ────────────────────────────────────────────────────

  private checkDoubleJeopardy(c: Case): LoopholeReport[] {
    const results: LoopholeReport[] = [];
    // Flag if case was previously dismissed or acquitted (status signals)
    if (c.status === "DISMISSED") {
      results.push({
        loopholeId: lid(c.id, "DOUBLE_JEOPARDY"),
        caseId: c.id,
        loopholeType: "DOUBLE_JEOPARDY",
        category: "DEFENSE",
        severity: "CRITICAL",
        title: "Potential Double Jeopardy Violation",
        description: `This case carries a DISMISSED status yet new charges appear. Re-prosecuting a defendant on charges that were dismissed after jeopardy attached constitutes a Double Jeopardy violation. This is absolute — no exception applies unless the dismissal was procedural (no jeopardy attached) or on defendant's motion.`,
        legalAuthority: "U.S. Const. amend. V; Fla. Const. art. I § 9; Blockburger v. United States, 284 U.S. 299 (1932); Ashe v. Swenson, 397 U.S. 436 (1970)",
        howToExploit: "File a pre-trial Motion to Dismiss on Double Jeopardy grounds immediately — before entering a plea. Attach prior case records. The court must hold a hearing. This bars prosecution absolutely.",
        remedy: "Permanent bar on prosecution. Case dismissed with prejudice.",
        detectedAt: isoNow(),
        automaticDismissalEligible: true,
      });
    }
    return results;
  }

  // ── 8. Insufficient Evidence (JML) ────────────────────────────────────────

  private checkInsufficientEvidence(c: Case): LoopholeReport[] {
    const results: LoopholeReport[] = [];

    const prosecutionAuthenticated = c.evidence.filter(
      (e) =>
        e.submittedBy === "PROSECUTION" &&
        e.authenticated &&
        e.chainOfCustodyIntact &&
        !e.exculpatoryFlag
    );

    if (prosecutionAuthenticated.length === 0) {
      results.push({
        loopholeId: lid(c.id, "INSUFFICIENT_EVIDENCE_JML"),
        caseId: c.id,
        loopholeType: "INSUFFICIENT_EVIDENCE_JML",
        category: "DEFENSE",
        severity: "CRITICAL",
        title: "No Authenticated Prosecution Evidence — Motion for Acquittal",
        description: `The prosecution has ZERO authenticated, chain-of-custody-intact evidence supporting this case. No rational trier of fact could find the elements of the charges beyond a reasonable doubt with no objective evidence. This is textbook grounds for a directed verdict / judgment of acquittal before the case ever reaches a jury.`,
        legalAuthority: "Jackson v. Virginia, 443 U.S. 307 (1979); Fla. R. Crim. P. 3.380; Fed. R. Crim. P. 29",
        howToExploit: "At the close of prosecution's case, move for judgment of acquittal under Rule 3.380 (Florida) or Rule 29 (Federal). The judge MUST grant it if no reasonable jury could convict. If denied, renew after verdict — preserves the issue for appeal.",
        remedy: "Directed verdict of not guilty. Case ends.",
        detectedAt: isoNow(),
        automaticDismissalEligible: true,
      });
    }

    return results;
  }

  // ── 9. Multiplicity Challenge ─────────────────────────────────────────────

  private checkMultiplicity(c: Case): LoopholeReport[] {
    const results: LoopholeReport[] = [];

    const relatedActGroups = new Map<string, string[]>();
    for (const charge of c.charges) {
      if (!charge.relatedActId) continue;
      const group = relatedActGroups.get(charge.relatedActId) ?? [];
      group.push(charge.statute);
      relatedActGroups.set(charge.relatedActId, group);
    }

    for (const [actId, statutes] of relatedActGroups.entries()) {
      if (statutes.length >= 2) {
        results.push({
          loopholeId: lid(c.id + actId, "MULTIPLICITY_CHALLENGE"),
          caseId: c.id,
          loopholeType: "MULTIPLICITY_CHALLENGE",
          category: "DEFENSE",
          severity: "HIGH",
          title: "Multiplicity — Multiple Punishments for One Act",
          description: `${statutes.length} charges (${statutes.join(", ")}) all stem from the same underlying act (${actId}). Punishing a defendant multiple times for a single act violates the Double Jeopardy Clause's protection against multiple punishment. This is a favorite tool of good ole boy prosecutors — pile on charges from one act to maximize plea pressure.`,
          legalAuthority: "Blockburger v. United States, 284 U.S. 299 (1932); Ball v. United States, 470 U.S. 856 (1985); Fla. Stat. § 775.021",
          howToExploit: "File a pre-trial Motion to Dismiss Multiplicitous Counts. Each count that shares every element with another must be dismissed. Force the prosecution to try one theory — not five.",
          remedy: "Dismissal of all redundant counts. One charge per act.",
          detectedAt: isoNow(),
          automaticDismissalEligible: false,
        });
        break;
      }
    }

    return results;
  }

  // ── 10. Vindictive Prosecution ────────────────────────────────────────────

  private checkVindictiveProsecution(c: Case): LoopholeReport[] {
    const results: LoopholeReport[] = [];

    // Detect if narrative contains retaliation language or if status = APPEALED (re-filed after appeal)
    const retaliationKeywords = [
      "refused", "rejected", "complaint", "lawsuit", "civil rights",
      "grievance", "reported", "exposed", "whistleblower"
    ];
    const hasRetaliationContext = retaliationKeywords.some((kw) =>
      c.narrative.toLowerCase().includes(kw)
    );

    if (hasRetaliationContext || c.status === "APPEALED") {
      results.push({
        loopholeId: lid(c.id, "VINDICTIVE_PROSECUTION_CLAIM"),
        caseId: c.id,
        loopholeType: "VINDICTIVE_PROSECUTION_CLAIM",
        category: "DEFENSE",
        severity: "HIGH",
        title: "Vindictive Prosecution — Charges Filed in Retaliation",
        description: `Indicators suggest charges may have been filed, escalated, or re-filed in retaliation for the defendant exercising a protected right (filing a complaint, refusing to cooperate, appealing a prior case, or exposing misconduct). Vindictive prosecution is a constitutional due process violation — it doesn't matter if the underlying charge is technically valid if the motive is retaliation.`,
        legalAuthority: "North Carolina v. Pearce, 395 U.S. 711 (1969); Blackledge v. Perry, 417 U.S. 21 (1974); United States v. Goodwin, 457 U.S. 368 (1982)",
        howToExploit: "File a Motion to Dismiss for Vindictive Prosecution. Document the timeline: when did defendant exercise the protected right vs. when were charges filed / escalated? A rebuttable presumption of vindictiveness arises when charges increase after appeal.",
        remedy: "Dismissal with prejudice. Civil rights claim under 42 U.S.C. § 1983 against the prosecutor individually.",
        detectedAt: isoNow(),
        automaticDismissalEligible: false,
      });
    }

    return results;
  }

  // ── 11. Ineffective Counsel (Strickland) ──────────────────────────────────

  private checkInefficientCounsel(c: Case): LoopholeReport[] {
    const results: LoopholeReport[] = [];

    const defense = c.parties.find((p) => p.role === "DEFENSE_ATTORNEY");
    if (!defense) {
      results.push({
        loopholeId: lid(c.id, "INEFFECTIVE_COUNSEL_STRICKLAND"),
        caseId: c.id,
        loopholeType: "INEFFECTIVE_COUNSEL_STRICKLAND",
        category: "DEFENSE",
        severity: "HIGH",
        title: "No Defense Attorney Listed — Right to Counsel Violation",
        description: `No defense attorney is identified in this case. Every defendant facing incarceration has a 6th Amendment right to counsel. Proceeding without counsel — or with a public defender who is part of the good ole boy network rubber-stamping whatever the DA says — is grounds for reversal of any conviction.`,
        legalAuthority: "Gideon v. Wainwright, 372 U.S. 335 (1963); Strickland v. Washington, 466 U.S. 668 (1984); U.S. Const. amend. VI",
        howToExploit: "If no counsel was provided, demand appointment immediately. If prior counsel performed deficiently (missed deadlines, failed to file suppression motions, had no defense strategy), file a post-conviction motion under Rule 3.850 (Florida) or 28 U.S.C. § 2255 (Federal) for ineffective assistance.",
        remedy: "New trial with competent counsel, or vacatur of conviction.",
        detectedAt: isoNow(),
        automaticDismissalEligible: false,
      });
    }

    return results;
  }

  // ── Prosecution abuse: Overcharging to Coerce Plea ────────────────────────

  private checkOverchargeCoercion(c: Case): LoopholeReport[] {
    const results: LoopholeReport[] = [];

    const totalExposure = c.charges.reduce(
      (sum, ch) => sum + ch.maxSentenceYears, 0
    );

    // If total exposure is 10× or more than what the alleged harm warrants — flag
    if (totalExposure >= 30 && c.charges.length >= 3) {
      results.push({
        loopholeId: lid(c.id, "OVERCHARGE_TO_COERCE_PLEA"),
        caseId: c.id,
        loopholeType: "OVERCHARGE_TO_COERCE_PLEA",
        category: "PROSECUTION",
        severity: totalExposure >= 50 ? "CRITICAL" : "HIGH",
        title: "Overcharging to Coerce Plea — Prosecutorial Abuse",
        description: `This case carries ${totalExposure} years maximum exposure across ${c.charges.length} charges. The primary purpose of stacking charges far beyond what the alleged conduct warrants is to terrorize the defendant into accepting a plea deal — avoiding the cost and inconvenience of a trial for the prosecutor. This is a structural abuse of the charging power that coerces constitutional rights (right to trial) through threat.`,
        legalAuthority: "Bordenkircher v. Hayes, 434 U.S. 357 (1978) (dissent); United States v. Jackson, 390 U.S. 570 (1968); ABA Standards for Criminal Justice § 3-4.3",
        howToExploit: "Challenge the aggregate charging in your motion to dismiss multiplicitous counts. File a selective/vindictive prosecution motion. Argue the plea offer itself proves coercion — if they offered 2 years but stacked charges for 60, the offer IS the evidence of abuse.",
        remedy: "Charging decision review by independent oversight. ABA & DOJ guidance prohibit using charges solely as plea leverage.",
        detectedAt: isoNow(),
        automaticDismissalEligible: false,
      });
    }

    return results;
  }

  // ── Prosecution abuse: Delayed Charging ───────────────────────────────────

  private checkDelayedCharging(c: Case): LoopholeReport[] {
    const results: LoopholeReport[] = [];
    const days = daysSinceFiling(c.filedAt);

    if (days > 365 && c.status === "FILED") {
      results.push({
        loopholeId: lid(c.id, "DELAYED_CHARGING"),
        caseId: c.id,
        loopholeType: "DELAYED_CHARGING",
        category: "PROSECUTION",
        severity: "HIGH",
        title: "Delayed Prosecution — Keeping Defendant in Legal Limbo",
        description: `This case has been in FILED status for ${days} days (${Math.round(days / 365 * 10) / 10} years) without proceeding to trial. Deliberate delay after charges are filed — while the defendant lives under the cloud of prosecution — drains resources, employment, relationships, and mental health. It is a systemic tactic to increase pressure to plead guilty to make it stop.`,
        legalAuthority: "U.S. Const. amend. VI; United States v. Marion, 404 U.S. 307 (1971); Doggett v. United States, 505 U.S. 647 (1992)",
        howToExploit: "File a Motion to Dismiss for pre-trial delay under the Barker v. Wingo balancing test (length, reason, defendant's assertion, prejudice). The longer the delay, the stronger the presumption of prejudice.",
        remedy: "Dismissal with prejudice if delay prejudiced the defense.",
        detectedAt: isoNow(),
        automaticDismissalEligible: false,
      });
    }

    return results;
  }

  // ── Prosecution abuse: Bail as Punishment ────────────────────────────────

  private checkBailPunishment(c: Case): LoopholeReport[] {
    const results: LoopholeReport[] = [];

    // Cases where charges are low-level but narrative flags suggest excessive bail scenario
    const misdemeanorCharges = c.charges.filter((ch) => ch.category === "MISDEMEANOR");
    const hasWordVsWord =
      c.evidence.filter(
        (e) => e.submittedBy === "PROSECUTION" && e.type !== "TESTIMONIAL"
      ).length === 0;

    if (misdemeanorCharges.length > 0 && hasWordVsWord) {
      results.push({
        loopholeId: lid(c.id, "BAIL_PUNISHMENT"),
        caseId: c.id,
        loopholeType: "BAIL_PUNISHMENT",
        category: "PROSECUTION",
        severity: "MODERATE",
        title: "Bail as Pre-Trial Punishment — 8th Amendment Violation",
        description: `This case involves ${misdemeanorCharges.length} misdemeanor charge(s) supported only by officer testimony. Setting cash bail on low-level offenses with no flight risk evidence is not about ensuring appearance — it is punishing the defendant before conviction. Cash bail for minor charges disproportionately jails poor defendants while wealthy defendants with identical charges walk free.`,
        legalAuthority: "U.S. Const. amend. VIII; Stack v. Boyle, 342 U.S. 1 (1951); United States v. Salerno, 481 U.S. 739 (1987); 18 U.S.C. § 3142",
        howToExploit: "File a Motion to Reduce/Eliminate Bail. Present evidence of community ties, employment, absence of flight risk. Cite the 8th Amendment and any state bail reform statutes. Argue inability to pay = de facto pre-trial incarceration without conviction.",
        remedy: "Release on recognizance or significantly reduced bail. Pre-trial services monitoring as alternative.",
        detectedAt: isoNow(),
        automaticDismissalEligible: false,
      });
    }

    return results;
  }

  // ── Prosecution abuse: Asset Forfeiture Pressure ─────────────────────────

  private checkForfeiturePressure(c: Case): LoopholeReport[] {
    const results: LoopholeReport[] = [];

    // RICO or financial charges often paired with forfeiture
    const hasRICO = c.charges.some(
      (ch) =>
        ch.statute.toLowerCase().includes("895") ||
        ch.statute.toLowerCase().includes("1962") ||
        ch.description.toLowerCase().includes("rico")
    );

    if (hasRICO) {
      results.push({
        loopholeId: lid(c.id, "FORFEITURE_PRESSURE"),
        caseId: c.id,
        loopholeType: "FORFEITURE_PRESSURE",
        category: "PROSECUTION",
        severity: "HIGH",
        title: "Pre-Conviction Asset Forfeiture — Starving the Defense",
        description: `RICO charges carry civil asset forfeiture provisions allowing assets to be seized BEFORE conviction. This is a direct attack on the defendant's ability to hire competent legal counsel — seize everything, force the defendant into an overworked public defender, then get a conviction the prosecutor could not have won against a funded defense. This is structural corruption of the adversarial system.`,
        legalAuthority: "18 U.S.C. § 1963 (criminal forfeiture); Luis v. United States, 578 U.S. 5 (2016) (untainted assets cannot be seized pre-trial); Fla. Stat. § 895.05",
        howToExploit: "If assets are frozen, immediately file a Luis motion asserting that untainted assets needed for attorney fees CANNOT be restrained. The Supreme Court held 6-3 that seizing untainted assets violates the 6th Amendment right to counsel.",
        remedy: "Release of untainted assets for defense costs. Government bears burden to show assets are proceeds of crime.",
        detectedAt: isoNow(),
        automaticDismissalEligible: false,
      });
    }

    return results;
  }

  // ── Prosecution abuse: Superseding Indictment ────────────────────────────

  private checkSupersedingIndictmentAbuse(c: Case): LoopholeReport[] {
    const results: LoopholeReport[] = [];

    if (c.status === "APPEALED") {
      results.push({
        loopholeId: lid(c.id, "SUPERSEDING_INDICTMENT_ABUSE"),
        caseId: c.id,
        loopholeType: "SUPERSEDING_INDICTMENT_ABUSE",
        category: "PROSECUTION",
        severity: "HIGH",
        title: "Superseding Indictment After Appeal — Double Jeopardy Risk",
        description: `This case is in APPEALED status, yet charges remain active. When a prosecutor files new or expanded charges after a defendant successfully appeals or is acquitted, it raises Double Jeopardy and vindictive prosecution concerns. This tactic is used to punish defendants who dare challenge convictions — "win your appeal, get more charges."`,
        legalAuthority: "Blackledge v. Perry, 417 U.S. 21 (1974); North Carolina v. Pearce, 395 U.S. 711 (1969); U.S. Const. amend. V",
        howToExploit: "File a Motion to Dismiss citing Blackledge. A rebuttable presumption of vindictiveness arises automatically when charges are enhanced post-appeal. The government must prove a legitimate, objective reason for enhancement beyond the fact of the appeal itself.",
        remedy: "Dismissal of enhanced charges. Sanctions against prosecutor for vindictive prosecution.",
        detectedAt: isoNow(),
        automaticDismissalEligible: false,
      });
    }

    return results;
  }

  // ── Risk computation ───────────────────────────────────────────────────────

  private computeRisk(
    defense: LoopholeReport[],
    prosecution: LoopholeReport[]
  ): RiskLevel {
    const autoDismiss = [...defense, ...prosecution].some(
      (l) => l.automaticDismissalEligible
    );
    if (autoDismiss) return "CRITICAL";
    const criticals = [...defense, ...prosecution].filter(
      (l) => l.severity === "CRITICAL"
    ).length;
    if (criticals >= 2 || defense.length >= 4) return "CRITICAL";
    if (criticals >= 1 || defense.length >= 2) return "HIGH";
    if (defense.length >= 1 || prosecution.length >= 2) return "MODERATE";
    return "LOW";
  }

  // ── Strongest defense move ─────────────────────────────────────────────────

  private buildStrongestMove(
    defense: LoopholeReport[],
    c: Case
  ): string {
    if (defense.length === 0) {
      return "No immediate loopholes detected. Focus on fact-based defense and demand full discovery.";
    }

    // Prioritise: auto-dismiss > CRITICAL > HIGH
    const best =
      defense.find((l) => l.automaticDismissalEligible) ??
      defense.find((l) => l.severity === "CRITICAL") ??
      defense[0];

    return `PRIORITY ACTION — ${best.title}: ${best.howToExploit}`;
  }
}

// lib/judicial/case-fact-analyzer.ts
// Facts-Based Case Analyzer
//
// Scores a case on objective factual merit.  Detects emotional/inflammatory
// language in narrative filings that substitutes rhetoric for evidence.
// Identifies weak charges lacking element-by-element evidentiary support.

import type { Case, FactScore } from "./types";

// ─── Emotional / inflammatory language patterns ───────────────────────────────
// Patterns commonly used in prosecutorial narratives to prejudice rather than
// inform.  Their presence does not prove wrongdoing but should be flagged when
// they appear as substitutes for factual assertions.

const EMOTIONAL_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\bmonster\b/i, label: "dehumanising label: 'monster'" },
  { pattern: /\bpredator\b/i, label: "dehumanising label: 'predator'" },
  { pattern: /\bevil\b/i, label: "moral characterisation: 'evil'" },
  { pattern: /\bdepraved\b/i, label: "moral characterisation: 'depraved'" },
  { pattern: /\bcold.blooded\b/i, label: "inflammatory descriptor: 'cold-blooded'" },
  { pattern: /\bmenace to society\b/i, label: "inflammatory label: 'menace to society'" },
  { pattern: /\bwanton(ly)?\b/i, label: "emotional intensifier: 'wanton'" },
  { pattern: /\bvicious(ly)?\b/i, label: "emotional intensifier: 'vicious'" },
  { pattern: /\bbrazen(ly)?\b/i, label: "emotional intensifier: 'brazen'" },
  { pattern: /\bheartless\b/i, label: "emotional descriptor: 'heartless'" },
  { pattern: /\bsociopath\b/i, label: "unqualified psychiatric label: 'sociopath'" },
  { pattern: /\bpsychopath\b/i, label: "unqualified psychiatric label: 'psychopath'" },
  { pattern: /\bmanipulative\b/i, label: "characterisation without evidence: 'manipulative'" },
  { pattern: /\bcalculating\b/i, label: "unfounded intent characterisation: 'calculating'" },
  { pattern: /\bno remorse\b/i, label: "speculative intent assertion: 'no remorse'" },
  { pattern: /\bclearly guilty\b/i, label: "prejudgment statement: 'clearly guilty'" },
  { pattern: /\bobviously\b/i, label: "dismissive qualifier: 'obviously'" },
  { pattern: /\bundeniably\b/i, label: "assertion without proof: 'undeniably'" },
];

// ─── Factual assertion indicators ─────────────────────────────────────────────
// Phrases that signal objective, falsifiable assertions vs. opinion.

const FACTUAL_INDICATORS: RegExp[] = [
  /on or about \w+ \d{1,2},?\s*\d{4}/i,    // specific dates
  /at approximately \d{1,2}:\d{2}/i,        // specific times
  /located at \d+ .+street/i,               // specific addresses
  /serial number/i,
  /forensic analysis/i,
  /laboratory results/i,
  /surveillance footage/i,
  /financial records/i,
  /digital metadata/i,
  /dna evidence/i,
  /fingerprint/i,
  /witnessed by/i,
  /recorded on/i,
];

// ─── Fact Analyzer ─────────────────────────────────────────────────────────────

export class CaseFactAnalyzer {
  /**
   * Produce a FactScore for the given case.
   */
  analyze(caseData: Case): FactScore {
    const totalEvidence = caseData.evidence.length;

    const authenticatedEvidence = caseData.evidence.filter(
      (e) => e.authenticated && e.chainOfCustodyIntact
    ).length;

    const exculpatoryEvidence = caseData.evidence.filter(
      (e) => e.exculpatoryFlag
    ).length;

    // Raw evidence quality ratio
    const evidenceQualityRatio =
      totalEvidence === 0 ? 0 : authenticatedEvidence / totalEvidence;

    // Narrative language scoring
    const narrativeScore = this.scoreNarrative(caseData.narrative);

    // Composite factual score (70% evidence quality, 30% narrative objectivity)
    const factualScore = Math.round(
      evidenceQualityRatio * 70 + narrativeScore * 30
    );

    // Flag which charges lack enough authenticated evidence for each element
    const authenticatedIds = new Set(
      caseData.evidence
        .filter((e) => e.authenticated && e.chainOfCustodyIntact)
        .map((e) => e.id)
    );

    const weakChargeIds = caseData.charges
      .filter((charge) => {
        if (charge.supportingEvidenceIds.length === 0) return true;
        const supported = charge.supportingEvidenceIds.filter((id) =>
          authenticatedIds.has(id)
        );
        return supported.length / charge.supportingEvidenceIds.length < 0.5;
      })
      .map((c) => c.id);

    const emotionalLanguageFlags = this.detectEmotionalLanguage(
      caseData.narrative
    );

    return {
      totalEvidence,
      authenticatedEvidence,
      exculpatoryEvidence,
      factualScore,
      emotionalLanguageFlags,
      sufficientForCharges: factualScore >= 60 && weakChargeIds.length === 0,
      weakChargeIds,
    };
  }

  // ─── Narrative analysis ─────────────────────────────────────────────────────

  private scoreNarrative(narrative: string): number {
    if (!narrative || narrative.trim().length === 0) return 50; // neutral

    const emotionalHits = EMOTIONAL_PATTERNS.filter(({ pattern }) =>
      pattern.test(narrative)
    ).length;

    const factualHits = FACTUAL_INDICATORS.filter((re) =>
      re.test(narrative)
    ).length;

    // Score from 0–100: more factual indicators → higher score
    // Emotional language deducts points
    const base = Math.min(100, factualHits * 12);
    const penalty = Math.min(base, emotionalHits * 8);
    return Math.max(0, base - penalty);
  }

  private detectEmotionalLanguage(narrative: string): string[] {
    if (!narrative) return [];
    return EMOTIONAL_PATTERNS
      .filter(({ pattern }) => pattern.test(narrative))
      .map(({ label }) => label);
  }

  /**
   * Compare two cases to detect potential selective prosecution.
   * Returns true if the factual scores differ by more than 30 points yet
   * the same charges were filed — indicating disparate treatment.
   */
  detectSelectiveProsecution(caseA: Case, caseB: Case): boolean {
    const scoreA = this.analyze(caseA).factualScore;
    const scoreB = this.analyze(caseB).factualScore;

    const sharedStatutes = caseA.charges
      .map((c) => c.statute)
      .filter((s) => caseB.charges.some((c) => c.statute === s));

    return sharedStatutes.length > 0 && Math.abs(scoreA - scoreB) > 30;
  }
}

export default CaseFactAnalyzer;

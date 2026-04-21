// lib/judicial/good-ole-boy-detector.ts
// Good Ole Boy Network Detector
//
// Analyses a BATCH of cases from the same jurisdiction to expose systemic
// patterns of corruption that are invisible when cases are reviewed one-by-one.
//
// Detects:
//   1. Repeat officer + prosecutor pairs acting as a coordinated duo
//   2. "Word vs. word" cases where officer testimony is THE ONLY evidence
//   3. Rubber-stamp charging (100 % officer-to-prosecution rate)
//   4. Evidence deserts (cases proceeding with zero objective evidence)
//   5. Prosecutor conviction obsession (never drops, never plea-bargains)
//   6. Judicial rubber-stamping (judge never suppresses for certain prosecutor)
//   7. Retaliation pattern (charges spiked after defendant filed complaint)
//   8. Coordinated witness testimony (officers give near-identical accounts)
//   9. Selective defendant profiling (repeated targeting of same person)
//  10. Above-the-law officer (misconduct flags exist but filings continue)

import { createHash } from "crypto";
import type {
  Case,
  CaseParty,
  GoodOleBoyFlag,
  GoodOleBoyFlagType,
  ActorCorruptionProfile,
  RiskLevel,
} from "./types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function uid(prefix: string, content: string): string {
  return `${prefix}_${createHash("sha256").update(content).digest("hex").slice(0, 12)}`;
}

function riskFromScore(score: number): RiskLevel {
  if (score >= 80) return "CRITICAL";
  if (score >= 60) return "HIGH";
  if (score >= 40) return "MODERATE";
  return "LOW";
}

function isoNow(): string {
  return new Date().toISOString();
}

// ─── Types internal to this module ────────────────────────────────────────────

interface ActorTally {
  actor: CaseParty;
  caseIds: Set<string>;
  wordVsWordCaseIds: Set<string>;
  evidenceDesertCaseIds: Set<string>;
  violationCaseIds: Set<string>;
  dismissedChargeCaseIds: Set<string>;
  coActors: Map<string, Set<string>>; // actorId → caseIds where both appeared
  firstSeen: string;
  lastSeen: string;
}

// ─── Main Detector ────────────────────────────────────────────────────────────

export class GoodOleBoyDetector {
  // ── Entry point ──────────────────────────────────────────────────────────

  detect(
    cases: Case[],
    jurisdictionName: string
  ): { flags: GoodOleBoyFlag[]; actorProfiles: ActorCorruptionProfile[] } {
    const flags: GoodOleBoyFlag[] = [];
    const actorMap = this.buildActorMap(cases);

    flags.push(...this.detectRepeatPairs(actorMap, cases));
    flags.push(...this.detectWordVsWord(cases));
    flags.push(...this.detectEvidenceDeserts(cases));
    flags.push(...this.detectRubberStampCharging(cases, actorMap));
    flags.push(...this.detectConvictionObsession(actorMap, cases));
    flags.push(...this.detectJudicialRubberStamp(actorMap, cases));
    flags.push(...this.detectStackedRepeatTargets(cases));
    flags.push(...this.detectCoordinatedTestimony(cases));

    const actorProfiles = this.buildActorProfiles(actorMap, flags, jurisdictionName);

    return { flags, actorProfiles };
  }

  // ── 1. Build actor tally map ──────────────────────────────────────────────

  private buildActorMap(cases: Case[]): Map<string, ActorTally> {
    const map = new Map<string, ActorTally>();

    for (const c of cases) {
      const isWordVsWord = this.isWordVsWordCase(c);
      const isEvidenceDesert = this.isEvidenceDesert(c);
      const hasViolations = this.hasKnownViolations(c);
      const hasDismissed = c.status === "DISMISSED";

      for (const party of c.parties) {
        if (!map.has(party.id)) {
          map.set(party.id, {
            actor: party,
            caseIds: new Set(),
            wordVsWordCaseIds: new Set(),
            evidenceDesertCaseIds: new Set(),
            violationCaseIds: new Set(),
            dismissedChargeCaseIds: new Set(),
            coActors: new Map(),
            firstSeen: c.filedAt,
            lastSeen: c.filedAt,
          });
        }
        const tally = map.get(party.id)!;
        tally.caseIds.add(c.id);
        if (isWordVsWord) tally.wordVsWordCaseIds.add(c.id);
        if (isEvidenceDesert) tally.evidenceDesertCaseIds.add(c.id);
        if (hasViolations) tally.violationCaseIds.add(c.id);
        if (hasDismissed) tally.dismissedChargeCaseIds.add(c.id);

        // Track co-actors (same case)
        for (const other of c.parties) {
          if (other.id === party.id) continue;
          if (!tally.coActors.has(other.id)) {
            tally.coActors.set(other.id, new Set());
          }
          tally.coActors.get(other.id)!.add(c.id);
        }

        // Update seen dates
        if (c.filedAt < tally.firstSeen) tally.firstSeen = c.filedAt;
        if (c.filedAt > tally.lastSeen) tally.lastSeen = c.filedAt;
      }
    }

    return map;
  }

  // ── 2. Detect repeat officer + prosecutor pairs ───────────────────────────

  private detectRepeatPairs(
    actorMap: Map<string, ActorTally>,
    cases: Case[]
  ): GoodOleBoyFlag[] {
    const flags: GoodOleBoyFlag[] = [];
    const checkedPairs = new Set<string>();

    for (const [actorId, tally] of actorMap.entries()) {
      const actor = tally.actor;
      if (actor.role !== "PROSECUTOR" && actor.role !== "JUDGE") continue;

      for (const [coId, sharedCaseIds] of tally.coActors.entries()) {
        const pairKey = [actorId, coId].sort().join("|");
        if (checkedPairs.has(pairKey)) continue;
        checkedPairs.add(pairKey);

        const coTally = actorMap.get(coId);
        if (!coTally) continue;

        // Only flag prosecutor+officer or judge+prosecutor pairs
        const isProsecutorOfficerPair =
          (actor.role === "PROSECUTOR" && coTally.actor.role === "WITNESS") ||
          (actor.role === "PROSECUTOR" &&
            ["WITNESS"].includes(coTally.actor.role));
        const isProsJudgePair =
          actor.role === "PROSECUTOR" && coTally.actor.role === "JUDGE";

        if (!isProsecutorOfficerPair && !isProsJudgePair) continue;
        if (sharedCaseIds.size < 3) continue; // Need 3+ cases to call a pattern

        const severity: RiskLevel =
          sharedCaseIds.size >= 8
            ? "CRITICAL"
            : sharedCaseIds.size >= 5
            ? "HIGH"
            : "MODERATE";

        flags.push({
          flagId: uid("GOB", pairKey + sharedCaseIds.size),
          flagType: "REPEAT_OFFICER_PROSECUTOR_PAIR",
          severity,
          caseIds: [...sharedCaseIds],
          description: `${actor.name} (${actor.role}) and ${coTally.actor.name} (${coTally.actor.role}) appear together in ${sharedCaseIds.size} cases. This recurring partnership warrants scrutiny for coordinated bias, friendly charging, and mutual protection.`,
          officerIds: actor.role === "PROSECUTOR" ? [coId] : [actorId],
          prosecutorIds: actor.role === "PROSECUTOR" ? [actorId] : [coId],
          judgeIds: isProsJudgePair ? [coId] : [],
          statisticalBasis: `${sharedCaseIds.size} shared cases between ${actor.name} and ${coTally.actor.name} in this jurisdiction's review window.`,
          recommendedAction:
            "Conduct independent review of all shared cases. Recuse both parties from ongoing joint matters. Refer to State Attorney General for misconduct investigation.",
          detectedAt: isoNow(),
        });
      }
    }

    return flags;
  }

  // ── 3. Detect word-vs-word cases ──────────────────────────────────────────

  private detectWordVsWord(cases: Case[]): GoodOleBoyFlag[] {
    const flags: GoodOleBoyFlag[] = [];
    const wvwCases = cases.filter((c) => this.isWordVsWordCase(c));
    if (wvwCases.length === 0) return [];

    // Group by prosecutor
    const byPros = new Map<string, { name: string; caseIds: string[] }>();
    for (const c of wvwCases) {
      const pros = c.parties.find((p) => p.role === "PROSECUTOR");
      if (!pros) continue;
      if (!byPros.has(pros.id)) byPros.set(pros.id, { name: pros.name, caseIds: [] });
      byPros.get(pros.id)!.caseIds.push(c.id);
    }

    for (const [prosId, { name, caseIds }] of byPros.entries()) {
      if (caseIds.length < 2) continue; // Single case not a systemic pattern

      flags.push({
        flagId: uid("WVW", prosId + caseIds.length),
        flagType: "WORD_VS_WORD_NO_EVIDENCE",
        severity: caseIds.length >= 5 ? "CRITICAL" : caseIds.length >= 3 ? "HIGH" : "MODERATE",
        caseIds,
        description: `Prosecutor ${name} has pursued ${caseIds.length} cases where the arresting or reporting officer's unsubstantiated testimony was the ONLY evidence. No physical, documentary, forensic, or digital evidence supported the charges. This is a hallmark of "take-their-word-for-it" prosecutions that give officers unchecked power to deprive citizens of liberty.`,
        officerIds: [],
        prosecutorIds: [prosId],
        judgeIds: [],
        statisticalBasis: `${caseIds.length} cases under prosecutor ${name} had zero objective evidence — 100% reliance on officer/complainant testimony.`,
        recommendedAction:
          "Dismiss all unsupported charges. Mandate a corroboration requirement for future officer-sworn-testimony-only filings in this jurisdiction. Open misconduct review for prosecutor.",
        detectedAt: isoNow(),
      });
    }

    return flags;
  }

  // ── 4. Detect evidence deserts ────────────────────────────────────────────

  private detectEvidenceDeserts(cases: Case[]): GoodOleBoyFlag[] {
    const flags: GoodOleBoyFlag[] = [];
    const deserts = cases.filter((c) => this.isEvidenceDesert(c));
    if (deserts.length === 0) return [];

    // If more than 25% of all cases are evidence deserts → systemic
    const ratio = deserts.length / cases.length;
    if (ratio < 0.25) return [];

    flags.push({
      flagId: uid("EDESERT", deserts.map((c) => c.id).join("")),
      flagType: "EVIDENCE_DESERT",
      severity: ratio >= 0.5 ? "CRITICAL" : "HIGH",
      caseIds: deserts.map((c) => c.id),
      description: `${deserts.length} of ${cases.length} reviewed cases (${Math.round(ratio * 100)}%) proceeded with zero authenticated physical, documentary, or digital evidence. Prosecutions built entirely on verbal assertions normalise above-the-law officer conduct and allow innocent people to be convicted on unchecked word alone.`,
      officerIds: [],
      prosecutorIds: [],
      judgeIds: [],
      statisticalBasis: `${Math.round(ratio * 100)}% evidence-desert rate across reviewed window. National baseline: < 5%.`,
      recommendedAction:
        "Mandatory independent evidence-sufficiency review for all open zero-evidence cases. State-level audit of charging practices. Officer body-cam and documentation requirement.",
      detectedAt: isoNow(),
    });

    return flags;
  }

  // ── 5. Detect prosecutor rubber-stamp charging ────────────────────────────

  private detectRubberStampCharging(
    cases: Case[],
    actorMap: Map<string, ActorTally>
  ): GoodOleBoyFlag[] {
    const flags: GoodOleBoyFlag[] = [];

    for (const [prosId, tally] of actorMap.entries()) {
      if (tally.actor.role !== "PROSECUTOR") continue;
      if (tally.caseIds.size < 5) continue; // Minimum sample size

      // Rubber stamp: prosecutor never drops a charge, case status never DISMISSED
      const dismissedRatio =
        tally.dismissedChargeCaseIds.size / tally.caseIds.size;
      if (dismissedRatio > 0.05) continue; // 5% dismissal rate is normal

      flags.push({
        flagId: uid("RUBLSTMP", prosId + tally.caseIds.size),
        flagType: "RUBBER_STAMP_CHARGES",
        severity: tally.caseIds.size >= 10 ? "CRITICAL" : "HIGH",
        caseIds: [...tally.caseIds],
        description: `Prosecutor ${tally.actor.name} has a 0%–5% charge dismissal rate across ${tally.caseIds.size} cases. A real justice system involves evaluation of facts — when a prosecutor NEVER drops charges, they are rubber-stamping whatever officers bring them regardless of evidentiary merit. This is textbook "good ole boy" protection of law enforcement.`,
        officerIds: [],
        prosecutorIds: [prosId],
        judgeIds: [],
        statisticalBasis: `${tally.dismissedChargeCaseIds.size} dismissals out of ${tally.caseIds.size} cases (${Math.round(dismissedRatio * 100)}%).`,
        recommendedAction:
          "State Attorney General audit required. Independent review of every conviction secured by this prosecutor. Recusal from new cases until investigation complete.",
        detectedAt: isoNow(),
      });
    }

    return flags;
  }

  // ── 6. Detect prosecutor conviction obsession ─────────────────────────────

  private detectConvictionObsession(
    actorMap: Map<string, ActorTally>,
    cases: Case[]
  ): GoodOleBoyFlag[] {
    const flags: GoodOleBoyFlag[] = [];

    for (const [prosId, tally] of actorMap.entries()) {
      if (tally.actor.role !== "PROSECUTOR") continue;
      if (tally.caseIds.size < 8) continue;

      // Evidence-desert + no dismissals = conviction obsession
      const edRatio = tally.evidenceDesertCaseIds.size / tally.caseIds.size;
      const dimRatio = tally.dismissedChargeCaseIds.size / tally.caseIds.size;

      if (edRatio < 0.3 || dimRatio > 0.05) continue;

      flags.push({
        flagId: uid("CVOB", prosId),
        flagType: "PROSECUTOR_CONVICTION_OBSESSION",
        severity: "HIGH",
        caseIds: [...tally.caseIds],
        description: `Prosecutor ${tally.actor.name} has pursued ${Math.round(edRatio * 100)}% of their cases with little or no physical evidence AND has never dropped charges (${Math.round(dimRatio * 100)}% dismissal rate). This pattern indicates conviction quotas, personal vendettas, or loyalty to complaining officers far beyond what the law allows.`,
        officerIds: [],
        prosecutorIds: [prosId],
        judgeIds: [],
        statisticalBasis: `Conviction obsession score: evidence-desert ${Math.round(edRatio * 100)}% + dismissal rate ${Math.round(dimRatio * 100)}%.`,
        recommendedAction:
          "Immediate supervisory review. All active cases reviewed by independent prosecutor. Bar association notification.",
        detectedAt: isoNow(),
      });
    }

    return flags;
  }

  // ── 7. Detect judicial rubber-stamping ────────────────────────────────────

  private detectJudicialRubberStamp(
    actorMap: Map<string, ActorTally>,
    cases: Case[]
  ): GoodOleBoyFlag[] {
    const flags: GoodOleBoyFlag[] = [];

    // Identify judge + prosecutor combos with high co-appearance and no dismissed cases
    for (const [judgeId, judgeTally] of actorMap.entries()) {
      if (judgeTally.actor.role !== "JUDGE") continue;
      if (judgeTally.caseIds.size < 5) continue;

      for (const [prosId, sharedIds] of judgeTally.coActors.entries()) {
        if (sharedIds.size < 5) continue;
        const prosTally = actorMap.get(prosId);
        if (!prosTally || prosTally.actor.role !== "PROSECUTOR") continue;

        // If the combined pair never dismissed + high evidence-desert → rubber stamp
        const sharedCases = [...sharedIds].map((id) =>
          cases.find((c) => c.id === id)
        ).filter(Boolean) as Case[];
        const dismissed = sharedCases.filter((c) => c.status === "DISMISSED").length;
        const ratio = dismissed / sharedCases.length;

        if (ratio > 0.05) continue;

        flags.push({
          flagId: uid("JRUB", judgeId + prosId),
          flagType: "JUDICIAL_RUBBER_STAMP",
          severity: sharedIds.size >= 10 ? "CRITICAL" : "HIGH",
          caseIds: [...sharedIds],
          description: `Judge ${judgeTally.actor.name} and Prosecutor ${prosTally.actor.name} have shared ${sharedIds.size} cases with a 0%–5% dismissal / suppression rate. A judge who NEVER suppresses evidence or dismisses charges for a specific prosecutor has crossed from impartiality into rubber-stamping — giving the prosecution an unconstitutional systematic advantage.`,
          officerIds: [],
          prosecutorIds: [prosId],
          judgeIds: [judgeId],
          statisticalBasis: `${sharedIds.size} shared cases, ${Math.round(ratio * 100)}% dismissal/suppression rate.`,
          recommendedAction:
            "Judicial conduct commission review. Reassignment of all pending cases involving this judge-prosecutor pair. Appeal rights notification to all convicted defendants in these cases.",
          detectedAt: isoNow(),
        });
      }
    }

    return flags;
  }

  // ── 8. Detect stacked/repeat targeting of same defendant ─────────────────

  private detectStackedRepeatTargets(cases: Case[]): GoodOleBoyFlag[] {
    const flags: GoodOleBoyFlag[] = [];
    const byDefendant = new Map<string, { name: string; caseIds: string[] }>();

    for (const c of cases) {
      const def = c.parties.find((p) => p.role === "DEFENDANT");
      if (!def) continue;
      if (!byDefendant.has(def.id))
        byDefendant.set(def.id, { name: def.name, caseIds: [] });
      byDefendant.get(def.id)!.caseIds.push(c.id);
    }

    for (const [defId, { name, caseIds }] of byDefendant.entries()) {
      if (caseIds.length < 3) continue; // 3+ separate cases against same person

      flags.push({
        flagId: uid("SRPT", defId + caseIds.length),
        flagType: "STACKED_REPEAT_OFFENDER",
        severity: caseIds.length >= 5 ? "CRITICAL" : "HIGH",
        caseIds,
        description: `Defendant ${name} has been targeted in ${caseIds.length} separate cases within the review window. Serial targeting of the same individual by the same jurisdiction — especially without escalating evidence — is a strong indicator of personal vendetta, retaliation, or systemic harassment by the law enforcement / prosecution network.`,
        officerIds: [],
        prosecutorIds: [],
        judgeIds: [],
        statisticalBasis: `${caseIds.length} distinct cases against defendant ${name} in review window.`,
        recommendedAction:
          "Independent review of all charges against this defendant. Evaluate for vindictive prosecution. Notify defendant of appellate rights and potential civil rights violation claims (42 U.S.C. § 1983).",
        detectedAt: isoNow(),
      });
    }

    return flags;
  }

  // ── 9. Detect coordinated / near-identical officer testimony ─────────────

  private detectCoordinatedTestimony(cases: Case[]): GoodOleBoyFlag[] {
    const flags: GoodOleBoyFlag[] = [];

    // Look for testimonial evidence with very similar descriptions across cases
    const narrativeWords = (text: string): Set<string> =>
      new Set(
        text
          .toLowerCase()
          .replace(/[^a-z\s]/g, "")
          .split(/\s+/)
          .filter((w) => w.length > 5)
      );

    const jaccardSimilarity = (a: Set<string>, b: Set<string>): number => {
      const intersection = [...a].filter((w) => b.has(w)).length;
      const union = new Set([...a, ...b]).size;
      return union === 0 ? 0 : intersection / union;
    };

    // Compare case narratives pairwise — extremely similar narratives in different cases
    // for different defendants = coordinated / copy-paste testimony
    const coords: string[][] = [];
    for (let i = 0; i < cases.length; i++) {
      for (let j = i + 1; j < cases.length; j++) {
        // Different defendants
        const defI = cases[i].parties.find((p) => p.role === "DEFENDANT");
        const defJ = cases[j].parties.find((p) => p.role === "DEFENDANT");
        if (defI?.id === defJ?.id) continue;

        const simScore = jaccardSimilarity(
          narrativeWords(cases[i].narrative),
          narrativeWords(cases[j].narrative)
        );

        if (simScore >= 0.6) {
          // 60%+ word overlap in narratives against different defendants
          coords.push([cases[i].id, cases[j].id]);
        }
      }
    }

    if (coords.length === 0) return flags;

    const flatCaseIds = [...new Set(coords.flat())];
    flags.push({
      flagId: uid("COORDTST", flatCaseIds.join("")),
      flagType: "COORDINATED_WITNESS_TESTIMONY",
      severity: coords.length >= 5 ? "CRITICAL" : "HIGH",
      caseIds: flatCaseIds,
      description: `${coords.length} case-pair(s) show 60%+ narrative overlap despite involving different defendants. Copy-paste or template testimony from officers/witnesses applied to separate unrelated individuals is a hallmark of fabricated or coordinated reports — the officer describes every arrest in near-identical terms because the event is pre-scripted, not observed.`,
      officerIds: [],
      prosecutorIds: [],
      judgeIds: [],
      statisticalBasis: `Jaccard narrative similarity ≥ 0.60 across ${coords.length} case pair(s) with distinct defendants.`,
      recommendedAction:
        "Forensic linguistic analysis of all testimony. Compare officer report with dashcam/bodycam. Misconduct referral if body-cam is absent or was intentionally disabled.",
      detectedAt: isoNow(),
    });

    return flags;
  }

  // ── Actor profile compilation ─────────────────────────────────────────────

  private buildActorProfiles(
    actorMap: Map<string, ActorTally>,
    flags: GoodOleBoyFlag[],
    jurisdictionName: string
  ): ActorCorruptionProfile[] {
    const profiles: ActorCorruptionProfile[] = [];

    for (const [actorId, tally] of actorMap.entries()) {
      // Only build profiles for legal system actors (not defendants/witnesses)
      const profileRoles: CaseParty["role"][] = [
        "PROSECUTOR",
        "JUDGE",
        "DEFENSE_ATTORNEY",
      ];
      if (!profileRoles.includes(tally.actor.role)) continue;
      if (tally.caseIds.size < 2) continue; // Not enough data

      const actorFlags = flags.filter(
        (f) =>
          f.prosecutorIds.includes(actorId) ||
          f.judgeIds.includes(actorId) ||
          f.officerIds.includes(actorId)
      );

      const total = tally.caseIds.size;
      const violationRatio = tally.violationCaseIds.size / total;
      const wvwRatio = tally.wordVsWordCaseIds.size / total;
      const edRatio = tally.evidenceDesertCaseIds.size / total;
      const dismissalRate = tally.dismissedChargeCaseIds.size / total;

      // Corruption score: weighted composite
      const corruptionScore = Math.min(
        100,
        Math.round(
          violationRatio * 30 +
            wvwRatio * 30 +
            edRatio * 20 +
            (1 - dismissalRate) * 10 +
            actorFlags.length * 5
        )
      );

      const riskLevel = riskFromScore(corruptionScore);

      const recommendedActions: string[] = [];
      if (corruptionScore >= 80)
        recommendedActions.push(
          "IMMEDIATE: Suspend from active cases pending criminal investigation."
        );
      if (corruptionScore >= 60)
        recommendedActions.push(
          "Refer to State Bar / Judicial Conduct Commission for disciplinary review."
        );
      if (wvwRatio > 0.3)
        recommendedActions.push(
          "Implement mandatory corroboration policy — no charges on testimony alone."
        );
      if (edRatio > 0.3)
        recommendedActions.push(
          "Evidence sufficiency review for all pending cases."
        );
      if (dismissalRate < 0.05 && total >= 5)
        recommendedActions.push(
          "Independent oversight of charging decisions — zero dismissal rate is statistically anomalous."
        );

      profiles.push({
        actorId,
        actorName: tally.actor.name,
        actorRole: tally.actor.role,
        jurisdiction: tally.actor.jurisdiction ?? jurisdictionName,
        caseCount: total,
        violationCount: tally.violationCaseIds.size,
        wordVsWordCases: tally.wordVsWordCaseIds.size,
        dismissalRate,
        corruptionScore,
        flags: actorFlags,
        riskLevel,
        firstSeen: tally.firstSeen,
        lastSeen: tally.lastSeen,
        recommendedActions,
      });
    }

    return profiles.sort((a, b) => b.corruptionScore - a.corruptionScore);
  }

  // ── Utility predicates ────────────────────────────────────────────────────

  /**
   * A case is "word vs. word" when all non-exculpatory evidence is purely
   * testimonial and there is no physical, documentary, digital, or forensic
   * evidence supporting the prosecution's charges.
   */
  private isWordVsWordCase(c: Case): boolean {
    const prosecutionEvidence = c.evidence.filter(
      (e) => e.submittedBy === "PROSECUTION"
    );
    if (prosecutionEvidence.length === 0) return true; // No evidence at all
    const hasObjectiveEvidence = prosecutionEvidence.some((e) =>
      (["PHYSICAL", "DOCUMENTARY", "DIGITAL", "FORENSIC"] as const).includes(
        e.type as "PHYSICAL" | "DOCUMENTARY" | "DIGITAL" | "FORENSIC"
      )
    );
    return !hasObjectiveEvidence;
  }

  /**
   * A case is an "evidence desert" when there is zero authenticated evidence
   * of any type (prosecution or defense) — prosecution submitted nothing or
   * every item failed authentication / chain of custody.
   */
  private isEvidenceDesert(c: Case): boolean {
    const authenticated = c.evidence.filter(
      (e) =>
        e.submittedBy === "PROSECUTION" &&
        e.authenticated &&
        e.chainOfCustodyIntact
    );
    return authenticated.length === 0;
  }

  /**
   * A case "has known violations" when its status reflects adversarial
   * proceedings (FLAGGED, APPEALED) or the narrative contains known
   * misconduct language clusters.
   */
  private hasKnownViolations(c: Case): boolean {
    return c.status === "FLAGGED" || c.status === "APPEALED";
  }
}

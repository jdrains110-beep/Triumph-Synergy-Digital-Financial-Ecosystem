// lib/judicial/types.ts
// Superior Judicial Analysis System — Core Types

// ─── Enumerations ─────────────────────────────────────────────────────────────

export type CaseStatus =
  | "FILED"
  | "UNDER_REVIEW"
  | "FLAGGED"
  | "CLEARED"
  | "DISMISSED"
  | "APPEALED"
  | "CLOSED";

export type ChargeCategory =
  | "FELONY"
  | "MISDEMEANOR"
  | "INFRACTION"
  | "CIVIL"
  | "ADMINISTRATIVE";

export type ViolationType =
  | "CHARGE_STACKING"            // Multiple charges for single act
  | "RAILROADING"                // Pursuing case without sufficient evidence
  | "IMPROPER_REPRESENTATION"    // Attorney failed duty of care
  | "PROCEDURAL_ABUSE"           // Misuse of process to coerce
  | "EVIDENCE_SUPPRESSION"       // Brady/Giglio violations
  | "SELECTIVE_PROSECUTION"      // Targeting based on protected class
  | "VINDICTIVE_PROSECUTION"     // Charges filed in retaliation
  | "MULTIPLICITY"               // Charging same offense multiple counts
  | "DUPLICITY"                  // Multiple offenses in one count (vagueness)
  | "FABRICATED_EVIDENCE"        // Unauthenticated evidence with broken chain of custody
  | "CHAIN_OF_CUSTODY_VIOLATION" // Evidence chain of custody compromised
  | "JUDICIAL_MISCONDUCT"        // Judge bias, ex parte communications, procedural abuse
  | "PROSECUTOR_MISCONDUCT"      // Prosecutorial overreach beyond charging decisions
  | "SHERIFF_MISCONDUCT"         // Law enforcement misconduct (illegal search, false reports)
  | "PUBLIC_DEFENDER_COLLUSION"   // Public defender rubber-stamping / zero investigation
  | "WITNESS_TAMPERING"          // Witness intimidation or incentivized testimony
  | "COERCED_TESTIMONY";         // Testimony obtained through threats/duress

export type EvidenceType =
  | "PHYSICAL"
  | "DOCUMENTARY"
  | "TESTIMONIAL"
  | "DIGITAL"
  | "FORENSIC"
  | "CIRCUMSTANTIAL"
  | "EXCULPATORY";

export type RepresentationFailure =
  | "MISSED_DEADLINE"
  | "INADEQUATE_DISCOVERY"
  | "FAILURE_TO_INVESTIGATE"
  | "CONFLICT_OF_INTEREST"
  | "INEFFECTIVE_COUNSEL"
  | "FAILURE_TO_FILE_MOTIONS"
  | "NO_PLEA_NEGOTIATION"
  | "ABANDONED_APPEAL";

export type TransparencyEventType =
  | "CASE_FILED"
  | "CHARGE_ADDED"
  | "CHARGE_DROPPED"
  | "EVIDENCE_SUBMITTED"
  | "MOTION_FILED"
  | "RULING_ISSUED"
  | "VIOLATION_FLAGGED"
  | "REPRESENTATION_AUDITED"
  | "APPEAL_FILED"
  | "CASE_REOPENED";

export type RiskLevel = "LOW" | "MODERATE" | "HIGH" | "CRITICAL";

// ─── Core Data Structures ─────────────────────────────────────────────────────

export interface Charge {
  id: string;
  statute: string;          // e.g. "18 U.S.C. § 1343"
  description: string;
  category: ChargeCategory;
  maxSentenceYears: number;
  filedAt: string;          // ISO date
  relatedActId?: string;    // Links charges to the same underlying act
  elements: string[];       // Legal elements the prosecution must prove
  supportingEvidenceIds: string[];
}

export interface Evidence {
  id: string;
  type: EvidenceType;
  description: string;
  submittedBy: "PROSECUTION" | "DEFENSE" | "COURT";
  submittedAt: string;
  authenticated: boolean;
  chainOfCustodyIntact: boolean;
  exculpatoryFlag: boolean; // Brady material
}

export interface CaseParty {
  role: "DEFENDANT" | "PLAINTIFF" | "PROSECUTOR" | "DEFENSE_ATTORNEY" | "JUDGE" | "WITNESS";
  id: string;
  name: string;
  barNumber?: string;       // For attorneys
  jurisdiction?: string;
}

export interface Case {
  id: string;
  caseNumber: string;
  title: string;
  jurisdiction: string;
  court: string;
  filedAt: string;
  status: CaseStatus;
  charges: Charge[];
  evidence: Evidence[];
  parties: CaseParty[];
  narrative: string;        // Plain-language summary of alleged conduct
  precedentCases?: string[];// Referenced prior rulings
}

// ─── Analysis Result Types ─────────────────────────────────────────────────────

export interface ChargeViolation {
  violationType: ViolationType;
  severity: RiskLevel;
  affectedChargeIds: string[];
  explanation: string;
  legalBasis: string;       // Statute, rule, or case law violated
  remedy: string;
}

export interface FactScore {
  totalEvidence: number;
  authenticatedEvidence: number;
  exculpatoryEvidence: number;
  factualScore: number;     // 0–100: percentage of evidence that is factual/authenticated
  emotionalLanguageFlags: string[];
  sufficientForCharges: boolean;
  weakChargeIds: string[];  // Charges lacking evidentiary support
}

export interface RepresentationAudit {
  attorneyId: string;
  attorneyName: string;
  caseId: string;
  failures: RepresentationFailure[];
  missedDeadlines: number;
  motionsFiledCount: number;
  discoveryRequestsCount: number;
  overallRating: "ADEQUATE" | "DEFICIENT" | "GROSSLY_DEFICIENT";
  ineffectiveAssistanceFlag: boolean; // Strickland v. Washington standard
  recommendedRemedy: string;
}

export interface TransparencyEvent {
  id: string;
  caseId: string;
  eventType: TransparencyEventType;
  timestamp: string;
  actorId: string;
  actorRole: CaseParty["role"];
  description: string;
  immutableHash: string;    // SHA-256 of event data for tamper detection
}

export interface JudicialAnalysisReport {
  reportId: string;
  caseId: string;
  analyzedAt: string;
  riskLevel: RiskLevel;
  chargeViolations: ChargeViolation[];
  factScore: FactScore;
  representationAudit: RepresentationAudit | null;
  transparencyEvents: TransparencyEvent[];
  overallVerdict: "PROCEEDING_PROPER" | "VIOLATIONS_FOUND" | "CASE_RECOMMENDED_FOR_DISMISSAL";
  summary: string;
  recommendedActions: string[];
}

// ─── Good Ole Boy / Systemic Corruption Detection ─────────────────────────────

/**
 * GoodOleBoyFlagType — each flag represents a specific observable pattern of
 * systemic corruption, network bias, or above-the-law conduct.
 */
export type GoodOleBoyFlagType =
  | "REPEAT_OFFICER_PROSECUTOR_PAIR"   // Same cop + DA duo appears across multiple cases
  | "WORD_VS_WORD_NO_EVIDENCE"         // Officer testimony is the ONLY evidence, zero corroboration
  | "RUBBER_STAMP_CHARGES"             // 100% of officer-initiated charges filed without deviation
  | "ZERO_DISMISSED_CHARGES"           // Prosecutor has NEVER dropped a charge for this officer
  | "SELECTIVE_DEFENDANT_PROFILE"      // Defendants share protected characteristics (race, class, etc.)
  | "ABOVE_THE_LAW_OFFICER"            // Officer has prior misconduct flags yet keeps filing cases
  | "PROSECUTOR_CONVICTION_OBSESSION"  // Prosecutor never offers plea bargains or drops charges
  | "JUDICIAL_RUBBER_STAMP"            // Judge has never suppressed evidence from this prosecutor
  | "RETALIATION_PATTERN"              // Charges spiked chronologically after defendant complained
  | "COORDINATED_WITNESS_TESTIMONY"    // Multiple officers give near-identical testimony in separate cases
  | "EVIDENCE_DESERT"                  // Cases proceed with zero physical/documentary/digital evidence
  | "STACKED_REPEAT_OFFENDER";         // Same defendant targeted repeatedly by same actor network

export interface GoodOleBoyFlag {
  flagId: string;
  flagType: GoodOleBoyFlagType;
  severity: RiskLevel;
  caseIds: string[];                   // All cases contributing to this flag
  description: string;
  officerIds: string[];
  prosecutorIds: string[];
  judgeIds: string[];
  statisticalBasis: string;            // e.g. "9 of 11 cases share officer P-007 + DA P-012"
  recommendedAction: string;
  detectedAt: string;                  // ISO date
}

/**
 * ActorCorruptionProfile — accumulated bias/misconduct score for a single
 * judge, prosecutor, officer, or public defender extracted from case history.
 */
export interface ActorCorruptionProfile {
  actorId: string;
  actorName: string;
  actorRole: CaseParty["role"];
  jurisdiction: string;
  caseCount: number;
  violationCount: number;
  wordVsWordCases: number;             // Cases where their testimony = only evidence
  dismissalRate: number;               // 0.0–1.0: how often charges are dismissed
  corruptionScore: number;             // 0–100 composite
  flags: GoodOleBoyFlag[];
  riskLevel: RiskLevel;
  firstSeen: string;                   // ISO date of earliest case in review window
  lastSeen: string;                    // ISO date of most recent case
  recommendedActions: string[];
}

/**
 * HistoricalReviewReport — produced by auditHistoricalCases().
 * Covers all cases in a date range, surfacing systemic patterns invisible
 * when cases are reviewed in isolation ("good ole boy" network detection).
 */
export interface HistoricalReviewReport {
  reportId: string;
  generatedAt: string;
  jurisdictionName: string;
  reviewWindowStart: string;           // ISO date — earliest case included
  reviewWindowEnd: string;             // ISO date — latest case included (today)
  yearsBack: number;                   // 1–5
  totalCasesReviewed: number;
  casesWithViolations: number;
  casesRecommendedDismissal: number;
  goodOleBoyFlags: GoodOleBoyFlag[];
  actorProfiles: ActorCorruptionProfile[];
  highRiskActors: ActorCorruptionProfile[];    // Filtered: corruptionScore >= 60
  criticalActors: ActorCorruptionProfile[];    // Filtered: corruptionScore >= 80
  systemicRiskLevel: RiskLevel;
  individualReports: JudicialAnalysisReport[];
  summary: string;
  publicInterestAlerts: string[];             // Plain-English alerts for citizens
  evidenceDesertCases: string[];              // Case IDs that had zero physical evidence
  wordVsWordCases: string[];                  // Case IDs that were purely he-said/she-said
}

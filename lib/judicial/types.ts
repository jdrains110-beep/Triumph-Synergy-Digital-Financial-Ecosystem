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

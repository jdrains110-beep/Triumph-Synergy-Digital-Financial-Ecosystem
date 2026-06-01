/**
 * Judicial Monitor Service — Bootstrap
 *
 * Superior Courtroom Transparency & Anti-Railroading Engine
 * Florida-first deployment — real-time monitoring, evidence verification,
 * charge-stacking detection, fabricated evidence detection, judicial/prosecutor/
 * sheriff/public-defender misconduct tracking, bias/vendetta identification,
 * authority notification pipeline, and immutable transparency ledger with
 * SHA-256 hash chains.
 *
 * Detection Capabilities:
 *   • Charge Stacking / Multiplicity (Blockburger test)
 *   • Railroading (insufficient evidence — Jackson v. Virginia)
 *   • Evidence Suppression (Brady/Giglio violations)
 *   • Fabricated Evidence (unauthenticated + broken chain of custody)
 *   • Chain of Custody Violations (Melendez-Diaz standard)
 *   • Judicial Misconduct (bias, ex parte, procedural abuse)
 *   • Prosecutor Misconduct (overreach, vindictive/selective prosecution)
 *   • Sheriff / Law Enforcement Misconduct (illegal search, false reports)
 *   • Public Defender Collusion (rubber-stamping, zero investigation)
 *   • Witness Tampering / Coerced Testimony (Giglio impeachment)
 *   • Emotional Language / Vendetta Detection
 *   • Disproportionate Sentencing (Solem v. Helm)
 *   • Strickland Representation Audit
 *
 * Authority Notification Pipeline:
 *   → Florida Bar Association (attorney misconduct)
 *   → FDLE — Florida Dept. of Law Enforcement (law enforcement misconduct)
 *   → JQC — Judicial Qualifications Commission (judicial misconduct)
 *   → DOJ Civil Rights Division (civil rights violations)
 *   → Florida Attorney General (systemic prosecution issues)
 *   → Office of Inspector General (institutional corruption)
 *   → Clerk of Court (procedural record-keeping)
 *
 * Endpoints:
 *   GET  /health                          — liveness probe
 *   GET  /metrics                         — Prometheus metrics
 *   POST /api/judicial/analyze            — analyse a single case
 *   POST /api/judicial/batch              — historical batch audit
 *   GET  /api/judicial/cases              — list monitored cases
 *   GET  /api/judicial/cases/:id          — single case detail + report
 *   GET  /api/judicial/monitor/florida    — Florida court monitoring overview
 *   GET  /api/judicial/ledger             — global transparency ledger
 *   GET  /api/judicial/ledger/:caseId     — case-specific ledger events
 *   POST /api/judicial/report             — generate downloadable report
 *   GET  /api/judicial/stats              — aggregate violation statistics
 *   GET  /api/judicial/notifications      — authority notification queue
 */

// Copyright (C) 2024-2026 Jeremiah Joel Drains, Founder & Superior Sovereign / Triumph Synergy. All rights reserved.
// License: PiOS
// Copyright (C) 2024-2026 Jeremiah Joel Drains, Founder & Superior Sovereign / Triumph Synergy. All rights reserved.
// License: PiOS


import http from "node:http";
import { createClient } from "redis";
import { Pool } from "pg";
import crypto from "node:crypto";

const PORT      = 8096;
const REDIS_URL = process.env.REDIS_URL    ?? "redis://triumph-redis:6379";
const DB_URL    = process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? "";
const NETWORK   = process.env.PI_NETWORK_MODE ?? "mainnet";

// ─── Metrics ──────────────────────────────────────────────────────────────────

let casesAnalyzed           = 0;
let violationsFound         = 0;
let dismissalsRecommended   = 0;
let alertsPublished         = 0;
let authorityNotifications  = 0;
let ready                   = false;
let shuttingDown            = false;
let activeRequests          = 0;
let redisConnected          = false;
let pgConnected             = false;

// ─── Redis ────────────────────────────────────────────────────────────────────

const redis = createClient({
  url: REDIS_URL,
  socket: {
    reconnectStrategy: (retries: number) => Math.min(retries * 500, 5000),
    connectTimeout: 10_000,
  },
});
const redisSub = redis.duplicate();

redis.on("error",      (e: Error) => console.error("[redis]", e.message));
redis.on("connect",    ()         => { redisConnected = true;  console.log("[redis] connected"); });
redis.on("disconnect", ()         => { redisConnected = false; console.warn("[redis] disconnected"); });

redisSub.on("error",      (e: Error) => console.error("[redisSub]", e.message));
redisSub.on("connect",    ()         => console.log("[redisSub] connected"));
redisSub.on("disconnect", ()         => console.warn("[redisSub] disconnected — will retry"));

// ─── Postgres ─────────────────────────────────────────────────────────────────

const pool = DB_URL ? new Pool({ connectionString: DB_URL, max: 5, connectionTimeoutMillis: 10_000 }) : null;
if (pool) {
  pool.on("error", (e: Error) => {
    pgConnected = false;
    console.error("[pg] pool error:", e.message);
  });
}

// ─── Robust Connection Management ─────────────────────────────────────────────

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function connectRedisWithRetry(maxRetries = 15): Promise<boolean> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (!redis.isOpen) await redis.connect();
      redisConnected = true;
      console.log(`[redis] connected on attempt ${attempt}`);
      return true;
    } catch (e) {
      const wait = Math.min(attempt * 1000, 10_000);
      console.warn(`[redis] attempt ${attempt}/${maxRetries} failed: ${(e as Error).message} — retrying in ${wait}ms`);
      await delay(wait);
    }
  }
  console.error("[redis] all connect attempts exhausted");
  return false;
}

async function connectRedisSubWithRetry(maxRetries = 15): Promise<boolean> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (!redisSub.isOpen) await redisSub.connect();
      console.log(`[redisSub] connected on attempt ${attempt}`);
      return true;
    } catch (e) {
      const wait = Math.min(attempt * 1000, 10_000);
      console.warn(`[redisSub] attempt ${attempt}/${maxRetries} failed: ${(e as Error).message} — retrying in ${wait}ms`);
      await delay(wait);
    }
  }
  console.error("[redisSub] all connect attempts exhausted");
  return false;
}

async function connectPostgresWithRetry(maxRetries = 15): Promise<boolean> {
  if (!pool) return false;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const client = await pool.connect();
      client.release();
      pgConnected = true;
      console.log(`[pg] connected on attempt ${attempt}`);
      return true;
    } catch (e) {
      const wait = Math.min(attempt * 1000, 10_000);
      console.warn(`[pg] attempt ${attempt}/${maxRetries} failed: ${(e as Error).message} — retrying in ${wait}ms`);
      await delay(wait);
    }
  }
  console.error("[pg] all connect attempts exhausted");
  return false;
}

/** Periodic reconnection loop — re-establishes broken connections every 30s */
let reconnectTimer: ReturnType<typeof setInterval> | null = null;

function startReconnectLoop() {
  reconnectTimer = setInterval(async () => {
    if (shuttingDown) return;

    // Check Redis main client
    if (!redis.isOpen || !redisConnected) {
      console.warn("[reconnect] Redis main down — reconnecting...");
      try {
        if (!redis.isOpen) await redis.connect();
        redisConnected = true;
        console.log("[reconnect] Redis main restored");
      } catch (e) {
        console.error("[reconnect] Redis main:", (e as Error).message);
      }
    }

    // Check Redis subscriber
    if (!redisSub.isOpen) {
      console.warn("[reconnect] Redis subscriber down — reconnecting...");
      try {
        await redisSub.connect();
        await redisSub.subscribe("judicial:case:submit", handleCaseSubmission);
        console.log("[reconnect] Redis subscriber restored + resubscribed");
      } catch (e) {
        console.error("[reconnect] Redis sub:", (e as Error).message);
      }
    }

    // Check Postgres
    if (pool && !pgConnected) {
      console.warn("[reconnect] Postgres down — reconnecting...");
      try {
        const client = await pool.connect();
        client.release();
        pgConnected = true;
        await ensureTables();
        console.log("[reconnect] Postgres restored");
      } catch (e) {
        console.error("[reconnect] Postgres:", (e as Error).message);
      }
    }

    // Update ready state based on actual connection health
    ready = redisConnected && (pgConnected || !pool);
  }, 30_000);
}

// ─── Database Schema ──────────────────────────────────────────────────────────

async function ensureTables() {
  if (!pool) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS judicial_cases (
      id               TEXT PRIMARY KEY,
      case_number      TEXT NOT NULL,
      title            TEXT NOT NULL,
      jurisdiction     TEXT NOT NULL DEFAULT 'Florida',
      court            TEXT NOT NULL,
      status           TEXT NOT NULL DEFAULT 'FILED',
      filed_at         TIMESTAMPTZ NOT NULL,
      case_data        JSONB NOT NULL,
      created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_judicial_cases_jurisdiction ON judicial_cases(jurisdiction);
    CREATE INDEX IF NOT EXISTS idx_judicial_cases_status       ON judicial_cases(status);
    CREATE INDEX IF NOT EXISTS idx_judicial_cases_filed        ON judicial_cases(filed_at DESC);

    CREATE TABLE IF NOT EXISTS judicial_reports (
      report_id        TEXT PRIMARY KEY,
      case_id          TEXT NOT NULL REFERENCES judicial_cases(id),
      risk_level       TEXT NOT NULL,
      overall_verdict  TEXT NOT NULL,
      violations_count INT  NOT NULL DEFAULT 0,
      fact_score       INT  NOT NULL DEFAULT 0,
      report_data      JSONB NOT NULL,
      analyzed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_judicial_reports_case    ON judicial_reports(case_id);
    CREATE INDEX IF NOT EXISTS idx_judicial_reports_verdict ON judicial_reports(overall_verdict);
    CREATE INDEX IF NOT EXISTS idx_judicial_reports_risk    ON judicial_reports(risk_level);

    CREATE TABLE IF NOT EXISTS judicial_ledger_events (
      id               TEXT PRIMARY KEY,
      case_id          TEXT NOT NULL,
      event_type       TEXT NOT NULL,
      actor_id         TEXT,
      actor_role       TEXT,
      description      TEXT NOT NULL,
      immutable_hash   TEXT NOT NULL,
      prev_hash        TEXT,
      recorded_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_ledger_case      ON judicial_ledger_events(case_id);
    CREATE INDEX IF NOT EXISTS idx_ledger_type      ON judicial_ledger_events(event_type);
    CREATE INDEX IF NOT EXISTS idx_ledger_recorded  ON judicial_ledger_events(recorded_at DESC);

    CREATE TABLE IF NOT EXISTS judicial_alerts (
      id               TEXT PRIMARY KEY,
      case_id          TEXT NOT NULL,
      alert_type       TEXT NOT NULL,
      severity         TEXT NOT NULL,
      description      TEXT NOT NULL,
      acknowledged     BOOLEAN NOT NULL DEFAULT FALSE,
      created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE INDEX IF NOT EXISTS idx_alerts_severity ON judicial_alerts(severity);
    CREATE INDEX IF NOT EXISTS idx_alerts_ack      ON judicial_alerts(acknowledged);

    CREATE TABLE IF NOT EXISTS judicial_authority_notifications (
      id               TEXT PRIMARY KEY,
      case_id          TEXT NOT NULL,
      authority        TEXT NOT NULL,
      authority_name   TEXT NOT NULL,
      violation_type   TEXT NOT NULL,
      severity         TEXT NOT NULL,
      summary          TEXT NOT NULL,
      case_reference   TEXT NOT NULL,
      status           TEXT NOT NULL DEFAULT 'QUEUED',
      queued_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      transmitted_at   TIMESTAMPTZ,
      response         TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_auth_notif_authority ON judicial_authority_notifications(authority);
    CREATE INDEX IF NOT EXISTS idx_auth_notif_status    ON judicial_authority_notifications(status);
    CREATE INDEX IF NOT EXISTS idx_auth_notif_severity  ON judicial_authority_notifications(severity);
    CREATE INDEX IF NOT EXISTS idx_auth_notif_case      ON judicial_authority_notifications(case_id);
  `);
  console.log("[pg] all tables ensured (including authority notifications)");
}

// ─── Violation Types ──────────────────────────────────────────────────────────

type ViolationType =
  | "CHARGE_STACKING" | "RAILROADING" | "IMPROPER_REPRESENTATION"
  | "PROCEDURAL_ABUSE" | "EVIDENCE_SUPPRESSION" | "SELECTIVE_PROSECUTION"
  | "VINDICTIVE_PROSECUTION" | "MULTIPLICITY" | "DUPLICITY"
  | "FABRICATED_EVIDENCE" | "CHAIN_OF_CUSTODY_VIOLATION"
  | "JUDICIAL_MISCONDUCT" | "PROSECUTOR_MISCONDUCT"
  | "SHERIFF_MISCONDUCT" | "PUBLIC_DEFENDER_COLLUSION"
  | "WITNESS_TAMPERING" | "COERCED_TESTIMONY";

type RiskLevel = "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
type EvidenceType = "PHYSICAL" | "DOCUMENTARY" | "TESTIMONIAL" | "DIGITAL" | "FORENSIC" | "CIRCUMSTANTIAL" | "EXCULPATORY";

// ─── Authority Notification Types ─────────────────────────────────────────────

type AuthorityTarget =
  | "FLORIDA_BAR"
  | "FDLE"
  | "JQC"
  | "DOJ_CIVIL_RIGHTS"
  | "STATE_ATTORNEY_GENERAL"
  | "INSPECTOR_GENERAL"
  | "CLERK_OF_COURT";

const VIOLATION_AUTHORITY_MAP: Record<string, AuthorityTarget[]> = {
  JUDICIAL_MISCONDUCT:        ["JQC", "FLORIDA_BAR", "INSPECTOR_GENERAL"],
  PROSECUTOR_MISCONDUCT:      ["FLORIDA_BAR", "STATE_ATTORNEY_GENERAL", "INSPECTOR_GENERAL"],
  SHERIFF_MISCONDUCT:         ["FDLE", "DOJ_CIVIL_RIGHTS", "INSPECTOR_GENERAL"],
  PUBLIC_DEFENDER_COLLUSION:  ["FLORIDA_BAR", "INSPECTOR_GENERAL", "CLERK_OF_COURT"],
  FABRICATED_EVIDENCE:        ["FDLE", "DOJ_CIVIL_RIGHTS", "INSPECTOR_GENERAL", "STATE_ATTORNEY_GENERAL"],
  EVIDENCE_SUPPRESSION:       ["FLORIDA_BAR", "STATE_ATTORNEY_GENERAL"],
  WITNESS_TAMPERING:          ["FDLE", "DOJ_CIVIL_RIGHTS", "STATE_ATTORNEY_GENERAL"],
  COERCED_TESTIMONY:          ["FDLE", "DOJ_CIVIL_RIGHTS"],
  VINDICTIVE_PROSECUTION:     ["FLORIDA_BAR", "DOJ_CIVIL_RIGHTS", "STATE_ATTORNEY_GENERAL"],
  SELECTIVE_PROSECUTION:      ["DOJ_CIVIL_RIGHTS", "STATE_ATTORNEY_GENERAL", "INSPECTOR_GENERAL"],
  CHARGE_STACKING:            ["STATE_ATTORNEY_GENERAL"],
  RAILROADING:                ["STATE_ATTORNEY_GENERAL", "INSPECTOR_GENERAL"],
  CHAIN_OF_CUSTODY_VIOLATION: ["FDLE", "CLERK_OF_COURT"],
  PROCEDURAL_ABUSE:           ["JQC", "STATE_ATTORNEY_GENERAL"],
  IMPROPER_REPRESENTATION:    ["FLORIDA_BAR"],
  MULTIPLICITY:               ["CLERK_OF_COURT"],
  DUPLICITY:                  ["CLERK_OF_COURT"],
};

const AUTHORITY_DETAILS: Record<AuthorityTarget, { name: string; jurisdiction: string; contact: string }> = {
  FLORIDA_BAR:            { name: "The Florida Bar — Attorney Discipline",      jurisdiction: "Florida", contact: "https://www.floridabar.org/the-florida-bar-news/attorney-discipline/" },
  FDLE:                   { name: "Florida Department of Law Enforcement",       jurisdiction: "Florida", contact: "https://www.fdle.state.fl.us/" },
  JQC:                    { name: "Florida Judicial Qualifications Commission",  jurisdiction: "Florida", contact: "https://www.floridajqc.com/" },
  DOJ_CIVIL_RIGHTS:       { name: "U.S. DOJ Civil Rights Division",             jurisdiction: "Federal", contact: "https://www.justice.gov/crt" },
  STATE_ATTORNEY_GENERAL: { name: "Florida Attorney General",                    jurisdiction: "Florida", contact: "https://www.myfloridalegal.com/" },
  INSPECTOR_GENERAL:      { name: "Office of Inspector General",                 jurisdiction: "Federal", contact: "https://oig.justice.gov/" },
  CLERK_OF_COURT:         { name: "Clerk of Court (Local Circuit)",              jurisdiction: "Local",   contact: "Local clerk of circuit court" },
};

// ─── Data Interfaces ──────────────────────────────────────────────────────────

interface Charge {
  id: string;
  statute: string;
  description: string;
  category: string;
  maxSentenceYears: number;
  filedAt: string;
  relatedActId?: string;
  elements: string[];
  supportingEvidenceIds: string[];
}

interface Evidence {
  id: string;
  type: EvidenceType;
  description: string;
  submittedBy: "PROSECUTION" | "DEFENSE" | "COURT";
  submittedAt: string;
  authenticated: boolean;
  chainOfCustodyIntact: boolean;
  exculpatoryFlag: boolean;
}

interface CaseParty {
  role: string;
  id: string;
  name: string;
  barNumber?: string;
  jurisdiction?: string;
}

interface Case {
  id: string;
  caseNumber: string;
  title: string;
  jurisdiction: string;
  court: string;
  filedAt: string;
  status: string;
  charges: Charge[];
  evidence: Evidence[];
  parties: CaseParty[];
  narrative: string;
  precedentCases?: string[];
}

interface ChargeViolation {
  violationType: ViolationType;
  severity: RiskLevel;
  affectedChargeIds: string[];
  explanation: string;
  legalBasis: string;
  remedy: string;
}

interface TransparencyEvent {
  id: string;
  caseId: string;
  eventType: string;
  timestamp: string;
  actorId: string;
  actorRole: string;
  description: string;
  immutableHash: string;
}

// ─── Detection Pattern Databases ──────────────────────────────────────────────

const EMOTIONAL_PATTERNS = [
  "brazen", "predator", "monster", "evil", "remorseless", "dangerous",
  "no remorse", "hardened", "callous", "menace", "cold-blooded",
  "scum", "animal", "thug", "career criminal", "irredeemable",
  "depraved", "vicious"
];

const FABRICATION_INDICATORS = [
  /metadata\s*(altered|modified|inconsistent)/i,
  /chain\s*of\s*custody\s*(broken|missing|incomplete)/i,
  /evidence\s*(planted|fabricated|manufactured)/i,
  /timestamp\s*(mismatch|discrepancy|altered)/i,
  /forensic\s*(inconsistency|tampering|contamination)/i,
  /document\s*(forged|falsified|backdated)/i,
  /witness\s*(recant|retract|coerced)/i,
];

const JUDICIAL_MISCONDUCT_PATTERNS = [
  /ex\s*parte\s*(communication|contact|meeting)/i,
  /judge\s*(bias|prejudice|predetermined)/i,
  /denied\s*all\s*(motions|defense\s*motions)/i,
  /no\s*hearing\s*(held|conducted|granted)/i,
  /summary\s*judgment\s*without\s*hearing/i,
  /refused\s*(recusal|to\s*recuse)/i,
  /personal\s*relationship\s*with\s*(prosecutor|prosecution)/i,
  /campaign\s*contribution/i,
];

const WITNESS_TAMPERING_PATTERNS = [
  /witness\s*(threatened|intimidated|coerced)/i,
  /testimony\s*(coerced|forced|pressured)/i,
  /plea\s*deal\s*in\s*exchange\s*for\s*testimony/i,
  /jailhouse\s*(informant|snitch)/i,
  /incentivized\s*testimony/i,
  /witness\s*(changed|recanted)\s*(story|testimony|statement)/i,
];

const SHERIFF_MISCONDUCT_PATTERNS = [
  /excessive\s*force/i,
  /illegal\s*search/i,
  /warrantless\s*(search|seizure|entry)/i,
  /miranda\s*(not\s*read|violation|omitted)/i,
  /body\s*cam\s*(off|disabled|missing|unavailable)/i,
  /evidence\s*(mishandled|lost|destroyed|contaminated)/i,
  /arrest\s*without\s*probable\s*cause/i,
  /false\s*(arrest|report|affidavit)/i,
  /officer\s*(lied|perjury|false\s*testimony)/i,
];

// ─── Analysis Engine ──────────────────────────────────────────────────────────

function computeHash(data: string, prevHash?: string): string {
  const input = prevHash ? `${prevHash}:${data}` : data;
  return crypto.createHash("sha256").update(input).digest("hex");
}

function analyzeCase(caseData: Case, options?: {
  motionsFiled?: number;
  discoveryRequestsMade?: number;
  hadPleaNegotiations?: boolean;
  missedDeadlines?: string[];
}) {
  const violations: ChargeViolation[] = [];
  const events: TransparencyEvent[] = [];
  let prevHash = "";

  // ── Record case filing in ledger ──
  const filingEvent: TransparencyEvent = {
    id: crypto.randomUUID(),
    caseId: caseData.id,
    eventType: "CASE_FILED",
    timestamp: caseData.filedAt,
    actorId: "SYSTEM",
    actorRole: "SYSTEM",
    description: `Case ${caseData.caseNumber} filed: ${caseData.title}`,
    immutableHash: "",
  };
  filingEvent.immutableHash = computeHash(JSON.stringify(filingEvent));
  prevHash = filingEvent.immutableHash;
  events.push(filingEvent);

  // ══════════════════════════════════════════════════════════════════════════
  //  1 — Charge Stacking / Multiplicity Detection
  // ══════════════════════════════════════════════════════════════════════════

  const actGroups = new Map<string, Charge[]>();
  for (const charge of caseData.charges) {
    const key = charge.relatedActId ?? charge.id;
    const group = actGroups.get(key) ?? [];
    group.push(charge);
    actGroups.set(key, group);
  }

  for (const [actId, charges] of actGroups.entries()) {
    if (charges.length > 1) {
      const unique = new Set(charges.map(c => c.elements.sort().join("|")));
      if (unique.size < charges.length) {
        violations.push({
          violationType: "MULTIPLICITY",
          severity: "HIGH",
          affectedChargeIds: charges.map(c => c.id),
          explanation: `Multiple charges for act '${actId}' share identical legal elements — violates Double Jeopardy.`,
          legalBasis: "Blockburger v. United States, 284 U.S. 299 (1932)",
          remedy: "Dismiss duplicative counts; retain only the most serious charge per act.",
        });
      }

      if (charges.length >= 3) {
        violations.push({
          violationType: "CHARGE_STACKING",
          severity: "CRITICAL",
          affectedChargeIds: charges.map(c => c.id),
          explanation: `${charges.length} charges stacked on single act '${actId}' — prosecutorial overreach to coerce plea.`,
          legalBasis: "Missouri v. Hunter, 459 U.S. 359 (1983); plea coercion doctrine",
          remedy: "Review for prosecutorial intent to leverage plea bargaining through excessive charges.",
        });
      }
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  2 — Evidence Sufficiency (Railroading Detection)
  // ══════════════════════════════════════════════════════════════════════════

  for (const charge of caseData.charges) {
    const supporting = charge.supportingEvidenceIds
      .map(id => caseData.evidence.find(e => e.id === id))
      .filter(Boolean);
    if (supporting.length === 0) {
      violations.push({
        violationType: "RAILROADING",
        severity: "CRITICAL",
        affectedChargeIds: [charge.id],
        explanation: `Charge '${charge.description}' (${charge.statute}) has ZERO supporting evidence — proceeding without factual basis.`,
        legalBasis: "Jackson v. Virginia, 443 U.S. 307 (1979) — rational trier of fact standard",
        remedy: "Dismiss charge for lack of evidentiary basis or require prosecution to present evidence.",
      });
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  3 — Brady / Giglio Evidence Suppression
  // ══════════════════════════════════════════════════════════════════════════

  const exculpatory = caseData.evidence.filter(e => e.exculpatoryFlag);
  const defenseEvidence = caseData.evidence.filter(e => e.submittedBy === "DEFENSE");
  if (exculpatory.length > 0 && defenseEvidence.length === 0) {
    violations.push({
      violationType: "EVIDENCE_SUPPRESSION",
      severity: "CRITICAL",
      affectedChargeIds: caseData.charges.map(c => c.id),
      explanation: `${exculpatory.length} exculpatory item(s) exist but none submitted by defense — possible Brady violation.`,
      legalBasis: "Brady v. Maryland, 373 U.S. 83 (1963)",
      remedy: "Compel production of all exculpatory evidence; consider sanctions.",
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  4 — Chain of Custody Violations
  // ══════════════════════════════════════════════════════════════════════════

  const brokenCustody = caseData.evidence.filter(e => !e.chainOfCustodyIntact);
  if (brokenCustody.length > 0) {
    const brokenIds = brokenCustody.map(e => e.id);
    const affectedCharges = caseData.charges.filter(c =>
      c.supportingEvidenceIds.some(id => brokenIds.includes(id))
    );
    if (affectedCharges.length > 0) {
      violations.push({
        violationType: "CHAIN_OF_CUSTODY_VIOLATION",
        severity: "HIGH",
        affectedChargeIds: affectedCharges.map(c => c.id),
        explanation: `${brokenCustody.length} evidence item(s) have broken chain of custody (IDs: ${brokenIds.join(", ")}). ${affectedCharges.length} charge(s) rely on compromised evidence — any conviction based on this evidence is constitutionally suspect.`,
        legalBasis: "Melendez-Diaz v. Massachusetts, 557 U.S. 305 (2009); authentication requirement under FRE 901",
        remedy: "Suppress evidence with broken chain of custody; dismiss charges that rely solely on compromised evidence.",
      });
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  5 — Fabricated Evidence Detection
  // ══════════════════════════════════════════════════════════════════════════

  // Evidence that is BOTH unauthenticated AND has broken chain of custody
  const fabricationSuspects = caseData.evidence.filter(e =>
    !e.authenticated && !e.chainOfCustodyIntact
  );
  if (fabricationSuspects.length > 0) {
    const suspectIds = fabricationSuspects.map(e => e.id);
    violations.push({
      violationType: "FABRICATED_EVIDENCE",
      severity: "CRITICAL",
      affectedChargeIds: caseData.charges
        .filter(c => c.supportingEvidenceIds.some(id => suspectIds.includes(id)))
        .map(c => c.id),
      explanation: `${fabricationSuspects.length} evidence item(s) are BOTH unauthenticated AND have broken chain of custody (IDs: ${suspectIds.join(", ")}). This combination is a strong indicator of fabricated or planted evidence — requires immediate forensic audit.`,
      legalBasis: "Napue v. Illinois, 360 U.S. 264 (1959); 18 U.S.C. § 1519 (evidence tampering); 42 U.S.C. § 1983 (civil rights)",
      remedy: "Immediately investigate evidence provenance; refer to FDLE and Inspector General; suppress all affected evidence; dismiss charges relying solely on suspected fabricated evidence.",
    });
  }

  // Check narrative for fabrication indicators
  const narrativeFabricationFlags = FABRICATION_INDICATORS.filter(p => p.test(caseData.narrative));
  if (narrativeFabricationFlags.length > 0) {
    violations.push({
      violationType: "FABRICATED_EVIDENCE",
      severity: "HIGH",
      affectedChargeIds: caseData.charges.map(c => c.id),
      explanation: `Case narrative contains ${narrativeFabricationFlags.length} indicator(s) of evidence fabrication or tampering. The record itself references anomalies in evidence integrity.`,
      legalBasis: "18 U.S.C. § 1519 (destruction/alteration of evidence); Brady v. Maryland, 373 U.S. 83 (1963)",
      remedy: "Order independent forensic audit of all evidence; refer matter to FDLE for criminal investigation of evidence tampering.",
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  6 — Judicial Misconduct Detection
  // ══════════════════════════════════════════════════════════════════════════

  const judicialMisconductFlags = JUDICIAL_MISCONDUCT_PATTERNS.filter(p => p.test(caseData.narrative));
  if (judicialMisconductFlags.length > 0) {
    violations.push({
      violationType: "JUDICIAL_MISCONDUCT",
      severity: judicialMisconductFlags.length >= 2 ? "CRITICAL" : "HIGH",
      affectedChargeIds: caseData.charges.map(c => c.id),
      explanation: `${judicialMisconductFlags.length} indicator(s) of judicial misconduct detected in case record. Patterns include potential ex parte communications, bias, or procedural irregularities by the presiding judge.`,
      legalBasis: "28 U.S.C. § 455 (judicial disqualification); Canon 2 & 3, Code of Conduct for U.S. Judges; Fla. Code Jud. Conduct Canon 3",
      remedy: "File complaint with Florida Judicial Qualifications Commission (JQC); move for recusal; request transfer to different judge; preserve all records for appellate review.",
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  7 — Prosecutor Misconduct Detection
  // ══════════════════════════════════════════════════════════════════════════

  const prosecutorFlags: string[] = [];
  if (exculpatory.length > 0 && defenseEvidence.length === 0) {
    prosecutorFlags.push("exculpatory evidence withheld");
  }

  // Vindictive prosecution: charges escalated after defendant exercised rights
  if (caseData.narrative.match(/charges?\s*(increased|added|escalated|enhanced)\s*(after|following|upon)\s*(appeal|motion|complaint|grievance)/i)) {
    prosecutorFlags.push("charges escalated after exercise of rights");
    violations.push({
      violationType: "VINDICTIVE_PROSECUTION",
      severity: "CRITICAL",
      affectedChargeIds: caseData.charges.map(c => c.id),
      explanation: `Evidence of vindictive prosecution: charges appear to have been escalated in retaliation for the defendant exercising constitutional rights (filing appeals, motions, or complaints).`,
      legalBasis: "North Carolina v. Pearce, 395 U.S. 711 (1969); Blackledge v. Perry, 417 U.S. 21 (1974) — presumption of vindictiveness",
      remedy: "Move to dismiss enhanced charges; file complaint with State Attorney's office; refer to DOJ Civil Rights Division if pattern is systemic.",
    });
  }

  // Selective prosecution: targeting based on protected class
  if (caseData.narrative.match(/(targeted|singled\s*out|profiled)\s*(because\s*of|due\s*to|based\s*on)\s*(race|ethnicity|religion|gender|political|speech|association)/i)) {
    violations.push({
      violationType: "SELECTIVE_PROSECUTION",
      severity: "CRITICAL",
      affectedChargeIds: caseData.charges.map(c => c.id),
      explanation: `Evidence of selective prosecution: case record indicates the defendant was targeted based on a protected class or exercise of constitutional rights.`,
      legalBasis: "Yick Wo v. Hopkins, 118 U.S. 356 (1886); U.S. v. Armstrong, 517 U.S. 456 (1996) — equal protection standard",
      remedy: "File selective prosecution motion under Armstrong; request discovery of prosecution patterns; refer to DOJ Civil Rights Division.",
    });
  }

  if (prosecutorFlags.length >= 2) {
    violations.push({
      violationType: "PROSECUTOR_MISCONDUCT",
      severity: "CRITICAL",
      affectedChargeIds: caseData.charges.map(c => c.id),
      explanation: `Multiple indicators of prosecutorial misconduct detected: ${prosecutorFlags.join("; ")}. The prosecution appears to be acting outside the bounds of ethical obligation.`,
      legalBasis: "Berger v. United States, 295 U.S. 78 (1935); Florida Bar Rule 4-3.8 (Special Responsibilities of a Prosecutor)",
      remedy: "File complaint with Florida Bar; request special prosecutor; move for sanctions; refer to State Attorney General.",
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  8 — Sheriff / Law Enforcement Misconduct
  // ══════════════════════════════════════════════════════════════════════════

  const sheriffFlags = SHERIFF_MISCONDUCT_PATTERNS.filter(p => p.test(caseData.narrative));
  const lawEnforcementBrokenCustody = caseData.evidence.filter(e =>
    e.submittedBy === "PROSECUTION" && !e.chainOfCustodyIntact
  );

  if (sheriffFlags.length > 0 || lawEnforcementBrokenCustody.length >= 2) {
    violations.push({
      violationType: "SHERIFF_MISCONDUCT",
      severity: sheriffFlags.length >= 2 || lawEnforcementBrokenCustody.length >= 3 ? "CRITICAL" : "HIGH",
      affectedChargeIds: caseData.charges.map(c => c.id),
      explanation: `${sheriffFlags.length} indicator(s) of law enforcement misconduct detected in case record. ${lawEnforcementBrokenCustody.length} prosecution evidence item(s) have broken chain of custody. Patterns may include illegal search/seizure, false reports, evidence mishandling, or Miranda violations.`,
      legalBasis: "Mapp v. Ohio, 367 U.S. 643 (1961) (exclusionary rule); Miranda v. Arizona, 384 U.S. 436 (1966); 42 U.S.C. § 1983 (civil rights under color of law)",
      remedy: "File motion to suppress illegally obtained evidence; report to FDLE Internal Affairs; file civil rights complaint with DOJ; preserve body cam/dashcam footage requests.",
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  9 — Public Defender Collusion / Rubber-Stamping
  // ══════════════════════════════════════════════════════════════════════════

  const defenseAttorney = caseData.parties.find(p => p.role === "DEFENSE_ATTORNEY");
  if (defenseAttorney && options) {
    const motions = options.motionsFiled ?? 0;
    const discovery = options.discoveryRequestsMade ?? 0;
    const felonyCount = caseData.charges.filter(c => c.category === "FELONY").length;

    // Zero investigation on a felony case = systemic failure
    if (motions === 0 && discovery === 0 && felonyCount > 0) {
      const prosecutorParty = caseData.parties.find(p => p.role === "PROSECUTOR");
      const sameJurisdiction = defenseAttorney.jurisdiction && prosecutorParty?.jurisdiction &&
        defenseAttorney.jurisdiction === prosecutorParty.jurisdiction;

      violations.push({
        violationType: "PUBLIC_DEFENDER_COLLUSION",
        severity: "CRITICAL",
        affectedChargeIds: caseData.charges.map(c => c.id),
        explanation: `Defense attorney ${defenseAttorney.name} filed ZERO motions and made ZERO discovery requests on ${felonyCount} felony charge(s). This pattern of non-investigation is consistent with public defender collusion — processing defendants rather than defending them.${sameJurisdiction ? " Defense and prosecution share the same jurisdiction, raising conflict-of-interest concerns." : ""}`,
        legalBasis: "Strickland v. Washington, 466 U.S. 668 (1984); Wiggins v. Smith, 539 U.S. 510 (2003) — duty to investigate",
        remedy: "File Strickland motion for ineffective assistance; request new independent counsel; file complaint with Florida Bar; request investigation into public defender caseload and case outcomes.",
      });
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  10 — Witness Tampering / Coerced Testimony
  // ══════════════════════════════════════════════════════════════════════════

  const witnessTamperingFlags = WITNESS_TAMPERING_PATTERNS.filter(p => p.test(caseData.narrative));
  const witnesses = caseData.parties.filter(p => p.role === "WITNESS");
  const defendants = caseData.parties.filter(p => p.role === "DEFENDANT");
  const coDefendantWitnesses = witnesses.filter(w =>
    defendants.some(d => d.name === w.name || d.id === w.id)
  );

  if (witnessTamperingFlags.length > 0 || coDefendantWitnesses.length > 0) {
    violations.push({
      violationType: "WITNESS_TAMPERING",
      severity: witnessTamperingFlags.length >= 2 ? "CRITICAL" : "HIGH",
      affectedChargeIds: caseData.charges.map(c => c.id),
      explanation: `${witnessTamperingFlags.length} indicator(s) of witness tampering/coercion detected in case record. ${coDefendantWitnesses.length} witness(es) are also defendants (incentivized testimony risk). Coerced or incentivized testimony undermines the integrity of the entire proceeding.`,
      legalBasis: "18 U.S.C. § 1512 (witness tampering); Giglio v. United States, 405 U.S. 150 (1972) — impeachment evidence; Fla. Stat. § 914.22",
      remedy: "Challenge reliability of incentivized testimony; file Giglio motion for disclosure of all witness deals; request independent witness examination.",
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  11 — Emotional Language / Vendetta Detection
  // ══════════════════════════════════════════════════════════════════════════

  const narrativeLower = caseData.narrative.toLowerCase();
  const emotionalFlags = EMOTIONAL_PATTERNS.filter(p => narrativeLower.includes(p));

  // ══════════════════════════════════════════════════════════════════════════
  //  12 — Fact Score
  // ══════════════════════════════════════════════════════════════════════════

  const totalEvidence = caseData.evidence.length;
  const authenticated = caseData.evidence.filter(e => e.authenticated).length;
  const exculpCount = exculpatory.length;
  const evidenceQuality = totalEvidence > 0 ? (authenticated / totalEvidence) * 100 : 0;
  const objectivity = Math.max(0, 100 - emotionalFlags.length * 15);
  const factualScore = Math.round(evidenceQuality * 0.7 + objectivity * 0.3);
  const weakChargeIds = caseData.charges
    .filter(c => c.supportingEvidenceIds.length === 0)
    .map(c => c.id);

  // ══════════════════════════════════════════════════════════════════════════
  //  13 — Aggregate Sentence Proportionality
  // ══════════════════════════════════════════════════════════════════════════

  const totalMaxYears = caseData.charges.reduce((s, c) => s + c.maxSentenceYears, 0);
  if (totalMaxYears > 50) {
    violations.push({
      violationType: "PROCEDURAL_ABUSE",
      severity: "HIGH",
      affectedChargeIds: caseData.charges.map(c => c.id),
      explanation: `Aggregate maximum sentence of ${totalMaxYears} years is disproportionate — potential coercive charging.`,
      legalBasis: "Solem v. Helm, 463 U.S. 277 (1983) — proportionality principle",
      remedy: "Review charging decisions for proportionality to alleged conduct.",
    });
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  14 — Representation Audit (Strickland standard)
  // ══════════════════════════════════════════════════════════════════════════

  let representationAudit = null;
  if (defenseAttorney && options) {
    const failures: string[] = [];
    const motions = options.motionsFiled ?? 0;
    const discovery = options.discoveryRequestsMade ?? 0;
    const missed = options.missedDeadlines ?? [];

    if (motions < 2) failures.push("FAILURE_TO_FILE_MOTIONS");
    if (discovery < 1) failures.push("INADEQUATE_DISCOVERY");
    if (!options.hadPleaNegotiations) failures.push("NO_PLEA_NEGOTIATION");
    if (missed.length > 0) failures.push("MISSED_DEADLINE");

    const deficient = failures.length >= 2;
    const grossly = failures.length >= 3;
    const rating = grossly ? "GROSSLY_DEFICIENT" : deficient ? "DEFICIENT" : "ADEQUATE";
    const ineffective = grossly || (deficient && missed.length > 0);

    representationAudit = {
      attorneyId: defenseAttorney.id,
      attorneyName: defenseAttorney.name,
      caseId: caseData.id,
      failures,
      missedDeadlines: missed.length,
      motionsFiledCount: motions,
      discoveryRequestsCount: discovery,
      overallRating: rating,
      ineffectiveAssistanceFlag: ineffective,
      recommendedRemedy: ineffective
        ? "File Strickland motion for ineffective assistance of counsel; request new counsel."
        : deficient
        ? "Court should inquire into representation adequacy; consider supplemental counsel."
        : "No action needed — representation appears adequate.",
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  15 — Record all violations in transparency ledger
  // ══════════════════════════════════════════════════════════════════════════

  for (const v of violations) {
    const evt: TransparencyEvent = {
      id: crypto.randomUUID(),
      caseId: caseData.id,
      eventType: "VIOLATION_FLAGGED",
      timestamp: new Date().toISOString(),
      actorId: "JUDICIAL-MONITOR",
      actorRole: "SYSTEM",
      description: `${v.violationType}: ${v.explanation}`,
      immutableHash: "",
    };
    evt.immutableHash = computeHash(JSON.stringify(evt), prevHash);
    prevHash = evt.immutableHash;
    events.push(evt);
  }

  // ── Risk level ──
  const critCount = violations.filter(v => v.severity === "CRITICAL").length;
  const highCount = violations.filter(v => v.severity === "HIGH").length;
  const riskLevel: RiskLevel =
    critCount >= 2 ? "CRITICAL" :
    critCount >= 1 ? "HIGH" :
    highCount >= 2 ? "HIGH" :
    highCount >= 1 ? "MODERATE" : "LOW";

  // ── Verdict ──
  const verdict =
    critCount >= 2 ? "CASE_RECOMMENDED_FOR_DISMISSAL" :
    violations.length > 0 ? "VIOLATIONS_FOUND" : "PROCEEDING_PROPER";

  // ── Recommendations ──
  const recommendations: string[] = [];
  if (critCount > 0)
    recommendations.push("Immediate judicial review required — critical violations detected.");
  if (violations.some(v => v.violationType === "CHARGE_STACKING"))
    recommendations.push("Reduce charges to eliminate prosecutorial overreach.");
  if (violations.some(v => v.violationType === "RAILROADING"))
    recommendations.push("Require prosecution to establish prima facie evidence for all charges.");
  if (violations.some(v => v.violationType === "EVIDENCE_SUPPRESSION"))
    recommendations.push("Issue Brady order compelling production of all exculpatory evidence.");
  if (violations.some(v => v.violationType === "FABRICATED_EVIDENCE"))
    recommendations.push("URGENT: Order independent forensic audit of all evidence; refer to FDLE for criminal investigation.");
  if (violations.some(v => v.violationType === "CHAIN_OF_CUSTODY_VIOLATION"))
    recommendations.push("Suppress evidence with broken chain of custody; require re-authentication.");
  if (violations.some(v => v.violationType === "JUDICIAL_MISCONDUCT"))
    recommendations.push("File complaint with JQC; move for recusal of presiding judge.");
  if (violations.some(v => v.violationType === "PROSECUTOR_MISCONDUCT"))
    recommendations.push("Refer prosecutor to Florida Bar; request appointment of special prosecutor.");
  if (violations.some(v => v.violationType === "SHERIFF_MISCONDUCT"))
    recommendations.push("Report to FDLE Internal Affairs; file civil rights complaint under 42 U.S.C. § 1983.");
  if (violations.some(v => v.violationType === "PUBLIC_DEFENDER_COLLUSION"))
    recommendations.push("Appoint independent counsel immediately; investigate public defender office caseload practices.");
  if (violations.some(v => v.violationType === "WITNESS_TAMPERING"))
    recommendations.push("File Giglio motion; challenge all incentivized testimony; request witness protection review.");
  if (violations.some(v => v.violationType === "VINDICTIVE_PROSECUTION"))
    recommendations.push("Move to dismiss enhanced charges as vindictive; refer to DOJ Civil Rights Division.");
  if (violations.some(v => v.violationType === "SELECTIVE_PROSECUTION"))
    recommendations.push("File Armstrong motion for discovery of prosecution patterns; refer to DOJ for pattern investigation.");
  if (emotionalFlags.length > 0)
    recommendations.push(`Remove emotional/inflammatory language from proceedings: "${emotionalFlags.join('", "')}".`);
  if (representationAudit?.ineffectiveAssistanceFlag)
    recommendations.push("Appoint new counsel — current representation fails Strickland standard.");
  if (recommendations.length === 0)
    recommendations.push("No violations detected — case proceeding within constitutional bounds.");

  const report = {
    reportId: crypto.randomUUID(),
    caseId: caseData.id,
    analyzedAt: new Date().toISOString(),
    riskLevel,
    chargeViolations: violations,
    factScore: {
      totalEvidence,
      authenticatedEvidence: authenticated,
      exculpatoryEvidence: exculpCount,
      factualScore,
      emotionalLanguageFlags: emotionalFlags,
      sufficientForCharges: weakChargeIds.length === 0,
      weakChargeIds,
    },
    representationAudit,
    transparencyEvents: events,
    overallVerdict: verdict,
    summary: verdict === "CASE_RECOMMENDED_FOR_DISMISSAL"
      ? `CRITICAL: ${critCount} critical violations detected — case recommended for dismissal.`
      : verdict === "VIOLATIONS_FOUND"
      ? `WARNING: ${violations.length} violation(s) detected across ${caseData.charges.length} charges.`
      : `Case proceeding within constitutional bounds. Fact score: ${factualScore}/100.`,
    recommendedActions: recommendations,
  };

  casesAnalyzed++;
  violationsFound += violations.length;
  if (verdict === "CASE_RECOMMENDED_FOR_DISMISSAL") dismissalsRecommended++;

  return report;
}

// ─── Authority Notification Pipeline ──────────────────────────────────────────

async function queueAuthorityNotifications(caseData: Case, report: any) {
  if (!pool || !pgConnected) return;

  const criticalViolations = (report.chargeViolations as ChargeViolation[])
    .filter(v => v.severity === "CRITICAL" || v.severity === "HIGH");

  let queued = 0;
  for (const violation of criticalViolations) {
    const authorities = VIOLATION_AUTHORITY_MAP[violation.violationType] ?? [];
    for (const authority of authorities) {
      const details = AUTHORITY_DETAILS[authority];
      const id = crypto.randomUUID();
      const summary =
        `[${violation.severity}] ${violation.violationType}: ${violation.explanation} | ` +
        `Legal basis: ${violation.legalBasis} | Remedy: ${violation.remedy}`;

      await pool.query(
        `INSERT INTO judicial_authority_notifications
         (id, case_id, authority, authority_name, violation_type, severity, summary, case_reference, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'QUEUED')
         ON CONFLICT DO NOTHING`,
        [id, caseData.id, authority, details.name, violation.violationType,
         violation.severity, summary,
         `Case ${caseData.caseNumber} — ${caseData.title} (${caseData.court}, ${caseData.jurisdiction})`]
      ).catch((e: Error) => console.error("[pg] queueNotification:", e.message));
      queued++;
      authorityNotifications++;
    }
  }

  if (queued > 0) {
    console.log(`[authority] Queued ${queued} notification(s) to legal authorities for case ${caseData.caseNumber}`);

    // Also publish to Redis so other services can pick up authority alerts
    if (redisConnected) {
      await redis.publish("judicial:authority:notifications", JSON.stringify({
        caseId: caseData.id,
        caseNumber: caseData.caseNumber,
        notificationsQueued: queued,
        authorities: [...new Set(criticalViolations.flatMap(v => VIOLATION_AUTHORITY_MAP[v.violationType] ?? []))],
        timestamp: new Date().toISOString(),
      })).catch(() => {});
    }
  }
}

// ─── Florida Court System Data ─────────────────────────────────────────────

interface FloridaCircuit {
  number: number;
  name: string;
  counties: string[];
  chiefJudge: string;
}

const FLORIDA_CIRCUITS: FloridaCircuit[] = [
  { number: 1,  name: "First Judicial Circuit",        counties: ["Escambia", "Okaloosa", "Santa Rosa", "Walton"],                         chiefJudge: "Chief Judge TBD" },
  { number: 2,  name: "Second Judicial Circuit",       counties: ["Franklin", "Gadsden", "Jefferson", "Leon", "Liberty", "Wakulla"],       chiefJudge: "Chief Judge TBD" },
  { number: 3,  name: "Third Judicial Circuit",        counties: ["Columbia", "Dixie", "Hamilton", "Lafayette", "Madison", "Suwannee", "Taylor"], chiefJudge: "Chief Judge TBD" },
  { number: 4,  name: "Fourth Judicial Circuit",       counties: ["Clay", "Duval", "Nassau"],                                              chiefJudge: "Chief Judge TBD" },
  { number: 5,  name: "Fifth Judicial Circuit",        counties: ["Citrus", "Hernando", "Lake", "Marion", "Sumter"],                       chiefJudge: "Chief Judge TBD" },
  { number: 6,  name: "Sixth Judicial Circuit",        counties: ["Pasco", "Pinellas"],                                                    chiefJudge: "Chief Judge TBD" },
  { number: 7,  name: "Seventh Judicial Circuit",      counties: ["Flagler", "Putnam", "St. Johns", "Volusia"],                            chiefJudge: "Chief Judge TBD" },
  { number: 8,  name: "Eighth Judicial Circuit",       counties: ["Alachua", "Baker", "Bradford", "Gilchrist", "Levy", "Union"],           chiefJudge: "Chief Judge TBD" },
  { number: 9,  name: "Ninth Judicial Circuit",        counties: ["Orange", "Osceola"],                                                    chiefJudge: "Chief Judge TBD" },
  { number: 10, name: "Tenth Judicial Circuit",        counties: ["Hardee", "Highlands", "Polk"],                                          chiefJudge: "Chief Judge TBD" },
  { number: 11, name: "Eleventh Judicial Circuit",     counties: ["Miami-Dade"],                                                           chiefJudge: "Chief Judge TBD" },
  { number: 12, name: "Twelfth Judicial Circuit",      counties: ["DeSoto", "Manatee", "Sarasota"],                                        chiefJudge: "Chief Judge TBD" },
  { number: 13, name: "Thirteenth Judicial Circuit",   counties: ["Hillsborough"],                                                         chiefJudge: "Chief Judge TBD" },
  { number: 14, name: "Fourteenth Judicial Circuit",   counties: ["Bay", "Calhoun", "Gulf", "Holmes", "Jackson", "Washington"],            chiefJudge: "Chief Judge TBD" },
  { number: 15, name: "Fifteenth Judicial Circuit",    counties: ["Palm Beach"],                                                            chiefJudge: "Chief Judge TBD" },
  { number: 16, name: "Sixteenth Judicial Circuit",    counties: ["Monroe"],                                                                chiefJudge: "Chief Judge TBD" },
  { number: 17, name: "Seventeenth Judicial Circuit",  counties: ["Broward"],                                                               chiefJudge: "Chief Judge TBD" },
  { number: 18, name: "Eighteenth Judicial Circuit",   counties: ["Brevard", "Seminole"],                                                   chiefJudge: "Chief Judge TBD" },
  { number: 19, name: "Nineteenth Judicial Circuit",   counties: ["Indian River", "Martin", "Okeechobee", "St. Lucie"],                     chiefJudge: "Chief Judge TBD" },
  { number: 20, name: "Twentieth Judicial Circuit",    counties: ["Charlotte", "Collier", "Glades", "Hendry", "Lee"],                       chiefJudge: "Chief Judge TBD" },
];

// ─── Persistence helpers ──────────────────────────────────────────────────────

async function persistCase(caseData: Case) {
  if (!pool || !pgConnected) return;
  await pool.query(
    `INSERT INTO judicial_cases (id, case_number, title, jurisdiction, court, status, filed_at, case_data)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     ON CONFLICT (id) DO UPDATE SET status=$6, case_data=$8`,
    [caseData.id, caseData.caseNumber, caseData.title, caseData.jurisdiction,
     caseData.court, caseData.status, caseData.filedAt, JSON.stringify(caseData)]
  ).catch((e: Error) => console.error("[pg] persistCase:", e.message));
}

async function persistReport(report: any) {
  if (!pool || !pgConnected) return;
  await pool.query(
    `INSERT INTO judicial_reports (report_id, case_id, risk_level, overall_verdict, violations_count, fact_score, report_data)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (report_id) DO NOTHING`,
    [report.reportId, report.caseId, report.riskLevel, report.overallVerdict,
     report.chargeViolations.length, report.factScore.factualScore, JSON.stringify(report)]
  ).catch((e: Error) => console.error("[pg] persistReport:", e.message));
}

async function persistLedgerEvents(events: TransparencyEvent[]) {
  if (!pool || !pgConnected || events.length === 0) return;
  const values: string[] = [];
  const params: unknown[] = [];
  let idx = 1;
  let prevHash: string | null = null;
  for (const evt of events) {
    values.push(`($${idx},$${idx+1},$${idx+2},$${idx+3},$${idx+4},$${idx+5},$${idx+6},$${idx+7})`);
    params.push(evt.id, evt.caseId, evt.eventType, evt.actorId, evt.actorRole,
                evt.description, evt.immutableHash, prevHash);
    prevHash = evt.immutableHash;
    idx += 8;
  }
  await pool.query(
    `INSERT INTO judicial_ledger_events (id, case_id, event_type, actor_id, actor_role, description, immutable_hash, prev_hash)
     VALUES ${values.join(",")}
     ON CONFLICT (id) DO NOTHING`,
    params
  ).catch((e: Error) => console.error("[pg] persistLedger:", e.message));
}

async function publishAlert(caseId: string, alertType: string, severity: string, description: string) {
  const id = crypto.randomUUID();
  if (pool && pgConnected) {
    await pool.query(
      `INSERT INTO judicial_alerts (id, case_id, alert_type, severity, description) VALUES ($1,$2,$3,$4,$5)`,
      [id, caseId, alertType, severity, description]
    ).catch(() => {});
  }
  if (redisConnected) {
    await redis.publish("judicial:alerts", JSON.stringify({
      id, caseId, alertType, severity, description, timestamp: new Date().toISOString(),
    })).catch(() => {});
  }
  alertsPublished++;
}

// ─── HTTP server ──────────────────────────────────────────────────────────────

const safeStringify = (o: unknown) =>
  JSON.stringify(o, (_k, v) => (typeof v === "bigint" ? v.toString() : v));

async function readBody(req: http.IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk: Buffer) => { body += chunk; if (body.length > 1_000_000) req.destroy(); });
    req.on("end",  () => { try { resolve(JSON.parse(body)); } catch { resolve({}); } });
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  if (shuttingDown) { res.writeHead(503); res.end('{"error":"shutting down"}'); return; }
  activeRequests++;
  res.on("finish", () => { activeRequests--; });
  res.setHeader("Content-Type", "application/json");
  res.setHeader("X-Triumph-Service", "judicial-monitor");
  res.setHeader("X-Triumph-Jurisdiction", "florida-first");
  const url = req.url?.split("?")[0] ?? "";
  const qs = new URLSearchParams((req.url ?? "").includes("?") ? (req.url ?? "").split("?")[1] : "");

  try {
    // ── Health ──
    if (url === "/health" || url === "/") {
      res.writeHead(ready ? 200 : 503);
      res.end(safeStringify({
        service: "judicial-monitor",
        status: ready ? "healthy" : "starting",
        connections: {
          redis: redisConnected,
          postgres: pgConnected,
        },
        network: NETWORK,
        jurisdiction: "Florida",
        circuits: FLORIDA_CIRCUITS.length,
        casesAnalyzed,
        violationsFound,
        dismissalsRecommended,
        alertsPublished,
        authorityNotifications,
        detectionCapabilities: [
          "CHARGE_STACKING", "MULTIPLICITY", "RAILROADING",
          "EVIDENCE_SUPPRESSION", "FABRICATED_EVIDENCE", "CHAIN_OF_CUSTODY_VIOLATION",
          "JUDICIAL_MISCONDUCT", "PROSECUTOR_MISCONDUCT", "SHERIFF_MISCONDUCT",
          "PUBLIC_DEFENDER_COLLUSION", "WITNESS_TAMPERING",
          "VINDICTIVE_PROSECUTION", "SELECTIVE_PROSECUTION",
          "PROCEDURAL_ABUSE", "EMOTIONAL_LANGUAGE_DETECTION",
        ],
        authorityPipeline: Object.keys(AUTHORITY_DETAILS),
      }));

    // ── Metrics ──
    } else if (url === "/metrics") {
      const mem = process.memoryUsage();
      const lines = [
        `# HELP process_uptime_seconds Service uptime`,
        `# TYPE process_uptime_seconds gauge`,
        `process_uptime_seconds{service="judicial-monitor"} ${process.uptime().toFixed(3)}`,
        `# HELP nodejs_heap_used_bytes Node.js heap used`,
        `# TYPE nodejs_heap_used_bytes gauge`,
        `nodejs_heap_used_bytes{service="judicial-monitor"} ${mem.heapUsed}`,
        `# HELP judicial_cases_analyzed_total Cases analyzed`,
        `# TYPE judicial_cases_analyzed_total counter`,
        `judicial_cases_analyzed_total{jurisdiction="florida"} ${casesAnalyzed}`,
        `# HELP judicial_violations_found_total Violations detected`,
        `# TYPE judicial_violations_found_total counter`,
        `judicial_violations_found_total{jurisdiction="florida"} ${violationsFound}`,
        `# HELP judicial_dismissals_recommended_total Cases recommended for dismissal`,
        `# TYPE judicial_dismissals_recommended_total counter`,
        `judicial_dismissals_recommended_total{jurisdiction="florida"} ${dismissalsRecommended}`,
        `# HELP judicial_alerts_total Alerts published`,
        `# TYPE judicial_alerts_total counter`,
        `judicial_alerts_total{jurisdiction="florida"} ${alertsPublished}`,
        `# HELP judicial_authority_notifications_total Authority notifications queued`,
        `# TYPE judicial_authority_notifications_total counter`,
        `judicial_authority_notifications_total{jurisdiction="florida"} ${authorityNotifications}`,
        `# HELP judicial_active_requests Current in-flight requests`,
        `# TYPE judicial_active_requests gauge`,
        `judicial_active_requests ${activeRequests}`,
        `# HELP judicial_redis_connected Redis connection status`,
        `# TYPE judicial_redis_connected gauge`,
        `judicial_redis_connected ${redisConnected ? 1 : 0}`,
        `# HELP judicial_postgres_connected Postgres connection status`,
        `# TYPE judicial_postgres_connected gauge`,
        `judicial_postgres_connected ${pgConnected ? 1 : 0}`,
      ].join("\n");
      res.writeHead(200, { "Content-Type": "text/plain; version=0.0.4; charset=utf-8" });
      res.end(lines + "\n");

    // ── POST /api/judicial/analyze — single case ──
    } else if (url === "/api/judicial/analyze" && req.method === "POST") {
      const body = await readBody(req) as any;
      const caseData: Case = body.case ?? body;
      if (!caseData?.id) {
        res.writeHead(400);
        res.end(safeStringify({ error: "Provide a valid case object with an 'id' field." }));
        return;
      }
      const report = analyzeCase(caseData, body.representationOptions);
      await persistCase(caseData);
      await persistReport(report);
      await persistLedgerEvents(report.transparencyEvents);

      // Publish alerts for critical violations
      for (const v of report.chargeViolations.filter((x: ChargeViolation) => x.severity === "CRITICAL")) {
        await publishAlert(caseData.id, v.violationType, "CRITICAL", v.explanation);
      }

      // Queue authority notifications for HIGH and CRITICAL violations
      await queueAuthorityNotifications(caseData, report);

      res.writeHead(200);
      res.end(safeStringify(report));

    // ── POST /api/judicial/batch — historical audit ──
    } else if (url === "/api/judicial/batch" && req.method === "POST") {
      const body = await readBody(req) as any;
      const cases: Case[] = body.cases ?? [];
      if (!Array.isArray(cases) || cases.length === 0) {
        res.writeHead(400);
        res.end(safeStringify({ error: "Provide a non-empty 'cases' array." }));
        return;
      }
      const reports = cases.map((c: Case) => analyzeCase(c, body.representationOptions));
      for (const r of reports) {
        const caseData = cases.find(c => c.id === r.caseId);
        if (caseData) {
          await persistCase(caseData);
          await queueAuthorityNotifications(caseData, r);
        }
        await persistReport(r);
        await persistLedgerEvents(r.transparencyEvents);
      }
      const totalViolations = reports.reduce((s: number, r: any) => s + r.chargeViolations.length, 0);
      const dismissals = reports.filter((r: any) => r.overallVerdict === "CASE_RECOMMENDED_FOR_DISMISSAL").length;

      res.writeHead(200);
      res.end(safeStringify({
        totalCases: reports.length,
        totalViolations,
        dismissalsRecommended: dismissals,
        reports,
      }));

    // ── GET /api/judicial/cases — list monitored cases ──
    } else if (url === "/api/judicial/cases" && req.method === "GET") {
      if (!pool) {
        res.writeHead(200);
        res.end(safeStringify({ rows: [], message: "No database configured" }));
        return;
      }
      const limit = Math.min(parseInt(qs.get("limit") ?? "50", 10), 500);
      const jurisdiction = qs.get("jurisdiction") ?? "Florida";
      // Lookback window: SAIBs can reach back N years from today (default 5).
      const yearsBack = Math.min(Math.max(parseFloat(qs.get("years") ?? "5"), 0), 50);
      const sinceDate = new Date(Date.now() - yearsBack * 365.25 * 24 * 60 * 60 * 1000);
      const r = await pool.query(
        `SELECT c.id, c.case_number, c.title, c.jurisdiction, c.court, c.status, c.filed_at,
                r.risk_level, r.overall_verdict, r.violations_count, r.fact_score, r.analyzed_at
         FROM judicial_cases c
         LEFT JOIN LATERAL (
           SELECT * FROM judicial_reports WHERE case_id = c.id ORDER BY analyzed_at DESC LIMIT 1
         ) r ON true
         WHERE c.jurisdiction ILIKE $1 AND c.filed_at >= $3
         ORDER BY c.filed_at DESC LIMIT $2`,
        [`%${jurisdiction}%`, limit, sinceDate.toISOString()]
      );
      res.writeHead(200);
      res.end(safeStringify({
        rows: r.rows,
        total: r.rowCount,
        lookbackYears: yearsBack,
        since: sinceDate.toISOString(),
      }));

    // ── GET /api/judicial/cases/:id — single case ──
    } else if (url.startsWith("/api/judicial/cases/") && req.method === "GET") {
      const caseId = url.slice("/api/judicial/cases/".length);
      if (!pool) {
        res.writeHead(200);
        res.end(safeStringify({ error: "No database configured" }));
        return;
      }
      const caseR = await pool.query("SELECT * FROM judicial_cases WHERE id=$1", [caseId]);
      const reportR = await pool.query(
        "SELECT * FROM judicial_reports WHERE case_id=$1 ORDER BY analyzed_at DESC LIMIT 1", [caseId]);
      const ledgerR = await pool.query(
        "SELECT * FROM judicial_ledger_events WHERE case_id=$1 ORDER BY recorded_at", [caseId]);
      const alertsR = await pool.query(
        "SELECT * FROM judicial_alerts WHERE case_id=$1 ORDER BY created_at", [caseId]);
      const notifsR = await pool.query(
        "SELECT * FROM judicial_authority_notifications WHERE case_id=$1 ORDER BY queued_at", [caseId]);

      res.writeHead(200);
      res.end(safeStringify({
        case: caseR.rows[0] ?? null,
        report: reportR.rows[0] ?? null,
        ledger: ledgerR.rows,
        alerts: alertsR.rows,
        authorityNotifications: notifsR.rows,
      }));

    // ── GET /api/judicial/monitor/florida — Florida monitoring overview ──
    } else if (url === "/api/judicial/monitor/florida" && req.method === "GET") {
      const overview: any = {
        jurisdiction: "Florida",
        circuits: FLORIDA_CIRCUITS,
        totalCircuits: FLORIDA_CIRCUITS.length,
        totalCounties: FLORIDA_CIRCUITS.reduce((s, c) => s + c.counties.length, 0),
        monitoringStatus: "ACTIVE",
        activeSince: new Date().toISOString(),
        engine: {
          casesAnalyzed,
          violationsFound,
          dismissalsRecommended,
          alertsPublished,
          authorityNotifications,
        },
        antiRailroading: {
          chargeStackingDetection: "ENABLED",
          multiplicityDetection: "ENABLED",
          bradyViolationScanning: "ENABLED",
          fabricatedEvidenceDetection: "ENABLED",
          chainOfCustodyVerification: "ENABLED",
          judicialMisconductDetection: "ENABLED",
          prosecutorMisconductDetection: "ENABLED",
          sheriffMisconductDetection: "ENABLED",
          publicDefenderCollusionDetection: "ENABLED",
          witnessTamperingDetection: "ENABLED",
          emotionalLanguageDetection: "ENABLED",
          selectiveProsecutionFlag: "ENABLED",
          vindictiveProsecutionFlag: "ENABLED",
          disproportionateSentencing: "ENABLED",
          stricklandRepresentationAudit: "ENABLED",
        },
        authorityPipeline: {
          status: "ACTIVE",
          targets: AUTHORITY_DETAILS,
          totalQueued: authorityNotifications,
        },
        transparencyLedger: {
          type: "SHA-256 Hash Chain",
          tamperProof: true,
          publicAccess: true,
        },
      };

      // Add DB stats if available
      if (pool && pgConnected) {
        const stats = await pool.query(`
          SELECT
            (SELECT COUNT(*) FROM judicial_cases WHERE jurisdiction ILIKE '%florida%') AS total_cases,
            (SELECT COUNT(*) FROM judicial_reports WHERE overall_verdict = 'VIOLATIONS_FOUND') AS violations_found_cases,
            (SELECT COUNT(*) FROM judicial_reports WHERE overall_verdict = 'CASE_RECOMMENDED_FOR_DISMISSAL') AS dismissal_cases,
            (SELECT COUNT(*) FROM judicial_reports WHERE risk_level = 'CRITICAL') AS critical_cases,
            (SELECT COUNT(*) FROM judicial_alerts WHERE NOT acknowledged) AS pending_alerts,
            (SELECT COUNT(*) FROM judicial_authority_notifications WHERE status = 'QUEUED') AS pending_authority_notifications
        `).catch(() => ({ rows: [{}] }));
        overview.databaseStats = stats.rows[0];
      }

      res.writeHead(200);
      res.end(safeStringify(overview));

    // ── GET /api/judicial/ledger — global ledger ──
    } else if (url === "/api/judicial/ledger" && req.method === "GET") {
      if (!pool) {
        res.writeHead(200);
        res.end(safeStringify({ events: [], integrity: true }));
        return;
      }
      const limit = Math.min(parseInt(qs.get("limit") ?? "100", 10), 1000);
      const r = await pool.query(
        "SELECT * FROM judicial_ledger_events ORDER BY recorded_at DESC LIMIT $1", [limit]);
      res.writeHead(200);
      res.end(safeStringify({ events: r.rows, total: r.rowCount }));

    // ── GET /api/judicial/ledger/:caseId — case ledger ──
    } else if (url.startsWith("/api/judicial/ledger/") && req.method === "GET") {
      const caseId = url.slice("/api/judicial/ledger/".length);
      if (!pool) {
        res.writeHead(200);
        res.end(safeStringify({ events: [] }));
        return;
      }
      const r = await pool.query(
        "SELECT * FROM judicial_ledger_events WHERE case_id=$1 ORDER BY recorded_at", [caseId]);

      // Verify chain integrity
      let valid = true;
      for (let i = 1; i < r.rows.length; i++) {
        if (r.rows[i].prev_hash && r.rows[i].prev_hash !== r.rows[i-1].immutable_hash) {
          valid = false;
          break;
        }
      }

      res.writeHead(200);
      res.end(safeStringify({ events: r.rows, chainIntegrity: valid }));

    // ── POST /api/judicial/report — generate summary report ──
    } else if (url === "/api/judicial/report" && req.method === "POST") {
      const body = await readBody(req) as any;
      const caseId = body.caseId;
      if (!caseId) {
        res.writeHead(400);
        res.end(safeStringify({ error: "Provide caseId" }));
        return;
      }

      if (!pool) {
        res.writeHead(200);
        res.end(safeStringify({ error: "No database configured" }));
        return;
      }

      const reportR = await pool.query(
        "SELECT report_data FROM judicial_reports WHERE case_id=$1 ORDER BY analyzed_at DESC LIMIT 1", [caseId]);
      const ledgerR = await pool.query(
        "SELECT * FROM judicial_ledger_events WHERE case_id=$1 ORDER BY recorded_at", [caseId]);
      const alertsR = await pool.query(
        "SELECT * FROM judicial_alerts WHERE case_id=$1 ORDER BY created_at", [caseId]);
      const notifsR = await pool.query(
        "SELECT * FROM judicial_authority_notifications WHERE case_id=$1 ORDER BY queued_at", [caseId]);

      const report = reportR.rows[0]?.report_data ?? null;
      res.writeHead(200);
      res.end(safeStringify({
        report,
        ledger: ledgerR.rows,
        alerts: alertsR.rows,
        authorityNotifications: notifsR.rows,
        generatedAt: new Date().toISOString(),
        generatedBy: "Triumph Synergy Judicial Monitor",
        jurisdiction: "Florida",
        disclaimer: "This report is generated by an automated transparency system. It identifies potential constitutional and procedural violations for human review. It does not constitute legal advice.",
      }));

    // ── GET /api/judicial/stats — aggregate statistics ──
    } else if (url === "/api/judicial/stats" && req.method === "GET") {
      const stats: any = {
        inMemory: {
          casesAnalyzed,
          violationsFound,
          dismissalsRecommended,
          alertsPublished,
          authorityNotifications,
          uptime: process.uptime(),
          connections: {
            redis: redisConnected,
            postgres: pgConnected,
          },
        },
      };

      if (pool && pgConnected) {
        const dbStats = await pool.query(`
          SELECT
            r.overall_verdict,
            COUNT(*) as count
          FROM judicial_reports r
          GROUP BY r.overall_verdict
        `).catch(() => ({ rows: [] }));

        const violationStats = await pool.query(`
          SELECT
            r.risk_level,
            COUNT(*) as count,
            AVG(r.fact_score) as avg_fact_score
          FROM judicial_reports r
          GROUP BY r.risk_level
        `).catch(() => ({ rows: [] }));

        const authorityStats = await pool.query(`
          SELECT
            authority,
            authority_name,
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE status = 'QUEUED') as queued,
            COUNT(*) FILTER (WHERE status = 'TRANSMITTED') as transmitted
          FROM judicial_authority_notifications
          GROUP BY authority, authority_name
        `).catch(() => ({ rows: [] }));

        stats.database = {
          verdicts: dbStats.rows,
          riskLevels: violationStats.rows,
          authorityNotifications: authorityStats.rows,
        };
      }

      res.writeHead(200);
      res.end(safeStringify(stats));

    // ── GET /api/judicial/notifications — authority notification queue ──
    } else if (url === "/api/judicial/notifications" && req.method === "GET") {
      if (!pool || !pgConnected) {
        res.writeHead(200);
        res.end(safeStringify({
          notifications: [],
          authorities: AUTHORITY_DETAILS,
          pipeline: "ACTIVE",
          message: pgConnected ? "No database configured" : "Database reconnecting",
        }));
        return;
      }
      const status = qs.get("status") ?? null;
      const limit = Math.min(parseInt(qs.get("limit") ?? "100", 10), 500);

      let query = "SELECT * FROM judicial_authority_notifications";
      const params: unknown[] = [];
      if (status) {
        query += " WHERE status = $1";
        params.push(status);
      }
      query += ` ORDER BY queued_at DESC LIMIT $${params.length + 1}`;
      params.push(limit);

      const r = await pool.query(query, params);
      res.writeHead(200);
      res.end(safeStringify({
        notifications: r.rows,
        total: r.rowCount,
        authorities: AUTHORITY_DETAILS,
        violationAuthorityMap: VIOLATION_AUTHORITY_MAP,
        pipeline: "ACTIVE",
      }));

    } else {
      res.writeHead(404);
      res.end(safeStringify({ error: "not found", service: "judicial-monitor" }));
    }
  } catch (e) {
    console.error("[judicial-monitor] request error:", (e as Error).message);
    res.writeHead(500);
    res.end(safeStringify({ error: "internal error" }));
  }
});

server.listen(PORT, "0.0.0.0", () =>
  console.log(`⚖️  Judicial Monitor listening on :${PORT}`)
);

// ─── Redis Subscription for court events ──────────────────────────────────────

async function handleCaseSubmission(message: string) {
  try {
    const payload = JSON.parse(message) as any;
    const caseData: Case = payload.case ?? payload;
    if (!caseData?.id) return;
    const report = analyzeCase(caseData, payload.representationOptions);
    await persistCase(caseData);
    await persistReport(report);
    await persistLedgerEvents(report.transparencyEvents);

    for (const v of report.chargeViolations.filter((x: ChargeViolation) => x.severity === "CRITICAL")) {
      await publishAlert(caseData.id, v.violationType, "CRITICAL", v.explanation);
    }

    // Queue authority notifications
    await queueAuthorityNotifications(caseData, report);

    console.log(`[judicial] Analyzed ${caseData.caseNumber}: ${report.overallVerdict} (${report.chargeViolations.length} violations)`);
  } catch (e) {
    console.error("[judicial] subscription error:", (e as Error).message);
  }
}

async function startSubscription() {
  const connected = await connectRedisSubWithRetry();
  if (!connected) {
    console.error("[redisSub] could not connect — subscription inactive, will retry via reconnect loop");
    return;
  }
  await redisSub.subscribe("judicial:case:submit", handleCaseSubmission)
    .catch((e: Error) => console.error("[redisSub] subscribe:", e.message));
  console.log("✅ Judicial Monitor subscribed to judicial:case:submit");
}

// ─── Start ────────────────────────────────────────────────────────────────────

async function start() {
  console.log("⚖️  Judicial Monitor starting...");
  console.log(`   Connecting to Redis: ${REDIS_URL}`);
  console.log(`   Connecting to Postgres: ${DB_URL ? "configured" : "NOT CONFIGURED"}`);

  // Connect to Redis with retry
  const redisOk = await connectRedisWithRetry();
  if (!redisOk) {
    console.error("⚠️  Redis not available — will retry via reconnect loop");
  }

  // Connect to Postgres with retry
  const pgOk = await connectPostgresWithRetry();
  if (pgOk) {
    await ensureTables();
  } else if (pool) {
    console.error("⚠️  Postgres not available — will retry via reconnect loop");
  }

  // Start Redis subscription
  await startSubscription();

  // Start periodic reconnection monitor
  startReconnectLoop();

  // Only mark ready if we have at least Redis connected
  ready = redisConnected && (pgConnected || !pool);

  if (ready) {
    console.log("✅ Judicial Monitor ONLINE — Florida courtroom transparency active");
  } else {
    console.warn("⚠️  Judicial Monitor DEGRADED — reconnect loop active, will recover connections");
  }

  console.log(`   📊 Monitoring ${FLORIDA_CIRCUITS.length} judicial circuits, ${FLORIDA_CIRCUITS.reduce((s, c) => s + c.counties.length, 0)} counties`);
  console.log("   🛡️  Detection: anti-railroading • anti-stacking • fabricated evidence • misconduct tracking");
  console.log("   📋 Authority pipeline: Florida Bar • FDLE • JQC • DOJ • AG • Inspector General");
  console.log("   🔗 Transparency: SHA-256 immutable hash-chain ledger");
}

start().catch(err => { console.error("❌ Judicial Monitor failed:", err); process.exit(1); });

// ─── Graceful Shutdown ────────────────────────────────────────────────────────

function shutdown(sig: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[judicial-monitor] ${sig} — shutting down…`);

  if (reconnectTimer) clearInterval(reconnectTimer);

  server.close(() => {
    Promise.all([
      redis.quit().catch(() => {}),
      redisSub.quit().catch(() => {}),
      pool?.end().catch(() => {}) ?? Promise.resolve(),
    ]).finally(() => process.exit(0));
  });
  setTimeout(() => process.exit(1), 10_000);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT",  () => shutdown("SIGINT"));

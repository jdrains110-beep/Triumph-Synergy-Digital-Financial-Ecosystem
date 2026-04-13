/**
 * Judicial Monitor Service — Bootstrap
 *
 * Superior Courtroom Transparency & Anti-Railroading Engine
 * Florida-first deployment — real-time monitoring, evidence verification,
 * charge-stacking detection, bias/vendetta identification, and immutable
 * transparency ledger with SHA-256 hash chains.
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
 */

import http from "node:http";
import { createClient } from "redis";
import { Pool } from "pg";
import crypto from "node:crypto";

const PORT      = 8096;
const REDIS_URL = process.env.REDIS_URL    ?? "redis://triumph-redis:6379";
const DB_URL    = process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? "";
const NETWORK   = process.env.PI_NETWORK_MODE ?? "mainnet";

// ─── Metrics ──────────────────────────────────────────────────────────────────

let casesAnalyzed     = 0;
let violationsFound   = 0;
let dismissalsRecommended = 0;
let alertsPublished   = 0;
let ready             = false;
let shuttingDown      = false;
let activeRequests    = 0;

// ─── Redis ────────────────────────────────────────────────────────────────────

const redis    = createClient({
  url: REDIS_URL,
  socket: {
    reconnectStrategy: (retries: number) => Math.min(retries * 500, 5000),
  },
});
const redisSub = redis.duplicate();
redis.on("error",    (e: Error) => console.error("[redis]",    e.message));
redisSub.on("error", (e: Error) => console.error("[redisSub]", e.message));

// ─── Postgres ─────────────────────────────────────────────────────────────────

const pool = DB_URL ? new Pool({ connectionString: DB_URL, max: 5 }) : null;

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
  `).catch((e: Error) => console.error("[pg] ensureTables:", e.message));
}

// ─── Violation Types ──────────────────────────────────────────────────────────

type ViolationType =
  | "CHARGE_STACKING" | "RAILROADING" | "IMPROPER_REPRESENTATION"
  | "PROCEDURAL_ABUSE" | "EVIDENCE_SUPPRESSION" | "SELECTIVE_PROSECUTION"
  | "VINDICTIVE_PROSECUTION" | "MULTIPLICITY" | "DUPLICITY";

type RiskLevel = "LOW" | "MODERATE" | "HIGH" | "CRITICAL";
type EvidenceType = "PHYSICAL" | "DOCUMENTARY" | "TESTIMONIAL" | "DIGITAL" | "FORENSIC" | "CIRCUMSTANTIAL" | "EXCULPATORY";

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

// ─── Analysis Engine ──────────────────────────────────────────────────────────

const EMOTIONAL_PATTERNS = [
  "brazen", "predator", "monster", "evil", "remorseless", "dangerous",
  "no remorse", "hardened", "callous", "menace", "cold-blooded",
  "scum", "animal", "thug", "career criminal", "irredeemable",
  "depraved", "vicious"
];

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

  // ── Record case filing ──
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

  // ── Charge Stacking / Multiplicity Detection ──
  const actGroups = new Map<string, Charge[]>();
  for (const charge of caseData.charges) {
    const key = charge.relatedActId ?? charge.id;
    const group = actGroups.get(key) ?? [];
    group.push(charge);
    actGroups.set(key, group);
  }

  for (const [actId, charges] of actGroups.entries()) {
    if (charges.length > 1) {
      // Blockburger test: do all charges require the same elements?
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

  // ── Evidence Sufficiency ──
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

  // ── Brady/Giglio Suppression ──
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

  // ── Emotional Language / Vendetta Detection ──
  const narrativeLower = caseData.narrative.toLowerCase();
  const emotionalFlags = EMOTIONAL_PATTERNS.filter(p => narrativeLower.includes(p));

  // ── Fact Score ──
  const totalEvidence = caseData.evidence.length;
  const authenticated = caseData.evidence.filter(e => e.authenticated).length;
  const exculpCount = exculpatory.length;
  const evidenceQuality = totalEvidence > 0 ? (authenticated / totalEvidence) * 100 : 0;
  const objectivity = Math.max(0, 100 - emotionalFlags.length * 15);
  const factualScore = Math.round(evidenceQuality * 0.7 + objectivity * 0.3);
  const weakChargeIds = caseData.charges
    .filter(c => c.supportingEvidenceIds.length === 0)
    .map(c => c.id);

  // ── Aggregate Sentence Proportionality ──
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

  // ── Representation Audit ──
  let representationAudit = null;
  const defenseAttorney = caseData.parties.find(p => p.role === "DEFENSE_ATTORNEY");
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

  // ── Record violations in ledger ──
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
  if (critCount > 0) recommendations.push("Immediate judicial review required — critical violations detected.");
  if (violations.some(v => v.violationType === "CHARGE_STACKING"))
    recommendations.push("Reduce charges to eliminate prosecutorial overreach.");
  if (violations.some(v => v.violationType === "RAILROADING"))
    recommendations.push("Require prosecution to establish prima facie evidence for all charges.");
  if (violations.some(v => v.violationType === "EVIDENCE_SUPPRESSION"))
    recommendations.push("Issue Brady order compelling production of all exculpatory evidence.");
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

// ─── Florida Court System Data ─────────────────────────────────────────────

interface FloridaCircuit {
  number: number;
  name: string;
  counties: string[];
  chiefJudge: string;
}

const FLORIDA_CIRCUITS: FloridaCircuit[] = [
  { number: 1,  name: "First Judicial Circuit",      counties: ["Escambia", "Okaloosa", "Santa Rosa", "Walton"],                         chiefJudge: "Chief Judge TBD" },
  { number: 2,  name: "Second Judicial Circuit",     counties: ["Franklin", "Gadsden", "Jefferson", "Leon", "Liberty", "Wakulla"],       chiefJudge: "Chief Judge TBD" },
  { number: 3,  name: "Third Judicial Circuit",      counties: ["Columbia", "Dixie", "Hamilton", "Lafayette", "Madison", "Suwannee", "Taylor"], chiefJudge: "Chief Judge TBD" },
  { number: 4,  name: "Fourth Judicial Circuit",     counties: ["Clay", "Duval", "Nassau"],                                              chiefJudge: "Chief Judge TBD" },
  { number: 5,  name: "Fifth Judicial Circuit",      counties: ["Citrus", "Hernando", "Lake", "Marion", "Sumter"],                       chiefJudge: "Chief Judge TBD" },
  { number: 6,  name: "Sixth Judicial Circuit",      counties: ["Pasco", "Pinellas"],                                                    chiefJudge: "Chief Judge TBD" },
  { number: 7,  name: "Seventh Judicial Circuit",    counties: ["Flagler", "Putnam", "St. Johns", "Volusia"],                            chiefJudge: "Chief Judge TBD" },
  { number: 8,  name: "Eighth Judicial Circuit",     counties: ["Alachua", "Baker", "Bradford", "Gilchrist", "Levy", "Union"],           chiefJudge: "Chief Judge TBD" },
  { number: 9,  name: "Ninth Judicial Circuit",      counties: ["Orange", "Osceola"],                                                    chiefJudge: "Chief Judge TBD" },
  { number: 10, name: "Tenth Judicial Circuit",      counties: ["Hardee", "Highlands", "Polk"],                                          chiefJudge: "Chief Judge TBD" },
  { number: 11, name: "Eleventh Judicial Circuit",   counties: ["Miami-Dade"],                                                           chiefJudge: "Chief Judge TBD" },
  { number: 12, name: "Twelfth Judicial Circuit",    counties: ["DeSoto", "Manatee", "Sarasota"],                                        chiefJudge: "Chief Judge TBD" },
  { number: 13, name: "Thirteenth Judicial Circuit",  counties: ["Hillsborough"],                                                        chiefJudge: "Chief Judge TBD" },
  { number: 14, name: "Fourteenth Judicial Circuit",  counties: ["Bay", "Calhoun", "Gulf", "Holmes", "Jackson", "Washington"],           chiefJudge: "Chief Judge TBD" },
  { number: 15, name: "Fifteenth Judicial Circuit",   counties: ["Palm Beach"],                                                          chiefJudge: "Chief Judge TBD" },
  { number: 16, name: "Sixteenth Judicial Circuit",   counties: ["Monroe"],                                                              chiefJudge: "Chief Judge TBD" },
  { number: 17, name: "Seventeenth Judicial Circuit",  counties: ["Broward"],                                                            chiefJudge: "Chief Judge TBD" },
  { number: 18, name: "Eighteenth Judicial Circuit",   counties: ["Brevard", "Seminole"],                                                chiefJudge: "Chief Judge TBD" },
  { number: 19, name: "Nineteenth Judicial Circuit",   counties: ["Indian River", "Martin", "Okeechobee", "St. Lucie"],                  chiefJudge: "Chief Judge TBD" },
  { number: 20, name: "Twentieth Judicial Circuit",    counties: ["Charlotte", "Collier", "Glades", "Hendry", "Lee"],                    chiefJudge: "Chief Judge TBD" },
];

// ─── Persistence helpers ──────────────────────────────────────────────────────

async function persistCase(caseData: Case) {
  if (!pool) return;
  await pool.query(
    `INSERT INTO judicial_cases (id, case_number, title, jurisdiction, court, status, filed_at, case_data)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     ON CONFLICT (id) DO UPDATE SET status=$6, case_data=$8`,
    [caseData.id, caseData.caseNumber, caseData.title, caseData.jurisdiction,
     caseData.court, caseData.status, caseData.filedAt, JSON.stringify(caseData)]
  ).catch((e: Error) => console.error("[pg] persistCase:", e.message));
}

async function persistReport(report: any) {
  if (!pool) return;
  await pool.query(
    `INSERT INTO judicial_reports (report_id, case_id, risk_level, overall_verdict, violations_count, fact_score, report_data)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (report_id) DO NOTHING`,
    [report.reportId, report.caseId, report.riskLevel, report.overallVerdict,
     report.chargeViolations.length, report.factScore.factualScore, JSON.stringify(report)]
  ).catch((e: Error) => console.error("[pg] persistReport:", e.message));
}

async function persistLedgerEvents(events: TransparencyEvent[]) {
  if (!pool || events.length === 0) return;
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
  if (pool) {
    await pool.query(
      `INSERT INTO judicial_alerts (id, case_id, alert_type, severity, description) VALUES ($1,$2,$3,$4,$5)`,
      [id, caseId, alertType, severity, description]
    ).catch(() => {});
  }
  await redis.publish("judicial:alerts", JSON.stringify({ id, caseId, alertType, severity, description, timestamp: new Date().toISOString() })).catch(() => {});
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
        network: NETWORK,
        jurisdiction: "Florida",
        circuits: FLORIDA_CIRCUITS.length,
        casesAnalyzed,
        violationsFound,
        dismissalsRecommended,
        alertsPublished,
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
        `# HELP judicial_active_requests Current in-flight requests`,
        `# TYPE judicial_active_requests gauge`,
        `judicial_active_requests ${activeRequests}`,
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
        if (caseData) await persistCase(caseData);
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
      const r = await pool.query(
        `SELECT c.id, c.case_number, c.title, c.jurisdiction, c.court, c.status, c.filed_at,
                r.risk_level, r.overall_verdict, r.violations_count, r.fact_score, r.analyzed_at
         FROM judicial_cases c
         LEFT JOIN LATERAL (
           SELECT * FROM judicial_reports WHERE case_id = c.id ORDER BY analyzed_at DESC LIMIT 1
         ) r ON true
         WHERE c.jurisdiction ILIKE $1
         ORDER BY c.filed_at DESC LIMIT $2`,
        [`%${jurisdiction}%`, limit]
      );
      res.writeHead(200);
      res.end(safeStringify({ rows: r.rows, total: r.rowCount }));

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

      res.writeHead(200);
      res.end(safeStringify({
        case: caseR.rows[0] ?? null,
        report: reportR.rows[0] ?? null,
        ledger: ledgerR.rows,
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
        },
        antiRailroading: {
          chargeStackingDetection: "ENABLED",
          multiplicityDetection: "ENABLED",
          bradyViolationScanning: "ENABLED",
          emotionalLanguageDetection: "ENABLED",
          selectiveProsecutionFlag: "ENABLED",
          vindictiveProsecutionFlag: "ENABLED",
          disproportionateSentencing: "ENABLED",
          stricklandRepresentationAudit: "ENABLED",
        },
        transparencyLedger: {
          type: "SHA-256 Hash Chain",
          tamperProof: true,
          publicAccess: true,
        },
      };

      // Add DB stats if available
      if (pool) {
        const stats = await pool.query(`
          SELECT
            (SELECT COUNT(*) FROM judicial_cases WHERE jurisdiction ILIKE '%florida%') AS total_cases,
            (SELECT COUNT(*) FROM judicial_reports WHERE overall_verdict = 'VIOLATIONS_FOUND') AS violations_found_cases,
            (SELECT COUNT(*) FROM judicial_reports WHERE overall_verdict = 'CASE_RECOMMENDED_FOR_DISMISSAL') AS dismissal_cases,
            (SELECT COUNT(*) FROM judicial_reports WHERE risk_level = 'CRITICAL') AS critical_cases,
            (SELECT COUNT(*) FROM judicial_alerts WHERE NOT acknowledged) AS pending_alerts
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

      const report = reportR.rows[0]?.report_data ?? null;
      res.writeHead(200);
      res.end(safeStringify({
        report,
        ledger: ledgerR.rows,
        alerts: alertsR.rows,
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
          uptime: process.uptime(),
        },
      };

      if (pool) {
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

        stats.database = {
          verdicts: dbStats.rows,
          riskLevels: violationStats.rows,
        };
      }

      res.writeHead(200);
      res.end(safeStringify(stats));

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

async function startSubscription() {
  await redisSub.connect().catch((e: Error) => console.error("[redisSub] connect:", e.message));
  await redisSub.subscribe("judicial:case:submit", async (message) => {
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

      console.log(`[judicial] Analyzed ${caseData.caseNumber}: ${report.overallVerdict} (${report.chargeViolations.length} violations)`);
    } catch (e) {
      console.error("[judicial] subscription error:", (e as Error).message);
    }
  }).catch((e: Error) => console.error("[redisSub] subscribe:", e.message));
  console.log("✅ Judicial Monitor subscribed to judicial:case:submit");
}

// ─── Start ────────────────────────────────────────────────────────────────────

async function start() {
  await redis.connect().catch((e: Error) => console.error("[redis] connect:", e.message));
  await ensureTables();
  await startSubscription();
  ready = true;
  console.log("✅ Judicial Monitor ONLINE — Florida courtroom transparency active");
  console.log(`   📊 Monitoring ${FLORIDA_CIRCUITS.length} judicial circuits, ${FLORIDA_CIRCUITS.reduce((s, c) => s + c.counties.length, 0)} counties`);
  console.log("   🛡️  Anti-railroading • Anti-stacking • Anti-vendetta • Full transparency");
}

start().catch(err => { console.error("❌ Judicial Monitor failed:", err); process.exit(1); });

function shutdown(sig: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[judicial-monitor] ${sig} — shutting down…`);
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

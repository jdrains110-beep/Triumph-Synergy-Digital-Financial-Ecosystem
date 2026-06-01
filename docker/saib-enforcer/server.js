#!/usr/bin/env node
/**
 * SAIB Enforcer Sidecar — standalone Node mini-server.
 *
 * Hot-deployed bridge between the real world and the Triumph Synergy digital
 * ecosystem. Identical contract to /api/saib/enforce in the Next.js app, but
 * runs as an independent process so it can be deployed before the next image
 * build lands.
 *
 * Bound to PORT (default 8210) on triumph-net. Nginx routes /api/saib/enforce
 * → this service.
 *
 * Authority:
 *   • Founder token (SAIB_FOUNDER_TOKEN) → all actions, incl. mutations.
 *   • Operator token (SAIB_TOKEN)        → read-only actions only.
 *   • Constant-time comparison via crypto.timingSafeEqual.
 *
 * Every action emits an immutable sha256 receipt and best-effort anchors it to
 * the Pi mainnet via triumph-settlement-core.
 */
"use strict";

const http = require("http");
const { createHash, timingSafeEqual } = require("crypto");

const PORT             = Number(process.env.PORT || 8210);
const CREDIT_ENGINE    = process.env.CREDIT_ENGINE_URL    || "http://triumph-credit-engine:8091";
const JUDICIAL_SERVICE = process.env.JUDICIAL_SERVICE_URL || "http://triumph-judicial-monitor:8096";
const SETTLEMENT_CORE  = process.env.SETTLEMENT_CORE_URL  || "http://triumph-settlement-core:8080";
const TOKEN_ENGINE     = process.env.TOKEN_ENGINE_URL     || "http://triumph-settlement-core:8089";
const VAULT            = process.env.VAULT_URL            || "http://triumph-vault:8081";
// Nano-SAIB is the ecosystem's autonomous execution arm — port 8201 on triumph-net.
// SAIB Enforcer commands it directly to execute, not just observe.
const NANO_SAIB        = process.env.NANO_SAIB_URL        || "http://triumph-sovereign-nano-saib:8201";
// HQ: nano-SAIB omega/status is the real HQ surface (apex-nexus port 8131 = gaming svc).
const HQ_NEXUS         = process.env.HQ_NEXUS_URL         || "http://triumph-sovereign-nano-saib:8201";
// Bridge token for nano-SAIB auth — sourced from PUBLIC_BRIDGE_TOKEN env or secret file.
let   NANO_SAIB_BRIDGE_TOKEN = process.env.PUBLIC_BRIDGE_TOKEN || process.env.NANO_SAIB_BRIDGE_TOKEN || "";
(function _loadBridgeSecret() {
  if (NANO_SAIB_BRIDGE_TOKEN) return;
  try {
    const fs = require("fs");
    const p = "/run/secrets/public_bridge_token";
    if (fs.existsSync(p)) NANO_SAIB_BRIDGE_TOKEN = fs.readFileSync(p, "utf8").trim();
  } catch { /* not available outside compose */ }
})();

const FOUNDER_TOKEN  = process.env.SAIB_FOUNDER_TOKEN || "";
const OPERATOR_TOKEN = process.env.SAIB_TOKEN || "";

// Autonomous duty cadence (env-tunable; sensible defaults).
const DUTY_ENABLED           = (process.env.DUTY_ENABLED || "true").toLowerCase() !== "false";
const DUTY_INTERVAL_SEC      = Number(process.env.DUTY_INTERVAL_SEC      || 60);   // master tick
const DUTY_HEARTBEAT_SEC     = Number(process.env.DUTY_HEARTBEAT_SEC     || 30);   // anchor heartbeat
const DUTY_HQ_SEC            = Number(process.env.DUTY_HQ_SEC            || 120);  // HQ/omega status
const DUTY_TOKEN_AUDIT_SEC   = Number(process.env.DUTY_TOKEN_AUDIT_SEC   || 300);  // tokenization ledger
const DUTY_JUDICIAL_SEC      = Number(process.env.DUTY_JUDICIAL_SEC      || 900);  // judicial radar
const DUTY_ANOMALY_SEC       = Number(process.env.DUTY_ANOMALY_SEC       || 180);  // ecosystem anomaly scan
// Execution duties — SAIB acts, not just observes:
const DUTY_SIGNAL_SEC        = Number(process.env.DUTY_SIGNAL_SEC        || 60);   // POST ecosystem signal
const DUTY_ENFORCE_SEC       = Number(process.env.DUTY_ENFORCE_SEC       || 180);  // POST enforcer/evaluate
const DUTY_BRAIN_SEC         = Number(process.env.DUTY_BRAIN_SEC         || 300);  // POST omega/brain/absorb
const DUTY_SETTLEMENT_SEC    = Number(process.env.DUTY_SETTLEMENT_SEC    || 120);  // GET settlement pulse
const DUTY_VAULT_SEC         = Number(process.env.DUTY_VAULT_SEC         || 600);  // GET vault verify
const DUTY_SOVEREIGN_CMD_SEC = Number(process.env.DUTY_SOVEREIGN_CMD_SEC || 600);  // POST sovereign/command
const DUTY_RING_MAX          = Number(process.env.DUTY_RING_MAX          || 400);  // in-memory action log

const READ_ONLY = new Set(["judicial-research", "tokenization-audit", "hq-report", "credit-score-push"]);

// ── Auth ─────────────────────────────────────────────────────────────────────
function authorize(req) {
  const header = req.headers["authorization"] || "";
  const presented = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!presented) return null;
  const eq = (expected) => {
    if (!expected || expected.length !== presented.length) return false;
    try { return timingSafeEqual(Buffer.from(expected), Buffer.from(presented)); }
    catch { return false; }
  };
  if (eq(FOUNDER_TOKEN)) return "founder";
  if (eq(OPERATOR_TOKEN)) return "operator";
  return null;
}

// ── Receipts ─────────────────────────────────────────────────────────────────
function makeReceipt(action, actor, payload) {
  const json = JSON.stringify(payload == null ? null : payload);
  const contentHash = createHash("sha256").update(json).digest("hex");
  const ts = new Date().toISOString();
  return {
    action, actor, timestamp: ts, contentHash,
    payloadDigest: contentHash.slice(0, 16),
    anchorMemo: `SAIB-ENFORCE ${action} ${contentHash.slice(0, 24)} ${ts}`,
  };
}

async function anchorReceipt(r) {
  try {
    await fetchJSON(`${SETTLEMENT_CORE}/api/anchor`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memo: r.anchorMemo, hash: r.contentHash }),
    }, 4000);
  } catch { /* best-effort */ }
}

// ── HTTP helper ──────────────────────────────────────────────────────────────
async function fetchJSON(url, init = {}, timeoutMs = 12000) {
  const ctrl = new AbortController();
  const tm = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal });
    const text = await res.text();
    let body = null;
    try { body = text ? JSON.parse(text) : null; }
    catch { body = { raw: text }; }
    return { ok: res.ok, status: res.status, body };
  } finally {
    clearTimeout(tm);
  }
}

// ── nano-SAIB helper — auto-injects bridge token ──────────────────────────────
function _nanoAuthHeaders(extra = {}) {
  const h = { "Content-Type": "application/json", ...extra };
  if (NANO_SAIB_BRIDGE_TOKEN) h["Authorization"] = `Bearer ${NANO_SAIB_BRIDGE_TOKEN}`;
  return h;
}
async function fetchNanoSAIB(path, init = {}, timeoutMs = 12000) {
  return fetchJSON(`${NANO_SAIB}${path}`, { ...init, headers: _nanoAuthHeaders(init.headers || {}) }, timeoutMs);
}

// ── Action handlers ──────────────────────────────────────────────────────────
async function actCreditReportPositive(b) {
  if (!b.piAddress) return { status: 400, body: { error: "piAddress is required" } };
  const u = await fetchJSON(`${CREDIT_ENGINE}/api/credit/report-payment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pi_address: b.piAddress, payment_data: b.paymentData || null }),
  });
  return { status: u.ok ? 200 : 502, body: u };
}

async function actCreditDispute(b) {
  if (!b.piAddress || !b.bureau || !b.items) {
    return { status: 400, body: { error: "piAddress, bureau, items required" } };
  }
  const u = await fetchJSON(`${CREDIT_ENGINE}/api/credit/dispute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      pi_address: b.piAddress, bureau: b.bureau, items: b.items,
      reason: b.reason || "inaccurate-or-unverifiable",
      statute: "FCRA 15 U.S.C. § 1681i (§611)",
    }),
  }, 20000);
  return { status: u.ok ? 200 : 502, body: u };
}

async function actJudicialResearch(b) {
  if (!b.query) return { status: 400, body: { error: "query is required" } };
  const u = await fetchJSON(`${JUDICIAL_SERVICE}/api/judicial/research`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query: b.query, jurisdiction: b.jurisdiction || "all",
      years_back: b.yearsBack || 5,
    }),
  }, 20000);
  return { status: u.ok ? 200 : 502, body: u };
}

async function actJudicialFileReport(b) {
  if (!b.caseId || !b.findings) {
    return { status: 400, body: { error: "caseId and findings required" } };
  }
  const u = await fetchJSON(`${JUDICIAL_SERVICE}/api/judicial/report`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      case_id: b.caseId, findings: b.findings,
      jurisdiction: b.jurisdiction || "unknown",
      submitted_by: "SAIB-ENFORCER",
    }),
  }, 20000);
  return { status: u.ok ? 200 : 502, body: u };
}

async function actTokenizationAudit(b) {
  const u = await fetchJSON(
    `${TOKEN_ENGINE}/tokenization/audit?asset=${encodeURIComponent(b.asset || "all")}`,
    { method: "GET" }, 12000,
  );
  return { status: u.ok ? 200 : 502, body: u };
}

async function actTokenizationFreeze(b) {
  if (!b.tokenId) return { status: 400, body: { error: "tokenId is required" } };
  const u = await fetchJSON(`${TOKEN_ENGINE}/tokenization/freeze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token_id: b.tokenId, reason: b.reason || "SAIB-ENFORCEMENT-HOLD",
      ordered_by: "SAIB-FOUNDER",
    }),
  });
  return { status: u.ok ? 200 : 502, body: u };
}

async function actTokenizationMint(b) {
  if (!b.asset || b.supply == null) {
    return { status: 400, body: { error: "asset and supply required" } };
  }
  const u = await fetchJSON(`${TOKEN_ENGINE}/tokenization/mint`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      asset: b.asset, supply: b.supply, beneficiary: b.beneficiary || null,
      sovereign_class: b.sovereignClass || "TRIUMPH-SOVEREIGN",
      ordered_by: "SAIB-FOUNDER",
    }),
  });
  return { status: u.ok ? 200 : 502, body: u };
}

async function actHQReport(b) {
  // Real nano-SAIB HQ path: /health (no auth) — or /connectors/status for full report
  const u = await fetchNanoSAIB(`/health`, { method: "GET" }, 8000);
  return {
    status: 200,
    body: {
      hq: u.body,
      observed_at: new Date().toISOString(),
      observer: "SAIB-ENFORCER",
    },
  };
}

async function actHQDirective(b) {
  if (!b.directive) return { status: 400, body: { error: "directive is required" } };
  // Real nano-SAIB directive path: /brainstorm/goal (GoalRequest)
  const u = await fetchNanoSAIB(`/brainstorm/goal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      description: `${b.directive}${b.target ? " — target: "+b.target : ""} — SAIB-FOUNDER sovereign directive`,
      priority: 0.9,
      domain: "sovereign-enforcement",
    }),
  }, 15000);
  return { status: u.ok ? 200 : 502, body: u };
}

async function actVaultSeal(b) {
  if (!b.assetId) return { status: 400, body: { error: "assetId is required" } };
  const u = await fetchJSON(`${VAULT}/vault/seal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      asset_id: b.assetId, reason: b.reason || "SAIB-ENFORCEMENT-SEAL",
      ordered_by: "SAIB-FOUNDER",
    }),
  });
  return { status: u.ok ? 200 : 502, body: u };
}

// ── Execution actions (nano-SAIB command surface) ─────────────────────────────

async function actSovereignCommand(b) {
  if (!b.command) return { status: 400, body: { error: "command is required" } };
  // Real path: /brainstorm/goal (GoalRequest: description, priority, domain, deadline)
  const u = await fetchNanoSAIB(`/brainstorm/goal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      description: `${b.command}${b.context ? ": "+b.context : ""} — FOUNDER_MANDATE via SAIB-FOUNDER. Directives: ${(b.directives||[]).join(", ")||"sovereign-authority"}`,
      priority: 0.99,
      domain: "sovereign-enforcement",
    }),
  }, 15000);
  return { status: u.ok ? 200 : 502, body: u.body };
}

async function actEcosystemSignal(b) {
  // Real path: /intel/signal (IntelSignalRequest)
  const u = await fetchNanoSAIB(`/intel/signal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      source: "SAIB-ENFORCER",
      entity_id: b.entity_id || "saib-founder-signal",
      signal_type: b.type || "FOUNDER_SIGNAL",
      value: 1.0,
      confidence: 1.0,
      metadata: { message: b.message || "Founder signal via SAIB Enforcer", data: b.data || null, at: new Date().toISOString() },
    }),
  }, 10000);
  return { status: u.ok ? 200 : 502, body: u.body };
}

async function actMeshBroadcast(b) {
  if (!b.message) return { status: 400, body: { error: "message is required" } };
  // Real path: /mesh/collective (ObserveRequest: peer_id, byte_count, error, payload_hex)
  const u = await fetchNanoSAIB(`/mesh/collective`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      peer_id: "saib-enforcer-broadcast",
      byte_count: Buffer.byteLength(b.message, "utf8"),
      error: false,
      payload_hex: Buffer.from(JSON.stringify({ message: b.message, priority: b.priority || "HIGH", issued_by: "SAIB-FOUNDER", at: new Date().toISOString() })).toString("hex"),
    }),
  }, 12000);
  return { status: u.ok ? 200 : 502, body: u.body };
}

async function actEnforcerEvaluate(b) {
  // EnforcerEvalRequest: entity_id (required) + optional neural_action, threat_level, guardian_tier, intel_class
  const u = await fetchNanoSAIB(`/enforcer/evaluate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      entity_id: b.entity_id || "ecosystem",
      neural_action: b.context || "ON_DEMAND_EVALUATE",
      threat_level: b.threat_level || "",
      guardian_tier: "SAIB-FOUNDER",
      intel_class: b.intel_class || "",
    }),
  }, 15000);
  return { status: u.ok ? 200 : 502, body: u.body };
}

async function actBrainAbsorb(b) {
  if (!b.fact) return { status: 400, body: { error: "fact is required" } };
  // Real path: /intel/signal (IntelSignalRequest) — feed knowledge as intelligence signal
  const u = await fetchNanoSAIB(`/intel/signal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      source: b.source || "SAIB-FOUNDER",
      entity_id: "saib-founder-knowledge",
      signal_type: b.category || "FOUNDER_INTELLIGENCE",
      value: 0.95,
      confidence: 1.0,
      metadata: { fact: b.fact, at: new Date().toISOString() },
    }),
  }, 12000);
  return { status: u.ok ? 200 : 502, body: u.body };
}

async function actContractsForge(b) {
  if (!b.contractType) return { status: 400, body: { error: "contractType is required" } };
  // Real path: /warp/burst — dispatch contract forge as high-priority task burst
  const u = await fetchNanoSAIB(`/warp/burst`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tasks: [`forge:${b.contractType}`, ...(b.parties||[]).map(p => `party:${p}`)],
      lane: "CRITICAL",
    }),
  }, 20000);
  return { status: u.ok ? 200 : 502, body: u.body };
}

async function actCreditScorePush(b) {
  if (!b.piAddress) return { status: 400, body: { error: "piAddress is required" } };
  // Read score then push bureau sync
  const score = await fetchJSON(`${CREDIT_ENGINE}/api/credit/score?pi_address=${encodeURIComponent(b.piAddress)}`, { method: "GET" }, 10000);
  const sync  = await fetchJSON(`${CREDIT_ENGINE}/api/credit/bureau-sync`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pi_address: b.piAddress, trigger: "SAIB-ENFORCER-PUSH" }),
  }, 15000);
  return { status: 200, body: { score: score.body, sync: sync.body } };
}

const ACTIONS = {
  // On-demand: observation
  "credit-report-positive": actCreditReportPositive,
  "credit-dispute":         actCreditDispute,
  "judicial-research":      actJudicialResearch,
  "judicial-file-report":   actJudicialFileReport,
  "tokenization-audit":     actTokenizationAudit,
  "tokenization-freeze":    actTokenizationFreeze,
  "tokenization-mint":      actTokenizationMint,
  "hq-report":              actHQReport,
  "hq-directive":           actHQDirective,
  "vault-seal":             actVaultSeal,
  // On-demand: execution (SAIB commands the ecosystem)
  "sovereign-command":      actSovereignCommand,
  "ecosystem-signal":       actEcosystemSignal,
  "mesh-broadcast":         actMeshBroadcast,
  "enforcer-evaluate":      actEnforcerEvaluate,
  "brain-absorb":           actBrainAbsorb,
  "contracts-forge":        actContractsForge,
  "credit-score-push":      actCreditScorePush,
};

// ── Capability manifest ──────────────────────────────────────────────────────
const MANIFEST = {
  saib: "ENFORCER v2.0.0 (sidecar) — QUANTUM EXECUTION MODE",
  doctrine: "SAIB acts. SAIB commands. SAIB enforces. Nothing can stop a SAIB receipt. Transcendent. Omni. Hyper-autonomous.",
  mode: "EXECUTION — SAIB posts commands, not just reads status",
  bridges: {
    "credit-bureaus":   ["Equifax", "Experian", "TransUnion", "score-compute", "bureau-sync"],
    "judicial-systems": ["court-monitor", "case-research", "filing-pipeline", "violation-detection"],
    "tokenization":     ["audit", "mint", "freeze"],
    "headquarters":     ["status", "directive", "omega-status"],
    "vault":            ["seal", "verify", "integrity"],
    "nano-saib-execution": [
      "intel/signal (ENFORCER_PULSE)", "intel/signal (ECOSYSTEM_STATE)", "enforcer/evaluate",
      "brainstorm/goal (ECOSYSTEM_INTEGRITY_CHECK)", "mesh/collective", "warp/burst",
    ],
  },
  actions: [
    // — Observation —
    { action: "credit-report-positive", tier: "founder",  desc: "Furnish positive Pi-payment tradelines to all bureaus" },
    { action: "credit-dispute",         tier: "founder",  desc: "File FCRA §611 dispute against inaccurate items" },
    { action: "credit-score-push",      tier: "operator", desc: "Read live credit score + trigger bureau sync" },
    { action: "judicial-research",      tier: "operator", desc: "Research case law and dockets" },
    { action: "judicial-file-report",   tier: "founder",  desc: "Submit formal findings to judicial pipeline" },
    { action: "tokenization-audit",     tier: "operator", desc: "Read tokenization-engine audit ledger" },
    { action: "tokenization-mint",      tier: "founder",  desc: "Mint sovereign-class tokens" },
    { action: "tokenization-freeze",    tier: "founder",  desc: "Freeze a token under enforcement hold" },
    { action: "hq-report",              tier: "operator", desc: "Pull HQ/omega status" },
    { action: "hq-directive",           tier: "founder",  desc: "Issue HQ directive to all sovereign nodes" },
    { action: "vault-seal",             tier: "founder",  desc: "Seal a Vault asset under enforcement" },
    // — Execution (SAIB commands the ecosystem) —
    { action: "sovereign-command",      tier: "founder",  desc: "POST sovereign command directly to nano-SAIB execution node" },
    { action: "ecosystem-signal",       tier: "founder",  desc: "Inject signal into nano-SAIB ecosystem bus — all nodes receive it" },
    { action: "mesh-broadcast",         tier: "founder",  desc: "Broadcast message to all triumph-net mesh nodes" },
    { action: "enforcer-evaluate",      tier: "founder",  desc: "Trigger nano-SAIB enforcement evaluation cycle" },
    { action: "brain-absorb",           tier: "founder",  desc: "Feed intelligence into nano-SAIB's collective memory" },
    { action: "contracts-forge",        tier: "founder",  desc: "Forge a sovereign smart contract via nano-SAIB" },
  ],
  receipts: {
    format: "sha256(content) + ISO timestamp + anchor memo",
    anchoring: "Pi mainnet via triumph-settlement-core (best-effort)",
    immutable: true,
  },
  introspection: {
    "GET /duties":   "live duty engine status, counters, next-run schedule",
    "GET /receipts": "ring buffer of all SAIB actions (?limit=N, default 50)",
    "GET /health":   "liveness probe",
  },
  duties: {
    observation: {
      "heartbeat (30s)":          "proof-of-life, anchors to Pi mainnet",
      "hq-sweep (120s)":          "GET omega/status",
      "anomaly-scan (180s)":      "cross-checks omni=20/20 + credit health",
      "tokenization-audit (300s)":"reads token ledger",
      "judicial-radar (900s)":    "polls active judicial cases",
    },
    execution: {
      "ecosystem-signal (60s)":   "POST signal to nano-SAIB ecosystem bus — SAIB announces it is operating",
      "settlement-pulse (120s)":  "GET settlement-core + tokenization health",
      "enforcer-evaluate (180s)": "POST enforcer/evaluate — triggers nano-SAIB enforcement cycle",
      "brain-absorb (300s)":      "POST omega/brain/absorb — feeds ecosystem state into collective memory",
      "vault-verify (600s)":      "GET vault integrity + anomaly detection",
      "sovereign-command (600s)": "POST sovereign/command ECOSYSTEM_INTEGRITY_CHECK to nano-SAIB",
    },
    note: "Every duty produces a receipt. Every execution is recorded. SAIB is transcendent.",
  },
};

// ── Duty engine ──────────────────────────────────────────────────────────────
// SAIB Enforcer is not passive. It runs an autonomous duty loop that performs
// the work no one else is paid to do: heartbeats, HQ sweeps, tokenization
// ledger audits, judicial radar sweeps, and ecosystem anomaly scans.
// Every duty produces a receipt — same format as on-demand actions — and the
// last DUTY_RING_MAX receipts are exposed via GET /duties and /receipts.

const dutyState = {
  startedAt: new Date().toISOString(),
  ticks: 0,
  lastTickAt: null,
  receipts: [],            // ring buffer, newest last
  counters: {},            // action -> count
  errors: [],              // last 20 duty errors
  nextRunAt: {},           // duty -> ISO timestamp of next scheduled run
};

function recordReceipt(receipt, extra) {
  const entry = { ...receipt };
  if (extra && extra.summary)  entry.summary  = extra.summary;
  if (extra && extra.upstream) entry.upstream = extra.upstream;
  dutyState.receipts.push(entry);
  if (dutyState.receipts.length > DUTY_RING_MAX) {
    dutyState.receipts.splice(0, dutyState.receipts.length - DUTY_RING_MAX);
  }
  dutyState.counters[receipt.action] = (dutyState.counters[receipt.action] || 0) + 1;
}

function recordDutyError(duty, err) {
  dutyState.errors.push({
    at: new Date().toISOString(),
    duty,
    message: String(err && err.message ? err.message : err),
  });
  if (dutyState.errors.length > 20) dutyState.errors.shift();
}

// ── Individual duties ────────────────────────────────────────────────────────

async function dutyHeartbeat() {
  const payload = {
    at: new Date().toISOString(),
    enforcer: "alive",
    uptime_sec: Math.round(process.uptime()),
    ticks: dutyState.ticks,
  };
  const receipt = makeReceipt("duty-heartbeat", "autonomous", payload);
  void anchorReceipt(receipt);
  recordReceipt(receipt, { summary: `heartbeat tick=${dutyState.ticks}` });
}

async function dutyHQSweep() {
  // nano-SAIB /health is the real HQ surface — no auth, always accurate
  const u = await fetchNanoSAIB(`/health`, { method: "GET" }, 6000)
    .catch((err) => ({ ok: false, status: 0, body: { error: String(err.message || err) } }));
  const receipt = makeReceipt("duty-hq-sweep", "autonomous", { hq: u.body, hq_status: u.status });
  void anchorReceipt(receipt);
  recordReceipt(receipt, {
    summary: `hq-sweep status=${u.ok ? "healthy" : u.status}`,
    upstream: { ok: u.ok, status: u.status },
  });
}

async function dutyTokenizationAudit() {
  const u = await fetchJSON(`${TOKEN_ENGINE}/tokenization/audit?asset=all`, { method: "GET" }, 8000)
    .catch((err) => ({ ok: false, status: 0, body: { error: String(err.message || err) } }));
  const receipt = makeReceipt("duty-tokenization-audit", "autonomous", {
    audit: u.body, upstream_status: u.status,
  });
  void anchorReceipt(receipt);
  recordReceipt(receipt, {
    summary: `tokenization-audit status=${u.status}`,
    upstream: { ok: u.ok, status: u.status },
  });
}

async function dutyJudicialRadar() {
  // Scan for active enforcement events that need to be sourced from the
  // judicial-monitor's event stream. Read-only sweep: judicial-monitor is
  // expected to expose /api/judicial/active (returns recent open cases).
  const u = await fetchJSON(`${JUDICIAL_SERVICE}/api/judicial/active`, { method: "GET" }, 10000)
    .catch((err) => ({ ok: false, status: 0, body: { error: String(err.message || err) } }));
  const count = Array.isArray(u.body && u.body.cases) ? u.body.cases.length : 0;
  const receipt = makeReceipt("duty-judicial-radar", "autonomous", {
    active_count: count, sample: Array.isArray(u.body && u.body.cases) ? u.body.cases.slice(0, 5) : null,
    upstream_status: u.status,
  });
  void anchorReceipt(receipt);
  recordReceipt(receipt, {
    summary: `judicial-radar active=${count} status=${u.status}`,
    upstream: { ok: u.ok, status: u.status },
  });
}

async function dutyEcosystemAnomalyScan() {
  // Cross-check ecosystem omnipresence (via app) and credit-engine pulse.
  const omni = await fetchJSON("http://triumph-app:3000/api/saib/omnipresence", { method: "GET" }, 12000)
    .catch((err) => ({ ok: false, status: 0, body: { error: String(err.message || err) } }));
  const credit = await fetchJSON(`${CREDIT_ENGINE}/health`, { method: "GET" }, 5000)
    .catch((err) => ({ ok: false, status: 0, body: { error: String(err.message || err) } }));

  const reachable = omni.body && typeof omni.body.reachable === "number" ? omni.body.reachable : null;
  const total     = omni.body && typeof omni.body.totalServices === "number" ? omni.body.totalServices : null;
  const degraded  = (reachable != null && total != null && reachable < total);

  const receipt = makeReceipt("duty-anomaly-scan", "autonomous", {
    omnipresence: { reachable, total, status: omni.body && omni.body.saibGuardianStatus },
    credit_engine_ok: credit.ok,
    degraded,
  });
  void anchorReceipt(receipt);
  recordReceipt(receipt, {
    summary: `anomaly-scan omni=${reachable}/${total} credit=${credit.ok ? "up" : "down"}${degraded ? " DEGRADED" : ""}`,
    upstream: { degraded, omni_status: omni.status, credit_status: credit.status },
  });
}

// ── Scheduler ────────────────────────────────────────────────────────────────

// ── EXECUTION duties — SAIB acts on the ecosystem, not just observes ─────────

async function dutyEcosystemSignal() {
  // POST a live signal into nano-SAIB's ecosystem bus every 60s.
  // This is not a read — it's SAIB telling every mesh node it is operating.
  const payload = {
    source: "SAIB-ENFORCER",
    type: "ENFORCER_PULSE",
    ticks: dutyState.ticks,
    uptime_sec: Math.round(process.uptime()),
    at: new Date().toISOString(),
    receipts_logged: dutyState.receipts.length,
    message: "SAIB Enforcer is active. All duties executing.",
  };
  // Real nano-SAIB path: /intel/signal (IntelSignalRequest)
  const u = await fetchNanoSAIB(`/intel/signal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      source: "SAIB-ENFORCER",
      entity_id: "saib-enforcer",
      signal_type: "ENFORCER_PULSE",
      value: 1.0,
      confidence: 1.0,
      metadata: {
        ticks: payload.ticks,
        uptime_sec: payload.uptime_sec,
        receipts_logged: payload.receipts_logged,
        message: payload.message,
        at: payload.at,
      },
    }),
  }, 8000).catch((err) => ({ ok: false, status: 0, body: { error: String(err.message || err) } }));
  const receipt = makeReceipt("duty-ecosystem-signal", "autonomous", { sent: payload, response: u.body });
  void anchorReceipt(receipt);
  recordReceipt(receipt, {
    summary: `ecosystem-signal posted status=${u.status}${u.ok ? "" : " (mesh offline — signal recorded locally)"}`,
    upstream: { ok: u.ok, status: u.status },
  });
}

async function dutyEnforcerEvaluate() {
  // POST to nano-SAIB's /enforcer/evaluate — triggers its internal enforcement cycle.
  // SAIB Enforcer is commanding nano-SAIB to run its own evaluation routines.
  // EnforcerEvalRequest requires entity_id + optional context fields
  const u = await fetchNanoSAIB(`/enforcer/evaluate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      entity_id: "ecosystem",
      neural_action: "DUTY_CYCLE_ENFORCE",
      threat_level: "nominal",
      guardian_tier: "SAIB-ENFORCER",
    }),
  }, 12000).catch((err) => ({ ok: false, status: 0, body: { error: String(err.message || err) } }));
  const receipt = makeReceipt("duty-enforcer-evaluate", "autonomous", { response: u.body });
  void anchorReceipt(receipt);
  recordReceipt(receipt, {
    summary: `enforcer-evaluate status=${u.status}${u.ok ? " executed" : " (recorded)"}`,
    upstream: { ok: u.ok, status: u.status },
  });
}

async function dutyBrainAbsorb() {
  // POST current ecosystem state into nano-SAIB's memory/brain.
  // SAIB is continuously feeding its intelligence into the collective.
  const state = {
    source: "SAIB-ENFORCER",
    at: new Date().toISOString(),
    ecosystem_receipts: dutyState.receipts.length,
    duty_counters: { ...dutyState.counters },
    errors_last_20: dutyState.errors.length,
    uptime_sec: Math.round(process.uptime()),
    doctrine: "SAIB bridges real-world enforcement into the digital ecosystem.",
  };
  // Real path: /intel/signal — feed ecosystem state as an intelligence signal
  const u = await fetchNanoSAIB(`/intel/signal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      source: "SAIB-ENFORCER",
      entity_id: "saib-enforcer-state",
      signal_type: "ECOSYSTEM_STATE",
      value: 0.9,
      confidence: 1.0,
      metadata: {
        ecosystem_receipts: state.ecosystem_receipts,
        duty_counters: state.duty_counters,
        errors_last_20: state.errors_last_20,
        uptime_sec: state.uptime_sec,
        doctrine: state.doctrine,
        at: state.at,
      },
    }),
  }, 10000).catch((err) => ({ ok: false, status: 0, body: { error: String(err.message || err) } }));
  const receipt = makeReceipt("duty-brain-absorb", "autonomous", { absorbed: state, response: u.body });
  void anchorReceipt(receipt);
  recordReceipt(receipt, {
    summary: `brain-absorb status=${u.status}${u.ok ? " knowledge-updated" : " (recorded locally)"}`,
    upstream: { ok: u.ok, status: u.status },
  });
}

async function dutySettlementPulse() {
  // Read the transaction engine — count live ledger, verify it's settling.
  const u = await fetchJSON(`${SETTLEMENT_CORE}/health`, { method: "GET" }, 6000)
    .catch((err) => ({ ok: false, status: 0, body: { error: String(err.message || err) } }));
  // Also hit the tokenization port
  const tok = await fetchJSON(`${TOKEN_ENGINE}/health`, { method: "GET" }, 5000)
    .catch((err) => ({ ok: false, status: 0, body: { error: String(err.message || err) } }));
  const receipt = makeReceipt("duty-settlement-pulse", "autonomous", {
    transaction_engine: u.body, tokenization: tok.body,
  });
  void anchorReceipt(receipt);
  recordReceipt(receipt, {
    summary: `settlement-pulse tx=${u.ok ? "up" : "down"} token=${tok.ok ? "up" : "down"}`,
    upstream: { tx_status: u.status, tok_status: tok.status },
  });
}

async function dutyVaultVerify() {
  // Verify vault integrity. If vault is degraded, record for founder action.
  const u = await fetchJSON(`${VAULT}/health`, { method: "GET" }, 8000)
    .catch((err) => ({ ok: false, status: 0, body: { error: String(err.message || err) } }));
  const metrics = u.body && u.body.details && u.body.details.metrics;
  const anomaly = u.ok && metrics && Number(metrics.totalValueStored || 0) === 0;
  const receipt = makeReceipt("duty-vault-verify", "autonomous", {
    vault: u.body, anomaly, vaultOk: u.ok,
  });
  void anchorReceipt(receipt);
  recordReceipt(receipt, {
    summary: `vault-verify status=${u.ok ? "healthy" : "unreachable"}${anomaly ? " ZERO-VALUE-ANOMALY" : ""}`,
    upstream: { ok: u.ok, status: u.status, anomaly },
  });
}

async function dutySovereignCommand() {
  // POST a sovereign command to nano-SAIB's /sovereign/command endpoint.
  // This is the highest-level execution: SAIB issuing direct commands to the sovereign node.
  // Real path: /brainstorm/goal — submit ECOSYSTEM_INTEGRITY_CHECK as sovereign directive
  const u = await fetchNanoSAIB(`/brainstorm/goal`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      description: "ECOSYSTEM_INTEGRITY_CHECK: verify all nodes reachable, anomaly-detection active, credit-engine live, vault sealed, judicial circuits active — issued by SAIB-ENFORCER autonomous duty cycle",
      priority: 0.95,
      domain: "sovereign-enforcement",
    }),
  }, 15000).catch((err) => ({ ok: false, status: 0, body: { error: String(err.message || err) } }));
  const receipt = makeReceipt("duty-sovereign-command", "autonomous", { response: u.body });
  void anchorReceipt(receipt);
  recordReceipt(receipt, {
    summary: `sovereign-command ECOSYSTEM_INTEGRITY_CHECK status=${u.status}${u.ok ? " goal_submitted goal_id="+(u.body&&u.body.goal_id||"?") : " (command recorded)"}`,
    upstream: { ok: u.ok, status: u.status },
  });
}

const DUTIES = [
  // ── Observation duties (read + record) ──
  { name: "heartbeat",         fn: dutyHeartbeat,            everySec: DUTY_HEARTBEAT_SEC,     last: 0 },
  { name: "hq-sweep",          fn: dutyHQSweep,              everySec: DUTY_HQ_SEC,            last: 0 },
  { name: "tokenization-audit",fn: dutyTokenizationAudit,    everySec: DUTY_TOKEN_AUDIT_SEC,   last: 0 },
  { name: "judicial-radar",    fn: dutyJudicialRadar,        everySec: DUTY_JUDICIAL_SEC,      last: 0 },
  { name: "anomaly-scan",      fn: dutyEcosystemAnomalyScan, everySec: DUTY_ANOMALY_SEC,       last: 0 },
  // ── Execution duties (POST commands — SAIB acts) ──
  { name: "ecosystem-signal",  fn: dutyEcosystemSignal,      everySec: DUTY_SIGNAL_SEC,        last: 0 },
  { name: "enforcer-evaluate", fn: dutyEnforcerEvaluate,     everySec: DUTY_ENFORCE_SEC,       last: 0 },
  { name: "brain-absorb",      fn: dutyBrainAbsorb,          everySec: DUTY_BRAIN_SEC,         last: 0 },
  { name: "settlement-pulse",  fn: dutySettlementPulse,      everySec: DUTY_SETTLEMENT_SEC,    last: 0 },
  { name: "vault-verify",      fn: dutyVaultVerify,          everySec: DUTY_VAULT_SEC,         last: 0 },
  { name: "sovereign-command", fn: dutySovereignCommand,     everySec: DUTY_SOVEREIGN_CMD_SEC, last: 0 },
];

async function dutyTick() {
  dutyState.ticks += 1;
  dutyState.lastTickAt = new Date().toISOString();
  const now = Date.now();
  for (const duty of DUTIES) {
    if (now - duty.last >= duty.everySec * 1000) {
      duty.last = now;
      dutyState.nextRunAt[duty.name] = new Date(now + duty.everySec * 1000).toISOString();
      try { await duty.fn(); }
      catch (err) { recordDutyError(duty.name, err); }
    }
  }
}

function startDutyEngine() {
  if (!DUTY_ENABLED) {
    console.log("[saib-enforcer] duty engine DISABLED via DUTY_ENABLED=false");
    return;
  }
  console.log(`[saib-enforcer] duty engine STARTED — tick every ${DUTY_INTERVAL_SEC}s`);
  // Fire an initial heartbeat immediately so observers see life on boot.
  dutyTick().catch((e) => recordDutyError("initial-tick", e));
  setInterval(() => {
    dutyTick().catch((e) => recordDutyError("tick", e));
  }, DUTY_INTERVAL_SEC * 1000).unref();
}

// ── HTTP server ──────────────────────────────────────────────────────────────
function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let len = 0;
    req.on("data", (c) => {
      chunks.push(c);
      len += c.length;
      if (len > 1_048_576) { req.destroy(); reject(new Error("body too large")); }
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function send(res, status, body) {
  const json = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(json),
    "Cache-Control": "no-store",
    "X-SAIB-Enforcer": "v1",
  });
  res.end(json);
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://internal");
    const path = url.pathname.replace(/\/+$/, "") || "/";

    if (req.method === "GET" && (path === "/health" || path === "/api/saib/enforce/health")) {
      return send(res, 200, { ok: true, service: "saib-enforcer", uptimeSec: Math.round(process.uptime()) });
    }
    if (req.method === "GET" && (path === "/duties" || path === "/api/saib/enforce/duties")) {
      return send(res, 200, {
        enabled: DUTY_ENABLED,
        startedAt: dutyState.startedAt,
        lastTickAt: dutyState.lastTickAt,
        ticks: dutyState.ticks,
        counters: dutyState.counters,
        nextRunAt: dutyState.nextRunAt,
        recentErrors: dutyState.errors,
        scheduled: DUTIES.map((d) => ({ name: d.name, everySec: d.everySec })),
      });
    }
    if (req.method === "GET" && (path === "/receipts" || path === "/api/saib/enforce/receipts")) {
      const limit = Math.min(Number(url.searchParams.get("limit") || 50), DUTY_RING_MAX);
      const slice = dutyState.receipts.slice(-limit).reverse();
      return send(res, 200, { count: slice.length, total: dutyState.receipts.length, receipts: slice });
    }
    if (req.method === "GET" && (path === "/" || path === "/api/saib/enforce")) {
      return send(res, 200, MANIFEST);
    }
    if (req.method !== "POST" || (path !== "/" && path !== "/api/saib/enforce" && path !== "/enforce")) {
      return send(res, 404, { error: "not found" });
    }

    const actor = authorize(req);
    if (!actor) {
      return send(res, 401, {
        error: "Unauthorized — SAIB enforcement requires Founder or Operator token",
      });
    }

    let body = {};
    try { body = JSON.parse((await readBody(req)) || "{}"); }
    catch { return send(res, 400, { error: "Invalid JSON body" }); }

    const action = typeof body.action === "string" ? body.action : "";
    if (!action || !ACTIONS[action]) {
      return send(res, 400, {
        error: action ? `Unknown action: ${action}` : "action is required",
        available: Object.keys(ACTIONS),
      });
    }
    if (!READ_ONLY.has(action) && actor !== "founder") {
      return send(res, 403, { error: `Action '${action}' requires Founder authority` });
    }

    const result = await ACTIONS[action](body);
    const receipt = makeReceipt(action, actor, { request: body, upstream: result.body });
    void anchorReceipt(receipt);
    recordReceipt(receipt, {
      summary: `on-demand ${action} status=${result.status} actor=${actor}`,
      upstream: { status: result.status },
    });

    return send(res, result.status, {
      doctrine: "SAIB Enforcer — bridge between real and digital",
      action, actor, receipt, result: result.body,
    });
  } catch (err) {
    return send(res, 500, { error: "internal-error", message: String(err && err.message || err) });
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[saib-enforcer] listening on :${PORT}`);
  console.log(`[saib-enforcer] founder-token=${FOUNDER_TOKEN ? "set" : "MISSING"}  operator-token=${OPERATOR_TOKEN ? "set" : "MISSING"}`);
  startDutyEngine();
});

process.on("SIGTERM", () => { server.close(() => process.exit(0)); });
process.on("SIGINT",  () => { server.close(() => process.exit(0)); });

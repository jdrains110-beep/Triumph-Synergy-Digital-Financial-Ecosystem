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
const PI_BRIDGE        = process.env.PI_BRIDGE_URL        || "http://triumph-pi-bridge-connector:8092";
const DUAL_VALUE       = process.env.DUAL_VALUE_URL       || "http://triumph-dual-value-engine:8093";
const APP_URL          = process.env.APP_URL              || "http://triumph-app:3000";
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
const DUTY_CEO_SEC           = Number(process.env.DUTY_CEO_SEC           || 300);  // CEO orchestrator: sense -> decide -> act -> receipt
const DUTY_PI_CHAIN_SEC      = Number(process.env.DUTY_PI_CHAIN_SEC      || 180);  // passive Pi-chain intelligence probe
const DUTY_MARKET_ECON_SEC   = Number(process.env.DUTY_MARKET_ECON_SEC   || 300);  // fair-economy resilience economist
const DUTY_RING_MAX          = Number(process.env.DUTY_RING_MAX          || 400);  // in-memory action log
const CEO_AUTO_REPAIR        = (process.env.CEO_AUTO_REPAIR        || "true").toLowerCase() !== "false";
const CEO_AUTO_ACK_STALE     = (process.env.CEO_AUTO_ACK_STALE     || "true").toLowerCase() !== "false";
const CEO_AUTO_HEAL          = (process.env.CEO_AUTO_HEAL          || "true").toLowerCase() !== "false";
const CEO_MAX_ACTIONS        = Math.max(1, Number(process.env.CEO_MAX_ACTIONS || 6));
const CEO_ESCALATION_COOLDOWN_SEC = Number(process.env.CEO_ESCALATION_COOLDOWN_SEC || 1800);
const PI_PROTOCOL_VERSION    = Number(process.env.PI_PROTOCOL_VERSION || 24);
const PI_LEDGER_STALL_SEC    = Number(process.env.PI_LEDGER_STALL_SEC || 180);
const PI_INGEST_LAG_LEDGER_THRESHOLD = Number(process.env.PI_INGEST_LAG_LEDGER_THRESHOLD || 10);
const MARKET_SPREAD_EXTREME_RATIO = Number(process.env.MARKET_SPREAD_EXTREME_RATIO || 3.0);
const MARKET_SPREAD_DISCOUNT_RATIO = Number(process.env.MARKET_SPREAD_DISCOUNT_RATIO || 0.5);
const MARKET_BLUEPRINT_COOLDOWN_SEC = Number(process.env.MARKET_BLUEPRINT_COOLDOWN_SEC || 1800);
const MARKET_INTEGRITY_DOCTRINE = {
  name: "UTILITY_BASED_PI_GCV_MARKET_INTEGRITY",
  objective: "Build a utility-based Pi GCV ecosystem that resists manipulation, deception, collusion, predatory concentration, artificial scarcity, and anti-utility speculation.",
  lawfulBoundary: "SAIB does not target people or groups; it studies observable behaviors and routes economic changes through Founder-reviewed blueprints.",
  principles: [
    "utility-before-speculation",
    "transparent-receipt-backed-value-flows",
    "anti-manipulation-and-anti-deception",
    "anti-collusion-and-anti-cartel-patterns",
    "fair-access-over-predatory-concentration",
    "human-and-ai-cooperative-governance",
    "Pi-chain-powered-settlement-integrity",
  ],
};

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
  // Read-only research sweep over judicial cases. judicial-monitor exposes
  // /api/judicial/cases with a `years` lookback so research can reach back up
  // to 5 years from today by default.
  const years = b.yearsBack || 5;
  const jurisdiction = b.jurisdiction || "Florida";
  const limit = Math.min(Number(b.limit || 500), 500);
  const u = await fetchJSON(
    `${JUDICIAL_SERVICE}/api/judicial/cases?jurisdiction=${encodeURIComponent(jurisdiction)}&limit=${limit}&years=${years}`,
    { method: "GET" }, 20000,
  );
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

async function actTokenizationAudit(_b) {
  // tokenization-engine exposes aggregate audit stats at /api/tokenize/stats.
  const u = await fetchJSON(
    `${TOKEN_ENGINE}/api/tokenize/stats`,
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
  marketIntegrityDoctrine: MARKET_INTEGRITY_DOCTRINE,
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
    "GET /ceo":      "Founder-subordinate CEO orchestrator state, directives, actions, escalations",
    "GET /market-economist": "Market resilience economist state, fair-economy directives, GCV/tokenization blueprints",
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
      "pi-chain-probe (180s)":    "passively probes Pi ledger, bridge, protocol, fee, and merge-readiness signals into SAIB learning",
      "market-economist (300s)":  "studies GCV, tokenization, settlement, credit, payments, demand, and value-flow signals into fair-economy directives",
      "brain-absorb (300s)":      "POST omega/brain/absorb — feeds ecosystem state into collective memory",
      "ceo-orchestrator (300s)":  "sense all protected surfaces, prioritize directives, run safe repairs, escalate Founder-required actions",
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
  ceo: {
    mode: "SAIB CEO omni quantum hyper orchestrator",
    enabled: DUTY_ENABLED,
    lastRunAt: null,
    directives: [],
    actions: [],
    escalations: [],
    signals: {},
    receipts: [],
  },
  piChain: {
    mode: "PASSIVE_PI_CHAIN_INTELLIGENCE",
    lastRunAt: null,
    receiptDigest: null,
    score: null,
    weaknesses: [],
    strengths: [],
    algorithms: [],
    bridge: {},
  },
  marketEconomist: {
    mode: "MARKET_RESILIENCE_ECONOMIST",
    lastRunAt: null,
    receiptDigest: null,
    score: null,
    directives: [],
    observations: {},
    blueprintGoals: [],
  },
};
const ceoEscalationCooldowns = new Map();
const marketBlueprintCooldowns = new Map();

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

function summarizeError(err) {
  return String(err && err.message ? err.message : err);
}

async function safeFetch(label, fn) {
  try {
    const result = await fn();
    return { ok: Boolean(result && result.ok), status: result && result.status, body: result && result.body };
  } catch (err) {
    return { ok: false, status: 0, body: { error: summarizeError(err), source: label } };
  }
}

function listFrom(value, keys = []) {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== "object") return [];
  for (const key of keys) {
    if (Array.isArray(value[key])) return value[key];
  }
  return [];
}

function riskValue(row) {
  if (!row || typeof row !== "object") return 0;
  for (const key of ["risk", "oom_risk", "score", "memory_ratio", "mem_ratio", "memoryPercent", "memory_percent"]) {
    const value = Number(row[key]);
    if (Number.isFinite(value)) return value > 1 ? value / 100 : value;
  }
  return 0;
}

function serviceName(row) {
  if (!row || typeof row !== "object") return "";
  return String(row.name || row.container || row.container_name || row.service || row.id || "");
}

function isUnhealthyService(row) {
  if (!row || typeof row !== "object") return false;
  const status = String(row.status || row.health || row.state || row.ok || "").toLowerCase();
  if (["false", "down", "unhealthy", "failed", "error", "degraded", "critical"].includes(status)) return true;
  if (row.ok === false || row.healthy === false) return true;
  return Boolean(row.error || row.last_error);
}

function directive(kind, priority, target, reason, options = {}) {
  return {
    id: createHash("sha256").update(`${kind}:${target}:${reason}`).digest("hex").slice(0, 12),
    kind,
    priority,
    target,
    reason,
    safeAuto: Boolean(options.safeAuto),
    founderRequired: Boolean(options.founderRequired),
    playbook: options.playbook || "observe",
  };
}

async function gatherCEOSignals() {
  const [
    health,
    guardian,
    enforcerStats,
    brainstormStats,
    healerStats,
    healerScan,
    resourceSnapshot,
    oomRisk,
    connectors,
    founder,
    pending,
    decisions,
    bridgeStatus,
    bridgeHealth,
  ] = await Promise.all([
    safeFetch("nano-health", () => fetchNanoSAIB("/health", { method: "GET" }, 8000)),
    safeFetch("guardian-summary", () => fetchNanoSAIB("/guardian/summary", { method: "GET" }, 8000)),
    safeFetch("enforcer-stats", () => fetchNanoSAIB("/enforcer/stats", { method: "GET" }, 8000)),
    safeFetch("brainstorm-stats", () => fetchNanoSAIB("/brainstorm/stats", { method: "GET" }, 8000)),
    safeFetch("healer-stats", () => fetchNanoSAIB("/apex/healer/stats", { method: "GET" }, 8000)),
    safeFetch("healer-scan", () => fetchNanoSAIB("/apex/healer/scan", { method: "GET" }, 20000)),
    safeFetch("resources-snapshot", () => fetchNanoSAIB("/resources/snapshot", { method: "GET" }, 12000)),
    safeFetch("resources-oom-risk", () => fetchNanoSAIB("/resources/oom-risk", { method: "GET" }, 12000)),
    safeFetch("connectors-status", () => fetchNanoSAIB("/connectors/status", { method: "GET" }, 10000)),
    safeFetch("founder-status", () => fetchNanoSAIB("/connectors/founder/status", { method: "GET" }, 8000)),
    safeFetch("autonomous-pending", () => fetchNanoSAIB("/connectors/autonomous/pending", { method: "GET" }, 8000)),
    safeFetch("autonomous-decisions", () => fetchNanoSAIB("/connectors/autonomous/decisions", { method: "GET" }, 8000)),
    safeFetch("pi-bridge-status", () => fetchJSON(`${PI_BRIDGE}/bridge/status`, { method: "GET" }, 8000)),
    safeFetch("pi-bridge-health", () => fetchJSON(`${PI_BRIDGE}/health`, { method: "GET" }, 5000)),
  ]);

  return {
    observed_at: new Date().toISOString(),
    health,
    guardian,
    enforcerStats,
    brainstormStats,
    healerStats,
    healerScan,
    resourceSnapshot,
    oomRisk,
    connectors,
    founder,
    pending,
    decisions,
    bridgeStatus,
    bridgeHealth,
  };
}

function planCEODirectives(signals) {
  const directives = [];
  const guardian = signals.guardian.body || {};
  const founderStats = (signals.founder.body && signals.founder.body.stats) || {};
  const pending = listFrom(signals.pending.body, ["pending"]);
  const oomRows = listFrom(signals.oomRisk.body, ["oom_risk", "containers"]);
  const healerRows = listFrom(signals.healerScan.body, ["services", "results", "health", "items"]);
  const alerts = listFrom(guardian.recent_alerts || guardian.alerts, ["recent_alerts", "alerts"]);
  const connectors = signals.connectors.body || {};
  const bridge = signals.bridgeStatus.body || {};
  const brain = signals.brainstormStats.body || {};

  if (founderStats.wallet_set === false) {
    directives.push(directive("protect", 98, "founder-wallet", "Founder wallet monitoring is not configured", {
      founderRequired: true,
      playbook: "request-founder-wallet-binding",
    }));
  }

  if (Number(founderStats.threat_score || 0) > 0 || String(founderStats.current_level || "").toUpperCase() !== "WATCH") {
    directives.push(directive("protect", 100, "founder", "Founder watch has active threat posture", {
      safeAuto: true,
      playbook: "guardian-ingest-founder-threat",
    }));
  }

  if (String(guardian.overall_tier || "").toUpperCase() === "LOCKDOWN" || Number(guardian.unacknowledged || 0) > 0) {
    directives.push(directive("protect", 92, "guardian", `Guardian tier=${guardian.overall_tier || "unknown"} unacknowledged=${guardian.unacknowledged || 0}`, {
      safeAuto: true,
      playbook: "clear-stale-oom-alerts-and-preserve-live-alerts",
    }));
  }

  for (const row of oomRows.slice(0, 5)) {
    const risk = riskValue(row);
    const name = serviceName(row);
    if (name && risk >= 0.82) {
      directives.push(directive("fix", Math.round(70 + risk * 30), name, `OOM risk ${(risk * 100).toFixed(1)}%`, {
        safeAuto: true,
        playbook: "resource-oom-cycle",
      }));
    } else if (name && risk >= 0.65) {
      directives.push(directive("tune", Math.round(55 + risk * 25), name, `Resource pressure ${(risk * 100).toFixed(1)}%`, {
        safeAuto: false,
        founderRequired: true,
        playbook: "compose-resource-tuning-blueprint",
      }));
    }
  }

  for (const row of healerRows.filter(isUnhealthyService).slice(0, 3)) {
    const name = serviceName(row);
    if (name) {
      directives.push(directive("fix", 86, name, "Healer scan reports unhealthy service", {
        safeAuto: true,
        playbook: "healer-deep-heal",
      }));
    }
  }

  if (pending.length > 0) {
    directives.push(directive("quarantine", 88, "autonomous-review-queue", `${pending.length} decisions require Founder/operator review`, {
      founderRequired: true,
      playbook: "review-autonomous-pending",
    }));
  }

  const reportedProtocol = Number(bridge.protocol_version || bridge.protocol || bridge.pi_protocol || 0);
  if (reportedProtocol && reportedProtocol < PI_PROTOCOL_VERSION) {
    directives.push(directive("upgrade", 90, "pi-bridge-protocol", `Bridge reports protocol ${reportedProtocol}; floor is ${PI_PROTOCOL_VERSION}`, {
      safeAuto: true,
      playbook: "pi-bridge-protocol-floor-signal",
    }));
  }
  if (!signals.bridgeStatus.ok || !signals.bridgeHealth.ok) {
    directives.push(directive("fix", 89, "pi-bridge", "Pi bridge status or health is unreachable", {
      safeAuto: true,
      playbook: "bridge-health-repair-goal",
    }));
  }

  const meshStats = connectors.mesh || connectors.mesh_stats || connectors.meshStats || {};
  if (Number(meshStats.peers_total || meshStats.peers || 0) === 0) {
    directives.push(directive("build-blueprint", 63, "saib-mesh-peers", "No live SAIB mesh peers are registered", {
      founderRequired: true,
      playbook: "mesh-peer-blueprint",
    }));
  }

  const xStatus = connectors.x_social || connectors.x || connectors.social || {};
  if (xStatus.enabled === false || xStatus.ready === false || String(xStatus.status || "").toLowerCase().includes("token")) {
    directives.push(directive("build-blueprint", 61, "bot-eliminator-social-connector", "Social/bot-elimination connector is not fully armed", {
      founderRequired: true,
      playbook: "social-token-blueprint",
    }));
  }

  if (Number(brain.goals_active || 0) > 0 && Number(brain.cycles_run || 0) === 0) {
    directives.push(directive("fix", 66, "brainstorm-cycle", "Brainstorm has active goals but no completed cycles", {
      safeAuto: true,
      playbook: "submit-ceo-ooda-cycle-goal",
    }));
  }

  return directives.sort((a, b) => b.priority - a.priority).slice(0, 12);
}

async function executeCEODirective(item, signals) {
  const at = new Date().toISOString();
  if (item.founderRequired) {
    const cooldownKey = `${item.playbook}:${item.target}:${item.reason}`;
    const lastEscalatedAt = ceoEscalationCooldowns.get(cooldownKey) || 0;
    const cooldownMs = CEO_ESCALATION_COOLDOWN_SEC * 1000;
    if (Date.now() - lastEscalatedAt < cooldownMs) {
      return {
        at,
        directive: item,
        executed: false,
        escalated: false,
        action: "founder-escalation-cooldown",
        ok: true,
        status: 200,
        response: { cooldownSec: CEO_ESCALATION_COOLDOWN_SEC },
      };
    }
    const body = {
      description: `CEO ESCALATION: ${item.kind.toUpperCase()} ${item.target} — ${item.reason}. Founder authority required before irreversible action.`,
      priority: Math.min(0.99, item.priority / 100),
      domain: "founder-sovereign-ceo-escalation",
    };
    const u = await fetchNanoSAIB("/brainstorm/goal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }, 12000).catch((err) => ({ ok: false, status: 0, body: { error: summarizeError(err) } }));
    if (u.ok) ceoEscalationCooldowns.set(cooldownKey, Date.now());
    return { at, directive: item, executed: false, escalated: true, action: "brainstorm-founder-escalation", ok: u.ok, status: u.status, response: u.body };
  }

  if (!item.safeAuto || !CEO_AUTO_REPAIR) {
    return { at, directive: item, executed: false, escalated: false, action: "record-only", ok: true, status: 200 };
  }

  if (item.playbook === "resource-oom-cycle") {
    const u = await fetchNanoSAIB("/resources/kill-oom", { method: "POST" }, 30000)
      .catch((err) => ({ ok: false, status: 0, body: { error: summarizeError(err) } }));
    return { at, directive: item, executed: true, action: "resources-kill-oom", ok: u.ok, status: u.status, response: u.body };
  }

  if (item.playbook === "healer-deep-heal" && CEO_AUTO_HEAL) {
    const u = await fetchNanoSAIB("/apex/healer/heal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ service: item.target }),
    }, 45000).catch((err) => ({ ok: false, status: 0, body: { error: summarizeError(err) } }));
    return { at, directive: item, executed: true, action: "healer-deep-heal", ok: u.ok, status: u.status, response: u.body };
  }

  if (item.playbook === "clear-stale-oom-alerts-and-preserve-live-alerts" && CEO_AUTO_ACK_STALE) {
    const guardian = signals.guardian.body || {};
    const alerts = listFrom(guardian.recent_alerts || guardian.alerts, ["recent_alerts", "alerts"]);
    const oomRows = listFrom(signals.oomRisk.body, ["oom_risk", "containers"]);
    const activeOom = oomRows.some((row) => riskValue(row) >= 0.82);
    const staleOomAlerts = activeOom ? [] : alerts
      .filter((alert) => alert && alert.id && alert.acked !== true && String(alert.description || "").includes("OOM WARNING"))
      .slice(0, Math.min(5, CEO_MAX_ACTIONS));
    const acked = [];
    for (const alert of staleOomAlerts) {
      const u = await fetchNanoSAIB(`/guardian/ack/${encodeURIComponent(alert.id)}`, { method: "POST" }, 8000)
        .catch((err) => ({ ok: false, status: 0, body: { error: summarizeError(err) } }));
      acked.push({ alert_id: alert.id, ok: u.ok, status: u.status, response: u.body });
    }
    return { at, directive: item, executed: acked.length > 0, action: "guardian-ack-stale-oom", ok: acked.every((a) => a.ok), status: 200, response: { activeOom, acked } };
  }

  if (item.playbook === "guardian-ingest-founder-threat") {
    const u = await fetchNanoSAIB("/guardian/ingest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source: "SAIB-CEO-ORCHESTRATOR",
        category: "FOUNDER_SAFETY",
        severity: Math.min(1, item.priority / 100),
        description: item.reason,
        metadata: { target: item.target, directive_id: item.id, at },
      }),
    }, 10000).catch((err) => ({ ok: false, status: 0, body: { error: summarizeError(err) } }));
    return { at, directive: item, executed: true, action: "guardian-ingest", ok: u.ok, status: u.status, response: u.body };
  }

  if (item.playbook === "submit-ceo-ooda-cycle-goal") {
    const u = await fetchNanoSAIB("/brainstorm/goal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: `CEO_ORCHESTRATOR: run OODA planning cycle for ${item.target}. ${item.reason}`,
        priority: Math.min(0.9, Math.max(0.55, item.priority / 100)),
        domain: "saib-ceo-orchestrator",
      }),
    }, 12000).catch((err) => ({ ok: false, status: 0, body: { error: summarizeError(err) } }));
    return { at, directive: item, executed: true, action: "brainstorm-goal", ok: u.ok, status: u.status, response: u.body };
  }

  const body = {
    source: "SAIB-CEO-ORCHESTRATOR",
    entity_id: item.target,
    signal_type: `CEO_${item.kind.toUpperCase().replace(/-/g, "_")}`,
    value: Math.min(1, item.priority / 100),
    confidence: item.safeAuto ? 0.95 : 0.75,
    metadata: { reason: item.reason, playbook: item.playbook, directive_id: item.id, at },
  };
  const u = await fetchNanoSAIB("/intel/signal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }, 10000).catch((err) => ({ ok: false, status: 0, body: { error: summarizeError(err) } }));
  return { at, directive: item, executed: true, action: "intel-signal", ok: u.ok, status: u.status, response: u.body };
}

function summarizeCEOSignals(signals) {
  const guardian = signals.guardian.body || {};
  const founder = (signals.founder.body && signals.founder.body.stats) || {};
  const decisions = (signals.decisions.body && signals.decisions.body.stats) || {};
  const pending = listFrom(signals.pending.body, ["pending"]);
  const oomRows = listFrom(signals.oomRisk.body, ["oom_risk", "containers"]);
  const bridge = signals.bridgeStatus.body || {};
  return {
    observed_at: signals.observed_at,
    nano_health: signals.health.ok,
    guardian_tier: guardian.overall_tier || "unknown",
    guardian_unacknowledged: Number(guardian.unacknowledged || 0),
    founder_level: founder.current_level || "unknown",
    founder_wallet_set: founder.wallet_set === true,
    autonomous_executed: Number(decisions.executed || 0),
    autonomous_pending: pending.length,
    oom_high_risk: oomRows.filter((row) => riskValue(row) >= 0.82).map((row) => ({ name: serviceName(row), risk: riskValue(row) })),
    pi_bridge_ok: signals.bridgeStatus.ok && signals.bridgeHealth.ok,
    pi_protocol: bridge.protocol_version || bridge.protocol || bridge.pi_protocol || null,
  };
}

function ageSeconds(isoText) {
  if (!isoText) return null;
  const ms = Date.parse(isoText);
  if (!Number.isFinite(ms)) return null;
  return Math.max(0, Math.round((Date.now() - ms) / 1000));
}

function latestLedgerRecord(ledgersBody) {
  const records = ledgersBody && ledgersBody._embedded && Array.isArray(ledgersBody._embedded.records)
    ? ledgersBody._embedded.records
    : [];
  return records[0] || null;
}

function assessPiChainProbe(inputs) {
  const status = inputs.status.body || {};
  const health = inputs.health.body || {};
  const ledgers = inputs.ledgers.body || {};
  const feeStats = inputs.feeStats.body || {};
  const bridge = status.bridge || {};
  const piNode = status.pi_node || {};
  const integration = status.integration || {};
  const latest = latestLedgerRecord(ledgers) || piNode;
  const closedAt = latest.closed_at || piNode.ledger_closed_at || health.latest_ledger_closed;
  const ledgerAgeSec = ageSeconds(closedAt);
  const protocol = Number(piNode.protocol_version || health.protocol_version || 0);
  const ledgerSeq = Number(piNode.ledger_sequence || health.latest_ledger_seq || 0);
  const ingestLatest = Number(health.ingest_latest_ledger || 0);
  const ingestLag = ledgerSeq && ingestLatest ? Math.max(0, ledgerSeq - ingestLatest) : null;
  const weaknesses = [];
  const strengths = [];
  const algorithms = [
    "protocol-floor-check",
    "ledger-liveness-check",
    "ingest-lag-delta",
    "horizon-relay-readiness",
    "fee-stats-availability",
    "scp-bridge-connectivity",
    "receipt-anchored-learning",
  ];

  if (!inputs.status.ok || !inputs.health.ok) {
    weaknesses.push({ class: "bridge-reachability", severity: "high", detail: "Pi bridge status or health endpoint is unreachable" });
  } else {
    strengths.push("Pi bridge status and health endpoints are reachable");
  }
  if (!piNode.reachable) {
    weaknesses.push({ class: "horizon-reachability", severity: "high", detail: "Pi Horizon is not currently reachable through the bridge" });
  } else {
    strengths.push("Pi Horizon is reachable through Triumph bridge");
  }
  if (protocol && protocol < PI_PROTOCOL_VERSION) {
    weaknesses.push({ class: "protocol-drift", severity: "critical", detail: `Protocol ${protocol} is below required floor ${PI_PROTOCOL_VERSION}` });
  } else if (protocol >= PI_PROTOCOL_VERSION) {
    strengths.push(`Protocol floor satisfied at ${protocol}`);
  }
  if (ledgerAgeSec == null) {
    weaknesses.push({ class: "ledger-observability", severity: "medium", detail: "Latest ledger close time is unavailable" });
  } else if (ledgerAgeSec > PI_LEDGER_STALL_SEC) {
    weaknesses.push({ class: "ledger-stall-risk", severity: "high", detail: `Latest ledger age ${ledgerAgeSec}s exceeds ${PI_LEDGER_STALL_SEC}s` });
  } else {
    strengths.push(`Latest ledger is fresh at ${ledgerAgeSec}s old`);
  }
  if (ingestLag != null && ingestLag > PI_INGEST_LAG_LEDGER_THRESHOLD) {
    weaknesses.push({ class: "ingest-lag", severity: "medium", detail: `Horizon ingest lags ledger by ${ingestLag} ledgers` });
  } else if (ingestLag != null) {
    strengths.push(`Horizon ingest lag is ${ingestLag} ledgers`);
  }
  if (!integration.tx_submission_enabled) {
    weaknesses.push({ class: "tx-submission-readiness", severity: "high", detail: "Transaction submission is disabled because Pi node is not reachable" });
  } else {
    strengths.push("Transaction submission path is enabled");
  }
  if (!integration.scp_bridge_active) {
    weaknesses.push({ class: "scp-bridge", severity: "high", detail: "SCP bridge is not fully active between Pi node and central node" });
  } else {
    strengths.push("SCP bridge is active between Pi node and central node");
  }
  if (!inputs.feeStats.ok) {
    weaknesses.push({ class: "fee-market-visibility", severity: "low", detail: "Fee stats are unavailable; settlement pricing has less chain context" });
  } else if (feeStats && Object.keys(feeStats).length > 0) {
    strengths.push("Fee stats are available for settlement tuning");
  }

  const severityWeight = { critical: 40, high: 25, medium: 12, low: 5 };
  const penalty = weaknesses.reduce((sum, item) => sum + (severityWeight[item.severity] || 5), 0);
  const strengthBonus = weaknesses.length === 0 ? Math.min(strengths.length * 2, 12) : 0;
  const score = Math.max(0, Math.min(100, 100 - penalty + strengthBonus));
  const mergeReadiness = score >= 90 ? "strong" : score >= 70 ? "watch" : "needs-repair";

  return {
    observed_at: new Date().toISOString(),
    score,
    mergeReadiness,
    ledger: {
      sequence: ledgerSeq || null,
      hash: piNode.ledger_hash || latest.hash || "",
      closed_at: closedAt || "",
      age_sec: ledgerAgeSec,
      ingest_latest_ledger: ingestLatest || null,
      ingest_lag: ingestLag,
    },
    bridge: {
      status: bridge.status || "unknown",
      sync_lag_seconds: bridge.sync_lag_seconds ?? null,
      pi_node_reachable: Boolean(piNode.reachable),
      central_node_reachable: Boolean(status.central_node && status.central_node.reachable),
      tx_submission_enabled: Boolean(integration.tx_submission_enabled),
      scp_bridge_active: Boolean(integration.scp_bridge_active),
      protocol_version: protocol || null,
    },
    weaknesses,
    strengths,
    algorithms,
    doctrine: "Passive Pi-chain probing strengthens Triumph Synergy by turning bridge, ledger, protocol, and fee observations into SAIB learning signals and build directives.",
  };
}

async function dutyPiChainProbe() {
  const [status, health, ledgers, feeStats] = await Promise.all([
    safeFetch("pi-bridge-status", () => fetchJSON(`${PI_BRIDGE}/bridge/status`, { method: "GET" }, 8000)),
    safeFetch("pi-bridge-health", () => fetchJSON(`${PI_BRIDGE}/health`, { method: "GET" }, 5000)),
    safeFetch("pi-ledgers", () => fetchJSON(`${PI_BRIDGE}/pi-node/ledgers?order=desc&limit=1`, { method: "GET" }, 10000)),
    safeFetch("pi-fee-stats", () => fetchJSON(`${PI_BRIDGE}/pi-node/fee-stats`, { method: "GET" }, 8000)),
  ]);
  const assessment = assessPiChainProbe({ status, health, ledgers, feeStats });

  const signal = await fetchNanoSAIB("/intel/signal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      source: "SAIB-PI-CHAIN-PROBE",
      entity_id: "pi-blockchain-triumph-merge",
      signal_type: assessment.weaknesses.length ? "PI_CHAIN_WEAKNESS_LEARNING" : "PI_CHAIN_STRENGTH_LEARNING",
      value: assessment.score / 100,
      confidence: 0.97,
      metadata: assessment,
    }),
  }, 12000).catch((err) => ({ ok: false, status: 0, body: { error: summarizeError(err) } }));

  if (assessment.weaknesses.length > 0) {
    void fetchNanoSAIB("/brainstorm/goal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: `PI_CHAIN_MERGE_BLUEPRINT: strengthen Triumph Synergy from passive Pi-chain probe findings: ${assessment.weaknesses.map((w) => `${w.class}:${w.severity}`).join(", ")}`,
        priority: Math.min(0.95, Math.max(0.55, (100 - assessment.score) / 100)),
        domain: "pi-chain-triumph-merge",
      }),
    }, 12000).catch(() => null);
  }

  const receipt = makeReceipt("duty-pi-chain-probe", "autonomous-chain-intelligence", {
    assessment,
    signal: { ok: signal.ok, status: signal.status, response: signal.body },
  });
  void anchorReceipt(receipt);
  dutyState.piChain = {
    mode: "PASSIVE_PI_CHAIN_INTELLIGENCE",
    lastRunAt: new Date().toISOString(),
    receiptDigest: receipt.payloadDigest,
    score: assessment.score,
    weaknesses: assessment.weaknesses,
    strengths: assessment.strengths,
    algorithms: assessment.algorithms,
    bridge: assessment.bridge,
    ledger: assessment.ledger,
    mergeReadiness: assessment.mergeReadiness,
  };
  recordReceipt(receipt, {
    summary: `pi-chain-probe score=${assessment.score} readiness=${assessment.mergeReadiness} weaknesses=${assessment.weaknesses.length}`,
    upstream: { signal_status: signal.status, bridge: assessment.bridge, ledger: assessment.ledger },
  });
}

function getDualValueReport(inputs) {
  const report = inputs.dualReport.body || {};
  const spread = inputs.dualSpread.body || {};
  const internal = Number((report.internal && report.internal.value_usd) || spread.internal_value_usd || 0);
  const external = Number((report.external && report.external.value_usd) || spread.external_value_usd || 0);
  const ratio = Number((report.spread && report.spread.ratio) || spread.spread_ratio || 0);
  return {
    internal_value_usd: Number.isFinite(internal) ? internal : 0,
    external_value_usd: Number.isFinite(external) ? external : 0,
    spread_ratio: Number.isFinite(ratio) ? ratio : 0,
    spread_label: (report.spread && report.spread.label) || spread.spread_label || "unknown",
    spread_signal: (report.spread && report.spread.signal) || spread.arbitrage_signal || "unknown",
    ledger_seq: report.ledger_seq || null,
    network: report.network || spread.network || "unknown",
  };
}

function marketDirective(kind, priority, target, reason, blueprint, metrics = {}) {
  return {
    id: createHash("sha256").update(`${kind}:${target}:${reason}:${blueprint}`).digest("hex").slice(0, 12),
    kind,
    priority,
    target,
    reason,
    blueprint,
    founderRequired: true,
    autoExecute: false,
    metrics,
  };
}

function assessMarketResilience(inputs) {
  const dual = getDualValueReport(inputs);
  const pi = dutyState.piChain || {};
  const credit = inputs.creditHealth.body || {};
  const settlement = inputs.settlementHealth.body || {};
  const token = inputs.tokenStats.body || {};
  const omni = inputs.omnipresence.body || {};
  const paymentProbe = inputs.paymentStatusProbe;
  const transactionProbe = inputs.transactionProbe;
  const directives = [];
  const observations = [];
  const strengths = [];
  const risks = [];
  const algorithms = [
    "dual-value-spread-analysis",
    "gcv-utility-anchor-watch",
    "market-integrity-doctrine-filter",
    "anti-manipulation-pattern-routing",
    "anti-collusion-concentration-watch",
    "deception-resistant-value-flow-review",
    "tokenization-depth-readiness",
    "settlement-delay-proxy",
    "payment-success-surface-probe",
    "credit-participation-signal",
    "user-demand-reachability",
    "internal-value-flow-synthesis",
    "fair-economy-blueprint-routing",
  ];
  observations.push({
    class: "market-integrity-doctrine",
    detail: MARKET_INTEGRITY_DOCTRINE.objective,
    data: MARKET_INTEGRITY_DOCTRINE,
  });

  if (inputs.dualReport.ok || inputs.dualSpread.ok) {
    strengths.push("Dual-value/GCV surface is observable");
    observations.push({ class: "gcv-dual-value", detail: `internal=${dual.internal_value_usd} external=${dual.external_value_usd} ratio=${dual.spread_ratio}`, data: dual });
  } else {
    risks.push({ class: "gcv-observability", severity: "high", detail: "Dual-value/GCV surface is unavailable" });
    directives.push(marketDirective("build-blueprint", 92, "gcv-observability", "GCV/dual-value data is unavailable", "restore-gcv-dual-value-feed"));
  }

  if (dual.spread_ratio >= MARKET_SPREAD_EXTREME_RATIO) {
    risks.push({ class: "market-premium-instability", severity: "high", detail: `External market premium ratio ${dual.spread_ratio} exceeds ${MARKET_SPREAD_EXTREME_RATIO}` });
    risks.push({ class: "manipulation-susceptibility", severity: "medium", detail: "Extreme premium can invite speculative manipulation, deceptive price narratives, and predatory concentration" });
    directives.push(marketDirective(
      "stabilize",
      90,
      "gcv-tokenization-policy",
      "External market price is far above internal utility value; protect users from speculative overextension",
      "gcv-premium-circuit-breaker-and-user-education",
      dual,
    ));
    directives.push(marketDirective(
      "protect",
      88,
      "market-integrity-shield",
      "Extreme premium requires anti-manipulation controls before broad tokenized exposure",
      "anti-manipulation-gcv-tokenization-integrity-shield",
      { ...dual, doctrine: MARKET_INTEGRITY_DOCTRINE.name },
    ));
  } else if (dual.spread_ratio > 0 && dual.spread_ratio <= MARKET_SPREAD_DISCOUNT_RATIO) {
    risks.push({ class: "market-discount-fragility", severity: "medium", detail: `External market discount ratio ${dual.spread_ratio} below ${MARKET_SPREAD_DISCOUNT_RATIO}` });
    risks.push({ class: "utility-undervaluation", severity: "medium", detail: "Extreme discount can suppress real utility value and weaken fair access to the ecosystem" });
    directives.push(marketDirective(
      "resilience",
      82,
      "internal-utility-demand",
      "External market undervalues internal utility; strengthen real utility loops before speculative exposure",
      "utility-first-demand-and-tokenization-expansion",
      dual,
    ));
    directives.push(marketDirective(
      "protect",
      86,
      "utility-gcv-integrity",
      "Extreme discount requires utility-first GCV support and anti-deception education before speculative exposure",
      "utility-gcv-anti-deception-tokenization-shield",
      { ...dual, doctrine: MARKET_INTEGRITY_DOCTRINE.name },
    ));
  } else if (dual.spread_ratio > 0) {
    strengths.push(`Dual-value spread is within monitored range (${dual.spread_label})`);
  }

  if (pi.score != null && Number(pi.score) < 90) {
    risks.push({ class: "pi-chain-merge-risk", severity: "medium", detail: `Pi-chain merge score ${pi.score}` });
    directives.push(marketDirective("fix", 84, "pi-chain-merge", "Pi-chain merge score is below strong threshold", "improve-pi-chain-fee-ledger-bridge-context", { piScore: pi.score, weaknesses: pi.weaknesses || [] }));
  } else if (pi.score != null) {
    strengths.push(`Pi-chain merge readiness remains ${pi.mergeReadiness || "observable"} (${pi.score})`);
  }

  if (!inputs.settlementHealth.ok) {
    risks.push({ class: "settlement-delay", severity: "high", detail: "Settlement core health is unreachable" });
    directives.push(marketDirective("fix", 91, "settlement-core", "Settlement core health cannot be verified", "settlement-delay-root-cause-blueprint"));
  } else {
    strengths.push("Settlement core health is reachable");
  }

  if (!inputs.tokenStats.ok) {
    risks.push({ class: "tokenization-observability", severity: "medium", detail: "Tokenization stats are unavailable" });
    directives.push(marketDirective("build-blueprint", 80, "tokenization-ledger", "Tokenization depth and audit stats are not observable", "tokenization-audit-depth-blueprint"));
  } else {
    strengths.push("Tokenization stats are observable");
    observations.push({ class: "tokenization", detail: "Tokenization audit surface reachable", data: token });
  }

  if (!inputs.creditHealth.ok) {
    risks.push({ class: "credit-participation", severity: "medium", detail: "Credit engine health is unavailable" });
    directives.push(marketDirective("repair", 78, "credit-engine", "Credit and repayment behavior surface is unavailable", "credit-participation-health-blueprint"));
  } else {
    strengths.push(`Credit participation surface reachable; scores issued=${Number(credit.scoresIssued || 0)}`);
  }

  const reachable = Number(omni.reachable || 0);
  const total = Number(omni.totalServices || 0);
  if (inputs.omnipresence.ok && total > 0 && reachable < total) {
    risks.push({ class: "user-demand-reachability", severity: "medium", detail: `Only ${reachable}/${total} ecosystem services reachable` });
    directives.push(marketDirective("tune", 76, "ecosystem-reachability", "Demand surfaces are partially unreachable", "user-demand-service-reachability-blueprint", { reachable, total }));
  } else if (inputs.omnipresence.ok) {
    strengths.push(total > 0 ? `Ecosystem reachability ${reachable}/${total}` : "Ecosystem reachability surface is observable");
  }

  if (!paymentProbe.ok && ![400, 404].includes(Number(paymentProbe.status || 0))) {
    risks.push({ class: "payment-status-surface", severity: "medium", detail: `Payment status probe returned ${paymentProbe.status}` });
    directives.push(marketDirective("fix", 74, "payment-status", "Payment status surface is not predictably reachable", "payment-success-failure-analytics-blueprint"));
  } else {
    strengths.push("Payment status surface responds predictably");
  }

  if (!transactionProbe.ok && Number(transactionProbe.status || 0) !== 400) {
    risks.push({ class: "transaction-history-surface", severity: "low", detail: `Transaction history probe returned ${transactionProbe.status}` });
    directives.push(marketDirective("build-blueprint", 65, "transaction-analytics", "Transaction history surface needs aggregate analytics", "settlement-delay-and-success-rate-analytics"));
  } else {
    strengths.push("Transaction surface responds predictably");
  }

  const severityWeight = { high: 18, medium: 10, low: 4 };
  const penalty = risks.reduce((sum, item) => sum + (severityWeight[item.severity] || 4), 0);
  const score = Math.max(0, Math.min(100, 100 - penalty));
  const resilience = score >= 90 ? "resilient" : score >= 70 ? "watch" : "fragile";

  return {
    observed_at: new Date().toISOString(),
    mode: "MARKET_RESILIENCE_ECONOMIST",
    score,
    resilience,
    observations,
    strengths,
    risks,
    directives: directives.sort((a, b) => b.priority - a.priority).slice(0, 12),
    algorithms,
    doctrine: "SAIB studies legally observable market and ecosystem signals, filters them through utility-based Pi GCV market integrity, then routes fair-economy changes behind GCV, tokenization, settlement, credit, and demand through Founder-reviewed blueprints.",
    marketIntegrityDoctrine: MARKET_INTEGRITY_DOCTRINE,
  };
}

async function submitMarketBlueprints(assessment) {
  const submitted = [];
  for (const item of assessment.directives.slice(0, 6)) {
    const key = `${item.blueprint}:${item.target}:${item.reason}`;
    const last = marketBlueprintCooldowns.get(key) || 0;
    if (Date.now() - last < MARKET_BLUEPRINT_COOLDOWN_SEC * 1000) {
      submitted.push({ directive_id: item.id, target: item.target, skipped: "market-blueprint-cooldown" });
      continue;
    }
    const goal = await fetchNanoSAIB("/brainstorm/goal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        description: `MARKET_RESILIENCE_ECONOMIST: ${item.kind.toUpperCase()} ${item.target}. ${item.reason}. Blueprint=${item.blueprint}. Founder review required before economic policy change.`,
        priority: Math.min(0.96, Math.max(0.55, item.priority / 100)),
        domain: "fair-economy-gcv-tokenization",
      }),
    }, 12000).catch((err) => ({ ok: false, status: 0, body: { error: summarizeError(err) } }));
    if (goal.ok) marketBlueprintCooldowns.set(key, Date.now());
    submitted.push({ directive_id: item.id, target: item.target, blueprint: item.blueprint, ok: goal.ok, status: goal.status, response: goal.body });
  }
  return submitted;
}

async function dutyMarketResilienceEconomist() {
  const [dualReport, dualSpread, settlementHealth, tokenStats, creditHealth, creditQuantum, omnipresence, paymentStatusProbe, transactionProbe] = await Promise.all([
    safeFetch("dual-value-report", () => fetchJSON(`${DUAL_VALUE}/value/report`, { method: "GET" }, 10000)),
    safeFetch("dual-value-spread", () => fetchJSON(`${DUAL_VALUE}/value/spread`, { method: "GET" }, 10000)),
    safeFetch("settlement-health", () => fetchJSON(`${SETTLEMENT_CORE}/health`, { method: "GET" }, 8000)),
    safeFetch("tokenization-stats", () => fetchJSON(`${TOKEN_ENGINE}/api/tokenize/stats`, { method: "GET" }, 10000)),
    safeFetch("credit-health", () => fetchJSON(`${CREDIT_ENGINE}/health`, { method: "GET" }, 8000)),
    safeFetch("credit-quantum-status", () => fetchJSON(`${CREDIT_ENGINE}/api/credit/quantum-status`, { method: "GET" }, 8000)),
    safeFetch("app-omnipresence", () => fetchJSON(`${APP_URL}/api/saib/omnipresence`, { method: "GET" }, 12000)),
    safeFetch("payment-status-probe", () => fetchJSON(`${APP_URL}/api/payments`, { method: "GET" }, 8000)),
    safeFetch("transaction-history-probe", () => fetchJSON(`${APP_URL}/api/transactions`, { method: "GET" }, 8000)),
  ]);

  const assessment = assessMarketResilience({
    dualReport,
    dualSpread,
    settlementHealth,
    tokenStats,
    creditHealth,
    creditQuantum,
    omnipresence,
    paymentStatusProbe,
    transactionProbe,
  });

  const signal = await fetchNanoSAIB("/intel/signal", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      source: "SAIB-MARKET-RESILIENCE-ECONOMIST",
      entity_id: "triumph-fair-economy",
      signal_type: assessment.risks.length ? "FAIR_ECONOMY_RISK_LEARNING" : "FAIR_ECONOMY_RESILIENCE_LEARNING",
      value: assessment.score / 100,
      confidence: 0.96,
      metadata: assessment,
    }),
  }, 12000).catch((err) => ({ ok: false, status: 0, body: { error: summarizeError(err) } }));

  const blueprintGoals = assessment.directives.length > 0 ? await submitMarketBlueprints(assessment) : [];
  const receipt = makeReceipt("duty-market-resilience-economist", "autonomous-economist", {
    assessment,
    signal: { ok: signal.ok, status: signal.status, response: signal.body },
    blueprintGoals,
  });
  void anchorReceipt(receipt);
  dutyState.marketEconomist = {
    mode: assessment.mode,
    lastRunAt: new Date().toISOString(),
    receiptDigest: receipt.payloadDigest,
    score: assessment.score,
    resilience: assessment.resilience,
    directives: assessment.directives,
    observations: {
      strengths: assessment.strengths,
      risks: assessment.risks,
      algorithms: assessment.algorithms,
    },
    doctrine: assessment.marketIntegrityDoctrine,
    blueprintGoals,
  };
  recordReceipt(receipt, {
    summary: `market-economist score=${assessment.score} resilience=${assessment.resilience} directives=${assessment.directives.length}`,
    upstream: { signal_status: signal.status, blueprint_count: blueprintGoals.length },
  });
}

async function dutyCEOOrchestrator() {
  const signals = await gatherCEOSignals();
  const signalSummary = summarizeCEOSignals(signals);
  const directives = planCEODirectives(signals);
  const actionDirectives = directives.slice(0, CEO_MAX_ACTIONS);
  const skipped = directives.slice(CEO_MAX_ACTIONS).map((item) => ({ directive: item, skipped: "ceo-action-budget" }));
  const actions = [];

  for (const item of actionDirectives) {
    actions.push(await executeCEODirective(item, signals));
  }
  actions.push(...skipped);

  const escalations = actions.filter((item) => item && item.escalated);
  const payload = {
    mode: "SAIB CEO omni quantum hyper orchestrator",
    doctrine: "Founder supremacy: auto-execute reversible low-risk repairs; escalate irreversible, financial, legal, identity, or Founder-sensitive decisions.",
    observed_at: signalSummary.observed_at,
    signalSummary,
    directives,
    actions,
    escalations,
    config: {
      autoRepair: CEO_AUTO_REPAIR,
      autoAckStale: CEO_AUTO_ACK_STALE,
      autoHeal: CEO_AUTO_HEAL,
      maxActions: CEO_MAX_ACTIONS,
      protocolFloor: PI_PROTOCOL_VERSION,
    },
  };
  const receipt = makeReceipt("duty-ceo-orchestrator", "autonomous-ceo", payload);
  void anchorReceipt(receipt);
  dutyState.ceo = {
    mode: payload.mode,
    enabled: DUTY_ENABLED,
    lastRunAt: new Date().toISOString(),
    receiptDigest: receipt.payloadDigest,
    signalSummary,
    directives,
    actions,
    escalations,
  };
  recordReceipt(receipt, {
    summary: `ceo-orchestrator directives=${directives.length} actions=${actions.filter((item) => item && item.executed).length} escalations=${escalations.length}`,
    upstream: signalSummary,
  });
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
  const u = await fetchJSON(`${TOKEN_ENGINE}/api/tokenize/stats`, { method: "GET" }, 8000)
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

// SAIBs reach back JUDICIAL_LOOKBACK_YEARS (default 5) years from today.
const JUDICIAL_LOOKBACK_YEARS = Number(process.env.JUDICIAL_LOOKBACK_YEARS || 5);

async function dutyJudicialRadar() {
  // Read-only sweep of judicial cases. judicial-monitor exposes
  // /api/judicial/cases which supports a `years` lookback window so the SAIB
  // can survey every case filed in the last 5 years from today.
  const u = await fetchJSON(
    `${JUDICIAL_SERVICE}/api/judicial/cases?jurisdiction=Florida&limit=500&years=${JUDICIAL_LOOKBACK_YEARS}`,
    { method: "GET" }, 10000,
  ).catch((err) => ({ ok: false, status: 0, body: { error: String(err.message || err) } }));
  const rows = Array.isArray(u.body && u.body.rows) ? u.body.rows : [];
  const count = rows.length;
  const receipt = makeReceipt("duty-judicial-radar", "autonomous", {
    active_count: count, lookback_years: JUDICIAL_LOOKBACK_YEARS,
    since: u.body && u.body.since, sample: rows.slice(0, 5),
    upstream_status: u.status,
  });
  void anchorReceipt(receipt);
  recordReceipt(receipt, {
    summary: `judicial-radar cases=${count} lookback=${JUDICIAL_LOOKBACK_YEARS}y status=${u.status}`,
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
  { name: "pi-chain-probe",    fn: dutyPiChainProbe,         everySec: DUTY_PI_CHAIN_SEC,      last: 0 },
  { name: "market-economist",  fn: dutyMarketResilienceEconomist, everySec: DUTY_MARKET_ECON_SEC, last: 0 },
  { name: "brain-absorb",      fn: dutyBrainAbsorb,          everySec: DUTY_BRAIN_SEC,         last: 0 },
  { name: "ceo-orchestrator",  fn: dutyCEOOrchestrator,      everySec: DUTY_CEO_SEC,           last: 0 },
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
      try {
        console.debug(`[saib-duty] executing: ${duty.name} (tick #${dutyState.ticks})`);
        const startMs = Date.now();
        await duty.fn();
        const durationMs = Date.now() - startMs;
        console.debug(`[saib-duty] ✅ ${duty.name} completed in ${durationMs}ms`);
        dutyState.counters[duty.name] = (dutyState.counters[duty.name] || 0) + 1;
      } catch (err) {
        const errMsg = err && err.message ? err.message : String(err);
        console.error(`[saib-duty] ❌ ${duty.name} failed: ${errMsg}`);
        recordDutyError(duty.name, err);
      }
    }
  }
}

function startDutyEngine() {
  if (!DUTY_ENABLED) {
    console.log("[saib-enforcer] duty engine DISABLED via DUTY_ENABLED=false");
    return;
  }
  console.log(`[saib-enforcer] 🚀 duty engine STARTED — tick every ${DUTY_INTERVAL_SEC}s`);
  console.log(`[saib-enforcer] 📋 scheduled duties: ${DUTIES.map(d => d.name).join(', ')}`);
  // Fire an initial heartbeat immediately so observers see life on boot.
  dutyTick()
    .then(() => console.log("[saib-enforcer] ✅ initial duty tick completed"))
    .catch((e) => {
      const msg = e && e.message ? e.message : String(e);
      console.error(`[saib-enforcer] ❌ initial duty tick failed: ${msg}`);
      recordDutyError("initial-tick", e);
    });
  setInterval(() => {
    dutyTick().catch((e) => {
      const msg = e && e.message ? e.message : String(e);
      console.error(`[saib-enforcer] ❌ duty tick failed: ${msg}`);
      recordDutyError("tick", e);
    });
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
        ceo: dutyState.ceo,
        piChain: dutyState.piChain,
        marketEconomist: dutyState.marketEconomist,
        recentErrors: dutyState.errors,
        scheduled: DUTIES.map((d) => ({ name: d.name, everySec: d.everySec })),
      });
    }
    if (req.method === "GET" && (path === "/ceo" || path === "/api/saib/enforce/ceo")) {
      return send(res, 200, dutyState.ceo);
    }
    if (req.method === "GET" && (path === "/pi-chain" || path === "/api/saib/enforce/pi-chain")) {
      return send(res, 200, dutyState.piChain);
    }
    if (req.method === "GET" && (path === "/market-economist" || path === "/api/saib/enforce/market-economist")) {
      return send(res, 200, dutyState.marketEconomist);
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

// ── Global Error Handlers ────────────────────────────────────────────────────
// Catch unhandled promise rejections and uncaught exceptions. Log them but keep
// the process alive — Triumph Synergy SAIB must be resilient to individual duty
// failures. Kubernetes or supervisor will restart if needed.
process.on("uncaughtException", (err) => {
  const msg = err && err.message ? err.message : String(err);
  const stack = err && err.stack ? err.stack : "";
  console.error(`[saib-enforcer] 🚨 UNCAUGHT EXCEPTION: ${msg}`);
  if (stack) console.error(stack);
  recordDutyError("uncaught-exception", err);
  // Process CONTINUES — do NOT exit. Duties retry on next tick.
});

process.on("unhandledRejection", (reason, promise) => {
  const msg = reason && reason.message ? reason.message : String(reason);
  console.error(`[saib-enforcer] 🚨 UNHANDLED REJECTION: ${msg}`);
  console.error(`[saib-enforcer] promise:`, promise);
  recordDutyError("unhandled-rejection", new Error(msg));
  // Process CONTINUES — do NOT exit. Duties retry on next tick.
});

process.on("SIGTERM", () => { server.close(() => process.exit(0)); });
process.on("SIGINT",  () => { server.close(() => process.exit(0)); });

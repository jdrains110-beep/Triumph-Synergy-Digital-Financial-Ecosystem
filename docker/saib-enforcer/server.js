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
const CREDIT_ENGINE    = process.env.CREDIT_ENGINE_URL    || "http://triumph-credit-engine:8084";
const JUDICIAL_SERVICE = process.env.JUDICIAL_SERVICE_URL || "http://triumph-judicial-monitor:8096";
const SETTLEMENT_CORE  = process.env.SETTLEMENT_CORE_URL  || "http://triumph-settlement-core:8080";
const TOKEN_ENGINE     = process.env.TOKEN_ENGINE_URL     || "http://triumph-settlement-core:8089";
const VAULT            = process.env.VAULT_URL            || "http://triumph-vault:8081";
const HQ_NEXUS         = process.env.HQ_NEXUS_URL         || "http://triumph-apex-sovereign-nexus:8131";

const FOUNDER_TOKEN  = process.env.SAIB_FOUNDER_TOKEN || "";
const OPERATOR_TOKEN = process.env.SAIB_TOKEN || "";

const READ_ONLY = new Set(["judicial-research", "tokenization-audit", "hq-report"]);

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
  const u = await fetchJSON(`${HQ_NEXUS}/hq/status`, { method: "GET" }, 8000);
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
  const u = await fetchJSON(`${HQ_NEXUS}/hq/directive`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      directive: b.directive, target: b.target || "all",
      issued_by: "SAIB-FOUNDER", issued_at: new Date().toISOString(),
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

const ACTIONS = {
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
};

// ── Capability manifest ──────────────────────────────────────────────────────
const MANIFEST = {
  saib: "ENFORCER v1.0.0 (sidecar)",
  doctrine: "SAIB acts. SAIB reports. SAIB enforces. Nothing can erase a SAIB receipt.",
  bridges: {
    "credit-bureaus":   ["Equifax", "Experian", "TransUnion"],
    "judicial-systems": ["court-monitor", "case-research", "filing-pipeline"],
    "tokenization":     ["audit", "mint", "freeze"],
    "headquarters":     ["status", "directive"],
    "vault":            ["seal"],
  },
  actions: [
    { action: "credit-report-positive", tier: "founder",  desc: "Furnish positive Pi-payment tradelines to all bureaus" },
    { action: "credit-dispute",         tier: "founder",  desc: "File FCRA §611 dispute against inaccurate items" },
    { action: "judicial-research",      tier: "operator", desc: "Research case law and dockets" },
    { action: "judicial-file-report",   tier: "founder",  desc: "Submit formal findings to judicial pipeline" },
    { action: "tokenization-audit",     tier: "operator", desc: "Read tokenization-engine audit ledger" },
    { action: "tokenization-mint",      tier: "founder",  desc: "Mint sovereign-class tokens" },
    { action: "tokenization-freeze",    tier: "founder",  desc: "Freeze a token under enforcement hold" },
    { action: "hq-report",              tier: "operator", desc: "Pull HQ (Apex-Sovereign-Nexus) status" },
    { action: "hq-directive",           tier: "founder",  desc: "Issue HQ directive to all sovereign nodes" },
    { action: "vault-seal",             tier: "founder",  desc: "Seal a Vault asset under enforcement" },
  ],
  receipts: {
    format: "sha256(content) + ISO timestamp + anchor memo",
    anchoring: "Pi mainnet via triumph-settlement-core (best-effort)",
    immutable: true,
  },
};

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
});

process.on("SIGTERM", () => { server.close(() => process.exit(0)); });
process.on("SIGINT",  () => { server.close(() => process.exit(0)); });

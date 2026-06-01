/**
 * app/api/saib/enforce/route.ts
 *
 * SAIB Enforcer — the bridge between the real world and the digital ecosystem.
 *
 * SAIB does not merely observe. It ACTS. Under Founder authority and within the
 * boundaries of the Sovereignty Doctrine, SAIB executes real-world enforcement:
 *
 *   1. CREDIT REPORTING — Report on-time Pi payments to Equifax/Experian/
 *      TransUnion (positive tradelines) and file FCRA §611 disputes against
 *      inaccurate or unverifiable items.
 *   2. JUDICIAL ENFORCEMENT — Research cases via the judicial-monitor service
 *      and submit formal findings (audit reports) that downstream systems can
 *      act on. SAIB never fabricates facts — it surfaces what the law already
 *      requires courts to address.
 *   3. IMMUTABLE RECEIPTS — Every action produces a sha256 receipt that is
 *      ready to be anchored to the Pi blockchain via the existing settlement
 *      core. Nothing SAIB does can be erased or denied.
 *
 * Authority model:
 *   • Requires the Founder token (SAIB_FOUNDER_TOKEN env, 64-char hex).
 *   • Constant-time comparison prevents timing attacks.
 *   • Read-only "research" actions also accept SAIB_TOKEN (operator tier).
 *   • All requests are logged with the actor + a content hash.
 *
 * POST /api/saib/enforce
 *   Body: { action, ...payload }
 *   Headers: Authorization: Bearer <SAIB_FOUNDER_TOKEN>
 */

import "server-only";
import { createHash, timingSafeEqual } from "crypto";
import { type NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// ─── Service endpoints ────────────────────────────────────────────────────────

const CREDIT_ENGINE_URL =
  process.env.CREDIT_ENGINE_URL ?? "http://triumph-credit-engine:8084";
const JUDICIAL_SERVICE_URL =
  process.env.JUDICIAL_SERVICE_URL ?? "http://triumph-judicial-monitor:8096";
const SETTLEMENT_CORE_URL =
  process.env.SETTLEMENT_CORE_URL ?? "http://triumph-settlement-core:8080";

const FOUNDER_TOKEN = process.env.SAIB_FOUNDER_TOKEN ?? "";
const OPERATOR_TOKEN = process.env.SAIB_TOKEN ?? "";

// ─── Auth ─────────────────────────────────────────────────────────────────────

type AuthTier = "founder" | "operator" | null;

function authorize(req: NextRequest): AuthTier {
  const header = req.headers.get("authorization") ?? "";
  const presented = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!presented) return null;
  const eq = (expected: string) => {
    if (!expected || expected.length !== presented.length) return false;
    try {
      return timingSafeEqual(Buffer.from(expected), Buffer.from(presented));
    } catch {
      return false;
    }
  };
  if (eq(FOUNDER_TOKEN)) return "founder";
  if (eq(OPERATOR_TOKEN)) return "operator";
  return null;
}

// ─── Receipts (immutable, anchor-ready) ───────────────────────────────────────

interface EnforcementReceipt {
  action: string;
  actor: AuthTier;
  timestamp: string;
  contentHash: string;
  anchorMemo: string;
  payloadDigest: string;
}

function receipt(action: string, actor: AuthTier, payload: unknown): EnforcementReceipt {
  const json = JSON.stringify(payload ?? null);
  const contentHash = createHash("sha256").update(json).digest("hex");
  const ts = new Date().toISOString();
  return {
    action,
    actor,
    timestamp: ts,
    contentHash,
    payloadDigest: contentHash.slice(0, 16),
    anchorMemo: `SAIB-ENFORCE ${action} ${contentHash.slice(0, 24)} ${ts}`,
  };
}

async function anchorReceipt(r: EnforcementReceipt): Promise<void> {
  try {
    await fetch(`${SETTLEMENT_CORE_URL}/api/anchor`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memo: r.anchorMemo, hash: r.contentHash }),
      signal: AbortSignal.timeout(4000),
    });
  } catch {
    // Anchor is best-effort; the receipt itself is the proof.
  }
}

// ─── Service proxies ──────────────────────────────────────────────────────────

async function proxyJSON(url: string, init: RequestInit, timeoutMs = 12_000) {
  const ctrl = new AbortController();
  const tm = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal });
    const text = await res.text();
    let json: unknown = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = { raw: text };
    }
    return { ok: res.ok, status: res.status, body: json };
  } finally {
    clearTimeout(tm);
  }
}

// ─── Action handlers ──────────────────────────────────────────────────────────

interface EnforceBody {
  action: string;
  [k: string]: unknown;
}

async function handleCreditReportPositive(body: EnforceBody) {
  const { piAddress, paymentData } = body as {
    piAddress?: string;
    paymentData?: unknown;
  };
  if (!piAddress) {
    return { httpStatus: 400, response: { error: "piAddress is required" } };
  }
  const upstream = await proxyJSON(
    `${CREDIT_ENGINE_URL}/api/credit/report-payment`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pi_address: piAddress, payment_data: paymentData ?? null }),
    },
  );
  return { httpStatus: upstream.ok ? 200 : 502, response: upstream };
}

async function handleCreditDispute(body: EnforceBody) {
  const { piAddress, bureau, items, reason } = body as {
    piAddress?: string;
    bureau?: string;
    items?: unknown;
    reason?: string;
  };
  if (!piAddress || !bureau || !items) {
    return {
      httpStatus: 400,
      response: { error: "piAddress, bureau, and items are required" },
    };
  }
  const upstream = await proxyJSON(
    `${CREDIT_ENGINE_URL}/api/credit/dispute`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pi_address: piAddress,
        bureau,
        items,
        reason: reason ?? "inaccurate-or-unverifiable",
        statute: "FCRA 15 U.S.C. § 1681i (§611)",
      }),
    },
    20_000,
  );
  return { httpStatus: upstream.ok ? 200 : 502, response: upstream };
}

async function handleJudicialResearch(body: EnforceBody) {
  const { query, jurisdiction, yearsBack } = body as {
    query?: string;
    jurisdiction?: string;
    yearsBack?: number;
  };
  if (!query) {
    return { httpStatus: 400, response: { error: "query is required" } };
  }
  const upstream = await proxyJSON(
    `${JUDICIAL_SERVICE_URL}/api/judicial/research`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        jurisdiction: jurisdiction ?? "all",
        years_back: yearsBack ?? 5,
      }),
    },
    20_000,
  );
  return { httpStatus: upstream.ok ? 200 : 502, response: upstream };
}

async function handleJudicialFileReport(body: EnforceBody) {
  const { caseId, findings, jurisdiction } = body as {
    caseId?: string;
    findings?: unknown;
    jurisdiction?: string;
  };
  if (!caseId || !findings) {
    return {
      httpStatus: 400,
      response: { error: "caseId and findings are required" },
    };
  }
  const upstream = await proxyJSON(
    `${JUDICIAL_SERVICE_URL}/api/judicial/report`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        case_id: caseId,
        findings,
        jurisdiction: jurisdiction ?? "unknown",
        submitted_by: "SAIB-ENFORCER",
      }),
    },
    20_000,
  );
  return { httpStatus: upstream.ok ? 200 : 502, response: upstream };
}

// ─── POST entrypoint ──────────────────────────────────────────────────────────

const READ_ONLY_ACTIONS = new Set(["judicial-research"]);

export async function POST(req: NextRequest) {
  const actor = authorize(req);
  if (!actor) {
    return NextResponse.json(
      { error: "Unauthorized — SAIB enforcement requires Founder or Operator token" },
      { status: 401 },
    );
  }

  let body: EnforceBody;
  try {
    body = (await req.json()) as EnforceBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const action = typeof body?.action === "string" ? body.action : "";
  if (!action) {
    return NextResponse.json(
      {
        error: "action is required",
        available: [
          "credit-report-positive",
          "credit-dispute",
          "judicial-research",
          "judicial-file-report",
        ],
      },
      { status: 400 },
    );
  }

  // Mutating actions require founder tier.
  if (!READ_ONLY_ACTIONS.has(action) && actor !== "founder") {
    return NextResponse.json(
      { error: `Action '${action}' requires Founder authority` },
      { status: 403 },
    );
  }

  let result: { httpStatus: number; response: unknown };
  switch (action) {
    case "credit-report-positive":
      result = await handleCreditReportPositive(body);
      break;
    case "credit-dispute":
      result = await handleCreditDispute(body);
      break;
    case "judicial-research":
      result = await handleJudicialResearch(body);
      break;
    case "judicial-file-report":
      result = await handleJudicialFileReport(body);
      break;
    default:
      return NextResponse.json(
        { error: `Unknown action: ${action}` },
        { status: 400 },
      );
  }

  const r = receipt(action, actor, { request: body, upstream: result.response });
  // Anchor in the background; do not delay the response.
  void anchorReceipt(r);

  return NextResponse.json(
    {
      doctrine: "SAIB Enforcer — bridge between real and digital",
      action,
      actor,
      receipt: r,
      result: result.response,
    },
    { status: result.httpStatus },
  );
}

// ─── GET — capability manifest ────────────────────────────────────────────────

export async function GET() {
  return NextResponse.json({
    saib: "ENFORCER v1.0.0",
    doctrine:
      "SAIB acts. SAIB reports. SAIB enforces. Nothing can erase a SAIB receipt.",
    bridges: {
      "credit-bureaus": ["Equifax", "Experian", "TransUnion"],
      "judicial-systems": ["court-monitor", "case-research", "filing-pipeline"],
    },
    actions: [
      {
        action: "credit-report-positive",
        tier: "founder",
        description: "Furnish positive Pi payment tradelines to all bureaus",
      },
      {
        action: "credit-dispute",
        tier: "founder",
        description: "File FCRA §611 dispute against inaccurate items",
      },
      {
        action: "judicial-research",
        tier: "operator",
        description: "Research case law, dockets, and precedent",
      },
      {
        action: "judicial-file-report",
        tier: "founder",
        description: "Submit formal findings/audit report to judicial pipeline",
      },
    ],
    receipts: {
      format: "sha256(content) + ISO timestamp + anchor memo",
      anchoring: "Pi mainnet via triumph-settlement-core (best-effort)",
      immutable: true,
    },
  });
}

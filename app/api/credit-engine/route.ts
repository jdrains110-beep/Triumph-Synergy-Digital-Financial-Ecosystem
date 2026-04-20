/**
 * Triumph Synergy Credit Engine API — Next.js proxy to Docker microservice.
 *
 * Proxies to triumph-credit-engine:8091 running in Docker Desktop.
 * All major credit platforms integrate through this gateway:
 *   Equifax · Experian · TransUnion · FICO · VantageScore
 *
 * Routes:
 *   POST /api/credit-engine   { action: "score",   ...CreditScoreReq }
 *   POST /api/credit-engine   { action: "report",  piAddress }
 *   POST /api/credit-engine   { action: "bureau-sync", piAddress, bureau }
 *   POST /api/credit-engine   { action: "bureaus" }
 *   POST /api/credit-engine   { action: "universe" }
 *   POST /api/credit-engine   { action: "hq-score" }
 */

import { type NextRequest, NextResponse } from "next/server";

const CREDIT_URL = process.env.CREDIT_ENGINE_URL ?? "http://triumph-credit-engine:8091";

async function proxyGet(path: string) {
  const res = await fetch(`${CREDIT_URL}${path}`, {
    signal: AbortSignal.timeout(8_000),
  });
  return res.json();
}

async function proxyPost(path: string, body: unknown) {
  const res = await fetch(`${CREDIT_URL}${path}`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify(body),
    signal:  AbortSignal.timeout(8_000),
  });
  return res.json();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...params } = body as { action: string; [k: string]: unknown };

    let data: unknown;

    switch (action) {
      case "score":
        data = await proxyPost("/api/credit/score", {
          piAddress:       params.piAddress       ?? "",
          txCount:         params.txCount         ?? 0,
          walletAgeDays:   params.walletAgeDays   ?? 0,
          kycVerified:     params.kycVerified      ?? false,
          avgTxAmountPi:   params.avgTxAmountPi   ?? 0,
          paymentVelocity: params.paymentVelocity ?? 0,
          ecosystemScore:  params.ecosystemScore  ?? 50,
        });
        break;

      case "report":
        data = await proxyGet(`/api/credit/report/${encodeURIComponent(String(params.piAddress ?? ""))}`);
        break;

      case "bureau-sync":
        data = await proxyPost("/api/credit/bureau-sync", {
          piAddress: params.piAddress,
          bureau:    params.bureau,
        });
        break;

      case "bureaus":
        data = await proxyGet("/api/credit/bureaus");
        break;

      case "universe":
        data = await proxyGet("/api/credit/universe");
        break;

      case "hq-score":
        data = await proxyGet("/api/credit/hq-deed-score");
        break;

      // ── NESARA/GESARA Sovereign Credit Repair ──────────────────────────
      case "nesara-file":
        // File a sovereign credit repair/cancel/clear/jubilee case
        data = await proxyPost("/api/credit/nesara/file", params);
        break;

      case "nesara-cases":
        data = await proxyPost("/api/credit/nesara/cases", {});
        break;

      case "nesara-resolve":
        data = await proxyPost(
          `/api/credit/nesara/resolve/${encodeURIComponent(String(params.caseId ?? ""))}`,
          { outcome: params.outcome ?? "resolved" },
        );
        break;

      default:
        return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Credit engine unreachable";
    return NextResponse.json({ success: false, error: message }, { status: 503 });
  }
}

export async function GET(request: NextRequest) {
  const action = request.nextUrl.searchParams.get("action") ?? "health";
  try {
    let data: unknown;
    if (action === "health")          data = await proxyGet("/health");
    else if (action === "bureaus")     data = await proxyGet("/api/credit/bureaus");
    else if (action === "universe")    data = await proxyGet("/api/credit/universe");
    else if (action === "hq-score")    data = await proxyGet("/api/credit/hq-deed-score");
    else if (action === "nesara-cases") data = await proxyGet("/api/credit/nesara/cases");
    else if (action === "nesara-case") {
      const caseId = request.nextUrl.searchParams.get("caseId") ?? "";
      if (!caseId) return NextResponse.json({ success: false, error: "caseId required" }, { status: 400 });
      data = await proxyGet(`/api/credit/nesara/case/${encodeURIComponent(caseId)}`);
    } else if (action === "nesara-letter") {
      const caseId = request.nextUrl.searchParams.get("caseId") ?? "";
      if (!caseId) return NextResponse.json({ success: false, error: "caseId required" }, { status: 400 });
      data = await proxyGet(`/api/credit/nesara/letter/${encodeURIComponent(caseId)}`);
    } else if (action === "nesara-certificate") {
      const caseId = request.nextUrl.searchParams.get("caseId") ?? "";
      if (!caseId) return NextResponse.json({ success: false, error: "caseId required" }, { status: 400 });
      data = await proxyGet(`/api/credit/nesara/certificate/${encodeURIComponent(caseId)}`);
    } else return NextResponse.json({ success: false, error: "Unknown action" }, { status: 400 });

    return NextResponse.json({ success: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Credit engine unreachable";
    return NextResponse.json({ success: false, error: message }, { status: 503 });
  }
}

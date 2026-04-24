/**
 * Triumph Synergy Dual-Value Engine API — Next.js proxy to Docker microservice.
 *
 * Proxies to triumph-dual-value-engine:8093 running in Docker Desktop.
 * Separates Pi Network's two distinct value dimensions:
 *
 *   INTERNAL VALUE (Sovereign / Mined)
 *   ────────────────────────────────────
 *   Utility-backed intrinsic worth of Pi within the Triumph ecosystem.
 *   Derived from ML utility index, KYC status, wallet age, network maturity.
 *
 *   EXTERNAL VALUE (Market / Traded)
 *   ──────────────────────────────────
 *   Price Pi fetches when exchanged for USD. Ridge-model + DEX feed.
 *
 *   DUAL-VALUE SPREAD
 *   ──────────────────
 *   The quantified gap — generates ACCUMULATE / HOLD / PREMIUM signals.
 *
 * Routes (all via GET action param for simplicity):
 *   GET /api/dual-value?action=health
 *   GET /api/dual-value?action=internal
 *   GET /api/dual-value?action=external
 *   GET /api/dual-value?action=spread
 *   GET /api/dual-value?action=report
 *   GET /api/dual-value?action=hq
 *   GET /api/dual-value?action=address&address=G...&wallet_age_days=730&is_kyc=true
 */

import { type NextRequest, NextResponse } from "next/server";

const DUAL_VALUE_URL =
  process.env.DUAL_VALUE_URL ?? "http://triumph-dual-value-engine:8093";

async function proxyGet(path: string): Promise<unknown> {
  const res = await fetch(`${DUAL_VALUE_URL}${path}`, {
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    throw new Error(`Dual-value engine responded ${res.status} for ${path}`);
  }
  return res.json();
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const action  = searchParams.get("action") ?? "report";
    const address = searchParams.get("address") ?? "";
    const walletAgeDays = searchParams.get("wallet_age_days") ?? "365";
    const isKyc = searchParams.get("is_kyc") ?? "true";

    let data: unknown;

    switch (action) {
      case "health":
        data = await proxyGet("/health");
        break;

      case "internal":
        data = await proxyGet("/value/internal");
        break;

      case "external":
        data = await proxyGet("/value/external");
        break;

      case "spread":
        data = await proxyGet("/value/spread");
        break;

      case "report":
        data = await proxyGet("/value/report");
        break;

      case "hq":
        data = await proxyGet("/value/hq");
        break;

      case "address": {
        if (!address) {
          return NextResponse.json(
            { error: "address parameter required" },
            { status: 400 }
          );
        }
        const params = new URLSearchParams({
          wallet_age_days: walletAgeDays,
          is_kyc:          isKyc,
        });
        data = await proxyGet(
          `/value/address/${encodeURIComponent(address)}?${params}`
        );
        break;
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }

    return NextResponse.json({ ok: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { ok: false, error: message },
      { status: 502 }
    );
  }
}

/**
 * Triumph Tokenization API
 * ────────────────────────
 * Public entry point for tokenizing assets on Triumph Synergy. Every mint
 * is GCV-anchored ($314,159 per Pi) and gated by the 30-year sustainability
 * calculator so no actor can burn its Pi principal in months.
 *
 * Supports both testnet and mainnet — the GCV peg is identical on both;
 * only the underlying ledger settlement differs.
 *
 * POST /api/triumph/tokenize
 * {
 *   "kind":           "domain" | "deed",
 *   "network":        "mainnet" | "testnet",
 *   "valuation_pi":   "1.0",
 *   "owner_address":  "G...",
 *   "owner_username": "@founder",
 *   // domain:
 *   "domain":         "founder.pi",
 *   // deed:
 *   "property":       { ... PropertyRecord ... },
 *   // optional sustainability context:
 *   "total_pi":          "1000",
 *   "spent_pi":          "0",
 *   "spent_today_pi":    "0",
 *   "skip_gcv_gate":     false
 * }
 */
import { NextResponse } from "next/server";
import {
  GCV_PEG_USD,
  checkTransaction,
  piToUsd,
  formatUsd,
  type Network,
} from "@/lib/saib/gcv-calculator";
import {
  tokenizeDomain,
  tokenizeDeed,
} from "@/lib/tokenization";
import type {
  DomainTokenizationRequest,
  DeedTokenizationRequest,
} from "@/lib/tokenization/types";

export const runtime = "nodejs";

interface BaseTokenizeRequest {
  kind: "domain" | "deed";
  network: Network;
  valuation_pi?: string | number;
  owner_address: string;
  owner_username?: string;
  total_pi?: string | number;
  spent_pi?: string | number;
  spent_today_pi?: string | number;
  skip_gcv_gate?: boolean;
  // domain:
  domain?: string;
  // deed:
  property?: DeedTokenizationRequest["property"];
  owner?: DeedTokenizationRequest["owner"];
}

export async function POST(req: Request) {
  let body: BaseTokenizeRequest;
  try {
    body = (await req.json()) as BaseTokenizeRequest;
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  if (!body.kind || !body.owner_address || !body.network) {
    return NextResponse.json(
      { error: "kind, owner_address, network required" },
      { status: 400 },
    );
  }

  // ── GCV 30-year sustainability gate ──────────────────────────────────────
  // Founder can override (skip_gcv_gate=true) for genesis mints, but every
  // ordinary tokenization gets paced against the multi-decade vision.
  const valuationPi = String(body.valuation_pi ?? "0");
  let gcv_gate = null;
  if (!body.skip_gcv_gate && Number(valuationPi) > 0) {
    const gate = checkTransaction({
      totalPi: body.total_pi ?? "1000",
      spentPi: body.spent_pi ?? "0",
      spentTodayPi: body.spent_today_pi ?? "0",
      offeredPi: valuationPi,
    });
    if (!gate.approved) {
      return NextResponse.json(
        {
          error: "GCV 30-year sustainability gate rejected mint",
          gcv_gate: gate,
          gcv_peg_usd: GCV_PEG_USD,
          suggested_per_tx_max_pi: gate.per_tx_max_pi,
        },
        { status: 409 },
      );
    }
    gcv_gate = gate;
  }

  // ── Dispatch to the underlying tokenizer ─────────────────────────────────
  if (body.kind === "domain") {
    if (!body.domain || !body.owner_username) {
      return NextResponse.json(
        { error: "domain + owner_username required for kind=domain" },
        { status: 400 },
      );
    }
    const req: DomainTokenizationRequest = {
      domain: body.domain,
      ownerAddress: body.owner_address,
      ownerUsername: body.owner_username,
      network: body.network,
      valuationPi: valuationPi,
    };
    const result = await tokenizeDomain(req);
    return NextResponse.json({
      kind: "domain",
      gcv: {
        peg_usd: GCV_PEG_USD,
        valuation_pi: valuationPi,
        valuation_usd: formatUsd(piToUsd(Number(valuationPi))),
        sustainability_gate: gcv_gate,
      },
      result,
    });
  }

  if (body.kind === "deed") {
    if (!body.property || !body.owner) {
      return NextResponse.json(
        { error: "property + owner required for kind=deed" },
        { status: 400 },
      );
    }
    const req: DeedTokenizationRequest = {
      property: body.property,
      owner: body.owner,
      network: body.network,
      valuationPi: valuationPi,
    };
    const result = await tokenizeDeed(req);
    return NextResponse.json({
      kind: "deed",
      gcv: {
        peg_usd: GCV_PEG_USD,
        valuation_pi: valuationPi,
        valuation_usd: formatUsd(piToUsd(Number(valuationPi))),
        sustainability_gate: gcv_gate,
      },
      result,
    });
  }

  return NextResponse.json(
    { error: `unknown kind: ${body.kind}` },
    { status: 400 },
  );
}

export async function GET() {
  return NextResponse.json({
    service: "triumph-tokenization",
    gcv_peg_usd: GCV_PEG_USD,
    supports: {
      kinds: ["domain", "deed"],
      networks: ["mainnet", "testnet"],
    },
    note:
      "POST to mint. Every mint is GCV-anchored and gated by the 30-year sustainability calculator.",
  });
}

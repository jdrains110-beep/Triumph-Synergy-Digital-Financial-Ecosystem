/**
 * /api/sovereign/delivery/dispatch
 * Sovereign Delivery Platform — Work Order Dispatch Engine
 *
 * POST — dispatch a new work order across any of the 8 delivery authorities
 * GET  — list open work orders (optionally by authority)
 */

import { NextRequest, NextResponse } from "next/server";
import {
  createWorkOrder,
  SOVEREIGN_DELIVERY_VERSION,
  APEX_SECURITY_LEVEL,
  QUANTUM_ALGO_SIG,
  PI_RATE_EXTERNAL,
  SPA_ID, SLMN_ID, SFDA_ID, SRA_ID, SPSA_ID, SHHA_ID, SSLA_ID, SGDA_ID,
  AMAZON_FLEX_COMMISSION_PCT,
  DOORDASH_COMMISSION_PCT,
  UBER_DRIVER_TAKE_HOME_PCT,
  INSTAWORK_MARKUP_PCT,
  GOSHARE_COMMISSION_PCT,
  GETGIGS_DISPATCH_FEE_USD,
  UPS_SURCHARGE_AVG_PCT,
} from "@/lib/programs/sovereign-delivery";

export const dynamic = "force-dynamic";

// Authority routing map
const AUTHORITY_MAP: Record<string, { id: string; name: string; rivalFeeModel: string; feeSavedPct: number }> = {
  SPA:  { id: SPA_ID,  name: "Sovereign Parcel Authority",        rivalFeeModel: `UPS/USPS surcharges avg ${UPS_SURCHARGE_AVG_PCT}%`,    feeSavedPct: UPS_SURCHARGE_AVG_PCT },
  SLMN: { id: SLMN_ID, name: "Sovereign Last-Mile Network",       rivalFeeModel: `Amazon Flex take ${AMAZON_FLEX_COMMISSION_PCT}%`,       feeSavedPct: AMAZON_FLEX_COMMISSION_PCT },
  SFDA: { id: SFDA_ID, name: "Sovereign Food Delivery Authority", rivalFeeModel: `DoorDash commission ${DOORDASH_COMMISSION_PCT}%`,       feeSavedPct: DOORDASH_COMMISSION_PCT },
  SRA:  { id: SRA_ID,  name: "Sovereign Rideshare Authority",     rivalFeeModel: `Uber keeps ${100 - UBER_DRIVER_TAKE_HOME_PCT}% of fare`, feeSavedPct: 100 - UBER_DRIVER_TAKE_HOME_PCT },
  SPSA: { id: SPSA_ID, name: "Sovereign Parts & Supply Authority",rivalFeeModel: "PartsGeek 40% retail markup",                           feeSavedPct: 40 },
  SHHA: { id: SHHA_ID, name: "Sovereign Heavy Haul Authority",    rivalFeeModel: `GoShare commission ${GOSHARE_COMMISSION_PCT}%`,         feeSavedPct: GOSHARE_COMMISSION_PCT },
  SSLA: { id: SSLA_ID, name: "Sovereign Shift Labor Authority",   rivalFeeModel: `Instawork markup ${INSTAWORK_MARKUP_PCT}%`,             feeSavedPct: INSTAWORK_MARKUP_PCT },
  SGDA: { id: SGDA_ID, name: "Sovereign Gig Dispatch Authority",  rivalFeeModel: `GetGigs $${GETGIGS_DISPATCH_FEE_USD}/gig + 20% fee`,   feeSavedPct: 20 },
};

// In-memory order log (demo — production wires to Postgres via Supabase)
const orderLog: ReturnType<typeof createWorkOrder>[] = [];

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    authority,
    workerPiUid,
    workerPiWallet,
    customerPiWallet,
    description,
    piReward,
    jobCategory,
    globalRegion,
    verificationLevel,
  } = body;

  // Input validation
  if (!authority || !AUTHORITY_MAP[authority]) {
    return NextResponse.json({
      success: false,
      error: `Invalid authority. Must be one of: ${Object.keys(AUTHORITY_MAP).join(", ")}`,
    }, { status: 400 });
  }
  if (!workerPiUid || !workerPiWallet || !customerPiWallet) {
    return NextResponse.json({ success: false, error: "workerPiUid, workerPiWallet, customerPiWallet are required" }, { status: 400 });
  }
  if (typeof piReward !== "number" || piReward <= 0 || piReward > 10_000) {
    return NextResponse.json({ success: false, error: "piReward must be a positive number ≤ 10,000" }, { status: 400 });
  }
  if (!jobCategory || !globalRegion) {
    return NextResponse.json({ success: false, error: "jobCategory and globalRegion are required" }, { status: 400 });
  }

  const auth = AUTHORITY_MAP[authority];
  const platformFeeSaved = Math.round(piReward * (auth.feeSavedPct / 100) * PI_RATE_EXTERNAL * 100) / 100;

  const order = createWorkOrder({
    authorityId:       auth.id,
    workerPiUid:       String(workerPiUid).slice(0, 64),
    workerPiWallet:    String(workerPiWallet).slice(0, 56),
    customerPiWallet:  String(customerPiWallet).slice(0, 56),
    description:       String(description ?? "Sovereign delivery work order").slice(0, 200),
    piReward,
    platformFeeSaved,
    jobCategory:       String(jobCategory).slice(0, 50),
    globalRegion:      String(globalRegion).slice(0, 50),
    verificationLevel,
  });

  // Store in memory log (bounded)
  if (orderLog.length >= 1000) orderLog.shift();
  orderLog.push(order);

  return NextResponse.json({
    success:          true,
    programId:        SOVEREIGN_DELIVERY_VERSION,
    securityLevel:    APEX_SECURITY_LEVEL,
    quantumAlgo:      QUANTUM_ALGO_SIG,
    authority:        auth.name,
    rivalFeeEliminated: auth.rivalFeeModel,
    platformFeeSavedUsd: platformFeeSaved,
    order,
  }, { status: 201 });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const authority = searchParams.get("authority")?.toUpperCase();
  const status    = searchParams.get("status");
  const limit     = Math.min(Number(searchParams.get("limit") ?? "50"), 200);

  let orders = [...orderLog];
  if (authority) orders = orders.filter(o => o.authorityId.includes(authority));
  if (status)    orders = orders.filter(o => o.status === status);
  orders = orders.slice(-limit).reverse();

  return NextResponse.json({
    success:          true,
    programId:        SOVEREIGN_DELIVERY_VERSION,
    securityLevel:    APEX_SECURITY_LEVEL,
    totalInLog:       orderLog.length,
    returned:         orders.length,
    authorities:      AUTHORITY_MAP,
    orders,
  });
}

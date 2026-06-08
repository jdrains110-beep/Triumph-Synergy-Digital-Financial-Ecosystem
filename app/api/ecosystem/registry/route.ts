/**
 * GET /api/ecosystem/registry
 * Returns the unified ecosystem snapshot:
 *   - all 22 .pi tokenized tenants
 *   - SAIB V9 + v4.3 endpoint catalogs
 *   - all sovereign-* docker services
 */

import { NextResponse } from "next/server";

import { buildRegistry } from "@/lib/ecosystem/registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  const snapshot = buildRegistry();
  return NextResponse.json(snapshot);
}

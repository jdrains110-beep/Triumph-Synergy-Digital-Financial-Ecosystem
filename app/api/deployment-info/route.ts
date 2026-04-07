/**
 * app/api/deployment-info/route.ts
 * Returns minimal deployment status
 */

import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const hostname = request.nextUrl.hostname;

  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    hostname,
  });
}

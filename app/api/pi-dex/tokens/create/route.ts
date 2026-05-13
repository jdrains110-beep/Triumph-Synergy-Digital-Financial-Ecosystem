/**
 * app/api/pi-dex/tokens/create/route.ts
 * Create new token endpoint
 */

import { type NextRequest, NextResponse } from "next/server";
import { rateLimitByIPAsync, safeErrorResponse } from "@/lib/security/api-guard";
import { appendAuditEvent } from "@/lib/security/audit-chain";

export async function POST(request: NextRequest) {
  // Rate limit: 10 token creations per minute per IP (Redis-backed, distributed)
  const rl = await rateLimitByIPAsync(request, "dex-tokens-create", 10, 60_000);
  if (!rl.allowed) {
    void appendAuditEvent("ratelimit.tripped", { route: "dex-tokens-create" });
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const {
      name,
      symbol,
      totalSupply,
      decimals = 8,
      standard = "PT20",
    } = await request.json();

    // Validation
    if (!name || name.length < 1 || name.length > 50) {
      return NextResponse.json(
        { error: "Invalid token name" },
        { status: 400 }
      );
    }

    if (!symbol || symbol.length < 1 || symbol.length > 10) {
      return NextResponse.json(
        { error: "Invalid token symbol" },
        { status: 400 }
      );
    }

    if (totalSupply <= 0 || totalSupply > 1_000_000_000) {
      return NextResponse.json(
        { error: "Invalid total supply" },
        { status: 400 }
      );
    }

    const token = {
      id: `token_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      name,
      symbol,
      decimals,
      totalSupply,
      contractAddress: `0x${Math.random().toString(16).substring(2).padStart(40, "0")}`,
      owner: "current_user",
      createdAt: new Date().toISOString(),
      standard,
    };

    // TODO: Save to database
    // const savedToken = await db.tokens.create(token);

    return NextResponse.json(token, { status: 201 });
  } catch (err) {
    console.error("Token creation error:", safeErrorResponse(err));
    return NextResponse.json(
      { error: "Failed to create token" },
      { status: 500 }
    );
  }
}

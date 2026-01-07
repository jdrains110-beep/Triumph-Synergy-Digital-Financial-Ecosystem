/**
 * app/api/pi-dex/tokens/create/route.ts
 * Create new token endpoint
 */

import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { name, symbol, totalSupply, decimals = 8, standard = "PT20" } = await request.json();

    // Validation
    if (!name || name.length < 1 || name.length > 50) {
      return NextResponse.json({ error: "Invalid token name" }, { status: 400 });
    }

    if (!symbol || symbol.length < 1 || symbol.length > 10) {
      return NextResponse.json({ error: "Invalid token symbol" }, { status: 400 });
    }

    if (totalSupply <= 0 || totalSupply > 1_000_000_000) {
      return NextResponse.json({ error: "Invalid total supply" }, { status: 400 });
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
  } catch (error) {
    console.error("Token creation error:", error);
    return NextResponse.json({ error: "Failed to create token" }, { status: 500 });
  }
}

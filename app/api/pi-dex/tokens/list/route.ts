/**
 * app/api/pi-dex/tokens/list/route.ts
 * List all tokens endpoint
 */

import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const standard = searchParams.get("standard");
    const owner = searchParams.get("owner");
    const limit = Number.parseInt(searchParams.get("limit") || "100", 10);
    const offset = Number.parseInt(searchParams.get("offset") || "0", 10);

    // TODO: Fetch from database with filters
    // const tokens = await db.tokens.findMany({
    //   where: {
    //     ...(standard && { standard }),
    //     ...(owner && { owner }),
    //   },
    //   take: limit,
    //   skip: offset,
    // });

    const tokens = [
      {
        id: "token_example_1",
        name: "Triumph Token",
        symbol: "TMP",
        decimals: 8,
        totalSupply: 1_000_000,
        contractAddress: "0x1234567890123456789012345678901234567890",
        owner: "jdrains30",
        createdAt: new Date().toISOString(),
        standard: "PT20",
      },
    ];

    return NextResponse.json({
      tokens,
      total: tokens.length,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Token listing error:", error);
    return NextResponse.json(
      { error: "Failed to list tokens" },
      { status: 500 }
    );
  }
}

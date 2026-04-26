/**
 * @copyright Copyright (C) 2024-2026 Jeremiah Joel Drains, Founder & Superior Sovereign / Triumph Synergy. All rights reserved.
 * @license PiOS
 */
import { NextResponse } from "next/server";
import { Web3Auth } from "@/lib/web3/web3-auth";

export async function POST(request: Request) {
  try {
    const { publicKey } = await request.json();
    if (!publicKey || typeof publicKey !== "string") {
      return NextResponse.json({ error: "publicKey required" }, { status: 400 });
    }
    const result = Web3Auth.createChallenge(publicKey);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Failed to create challenge" }, { status: 500 });
  }
}

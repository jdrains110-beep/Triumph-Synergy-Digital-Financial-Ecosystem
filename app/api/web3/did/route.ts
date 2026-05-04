/**
 * @copyright Copyright (C) 2024-2026 Jeremiah Joel Drains, Founder & Superior Sovereign / Triumph Synergy. All rights reserved.
 * @license PiOS
 */
import { NextResponse } from "next/server";
import { DecentralizedIdentity } from "@/lib/web3/did";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const publicKey = searchParams.get("key");
  const network = (searchParams.get("network") || "mainnet") as "mainnet" | "testnet";

  if (!publicKey) {
    return NextResponse.json({ error: "key param required" }, { status: 400 });
  }

  try {
    const identity = DecentralizedIdentity.fromPublicKey(publicKey, network);
    return NextResponse.json(identity);
  } catch {
    return NextResponse.json({ error: "DID resolution failed" }, { status: 500 });
  }
}

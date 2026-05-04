/**
 * @copyright Copyright (C) 2024-2026 Jeremiah Joel Drains, Founder & Superior Sovereign / Triumph Synergy. All rights reserved.
 * @license PiOS
 */
import { NextResponse } from "next/server";
import { OnChainVerifier } from "@/lib/web3/on-chain-verifier";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const txHash = searchParams.get("tx");
  const network = (searchParams.get("network") || "mainnet") as "mainnet" | "testnet";

  if (!txHash) {
    return NextResponse.json({ error: "tx param required" }, { status: 400 });
  }

  try {
    const verifier = new OnChainVerifier(network);
    const result = await verifier.verifyTransaction(txHash);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ verified: false, error: "Verification failed" }, { status: 502 });
  }
}

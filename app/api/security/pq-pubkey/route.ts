import { NextResponse } from "next/server";
import { getPublicKeyHex } from "@/lib/security/pq-receipts";

/**
 * Returns the ML-DSA-65 public key used to sign payment receipts.
 * Clients can verify any receipt with this key without trusting the server.
 */
export async function GET() {
  try {
    return NextResponse.json({
      alg: "ML-DSA-65",
      publicKey: getPublicKeyHex(),
      issuedAt: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      { error: "pq_key_unavailable", message: String(err) },
      { status: 503 }
    );
  }
}

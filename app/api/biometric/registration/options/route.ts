/**
 * Biometric Registration Options Endpoint
 * GET /api/biometric/registration/options
 * Returns WebAuthn registration challenge
 */

import { NextRequest, NextResponse } from "next/server";
import { BIOMETRIC_CONFIG } from "@/lib/biometric-sdk/biometric-config";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, displayName, biometricType } = body;

    if (!userId || !displayName) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // In production, use WebAuthn service to generate options
    // Generate a random challenge
    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);

    const options = {
      challengeId: `challenge_${Date.now()}`,
      publicKey: {
        challenge,
        rp: {
          name: "Triumph Synergy",
          id: "localhost",
        },
        user: {
          id: new Uint8Array(Buffer.from(userId)),
          name: userId,
          displayName,
        },
        pubKeyCredParams: [
          { alg: -7, type: "public-key" },
          { alg: -257, type: "public-key" },
        ],
        timeout: 60000,
        attestation: "direct",
        userVerification: "preferred",
      },
    };

    return NextResponse.json(
      {
        challengeId: options.challengeId,
        publicKey: options.publicKey,
        config: {
          timeout: BIOMETRIC_CONFIG.registration.timeout,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Registration options error:", error);
    return NextResponse.json(
      { error: "Failed to get registration options" },
      { status: 500 }
    );
  }
}

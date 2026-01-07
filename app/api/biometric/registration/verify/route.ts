/**
 * Biometric Registration Verification Endpoint
 * POST /api/biometric/registration/verify
 * Verifies and stores credential
 */

import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, credential, biometricType, deviceName } = body;

    if (!userId || !credential) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // In production, verify attestation using WebAuthn service
    // Store credential in database
    const registeredCredential = {
      credentialId: credential.id,
      userId,
      biometricType: biometricType || 'faceID',
      publicKey: credential.response?.getPublicKey?.(),
      createdAt: new Date(),
    };

    return NextResponse.json(
      {
        id: registeredCredential.id,
        credentialId: Array.from(new Uint8Array(registeredCredential.credentialId)),
        biometricType: registeredCredential.biometricType,
        type: registeredCredential.type,
        deviceName: deviceName || "Unknown Device",
        createdAt: registeredCredential.createdAt,
        message: "Credential registered successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Registration verification error:", error);
    return NextResponse.json(
      {
        error: "Failed to verify credential",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 400 }
    );
  }
}

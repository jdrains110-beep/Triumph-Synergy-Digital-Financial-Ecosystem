/**
 * POST /api/biometric/authenticate/verify
 * Verify biometric authentication and issue session token
 */

import crypto from "crypto";
import { SignJWT } from "jose";
import { type NextRequest, NextResponse } from "next/server";
import { WebAuthnService } from "@/lib/biometric/webauthn-service";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-secret-key-change-in-production"
);

export async function POST(request: NextRequest) {
  try {
    const { userId, credential, challenge } = await request.json();

    if (!userId || !credential || !challenge) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // TODO: Retrieve stored challenge from cache
    // const storedChallenge = await cache.get(`webauthn_auth_challenge_${userId}`);
    // if (!storedChallenge || storedChallenge !== challenge) {
    //   return NextResponse.json(
    //     { error: 'Challenge verification failed' },
    //     { status: 400 }
    //   );
    // }

    // TODO: Fetch user's credential from database
    // const storedCredential = await db.biometricCredential.findUnique({
    //   where: { id: credential.id },
    // });

    // Mock stored credential
    const storedCredential = {
      id: credential.id,
      publicKey: "",
      counter: 0,
      aaguid: "",
      createdAt: new Date(),
    };

    if (!storedCredential) {
      return NextResponse.json(
        { error: "Credential not found" },
        { status: 404 }
      );
    }

    // Verify authentication response
    const service = new WebAuthnService();

    // Convert credential for verification
    const credentialForVerification = {
      ...credential,
      rawId: Buffer.from(credential.rawId, "base64"),
      response: {
        ...credential.response,
        clientDataJSON: Buffer.from(
          credential.response.clientDataJSON,
          "base64"
        ),
        authenticatorData: Buffer.from(
          credential.response.authenticatorData,
          "base64"
        ),
        signature: Buffer.from(credential.response.signature, "base64"),
        userHandle: credential.response.userHandle
          ? Buffer.from(credential.response.userHandle, "base64")
          : null,
      },
    };

    const { valid, newCounter } = await service.verifyAuthenticationResponse(
      credentialForVerification as any,
      challenge,
      storedCredential as any
    );

    if (!valid) {
      return NextResponse.json(
        { error: "Authentication verification failed" },
        { status: 401 }
      );
    }

    // TODO: Update counter in database
    // await db.biometricCredential.update({
    //   where: { id: credential.id },
    //   data: { counter: newCounter, lastUsedAt: new Date() },
    // });

    // Generate session token
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const token = await new SignJWT({
      sub: userId,
      sid: sessionId,
      credentialId: credential.id,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(expiresAt.getTime() / 1000),
    })
      .setProtectedHeader({ alg: "HS256" })
      .sign(JWT_SECRET);

    // TODO: Store session in database
    // await db.biometricSession.create({
    //   data: {
    //     id: sessionId,
    //     userId,
    //     credentialId: credential.id,
    //     token,
    //     expiresAt,
    //     createdAt: new Date(),
    //   },
    // });

    // Set session cookie
    const response = NextResponse.json({
      sessionToken: token,
      expiresAt,
      sessionId,
    });

    response.cookies.set({
      name: "biometric_session",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60,
    });

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Error verifying authentication:", error);
    return NextResponse.json(
      { error: `Authentication verification failed: ${message}` },
      { status: 400 }
    );
  }
}

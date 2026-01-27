/**
 * POST /api/biometric/authenticate/initiate
 * Generate WebAuthn authentication options
 */

import { type NextRequest, NextResponse } from "next/server";
import {
  type BiometricCredential,
  WebAuthnService,
} from "@/lib/biometric/webauthn-service";
import { base64url } from "@/lib/utils/base64url";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 });
    }

    // TODO: Fetch user's credentials from database
    // const credentials = await db.biometricCredential.findMany({
    //   where: { userId },
    //   select: { id: true, counter: true, publicKey: true, transports: true },
    // });

    // Mock credentials
    const mockCredentials: BiometricCredential[] = [
      {
        id: base64url.fromBuffer(new TextEncoder().encode("cred_1")),
        counter: 0,
        publicKey: "",
        aaguid: "",
        createdAt: new Date(),
        transports: ["platform" as any],
      },
    ];

    if (mockCredentials.length === 0) {
      return NextResponse.json(
        { error: "No credentials registered for this user" },
        { status: 404 }
      );
    }

    // Generate authentication options
    const service = new WebAuthnService();
    const options = await service.generateAuthenticationOptions(
      { userId },
      mockCredentials
    );

    // Convert challenge
    const challenge = base64url.fromBuffer(
      Buffer.from(options.challenge as ArrayBuffer)
    );

    // TODO: Store challenge in cache
    // await cache.set(`webauthn_auth_challenge_${userId}`, challenge, 300);

    const authOptions = {
      ...options,
      challenge,
      allowCredentials: options.allowCredentials?.map((cred) => ({
        ...cred,
        id: cred.id
          ? base64url.fromBuffer(Buffer.from(cred.id as ArrayBuffer))
          : undefined,
      })),
    } as any;

    return NextResponse.json({
      options: authOptions,
      challenge,
    });
  } catch (error) {
    console.error("Error generating authentication options:", error);
    return NextResponse.json(
      { error: "Failed to generate authentication options" },
      { status: 500 }
    );
  }
}

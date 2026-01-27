/**
 * POST /api/biometric/register/initiate
 * Generate WebAuthn registration options
 */

import { type NextRequest, NextResponse } from "next/server";
import { WebAuthnService } from "@/lib/biometric/webauthn-service";
import { base64url } from "@/lib/utils/base64url";

export async function POST(request: NextRequest) {
  try {
    const { userId, username, displayName, credentialName } =
      await request.json();

    if (!userId || !username || !displayName) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Generate registration options
    const service = new WebAuthnService();
    const options = await service.generateRegistrationOptions({
      userId,
      username,
      displayName,
      credentialName,
    });

    // Convert challenge to base64url for transmission
    const challenge = base64url.fromBuffer(
      Buffer.from(options.challenge as ArrayBuffer)
    );

    // TODO: Store challenge in session/cache for verification
    // await cache.set(`webauthn_challenge_${userId}`, challenge, 300); // 5 min TTL

    // Convert other buffers
    const registrationOptions = {
      ...options,
      challenge,
      user: {
        ...options.user,
        id: base64url.fromBuffer(Buffer.from(options.user.id as ArrayBuffer)),
      },
    };

    return NextResponse.json({
      options: registrationOptions,
      challenge,
    });
  } catch (error) {
    console.error("Error generating registration options:", error);
    return NextResponse.json(
      { error: "Failed to generate registration options" },
      { status: 500 }
    );
  }
}

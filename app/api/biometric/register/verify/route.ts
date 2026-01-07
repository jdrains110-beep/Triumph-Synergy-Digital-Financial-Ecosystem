/**
 * POST /api/biometric/register/verify
 * Verify and store biometric credential registration
 */

import { NextRequest, NextResponse } from 'next/server';
import { WebAuthnService, RegistrationResponseJSON, BiometricCredential } from '@/lib/biometric/webauthn-service';

export async function POST(request: NextRequest) {
  try {
    const { userId, credential, challenge, credentialName } = await request.json();

    if (!userId || !credential || !challenge) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // TODO: Retrieve stored challenge from session/cache
    // const storedChallenge = await cache.get(`webauthn_challenge_${userId}`);
    // if (!storedChallenge || storedChallenge !== challenge) {
    //   return NextResponse.json(
    //     { error: 'Challenge verification failed' },
    //     { status: 400 }
    //   );
    // }

    // Verify registration response
    const service = new WebAuthnService();
    
    // Convert credential for verification
    const credentialForVerification = {
      ...credential,
      rawId: Buffer.from(credential.rawId, 'base64'),
      response: {
        ...credential.response,
        clientDataJSON: Buffer.from(credential.response.clientDataJSON, 'base64'),
        attestationObject: Buffer.from(credential.response.attestationObject, 'base64'),
      },
    };

    const biometricCredential = await service.verifyRegistrationResponse(
      credentialForVerification as any,
      challenge,
      userId
    );

    // Apply user-provided name if given
    if (credentialName) {
      biometricCredential.name = credentialName;
    }

    // TODO: Store in database
    // const stored = await db.biometricCredential.create({
    //   data: {
    //     userId,
    //     id: biometricCredential.id,
    //     publicKey: biometricCredential.publicKey,
    //     counter: biometricCredential.counter,
    //     transports: biometricCredential.transports,
    //     aaguid: biometricCredential.aaguid,
    //     credentialDeviceType: biometricCredential.credentialDeviceType,
    //     name: biometricCredential.name,
    //     createdAt: biometricCredential.createdAt,
    //   },
    // });

    return NextResponse.json({
      biometricCredential: {
        id: biometricCredential.id,
        name: biometricCredential.name,
        createdAt: biometricCredential.createdAt,
        credentialDeviceType: biometricCredential.credentialDeviceType,
        aaguid: biometricCredential.aaguid,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error verifying registration:', error);
    return NextResponse.json(
      { error: `Registration verification failed: ${message}` },
      { status: 400 }
    );
  }
}

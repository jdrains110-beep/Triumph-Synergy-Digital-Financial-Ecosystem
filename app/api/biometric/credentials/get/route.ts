/**
 * GET /api/biometric/credentials
 * Fetch user's registered biometric credentials
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Get user from session/JWT
    const userId = request.headers.get('X-User-ID');

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // TODO: Fetch from database
    // const credentials = await db.biometricCredential.findMany({
    //   where: { userId },
    //   select: {
    //     id: true,
    //     name: true,
    //     createdAt: true,
    //     lastUsedAt: true,
    //     credentialDeviceType: true,
    //     aaguid: true,
    //   },
    // });

    // Mock response
    const credentials = [
      {
        id: 'cred_1',
        name: 'iPhone Face ID',
        createdAt: new Date(),
        lastUsedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        credentialDeviceType: 'single_device',
        aaguid: '00000000000000000000000000000000',
      },
    ];

    return NextResponse.json({ credentials });
  } catch (error) {
    console.error('Error fetching credentials:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

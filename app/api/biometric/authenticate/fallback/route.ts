import { NextRequest, NextResponse } from 'next/server';
import { getSecureStorage } from '@/lib/biometric/secure-storage';
import crypto from 'crypto';

// Simple JWT token generation (in production, use proper JWT library)
function generateToken(payload: any, secret: string = 'biometric-secret'): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(`${header}.${body}`);
  const signature = hmac.digest('base64url');
  
  return `${header}.${body}.${signature}`;
}

export async function POST(request: NextRequest) {
  try {
    const { userId, pin } = await request.json();

    if (!userId || !pin) {
      return NextResponse.json(
        { error: 'User ID and PIN are required' },
        { status: 400 }
      );
    }

    // TODO: Fetch user from database
    // const user = await db.user.findUnique({
    //   where: { id: userId },
    //   select: { id: true, pinHash: true },
    // });

    // Mock user with PIN hash
    const storage = getSecureStorage();
    const mockPinHash = storage.hashPassword('1234'); // Mock PIN: 1234

    // In production, this should verify against stored hash
    const isValid = storage.verifyPassword(pin, mockPinHash);

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid PIN' },
        { status: 401 }
      );
    }

    // Generate session token
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const token = generateToken({
      sub: userId,
      sid: sessionId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(expiresAt.getTime() / 1000),
      method: 'pin',
    });

    // TODO: Log authentication attempt
    // await db.authenticationLog.create({
    //   data: {
    //     userId,
    //     method: 'pin',
    //     success: true,
    //     ipAddress: request.ip,
    //     userAgent: request.headers.get('user-agent'),
    //   },
    // });

    const response = NextResponse.json({
      sessionToken: token,
      expiresAt,
      sessionId,
    });

    response.cookies.set({
      name: 'biometric_session',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60,
    });

    return response;
  } catch (error) {
    console.error('Error in fallback authentication:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}

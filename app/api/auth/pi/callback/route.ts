/**
 * Pi Network OAuth Callback Handler
 * Handles authentication callbacks from Pi Network
 */

import { type NextRequest, NextResponse } from "next/server";

// ============================================================================
// TYPES
// ============================================================================

type PiAuthCallback = {
  user: {
    uid: string;
    username: string;
  };
  accessToken: string;
};

// ============================================================================
// MAIN HANDLER
// ============================================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    // Handle errors
    if (error) {
      console.error("❌ Pi Auth error:", error);
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(error)}`, request.url)
      );
    }

    // Validate code
    if (!code) {
      return NextResponse.redirect(
        new URL("/login?error=missing_code", request.url)
      );
    }

    console.log("✅ Pi Auth callback received with code");

    // Exchange code for access token
    const tokenResponse = await exchangeCodeForToken(code);

    if (!tokenResponse) {
      return NextResponse.redirect(
        new URL("/login?error=token_exchange_failed", request.url)
      );
    }

    // Set session/cookie (simplified - in production use proper session management)
    const response = NextResponse.redirect(new URL("/dashboard", request.url));

    response.cookies.set(
      "pi_user",
      JSON.stringify({
        uid: tokenResponse.user.uid,
        username: tokenResponse.user.username,
      }),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7, // 7 days
      }
    );

    console.log("✅ User authenticated:", tokenResponse.user.username);

    return response;
  } catch (error) {
    console.error("❌ Pi Auth callback error:", error);
    return NextResponse.redirect(
      new URL("/login?error=callback_failed", request.url)
    );
  }
}

async function exchangeCodeForToken(
  code: string
): Promise<PiAuthCallback | null> {
  try {
    // In production, this would call Pi Network's token endpoint
    // For now, we'll simulate the exchange
    const response = await fetch("https://api.minepi.com/v2/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Key ${process.env.PI_API_KEY}`,
      },
      body: JSON.stringify({
        grant_type: "authorization_code",
        code,
        client_id: process.env.NEXT_PUBLIC_PI_APP_ID,
        client_secret: process.env.PI_API_SECRET,
      }),
    });

    if (!response.ok) {
      console.error("❌ Token exchange failed:", response.status);
      return null;
    }

    const data = await response.json();
    return data as PiAuthCallback;
  } catch (error) {
    console.error("❌ Token exchange error:", error);
    return null;
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Handle POST requests for token-based auth
  try {
    const body = await request.json();
    const { accessToken, user } = body;

    if (!accessToken || !user) {
      return NextResponse.json(
        { error: "Missing access token or user data" },
        { status: 400 }
      );
    }

    // Verify the access token with Pi Network
    const verified = await verifyAccessToken(accessToken);

    if (!verified) {
      return NextResponse.json(
        { error: "Invalid access token" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        uid: user.uid,
        username: user.username,
      },
      authenticated: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Auth POST error:", error);
    return NextResponse.json(
      { error: "Authentication failed" },
      { status: 500 }
    );
  }
}

async function verifyAccessToken(accessToken: string): Promise<boolean> {
  try {
    const response = await fetch("https://api.minepi.com/v2/me", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return response.ok;
  } catch {
    return false;
  }
}

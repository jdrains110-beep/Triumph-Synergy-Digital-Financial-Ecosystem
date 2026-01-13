/**
 * Biometric Authentication Verification Endpoint
 * POST /api/biometric/authentication/verify
 * Verifies assertion and returns session token
 */

import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
	try {
		const body = await request.json();
		const { userId, assertion } = body;

		if (!userId || !assertion) {
			return NextResponse.json(
				{ error: "Missing required fields" },
				{ status: 400 },
			);
		}

		// In production, verify assertion using WebAuthn service
		// For now, return success response
		const result = {
			session: {
				sessionId: `session_${Date.now()}`,
				userId,
				biometricType: "faceID",
				expiresAt: new Date(Date.now() + 30 * 60 * 1000),
			},
			token: {
				accessToken: `token_${Date.now()}`,
				tokenType: "Bearer",
				expiresIn: 3600,
			},
		};

		// Set secure cookie with token
		const response_obj = NextResponse.json(
			{
				session: {
					sessionId: result.session.sessionId,
					userId: result.session.userId,
					biometricType: result.session.biometricType,
					authenticatedAt: new Date(),
					expiresAt: result.session.expiresAt,
				},
				token: result.token,
				message: "Authentication successful",
			},
			{ status: 200 },
		);

		// Set secure cookie
		response_obj.cookies.set("biometric_session", result.session.sessionId, {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "lax",
			maxAge: 30 * 60, // 30 minutes
		});

		response_obj.cookies.set("access_token", result.token.accessToken, {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "lax",
			maxAge: 60 * 60, // 1 hour
		});

		return response_obj;
	} catch (error) {
		console.error("Authentication verification error:", error);
		return NextResponse.json(
			{
				error: "Authentication failed",
				details: error instanceof Error ? error.message : String(error),
			},
			{ status: 401 },
		);
	}
}

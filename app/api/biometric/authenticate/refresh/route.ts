/**
 * POST /api/biometric/authenticate/refresh
 * Refresh biometric session token
 */

import crypto from "crypto";
import { jwtVerify, SignJWT } from "jose";
import { type NextRequest, NextResponse } from "next/server";

const JWT_SECRET = new TextEncoder().encode(
	process.env.JWT_SECRET || "dev-secret-key-change-in-production",
);

export async function POST(request: NextRequest) {
	try {
		const authHeader = request.headers.get("Authorization");
		const token = authHeader?.replace("Bearer ", "");

		if (!token) {
			return NextResponse.json(
				{ error: "Missing authentication token" },
				{ status: 401 },
			);
		}

		// Verify current token
		let payload;
		try {
			const verified = await jwtVerify(token, JWT_SECRET);
			payload = verified.payload;
		} catch (error) {
			return NextResponse.json(
				{ error: "Invalid or expired token" },
				{ status: 401 },
			);
		}

		// Create new token
		const sessionId = crypto.randomUUID();
		const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

		const newToken = await new SignJWT({
			sub: payload.sub,
			sid: sessionId,
			credentialId: payload.credentialId,
			iat: Math.floor(Date.now() / 1000),
			exp: Math.floor(expiresAt.getTime() / 1000),
		})
			.setProtectedHeader({ alg: "HS256" })
			.sign(JWT_SECRET);

		const response = NextResponse.json({
			sessionToken: newToken,
			expiresAt,
			sessionId,
		});

		response.cookies.set({
			name: "biometric_session",
			value: newToken,
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "lax",
			maxAge: 24 * 60 * 60,
		});

		return response;
	} catch (error) {
		console.error("Error refreshing session:", error);
		return NextResponse.json(
			{ error: "Failed to refresh session" },
			{ status: 500 },
		);
	}
}

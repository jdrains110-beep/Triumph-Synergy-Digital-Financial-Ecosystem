/**
 * Get User Credentials Endpoint
 * GET /api/biometric/credentials
 * Returns all biometric credentials for a user
 */

import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
	try {
		const userId = request.headers.get("X-User-ID");

		if (!userId) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
		//   },
		// });

		// Mock response for development
		const credentials = [
			{
				id: "cred_1",
				name: "iPhone Face ID",
				createdAt: new Date(),
				lastUsedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
				credentialDeviceType: "single_device",
			},
		];

		return NextResponse.json(
			{
				credentials: credentials.map((c) => ({
					id: c.id,
					name: c.name,
					createdAt: c.createdAt,
					lastUsedAt: c.lastUsedAt,
					credentialDeviceType: c.credentialDeviceType,
				})),
				count: credentials.length,
			},
			{ status: 200 },
		);
	} catch (error) {
		console.error("Get credentials error:", error);
		return NextResponse.json(
			{ error: "Failed to retrieve credentials" },
			{ status: 500 },
		);
	}
}

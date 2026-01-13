/**
 * Initialize Streaming Session API
 * POST /api/streaming/sessions/init
 */

import { type NextRequest, NextResponse } from "next/server";
import { streamingManager } from "@/lib/streaming-sdk/streaming";

export async function POST(request: NextRequest) {
	try {
		const { userId, title, description, category, tags, isPublic } =
			await request.json();

		// Validate inputs
		if (!userId || !title) {
			return NextResponse.json(
				{ error: "Missing required fields: userId, title" },
				{ status: 400 },
			);
		}

		// Initialize session
		const session = await streamingManager.initializeSession(
			userId,
			title,
			description,
			{
				category,
				tags,
				isPublic,
			},
		);

		return NextResponse.json({
			success: true,
			session,
		});
	} catch (error: any) {
		return NextResponse.json(
			{ error: error.message || "Failed to initialize session" },
			{ status: 500 },
		);
	}
}

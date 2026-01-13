/**
 * Get AI Recommendations API
 * GET /api/streaming/recommendations/[userId]
 */

import { type NextRequest, NextResponse } from "next/server";

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ userId: string }> },
) {
	try {
		const { userId } = await params;

		if (!userId) {
			return NextResponse.json(
				{ error: "Missing required field: userId" },
				{ status: 400 },
			);
		}

		// Mock AI recommendations
		const recommendations = [
			{
				id: "rec_1",
				title: "Gaming Highlights - React Hooks Deep Dive",
				thumbnail: "https://via.placeholder.com/300x170?text=Gaming",
				category: "Technology",
				relevanceScore: 0.95,
				reason: "Based on your recent streams",
				isLive: false,
			},
			{
				id: "rec_2",
				title: "Live Coding Session with WebAssembly",
				thumbnail: "https://via.placeholder.com/300x170?text=Coding",
				category: "Programming",
				relevanceScore: 0.88,
				reason: "Trending in your interests",
				isLive: true,
			},
			{
				id: "rec_3",
				title: "Advanced TypeScript Patterns",
				thumbnail: "https://via.placeholder.com/300x170?text=TypeScript",
				category: "Education",
				relevanceScore: 0.82,
				reason: "Popular with similar viewers",
				isLive: false,
			},
			{
				id: "rec_4",
				title: "Full-Stack Web Performance",
				thumbnail: "https://via.placeholder.com/300x170?text=Performance",
				category: "Technology",
				relevanceScore: 0.79,
				reason: "Viewers who watched similar content",
				isLive: true,
			},
		];

		return NextResponse.json({
			success: true,
			userId,
			recommendations,
			algorithm: "Collaborative Filtering + Content-Based",
			updateTime: new Date(),
		});
	} catch (error: any) {
		return NextResponse.json(
			{ error: error.message || "Failed to get recommendations" },
			{ status: 500 },
		);
	}
}

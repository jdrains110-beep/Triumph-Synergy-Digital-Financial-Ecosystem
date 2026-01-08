/**
 * Get Stream Analytics API
 * GET /api/streaming/analytics/[sessionId]
 */

import { type NextRequest, NextResponse } from "next/server";
import { streamingManager } from "@/lib/streaming-sdk/streaming";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;

    if (!sessionId) {
      return NextResponse.json(
        { error: "Missing required field: sessionId" },
        { status: 400 }
      );
    }

    const analytics = streamingManager.getSessionAnalytics(sessionId);

    return NextResponse.json({
      success: true,
      analytics,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to get analytics" },
      { status: 500 }
    );
  }
}

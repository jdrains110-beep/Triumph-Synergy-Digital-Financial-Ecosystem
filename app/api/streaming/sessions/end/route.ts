/**
 * End Streaming API
 * POST /api/streaming/sessions/end
 */

import { streamingManager } from "@/lib/streaming-sdk/streaming";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: "Missing required field: sessionId" },
        { status: 400 }
      );
    }

    const result = await streamingManager.endStream(sessionId);

    return NextResponse.json({
      success: true,
      duration: result.duration,
      viewerCount: result.viewerCount,
      recordingId: result.recordingId,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to end stream" },
      { status: 500 }
    );
  }
}

/**
 * Start Streaming API
 * POST /api/streaming/sessions/start
 */

import { type NextRequest, NextResponse } from "next/server";
import { streamingManager } from "@/lib/streaming-sdk/streaming";

export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: "Missing required field: sessionId" },
        { status: 400 }
      );
    }

    const result = await streamingManager.startStream(sessionId);

    return NextResponse.json({
      success: true,
      streamKey: result.streamKey,
      rtmpUrl: `rtmps://live.agora.io/${sessionId}`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to start stream" },
      { status: 500 }
    );
  }
}

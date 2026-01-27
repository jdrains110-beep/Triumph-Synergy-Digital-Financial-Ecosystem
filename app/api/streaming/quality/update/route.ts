/**
 * Update Stream Quality API
 * POST /api/streaming/quality/update
 */

import { type NextRequest, NextResponse } from "next/server";
import { streamingManager } from "@/lib/streaming-sdk/streaming";

export async function POST(request: NextRequest) {
  try {
    const { sessionId, quality } = await request.json();

    if (!sessionId || !quality) {
      return NextResponse.json(
        { error: "Missing required fields: sessionId, quality" },
        { status: 400 }
      );
    }

    const result = await streamingManager.updateQuality(sessionId, quality);

    return NextResponse.json({
      success: true,
      quality,
      bitrate: result.bitrate,
      recommendation: `Streaming in ${quality} at ${result.bitrate} kb/s`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to update quality" },
      { status: 500 }
    );
  }
}

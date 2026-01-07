/**
 * Bandwidth Recommendation API
 * POST /api/streaming/bandwidth/recommend
 */

import { streamingManager } from "@/lib/streaming-sdk/streaming";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { bandwidth } = await request.json();

    if (bandwidth === undefined) {
      return NextResponse.json(
        { error: "Missing required field: bandwidth" },
        { status: 400 }
      );
    }

    const result = streamingManager.checkBandwidthAndRecommend(bandwidth);

    return NextResponse.json({
      success: true,
      recommendedQuality: result.quality,
      bitrate: result.bitrate,
      recommendation: result.recommendation,
      bandwidth,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to get recommendation" },
      { status: 500 }
    );
  }
}

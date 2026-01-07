/**
 * Create Watch Party API
 * POST /api/streaming/watch-party/create
 */

import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { sessionId, hostId } = await request.json();

    if (!sessionId || !hostId) {
      return NextResponse.json(
        { error: "Missing required fields: sessionId, hostId" },
        { status: 400 }
      );
    }

    // Generate watch party code
    const partyCode = `PARTY-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    return NextResponse.json({
      success: true,
      partyCode,
      partyId: `party_${Date.now()}`,
      sessionId,
      hostId,
      participants: [hostId],
      maxParticipants: 100,
      createdAt: new Date(),
      isSynced: true,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create watch party" },
      { status: 500 }
    );
  }
}

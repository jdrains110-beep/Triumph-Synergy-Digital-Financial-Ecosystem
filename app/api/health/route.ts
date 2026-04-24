import { type NextRequest, NextResponse } from "next/server";

export function GET(_request: NextRequest) {
  try {
    return NextResponse.json(
      { status: "healthy", timestamp: new Date().toISOString() },
      { status: 200 }
    );
  } catch (_error) {
    return NextResponse.json({ status: "unhealthy" }, { status: 500 });
  }
}

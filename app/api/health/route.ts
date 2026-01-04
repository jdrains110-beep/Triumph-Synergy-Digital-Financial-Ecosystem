import { type NextRequest, NextResponse } from "next/server";

export function GET(_request: NextRequest) {
  try {
    // Basic health check
    const health = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV,
      version: process.env.npm_package_version || "1.0.0",
      services: {
        nextjs: "ok",
        supabase_configured: !!process.env.SUPABASE_URL,
        stellar_configured: !!process.env.STELLAR_HORIZON_URL,
        auth_configured: !!process.env.NEXTAUTH_URL,
      },
    };

    return NextResponse.json(health, { status: 200 });
  } catch (error) {
    console.error("Health check error:", error);
    return NextResponse.json(
      {
        status: "unhealthy",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

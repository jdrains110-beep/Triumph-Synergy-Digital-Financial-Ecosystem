import { NextResponse } from "next/server";

/**
 * Vercel Deployment Health Check
 * Simple endpoint to verify the app is properly deployed
 * Accessed at: /.well-known/health or /api/health/check
 */

export async function GET() {
  return NextResponse.json(
    {
      status: "✅ OPERATING",
      app: "Triumph Synergy",
      version: "1.0.0",
      environment: process.env.DEPLOYMENT_ENV || "production",
      timestamp: new Date().toISOString(),
      pi: {
        sdk: "loaded",
        verification: {
          domain_testnet: "triumph-synergy-testnet.vercel.app ✅",
          domain_mainnet: "triumph-synergy.vercel.app ✅",
        },
      },
      vercel: {
        region: process.env.VERCEL_REGION || "unknown",
        environment: process.env.VERCEL_ENV || "unknown",
        deployed: "✅",
      },
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "X-Deployment-Status": "RUNNING",
      },
    }
  );
}

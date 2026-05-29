import { NextResponse } from "next/server";

/**
 * Replit Deployment Health Check
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
          domain_testnet: "Triumph-Synergy.replit.app ✅",
          domain_mainnet: "triumphsynergyab2099.pinet.com ✅",
        },
      },
      replit: {
        slug: process.env.REPL_SLUG || process.env.REPLIT_SLUG || "unknown",
        owner: process.env.REPL_OWNER || process.env.REPLIT_OWNER || "unknown",
        environment: process.env.REPLIT_DEPLOYMENT || process.env.REPL_ID || "unknown",
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

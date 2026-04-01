/**
 * app/api/deployment-info/route.ts
 * Returns diagnostic info about the deployment
 */

import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const hostname = request.nextUrl.hostname;
  const protocol = request.nextUrl.protocol;
  const pathname = request.nextUrl.pathname;

  return NextResponse.json({
    status: "ok",
    message: "Triumph Synergy deployment is running",
    deployment: {
      timestamp: new Date().toISOString(),
      hostname,
      protocol,
      pathname,
      isProduction: process.env.NODE_ENV === "production",
      vercelEnv: process.env.VERCEL === "1" ? "vercel" : "other",
    },
    expectedDomainsForPiAppStudio: [
      "triumph-synergy.vercel.app",
      "triumph-synergy-testnet.vercel.app",
      "triumphsynergy0576.pinet.com",
      "triumphsynergy7386.pinet.com",
      "triumphsynergy1991.pinet.com",
    ],
    currentDomain: {
      hostname,
      isExpected: [
        "triumph-synergy.vercel.app",
        "triumph-synergy-testnet.vercel.app",
        "triumphsynergy0576.pinet.com",
        "triumphsynergy7386.pinet.com",
        "triumphsynergy1991.pinet.com",
      ].includes(hostname),
      message:
        hostname.includes("-jeremiah-drains-projects.vercel.app")
          ? "⚠️ PREVIEW URL DETECTED - Should redirect to production"
          : "✅ Production domain",
    },
    nextSteps: [
      "1. Check /diagnostic page",
      "2. Check /api/pi/status for Pi SDK status",
      "3. Check /pi-app-studio-verify for full integration check",
    ],
  });
}

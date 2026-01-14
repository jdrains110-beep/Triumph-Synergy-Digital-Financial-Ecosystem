/**
 * Pi Network Domain Verification Endpoint
 * This endpoint proves domain ownership to Pi Network
 */

import { NextResponse } from "next/server";

export async function GET() {
  // Replace with your actual verification token from Pi Developer Portal
  const verificationToken = process.env.PI_DOMAIN_VERIFICATION_TOKEN || "";

  return NextResponse.json({
    domain: "triumph-synergy.vercel.app",
    appId: process.env.NEXT_PUBLIC_PI_APP_ID || "",
    verification: verificationToken,
    timestamp: new Date().toISOString(),
  });
}

import { NextResponse } from "next/server";

/**
 * MAINNET-ONLY Validation Key
 * Use this URL in developers.minepi.com portal to avoid conflicts with testnet
 */
export async function GET() {
  const mainnetKey = "efee2c5a2ce4e5079efeb7eb88e9460f8928f87e900d1fb2075b3f6279fb5b612550875c1fb8b0f1b749b96028e66c833bfc6e52011997a4c38d3252e7b2b195";
  
  return new NextResponse(mainnetKey, {
    status: 200,
    headers: {
      "Content-Type": "text/plain",
      "Cache-Control": "public, max-age=3600",
      "X-Pi-Verification": "mainnet",
    },
  });
}

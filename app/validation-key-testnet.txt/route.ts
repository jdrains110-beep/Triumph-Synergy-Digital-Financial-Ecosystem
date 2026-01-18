import { NextResponse } from "next/server";

/**
 * TESTNET-ONLY Validation Key
 * Use this URL in develop.pi portal to avoid conflicts with mainnet
 */
export async function GET() {
  const testnetKey = "75b333f8b28771b24f2fb6adb87b225cc1b58eef8bd5a747d388a98dca1084e331eebc385c6a63885a887f4a0382bc883adeeeccdce9240b4cb8c10faaed93a3";
  
  return new NextResponse(testnetKey, {
    status: 200,
    headers: {
      "Content-Type": "text/plain",
      "Cache-Control": "public, max-age=3600",
      "X-Pi-Verification": "testnet",
    },
  });
}

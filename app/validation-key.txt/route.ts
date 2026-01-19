import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const testnetKey = "75b333f8b28771b24f2fb6adb87b225cc1b58eef8bd5a747d388a98dca1084e331eebc385c6a63885a887f4a0382bc883adeeeccdce9240b4cb8c10faaed93a3";
  const mainnetKey = "efee2c5a2ce4e5079efeb7eb88e9460f8928f87e900d1fb2075b3f6279fb5b612550875c1fb8b0f1b749b96028e66c833bfc6e52011997a4c38d3252e7b2b195";

  // Detect which domain is being accessed
  const host = request.headers.get("host") || "";
  
  // Mainnet domain
  if (host.includes("triumphsynergy7386")) {
    return new NextResponse(mainnetKey, {
      status: 200,
      headers: {
        "Content-Type": "text/plain",
        "Cache-Control": "public, max-age=3600",
        "X-Pi-Verification": "mainnet",
      },
    });
  }
  
  // Testnet domain
  if (host.includes("triumphsynergy1991")) {
    return new NextResponse(testnetKey, {
      status: 200,
      headers: {
        "Content-Type": "text/plain",
        "Cache-Control": "public, max-age=3600",
        "X-Pi-Verification": "testnet",
      },
    });
  }

  // Default to mainnet
  return new NextResponse(mainnetKey, {
    status: 200,
    headers: {
      "Content-Type": "text/plain",
      "Cache-Control": "public, max-age=3600",
      "X-Pi-Verification": "mainnet",
    },
  });
}

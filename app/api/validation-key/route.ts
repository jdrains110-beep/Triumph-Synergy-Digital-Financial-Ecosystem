import { NextResponse } from "next/server";
import { headers } from "next/headers";

export async function GET(request: Request) {
  const headersList = await headers();
  const referer = headersList.get("referer") || "";
  const origin = headersList.get("origin") || "";
  
  // Parse URL for query parameters
  const url = new URL(request.url);
  const mode = url.searchParams.get("mode");
  
  // Testnet key
  const testnetKey = "75b333f8b28771b24f2fb6adb87b225cc1b58eef8bd5a747d388a98dca1084e331eebc385c6a63885a887f4a0382bc883adeeeccdce9240b4cb8c10faaed93a3";
  // Mainnet key
  const mainnetKey = "efee2c5a2ce4e5079efeb7eb88e9460f8928f87e900d1fb2075b3f6279fb5b612550875c1fb8b0f1b749b96028e66c833bfc6e52011997a4c38d3252e7b2b195";
  
  // Smart detection: which Pi portal is requesting?
  // DEFAULT TO MAINNET - main branch serves mainnet
  let validationKey = mainnetKey; // Default to mainnet
  let detectedMode = "mainnet";
  
  if (mode === "testnet") {
    validationKey = testnetKey;
    detectedMode = "testnet";
  } else if (mode === "mainnet") {
    validationKey = mainnetKey;
    detectedMode = "mainnet";
  } else if (referer.includes("develop.pi") || origin.includes("develop.pi")) {
    validationKey = testnetKey;
    detectedMode = "testnet";
  } else if (referer.includes("developers.minepi.com") || origin.includes("developers.minepi.com")) {
    validationKey = mainnetKey;
    detectedMode = "mainnet";
  } else if (referer.includes("testnet") || referer.includes(".sandbox.")) {
    validationKey = testnetKey;
    detectedMode = "testnet";
  }

  return new NextResponse(validationKey, {
    status: 200,
    headers: {
      "Content-Type": "text/plain",
      "Cache-Control": "public, max-age=3600",
      "X-Pi-Verification": detectedMode,
    },
  });
}

import { NextResponse, type NextRequest } from "next/server";
import { verifyPiNodeSignature } from "@/lib/pi-node/crypto";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    publicKey?: string;
    message?: string;
    signature?: string;
  };

  if (!body.publicKey || !body.message || !body.signature) {
    return NextResponse.json(
      { error: "publicKey, message, and signature are required" },
      { status: 400 }
    );
  }

  const verified = verifyPiNodeSignature({
    publicKey: body.publicKey,
    message: body.message,
    signature: body.signature,
  });

  return NextResponse.json({
    verified,
  });
}

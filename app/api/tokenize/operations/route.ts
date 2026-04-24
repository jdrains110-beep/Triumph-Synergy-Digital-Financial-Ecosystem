// app/api/tokenize/operations/route.ts
// Token operations: mint, transfer, burn

import { type NextRequest, NextResponse } from "next/server";
import { tokenizationEngine } from "@/lib/blockchain/tokenization-engine";

/**
 * POST /api/tokenize/operations
 * Execute token operations (mint, transfer, burn)
 *
 * Body: { action: "mint" | "transfer" | "burn", ...params }
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const { action } = body;

    if (action === "mint") {
      return handleMint(body);
    }
    if (action === "transfer") {
      return handleTransfer(body);
    }
    if (action === "burn") {
      return handleBurn(body);
    }

    return NextResponse.json(
      { success: false, error: "Invalid action. Use 'mint', 'transfer', or 'burn'" },
      { status: 400 }
    );
  } catch (error) {
    console.error("[TOKEN-OPS] Error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Operation failed" },
      { status: 500 }
    );
  }
}

async function handleMint(body: Record<string, unknown>) {
  const { tokenId, recipientAddress, amount, memo, signerSecret } = body;

  if (!tokenId || !recipientAddress || !amount || !signerSecret) {
    return NextResponse.json(
      { success: false, error: "Required: tokenId, recipientAddress, amount, signerSecret" },
      { status: 400 }
    );
  }

  const result = await tokenizationEngine.mintTokens(
    {
      tokenId: tokenId as string,
      recipientAddress: recipientAddress as string,
      amount: amount as number,
      memo: memo as string | undefined,
    },
    signerSecret as string
  );

  if (!result.success) {
    return NextResponse.json({ success: false, error: result.error }, { status: 400 });
  }

  return NextResponse.json({ success: true, data: result });
}

async function handleTransfer(body: Record<string, unknown>) {
  const { tokenId, fromAddress, toAddress, amount, piPaymentId, memo, signerSecret } = body;

  if (!tokenId || !fromAddress || !toAddress || !amount || !signerSecret) {
    return NextResponse.json(
      { success: false, error: "Required: tokenId, fromAddress, toAddress, amount, signerSecret" },
      { status: 400 }
    );
  }

  const result = await tokenizationEngine.transferTokens(
    {
      tokenId: tokenId as string,
      fromAddress: fromAddress as string,
      toAddress: toAddress as string,
      amount: amount as number,
      piPaymentId: piPaymentId as string | undefined,
      memo: memo as string | undefined,
    },
    signerSecret as string
  );

  if (!result.success) {
    return NextResponse.json({ success: false, error: result.error }, { status: 400 });
  }

  return NextResponse.json({ success: true, data: result });
}

async function handleBurn(body: Record<string, unknown>) {
  const { tokenId, ownerAddress, amount, reason, signerSecret } = body;

  if (!tokenId || !ownerAddress || !amount || !reason || !signerSecret) {
    return NextResponse.json(
      { success: false, error: "Required: tokenId, ownerAddress, amount, reason, signerSecret" },
      { status: 400 }
    );
  }

  const result = await tokenizationEngine.burnTokens(
    {
      tokenId: tokenId as string,
      ownerAddress: ownerAddress as string,
      amount: amount as number,
      reason: reason as string,
    },
    signerSecret as string
  );

  if (!result.success) {
    return NextResponse.json({ success: false, error: result.error }, { status: 400 });
  }

  return NextResponse.json({ success: true, data: result });
}

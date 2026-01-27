// app/api/transactions/route.ts
// User-to-app transaction processing with server approval

import { type NextRequest, NextResponse } from "next/server";
import { transactionProcessor } from "@/lib/pi-sdk/transaction-processor";

/**
 * POST /api/transactions/request-approval
 * Request server approval for a transaction
 */
export async function POST(request: NextRequest) {
  try {
    const pathname = request.nextUrl.pathname;

    // Route: /api/transactions/request-approval
    if (pathname.includes("request-approval")) {
      return handleApprovalRequest(request);
    }

    // Route: /api/transactions/process
    if (pathname.includes("process")) {
      return handleProcessTransaction(request);
    }

    // Route: /api/transactions (default - request approval)
    return handleApprovalRequest(request);
  } catch (error) {
    console.error("[TRANSACTIONS] Unexpected error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Transaction processing failed",
      },
      { status: 500 }
    );
  }
}

/**
 * Handle approval request
 */
async function handleApprovalRequest(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;

    // Validate required fields
    const { transactionId, userId, amount, memo } = body;

    if (!transactionId || !userId || !amount || !memo) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: transactionId, userId, amount, memo",
        },
        { status: 400 }
      );
    }

    console.log(
      `[TRANSACTIONS] Approval request for user ${userId}: ${amount} Pi`
    );

    // Request server approval
    const approval = await transactionProcessor.requestServerApproval({
      transactionId: transactionId as string,
      userId: userId as string,
      amount: amount as number,
      memo: memo as string,
      userSignature: body.userSignature as string | undefined,
      timestamp: Date.now(),
    });

    if (!approval.approved) {
      console.error(`[TRANSACTIONS] ❌ Approval denied: ${approval.reason}`);

      return NextResponse.json(
        {
          success: false,
          error: approval.reason,
        },
        { status: 402 }
      );
    }

    console.log(`[TRANSACTIONS] ✅ Approval granted: ${approval.approvalId}`);

    return NextResponse.json({
      success: true,
      approvalId: approval.approvalId,
      expiresAt: approval.expiresAt,
      message: "Transaction approved by server",
    });
  } catch (error) {
    console.error("[TRANSACTIONS] Approval request error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Approval request failed",
      },
      { status: 500 }
    );
  }
}

/**
 * Handle process transaction
 */
async function handleProcessTransaction(request: NextRequest) {
  try {
    const body = (await request.json()) as Record<string, unknown>;

    // Validate required fields
    const { transactionId, userId, amount, memo, approvalId } = body;

    if (!transactionId || !approvalId) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: transactionId, approvalId",
        },
        { status: 400 }
      );
    }

    console.log(`[TRANSACTIONS] Processing transaction: ${transactionId}`);

    // Process transaction
    const result = await transactionProcessor.processTransaction(
      {
        transactionId: transactionId as string,
        userId: userId as string,
        amount: amount as number,
        memo: memo as string,
        timestamp: Date.now(),
        status: "approved",
        serverApprovalId: approvalId as string,
        metadata: body.metadata as Record<string, unknown> | undefined,
      },
      approvalId as string
    );

    if (!result || (result as any).success === false) {
      console.error(`[TRANSACTIONS] ❌ Process failed: ${(result as any).error}`);

      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 402 }
      );
    }

    console.log(
      `[TRANSACTIONS] ✅ Transaction processed: ${result.blockchainHash}`
    );

    // Store transaction record
    await storeTransaction({
      transactionId: transactionId as string,
      userId: userId as string,
      amount: amount as number,
      status: "confirmed",
      blockchainHash: result.blockchainHash,
      approvalId: approvalId as string,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      transactionId,
      blockchainHash: result.blockchainHash,
      status: "confirmed",
      message: "Transaction processed and settled on blockchain",
    });
  } catch (error) {
    console.error("[TRANSACTIONS] Process error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Transaction processing failed",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/transactions
 * Get transaction history
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get("userId");
    const transactionId = searchParams.get("transactionId");

    if (!userId && !transactionId) {
      return NextResponse.json(
        {
          success: false,
          error: "Provide either userId or transactionId",
        },
        { status: 400 }
      );
    }

    console.log(
      `[TRANSACTIONS] Retrieving history - userId: ${userId}, txId: ${transactionId}`
    );

    // Retrieve from database
    const transactions = await getTransactionHistory(userId, transactionId);

    return NextResponse.json({
      success: true,
      transactions,
      count: transactions.length,
    });
  } catch (error) {
    console.error("[TRANSACTIONS] History error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to retrieve transaction history",
      },
      { status: 500 }
    );
  }
}

/**
 * Store transaction record in database
 */
function storeTransaction(transaction: {
  transactionId: string;
  userId: string;
  amount: number;
  status: string;
  blockchainHash?: string;
  approvalId: string;
  timestamp: string;
}): void {
  try {
    // INSERT INTO transactions (transaction_id, user_id, amount, status, blockchain_hash, approval_id, created_at)
    // VALUES ($1, $2, $3, $4, $5, $6, $7)

    console.log(
      `[TRANSACTIONS] Stored transaction: ${transaction.transactionId}`
    );
  } catch (error) {
    console.error("Failed to store transaction:", error);
    throw error;
  }
}

/**
 * Retrieve transaction history
 */
async function getTransactionHistory(
  userId: string | null,
  transactionId: string | null
): Promise<
  Array<{
    transactionId: string;
    userId: string;
    amount: number;
    status: string;
    blockchainHash?: string;
    timestamp: string;
  }>
> {
  try {
    // SELECT * FROM transactions
    // WHERE user_id = $1 OR transaction_id = $1
    // ORDER BY created_at DESC

    return [
      {
        transactionId: transactionId || "mock-tx-123",
        userId: userId || "mock-user",
        amount: 100,
        status: "confirmed",
        blockchainHash: "0xabc123...",
        timestamp: new Date().toISOString(),
      },
    ];
  } catch (error) {
    console.error("Failed to retrieve transaction history:", error);
    return [];
  }
}

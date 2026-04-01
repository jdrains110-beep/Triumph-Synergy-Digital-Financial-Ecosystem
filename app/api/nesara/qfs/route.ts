/**
 * Quantum Financial System API Routes
 * 
 * Provides endpoints for:
 * - QFS account management
 * - Transaction processing
 * - Ledger queries
 * 
 * @route /api/nesara/qfs
 */

import { NextRequest, NextResponse } from "next/server";
import { qfs } from "@/lib/nesara";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...params } = body;

    switch (action) {
      case "create-account": {
        const { userId, name, country, accountType } = params;
        
        if (!userId || !name) {
          return NextResponse.json(
            { error: "userId and name are required" },
            { status: 400 }
          );
        }
        
        const account = qfs.createAccount(userId, name, country, accountType);
        
        return NextResponse.json({
          success: true,
          message: "QFS account created successfully",
          account,
        });
      }

      case "verify-account": {
        const { accountId } = params;
        
        if (!accountId) {
          return NextResponse.json(
            { error: "accountId is required" },
            { status: 400 }
          );
        }
        
        const isValid = qfs.verifyAccount(accountId);
        
        return NextResponse.json({
          success: true,
          accountId,
          isValid,
          verifiedAt: new Date().toISOString(),
        });
      }

      case "process-transaction": {
        const { fromAccountId, toAccountId, amount, currency, type, description, metadata } = params;
        
        if (!fromAccountId || !toAccountId || !amount) {
          return NextResponse.json(
            { error: "fromAccountId, toAccountId, and amount are required" },
            { status: 400 }
          );
        }
        
        const transaction = qfs.processTransaction(
          fromAccountId,
          toAccountId,
          amount,
          currency || "QFS-USD",
          type || "transfer",
          description,
          metadata
        );
        
        return NextResponse.json({
          success: true,
          message: "Transaction processed successfully",
          transaction,
        });
      }

      case "prosperity-payment": {
        const { accountId, amount, program } = params;
        
        if (!accountId || !amount) {
          return NextResponse.json(
            { error: "accountId and amount are required" },
            { status: 400 }
          );
        }
        
        const transaction = qfs.processProsperityPayment(accountId, amount, program);
        
        return NextResponse.json({
          success: true,
          message: "Prosperity payment processed",
          transaction,
        });
      }

      case "debt-settlement": {
        const { accountId, debtAmount, creditorId, debtType } = params;
        
        if (!accountId || !debtAmount) {
          return NextResponse.json(
            { error: "accountId and debtAmount are required" },
            { status: 400 }
          );
        }
        
        const transaction = qfs.processDebtSettlement(
          accountId,
          debtAmount,
          creditorId,
          debtType
        );
        
        return NextResponse.json({
          success: true,
          message: "Debt settlement processed",
          transaction,
        });
      }

      case "birth-bond-redemption": {
        const { accountId, bondValue, bondId } = params;
        
        if (!accountId || !bondValue || !bondId) {
          return NextResponse.json(
            { error: "accountId, bondValue, and bondId are required" },
            { status: 400 }
          );
        }
        
        const transaction = qfs.processBirthBondRedemption(accountId, bondValue, bondId);
        
        return NextResponse.json({
          success: true,
          message: "Birth bond redemption processed",
          transaction,
        });
      }

      case "ubi-payment": {
        const { accountId, monthlyAmount, month } = params;
        
        if (!accountId || !monthlyAmount) {
          return NextResponse.json(
            { error: "accountId and monthlyAmount are required" },
            { status: 400 }
          );
        }
        
        const transaction = qfs.processUBIPayment(accountId, monthlyAmount, month);
        
        return NextResponse.json({
          success: true,
          message: "UBI payment processed",
          transaction,
        });
      }

      case "tax-refund": {
        const { accountId, refundAmount, taxYear, refundType } = params;
        
        if (!accountId || !refundAmount) {
          return NextResponse.json(
            { error: "accountId and refundAmount are required" },
            { status: 400 }
          );
        }
        
        const transaction = qfs.processTaxRefund(
          accountId,
          refundAmount,
          taxYear,
          refundType
        );
        
        return NextResponse.json({
          success: true,
          message: "Tax refund processed",
          transaction,
        });
      }

      case "get-account": {
        const { accountId } = params;
        
        if (!accountId) {
          return NextResponse.json(
            { error: "accountId is required" },
            { status: 400 }
          );
        }
        
        const account = qfs.getAccount(accountId);
        
        if (!account) {
          return NextResponse.json(
            { error: "Account not found" },
            { status: 404 }
          );
        }
        
        return NextResponse.json({
          success: true,
          account,
        });
      }

      case "get-transactions": {
        const { accountId, limit } = params;
        
        if (!accountId) {
          return NextResponse.json(
            { error: "accountId is required" },
            { status: 400 }
          );
        }
        
        const transactions = qfs.getAccountTransactions(accountId, limit);
        
        return NextResponse.json({
          success: true,
          accountId,
          transactions,
          count: transactions.length,
        });
      }

      case "get-ledger": {
        const { limit } = params;
        
        const entries = qfs.getLedger(limit);
        
        return NextResponse.json({
          success: true,
          ledger: entries,
          count: entries.length,
        });
      }

      default:
        return NextResponse.json(
          { 
            error: "Invalid action",
            availableActions: [
              "create-account",
              "verify-account",
              "process-transaction",
              "prosperity-payment",
              "debt-settlement",
              "birth-bond-redemption",
              "ubi-payment",
              "tax-refund",
              "get-account",
              "get-transactions",
              "get-ledger",
            ],
          },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("QFS API error:", error);
    return NextResponse.json(
      { 
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");
  const accountId = searchParams.get("accountId");

  if (action === "status") {
    return NextResponse.json({
      success: true,
      system: "Quantum Financial System",
      status: "operational",
      version: "1.0.0",
      quantumSecured: true,
      supportedCurrencies: ["QFS-USD", "QFS-GOLD", "PI", "USN"],
      features: [
        "prosperity-payments",
        "debt-settlement",
        "birth-bond-redemption",
        "ubi-payments",
        "tax-refunds",
        "quantum-verification",
      ],
    });
  }

  if (action === "account" && accountId) {
    const account = qfs.getAccount(accountId);
    if (!account) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, account });
  }

  return NextResponse.json({
    success: true,
    endpoint: "/api/nesara/qfs",
    description: "Quantum Financial System API",
    methods: {
      GET: ["status", "account"],
      POST: [
        "create-account",
        "verify-account",
        "process-transaction",
        "prosperity-payment",
        "debt-settlement",
        "birth-bond-redemption",
        "ubi-payment",
        "tax-refund",
        "get-transactions",
        "get-ledger",
      ],
    },
  });
}

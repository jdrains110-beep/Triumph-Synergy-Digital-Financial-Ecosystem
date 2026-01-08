// app/transactions/page.tsx
// Transaction Processing Page - User-to-App Payments

import type { Metadata } from "next";
import { TransactionProcessor } from "@/components/transaction-processor";

export const metadata: Metadata = {
  title: "Transaction Processing - Triumph Synergy",
  description: "Process user-to-app payments via Pi Network",
};

export default function TransactionsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="space-y-2">
            <h1 className="font-bold text-4xl">Transaction Processing</h1>
            <p className="text-blue-100">
              Process user-to-app payments with server-side approval and
              blockchain settlement
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Introduction */}
        <div className="mb-8 rounded-lg border-blue-500 border-l-4 bg-white p-6 shadow">
          <h2 className="mb-4 font-bold text-2xl">How It Works</h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <div className="font-bold text-3xl text-blue-600">1</div>
              <h3 className="font-semibold">User Authenticates</h3>
              <p className="text-gray-600 text-sm">
                Sign in with your Pi Network account
              </p>
            </div>
            <div className="space-y-2">
              <div className="font-bold text-3xl text-purple-600">2</div>
              <h3 className="font-semibold">Server Approves</h3>
              <p className="text-gray-600 text-sm">
                Server verifies and approves the transaction
              </p>
            </div>
            <div className="space-y-2">
              <div className="font-bold text-3xl text-green-600">3</div>
              <h3 className="font-semibold">Blockchain Settlement</h3>
              <p className="text-gray-600 text-sm">
                Transaction settled on the blockchain
              </p>
            </div>
          </div>
        </div>

        {/* Transaction Processor Component */}
        <div className="mb-8">
          <TransactionProcessor />
        </div>

        {/* Flow Diagram */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-6 font-bold text-2xl">Transaction Flow</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white">
                  1
                </div>
              </div>
              <div className="flex-grow">
                <h3 className="font-semibold">User Request</h3>
                <p className="text-gray-600 text-sm">
                  User enters amount and memo, initiates payment
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-600 text-white">
                  2
                </div>
              </div>
              <div className="flex-grow">
                <h3 className="font-semibold">Server Approval</h3>
                <p className="text-gray-600 text-sm">
                  POST /api/transactions/request-approval - Server validates
                  amount, checks fraud patterns, grants approval
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-600 text-white">
                  3
                </div>
              </div>
              <div className="flex-grow">
                <h3 className="font-semibold">Pi SDK Transaction</h3>
                <p className="text-gray-600 text-sm">
                  Pi.payments.request() - User approves payment in Pi Browser
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-white">
                  4
                </div>
              </div>
              <div className="flex-grow">
                <h3 className="font-semibold">Verification</h3>
                <p className="text-gray-600 text-sm">
                  Verify transaction with Pi API - Confirm transaction ID and
                  integrity
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-pink-600 text-white">
                  5
                </div>
              </div>
              <div className="flex-grow">
                <h3 className="font-semibold">Blockchain Settlement</h3>
                <p className="text-gray-600 text-sm">
                  POST /api/transactions/process - Settle on Stellar blockchain
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex-shrink-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-white">
                  6
                </div>
              </div>
              <div className="flex-grow">
                <h3 className="font-semibold">Confirmation</h3>
                <p className="text-gray-600 text-sm">
                  Transaction confirmed with blockchain hash - Ready for next
                  transaction
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* API Reference */}
        <div className="mt-8 rounded-lg bg-white p-6 shadow">
          <h2 className="mb-6 font-bold text-2xl">API Reference</h2>

          <div className="space-y-6">
            {/* Request Approval */}
            <div className="border-blue-500 border-l-4 pl-4">
              <h3 className="font-mono font-semibold text-blue-600 text-sm">
                POST /api/transactions/request-approval
              </h3>
              <p className="mt-2 text-gray-600 text-sm">
                Request server approval for a transaction
              </p>
              <pre className="mt-2 overflow-x-auto rounded bg-gray-50 p-3 text-xs">
                {`{
  "transactionId": "user-123-1704553200000",
  "userId": "user-123",
  "amount": 100,
  "memo": "Payment description",
  "timestamp": 1704553200000
}

Response:
{
  "success": true,
  "approvalId": "approval_user-1_1704553200000",
  "expiresAt": 1704553500000
}`}
              </pre>
            </div>

            {/* Process Transaction */}
            <div className="border-green-500 border-l-4 pl-4">
              <h3 className="font-mono font-semibold text-green-600 text-sm">
                POST /api/transactions/process
              </h3>
              <p className="mt-2 text-gray-600 text-sm">
                Process transaction with server approval
              </p>
              <pre className="mt-2 overflow-x-auto rounded bg-gray-50 p-3 text-xs">
                {`{
  "transactionId": "user-123-1704553200000",
  "userId": "user-123",
  "amount": 100,
  "memo": "Payment description",
  "approvalId": "approval_user-1_1704553200000",
  "timestamp": 1704553200000
}

Response:
{
  "success": true,
  "transactionId": "user-123-1704553200000",
  "blockchainHash": "0xabc123...",
  "status": "confirmed"
}`}
              </pre>
            </div>

            {/* Get History */}
            <div className="border-purple-500 border-l-4 pl-4">
              <h3 className="font-mono font-semibold text-purple-600 text-sm">
                GET /api/transactions?userId=user-123
              </h3>
              <p className="mt-2 text-gray-600 text-sm">
                Retrieve transaction history
              </p>
              <pre className="mt-2 overflow-x-auto rounded bg-gray-50 p-3 text-xs">
                {`Response:
{
  "success": true,
  "transactions": [
    {
      "transactionId": "user-123-1704553200000",
      "userId": "user-123",
      "amount": 100,
      "status": "confirmed",
      "blockchainHash": "0xabc123...",
      "timestamp": "2024-01-06T12:00:00Z"
    }
  ],
  "count": 1
}`}
              </pre>
            </div>
          </div>
        </div>

        {/* Requirements */}
        <div className="mt-8 rounded-lg border border-amber-200 bg-amber-50 p-6">
          <h2 className="mb-4 font-bold text-amber-900 text-lg">
            ⚠️ Requirements
          </h2>
          <ul className="space-y-2 text-amber-800 text-sm">
            <li>✅ Pi Browser or Pi Network access (web fallback supported)</li>
            <li>✅ Pi Network account with Pi balance</li>
            <li>✅ Internet connection for blockchain settlement</li>
            <li>
              ✅ Server approval required (prevents unauthorized transactions)
            </li>
            <li>✅ Timestamp validation (&lt; 5 minutes old)</li>
          </ul>
        </div>

        {/* Success Indicators */}
        <div className="mt-8 rounded-lg border border-green-200 bg-green-50 p-6">
          <h2 className="mb-4 font-bold text-green-900 text-lg">
            ✅ Success Indicators
          </h2>
          <ul className="space-y-2 text-green-800 text-sm">
            <li>
              ✅ Pi Browser detected (check browser status in Transaction
              Processor)
            </li>
            <li>✅ User authenticated (User ID displayed)</li>
            <li>✅ Server approval granted (Approval ID received)</li>
            <li>✅ Transaction verified (Blockchain hash returned)</li>
            <li>✅ Blockchain settlement confirmed (Status: confirmed)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import { usePi } from "@/lib/pi-sdk/pi-provider";
import { detectPiBrowser, logPiBrowserInfo } from "@/lib/pi-sdk/pi-browser-detector";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, CheckCircle2, AlertCircle, Info } from "lucide-react";

interface TransactionRequest {
  amount: number;
  memo: string;
  userId: string;
}

export function TransactionProcessor() {
  const { isReady, isAuthenticated, user } = usePi();
  const [transactionId, setTransactionId] = useState<string>("");
  const [amount, setAmount] = useState<string>("10");
  const [memo, setMemo] = useState<string>("Triumph Synergy Payment");
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<"idle" | "approving" | "processing" | "success" | "error">("idle");
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [browserInfo, setBrowserInfo] = useState<any>(null);

  // Check Pi Browser on mount
  useEffect(() => {
    const info = detectPiBrowser();
    setBrowserInfo(info);
    logPiBrowserInfo();

    console.log("[TransactionProcessor] Browser info:", info);
  }, []);

  // Request server approval
  const requestApproval = async (txReq: TransactionRequest) => {
    try {
      setStatus("approving");
      setError(null);

      console.log("[TransactionProcessor] Requesting approval...", txReq);

      const response = await fetch("/api/transactions/request-approval", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactionId: txReq.userId + Date.now(),
          userId: txReq.userId,
          amount: txReq.amount,
          memo: txReq.memo,
          timestamp: Date.now(),
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Approval failed");
      }

      const data = await response.json();
      console.log("[TransactionProcessor] ✅ Approval received:", data.approvalId);

      return data.approvalId;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Approval failed";
      setError(errorMsg);
      setStatus("error");
      throw err;
    }
  };

  // Process transaction
  const processTransaction = async (
    txId: string,
    approvalId: string,
    txReq: TransactionRequest
  ) => {
    try {
      setStatus("processing");

      console.log("[TransactionProcessor] Processing transaction...", {
        txId,
        approvalId,
      });

      const response = await fetch("/api/transactions/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactionId: txId,
          userId: txReq.userId,
          amount: txReq.amount,
          memo: txReq.memo,
          approvalId,
          timestamp: Date.now(),
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Processing failed");
      }

      const data = await response.json();
      console.log("[TransactionProcessor] ✅ Transaction processed:", data);

      setResult(data);
      setTransactionId(data.transactionId);
      setStatus("success");
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Processing failed";
      setError(errorMsg);
      setStatus("error");
      throw err;
    }
  };

  // Handle complete transaction flow
  const handleTransaction = async () => {
    try {
      if (!isReady || !user) {
        setError("Pi Network not ready or user not authenticated");
        setStatus("error");
        return;
      }

      setIsProcessing(true);
      setError(null);

      const txReq: TransactionRequest = {
        amount: parseFloat(amount),
        memo,
        userId: user.uid,
      };

      // Step 1: Request server approval
      const approvalId = await requestApproval(txReq);

      // Step 2: Process transaction
      const txId = user.uid + Date.now();
      await processTransaction(txId, approvalId, txReq);

      setIsProcessing(false);
    } catch (err) {
      console.error("[TransactionProcessor] Error:", err);
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Pi Browser Info */}
      {browserInfo && (
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex items-start gap-2">
            <Info className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-900">Pi Browser Status</h3>
              <div className="text-sm text-blue-800 space-y-1 mt-2">
                <p>
                  ✅ Browser Available:{" "}
                  <span className="font-semibold">{browserInfo.isAvailable ? "Yes" : "No"}</span>
                </p>
                <p>
                  {browserInfo.isPiBrowser ? "✅" : "⚠️"} Pi Browser:{" "}
                  <span className="font-semibold">{browserInfo.isPiBrowser ? "Detected" : "Not detected"}</span>
                </p>
                <p>
                  {browserInfo.isPiNetworkAvailable ? "✅" : "❌"} Pi Network:{" "}
                  <span className="font-semibold">
                    {browserInfo.isPiNetworkAvailable ? "Available" : "Not available"}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Authentication Status */}
      <Card className="p-4">
        <div className="space-y-2">
          <h2 className="text-xl font-bold">Transaction Processor</h2>
          <div className="text-sm text-gray-600">
            <p>
              Status: {isReady ? "✅ Ready" : "⏳ Loading"} | Auth:{" "}
              {isAuthenticated ? "✅ Authenticated" : "❌ Not authenticated"}
            </p>
            {user && <p>User: {user.username}</p>}
          </div>
        </div>
      </Card>

      {/* Transaction Form */}
      <Card className="p-6 space-y-4">
        <div className="space-y-2">
          <label className="block text-sm font-medium">Amount (π)</label>
          <Input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="10"
            min="1"
            max="100000"
            step="0.1"
            disabled={isProcessing}
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium">Memo</label>
          <Input
            type="text"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="Transaction description"
            disabled={isProcessing}
          />
        </div>

        <Button
          onClick={handleTransaction}
          disabled={isProcessing || !isReady || !isAuthenticated}
          className="w-full"
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {status === "approving" && "Requesting Approval..."}
              {status === "processing" && "Processing Transaction..."}
            </>
          ) : (
            `Process Transaction - ${amount} π`
          )}
        </Button>
      </Card>

      {/* Status Messages */}
      {status === "success" && result && (
        <Card className="p-4 bg-green-50 border-green-200">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium text-green-900">✅ Transaction Successful</h3>
              <div className="text-sm text-green-800 space-y-2 mt-2">
                <p>
                  <strong>Transaction ID:</strong> {result.transactionId}
                </p>
                <p>
                  <strong>Blockchain Hash:</strong>{" "}
                  <code className="bg-white px-2 py-1 rounded text-xs break-all">
                    {result.blockchainHash}
                  </code>
                </p>
                <p>
                  <strong>Status:</strong> {result.status}
                </p>
                <p className="text-green-700 font-medium mt-3">
                  {result.message}
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {error && (
        <Card className="p-4 bg-red-50 border-red-200">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium text-red-900">❌ Error</h3>
              <p className="text-sm text-red-800 mt-1">{error}</p>
              <Button
                onClick={() => {
                  setStatus("idle");
                  setError(null);
                  setResult(null);
                }}
                variant="outline"
                size="sm"
                className="mt-3"
              >
                Try Again
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Debug Info */}
      <Card className="p-4 bg-gray-50">
        <div className="text-xs text-gray-600 font-mono space-y-1">
          <p>isReady: {isReady ? "true" : "false"}</p>
          <p>isAuthenticated: {isAuthenticated ? "true" : "false"}</p>
          <p>userId: {user?.uid || "N/A"}</p>
          <p>browser: {browserInfo?.isPiBrowser ? "Pi Browser" : "Web"}</p>
        </div>
      </Card>
    </div>
  );
}

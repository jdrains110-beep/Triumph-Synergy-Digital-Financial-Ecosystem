"use client";

import { AlertCircle, CheckCircle2, Info, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  detectPiBrowser,
  logPiBrowserInfo,
} from "@/lib/pi-sdk/pi-browser-detector";
import { usePi } from "@/lib/pi-sdk/pi-provider";
import { PiEnvironmentBanner } from "@/components/pi-environment-banner";

type TransactionRequest = {
  amount: number;
  memo: string;
  userId: string;
};

export function TransactionProcessor() {
  const { isReady, isAuthenticated, user } = usePi();
  const [transactionId, setTransactionId] = useState<string>("");
  const [amount, setAmount] = useState<string>("10");
  const [memo, setMemo] = useState<string>("Triumph Synergy Payment");
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState<
    "idle" | "approving" | "processing" | "success" | "error"
  >("idle");
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

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

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
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Approval failed");
      }

      const data = await response.json();
      console.log(
        "[TransactionProcessor] ✅ Approval received:",
        data.approvalId
      );

      return data.approvalId;
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        const errorMsg = "Request timeout - server took too long to respond";
        setError(errorMsg);
        setStatus("error");
        throw new Error(errorMsg);
      }
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

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

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
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

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
      if (err instanceof Error && err.name === "AbortError") {
        const errorMsg = "Request timeout - server took too long to respond";
        setError(errorMsg);
        setStatus("error");
        throw new Error(errorMsg);
      }
      const errorMsg = err instanceof Error ? err.message : "Processing failed";
      setError(errorMsg);
      setStatus("error");
      throw err;
    }
  };

  // Handle complete transaction flow
  const handleTransaction = async () => {
    try {
      // Allow transaction even if Pi SDK is not ready (for web/fallback mode)
      if (!user) {
        setError("User not authenticated");
        setStatus("error");
        return;
      }

      setIsProcessing(true);
      setError(null);

      const txReq: TransactionRequest = {
        amount: Number.parseFloat(amount),
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
      {/* Pi Environment Status Banner */}
      <PiEnvironmentBanner />

      {/* Pi Browser Info */}
      {browserInfo && (
        <Card className="border-blue-200 bg-blue-50 p-4">
          <div className="flex items-start gap-2">
            <Info className="mt-0.5 h-5 w-5 text-blue-600" />
            <div>
              <h3 className="font-medium text-blue-900">Pi Browser Status</h3>
              <div className="mt-2 space-y-1 text-blue-800 text-sm">
                <p>
                  ✅ Browser Available:{" "}
                  <span className="font-semibold">
                    {browserInfo.isAvailable ? "Yes" : "No"}
                  </span>
                </p>
                <p>
                  {browserInfo.isPiBrowser ? "✅" : "⚠️"} Pi Browser:{" "}
                  <span className="font-semibold">
                    {browserInfo.isPiBrowser ? "Detected" : "Not detected"}
                  </span>
                </p>
                <p>
                  {browserInfo.isPiNetworkAvailable ? "✅" : "❌"} Pi Network:{" "}
                  <span className="font-semibold">
                    {browserInfo.isPiNetworkAvailable
                      ? "Available"
                      : "Not available"}
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
          <h2 className="font-bold text-xl">Transaction Processor</h2>
          <div className="text-gray-600 text-sm">
            <p>
              Status: {isReady ? "✅ Ready" : "⏳ Loading"} | Auth:{" "}
              {isAuthenticated ? "✅ Authenticated" : "❌ Not authenticated"}
            </p>
            {user && <p>User: {user.username}</p>}
          </div>
        </div>
      </Card>

      {/* Transaction Form */}
      <Card className="space-y-4 p-6">
        <div className="space-y-2">
          <label className="block font-medium text-sm">Amount (π)</label>
          <Input
            disabled={isProcessing}
            max="100000"
            min="1"
            onChange={(e) => setAmount(e.target.value)}
            placeholder="10"
            step="0.1"
            type="number"
            value={amount}
          />
        </div>

        <div className="space-y-2">
          <label className="block font-medium text-sm">Memo</label>
          <Input
            disabled={isProcessing}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="Transaction description"
            type="text"
            value={memo}
          />
        </div>

        <Button
          className="w-full"
          disabled={isProcessing || !user}
          onClick={handleTransaction}
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
        <Card className="border-green-200 bg-green-50 p-4">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="mt-0.5 h-5 w-5 text-green-600" />
            <div className="flex-1">
              <h3 className="font-medium text-green-900">
                ✅ Transaction Successful
              </h3>
              <div className="mt-2 space-y-2 text-green-800 text-sm">
                <p>
                  <strong>Transaction ID:</strong> {result.transactionId}
                </p>
                <p>
                  <strong>Blockchain Hash:</strong>{" "}
                  <code className="break-all rounded bg-white px-2 py-1 text-xs">
                    {result.blockchainHash}
                  </code>
                </p>
                <p>
                  <strong>Status:</strong> {result.status}
                </p>
                <p className="mt-3 font-medium text-green-700">
                  {result.message}
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {error && (
        <Card className="border-red-200 bg-red-50 p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-5 w-5 text-red-600" />
            <div className="flex-1">
              <h3 className="font-medium text-red-900">❌ Payment Error</h3>
              <p className="mt-2 text-red-800 text-sm font-semibold">{error}</p>
              <div className="mt-3 space-y-2 text-red-700 text-xs">
                <p className="font-medium">Troubleshooting tips:</p>
                <ul className="list-inside list-disc space-y-1">
                  {error.includes("timeout") && (
                    <>
                      <li>Network connection may be slow</li>
                      <li>Try again in a few moments</li>
                      <li>Check your internet connection</li>
                    </>
                  )}
                  {error.includes("aborted") && (
                    <>
                      <li>Request was interrupted</li>
                      <li>Try the payment again</li>
                    </>
                  )}
                  {error.includes("not authenticated") && (
                    <>
                      <li>You need to be logged in</li>
                      <li>Sign in with Pi Network first</li>
                    </>
                  )}
                  {!error.includes("timeout") &&
                    !error.includes("aborted") &&
                    !error.includes("authenticated") && (
                      <>
                        <li>Check the error message above</li>
                        <li>Try again or contact support</li>
                      </>
                    )}
                </ul>
              </div>
              <Button
                className="mt-4"
                onClick={() => {
                  setStatus("idle");
                  setError(null);
                  setResult(null);
                }}
                size="sm"
                variant="outline"
              >
                Try Again
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Debug Info */}
      <Card className="bg-gray-50 p-4">
        <div className="space-y-1 font-mono text-gray-600 text-xs">
          <p>isReady: {isReady ? "true" : "false"}</p>
          <p>isAuthenticated: {isAuthenticated ? "true" : "false"}</p>
          <p>userId: {user?.uid || "N/A"}</p>
          <p>browser: {browserInfo?.isPiBrowser ? "Pi Browser" : "Web"}</p>
        </div>
      </Card>
    </div>
  );
}

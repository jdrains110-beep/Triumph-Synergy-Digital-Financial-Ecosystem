/**
 * components/pi-browser-payment.tsx
 * Pi Browser-native payment component with Pi-specific UI
 * References: https://github.com/pi-apps/pi-platform-docs/blob/master/payments.md
 */

"use client";

import { AlertCircle, CheckCircle, Loader } from "lucide-react";
import { useState } from "react";
import {
  formatPiAmount,
  getPiNetworkInfo,
} from "@/lib/pi-sdk/pi-network-detection";
import { piSDK2026 } from "@/lib/pi-sdk-2026";

export type PiBrowserPaymentProps = {
  amount: number;
  memo: string;
  metadata?: Record<string, unknown>;
  onSuccess?: (paymentId: string, txid?: string) => void;
  onError?: (error: Error) => void;
  onCancel?: () => void;
};

type PaymentPhase =
  | "idle"
  | "creating"
  | "approving"
  | "completing"
  | "success"
  | "error";

export function PiBrowserPayment({
  amount,
  memo,
  metadata = {},
  onSuccess,
  onError,
  onCancel,
}: PiBrowserPaymentProps) {
  const [phase, setPhase] = useState<PaymentPhase>("idle");
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [txid, setTxid] = useState<string | null>(null);

  const networkInfo = getPiNetworkInfo();
  const isPiBrowser = typeof window !== "undefined" && !!(window as any).Pi;

  if (!isPiBrowser) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
        <AlertCircle className="h-5 w-5 text-yellow-600" />
        <span className="text-sm text-yellow-800">
          This component requires Pi Browser. Please use the fallback payment
          method.
        </span>
      </div>
    );
  }

  const handleCreatePayment = async () => {
    try {
      setPhase("creating");
      setError(null);

      console.log(
        `[Pi Payment] Creating ${formatPiAmount(amount)} payment on ${networkInfo.environment}`
      );

      const result = await piSDK2026.pay(
        { amount, memo, metadata },
        {
          onSuccess: (newPaymentId, newTxid) => {
            setPaymentId(newPaymentId);
            setTxid(newTxid);
            setPhase("success");
            onSuccess?.(newPaymentId, newTxid);
          },
          onError: (err) => {
            const paymentErrorMsg =
              err instanceof Error ? err.message : String(err);
            setError(paymentErrorMsg);
            setPhase("error");
            onError?.(err instanceof Error ? err : new Error(paymentErrorMsg));
          },
          onCancel: (currentPaymentId) => {
            console.log("[Pi Payment] Payment cancelled by user");
            setPhase("idle");
            onCancel?.();
          },
        }
      );

      if (!result || (result as any).success === false) {
        throw (result as any).error || new Error("Payment failed");
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Payment failed";
      setError(errorMsg);
      setPhase("error");
      onError?.(err instanceof Error ? err : new Error(errorMsg));
    }
  };

  // Display different UI based on payment phase
  if (phase === "success") {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-6">
        <CheckCircle className="h-8 w-8 text-green-600" />
        <div className="text-center">
          <h3 className="font-semibold text-green-900">Payment Successful</h3>
          <p className="mt-1 text-green-700 text-sm">
            {formatPiAmount(amount)} received
          </p>
          {txid && (
            <p className="mt-2 break-all font-mono text-green-600 text-xs">
              {txid.substring(0, 20)}...{txid.substring(-20)}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (phase === "error") {
    return (
      <div className="flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50 p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
          <div>
            <h3 className="font-semibold text-red-900">Payment Failed</h3>
            <p className="mt-1 text-red-700 text-sm">{error}</p>
          </div>
        </div>
        <button
          className="rounded bg-red-600 px-4 py-2 font-medium text-white transition hover:bg-red-700"
          onClick={() => {
            setPhase("idle");
            setError(null);
            setPaymentId(null);
            setTxid(null);
          }}
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">Pi Network Payment</h3>
          <p className="mt-1 text-gray-600 text-sm">{memo}</p>
        </div>
        <div className="text-right">
          <p className="font-bold text-2xl text-blue-600">
            {formatPiAmount(amount)}
          </p>
          <p className="mt-1 text-gray-500 text-xs">
            {networkInfo.description}
          </p>
        </div>
      </div>

      {phase !== "idle" && (
        <div className="flex items-center gap-2 rounded bg-blue-100 p-3 text-blue-900">
          <Loader className="h-4 w-4 animate-spin" />
          <span className="text-sm">
            {phase === "creating" && "Creating payment..."}
            {phase === "approving" && "Waiting for approval..."}
            {phase === "completing" && "Completing transaction..."}
          </span>
        </div>
      )}

      <button
        className={`w-full rounded px-4 py-3 font-medium text-white transition ${
          phase === "idle"
            ? "cursor-pointer bg-blue-600 hover:bg-blue-700"
            : "cursor-not-allowed bg-gray-400 opacity-50"
        }`}
        disabled={phase !== "idle"}
        onClick={handleCreatePayment}
      >
        {phase === "idle" ? "Pay with Pi" : "Processing..."}
      </button>

      {phase === "idle" && onCancel && (
        <button
          className="w-full rounded bg-gray-100 px-4 py-2 font-medium text-gray-700 transition hover:bg-gray-200"
          onClick={onCancel}
        >
          Cancel
        </button>
      )}
    </div>
  );
}

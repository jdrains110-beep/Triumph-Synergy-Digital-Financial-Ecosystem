/**
 * components/pi-browser-payment.tsx
 * Pi Browser-native payment component with Pi-specific UI
 * References: https://github.com/pi-apps/pi-platform-docs/blob/master/payments.md
 */

"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle, Loader } from "lucide-react";
import { getPiNetworkInfo, formatPiAmount } from "@/lib/pi-sdk/pi-network-detection";
import { piSDK2026 } from "@/lib/pi-sdk-2026";

export interface PiBrowserPaymentProps {
    amount: number;
    memo: string;
    metadata?: Record<string, unknown>;
    onSuccess?: (paymentId: string, txid?: string) => void;
    onError?: (error: Error) => void;
    onCancel?: () => void;
}

type PaymentPhase = "idle" | "creating" | "approving" | "completing" | "success" | "error";

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
            <div className="flex items-center gap-2 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-yellow-600" />
                <span className="text-sm text-yellow-800">
                    This component requires Pi Browser. Please use the fallback payment method.
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
                    onSuccess: (paymentId, txid) => {
                        setPaymentId(paymentId);
                        setTxid(txid);
                        setPhase("success");
                        onSuccess?.(paymentId, txid);
                    },
                    onError: (err) => {
                        const errorMsg = err instanceof Error ? err.message : String(err);
                        setError(errorMsg);
                        setPhase("error");
                        onError?.(err instanceof Error ? err : new Error(errorMsg));
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
            <div className="flex flex-col items-center gap-3 p-6 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="w-8 h-8 text-green-600" />
                <div className="text-center">
                    <h3 className="font-semibold text-green-900">Payment Successful</h3>
                    <p className="text-sm text-green-700 mt-1">
                        {formatPiAmount(amount)} received
                    </p>
                    {txid && (
                        <p className="text-xs text-green-600 mt-2 font-mono break-all">
                            {txid.substring(0, 20)}...{txid.substring(-20)}
                        </p>
                    )}
                </div>
            </div>
        );
    }

    if (phase === "error") {
        return (
            <div className="flex flex-col gap-3 p-6 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <h3 className="font-semibold text-red-900">Payment Failed</h3>
                        <p className="text-sm text-red-700 mt-1">{error}</p>
                    </div>
                </div>
                <button
                    onClick={() => {
                        setPhase("idle");
                        setError(null);
                        setPaymentId(null);
                        setTxid(null);
                    }}
                    className="bg-red-600 text-white px-4 py-2 rounded font-medium hover:bg-red-700 transition"
                >
                    Try Again
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-4 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="font-semibold text-gray-900">Pi Network Payment</h3>
                    <p className="text-sm text-gray-600 mt-1">{memo}</p>
                </div>
                <div className="text-right">
                    <p className="text-2xl font-bold text-blue-600">
                        {formatPiAmount(amount)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                        {networkInfo.description}
                    </p>
                </div>
            </div>

            {phase !== "idle" && (
                <div className="flex items-center gap-2 p-3 bg-blue-100 text-blue-900 rounded">
                    <Loader className="w-4 h-4 animate-spin" />
                    <span className="text-sm">
                        {phase === "creating" && "Creating payment..."}
                        {phase === "approving" && "Waiting for approval..."}
                        {phase === "completing" && "Completing transaction..."}
                    </span>
                </div>
            )}

            <button
                onClick={handleCreatePayment}
                disabled={phase !== "idle"}
                className={`w-full px-4 py-3 rounded font-medium text-white transition ${phase === "idle"
                        ? "bg-blue-600 hover:bg-blue-700 cursor-pointer"
                        : "bg-gray-400 cursor-not-allowed opacity-50"
                    }`}
            >
                {phase === "idle" ? "Pay with Pi" : "Processing..."}
            </button>

            {phase === "idle" && onCancel && (
                <button
                    onClick={onCancel}
                    className="w-full px-4 py-2 rounded font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition"
                >
                    Cancel
                </button>
            )}
        </div>
    );
}

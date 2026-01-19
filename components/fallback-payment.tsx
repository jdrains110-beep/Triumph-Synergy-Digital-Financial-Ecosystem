/**
 * components/fallback-payment.tsx
 * Fallback payment component for users not in Pi Browser
 * Supports alternate payment methods (email verification, Stripe, etc.)
 */

"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle, Loader, Mail } from "lucide-react";

export interface FallbackPaymentProps {
    amount: number;
    memo: string;
    metadata?: Record<string, unknown>;
    onSuccess?: (method: string, reference: string) => void;
    onError?: (error: Error) => void;
    onCancel?: () => void;
}

type PaymentMethod = "email-verification" | "stripe" | "manual";
type PaymentPhase = "selecting" | "processing" | "success" | "error";

export function FallbackPayment({
    amount,
    memo,
    metadata = {},
    onSuccess,
    onError,
    onCancel,
}: FallbackPaymentProps) {
    const [phase, setPhase] = useState<PaymentPhase>("selecting");
    const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
    const [email, setEmail] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [reference, setReference] = useState<string | null>(null);

    const handleEmailVerification = async () => {
        if (!email || !email.includes("@")) {
            setError("Please enter a valid email address");
            return;
        }

        try {
            setPhase("processing");
            setError(null);

            // Create payment request with email verification
            const response = await fetch("/api/payments/fallback", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    amount,
                    memo,
                    email,
                    method: "email-verification",
                    metadata: {
                        ...metadata,
                        method: "email-verification",
                        fallback: true,
                        timestamp: new Date().toISOString(),
                    },
                }),
            });

            if (!response.ok) {
                throw new Error("Payment request failed");
            }

            const data = await response.json();
            setReference(data.reference || data.id);
            setPhase("success");
            onSuccess?.("email-verification", data.reference);

            console.log("[Fallback Payment] Email verification sent to:", email);
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : "Payment request failed";
            setError(errorMsg);
            setPhase("error");
            onError?.(err instanceof Error ? err : new Error(errorMsg));
        }
    };

    const handleStripePayment = async () => {
        try {
            setPhase("processing");
            setError(null);

            // Redirect to Stripe checkout
            const response = await fetch("/api/payments/stripe-checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    amount,
                    memo,
                    metadata: {
                        ...metadata,
                        method: "stripe",
                        fallback: true,
                    },
                }),
            });

            if (!response.ok) {
                throw new Error("Stripe checkout creation failed");
            }

            const data = await response.json();
            if (data.url) {
                // Redirect to Stripe
                window.location.href = data.url;
            }
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : "Stripe payment failed";
            setError(errorMsg);
            setPhase("error");
            onError?.(err instanceof Error ? err : new Error(errorMsg));
        }
    };

    const handleManualPayment = () => {
        try {
            setPhase("processing");

            // Create manual payment request (for admin review)
            const reference = `MANUAL-${Date.now()}-${Math.random().toString(36).substring(7)}`;
            setReference(reference);
            setPhase("success");
            onSuccess?.("manual", reference);

            console.log("[Fallback Payment] Manual payment created with reference:", reference);
        } catch (err) {
            const errorMsg = "Manual payment creation failed";
            setError(errorMsg);
            setPhase("error");
            onError?.(new Error(errorMsg));
        }
    };

    // Display different UI based on phase
    if (phase === "success") {
        return (
            <div className="flex flex-col items-center gap-3 p-6 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="w-8 h-8 text-green-600" />
                <div className="text-center">
                    <h3 className="font-semibold text-green-900">Payment Submitted</h3>
                    <p className="text-sm text-green-700 mt-1">
                        Amount: ${amount.toFixed(2)}
                    </p>
                    {reference && (
                        <p className="text-xs text-green-600 mt-2 font-mono bg-green-100 px-3 py-1 rounded mt-3">
                            Reference: {reference}
                        </p>
                    )}
                    <p className="text-xs text-green-600 mt-3">
                        {selectedMethod === "email-verification"
                            ? `Check ${email} for further instructions`
                            : "Your payment will be processed shortly"}
                    </p>
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
                        setPhase("selecting");
                        setError(null);
                        setSelectedMethod(null);
                        setEmail("");
                    }}
                    className="bg-red-600 text-white px-4 py-2 rounded font-medium hover:bg-red-700 transition"
                >
                    Try Again
                </button>
            </div>
        );
    }

    if (selectedMethod === "email-verification") {
        return (
            <div className="flex flex-col gap-4 p-6 bg-amber-50 border border-amber-200 rounded-lg">
                <div>
                    <h3 className="font-semibold text-gray-900">Email Verification</h3>
                    <p className="text-sm text-gray-600 mt-1">
                        We'll send you a verification link to complete the payment
                    </p>
                </div>

                <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                        setEmail(e.target.value);
                        setError(null);
                    }}
                    placeholder="your@email.com"
                    className="w-full px-4 py-2 border border-gray-300 rounded font-medium focus:outline-none focus:border-amber-500"
                />

                {error && (
                    <div className="flex items-center gap-2 p-3 bg-red-100 text-red-900 rounded">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <span className="text-sm">{error}</span>
                    </div>
                )}

                <button
                    onClick={handleEmailVerification}
                    disabled={phase === "processing" || !email}
                    className={`w-full px-4 py-3 rounded font-medium text-white transition flex items-center justify-center gap-2 ${phase === "processing" || !email
                            ? "bg-gray-400 cursor-not-allowed opacity-50"
                            : "bg-amber-600 hover:bg-amber-700"
                        }`}
                >
                    {phase === "processing" ? (
                        <>
                            <Loader className="w-4 h-4 animate-spin" />
                            Sending Link...
                        </>
                    ) : (
                        <>
                            <Mail className="w-4 h-4" />
                            Send Verification Link
                        </>
                    )}
                </button>

                <button
                    onClick={() => {
                        setSelectedMethod(null);
                        setError(null);
                        setEmail("");
                    }}
                    className="w-full px-4 py-2 rounded font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition"
                >
                    Back
                </button>
            </div>
        );
    }

    // Payment method selection
    return (
        <div className="flex flex-col gap-4 p-6 bg-gray-50 border border-gray-200 rounded-lg">
            <div>
                <h3 className="font-semibold text-gray-900">Select Payment Method</h3>
                <p className="text-sm text-gray-600 mt-1">
                    You're not in Pi Browser. Choose an alternative payment method.
                </p>
            </div>

            <div className="grid grid-cols-1 gap-3">
                <button
                    onClick={() => setSelectedMethod("email-verification")}
                    className="flex items-center gap-3 p-4 border border-gray-300 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition text-left"
                >
                    <Mail className="w-5 h-5 text-blue-600 flex-shrink-0" />
                    <div>
                        <p className="font-medium text-gray-900">Email Verification</p>
                        <p className="text-xs text-gray-600">Verify your email to complete</p>
                    </div>
                </button>

                <button
                    onClick={handleStripePayment}
                    className="flex items-center gap-3 p-4 border border-gray-300 rounded-lg hover:bg-purple-50 hover:border-purple-300 transition text-left"
                >
                    <div className="w-5 h-5 bg-purple-600 rounded flex-shrink-0 flex items-center justify-center text-white text-xs font-bold">
                        $
                    </div>
                    <div>
                        <p className="font-medium text-gray-900">Pay with Card</p>
                        <p className="text-xs text-gray-600">Stripe powered payment</p>
                    </div>
                </button>

                <button
                    onClick={handleManualPayment}
                    className="flex items-center gap-3 p-4 border border-gray-300 rounded-lg hover:bg-green-50 hover:border-green-300 transition text-left"
                >
                    <div className="w-5 h-5 bg-green-600 rounded flex-shrink-0 flex items-center justify-center text-white text-xs font-bold">
                        ✓
                    </div>
                    <div>
                        <p className="font-medium text-gray-900">Manual Payment</p>
                        <p className="text-xs text-gray-600">Contact support for payment</p>
                    </div>
                </button>
            </div>

            {onCancel && (
                <button
                    onClick={onCancel}
                    className="w-full px-4 py-2 rounded font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-100 transition"
                >
                    Cancel
                </button>
            )}
        </div>
    );
}

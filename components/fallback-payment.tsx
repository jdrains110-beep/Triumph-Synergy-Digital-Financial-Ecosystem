/**
 * components/fallback-payment.tsx
 * Fallback payment component for users not in Pi Browser
 * Supports alternate payment methods (email verification, Stripe, etc.)
 */

"use client";

import { AlertCircle, CheckCircle, Loader, Mail } from "lucide-react";
import { useState } from "react";

export type FallbackPaymentProps = {
  amount: number;
  memo: string;
  metadata?: Record<string, unknown>;
  onSuccess?: (method: string, reference: string) => void;
  onError?: (error: Error) => void;
  onCancel?: () => void;
};

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
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(
    null
  );
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
      const errorMsg =
        err instanceof Error ? err.message : "Payment request failed";
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
      const errorMsg =
        err instanceof Error ? err.message : "Stripe payment failed";
      setError(errorMsg);
      setPhase("error");
      onError?.(err instanceof Error ? err : new Error(errorMsg));
    }
  };

  const handleManualPayment = () => {
    try {
      setPhase("processing");

      // Create manual payment request (for admin review)
      const paymentRef = `MANUAL-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      setReference(paymentRef);
      setPhase("success");
      onSuccess?.("manual", paymentRef);

      console.log(
        "[Fallback Payment] Manual payment created with reference:",
        reference
      );
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
      <div className="flex flex-col items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-6">
        <CheckCircle className="h-8 w-8 text-green-600" />
        <div className="text-center">
          <h3 className="font-semibold text-green-900">Payment Submitted</h3>
          <p className="mt-1 text-green-700 text-sm">
            Amount: ${amount.toFixed(2)}
          </p>
          {reference && (
            <p className="mt-2 mt-3 rounded bg-green-100 px-3 py-1 font-mono text-green-600 text-xs">
              Reference: {reference}
            </p>
          )}
          <p className="mt-3 text-green-600 text-xs">
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
            setPhase("selecting");
            setError(null);
            setSelectedMethod(null);
            setEmail("");
          }}
        >
          Try Again
        </button>
      </div>
    );
  }

  if (selectedMethod === "email-verification") {
    return (
      <div className="flex flex-col gap-4 rounded-lg border border-amber-200 bg-amber-50 p-6">
        <div>
          <h3 className="font-semibold text-gray-900">Email Verification</h3>
          <p className="mt-1 text-gray-600 text-sm">
            We'll send you a verification link to complete the payment
          </p>
        </div>

        <input
          className="w-full rounded border border-gray-300 px-4 py-2 font-medium focus:border-amber-500 focus:outline-none"
          onChange={(e) => {
            setEmail(e.target.value);
            setError(null);
          }}
          placeholder="your@email.com"
          type="email"
          value={email}
        />

        {error && (
          <div className="flex items-center gap-2 rounded bg-red-100 p-3 text-red-900">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        <button
          className={`flex w-full items-center justify-center gap-2 rounded px-4 py-3 font-medium text-white transition ${
            phase === "processing" || !email
              ? "cursor-not-allowed bg-gray-400 opacity-50"
              : "bg-amber-600 hover:bg-amber-700"
          }`}
          disabled={phase === "processing" || !email}
          onClick={handleEmailVerification}
        >
          {phase === "processing" ? (
            <>
              <Loader className="h-4 w-4 animate-spin" />
              Sending Link...
            </>
          ) : (
            <>
              <Mail className="h-4 w-4" />
              Send Verification Link
            </>
          )}
        </button>

        <button
          className="w-full rounded bg-gray-100 px-4 py-2 font-medium text-gray-700 transition hover:bg-gray-200"
          onClick={() => {
            setSelectedMethod(null);
            setError(null);
            setEmail("");
          }}
        >
          Back
        </button>
      </div>
    );
  }

  // Payment method selection
  return (
    <div className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-gray-50 p-6">
      <div>
        <h3 className="font-semibold text-gray-900">Select Payment Method</h3>
        <p className="mt-1 text-gray-600 text-sm">
          You're not in Pi Browser. Choose an alternative payment method.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <button
          className="flex items-center gap-3 rounded-lg border border-gray-300 p-4 text-left transition hover:border-blue-300 hover:bg-blue-50"
          onClick={() => setSelectedMethod("email-verification")}
        >
          <Mail className="h-5 w-5 flex-shrink-0 text-blue-600" />
          <div>
            <p className="font-medium text-gray-900">Email Verification</p>
            <p className="text-gray-600 text-xs">
              Verify your email to complete
            </p>
          </div>
        </button>

        <button
          className="flex items-center gap-3 rounded-lg border border-gray-300 p-4 text-left transition hover:border-purple-300 hover:bg-purple-50"
          onClick={handleStripePayment}
        >
          <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded bg-purple-600 font-bold text-white text-xs">
            $
          </div>
          <div>
            <p className="font-medium text-gray-900">Pay with Card</p>
            <p className="text-gray-600 text-xs">Stripe powered payment</p>
          </div>
        </button>

        <button
          className="flex items-center gap-3 rounded-lg border border-gray-300 p-4 text-left transition hover:border-green-300 hover:bg-green-50"
          onClick={handleManualPayment}
        >
          <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded bg-green-600 font-bold text-white text-xs">
            ✓
          </div>
          <div>
            <p className="font-medium text-gray-900">Manual Payment</p>
            <p className="text-gray-600 text-xs">Contact support for payment</p>
          </div>
        </button>
      </div>

      {onCancel && (
        <button
          className="w-full rounded border border-gray-300 bg-white px-4 py-2 font-medium text-gray-700 transition hover:bg-gray-100"
          onClick={onCancel}
        >
          Cancel
        </button>
      )}
    </div>
  );
}

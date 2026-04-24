/**
 * components/fallback-payment.tsx
 * Fallback payment component for users not yet in Pi Browser.
 * All payments are sovereign Pi Network transactions only.
 * Users are guided to open Pi Browser or request a Pi payment link.
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

/** Only Pi-sovereign payment options — no Web2 processors permitted. */
type PaymentMethod = "pi-link" | "pi-address" | "manual";
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

  /**
   * Send a Pi payment request link via the Triumph sovereign API.
   * No Web2 processors involved — payment settles on-chain via Pi Network.
   */
  const handlePiLinkPayment = async () => {
    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address to receive your Pi payment link");
      return;
    }

    try {
      setPhase("processing");
      setError(null);

      const response = await fetch("/api/payments/fallback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          memo,
          email,
          method: "pi-link",
          metadata: {
            ...metadata,
            method: "pi-link",
            fallback: true,
            timestamp: new Date().toISOString(),
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Pi payment link request failed");
      }

      const data = await response.json();
      setReference(data.reference || data.id);
      setPhase("success");
      onSuccess?.("pi-link", data.reference);
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Pi payment link request failed";
      setError(errorMsg);
      setPhase("error");
      onError?.(err instanceof Error ? err : new Error(errorMsg));
    }
  };

  /**
   * Direct Pi address payment — user sends Pi from their wallet to this address.
   * Fully sovereign, no third-party processors.
   */
  const handlePiAddressPayment = () => {
    try {
      setPhase("processing");
      const paymentRef = `PI-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
      setReference(paymentRef);
      setPhase("success");
      onSuccess?.("pi-address", paymentRef);
    } catch (err) {
      const errorMsg = "Pi address payment initiation failed";
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
            {selectedMethod === "pi-link"
              ? `Check ${email} for your Pi payment link`
              : "Your Pi payment has been registered. Open Pi Browser to complete it."}
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

  if (selectedMethod === "pi-link") {
    return (
      <div className="flex flex-col gap-4 rounded-lg border border-amber-200 bg-amber-50 p-6">
        <div>
          <h3 className="font-semibold text-gray-900">Pi Payment Link</h3>
          <p className="mt-1 text-gray-600 text-sm">
            Enter your email to receive a Pi Browser payment link.
            The payment settles on-chain — no credit cards or third-party processors.
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
          onClick={handlePiLinkPayment}
        >
          {phase === "processing" ? (
            <>
              <Loader className="h-4 w-4 animate-spin" />
              Sending Pi Link...
            </>
          ) : (
            <>
              <Mail className="h-4 w-4" />
              Send Pi Payment Link
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
<div className="flex flex-col gap-4 rounded-lg border border-amber-200 bg-amber-50 p-6">
      <div>
        <h3 className="font-semibold text-gray-900">Pi Network Payment</h3>
        <p className="mt-1 text-gray-600 text-sm">
          This is a sovereign Pi ecosystem. All transactions settle on the Pi blockchain.
          Open Pi Browser for the best experience, or choose an option below.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <button
          className="flex items-center gap-3 rounded-lg border border-amber-300 p-4 text-left transition hover:border-amber-500 hover:bg-amber-100"
          onClick={() => setSelectedMethod("pi-link")}
        >
          <Mail className="h-5 w-5 flex-shrink-0 text-amber-600" />
          <div>
            <p className="font-medium text-gray-900">Pi Payment Link via Email</p>
            <p className="text-gray-600 text-xs">
              Receive a Pi Browser deep-link to complete your on-chain payment
            </p>
          </div>
        </button>

        <button
          className="flex items-center gap-3 rounded-lg border border-amber-300 p-4 text-left transition hover:border-amber-500 hover:bg-amber-100"
          onClick={handlePiAddressPayment}
        >
          <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded bg-amber-500 font-bold text-white text-xs">
            π
          </div>
          <div>
            <p className="font-medium text-gray-900">Send Pi Directly</p>
            <p className="text-gray-600 text-xs">
              Copy the Pi address and send from your Pi wallet — fully sovereign
            </p>
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

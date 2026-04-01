"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { realPi } from "@/lib/quantum-pi-browser-sdk";

type PiPaymentButtonProps = {
  amount: number;
  memo: string;
  metadata?: Record<string, any>;
  onPaymentSuccess?: (paymentId: string, txid?: string) => void;
  onPaymentError?: (error: any) => void;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
};

export const PiPaymentButton: React.FC<PiPaymentButtonProps> = ({
  amount,
  memo,
  metadata = {},
  onPaymentSuccess,
  onPaymentError,
  disabled = false,
  className = "",
  children,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  const [isPiBrowser, setIsPiBrowser] = useState(false);
  const [network, setNetwork] = useState<"testnet" | "mainnet">("mainnet");

  useEffect(() => {
    const checkAvailability = async () => {
      // First check if in Pi Browser
      const inPiBrowser = realPi.isPiBrowser();
      setIsPiBrowser(inPiBrowser);

      const available = await realPi.isAvailable();
      setIsAvailable(available);
      setNetwork(realPi.getNetwork());

      if (available) {
      } else if (!inPiBrowser) {
        console.warn("⚠️ Not in Pi Browser - Pi payments require Pi Browser app");
      } else {
        console.warn(
          "⚠️ Pi SDK not available - payments disabled. Check authentication."
        );
      }
    };

    checkAvailability();

    // Check again when window gains focus (user might have opened Pi Browser)
    const handleFocus = () => checkAvailability();
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [network]);

  const handlePayment = async () => {
    if (isProcessing || !isAvailable) {
      return;
    }

    setIsProcessing(true);
    try {
      const result = await realPi.createPayment({
        amount,
        memo,
        metadata,
      });

      if (result.success) {
        // Verify transaction on blockchain using RPC
        if (result.txid) {
          try {
            const verification = await realPi.verifyTransaction(result.txid);
            if (verification.verified) {
              console.log("✓ Transaction verified on blockchain:", verification);
            } else {
              console.warn("⚠️ Transaction verification failed:", verification.error);
            }
          } catch (verifyError) {
            console.warn("⚠️ Transaction verification error:", verifyError);
          }
        }

        onPaymentSuccess?.(result.paymentId || "", result.txid);
      } else {
        throw new Error(result.error || "Payment failed");
      }
    } catch (error) {
      console.error("✗ Payment failed:", error);
      onPaymentError?.(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const isDisabled = disabled || isProcessing || !isAvailable;
  const buttonLabel = isAvailable
    ? isProcessing
      ? "Processing..."
      : children || `Pay ${amount} Pi`
    : isPiBrowser
      ? "Authenticating..."
      : "Open in Pi Browser";

  return (
    <button
      className={`rounded bg-blue-500 px-4 py-2 text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-gray-400 ${className}`}
      disabled={isDisabled}
      onClick={handlePayment}
      title={
        isAvailable
          ? undefined
          : isPiBrowser
            ? "Pi SDK is loading or authentication required"
            : "Must open app in Pi Browser to enable payments"
      }
    >
      {buttonLabel}
    </button>
  );
};

export default PiPaymentButton;

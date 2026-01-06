/**
 * lib/pi-sdk/use-pi-payment.ts
 * Hook for making Pi payments from client components
 */

"use client";

import { useState, useCallback } from "react";
import { usePi } from "./pi-provider";

type PaymentOptions = {
  orderId: string;
  amount: number;
  memo?: string;
  metadata?: Record<string, unknown>;
};

type PaymentResult = {
  success: boolean;
  transactionId?: string;
  error?: string;
};

export function usePiPayment() {
  const { requestPayment, isReady, isLoading, error } = usePi();
  const [isPending, setIsPending] = useState(false);

  const makePayment = useCallback(
    async (options: PaymentOptions): Promise<PaymentResult> => {
      if (!isReady) {
        return {
          success: false,
          error: "Pi SDK not ready",
        };
      }

      setIsPending(true);
      try {
        // Step 1: Request payment from Pi SDK
        const transactionId = await requestPayment(
          [
            {
              amount: options.amount,
              memo: options.memo || `Order ${options.orderId}`,
              metadata: options.metadata,
            },
          ],
          options.memo
        );

        // Step 2: Send payment confirmation to backend API
        const apiResponse = await fetch("/api/payments", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            method: "pi_network",
            orderId: options.orderId,
            amount: options.amount,
            transactionId,
            metadata: options.metadata,
          }),
        });

        if (!apiResponse.ok) {
          const errorData = await apiResponse.json();
          return {
            success: false,
            error: errorData.error || "Payment processing failed",
          };
        }

        const result = await apiResponse.json();

        setIsPending(false);
        return {
          success: result.success,
          transactionId: result.paymentId || transactionId,
        };
      } catch (err) {
        setIsPending(false);
        return {
          success: false,
          error: err instanceof Error ? err.message : "Payment failed",
        };
      }
    },
    [isReady, requestPayment]
  );

  return {
    makePayment,
    isPending: isPending || isLoading,
    error,
  };
}

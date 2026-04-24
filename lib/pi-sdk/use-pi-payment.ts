/**
 * lib/pi-sdk/use-pi-payment.ts
 * Hook for making Pi payments from client components
 * Uses simplified piSDK2026.pay() for easy integration
 */

"use client";

import { useCallback, useState } from "react";
import { piSDK2026 } from "@/lib/pi-sdk-2026";

type PaymentOptions = {
  orderId?: string;
  amount: number;
  memo?: string;
  metadata?: Record<string, unknown>;
};

type PaymentResult = {
  success: boolean;
  transactionId?: string;
  paymentId?: string;
  error?: string;
};

export function usePiPayment() {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  const makePayment = useCallback(
    async (options: PaymentOptions): Promise<PaymentResult> => {
      setIsPending(true);
      setError(undefined);
      try {
        const result = (await piSDK2026.pay({
          amount: options.amount,
          memo: options.memo || `Order ${options.orderId || "unknown"}`,
          metadata: options.metadata || {},
        })) as {
          success: boolean;
          txid?: string;
          paymentId?: string;
          error?: { message?: string } | string;
        };

        if (result.success) {
          return {
            success: true,
            transactionId: result.txid,
            paymentId: result.paymentId,
          };
        }
        const errorMsg =
          typeof result.error === "object" && result.error?.message
            ? result.error.message
            : String(result.error || "Payment failed");
        setError(errorMsg);
        return {
          success: false,
          error: errorMsg,
        };
      } catch (err: any) {
        const errorMsg = err?.message || "Payment failed";
        setError(errorMsg);
        return {
          success: false,
          error: errorMsg,
        };
      } finally {
        setIsPending(false);
      }
    },
    []
  );

  return {
    makePayment,
    isPending,
    error,
  };
}

/**
 * lib/pi-sdk/use-pi-payment.ts
 * Hook for making Pi payments from client components
 */

"use client";

import { useCallback, useState } from "react";
import { piSDK2026 } from "@/lib/pi-sdk-2026";

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
                const [isPending, setIsPending] = useState(false);
                const [error, setError] = useState<string | undefined>(undefined);

                const makePayment = useCallback(
                  async (options: PaymentOptions): Promise<PaymentResult> => {
                    setIsPending(true);
                    setError(undefined);
                    try {
                      const result = await piSDK2026.pay({
                        amount: options.amount,
                        memo: options.memo || `Order ${options.orderId}`,
                        metadata: options.metadata || {},
                      });
                      if (result.success) {
                        return {
                          success: true,
                          transactionId: result.txid,
                        };
                      } else {
                        setError(result.error || 'Payment failed');
                        return {
                          success: false,
                          error: result.error || 'Payment failed',
                        };
                      }
                    } catch (err: any) {
                      setError(err?.message || 'Payment failed');
                      return {
                        success: false,
                        error: err?.message || 'Payment failed',
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
    [isReady, requestPayment]

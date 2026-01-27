// 2026 Simplified Pi SDK - 10 Minute Integration
// Follows official minepi.com payment flow: https://github.com/pi-apps/pi-platform-docs/blob/master/payments.md

type PaymentCallbacks = {
  onSuccess?: (paymentId: string, txid: string) => void;
  onError?: (error: any) => void;
  onCancel?: (paymentId: string) => void;
};

export const piSDK2026 = {
  /**
   * Simplified Pi SDK payment - single-line payment with automatic verification
   * Handles: Pi.createPayment → onReadyForServerApproval → onReadyForServerCompletion
   * Per minepi.com docs: https://github.com/pi-apps/pi-platform-docs/blob/master/SDK_reference.md
   */
  async pay(
    { amount, memo, metadata }: { amount: number; memo: string; metadata: Record<string, any> },
    callbacks?: PaymentCallbacks
  ) {
    try {
      if (typeof window === "undefined" || !(window as any).Pi) {
        throw new Error("Pi SDK not available - must be accessed from Pi Browser");
      }

      const Pi = (window as any).Pi;
      let paymentId: string | null = null;

      // Create payment with server-side approval & completion callbacks
      // Per official minepi.com payment flow Phase I, II, III
      return new Promise((resolve) => {
        Pi.createPayment(
          {
            amount,
            memo,
            metadata: {
              ...metadata,
              environment: process.env.NEXT_PUBLIC_PI_SANDBOX === "true" ? "testnet" : "mainnet",
              created_at: new Date().toISOString(),
            },
          },
          {
            // Phase I: Server-Side Approval
            onReadyForServerApproval: async (currentPaymentId: string) => {
              paymentId = currentPaymentId;
              console.log("[piSDK2026] Payment ready for approval:", currentPaymentId);
              try {
                const approveRes = await fetch("/api/pi/approve", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    paymentId: currentPaymentId,
                    amount,
                    memo,
                    metadata,
                  }),
                });
                if (!approveRes.ok) throw new Error("Server approval failed");
                console.log("[piSDK2026] Server approval successful");
              } catch (err) {
                console.error("[piSDK2026] Approval error:", err);
                callbacks?.onError?.(err);
                resolve({ success: false, error: err });
              }
            },

            // Phase III: Server-Side Completion
            onReadyForServerCompletion: async (currentPaymentId: string, txid: string) => {
              console.log("[piSDK2026] Payment ready for completion:", currentPaymentId, "txid:", txid);
              try {
                const completeRes = await fetch("/api/pi/complete", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    paymentId: currentPaymentId,
                    txid,
                    amount,
                    memo,
                    metadata,
                  }),
                });
                if (!completeRes.ok) throw new Error("Server completion failed");
                console.log("[piSDK2026] Server completion successful");
                callbacks?.onSuccess?.(currentPaymentId, txid);
                resolve({
                  success: true,
                  paymentId: currentPaymentId,
                  txid,
                });
              } catch (err) {
                console.error("[piSDK2026] Completion error:", err);
                callbacks?.onError?.(err);
                resolve({ success: false, error: err });
              }
            },

            onCancel: (currentPaymentId: string) => {
              console.log("[piSDK2026] Payment cancelled:", currentPaymentId);
              callbacks?.onCancel?.(currentPaymentId);
              resolve({ success: false, error: "Payment cancelled" });
            },

            onError: (error: Error) => {
              console.error("[piSDK2026] Payment error:", error);
              callbacks?.onError?.(error);
              resolve({ success: false, error });
            },
          }
        );
      });
    } catch (error) {
      console.error("[piSDK2026] Payment error:", error);
      return { success: false, error };
    }
  },
};

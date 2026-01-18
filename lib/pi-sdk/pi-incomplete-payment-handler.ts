/**
 * lib/pi-sdk/pi-incomplete-payment-handler.ts
 * Handles recovery of incomplete Pi payments
 * References: https://github.com/pi-apps/pi-platform-docs/blob/master/payments.md
 */

export type IncompletePayment = {
  identifier: string;
  amount: number;
  memo?: string;
  metadata?: Record<string, unknown>;
  createdAt: number;
  status: "pending" | "approved" | "completed" | "cancelled";
};

const INCOMPLETE_PAYMENTS_STORAGE_KEY = "triumph_synergy_incomplete_payments";
const INCOMPLETE_PAYMENT_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Get all incomplete payments from local storage
 */
export function getIncompletePayments(): IncompletePayment[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const stored = localStorage.getItem(INCOMPLETE_PAYMENTS_STORAGE_KEY);
    if (!stored) return [];

    const payments = JSON.parse(stored) as IncompletePayment[];
    const now = Date.now();

    // Filter out expired payments (> 24 hours old)
    return payments.filter((p) => now - p.createdAt < INCOMPLETE_PAYMENT_TTL);
  } catch (err) {
    console.error("[Incomplete Payments] Error reading from storage:", err);
    return [];
  }
}

/**
 * Add an incomplete payment to storage
 */
export function storeIncompletePayment(payment: IncompletePayment): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const existing = getIncompletePayments();
    const updated = [...existing, { ...payment, createdAt: Date.now() }];
    localStorage.setItem(
      INCOMPLETE_PAYMENTS_STORAGE_KEY,
      JSON.stringify(updated)
    );
    console.log(
      "[Incomplete Payments] Stored incomplete payment:",
      payment.identifier
    );
  } catch (err) {
    console.error("[Incomplete Payments] Error storing payment:", err);
  }
}

/**
 * Remove an incomplete payment from storage (after recovery)
 */
export function removeIncompletePayment(paymentId: string): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const existing = getIncompletePayments();
    const updated = existing.filter((p) => p.identifier !== paymentId);
    localStorage.setItem(
      INCOMPLETE_PAYMENTS_STORAGE_KEY,
      JSON.stringify(updated)
    );
    console.log("[Incomplete Payments] Removed incomplete payment:", paymentId);
  } catch (err) {
    console.error("[Incomplete Payments] Error removing payment:", err);
  }
}

/**
 * Handle callback for incomplete payments found during authentication
 * Called when user logs in and Pi SDK finds incomplete payments
 */
export async function handleIncompletePaymentFound(payment: any): Promise<void> {
  console.log("[Incomplete Payments] Payment found during auth:", payment);

  const incompletePayment: IncompletePayment = {
    identifier: payment.identifier || payment.id,
    amount: payment.amount,
    memo: payment.memo,
    metadata: payment.metadata,
    createdAt: Date.now(),
    status: payment.status || "pending",
  };

  storeIncompletePayment(incompletePayment);

  // Log to analytics
  if (typeof window !== "undefined" && (window as any).gtag) {
    (window as any).gtag("event", "incomplete_payment_detected", {
      payment_id: payment.identifier,
      amount: payment.amount,
    });
  }
}

/**
 * Recover incomplete payments by requesting completion
 * Should be called after successful authentication
 */
export async function recoverIncompletePayments(
  onPaymentRecovered?: (payment: IncompletePayment) => void
): Promise<IncompletePayment[]> {
  if (typeof window === "undefined") {
    return [];
  }

  const Pi = (window as any).Pi;
  if (!Pi) {
    console.warn("[Incomplete Payments] Pi SDK not available");
    return [];
  }

  const incomplete = getIncompletePayments();
  if (incomplete.length === 0) {
    console.log("[Incomplete Payments] No incomplete payments to recover");
    return [];
  }

  console.log(
    `[Incomplete Payments] Recovering ${incomplete.length} incomplete payment(s)`
  );

  const recovered: IncompletePayment[] = [];

  for (const payment of incomplete) {
    try {
      // Call Pi SDK to recover the payment
      // This will prompt user if needed
      const result = await Pi.createPayment({
        identifier: payment.identifier,
        amount: payment.amount,
        memo: payment.memo,
        metadata: payment.metadata,
      });

      if (result) {
        recovered.push(payment);
        removeIncompletePayment(payment.identifier);

        if (onPaymentRecovered) {
          onPaymentRecovered(payment);
        }

        console.log(
          "[Incomplete Payments] Successfully recovered payment:",
          payment.identifier
        );
      }
    } catch (err) {
      console.error(
        "[Incomplete Payments] Failed to recover payment:",
        payment.identifier,
        err
      );
    }
  }

  return recovered;
}

/**
 * Clear all incomplete payments (useful for cleanup)
 */
export function clearIncompletePayments(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    localStorage.removeItem(INCOMPLETE_PAYMENTS_STORAGE_KEY);
    console.log("[Incomplete Payments] Cleared all incomplete payments");
  } catch (err) {
    console.error("[Incomplete Payments] Error clearing payments:", err);
  }
}

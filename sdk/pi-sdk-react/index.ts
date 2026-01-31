/**
 * Pi Network React SDK
 * Local implementation for browser-side Pi payments
 */

// Import types from the canonical type definition file
import type {
  PiAuthResult,
  PiPayment,
  PiPaymentCallbacks,
  PiPaymentData,
} from "../../types/pi-sdk.d";

// Re-export types for consumers of this module
export type { PiAuthResult, PiPayment, PiPaymentData, PiPaymentCallbacks };

/**
 * Pi SDK wrapper for React applications
 */
export const Pi = {
  /**
   * Initialize the Pi SDK
   * NOTE: Pi SDK should be initialized by PiProvider, not here
   */
  init(config: { version?: string; sandbox?: boolean } = {}): boolean {
    console.warn(
      "[Pi SDK React] init called - SDK should be initialized by PiProvider"
    );
    return true;
  },

  /**
   * Authenticate user with Pi Network
   */
  async authenticate(
    scopes: string[] = ["username", "payments"],
    onIncompletePaymentFound?: (payment: PiPayment) => void
  ): Promise<PiAuthResult | null> {
    if (typeof window === "undefined" || !window.Pi) {
      console.warn("Pi SDK not available");
      return null;
    }

    try {
      return await window.Pi.authenticate(scopes, onIncompletePaymentFound);
    } catch (error) {
      console.error("Pi authentication failed:", error);
      throw error;
    }
  },

  /**
   * Create a payment request
   */
  async createPayment(
    paymentData: PiPaymentData & Partial<PiPaymentCallbacks>
  ): Promise<PiPayment | null> {
    if (typeof window === "undefined" || !window.Pi) {
      console.warn("Pi SDK not available");
      return null;
    }

    const {
      amount,
      memo,
      metadata = {},
      onReadyForServerApproval,
      onReadyForServerCompletion,
      onCancel,
      onError,
    } = paymentData;

    const callbacks: PiPaymentCallbacks = {
      onReadyForServerApproval:
        onReadyForServerApproval ||
        (() => {
          /* noop */
        }),
      onReadyForServerCompletion:
        onReadyForServerCompletion ||
        (() => {
          /* noop */
        }),
      onCancel:
        onCancel ||
        (() => {
          /* noop */
        }),
      onError:
        onError || ((error) => console.error("Pi payment error:", error)),
    };

    try {
      return await window.Pi.createPayment(
        { amount, memo, metadata },
        callbacks
      );
    } catch (error) {
      console.error("Pi payment creation failed:", error);
      throw error;
    }
  },

  /**
   * Check if running in Pi Browser
   */
  isInPiBrowser(): boolean {
    if (typeof window === "undefined" || typeof navigator === "undefined") {
      return false;
    }
    return (
      navigator.userAgent.includes("PiBrowser") ||
      navigator.userAgent.includes("Pi Network") ||
      !!window.Pi
    );
  },
};

export default Pi;

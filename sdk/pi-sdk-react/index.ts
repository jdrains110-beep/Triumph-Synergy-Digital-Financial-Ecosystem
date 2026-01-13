/**
 * Pi Network React SDK
 * Local implementation for browser-side Pi payments
 */

// Global Pi object that will be loaded from the Pi Browser
declare global {
  // biome-ignore lint/nursery/useConsistentTypeDefinitions: Interface merging required for global augmentation
  interface Window {
    Pi?: {
      init: (config: { version: string; sandbox?: boolean }) => void;
      authenticate: (
        scopes: string[],
        onIncompletePaymentFound?: (payment: PiPayment) => void
      ) => Promise<PiAuthResult>;
      createPayment: (
        paymentData: PiPaymentData,
        callbacks: PiPaymentCallbacks
      ) => Promise<PiPayment>;
    };
  }
}

export type PiAuthResult = {
  accessToken: string;
  user: {
    uid: string;
    username: string;
  };
};

export type PiPayment = {
  identifier: string;
  user_uid: string;
  amount: number;
  memo: string;
  metadata: Record<string, unknown>;
  status: {
    developer_approved: boolean;
    transaction_verified: boolean;
    developer_completed: boolean;
    cancelled: boolean;
    user_cancelled: boolean;
  };
  transaction?: {
    txid: string;
    verified: boolean;
  };
};

export type PiPaymentData = {
  amount: number;
  memo: string;
  metadata?: Record<string, unknown>;
};

export type PiPaymentCallbacks = {
  onReadyForServerApproval: (paymentId: string) => void | Promise<void>;
  onReadyForServerCompletion: (
    paymentId: string,
    txid: string
  ) => void | Promise<void>;
  onCancel: (paymentId: string) => void;
  onError: (error: Error, payment?: PiPayment) => void;
};

/**
 * Pi SDK wrapper for React applications
 */
export const Pi = {
  /**
   * Initialize the Pi SDK
   */
  init(config: { version?: string; sandbox?: boolean } = {}): boolean {
    if (typeof window === "undefined") {
      console.warn("Pi SDK can only be initialized in browser environment");
      return false;
    }

    if (!window.Pi) {
      console.warn("Pi SDK not loaded. Please ensure you are in Pi Browser.");
      return false;
    }

    window.Pi.init({
      version: config.version || "2.0",
      sandbox: config.sandbox ?? process.env.NEXT_PUBLIC_PI_SANDBOX === "true",
    });

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

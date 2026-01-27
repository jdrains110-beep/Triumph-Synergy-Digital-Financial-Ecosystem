/**
 * lib/payments/pi-payments-official.ts
 * Official Pi Payments integration based on minepi.com/blog/10-minutes-pi-payments
 *
 * References:
 * - https://minepi.com/blog/10-minutes-pi-payments
 * - https://github.com/pi-apps/pi-sdk-js
 * - https://github.com/pi-apps/pi-sdk-nextjs
 * - https://github.com/pi-apps/pi-sdk-react
 */

export type OfficialPiPaymentConfig = {
  // Application identification
  appId: string;
  apiKey: string;
  apiSecret: string;

  // Environment
  sandbox?: boolean;
  network?: "testnet" | "mainnet";

  // Callbacks
  approveCallback?: (paymentId: string) => Promise<void>;
  completeCallback?: (paymentId: string, txid: string) => Promise<void>;
  cancelCallback?: (paymentId: string) => Promise<void>;
  errorCallback?: (paymentId: string, error: string) => Promise<void>;
  incompleteCallback?: (payment: any) => Promise<void>;
};

export type PiPaymentRequest = {
  amount: number;
  memo: string;
  metadata?: Record<string, unknown>;
  externalId?: string;
};

export type PiPaymentResponse = {
  paymentId: string;
  txid?: string;
  status: "pending" | "approved" | "completed" | "failed" | "cancelled";
  amount: number;
  memo: string;
  timestamp: Date;
  error?: string;
};

export type PiUser = {
  uid: string;
  username: string;
  email?: string;
};

// =============================================================================
// OFFICIAL PI PAYMENTS ADAPTER
// =============================================================================

export class OfficialPiPayments {
  private readonly config: OfficialPiPaymentConfig;
  private user: PiUser | null = null;
  private connected = false;

  constructor(config: OfficialPiPaymentConfig) {
    this.config = {
      sandbox: true,
      network: "testnet",
      ...config,
    };

    console.log(
      `[Pi Payments] Initialized with app ${config.appId} (${this.config.network})`
    );
  }

  /**
   * Connect to Pi Network (authentication)
   * Based on: https://github.com/pi-apps/pi-sdk-js
   */
  async connect(): Promise<PiUser> {
    if (typeof window === "undefined") {
      throw new Error("[Pi Payments] Not running in browser");
    }

    const Pi = (window as any).Pi;
    if (!Pi) {
      throw new Error(
        "[Pi Payments] Pi SDK not available - ensure script is loaded"
      );
    }

    try {
      // Initialize Pi SDK
      await Pi.init({
        version: "2.0",
        appId: this.config.appId,
        chestnut: this.config.sandbox,
        onIncompletePaymentFound: this.config.incompleteCallback,
      });

      console.log("[Pi Payments] ✓ Pi SDK initialized");

      // Authenticate user
      const authResult = await Pi.auth.login();

      this.user = {
        uid: authResult.user?.uid || "",
        username: authResult.user?.username || "",
        email: authResult.user?.email,
      };

      this.connected = true;

      console.log(
        `[Pi Payments] ✓ Connected as ${this.user.username} (${this.user.uid})`
      );

      return this.user;
    } catch (error) {
      console.error("[Pi Payments] Connection failed:", error);
      throw error;
    }
  }

  /**
   * Disconnect from Pi Network
   */
  async disconnect(): Promise<void> {
    if (typeof window === "undefined") {
      return;
    }

    const Pi = (window as any).Pi;
    if (!Pi) {
      return;
    }

    try {
      await Pi.auth.logout?.();
      this.connected = false;
      this.user = null;
      console.log("[Pi Payments] ✓ Disconnected");
    } catch (error) {
      console.error("[Pi Payments] Disconnect error:", error);
    }
  }

  /**
   * Create a payment
   * Based on official Pi SDK payment flow
   */
  async createPayment(request: PiPaymentRequest): Promise<PiPaymentResponse> {
    if (!this.connected || !this.user) {
      throw new Error("[Pi Payments] Not connected - call connect() first");
    }

    if (typeof window === "undefined") {
      throw new Error("[Pi Payments] Not running in browser");
    }

    const Pi = (window as any).Pi;
    if (!Pi?.payments) {
      throw new Error("[Pi Payments] Pi Payments not available");
    }

    try {
      console.log("[Pi Payments] Creating payment:", request);

      // Call official Pi SDK payment creation
      const paymentData = {
        amount: request.amount,
        memo: request.memo || "Triumph Synergy Payment",
        metadata: request.metadata || {},
      };

      const paymentResult = await Pi.payments.createPayment(paymentData);

      // Handle payment lifecycle
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("[Pi Payments] Payment timeout"));
        }, 60_000); // 60 second timeout

        // Payment approved by user
        const handleApproval = async (payment: any) => {
          clearTimeout(timeout);
          try {
            await this.config.approveCallback?.(payment.paymentId);
            resolve({
              paymentId: payment.paymentId,
              status: "approved",
              amount: request.amount,
              memo: request.memo,
              timestamp: new Date(),
            });
          } catch (error) {
            reject(error);
          }
        };

        // Payment completed on blockchain
        const handleCompletion = async (payment: any) => {
          clearTimeout(timeout);
          try {
            await this.config.completeCallback?.(
              payment.paymentId,
              payment.txid
            );
            resolve({
              paymentId: payment.paymentId,
              txid: payment.txid,
              status: "completed",
              amount: request.amount,
              memo: request.memo,
              timestamp: new Date(),
            });
          } catch (error) {
            reject(error);
          }
        };

        // Payment cancelled
        const handleCancellation = async (payment: any) => {
          clearTimeout(timeout);
          try {
            await this.config.cancelCallback?.(payment.paymentId);
            resolve({
              paymentId: payment.paymentId,
              status: "cancelled",
              amount: request.amount,
              memo: request.memo,
              timestamp: new Date(),
            });
          } catch (error) {
            reject(error);
          }
        };

        // Payment error
        const handleError = async (payment: any) => {
          clearTimeout(timeout);
          const errorMsg = payment.error?.message || "Unknown error";
          try {
            await this.config.errorCallback?.(payment.paymentId, errorMsg);
            resolve({
              paymentId: payment.paymentId,
              status: "failed",
              amount: request.amount,
              memo: request.memo,
              timestamp: new Date(),
              error: errorMsg,
            });
          } catch (error) {
            reject(error);
          }
        };

        // Set up payment event handlers
        paymentResult.onApproved = handleApproval;
        paymentResult.onCompleted = handleCompletion;
        paymentResult.onCancelled = handleCancellation;
        paymentResult.onError = handleError;
      });
    } catch (error) {
      console.error("[Pi Payments] Payment creation failed:", error);
      throw error;
    }
  }

  /**
   * Get current user
   */
  getUser(): PiUser | null {
    return this.user;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Get configuration
   */
  getConfig(): OfficialPiPaymentConfig {
    return this.config;
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    sdkAvailable: boolean;
    connected: boolean;
    user: PiUser | null;
  }> {
    const sdkAvailable = typeof window !== "undefined" && !!(window as any).Pi;
    return {
      sdkAvailable,
      connected: this.connected,
      user: this.user,
    };
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

export function createPiPayments(
  config: OfficialPiPaymentConfig
): OfficialPiPayments {
  return new OfficialPiPayments(config);
}

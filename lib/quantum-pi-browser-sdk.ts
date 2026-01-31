/**
 * Real Pi Browser SDK Implementation
 * Direct integration with Pi Network for REAL payments
 * 
 * Official Reference: https://github.com/pi-apps/pi-platform-docs/blob/master/payments.md
 * 
 * Payment Flow:
 * 1. User clicks "Pay with Pi" button
 * 2. App calls realPi.createPayment() with amount, memo, metadata
 * 3. Pi Browser opens payment approval dialog
 * 4. User confirms transaction in Pi Browser wallet
 * 5. Real Pi transferred from user wallet to app wallet
 * 6. App backend verifies transaction on blockchain
 * 7. App completes payment
 */

export type PaymentConfig = {
  amount: number;
  memo: string;
  metadata?: Record<string, any>;
};

export type PaymentResult = {
  success: boolean;
  paymentId?: string;
  txid?: string;
  error?: string;
};

/**
 * Real Pi Browser SDK - Creates actual blockchain transactions
 */
export const realPi = {
  /**
   * Create a real Pi payment
   * This opens the Pi Browser wallet for the user to approve the transaction
   * 
   * @param config - Payment configuration with amount, memo, metadata
   * @returns Promise resolving to payment result with transaction ID
   */
  async createPayment(config: PaymentConfig): Promise<PaymentResult> {
    try {
      // Check if running in Pi Browser
      if (typeof window === "undefined") {
        return {
          success: false,
          error: "Server-side execution not supported",
        };
      }

      if (!window.Pi) {
        return {
          success: false,
          error: "Pi SDK not available - must open in Pi Browser",
        };
      }

      console.log("[Real Pi] Creating payment:", config);

      const Pi = window.Pi;
      let paymentId: string | null = null;
      let txid: string | null = null;

      // Create payment - this opens Pi Browser wallet dialog
      return new Promise((resolve) => {
        // Determine network before creating payment
        const hostname = window.location.hostname;
        let environment: "testnet" | "mainnet" = "mainnet";
        if (hostname === "triumphsynergy1991.pinet.com") environment = "testnet";
        else if (hostname === "triumphsynergy7386.pinet.com") environment = "mainnet";
        else if (hostname === "triumphsynergy0576.pinet.com") environment = "mainnet";
        else if (hostname === "triumph-synergy.vercel.app") environment = "mainnet";
        else if (hostname.endsWith(".vercel.app")) environment = "testnet";
        
        Pi.createPayment(
          {
            amount: config.amount,
            memo: config.memo,
            metadata: {
              ...config.metadata,
              environment,
              createdAt: new Date().toISOString(),
            },
          },
          {
            // PHASE I: Payment created, ready for server approval
            onReadyForServerApproval: async (currentPaymentId: string) => {
              paymentId = currentPaymentId;
              console.log("[Real Pi] Phase I - Ready for server approval:", paymentId);

              try {
                // Backend approves the payment
                const approveRes = await fetch("/api/pi/approve", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    paymentId,
                    amount: config.amount,
                    memo: config.memo,
                    metadata: config.metadata,
                  }),
                });

                if (!approveRes.ok) {
                  throw new Error("Server approval failed");
                }

                console.log("[Real Pi] Phase I - Server approval successful");
              } catch (err) {
                console.error("[Real Pi] Phase I - Server approval error:", err);
                throw err;
              }
            },

            // PHASE II: Blockchain transaction completed
            onReadyForServerCompletion: async (
              currentPaymentId: string,
              txidValue: string
            ) => {
              paymentId = currentPaymentId;
              txid = txidValue;
              console.log(
                "[Real Pi] Phase II - Blockchain transaction completed:",
                txid
              );

              try {
                // Backend completes the payment
                const completeRes = await fetch("/api/pi/complete", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    paymentId,
                    txid,
                    amount: config.amount,
                    memo: config.memo,
                    metadata: config.metadata,
                  }),
                });

                if (!completeRes.ok) {
                  throw new Error("Server completion failed");
                }

                console.log("[Real Pi] Phase II - Server completion successful");

                // SUCCESS
                resolve({
                  success: true,
                  paymentId,
                  txid,
                });
              } catch (err) {
                console.error("[Real Pi] Phase II - Server completion error:", err);
                resolve({
                  success: false,
                  paymentId,
                  txid,
                  error: String(err),
                });
              }
            },

            // User cancelled the payment
            onCancel: (currentPaymentId: string) => {
              console.log("[Real Pi] Payment cancelled:", currentPaymentId);
              resolve({
                success: false,
                paymentId: currentPaymentId,
                error: "User cancelled payment",
              });
            },

            // Error occurred
            onError: (error: Error) => {
              console.error("[Real Pi] Payment error:", error);
              resolve({
                success: false,
                error: error.message,
              });
            },
          }
        );
      });
    } catch (error) {
      console.error("[Real Pi] Unexpected error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },

  /**
   * Check if Pi SDK is available and authenticated
   * Payment buttons should only be enabled when this returns true
   */
  async isAvailable(): Promise<boolean> {
    if (typeof window === "undefined") {
      console.log("[Real Pi] isAvailable: Server-side");
      return false;
    }

    // Check if window.Pi exists
    if (!window.Pi) {
      console.log("[Real Pi] isAvailable: window.Pi not found");
      return false;
    }

    // Check if Pi has been authenticated (done by auto-init script)
    const piInit = (window as any).__piInitialization;
    if (!piInit) {
      console.log("[Real Pi] isAvailable: No __piInitialization state");
      return false;
    }

    if (piInit.status !== "ready") {
      console.log("[Real Pi] isAvailable: Pi SDK status is", piInit.status, "not ready");
      return false;
    }

    if (!piInit.authenticated) {
      console.log("[Real Pi] isAvailable: Pi SDK not authenticated");
      return false;
    }

    console.log("[Real Pi] ✓ isAvailable: True - Pi authenticated and ready for payments");
    return true;
  },

  /**
   * Get current network (testnet or mainnet)
   */
  getNetwork(): "testnet" | "mainnet" {
    if (typeof window === "undefined") {
      return "mainnet";
    }

    const hostname = window.location.hostname;
    // EXPLICIT FULL DOMAIN MATCHING
    if (hostname === "triumphsynergy1991.pinet.com") return "testnet";
    if (hostname === "triumphsynergy7386.pinet.com") return "mainnet";
    if (hostname === "triumphsynergy0576.pinet.com") return "mainnet";
    if (hostname === "triumph-synergy.vercel.app") return "mainnet";
    // Vercel branch previews are testnet
    if (hostname.endsWith(".vercel.app")) return "testnet";
    return "mainnet";
  },

  /**
   * Authenticate user with Pi
   */
  async authenticate(): Promise<{ success: boolean; error?: string }> {
    try {
      if (!window.Pi) {
        return {
          success: false,
          error: "Pi SDK not available",
        };
      }

      console.log("[Real Pi] Authenticating user...");

      const authResult = await window.Pi.authenticate(["payments"]);

      console.log("[Real Pi] ✓ Authentication successful");

      return {
        success: true,
      };
    } catch (error) {
      console.error("[Real Pi] Authentication error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Authentication failed",
      };
    }
  },
};

/**
 * Global Pi type extensions
 */
declare global {
  interface Window {
    Pi: {
      init(config: any): Promise<void>;
      authenticate(scopes: string[]): Promise<any>;
      createPayment(
        paymentConfig: any,
        callbacks: {
          onReadyForServerApproval: (paymentId: string) => Promise<void>;
          onReadyForServerCompletion: (paymentId: string, txid: string) => Promise<void>;
          onCancel: (paymentId: string) => void;
          onError: (error: Error) => void;
        }
      ): void;
      auth: {
        login(): Promise<any>;
        logout(): Promise<void>;
        getAuthToken(): string | null;
      };
      payments?: any;
    };
  }
}

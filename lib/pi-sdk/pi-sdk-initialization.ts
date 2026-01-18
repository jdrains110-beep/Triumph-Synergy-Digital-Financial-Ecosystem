/**
 * lib/pi-sdk/pi-sdk-initialization.ts
 * Complete Pi SDK and Pi Browser initialization and recognition
 */

import { detectPiBrowser, type PiBrowserInfo } from "./pi-browser-detector";
import { loadPiSDKScript, waitForPiSDK } from "./pi-sdk-script-loader";

// =============================================================================
// RE-EXPORTS FROM BROWSER DETECTOR
// =============================================================================

export type { PiBrowserInfo };

export type PiSDK = {
  // Authentication
  auth: {
    init: (config: AuthConfig) => Promise<AuthResult>;
    login: () => Promise<AuthResult>;
    logout: () => Promise<void>;
    getAuthToken: () => string | null;
  };

  // Payments
  payments: {
    createPayment: (config: PaymentConfig) => Promise<PaymentResult>;
    approvePayment: (paymentId: string) => Promise<PaymentResult>;
    completePayment: (paymentId: string, txid: string) => Promise<void>;
    getPaymentStatus: (paymentId: string) => Promise<PaymentStatus>;
  };

  // Network
  network: {
    getNetwork: () => "testnet" | "mainnet";
    getBlockchain: () => string;
  };

  // User
  user: {
    getMe: () => Promise<UserInfo>;
    getUsername: () => string | null;
    getUID: () => string | null;
  };
};

export type AuthConfig = {
  scope: string[];
  onIncompletePaymentFound?: (payment: any) => void;
};

export type AuthResult = {
  user: UserInfo;
  accessToken: string;
};

export type UserInfo = {
  username: string;
  uid: string;
  displayName: string;
};

export type PaymentConfig = {
  amount: number;
  memo: string;
  metadata?: Record<string, unknown>;
};

export type PaymentResult = {
  paymentId: string;
  txid?: string;
  status: PaymentStatus;
};

export enum PaymentStatus {
  PENDING = "pending",
  APPROVED = "approved",
  COMPLETED = "completed",
  FAILED = "failed",
  CANCELLED = "cancelled",
}

// =============================================================================
// PI SDK INITIALIZER
// =============================================================================

export class PiSDKInitializer {
  private static instance: PiSDKInitializer | null = null;
  private sdk: PiSDK | null = null;
  private browserInfo: PiBrowserInfo | null = null;
  private initialized = false;
  private initPromise: Promise<void> | null = null;

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): PiSDKInitializer {
    if (!PiSDKInitializer.instance) {
      PiSDKInitializer.instance = new PiSDKInitializer();
    }
    return PiSDKInitializer.instance;
  }

  /**
   * Initialize Pi SDK
   */
  async initialize(): Promise<{
    success: boolean;
    sdk: PiSDK | null;
    browserInfo: PiBrowserInfo;
    error?: string;
  }> {
    // Return cached promise if already initializing
    if (this.initPromise) {
      return this.initPromise.then(() => ({
        success: !!this.sdk,
        sdk: this.sdk,
        browserInfo: this.browserInfo!,
      }));
    }

    // Return cached result if already initialized
    if (this.initialized) {
      return {
        success: !!this.sdk,
        sdk: this.sdk,
        browserInfo: this.browserInfo!,
      };
    }

    this.initPromise = this._performInitialization();
    return this.initPromise.then(() => ({
      success: !!this.sdk,
      sdk: this.sdk,
      browserInfo: this.browserInfo!,
    }));
  }

  /**
   * Perform actual initialization
   */
  private async _performInitialization(): Promise<void> {
    try {
      // Attempt to load the SDK (with CDN fallbacks) before detection
      // Don't block if SDK fails to load
      try {
        await Promise.race([
          loadPiSDKScript(),
          new Promise((_, reject) => setTimeout(() => reject(new Error("SDK load timeout")), 3000))
        ]);
        await waitForPiSDK(10, 100); // Max 1 second wait
      } catch (err) {
        console.warn("[Pi SDK] Failed to load SDK, continuing anyway:", err);
      }

      // Detect Pi Browser after attempting load
      this.browserInfo = detectPiBrowser();

      if (!this.browserInfo.isAvailable) {
        console.warn("[Pi SDK] Not running in browser - Pi SDK unavailable");
        this.initialized = true;
        return;
      }

      // Load Pi SDK
      await this._loadPiSDK();

      if (this.sdk) {
        console.log("[Pi SDK] ✓ Initialization successful", {
          isPiBrowser: this.browserInfo.isPiBrowser,
          piNetworkAvailable: this.browserInfo.isPiNetworkAvailable,
          version: this.browserInfo.version,
        });
      }

      this.initialized = true;
    } catch (error) {
      console.error(
        "[Pi SDK] Initialization failed:",
        error instanceof Error ? error.message : "Unknown error"
      );
      this.initialized = true;
    }
  }

  /**
   * Load Pi SDK from global window object
   */
  private async _loadPiSDK(): Promise<void> {
    if (typeof window === "undefined") {
      return;
    }

    // Ensure the SDK had time to attach to window
    await waitForPiSDK();

    const piGlobal = (window as any).Pi;

    if (!piGlobal) {
      console.warn("[Pi SDK] Pi object not found in window");
      return;
    }

    // Wrap the global Pi object with proper typing
    this.sdk = {
      auth: {
        init: async (config: AuthConfig) => {
          try {
            const result = await piGlobal.init(config);
            return result;
          } catch (error) {
            throw new Error(
              `Pi auth.init failed: ${error instanceof Error ? error.message : "Unknown error"}`
            );
          }
        },
        login: async () => {
          try {
            const result = await piGlobal.auth.login();
            return result;
          } catch (error) {
            throw new Error(
              `Pi auth.login failed: ${error instanceof Error ? error.message : "Unknown error"}`
            );
          }
        },
        logout: async () => {
          try {
            await piGlobal.auth.logout();
          } catch (error) {
            throw new Error(
              `Pi auth.logout failed: ${error instanceof Error ? error.message : "Unknown error"}`
            );
          }
        },
        getAuthToken: () => {
          try {
            return piGlobal.auth.getAuthToken?.();
          } catch (error) {
            console.error("[Pi SDK] getAuthToken error", error);
            return null;
          }
        },
      },

      payments: {
        createPayment: async (config: PaymentConfig) => {
          try {
            const result = await piGlobal.payments.createPayment(config);
            return result;
          } catch (error) {
            throw new Error(
              `Pi createPayment failed: ${error instanceof Error ? error.message : "Unknown error"}`
            );
          }
        },
        approvePayment: async (paymentId: string) => {
          try {
            const result = await piGlobal.payments.approvePayment(paymentId);
            return result;
          } catch (error) {
            throw new Error(
              `Pi approvePayment failed: ${error instanceof Error ? error.message : "Unknown error"}`
            );
          }
        },
        completePayment: async (paymentId: string, txid: string) => {
          try {
            await piGlobal.payments.completePayment(paymentId, txid);
          } catch (error) {
            throw new Error(
              `Pi completePayment failed: ${error instanceof Error ? error.message : "Unknown error"}`
            );
          }
        },
        getPaymentStatus: async (paymentId: string) => {
          try {
            const status = await piGlobal.payments.getPaymentStatus(paymentId);
            return status as PaymentStatus;
          } catch (error) {
            throw new Error(
              `Pi getPaymentStatus failed: ${error instanceof Error ? error.message : "Unknown error"}`
            );
          }
        },
      },

      network: {
        getNetwork: () => piGlobal.network?.getNetwork?.() || "testnet",
        getBlockchain: () => piGlobal.network?.getBlockchain?.() || "pi",
      },

      user: {
        getMe: async () => {
          try {
            return await piGlobal.user?.getMe?.();
          } catch (error) {
            throw new Error(
              `Pi getMe failed: ${error instanceof Error ? error.message : "Unknown error"}`
            );
          }
        },
        getUsername: () => piGlobal.user?.getUsername?.() || null,
        getUID: () => piGlobal.user?.getUID?.() || null,
      },
    };
  }

  /**
   * Get initialized SDK
   */
  getSDK(): PiSDK | null {
    return this.sdk;
  }

  /**
   * Get browser info
   */
  getBrowserInfo(): PiBrowserInfo | null {
    return this.browserInfo;
  }

  /**
   * Check if initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Check if Pi Browser is available
   */
  isPiBrowserAvailable(): boolean {
    return this.browserInfo?.isPiBrowser || false;
  }

  /**
   * Check if Pi Network is available
   */
  isPiNetworkAvailable(): boolean {
    return this.browserInfo?.isPiNetworkAvailable || false;
  }

  /**
   * Get Pi Browser version
   */
  getPiBrowserVersion(): string | undefined {
    return this.browserInfo?.version;
  }
}

// =============================================================================
// GLOBAL INITIALIZATION HOOKS
// =============================================================================

/**
 * Initialize Pi SDK on app startup
 */
export async function initializePiSDKOnStartup(): Promise<void> {
  if (typeof window === "undefined") {
    return;
  }

  const initializer = PiSDKInitializer.getInstance();
  const result = await initializer.initialize();

  if (result.success) {
    console.log("✓ Pi SDK initialized successfully");
  } else if (result.browserInfo.isAvailable) {
    console.warn("⚠ Pi SDK not available - running in web fallback mode");
  }
}

// =============================================================================
// SINGLETON EXPORTS
// =============================================================================

export const piSDKInitializer = PiSDKInitializer.getInstance();

/**
 * Get or initialize Pi SDK
 */
export async function getPiSDK(): Promise<PiSDK | null> {
  const initializer = PiSDKInitializer.getInstance();
  const result = await initializer.initialize();
  return result.sdk;
}

/**
 * Get Pi Browser detection info
 */
export function getPiBrowserInfo(): PiBrowserInfo | null {
  return PiSDKInitializer.getInstance().getBrowserInfo();
}

/**
 * Check if running in Pi Browser
 */
export function isRunningInPiBrowser(): boolean {
  return PiSDKInitializer.getInstance().isPiBrowserAvailable();
}

/**
 * Check if Pi Network is available
 */
export function isPiNetworkAvailable(): boolean {
  return PiSDKInitializer.getInstance().isPiNetworkAvailable();
}

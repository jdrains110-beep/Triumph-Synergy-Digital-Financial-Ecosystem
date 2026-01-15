"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

/**
 * Pi SDK Context
 * Provides global access to Pi SDK across the application
 */

type PiUser = {
  uid: string;
  username: string;
  email?: string;
};

type PiContextType = {
  isReady: boolean;
  isAuthenticated: boolean;
  user: PiUser | null;
  requestPayment: (
    payments: Array<{
      amount: number;
      memo?: string;
      metadata?: Record<string, unknown>;
    }>,
    memo?: string
  ) => Promise<string>;
  requestApproval: (memo?: string) => Promise<string>;
  isLoading: boolean;
  error: string | null;
  authenticate: () => Promise<void>;
};

const PiContext = createContext<PiContextType | undefined>(undefined);

export function PiProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<PiUser | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sdkInitialized, setSdkInitialized] = useState(false);

  // Initialize Pi SDK (without auto-authentication to prevent crashes)
  useEffect(() => {
    // Skip on server
    if (typeof window === "undefined") {
      return;
    }

    // Prevent re-initialization
    if (sdkInitialized) {
      return;
    }

    const initializePi = async () => {
      try {
        console.log("[Pi SDK] Starting initialization...");

        // Check if we're in Pi Browser by looking for Pi object
        // Give it a short time to appear
        await new Promise((resolve) => setTimeout(resolve, 500));

        if (!(window as any).Pi) {
          console.log("[Pi SDK] Not in Pi Browser - using fallback mode");
          setIsReady(true);
          setSdkInitialized(true);
          setUser({
            uid: `web-${Date.now()}`,
            username: "Web User",
          });
          return;
        }

        const Pi = (window as any).Pi;

        // Initialize Pi SDK with version 2.0
        // Wrap in try-catch to handle any SDK errors gracefully
        try {
          await Pi.init({
            version: "2.0",
            sandbox: process.env.NEXT_PUBLIC_PI_SANDBOX === "true",
          });
          console.log("[Pi SDK] SDK initialized successfully");
        } catch (initError) {
          console.warn("[Pi SDK] Init warning:", initError);
          // Continue anyway - some init errors are non-fatal
        }

        // Mark as ready WITHOUT auto-authenticating
        // Authentication should be triggered by user action
        setIsReady(true);
        setSdkInitialized(true);
        console.log("[Pi SDK] Ready (authentication available on demand)");

      } catch (err) {
        console.error("[Pi SDK] Initialization error:", err);
        setError(err instanceof Error ? err.message : "SDK init failed");
        // Still mark as ready so app doesn't hang
        setIsReady(true);
        setSdkInitialized(true);
      }
    };

    initializePi();
  }, [sdkInitialized]);

  // Manual authentication function (call when user initiates action)
  const authenticate = async (): Promise<void> => {
    if (!(window as any).Pi) {
      console.log("[Pi SDK] Not in Pi Browser - skipping authentication");
      return;
    }

    try {
      setIsLoading(true);
      const Pi = (window as any).Pi;
      const authResult = await Pi.authenticate(
        ["username"],
        (payment: any) => {
          // Incomplete payment callback
          console.log("[Pi SDK] Incomplete payment found:", payment);
        }
      );

      console.log("[Pi SDK] User authenticated:", authResult);
      setIsAuthenticated(true);
      setUser({
        uid: authResult.user.uid,
        username: authResult.user.username,
        email: authResult.user.email,
      });
    } catch (authError) {
      console.log("[Pi SDK] Authentication declined or failed:", authError);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Request payment through Pi SDK
  const requestPayment = async (
    payments: Array<{
      amount: number;
      memo?: string;
      metadata?: Record<string, unknown>;
    }>,
    memo?: string
  ): Promise<string> => {
    if (!isReady || !(window as any).Pi) {
      throw new Error("Pi SDK not ready");
    }

    try {
      setIsLoading(true);
      const Pi = (window as any).Pi;

      // Add timeout protection
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(
          () =>
            reject(
              new Error(
                "Payment request timeout - Pi SDK did not respond within 30 seconds"
              )
            ),
          30_000
        )
      );

      const paymentPromise = Pi.payments.request({
        amount: payments[0]?.amount || 0,
        memo: memo || payments[0]?.memo || "Triumph Synergy Payment",
        metadata: payments[0]?.metadata || {},
      });

      const paymentResult = await Promise.race([
        paymentPromise,
        timeoutPromise,
      ]);

      console.log("[Pi SDK] Payment requested:", paymentResult);
      setIsLoading(false);

      return paymentResult.transaction.txid || paymentResult.transaction;
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Payment request failed";
      console.error("[Pi SDK] Payment error:", err);
      setError(errorMsg);
      setIsLoading(false);
      throw new Error(errorMsg);
    }
  };

  // Request user approval
  const requestApproval = async (memo?: string): Promise<string> => {
    if (!isReady || !(window as any).Pi) {
      throw new Error("Pi SDK not ready");
    }

    try {
      setIsLoading(true);
      const Pi = (window as any).Pi;

      const approval = await Pi.auth.checkServerLogin();

      console.log("[Pi SDK] Approval checked:", approval);
      setIsLoading(false);

      return approval ? "approved" : "pending";
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Approval request failed";
      console.error("[Pi SDK] Approval error:", err);
      setError(errorMsg);
      setIsLoading(false);
      throw new Error(errorMsg);
    }
  };

  const value: PiContextType = {
    isReady,
    isAuthenticated,
    user,
    requestPayment,
    requestApproval,
    isLoading,
    error,
    authenticate,
  };

  return <PiContext.Provider value={value}>{children}</PiContext.Provider>;
}

/**
 * Hook to use Pi SDK context
 */
export function usePi() {
  const context = useContext(PiContext);
  if (!context) {
    throw new Error("usePi must be used within a PiProvider");
  }
  return context;
}

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
};

const PiContext = createContext<PiContextType | undefined>(undefined);

export function PiProvider({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<PiUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize Pi SDK
  useEffect(() => {
    const initializePi = async () => {
      try {
        // Check if Pi SDK is loaded
        if (typeof window === "undefined") {
          console.log("[Pi SDK] Server-side rendering - skipping initialization");
          return;
        }

        // Wait for Pi SDK script to load
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds max wait (50 * 100ms)

        while (!((window as any).Pi) && attempts < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 100));
          attempts++;
        }

        if (!(window as any).Pi) {
          console.log(
            "[Pi SDK] Pi SDK not available - continuing in fallback mode"
          );
          setTimeout(() => {
            if (!isReady) {
              setIsReady(true);
              setIsLoading(false);
              console.log("[Pi SDK] ✓ Fallback mode enabled - app continues");
            }
          }, 500);
          return;
        }

        const Pi = (window as any).Pi;

        // Initialize Pi SDK with version 2.0
        await Pi.init({
          version: "2.0",
          sandbox:
            process.env.NEXT_PUBLIC_PI_SANDBOX === "true" ||
            process.env.NODE_ENV === "development",
        });

        console.log("[Pi SDK] Pi SDK initialized successfully");

        // Authenticate user
        try {
          const authResult = await Pi.authenticate();
          console.log("[Pi SDK] User authenticated:", authResult);

          setIsAuthenticated(true);
          setUser({
            uid: authResult.user.uid,
            username: authResult.user.username,
            email: authResult.user.email,
          });
        } catch (authError) {
          console.log(
            "[Pi SDK] User not authenticated (not required for some operations):",
            authError
          );
          setIsAuthenticated(false);
          // Still allow guest payments
          setUser({
            uid: `guest-${Date.now()}`,
            username: "Guest User",
          });
        }

        setIsReady(true);
        setIsLoading(false);
      } catch (err) {
        console.error("[Pi SDK] Initialization error:", err);
        setError(
          err instanceof Error ? err.message : "Failed to initialize Pi SDK"
        );
        // Still allow app to continue
        setIsReady(true);
        setIsLoading(false);
      }
    };

    initializePi();
  }, []);

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
          30000
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

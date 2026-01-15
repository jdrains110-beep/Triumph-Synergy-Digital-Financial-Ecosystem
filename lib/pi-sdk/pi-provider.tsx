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

        // Wait for Pi SDK script to load (it's loaded via script tag in HTML)
        // Pi Browser injects window.Pi when it loads the app
        let attempts = 0;
        const maxAttempts = 20; // Wait up to 10 seconds (20 * 500ms)
        
        while (!(window as any).Pi && attempts < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 500));
          attempts++;
          console.log(`[Pi SDK] Waiting for Pi object... (${attempts}/${maxAttempts})`);
        }

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
        console.log("[Pi SDK] Pi object detected!");

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

  // Request payment through Pi SDK with proper server callbacks
  const requestPayment = async (
    payments: Array<{
      amount: number;
      memo?: string;
      metadata?: Record<string, unknown>;
    }>,
    memo?: string
  ): Promise<string> => {
    if (!(window as any).Pi) {
      throw new Error("Pi SDK not available - must be accessed from Pi Browser");
    }

    try {
      setIsLoading(true);
      setError(null);
      const Pi = (window as any).Pi;

      const paymentData = {
        amount: payments[0]?.amount || 0,
        memo: memo || payments[0]?.memo || "Triumph Synergy Payment",
        metadata: payments[0]?.metadata || {},
      };

      // Pi SDK createPayment with required server-side callbacks
      const payment = await Pi.createPayment(paymentData, {
        // Called when payment is ready for server approval
        onReadyForServerApproval: async (paymentId: string) => {
          console.log("[Pi SDK] Payment ready for server approval:", paymentId);
          try {
            const response = await fetch("/api/pi_payment/approve", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                paymentId,
                amount: paymentData.amount,
                memo: paymentData.memo,
                metadata: paymentData.metadata,
              }),
            });
            
            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || "Server approval failed");
            }
            
            const result = await response.json();
            console.log("[Pi SDK] Server approval successful:", result);
          } catch (err) {
            console.error("[Pi SDK] Server approval error:", err);
            throw err;
          }
        },
        
        // Called when payment is ready for server completion
        onReadyForServerCompletion: async (paymentId: string, txid: string) => {
          console.log("[Pi SDK] Payment ready for server completion:", { paymentId, txid });
          try {
            const response = await fetch("/api/pi_payment/complete", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                paymentId,
                txid,
                amount: paymentData.amount,
                memo: paymentData.memo,
                metadata: paymentData.metadata,
              }),
            });
            
            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || "Server completion failed");
            }
            
            const result = await response.json();
            console.log("[Pi SDK] Server completion successful:", result);
          } catch (err) {
            console.error("[Pi SDK] Server completion error:", err);
            throw err;
          }
        },
        
        // Called when payment is cancelled
        onCancel: (paymentId: string) => {
          console.log("[Pi SDK] Payment cancelled:", paymentId);
          setError("Payment was cancelled");
        },
        
        // Called on error
        onError: (error: Error, payment?: any) => {
          console.error("[Pi SDK] Payment error:", error, payment);
          setError(error.message || "Payment failed");
        },
      });

      console.log("[Pi SDK] Payment completed:", payment);
      setIsLoading(false);

      return payment?.transaction?.txid || payment?.identifier || "success";
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Payment request failed";
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

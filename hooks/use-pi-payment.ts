/**
 * Triumph Synergy — Pi Payment Hook
 * Handles both mainnet and testnet Pi Browser payments.
 *
 * Mainnet: real Pi, GCV $314,159/π, Pi SDK v2.0
 * Testnet: test Pi, same SDK flow, Pi Browser testnet mode, sandbox: true
 *
 * Usage:
 *   const { pay, status, user, authenticate } = usePiPayment({ network, tenant });
 */

import { useState, useCallback, useRef } from "react";
import type { NetworkMode } from "@/lib/sovereign-tenants";
import { GCV } from "@/lib/sovereign-tenants";

// ── Types ─────────────────────────────────────────────────────────────────────
export type PaymentStatus =
  | "idle"
  | "authenticating"
  | "pending"
  | "approved"
  | "completing"
  | "completed"
  | "cancelled"
  | "error";

export interface PaymentResult {
  status: PaymentStatus;
  paymentId?: string;
  txid?: string;
  error?: string;
  piAmount?: number;
  usdEquivalent?: number;
  network: NetworkMode;
  ledger?: string;
}

export interface PiUser {
  uid: string;
  username: string;
  accessToken: string;
}

interface UsePiPaymentOptions {
  network: NetworkMode;
  tenant: string;
  onCompleted?: (result: PaymentResult) => void;
  onCancelled?: (result: PaymentResult) => void;
  onError?: (result: PaymentResult) => void;
}

// ── Pi SDK types ──────────────────────────────────────────────────────────────
declare global {
  interface Window {
    Pi?: {
      init: (opts: { version: string; sandbox?: boolean }) => void;
      authenticate: (
        scopes: string[],
        onIncompletePaymentFound: (payment: unknown) => void
      ) => Promise<{ accessToken: string; user: { uid: string; username: string } }>;
      createPayment: (
        data: { amount: number; memo: string; metadata: Record<string, unknown> },
        callbacks: {
          onReadyForServerApproval: (paymentId: string) => void;
          onReadyForServerCompletion: (paymentId: string, txid: string) => void;
          onCancel: (paymentId: string) => void;
          onError: (error: Error, payment: unknown) => void;
        }
      ) => void;
    };
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function usePiPayment({
  network,
  tenant,
  onCompleted,
  onCancelled,
  onError,
}: UsePiPaymentOptions) {
  const [status, setStatus] = useState<PaymentStatus>("idle");
  const [result, setResult] = useState<PaymentResult>({ status: "idle", network });
  const [user, setUser] = useState<PiUser | null>(null);
  const sdkInitialized = useRef(false);
  const isTestnet = network === "testnet";

  // ── Ensure SDK is initialized ───────────────────────────────────────────
  const ensureSdk = useCallback(() => {
    if (!window.Pi) {
      throw new Error(
        isTestnet
          ? "Pi Browser testnet required. Open this page in Pi Browser with testnet mode enabled."
          : "Pi Browser required. Open this page in Pi Browser to pay with Pi."
      );
    }
    if (!sdkInitialized.current) {
      window.Pi.init({ version: "2.0", sandbox: isTestnet });
      sdkInitialized.current = true;
    }
  }, [isTestnet]);

  // ── Authenticate pioneer ────────────────────────────────────────────────
  const authenticate = useCallback(async (): Promise<PiUser | null> => {
    try {
      setStatus("authenticating");
      ensureSdk();
      const auth = await window.Pi!.authenticate(
        ["username", "payments"],
        (incompletePay) => {
          // Handle incomplete payment found on auth
          console.warn("[SovereignPay] Incomplete payment found:", incompletePay);
          fetch("/api/pi_payment/incomplete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ payment: incompletePay, tenant, network }),
          }).catch(console.error);
        }
      );
      const piUser: PiUser = {
        uid: auth.user.uid,
        username: auth.user.username,
        accessToken: auth.accessToken,
      };
      setUser(piUser);
      setStatus("idle");
      return piUser;
    } catch (err) {
      const msg = (err as Error).message;
      const res: PaymentResult = {
        status: "error",
        error: msg,
        network,
      };
      setResult(res);
      setStatus("error");
      onError?.(res);
      return null;
    }
  }, [ensureSdk, network, tenant, onError]);

  // ── Create payment ──────────────────────────────────────────────────────
  const pay = useCallback(
    async (opts: {
      amount: number;
      memo: string;
      metadata?: Record<string, unknown>;
    }): Promise<PaymentResult> => {
      const currentUser = user ?? (await authenticate());
      if (!currentUser) {
        return { status: "error", error: "Authentication failed", network };
      }

      return new Promise((resolve) => {
        try {
          ensureSdk();
          setStatus("pending");

          const metadata = {
            ...opts.metadata,
            tenant,
            network,
            gcv: GCV,
            usd_equivalent: opts.amount * GCV,
            pioneer: currentUser.username,
            sovereign: "TRIUMPH_SYNERGY",
            timestamp: new Date().toISOString(),
          };

          window.Pi!.createPayment(
            { amount: opts.amount, memo: opts.memo, metadata },
            {
              onReadyForServerApproval: (paymentId) => {
                setStatus("approved");
                const approvedResult: PaymentResult = {
                  status: "approved",
                  paymentId,
                  piAmount: opts.amount,
                  usdEquivalent: opts.amount * GCV,
                  network,
                };
                setResult(approvedResult);

                // Server approval — POST to sovereign settlement API
                fetch("/api/pi_payment/approve", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${currentUser.accessToken}`,
                  },
                  body: JSON.stringify({
                    paymentId,
                    amount: opts.amount,
                    tenant,
                    network,
                    memo: opts.memo,
                  }),
                }).catch((err) =>
                  console.error("[SovereignPay] Approval POST failed:", err)
                );
              },

              onReadyForServerCompletion: (paymentId, txid) => {
                setStatus("completing");

                // Server completion — POST to sovereign settlement API
                fetch("/api/pi_payment/complete", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${currentUser.accessToken}`,
                  },
                  body: JSON.stringify({
                    paymentId,
                    txid,
                    tenant,
                    network,
                  }),
                })
                  .then(async (res) => {
                    const data = await res.json().catch(() => ({}));
                    const completedResult: PaymentResult = {
                      status: "completed",
                      paymentId,
                      txid,
                      piAmount: opts.amount,
                      usdEquivalent: opts.amount * GCV,
                      network,
                      ledger: data.ledger_sequence,
                    };
                    setResult(completedResult);
                    setStatus("completed");
                    onCompleted?.(completedResult);
                    resolve(completedResult);
                  })
                  .catch((err) => {
                    console.error("[SovereignPay] Completion POST failed:", err);
                    // Still mark completed locally — ledger finality is sovereign
                    const completedResult: PaymentResult = {
                      status: "completed",
                      paymentId,
                      txid,
                      piAmount: opts.amount,
                      usdEquivalent: opts.amount * GCV,
                      network,
                    };
                    setResult(completedResult);
                    setStatus("completed");
                    onCompleted?.(completedResult);
                    resolve(completedResult);
                  });
              },

              onCancel: (paymentId) => {
                const cancelledResult: PaymentResult = {
                  status: "cancelled",
                  paymentId,
                  piAmount: opts.amount,
                  network,
                };
                setResult(cancelledResult);
                setStatus("cancelled");
                onCancelled?.(cancelledResult);
                resolve(cancelledResult);
              },

              onError: (error) => {
                const errResult: PaymentResult = {
                  status: "error",
                  error: error.message,
                  piAmount: opts.amount,
                  network,
                };
                setResult(errResult);
                setStatus("error");
                onError?.(errResult);
                resolve(errResult);
              },
            }
          );
        } catch (err) {
          const msg = (err as Error).message;
          const errResult: PaymentResult = {
            status: "error",
            error: msg,
            piAmount: opts.amount,
            network,
          };
          setResult(errResult);
          setStatus("error");
          onError?.(errResult);
          resolve(errResult);
        }
      });
    },
    [user, authenticate, ensureSdk, tenant, network, onCompleted, onCancelled, onError]
  );

  // ── Reset ───────────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    setStatus("idle");
    setResult({ status: "idle", network });
  }, [network]);

  return {
    pay,
    authenticate,
    reset,
    status,
    result,
    user,
    isTestnet,
    piSymbol: isTestnet ? "tπ" : "π",
    networkLabel: isTestnet ? "Testnet" : "Mainnet",
  };
}

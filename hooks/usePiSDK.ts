/**
 * hooks/usePiSDK.ts
 * React hook for Pi SDK initialization and usage
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import {
  initializePiSDKOnStartup,
  getPiSDK,
  getPiBrowserInfo,
  isRunningInPiBrowser,
  isPiNetworkAvailable,
  type PiSDK,
  type PiBrowserInfo,
} from "@/lib/pi-sdk/pi-sdk-initialization";

export interface PiSDKStatus {
  initialized: boolean;
  loading: boolean;
  error: string | null;
  sdk: PiSDK | null;
  browserInfo: PiBrowserInfo | null;
  isPiBrowser: boolean;
  isPiNetworkAvailable: boolean;
}

export function usePiSDK(): PiSDKStatus {
  const [status, setStatus] = useState<PiSDKStatus>({
    initialized: false,
    loading: true,
    error: null,
    sdk: null,
    browserInfo: getPiBrowserInfo(),
    isPiBrowser: isRunningInPiBrowser(),
    isPiNetworkAvailable: isPiNetworkAvailable(),
  });

  useEffect(() => {
    let isMounted = true;

    const initSDK = async () => {
      try {
        await initializePiSDKOnStartup();

        if (!isMounted) return;

        const sdk = await getPiSDK();
        const browserInfo = getPiBrowserInfo();

        setStatus({
          initialized: true,
          loading: false,
          error: null,
          sdk,
          browserInfo,
          isPiBrowser: isRunningInPiBrowser(),
          isPiNetworkAvailable: isPiNetworkAvailable(),
        });
      } catch (error) {
        if (!isMounted) return;

        setStatus((prev) => ({
          ...prev,
          initialized: true,
          loading: false,
          error: error instanceof Error ? error.message : "Unknown error",
        }));
      }
    };

    initSDK();

    return () => {
      isMounted = false;
    };
  }, []);

  return status;
}

/**
 * Hook to use Pi SDK if available
 */
export function usePiAuth() {
  const { sdk, error } = usePiSDK();

  const login = useCallback(async () => {
    if (!sdk?.auth) {
      throw new Error("Pi SDK not initialized");
    }
    return sdk.auth.login();
  }, [sdk]);

  const logout = useCallback(async () => {
    if (!sdk?.auth) {
      throw new Error("Pi SDK not initialized");
    }
    return sdk.auth.logout();
  }, [sdk]);

  return { login, logout, error };
}

/**
 * Hook to use Pi Payments if available
 */
export function usePiPayments() {
  const { sdk, error } = usePiSDK();

  const createPayment = useCallback(
    async (config: {
      amount: number;
      memo: string;
      metadata?: Record<string, unknown>;
    }) => {
      if (!sdk?.payments) {
        throw new Error("Pi Payments not initialized");
      }
      return sdk.payments.createPayment(config);
    },
    [sdk]
  );

  const getPaymentStatus = useCallback(
    async (paymentId: string) => {
      if (!sdk?.payments) {
        throw new Error("Pi Payments not initialized");
      }
      return sdk.payments.getPaymentStatus(paymentId);
    },
    [sdk]
  );

  return { createPayment, getPaymentStatus, error };
}

/**
 * components/smart-payment.tsx
 * Smart payment component that automatically selects Pi Browser or fallback UI
 */

"use client";

import { useEffect, useState } from "react";
import { FallbackPayment } from "./fallback-payment";
import {
  PiBrowserPayment,
  type PiBrowserPaymentProps,
} from "./pi-browser-payment";

type SmartPaymentProps = Omit<PiBrowserPaymentProps, "key"> & {
  showNetworkInfo?: boolean;
};

/**
 * Automatically detect environment and render appropriate payment component
 */
export function SmartPayment({
  amount,
  memo,
  metadata,
  onSuccess,
  onError,
  onCancel,
  showNetworkInfo = true,
}: SmartPaymentProps) {
  const [isPiBrowser, setIsPiBrowser] = useState<boolean | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // Detect Pi Browser after mount
    const isPi = typeof window !== "undefined" && !!(window as any).Pi;
    setIsPiBrowser(isPi);

    if (isPi) {
      console.log(
        "[Smart Payment] Pi Browser detected, using native component"
      );
    } else {
      console.log(
        "[Smart Payment] Not in Pi Browser, using fallback component"
      );
    }
  }, []);

  if (!mounted || isPiBrowser === null) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-pulse text-gray-500">
          Initializing payment...
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {showNetworkInfo && (
        <div className="flex items-center gap-2 rounded bg-blue-100 p-3 text-blue-900 text-sm">
          {isPiBrowser ? (
            <>
              <span className="h-2 w-2 flex-shrink-0 rounded-full bg-blue-600" />
              <span>
                <strong>Pi Browser Detected:</strong> Using native Pi Network
                payment
              </span>
            </>
          ) : (
            <>
              <span className="h-2 w-2 flex-shrink-0 rounded-full bg-amber-600" />
              <span>
                <strong>Not in Pi Browser:</strong> Using alternative payment
                method
              </span>
            </>
          )}
        </div>
      )}

      {isPiBrowser ? (
        <PiBrowserPayment
          amount={amount}
          memo={memo}
          metadata={metadata}
          onCancel={onCancel}
          onError={onError}
          onSuccess={onSuccess}
        />
      ) : (
        <FallbackPayment
          amount={amount}
          memo={memo}
          metadata={metadata}
          onCancel={onCancel}
          onError={onError}
          onSuccess={onSuccess}
        />
      )}
    </div>
  );
}

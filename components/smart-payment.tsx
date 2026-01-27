/**
 * components/smart-payment.tsx
 * Smart payment component that automatically selects Pi Browser or fallback UI
 */

"use client";

import { useEffect, useState } from "react";
import { piSDK2026 } from "@/lib/pi-sdk-2026";
import { PiBrowserPayment, type PiBrowserPaymentProps } from "./pi-browser-payment";
import { FallbackPayment, type FallbackPaymentProps } from "./fallback-payment";

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
            console.log("[Smart Payment] Pi Browser detected, using native component");
        } else {
            console.log("[Smart Payment] Not in Pi Browser, using fallback component");
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
                <div className="flex items-center gap-2 p-3 bg-blue-100 text-blue-900 rounded text-sm">
                    {isPiBrowser ? (
                        <>
                            <span className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0"></span>
                            <span>
                                <strong>Pi Browser Detected:</strong> Using native Pi Network payment
                            </span>
                        </>
                    ) : (
                        <>
                            <span className="w-2 h-2 bg-amber-600 rounded-full flex-shrink-0"></span>
                            <span>
                                <strong>Not in Pi Browser:</strong> Using alternative payment method
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
                    onSuccess={onSuccess}
                    onError={onError}
                    onCancel={onCancel}
                />
            ) : (
                <FallbackPayment
                    amount={amount}
                    memo={memo}
                    metadata={metadata}
                    onSuccess={onSuccess}
                    onError={onError}
                    onCancel={onCancel}
                />
            )}
        </div>
    );
}

"use client";
import React, { useState, useEffect } from 'react';

// Pi SDK types are declared in sdk/pi-sdk-react/index.ts
// We use the global Window interface from there

interface PiPaymentButtonProps {
  amount: number;
  memo: string;
  onSuccess?: (payment: any) => void;
  onError?: (error: any) => void;
  metadata?: Record<string, any>;
  isAdmin?: boolean;
}

export default function PiPaymentButton({
  amount,
  memo,
  onSuccess,
  onError,
  metadata = { custom: 'triumph-synergy' },
  isAdmin = false
}: PiPaymentButtonProps) {
  const [isPiReady, setIsPiReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize Pi SDK
  useEffect(() => {
    const initializePi = async () => {
      try {
        // Load Pi SDK script if not already loaded
        if (!document.querySelector('script[src*="sdk.minepi.com"]')) {
          const script = document.createElement('script');
          script.src = 'https://sdk.minepi.com/pi-sdk.js';
          script.async = true;
          script.onload = () => {
            console.log('[Pi SDK] Script loaded successfully');
            initializePiSDK();
          };
          script.onerror = () => {
            setError('Failed to load Pi SDK');
          };
          document.head.appendChild(script);
        } else {
          initializePiSDK();
        }
      } catch (err) {
        console.error('[Pi SDK] Initialization error:', err);
        setError('Pi SDK initialization failed');
      }
    };

    const initializePiSDK = async () => {
      try {
        // Wait for Pi SDK to be ready
        let attempts = 0;
        while (!window.Pi && attempts < 100) {
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }

        if (!window.Pi) {
          setError('Pi SDK not loaded. Please refresh the page.');
          return;
        }

        console.log('[Pi SDK] Initializing Pi Network v2.0...');

        // Initialize Pi SDK
        await window.Pi.init({
          version: '2.0',
          sandbox: process.env.NEXT_PUBLIC_PI_SANDBOX === 'true'
        });

        console.log('[Pi SDK] Initialized successfully');
        setIsPiReady(true);

        // Authenticate user
        try {
          const auth = await window.Pi.authenticate(
            ['username', 'payments'],
            onIncompletePaymentFound
          );
          console.log('[Pi SDK] Authentication successful:', auth);
          setUser(auth.user);
          setIsAuthenticated(true);
        } catch (authError) {
          console.warn('[Pi SDK] Authentication failed:', authError);
          // Continue without authentication for now
        }

      } catch (initError) {
        console.error('[Pi SDK] Init error:', initError);
        setError('Pi SDK initialization failed');
      }
    };

    const onIncompletePaymentFound = (payment: any) => {
      console.log('[Pi SDK] Incomplete payment found:', payment);
      // Handle incomplete payments
    };

    initializePi();
  }, []);

  const handlePayment = async () => {
    if (!isPiReady) {
      const errorMsg = 'Pi SDK not ready. Please wait or refresh the page.';
      setError(errorMsg);
      if (onError) onError(new Error(errorMsg));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('[Pi Payment] Creating payment:', { amount, memo, metadata });

      if (!window.Pi) {
        throw new Error('Pi SDK not available');
      }

      const payment = await window.Pi.createPayment({
        amount,
        memo,
        metadata: {
          ...metadata,
          isAdmin,
          timestamp: new Date().toISOString()
        }
      }, {
        onReadyForServerApproval: async (paymentId: string) => {
          console.log('[Pi Payment] Ready for server approval:', paymentId);

          try {
            const response = await fetch('/api/pi/approve', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                paymentId,
                amount,
                memo,
                metadata: { ...metadata, isAdmin },
                user,
                isAdmin
              }),
            });

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || 'Approval failed');
            }

            const approvalData = await response.json();
            console.log('[Pi Payment] Server approval successful:', approvalData);

            return approvalData;
          } catch (approvalError) {
            console.error('[Pi Payment] Server approval failed:', approvalError);
            throw approvalError;
          }
        },

        onReadyForServerCompletion: async (paymentId: string, txid: string) => {
          console.log('[Pi Payment] Ready for server completion:', { paymentId, txid });

          try {
            const response = await fetch('/api/pi/complete', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                paymentId,
                txid,
                amount,
                memo,
                metadata: { ...metadata, isAdmin },
                user,
                isAdmin
              }),
            });

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || 'Completion failed');
            }

            const completionData = await response.json();
            console.log('[Pi Payment] Server completion successful:', completionData);

            return completionData;
          } catch (completionError) {
            console.error('[Pi Payment] Server completion failed:', completionError);
            throw completionError;
          }
        },

        onCancel: (paymentId: string) => {
          console.log('[Pi Payment] Payment cancelled:', paymentId);
          setLoading(false);
          setError('Payment cancelled by user');
          if (onError) onError(new Error('Payment cancelled by user'));
        },

        onError: (error: any, payment?: any) => {
          console.error('[Pi Payment] Payment error:', error, payment);
          setLoading(false);
          setError(error.message || 'Payment failed');
          if (onError) onError(error);
        },
      });

      console.log('[Pi Payment] Payment completed successfully:', payment);
      setLoading(false);

      if (onSuccess) {
        onSuccess({
          ...payment,
          amount,
          memo,
          metadata,
          isAdmin,
          timestamp: new Date().toISOString()
        });
      }

    } catch (paymentError) {
      console.error('[Pi Payment] Payment creation failed:', paymentError);
      setLoading(false);
      const errorMsg = paymentError instanceof Error ? paymentError.message : 'Payment failed';
      setError(errorMsg);
      if (onError) onError(paymentError);
    }
  };

  const isPiBrowser = typeof navigator !== 'undefined' &&
    (navigator.userAgent.includes('PiBrowser') ||
     navigator.userAgent.includes('Pi Network') ||
     isPiReady);

  return (
    <div className="inline-block">
      <button
        onClick={handlePayment}
        disabled={loading || !isPiReady}
        className={`
          px-6 py-3 rounded-lg font-semibold text-white transition-all duration-200
          ${loading || !isPiReady
            ? 'bg-gray-400 cursor-not-allowed opacity-50'
            : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 shadow-lg hover:shadow-xl'
          }
          ${isPiBrowser ? 'ring-2 ring-blue-300' : ''}
        `}
      >
        {loading ? (
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
            <span>Processing...</span>
          </div>
        ) : !isPiReady ? (
          'Loading Pi SDK...'
        ) : (
          `Pay ${amount} Pi`
        )}
      </button>

      {error && (
        <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded border border-red-200">
          {error}
        </div>
      )}

      {!isPiBrowser && isPiReady && (
        <div className="mt-2 text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
          💡 For best experience, open this page in the Pi Browser app
        </div>
      )}

      {isAdmin && (
        <div className="mt-2 text-xs text-purple-600 bg-purple-50 p-2 rounded border border-purple-200">
          👑 Admin mode enabled - Full transaction control
        </div>
      )}
    </div>
  );
}

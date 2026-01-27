'use client';

import React, { useState } from 'react';
import { piSDK2026 } from '@/lib/pi-sdk-2026';

interface PiPaymentButtonProps {
  amount: number;
  memo: string;
  metadata: Record<string, any>;
  onPaymentSuccess?: (paymentId: string) => void;
  onPaymentError?: (error: any) => void;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export const PiPaymentButton: React.FC<PiPaymentButtonProps> = ({
  amount,
  memo,
  metadata,
  onPaymentSuccess,
  onPaymentError,
  disabled = false,
  className = '',
  children
}) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePayment = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      const result = await piSDK2026.pay({ amount, memo, metadata });
      if (result && (result as any).success) {
        console.log('Payment completed:', result);
        onPaymentSuccess?.((result as any).paymentId);
      } else {
        throw (result as any).error || new Error('Payment failed');
      }
    } catch (error) {
      console.error('Payment failed:', error);
      onPaymentError?.(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const isDisabled = disabled || isProcessing;

  return (
    <button
      onClick={handlePayment}
      disabled={isDisabled}
      className={`px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed ${className}`}
    >
      {isProcessing ? 'Processing...' : children || 'Pay with Pi'}
    </button>
  );
};

export default PiPaymentButton;

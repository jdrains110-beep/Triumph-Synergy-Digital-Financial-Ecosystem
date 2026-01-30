'use client';

import React, { useState, useEffect } from 'react';
import { realPi } from '@/lib/quantum-pi-browser-sdk';

interface PiPaymentButtonProps {
  amount: number;
  memo: string;
  metadata?: Record<string, any>;
  onPaymentSuccess?: (paymentId: string, txid?: string) => void;
  onPaymentError?: (error: any) => void;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export const PiPaymentButton: React.FC<PiPaymentButtonProps> = ({
  amount,
  memo,
  metadata = {},
  onPaymentSuccess,
  onPaymentError,
  disabled = false,
  className = '',
  children
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  const [network, setNetwork] = useState<'testnet' | 'mainnet'>('mainnet');

  useEffect(() => {
    const checkAvailability = async () => {
      const available = await realPi.isAvailable();
      setIsAvailable(available);
      setNetwork(realPi.getNetwork());
      
      if (!available) {
        console.warn('⚠️ Pi SDK not available - payments disabled. Must open in Pi Browser.');
      } else {
        console.log('✓ Pi SDK available on', network);
      }
    };

    checkAvailability();

    // Check again when window gains focus (user might have opened Pi Browser)
    const handleFocus = () => checkAvailability();
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const handlePayment = async () => {
    if (isProcessing || !isAvailable) return;
    
    setIsProcessing(true);
    try {
      console.log(`[Payment] Starting real Pi payment: ${amount} Pi on ${network}`);
      
      const result = await realPi.createPayment({
        amount,
        memo,
        metadata,
      });

      if (result.success) {
        console.log('✓ Payment completed:', result);
        onPaymentSuccess?.(result.paymentId || '', result.txid);
      } else {
        throw new Error(result.error || 'Payment failed');
      }
    } catch (error) {
      console.error('✗ Payment failed:', error);
      onPaymentError?.(error);
    } finally {
      setIsProcessing(false);
    }
  };

  const isDisabled = disabled || isProcessing || !isAvailable;
  const buttonLabel = !isAvailable
    ? 'Open in Pi Browser'
    : isProcessing
    ? 'Processing...'
    : children || `Pay ${amount} Pi`;

  return (
    <button
      onClick={handlePayment}
      disabled={isDisabled}
      title={!isAvailable ? 'Must open app in Pi Browser to enable payments' : undefined}
      className={`px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors ${className}`}
    >
      {buttonLabel}
    </button>
  );
};

export default PiPaymentButton;

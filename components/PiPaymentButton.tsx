import React, { useState } from 'react';
import { Pi } from 'pi-sdk-react';

// Replace with your Pi App credentials
declare const process: { env: { NEXT_PUBLIC_PI_API_KEY: string; NEXT_PUBLIC_PI_APP_ID: string } };

export default function PiPaymentButton({ amount, memo, onSuccess, onError }) {
  const [loading, setLoading] = useState(false);

  const handlePayment = async () => {
    setLoading(true);
    try {
      const payment = await Pi.createPayment({
        amount,
        memo,
        metadata: { custom: 'triumph-synergy' },
        onReadyForServerApproval: async (paymentId) => {
          // Call your backend to approve the payment
          const res = await fetch('/api/pi/approve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paymentId }),
          });
          if (!res.ok) throw new Error('Approval failed');
        },
        onReadyForServerCompletion: async (paymentId, txid) => {
          // Call your backend to complete the payment
          const res = await fetch('/api/pi/complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paymentId, txid }),
          });
          if (!res.ok) throw new Error('Completion failed');
        },
        onCancel: () => {
          setLoading(false);
          if (onError) onError('User cancelled');
        },
        onError: (error) => {
          setLoading(false);
          if (onError) onError(error);
        },
      });
      setLoading(false);
      if (onSuccess) onSuccess(payment);
    } catch (error) {
      setLoading(false);
      if (onError) onError(error);
    }
  };

  return (
    <button onClick={handlePayment} disabled={loading}>
      {loading ? 'Processing...' : 'Pay with Pi'}
    </button>
  );
}

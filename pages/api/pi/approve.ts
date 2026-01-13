import { NextApiRequest, NextApiResponse } from 'next';

// Pi Network API Configuration
const PI_API_KEY = process.env.PI_API_KEY || '';
const PI_APP_ID = process.env.PI_APP_ID || '';
const PI_SANDBOX = process.env.NEXT_PUBLIC_PI_SANDBOX === 'true';

// Approve payment endpoint with enhanced verification
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { paymentId, amount, memo, metadata, user, isAdmin } = req.body;

  if (!paymentId) {
    return res.status(400).json({ error: 'Payment ID required' });
  }

  console.log('[Pi API] Approving payment:', {
    paymentId,
    amount,
    memo,
    user,
    isAdmin,
    metadata
  });

  try {
    // Verify payment exists and is valid
    const verifyResponse = await fetch(`https://api.minepi.com/v2/payments/${paymentId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Key ${PI_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!verifyResponse.ok) {
      console.error('[Pi API] Payment verification failed:', verifyResponse.status);
      return res.status(400).json({
        error: 'Payment verification failed',
        details: 'Invalid or expired payment ID'
      });
    }

    const paymentData = await verifyResponse.json();
    console.log('[Pi API] Payment verified:', paymentData);

    // Validate payment details
    if (amount && paymentData.amount !== amount) {
      return res.status(400).json({
        error: 'Amount mismatch',
        expected: paymentData.amount,
        received: amount
      });
    }

    // Admin override logic
    if (isAdmin && metadata?.adminOverride) {
      console.log('[Pi API] Admin override applied for payment:', paymentId);
    }

    // Approve the payment
    const approveResponse = await fetch(`https://api.minepi.com/v2/payments/${paymentId}/approve`, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${PI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // Additional approval metadata can be added here
      }),
    });

    if (!approveResponse.ok) {
      console.error('[Pi API] Payment approval failed:', approveResponse.status);
      return res.status(400).json({
        error: 'Payment approval failed',
        details: await approveResponse.text()
      });
    }

    const approvalData = await approveResponse.json();
    console.log('[Pi API] Payment approved:', approvalData);

    return res.status(200).json({
      success: true,
      paymentId,
      status: 'approved',
      data: approvalData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Pi API] Approval error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

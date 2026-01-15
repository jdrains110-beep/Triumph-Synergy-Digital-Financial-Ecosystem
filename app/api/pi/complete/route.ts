import { NextRequest, NextResponse } from 'next/server';

// Pi Network API Configuration
const PI_API_KEY = process.env.PI_API_KEY || '';
const PI_APP_ID = process.env.PI_APP_ID || '';

/**
 * Pi Payment Completion Endpoint
 * POST /api/pi/complete
 *
 * Server-side completion of Pi payments as required by Pi Platform docs
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { paymentId, txid } = body;

    if (!paymentId || !txid) {
      return NextResponse.json({
        error: 'Payment ID and transaction ID required',
        code: 'MISSING_PARAMETERS'
      }, { status: 400 });
    }

    console.log('[Pi API] Completing payment:', { paymentId, txid });

    // Verify payment exists and is approved
    const verifyResponse = await fetch(`https://api.minepi.com/v2/payments/${paymentId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Key ${PI_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!verifyResponse.ok) {
      console.error('[Pi API] Payment verification failed:', verifyResponse.status);
      return NextResponse.json({
        error: 'Payment verification failed',
        code: 'PAYMENT_NOT_FOUND',
        details: 'Invalid payment ID'
      }, { status: 400 });
    }

    const paymentData = await verifyResponse.json();
    console.log('[Pi API] Payment data verified:', paymentData);

    // Check if payment is approved
    if (!paymentData.status?.developer_approved) {
      return NextResponse.json({
        error: 'Payment not approved',
        code: 'PAYMENT_NOT_APPROVED',
        details: 'Payment must be approved before completion'
      }, { status: 400 });
    }

    // Check if payment is already completed
    if (paymentData.status?.developer_completed) {
      return NextResponse.json({
        success: true,
        paymentId,
        txid,
        status: 'already_completed',
        message: 'Payment was already completed'
      });
    }

    // Complete the payment using Pi Platform API
    const completeResponse = await fetch(`https://api.minepi.com/v2/payments/${paymentId}/complete`, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${PI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        txid: txid,
      }),
    });

    if (!completeResponse.ok) {
      console.error('[Pi API] Payment completion failed:', completeResponse.status);
      const errorText = await completeResponse.text();
      return NextResponse.json({
        error: 'Payment completion failed',
        code: 'COMPLETION_FAILED',
        details: errorText
      }, { status: 400 });
    }

    const completionData = await completeResponse.json();
    console.log('[Pi API] Payment completed successfully:', completionData);

    return NextResponse.json({
      success: true,
      paymentId,
      txid,
      status: 'completed',
      data: completionData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[Pi API] Completion error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
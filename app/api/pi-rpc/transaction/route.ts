/**
 * Pi Network Transaction API
 * Get transaction details by hash
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPiRPCClient, type PiNetwork } from '@/lib/pi-rpc-client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const txHash = searchParams.get('hash');
    const network = (searchParams.get('network') as PiNetwork) || undefined;

    if (!txHash) {
      return NextResponse.json(
        { error: 'Transaction hash parameter is required' },
        { status: 400 }
      );
    }

    const client = getPiRPCClient(network);
    const transaction = await client.getTransaction(txHash);

    return NextResponse.json({
      success: true,
      network: client.getNetwork(),
      transaction,
    });

  } catch (error) {
    console.error('Pi Transaction API Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
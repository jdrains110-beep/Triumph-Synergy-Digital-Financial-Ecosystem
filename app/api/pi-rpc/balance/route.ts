/**
 * Pi Network Balance API
 * Get balance for Pi addresses
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPiRPCClient, type PiNetwork } from '@/lib/pi-rpc-client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');
    const network = (searchParams.get('network') as PiNetwork) || undefined;

    if (!address) {
      return NextResponse.json(
        { error: 'Address parameter is required' },
        { status: 400 }
      );
    }

    const client = getPiRPCClient(network);
    const balance = await client.getBalance(address);

    return NextResponse.json({
      success: true,
      network: client.getNetwork(),
      balance,
    });

  } catch (error) {
    console.error('Pi Balance API Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
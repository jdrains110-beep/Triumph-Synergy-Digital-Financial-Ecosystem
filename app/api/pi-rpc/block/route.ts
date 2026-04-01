/**
 * Pi Network Block API
 * Get block details by number or latest
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPiRPCClient, type PiNetwork } from '@/lib/pi-rpc-client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const blockNumber = searchParams.get('number') || 'latest';
    const includeTxs = searchParams.get('includeTxs') === 'true';
    const network = (searchParams.get('network') as PiNetwork) || undefined;

    const client = getPiRPCClient(network);
    const block = blockNumber === 'latest'
      ? await client.getLatestBlock(includeTxs)
      : await client.getBlockByNumber(blockNumber, includeTxs);

    return NextResponse.json({
      success: true,
      network: client.getNetwork(),
      block,
    });

  } catch (error) {
    console.error('Pi Block API Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
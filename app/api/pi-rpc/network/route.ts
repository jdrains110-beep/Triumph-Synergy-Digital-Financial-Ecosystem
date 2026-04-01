/**
 * Pi Network Info API
 * Get network information and status
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPiRPCClient, type PiNetwork } from '@/lib/pi-rpc-client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const network = (searchParams.get('network') as PiNetwork) || undefined;

    const client = getPiRPCClient(network);

    const [networkInfo, blockNumber, gasPrice, version] = await Promise.all([
      client.getNetworkInfo(),
      client.getBlockNumber(),
      client.getGasPrice(),
      client.getVersion(),
    ]);

    return NextResponse.json({
      success: true,
      network: client.getNetwork(),
      info: {
        ...networkInfo,
        blockNumber,
        gasPrice,
        version,
        rpcEndpoint: client.config.endpoint,
      },
    });

  } catch (error) {
    console.error('Pi Network Info API Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
/**
 * Pi Network Info API
 * Get network information and status via Stellar Horizon REST API
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPiRPCClient, type PiNetwork } from '@/lib/pi-rpc-client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const network = (searchParams.get('network') as PiNetwork) || undefined;

    const client = getPiRPCClient(network);

    const [rootInfo, networkInfo, feeStats] = await Promise.allSettled([
      client.getRootInfo(),
      client.getNetworkInfo(),
      client.getFeeStats(),
    ]);

    const root = rootInfo.status === 'fulfilled' ? rootInfo.value : {};
    const netInfo = networkInfo.status === 'fulfilled' ? networkInfo.value : {};
    const fees = feeStats.status === 'fulfilled' ? feeStats.value : {};

    return NextResponse.json({
      success: true,
      network: client.getNetwork(),
      info: {
        ...netInfo,
        blockNumber: root.history_latest_ledger?.toString() ?? '0',
        protocolVersion: root.current_protocol_version,
        coreVersion: root.core_version,
        horizonVersion: root.horizon_version,
        networkPassphrase: root.network_passphrase,
        gasPrice: fees.last_ledger_base_fee ?? '100000',
        feeStats: fees,
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
/**
 * Pi Network RPC API Route
 * Provides REST API access to Pi Network RPC endpoints
 *
 * Supports all RPC methods with proper error handling and validation
 */

import { NextRequest, NextResponse } from 'next/server';
import { PiRPCClient, getPiRPCClient, type PiNetwork } from '@/lib/pi-rpc-client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const method = searchParams.get('method');
    const network = (searchParams.get('network') as PiNetwork) || undefined;
    const params = searchParams.get('params');

    if (!method) {
      return NextResponse.json(
        { error: 'Method parameter is required' },
        { status: 400 }
      );
    }

    const client = getPiRPCClient(network);
    let parsedParams: any[] = [];

    if (params) {
      try {
        parsedParams = JSON.parse(params);
      } catch (error) {
        return NextResponse.json(
          { error: 'Invalid params JSON' },
          { status: 400 }
        );
      }
    }

    const result = await client.makeRequest(method, parsedParams);

    return NextResponse.json({
      success: true,
      network: client.getNetwork(),
      method,
      result,
    });

  } catch (error) {
    console.error('Pi RPC API Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { method, params = [], network } = body;

    if (!method) {
      return NextResponse.json(
        { error: 'Method is required' },
        { status: 400 }
      );
    }

    const client = getPiRPCClient(network);

    // Handle batch requests
    if (Array.isArray(body) && body.length > 0) {
      const results = await Promise.all(
        body.map(async (req: any) => {
          try {
            const result = await client.makeRequest(req.method, req.params || []);
            return {
              success: true,
              method: req.method,
              result,
            };
          } catch (error) {
            return {
              success: false,
              method: req.method,
              error: error instanceof Error ? error.message : 'Unknown error',
            };
          }
        })
      );

      return NextResponse.json({
        success: true,
        network: client.getNetwork(),
        batch: true,
        results,
      });
    }

    const result = await client.makeRequest(method, params);

    return NextResponse.json({
      success: true,
      network: client.getNetwork(),
      method,
      result,
    });

  } catch (error) {
    console.error('Pi RPC API Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
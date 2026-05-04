/**
 * RPC Bridge API Route
 * 
 * Endpoint: /api/rpc-bridge
 * 
 * Provides unified access to:
 * - Pi Network Blockchain (mainnet/testnet)
 * - Horizon Data Layer (external data & structure)
 * - External APIs (bridge to outside world)
 */

import { NextRequest, NextResponse } from "next/server";
import { getRPCBridge, type BridgeRequest } from "@/lib/api/rpc-bridge";
import { rateLimitByIP, isAllowedRPCMethod } from "@/lib/security/api-guard";
import { assertMainnetNetwork } from "@/lib/pi-network/mainnet-guard";

/**
 * Request body structure
 */
interface RPCBridgeRequestBody {
  network: "pi-mainnet" | "pi-testnet" | "horizon" | "external";
  method: string;
  params?: Record<string, any>;
}

/**
 * Health check endpoint
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const action = searchParams.get("action");

  if (action === "health") {
    return NextResponse.json(
      {
        status: "healthy",
        service: "rpc-bridge",
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  }

  if (action === "status") {
    const bridge = getRPCBridge();
    try {
      const piStatus = await bridge.getPiBlockchainStatus();
      return NextResponse.json(
        {
          service: "rpc-bridge",
          bridges: {
            pi: piStatus.success ? "connected" : "error",
            horizon: "configured",
            external: "configured",
          },
          timestamp: new Date().toISOString(),
        },
        { status: 200 }
      );
    } catch (error) {
      return NextResponse.json(
        {
          service: "rpc-bridge",
          error: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 }
      );
    }
  }

  return NextResponse.json(
    {
      error: "Invalid action",
      availableActions: ["health", "status"],
    },
    { status: 400 }
  );
}

/**
 * Main RPC Bridge POST handler
 * Routes requests to appropriate blockchain/data layer
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limit: 120 RPC calls per minute per IP
    const rl = rateLimitByIP(request, "rpc-bridge", 120, 60_000);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = (await request.json()) as RPCBridgeRequestBody;

    // Validate request
    if (!body.network || !body.method) {
      return NextResponse.json(
        {
          error: "Missing required fields: network, method",
        },
        { status: 400 }
      );
    }

    // Validate RPC method against whitelist
    if (!isAllowedRPCMethod(body.method)) {
      return NextResponse.json(
        { error: "Method not allowed" },
        { status: 403 }
      );
    }

    // Mainnet-only mandate: refuse pi-testnet at the API boundary.
    try {
      assertMainnetNetwork(body.network, "rpc-bridge");
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Mainnet-only mandate" },
        { status: 403 }
      );
    }

    const bridge = getRPCBridge();

    // Build bridge request
    const bridgeRequest: BridgeRequest = {
      network: body.network,
      method: body.method,
      params: body.params || {},
    };

    // Execute request
    const response = await bridge.request(bridgeRequest);

    return NextResponse.json(response, {
      status: response.success ? 200 : 400,
    });
  } catch (error) {
    console.error("RPC Bridge error:", error);
    return NextResponse.json(
      {
        error: "RPC Bridge Error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * Specific handlers for common operations
 */
export async function PUT(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const operation = searchParams.get("op");

  try {
    const bridge = getRPCBridge();

    switch (operation) {
      case "get-balance": {
        const body = (await request.json()) as { address: string };
        const result = await bridge.getPiBalance(body.address);
        return NextResponse.json(result);
      }

      case "get-horizon-data": {
        const body = (await request.json()) as Record<string, any>;
        const result = await bridge.getHorizonData(body);
        return NextResponse.json(result);
      }

      case "send-transaction": {
        const body = (await request.json()) as {
          from: string;
          to: string;
          value: string;
          data?: string;
          gasLimit?: string;
        };
        const result = await bridge.sendPiTransaction(body);
        return NextResponse.json(result);
      }

      case "external-call": {
        const body = (await request.json()) as {
          method: string;
          params: Record<string, any>;
        };
        const result = await bridge.bridgeExternalCall(body.method, body.params);
        return NextResponse.json(result);
      }

      default:
        return NextResponse.json(
          { error: "Unknown operation" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("RPC Bridge operation error:", error);
    return NextResponse.json(
      {
        error: "Operation failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

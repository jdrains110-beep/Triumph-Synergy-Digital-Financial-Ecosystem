/**
 * Docker Node Bridge API
 *
 * Exposes Pi Node Docker connectivity and health status:
 *
 * GET  /api/docker-node                      — Full node health + dashboard status
 * GET  /api/docker-node?action=horizon       — Horizon API info
 * GET  /api/docker-node?action=core          — Stellar-core status
 * GET  /api/docker-node?action=peers         — Connected peers
 * GET  /api/docker-node?action=verify&tx=... — Verify a transaction on local node
 * GET  /api/docker-node?action=account&id=...— Get account data from local node
 * GET  /api/docker-node?action=tokendata&id=...— Get tokenization data entries
 *
 * POST /api/docker-node { action: "connect" }     — Initialize bridge connection
 * POST /api/docker-node { action: "disconnect" }   — Disconnect bridge
 * POST /api/docker-node { action: "submit", tx }   — Submit transaction XDR
 */

import { NextResponse } from "next/server";
import { dockerNodeBridge } from "@/lib/blockchain/docker-node-bridge";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") || "dashboard";

    switch (action) {
      case "dashboard": {
        const status = await dockerNodeBridge.getDashboardStatus();
        return NextResponse.json({
          success: true,
          ...status,
          mode: dockerNodeBridge.getMode(),
          connected: dockerNodeBridge.isConnected(),
        });
      }

      case "health": {
        const health = await dockerNodeBridge.getHealth();
        return NextResponse.json({ success: true, ...health });
      }

      case "horizon": {
        const horizon = await dockerNodeBridge.getHorizonInfo();
        return NextResponse.json({ success: true, horizon });
      }

      case "core": {
        const core = await dockerNodeBridge.getStellarCoreInfo();
        return NextResponse.json({ success: true, core });
      }

      case "peers": {
        const peers = await dockerNodeBridge.getPeers();
        return NextResponse.json({
          success: true,
          inboundCount: peers.inbound.length,
          outboundCount: peers.outbound.length,
          ...peers,
        });
      }

      case "synced": {
        const synced = await dockerNodeBridge.isSynced();
        const gap = await dockerNodeBridge.getIngestionGap();
        return NextResponse.json({ success: true, synced, ingestionGap: gap });
      }

      case "verify": {
        const tx = searchParams.get("tx");
        if (!tx) {
          return NextResponse.json(
            { success: false, error: "tx parameter required" },
            { status: 400 }
          );
        }
        const result = await dockerNodeBridge.verifyTokenizationTx(tx);
        return NextResponse.json({ success: true, ...result });
      }

      case "account": {
        const id = searchParams.get("id");
        if (!id) {
          return NextResponse.json(
            { success: false, error: "id parameter required" },
            { status: 400 }
          );
        }
        const account = await dockerNodeBridge.getAccount(id);
        return NextResponse.json({ success: true, account });
      }

      case "tokendata": {
        const accountId = searchParams.get("id");
        if (!accountId) {
          return NextResponse.json(
            { success: false, error: "id parameter required" },
            { status: 400 }
          );
        }
        const data = await dockerNodeBridge.getTokenizationData(accountId);
        return NextResponse.json({ success: true, entries: data });
      }

      case "ledger": {
        const latest = await dockerNodeBridge.getLatestLedger();
        return NextResponse.json({ success: true, latestLedger: latest });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "connect": {
        const connected = await dockerNodeBridge.connect();
        return NextResponse.json({
          success: true,
          connected,
          mode: dockerNodeBridge.getMode(),
        });
      }

      case "disconnect": {
        dockerNodeBridge.disconnect();
        return NextResponse.json({
          success: true,
          connected: false,
        });
      }

      case "submit": {
        const { tx } = body;
        if (!tx) {
          return NextResponse.json(
            { success: false, error: "tx (transaction XDR) required" },
            { status: 400 }
          );
        }
        const result = await dockerNodeBridge.submitTransaction(tx);
        return NextResponse.json({ success: true, ...result });
      }

      default:
        return NextResponse.json(
          { success: false, error: `Unknown action: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

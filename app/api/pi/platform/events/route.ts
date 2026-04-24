/**
 * Pi Platform Events — Server-Sent Events Stream
 * =================================================
 * GET /api/pi/platform/events
 *
 * Real-time event stream from the Docker ecosystem to Pi Desktop
 * and Pi App Studio. Uses Server-Sent Events (SSE) so both
 * platforms receive live updates without polling.
 *
 * Events emitted:
 *   ledger_update    — New ledger closed on Pi Node
 *   service_health   — Periodic health pulse (every 30s)
 *   bridge_update    — Pi Node bridge state change
 *   transaction      — Transaction detected on Pi Node
 */

import { NextRequest } from "next/server";

const APP_ID = process.env.NEXT_PUBLIC_PI_APP_ID || "triumph-synergy";

async function fetchBridgeState(): Promise<Record<string, unknown>> {
  try {
    const r = await fetch("http://triumph-pi-bridge-connector:8092/bridge/status", {
      signal: AbortSignal.timeout(4000),
    });
    if (r.ok) return await r.json();
    return { error: `HTTP ${r.status}` };
  } catch {
    return { error: "bridge unreachable" };
  }
}

async function fetchServiceHealthSummary(): Promise<{
  healthy: number;
  total: number;
}> {
  const urls = [
    "http://triumph-central-node:11626/info",
    "http://triumph-pi-bridge-connector:8092/health",
    "http://triumph-dex:8088/health",
    "http://triumph-smart-contracts:8082/health",
    "http://triumph-payment-processor:8084/health",
    "http://triumph-quantum-shield:8094/health",
  ];
  const results = await Promise.all(
    urls.map(async (url) => {
      try {
        const r = await fetch(url, { signal: AbortSignal.timeout(3000) });
        return r.ok;
      } catch {
        return false;
      }
    })
  );
  return {
    healthy: results.filter(Boolean).length,
    total: results.length,
  };
}

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      function send(event: string, data: unknown) {
        if (closed) return;
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        } catch {
          closed = true;
        }
      }

      // Initial connection event
      send("connected", {
        appId: APP_ID,
        timestamp: new Date().toISOString(),
        message: "Platform event stream opened — Docker ecosystem live",
      });

      // Track ledger for change detection
      let lastLedgerSeq = 0;
      let tick = 0;

      // Event loop: runs while client is connected
      while (!closed) {
        tick++;
        try {
          // Fetch bridge state (includes ledger)
          const bridge = await fetchBridgeState();
          const piNode = (bridge as Record<string, unknown>).pi_node as
            | Record<string, unknown>
            | undefined;
          const currentSeq = (piNode?.ledger_sequence as number) || 0;

          // Emit ledger_update if changed
          if (currentSeq > lastLedgerSeq && lastLedgerSeq > 0) {
            send("ledger_update", {
              sequence: currentSeq,
              previousSequence: lastLedgerSeq,
              timestamp: new Date().toISOString(),
              network: piNode?.network || "unknown",
            });
          }
          lastLedgerSeq = currentSeq;

          // Emit bridge_update every other tick
          if (tick % 2 === 0) {
            send("bridge_update", {
              timestamp: new Date().toISOString(),
              bridge: {
                status: (bridge as Record<string, unknown>).bridge,
                piNode: piNode
                  ? {
                      reachable: piNode.reachable,
                      ledger: piNode.ledger_sequence,
                      protocol: piNode.protocol_version,
                    }
                  : null,
              },
            });
          }

          // Emit health pulse every 3 ticks (~30s)
          if (tick % 3 === 0) {
            const health = await fetchServiceHealthSummary();
            send("service_health", {
              timestamp: new Date().toISOString(),
              ...health,
              status:
                health.healthy === health.total ? "all-healthy" : "degraded",
            });
          }

          // Heartbeat every tick to keep connection alive
          send("heartbeat", { tick, timestamp: new Date().toISOString() });
        } catch {
          send("error", {
            timestamp: new Date().toISOString(),
            message: "Event loop error — retrying",
          });
        }

        // Wait 10 seconds between ticks
        await new Promise((resolve) => setTimeout(resolve, 10_000));
      }
    },
    cancel() {
      closed = true;
    },
  });

  const origin = request.headers.get("origin") || "*";
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": origin,
      "X-Pi-App-ID": APP_ID,
    },
  });
}

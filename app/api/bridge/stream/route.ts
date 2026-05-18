/**
 * GET /api/bridge/stream
 *
 * Long-lived Server-Sent Events stream that Docker Desktop subscribes to.
 *
 * The Docker connector opens one of these per public site and stays
 * connected. Anything POSTed to /api/bridge/command for the same node id
 * (or no node id = broadcast) is delivered here as `event: command`.
 */

import { redis } from "@/lib/redis";
import {
  BRIDGE_COMMANDS_CHANNEL,
  bridgeTokenOk,
  nodeIdFrom,
} from "../_auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEARTBEAT_MS = 25_000;

export async function GET(req: Request) {
  if (!bridgeTokenOk(req)) {
    return new Response("unauthorized", { status: 401 });
  }

  const nodeId = nodeIdFrom(req);
  const perNode = BRIDGE_COMMANDS_CHANNEL(nodeId);
  const broadcast = BRIDGE_COMMANDS_CHANNEL("broadcast");

  const encoder = new TextEncoder();
  // Each SSE connection needs its own Redis subscriber (a subscribed client
  // can't run normal commands), so we duplicate the singleton client.
  const sub = redis.duplicate();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (s: string) => {
        try {
          controller.enqueue(encoder.encode(s));
        } catch {
          /* client gone */
        }
      };
      const sendEvent = (event: string, dataObj: unknown) => {
        send(`event: ${event}\ndata: ${JSON.stringify(dataObj)}\n\n`);
      };

      try {
        await sub.connect();
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        sendEvent("error", { error: "redis_unavailable", detail: msg });
        controller.close();
        return;
      }

      sendEvent("hello", {
        node_id: nodeId,
        server_time: new Date().toISOString(),
        channels: [perNode, broadcast],
      });

      const onMessage = (message: string) => {
        try {
          const parsed = JSON.parse(message);
          sendEvent("command", parsed);
        } catch {
          sendEvent("command", { raw: message });
        }
      };

      try {
        await sub.subscribe(perNode, onMessage);
        await sub.subscribe(broadcast, onMessage);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        sendEvent("error", { error: "subscribe_failed", detail: msg });
        try {
          await sub.quit();
        } catch {
          /* noop */
        }
        controller.close();
        return;
      }

      const heartbeat = setInterval(() => {
        send(`: keepalive ${Date.now()}\n\n`);
      }, HEARTBEAT_MS);

      const cleanup = async () => {
        clearInterval(heartbeat);
        try {
          await sub.unsubscribe(perNode);
          await sub.unsubscribe(broadcast);
        } catch {
          /* noop */
        }
        try {
          await sub.quit();
        } catch {
          /* noop */
        }
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };

      req.signal.addEventListener("abort", () => {
        void cleanup();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no", // disable nginx buffering
    },
  });
}

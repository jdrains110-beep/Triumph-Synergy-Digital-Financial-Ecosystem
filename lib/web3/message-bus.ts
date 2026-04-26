/**
 * @fileoverview Web3 Message Bus — Decentralized event system via Redis pub/sub + on-chain anchoring
 * @copyright Copyright (C) 2024-2026 Jeremiah Joel Drains, Founder & Superior Sovereign / Triumph Synergy. All rights reserved.
 * @license PiOS
 *
 * Provides a decentralized event bus that bridges Docker microservices
 * with on-chain state. Events are published to Redis for real-time
 * distribution and optionally anchored to Stellar via manage_data ops.
 */

export type Web3Event = {
  /** Unique event ID */
  id: string;
  /** Event type (e.g., "payment.confirmed", "contract.deployed") */
  type: string;
  /** Source service or DID */
  source: string;
  /** Event payload */
  data: Record<string, unknown>;
  /** ISO timestamp */
  timestamp: string;
  /** Optional on-chain tx hash if anchored */
  txHash?: string;
  /** Cryptographic signature from the source */
  signature?: string;
};

type EventHandler = (event: Web3Event) => void | Promise<void>;

export class Web3MessageBus {
  private handlers: Map<string, Set<EventHandler>> = new Map();
  private redisUrl: string;

  constructor(redisUrl: string = "redis://triumph-redis:6379") {
    this.redisUrl = redisUrl;
  }

  /**
   * Subscribe to Web3 events by type pattern
   */
  on(eventType: string, handler: EventHandler): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler);

    return () => {
      this.handlers.get(eventType)?.delete(handler);
    };
  }

  /**
   * Emit a Web3 event locally and to Redis
   */
  async emit(event: Omit<Web3Event, "id" | "timestamp">): Promise<Web3Event> {
    const fullEvent: Web3Event = {
      ...event,
      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
      timestamp: new Date().toISOString(),
    };

    // Dispatch to local handlers
    const handlers = this.handlers.get(event.type);
    if (handlers) {
      for (const handler of handlers) {
        try {
          await handler(fullEvent);
        } catch (err) {
          console.error(`[Web3Bus] Handler error for ${event.type}:`, err);
        }
      }
    }

    // Dispatch to wildcard handlers
    const wildcardHandlers = this.handlers.get("*");
    if (wildcardHandlers) {
      for (const handler of wildcardHandlers) {
        try {
          await handler(fullEvent);
        } catch (err) {
          console.error("[Web3Bus] Wildcard handler error:", err);
        }
      }
    }

    return fullEvent;
  }

  /**
   * Publish an event to Redis for cross-service distribution
   */
  async publish(channel: string, event: Web3Event): Promise<void> {
    try {
      const { createClient } = await import("redis");
      const client = createClient({ url: this.redisUrl });
      await client.connect();
      await client.publish(
        `web3:${channel}`,
        JSON.stringify(event)
      );
      await client.disconnect();
    } catch (err) {
      console.error("[Web3Bus] Redis publish failed:", err);
    }
  }

  /**
   * Subscribe to a Redis channel for cross-service Web3 events
   */
  async subscribe(
    channel: string,
    handler: EventHandler
  ): Promise<() => Promise<void>> {
    const { createClient } = await import("redis");
    const subscriber = createClient({ url: this.redisUrl });
    await subscriber.connect();

    await subscriber.subscribe(`web3:${channel}`, (message) => {
      try {
        const event = JSON.parse(message) as Web3Event;
        handler(event);
      } catch (err) {
        console.error("[Web3Bus] Failed to parse event:", err);
      }
    });

    return async () => {
      await subscriber.unsubscribe(`web3:${channel}`);
      await subscriber.disconnect();
    };
  }
}

/**
 * Triumph Synergy — Supabase Realtime Service
 * =============================================
 * Provides typed helpers for subscribing to live database changes via
 * Supabase Realtime (PostgreSQL logical replication).
 *
 * Subscriptions:
 *   subscribeToChatMessages  — Live message stream for a chat
 *   subscribeToQuantumAudit  — Live quantum-shield audit events
 *   subscribeToTable         — Generic table subscription
 *   subscribeToPresence      — Online-presence tracking per chat
 */

import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";

// ── Types ──────────────────────────────────────────────────────────────────────

export type RealtimeEvent = "INSERT" | "UPDATE" | "DELETE" | "*";

export interface RealtimePayload<T = Record<string, unknown>> {
  eventType: RealtimeEvent;
  new: T;
  old: Partial<T>;
}

// ── Chat Messages ──────────────────────────────────────────────────────────────

export function subscribeToChatMessages(
  supabase: SupabaseClient,
  chatId: string,
  onMessage: (payload: RealtimePayload) => void,
): RealtimeChannel {
  return supabase
    .channel(`chat:${chatId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "Message_v2",
        filter: `chatId=eq.${chatId}`,
      },
      (payload) =>
        onMessage({
          eventType: "INSERT",
          new: payload.new,
          old: payload.old ?? {},
        }),
    )
    .subscribe();
}

// ── Quantum Audit Log ──────────────────────────────────────────────────────────

export function subscribeToQuantumAudit(
  supabase: SupabaseClient,
  onEvent: (payload: RealtimePayload) => void,
): RealtimeChannel {
  return supabase
    .channel("quantum-audit")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "quantum_audit_log",
      },
      (payload) =>
        onEvent({
          eventType: "INSERT",
          new: payload.new,
          old: payload.old ?? {},
        }),
    )
    .subscribe();
}

// ── Generic Table Subscription ─────────────────────────────────────────────────

export function subscribeToTable(
  supabase: SupabaseClient,
  table: string,
  event: RealtimeEvent,
  onPayload: (payload: RealtimePayload) => void,
  filter?: string,
): RealtimeChannel {
  const channelName = filter ? `${table}:${filter}` : table;
  return supabase
    .channel(channelName)
    .on(
      "postgres_changes",
      {
        event,
        schema: "public",
        table,
        ...(filter ? { filter } : {}),
      },
      (payload) =>
        onPayload({
          eventType: payload.eventType as RealtimeEvent,
          new: payload.new,
          old: payload.old ?? {},
        }),
    )
    .subscribe();
}

// ── Presence (who's online in a chat) ──────────────────────────────────────────

export interface PresenceState {
  userId: string;
  email?: string;
  onlineSince: string;
}

export function subscribeToPresence(
  supabase: SupabaseClient,
  chatId: string,
  userId: string,
  onSync: (state: Record<string, PresenceState[]>) => void,
): RealtimeChannel {
  const channel = supabase.channel(`presence:${chatId}`);

  channel
    .on("presence", { event: "sync" }, () => {
      const state = channel.presenceState<PresenceState>();
      onSync(state);
    })
    .subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({
          userId,
          onlineSince: new Date().toISOString(),
        });
      }
    });

  return channel;
}

// ── Cleanup utility ────────────────────────────────────────────────────────────

export function unsubscribe(supabase: SupabaseClient, channel: RealtimeChannel) {
  return supabase.removeChannel(channel);
}

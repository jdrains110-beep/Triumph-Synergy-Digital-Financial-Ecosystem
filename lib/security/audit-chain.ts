/**
 * Tamper-Evident Audit Hash Chain — sovereign apex layer.
 *
 * Every security-relevant event (auth attempts, payments, role changes,
 * admin actions, anomaly detections) is appended to a Merkle-style hash
 * chain. Each entry binds:
 *
 *   hash_n = SHA-256( prev_hash || canonicalJSON({ event, ts, actor }) )
 *
 * Properties:
 *   - Insertion-order is provable (any reorder breaks the chain)
 *   - Deletion is detectable (gap in hash continuity)
 *   - Modification is detectable (hash mismatch)
 *   - Combined with PQ-signed receipts (./pq-receipts.ts), the chain itself
 *     can be periodically anchored to Stellar/Pi as an external witness.
 *
 * Persistence:
 *   - Primary: Supabase `audit_events` table (append-only via RLS).
 *   - Fallback: in-memory ring buffer (last 1000 events) when Supabase
 *     is unavailable, flushed on next successful append.
 *
 * Schema (run manually or via Drizzle migration):
 *   create table audit_events (
 *     id          bigserial primary key,
 *     event_type  text not null,
 *     actor       text,
 *     payload     jsonb not null,
 *     prev_hash   text,
 *     hash        text not null unique,
 *     created_at  timestamptz not null default now()
 *   );
 *   create index audit_events_created_at_idx on audit_events(created_at desc);
 *   alter table audit_events enable row level security;
 *   create policy "audit_insert_service" on audit_events
 *     for insert with check (auth.role() = 'service_role');
 *   create policy "audit_select_self" on audit_events
 *     for select using (actor = auth.uid()::text or auth.role() = 'service_role');
 */

import { createHash } from "node:crypto";
import { canonicalJSON } from "./pq-receipts";

const GENESIS_HASH =
  "0000000000000000000000000000000000000000000000000000000000000000";

const PENDING_BUFFER_LIMIT = 1000;
const pendingBuffer: AuditEvent[] = [];
let lastHash: string | null = null;

export type AuditEventType =
  | "auth.login"
  | "auth.logout"
  | "auth.failure"
  | "auth.token_refresh"
  | "payment.approved"
  | "payment.completed"
  | "payment.cancelled"
  | "payment.failed"
  | "payment.replay_blocked"
  | "admin.action"
  | "role.granted"
  | "role.revoked"
  | "anomaly.detected"
  | "ratelimit.tripped"
  | "csp.violation"
  | "secret.rotated"
  | "config.changed";

export interface AuditEvent {
  event_type: AuditEventType | string;
  actor?: string | null;
  payload: Record<string, unknown>;
  prev_hash: string;
  hash: string;
  created_at: string;
}

interface SupabaseLike {
  from: (table: string) => {
    insert: (rows: unknown) => Promise<{ error: unknown }>;
    select: (cols: string) => {
      order: (
        col: string,
        opts: { ascending: boolean }
      ) => { limit: (n: number) => Promise<{ data: any[] | null; error: unknown }> };
    };
  };
}

let supabaseClient: SupabaseLike | null = null;

/** Inject the Supabase service-role client once at boot. */
export function configureAuditChain(client: SupabaseLike): void {
  supabaseClient = client;
}

function computeHash(prev: string, event: { event_type: string; actor?: string | null; payload: Record<string, unknown>; created_at: string }): string {
  return createHash("sha256")
    .update(prev)
    .update("|")
    .update(canonicalJSON(event))
    .digest("hex");
}

async function fetchLastHash(): Promise<string> {
  if (lastHash) return lastHash;
  if (!supabaseClient) return GENESIS_HASH;
  try {
    const { data, error } = await supabaseClient
      .from("audit_events")
      .select("hash")
      .order("id", { ascending: false })
      .limit(1);
    if (error || !data || data.length === 0) return GENESIS_HASH;
    lastHash = data[0].hash as string;
    return lastHash;
  } catch {
    return GENESIS_HASH;
  }
}

async function flushBuffer(): Promise<void> {
  if (!supabaseClient || pendingBuffer.length === 0) return;
  const batch = pendingBuffer.splice(0, pendingBuffer.length);
  try {
    const { error } = await supabaseClient.from("audit_events").insert(batch);
    if (error) {
      // Re-buffer on failure
      pendingBuffer.unshift(...batch);
      if (pendingBuffer.length > PENDING_BUFFER_LIMIT) {
        pendingBuffer.splice(PENDING_BUFFER_LIMIT);
      }
    }
  } catch {
    pendingBuffer.unshift(...batch);
  }
}

/**
 * Append an event to the audit chain. Returns the computed hash.
 * Never throws — audit failure must never break the calling flow.
 */
export async function appendAuditEvent(
  event_type: AuditEventType | string,
  payload: Record<string, unknown>,
  actor?: string | null
): Promise<string> {
  try {
    const prev = await fetchLastHash();
    const created_at = new Date().toISOString();
    const base = { event_type, actor: actor ?? null, payload, created_at };
    const hash = computeHash(prev, base);
    const entry: AuditEvent = { ...base, prev_hash: prev, hash };

    pendingBuffer.push(entry);
    if (pendingBuffer.length > PENDING_BUFFER_LIMIT) {
      pendingBuffer.splice(0, pendingBuffer.length - PENDING_BUFFER_LIMIT);
    }
    lastHash = hash;

    // Best-effort flush (non-blocking)
    void flushBuffer();
    return hash;
  } catch (err) {
    // Last resort: log but never throw
    console.error("[audit-chain] append failed:", err);
    return GENESIS_HASH;
  }
}

/**
 * Verify the integrity of a sequence of audit events.
 * Returns the index of the first broken link, or -1 if intact.
 */
export function verifyChain(events: AuditEvent[]): number {
  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    const expectedPrev = i === 0 ? e.prev_hash : events[i - 1].hash;
    if (e.prev_hash !== expectedPrev) return i;
    const recomputed = computeHash(e.prev_hash, {
      event_type: e.event_type,
      actor: e.actor ?? null,
      payload: e.payload,
      created_at: e.created_at,
    });
    if (recomputed !== e.hash) return i;
  }
  return -1;
}

export function getCurrentHead(): string {
  return lastHash ?? GENESIS_HASH;
}

export const _internals = { GENESIS_HASH, computeHash };

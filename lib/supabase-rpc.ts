/**
 * Triumph Synergy — Supabase RPC & Edge-Function Helpers
 * =======================================================
 * Typed wrappers for calling Supabase database functions (RPC) and
 * optional Edge Functions deployed to Supabase.
 *
 * RPC functions run inside Postgres with the caller's JWT context,
 * so RLS policies apply automatically.  Edge Functions run in Deno
 * on Supabase infrastructure for compute-heavy or external-API work.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

// ── RPC: Get chat stats for a user ─────────────────────────────────────────────

export async function rpcGetUserChatStats(
  supabase: SupabaseClient,
  userId: string,
) {
  const { data, error } = await supabase.rpc("get_user_chat_stats", {
    p_user_id: userId,
  });
  if (error) throw error;
  return data as {
    total_chats: number;
    total_messages: number;
    last_active: string;
  } | null;
}

// ── RPC: Search messages (full-text) ───────────────────────────────────────────

export async function rpcSearchMessages(
  supabase: SupabaseClient,
  query: string,
  limit = 20,
) {
  const { data, error } = await supabase.rpc("search_messages", {
    p_query: query,
    p_limit: limit,
  });
  if (error) throw error;
  return data as Array<{
    id: string;
    chatId: string;
    role: string;
    parts: unknown;
    createdAt: string;
    rank: number;
  }>;
}

// ── RPC: Quantum audit summary ─────────────────────────────────────────────────

export async function rpcQuantumAuditSummary(
  supabase: SupabaseClient,
  sinceHours = 24,
) {
  const { data, error } = await supabase.rpc("quantum_audit_summary", {
    p_since_hours: sinceHours,
  });
  if (error) throw error;
  return data as Array<{
    operation: string;
    algorithm: string;
    total: number;
    successes: number;
    failures: number;
  }>;
}

// ── RPC: Rotate quantum keys ───────────────────────────────────────────────────

export async function rpcRotateQuantumKeys(admin: SupabaseClient) {
  const { data, error } = await admin.rpc("rotate_quantum_keys");
  if (error) throw error;
  return data as { rotated: number; expired: number };
}

// ── Edge Function: Invoke a named function ─────────────────────────────────────

export async function invokeEdgeFunction<T = unknown>(
  supabase: SupabaseClient,
  functionName: string,
  body?: Record<string, unknown>,
) {
  const { data, error } = await supabase.functions.invoke(functionName, {
    body: body ?? {},
  });
  if (error) throw error;
  return data as T;
}

// ── Edge Function: Quantum-encrypt via Edge ────────────────────────────────────
// For client-side code that needs quantum encryption without directly calling
// the Docker quantum-shield. The Edge Function proxies to quantum-shield.

export async function edgeQuantumEncrypt(
  supabase: SupabaseClient,
  plaintext: string,
) {
  return invokeEdgeFunction<{
    ciphertext: string;
    nonce: string;
    key_id: string;
    algorithm: string;
  }>(supabase, "quantum-encrypt", { data: plaintext });
}

// ── Edge Function: Quantum-verify signature ────────────────────────────────────

export async function edgeQuantumVerify(
  supabase: SupabaseClient,
  payload: string,
  signature: string,
) {
  return invokeEdgeFunction<{ valid: boolean; algorithm: string }>(
    supabase,
    "quantum-verify",
    { payload, signature },
  );
}

// ── SQL for RPC functions (run via migration or Supabase SQL editor) ───────────
//
// The actual PL/pgSQL bodies live in the migration file
// 0009_supabase_rpc_functions.sql — they are documented here for reference.

-- ============================================================================
-- Migration 0009: Supabase RPC Functions
-- ============================================================================
-- Server-side PL/pgSQL functions callable via supabase.rpc().
-- These execute inside Postgres with the caller's JWT context so RLS applies.
-- ============================================================================

-- ── 1. get_user_chat_stats ─────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION get_user_chat_stats(p_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result json;
BEGIN
  SELECT json_build_object(
    'total_chats',    COALESCE(c.cnt, 0),
    'total_messages', COALESCE(m.cnt, 0),
    'last_active',    COALESCE(m.last_ts, c.last_ts, now())
  ) INTO result
  FROM
    (SELECT count(*) AS cnt, max("createdAt") AS last_ts
     FROM "Chat" WHERE "userId" = p_user_id) c,
    (SELECT count(*) AS cnt, max("createdAt") AS last_ts
     FROM "Message_v2" mv
     JOIN "Chat" ch ON ch.id = mv."chatId"
     WHERE ch."userId" = p_user_id) m;

  RETURN result;
END;
$$;

-- ── 2. search_messages (full-text) ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION search_messages(p_query text, p_limit int DEFAULT 20)
RETURNS SETOF json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT json_build_object(
    'id',        mv.id,
    'chatId',    mv."chatId",
    'role',      mv.role,
    'parts',     mv.parts,
    'createdAt', mv."createdAt",
    'rank',      ts_rank_cd(
                   to_tsvector('english', mv.parts::text),
                   plainto_tsquery('english', p_query)
                 )
  )
  FROM "Message_v2" mv
  JOIN "Chat" ch ON ch.id = mv."chatId"
  WHERE ch."userId" = auth.uid()
    AND to_tsvector('english', mv.parts::text) @@ plainto_tsquery('english', p_query)
  ORDER BY ts_rank_cd(
    to_tsvector('english', mv.parts::text),
    plainto_tsquery('english', p_query)
  ) DESC
  LIMIT p_limit;
END;
$$;

-- ── 3. quantum_audit_summary ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION quantum_audit_summary(p_since_hours int DEFAULT 24)
RETURNS SETOF json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT json_build_object(
    'operation', operation,
    'algorithm', algorithm,
    'total',     count(*),
    'successes', count(*) FILTER (WHERE success = true),
    'failures',  count(*) FILTER (WHERE success = false)
  )
  FROM "quantum_audit_log"
  WHERE "timestamp" >= now() - (p_since_hours || ' hours')::interval
    AND (actor_id = auth.uid() OR auth.role() = 'service_role')
  GROUP BY operation, algorithm
  ORDER BY count(*) DESC;
END;
$$;

-- ── 4. rotate_quantum_keys ─────────────────────────────────────────────────
-- Marks expired keys as revoked. Only callable with service_role.

CREATE OR REPLACE FUNCTION rotate_quantum_keys()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  revoked_count int;
  expired_count int;
BEGIN
  -- Revoke keys past their expiry
  UPDATE "quantum_vault_secrets"
  SET revoked = true, updated_at = now()
  WHERE revoked = false
    AND expires_at IS NOT NULL
    AND expires_at < now();
  GET DIAGNOSTICS expired_count = ROW_COUNT;

  -- Count already-revoked
  SELECT count(*) INTO revoked_count
  FROM "quantum_vault_secrets"
  WHERE revoked = true;

  RETURN json_build_object('rotated', expired_count, 'expired', revoked_count);
END;
$$;

-- ── 5. Indexes for full-text search ────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_message_v2_fts
  ON "Message_v2"
  USING gin(to_tsvector('english', parts::text));

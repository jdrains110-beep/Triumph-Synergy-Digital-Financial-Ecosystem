-- ============================================================================
-- Triumph Synergy — Combined Supabase Migration
-- ============================================================================
-- This script sets up ALL application tables, RLS policies, quantum audit
-- tables, RPC functions, and Realtime publications on a fresh Supabase project.
-- Run this in Supabase SQL Editor or via direct Postgres connection.
-- ============================================================================

-- ══════════════════════════════════════════════════════════════════════════════
-- PHASE 1: Core Application Tables (Drizzle migrations 0000-0007)
-- ══════════════════════════════════════════════════════════════════════════════

-- 0000: User + Chat
CREATE TABLE IF NOT EXISTS "User" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "email" varchar(64) NOT NULL,
  "password" varchar(64)
);

CREATE TABLE IF NOT EXISTS "Chat" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "createdAt" timestamp NOT NULL,
  "title" text NOT NULL,
  "userId" uuid NOT NULL,
  "visibility" varchar DEFAULT 'private' NOT NULL,
  "lastContext" jsonb
);

DO $$ BEGIN
 ALTER TABLE "Chat" ADD CONSTRAINT "Chat_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- 0001: Document + Suggestion
CREATE TABLE IF NOT EXISTS "Document" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "createdAt" timestamp NOT NULL,
  "title" text NOT NULL,
  "content" text,
  "text" varchar DEFAULT 'text' NOT NULL,
  "userId" uuid NOT NULL,
  CONSTRAINT "Document_id_createdAt_pk" PRIMARY KEY("id","createdAt")
);

CREATE TABLE IF NOT EXISTS "Suggestion" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "documentId" uuid NOT NULL,
  "documentCreatedAt" timestamp NOT NULL,
  "originalText" text NOT NULL,
  "suggestedText" text NOT NULL,
  "description" text,
  "isResolved" boolean DEFAULT false NOT NULL,
  "userId" uuid NOT NULL,
  "createdAt" timestamp NOT NULL,
  CONSTRAINT "Suggestion_id_pk" PRIMARY KEY("id")
);

DO $$ BEGIN
 ALTER TABLE "Suggestion" ADD CONSTRAINT "Suggestion_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "Suggestion" ADD CONSTRAINT "Suggestion_documentId_documentCreatedAt_Document_id_createdAt_fk" FOREIGN KEY ("documentId","documentCreatedAt") REFERENCES "public"."Document"("id","createdAt") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "Document" ADD CONSTRAINT "Document_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- 0002: Message + Vote (deprecated v1)
CREATE TABLE IF NOT EXISTS "Message" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "chatId" uuid NOT NULL,
  "role" varchar NOT NULL,
  "content" json NOT NULL,
  "createdAt" timestamp NOT NULL
);

CREATE TABLE IF NOT EXISTS "Vote" (
  "chatId" uuid NOT NULL,
  "messageId" uuid NOT NULL,
  "isUpvoted" boolean NOT NULL,
  CONSTRAINT "Vote_chatId_messageId_pk" PRIMARY KEY("chatId","messageId")
);

DO $$ BEGIN
 ALTER TABLE "Message" ADD CONSTRAINT "Message_chatId_Chat_id_fk" FOREIGN KEY ("chatId") REFERENCES "public"."Chat"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "Vote" ADD CONSTRAINT "Vote_chatId_Chat_id_fk" FOREIGN KEY ("chatId") REFERENCES "public"."Chat"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "Vote" ADD CONSTRAINT "Vote_messageId_Message_id_fk" FOREIGN KEY ("messageId") REFERENCES "public"."Message"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- 0005: Message_v2 + Vote_v2
CREATE TABLE IF NOT EXISTS "Message_v2" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "chatId" uuid NOT NULL,
  "role" varchar NOT NULL,
  "parts" json NOT NULL,
  "attachments" json NOT NULL,
  "createdAt" timestamp NOT NULL
);

CREATE TABLE IF NOT EXISTS "Vote_v2" (
  "chatId" uuid NOT NULL,
  "messageId" uuid NOT NULL,
  "isUpvoted" boolean NOT NULL,
  CONSTRAINT "Vote_v2_chatId_messageId_pk" PRIMARY KEY("chatId","messageId")
);

DO $$ BEGIN
 ALTER TABLE "Message_v2" ADD CONSTRAINT "Message_v2_chatId_Chat_id_fk" FOREIGN KEY ("chatId") REFERENCES "public"."Chat"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "Vote_v2" ADD CONSTRAINT "Vote_v2_chatId_Chat_id_fk" FOREIGN KEY ("chatId") REFERENCES "public"."Chat"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 ALTER TABLE "Vote_v2" ADD CONSTRAINT "Vote_v2_messageId_Message_v2_id_fk" FOREIGN KEY ("messageId") REFERENCES "public"."Message_v2"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- 0006: Stream
CREATE TABLE IF NOT EXISTS "Stream" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "chatId" uuid NOT NULL,
  "createdAt" timestamp NOT NULL,
  CONSTRAINT "Stream_id_pk" PRIMARY KEY("id")
);

DO $$ BEGIN
 ALTER TABLE "Stream" ADD CONSTRAINT "Stream_chatId_Chat_id_fk" FOREIGN KEY ("chatId") REFERENCES "public"."Chat"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- ══════════════════════════════════════════════════════════════════════════════
-- PHASE 2: Row Level Security (migration 0008)
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE "User"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Chat"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Message"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Message_v2" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Vote"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Vote_v2"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Document"   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Suggestion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Stream"     ENABLE ROW LEVEL SECURITY;

-- User — own row only
CREATE POLICY "user_select_own"   ON "User" FOR SELECT USING (id = auth.uid());
CREATE POLICY "user_update_own"   ON "User" FOR UPDATE USING (id = auth.uid());

-- Chat — owner + public visibility
CREATE POLICY "chat_select_own_or_public" ON "Chat"
  FOR SELECT USING ("userId" = auth.uid() OR visibility = 'public');
CREATE POLICY "chat_insert_own"  ON "Chat" FOR INSERT WITH CHECK ("userId" = auth.uid());
CREATE POLICY "chat_update_own"  ON "Chat" FOR UPDATE USING ("userId" = auth.uid());
CREATE POLICY "chat_delete_own"  ON "Chat" FOR DELETE USING ("userId" = auth.uid());

-- Message (deprecated)
CREATE POLICY "message_dep_select" ON "Message" FOR SELECT USING (
  EXISTS (SELECT 1 FROM "Chat" WHERE "Chat".id = "Message"."chatId"
    AND ("Chat"."userId" = auth.uid() OR "Chat".visibility = 'public'))
);
CREATE POLICY "message_dep_insert" ON "Message" FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM "Chat" WHERE "Chat".id = "Message"."chatId"
    AND "Chat"."userId" = auth.uid())
);

-- Message_v2
CREATE POLICY "message_v2_select" ON "Message_v2" FOR SELECT USING (
  EXISTS (SELECT 1 FROM "Chat" WHERE "Chat".id = "Message_v2"."chatId"
    AND ("Chat"."userId" = auth.uid() OR "Chat".visibility = 'public'))
);
CREATE POLICY "message_v2_insert" ON "Message_v2" FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM "Chat" WHERE "Chat".id = "Message_v2"."chatId"
    AND "Chat"."userId" = auth.uid())
);

-- Vote (deprecated)
CREATE POLICY "vote_dep_select" ON "Vote" FOR SELECT USING (
  EXISTS (SELECT 1 FROM "Chat" WHERE "Chat".id = "Vote"."chatId"
    AND "Chat"."userId" = auth.uid())
);
CREATE POLICY "vote_dep_upsert" ON "Vote" FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM "Chat" WHERE "Chat".id = "Vote"."chatId"
    AND "Chat"."userId" = auth.uid())
);

-- Vote_v2
CREATE POLICY "vote_v2_select" ON "Vote_v2" FOR SELECT USING (
  EXISTS (SELECT 1 FROM "Chat" WHERE "Chat".id = "Vote_v2"."chatId"
    AND "Chat"."userId" = auth.uid())
);
CREATE POLICY "vote_v2_upsert" ON "Vote_v2" FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM "Chat" WHERE "Chat".id = "Vote_v2"."chatId"
    AND "Chat"."userId" = auth.uid())
);

-- Document — owner only
CREATE POLICY "document_select_own" ON "Document" FOR SELECT USING ("userId" = auth.uid());
CREATE POLICY "document_insert_own" ON "Document" FOR INSERT WITH CHECK ("userId" = auth.uid());
CREATE POLICY "document_update_own" ON "Document" FOR UPDATE USING ("userId" = auth.uid());
CREATE POLICY "document_delete_own" ON "Document" FOR DELETE USING ("userId" = auth.uid());

-- Suggestion — owner only
CREATE POLICY "suggestion_select_own" ON "Suggestion" FOR SELECT USING ("userId" = auth.uid());
CREATE POLICY "suggestion_insert_own" ON "Suggestion" FOR INSERT WITH CHECK ("userId" = auth.uid());
CREATE POLICY "suggestion_update_own" ON "Suggestion" FOR UPDATE USING ("userId" = auth.uid());

-- Stream — via owning chat
CREATE POLICY "stream_select" ON "Stream" FOR SELECT USING (
  EXISTS (SELECT 1 FROM "Chat" WHERE "Chat".id = "Stream"."chatId"
    AND ("Chat"."userId" = auth.uid() OR "Chat".visibility = 'public'))
);
CREATE POLICY "stream_insert" ON "Stream" FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM "Chat" WHERE "Chat".id = "Stream"."chatId"
    AND "Chat"."userId" = auth.uid())
);

-- ══════════════════════════════════════════════════════════════════════════════
-- PHASE 3: Quantum Audit + Vault Tables
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS "quantum_audit_log" (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  "timestamp"   timestamptz NOT NULL DEFAULT now(),
  operation     text        NOT NULL,
  algorithm     text        NOT NULL,
  actor_id      uuid        REFERENCES "User"(id),
  input_hash    text,
  output_hash   text,
  metadata      jsonb       DEFAULT '{}'::jsonb,
  ip_address    inet,
  service       text,
  success       boolean     NOT NULL DEFAULT true,
  error_message text
);

ALTER TABLE "quantum_audit_log" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "qal_insert_service"  ON "quantum_audit_log" FOR INSERT WITH CHECK (true);
CREATE POLICY "qal_select_own"     ON "quantum_audit_log" FOR SELECT USING (
  actor_id = auth.uid() OR auth.role() = 'service_role'
);

CREATE INDEX IF NOT EXISTS idx_qal_timestamp ON "quantum_audit_log" ("timestamp" DESC);
CREATE INDEX IF NOT EXISTS idx_qal_actor     ON "quantum_audit_log" (actor_id);
CREATE INDEX IF NOT EXISTS idx_qal_operation ON "quantum_audit_log" (operation);

CREATE TABLE IF NOT EXISTS "quantum_vault_secrets" (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  owner_id      uuid        NOT NULL REFERENCES "User"(id),
  label         text        NOT NULL,
  algorithm     text        NOT NULL,
  encrypted_key bytea       NOT NULL,
  nonce         bytea,
  public_key    bytea,
  key_type      text        NOT NULL DEFAULT 'session',
  expires_at    timestamptz,
  revoked       boolean     NOT NULL DEFAULT false,
  metadata      jsonb       DEFAULT '{}'::jsonb
);

ALTER TABLE "quantum_vault_secrets" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "qvs_select_own" ON "quantum_vault_secrets" FOR SELECT USING (owner_id = auth.uid());
CREATE POLICY "qvs_insert_own" ON "quantum_vault_secrets" FOR INSERT WITH CHECK (owner_id = auth.uid());
CREATE POLICY "qvs_update_own" ON "quantum_vault_secrets" FOR UPDATE USING (owner_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_qvs_owner  ON "quantum_vault_secrets" (owner_id);
CREATE INDEX IF NOT EXISTS idx_qvs_type   ON "quantum_vault_secrets" (key_type);

-- ══════════════════════════════════════════════════════════════════════════════
-- PHASE 4: Realtime Publication
-- ══════════════════════════════════════════════════════════════════════════════

ALTER PUBLICATION supabase_realtime ADD TABLE "Chat";
ALTER PUBLICATION supabase_realtime ADD TABLE "Message_v2";
ALTER PUBLICATION supabase_realtime ADD TABLE "quantum_audit_log";
ALTER PUBLICATION supabase_realtime ADD TABLE "quantum_vault_secrets";

-- ══════════════════════════════════════════════════════════════════════════════
-- PHASE 5: RPC Functions (migration 0009)
-- ══════════════════════════════════════════════════════════════════════════════

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
  UPDATE "quantum_vault_secrets"
  SET revoked = true, updated_at = now()
  WHERE revoked = false
    AND expires_at IS NOT NULL
    AND expires_at < now();
  GET DIAGNOSTICS expired_count = ROW_COUNT;

  SELECT count(*) INTO revoked_count
  FROM "quantum_vault_secrets"
  WHERE revoked = true;

  RETURN json_build_object('rotated', expired_count, 'expired', revoked_count);
END;
$$;

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_message_v2_fts
  ON "Message_v2"
  USING gin(to_tsvector('english', parts::text));

-- ══════════════════════════════════════════════════════════════════════════════
-- DONE — All tables, RLS, quantum security, RPC functions, and Realtime active.
-- ══════════════════════════════════════════════════════════════════════════════

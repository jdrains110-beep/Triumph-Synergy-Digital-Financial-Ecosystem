CREATE TABLE IF NOT EXISTS "Chat" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"createdAt" timestamp NOT NULL,
	"messages" json NOT NULL,
	"userId" uuid NOT NULL
);
CREATE TABLE IF NOT EXISTS "User" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(64) NOT NULL,
	"password" varchar(64)
);
DO $$ BEGIN
 ALTER TABLE "Chat" ADD CONSTRAINT "Chat_userId_User_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
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
CREATE TABLE IF NOT EXISTS "Document" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"createdAt" timestamp NOT NULL,
	"title" text NOT NULL,
	"content" text,
	"userId" uuid NOT NULL,
	CONSTRAINT "Document_id_createdAt_pk" PRIMARY KEY("id","createdAt")
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
ALTER TABLE "Chat" ADD COLUMN "title" text NOT NULL;--> statement-breakpoint
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
ALTER TABLE "Chat" DROP COLUMN IF EXISTS "messages";ALTER TABLE "Chat" ADD COLUMN "visibility" varchar DEFAULT 'private' NOT NULL;ALTER TABLE "Document" ADD COLUMN "text" varchar DEFAULT 'text' NOT NULL;CREATE TABLE IF NOT EXISTS "Message_v2" (
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
ALTER TABLE "Chat" ADD COLUMN "lastContext" jsonb;-- ============================================================================
-- Migration 0008: Supabase RLS + Quantum Audit Schema
-- ============================================================================
-- Enables Row Level Security on ALL application tables so that Supabase
-- enforces data isolation per-user.  Also creates a quantum_audit_log table
-- to record every quantum-shield operation (signatures, KEM, encryption)
-- persisted immutably in Supabase.
-- ============================================================================

-- ── 1. Enable RLS on every application table ────────────────────────────────

ALTER TABLE "User"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Chat"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Message"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Message_v2" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Vote"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Vote_v2"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Document"   ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Suggestion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Stream"     ENABLE ROW LEVEL SECURITY;

-- ── 2. User table — users see only their own row ───────────────────────────

CREATE POLICY "user_select_own"   ON "User" FOR SELECT USING (id = auth.uid());
CREATE POLICY "user_update_own"   ON "User" FOR UPDATE USING (id = auth.uid());

-- ── 3. Chat table — owner access + public visibility override ──────────────

CREATE POLICY "chat_select_own_or_public" ON "Chat"
  FOR SELECT USING (
    "userId" = auth.uid()
    OR visibility = 'public'
  );
CREATE POLICY "chat_insert_own"  ON "Chat" FOR INSERT WITH CHECK ("userId" = auth.uid());
CREATE POLICY "chat_update_own"  ON "Chat" FOR UPDATE USING ("userId" = auth.uid());
CREATE POLICY "chat_delete_own"  ON "Chat" FOR DELETE USING ("userId" = auth.uid());

-- ── 4. Message (deprecated) — access via owning chat ───────────────────────

CREATE POLICY "message_dep_select" ON "Message" FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM "Chat"
    WHERE "Chat".id = "Message"."chatId"
      AND ("Chat"."userId" = auth.uid() OR "Chat".visibility = 'public')
  )
);
CREATE POLICY "message_dep_insert" ON "Message" FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM "Chat"
    WHERE "Chat".id = "Message"."chatId"
      AND "Chat"."userId" = auth.uid()
  )
);

-- ── 5. Message_v2 — same pattern ───────────────────────────────────────────

CREATE POLICY "message_v2_select" ON "Message_v2" FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM "Chat"
    WHERE "Chat".id = "Message_v2"."chatId"
      AND ("Chat"."userId" = auth.uid() OR "Chat".visibility = 'public')
  )
);
CREATE POLICY "message_v2_insert" ON "Message_v2" FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM "Chat"
    WHERE "Chat".id = "Message_v2"."chatId"
      AND "Chat"."userId" = auth.uid()
  )
);

-- ── 6. Vote (deprecated) ──────────────────────────────────────────────────

CREATE POLICY "vote_dep_select" ON "Vote" FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM "Chat"
    WHERE "Chat".id = "Vote"."chatId"
      AND "Chat"."userId" = auth.uid()
  )
);
CREATE POLICY "vote_dep_upsert" ON "Vote" FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM "Chat"
    WHERE "Chat".id = "Vote"."chatId"
      AND "Chat"."userId" = auth.uid()
  )
);

-- ── 7. Vote_v2 ─────────────────────────────────────────────────────────────

CREATE POLICY "vote_v2_select" ON "Vote_v2" FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM "Chat"
    WHERE "Chat".id = "Vote_v2"."chatId"
      AND "Chat"."userId" = auth.uid()
  )
);
CREATE POLICY "vote_v2_upsert" ON "Vote_v2" FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM "Chat"
    WHERE "Chat".id = "Vote_v2"."chatId"
      AND "Chat"."userId" = auth.uid()
  )
);

-- ── 8. Document — owner only ───────────────────────────────────────────────

CREATE POLICY "document_select_own" ON "Document" FOR SELECT USING ("userId" = auth.uid());
CREATE POLICY "document_insert_own" ON "Document" FOR INSERT WITH CHECK ("userId" = auth.uid());
CREATE POLICY "document_update_own" ON "Document" FOR UPDATE USING ("userId" = auth.uid());
CREATE POLICY "document_delete_own" ON "Document" FOR DELETE USING ("userId" = auth.uid());

-- ── 9. Suggestion — owner only ─────────────────────────────────────────────

CREATE POLICY "suggestion_select_own" ON "Suggestion" FOR SELECT USING ("userId" = auth.uid());
CREATE POLICY "suggestion_insert_own" ON "Suggestion" FOR INSERT WITH CHECK ("userId" = auth.uid());
CREATE POLICY "suggestion_update_own" ON "Suggestion" FOR UPDATE USING ("userId" = auth.uid());

-- ── 10. Stream — via owning chat ───────────────────────────────────────────

CREATE POLICY "stream_select" ON "Stream" FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM "Chat"
    WHERE "Chat".id = "Stream"."chatId"
      AND ("Chat"."userId" = auth.uid() OR "Chat".visibility = 'public')
  )
);
CREATE POLICY "stream_insert" ON "Stream" FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM "Chat"
    WHERE "Chat".id = "Stream"."chatId"
      AND "Chat"."userId" = auth.uid()
  )
);

-- ── 11. Service-role bypass ────────────────────────────────────────────────
-- The service_role key automatically bypasses RLS in Supabase.
-- No additional policy is needed; getSupabaseAdmin() already uses that key.

-- ── 12. Quantum Audit Log table ────────────────────────────────────────────
-- Immutable, append-only ledger of every quantum-shield operation.
-- Used for compliance, forensics, and quantum-readiness attestation.

CREATE TABLE IF NOT EXISTS "quantum_audit_log" (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  "timestamp"   timestamptz NOT NULL DEFAULT now(),
  operation     text        NOT NULL,          -- sign | verify | kem_encap | kem_decap | encrypt | decrypt | hash | reseed
  algorithm     text        NOT NULL,          -- CRYSTALS-Kyber-1024 | CRYSTALS-Dilithium-5 | SPHINCS+-SHAKE-256f | AES-256-GCM | SHA3-512
  actor_id      uuid        REFERENCES "User"(id),
  input_hash    text,                          -- SHA3-512 of the input payload (never raw data)
  output_hash   text,                          -- SHA3-512 of the output
  metadata      jsonb       DEFAULT '{}'::jsonb,
  ip_address    inet,
  service       text,                          -- which Docker service triggered this
  success       boolean     NOT NULL DEFAULT true,
  error_message text
);

ALTER TABLE "quantum_audit_log" ENABLE ROW LEVEL SECURITY;

-- Only admins (service_role) can insert; users can read their own entries
CREATE POLICY "qal_insert_service"  ON "quantum_audit_log" FOR INSERT WITH CHECK (true);
CREATE POLICY "qal_select_own"     ON "quantum_audit_log" FOR SELECT USING (
  actor_id = auth.uid() OR auth.role() = 'service_role'
);

-- Index for time-range scans and per-user lookups
CREATE INDEX IF NOT EXISTS idx_qal_timestamp ON "quantum_audit_log" ("timestamp" DESC);
CREATE INDEX IF NOT EXISTS idx_qal_actor     ON "quantum_audit_log" (actor_id);
CREATE INDEX IF NOT EXISTS idx_qal_operation ON "quantum_audit_log" (operation);

-- ── 13. Quantum Vault Secrets table ────────────────────────────────────────
-- Stores quantum-encrypted secrets (Kyber-wrapped AES keys, Dilithium-signed
-- certs, etc.) using Supabase Vault's pgsodium integration when available.

CREATE TABLE IF NOT EXISTS "quantum_vault_secrets" (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  owner_id      uuid        NOT NULL REFERENCES "User"(id),
  label         text        NOT NULL,
  algorithm     text        NOT NULL,
  encrypted_key bytea       NOT NULL,          -- Kyber-encapsulated or AES-256-GCM ciphertext
  nonce         bytea,                         -- AES-GCM nonce if applicable
  public_key    bytea,                         -- Associated Kyber/Dilithium public key
  key_type      text        NOT NULL DEFAULT 'session',  -- session | signing | encryption | master
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

-- ── 14. Realtime Publication ───────────────────────────────────────────────
-- Enable Supabase Realtime on key tables so clients receive live updates.

ALTER PUBLICATION supabase_realtime ADD TABLE "Chat";
ALTER PUBLICATION supabase_realtime ADD TABLE "Message_v2";
ALTER PUBLICATION supabase_realtime ADD TABLE "quantum_audit_log";
ALTER PUBLICATION supabase_realtime ADD TABLE "quantum_vault_secrets";
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
-- Pi Payments with Value Differentiation
CREATE TABLE IF NOT EXISTS pi_payments_valued (
    id BIGSERIAL PRIMARY KEY,
    payment_id VARCHAR(255) UNIQUE NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    
    -- Value fields
    nominal_amount DECIMAL(20, 8) NOT NULL,
    internal_value DECIMAL(20, 8) NOT NULL,  -- Higher for mined/contributed Pi
    price_equivalent DECIMAL(20, 8) NOT NULL,
    
    -- Source tracking
    source VARCHAR(50) NOT NULL,  -- internal_mined, internal_contributed, external_exchange
    
    -- Status
    status VARCHAR(50) DEFAULT 'pending',
    
    -- Stellar integration
    stellar_tx_id VARCHAR(255),
    stellar_verified BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    metadata JSONB,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    completed_at TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_pi_valued_user ON pi_payments_valued(user_id);
CREATE INDEX IF NOT EXISTS idx_pi_valued_status ON pi_payments_valued(status);
CREATE INDEX IF NOT EXISTS idx_pi_valued_source ON pi_payments_valued(source);
CREATE INDEX IF NOT EXISTS idx_pi_valued_stellar ON pi_payments_valued(stellar_tx_id);
CREATE INDEX IF NOT EXISTS idx_pi_valued_created ON pi_payments_valued(created_at);

-- Value history tracking for 100-year sustainability
CREATE TABLE IF NOT EXISTS pi_value_history (
    id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT NOW(),
    internal_multiplier DECIMAL(10, 4),
    internal_min_value DECIMAL(20, 8),
    external_min_value DECIMAL(20, 8),
    total_internal_pi DECIMAL(30, 8),
    total_external_pi DECIMAL(30, 8),
    ecosystem_health_score DECIMAL(5, 2),
    notes TEXT
);

-- Stellar consensus tracking
CREATE TABLE IF NOT EXISTS stellar_consensus_log (
    id BIGSERIAL PRIMARY KEY,
    ledger_sequence BIGINT NOT NULL,
    transaction_hash VARCHAR(255),
    payment_id VARCHAR(255),
    consensus_time TIMESTAMP,
    protocol_version INTEGER,
    verified BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stellar_ledger ON stellar_consensus_log(ledger_sequence);
CREATE INDEX IF NOT EXISTS idx_stellar_tx ON stellar_consensus_log(transaction_hash);

-- User Pi balances with value differentiation
CREATE TABLE IF NOT EXISTS user_pi_balances (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(255) UNIQUE NOT NULL,
    
    -- Internal Pi (mined/contributed)
    internal_mined_balance DECIMAL(20, 8) DEFAULT 0,
    internal_contributed_balance DECIMAL(20, 8) DEFAULT 0,
    internal_total_value DECIMAL(20, 8) DEFAULT 0,  -- With multiplier applied
    
    -- External Pi (exchange)
    external_exchange_balance DECIMAL(20, 8) DEFAULT 0,
    external_total_value DECIMAL(20, 8) DEFAULT 0,
    
    -- Combined totals
    total_nominal_pi DECIMAL(20, 8) DEFAULT 0,
    total_internal_value DECIMAL(20, 8) DEFAULT 0,
    
    -- Timestamps
    last_updated TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_balances_user ON user_pi_balances(user_id);

-- Ecosystem sustainability metrics
CREATE TABLE IF NOT EXISTS ecosystem_metrics (
    id BIGSERIAL PRIMARY KEY,
    metric_date DATE UNIQUE NOT NULL,
    
    -- Transaction metrics
    total_transactions BIGINT DEFAULT 0,
    internal_pi_transactions BIGINT DEFAULT 0,
    external_pi_transactions BIGINT DEFAULT 0,
    
    -- Value metrics
    total_internal_value_processed DECIMAL(30, 8) DEFAULT 0,
    total_external_value_processed DECIMAL(30, 8) DEFAULT 0,
    
    -- Sustainability score (0-100)
    internal_pi_ratio DECIMAL(5, 2),  -- % of transactions using internal Pi
    ecosystem_health DECIMAL(5, 2),   -- Overall health score
    sustainability_years_remaining INTEGER,  -- Projected years sustainable
    
    -- Stellar integration
    stellar_consensus_confirmations BIGINT DEFAULT 0,
    stellar_network_health DECIMAL(5, 2),
    
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_metrics_date ON ecosystem_metrics(metric_date);

-- Initial value history entry
INSERT INTO pi_value_history (
    internal_multiplier,
    internal_min_value,
    external_min_value,
    total_internal_pi,
    total_external_pi,
    ecosystem_health_score,
    notes
) VALUES (
    1.50,  -- INTERNAL_PI_MULTIPLIER
    10.0,  -- INTERNAL_PI_MIN_VALUE
    1.0,   -- EXTERNAL_PI_MIN_VALUE
    0,
    0,
    100.0,
    'Initial configuration for 100-year sustainability model'
);

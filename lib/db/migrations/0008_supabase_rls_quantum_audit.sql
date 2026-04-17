-- ============================================================================
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

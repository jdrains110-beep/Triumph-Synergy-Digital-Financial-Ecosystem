-- ==============================================================================
-- Triumph Synergy Digital Financial Ecosystem — PostgreSQL 16
-- GCV: $314,159.00 / π · Pi Network mainnet · SCP Protocol 24
-- Extensions, schemas, performance baseline, and quantum audit log.
-- All other domain tables are in 01–03 init scripts.
-- ==============================================================================
-- ── Extensions ────────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- uuid_generate_v4()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
-- gen_random_uuid(), crypt()
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";
-- query performance tracking
CREATE EXTENSION IF NOT EXISTS "vector";
-- pgvector: SAIB RAG embeddings
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
-- trigram: fast text search on memos/names
CREATE EXTENSION IF NOT EXISTS "btree_gin";
-- GIN index for composite queries
CREATE EXTENSION IF NOT EXISTS "btree_gist";
-- GIST index for range queries
CREATE EXTENSION IF NOT EXISTS "unaccent";
-- accent-insensitive search
-- ── Schemas ───────────────────────────────────────────────────────────────────
CREATE SCHEMA IF NOT EXISTS pi_network;
-- ledger, accounts, dual-value
CREATE SCHEMA IF NOT EXISTS transactions;
-- payment records, receipts
CREATE SCHEMA IF NOT EXISTS sovereign;
-- tenant storefronts, cart events
CREATE SCHEMA IF NOT EXISTS saib;
-- SAIB receipts, duties, enforcement
CREATE SCHEMA IF NOT EXISTS vault;
-- tokenization, asset ledger
CREATE SCHEMA IF NOT EXISTS credit;
-- PiCredit scoring
CREATE SCHEMA IF NOT EXISTS quantum;
-- quantum-resistant audit log, embeddings
GRANT ALL PRIVILEGES ON SCHEMA pi_network TO postgres;
GRANT ALL PRIVILEGES ON SCHEMA transactions TO postgres;
GRANT ALL PRIVILEGES ON SCHEMA sovereign TO postgres;
GRANT ALL PRIVILEGES ON SCHEMA saib TO postgres;
GRANT ALL PRIVILEGES ON SCHEMA vault TO postgres;
GRANT ALL PRIVILEGES ON SCHEMA credit TO postgres;
GRANT ALL PRIVILEGES ON SCHEMA quantum TO postgres;
-- ==============================================================================
-- Quantum-resistant audit log table
-- Records all Dilithium-5 signed operations for non-repudiation
-- ==============================================================================
CREATE TABLE IF NOT EXISTS quantum.audit_log (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    operation TEXT NOT NULL,
    payload_hash CHAR(128),
    -- SHA3-512 hex digest
    signature TEXT,
    -- Dilithium-5 base64 signature
    public_key TEXT,
    -- Dilithium-5 public key
    algorithm TEXT DEFAULT 'CRYSTALS-Dilithium-5',
    pi_internal_usd NUMERIC(18, 6) DEFAULT 314159.0,
    pi_external_usd NUMERIC(18, 6) DEFAULT 314.159,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_quantum_audit_operation ON quantum.audit_log(operation);
CREATE INDEX IF NOT EXISTS idx_quantum_audit_recorded ON quantum.audit_log(recorded_at DESC);
-- ==============================================================================
-- Pi dual-value ledger — immutable record of every canonical rate update
-- ==============================================================================
CREATE TABLE IF NOT EXISTS pi_network.dual_value_ledger (
    id BIGSERIAL PRIMARY KEY,
    internal_usd NUMERIC(18, 6) NOT NULL,
    external_usd NUMERIC(18, 4) NOT NULL,
    spread_ratio NUMERIC(12, 8),
    signal TEXT,
    network TEXT,
    ledger_seq BIGINT,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dvl_recorded ON pi_network.dual_value_ledger(recorded_at DESC);
-- Seed the canonical Pi rates
INSERT INTO pi_network.dual_value_ledger (
        internal_usd,
        external_usd,
        spread_ratio,
        signal,
        network
    )
VALUES (
        314159.0,
        314.159,
        0.001,
        'ACCUMULATE',
        'Pi Testnet'
    ) ON CONFLICT DO NOTHING;
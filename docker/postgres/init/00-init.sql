-- Pi Network Triumph Synergy - Database Initialization
-- ==============================================================================
-- Optimized for: Pi transaction throughput, PiCredit scores, DEX order books,
--                tokenization, quantum-resistant audit logs, dual-value records.

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";  -- query performance tracking

-- Create schemas
CREATE SCHEMA IF NOT EXISTS pi_network;
CREATE SCHEMA IF NOT EXISTS transactions;
CREATE SCHEMA IF NOT EXISTS vault;
CREATE SCHEMA IF NOT EXISTS quantum;

-- Grant permissions
GRANT ALL PRIVILEGES ON SCHEMA pi_network    TO postgres;
GRANT ALL PRIVILEGES ON SCHEMA transactions  TO postgres;
GRANT ALL PRIVILEGES ON SCHEMA vault         TO postgres;
GRANT ALL PRIVILEGES ON SCHEMA quantum       TO postgres;

-- ==============================================================================
-- Performance tuning — maximized for 256MB container
-- ==============================================================================
-- shared_buffers      = 25% of 256MB = 64MB  (PostgreSQL recommended)
-- effective_cache_size= 75% of 256MB = 192MB
-- work_mem            = 12MB (higher = faster sorts/joins, limit concurrent × per query)
-- wal_buffers         = 16MB (maximize WAL write throughput)
-- max_connections     = 150 (up from 100 — 22 services × ~6 pool connections)
-- parallel_workers    = 2   (enable parallel query for analytics)

ALTER SYSTEM SET max_connections                 = 150;
ALTER SYSTEM SET shared_buffers                  = '64MB';
ALTER SYSTEM SET effective_cache_size            = '192MB';
ALTER SYSTEM SET maintenance_work_mem            = '48MB';
ALTER SYSTEM SET work_mem                        = '12MB';
ALTER SYSTEM SET checkpoint_completion_target    = 0.9;
ALTER SYSTEM SET wal_buffers                     = '16MB';
ALTER SYSTEM SET wal_compression                 = 'on';
ALTER SYSTEM SET random_page_cost                = 1.1;
ALTER SYSTEM SET effective_io_concurrency        = 200;
ALTER SYSTEM SET max_parallel_workers_per_gather = 2;
ALTER SYSTEM SET max_parallel_workers            = 2;
ALTER SYSTEM SET log_min_duration_statement      = 200;  -- log slow queries >200ms (tighter)
ALTER SYSTEM SET track_io_timing                 = 'on'; -- precise I/O timing for pg_stat_statements
ALTER SYSTEM SET pg_stat_statements.track        = 'all';

-- ==============================================================================
-- Quantum-resistant audit log table
-- Records all Dilithium-5 signed operations for non-repudiation
-- ==============================================================================
CREATE TABLE IF NOT EXISTS quantum.audit_log (
    id              UUID        DEFAULT uuid_generate_v4() PRIMARY KEY,
    operation       TEXT        NOT NULL,
    payload_hash    CHAR(128),  -- SHA3-512 hex digest
    signature       TEXT,       -- Dilithium-5 base64 signature
    public_key      TEXT,       -- Dilithium-5 public key
    algorithm       TEXT        DEFAULT 'CRYSTALS-Dilithium-5',
    pi_internal_usd NUMERIC(18,6) DEFAULT 314159.0,
    pi_external_usd NUMERIC(18,6) DEFAULT 314.159,
    recorded_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quantum_audit_operation ON quantum.audit_log(operation);
CREATE INDEX IF NOT EXISTS idx_quantum_audit_recorded  ON quantum.audit_log(recorded_at DESC);

-- ==============================================================================
-- Pi dual-value ledger — immutable record of every canonical rate update
-- ==============================================================================
CREATE TABLE IF NOT EXISTS pi_network.dual_value_ledger (
    id              BIGSERIAL   PRIMARY KEY,
    internal_usd    NUMERIC(18,6) NOT NULL,
    external_usd    NUMERIC(18,4) NOT NULL,
    spread_ratio    NUMERIC(12,8),
    signal          TEXT,
    network         TEXT,
    ledger_seq      BIGINT,
    recorded_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dvl_recorded ON pi_network.dual_value_ledger(recorded_at DESC);

-- Seed the canonical Pi rates
INSERT INTO pi_network.dual_value_ledger (internal_usd, external_usd, spread_ratio, signal, network)
VALUES (314159.0, 314.159, 0.001, 'ACCUMULATE', 'Pi Testnet')
ON CONFLICT DO NOTHING;

-- ==============================================================================
-- SAIB Enforcer — Self-Aware Intelligent Bot enforcement, receipts, duties
-- Autonomous agent action log with SHA-256 immutability
-- ==============================================================================
CREATE TABLE IF NOT EXISTS saib.receipts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action VARCHAR(100) NOT NULL,
    actor VARCHAR(100) NOT NULL,
    -- autonomous, founder-token, etc.
    outcome VARCHAR(32) DEFAULT 'ok',
    payload_hash CHAR(64) NOT NULL,
    -- SHA-256 digest
    signature TEXT,
    -- optional Dilithium-5 signature
    pi_network_ledger BIGINT,
    ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    summary TEXT
);
CREATE INDEX IF NOT EXISTS idx_receipt_action ON saib.receipts(action);
CREATE INDEX IF NOT EXISTS idx_receipt_actor ON saib.receipts(actor);
CREATE INDEX IF NOT EXISTS idx_receipt_ts ON saib.receipts(ts DESC);
-- ──────────────────────────────────────────────────────────────────────────────
-- Duty Engine — autonomous task execution log
CREATE TABLE IF NOT EXISTS saib.duties_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    duty_name VARCHAR(100) NOT NULL,
    cadence_sec INTEGER,
    last_ran_at TIMESTAMPTZ,
    next_run_at TIMESTAMPTZ,
    status VARCHAR(32) DEFAULT 'idle',
    -- idle/running/error
    last_error TEXT,
    execution_ms INTEGER,
    result_data JSONB,
    run_count BIGINT DEFAULT 0,
    error_count BIGINT DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_duty_name ON saib.duties_log(duty_name);
CREATE INDEX IF NOT EXISTS idx_duty_status ON saib.duties_log(status);
CREATE INDEX IF NOT EXISTS idx_duty_next_run ON saib.duties_log(next_run_at ASC NULLS LAST);
-- ──────────────────────────────────────────────────────────────────────────────
-- Live Ledger Cache — snapshot of recent Pi mainnet transactions
CREATE TABLE IF NOT EXISTS saib.live_ledger_snapshot (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ledger_seq BIGINT NOT NULL,
    transaction_hash CHAR(64) NOT NULL,
    pi_amount NUMERIC(24, 7),
    gcv_usd NUMERIC(24, 2),
    category VARCHAR(32),
    memo TEXT,
    source_account VARCHAR(56),
    timestamp TIMESTAMPTZ NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_live_ledger_seq ON saib.live_ledger_snapshot(ledger_seq DESC);
CREATE INDEX IF NOT EXISTS idx_live_ledger_category ON saib.live_ledger_snapshot(category);
CREATE INDEX IF NOT EXISTS idx_live_ledger_recorded ON saib.live_ledger_snapshot(recorded_at DESC);
-- Auto-delete rows older than 30 days (TTL for live ledger)
CREATE OR REPLACE FUNCTION saib.prune_old_ledger_snapshots() RETURNS void AS $$ BEGIN
DELETE FROM saib.live_ledger_snapshot
WHERE recorded_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;
-- ──────────────────────────────────────────────────────────────────────────────
-- Quantum Audit Log — immutable Dilithium-5 signed operations
CREATE TABLE IF NOT EXISTS quantum.audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    operation TEXT NOT NULL,
    payload_hash CHAR(128),
    -- SHA3-512 hex
    signature TEXT,
    -- Dilithium-5 base64
    public_key TEXT,
    -- Dilithium-5 public key base64
    algorithm VARCHAR(50) DEFAULT 'CRYSTALS-Dilithium-5',
    pi_internal_usd NUMERIC(18, 6) DEFAULT 314159.0,
    pi_external_usd NUMERIC(18, 6) DEFAULT 314.159,
    pi_gcv_rate NUMERIC(18, 6) DEFAULT 314159.0,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_operation ON quantum.audit_log(operation);
CREATE INDEX IF NOT EXISTS idx_audit_recorded ON quantum.audit_log(recorded_at DESC);
-- ──────────────────────────────────────────────────────────────────────────────
-- Dual-Value Ledger — immutable record of Pi internal vs external rates
CREATE TABLE IF NOT EXISTS pi_network.dual_value_ledger (
    id BIGSERIAL PRIMARY KEY,
    internal_usd NUMERIC(18, 6) NOT NULL,
    external_usd NUMERIC(18, 4) NOT NULL,
    spread_ratio NUMERIC(12, 8),
    signal VARCHAR(32),
    -- ACCUMULATE/DISTRIBUTE/NEUTRAL
    network VARCHAR(20),
    ledger_seq BIGINT,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dvl_recorded ON pi_network.dual_value_ledger(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_dvl_signal ON pi_network.dual_value_ledger(signal);
-- Seed canonical Pi rates
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
        'Pi Mainnet'
    ) ON CONFLICT DO NOTHING;
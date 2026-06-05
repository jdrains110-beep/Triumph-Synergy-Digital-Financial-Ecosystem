-- ==============================================================================
-- Pi Network Ledger — Triumph Synergy SCP Protocol 24
-- Immutable transaction record with GCV ($314,159/π) tags and category classification
-- ==============================================================================
CREATE TABLE IF NOT EXISTS pi_network.ledger_state (
    id BIGSERIAL PRIMARY KEY,
    ledger_seq BIGINT UNIQUE NOT NULL,
    closed_at TIMESTAMPTZ NOT NULL,
    transaction_count INTEGER NOT NULL DEFAULT 0,
    operation_count INTEGER NOT NULL DEFAULT 0,
    total_coins NUMERIC(24, 7) NOT NULL,
    base_fee_stroops BIGINT NOT NULL,
    base_reserve_stroops BIGINT NOT NULL,
    protocol_version INTEGER NOT NULL DEFAULT 24,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    gcv_usd_volume NUMERIC(24, 2)
);
CREATE INDEX IF NOT EXISTS idx_ledger_seq ON pi_network.ledger_state(ledger_seq DESC);
CREATE INDEX IF NOT EXISTS idx_ledger_closed ON pi_network.ledger_state(closed_at DESC);
-- Seed latest ledger state
INSERT INTO pi_network.ledger_state (
        ledger_seq,
        closed_at,
        transaction_count,
        operation_count,
        total_coins,
        base_fee_stroops,
        base_reserve_stroops,
        protocol_version,
        gcv_usd_volume
    )
VALUES (1, NOW(), 0, 0, 0, 100, 5000000, 24, 0) ON CONFLICT (ledger_seq) DO NOTHING;
-- ──────────────────────────────────────────────────────────────────────────────
-- Transactions — all Pi mainnet payment operations
CREATE TABLE IF NOT EXISTS pi_network.transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    hash CHAR(64) UNIQUE NOT NULL,
    ledger_seq BIGINT NOT NULL REFERENCES pi_network.ledger_state(ledger_seq),
    source_account VARCHAR(56) NOT NULL,
    operation_count INTEGER NOT NULL,
    fee_charged_stroops BIGINT NOT NULL,
    memo_type VARCHAR(20),
    memo TEXT,
    created_at TIMESTAMPTZ NOT NULL,
    successful BOOLEAN NOT NULL DEFAULT TRUE,
    pi_amount NUMERIC(24, 7),
    gcv_usd NUMERIC(24, 2),
    category VARCHAR(32),
    -- goods/services/payment/remittance/transfer/other
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tx_ledger ON pi_network.transactions(ledger_seq DESC);
CREATE INDEX IF NOT EXISTS idx_tx_source ON pi_network.transactions(source_account);
CREATE INDEX IF NOT EXISTS idx_tx_created ON pi_network.transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tx_category ON pi_network.transactions(category);
CREATE INDEX IF NOT EXISTS idx_tx_gcv ON pi_network.transactions(gcv_usd DESC NULLS LAST);
-- ──────────────────────────────────────────────────────────────────────────────
-- Operations — individual payment/transfer ops within transactions
CREATE TABLE IF NOT EXISTS pi_network.operations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_hash CHAR(64) NOT NULL,
    operation_id BIGINT NOT NULL,
    type VARCHAR(50) NOT NULL,
    -- payment, create_account, path_payment_*
    source_account VARCHAR(56) NOT NULL,
    dest_account VARCHAR(56),
    pi_amount NUMERIC(24, 7),
    asset_type VARCHAR(20) DEFAULT 'native',
    asset_code VARCHAR(12),
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_op_tx_hash ON pi_network.operations(transaction_hash);
CREATE INDEX IF NOT EXISTS idx_op_source ON pi_network.operations(source_account);
CREATE INDEX IF NOT EXISTS idx_op_dest ON pi_network.operations(dest_account);
CREATE INDEX IF NOT EXISTS idx_op_type ON pi_network.operations(type);
-- ──────────────────────────────────────────────────────────────────────────────
-- Accounts — Pi Network account balances and metadata
CREATE TABLE IF NOT EXISTS pi_network.accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id VARCHAR(56) UNIQUE NOT NULL,
    balance_pi NUMERIC(24, 7) NOT NULL DEFAULT 0,
    sequence_num BIGINT NOT NULL DEFAULT 1,
    subentry_count INTEGER NOT NULL DEFAULT 0,
    home_domain VARCHAR(255),
    inflation_dest VARCHAR(56),
    flags INTEGER DEFAULT 0,
    thresholds_low INTEGER DEFAULT 0,
    thresholds_med INTEGER DEFAULT 0,
    thresholds_high INTEGER DEFAULT 0,
    last_modified_ledger BIGINT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    gcv_balance_usd NUMERIC(24, 2)
);
CREATE INDEX IF NOT EXISTS idx_account_id ON pi_network.accounts(account_id);
CREATE INDEX IF NOT EXISTS idx_account_balance ON pi_network.accounts(balance_pi DESC);
CREATE INDEX IF NOT EXISTS idx_account_updated ON pi_network.accounts(updated_at DESC);
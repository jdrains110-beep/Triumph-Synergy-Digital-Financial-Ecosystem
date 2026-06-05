-- ==============================================================================
-- Credit Bureau — PiCredit scoring on Pi Network mainnet
-- Integrated with judicial compliance + SAIB enforcement
-- ==============================================================================
CREATE TABLE IF NOT EXISTS credit.credit_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pi_account VARCHAR(56) UNIQUE NOT NULL,
    pi_uid VARCHAR(128),
    -- Pi App user ID
    credit_score INTEGER DEFAULT 750,
    -- 300-850 range
    tier VARCHAR(20) DEFAULT 'standard',
    -- tier1/tier2/tier3/premium
    pi_balance NUMERIC(24, 7),
    pi_balance_usd NUMERIC(24, 2),
    transaction_count INTEGER DEFAULT 0,
    goods_count INTEGER DEFAULT 0,
    services_count INTEGER DEFAULT 0,
    payment_count INTEGER DEFAULT 0,
    remittance_count INTEGER DEFAULT 0,
    default_risk NUMERIC(5, 2) DEFAULT 2.5,
    -- percentage
    total_pi_volume NUMERIC(24, 7) DEFAULT 0,
    total_usd_volume NUMERIC(24, 2) DEFAULT 0,
    last_transaction TIMESTAMPTZ,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_credit_account ON credit.credit_profiles(pi_account);
CREATE INDEX IF NOT EXISTS idx_credit_score ON credit.credit_profiles(credit_score DESC);
CREATE INDEX IF NOT EXISTS idx_credit_tier ON credit.credit_profiles(tier);
CREATE INDEX IF NOT EXISTS idx_credit_updated ON credit.credit_profiles(updated_at DESC);
-- ──────────────────────────────────────────────────────────────────────────────
-- Credit Events — transactions that affect score
CREATE TABLE IF NOT EXISTS credit.credit_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES credit.credit_profiles(id),
    event_type VARCHAR(50) NOT NULL,
    -- payment/default/dispute/inquiry/limit_increase
    delta_score INTEGER,
    -- +10/-50, etc.
    reference_id VARCHAR(256),
    -- tx_hash, payment_id, etc.
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_credit_event_profile ON credit.credit_events(profile_id);
CREATE INDEX IF NOT EXISTS idx_credit_event_type ON credit.credit_events(event_type);
CREATE INDEX IF NOT EXISTS idx_credit_event_created ON credit.credit_events(created_at DESC);
-- ──────────────────────────────────────────────────────────────────────────────
-- PiCredit Limits — merchant/user specific credit lines
CREATE TABLE IF NOT EXISTS credit.credit_limits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES credit.credit_profiles(id),
    limit_type VARCHAR(50) NOT NULL,
    -- daily/monthly/total
    limit_pi NUMERIC(24, 7) NOT NULL,
    used_pi NUMERIC(24, 7) NOT NULL DEFAULT 0,
    used_percent NUMERIC(5, 2) GENERATED ALWAYS AS (used_pi / limit_pi * 100) STORED,
    reset_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_limit_profile ON credit.credit_limits(profile_id);
CREATE INDEX IF NOT EXISTS idx_limit_type ON credit.credit_limits(limit_type);
-- ──────────────────────────────────────────────────────────────────────────────
-- Disputes & Chargebacks
CREATE TABLE IF NOT EXISTS credit.disputes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES credit.credit_profiles(id),
    payment_id VARCHAR(256),
    category VARCHAR(50) NOT NULL,
    -- chargeback/fraud/error/merchant_error
    amount_pi NUMERIC(24, 7),
    amount_usd NUMERIC(24, 2),
    description TEXT,
    status VARCHAR(32) DEFAULT 'open',
    -- open/investigating/resolved/denied
    resolution TEXT,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dispute_profile ON credit.disputes(profile_id);
CREATE INDEX IF NOT EXISTS idx_dispute_status ON credit.disputes(status);
CREATE INDEX IF NOT EXISTS idx_dispute_created ON credit.disputes(created_at DESC);
-- ──────────────────────────────────────────────────────────────────────────────
-- Sanctions Check — OFAC/AML compliance
CREATE TABLE IF NOT EXISTS credit.sanctions_list (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    identifier VARCHAR(256) NOT NULL UNIQUE,
    -- account/name/ID
    id_type VARCHAR(50) NOT NULL,
    -- pi_account/email/phone/uuid
    source VARCHAR(100) NOT NULL,
    -- OFAC/EU/UN/INTERPOL
    action VARCHAR(50) DEFAULT 'block',
    -- block/review/none
    reason TEXT,
    added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_sanctions_identifier ON credit.sanctions_list(identifier);
CREATE INDEX IF NOT EXISTS idx_sanctions_source ON credit.sanctions_list(source);
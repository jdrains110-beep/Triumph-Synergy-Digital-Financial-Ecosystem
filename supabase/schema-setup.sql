/**
 * Supabase Database Schema Setup for SAIB Optimus v4.0
 * 
 * Execute these SQL commands in your Supabase dashboard (SQL Editor)
 * to set up the required tables for security telemetry and system monitoring.
 */
-- ============================================================
-- TABLE 1: Security Logs
-- ============================================================
-- Stores all security events, circuit breaker triggers, and system state changes
CREATE TABLE IF NOT EXISTS saib_security_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    saib_id TEXT NOT NULL,
    event_type TEXT NOT NULL CHECK (
        event_type IN (
            'OMNIGUARD_AUDIT',
            'GAS_MARKET_CHECK',
            'CIRCUIT_BREAKER',
            'STANDARD_EXECUTION'
        )
    ),
    state_engaged TEXT NOT NULL,
    circuit_breaker_tripped BOOLEAN DEFAULT FALSE,
    variance_detected BOOLEAN DEFAULT FALSE,
    variance_amount TEXT,
    gas_price_wei TEXT,
    estimated_cost_usd DECIMAL(18, 2),
    logged_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    -- Indexes for query performance
    INDEX idx_saib_id (saib_id),
    INDEX idx_logged_at (logged_at DESC),
    INDEX idx_circuit_breaker (circuit_breaker_tripped),
    INDEX idx_event_type (event_type)
);
-- ============================================================
-- TABLE 2: Ecosystem Balances
-- ============================================================
-- Tracks global balance snapshots across all active wallets
CREATE TABLE IF NOT EXISTS ecosystem_balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address TEXT NOT NULL,
    balance_wei TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    total_wei_sum TEXT,
    snapshot_count INTEGER DEFAULT 1,
    INDEX idx_wallet (wallet_address),
    INDEX idx_timestamp (timestamp DESC)
);
-- ============================================================
-- TABLE 3: GCV Transactions (Pi Network Global Consensus Value)
-- ============================================================
-- Tracks all Pi Network GCV transactions with trust graph validation
CREATE TABLE IF NOT EXISTS gcv_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id TEXT NOT NULL UNIQUE,
    saib_id TEXT NOT NULL,
    status TEXT NOT NULL CHECK (
        status IN (
            'AUTHORIZED',
            'QUEUED',
            'SUCCESS',
            'FAILED',
            'PROCESSING'
        )
    ),
    trust_score INTEGER CHECK (
        trust_score >= 0
        AND trust_score <= 100
    ),
    pi_amount TEXT,
    gcv_settlement_usd TEXT,
    classification_tier TEXT,
    execution_priority TEXT CHECK (
        execution_priority IN (
            'IMMEDIATE',
            'HIGH',
            'NORMAL',
            'QUEUED',
            'DEFERRED'
        )
    ),
    sovereign_clearance INTEGER DEFAULT 0,
    system_class_engaged TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    INDEX idx_transaction_id (transaction_id),
    INDEX idx_saib_id (saib_id),
    INDEX idx_status (status),
    INDEX idx_trust_score (trust_score DESC),
    INDEX idx_created_at (created_at DESC),
    INDEX idx_sovereign_clearance (sovereign_clearance DESC)
);
-- ============================================================
-- TABLE 3B: Reentrancy Audit History
-- ============================================================
-- Detailed audit records from OmniGuard scans
CREATE TABLE IF NOT EXISTS omniguard_audits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    audit_timestamp BIGINT NOT NULL,
    wallet_count INTEGER,
    total_balance_wei TEXT,
    variance_detected BOOLEAN DEFAULT FALSE,
    variance_amount TEXT,
    audit_results JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    INDEX idx_audit_timestamp (audit_timestamp DESC),
    INDEX idx_variance_detected (variance_detected)
);
-- ============================================================
-- TABLE 4: Gas Market History
-- ============================================================
-- Tracks gas price trends for economic viability analysis
CREATE TABLE IF NOT EXISTS gas_price_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    gas_price_wei TEXT NOT NULL,
    gas_price_gwei DECIMAL(18, 2),
    eth_price_usd DECIMAL(18, 2),
    estimated_tx_cost_usd DECIMAL(18, 2),
    is_viable BOOLEAN,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    INDEX idx_timestamp (timestamp DESC),
    INDEX idx_is_viable (is_viable)
);
-- ============================================================
-- TABLE 5: System Events Log
-- ============================================================
-- General system events and state transitions
CREATE TABLE IF NOT EXISTS system_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('INFO', 'WARNING', 'CRITICAL')),
    message TEXT,
    metadata JSONB,
    resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE,
    INDEX idx_severity (severity),
    INDEX idx_created_at (created_at DESC)
);
-- ============================================================
-- ROW-LEVEL SECURITY (RLS) POLICIES
-- ============================================================
-- Enable RLS
ALTER TABLE saib_security_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ecosystem_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE gcv_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE omniguard_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE gas_price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_events ENABLE ROW LEVEL SECURITY;
-- Create service role bypass (for backend)
-- This allows the Next.js backend to access tables with service role key
-- Note: Service role key bypasses RLS automatically
-- Optional: Create public read policy (for dashboard queries)
CREATE POLICY "allow_service_role_all" ON saib_security_logs USING (true) WITH CHECK (true);
CREATE POLICY "allow_service_role_all" ON ecosystem_balances USING (true) WITH CHECK (true);
CREATE POLICY "allow_service_role_all" ON gcv_transactions USING (true) WITH CHECK (true);
CREATE POLICY "allow_service_role_all" ON omniguard_audits USING (true) WITH CHECK (true);
CREATE POLICY "allow_service_role_all" ON gas_price_history USING (true) WITH CHECK (true);
CREATE POLICY "allow_service_role_all" ON system_events USING (true) WITH CHECK (true);
-- ============================================================
-- VIEWS FOR DASHBOARD
-- ============================================================
-- Recent security events for dashboard
CREATE OR REPLACE VIEW v_recent_security_events AS
SELECT saib_id,
    event_type,
    state_engaged,
    circuit_breaker_tripped,
    logged_at,
    created_at
FROM saib_security_logs
ORDER BY logged_at DESC
LIMIT 100;
-- Daily statistics
CREATE OR REPLACE VIEW v_daily_stats AS
SELECT DATE(logged_at) as event_date,
    COUNT(*) as total_events,
    COUNT(
        CASE
            WHEN circuit_breaker_tripped THEN 1
        END
    ) as circuit_breaker_trips,
    COUNT(DISTINCT saib_id) as unique_units,
    AVG(CAST(NULLIF(gas_price_wei, '') AS NUMERIC)) as avg_gas_price_wei
FROM saib_security_logs
GROUP BY DATE(logged_at)
ORDER BY event_date DESC;
-- GCV Transaction Summary View
CREATE OR REPLACE VIEW v_gcv_transaction_summary AS
SELECT DATE(created_at) as transaction_date,
    COUNT(*) as total_transactions,
    COUNT(
        CASE
            WHEN status = 'AUTHORIZED' THEN 1
        END
    ) as authorized_count,
    COUNT(
        CASE
            WHEN status = 'SUCCESS' THEN 1
        END
    ) as successful_count,
    COUNT(
        CASE
            WHEN status = 'FAILED' THEN 1
        END
    ) as failed_count,
    COUNT(
        CASE
            WHEN sovereign_clearance = 100 THEN 1
        END
    ) as founder_transactions
FROM gcv_transactions
GROUP BY DATE(created_at)
ORDER BY transaction_date DESC;
-- ============================================================
-- TABLE: Allodial Land Deeds
-- ============================================================
-- Stores sovereign, un-encumbered title deeds for tokenized .pi real estate
CREATE TABLE IF NOT EXISTS allodial_land_deeds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    certificate_id TEXT NOT NULL UNIQUE,
    domain_platform TEXT NOT NULL,
    owner_wallet TEXT NOT NULL,
    equity_value_usd TEXT NOT NULL,
    tenure_class TEXT NOT NULL CHECK (tenure_class IN ('ALLODIAL_FREE_HOLD')),
    verified_by_unit TEXT NOT NULL,
    witness_a_status TEXT DEFAULT 'UNVERIFIED' CHECK (witness_a_status IN ('VALID', 'INVALID', 'UNVERIFIED')),
    witness_b_status TEXT DEFAULT 'UNVERIFIED' CHECK (witness_b_status IN ('VALID', 'INVALID', 'UNVERIFIED')),
    consensus_achieved BOOLEAN DEFAULT FALSE,
    transferred_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    -- Indexes for query performance
    INDEX idx_certificate_id (certificate_id),
    INDEX idx_owner_wallet (owner_wallet),
    INDEX idx_domain_platform (domain_platform),
    INDEX idx_transferred_at (transferred_at DESC),
    INDEX idx_consensus (consensus_achieved)
);
-- Enable Row-Level Security
ALTER TABLE allodial_land_deeds ENABLE ROW LEVEL SECURITY;
-- RLS Policy: Allow service role full access for backend operations
CREATE POLICY "allow_service_role_all" ON allodial_land_deeds USING (true) WITH CHECK (true);
-- ============================================================
-- VIEW: Allodial Deed Summary
-- ============================================================
-- Daily statistics on deed issuance and finalization
CREATE OR REPLACE VIEW v_allodial_deed_summary AS
SELECT DATE(transferred_at) as deed_date,
    COUNT(*) as total_deeds_issued,
    COUNT(
        CASE
            WHEN consensus_achieved THEN 1
        END
    ) as finalized_with_consensus,
    COUNT(DISTINCT owner_wallet) as unique_owners,
    COUNT(
        CASE
            WHEN witness_a_status = 'VALID' AND witness_b_status = 'VALID' THEN 1
        END
    ) as dual_witness_verified_count,
    SUM(CAST(REPLACE(REPLACE(equity_value_usd, '$', ''), ',', '') AS NUMERIC)) as total_gcv_value_usd
FROM allodial_land_deeds
GROUP BY DATE(transferred_at)
ORDER BY deed_date DESC;
-- ============================================================
-- SETUP INSTRUCTIONS
-- ============================================================
/*
 HOW TO RUN THIS SCHEMA:
 
 1. Go to your Supabase dashboard: https://app.supabase.com/
 2. Select your project
 3. Click "SQL Editor" in the left sidebar
 4. Click "New query"
 5. Copy this entire SQL file into the editor
 6. Click "Run" or press Ctrl+Enter
 7. Wait for all tables to be created (you'll see green checkmarks)
 
 VERIFICATION:
 
 After running, verify the tables were created:
 1. Click "Table Editor" in the left sidebar
 2. You should see:
 - saib_security_logs
 - ecosystem_balances
 - omniguard_audits
 - gas_price_history
 - system_events
 
 ENVIRONMENT VARIABLES:
 
 Add these to your .env.local:
 
 SUPABASE_URL=https://your-project.supabase.co
 SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...  (from Settings > API)
 NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
 NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc... (from Settings > API)
 
 */
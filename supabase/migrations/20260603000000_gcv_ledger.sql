-- ─────────────────────────────────────────────────────────────────────────────
-- GCV Ledger Schema  —  Pi Network GCV ($314,159) P2P Exchange Audit Trail
-- Migration: 20260603000000_gcv_ledger
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Tables:
--   gcv_peer_nodes     — registry of Pi Network peer nodes with GCV reputation
--   gcv_transactions   — immutable audit log of every GCV-enforced trade
--
-- GCV Constants (for reference):
--   1 Pi  = $314,159.00 USD (Global Consensus Value)
--   1 nPi = $0.00314159 USD (nano-Pi, smallest unit)
--
-- Reputation scoring:
--   Initial score : 50.00
--   Per PASS      : +0.5  (capped at 100.00)
--   Per REJECT    : -2.0  (floored at 0.00)
-- ─────────────────────────────────────────────────────────────────────────────
-- Peer node registry
CREATE TABLE IF NOT EXISTS gcv_peer_nodes (
    node_id VARCHAR(128) PRIMARY KEY,
    reputation_score NUMERIC(5, 2) NOT NULL DEFAULT 50.00 CHECK (
        reputation_score >= 0.00
        AND reputation_score <= 100.00
    ),
    total_completed_trades INT NOT NULL DEFAULT 0,
    total_rejected_trades INT NOT NULL DEFAULT 0,
    is_blacklisted BOOLEAN NOT NULL DEFAULT FALSE,
    last_seen_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE gcv_peer_nodes IS 'Pi Network peer node registry with GCV reputation scoring.';
COMMENT ON COLUMN gcv_peer_nodes.reputation_score IS 'GCV compliance score 0-100. Default 50. +0.5 per approved trade, -2.0 per rejected.';
COMMENT ON COLUMN gcv_peer_nodes.is_blacklisted IS 'True when the node has been flagged for repeated GCV devaluation attempts.';
-- GCV transaction audit trail
CREATE TABLE IF NOT EXISTS gcv_transactions (
    transaction_id VARCHAR(64) PRIMARY KEY,
    sender_node_id VARCHAR(128) REFERENCES gcv_peer_nodes(node_id) ON DELETE
    SET NULL,
        receiver_node_id VARCHAR(128),
        item_description TEXT,
        fiat_value_usd NUMERIC(18, 2),
        pi_amount NUMERIC(20, 8),
        -- 8 decimal places = nano-Pi precision
        status VARCHAR(20) NOT NULL CHECK (
            status IN ('PENDING', 'PASSED', 'REJECTED', 'ERROR')
        ),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
COMMENT ON TABLE gcv_transactions IS 'GCV-enforced Pi Network P2P transaction audit trail — immutable record of every trade decision.';
COMMENT ON COLUMN gcv_transactions.pi_amount IS 'Pi amount offered — stored to 8 decimal places (nano-Pi precision, 1e-8).';
COMMENT ON COLUMN gcv_transactions.fiat_value_usd IS 'Market value of the item being traded in USD at time of enforcement.';
-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_gcv_tx_sender ON gcv_transactions (sender_node_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gcv_tx_status ON gcv_transactions (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_gcv_peer_rep ON gcv_peer_nodes (reputation_score DESC);
CREATE INDEX IF NOT EXISTS idx_gcv_peer_blacklisted ON gcv_peer_nodes (is_blacklisted, reputation_score DESC)
WHERE is_blacklisted = TRUE;
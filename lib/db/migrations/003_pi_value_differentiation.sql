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

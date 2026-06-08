-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- SAIB Mutation Ledger (immutable record of all mutations)
CREATE TABLE IF NOT EXISTS saib_mutation_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  mutation_type VARCHAR(50) NOT NULL,
  service VARCHAR(100) NOT NULL,
  metadata JSONB,
  outcome VARCHAR(20),
  -- 'success' | 'failure' | 'partial'
  metrics_before JSONB,
  metrics_after JSONB,
  embedding VECTOR(1536),
  confidence_score FLOAT DEFAULT 0.5,
  executed_by VARCHAR(100),
  -- 'autonomous' | 'human' | 'meta_builder'
  risk_score FLOAT DEFAULT 0.5,
  execution_time_ms INT
);
-- Create indexes for fast queries
CREATE INDEX idx_mutations_created_at_desc ON saib_mutation_ledger(created_at DESC);
CREATE INDEX idx_mutations_service ON saib_mutation_ledger(service);
CREATE INDEX idx_mutations_service_time ON saib_mutation_ledger(service, created_at DESC);
CREATE INDEX idx_mutations_outcome ON saib_mutation_ledger(outcome);
CREATE INDEX idx_mutations_embedding ON saib_mutation_ledger USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
-- SAIB Versions (immutable snapshots for rollback)
CREATE TABLE IF NOT EXISTS saib_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_number VARCHAR(50) NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  s3_snapshot_key VARCHAR(500),
  s3_region VARCHAR(50) DEFAULT 'us-east-1',
  rollback_allowed BOOLEAN DEFAULT TRUE,
  metadata JSONB,
  created_by VARCHAR(100),
  notes TEXT
);
CREATE INDEX idx_versions_created_at_desc ON saib_versions(created_at DESC);
CREATE INDEX idx_versions_version_number ON saib_versions(version_number);
-- Governance Proposals (community voting)
CREATE TABLE IF NOT EXISTS governance_proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  proposal_type VARCHAR(50) NOT NULL,
  -- ecosystem_parameter, new_integration, budget_allocation, policy_change
  title VARCHAR(255) NOT NULL,
  description TEXT,
  proposed_changes JSONB,
  voting_start_at TIMESTAMP WITH TIME ZONE,
  voting_end_at TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) DEFAULT 'pending',
  -- pending, voting, approved, rejected, executed
  final_votes JSONB,
  quorum_required INT DEFAULT 10000,
  approval_threshold FLOAT DEFAULT 0.66,
  created_by VARCHAR(100)
);
CREATE INDEX idx_proposals_status ON governance_proposals(status);
CREATE INDEX idx_proposals_voting_end_at ON governance_proposals(voting_end_at);
CREATE INDEX idx_proposals_created_at_desc ON governance_proposals(created_at DESC);
-- Governance Votes (individual votes on proposals)
CREATE TABLE IF NOT EXISTS governance_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  proposal_id UUID NOT NULL REFERENCES governance_proposals(id) ON DELETE CASCADE,
  voter_id VARCHAR(100) NOT NULL,
  vote_value INT NOT NULL,
  -- 1 (yes), 0 (abstain), -1 (no)
  weight FLOAT DEFAULT 1.0,
  reasoning TEXT,
  UNIQUE(proposal_id, voter_id)
);
CREATE INDEX idx_votes_proposal_id ON governance_votes(proposal_id);
CREATE INDEX idx_votes_voter_id ON governance_votes(voter_id);
CREATE INDEX idx_votes_created_at_desc ON governance_votes(created_at DESC);
-- Witness Network Validators (BFT consensus)
CREATE TABLE IF NOT EXISTS witness_network_validators (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  validator_address VARCHAR(255) NOT NULL UNIQUE,
  reputation_score INT DEFAULT 50,
  -- 0-100 scale
  slash_count INT DEFAULT 0,
  last_heartbeat_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT TRUE,
  operator_name VARCHAR(255),
  metadata JSONB
);
CREATE INDEX idx_validators_reputation_score_desc ON witness_network_validators(reputation_score DESC);
CREATE INDEX idx_validators_is_active ON witness_network_validators(is_active);
CREATE INDEX idx_validators_created_at_desc ON witness_network_validators(created_at DESC);
-- Autonomous Loop Statistics (track performance)
CREATE TABLE IF NOT EXISTS saib_loop_statistics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  loop_number INT NOT NULL,
  duration_ms INT,
  autonomous_decisions INT DEFAULT 0,
  total_decisions INT DEFAULT 1,
  autonomous_rate FLOAT,
  forecast_accuracy FLOAT,
  errors INT DEFAULT 0,
  memory_patterns_found INT DEFAULT 0
);
CREATE INDEX idx_loop_stats_created_at_desc ON saib_loop_statistics(created_at DESC);
CREATE INDEX idx_loop_stats_loop_number ON saib_loop_statistics(loop_number);
-- Merchant Integration Records (for SDK pilot)
CREATE TABLE IF NOT EXISTS merchant_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  merchant_id VARCHAR(100) NOT NULL UNIQUE,
  merchant_name VARCHAR(255),
  store_address VARCHAR(500),
  sdk_version VARCHAR(20),
  is_active BOOLEAN DEFAULT TRUE,
  total_transactions INT DEFAULT 0,
  total_volume_pi FLOAT DEFAULT 0,
  total_volume_usd FLOAT DEFAULT 0,
  last_transaction_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB
);
CREATE INDEX idx_merchants_merchant_id ON merchant_integrations(merchant_id);
CREATE INDEX idx_merchants_is_active ON merchant_integrations(is_active);
CREATE INDEX idx_merchants_created_at_desc ON merchant_integrations(created_at DESC);
-- Deed Records (community contributions)
CREATE TABLE IF NOT EXISTS deed_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deed_id VARCHAR(100) NOT NULL UNIQUE,
  title VARCHAR(255),
  description TEXT,
  beneficiary VARCHAR(100),
  pi_amount FLOAT,
  usd_value FLOAT,
  witness_count INT DEFAULT 0,
  verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB
);
CREATE INDEX idx_deeds_created_at_desc ON deed_records(created_at DESC);
CREATE INDEX idx_deeds_beneficiary ON deed_records(beneficiary);
CREATE INDEX idx_deeds_verified ON deed_records(verified);
-- Create role for v5 application
CREATE ROLE v5_app WITH LOGIN PASSWORD 'change-me-in-production';
GRANT SELECT,
  INSERT,
  UPDATE ON saib_mutation_ledger TO v5_app;
GRANT SELECT,
  INSERT ON saib_versions TO v5_app;
GRANT SELECT,
  INSERT ON governance_proposals TO v5_app;
GRANT SELECT,
  INSERT ON governance_votes TO v5_app;
GRANT SELECT,
  INSERT,
  UPDATE ON witness_network_validators TO v5_app;
GRANT SELECT,
  INSERT ON saib_loop_statistics TO v5_app;
GRANT SELECT,
  INSERT,
  UPDATE ON merchant_integrations TO v5_app;
GRANT SELECT,
  INSERT,
  UPDATE ON deed_records TO v5_app;
-- Enable RLS (Row Level Security) for sensitive tables
ALTER TABLE saib_mutation_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE governance_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE witness_network_validators ENABLE ROW LEVEL SECURITY;
-- RLS Policy: Allow reads, restrict writes to authenticated users
CREATE POLICY saib_mutation_ledger_read ON saib_mutation_ledger FOR
SELECT USING (TRUE);
CREATE POLICY saib_mutation_ledger_write ON saib_mutation_ledger FOR
INSERT WITH CHECK (
    auth.role() = 'authenticated'
    OR current_user = 'v5_app'
  );
-- Create comments for documentation
COMMENT ON TABLE saib_mutation_ledger IS 'Immutable ledger of all SAIB mutations - tracks every change made by the autonomous executor';
COMMENT ON TABLE saib_versions IS 'Immutable version snapshots with S3 backup for instant rollback';
COMMENT ON TABLE governance_proposals IS 'Community proposals for ecosystem changes - immutable core cannot be voted on';
COMMENT ON TABLE governance_votes IS 'Individual votes on proposals - tracks voting history';
COMMENT ON TABLE witness_network_validators IS 'BFT consensus validators - reputation and slash tracking';
COMMENT ON TABLE saib_loop_statistics IS 'Autonomous loop performance metrics - tracks success rate and accuracy';
COMMENT ON TABLE merchant_integrations IS 'Merchant pilot program tracking - SDK integration records';
COMMENT ON TABLE deed_records IS 'Community deed records - verified contributions and achievements';
-- Pi Network Triumph Synergy - Database Initialization
-- ==============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create schemas
CREATE SCHEMA IF NOT EXISTS pi_network;
CREATE SCHEMA IF NOT EXISTS transactions;
CREATE SCHEMA IF NOT EXISTS vault;

-- Grant permissions
GRANT ALL PRIVILEGES ON SCHEMA pi_network TO postgres;
GRANT ALL PRIVILEGES ON SCHEMA transactions TO postgres;
GRANT ALL PRIVILEGES ON SCHEMA vault TO postgres;

-- Performance tuning for high-throughput
ALTER SYSTEM SET max_connections = 2000;
ALTER SYSTEM SET shared_buffers = '512MB';
ALTER SYSTEM SET effective_cache_size = '1536MB';
ALTER SYSTEM SET maintenance_work_mem = '256MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '16MB';
ALTER SYSTEM SET random_page_cost = 1.1;
ALTER SYSTEM SET effective_io_concurrency = 200;

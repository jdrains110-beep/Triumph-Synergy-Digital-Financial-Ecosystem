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

-- Performance tuning — sized for container mem_limit=256MB
-- shared_buffers = 25% of 256MB = 64MB
-- effective_cache_size = 75% of 256MB = 192MB
ALTER SYSTEM SET max_connections = 100;
ALTER SYSTEM SET shared_buffers = '64MB';
ALTER SYSTEM SET effective_cache_size = '192MB';
ALTER SYSTEM SET maintenance_work_mem = '32MB';
ALTER SYSTEM SET work_mem = '8MB';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET wal_buffers = '8MB';
ALTER SYSTEM SET random_page_cost = 1.1;
ALTER SYSTEM SET effective_io_concurrency = 200;
ALTER SYSTEM SET log_min_duration_statement = 500; -- log slow queries >500ms

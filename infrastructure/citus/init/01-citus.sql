-- Step 4: Citus extension bootstrap (runs once on coordinator + workers)
-- Auto-executed by Postgres image at first start.

CREATE EXTENSION IF NOT EXISTS citus;

-- Sane defaults for distributed query planning
ALTER SYSTEM SET citus.shard_count = 32;            -- 32 shards/table → balanced across N workers
ALTER SYSTEM SET citus.shard_replication_factor = 2;-- HA: each shard mirrored on 2 workers
ALTER SYSTEM SET citus.multi_shard_modify_mode = 'parallel';
ALTER SYSTEM SET citus.enable_repartition_joins = on;

SELECT pg_reload_conf();

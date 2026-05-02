-- Step 4: Distribute SAIB tables across Citus workers
-- Idempotent: safe to re-run after schema changes.
-- Run AFTER citus_add_node() registered workers (citus-bootstrap container does this).

-- ── 1. SAIB snapshot table — keyed by replica_id so each pod owns its row ────
-- Single-row-per-replica access pattern → hash distribution by replica_id
-- gives perfect single-shard reads/writes (no scatter-gather).
CREATE TABLE IF NOT EXISTS saib_state (
    replica_id  TEXT NOT NULL,
    key         TEXT NOT NULL,
    value       JSONB NOT NULL,
    updated_at  TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (replica_id, key)
);

SELECT create_distributed_table('saib_state', 'replica_id')
  WHERE NOT EXISTS (
    SELECT 1 FROM pg_dist_partition WHERE logicalrelid = 'saib_state'::regclass
  );

-- ── 2. SAIB events — high-volume append-only stream (visitors, heals, …) ────
-- Sharded by visitor_id (or heal target service_name) so per-entity timelines
-- live on a single shard → fast point queries; analytics use co-located joins.
CREATE TABLE IF NOT EXISTS saib_events (
    visitor_id   TEXT NOT NULL,
    event_id     UUID NOT NULL DEFAULT gen_random_uuid(),
    event_type   TEXT NOT NULL,
    replica_id   TEXT,
    payload      JSONB NOT NULL,
    occurred_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (visitor_id, event_id)
);

SELECT create_distributed_table('saib_events', 'visitor_id', colocate_with => 'saib_state')
  WHERE NOT EXISTS (
    SELECT 1 FROM pg_dist_partition WHERE logicalrelid = 'saib_events'::regclass
  );

CREATE INDEX IF NOT EXISTS saib_events_type_time_idx
  ON saib_events (event_type, occurred_at DESC);

-- ── 3. Reference table — small lookup data replicated to every worker ───────
-- (loophole catalog, sector list, etc.) → no shard-key needed for joins
CREATE TABLE IF NOT EXISTS saib_ref_loopholes (
    code        TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    description TEXT,
    enabled     BOOLEAN DEFAULT true
);

SELECT create_reference_table('saib_ref_loopholes')
  WHERE NOT EXISTS (
    SELECT 1 FROM pg_dist_partition WHERE logicalrelid = 'saib_ref_loopholes'::regclass
  );

-- ── 4. Verify ─────────────────────────────────────────────────────────────────
SELECT logicalrelid::text AS table, partmethod, repmodel, colocationid
  FROM pg_dist_partition
 ORDER BY 1;

SELECT nodename, count(*) AS shards
  FROM pg_dist_shard_placement
 GROUP BY 1 ORDER BY 1;

-- Step 4 / SGN: Distribute Sovereign Gaming Nexus tables across Citus workers.
-- Idempotent: safe to re-run.
--
-- Sharding strategy:
--   * Per-studio data (titles, employees, contracts, payroll runs) -> shard
--     by studio_id so a studio's queries hit a single worker.
--   * Per-player data (earn events, lifetime totals) -> shard by player_id
--     so a player's full history lives on one shard.
--   * Reference data (loophole catalog, authority registry) -> reference
--     tables replicated to every worker for join performance.

-- ── 1. Studios ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sgn_studios (
    studio_id     TEXT NOT NULL,
    name          TEXT NOT NULL,
    country       TEXT,
    contact_email TEXT,
    pi_treasury_address TEXT,
    hmac_version  TEXT,
    registered_at TIMESTAMPTZ DEFAULT now(),
    quantum_sig   TEXT,
    payload       JSONB NOT NULL DEFAULT '{}'::jsonb,
    PRIMARY KEY (studio_id)
);

SELECT create_distributed_table('sgn_studios', 'studio_id')
  WHERE NOT EXISTS (
    SELECT 1 FROM pg_dist_partition WHERE logicalrelid = 'sgn_studios'::regclass
  );

-- ── 2. Titles (co-located with studios so studio→titles joins are local) ────
CREATE TABLE IF NOT EXISTS sgn_titles (
    studio_id     TEXT NOT NULL,
    title_id      TEXT NOT NULL,
    name          TEXT NOT NULL,
    online        BOOLEAN DEFAULT true,
    earn_table    JSONB NOT NULL DEFAULT '{}'::jsonb,
    daily_player_cap_pi DOUBLE PRECISION DEFAULT 100.0,
    registered_at TIMESTAMPTZ DEFAULT now(),
    quantum_sig   TEXT,
    PRIMARY KEY (studio_id, title_id)
);

SELECT create_distributed_table('sgn_titles', 'studio_id', colocate_with => 'sgn_studios')
  WHERE NOT EXISTS (
    SELECT 1 FROM pg_dist_partition WHERE logicalrelid = 'sgn_titles'::regclass
  );

-- ── 3. Players (sharded by player_id; lookups + lifetime updates are local) ─
CREATE TABLE IF NOT EXISTS sgn_players (
    player_id        TEXT NOT NULL,
    pi_username      TEXT,
    pi_address       TEXT,
    country          TEXT,
    kyc_verified     BOOLEAN DEFAULT false,
    lifetime_pi_earned DOUBLE PRECISION DEFAULT 0,
    registered_at    TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (player_id)
);

SELECT create_distributed_table('sgn_players', 'player_id')
  WHERE NOT EXISTS (
    SELECT 1 FROM pg_dist_partition WHERE logicalrelid = 'sgn_players'::regclass
  );

-- ── 4. Earn events (high-volume append-only; co-located with players) ───────
CREATE TABLE IF NOT EXISTS sgn_earn_events (
    player_id   TEXT NOT NULL,
    event_id    UUID NOT NULL DEFAULT gen_random_uuid(),
    studio_id   TEXT NOT NULL,
    title_id    TEXT NOT NULL,
    rule        TEXT NOT NULL,
    amount_pi   DOUBLE PRECISION NOT NULL,
    settle      JSONB,
    quantum_sig TEXT,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (player_id, event_id)
);

SELECT create_distributed_table('sgn_earn_events', 'player_id', colocate_with => 'sgn_players')
  WHERE NOT EXISTS (
    SELECT 1 FROM pg_dist_partition WHERE logicalrelid = 'sgn_earn_events'::regclass
  );

CREATE INDEX IF NOT EXISTS sgn_earn_events_title_time_idx
  ON sgn_earn_events (title_id, occurred_at DESC);

-- ── 5. Tournaments (sharded by title_id; entries co-located) ────────────────
CREATE TABLE IF NOT EXISTS sgn_tournaments (
    title_id      TEXT NOT NULL,
    tournament_id TEXT NOT NULL,
    name          TEXT,
    prize_pool_pi DOUBLE PRECISION NOT NULL,
    splits        DOUBLE PRECISION[] NOT NULL,
    status        TEXT NOT NULL,
    payouts       JSONB,
    created_at    TIMESTAMPTZ DEFAULT now(),
    settled_at    TIMESTAMPTZ,
    quantum_sig   TEXT,
    PRIMARY KEY (title_id, tournament_id)
);

SELECT create_distributed_table('sgn_tournaments', 'title_id')
  WHERE NOT EXISTS (
    SELECT 1 FROM pg_dist_partition WHERE logicalrelid = 'sgn_tournaments'::regclass
  );

-- ── 6. Employers + employees + payroll runs ────────────────────────────────
CREATE TABLE IF NOT EXISTS sgn_employers (
    employer_id   TEXT NOT NULL,
    studio_id     TEXT,
    name          TEXT NOT NULL,
    pi_treasury_address TEXT,
    country       TEXT,
    registered_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (employer_id)
);

SELECT create_distributed_table('sgn_employers', 'employer_id')
  WHERE NOT EXISTS (
    SELECT 1 FROM pg_dist_partition WHERE logicalrelid = 'sgn_employers'::regclass
  );

CREATE TABLE IF NOT EXISTS sgn_employees (
    employer_id   TEXT NOT NULL,
    employee_id   TEXT NOT NULL,
    name          TEXT,
    role          TEXT,
    pi_address    TEXT,
    pi_username   TEXT,
    rate_pi       DOUBLE PRECISION DEFAULT 0,
    cycle         TEXT,
    country       TEXT,
    kyc_verified  BOOLEAN DEFAULT false,
    active        BOOLEAN DEFAULT true,
    lifetime_pi_paid DOUBLE PRECISION DEFAULT 0,
    registered_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (employer_id, employee_id)
);

SELECT create_distributed_table('sgn_employees', 'employer_id', colocate_with => 'sgn_employers')
  WHERE NOT EXISTS (
    SELECT 1 FROM pg_dist_partition WHERE logicalrelid = 'sgn_employees'::regclass
  );

CREATE TABLE IF NOT EXISTS sgn_payroll_runs (
    employer_id   TEXT NOT NULL,
    run_id        TEXT NOT NULL,
    cycle         TEXT,
    paid_count    INT NOT NULL DEFAULT 0,
    skipped_count INT NOT NULL DEFAULT 0,
    total_pi      DOUBLE PRECISION NOT NULL DEFAULT 0,
    quantum_sig   TEXT,
    occurred_at   TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (employer_id, run_id)
);

SELECT create_distributed_table('sgn_payroll_runs', 'employer_id', colocate_with => 'sgn_employers')
  WHERE NOT EXISTS (
    SELECT 1 FROM pg_dist_partition WHERE logicalrelid = 'sgn_payroll_runs'::regclass
  );

-- ── 7. Reference data (replicated to every worker for join performance) ────
CREATE TABLE IF NOT EXISTS sgn_ref_loopholes (
    code        TEXT PRIMARY KEY,
    authority   TEXT NOT NULL,
    name        TEXT NOT NULL,
    description TEXT,
    enabled     BOOLEAN DEFAULT true
);

SELECT create_reference_table('sgn_ref_loopholes')
  WHERE NOT EXISTS (
    SELECT 1 FROM pg_dist_partition WHERE logicalrelid = 'sgn_ref_loopholes'::regclass
  );

CREATE TABLE IF NOT EXISTS sgn_ref_authorities (
    code        TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    loophole_count INT NOT NULL DEFAULT 0,
    rivals      TEXT[]
);

SELECT create_reference_table('sgn_ref_authorities')
  WHERE NOT EXISTS (
    SELECT 1 FROM pg_dist_partition WHERE logicalrelid = 'sgn_ref_authorities'::regclass
  );

-- ── 8. Verify ──────────────────────────────────────────────────────────────
SELECT logicalrelid::text AS table, partmethod, repmodel, colocationid
  FROM pg_dist_partition
 WHERE logicalrelid::text LIKE 'sgn_%'
 ORDER BY 1;

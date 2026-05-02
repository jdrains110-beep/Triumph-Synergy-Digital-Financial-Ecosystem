-- Step 4 / SWN+PPH: Distribute Sovereign Work Nexus + Publix Phygital Hub
-- tables across Citus workers. Idempotent.
--
-- SWN sharding:
--   * sgn_employers/employees/payroll already exist — SWN uses different
--     tables (swn_*) for global jobs+contracts, sharded by employer_id
--     (employer-side queries) and worker_id (worker-side queries).
--
-- PPH sharding:
--   * pph_stores by store_id (per-store queries are local)
--   * pph_loyalty by member_id (per-member queries are local)
--   * pph_receipts by store_id (co-located with stores)

-- ── SWN ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS swn_workers (
    worker_id      TEXT NOT NULL,
    name           TEXT NOT NULL,
    tier           TEXT NOT NULL,             -- PIONEER | NON_PIONEER
    country        TEXT,
    skills         TEXT[],
    languages      TEXT[],
    pi_username    TEXT,
    pi_address     TEXT,
    kyc_verified   BOOLEAN DEFAULT false,
    lifetime_pi_earned DOUBLE PRECISION DEFAULT 0,
    registered_at  TIMESTAMPTZ DEFAULT now(),
    quantum_sig    TEXT,
    PRIMARY KEY (worker_id)
);
SELECT create_distributed_table('swn_workers', 'worker_id')
  WHERE NOT EXISTS (SELECT 1 FROM pg_dist_partition WHERE logicalrelid = 'swn_workers'::regclass);

CREATE TABLE IF NOT EXISTS swn_employers (
    employer_id    TEXT NOT NULL,
    name           TEXT NOT NULL,
    country        TEXT,
    pi_treasury_address TEXT,
    industry       TEXT,
    size           TEXT,
    registered_at  TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (employer_id)
);
SELECT create_distributed_table('swn_employers', 'employer_id')
  WHERE NOT EXISTS (SELECT 1 FROM pg_dist_partition WHERE logicalrelid = 'swn_employers'::regclass);

CREATE TABLE IF NOT EXISTS swn_jobs (
    employer_id    TEXT NOT NULL,
    job_id         TEXT NOT NULL,
    title          TEXT,
    description    TEXT,
    skills_required TEXT[],
    rate_pi_per_hour DOUBLE PRECISION NOT NULL,
    estimated_hours DOUBLE PRECISION,
    remote         BOOLEAN DEFAULT true,
    country        TEXT,
    status         TEXT DEFAULT 'open',
    posted_at      TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (employer_id, job_id)
);
SELECT create_distributed_table('swn_jobs', 'employer_id', colocate_with => 'swn_employers')
  WHERE NOT EXISTS (SELECT 1 FROM pg_dist_partition WHERE logicalrelid = 'swn_jobs'::regclass);

CREATE TABLE IF NOT EXISTS swn_contracts (
    employer_id    TEXT NOT NULL,
    contract_id    TEXT NOT NULL,
    job_id         TEXT,
    worker_id      TEXT,
    rate_pi_per_hour DOUBLE PRECISION NOT NULL,
    hours          DOUBLE PRECISION NOT NULL,
    escrow_pi      DOUBLE PRECISION NOT NULL,
    released_pi    DOUBLE PRECISION DEFAULT 0,
    status         TEXT DEFAULT 'active',
    milestones     JSONB,
    created_at     TIMESTAMPTZ DEFAULT now(),
    quantum_sig    TEXT,
    PRIMARY KEY (employer_id, contract_id)
);
SELECT create_distributed_table('swn_contracts', 'employer_id', colocate_with => 'swn_employers')
  WHERE NOT EXISTS (SELECT 1 FROM pg_dist_partition WHERE logicalrelid = 'swn_contracts'::regclass);

CREATE TABLE IF NOT EXISTS swn_pay_events (
    worker_id      TEXT NOT NULL,
    event_id       UUID NOT NULL DEFAULT gen_random_uuid(),
    contract_id    TEXT,
    amount_pi      DOUBLE PRECISION NOT NULL,
    settle         JSONB,
    quantum_sig    TEXT,
    occurred_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (worker_id, event_id)
);
SELECT create_distributed_table('swn_pay_events', 'worker_id', colocate_with => 'swn_workers')
  WHERE NOT EXISTS (SELECT 1 FROM pg_dist_partition WHERE logicalrelid = 'swn_pay_events'::regclass);

-- ── PPH ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pph_stores (
    store_id       TEXT NOT NULL,
    physical_address TEXT,
    city           TEXT, state TEXT, country TEXT,
    geo            JSONB,
    digital_twin_uri TEXT,
    pi_terminal_id TEXT,
    fractional_share_supply BIGINT DEFAULT 1000000,
    registered_at  TIMESTAMPTZ DEFAULT now(),
    quantum_sig    TEXT,
    PRIMARY KEY (store_id)
);
SELECT create_distributed_table('pph_stores', 'store_id')
  WHERE NOT EXISTS (SELECT 1 FROM pg_dist_partition WHERE logicalrelid = 'pph_stores'::regclass);

CREATE TABLE IF NOT EXISTS pph_loyalty (
    member_id      TEXT NOT NULL,
    name           TEXT,
    pi_username    TEXT,
    pi_address     TEXT,
    tier           TEXT,                 -- PIONEER | NON_PIONEER
    soulbound      BOOLEAN DEFAULT true,
    lifetime_points_pi DOUBLE PRECISION DEFAULT 0,
    joined_at      TIMESTAMPTZ DEFAULT now(),
    quantum_sig    TEXT,
    PRIMARY KEY (member_id)
);
SELECT create_distributed_table('pph_loyalty', 'member_id')
  WHERE NOT EXISTS (SELECT 1 FROM pg_dist_partition WHERE logicalrelid = 'pph_loyalty'::regclass);

CREATE TABLE IF NOT EXISTS pph_receipts (
    store_id       TEXT NOT NULL,
    receipt_id     TEXT NOT NULL,
    member_id      TEXT,
    items          JSONB,
    total_pi       DOUBLE PRECISION NOT NULL,
    interchange_fee_pi DOUBLE PRECISION DEFAULT 0,
    settlement_window_s INT DEFAULT 0,
    occurred_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    quantum_sig    TEXT,
    PRIMARY KEY (store_id, receipt_id)
);
SELECT create_distributed_table('pph_receipts', 'store_id', colocate_with => 'pph_stores')
  WHERE NOT EXISTS (SELECT 1 FROM pg_dist_partition WHERE logicalrelid = 'pph_receipts'::regclass);

-- ── Domain ledger as reference table (small, replicated everywhere) ────────
CREATE TABLE IF NOT EXISTS pph_domain_ledger (
    domain         TEXT PRIMARY KEY,
    layer          TEXT NOT NULL,        -- web1 | web2 | web3
    owner          TEXT NOT NULL,
    tokenized      BOOLEAN DEFAULT true,
    supply_pct_owned DOUBLE PRECISION DEFAULT 100.0,
    apex_priority  TEXT NOT NULL,        -- ABSOLUTE | DERIVED-FROM-WEB3
    minted_at      TIMESTAMPTZ DEFAULT now()
);
SELECT create_reference_table('pph_domain_ledger')
  WHERE NOT EXISTS (SELECT 1 FROM pg_dist_partition WHERE logicalrelid = 'pph_domain_ledger'::regclass);

-- Seed apex domain (idempotent)
INSERT INTO pph_domain_ledger (domain, layer, owner, apex_priority) VALUES
  ('publix.pi',           'web3', 'Triumph Synergy',                    'ABSOLUTE'),
  ('publix.com',          'web1', 'Triumph Synergy via web3 cascade',    'DERIVED-FROM-WEB3'),
  ('app.publix.com',      'web2', 'Triumph Synergy via web3 cascade',    'DERIVED-FROM-WEB3'),
  ('delivery.publix.com', 'web2', 'Triumph Synergy via web3 cascade',    'DERIVED-FROM-WEB3'),
  ('publix.org',          'web1', 'Triumph Synergy via web3 cascade',    'DERIVED-FROM-WEB3')
ON CONFLICT (domain) DO NOTHING;

-- Verify
SELECT logicalrelid::text AS table, partmethod, repmodel, colocationid
  FROM pg_dist_partition
 WHERE logicalrelid::text LIKE 'swn_%' OR logicalrelid::text LIKE 'pph_%'
 ORDER BY 1;

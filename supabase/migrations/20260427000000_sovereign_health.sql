-- ============================================================
-- Supabase Migration: 20260427000000_sovereign_health
-- Triumph Synergy — Sovereign Health & Hospital Platform
-- SCHA · SNCA · SMWA · SNPA · SHWA
-- Domains: shands.pi · ufhealth.pi
-- APEX-QUANTUM-SOVEREIGN · ML-DSA-87 · ML-KEM-1024 · SHAKE-256 + SHA3-512
-- ============================================================

-- ── ENUMs ─────────────────────────────────────────────────────────────────────

CREATE TYPE scha_coverage_type AS ENUM (
  'pioneer-full', 'pioneer-worker', 'contractor',
  'employer', 'non-pioneer', 'nursing-resident'
);

CREATE TYPE scha_enrollment_status AS ENUM (
  'active', 'suspended', 'expired', 'transferred', 'pending'
);

CREATE TYPE snca_resident_status AS ENUM (
  'active', 'transitional', 'respite', 'hospice', 'discharged'
);

CREATE TYPE snca_worker_type AS ENUM (
  'rn', 'lpn', 'cna', 'aide', 'therapist', 'contractor',
  'administrator', 'dietary', 'housekeeping', 'social-worker'
);

CREATE TYPE smwa_birth_status AS ENUM (
  'booked', 'in-progress', 'completed', 'transferred', 'cancelled'
);

CREATE TYPE smwa_birth_location AS ENUM (
  'smwa-birth-center', 'home', 'mobile-unit', 'partner-facility'
);

CREATE TYPE snpa_tier AS ENUM (
  'essential', 'premium', 'apex-sovereign'
);

CREATE TYPE snpa_subscription_status AS ENUM (
  'active', 'paused', 'cancelled', 'gifted'
);

CREATE TYPE shwa_employment_type AS ENUM (
  'pioneer-worker', 'contractor', 'gig', 'employer', 'self-employed', 'unemployed'
);

-- ── Helper: immutable timestamp addition ──────────────────────────────────────
-- Used by SNCA resident check-in periods and SMWA postnatal coverage
CREATE OR REPLACE FUNCTION sh_add_months(base_ts TIMESTAMPTZ, months INT)
  RETURNS TIMESTAMPTZ
  LANGUAGE SQL IMMUTABLE STRICT
AS $$
  SELECT base_ts + make_interval(months => months)
$$;

CREATE OR REPLACE FUNCTION sh_add_days(base_ts TIMESTAMPTZ, days INT)
  RETURNS TIMESTAMPTZ
  LANGUAGE SQL IMMUTABLE STRICT
AS $$
  SELECT base_ts + make_interval(days => days)
$$;

-- ── Table: scha_enrollments (SCHA — Medicare/Medicaid rival) ──────────────────
-- Every Pi-KYC verified member enrolled in the Sovereign Care & Hospital Auth.

CREATE TABLE IF NOT EXISTS scha_enrollments (
  id                    UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  pi_uid                TEXT              NOT NULL UNIQUE,
  pi_wallet             TEXT              NOT NULL,
  display_name          TEXT              NOT NULL,
  pi_health_number      TEXT              NOT NULL UNIQUE,    -- PIHN-XXXXXXXXXX
  coverage_type         scha_coverage_type NOT NULL DEFAULT 'pioneer-full',
  status                scha_enrollment_status NOT NULL DEFAULT 'active',
  dependents_count      INTEGER           NOT NULL DEFAULT 0 CHECK (dependents_count >= 0),
  employer_pi_uid       TEXT,
  monthly_pi_cost       NUMERIC(18, 8)    NOT NULL DEFAULT 0.01,
  pi_usd_rate_at_enroll NUMERIC(18, 4)    NOT NULL DEFAULT 314.159,
  domain_anchor         TEXT              NOT NULL DEFAULT 'shands.pi · ufhealth.pi',
  active_loopholes      TEXT[]            NOT NULL DEFAULT '{}',
  medical_debt_jubilee  BOOLEAN           NOT NULL DEFAULT TRUE,
  quantum_signature     TEXT              NOT NULL,
  enrolled_at           TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  expires_at            TIMESTAMPTZ       NOT NULL GENERATED ALWAYS AS (sh_add_months(enrolled_at, 12)) STORED,
  updated_at            TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);

ALTER TABLE scha_enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scha_owner_select" ON scha_enrollments
  FOR SELECT USING (pi_uid = (current_setting('app.current_user_pi_uid', TRUE))::TEXT);

CREATE POLICY "scha_owner_insert" ON scha_enrollments
  FOR INSERT WITH CHECK (pi_uid = (current_setting('app.current_user_pi_uid', TRUE))::TEXT);

CREATE INDEX idx_scha_pi_uid       ON scha_enrollments (pi_uid);
CREATE INDEX idx_scha_status       ON scha_enrollments (status);
CREATE INDEX idx_scha_coverage     ON scha_enrollments (coverage_type);
CREATE INDEX idx_scha_expires      ON scha_enrollments (expires_at);
CREATE INDEX idx_scha_employer     ON scha_enrollments (employer_pi_uid) WHERE employer_pi_uid IS NOT NULL;

-- ── Table: snca_residents (SNCA — CMS Nursing Home rival) ─────────────────────
-- Nursing home residents enrolled in Sovereign Nursing & Care Authority.

CREATE TABLE IF NOT EXISTS snca_residents (
  id                    UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  pi_uid                TEXT              NOT NULL UNIQUE,
  pi_wallet             TEXT              NOT NULL,
  display_name          TEXT              NOT NULL,
  pi_health_number      TEXT              NOT NULL UNIQUE,
  facility_id           TEXT,                                  -- SNCA facility reference
  status                snca_resident_status NOT NULL DEFAULT 'active',
  monthly_pi_cost       NUMERIC(18, 8)    NOT NULL DEFAULT 0.05,
  usd_equivalent        NUMERIC(18, 2)    NOT NULL GENERATED ALWAYS AS (monthly_pi_cost * 314.159) STORED,
  savings_vs_traditional NUMERIC(18, 2)   NOT NULL DEFAULT 8984.00,  -- $9,034 - 0.05π×$314.159
  medicaid_spend_down_avoided BOOLEAN     NOT NULL DEFAULT TRUE,
  care_debt_jubilee     BOOLEAN           NOT NULL DEFAULT TRUE,
  blockchain_care_log   BOOLEAN           NOT NULL DEFAULT TRUE,
  quantum_signature     TEXT              NOT NULL,
  admitted_at           TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);

ALTER TABLE snca_residents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "snca_owner_select" ON snca_residents
  FOR SELECT USING (pi_uid = (current_setting('app.current_user_pi_uid', TRUE))::TEXT);

CREATE POLICY "snca_owner_insert" ON snca_residents
  FOR INSERT WITH CHECK (pi_uid = (current_setting('app.current_user_pi_uid', TRUE))::TEXT);

CREATE INDEX idx_snca_pi_uid     ON snca_residents (pi_uid);
CREATE INDEX idx_snca_status     ON snca_residents (status);
CREATE INDEX idx_snca_facility   ON snca_residents (facility_id) WHERE facility_id IS NOT NULL;

-- ── Table: snca_workers (SNCA — nursing home workers, contractors, employees) ──

CREATE TABLE IF NOT EXISTS snca_workers (
  id                    UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  pi_uid                TEXT              NOT NULL UNIQUE,
  pi_wallet             TEXT              NOT NULL,
  display_name          TEXT              NOT NULL,
  worker_type           snca_worker_type  NOT NULL,
  facility_id           TEXT,
  hourly_pi_wage        NUMERIC(18, 8)    NOT NULL DEFAULT 0.001,
  pi_treasury_backed    BOOLEAN           NOT NULL DEFAULT TRUE,
  cobra_eliminated      BOOLEAN           NOT NULL DEFAULT TRUE,
  pi_employment_code    TEXT              NOT NULL DEFAULT 'SNCA-SOVEREIGN-v1',
  active_benefits       TEXT[]            NOT NULL DEFAULT '{}',
  quantum_signature     TEXT              NOT NULL,
  hired_at              TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);

ALTER TABLE snca_workers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "snca_worker_owner_select" ON snca_workers
  FOR SELECT USING (pi_uid = (current_setting('app.current_user_pi_uid', TRUE))::TEXT);

CREATE POLICY "snca_worker_owner_insert" ON snca_workers
  FOR INSERT WITH CHECK (pi_uid = (current_setting('app.current_user_pi_uid', TRUE))::TEXT);

CREATE INDEX idx_snca_worker_pi_uid   ON snca_workers (pi_uid);
CREATE INDEX idx_snca_worker_type     ON snca_workers (worker_type);
CREATE INDEX idx_snca_worker_facility ON snca_workers (facility_id) WHERE facility_id IS NOT NULL;

-- ── Table: smwa_births (SMWA — midwife birth registry) ────────────────────────

CREATE TABLE IF NOT EXISTS smwa_births (
  id                        UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id                TEXT              NOT NULL UNIQUE,  -- SMWA-BIRTH-XXXXXXXX
  parent_pi_uid             TEXT              NOT NULL,
  parent_pi_wallet          TEXT              NOT NULL,
  parent_name               TEXT              NOT NULL,
  midwife_id                TEXT,
  expected_date             DATE              NOT NULL,
  actual_birth_date         DATE,
  birth_location            smwa_birth_location NOT NULL DEFAULT 'smwa-birth-center',
  status                    smwa_birth_status   NOT NULL DEFAULT 'booked',
  cost_pi                   NUMERIC(18, 8)    NOT NULL DEFAULT 0.01,
  cost_usd_equivalent       NUMERIC(18, 2)    NOT NULL DEFAULT 3200.00,
  hospital_savings_usd      NUMERIC(18, 2)    NOT NULL DEFAULT 9800.00, -- $13,000 - $3,200
  c_section_performed       BOOLEAN,
  birth_grant_issued        BOOLEAN           NOT NULL DEFAULT FALSE,
  newborn_name              TEXT,
  newborn_wallet_address    TEXT,
  inheritance_pi_amount     NUMERIC(18, 8)    NOT NULL DEFAULT 1.0,
  postnatal_months_covered  INTEGER           NOT NULL DEFAULT 12 CHECK (postnatal_months_covered BETWEEN 1 AND 24),
  postnatal_expires_at      TIMESTAMPTZ GENERATED ALWAYS AS (
    CASE
      WHEN actual_birth_date IS NOT NULL
        THEN sh_add_months(actual_birth_date::TIMESTAMPTZ, postnatal_months_covered)
      ELSE NULL
    END
  ) STORED,
  quantum_signature         TEXT              NOT NULL,
  booked_at                 TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);

ALTER TABLE smwa_births ENABLE ROW LEVEL SECURITY;

CREATE POLICY "smwa_parent_select" ON smwa_births
  FOR SELECT USING (parent_pi_uid = (current_setting('app.current_user_pi_uid', TRUE))::TEXT);

CREATE POLICY "smwa_parent_insert" ON smwa_births
  FOR INSERT WITH CHECK (parent_pi_uid = (current_setting('app.current_user_pi_uid', TRUE))::TEXT);

CREATE INDEX idx_smwa_parent_pi_uid ON smwa_births (parent_pi_uid);
CREATE INDEX idx_smwa_status        ON smwa_births (status);
CREATE INDEX idx_smwa_midwife       ON smwa_births (midwife_id) WHERE midwife_id IS NOT NULL;
CREATE INDEX idx_smwa_expected_date ON smwa_births (expected_date);

-- ── Table: smwa_midwives (SMWA — credentialed midwife registry) ───────────────

CREATE TABLE IF NOT EXISTS smwa_midwives (
  id                    UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  midwife_id            TEXT              NOT NULL UNIQUE,  -- SMWA-MW-XXXXXXXX
  pi_uid                TEXT              NOT NULL UNIQUE,
  pi_wallet             TEXT              NOT NULL,
  display_name          TEXT              NOT NULL,
  credential_type       TEXT              NOT NULL,        -- CNM | CPM | LM | SNPA-Certified
  jurisdiction          TEXT              NOT NULL DEFAULT 'Sovereign Pi Territory',
  years_experience      INTEGER           NOT NULL DEFAULT 0 CHECK (years_experience >= 0),
  state_license_required BOOLEAN          NOT NULL DEFAULT FALSE,
  pi_credential_status  TEXT              NOT NULL DEFAULT 'active',
  total_births          INTEGER           NOT NULL DEFAULT 0,
  quantum_signature     TEXT              NOT NULL,
  credentialed_at       TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);

ALTER TABLE smwa_midwives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "smwa_midwife_owner_select" ON smwa_midwives
  FOR SELECT USING (pi_uid = (current_setting('app.current_user_pi_uid', TRUE))::TEXT);

CREATE POLICY "smwa_midwife_owner_insert" ON smwa_midwives
  FOR INSERT WITH CHECK (pi_uid = (current_setting('app.current_user_pi_uid', TRUE))::TEXT);

CREATE INDEX idx_smwa_midwife_pi_uid     ON smwa_midwives (pi_uid);
CREATE INDEX idx_smwa_midwife_credential ON smwa_midwives (pi_credential_status);

-- ── Table: snpa_subscriptions (SNPA — nutrition program subscriptions) ────────

CREATE TABLE IF NOT EXISTS snpa_subscriptions (
  id                    UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id       TEXT              NOT NULL UNIQUE,    -- SNPA-SUB-XXXXXXXX
  pi_uid                TEXT              NOT NULL,
  pi_wallet             TEXT              NOT NULL,
  display_name          TEXT              NOT NULL,
  tier                  snpa_tier         NOT NULL DEFAULT 'essential',
  pi_per_month          NUMERIC(18, 8)    NOT NULL DEFAULT 0.01,
  usd_equivalent        NUMERIC(18, 2)    NOT NULL GENERATED ALWAYS AS (pi_per_month * 314.159) STORED,
  income_test_applied   BOOLEAN           NOT NULL DEFAULT FALSE,
  wic_replacement       BOOLEAN           NOT NULL DEFAULT TRUE,
  snap_replacement      BOOLEAN           NOT NULL DEFAULT TRUE,
  blockchain_provenance BOOLEAN           NOT NULL DEFAULT TRUE,
  status                snpa_subscription_status NOT NULL DEFAULT 'active',
  subscribed_at         TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  renews_at             TIMESTAMPTZ       NOT NULL GENERATED ALWAYS AS (sh_add_months(subscribed_at, 1)) STORED,
  updated_at            TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);

ALTER TABLE snpa_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "snpa_owner_select" ON snpa_subscriptions
  FOR SELECT USING (pi_uid = (current_setting('app.current_user_pi_uid', TRUE))::TEXT);

CREATE POLICY "snpa_owner_insert" ON snpa_subscriptions
  FOR INSERT WITH CHECK (pi_uid = (current_setting('app.current_user_pi_uid', TRUE))::TEXT);

CREATE INDEX idx_snpa_pi_uid  ON snpa_subscriptions (pi_uid);
CREATE INDEX idx_snpa_tier    ON snpa_subscriptions (tier);
CREATE INDEX idx_snpa_status  ON snpa_subscriptions (status);
CREATE INDEX idx_snpa_renews  ON snpa_subscriptions (renews_at);

-- ── Table: snpa_maternity_credits (SNPA — WIC replacement) ───────────────────

CREATE TABLE IF NOT EXISTS snpa_maternity_credits (
  id                    UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_id             TEXT              NOT NULL UNIQUE,    -- SNPA-MAT-XXXXXXXX
  pi_uid                TEXT              NOT NULL,
  pi_wallet             TEXT              NOT NULL,
  display_name          TEXT              NOT NULL,
  expected_due_date     DATE              NOT NULL,
  credit_months         INTEGER           NOT NULL DEFAULT 18 CHECK (credit_months BETWEEN 6 AND 24),
  total_pi_credit       NUMERIC(18, 8)    NOT NULL,
  usd_equivalent        NUMERIC(18, 2)    NOT NULL GENERATED ALWAYS AS (total_pi_credit * 314.159) STORED,
  income_test_applied   BOOLEAN           NOT NULL DEFAULT FALSE,
  wic_replacement       BOOLEAN           NOT NULL DEFAULT TRUE,
  issued_at             TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  expires_at            TIMESTAMPTZ       NOT NULL GENERATED ALWAYS AS (sh_add_months(issued_at, credit_months)) STORED
);

ALTER TABLE snpa_maternity_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "snpa_mat_owner_select" ON snpa_maternity_credits
  FOR SELECT USING (pi_uid = (current_setting('app.current_user_pi_uid', TRUE))::TEXT);

CREATE POLICY "snpa_mat_owner_insert" ON snpa_maternity_credits
  FOR INSERT WITH CHECK (pi_uid = (current_setting('app.current_user_pi_uid', TRUE))::TEXT);

CREATE INDEX idx_snpa_mat_pi_uid  ON snpa_maternity_credits (pi_uid);
CREATE INDEX idx_snpa_mat_expires ON snpa_maternity_credits (expires_at);

-- ── Table: snpa_suppliers (SNPA — certified organic Pi supplier network) ───────

CREATE TABLE IF NOT EXISTS snpa_suppliers (
  id                    UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id           TEXT              NOT NULL UNIQUE,    -- SNPA-SUP-XXXXXXXX
  supplier_name         TEXT              NOT NULL,
  country               TEXT              NOT NULL,
  pi_wallet             TEXT              NOT NULL,
  certification_level   TEXT              NOT NULL DEFAULT 'SNPA-Standard',
  exceeds_usda_organic  BOOLEAN           NOT NULL DEFAULT TRUE,
  blockchain_provenance BOOLEAN           NOT NULL DEFAULT TRUE,
  provenance_records    INTEGER           NOT NULL DEFAULT 0,
  pi_anchor             TEXT              NOT NULL DEFAULT 'shands.pi · ufhealth.pi',
  status                TEXT              NOT NULL DEFAULT 'certified',
  certified_at          TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);

ALTER TABLE snpa_suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "snpa_supplier_public_select" ON snpa_suppliers
  FOR SELECT USING (TRUE);

CREATE INDEX idx_snpa_supplier_country ON snpa_suppliers (country);
CREATE INDEX idx_snpa_supplier_status  ON snpa_suppliers (status);

-- ── Table: shwa_coverage (SHWA — workforce health coverage) ───────────────────
-- Covers workers, contractors, gig workers, employers, self-employed, unemployed.

CREATE TABLE IF NOT EXISTS shwa_coverage (
  id                      UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  pi_uid                  TEXT              NOT NULL UNIQUE,
  pi_wallet               TEXT              NOT NULL,
  display_name            TEXT              NOT NULL,
  pi_health_number        TEXT              NOT NULL UNIQUE,    -- PIHN-XXXXXXXXXX
  employment_type         shwa_employment_type NOT NULL DEFAULT 'pioneer-worker',
  employer_pi_uid         TEXT,
  pi_coverage_amount      TEXT              NOT NULL DEFAULT 'Unlimited via Pi Treasury',
  monthly_pi_cost         NUMERIC(18, 8)    NOT NULL DEFAULT 0.005,
  cobra_eliminated        BOOLEAN           NOT NULL DEFAULT TRUE,
  pre_existing_excluded   BOOLEAN           NOT NULL DEFAULT FALSE,
  aca_mandate_satisfied   BOOLEAN           NOT NULL DEFAULT TRUE,
  gig_worker_parity       BOOLEAN           NOT NULL DEFAULT TRUE,
  hsa_equivalent_active   BOOLEAN           NOT NULL DEFAULT TRUE,
  active_loopholes        TEXT[]            NOT NULL DEFAULT '{}',
  quantum_signature       TEXT              NOT NULL,
  enrolled_at             TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  expires_at              TIMESTAMPTZ       NOT NULL GENERATED ALWAYS AS (sh_add_months(enrolled_at, 12)) STORED,
  updated_at              TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);

ALTER TABLE shwa_coverage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shwa_owner_select" ON shwa_coverage
  FOR SELECT USING (pi_uid = (current_setting('app.current_user_pi_uid', TRUE))::TEXT);

CREATE POLICY "shwa_owner_insert" ON shwa_coverage
  FOR INSERT WITH CHECK (pi_uid = (current_setting('app.current_user_pi_uid', TRUE))::TEXT);

CREATE INDEX idx_shwa_pi_uid       ON shwa_coverage (pi_uid);
CREATE INDEX idx_shwa_employment   ON shwa_coverage (employment_type);
CREATE INDEX idx_shwa_employer     ON shwa_coverage (employer_pi_uid) WHERE employer_pi_uid IS NOT NULL;
CREATE INDEX idx_shwa_expires      ON shwa_coverage (expires_at);

-- ── Comments ──────────────────────────────────────────────────────────────────

COMMENT ON TABLE scha_enrollments IS
  'SCHA — Sovereign Care & Hospital Authority. Pi-powered replacement for Medicare/Medicaid. '
  'Anchored to shands.pi + ufhealth.pi. Instant enrollment, zero denials, NESARA debt jubilee.';

COMMENT ON TABLE snca_residents IS
  'SNCA — Sovereign Nursing & Care Authority residents. Pi-sovereign care at 0.05π/mo '
  'vs $9,034/mo traditional nursing home. Medicaid spend-down eliminated.';

COMMENT ON TABLE snca_workers IS
  'SNCA — Nursing home workers and contractors under Pi Sovereign Employment Code. '
  'Pi Treasury backed wages — zero payroll default risk.';

COMMENT ON TABLE smwa_births IS
  'SMWA — Sovereign Midwife & Wellness Authority birth registry. '
  'Every birth creates a newborn Pi inheritance wallet. 12-month postnatal coverage.';

COMMENT ON TABLE smwa_midwives IS
  'SMWA — Pi-credentialed midwife registry. State licensing barriers nullified '
  'by Pi KYC biometric credentials under the SMWA sovereign charter.';

COMMENT ON TABLE snpa_subscriptions IS
  'SNPA — Sovereign Nutrition & Prevention Authority subscriptions. '
  'Organic, biodynamic, quantum-verified nutrition. No income test. WIC/SNAP replacement.';

COMMENT ON TABLE snpa_maternity_credits IS
  'SNPA — Pi maternity nutrition credits replacing WIC. No income test. '
  'Pioneer mothers receive full credit regardless of income.';

COMMENT ON TABLE snpa_suppliers IS
  'SNPA — Certified organic Pi supplier network. All provenance records on Pi blockchain. '
  'Exceeds USDA Organic: regenerative + biodynamic + quantum-verified.';

COMMENT ON TABLE shwa_coverage IS
  'SHWA — Sovereign Health Workforce Authority. Covers workers, contractors, gig workers, '
  'employers, and non-Pioneers. Pi-portable — never employer-tied. COBRA eliminated.';

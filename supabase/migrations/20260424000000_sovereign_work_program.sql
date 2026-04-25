-- ============================================================================
-- Triumph Synergy — Sovereign Work Program Schema
-- Migration: 20260424000000_sovereign_work_program.sql
-- ============================================================================

-- Participant classes
CREATE TYPE swp_participant_class AS ENUM (
  'employer',
  'employee',
  'inmate-work-release',
  'inmate-facility',
  'doc-admin',
  'sovereign-admin'
);

CREATE TYPE swp_status AS ENUM (
  'active',
  'suspended',
  'completed',
  'pending-approval',
  'revoked'
);

CREATE TYPE swp_clearance AS ENUM (
  'standard',
  'elevated',
  'work-release',
  'sovereign'
);

CREATE TYPE swp_task_status AS ENUM (
  'open',
  'assigned',
  'in-progress',
  'submitted',
  'verified',
  'paid',
  'disputed',
  'cancelled'
);

CREATE TYPE swp_earnings_destination AS ENUM (
  'pi-wallet',
  'commissary',
  'sovereign-hold',
  'family-transfer',
  'split'
);

CREATE TYPE swp_facility_type AS ENUM (
  'county-jail',
  'state-prison',
  'federal-prison',
  'immigration-detention',
  'juvenile-facility',
  'work-release-center',
  'halfway-house',
  'community-corrections'
);

-- ── DOC Facilities ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS swp_facilities (
  id                    TEXT PRIMARY KEY,
  facility_id           TEXT NOT NULL UNIQUE,
  facility_name         TEXT NOT NULL,
  facility_type         swp_facility_type NOT NULL,
  jurisdiction          TEXT NOT NULL,
  country               TEXT NOT NULL,
  program_name          TEXT NOT NULL,
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  sovereign_tier        TEXT NOT NULL DEFAULT 'apex',
  daily_earn_cap_pi     NUMERIC(18, 6) NOT NULL DEFAULT 50,
  commissary_cap_pi     NUMERIC(18, 6) NOT NULL DEFAULT 200,
  hold_cap_pi           NUMERIC(18, 6) NOT NULL DEFAULT 10000,
  enrolled_participants INTEGER NOT NULL DEFAULT 0,
  active_participants   INTEGER NOT NULL DEFAULT 0,
  total_pi_distributed  NUMERIC(18, 6) NOT NULL DEFAULT 0,
  total_tasks_completed INTEGER NOT NULL DEFAULT 0,
  average_completion_rate NUMERIC(5, 4) NOT NULL DEFAULT 0,
  doc_admin_ids         TEXT[] NOT NULL DEFAULT '{}',
  sovereign_admin_id    TEXT NOT NULL,
  external_system_id    TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Participants ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS swp_participants (
  id                  TEXT PRIMARY KEY,
  pi_uid              TEXT NOT NULL UNIQUE,
  pi_wallet           TEXT NOT NULL,
  participant_class   swp_participant_class NOT NULL,
  status              swp_status NOT NULL DEFAULT 'pending-approval',
  clearance_level     swp_clearance NOT NULL DEFAULT 'standard',
  sovereign_id        TEXT,
  display_name        TEXT NOT NULL,
  jurisdiction        TEXT NOT NULL,
  enrollment_date     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- DOC profile (inmate participants only)
  doc_facility_id     TEXT REFERENCES swp_facilities(facility_id),
  doc_facility_name   TEXT,
  doc_facility_type   swp_facility_type,
  doc_jurisdiction    TEXT,
  doc_inmate_id       TEXT,
  doc_enrollment_date TIMESTAMPTZ,
  doc_projected_release TIMESTAMPTZ,
  doc_work_release_eligible BOOLEAN DEFAULT FALSE,
  doc_work_release_approved_date TIMESTAMPTZ,
  doc_supervisor_id   TEXT,
  doc_commissary_account_id TEXT,
  doc_hold_account_id TEXT,
  doc_behavioral_score SMALLINT DEFAULT 0 CHECK (doc_behavioral_score BETWEEN 0 AND 100),
  doc_task_completion_rate NUMERIC(5, 4) DEFAULT 0,

  -- Employer profile
  employer_org_id     TEXT,
  employer_org_name   TEXT,
  employer_org_type   TEXT,
  employer_verified_at TIMESTAMPTZ,
  employer_rating     NUMERIC(3, 1) DEFAULT 5.0,

  -- Earnings
  total_earned_pi         NUMERIC(18, 6) NOT NULL DEFAULT 0,
  pending_pi              NUMERIC(18, 6) NOT NULL DEFAULT 0,
  disbursed_pi            NUMERIC(18, 6) NOT NULL DEFAULT 0,
  commissary_balance_pi   NUMERIC(18, 6) NOT NULL DEFAULT 0,
  hold_balance_pi         NUMERIC(18, 6) NOT NULL DEFAULT 0,
  family_transferred_pi   NUMERIC(18, 6) NOT NULL DEFAULT 0,
  lifetime_tasks_completed INTEGER NOT NULL DEFAULT 0,
  current_streak_days     INTEGER NOT NULL DEFAULT 0,
  last_earn_date          TIMESTAMPTZ,

  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS swp_participants_class_idx        ON swp_participants(participant_class);
CREATE INDEX IF NOT EXISTS swp_participants_status_idx       ON swp_participants(status);
CREATE INDEX IF NOT EXISTS swp_participants_jurisdiction_idx ON swp_participants(jurisdiction);
CREATE INDEX IF NOT EXISTS swp_participants_facility_idx     ON swp_participants(doc_facility_id);

-- ── Work Tasks ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS swp_tasks (
  id                          TEXT PRIMARY KEY,
  program_id                  TEXT NOT NULL,
  employer_id                 TEXT NOT NULL REFERENCES swp_participants(id),
  title                       TEXT NOT NULL,
  description                 TEXT NOT NULL,
  category                    TEXT NOT NULL,
  status                      swp_task_status NOT NULL DEFAULT 'open',
  reward_pi                   NUMERIC(18, 6) NOT NULL,
  reward_usd                  NUMERIC(18, 6) NOT NULL,
  bonus_pi_on_streak          NUMERIC(18, 6),
  eligible_participant_classes swp_participant_class[] NOT NULL,
  required_clearance_level    swp_clearance NOT NULL DEFAULT 'standard',
  min_behavioral_score        SMALLINT,
  requires_doc_approval       BOOLEAN NOT NULL DEFAULT FALSE,
  is_remote                   BOOLEAN NOT NULL DEFAULT FALSE,
  facility_id                 TEXT REFERENCES swp_facilities(facility_id),
  location                    TEXT,
  estimated_hours             NUMERIC(5, 2) NOT NULL DEFAULT 1,
  deadline                    TIMESTAMPTZ,
  posted_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  assigned_to                 TEXT REFERENCES swp_participants(id),
  assigned_at                 TIMESTAMPTZ,
  submitted_at                TIMESTAMPTZ,
  verified_at                 TIMESTAMPTZ,
  verified_by                 TEXT,
  pi_payment_id               TEXT,
  paid_at                     TIMESTAMPTZ,
  tags                        TEXT[] NOT NULL DEFAULT '{}',
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS swp_tasks_status_idx    ON swp_tasks(status);
CREATE INDEX IF NOT EXISTS swp_tasks_category_idx  ON swp_tasks(category);
CREATE INDEX IF NOT EXISTS swp_tasks_facility_idx  ON swp_tasks(facility_id);
CREATE INDEX IF NOT EXISTS swp_tasks_employer_idx  ON swp_tasks(employer_id);
CREATE INDEX IF NOT EXISTS swp_tasks_assignee_idx  ON swp_tasks(assigned_to);

-- ── Commissary Accounts ───────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS swp_commissary_accounts (
  id                  TEXT PRIMARY KEY,
  inmate_id           TEXT NOT NULL REFERENCES swp_participants(id),
  facility_id         TEXT NOT NULL REFERENCES swp_facilities(facility_id),
  pi_balance          NUMERIC(18, 6) NOT NULL DEFAULT 0,
  usd_equivalent      NUMERIC(18, 6) NOT NULL DEFAULT 0,
  linked_pi_wallet    TEXT,
  last_updated        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS swp_commissary_transactions (
  id           TEXT PRIMARY KEY,
  account_id   TEXT NOT NULL REFERENCES swp_commissary_accounts(id),
  type         TEXT NOT NULL CHECK (type IN (
    'work-credit', 'commissary-spend', 'hold-transfer', 'release-transfer', 'admin-adjustment'
  )),
  amount_pi    NUMERIC(18, 6) NOT NULL,
  amount_usd   NUMERIC(18, 6) NOT NULL,
  task_id      TEXT REFERENCES swp_tasks(id),
  note         TEXT NOT NULL,
  timestamp    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS swp_commissary_tx_account_idx ON swp_commissary_transactions(account_id);
CREATE INDEX IF NOT EXISTS swp_commissary_tx_timestamp_idx ON swp_commissary_transactions(timestamp DESC);

-- ── Pi Disbursements ──────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS swp_disbursements (
  id                    TEXT PRIMARY KEY,
  task_id               TEXT NOT NULL REFERENCES swp_tasks(id),
  participant_id        TEXT NOT NULL REFERENCES swp_participants(id),
  pi_wallet             TEXT NOT NULL,
  total_amount_pi       NUMERIC(18, 6) NOT NULL,
  total_amount_usd      NUMERIC(18, 6) NOT NULL,
  status                TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing','completed','failed')),
  program_id            TEXT NOT NULL,
  pi_transaction_hash   TEXT,
  allocations           JSONB NOT NULL DEFAULT '[]',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at          TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS swp_disbursements_participant_idx ON swp_disbursements(participant_id);
CREATE INDEX IF NOT EXISTS swp_disbursements_status_idx      ON swp_disbursements(status);

-- ── Row Level Security ────────────────────────────────────────────────────────

ALTER TABLE swp_facilities              ENABLE ROW LEVEL SECURITY;
ALTER TABLE swp_participants            ENABLE ROW LEVEL SECURITY;
ALTER TABLE swp_tasks                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE swp_commissary_accounts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE swp_commissary_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE swp_disbursements           ENABLE ROW LEVEL SECURITY;

-- Public read for facilities and open tasks
CREATE POLICY "facilities_public_read"  ON swp_facilities  FOR SELECT USING (is_active = TRUE);
CREATE POLICY "tasks_public_read"       ON swp_tasks       FOR SELECT USING (status = 'open');

-- Participants can read own record
CREATE POLICY "participants_own_read"   ON swp_participants FOR SELECT USING (pi_uid = auth.uid()::TEXT);

-- Commissary: only the inmate and sovereign/doc-admin can read
CREATE POLICY "commissary_own_read" ON swp_commissary_accounts
  FOR SELECT USING (
    inmate_id IN (SELECT id FROM swp_participants WHERE pi_uid = auth.uid()::TEXT)
  );

-- ── Updated-at trigger ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION swp_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER swp_facilities_updated_at    BEFORE UPDATE ON swp_facilities    FOR EACH ROW EXECUTE FUNCTION swp_set_updated_at();
CREATE TRIGGER swp_participants_updated_at  BEFORE UPDATE ON swp_participants  FOR EACH ROW EXECUTE FUNCTION swp_set_updated_at();
CREATE TRIGGER swp_tasks_updated_at         BEFORE UPDATE ON swp_tasks         FOR EACH ROW EXECUTE FUNCTION swp_set_updated_at();

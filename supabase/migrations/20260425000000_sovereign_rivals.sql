-- ============================================================================
-- Triumph Synergy — Sovereign Rivals Schema
-- Migration: 20260425000000_sovereign_rivals.sql
-- Covers: SQTA (IRS rival) + SFPA (DCF rival) + SBCA (D&B rival)
-- ============================================================================

-- ── ENUMS ─────────────────────────────────────────────────────────────────────

CREATE TYPE sqta_filing_status AS ENUM (
  'sovereign-exempt',
  'minimized',
  'disputed',
  'pi-settled',
  'pending-review'
);

CREATE TYPE sfpa_case_status AS ENUM (
  'protected',
  'under-investigation',
  'challenged',
  'resolved',
  'escalated'
);

CREATE TYPE sbca_score_tier AS ENUM (
  'sovereign-elite',
  'apex',
  'established',
  'growing',
  'developing',
  'new-entrant',
  'needs-attention'
);

CREATE TYPE sbca_verification_status AS ENUM (
  'quantum-verified',
  'pi-verified',
  'pending',
  'disputed',
  'suspended'
);

-- ── SQTA: Sovereign Quantum Tax Authority (IRS Rival) ─────────────────────────

CREATE TABLE IF NOT EXISTS sqta_tax_profiles (
  id                            TEXT PRIMARY KEY,
  pi_uid                        TEXT NOT NULL UNIQUE,
  pi_wallet                     TEXT NOT NULL,
  display_name                  TEXT NOT NULL,
  sovereign_tax_id              TEXT NOT NULL UNIQUE,
  pi_universal_number           TEXT NOT NULL UNIQUE,   -- PIUN replaces SSN
  filing_status                 sqta_filing_status NOT NULL DEFAULT 'pending-review',
  tax_year                      SMALLINT NOT NULL,
  total_pi_income               NUMERIC(18, 6) NOT NULL DEFAULT 0,
  pi_as_property_basis          NUMERIC(18, 6) NOT NULL DEFAULT 0,
  total_fiat_equivalent_usd     NUMERIC(18, 6) NOT NULL DEFAULT 0,
  gross_liability_usd           NUMERIC(18, 6) NOT NULL DEFAULT 0,
  loophole_reduction_usd        NUMERIC(18, 6) NOT NULL DEFAULT 0,
  net_liability_usd             NUMERIC(18, 6) NOT NULL DEFAULT 0,
  net_liability_pi              NUMERIC(18, 6) NOT NULL DEFAULT 0,
  nesara_exemption_applied      BOOLEAN NOT NULL DEFAULT FALSE,
  eo14178_applied               BOOLEAN NOT NULL DEFAULT FALSE,
  genius_act_applied            BOOLEAN NOT NULL DEFAULT FALSE,
  pi_property_exemption_applied BOOLEAN NOT NULL DEFAULT FALSE,
  active_loopholes              TEXT[] NOT NULL DEFAULT '{}',
  filing_hash                   TEXT NOT NULL,
  quantum_signature             TEXT NOT NULL,
  dispute_letter                TEXT,
  created_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sqta_profiles_pi_uid_idx      ON sqta_tax_profiles(pi_uid);
CREATE INDEX IF NOT EXISTS sqta_profiles_status_idx      ON sqta_tax_profiles(filing_status);
CREATE INDEX IF NOT EXISTS sqta_profiles_tax_year_idx    ON sqta_tax_profiles(tax_year);

-- ── SFPA: Sovereign Family Protection Authority (DCF Rival) ──────────────────

CREATE TYPE sfpa_dcf_violation AS ENUM (
  'warrantless-entry',
  'due-process-failure',
  'false-report',
  'removal-without-evidence',
  'coercive-interview',
  'financial-incentive-bias',
  'icwa-violation',
  'brady-failure',
  'lack-of-reasonable-efforts',
  'excessive-supervision'
);

CREATE TABLE IF NOT EXISTS sfpa_family_records (
  id                        TEXT PRIMARY KEY,
  primary_parent_pi_uid     TEXT NOT NULL UNIQUE,
  primary_parent_wallet     TEXT NOT NULL,
  family_name               TEXT NOT NULL,
  jurisdiction              TEXT NOT NULL,
  case_status               sfpa_case_status NOT NULL DEFAULT 'protected',
  sovereign_family_id       TEXT NOT NULL UNIQUE,
  pi_chain_family_hash      TEXT NOT NULL,
  quantum_signature         TEXT NOT NULL,
  children_count            SMALLINT NOT NULL DEFAULT 1,
  document_vault_id         TEXT NOT NULL,
  active_violations         sfpa_dcf_violation[] NOT NULL DEFAULT '{}',
  applied_loopholes         TEXT[] NOT NULL DEFAULT '{}',
  constitutional_score      SMALLINT NOT NULL DEFAULT 97 CHECK (constitutional_score BETWEEN 0 AND 100),
  pi_stabilisation_fund_pi  NUMERIC(18, 6) NOT NULL DEFAULT 100,
  legal_rep_wallet          TEXT,
  emergency_contact_wallet  TEXT,
  auto_dismiss_eligible     BOOLEAN NOT NULL DEFAULT FALSE,
  recommended_actions       TEXT[] NOT NULL DEFAULT '{}',
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sfpa_records_pi_uid_idx       ON sfpa_family_records(primary_parent_pi_uid);
CREATE INDEX IF NOT EXISTS sfpa_records_status_idx       ON sfpa_family_records(case_status);
CREATE INDEX IF NOT EXISTS sfpa_records_jurisdiction_idx ON sfpa_family_records(jurisdiction);

CREATE TABLE IF NOT EXISTS sfpa_case_events (
  id                TEXT PRIMARY KEY,
  family_record_id  TEXT NOT NULL REFERENCES sfpa_family_records(id),
  event_type        TEXT NOT NULL CHECK (event_type IN (
    'registration', 'violation-reported', 'loophole-activated', 'motion-filed',
    'court-hearing', 'case-resolved', 'auto-dismiss', 'escalated', 'admin-note'
  )),
  description       TEXT NOT NULL,
  loopholes_cited   TEXT[] NOT NULL DEFAULT '{}',
  pi_action         TEXT,
  evidence_hash     TEXT,
  quantum_signature TEXT,
  timestamp         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sfpa_events_record_idx ON sfpa_case_events(family_record_id);
CREATE INDEX IF NOT EXISTS sfpa_events_type_idx   ON sfpa_case_events(event_type);

-- ── SBCA: Sovereign Business Credit Authority (D&B Rival) ────────────────────

CREATE TABLE IF NOT EXISTS sbca_business_profiles (
  id                        TEXT PRIMARY KEY,
  pi_uid                    TEXT NOT NULL,
  pi_wallet                 TEXT NOT NULL,
  business_name             TEXT NOT NULL,
  pi_universal_number       TEXT NOT NULL UNIQUE,   -- PIUN replaces DUNS
  legal_structure           TEXT NOT NULL,
  jurisdiction              TEXT NOT NULL,
  country                   TEXT NOT NULL,
  industry                  TEXT NOT NULL,
  year_established          SMALLINT NOT NULL,
  pi_business_score         SMALLINT NOT NULL DEFAULT 600 CHECK (pi_business_score BETWEEN 0 AND 850),
  score_tier                sbca_score_tier NOT NULL DEFAULT 'developing',
  verification_status       sbca_verification_status NOT NULL DEFAULT 'pending',
  trade_references          INTEGER NOT NULL DEFAULT 0,
  pi_payment_history        TEXT NOT NULL DEFAULT 'fair' CHECK (pi_payment_history IN ('excellent','good','fair','poor')),
  pi_trade_volume_pi        NUMERIC(18, 6) NOT NULL DEFAULT 0,
  pi_receivables_pi         NUMERIC(18, 6) NOT NULL DEFAULT 0,
  pi_payables_pi            NUMERIC(18, 6) NOT NULL DEFAULT 0,
  pi_credit_line_pi         NUMERIC(18, 6) NOT NULL DEFAULT 0,
  quantum_signature         TEXT NOT NULL,
  sovereign_business_id     TEXT NOT NULL UNIQUE,
  dnb_disputes_filed        INTEGER NOT NULL DEFAULT 0,
  dnb_inaccuracies_found    INTEGER NOT NULL DEFAULT 0,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sbca_profiles_pi_uid_idx     ON sbca_business_profiles(pi_uid);
CREATE INDEX IF NOT EXISTS sbca_profiles_piun_idx       ON sbca_business_profiles(pi_universal_number);
CREATE INDEX IF NOT EXISTS sbca_profiles_score_idx      ON sbca_business_profiles(pi_business_score DESC);
CREATE INDEX IF NOT EXISTS sbca_profiles_country_idx    ON sbca_business_profiles(country);
CREATE INDEX IF NOT EXISTS sbca_profiles_industry_idx   ON sbca_business_profiles(industry);

CREATE TABLE IF NOT EXISTS sbca_dnb_disputes (
  id                  TEXT PRIMARY KEY,
  business_profile_id TEXT NOT NULL REFERENCES sbca_business_profiles(id),
  inaccuracies        TEXT[] NOT NULL,
  dispute_letter      TEXT NOT NULL,
  loopholes_cited     TEXT[] NOT NULL DEFAULT '{}',
  status              TEXT NOT NULL DEFAULT 'filed' CHECK (status IN ('filed','pending','resolved','won','lost')),
  filed_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at         TIMESTAMPTZ,
  outcome             TEXT
);

CREATE INDEX IF NOT EXISTS sbca_disputes_profile_idx ON sbca_dnb_disputes(business_profile_id);
CREATE INDEX IF NOT EXISTS sbca_disputes_status_idx  ON sbca_dnb_disputes(status);

CREATE TABLE IF NOT EXISTS sbca_trade_references (
  id                   TEXT PRIMARY KEY,
  business_profile_id  TEXT NOT NULL REFERENCES sbca_business_profiles(id),
  partner_profile_id   TEXT REFERENCES sbca_business_profiles(id),
  pi_amount            NUMERIC(18, 6) NOT NULL,
  trade_type           TEXT NOT NULL CHECK (trade_type IN ('sale','purchase','service','lending','other')),
  payment_days         SMALLINT NOT NULL DEFAULT 0,
  on_time              BOOLEAN NOT NULL DEFAULT TRUE,
  pi_transaction_hash  TEXT,
  trade_date           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sbca_trade_refs_profile_idx ON sbca_trade_references(business_profile_id);

-- ── Row Level Security ────────────────────────────────────────────────────────

ALTER TABLE sqta_tax_profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE sfpa_family_records    ENABLE ROW LEVEL SECURITY;
ALTER TABLE sfpa_case_events       ENABLE ROW LEVEL SECURITY;
ALTER TABLE sbca_business_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sbca_dnb_disputes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE sbca_trade_references  ENABLE ROW LEVEL SECURITY;

-- Tax profiles — only owner can read their own filing
CREATE POLICY "sqta_own_read" ON sqta_tax_profiles
  FOR SELECT USING (pi_uid = auth.uid()::TEXT);

-- Family records — only primary parent can read
CREATE POLICY "sfpa_own_read" ON sfpa_family_records
  FOR SELECT USING (primary_parent_pi_uid = auth.uid()::TEXT);

-- Case events readable if family record is owned
CREATE POLICY "sfpa_events_own_read" ON sfpa_case_events
  FOR SELECT USING (
    family_record_id IN (
      SELECT id FROM sfpa_family_records
      WHERE primary_parent_pi_uid = auth.uid()::TEXT
    )
  );

-- Business profiles readable by owner
CREATE POLICY "sbca_own_read" ON sbca_business_profiles
  FOR SELECT USING (pi_uid = auth.uid()::TEXT);

-- Public can view basic business profile (score + PIUN) but not full details
CREATE POLICY "sbca_public_basic_read" ON sbca_business_profiles
  FOR SELECT USING (verification_status = 'quantum-verified');

-- ── Updated-at trigger ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION rivals_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER sqta_profiles_updated_at
  BEFORE UPDATE ON sqta_tax_profiles
  FOR EACH ROW EXECUTE FUNCTION rivals_set_updated_at();

CREATE TRIGGER sfpa_records_updated_at
  BEFORE UPDATE ON sfpa_family_records
  FOR EACH ROW EXECUTE FUNCTION rivals_set_updated_at();

CREATE TRIGGER sbca_profiles_updated_at
  BEFORE UPDATE ON sbca_business_profiles
  FOR EACH ROW EXECUTE FUNCTION rivals_set_updated_at();

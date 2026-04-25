-- ============================================================
-- Supabase Migration: 20260425010000_sovereign_housing
-- Triumph Synergy — Sovereign Housing Platform
-- SHA · SPHVP · SRLA · SAHE · SREX
-- APEX-QUANTUM-SOVEREIGN · ML-DSA-65 · ML-KEM-768 · SHAKE-256
-- ============================================================

-- ── ENUMs ─────────────────────────────────────────────────────────────────────

CREATE TYPE sha_application_status AS ENUM (
  'pending', 'approved', 'active', 'suspended', 'graduated'
);

CREATE TYPE sha_tenure_type AS ENUM (
  'freehold', 'allodial', 'pi-sovereign', 'leasehold', 'cooperative'
);

CREATE TYPE sha_property_type AS ENUM (
  'single-family', 'multi-family', 'condo', 'townhouse',
  'mobile-home', 'rural', 'commercial-residential', 'mixed-use'
);

CREATE TYPE srex_listing_status AS ENUM (
  'active', 'pending', 'closed', 'leased', 'withdrawn'
);

CREATE TYPE sphvp_voucher_status AS ENUM (
  'active', 'utilized', 'expired', 'transferred', 'revoked'
);

CREATE TYPE srla_loan_status AS ENUM (
  'pending', 'active', 'paid', 'defaulted', 'forgiven'
);

CREATE TYPE sahe_unit_type AS ENUM (
  'studio', '1br', '2br', '3br', '4br+', 'tiny-home',
  'manufactured', 'rural-cabin', 'cooperative-share'
);

-- ── Table: sha_housing_profiles (HUD rival) ──────────────────────────────────

CREATE TABLE IF NOT EXISTS sha_housing_profiles (
  id                        UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  pi_uid                    TEXT            NOT NULL UNIQUE,
  pi_wallet                 TEXT            NOT NULL,
  pi_universal_number       TEXT            NOT NULL UNIQUE,   -- PIUN-XXXXXXXX
  display_name              TEXT            NOT NULL,
  application_status        sha_application_status NOT NULL DEFAULT 'approved',
  tenure_type               sha_tenure_type        NOT NULL DEFAULT 'pi-sovereign',
  property_type             sha_property_type,
  jurisdiction              TEXT,
  monthly_pi_rent           NUMERIC(18, 8)  NOT NULL DEFAULT 0,
  pi_property_score         INTEGER         NOT NULL DEFAULT 750 CHECK (pi_property_score BETWEEN 0 AND 850),
  allodial_title_filed      BOOLEAN         NOT NULL DEFAULT FALSE,
  pi_stabilisation_grant_pi NUMERIC(18, 8)  NOT NULL DEFAULT 100,
  active_loopholes          TEXT[]          NOT NULL DEFAULT '{}',
  quantum_signature         TEXT            NOT NULL,
  blockchain_title_hash     TEXT,
  created_at                TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

ALTER TABLE sha_housing_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sha_owner_select" ON sha_housing_profiles
  FOR SELECT USING (pi_uid = (current_setting('app.current_user_pi_uid', TRUE))::TEXT);

CREATE POLICY "sha_owner_insert" ON sha_housing_profiles
  FOR INSERT WITH CHECK (pi_uid = (current_setting('app.current_user_pi_uid', TRUE))::TEXT);

CREATE INDEX idx_sha_pi_uid         ON sha_housing_profiles (pi_uid);
CREATE INDEX idx_sha_status         ON sha_housing_profiles (application_status);
CREATE INDEX idx_sha_tenure         ON sha_housing_profiles (tenure_type);
CREATE INDEX idx_sha_jurisdiction   ON sha_housing_profiles (jurisdiction);
CREATE INDEX idx_sha_property_type  ON sha_housing_profiles (property_type);
CREATE INDEX idx_sha_score          ON sha_housing_profiles (pi_property_score);

-- ── Table: sphvp_vouchers (Section 8 rival) ─────────────────────────────────

CREATE TABLE IF NOT EXISTS sphvp_vouchers (
  id                  UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  pi_uid              TEXT             NOT NULL,
  pi_wallet           TEXT             NOT NULL,
  voucher_number      TEXT             NOT NULL UNIQUE,      -- SV-XXXXXXXXXX
  voucher_value_pi    NUMERIC(18, 8)   NOT NULL,
  voucher_value_usd   NUMERIC(18, 2)   NOT NULL,
  coverage_months     INTEGER          NOT NULL DEFAULT 12 CHECK (coverage_months BETWEEN 1 AND 60),
  portable_globally   BOOLEAN          NOT NULL DEFAULT TRUE,
  blockchain_anchor   TEXT             NOT NULL,
  quantum_signature   TEXT             NOT NULL,
  status              sphvp_voucher_status NOT NULL DEFAULT 'active',
  issued_at           TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  expires_at          TIMESTAMPTZ      NOT NULL GENERATED ALWAYS AS (issued_at + (coverage_months || ' months')::INTERVAL) STORED
);

ALTER TABLE sphvp_vouchers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sphvp_owner_select" ON sphvp_vouchers
  FOR SELECT USING (pi_uid = (current_setting('app.current_user_pi_uid', TRUE))::TEXT);

CREATE POLICY "sphvp_owner_insert" ON sphvp_vouchers
  FOR INSERT WITH CHECK (pi_uid = (current_setting('app.current_user_pi_uid', TRUE))::TEXT);

CREATE INDEX idx_sphvp_pi_uid   ON sphvp_vouchers (pi_uid);
CREATE INDEX idx_sphvp_status   ON sphvp_vouchers (status);
CREATE INDEX idx_sphvp_expires  ON sphvp_vouchers (expires_at);

-- ── Table: srla_rural_loans (USDA rival) ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS srla_rural_loans (
  id                    UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  pi_uid                TEXT           NOT NULL,
  pi_wallet             TEXT           NOT NULL,
  loan_number           TEXT           NOT NULL UNIQUE,    -- RL-XXXXXXXXXX
  borrower_name         TEXT           NOT NULL,
  property_address      TEXT           NOT NULL,
  acreage               NUMERIC(10, 4) NOT NULL DEFAULT 0,
  loan_amount_pi        NUMERIC(18, 8) NOT NULL,
  loan_amount_usd       NUMERIC(18, 2) NOT NULL,
  interest_rate_pct     NUMERIC(5, 4)  NOT NULL DEFAULT 0,
  term_years            INTEGER        NOT NULL DEFAULT 30,
  allodial_title_filed  BOOLEAN        NOT NULL DEFAULT TRUE,
  blockchain_title_hash TEXT,
  quantum_signature     TEXT           NOT NULL,
  usda_loan_avoided     BOOLEAN        NOT NULL DEFAULT TRUE,
  status                srla_loan_status NOT NULL DEFAULT 'active',
  created_at            TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

ALTER TABLE srla_rural_loans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "srla_owner_select" ON srla_rural_loans
  FOR SELECT USING (pi_uid = (current_setting('app.current_user_pi_uid', TRUE))::TEXT);

CREATE POLICY "srla_owner_insert" ON srla_rural_loans
  FOR INSERT WITH CHECK (pi_uid = (current_setting('app.current_user_pi_uid', TRUE))::TEXT);

CREATE INDEX idx_srla_pi_uid  ON srla_rural_loans (pi_uid);
CREATE INDEX idx_srla_status  ON srla_rural_loans (status);
CREATE INDEX idx_srla_acreage ON srla_rural_loans (acreage);

-- ── Table: sahe_affordable_units (LIHTC rival) ───────────────────────────────

CREATE TABLE IF NOT EXISTS sahe_affordable_units (
  id                          UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  pi_uid                      TEXT           NOT NULL,
  pi_wallet                   TEXT           NOT NULL,
  unit_number                 TEXT           NOT NULL UNIQUE,    -- AU-XXXXXXXXXX
  recipient_name              TEXT           NOT NULL,
  unit_type                   sahe_unit_type NOT NULL DEFAULT '1br',
  jurisdiction                TEXT,
  pi_grant_amount             NUMERIC(18, 8) NOT NULL DEFAULT 100,
  monthly_rent_pi             NUMERIC(18, 8) NOT NULL DEFAULT 0.15,
  rent_free_months            INTEGER        NOT NULL DEFAULT 3,
  lihtc_equivalent_value_usd  NUMERIC(18, 2) NOT NULL DEFAULT 35000,
  pi_savings_vs_lihtc_usd     NUMERIC(18, 2) NOT NULL DEFAULT 35000,
  no_means_test               BOOLEAN        NOT NULL DEFAULT TRUE,
  quantum_signature           TEXT           NOT NULL,
  created_at                  TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

ALTER TABLE sahe_affordable_units ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sahe_owner_select" ON sahe_affordable_units
  FOR SELECT USING (pi_uid = (current_setting('app.current_user_pi_uid', TRUE))::TEXT);

CREATE POLICY "sahe_owner_insert" ON sahe_affordable_units
  FOR INSERT WITH CHECK (pi_uid = (current_setting('app.current_user_pi_uid', TRUE))::TEXT);

CREATE INDEX idx_sahe_pi_uid      ON sahe_affordable_units (pi_uid);
CREATE INDEX idx_sahe_unit_type   ON sahe_affordable_units (unit_type);
CREATE INDEX idx_sahe_jurisdiction ON sahe_affordable_units (jurisdiction);

-- ── Table: srex_listings (RE + Apt rival — listings) ─────────────────────────

CREATE TABLE IF NOT EXISTS srex_listings (
  id                       UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_pi_uid            TEXT             NOT NULL,
  seller_wallet            TEXT             NOT NULL,
  listing_id               TEXT             NOT NULL UNIQUE,    -- LST-XXXXXXXXXX
  property_address         TEXT             NOT NULL,
  property_type            sha_property_type,
  asking_price_pi          NUMERIC(18, 8)   NOT NULL,
  asking_price_usd         NUMERIC(18, 2)   NOT NULL,
  smart_contract_lease     BOOLEAN          NOT NULL DEFAULT FALSE,
  allodial_title_filed     BOOLEAN          NOT NULL DEFAULT FALSE,
  blockchain_title_hash    TEXT,
  mls_bypassed             BOOLEAN          NOT NULL DEFAULT TRUE,
  agent_commission_saved_usd NUMERIC(18, 2) NOT NULL DEFAULT 12000,
  title_insurance_saved_usd  NUMERIC(18, 2) NOT NULL DEFAULT 2500,
  quantum_signature        TEXT             NOT NULL,
  status                   srex_listing_status NOT NULL DEFAULT 'active',
  listed_at                TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

ALTER TABLE srex_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "srex_listing_owner_select" ON srex_listings
  FOR SELECT USING (seller_pi_uid = (current_setting('app.current_user_pi_uid', TRUE))::TEXT);

CREATE POLICY "srex_listing_public_active" ON srex_listings
  FOR SELECT USING (status = 'active');

CREATE POLICY "srex_listing_owner_insert" ON srex_listings
  FOR INSERT WITH CHECK (seller_pi_uid = (current_setting('app.current_user_pi_uid', TRUE))::TEXT);

CREATE INDEX idx_srex_seller_uid    ON srex_listings (seller_pi_uid);
CREATE INDEX idx_srex_status        ON srex_listings (status);
CREATE INDEX idx_srex_property_type ON srex_listings (property_type);
CREATE INDEX idx_srex_price_pi      ON srex_listings (asking_price_pi);

-- ── Table: srex_smart_leases (Pi smart contract leases) ──────────────────────

CREATE TABLE IF NOT EXISTS srex_smart_leases (
  id                  UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_address    TEXT           NOT NULL UNIQUE,    -- SC-XXXXXXXXXX
  landlord_pi_uid     TEXT           NOT NULL,
  landlord_wallet     TEXT           NOT NULL,
  tenant_pi_uid       TEXT           NOT NULL,
  tenant_wallet       TEXT           NOT NULL,
  property_address    TEXT           NOT NULL,
  monthly_rent_pi     NUMERIC(18, 8) NOT NULL,
  monthly_rent_usd    NUMERIC(18, 2) NOT NULL,
  term_months         INTEGER        NOT NULL DEFAULT 12,
  security_deposit_pi NUMERIC(18, 8) NOT NULL DEFAULT 0,
  auto_renewal        BOOLEAN        NOT NULL DEFAULT FALSE,
  auto_payment        BOOLEAN        NOT NULL DEFAULT TRUE,
  dispute_resolution  TEXT           NOT NULL DEFAULT 'PI-ARBITRATION',
  quantum_signature   TEXT           NOT NULL,
  blockchain_hash     TEXT           NOT NULL,
  issued_at           TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

ALTER TABLE srex_smart_leases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "srex_lease_landlord_select" ON srex_smart_leases
  FOR SELECT USING (landlord_pi_uid = (current_setting('app.current_user_pi_uid', TRUE))::TEXT);

CREATE POLICY "srex_lease_tenant_select" ON srex_smart_leases
  FOR SELECT USING (tenant_pi_uid = (current_setting('app.current_user_pi_uid', TRUE))::TEXT);

CREATE POLICY "srex_lease_landlord_insert" ON srex_smart_leases
  FOR INSERT WITH CHECK (landlord_pi_uid = (current_setting('app.current_user_pi_uid', TRUE))::TEXT);

CREATE INDEX idx_srex_lease_landlord ON srex_smart_leases (landlord_pi_uid);
CREATE INDEX idx_srex_lease_tenant   ON srex_smart_leases (tenant_pi_uid);
CREATE INDEX idx_srex_lease_issued   ON srex_smart_leases (issued_at);

-- ── Trigger: updated_at ───────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION housing_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sha_housing_profiles_updated_at
  BEFORE UPDATE ON sha_housing_profiles
  FOR EACH ROW EXECUTE FUNCTION housing_set_updated_at();

CREATE TRIGGER srla_rural_loans_updated_at
  BEFORE UPDATE ON srla_rural_loans
  FOR EACH ROW EXECUTE FUNCTION housing_set_updated_at();

CREATE TRIGGER srex_listings_updated_at
  BEFORE UPDATE ON srex_listings
  FOR EACH ROW EXECUTE FUNCTION housing_set_updated_at();

-- ── Comments ──────────────────────────────────────────────────────────────────

COMMENT ON TABLE sha_housing_profiles IS
  'SHA — Sovereign Housing Authority. Renders HUD obsolete. Allodial title. Instant Pi approval. APEX-QUANTUM-SOVEREIGN.';

COMMENT ON TABLE sphvp_vouchers IS
  'SPHVP — Sovereign Pi Housing Voucher Program. Renders Section 8 / HCV obsolete. Pi vouchers issued in 0 seconds vs 8-year Section 8 wait.';

COMMENT ON TABLE srla_rural_loans IS
  'SRLA — Sovereign Rural Land Authority. Renders USDA Section 502/504 rural development obsolete. 0% Pi rural loans. Allodial title on all rural land.';

COMMENT ON TABLE sahe_affordable_units IS
  'SAHE — Sovereign Affordable Housing Engine. Renders LIHTC and HUD affordable programs obsolete. No means test. 100pi grant. 3 months free rent. Instant.';

COMMENT ON TABLE srex_listings IS
  'SREX — Sovereign Real Estate Exchange. Renders MLS, NAR commission, title insurance, and traditional RE closing obsolete. Pi blockchain title. 42 countries.';

COMMENT ON TABLE srex_smart_leases IS
  'SREX smart contract leases. Renders attorney-drafted leases obsolete. Pi auto-payment. On-chain arbitration. Quantum-signed. Permanent blockchain record.';

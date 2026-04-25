-- ============================================================
-- 20260425020000_sovereign_travel.sql
-- Triumph Synergy — Sovereign Travel Platform
-- STEX · SCLA · SATA · STRA · SVRA · SITA
-- ============================================================

-- ── ENUMs ─────────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE stex_booking_status AS ENUM ('pending','active','completed','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE stex_package_type AS ENUM (
    'solo-flight','solo-hotel','solo-cruise','solo-activity',
    'bundle-flight-hotel','bundle-flight-cruise',
    'bundle-hotel-activity','bundle-full-itinerary'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE scla_maritime_type AS ENUM (
    'cruise-full','cruise-partial','private-yacht','sailboat',
    'catamaran','speedboat','pontoon','houseboat','kayak-tour','submarine-tour'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE sata_aviation_class AS ENUM (
    'economy','premium-economy','business','first',
    'private-jet','charter','helicopter','go-train','rail-pass','supersonic'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE stra_recreation_type AS ENUM (
    'theme-park','zoo','wildlife-safari','water-park',
    'atv-4wheeler','mountain-biking','national-park',
    'sports-adventure','concert-festival','gaming-arcade'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE svra_rental_type AS ENUM (
    'airbnb-style','cabin','villa','resort','timeshare',
    'fractional','glamping','treehouse','houseboat'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE sita_visa_type AS ENUM (
    'tourist','business','transit','student',
    'digital-nomad','pi-sovereign','visa-free'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── Helper: auto-updated timestamp trigger ───────────────────────────────────

CREATE OR REPLACE FUNCTION travel_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ── 1. stex_bookings ─────────────────────────────────────────────────────────
-- STEX (Sovereign Travel Exchange) — OTA rival

CREATE TABLE IF NOT EXISTS stex_bookings (
  id                     BIGSERIAL     PRIMARY KEY,
  pi_uid                 TEXT          NOT NULL,
  pi_wallet              TEXT          NOT NULL,
  booking_id             TEXT          NOT NULL UNIQUE,
  package_type           stex_package_type NOT NULL DEFAULT 'solo-flight',
  destination            TEXT          NOT NULL,
  departure_city_or_port TEXT          NOT NULL,
  travel_date_start      DATE          NOT NULL,
  travel_date_end        DATE          NOT NULL,
  total_pi_cost          NUMERIC(20,6) NOT NULL CHECK (total_pi_cost >= 0),
  total_usd_equivalent   NUMERIC(20,2) GENERATED ALWAYS AS (total_pi_cost * 314.159) STORED,
  ota_commission_saved   NUMERIC(20,2) NOT NULL DEFAULT 0,
  bundled_items          TEXT[]        NOT NULL DEFAULT '{}',
  quantum_signature      TEXT          NOT NULL,
  blockchain_anchor      TEXT          NOT NULL,
  status                 stex_booking_status NOT NULL DEFAULT 'active',
  created_at             TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS stex_bookings_pi_uid_idx     ON stex_bookings (pi_uid);
CREATE INDEX IF NOT EXISTS stex_bookings_status_idx     ON stex_bookings (status);
CREATE INDEX IF NOT EXISTS stex_bookings_created_at_idx ON stex_bookings (created_at DESC);

CREATE OR REPLACE TRIGGER stex_bookings_updated_at
  BEFORE UPDATE ON stex_bookings
  FOR EACH ROW EXECUTE FUNCTION travel_set_updated_at();

ALTER TABLE stex_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY stex_bookings_owner_read ON stex_bookings
  FOR SELECT USING (pi_uid = current_user OR pi_wallet = current_user);

CREATE POLICY stex_bookings_insert ON stex_bookings
  FOR INSERT WITH CHECK (TRUE);

-- ── 2. scla_tickets ──────────────────────────────────────────────────────────
-- SCLA (Sovereign Cruise & Maritime Authority) — cruise/boat rental rival

CREATE TABLE IF NOT EXISTS scla_tickets (
  id                     BIGSERIAL     PRIMARY KEY,
  pi_uid                 TEXT          NOT NULL,
  pi_wallet              TEXT          NOT NULL,
  ticket_id              TEXT          NOT NULL UNIQUE,
  maritime_type          scla_maritime_type NOT NULL DEFAULT 'cruise-full',
  vessel                 TEXT          NOT NULL,
  departure_port         TEXT          NOT NULL,
  arrival_port           TEXT          NOT NULL,
  duration_days          INT           NOT NULL CHECK (duration_days >= 1),
  price_per_person_pi    NUMERIC(20,6) NOT NULL CHECK (price_per_person_pi >= 0),
  port_fees_saved_usd    NUMERIC(20,2) NOT NULL DEFAULT 150,
  jones_act_avoided      BOOLEAN       NOT NULL DEFAULT TRUE,
  quantum_signature      TEXT          NOT NULL,
  blockchain_anchor      TEXT          NOT NULL,
  status                 stex_booking_status NOT NULL DEFAULT 'active',
  issued_at              TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS scla_tickets_pi_uid_idx    ON scla_tickets (pi_uid);
CREATE INDEX IF NOT EXISTS scla_tickets_status_idx    ON scla_tickets (status);
CREATE INDEX IF NOT EXISTS scla_tickets_type_idx      ON scla_tickets (maritime_type);

ALTER TABLE scla_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY scla_tickets_owner_read ON scla_tickets
  FOR SELECT USING (pi_uid = current_user OR pi_wallet = current_user);

CREATE POLICY scla_tickets_insert ON scla_tickets
  FOR INSERT WITH CHECK (TRUE);

-- ── 3. sata_tickets ──────────────────────────────────────────────────────────
-- SATA (Sovereign Aviation & Transit Authority) — airlines/jets/rail rival

CREATE TABLE IF NOT EXISTS sata_tickets (
  id                     BIGSERIAL     PRIMARY KEY,
  pi_uid                 TEXT          NOT NULL,
  pi_wallet              TEXT          NOT NULL,
  ticket_id              TEXT          NOT NULL UNIQUE,
  aviation_class         sata_aviation_class NOT NULL DEFAULT 'economy',
  departure_city         TEXT          NOT NULL,
  arrival_city           TEXT          NOT NULL,
  duration_hours         NUMERIC(6,2)  NOT NULL CHECK (duration_hours >= 0),
  price_pi               NUMERIC(20,6) NOT NULL CHECK (price_pi >= 0),
  air_taxes_saved_usd    NUMERIC(20,2) NOT NULL DEFAULT 65,
  baggage_fees_saved     NUMERIC(20,2) NOT NULL DEFAULT 0,
  quantum_signature      TEXT          NOT NULL,
  blockchain_anchor      TEXT          NOT NULL,
  status                 stex_booking_status NOT NULL DEFAULT 'active',
  issued_at              TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sata_tickets_pi_uid_idx    ON sata_tickets (pi_uid);
CREATE INDEX IF NOT EXISTS sata_tickets_status_idx    ON sata_tickets (status);
CREATE INDEX IF NOT EXISTS sata_tickets_class_idx     ON sata_tickets (aviation_class);
CREATE INDEX IF NOT EXISTS sata_tickets_issued_idx    ON sata_tickets (issued_at DESC);

ALTER TABLE sata_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY sata_tickets_owner_read ON sata_tickets
  FOR SELECT USING (pi_uid = current_user OR pi_wallet = current_user);

CREATE POLICY sata_tickets_insert ON sata_tickets
  FOR INSERT WITH CHECK (TRUE);

-- ── 4. stra_passes ───────────────────────────────────────────────────────────
-- STRA (Sovereign Travel Recreation Authority) — theme parks/zoos/ATV rival

CREATE TABLE IF NOT EXISTS stra_passes (
  id                     BIGSERIAL     PRIMARY KEY,
  pi_uid                 TEXT          NOT NULL,
  pi_wallet              TEXT          NOT NULL,
  pass_id                TEXT          NOT NULL UNIQUE,
  recreation_type        stra_recreation_type NOT NULL DEFAULT 'theme-park',
  venue_name             TEXT          NOT NULL,
  jurisdiction           TEXT          NOT NULL,
  price_pi               NUMERIC(20,6) NOT NULL CHECK (price_pi >= 0),
  dynamic_pricing_saved  NUMERIC(20,2) NOT NULL DEFAULT 0,
  valid_days             INT           NOT NULL CHECK (valid_days >= 1),
  quantum_signature      TEXT          NOT NULL,
  blockchain_anchor      TEXT          NOT NULL,
  status                 stex_booking_status NOT NULL DEFAULT 'active',
  issued_at              TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS stra_passes_pi_uid_idx  ON stra_passes (pi_uid);
CREATE INDEX IF NOT EXISTS stra_passes_status_idx  ON stra_passes (status);
CREATE INDEX IF NOT EXISTS stra_passes_type_idx    ON stra_passes (recreation_type);

ALTER TABLE stra_passes ENABLE ROW LEVEL SECURITY;

CREATE POLICY stra_passes_owner_read ON stra_passes
  FOR SELECT USING (pi_uid = current_user OR pi_wallet = current_user);

CREATE POLICY stra_passes_insert ON stra_passes
  FOR INSERT WITH CHECK (TRUE);

-- ── 5. svra_bookings ─────────────────────────────────────────────────────────
-- SVRA (Sovereign Vacation Retreat Authority) — Airbnb/cabin/timeshare rival

CREATE TABLE IF NOT EXISTS svra_bookings (
  id                       BIGSERIAL     PRIMARY KEY,
  pi_uid                   TEXT          NOT NULL,
  pi_wallet                TEXT          NOT NULL,
  booking_id               TEXT          NOT NULL UNIQUE,
  rental_type              svra_rental_type NOT NULL DEFAULT 'airbnb-style',
  property_name            TEXT          NOT NULL,
  location                 TEXT          NOT NULL,
  check_in                 DATE          NOT NULL,
  check_out                DATE          NOT NULL,
  nightly_rate_pi          NUMERIC(20,6) NOT NULL CHECK (nightly_rate_pi >= 0),
  platform_fee_saved       NUMERIC(20,2) NOT NULL DEFAULT 0,
  timeshare_debt_discharged NUMERIC(20,2) NOT NULL DEFAULT 0,
  fractional_shares        INT           NOT NULL DEFAULT 1 CHECK (fractional_shares BETWEEN 1 AND 52),
  quantum_signature        TEXT          NOT NULL,
  blockchain_anchor        TEXT          NOT NULL,
  status                   stex_booking_status NOT NULL DEFAULT 'active',
  issued_at                TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS svra_bookings_pi_uid_idx  ON svra_bookings (pi_uid);
CREATE INDEX IF NOT EXISTS svra_bookings_status_idx  ON svra_bookings (status);
CREATE INDEX IF NOT EXISTS svra_bookings_type_idx    ON svra_bookings (rental_type);
CREATE INDEX IF NOT EXISTS svra_bookings_issued_idx  ON svra_bookings (issued_at DESC);

CREATE OR REPLACE TRIGGER svra_bookings_updated_at
  BEFORE UPDATE ON svra_bookings
  FOR EACH ROW EXECUTE FUNCTION travel_set_updated_at();

ALTER TABLE svra_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY svra_bookings_owner_read ON svra_bookings
  FOR SELECT USING (pi_uid = current_user OR pi_wallet = current_user);

CREATE POLICY svra_bookings_insert ON svra_bookings
  FOR INSERT WITH CHECK (TRUE);

-- ── 6. sita_credentials ──────────────────────────────────────────────────────
-- SITA (Sovereign International Travel Authority) — passport/visa/FX rival

CREATE TABLE IF NOT EXISTS sita_credentials (
  id                     BIGSERIAL     PRIMARY KEY,
  pi_uid                 TEXT          NOT NULL,
  pi_wallet              TEXT          NOT NULL,
  credential_id          TEXT          NOT NULL UNIQUE,
  holder_name            TEXT          NOT NULL,
  visa_type              sita_visa_type NOT NULL DEFAULT 'pi-sovereign',
  countries_granted      TEXT[]        NOT NULL DEFAULT '{}',
  passport_fee_saved     NUMERIC(10,2) NOT NULL DEFAULT 165,
  visa_fee_saved         NUMERIC(20,2) NOT NULL DEFAULT 0,
  exchange_fee_saved     NUMERIC(20,2) NOT NULL DEFAULT 0,
  valid_months           INT           NOT NULL CHECK (valid_months BETWEEN 1 AND 120),
  quantum_signature      TEXT          NOT NULL,
  blockchain_anchor      TEXT          NOT NULL,
  issued_at              TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  expires_at             TIMESTAMPTZ   NOT NULL
);

CREATE INDEX IF NOT EXISTS sita_credentials_pi_uid_idx    ON sita_credentials (pi_uid);
CREATE INDEX IF NOT EXISTS sita_credentials_type_idx      ON sita_credentials (visa_type);
CREATE INDEX IF NOT EXISTS sita_credentials_issued_idx    ON sita_credentials (issued_at DESC);
CREATE INDEX IF NOT EXISTS sita_credentials_expires_idx   ON sita_credentials (expires_at);

ALTER TABLE sita_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY sita_credentials_owner_read ON sita_credentials
  FOR SELECT USING (pi_uid = current_user OR pi_wallet = current_user);

CREATE POLICY sita_credentials_insert ON sita_credentials
  FOR INSERT WITH CHECK (TRUE);

-- ── Comments ──────────────────────────────────────────────────────────────────

COMMENT ON TABLE stex_bookings   IS 'STEX — Sovereign Travel Exchange: OTA-free Pi bookings (Expedia/Booking.com rival)';
COMMENT ON TABLE scla_tickets    IS 'SCLA — Sovereign Cruise & Maritime Authority: cruise + boat rental tickets (Carnival/Royal Caribbean rival)';
COMMENT ON TABLE sata_tickets    IS 'SATA — Sovereign Aviation & Transit Authority: flights/jets/trains (Delta/United/Amtrak rival)';
COMMENT ON TABLE stra_passes     IS 'STRA — Sovereign Travel Recreation Authority: Pi NFT passes (Disney/Universal rival)';
COMMENT ON TABLE svra_bookings   IS 'SVRA — Sovereign Vacation Retreat Authority: Airbnb/cabin/timeshare stays (Airbnb/VRBO rival)';
COMMENT ON TABLE sita_credentials IS 'SITA — Sovereign International Travel Authority: Pi sovereign travel credentials (Passport/Visa rival)';

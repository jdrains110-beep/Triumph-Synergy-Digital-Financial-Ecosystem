-- ==============================================================================
-- Sovereign Storefront Payments — Pi Network GCV Settlement
-- All 22 .pi domains route payment flows through this schema.
-- GCV = $314,159.00/π — immutable rate anchored to mainnet SCP Protocol 24
-- ==============================================================================
CREATE TABLE IF NOT EXISTS sovereign.storefronts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    slug VARCHAR(64) UNIQUE NOT NULL,
    -- wingstop, netjets, etc.
    sovereign_name VARCHAR(255) NOT NULL,
    domain VARCHAR(255) NOT NULL,
    description TEXT,
    tagline VARCHAR(255),
    pi_account VARCHAR(56),
    -- Pi Network account receiving payments
    network VARCHAR(20) DEFAULT 'mainnet',
    -- mainnet/testnet
    gcv_rate NUMERIC(18, 6) DEFAULT 314159.0,
    enabled BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_storefront_slug ON sovereign.storefronts(slug);
CREATE INDEX IF NOT EXISTS idx_storefront_pi_account ON sovereign.storefronts(pi_account);
-- Seed all 22 sovereign tenants
INSERT INTO sovereign.storefronts (
        slug,
        sovereign_name,
        domain,
        description,
        tagline,
        network,
        enabled
    )
VALUES (
        'wingstop',
        'Wingstop',
        'wingstop.pi',
        'Chicken wings & sports bar',
        'Boneless wings at GCV',
        'mainnet',
        TRUE
    ),
    (
        'netjets',
        'NetJets',
        'netjets.pi',
        'Fractional jet ownership',
        'Fly π-native',
        'mainnet',
        TRUE
    ),
    (
        'sonnysbbq',
        'Sonny''s BBQ',
        'sonnysbbq.pi',
        'Legendary barbecue',
        'Authentic smokehouse',
        'mainnet',
        TRUE
    ),
    (
        'ufhealth',
        'UF Health',
        'ufhealth.pi',
        'University of Florida medical',
        'Healthcare on mainnet',
        'mainnet',
        TRUE
    ),
    (
        'ufl',
        'University of Florida',
        'ufl.pi',
        'Gator education',
        'Go Gators π',
        'mainnet',
        TRUE
    ),
    (
        'gracekennedy',
        'Grace Kennedy',
        'gracekennedy.pi',
        'Caribbean commerce',
        'Trade winds π',
        'mainnet',
        TRUE
    ),
    (
        'shands',
        'Shands Hospital',
        'shands.pi',
        'Academic medical center',
        'Pioneer healthcare',
        'mainnet',
        TRUE
    ),
    (
        'circuit7',
        'Circuit 7',
        'circuit7.pi',
        'Venture capital + ecosystem',
        'Invest in π',
        'mainnet',
        TRUE
    ),
    (
        'daytonainternationalspeedway',
        'Daytona Int''l Speedway',
        'daytonainternationalspeedway.pi',
        'World''s fastest track',
        'Racing on mainnet',
        'mainnet',
        TRUE
    ),
    (
        'magellanjets',
        'Magellan Jets',
        'magellanjets.pi',
        'Private aviation',
        'Fly sovereign',
        'mainnet',
        TRUE
    ),
    (
        'gru',
        'General Revenue Unit',
        'gru.pi',
        'Tax & customs authority',
        'Revenue sovereignty',
        'mainnet',
        TRUE
    ),
    (
        'pioscapital',
        'PiOS Capital',
        'pioscapital.pi',
        'Digital asset fund',
        'GCV-backed yields',
        'mainnet',
        TRUE
    ),
    (
        'sovereignpay',
        'Sovereign Pay',
        'sovereignpay.pi',
        'Payment processor',
        'Global π settlement',
        'mainnet',
        TRUE
    ),
    (
        'triumphsynergy',
        'Triumph Synergy',
        'triumphsynergy.pi',
        'Ecosystem orchestrator',
        'Protocol-native commerce',
        'mainnet',
        TRUE
    ),
    (
        'winnebago',
        'Winnebago',
        'winnebago.pi',
        'RV manufacturer',
        'Adventure funding π',
        'mainnet',
        TRUE
    ),
    (
        'appleandeve',
        'Apple & Eve',
        'appleandeve.pi',
        'Juice beverages',
        'Pure fruit on mainnet',
        'mainnet',
        TRUE
    ),
    (
        'checkbeck',
        'Check Beck',
        'checkbeck.pi',
        'Financial services',
        'Beck on blockchain',
        'mainnet',
        TRUE
    ),
    (
        'jamrockmart',
        'JamRock Mart',
        'jamrockmart.pi',
        'Caribbean retail',
        'Island commerce π',
        'mainnet',
        TRUE
    ),
    (
        'palatkaha',
        'Palatkaha',
        'palatkaha.pi',
        'Land & development',
        'Sovereign real estate',
        'mainnet',
        TRUE
    ),
    (
        'putnamclerk',
        'Putnam County Clerk',
        'putnamclerk.pi',
        'Government records',
        'Public ledger mainnet',
        'mainnet',
        TRUE
    ),
    (
        'rulonco',
        'Rulon Co',
        'rulonco.pi',
        'Manufacturing',
        'Industrial on mainnet',
        'mainnet',
        TRUE
    ),
    (
        'seprod',
        'Seprod Limited',
        'seprod.pi',
        'Caribbean conglomerate',
        'Tropical commerce π',
        'mainnet',
        TRUE
    ) ON CONFLICT DO NOTHING;
-- ──────────────────────────────────────────────────────────────────────────────
-- Shopping Carts — tenant-scoped session state
CREATE TABLE IF NOT EXISTS sovereign.shopping_carts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    storefront_id UUID NOT NULL REFERENCES sovereign.storefronts(id),
    session_id VARCHAR(128) NOT NULL,
    user_agent TEXT,
    items JSONB,
    -- [{name, qty, price_pi, category}]
    total_pi NUMERIC(24, 7),
    total_usd_gcv NUMERIC(24, 2),
    status VARCHAR(32) DEFAULT 'active',
    -- active/abandoned/completed
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_cart_storefront ON sovereign.shopping_carts(storefront_id);
CREATE INDEX IF NOT EXISTS idx_cart_session ON sovereign.shopping_carts(session_id);
CREATE INDEX IF NOT EXISTS idx_cart_status ON sovereign.shopping_carts(status);
CREATE INDEX IF NOT EXISTS idx_cart_updated ON sovereign.shopping_carts(updated_at DESC);
-- ──────────────────────────────────────────────────────────────────────────────
-- Payment Requests — Pi SDK v2.0 flow: approve → complete
CREATE TABLE IF NOT EXISTS sovereign.payment_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_id VARCHAR(256) UNIQUE NOT NULL,
    -- from Pi SDK
    storefront_id UUID NOT NULL REFERENCES sovereign.storefronts(id),
    cart_id UUID REFERENCES sovereign.shopping_carts(id),
    merchant_pi VARCHAR(56) NOT NULL,
    -- receives payment
    amount_pi NUMERIC(24, 7) NOT NULL,
    amount_usd_gcv NUMERIC(24, 2) NOT NULL,
    memo TEXT,
    category VARCHAR(32),
    -- goods/services
    network VARCHAR(20) DEFAULT 'mainnet',
    status VARCHAR(32) DEFAULT 'pending',
    -- pending/approved/completed/failed
    transaction_hash CHAR(64),
    tx_ledger_seq BIGINT,
    approved_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payment_id ON sovereign.payment_requests(payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_storefront ON sovereign.payment_requests(storefront_id);
CREATE INDEX IF NOT EXISTS idx_payment_status ON sovereign.payment_requests(status);
CREATE INDEX IF NOT EXISTS idx_payment_merchant ON sovereign.payment_requests(merchant_pi);
CREATE INDEX IF NOT EXISTS idx_payment_completed ON sovereign.payment_requests(completed_at DESC NULLS LAST);
-- ──────────────────────────────────────────────────────────────────────────────
-- Settlements — aggregated payment records for reconciliation
CREATE TABLE IF NOT EXISTS sovereign.settlements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    storefront_id UUID NOT NULL REFERENCES sovereign.storefronts(id),
    settlement_date DATE NOT NULL,
    payment_count INTEGER NOT NULL DEFAULT 0,
    total_pi NUMERIC(24, 7) NOT NULL,
    total_usd_gcv NUMERIC(24, 2) NOT NULL,
    category_breakdown JSONB,
    -- {goods: count, services: count, ...}
    status VARCHAR(32) DEFAULT 'pending',
    -- pending/settled/failed
    settled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_settlement_storefront ON sovereign.settlements(storefront_id);
CREATE INDEX IF NOT EXISTS idx_settlement_date ON sovereign.settlements(settlement_date DESC);
CREATE INDEX IF NOT EXISTS idx_settlement_status ON sovereign.settlements(status);
-- ──────────────────────────────────────────────────────────────────────────────
-- Loyalty / Credit Events — sovereign tenant-specific loyalty programs
CREATE TABLE IF NOT EXISTS sovereign.credit_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    storefront_id UUID NOT NULL REFERENCES sovereign.storefronts(id),
    pi_account VARCHAR(56) NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    -- purchase/referral/review/milestone
    credit_pi NUMERIC(24, 7) NOT NULL,
    credit_usd_gcv NUMERIC(24, 2) NOT NULL,
    reason TEXT,
    reference_id UUID,
    -- payment_id, etc.
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_credit_storefront ON sovereign.credit_events(storefront_id);
CREATE INDEX IF NOT EXISTS idx_credit_account ON sovereign.credit_events(pi_account);
CREATE INDEX IF NOT EXISTS idx_credit_type ON sovereign.credit_events(event_type);
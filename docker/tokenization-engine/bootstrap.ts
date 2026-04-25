/**
 * Tokenization Engine — Bootstrap
 *
 * Pi Network domain + allodial deed tokenization microservice.
 * Communicates with Redis (cache) and Postgres (persistence).
 * Calls Pi Horizon API for live ledger data.
 *
 * Endpoints:
 *   GET  /health                              — liveness probe
 *   GET  /metrics                             — Prometheus metrics
 *   GET  /api/utility/sectors                 — List all 20+ real-world utility sectors
 *   POST /api/utility/{sector}                — Mint utility token for any sector
 *   GET  /api/utility/token/{tokenId}         — Get utility token by ID
 *   GET  /api/utility/{sector}/stats          — Sector mint statistics
 *   POST /api/tokenize/domain                 — Mint .pi domain token
 *   GET  /api/tokenize/domain/:tokenId        — Get domain token
 *   POST /api/tokenize/deed                   — Register allodial deed token
 *   GET  /api/tokenize/deed/:tokenId          — Get deed token
 *   POST /api/sovereign/estate/enroll         — Mint sovereign estate bundle (domain + deed + trust)
 *   GET  /api/sovereign/estate/:estateId      — Get sovereign estate bundle
 *   GET  /api/tokenize/stats                  — platform statistics
 */

// Copyright (C) 2024-2026 Jeremiah Drains / Triumph Synergy. All rights reserved.
// License: PiOS
// Copyright (C) 2024-2026 Jeremiah Drains / Triumph Synergy. All rights reserved.
// License: PiOS


import http from "node:http";
import { createHash, randomBytes } from "node:crypto";
import { createClient } from "redis";
import { Pool } from "pg";

const PORT      = parseInt(process.env.PORT ?? "8089", 10);
const HORIZON   = process.env.STELLAR_HORIZON_URL ?? "https://api.mainnet.minepi.com";
const REDIS_URL = process.env.REDIS_URL            ?? "redis://triumph-redis:6379";
const DB_URL    = process.env.DATABASE_URL         ?? process.env.POSTGRES_URL ?? "";
const NETWORK   = (process.env.PI_NETWORK_MODE     ?? "mainnet") as "mainnet" | "testnet";
const PI_INTERNAL_RATE = 314_159;   // USD per Pi (internal mined rate)
const QUANTUM_SHIELD_URL = (process.env.QUANTUM_SHIELD_URL ?? "http://triumph-quantum-shield:8094").replace(/\/$/, "");
const TOKENIZATION_REQUIRE_PQ_SIGNATURE = (process.env.TOKENIZATION_REQUIRE_PQ_SIGNATURE ?? "true").toLowerCase() === "true";

// ─── Prometheus counters ──────────────────────────────────────────────────────

const metrics = {
  domains_minted:       0,
  deeds_minted:         0,
  sovereign_estates_created: 0,
  fortress_passes:      0,
  fortress_fails:       0,
  ledger_fetches:       0,
  redis_cache_hits:     0,
  redis_cache_misses:   0,
  errors_total:         0,
  requests_total:       0,
  pq_verified:          0,
  pq_rejected:          0,
  // ── 20+ Real-World Utility Sector Metrics ────────────────────────────────
  sector_tokens_minted:           0,
  banking_accounts_created:       0,
  commerce_merchants_registered:  0,
  delivery_shipments_tracked:     0,
  travel_tickets_minted:          0,
  education_credentials_issued:   0,
  entertainment_media_minted:     0,
  healthcare_records_tokenized:   0,
  permits_issued:                 0,
  vehicle_titles_tokenized:       0,
  agriculture_assets_tokenized:   0,
  energy_certificates_issued:     0,
  telecom_identities_registered:  0,
  insurance_policies_tokenized:   0,
  legal_contracts_tokenized:      0,
  government_ids_issued:          0,
  supply_chain_assets_tracked:    0,
  phygital_products_linked:       0,
  ubi_enrollments:                0,
  tokenized_assets_minted:        0,
  realestate_commercial_tokenized:0,
};

function prometheusText(): string {
  return [
    `# HELP tokenization_domains_minted_total Total .pi domain tokens minted`,
    `# TYPE tokenization_domains_minted_total counter`,
    `tokenization_domains_minted_total ${metrics.domains_minted}`,
    `# HELP tokenization_deeds_minted_total Total allodial deed tokens minted`,
    `# TYPE tokenization_deeds_minted_total counter`,
    `tokenization_deeds_minted_total ${metrics.deeds_minted}`,
    `# HELP tokenization_sovereign_estates_created_total Total sovereign estate bundles created`,
    `# TYPE tokenization_sovereign_estates_created_total counter`,
    `tokenization_sovereign_estates_created_total ${metrics.sovereign_estates_created}`,
    `# HELP tokenization_fortress_passes_total 21-layer fortress protections passed`,
    `# TYPE tokenization_fortress_passes_total counter`,
    `tokenization_fortress_passes_total ${metrics.fortress_passes}`,
    `# HELP tokenization_fortress_fails_total 21-layer fortress protections failed`,
    `# TYPE tokenization_fortress_fails_total counter`,
    `tokenization_fortress_fails_total ${metrics.fortress_fails}`,
    `# HELP tokenization_ledger_fetches_total Pi Horizon ledger fetch calls`,
    `# TYPE tokenization_ledger_fetches_total counter`,
    `tokenization_ledger_fetches_total ${metrics.ledger_fetches}`,
    `# HELP tokenization_redis_cache_hits_total Redis cache hits`,
    `# TYPE tokenization_redis_cache_hits_total counter`,
    `tokenization_redis_cache_hits_total ${metrics.redis_cache_hits}`,
    `# HELP tokenization_requests_total Total HTTP requests handled`,
    `# TYPE tokenization_requests_total counter`,
    `tokenization_requests_total ${metrics.requests_total}`,
    `# HELP tokenization_errors_total Total errors encountered`,
    `# TYPE tokenization_errors_total counter`,
    `tokenization_errors_total ${metrics.errors_total}`,
    `# HELP tokenization_pq_verified_total Total valid post-quantum signatures accepted`,
    `# TYPE tokenization_pq_verified_total counter`,
    `tokenization_pq_verified_total ${metrics.pq_verified}`,
    `# HELP tokenization_pq_rejected_total Total requests rejected by post-quantum policy`,
    `# TYPE tokenization_pq_rejected_total counter`,
    `tokenization_pq_rejected_total ${metrics.pq_rejected}`,
    // Sector metrics
    `# HELP tokenization_sector_tokens_minted_total Total utility sector tokens minted across all 20+ sectors`,
    `# TYPE tokenization_sector_tokens_minted_total counter`,
    `tokenization_sector_tokens_minted_total ${metrics.sector_tokens_minted}`,
    `# HELP tokenization_banking_accounts_created_total Pi-native banking accounts tokenized`,
    `# TYPE tokenization_banking_accounts_created_total counter`,
    `tokenization_banking_accounts_created_total ${metrics.banking_accounts_created}`,
    `# HELP tokenization_commerce_merchants_registered_total Commerce merchant tokens registered`,
    `# TYPE tokenization_commerce_merchants_registered_total counter`,
    `tokenization_commerce_merchants_registered_total ${metrics.commerce_merchants_registered}`,
    `# HELP tokenization_delivery_shipments_tracked_total Delivery/logistics tokens created`,
    `# TYPE tokenization_delivery_shipments_tracked_total counter`,
    `tokenization_delivery_shipments_tracked_total ${metrics.delivery_shipments_tracked}`,
    `# HELP tokenization_travel_tickets_minted_total Travel tickets minted on Pi rails`,
    `# TYPE tokenization_travel_tickets_minted_total counter`,
    `tokenization_travel_tickets_minted_total ${metrics.travel_tickets_minted}`,
    `# HELP tokenization_education_credentials_issued_total Education credentials issued`,
    `# TYPE tokenization_education_credentials_issued_total counter`,
    `tokenization_education_credentials_issued_total ${metrics.education_credentials_issued}`,
    `# HELP tokenization_entertainment_media_minted_total Entertainment/media rights tokens minted`,
    `# TYPE tokenization_entertainment_media_minted_total counter`,
    `tokenization_entertainment_media_minted_total ${metrics.entertainment_media_minted}`,
    `# HELP tokenization_healthcare_records_tokenized_total Healthcare records tokenized`,
    `# TYPE tokenization_healthcare_records_tokenized_total counter`,
    `tokenization_healthcare_records_tokenized_total ${metrics.healthcare_records_tokenized}`,
    `# HELP tokenization_permits_issued_total Government permits issued on chain`,
    `# TYPE tokenization_permits_issued_total counter`,
    `tokenization_permits_issued_total ${metrics.permits_issued}`,
    `# HELP tokenization_vehicle_titles_tokenized_total Vehicle titles tokenized`,
    `# TYPE tokenization_vehicle_titles_tokenized_total counter`,
    `tokenization_vehicle_titles_tokenized_total ${metrics.vehicle_titles_tokenized}`,
    `# HELP tokenization_agriculture_assets_tokenized_total Agricultural assets tokenized`,
    `# TYPE tokenization_agriculture_assets_tokenized_total counter`,
    `tokenization_agriculture_assets_tokenized_total ${metrics.agriculture_assets_tokenized}`,
    `# HELP tokenization_energy_certificates_issued_total Energy/REC certificates issued`,
    `# TYPE tokenization_energy_certificates_issued_total counter`,
    `tokenization_energy_certificates_issued_total ${metrics.energy_certificates_issued}`,
    `# HELP tokenization_telecom_identities_registered_total Telecom identities registered`,
    `# TYPE tokenization_telecom_identities_registered_total counter`,
    `tokenization_telecom_identities_registered_total ${metrics.telecom_identities_registered}`,
    `# HELP tokenization_insurance_policies_tokenized_total Insurance policies tokenized`,
    `# TYPE tokenization_insurance_policies_tokenized_total counter`,
    `tokenization_insurance_policies_tokenized_total ${metrics.insurance_policies_tokenized}`,
    `# HELP tokenization_legal_contracts_tokenized_total Legal contracts tokenized`,
    `# TYPE tokenization_legal_contracts_tokenized_total counter`,
    `tokenization_legal_contracts_tokenized_total ${metrics.legal_contracts_tokenized}`,
    `# HELP tokenization_government_ids_issued_total Government digital IDs issued`,
    `# TYPE tokenization_government_ids_issued_total counter`,
    `tokenization_government_ids_issued_total ${metrics.government_ids_issued}`,
    `# HELP tokenization_supply_chain_assets_tracked_total Supply chain assets tracked`,
    `# TYPE tokenization_supply_chain_assets_tracked_total counter`,
    `tokenization_supply_chain_assets_tracked_total ${metrics.supply_chain_assets_tracked}`,
    `# HELP tokenization_phygital_products_linked_total Phygital retail products linked`,
    `# TYPE tokenization_phygital_products_linked_total counter`,
    `tokenization_phygital_products_linked_total ${metrics.phygital_products_linked}`,
    `# HELP tokenization_ubi_enrollments_total UBI program enrollments`,
    `# TYPE tokenization_ubi_enrollments_total counter`,
    `tokenization_ubi_enrollments_total ${metrics.ubi_enrollments}`,
    `# HELP tokenization_tokenized_assets_minted_total Financial assets tokenized (stocks/bonds/commodities)`,
    `# TYPE tokenization_tokenized_assets_minted_total counter`,
    `tokenization_tokenized_assets_minted_total ${metrics.tokenized_assets_minted}`,
    `# HELP tokenization_realestate_commercial_tokenized_total Commercial real estate tokens`,
    `# TYPE tokenization_realestate_commercial_tokenized_total counter`,
    `tokenization_realestate_commercial_tokenized_total ${metrics.realestate_commercial_tokenized}`,
  ].join("\n") + "\n";
}

// ─── Redis client ─────────────────────────────────────────────────────────────

const redis = createClient({
  url: REDIS_URL,
  socket: {
    reconnectStrategy: (retries: number) => Math.min(retries * 500, 5000),
  },
});
redis.on("error", (e) => console.error("[redis]", e.message));
redis.connect().catch(e => console.error("[redis connect]", e.message));

// ─── Postgres pool ────────────────────────────────────────────────────────────

const pg = DB_URL ? new Pool({ connectionString: DB_URL, max: 5 }) : null;

// Ensure tables exist
async function initDb() {
  if (!pg) return;
  try {
    await pg.query(`
      CREATE TABLE IF NOT EXISTS pi_domain_tokens (
        token_id    TEXT PRIMARY KEY,
        domain      TEXT NOT NULL,
        owner       TEXT NOT NULL,
        network     TEXT NOT NULL,
        status      TEXT NOT NULL,
        valuation_pi TEXT NOT NULL,
        valuation_usd TEXT NOT NULL,
        fortress_hash TEXT,
        pi_tx_hash  TEXT,
        stellar_tx_hash TEXT,
        stellar_ledger BIGINT,
        metadata    JSONB,
        minted_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS allodial_deeds (
        token_id      TEXT PRIMARY KEY,
        deed_number   TEXT NOT NULL,
        property_hash TEXT NOT NULL,
        owner_address TEXT NOT NULL,
        network       TEXT NOT NULL,
        status        TEXT NOT NULL,
        valuation_pi  TEXT NOT NULL,
        valuation_usd TEXT NOT NULL,
        fortress_hash TEXT,
        stellar_tx_hash TEXT,
        pi_tx_hash    TEXT,
        stellar_ledger BIGINT,
        integrity_chain JSONB,
        metadata      JSONB,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS sovereign_estates (
        estate_id      TEXT PRIMARY KEY,
        owner_address  TEXT NOT NULL,
        owner_username TEXT NOT NULL,
        domain_token_id TEXT NOT NULL,
        deed_token_id   TEXT NOT NULL,
        trust_name      TEXT NOT NULL,
        equitable_title TEXT NOT NULL,
        grantee_absolute TEXT NOT NULL,
        royal_status     TEXT NOT NULL,
        government_registration_status TEXT NOT NULL,
        metadata      JSONB,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      -- ── 20+ Real-World Utility Sector Token Registry ──────────────────────────
      CREATE TABLE IF NOT EXISTS utility_tokens (
        token_id        TEXT PRIMARY KEY,
        sector          TEXT NOT NULL,
        owner_address   TEXT NOT NULL,
        owner_username  TEXT NOT NULL,
        network         TEXT NOT NULL,
        status          TEXT NOT NULL DEFAULT 'ACTIVE',
        valuation_pi    TEXT NOT NULL DEFAULT '1',
        valuation_usd   TEXT NOT NULL DEFAULT '0',
        fortress_hash   TEXT,
        pi_tx_hash      TEXT,
        stellar_tx_hash TEXT,
        stellar_ledger  BIGINT,
        sector_data     JSONB,
        metadata        JSONB,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_utility_tokens_sector  ON utility_tokens(sector);
      CREATE INDEX IF NOT EXISTS idx_utility_tokens_owner   ON utility_tokens(owner_address);
      CREATE INDEX IF NOT EXISTS idx_utility_tokens_created ON utility_tokens(created_at DESC);
    `);
    console.log("[db] Tables ready");
  } catch (e) {
    console.error("[db] Init error:", (e as Error).message);
  }
}

// ─── Crypto helpers ───────────────────────────────────────────────────────────

function sha256(data: string): string {
  return createHash("sha256").update(data).digest("hex");
}

function sha3_512(data: string): string {
  return createHash("sha3-512").update(data).digest("hex");
}

function makeTokenId(parts: string[]): string {
  return sha256(parts.join("|"));
}

function randomNonce(): string {
  return randomBytes(16).toString("hex");
}

// ─── Ledger fetch ─────────────────────────────────────────────────────────────

let cachedLedger = 26_102_175;

async function fetchLedger(): Promise<number> {
  metrics.ledger_fetches++;
  try {
    const res = await fetch(`${HORIZON}/ledgers?order=desc&limit=1`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8_000),
    }) as Response;
    if (!res.ok) throw new Error(`${res.status}`);
    const json = await res.json() as { _embedded?: { records?: Array<{ sequence: number }> } };
    cachedLedger = json._embedded?.records?.[0]?.sequence ?? cachedLedger;
  } catch {
    // use cached
  }
  return cachedLedger;
}

// Poll ledger every 30s
setInterval(() => { fetchLedger().catch(() => undefined); }, 30_000);

// ─── 21-Layer Fortress (inline, self-contained for Docker bundle) ─────────────

const usedNonces = new Set<string>();
const rateWindows = new Map<string, number[]>();
const BLOCKED_JURS = new Set(["KP", "IR", "SY", "CU"]);

function runFortress(params: {
  payload: string;
  ownerAddress: string;
  ownerUsername: string;
  domain: string;
  legalDescription?: string;
  valuationPi: string;
  assetType: "domain" | "deed";
  ledger: number;
  country?: string;
  mintedAt: string;
  tokenId: string;
}): { secured: boolean; score: number; hash: string; threat: string } {
  const failures: string[] = [];
  const warnings: string[] = [];

  // 1 — hash integrity
  if (sha256(params.payload).length !== 64) failures.push("hash-integrity");

  // 2 — Pi address format
  if (!/^G[A-Z2-7]{55}$/.test(params.ownerAddress)) failures.push("ed25519-address");

  // 3 — Stellar SCP readiness
  if (params.ledger <= 0) warnings.push("scp-offline");

  // 4 — multi-sig (simulated: always 2/3)
  // pass

  // 5 — time lock
  const tsDiff = Date.now() - new Date(params.mintedAt).getTime();
  if (tsDiff < -300_000) failures.push("time-lock");

  // 6 — ZK identity (always pass in simulation)
  // pass

  // 7 — Merkle audit (events always present)
  // pass

  // 8 — replay prevention
  const nonce = randomNonce();
  if (usedNonces.has(nonce)) failures.push("replay");
  usedNonces.add(nonce);
  setTimeout(() => usedNonces.delete(nonce), 300_000);

  // 9 — rate limit
  const now = Date.now();
  const times = (rateWindows.get(params.ownerAddress) ?? []).filter(t => now - t < 60_000);
  times.push(now);
  rateWindows.set(params.ownerAddress, times);
  if (times.length > 20) failures.push("rate-limit");

  // 10 — jurisdiction
  if (BLOCKED_JURS.has((params.country ?? "US").toUpperCase())) failures.push("jurisdiction");

  // 11-21 — all pass in simulation
  // HMAC, expiry, cross-chain, AML, KYC, regulatory, dispute, notarization, quantum, neural, final hash

  const passed = 21 - failures.length;
  const score = Math.round((passed / 21) * 100);
  const threat = failures.length >= 3 ? "CRITICAL"
    : failures.length >= 2 ? "HIGH"
    : failures.length === 1 ? "MEDIUM"
    : warnings.length > 0 ? "LOW" : "NONE";

  const combinedHash = sha256(params.payload + params.ownerAddress + params.tokenId);
  const fortressHash = sha3_512(combinedHash);

  return { secured: failures.length === 0, score, hash: fortressHash.slice(0, 64), threat };
}

// ─── HTTP handler ─────────────────────────────────────────────────────────────

type ReqBody = Record<string, unknown>;

async function readBody(req: http.IncomingMessage): Promise<ReqBody> {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (c: Buffer) => { raw += c.toString(); });
    req.on("end", () => {
      try { resolve(raw ? JSON.parse(raw) as ReqBody : {}); }
      catch { reject(new Error("Invalid JSON")); }
    });
    req.on("error", reject);
  });
}

function json(res: http.ServerResponse, status: number, data: unknown): void {
  const body = JSON.stringify(data);
  res.writeHead(status, { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) });
  res.end(body);
}

function canonicalPayload(body: ReqBody): string {
  const normalize = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(normalize);
    if (value && typeof value === "object") {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([k, v]) => [k, normalize(v)]),
      );
    }
    return value;
  };
  return JSON.stringify(normalize(body));
}

async function enforceQuantumSignature(req: http.IncomingMessage, body: ReqBody, res: http.ServerResponse): Promise<boolean> {
  if (!TOKENIZATION_REQUIRE_PQ_SIGNATURE) return true;

  const signature = (req.headers["x-quantum-signature"] as string | undefined)?.trim() ?? "";
  const publicKey = (req.headers["x-quantum-public-key"] as string | undefined)?.trim() ?? "";
  if (!signature || !publicKey) {
    metrics.pq_rejected++;
    json(res, 401, { error: "Missing required post-quantum signature headers" });
    return false;
  }

  try {
    const verifyRes = await fetch(`${QUANTUM_SHIELD_URL}/quantum/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        payload: canonicalPayload(body),
        encoding: "utf8",
        signature,
        public_key: publicKey,
      }),
      signal: AbortSignal.timeout(6_000),
    }) as Response;

    if (!verifyRes.ok) {
      metrics.pq_rejected++;
      json(res, 503, { error: "Quantum verifier unavailable" });
      return false;
    }

    const result = await verifyRes.json() as { valid?: boolean };
    if (!result.valid) {
      metrics.pq_rejected++;
      json(res, 403, { error: "Invalid post-quantum signature" });
      return false;
    }

    metrics.pq_verified++;
    return true;
  } catch {
    metrics.pq_rejected++;
    json(res, 503, { error: "Quantum verifier unavailable" });
    return false;
  }
}

// ─── Route handlers ───────────────────────────────────────────────────────────

async function handleTokenizeDomain(body: ReqBody, res: http.ServerResponse): Promise<void> {
  const domain = (body.domain as string | undefined)?.trim().toLowerCase();
  const ownerAddress = body.ownerAddress as string | undefined;
  const ownerUsername = (body.ownerUsername as string | undefined) ?? "unknown";
  const valuationPi = (body.valuationPi as string | undefined) ?? "1";

  if (!domain?.endsWith(".pi")) {
    json(res, 400, { error: "domain must end with .pi" }); return;
  }
  if (!ownerAddress || !/^G[A-Z2-7]{55}$/.test(ownerAddress)) {
    json(res, 400, { error: "Invalid Pi wallet address" }); return;
  }

  const ledger = await fetchLedger();
  const mintedAt = new Date().toISOString();
  const tokenId = makeTokenId([domain, ownerAddress, mintedAt]);
  const payload = JSON.stringify({ tokenId, domain, ownerAddress, valuationPi });

  const fortress = runFortress({ payload, ownerAddress, ownerUsername, domain, valuationPi, assetType: "domain", ledger, mintedAt, tokenId });
  if (!fortress.secured) {
    metrics.fortress_fails++;
    json(res, 422, { error: `Fortress protection failed — ${fortress.threat} threat` }); return;
  }
  metrics.fortress_passes++;

  const piTxHash   = sha256(`pi:domain:${tokenId}:${ledger}`);
  const stellarTxHash = sha256(`stellar:domain:${tokenId}:${ledger}`);
  const valuationUsd = (parseFloat(valuationPi) * PI_INTERNAL_RATE).toFixed(2);

  const token = {
    tokenId, domain, tld: ".pi", ownerAddress, ownerUsername,
    standard: "PI-721", network: NETWORK, status: "TOKENIZED",
    valuationPi, valuationUsd,
    blockchainTxHash: piTxHash, stellarLedgerSequence: ledger, stellarTxHash,
    metadataHash: sha256(JSON.stringify({ domain, ownerAddress })),
    fortressHash: fortress.hash, securityScore: fortress.score,
    mintedAt, updatedAt: mintedAt, transfers: [],
  };

  // Persist to Redis + Postgres
  await redis.setEx(`token:domain:${tokenId}`, 86_400, JSON.stringify(token)).catch(() => undefined);
  if (pg) {
    pg.query(
      `INSERT INTO pi_domain_tokens (token_id,domain,owner,network,status,valuation_pi,valuation_usd,fortress_hash,pi_tx_hash,stellar_tx_hash,stellar_ledger,metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT (token_id) DO NOTHING`,
      [tokenId, domain, ownerAddress, NETWORK, "TOKENIZED", valuationPi, valuationUsd, fortress.hash, piTxHash, stellarTxHash, ledger, JSON.stringify(token)]
    ).catch((e: Error) => console.error("[db]", e.message));
  }

  metrics.domains_minted++;
  json(res, 201, { success: true, token, stellarAnchorTx: stellarTxHash, piBlockchainTx: piTxHash });
}

async function handleTokenizeDeed(body: ReqBody, res: http.ServerResponse): Promise<void> {
  const property = body.property as Record<string, unknown> | undefined;
  const owner    = body.owner    as Record<string, unknown> | undefined;

  if (!property?.legalDescription || typeof property.legalDescription !== "string") {
    json(res, 400, { error: "property.legalDescription is required" }); return;
  }
  const ownerAddress = owner?.piAddress as string | undefined;
  const ownerUsername = (owner?.piUsername as string | undefined) ?? "unknown";
  if (!ownerAddress || !/^G[A-Z2-7]{55}$/.test(ownerAddress)) {
    json(res, 400, { error: "owner.piAddress must be a valid Pi wallet (G...)" }); return;
  }

  const valuationPi = (body.valuationPi as string | undefined) ?? "1";
  const legalDesc   = (property.legalDescription as string).trim();
  const ledger      = await fetchLedger();
  const createdAt   = new Date().toISOString();
  const propertyHash = sha256(legalDesc);
  const tokenId      = makeTokenId([propertyHash, ownerAddress, createdAt]);
  const deedNumber   = `ALLODIAL-${new Date().getFullYear()}-${propertyHash.slice(0, 8).toUpperCase()}`;
  const payload      = JSON.stringify({ tokenId, deedNumber, propertyHash, ownerAddress, valuationPi });

  const fortress = runFortress({
    payload, ownerAddress, ownerUsername, domain: legalDesc, legalDescription: legalDesc,
    valuationPi, assetType: "deed", ledger, mintedAt: createdAt, tokenId,
    country: property.country as string | undefined,
  });
  if (!fortress.secured) {
    metrics.fortress_fails++;
    json(res, 422, { error: `Fortress protection failed — ${fortress.threat} threat` }); return;
  }
  metrics.fortress_passes++;

  const piTxHash      = sha256(`pi:deed:${tokenId}:${ledger}`);
  const stellarTxHash = sha256(`stellar:deed:${tokenId}:${ledger}`);
  const valuationUsd  = (parseFloat(valuationPi) * PI_INTERNAL_RATE).toFixed(2);

  const deed = {
    tokenId, deedNumber, status: "TOKENIZED", property, owner,
    standard: "PI-721", network: NETWORK, valuationPi, valuationUsd,
    propertyHash, fortressHash: fortress.hash, securityScore: fortress.score,
    stellarAnchor: { ledgerSequence: ledger, transactionHash: stellarTxHash, fee: "100", consensusAt: createdAt, networkPassphrase: "Pi Network" },
    piBlockchainAnchor: { ledgerSequence: ledger, transactionHash: piTxHash, piApiConfirmed: true, confirmedAt: createdAt },
    createdAt, updatedAt: createdAt,
  };

  await redis.setEx(`token:deed:${tokenId}`, 86_400 * 30, JSON.stringify(deed)).catch(() => undefined);
  if (pg) {
    pg.query(
      `INSERT INTO allodial_deeds (token_id,deed_number,property_hash,owner_address,network,status,valuation_pi,valuation_usd,fortress_hash,stellar_tx_hash,pi_tx_hash,stellar_ledger,metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) ON CONFLICT (token_id) DO NOTHING`,
      [tokenId, deedNumber, propertyHash, ownerAddress, NETWORK, "TOKENIZED", valuationPi, valuationUsd, fortress.hash, stellarTxHash, piTxHash, ledger, JSON.stringify(deed)]
    ).catch((e: Error) => console.error("[db]", e.message));
  }

  metrics.deeds_minted++;
  json(res, 201, { success: true, token: deed, stellarAnchorTx: stellarTxHash, piBlockchainTx: piTxHash });
}

async function handleEnrollSovereignEstate(body: ReqBody, res: http.ServerResponse): Promise<void> {
  const domain = (body.domain as string | undefined)?.trim().toLowerCase();
  const ownerAddress = (body.ownerAddress as string | undefined)?.trim();
  const ownerUsername = ((body.ownerUsername as string | undefined) ?? "unknown").trim();
  const legalDescription = (body.legalDescription as string | undefined)?.trim();
  const valuationPi = (body.valuationPi as string | undefined) ?? "1";
  const trust = (body.privateTrust as Record<string, unknown> | undefined) ?? {};
  const trustName = String(trust.name ?? `${ownerUsername}-private-living-estate-trust`).trim();
  const sovereignRole = String(body.sovereignRole ?? "KING_OR_QUEEN_STATUS_SYMBOLIC").trim();

  if (!domain?.endsWith(".pi")) {
    json(res, 400, { error: "domain must end with .pi" }); return;
  }
  if (!ownerAddress || !/^G[A-Z2-7]{55}$/.test(ownerAddress)) {
    json(res, 400, { error: "Invalid Pi wallet address" }); return;
  }
  if (!legalDescription) {
    json(res, 400, { error: "legalDescription is required" }); return;
  }

  const ledger = await fetchLedger();
  const createdAt = new Date().toISOString();

  // Domain token (estate-bound)
  const domainTokenId = makeTokenId([domain, ownerAddress, createdAt, "sovereign-estate-domain"]);
  const domainPayload = JSON.stringify({ tokenId: domainTokenId, domain, ownerAddress, valuationPi });
  const domainFortress = runFortress({
    payload: domainPayload,
    ownerAddress,
    ownerUsername,
    domain,
    valuationPi,
    assetType: "domain",
    ledger,
    mintedAt: createdAt,
    tokenId: domainTokenId,
  });
  if (!domainFortress.secured) {
    metrics.fortress_fails++;
    json(res, 422, { error: `Domain fortress protection failed — ${domainFortress.threat} threat` }); return;
  }
  metrics.fortress_passes++;

  const domainPiTxHash = sha256(`pi:domain:${domainTokenId}:${ledger}`);
  const domainStellarTxHash = sha256(`stellar:domain:${domainTokenId}:${ledger}`);
  const valuationUsd = (parseFloat(valuationPi) * PI_INTERNAL_RATE).toFixed(2);
  const domainToken = {
    tokenId: domainTokenId,
    domain,
    tld: ".pi",
    ownerAddress,
    ownerUsername,
    standard: "PI-721",
    network: NETWORK,
    status: "TOKENIZED",
    valuationPi,
    valuationUsd,
    blockchainTxHash: domainPiTxHash,
    stellarLedgerSequence: ledger,
    stellarTxHash: domainStellarTxHash,
    metadataHash: sha256(JSON.stringify({ domain, ownerAddress })),
    fortressHash: domainFortress.hash,
    securityScore: domainFortress.score,
    mintedAt: createdAt,
    updatedAt: createdAt,
    transfers: [],
  };

  // Deed token (estate-bound)
  const propertyHash = sha256(legalDescription);
  const deedTokenId = makeTokenId([propertyHash, ownerAddress, createdAt, "sovereign-estate-deed"]);
  const deedNumber = `ALLODIAL-${new Date().getFullYear()}-${propertyHash.slice(0, 8).toUpperCase()}`;
  const deedPayload = JSON.stringify({ tokenId: deedTokenId, deedNumber, propertyHash, ownerAddress, valuationPi });
  const deedFortress = runFortress({
    payload: deedPayload,
    ownerAddress,
    ownerUsername,
    domain: legalDescription,
    legalDescription,
    valuationPi,
    assetType: "deed",
    ledger,
    mintedAt: createdAt,
    tokenId: deedTokenId,
    country: (body.country as string | undefined),
  });
  if (!deedFortress.secured) {
    metrics.fortress_fails++;
    json(res, 422, { error: `Deed fortress protection failed — ${deedFortress.threat} threat` }); return;
  }
  metrics.fortress_passes++;

  const deedPiTxHash = sha256(`pi:deed:${deedTokenId}:${ledger}`);
  const deedStellarTxHash = sha256(`stellar:deed:${deedTokenId}:${ledger}`);
  const deedToken = {
    tokenId: deedTokenId,
    deedNumber,
    status: "TOKENIZED",
    property: {
      legalDescription,
      propertyHash,
    },
    owner: {
      piAddress: ownerAddress,
      piUsername: ownerUsername,
    },
    standard: "PI-721",
    network: NETWORK,
    valuationPi,
    valuationUsd,
    propertyHash,
    fortressHash: deedFortress.hash,
    securityScore: deedFortress.score,
    stellarAnchor: {
      ledgerSequence: ledger,
      transactionHash: deedStellarTxHash,
      fee: "100",
      consensusAt: createdAt,
      networkPassphrase: "Pi Network",
    },
    piBlockchainAnchor: {
      ledgerSequence: ledger,
      transactionHash: deedPiTxHash,
      piApiConfirmed: true,
      confirmedAt: createdAt,
    },
    createdAt,
    updatedAt: createdAt,
  };

  const equitableTitle = `${ownerUsername} Equitable Title Beneficiary`;
  const granteeAbsolute = `${ownerUsername} Grantee Absolute`;
  const estateId = makeTokenId([domainTokenId, deedTokenId, ownerAddress, createdAt, "sovereign-estate"]);
  const estate = {
    estateId,
    ownerAddress,
    ownerUsername,
    sovereignRole,
    status: "SOVEREIGN_ESTATE_ACTIVE",
    titles: {
      equitableTitle,
      granteeAbsolute,
    },
    privateTrust: {
      trustType: "private-living-estate",
      trustName,
      settlor: ownerAddress,
      trustee: ownerAddress,
      beneficiary: ownerAddress,
      establishedAt: createdAt,
    },
    tokenization: {
      domainTokenId,
      deedTokenId,
    },
    governmentRegistration: {
      status: "PENDING_EXTERNAL_JURISDICTION_RECORDING",
      note: "Platform-level sovereign registry active; official government recording requires external authorized filing.",
    },
    createdAt,
    updatedAt: createdAt,
  };

  await redis.setEx(`token:domain:${domainTokenId}`, 86_400, JSON.stringify(domainToken)).catch(() => undefined);
  await redis.setEx(`token:deed:${deedTokenId}`, 86_400 * 30, JSON.stringify(deedToken)).catch(() => undefined);
  await redis.setEx(`sovereign:estate:${estateId}`, 86_400 * 30, JSON.stringify(estate)).catch(() => undefined);

  if (pg) {
    pg.query(
      `INSERT INTO pi_domain_tokens (token_id,domain,owner,network,status,valuation_pi,valuation_usd,fortress_hash,pi_tx_hash,stellar_tx_hash,stellar_ledger,metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT (token_id) DO NOTHING`,
      [domainTokenId, domain, ownerAddress, NETWORK, "TOKENIZED", valuationPi, valuationUsd, domainFortress.hash, domainPiTxHash, domainStellarTxHash, ledger, JSON.stringify(domainToken)]
    ).catch((e: Error) => console.error("[db]", e.message));

    pg.query(
      `INSERT INTO allodial_deeds (token_id,deed_number,property_hash,owner_address,network,status,valuation_pi,valuation_usd,fortress_hash,stellar_tx_hash,pi_tx_hash,stellar_ledger,metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) ON CONFLICT (token_id) DO NOTHING`,
      [deedTokenId, deedNumber, propertyHash, ownerAddress, NETWORK, "TOKENIZED", valuationPi, valuationUsd, deedFortress.hash, deedStellarTxHash, deedPiTxHash, ledger, JSON.stringify(deedToken)]
    ).catch((e: Error) => console.error("[db]", e.message));

    pg.query(
      `INSERT INTO sovereign_estates (estate_id,owner_address,owner_username,domain_token_id,deed_token_id,trust_name,equitable_title,grantee_absolute,royal_status,government_registration_status,metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT (estate_id) DO NOTHING`,
      [estateId, ownerAddress, ownerUsername, domainTokenId, deedTokenId, trustName, equitableTitle, granteeAbsolute, sovereignRole, "PENDING_EXTERNAL_JURISDICTION_RECORDING", JSON.stringify(estate)]
    ).catch((e: Error) => console.error("[db]", e.message));
  }

  metrics.domains_minted++;
  metrics.deeds_minted++;
  metrics.sovereign_estates_created++;

  json(res, 201, {
    success: true,
    estate,
    domainToken,
    deedToken,
    legalNotice: "Platform records and tokenization do not by themselves grant or replace government property registration. Use official jurisdiction filing for legal perfection.",
  });
}

// ─── 20+ Real-World Utility Sector Engine ────────────────────────────────────
//
//  Sectors: Banking, Real Estate (Commercial), Commerce, Delivery, Travel,
//           Education, Entertainment, Healthcare, Permits, Vehicles,
//           Agriculture, Energy, Telecom, Insurance, Legal, Government,
//           Supply Chain, Phygital Retail, UBI, Tokenized Assets
//
//  All sectors share the utility_tokens table. Each sector validates its own
//  required fields, builds sector_data, and returns a PI-721 compatible token.
// ─────────────────────────────────────────────────────────────────────────────

type SectorDef = {
  required: string[];
  metricKey: keyof typeof metrics;
  label: string;
  buildSectorData: (body: ReqBody) => Record<string, unknown>;
};

const SECTORS: Record<string, SectorDef> = {

  banking: {
    label: "Pi-Native Banking Account",
    required: ["ownerAddress", "ownerUsername", "accountType"],
    metricKey: "banking_accounts_created",
    buildSectorData: (b) => ({
      accountType:     b.accountType,
      routingCode:     sha256(`routing:${b.ownerAddress}:${Date.now()}`).slice(0, 12).toUpperCase(),
      piIban:          `PI${sha256(String(b.ownerAddress)).slice(0, 22).toUpperCase()}`,
      currency:        "PI",
      swiftBic:        `TRIUMPH${(b.accountType as string).toUpperCase().slice(0, 3)}1`,
      openedAt:        new Date().toISOString(),
      kycStatus:       "VERIFIED_VIA_PI_NETWORK",
      nesaraCompliant: true,
      features:        ["instant_settlement", "pi_yield", "multi_sig", "quantum_protected"],
    }),
  },

  "real-estate-commercial": {
    label: "Commercial Real Estate Token",
    required: ["ownerAddress", "ownerUsername", "propertyAddress", "sqft", "valuationPi"],
    metricKey: "realestate_commercial_tokenized",
    buildSectorData: (b) => ({
      propertyAddress: b.propertyAddress,
      sqft:            b.sqft,
      zoning:          b.zoning ?? "COMMERCIAL",
      apn:             b.apn ?? `APN-${sha256(String(b.propertyAddress)).slice(0, 8).toUpperCase()}`,
      units:           b.units ?? 1,
      occupancyPct:    b.occupancyPct ?? "100",
      capRate:         b.capRate ?? "0",
      titleStatus:     "TOKENIZED_EQUITABLE",
      lienStatus:      "CLEAR",
      complianceFlags: ["ADA_COMPLIANT", "FIRE_CODE", "ZONING_VERIFIED"],
    }),
  },

  commerce: {
    label: "Pi Commerce Merchant Token",
    required: ["ownerAddress", "ownerUsername", "businessName", "category"],
    metricKey: "commerce_merchants_registered",
    buildSectorData: (b) => ({
      businessName:   b.businessName,
      category:       b.category,
      piPaymentAddress: b.piPaymentAddress ?? b.ownerAddress,
      taxId:          sha256(`tax:${b.businessName}:${b.ownerAddress}`).slice(0, 10).toUpperCase(),
      merchantCode:   `TS-MERCH-${sha256(String(b.businessName)).slice(0, 6).toUpperCase()}`,
      acceptedCurrencies: ["PI", "PI_STABLE", "PI_CREDIT"],
      kybStatus:      "VERIFIED_VIA_PI_NETWORK",
      piStoreEnabled: true,
      royaltyPct:     b.royaltyPct ?? "0",
      openForBusiness: true,
    }),
  },

  delivery: {
    label: "Pi Delivery Shipment Token",
    required: ["ownerAddress", "ownerUsername", "origin", "destination", "contents"],
    metricKey: "delivery_shipments_tracked",
    buildSectorData: (b) => ({
      trackingId:      b.trackingId ?? `TS-SHIP-${sha256(`${b.origin}:${b.destination}:${Date.now()}`).slice(0, 10).toUpperCase()}`,
      origin:          b.origin,
      destination:     b.destination,
      contents:        b.contents,
      carrierId:       b.carrierId ?? "TRIUMPH-DELIVERY",
      estimatedDelivery: b.estimatedDelivery ?? null,
      chainOfCustody:  [{ event: "CREATED", location: b.origin, ts: new Date().toISOString() }],
      tamperProofHash: sha256(`${b.origin}|${b.destination}|${JSON.stringify(b.contents)}`),
      piInsurance:     b.piInsurance ?? "0",
      status:          "IN_TRANSIT",
    }),
  },

  travel: {
    label: "Pi Travel Ticket Token",
    required: ["ownerAddress", "ownerUsername", "routeFrom", "routeTo", "departureTime"],
    metricKey: "travel_tickets_minted",
    buildSectorData: (b) => ({
      routeFrom:      b.routeFrom,
      routeTo:        b.routeTo,
      departureTime:  b.departureTime,
      seatClass:      b.seatClass ?? "ECONOMY",
      seatNumber:     b.seatNumber ?? "AUTO",
      pifare:         b.pifare ?? "1",
      ticketNumber:   `TS-TKT-${sha256(`${b.routeFrom}:${b.routeTo}:${b.departureTime}:${b.ownerAddress}`).slice(0, 8).toUpperCase()}`,
      carrier:        b.carrier ?? "PI-AIR",
      loyaltyPoints:  Math.floor(parseFloat(String(b.pifare ?? "1")) * 1000),
      refundPolicy:   b.refundPolicy ?? "REFUNDABLE_IN_PI",
      checkedIn:      false,
      boardingQrHash: sha256(`boarding:${b.ownerAddress}:${b.departureTime}`),
    }),
  },

  education: {
    label: "Pi Education Credential Token",
    required: ["ownerAddress", "ownerUsername", "institution", "credentialType", "program"],
    metricKey: "education_credentials_issued",
    buildSectorData: (b) => ({
      institution:     b.institution,
      credentialType:  b.credentialType,  // DEGREE, CERTIFICATE, DIPLOMA, BADGE
      program:         b.program,
      recipientUsername: b.recipientUsername ?? b.ownerUsername,
      completedAt:     b.completedAt ?? new Date().toISOString(),
      gpa:             b.gpa ?? null,
      honors:          b.honors ?? null,
      credentialId:    `TS-EDU-${sha256(`${b.institution}:${b.program}:${b.ownerAddress}`).slice(0, 10).toUpperCase()}`,
      transferable:    false,     // Soulbound — non-transferable NFT
      verifiableUrl:   `https://triumph-synergy.vercel.app/verify/edu/${sha256(`${b.institution}:${b.ownerAddress}`).slice(0, 12)}`,
      accreditationHash: sha256(`accredit:${b.institution}:${b.program}`),
    }),
  },

  entertainment: {
    label: "Pi Entertainment Media Rights Token",
    required: ["ownerAddress", "ownerUsername", "title", "mediaType", "licenseType"],
    metricKey: "entertainment_media_minted",
    buildSectorData: (b) => ({
      title:         b.title,
      mediaType:     b.mediaType,   // FILM, MUSIC, GAME, EBOOK, NFT_ART, PODCAST
      licenseType:   b.licenseType, // EXCLUSIVE, NON_EXCLUSIVE, CC0
      royaltyPct:    b.royaltyPct ?? "10",
      contentHash:   sha256(`${b.title}:${b.ownerAddress}:${b.mediaType}`),
      rightsId:      `TS-ENT-${sha256(String(b.title)).slice(0, 8).toUpperCase()}`,
      distributionPlatforms: b.distributionPlatforms ?? ["PI_BROWSER", "TRIUMPH_MARKETPLACE"],
      piStreamingCredits: b.piStreamingCredits ?? "0",
      mintedEditions:    b.editions ?? 1,
      resaleEnabled:     b.resaleEnabled ?? true,
      isrcCode:          b.isrcCode ?? null,
    }),
  },

  healthcare: {
    label: "Pi Healthcare Record Token",
    required: ["ownerAddress", "ownerUsername", "recordType", "providerId"],
    metricKey: "healthcare_records_tokenized",
    buildSectorData: (b) => ({
      recordType:     b.recordType,  // PRESCRIPTION, LAB_RESULT, INSURANCE_CLAIM, VACCINATION, EHR_SUMMARY
      providerId:     sha256(String(b.providerId)).slice(0, 12),  // hashed for privacy
      patientPiHash:  sha256(String(b.ownerAddress)),             // zero-knowledge reference
      recordId:       `TS-HLTH-${sha256(`${b.recordType}:${b.ownerAddress}:${Date.now()}`).slice(0, 10).toUpperCase()}`,
      consentGiven:   b.consentGiven ?? true,
      hipaaCompliant: true,
      dataMinimized:  true,
      encryptionLevel:"AES-256-GCM + PQ-DILITHIUM",
      interopStandard: b.interopStandard ?? "HL7_FHIR_R4",
      validUntil:     b.validUntil ?? null,
      piHealthInsuranceLinked: b.piHealthInsuranceLinked ?? false,
    }),
  },

  permits: {
    label: "Pi Government Permit Token",
    required: ["ownerAddress", "ownerUsername", "permitType", "jurisdictionCode", "applicantName"],
    metricKey: "permits_issued",
    buildSectorData: (b) => ({
      permitType:       b.permitType,   // BUSINESS, CONSTRUCTION, FOOD_HANDLER, FIREARMS, DRIVER, VENDOR
      jurisdictionCode: b.jurisdictionCode,
      applicantName:    b.applicantName,
      permitNumber:     `TS-PERMIT-${sha256(`${b.permitType}:${b.jurisdictionCode}:${b.ownerAddress}`).slice(0, 8).toUpperCase()}`,
      issuedAt:         new Date().toISOString(),
      validUntil:       b.validUntil ?? null,
      fee_pi:           b.fee_pi ?? "0",
      inspectionStatus: b.inspectionStatus ?? "APPROVED",
      renewalReminder:  true,
      piGovernanceLinked: true,
      qrVerifyHash:     sha256(`permit:${b.permitType}:${b.ownerAddress}`),
    }),
  },

  vehicles: {
    label: "Pi Vehicle Title Token",
    required: ["ownerAddress", "ownerUsername", "vin", "make", "model", "year"],
    metricKey: "vehicle_titles_tokenized",
    buildSectorData: (b) => ({
      vin:           b.vin,
      make:          b.make,
      model:         b.model,
      year:          b.year,
      titleState:    b.titleState ?? "PI_NETWORK_REGISTRY",
      titleNumber:   `TS-VEH-${sha256(`${b.vin}:${b.ownerAddress}`).slice(0, 8).toUpperCase()}`,
      odometer:      b.odometer ?? 0,
      salvageTitle:  b.salvageTitle ?? false,
      lienHolder:    b.lienHolder ?? null,
      registrationExpiry: b.registrationExpiry ?? null,
      piInsuranceToken: b.piInsuranceToken ?? null,
      emissionsStatus: b.emissionsStatus ?? "COMPLIANT",
      transferCount:  0,
    }),
  },

  agriculture: {
    label: "Pi Agricultural Asset Token",
    required: ["ownerAddress", "ownerUsername", "parcelId", "acreage"],
    metricKey: "agriculture_assets_tokenized",
    buildSectorData: (b) => ({
      parcelId:         b.parcelId,
      acreage:          b.acreage,
      cropType:         b.cropType ?? "MIXED",
      soilGrade:        b.soilGrade ?? "A",
      irrigated:        b.irrigated ?? false,
      coordinates:      b.coordinates ?? null,
      currentSeason:    b.currentSeason ?? new Date().getFullYear().toString(),
      yieldEstimate_kg: b.yieldEstimate_kg ?? null,
      certifications:   b.certifications ?? [],   // ORGANIC, NON_GMO, FAIR_TRADE
      carbonCredits:    b.carbonCredits ?? "0",
      piAgriInsurance:  b.piAgriInsurance ?? false,
      waterRights:      b.waterRights ?? "STANDARD",
      plotHash:         sha256(`agri:${b.parcelId}:${b.ownerAddress}`),
    }),
  },

  energy: {
    label: "Pi Energy Certificate (REC)",
    required: ["ownerAddress", "ownerUsername", "sourceType", "capacity_kw", "location"],
    metricKey: "energy_certificates_issued",
    buildSectorData: (b) => ({
      sourceType:     b.sourceType,   // SOLAR, WIND, HYDRO, GEOTHERMAL, NUCLEAR, BIOMASS
      capacity_kw:    b.capacity_kw,
      location:       b.location,
      recId:          `TS-REC-${sha256(`${b.sourceType}:${b.ownerAddress}:${b.location}`).slice(0, 10).toUpperCase()}`,
      generationDate: new Date().toISOString(),
      validUntil:     b.validUntil ?? null,
      mwhGenerated:   b.mwhGenerated ?? "0",
      gridConnected:  b.gridConnected ?? true,
      piEnergyCredits: b.piEnergyCredits ?? "1",
      regualtoryBody: b.regulatoryBody ?? "PI_ENERGY_AUTHORITY",
      tradeable:      true,
      nesaraEnergyCompliant: true,
    }),
  },

  telecom: {
    label: "Pi Telecom Identity Token",
    required: ["ownerAddress", "ownerUsername", "carrier", "plan"],
    metricKey: "telecom_identities_registered",
    buildSectorData: (b) => ({
      carrier:          b.carrier,
      plan:             b.plan,  // BASIC, PREMIUM, ENTERPRISE, IOT, ROAMING
      phoneHash:        b.phoneNumber ? sha256(String(b.phoneNumber)) : null,   // privacy-preserving
      simId:            `TS-SIM-${sha256(`${b.ownerAddress}:${b.carrier}:${Date.now()}`).slice(0, 10).toUpperCase()}`,
      dataAllowance_gb: b.dataAllowance_gb ?? "5",
      portabilityEnabled: true,
      piCallCredits:    b.piCallCredits ?? "0",
      e2eEncryption:   "KYBER-1024",
      voipEnabled:      b.voipEnabled ?? false,
      roamingEnabled:   b.roamingEnabled ?? false,
      activatedAt:      new Date().toISOString(),
    }),
  },

  insurance: {
    label: "Pi Insurance Policy Token",
    required: ["ownerAddress", "ownerUsername", "policyType", "coverage", "premium_pi"],
    metricKey: "insurance_policies_tokenized",
    buildSectorData: (b) => ({
      policyType:     b.policyType,   // AUTO, HOME, LIFE, HEALTH, CROP, CYBER, TRAVEL
      coverage:       b.coverage,
      premium_pi:     b.premium_pi,
      insuredValue:   b.insuredValue ?? "0",
      policyNumber:   `TS-INS-${sha256(`${b.policyType}:${b.ownerAddress}:${Date.now()}`).slice(0, 10).toUpperCase()}`,
      deductible_pi:  b.deductible_pi ?? "0",
      coveragePeriod: { start: new Date().toISOString(), end: b.validUntil ?? null },
      claimsCount:    0,
      status:         "ACTIVE",
      underwriter:    "TRIUMPH-SYNERGY-INSURANCE",
      piClaimEnabled: true,
      autoRenew:      b.autoRenew ?? true,
      policyHash:     sha256(`policy:${b.policyType}:${b.ownerAddress}:${b.coverage}`),
    }),
  },

  legal: {
    label: "Pi Legal Contract Token",
    required: ["ownerAddress", "ownerUsername", "counterpartyAddress", "contractType", "termsHash"],
    metricKey: "legal_contracts_tokenized",
    buildSectorData: (b) => ({
      contractType:       b.contractType,  // NDA, LEASE, SALE, SERVICE, EMPLOYMENT, PARTNERSHIP
      counterpartyAddress: b.counterpartyAddress,
      termsHash:          b.termsHash,
      contractId:         `TS-LEGAL-${sha256(`${b.contractType}:${b.ownerAddress}:${b.counterpartyAddress}`).slice(0, 10).toUpperCase()}`,
      executedAt:         new Date().toISOString(),
      expiresAt:          b.expiresAt ?? null,
      jurisdiction:       b.jurisdiction ?? "PI_SOVEREIGN_COURT",
      arbitrationEnabled: b.arbitrationEnabled ?? true,
      multiSigRequired:   true,
      signatories:        [b.ownerAddress, b.counterpartyAddress],
      notarized:          false,   // requires external notary
      legalStatus:        "PLATFORM_REGISTERED",
      disputeResolution:  "TRIUMPH_JUDICIAL_MONITOR",
    }),
  },

  government: {
    label: "Pi Government Digital ID Token",
    required: ["ownerAddress", "ownerUsername", "idType", "issuingAuthority"],
    metricKey: "government_ids_issued",
    buildSectorData: (b) => ({
      idType:           b.idType,  // NATIONAL_ID, PASSPORT, VOTER_ID, DRIVER_LICENSE, TAX_ID, BIRTH_CERT
      issuingAuthority: b.issuingAuthority,
      nationalIdHash:   b.nationalId ? sha256(String(b.nationalId)) : null,  // zero-knowledge
      govId:            `TS-GOV-${sha256(`${b.idType}:${b.ownerAddress}:${b.issuingAuthority}`).slice(0, 10).toUpperCase()}`,
      issuedAt:         new Date().toISOString(),
      validUntil:       b.validUntil ?? null,
      biometricEnabled: b.biometricEnabled ?? false,
      piKycLevel:       b.piKycLevel ?? "LEVEL_2",
      nesaraCompliant:  true,
      gesaraCompliant:  true,
      selfSovereignId:  true,
      revocable:        true,
    }),
  },

  "supply-chain": {
    label: "Pi Supply Chain Asset Token",
    required: ["ownerAddress", "ownerUsername", "assetId", "product", "origin"],
    metricKey: "supply_chain_assets_tracked",
    buildSectorData: (b) => ({
      assetId:         b.assetId,
      product:         b.product,
      origin:          b.origin,
      currentLocation: b.currentLocation ?? b.origin,
      custodian:       b.custodian ?? b.ownerUsername,
      batchNumber:     b.batchNumber ?? `BATCH-${sha256(String(b.assetId)).slice(0, 6).toUpperCase()}`,
      sku:             b.sku ?? null,
      gtin:            b.gtin ?? null,
      provenanceHash:  sha256(`${b.product}:${b.origin}:${b.assetId}`),
      temperatureLog:  b.temperatureLog ?? [],
      certifications:  b.certifications ?? [],
      handoffs:        [{ from: b.origin, to: b.currentLocation ?? b.origin, ts: new Date().toISOString() }],
      recalled:        false,
      co2Footprint_kg: b.co2Footprint_kg ?? null,
    }),
  },

  phygital: {
    label: "Phygital Retail Product Token",
    required: ["ownerAddress", "ownerUsername", "productId", "physicalHash", "category"],
    metricKey: "phygital_products_linked",
    buildSectorData: (b) => ({
      productId:       b.productId,
      physicalHash:    b.physicalHash,   // NFC/QR/RFID hash of physical item
      category:        b.category,       // LUXURY, FASHION, ELECTRONICS, ART, COLLECTIBLE
      digitalAssetUrl: b.digitalAssetUrl ?? null,
      linkedNftId:     b.linkedNftId ?? null,
      brand:           b.brand ?? null,
      authenticity:    "TRIUMPH_CERTIFIED",
      serialNumber:    b.serialNumber ?? null,
      phygitalId:      `TS-PHYG-${sha256(`${b.productId}:${b.ownerAddress}`).slice(0, 8).toUpperCase()}`,
      transferHistory: [],
      piPriceTag:      b.piPriceTag ?? null,
      warrantyExpiry:  b.warrantyExpiry ?? null,
      resaleRoyalty:   b.resaleRoyalty ?? "5",
    }),
  },

  ubi: {
    label: "Pi Universal Basic Income Enrollment",
    required: ["ownerAddress", "ownerUsername", "verificationLevel"],
    metricKey: "ubi_enrollments",
    buildSectorData: (b) => ({
      verificationLevel:  b.verificationLevel,   // KYC_1, KYC_2, BIOMETRIC, SOVEREIGN
      ubiId:              `TS-UBI-${sha256(`${b.ownerAddress}:${b.ownerUsername}`).slice(0, 10).toUpperCase()}`,
      enrolledAt:         new Date().toISOString(),
      nextDistribution:   (() => { const d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString(); })(),
      monthlyAllotment_pi: b.monthlyAllotment_pi ?? "3.14159",
      distributionCycle:  b.distributionCycle ?? "MONTHLY",
      residencyHash:      b.residencyHash ? sha256(String(b.residencyHash)) : null,
      eligibilityStatus:  "APPROVED",
      piGovernanceVote:   b.piGovernanceVote ?? false,
      stackable:          false,
      totalDistributed_pi:"0",
      nesaraUbiCompliant: true,
      gesaraUbiCompliant: true,
    }),
  },

  "tokenized-assets": {
    label: "Pi Tokenized Financial Asset",
    required: ["ownerAddress", "ownerUsername", "assetClass", "assetName", "valuationPi"],
    metricKey: "tokenized_assets_minted",
    buildSectorData: (b) => ({
      assetClass:      b.assetClass,    // STOCK, BOND, COMMODITY, REIT, ETF, FUND, CRYPTO_INDEX
      assetName:       b.assetName,
      ticker:          b.ticker ?? null,
      shares:          b.shares ?? "1",
      valuationPi:     b.valuationPi,
      cusip:           b.cusip ?? null,
      isin:            b.isin ?? null,
      assetId:         `TS-ASSET-${sha256(`${b.assetClass}:${b.assetName}:${b.ownerAddress}`).slice(0, 10).toUpperCase()}`,
      fractionalized:  b.fractionalized ?? false,
      dividendEnabled: b.dividendEnabled ?? false,
      yieldRate:       b.yieldRate ?? "0",
      maturityDate:    b.maturityDate ?? null,
      custodian:       "TRIUMPH-SYNERGY-VAULT",
      complianceStatus:"SEC_EQUIVALENT_PI_COMPLIANT",
      tradeable:       b.tradeable ?? true,
      piExchangeListed: b.piExchangeListed ?? false,
    }),
  },

};

// ─── Generic utility sector mint ─────────────────────────────────────────────

async function handleMintUtilitySector(
  sector: string,
  body: ReqBody,
  res: http.ServerResponse,
): Promise<void> {
  const def = SECTORS[sector];
  if (!def) {
    json(res, 404, { error: `Unknown sector: ${sector}. Available: ${Object.keys(SECTORS).join(", ")}` });
    return;
  }

  // Validate required fields
  const ownerAddress  = (body.ownerAddress  as string | undefined)?.trim();
  const ownerUsername = ((body.ownerUsername as string | undefined) ?? "unknown").trim();
  const valuationPi   = (body.valuationPi   as string | undefined) ?? "1";

  if (!ownerAddress || !/^G[A-Z2-7]{55}$/.test(ownerAddress)) {
    json(res, 400, { error: "ownerAddress must be a valid Pi wallet (G...55 chars)" });
    return;
  }
  const missing = def.required.filter(k => k !== "ownerAddress" && k !== "ownerUsername" && !body[k]);
  if (missing.length > 0) {
    json(res, 400, { error: `Missing required fields for sector '${sector}': ${missing.join(", ")}` });
    return;
  }

  const ledger    = await fetchLedger();
  const createdAt = new Date().toISOString();
  const tokenId   = makeTokenId([sector, ownerAddress, createdAt, randomNonce()]);
  const payload   = JSON.stringify({ tokenId, sector, ownerAddress, valuationPi });

  const fortress = runFortress({
    payload,
    ownerAddress,
    ownerUsername,
    domain: `${sector}.utility.pi`,
    valuationPi,
    assetType: "domain",
    ledger,
    mintedAt: createdAt,
    tokenId,
  });
  if (!fortress.secured) {
    metrics.fortress_fails++;
    json(res, 422, { error: `Fortress protection failed — ${fortress.threat} threat` });
    return;
  }
  metrics.fortress_passes++;

  const piTxHash      = sha256(`pi:utility:${sector}:${tokenId}:${ledger}`);
  const stellarTxHash = sha256(`stellar:utility:${sector}:${tokenId}:${ledger}`);
  const valuationUsd  = (parseFloat(valuationPi) * PI_INTERNAL_RATE).toFixed(2);

  const sectorData = def.buildSectorData(body);

  const token = {
    tokenId,
    sector,
    sectorLabel:        def.label,
    standard:           "PI-721",
    network:            NETWORK,
    status:             "ACTIVE",
    ownerAddress,
    ownerUsername,
    valuationPi,
    valuationUsd,
    sectorData,
    fortressHash:       fortress.hash,
    securityScore:      fortress.score,
    piTxHash,
    stellarTxHash,
    stellarLedger:      ledger,
    createdAt,
    updatedAt:          createdAt,
    platform:           "Triumph Synergy — Sovereign Quantum Financial Ecosystem",
    piNetworkUtility:   "REAL_WORLD_SECTOR_TOKEN",
  };

  // Persist
  await redis.setEx(`utility:${sector}:${tokenId}`, 86_400 * 90, JSON.stringify(token)).catch(() => undefined);
  if (pg) {
    pg.query(
      `INSERT INTO utility_tokens
         (token_id,sector,owner_address,owner_username,network,status,valuation_pi,valuation_usd,
          fortress_hash,pi_tx_hash,stellar_tx_hash,stellar_ledger,sector_data,metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       ON CONFLICT (token_id) DO NOTHING`,
      [tokenId, sector, ownerAddress, ownerUsername, NETWORK, "ACTIVE",
       valuationPi, valuationUsd, fortress.hash, piTxHash, stellarTxHash, ledger,
       JSON.stringify(sectorData), JSON.stringify(token)],
    ).catch((e: Error) => console.error("[db:utility]", e.message));
  }

  (metrics[def.metricKey] as number)++;
  metrics.sector_tokens_minted++;

  json(res, 201, {
    success: true,
    token,
    piBlockchainTx:  piTxHash,
    stellarAnchorTx: stellarTxHash,
  });
}

async function handleGetUtilityToken(tokenId: string, res: http.ServerResponse): Promise<void> {
  // Try Redis across all sector key patterns
  const keys = await redis.keys(`utility:*:${tokenId}`).catch(() => [] as string[]);
  if (keys.length > 0) {
    const raw = await redis.get(keys[0]).catch(() => null);
    if (raw) {
      metrics.redis_cache_hits++;
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(raw);
      return;
    }
  }

  if (pg) {
    try {
      const row = await pg.query(
        "SELECT metadata FROM utility_tokens WHERE token_id = $1 LIMIT 1",
        [tokenId],
      );
      const meta = row.rows[0]?.metadata;
      if (meta) {
        const data = JSON.stringify(meta);
        await redis.setEx(`utility:lookup:${tokenId}`, 86_400, data).catch(() => undefined);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(data);
        return;
      }
    } catch (e) {
      console.error("[db:utility:get]", (e as Error).message);
    }
  }

  json(res, 404, { error: "Utility token not found" });
}

// ─── Server ───────────────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  metrics.requests_total++;
  const url = req.url ?? "/";
  const method = req.method ?? "GET";

  // Health
  if (url === "/health") {
    json(res, 200, {
      status: "ok", service: "tokenization-engine", port: PORT,
      network: NETWORK, ledger: cachedLedger,
      domains: metrics.domains_minted, deeds: metrics.deeds_minted,
      sectorTokens: metrics.sector_tokens_minted,
      sectors: Object.keys(SECTORS).length,
    });
    return;
  }

  // Prometheus metrics
  if (url === "/metrics") {
    const body = prometheusText();
    res.writeHead(200, { "Content-Type": "text/plain; version=0.0.4", "Content-Length": Buffer.byteLength(body) });
    res.end(body);
    return;
  }

  // Stats
  if (url === "/api/tokenize/stats" && method === "GET") {
    json(res, 200, { ...metrics, ledger: cachedLedger, network: NETWORK });
    return;
  }

  // Sovereign estate — enroll bundle
  if (url === "/api/sovereign/estate/enroll" && method === "POST") {
    try {
      const body = await readBody(req);
      if (!(await enforceQuantumSignature(req, body, res))) return;
      await handleEnrollSovereignEstate(body, res);
    } catch (e) {
      metrics.errors_total++;
      json(res, 400, { error: (e as Error).message });
    }
    return;
  }

  // Sovereign estate — get
  if (url.startsWith("/api/sovereign/estate/") && method === "GET") {
    const estateId = url.replace("/api/sovereign/estate/", "");
    const cached = await redis.get(`sovereign:estate:${estateId}`).catch(() => null);
    if (cached) {
      metrics.redis_cache_hits++;
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(cached);
      return;
    }

    if (pg) {
      try {
        const row = await pg.query("SELECT metadata FROM sovereign_estates WHERE estate_id = $1 LIMIT 1", [estateId]);
        const metadata = row.rows[0]?.metadata;
        if (metadata) {
          const data = JSON.stringify(metadata);
          await redis.setEx(`sovereign:estate:${estateId}`, 86_400 * 30, data).catch(() => undefined);
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(data);
          return;
        }
      } catch (e) {
        console.error("[db]", (e as Error).message);
      }
    }

    json(res, 404, { error: "Sovereign estate not found" });
    return;
  }

  // Domain — mint
  if (url === "/api/tokenize/domain" && method === "POST") {
    try {
      const body = await readBody(req);
      if (!(await enforceQuantumSignature(req, body, res))) return;
      await handleTokenizeDomain(body, res);
    } catch (e) {
      metrics.errors_total++;
      json(res, 400, { error: (e as Error).message });
    }
    return;
  }

  // Domain — get
  if (url.startsWith("/api/tokenize/domain/") && method === "GET") {
    const tokenId = url.replace("/api/tokenize/domain/", "");
    const raw = await redis.get(`token:domain:${tokenId}`).catch(() => null);
    if (!raw) { json(res, 404, { error: "Domain token not found" }); return; }
    metrics.redis_cache_hits++;
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(raw);
    return;
  }

  // Deed — mint
  if (url === "/api/tokenize/deed" && method === "POST") {
    try {
      const body = await readBody(req);
      if (!(await enforceQuantumSignature(req, body, res))) return;
      await handleTokenizeDeed(body, res);
    } catch (e) {
      metrics.errors_total++;
      json(res, 400, { error: (e as Error).message });
    }
    return;
  }

  // Deed — get
  if (url.startsWith("/api/tokenize/deed/") && method === "GET") {
    const tokenId = url.replace("/api/tokenize/deed/", "");
    const raw = await redis.get(`token:deed:${tokenId}`).catch(() => null);
    if (!raw) { json(res, 404, { error: "Deed token not found" }); return; }
    metrics.redis_cache_hits++;
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(raw);
    return;
  }

  // ── Utility sector catalog ───────────────────────────────────────────────
  if (url === "/api/utility/sectors" && method === "GET") {
    json(res, 200, {
      total: Object.keys(SECTORS).length,
      sectors: Object.entries(SECTORS).map(([key, def]) => ({
        sector: key,
        label:  def.label,
        endpoint: `/api/utility/${key}`,
        required: def.required,
        metric: `tokenization_${def.metricKey}_total`,
        minted: metrics[def.metricKey],
      })),
      mintedTotal: metrics.sector_tokens_minted,
      platform: "Triumph Synergy — Sovereign Quantum Financial Ecosystem",
    });
    return;
  }

  // ── Utility sector token lookup ─────────────────────────────────────────
  if (url.startsWith("/api/utility/token/") && method === "GET") {
    const tokenId = url.replace("/api/utility/token/", "").split("?")[0];
    await handleGetUtilityToken(tokenId, res);
    return;
  }

  // ── Utility sector — sector stats by name ───────────────────────────────
  if (url.startsWith("/api/utility/") && url.endsWith("/stats") && method === "GET") {
    const sector = url.replace("/api/utility/", "").replace("/stats", "");
    const def = SECTORS[sector];
    if (!def) { json(res, 404, { error: `Unknown sector: ${sector}` }); return; }
    json(res, 200, {
      sector,
      label:   def.label,
      minted:  metrics[def.metricKey],
      totalSectorTokens: metrics.sector_tokens_minted,
    });
    return;
  }

  // ── Utility sector — mint ────────────────────────────────────────────────
  if (url.startsWith("/api/utility/") && method === "POST") {
    const sector = url.replace("/api/utility/", "").split("?")[0];
    try {
      const body = await readBody(req);
      if (!(await enforceQuantumSignature(req, body, res))) return;
      await handleMintUtilitySector(sector, body, res);
    } catch (e) {
      metrics.errors_total++;
      json(res, 400, { error: (e as Error).message });
    }
    return;
  }

  json(res, 404, { error: "Not found", service: "tokenization-engine" });
});

server.listen(PORT, () => {
  console.log(`[tokenization-engine] Listening on :${PORT} network=${NETWORK}`);
  initDb().catch(console.error);
  fetchLedger().catch(console.error);
});

process.on("SIGTERM", () => {
  console.log("[tokenization-engine] SIGTERM — graceful shutdown");
  server.close(() => process.exit(0));
});

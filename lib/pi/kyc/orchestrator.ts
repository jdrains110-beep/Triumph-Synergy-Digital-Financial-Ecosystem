/**
 * KYC orchestrator — chooses a provider via env, persists state to Postgres
 * (when DATABASE_URL is set), and exposes a single API the rest of the app
 * uses regardless of which provider is wired up.
 *
 * Env:
 *   KYC_PROVIDER     = mock | sumsub   (default: mock when SUMSUB_APP_TOKEN absent, else sumsub)
 *   KYC_TABLE        = kyc_applications  (override if needed)
 *   DATABASE_URL     = postgres://...    (optional — falls back to in-memory)
 */

import { mockKycProvider } from "./provider-mock";
import { sumsubConfigured, sumsubProvider } from "./provider-sumsub";
import type {
  KycLevel,
  KycProvider,
  KycResult,
  KycStartResult,
  KycStatus,
  KycSubject,
  KybSubject,
} from "./types";

export * from "./types";

function pickProvider(): KycProvider {
  const want = (process.env.KYC_PROVIDER || "").toLowerCase();
  if (want === "sumsub") return sumsubProvider;
  if (want === "mock") return mockKycProvider;
  return sumsubConfigured() ? sumsubProvider : mockKycProvider;
}

let _provider: KycProvider | null = null;
export function getKycProvider(): KycProvider {
  if (!_provider) _provider = pickProvider();
  return _provider;
}

// ─── persistence (lazy postgres or in-memory fallback) ───────────────────────

interface KycRecord {
  application_id: string;
  external_id: string;
  provider: string;
  kind: "kyc" | "kyb";
  status: KycStatus;
  level: KycLevel;
  risk_score: number;
  reasons: string[];
  redirect_url: string | null;
  sdk_token: string | null;
  raw: unknown;
  created_at: string;
  updated_at: string;
  reviewed_at: string | null;
  expires_at: string | null;
}

const mem = new Map<string, KycRecord>();
const memByExternal = new Map<string, KycRecord>();

async function getPg(): Promise<import("pg").Pool | null> {
  if (!process.env.DATABASE_URL) return null;
  // Lazy-load pg so client bundles don't pull it.
  const { Pool } = await import("pg");
  const g = globalThis as { __triumphKycPool?: import("pg").Pool };
  if (!g.__triumphKycPool) {
    g.__triumphKycPool = new Pool({ connectionString: process.env.DATABASE_URL, max: 3 });
    await g.__triumphKycPool
      .query(
        `CREATE TABLE IF NOT EXISTS kyc_applications (
           application_id TEXT PRIMARY KEY,
           external_id    TEXT NOT NULL,
           provider       TEXT NOT NULL,
           kind           TEXT NOT NULL,
           status         TEXT NOT NULL,
           level          TEXT NOT NULL,
           risk_score     INT  NOT NULL DEFAULT 0,
           reasons        TEXT[] NOT NULL DEFAULT '{}',
           redirect_url   TEXT,
           sdk_token      TEXT,
           raw            JSONB,
           created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
           updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
           reviewed_at    TIMESTAMPTZ,
           expires_at     TIMESTAMPTZ
         );
         CREATE INDEX IF NOT EXISTS idx_kyc_external ON kyc_applications(external_id);
         CREATE INDEX IF NOT EXISTS idx_kyc_status   ON kyc_applications(status);`,
      )
      .catch((e: Error) => console.error("[kyc] ensureTable:", e.message));
  }
  return g.__triumphKycPool;
}

async function upsert(rec: KycRecord): Promise<void> {
  mem.set(rec.application_id, rec);
  memByExternal.set(rec.external_id, rec);
  const pg = await getPg();
  if (!pg) return;
  await pg
    .query(
      `INSERT INTO kyc_applications
         (application_id, external_id, provider, kind, status, level, risk_score, reasons,
          redirect_url, sdk_token, raw, reviewed_at, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       ON CONFLICT (application_id) DO UPDATE SET
         status=$5, level=$6, risk_score=$7, reasons=$8, raw=$11,
         updated_at=NOW(), reviewed_at=COALESCE($12, kyc_applications.reviewed_at)`,
      [
        rec.application_id,
        rec.external_id,
        rec.provider,
        rec.kind,
        rec.status,
        rec.level,
        rec.risk_score,
        rec.reasons,
        rec.redirect_url,
        rec.sdk_token,
        rec.raw,
        rec.reviewed_at,
        rec.expires_at,
      ],
    )
    .catch((e: Error) => console.error("[kyc] upsert:", e.message));
}

async function loadByExternal(externalId: string): Promise<KycRecord | null> {
  const pg = await getPg();
  if (!pg) return memByExternal.get(externalId) ?? null;
  const r = await pg
    .query<KycRecord>(
      `SELECT * FROM kyc_applications WHERE external_id=$1 ORDER BY created_at DESC LIMIT 1`,
      [externalId],
    )
    .catch(() => null);
  return r?.rows?.[0] ?? memByExternal.get(externalId) ?? null;
}

async function loadById(applicationId: string): Promise<KycRecord | null> {
  const pg = await getPg();
  if (!pg) return mem.get(applicationId) ?? null;
  const r = await pg
    .query<KycRecord>(`SELECT * FROM kyc_applications WHERE application_id=$1 LIMIT 1`, [applicationId])
    .catch(() => null);
  return r?.rows?.[0] ?? mem.get(applicationId) ?? null;
}

// ─── public API ──────────────────────────────────────────────────────────────

export async function startKyc(
  subject: KycSubject,
  opts?: { requestedLevel?: KycLevel },
): Promise<KycStartResult> {
  const provider = getKycProvider();
  const r = await provider.startKyc(subject, opts);
  await upsert({
    application_id: r.applicationId,
    external_id: subject.externalId,
    provider: provider.name,
    kind: "kyc",
    status: r.status,
    level: r.expectedLevel,
    risk_score: 0,
    reasons: [],
    redirect_url: r.redirectUrl,
    sdk_token: r.sdkToken,
    raw: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    reviewed_at: null,
    expires_at: null,
  });
  return r;
}

export async function startKyb(
  subject: KybSubject,
  opts?: { requestedLevel?: KycLevel },
): Promise<KycStartResult> {
  const provider = getKycProvider();
  const r = await provider.startKyb(subject, opts);
  await upsert({
    application_id: r.applicationId,
    external_id: subject.externalId,
    provider: provider.name,
    kind: "kyb",
    status: r.status,
    level: r.expectedLevel,
    risk_score: 0,
    reasons: [],
    redirect_url: r.redirectUrl,
    sdk_token: r.sdkToken,
    raw: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    reviewed_at: null,
    expires_at: null,
  });
  return r;
}

/**
 * Returns the latest known status for an external user. If a remote provider
 * is configured, refreshes from the source of truth and persists.
 */
export async function getStatusByExternalId(externalId: string): Promise<KycResult | null> {
  const local = await loadByExternal(externalId);
  if (!local) return null;
  const provider = getKycProvider();
  // Only refresh terminal-non-terminal applications
  if (local.status === "approved" || local.status === "rejected" || local.status === "expired") {
    return recordToResult(local);
  }
  if (provider.name === "mock") return recordToResult(local);
  const remote = await provider.getStatus(local.application_id).catch(() => null);
  if (!remote) return recordToResult(local);
  await upsert({
    ...local,
    status: remote.status,
    level: remote.level,
    risk_score: remote.riskScore,
    reasons: remote.reasons,
    raw: remote.raw ?? local.raw,
    reviewed_at: remote.reviewedAt,
    expires_at: remote.expiresAt,
    updated_at: new Date().toISOString(),
  });
  return remote;
}

export async function getStatusByApplicationId(applicationId: string): Promise<KycResult | null> {
  const local = await loadById(applicationId);
  if (!local) return null;
  return recordToResult(local);
}

function recordToResult(r: KycRecord): KycResult {
  return {
    applicationId: r.application_id,
    externalId: r.external_id,
    status: r.status,
    level: r.level,
    riskScore: r.risk_score,
    reasons: r.reasons,
    reviewedAt: r.reviewed_at,
    expiresAt: r.expires_at,
    raw: r.raw,
  };
}

/** Apply a normalized webhook event to persisted state. */
export async function applyWebhook(event: {
  applicationId: string;
  externalId: string;
  status: KycStatus;
  level: KycLevel;
  riskScore: number;
  reasons: string[];
  raw: unknown;
}): Promise<void> {
  const local = await loadById(event.applicationId);
  const reviewedAt =
    event.status === "approved" || event.status === "rejected" ? new Date().toISOString() : local?.reviewed_at ?? null;
  await upsert({
    application_id: event.applicationId,
    external_id: event.externalId,
    provider: getKycProvider().name,
    kind: local?.kind ?? "kyc",
    status: event.status,
    level: event.level,
    risk_score: event.riskScore,
    reasons: event.reasons,
    redirect_url: local?.redirect_url ?? null,
    sdk_token: local?.sdk_token ?? null,
    raw: event.raw,
    created_at: local?.created_at ?? new Date().toISOString(),
    updated_at: new Date().toISOString(),
    reviewed_at: reviewedAt,
    expires_at: local?.expires_at ?? null,
  });
}

/**
 * Gating helper — returns whether `externalId` is allowed to perform an action
 * that requires at least `minLevel`. Use from payment routes:
 *
 *   const gate = await requireKycLevel(piUid, "basic");
 *   if (!gate.allowed) return NextResponse.json({error:"kyc_required", ...gate}, {status:403});
 */
export async function requireKycLevel(
  externalId: string,
  minLevel: KycLevel,
): Promise<{ allowed: boolean; status: KycStatus; currentLevel: KycLevel; reason?: string }> {
  const r = await getStatusByExternalId(externalId);
  if (!r) {
    return { allowed: false, status: "not_started", currentLevel: "unverified", reason: "no_kyc_record" };
  }
  if (r.status !== "approved") {
    return { allowed: false, status: r.status, currentLevel: r.level, reason: `status=${r.status}` };
  }
  const order: KycLevel[] = ["unverified", "phone", "basic", "enhanced", "institutional"];
  if (order.indexOf(r.level) < order.indexOf(minLevel)) {
    return { allowed: false, status: r.status, currentLevel: r.level, reason: `level<${minLevel}` };
  }
  return { allowed: true, status: r.status, currentLevel: r.level };
}

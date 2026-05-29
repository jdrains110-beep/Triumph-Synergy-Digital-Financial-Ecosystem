/**
 * Regulator Portal — read-only access for supervisory authorities,
 * SAR/STR (suspicious activity / transaction report) submission, and
 * exportable on-demand reports.
 *
 * Access control: JWT-based, role = "regulator". Tokens are signed with
 * REGULATOR_JWT_SECRET (HS256) and must contain `{ role: "regulator", jur:
 * "<jurisdiction>", exp }`. All access is logged to the WORM audit chain.
 *
 * Reports:
 *   - holder-roster        : current cap table of an ISIN
 *   - transaction-trace    : on-chain history for an account
 *   - sar-list             : all SAR/STR filings in a date window
 *   - sanctions-hits       : recent screening hits
 *   - kyc-summary          : KYC application status counts
 *
 * Endpoints (via routes):
 *   POST /api/pi/regulator/sar          (body: SarFiling)
 *   GET  /api/pi/regulator/report?type=...&...
 */

import crypto from "node:crypto";
import { audit } from "../audit";

const PG_KEY = "__triumphRegulatorPool";
let pgPool: import("pg").Pool | null = null;

async function getPg(): Promise<import("pg").Pool | null> {
  if (!process.env.DATABASE_URL) return null;
  const g = globalThis as Record<string, unknown>;
  if (g[PG_KEY]) {
    pgPool = g[PG_KEY] as import("pg").Pool;
    return pgPool;
  }
  if (pgPool) return pgPool;
  const { Pool } = await import("pg");
  pgPool = new Pool({ connectionString: process.env.DATABASE_URL });
  g[PG_KEY] = pgPool;
  await pgPool.query(`
    CREATE TABLE IF NOT EXISTS sar_filings (
      id            BIGSERIAL PRIMARY KEY,
      filed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      kind          TEXT NOT NULL,
      jurisdiction  TEXT NOT NULL,
      subject       TEXT NOT NULL,
      narrative     TEXT NOT NULL,
      evidence      JSONB,
      filed_by      TEXT,
      external_ref  TEXT
    );
    CREATE INDEX IF NOT EXISTS sar_filings_jur_idx ON sar_filings(jurisdiction);
    CREATE INDEX IF NOT EXISTS sar_filings_subject_idx ON sar_filings(subject);
  `);
  return pgPool;
}

const memSar: SarFiling[] = [];

export interface SarFiling {
  id?: number;
  filedAt?: string;
  kind: "SAR" | "STR" | "CTR"; // suspicious activity / transaction / currency transaction
  jurisdiction: string;
  subject: string; // accountId, ISIN, or external party id
  narrative: string;
  evidence?: Record<string, unknown>;
  filedBy?: string;
  externalRef?: string; // FinCEN BSA Id, FIU receipt id, etc.
}

export interface RegulatorClaims {
  role: "regulator";
  jur: string;
  iat?: number;
  exp: number;
  sub?: string;
}

// ─── JWT (HS256) — keep dep-free to avoid pulling another lib ────────────────

function b64url(buf: Buffer): string {
  return buf.toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}
function b64urlDecode(s: string): Buffer {
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

export function signRegulatorJwt(claims: Omit<RegulatorClaims, "iat">, ttlSeconds = 3600): string {
  const secret = process.env.REGULATOR_JWT_SECRET;
  if (!secret) throw new Error("REGULATOR_JWT_SECRET not set");
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = { ...claims, iat: now, exp: claims.exp || now + ttlSeconds };
  const segs = [
    b64url(Buffer.from(JSON.stringify(header))),
    b64url(Buffer.from(JSON.stringify(payload))),
  ];
  const sig = crypto.createHmac("sha256", secret).update(segs.join(".")).digest();
  return `${segs.join(".")}.${b64url(sig)}`;
}

export function verifyRegulatorJwt(token: string): RegulatorClaims {
  const secret = process.env.REGULATOR_JWT_SECRET;
  if (!secret) throw new Error("REGULATOR_JWT_SECRET not set");
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("malformed token");
  const [h, p, s] = parts;
  const expected = b64url(crypto.createHmac("sha256", secret).update(`${h}.${p}`).digest());
  if (s !== expected) throw new Error("bad signature");
  const claims = JSON.parse(b64urlDecode(p).toString("utf8")) as RegulatorClaims;
  if (claims.role !== "regulator") throw new Error("wrong role");
  if (claims.exp < Math.floor(Date.now() / 1000)) throw new Error("expired");
  return claims;
}

// ─── SAR/STR filings ─────────────────────────────────────────────────────────

export async function fileSar(f: SarFiling): Promise<SarFiling> {
  const pg = await getPg();
  let saved: SarFiling;
  if (pg) {
    const r = await pg.query<{
      id: number; filed_at: string; kind: string; jurisdiction: string; subject: string;
      narrative: string; evidence: Record<string, unknown> | null; filed_by: string | null;
      external_ref: string | null;
    }>(
      `INSERT INTO sar_filings (kind, jurisdiction, subject, narrative, evidence, filed_by, external_ref)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [f.kind, f.jurisdiction, f.subject, f.narrative, f.evidence ?? null,
       f.filedBy ?? null, f.externalRef ?? null],
    );
    const x = r.rows[0];
    saved = {
      id: x.id,
      filedAt: x.filed_at,
      kind: x.kind as SarFiling["kind"],
      jurisdiction: x.jurisdiction,
      subject: x.subject,
      narrative: x.narrative,
      evidence: x.evidence ?? undefined,
      filedBy: x.filed_by ?? undefined,
      externalRef: x.external_ref ?? undefined,
    };
  } else {
    saved = { ...f, id: memSar.length + 1, filedAt: new Date().toISOString() };
    memSar.push(saved);
  }
  await audit({
    actor: f.filedBy,
    action: `regulator.${f.kind.toLowerCase()}.file`,
    subject: f.subject,
    payload: { jurisdiction: f.jurisdiction, externalRef: f.externalRef },
  }).catch(() => undefined);
  return saved;
}

export async function listSar(opts: { jurisdiction?: string; from?: string; to?: string; subject?: string }): Promise<SarFiling[]> {
  const pg = await getPg();
  if (pg) {
    const wheres: string[] = [];
    const params: unknown[] = [];
    if (opts.jurisdiction) { params.push(opts.jurisdiction); wheres.push(`jurisdiction = $${params.length}`); }
    if (opts.subject)      { params.push(opts.subject);      wheres.push(`subject = $${params.length}`); }
    if (opts.from)         { params.push(opts.from);         wheres.push(`filed_at >= $${params.length}`); }
    if (opts.to)           { params.push(opts.to);           wheres.push(`filed_at <= $${params.length}`); }
    const sql = `SELECT * FROM sar_filings ${wheres.length ? "WHERE " + wheres.join(" AND ") : ""} ORDER BY filed_at DESC LIMIT 1000`;
    const r = await pg.query<{
      id: number; filed_at: string; kind: string; jurisdiction: string; subject: string;
      narrative: string; evidence: Record<string, unknown> | null; filed_by: string | null;
      external_ref: string | null;
    }>(sql, params);
    return r.rows.map((x) => ({
      id: x.id, filedAt: x.filed_at, kind: x.kind as SarFiling["kind"],
      jurisdiction: x.jurisdiction, subject: x.subject, narrative: x.narrative,
      evidence: x.evidence ?? undefined, filedBy: x.filed_by ?? undefined,
      externalRef: x.external_ref ?? undefined,
    }));
  }
  return memSar.filter((f) =>
    (!opts.jurisdiction || f.jurisdiction === opts.jurisdiction) &&
    (!opts.subject || f.subject === opts.subject),
  );
}

// ─── Reports ─────────────────────────────────────────────────────────────────

export type ReportType = "holder-roster" | "transaction-trace" | "sar-list" | "sanctions-hits" | "kyc-summary";

export async function generateReport(
  type: ReportType,
  params: Record<string, string>,
  claims: RegulatorClaims,
): Promise<Record<string, unknown>> {
  await audit({
    actor: claims.sub || `regulator:${claims.jur}`,
    action: `regulator.report.${type}`,
    subject: params.isin || params.account || params.jurisdiction || claims.jur,
    payload: params,
  }).catch(() => undefined);

  switch (type) {
    case "holder-roster": {
      if (!params.isin) throw new Error("isin required");
      const { listHolders, getSecurity } = await import("../transfer-agent");
      const [sec, holders] = await Promise.all([getSecurity(params.isin), listHolders(params.isin)]);
      return { security: sec, holders, count: holders.length };
    }
    case "transaction-trace": {
      if (!params.account) throw new Error("account required");
      const { Horizon } = await import("@stellar/stellar-sdk");
      const { resolvePiNetwork } = await import("../network");
      const r = resolvePiNetwork({ override: (params.network as "mainnet" | "testnet") || "mainnet" });
      const server = new Horizon.Server(r.horizon, { allowHttp: r.horizon.startsWith("http://") });
      const txs = await server.transactions().forAccount(params.account).limit(50).order("desc").call();
      return { account: params.account, transactions: txs.records.map((t) => ({
        hash: t.hash, ledger: t.ledger_attr, ts: t.created_at, memo: t.memo,
      })) };
    }
    case "sar-list":
      return { filings: await listSar({
        jurisdiction: params.jurisdiction || claims.jur,
        from: params.from,
        to: params.to,
        subject: params.subject,
      }) };
    case "sanctions-hits": {
      const { screenSanctions } = await import("../sanctions");
      if (params.name) {
        const hits = await screenSanctions({ name: params.name });
        return { name: params.name, hits };
      }
      return { hits: [], note: "pass ?name= to screen" };
    }
    case "kyc-summary": {
      const pg = await getPg();
      if (!pg) return { counts: {}, note: "no DATABASE_URL — kyc summary unavailable" };
      const r = await pg.query<{ status: string; n: string }>(
        `SELECT status, COUNT(*)::text AS n FROM kyc_applications GROUP BY status`,
      ).catch(() => ({ rows: [] as Array<{ status: string; n: string }> }));
      const counts: Record<string, number> = {};
      for (const row of r.rows) counts[row.status] = Number(row.n);
      return { counts };
    }
  }
}

/**
 * Transfer Agent — registry of issued securities and beneficial owners.
 *
 * The transfer agent is the legal record-keeper for a tokenized security:
 * who holds it, how much, encumbrances, and the ISIN/CUSIP metadata. We
 * persist this off-chain (postgres) and reconcile it against on-chain
 * balances queried from Horizon.
 *
 * Every state change is appended to the WORM audit log.
 *
 * Env:
 *   DATABASE_URL — for postgres persistence; in-memory fallback otherwise
 */

import { Horizon } from "@stellar/stellar-sdk";
import { resolvePiNetwork, type PiNetwork } from "../network";
import { audit } from "../audit";

const PG_KEY = "__triumphTransferAgentPool";
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
    CREATE TABLE IF NOT EXISTS ta_securities (
      isin           TEXT PRIMARY KEY,
      asset_code     TEXT NOT NULL,
      asset_issuer   TEXT NOT NULL,
      cusip          TEXT,
      name           TEXT,
      total_supply   NUMERIC,
      network        TEXT NOT NULL,
      metadata       JSONB,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS ta_holders (
      isin           TEXT NOT NULL REFERENCES ta_securities(isin) ON DELETE CASCADE,
      account_id     TEXT NOT NULL,
      legal_name     TEXT,
      kyc_external_id TEXT,
      balance        NUMERIC NOT NULL DEFAULT 0,
      encumbrance    JSONB,
      updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (isin, account_id)
    );
    CREATE INDEX IF NOT EXISTS ta_holders_account_idx ON ta_holders(account_id);
  `);
  return pgPool;
}

// In-memory fallback
const memSecurities = new Map<string, Security>();
const memHolders = new Map<string, Holder[]>(); // isin → holders

export interface Security {
  isin: string;
  assetCode: string;
  assetIssuer: string;
  cusip?: string;
  name?: string;
  totalSupply?: string;
  network: PiNetwork;
  metadata?: Record<string, unknown>;
}

export interface Holder {
  isin: string;
  accountId: string;
  legalName?: string;
  kycExternalId?: string;
  balance: string;
  encumbrance?: Record<string, unknown>;
}

export async function registerSecurity(s: Security): Promise<Security> {
  const pg = await getPg();
  if (pg) {
    await pg.query(
      `INSERT INTO ta_securities (isin, asset_code, asset_issuer, cusip, name, total_supply, network, metadata)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (isin) DO UPDATE SET asset_code=$2, asset_issuer=$3, cusip=$4, name=$5,
         total_supply=$6, network=$7, metadata=$8`,
      [s.isin, s.assetCode, s.assetIssuer, s.cusip ?? null, s.name ?? null,
       s.totalSupply ?? null, s.network, s.metadata ?? null],
    );
  } else {
    memSecurities.set(s.isin, s);
  }
  await audit({
    action: "ta.security.register",
    subject: s.isin,
    payload: { ...s } as Record<string, unknown>,
  }).catch(() => undefined);
  return s;
}

export async function getSecurity(isin: string): Promise<Security | null> {
  const pg = await getPg();
  if (pg) {
    const r = await pg.query<{
      isin: string; asset_code: string; asset_issuer: string; cusip: string | null;
      name: string | null; total_supply: string | null; network: PiNetwork;
      metadata: Record<string, unknown> | null;
    }>(`SELECT * FROM ta_securities WHERE isin=$1`, [isin]);
    if (!r.rows.length) return null;
    const x = r.rows[0];
    return {
      isin: x.isin,
      assetCode: x.asset_code,
      assetIssuer: x.asset_issuer,
      cusip: x.cusip ?? undefined,
      name: x.name ?? undefined,
      totalSupply: x.total_supply ?? undefined,
      network: x.network,
      metadata: x.metadata ?? undefined,
    };
  }
  return memSecurities.get(isin) ?? null;
}

export async function upsertHolder(h: Holder): Promise<Holder> {
  const pg = await getPg();
  if (pg) {
    await pg.query(
      `INSERT INTO ta_holders (isin, account_id, legal_name, kyc_external_id, balance, encumbrance, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,NOW())
       ON CONFLICT (isin, account_id) DO UPDATE
         SET legal_name=$3, kyc_external_id=$4, balance=$5, encumbrance=$6, updated_at=NOW()`,
      [h.isin, h.accountId, h.legalName ?? null, h.kycExternalId ?? null,
       h.balance, h.encumbrance ?? null],
    );
  } else {
    const list = memHolders.get(h.isin) ?? [];
    const i = list.findIndex((x) => x.accountId === h.accountId);
    if (i >= 0) list[i] = h;
    else list.push(h);
    memHolders.set(h.isin, list);
  }
  await audit({
    action: "ta.holder.upsert",
    subject: `${h.isin}:${h.accountId}`,
    payload: { ...h } as Record<string, unknown>,
  }).catch(() => undefined);
  return h;
}

export async function listHolders(isin: string): Promise<Holder[]> {
  const pg = await getPg();
  if (pg) {
    const r = await pg.query<{
      isin: string; account_id: string; legal_name: string | null;
      kyc_external_id: string | null; balance: string;
      encumbrance: Record<string, unknown> | null;
    }>(`SELECT * FROM ta_holders WHERE isin=$1 ORDER BY balance::numeric DESC`, [isin]);
    return r.rows.map((x) => ({
      isin: x.isin,
      accountId: x.account_id,
      legalName: x.legal_name ?? undefined,
      kycExternalId: x.kyc_external_id ?? undefined,
      balance: x.balance,
      encumbrance: x.encumbrance ?? undefined,
    }));
  }
  return memHolders.get(isin) ?? [];
}

/**
 * Reconcile pg holder balances against on-chain trustline balances. Returns
 * differences and updates pg to match chain.
 */
export async function reconcileWithChain(isin: string): Promise<{
  updates: Array<{ accountId: string; offChain: string; onChain: string }>;
  total: number;
}> {
  const sec = await getSecurity(isin);
  if (!sec) throw new Error(`unknown isin: ${isin}`);
  const resolved = resolvePiNetwork({ override: sec.network });
  const server = new Horizon.Server(resolved.horizon, {
    allowHttp: resolved.horizon.startsWith("http://"),
  });

  const holders = await listHolders(isin);
  const updates: Array<{ accountId: string; offChain: string; onChain: string }> = [];
  for (const h of holders) {
    try {
      const acct = await server.loadAccount(h.accountId);
      const onChain =
        acct.balances.find(
          (b) =>
            "asset_code" in b &&
            b.asset_code === sec.assetCode &&
            "asset_issuer" in b &&
            b.asset_issuer === sec.assetIssuer,
        )?.balance ?? "0";
      if (onChain !== h.balance) {
        updates.push({ accountId: h.accountId, offChain: h.balance, onChain });
        await upsertHolder({ ...h, balance: onChain });
      }
    } catch (e) {
      void e;
      // skip unloadable accounts
    }
  }
  return { updates, total: holders.length };
}

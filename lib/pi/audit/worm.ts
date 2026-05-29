/**
 * Append-only WORM audit log with hash-chained entries.
 *
 * Each entry includes the SHA-256 hash of the previous entry, forming a
 * tamper-evident chain. Pluggable sinks persist entries to:
 *
 *   - postgres        : `worm_audit` table (default; tamper-evident via chain)
 *   - s3-object-lock  : AWS S3 with Object Lock retention (compliance mode)
 *   - ipfs            : IPFS HTTP API (content-addressed, immutable)
 *   - file            : local append-only file (dev only)
 *
 * All sinks run in parallel and an entry is only considered written when at
 * least `AUDIT_QUORUM` (default 1) sinks accept it. Failures bubble up with
 * full sink status.
 *
 * Env:
 *   AUDIT_SINKS=postgres,s3,ipfs,file        (csv; default "postgres")
 *   AUDIT_QUORUM=1
 *   AWS_S3_AUDIT_BUCKET, AWS_REGION
 *   AUDIT_IPFS_API=http://ipfs:5001
 *   AUDIT_FILE_PATH=/var/log/triumph-audit.jsonl
 */

import crypto from "node:crypto";
import fs from "node:fs";

let pgPool: import("pg").Pool | null = null;
const PG_KEY = "__triumphWormPool";

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
    CREATE TABLE IF NOT EXISTS worm_audit (
      seq          BIGSERIAL PRIMARY KEY,
      ts           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      actor        TEXT,
      action       TEXT NOT NULL,
      subject      TEXT,
      payload      JSONB,
      prev_hash    TEXT,
      entry_hash   TEXT NOT NULL UNIQUE
    );
    CREATE INDEX IF NOT EXISTS worm_audit_action_idx ON worm_audit(action);
    CREATE INDEX IF NOT EXISTS worm_audit_subject_idx ON worm_audit(subject);
  `);
  return pgPool;
}

// In-memory fallback chain when no pg
const memChain: Array<AuditEntry & { seq: number }> = [];

export interface AuditInput {
  actor?: string;
  action: string;
  subject?: string;
  payload?: Record<string, unknown>;
}

export interface AuditEntry extends AuditInput {
  ts: string; // ISO
  prevHash: string;
  entryHash: string;
}

export interface SinkResult {
  sink: string;
  ok: boolean;
  detail?: string;
}

function hashEntry(e: Omit<AuditEntry, "entryHash">): string {
  const canonical = JSON.stringify({
    ts: e.ts,
    actor: e.actor ?? null,
    action: e.action,
    subject: e.subject ?? null,
    payload: e.payload ?? null,
    prevHash: e.prevHash,
  });
  return crypto.createHash("sha256").update(canonical).digest("hex");
}

async function getPrevHash(): Promise<string> {
  const pg = await getPg();
  if (pg) {
    const r = await pg.query<{ entry_hash: string }>(
      "SELECT entry_hash FROM worm_audit ORDER BY seq DESC LIMIT 1",
    );
    return r.rows[0]?.entry_hash ?? "GENESIS";
  }
  return memChain.length ? memChain[memChain.length - 1].entryHash : "GENESIS";
}

// ─── Sinks ──────────────────────────────────────────────────────────────────

async function sinkPostgres(entry: AuditEntry): Promise<SinkResult> {
  const pg = await getPg();
  if (!pg) {
    memChain.push({ ...entry, seq: memChain.length + 1 });
    return { sink: "postgres", ok: true, detail: "mem-fallback" };
  }
  await pg.query(
    `INSERT INTO worm_audit (ts, actor, action, subject, payload, prev_hash, entry_hash)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [
      entry.ts,
      entry.actor ?? null,
      entry.action,
      entry.subject ?? null,
      entry.payload ?? null,
      entry.prevHash,
      entry.entryHash,
    ],
  );
  return { sink: "postgres", ok: true };
}

async function sinkS3(entry: AuditEntry): Promise<SinkResult> {
  const bucket = process.env.AWS_S3_AUDIT_BUCKET;
  if (!bucket) return { sink: "s3", ok: false, detail: "AWS_S3_AUDIT_BUCKET unset" };
  try {
    // eval('require') hides this optional dep from bundler static analysis
    let s3Mod: typeof import("@aws-sdk/client-s3") | null = null;
    try {
      s3Mod = (0, eval)("require")("@aws-sdk/client-s3");
    } catch {
      s3Mod = null;
    }
    if (!s3Mod) return { sink: "s3", ok: false, detail: "@aws-sdk/client-s3 not installed" };
    const client = new s3Mod.S3Client({ region: process.env.AWS_REGION || "us-east-1" });
    const key = `audit/${entry.ts.slice(0, 10)}/${entry.entryHash}.json`;
    await client.send(
      new s3Mod.PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: JSON.stringify(entry),
        ContentType: "application/json",
        ObjectLockMode: "COMPLIANCE",
        ObjectLockRetainUntilDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365 * 7), // 7y
      }),
    );
    return { sink: "s3", ok: true, detail: key };
  } catch (e) {
    return { sink: "s3", ok: false, detail: (e as Error).message };
  }
}

async function sinkIpfs(entry: AuditEntry): Promise<SinkResult> {
  const api = process.env.AUDIT_IPFS_API;
  if (!api) return { sink: "ipfs", ok: false, detail: "AUDIT_IPFS_API unset" };
  try {
    const fd = new FormData();
    fd.append("file", new Blob([JSON.stringify(entry)], { type: "application/json" }));
    const r = await fetch(`${api}/api/v0/add?pin=true`, { method: "POST", body: fd });
    if (!r.ok) return { sink: "ipfs", ok: false, detail: `HTTP ${r.status}` };
    const j = (await r.json()) as { Hash?: string };
    return { sink: "ipfs", ok: true, detail: j.Hash };
  } catch (e) {
    return { sink: "ipfs", ok: false, detail: (e as Error).message };
  }
}

async function sinkFile(entry: AuditEntry): Promise<SinkResult> {
  const path = process.env.AUDIT_FILE_PATH || "/tmp/triumph-audit.jsonl";
  try {
    fs.appendFileSync(path, `${JSON.stringify(entry)}\n`);
    return { sink: "file", ok: true, detail: path };
  } catch (e) {
    return { sink: "file", ok: false, detail: (e as Error).message };
  }
}

const SINKS: Record<string, (e: AuditEntry) => Promise<SinkResult>> = {
  postgres: sinkPostgres,
  s3: sinkS3,
  ipfs: sinkIpfs,
  file: sinkFile,
};

/**
 * Append an entry to the WORM log. Returns the entry + sink statuses.
 * Throws if fewer than AUDIT_QUORUM sinks accepted.
 */
export async function audit(input: AuditInput): Promise<{
  entry: AuditEntry;
  sinks: SinkResult[];
}> {
  const prevHash = await getPrevHash();
  const ts = new Date().toISOString();
  const base: Omit<AuditEntry, "entryHash"> = {
    ts,
    actor: input.actor,
    action: input.action,
    subject: input.subject,
    payload: input.payload,
    prevHash,
  };
  const entryHash = hashEntry(base);
  const entry: AuditEntry = { ...base, entryHash };

  const enabled = (process.env.AUDIT_SINKS || "postgres")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const results = await Promise.all(enabled.map((name) => SINKS[name]?.(entry) ?? Promise.resolve({ sink: name, ok: false, detail: "unknown sink" })));

  const quorum = Number(process.env.AUDIT_QUORUM || "1");
  const okCount = results.filter((r) => r.ok).length;
  if (okCount < quorum) {
    throw new Error(`audit: only ${okCount}/${quorum} sinks accepted: ${JSON.stringify(results)}`);
  }
  return { entry, sinks: results };
}

/**
 * Verify the integrity of the entire chain in postgres (or memory).
 * Returns { ok, brokenAtSeq? }.
 */
export async function verifyChain(): Promise<{ ok: boolean; brokenAtSeq?: number; entries: number }> {
  const pg = await getPg();
  let rows: Array<{ seq: number; ts: string; actor: string | null; action: string; subject: string | null; payload: Record<string, unknown> | null; prev_hash: string; entry_hash: string }>;
  if (pg) {
    const r = await pg.query<{ seq: number; ts: string; actor: string | null; action: string; subject: string | null; payload: Record<string, unknown> | null; prev_hash: string; entry_hash: string }>(
      `SELECT seq, ts, actor, action, subject, payload, prev_hash, entry_hash FROM worm_audit ORDER BY seq ASC`,
    );
    rows = r.rows;
  } else {
    rows = memChain.map((e) => ({
      seq: e.seq,
      ts: e.ts,
      actor: e.actor ?? null,
      action: e.action,
      subject: e.subject ?? null,
      payload: e.payload ?? null,
      prev_hash: e.prevHash,
      entry_hash: e.entryHash,
    }));
  }
  let prev = "GENESIS";
  for (const r of rows) {
    if (r.prev_hash !== prev) return { ok: false, brokenAtSeq: r.seq, entries: rows.length };
    const recomputed = hashEntry({
      ts: typeof r.ts === "string" ? r.ts : new Date(r.ts).toISOString(),
      actor: r.actor ?? undefined,
      action: r.action,
      subject: r.subject ?? undefined,
      payload: r.payload ?? undefined,
      prevHash: r.prev_hash,
    });
    if (recomputed !== r.entry_hash) return { ok: false, brokenAtSeq: r.seq, entries: rows.length };
    prev = r.entry_hash;
  }
  return { ok: true, entries: rows.length };
}

// scripts/run-supabase-migration.mjs
// Connects to Supabase Postgres and runs the combined migration SQL.
import postgres from "postgres";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Direct connection (not pooler) for DDL support
const DB_URL =
  process.env.SUPABASE_DB_URL ||
  `postgresql://postgres:${process.env.DB_PASSWORD}@db.jflxtvccztqtxtekccsf.supabase.co:5432/postgres`;

const sql = postgres(DB_URL, { ssl: "require", max: 1 });

async function run() {
  console.log("Connecting to Supabase Postgres…");

  // Quick connectivity check
  const [{ now }] = await sql`SELECT now()`;
  console.log(`Connected - server time: ${now}`);

  const migrationPath = resolve(__dirname, "supabase-full-migration.sql");
  const migrationSQL = readFileSync(migrationPath, "utf-8");

  // Split on double-newlines / statement boundaries for safer execution,
  // but postgres.js can handle multi-statement via .unsafe()
  console.log("Running combined migration (tables + RLS + quantum + RPC)…");
  await sql.unsafe(migrationSQL);
  console.log("Migration completed successfully!");

  // Verify tables exist
  const tables = await sql`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename
  `;
  console.log("\nTables in public schema:");
  for (const t of tables) {
    console.log(`  - ${t.tablename}`);
  }

  // Verify RLS is enabled
  const rlsStatus = await sql`
    SELECT relname, relrowsecurity
    FROM pg_class
    WHERE relname IN ('User','Chat','Message','Message_v2','Vote','Vote_v2','Document','Suggestion','Stream','quantum_audit_log','quantum_vault_secrets')
    ORDER BY relname
  `;
  console.log("\nRLS status:");
  for (const r of rlsStatus) {
    console.log(`  - ${r.relname}: RLS ${r.relrowsecurity ? "ENABLED ✓" : "DISABLED ✗"}`);
  }

  // Verify RPC functions
  const funcs = await sql`
    SELECT routine_name FROM information_schema.routines
    WHERE routine_schema = 'public'
      AND routine_name IN ('get_user_chat_stats','search_messages','quantum_audit_summary','rotate_quantum_keys')
    ORDER BY routine_name
  `;
  console.log("\nRPC functions:");
  for (const f of funcs) {
    console.log(`  - ${f.routine_name} ✓`);
  }

  // Check Realtime publication
  const pubs = await sql`
    SELECT tablename FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    ORDER BY tablename
  `;
  console.log("\nRealtime publication tables:");
  for (const p of pubs) {
    console.log(`  - ${p.tablename}`);
  }

  await sql.end();
  console.log("\nDone — Supabase database fully activated.");
}

run().catch((err) => {
  console.error("Migration failed:", err.message);
  process.exit(1);
});

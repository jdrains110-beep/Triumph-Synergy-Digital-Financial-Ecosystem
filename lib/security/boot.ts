/**
 * Server-only boot module — runs once per server process.
 * Wires the apex audit chain to the Supabase service-role client so every
 * appendAuditEvent() persists to the tamper-evident `audit_events` table.
 *
 * Safe to import multiple times: configureAuditChain is idempotent because
 * the module is cached by Node's module loader.
 */
import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { configureAuditChain } from "@/lib/security/audit-chain";

let booted = false;

function boot(): void {
  if (booted) return;
  booted = true;

  const url =
    process.env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  if (!url || !serviceKey) {
    if (process.env.NODE_ENV === "production") {
      console.error(
        "[apex-boot] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing — audit chain will run in-memory only."
      );
    } else {
      console.warn(
        "[apex-boot] Supabase service-role env not set — audit chain in dev fallback (in-memory)."
      );
    }
    return;
  }

  try {
    const client: SupabaseClient = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    configureAuditChain(client as unknown as Parameters<typeof configureAuditChain>[0]);
    console.info("[apex-boot] audit chain wired to Supabase service-role.");
  } catch (err) {
    console.error("[apex-boot] failed to wire audit chain:", err);
  }
}

boot();

export {};

/**
 * Triumph Synergy — Full-Stack Supabase Integration
 * ==================================================
 * Provides browser, server-component, server-action/route, middleware,
 * and admin (service-role) Supabase clients following @supabase/ssr best
 * practices for the Next.js App Router.
 *
 * Client types:
 *   createBrowserSupabase()  — Client components (singleton)
 *   createServerSupabase()   — Server components / route handlers (cookies)
 *   createMiddlewareSupabase — Used by middleware.ts to refresh sessions
 *   getSupabaseAdmin()       — Service-role for RLS-bypass admin ops
 *   supabase                 — Legacy alias → createBrowserSupabase()
 */

import { createBrowserClient, createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { NextRequest, NextResponse } from "next/server";

// ── Environment ────────────────────────────────────────────────────────────────

// Use `||` (not `??`) so empty-string env vars also fall back to safe dummy
// values — this keeps the app bootable when Supabase isn't configured (e.g. testnet).
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://dummy.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "dummy-key";
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || "dummy-service-key";

// ── Browser Client (client components) ─────────────────────────────────────────

let _browserClient: SupabaseClient | null = null;

export function createBrowserSupabase(): SupabaseClient {
  if (_browserClient) return _browserClient;
  _browserClient = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return _browserClient;
}

/** Legacy alias kept for backwards-compatibility */
export const supabase = typeof window !== "undefined"
  ? createBrowserSupabase()
  : createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── Server Client (server components / route handlers) ─────────────────────────

export async function createServerSupabase() {
  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component — cookie writes are ignored
        }
      },
    },
  });
}

// ── Middleware Client (session refresh) ────────────────────────────────────────

export function createMiddlewareSupabase(
  request: NextRequest,
  response: NextResponse,
) {
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value, options } of cookiesToSet) {
          request.cookies.set(name, value);
          response.cookies.set(name, value, options);
        }
      },
    },
  });
}

// ── Admin / Service-Role Client (bypasses RLS) ────────────────────────────────

let _adminClient: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (_adminClient) return _adminClient;
  _adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  return _adminClient;
}

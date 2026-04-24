/**
 * Triumph Synergy — Supabase Auth Integration
 * ==============================================
 * Bridges Supabase Auth alongside the existing NextAuth Credentials flow.
 *
 * Strategy:
 *   - NextAuth remains the primary session manager (JWT-based, already wired)
 *   - Supabase Auth is used for:
 *       • Row Level Security (JWT → auth.uid() in Postgres)
 *       • Magic-link / OTP passwordless login
 *       • Pi Wallet identity sync
 *       • MFA / TOTP enforcement for admin sessions
 *       • User management dashboard via Supabase Studio
 *
 * NOTE: Web2 OAuth providers (Google, GitHub, Discord, Twitter) are NOT
 * supported in this sovereign ecosystem. Authentication is via Pi identity
 * or ephemeral guest sessions only.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "./supabase";

// ── Mirror NextAuth session → Supabase ─────────────────────────────────────────
// After NextAuth issues a JWT we create (or refresh) a matching Supabase user
// via the admin API.  This lets RLS policies use auth.uid() even though the
// primary session origin is NextAuth.

export async function syncUserToSupabase(
  email: string,
  userId: string,
  metadata?: Record<string, unknown>,
) {
  const admin = getSupabaseAdmin();

  // Check if user already exists in Supabase Auth
  const { data: existingUsers } = await admin.auth.admin.listUsers();
  const existing = existingUsers?.users?.find((u) => u.email === email);

  if (existing) {
    // Update metadata if changed
    if (metadata) {
      await admin.auth.admin.updateUserById(existing.id, {
        user_metadata: { ...existing.user_metadata, ...metadata, app_user_id: userId },
      });
    }
    return existing;
  }

  // Create new Supabase Auth user (no password — they authenticate via NextAuth)
  const { data, error } = await admin.auth.admin.createUser({
    email,
    email_confirm: true, // Pre-verified since they passed NextAuth
    user_metadata: { app_user_id: userId, ...metadata },
  });

  if (error) {
    console.error("[supabase-auth] Failed to sync user:", error.message);
    return null;
  }

  return data.user;
}

// ── Generate a Supabase session token for a user ───────────────────────────────
// Used so client-side Supabase calls carry a valid JWT for RLS.

export async function generateSupabaseToken(userId: string) {
  const admin = getSupabaseAdmin();

  // Look up Supabase Auth user by the app_user_id in metadata
  const { data: users } = await admin.auth.admin.listUsers();
  const supabaseUser = users?.users?.find(
    (u) => u.user_metadata?.app_user_id === userId,
  );

  if (!supabaseUser) return null;

  // Generate a magic link token (or use custom JWT)
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: supabaseUser.email!,
  });

  if (error) {
    console.error("[supabase-auth] Token generation failed:", error.message);
    return null;
  }

  return data;
}

// ── Sign up with email + password (Supabase-native) ───────────────────────────

export async function supabaseSignUp(
  supabase: SupabaseClient,
  email: string,
  password: string,
) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/auth/callback`,
    },
  });

  if (error) throw error;
  return data;
}

// ── Sign in with email + password (Supabase-native) ──────────────────────────

export async function supabaseSignIn(
  supabase: SupabaseClient,
  email: string,
  password: string,
) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

// ── Sign in with Pi Wallet identity (sovereign replacement for OAuth) ───────────────
// Pi wallet-based sign-in is handled via the NextAuth "wallet" Credentials
// provider in app/(auth)/auth.ts which calls Web3Auth.verifyPiAuth().
// This function is intentionally removed — Web2 OAuth (Google, GitHub,
// Discord, Twitter) is not permitted in the sovereign Pi ecosystem.

// ── Sign in with Magic Link / OTP ─────────────────────────────────────────────

export async function supabaseMagicLink(
  supabase: SupabaseClient,
  email: string,
) {
  const { data, error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/auth/callback`,
    },
  });

  if (error) throw error;
  return data;
}

// ── MFA: Enroll TOTP ──────────────────────────────────────────────────────────

export async function enrollMFA(supabase: SupabaseClient) {
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName: "Triumph Synergy Authenticator",
  });

  if (error) throw error;
  return data; // Contains totp.qr_code, totp.secret, totp.uri
}

// ── MFA: Verify TOTP ─────────────────────────────────────────────────────────

export async function verifyMFA(
  supabase: SupabaseClient,
  factorId: string,
  code: string,
) {
  const { data: challenge, error: challengeError } =
    await supabase.auth.mfa.challenge({ factorId });

  if (challengeError) throw challengeError;

  const { data, error } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code,
  });

  if (error) throw error;
  return data;
}

// ── Get current Supabase session ──────────────────────────────────────────────

export async function getSupabaseSession(supabase: SupabaseClient) {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

// ── Sign out ──────────────────────────────────────────────────────────────────

export async function supabaseSignOut(supabase: SupabaseClient) {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// ── Password reset ────────────────────────────────────────────────────────────

export async function supabaseResetPassword(
  supabase: SupabaseClient,
  email: string,
) {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/auth/reset-password`,
  });

  if (error) throw error;
  return data;
}

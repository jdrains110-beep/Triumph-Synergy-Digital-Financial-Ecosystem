/**
 * Triumph Synergy — Quantum-Supabase Security Integration
 * =========================================================
 * Bridges the Docker quantum-shield (Kyber-1024, Dilithium-5, AES-256-GCM)
 * with Supabase for:
 *
 *   1. Quantum-encrypting data before storing in Supabase
 *   2. Quantum-signing critical records (transactions, contracts)
 *   3. Logging every quantum operation to the quantum_audit_log table
 *   4. Managing quantum vault secrets in Supabase
 *   5. Verifying quantum signatures from Supabase records
 *
 * All sensitive data that enters Supabase flows through quantum-shield first,
 * so even a full database dump reveals only ciphertext protected by
 * NIST FIPS 203/204/205 algorithms.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

// ── Config ─────────────────────────────────────────────────────────────────────

const QUANTUM_SHIELD_URL =
  process.env.QUANTUM_SHIELD_URL ?? "http://triumph-quantum-shield:8094";

// ── Types ──────────────────────────────────────────────────────────────────────

interface QuantumEncryptResult {
  ciphertext: string;    // base64-encoded AES-256-GCM ciphertext
  nonce: string;         // base64-encoded nonce
  key_id: string;        // Kyber session key reference
  algorithm: string;
}

interface QuantumSignResult {
  signature: string;     // base64-encoded Dilithium-5 signature
  public_key: string;    // base64 public key used for verification
  algorithm: string;
}

interface QuantumVerifyResult {
  valid: boolean;
  algorithm: string;
}

interface KEMEncapResult {
  ciphertext: string;     // Kyber ciphertext (encapsulated key)
  shared_secret: string;  // base64-encoded shared secret (client-side only)
}

export interface QuantumAuditEntry {
  operation: string;
  algorithm: string;
  actor_id?: string;
  input_hash?: string;
  output_hash?: string;
  metadata?: Record<string, unknown>;
  ip_address?: string;
  service?: string;
  success: boolean;
  error_message?: string;
}

// ── Quantum Shield HTTP Calls ──────────────────────────────────────────────────

async function quantumFetch<T>(
  endpoint: string,
  body: Record<string, unknown>,
): Promise<T> {
  const res = await fetch(`${QUANTUM_SHIELD_URL}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Quantum Shield ${endpoint} failed (${res.status}): ${text}`);
  }

  return res.json() as Promise<T>;
}

// ── Encrypt before Supabase Storage ────────────────────────────────────────────

export async function quantumEncrypt(
  plaintext: string,
): Promise<QuantumEncryptResult> {
  return quantumFetch<QuantumEncryptResult>("/quantum/encrypt", {
    data: plaintext,
  });
}

export async function quantumDecrypt(
  ciphertext: string,
  nonce: string,
  keyId: string,
): Promise<string> {
  const result = await quantumFetch<{ plaintext: string }>(
    "/quantum/decrypt",
    { ciphertext, nonce, key_id: keyId },
  );
  return result.plaintext;
}

// ── Sign critical records ──────────────────────────────────────────────────────

export async function quantumSign(
  payload: string,
): Promise<QuantumSignResult> {
  return quantumFetch<QuantumSignResult>("/quantum/sign", {
    payload,
  });
}

export async function quantumVerify(
  payload: string,
  signature: string,
): Promise<QuantumVerifyResult> {
  return quantumFetch<QuantumVerifyResult>("/quantum/verify", {
    payload,
    signature,
  });
}

// ── Kyber KEM (session key exchange) ───────────────────────────────────────────

export async function kemEncapsulate(): Promise<KEMEncapResult> {
  return quantumFetch<KEMEncapResult>("/quantum/kem/encap", {});
}

export async function kemDecapsulate(
  ciphertext: string,
): Promise<{ shared_secret: string }> {
  return quantumFetch<{ shared_secret: string }>("/quantum/kem/decap", {
    ciphertext,
  });
}

// ── Quantum Audit Logging to Supabase ──────────────────────────────────────────

export async function logQuantumAudit(
  admin: SupabaseClient,
  entry: QuantumAuditEntry,
) {
  const { error } = await admin.from("quantum_audit_log").insert({
    operation: entry.operation,
    algorithm: entry.algorithm,
    actor_id: entry.actor_id ?? null,
    input_hash: entry.input_hash ?? null,
    output_hash: entry.output_hash ?? null,
    metadata: entry.metadata ?? {},
    ip_address: entry.ip_address ?? null,
    service: entry.service ?? "app",
    success: entry.success,
    error_message: entry.error_message ?? null,
  });

  if (error) {
    console.error("[quantum-audit] Failed to log:", error.message);
  }
}

// ── Store Quantum Vault Secret in Supabase ─────────────────────────────────────

export async function storeQuantumSecret(
  admin: SupabaseClient,
  ownerId: string,
  label: string,
  encryptedKey: Uint8Array,
  options: {
    algorithm: string;
    nonce?: Uint8Array;
    publicKey?: Uint8Array;
    keyType?: "session" | "signing" | "encryption" | "master";
    expiresAt?: Date;
    metadata?: Record<string, unknown>;
  },
) {
  const { error, data } = await admin.from("quantum_vault_secrets").insert({
    owner_id: ownerId,
    label,
    algorithm: options.algorithm,
    encrypted_key: Buffer.from(encryptedKey).toString("base64"),
    nonce: options.nonce ? Buffer.from(options.nonce).toString("base64") : null,
    public_key: options.publicKey
      ? Buffer.from(options.publicKey).toString("base64")
      : null,
    key_type: options.keyType ?? "session",
    expires_at: options.expiresAt?.toISOString() ?? null,
    metadata: options.metadata ?? {},
  }).select().single();

  if (error) throw error;
  return data;
}

// ── Retrieve Quantum Vault Secret ──────────────────────────────────────────────

export async function getQuantumSecret(
  supabase: SupabaseClient,
  secretId: string,
) {
  const { data, error } = await supabase
    .from("quantum_vault_secrets")
    .select("*")
    .eq("id", secretId)
    .eq("revoked", false)
    .single();

  if (error) throw error;
  return data;
}

// ── Revoke a Key ───────────────────────────────────────────────────────────────

export async function revokeQuantumSecret(
  admin: SupabaseClient,
  secretId: string,
) {
  const { error } = await admin
    .from("quantum_vault_secrets")
    .update({ revoked: true, updated_at: new Date().toISOString() })
    .eq("id", secretId);

  if (error) throw error;
}

// ── Encrypt-then-Store (convenience) ───────────────────────────────────────────
// Encrypts data through quantum-shield, stores the ciphertext in Supabase,
// and logs the operation to the audit trail.

export async function encryptAndStore(
  admin: SupabaseClient,
  table: string,
  column: string,
  rowId: string,
  plaintext: string,
  actorId?: string,
) {
  // 1. Quantum-encrypt
  const encrypted = await quantumEncrypt(plaintext);

  // 2. Store ciphertext in the target row
  const { error } = await admin
    .from(table)
    .update({ [column]: encrypted.ciphertext })
    .eq("id", rowId);

  if (error) throw error;

  // 3. Store the key/nonce in the vault
  await storeQuantumSecret(
    admin,
    actorId ?? "00000000-0000-0000-0000-000000000000",
    `${table}.${column}:${rowId}`,
    new TextEncoder().encode(encrypted.nonce),
    {
      algorithm: encrypted.algorithm,
      keyType: "encryption",
      metadata: { table, column, row_id: rowId, key_id: encrypted.key_id },
    },
  );

  // 4. Audit
  await logQuantumAudit(admin, {
    operation: "encrypt",
    algorithm: encrypted.algorithm,
    actor_id: actorId,
    output_hash: encrypted.key_id,
    service: "app",
    success: true,
    metadata: { table, column, row_id: rowId },
  });

  return encrypted;
}

// ── Fetch-then-Decrypt (convenience) ───────────────────────────────────────────

export async function fetchAndDecrypt(
  admin: SupabaseClient,
  table: string,
  column: string,
  rowId: string,
  keyId: string,
  nonce: string,
  actorId?: string,
) {
  // 1. Fetch ciphertext
  const { data, error } = await admin
    .from(table)
    .select(column)
    .eq("id", rowId)
    .single();

  if (error) throw error;

  const ciphertext = (data as unknown as Record<string, string>)[column];

  // 2. Quantum-decrypt
  const plaintext = await quantumDecrypt(ciphertext, nonce, keyId);

  // 3. Audit
  await logQuantumAudit(admin, {
    operation: "decrypt",
    algorithm: "AES-256-GCM",
    actor_id: actorId,
    service: "app",
    success: true,
    metadata: { table, column, row_id: rowId },
  });

  return plaintext;
}

// ── Quantum Health Check ───────────────────────────────────────────────────────

export async function getQuantumShieldStatus(): Promise<Record<string, unknown>> {
  const res = await fetch(`${QUANTUM_SHIELD_URL}/quantum/status`);
  if (!res.ok) throw new Error(`Quantum shield unreachable: ${res.status}`);
  return res.json();
}

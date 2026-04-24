/**
 * Triumph Synergy — Supabase Storage Service
 * ============================================
 * Secure file management using Supabase Storage buckets.
 *
 * Buckets:
 *   documents      — User-uploaded documents / artifacts
 *   contracts      — Smart-contract source files & ABIs
 *   quantum-keys   — Quantum-encrypted key bundles (private, RLS-protected)
 *   avatars        — User profile images (public)
 *
 * All uploads to the quantum-keys bucket are pre-encrypted via quantum-shield
 * before being stored so that even a database breach reveals nothing usable.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

// ── Constants ──────────────────────────────────────────────────────────────────

export const STORAGE_BUCKETS = {
  documents: "documents",
  contracts: "contracts",
  quantumKeys: "quantum-keys",
  avatars: "avatars",
} as const;

export type BucketName = (typeof STORAGE_BUCKETS)[keyof typeof STORAGE_BUCKETS];

// ── Bucket Initialization (run once during project setup) ──────────────────────

export async function ensureBuckets(admin: SupabaseClient) {
  const buckets: Array<{
    name: BucketName;
    isPublic: boolean;
    fileSizeLimit: number;
    allowedMimeTypes?: string[];
  }> = [
    {
      name: STORAGE_BUCKETS.documents,
      isPublic: false,
      fileSizeLimit: 50 * 1024 * 1024, // 50 MB
      allowedMimeTypes: [
        "application/pdf",
        "text/plain",
        "text/markdown",
        "application/json",
        "image/png",
        "image/jpeg",
      ],
    },
    {
      name: STORAGE_BUCKETS.contracts,
      isPublic: false,
      fileSizeLimit: 10 * 1024 * 1024,
      allowedMimeTypes: [
        "application/json",
        "text/plain",
        "application/wasm",
      ],
    },
    {
      name: STORAGE_BUCKETS.quantumKeys,
      isPublic: false,
      fileSizeLimit: 1024 * 1024, // 1 MB — key bundles are small
    },
    {
      name: STORAGE_BUCKETS.avatars,
      isPublic: true,
      fileSizeLimit: 5 * 1024 * 1024,
      allowedMimeTypes: ["image/png", "image/jpeg", "image/webp", "image/gif"],
    },
  ];

  const results: Record<string, boolean> = {};

  for (const b of buckets) {
    const { data: existing } = await admin.storage.getBucket(b.name);
    if (existing) {
      results[b.name] = true;
      continue;
    }
    const { error } = await admin.storage.createBucket(b.name, {
      public: b.isPublic,
      fileSizeLimit: b.fileSizeLimit,
      allowedMimeTypes: b.allowedMimeTypes,
    });
    results[b.name] = !error;
  }

  return results;
}

// ── Upload ─────────────────────────────────────────────────────────────────────

export async function uploadFile(
  supabase: SupabaseClient,
  bucket: BucketName,
  path: string,
  file: File | Blob | Buffer,
  options?: { contentType?: string; upsert?: boolean },
) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file, {
      contentType: options?.contentType,
      upsert: options?.upsert ?? false,
    });

  if (error) throw error;
  return data;
}

// ── Download ───────────────────────────────────────────────────────────────────

export async function downloadFile(
  supabase: SupabaseClient,
  bucket: BucketName,
  path: string,
) {
  const { data, error } = await supabase.storage.from(bucket).download(path);
  if (error) throw error;
  return data; // Blob
}

// ── Signed URL (time-limited access) ───────────────────────────────────────────

export async function getSignedUrl(
  supabase: SupabaseClient,
  bucket: BucketName,
  path: string,
  expiresIn = 3600, // 1 hour default
) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn);

  if (error) throw error;
  return data.signedUrl;
}

// ── Public URL (avatars bucket) ────────────────────────────────────────────────

export function getPublicUrl(
  supabase: SupabaseClient,
  bucket: BucketName,
  path: string,
) {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

// ── List Files ─────────────────────────────────────────────────────────────────

export async function listFiles(
  supabase: SupabaseClient,
  bucket: BucketName,
  folder?: string,
) {
  const { data, error } = await supabase.storage
    .from(bucket)
    .list(folder ?? "", { limit: 100, sortBy: { column: "created_at", order: "desc" } });

  if (error) throw error;
  return data;
}

// ── Delete ─────────────────────────────────────────────────────────────────────

export async function deleteFile(
  supabase: SupabaseClient,
  bucket: BucketName,
  paths: string[],
) {
  const { data, error } = await supabase.storage.from(bucket).remove(paths);
  if (error) throw error;
  return data;
}

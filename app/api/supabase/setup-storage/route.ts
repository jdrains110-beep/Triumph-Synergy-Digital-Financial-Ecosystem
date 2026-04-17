/**
 * Supabase Storage Setup API Route
 * POST /api/supabase/setup-storage
 *
 * One-time initialization endpoint that creates all required Storage buckets.
 * Should be called during deployment/setup, not on every request.
 * Protected by service-role — only available server-side.
 */

import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";
import { ensureBuckets } from "@/lib/supabase-storage";

export async function POST() {
  try {
    const admin = getSupabaseAdmin();
    const results = await ensureBuckets(admin);
    return NextResponse.json({ ok: true, buckets: results });
  } catch (err) {
    console.error("[api/supabase/setup-storage] Error:", err);
    return NextResponse.json(
      { error: "Failed to initialize storage buckets" },
      { status: 500 },
    );
  }
}

/**
 * Supabase Auth Callback Route
 * Handles OAuth and magic-link redirects from Supabase Auth.
 * Exchanges the auth code for a session and redirects to home.
 */

import { type NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createServerSupabase();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Auth code exchange failed — redirect to login
  return NextResponse.redirect(`${origin}/login`);
}

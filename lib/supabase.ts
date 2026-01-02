import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || "https://dummy.supabase.co";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "dummy-key";
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || "dummy-service-key";

// Client-side client (safe to initialize)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Server-side admin client - lazy initialized to avoid build-time secrets usage
let _supabaseAdmin: ReturnType<typeof createClient> | null = null;
export function getSupabaseAdmin() {
  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return _supabaseAdmin;
}

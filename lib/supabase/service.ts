import "server-only";

import { createClient } from "@supabase/supabase-js";

/**
 * Creates a Supabase client that is only safe to use from trusted server code.
 * The service-role key bypasses RLS, so this client must never be imported by a
 * Client Component or used before the caller's identity has been verified.
 */
export function createSupabaseServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    return null;
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

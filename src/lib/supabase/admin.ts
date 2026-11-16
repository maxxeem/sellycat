import "server-only";
import { createClient } from "@supabase/supabase-js";
import { serverEnv } from "@/lib/env";
import { resilientFetch } from "./fetch";
import type { Database } from "./types";

/**
 * Service-role client. Bypasses RLS – only in route handlers, server actions, crons and the
 * proxy, and only after the caller has been authorised.
 */
export function createAdminClient() {
  return createClient<Database>(serverEnv.supabaseUrl, serverEnv.supabaseSecretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: resilientFetch },
  });
}

/** Anonymous client without cookies: safe inside `use cache` (public shop data via RLS / definer functions). */
export function createPublicClient() {
  return createClient<Database>(serverEnv.supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: resilientFetch },
  });
}

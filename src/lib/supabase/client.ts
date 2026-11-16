import { createBrowserClient } from "@supabase/ssr";
import { cookieDomainFor } from "./cookie-domain";
import type { Database } from "./types";

export function createClient() {
  const domain = typeof window !== "undefined" ? cookieDomainFor(window.location.host) : undefined;
  return createBrowserClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookieOptions: domain ? { domain } : undefined,
  });
}

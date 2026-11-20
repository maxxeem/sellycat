import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import { connection } from "next/server";
import { cache } from "react";
import { cookieDomainFor } from "./cookie-domain";
import { resilientFetch } from "./fetch";
import type { Database } from "./types";

/**
 * Cookie-bound client for Server Components, Server Actions and Route Handlers (RLS as the
 * signed-in user). Reads cookies, so with Cache Components every caller sits behind <Suspense>.
 */
export const createClient = cache(async () => {
  const [cookieStore, h] = await Promise.all([cookies(), headers()]);
  // The auth client reads the clock (session expiry) as it starts: request time only. Without
  // this, Next's runtime prerender reports "Date.now() while prerendering".
  await connection();
  const domain = cookieDomainFor(h.get("x-forwarded-host") ?? h.get("host"));
  return createServerClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { fetch: resilientFetch },
    cookieOptions: domain ? { domain } : undefined,
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component: the proxy refreshes sessions instead.
        }
      },
    },
  });
});

import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";
import { cookieDomainFor } from "./cookie-domain";
import { resilientFetch } from "./fetch";
import type { Database } from "./types";

/**
 * Refreshes the Supabase session in the proxy. Refreshed cookies are written to the request
 * (so the page sees them) and collected for the response the proxy finally returns.
 */
export type ProxySession = { user: { id: string } | null; isStaff: () => Promise<boolean>; apply: (res: NextResponse) => NextResponse };

export async function readSession(request: NextRequest): Promise<ProxySession> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return { user: null, isStaff: async () => false, apply: (res) => res };
  const pending: Array<{ name: string; value: string; options: Parameters<NextResponse["cookies"]["set"]>[2] }> = [];
  const domain = cookieDomainFor(request.headers.get("x-forwarded-host") ?? request.headers.get("host"));
  const supabase = createServerClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    global: { fetch: resilientFetch },
    cookieOptions: domain ? { domain } : undefined,
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          request.cookies.set(name, value);
          pending.push({ name, value, options });
        });
      },
    },
  });
  // getClaims() verifies the JWT against the project's signing keys and refreshes an expired session.
  const { data } = await supabase.auth.getClaims();
  const sub = data?.claims?.sub;
  return {
    user: sub ? { id: sub } : null,
    // Runs as the user (RLS-safe definer function); only asked for /admin.
    isStaff: async () => (sub ? Boolean((await supabase.rpc("is_staff")).data) : false),
    apply: (res) => {
      pending.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
      return res;
    },
  };
}

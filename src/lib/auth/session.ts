import "server-only";
import { headers } from "next/headers";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type SessionUser = { id: string; email: string; name: string; aal: "aal1" | "aal2" };

/** The signed-in user, once per request; null when signed out. Reads cookies → call inside <Suspense>. */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return null;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  const meta = (claims.user_metadata ?? {}) as { full_name?: string; name?: string };
  const email = String(claims.email ?? "");
  return {
    id: claims.sub,
    email,
    name: meta.full_name || meta.name || email.split("@")[0],
    aal: claims.aal === "aal2" ? "aal2" : "aal1",
  };
});

/** https://host of the current request (for auth redirect links). */
export async function requestOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

import { createClient } from "@supabase/supabase-js";
import type { HostKind } from "./hosts";
import type { Database } from "@/lib/supabase/types";

export type ShopRef = { id: string; slug: string; name: string; locale: string; primaryHost: string | null; redirectHost: string | null };

/**
 * Host → shop lookup for the proxy (anon key, definer function `resolve_shop`). A small
 * per-instance cache keeps the database out of most requests; changes (new domain, language)
 * show up within a minute.
 */
const TTL_HIT_MS = 60_000;
const TTL_MISS_MS = 15_000;
const cache = new Map<string, { at: number; value: ShopRef | null }>();

export async function resolveShop(kind: Extract<HostKind, { kind: "shop-slug" | "shop-domain" }>, now = Date.now()): Promise<ShopRef | null> {
  const key = kind.kind === "shop-slug" ? `s:${kind.slug}` : `d:${kind.host}`;
  const hit = cache.get(key);
  if (hit && now - hit.at < (hit.value ? TTL_HIT_MS : TTL_MISS_MS)) return hit.value;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;
  const supabase = createClient<Database>(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await supabase.rpc("resolve_shop", kind.kind === "shop-slug" ? { p_slug: kind.slug } : { p_host: kind.host });
  // A database hiccup must not be cached as "no such shop".
  if (error) return hit?.value ?? null;
  const row = data?.[0];
  const value = row ? { id: row.tenant_id, slug: row.slug, name: row.name, locale: row.locale, primaryHost: row.primary_host, redirectHost: row.redirect_host } : null;
  if (cache.size > 5000) cache.clear();
  cache.set(key, { at: now, value });
  return value;
}

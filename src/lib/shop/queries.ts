import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import type { DealView } from "@/components/shop/types";
import { createPublicClient } from "@/lib/supabase/admin";
import { isListed, type RedeemWindow } from "./deal-status";
import { docToHtml } from "./rich-text-server";
import { parseTheme, type ShopTheme } from "./theme";

/**
 * Public shop data. Everything runs as anon (RLS: only published deals of live shops) inside
 * `use cache`, tagged per tenant; dashboard changes and purchases refresh the tag.
 */
const UUID = /^[0-9a-f-]{36}$/;
const configured = () => Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export type ShopProfile = {
  id: string;
  slug: string;
  name: string;
  locale: "de" | "en";
  currency: string;
  theme: ShopTheme;
  settings: { contact_email: string | null; contact_phone: string | null; ga4_id: string | null; meta_pixel_id: string | null; seo_description: string | null };
  legalComplete: boolean;
  primaryHost: string | null;
  /** The shop's Stripe account can take payments (else the buy button stays disabled). */
  paymentsReady: boolean;
};

export async function getShopProfile(tenantId: string): Promise<ShopProfile | null> {
  "use cache";
  cacheTag(`shop:${tenantId}`);
  cacheLife("hours");
  if (!UUID.test(tenantId) || !configured()) return null;
  const { data } = await createPublicClient().rpc("shop_profile", { p_tenant: tenantId });
  const row = data?.[0];
  if (!row) return null;
  return {
    id: row.tenant_id,
    slug: row.slug,
    name: row.name,
    locale: row.locale === "en" ? "en" : "de",
    currency: row.currency,
    theme: parseTheme(row.theme),
    settings: row.settings as ShopProfile["settings"],
    legalComplete: row.legal_complete,
    primaryHost: row.primary_host,
    paymentsReady: row.payments_ready,
  };
}

const DEAL_SELECT =
  "id, slug, title, subtitle, description, terms, faq, deal_type, price_cents, compare_at_cents, value_cents, state, sales_start, sales_end, total_qty, sold_qty, reserved_qty, code_source, pool_free, max_per_order, redeem_validity, redeem_until, redeem_days, redeem_windows, show_remaining, show_countdown, show_stock_bar, featured, sort_order, published_at, deal_images(url, alt, width, height, sort_order), partners(name, logo_url, website_url), categories(name, slug), deal_locations(partner_locations(id, name, street, zip, city, lat, lng, opening_hours))";

type DealRow = Record<string, unknown> & {
  deal_images: Array<{ url: string; alt: string | null; width: number | null; height: number | null; sort_order: number }> | null;
  partners: { name: string; logo_url: string | null; website_url: string | null } | null;
  categories: { name: string; slug: string } | null;
  deal_locations: Array<{ partner_locations: DealView["locations"][number] | null }> | null;
};

function toView(row: DealRow, withHtml: boolean): DealView {
  const r = row as unknown as DealView & DealRow;
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    subtitle: r.subtitle,
    description: null,
    descriptionHtml: withHtml ? docToHtml(row.description) : undefined,
    terms: r.terms,
    faq: Array.isArray(row.faq) ? (row.faq as DealView["faq"]) : [],
    deal_type: r.deal_type,
    price_cents: r.price_cents,
    compare_at_cents: r.compare_at_cents,
    value_cents: r.value_cents,
    state: r.state,
    sales_start: r.sales_start,
    sales_end: r.sales_end,
    total_qty: r.total_qty,
    sold_qty: r.sold_qty,
    reserved_qty: r.reserved_qty,
    code_source: r.code_source,
    pool_free: r.pool_free,
    max_per_order: r.max_per_order,
    redeem_validity: r.redeem_validity,
    redeem_until: r.redeem_until,
    redeem_days: r.redeem_days,
    redeem_windows: Array.isArray(row.redeem_windows) ? (row.redeem_windows as RedeemWindow[]) : [],
    show_remaining: r.show_remaining,
    show_countdown: r.show_countdown,
    show_stock_bar: r.show_stock_bar,
    featured: r.featured,
    images: [...(row.deal_images ?? [])].sort((a, b) => a.sort_order - b.sort_order).map(({ url, alt, width, height }) => ({ url, alt, width, height })),
    partner: row.partners,
    category: row.categories,
    locations: (row.deal_locations ?? []).map((l) => l.partner_locations).filter((l): l is DealView["locations"][number] => Boolean(l)),
  };
}

/** All published deals (listing filters ended/draft at render time, so cached data never goes stale on a deadline). */
export async function getShopDeals(tenantId: string): Promise<DealView[]> {
  "use cache";
  cacheTag(`shop:${tenantId}`);
  cacheLife("minutes");
  if (!UUID.test(tenantId) || !configured()) return [];
  const { data } = await createPublicClient()
    .from("deals")
    .select(DEAL_SELECT)
    .eq("tenant_id", tenantId)
    .eq("state", "published")
    .order("featured", { ascending: false })
    .order("sort_order")
    .order("published_at", { ascending: false });
  return ((data ?? []) as unknown as DealRow[]).map((r) => toView(r, false));
}

export async function getShopDeal(tenantId: string, slug: string): Promise<DealView | null> {
  "use cache";
  cacheTag(`shop:${tenantId}`);
  cacheLife("minutes");
  if (!UUID.test(tenantId) || !/^[a-z0-9-]{1,80}$/.test(slug) || !configured()) return null;
  const { data } = await createPublicClient().from("deals").select(DEAL_SELECT).eq("tenant_id", tenantId).eq("slug", slug).in("state", ["published", "ended"]).maybeSingle();
  return data ? toView(data as unknown as DealRow, true) : null;
}

export async function getShopCategories(tenantId: string): Promise<Array<{ name: string; slug: string }>> {
  "use cache";
  cacheTag(`shop:${tenantId}`);
  cacheLife("hours");
  if (!UUID.test(tenantId) || !configured()) return [];
  const { data } = await createPublicClient().from("categories").select("name, slug").eq("tenant_id", tenantId).order("sort_order").order("name");
  return data ?? [];
}

export async function getLegalPage(tenantId: string, kind: "imprint" | "terms" | "privacy"): Promise<string | null> {
  "use cache";
  cacheTag(`shop:${tenantId}`);
  cacheLife("hours");
  if (!UUID.test(tenantId) || !configured()) return null;
  const { data } = await createPublicClient().from("legal_pages").select("content").eq("tenant_id", tenantId).eq("kind", kind).maybeSingle();
  return data?.content ?? null;
}

/** Deals the listing shows right now. */
export const listedDeals = (deals: DealView[], now = new Date()) => deals.filter((d) => isListed(d, now));

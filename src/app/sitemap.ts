import type { MetadataRoute } from "next";
import { cacheLife, cacheTag } from "next/cache";
import { getShopCategories, getShopDeals, getShopProfile } from "@/lib/shop/queries";
import { requestShop } from "@/lib/shop/request-shop";
import { indexableDeals } from "@/lib/shop/seo";
import { baseOf, indexingAllowed } from "@/lib/shop/seo-server";
import { apexUrl } from "@/lib/site/hosts";

/** Sellycat's public pages on the apex (one URL per page, both languages); on a shop host its start page, categories and current deals. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { apex, tenantId } = await requestShop();
  if (!apex) return tenantId && indexingAllowed() ? shopSitemap(tenantId) : [];
  const site = apexUrl();
  return ["/", "/pricing", "/contact", "/help", "/legal/imprint", "/legal/terms", "/legal/privacy", "/legal/dpa"].map((path) => ({
    url: `${site}${path === "/" ? "" : path}`,
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : 0.5,
  }));
}

async function shopSitemap(tenantId: string): Promise<MetadataRoute.Sitemap> {
  "use cache";
  cacheTag(`shop:${tenantId}`);
  cacheLife("minutes");
  const [shop, all, categories] = await Promise.all([getShopProfile(tenantId), getShopDeals(tenantId), getShopCategories(tenantId)]);
  if (!shop || shop.state !== "online") return [];
  const base = baseOf(shop);
  const deals = shop.legalComplete ? indexableDeals(all, new Date()) : [];
  return [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    ...categories.filter((c) => deals.some((d) => d.category?.slug === c.slug)).map((c) => ({ url: `${base}/k/${c.slug}`, changeFrequency: "daily" as const, priority: 0.6 })),
    // Escaped: Next writes image URLs into the XML as they are.
    ...deals.map((d) => ({ url: `${base}/d/${d.slug}`, changeFrequency: "daily" as const, priority: 0.8, images: d.images.map((i) => i.url.replace(/&/g, "&amp;")) })),
  ];
}

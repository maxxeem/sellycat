import type { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";
import { notFound } from "next/navigation";
import { ShopHome } from "@/components/shop/shop-home";
import { ShopGateFor as Gate } from "@/components/shop/shop-gate-for";
import { shopTexts } from "@/components/shop/shop-texts";
import { parseDealOrder, sortDeals } from "@/lib/shop/deal-order";
import { categorySeo, homeSeo, indexableDeals, jsonLd, listSchema } from "@/lib/shop/seo";
import { pageMetadata, schemaInput } from "@/lib/shop/seo-server";
import { getShopCategories, getShopDeals, getShopProfile, listedDeals } from "@/lib/shop/queries";

/** Head tags of the start page or one category. */
export async function homeMetadata(tenantId: string, category: string | null): Promise<Metadata> {
  "use cache";
  cacheTag(`shop:${tenantId}`);
  cacheLife("minutes");
  const [shop, deals, categories] = await Promise.all([getShopProfile(tenantId), getShopDeals(tenantId), getShopCategories(tenantId)]);
  if (!shop) return {};
  const t = shopTexts(shop.locale).seo;
  const open = shop.state === "online" && shop.legalComplete;
  const listed = open ? indexableDeals(sortDeals(deals, parseDealOrder(shop.settings.deal_order)), new Date()) : [];
  if (!category) return pageMetadata(shop, "/", homeSeo({ ...shop, heroSubtitle: shop.theme.hero.subtitle }, listed, t));
  const found = categories.find((c) => c.slug === category);
  if (!found) return { robots: { index: false } };
  const inside = listed.filter((d) => d.category?.slug === category);
  // An empty category is no page for search results.
  return pageMetadata(shop, `/k/${category}`, categorySeo(found.name, shop, inside, t), { index: inside.length > 0 });
}

/** Shop start page (all deals or one category). Cached per tenant; refreshed on changes and every minute (sales windows). */
export async function CachedHome({ tenantId, category }: { tenantId: string; category: string | null }) {
  "use cache";
  cacheTag(`shop:${tenantId}`);
  cacheLife("minutes");
  const [shop, deals, categories] = await Promise.all([getShopProfile(tenantId), getShopDeals(tenantId), getShopCategories(tenantId)]);
  if (!shop) notFound();
  const t = shopTexts(shop.locale);
  if (shop.state !== "online") return <Gate shop={shop} />;
  // Online but imprint, terms or privacy missing: header and hero, no deals.
  if (!shop.legalComplete) return <ShopHome shop={{ name: shop.name, currency: shop.currency, locale: shop.locale }} theme={shop.theme} t={t} deals={[]} categories={[]} notice={t.notReady} />;
  if (category && !categories.some((c) => c.slug === category)) notFound();
  const listed = listedDeals(deals);
  // No deal to show on the start page: header and hero with a plain note instead of the list.
  if (!category && !listed.length) return <ShopHome shop={{ name: shop.name, currency: shop.currency, locale: shop.locale }} theme={shop.theme} t={t} deals={[]} categories={[]} notice={t.noDealsYet} />;
  const now = new Date();
  const sorted = sortDeals(listed, parseDealOrder(shop.settings.deal_order));
  const current = category ? (categories.find((c) => c.slug === category) ?? null) : null;
  const indexable = indexableDeals(sorted, now);
  const inList = current ? indexable.filter((d) => d.category?.slug === current.slug) : indexable;
  const text = homeSeo({ ...shop, heroSubtitle: shop.theme.hero.subtitle }, indexable, t.seo);
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(listSchema(schemaInput(shop, text.description), inList, current)) }} />
      <ShopHome
      shop={{ name: shop.name, currency: shop.currency, locale: shop.locale }}
      theme={shop.theme}
      t={t}
      deals={sorted}
      categories={categories}
      activeCategory={category}
      now={now}
      />
    </>
  );
}

import { cacheLife, cacheTag } from "next/cache";
import { notFound } from "next/navigation";
import { ShopHome } from "@/components/shop/shop-home";
import { ShopGateFor as Gate } from "@/components/shop/shop-gate-for";
import { shopTexts } from "@/components/shop/shop-texts";
import { parseDealOrder, sortDeals } from "@/lib/shop/deal-order";
import { getShopCategories, getShopDeals, getShopProfile, listedDeals } from "@/lib/shop/queries";

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
  // No deal to show yet on the start page: same «opens soon» note as before the legal texts.
  if (!category && !listed.length) return <ShopHome shop={{ name: shop.name, currency: shop.currency, locale: shop.locale }} theme={shop.theme} t={t} deals={[]} categories={[]} notice={t.notReady} />;
  const base = shop.primaryHost ? `https://${shop.primaryHost}` : "";
  return (
    <>
      {base ? <link rel="canonical" href={category ? `${base}/k/${category}` : `${base}/`} /> : null}
      <ShopHome
      shop={{ name: shop.name, currency: shop.currency, locale: shop.locale }}
      theme={shop.theme}
      t={t}
      deals={sortDeals(listed, parseDealOrder(shop.settings.deal_order))}
      categories={categories}
      activeCategory={category}
      now={new Date()}
      />
    </>
  );
}

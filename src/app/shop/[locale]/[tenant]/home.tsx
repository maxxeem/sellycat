import { cacheLife, cacheTag } from "next/cache";
import { notFound } from "next/navigation";
import { ShopHome } from "@/components/shop/shop-home";
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
  if (!shop.legalComplete) return <p className="mx-auto max-w-xl px-4 py-24 text-center text-[var(--shop-muted)]">{t.notReady}</p>;
  if (category && !categories.some((c) => c.slug === category)) notFound();
  return (
    <ShopHome
      shop={{ name: shop.name, currency: shop.currency, locale: shop.locale }}
      theme={shop.theme}
      t={t}
      deals={sortDeals(listedDeals(deals), parseDealOrder(shop.settings.deal_order))}
      categories={categories}
      activeCategory={category}
      now={new Date()}
    />
  );
}

import { cacheLife, cacheTag } from "next/cache";
import { shopTexts } from "@/components/shop/shop-texts";
import { parseDealOrder, sortDeals } from "@/lib/shop/deal-order";
import { getShopCategories, getShopDeals, getShopProfile } from "@/lib/shop/queries";
import { requestShop } from "@/lib/shop/request-shop";
import { homeSeo, indexableDeals, llmsText } from "@/lib/shop/seo";
import { indexingAllowed, schemaInput } from "@/lib/shop/seo-server";

/** /llms.txt of a shop: its current deals as plain Markdown for AI assistants. */
export async function GET() {
  const { tenantId } = await requestShop();
  const text = tenantId && indexingAllowed() ? await shopLlms(tenantId) : null;
  if (!text) return new Response("Not found", { status: 404 });
  return new Response(text, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=300" } });
}

async function shopLlms(tenantId: string): Promise<string | null> {
  "use cache";
  cacheTag(`shop:${tenantId}`);
  cacheLife("minutes");
  const [shop, all, categories] = await Promise.all([getShopProfile(tenantId), getShopDeals(tenantId), getShopCategories(tenantId)]);
  if (!shop || shop.state !== "online" || !shop.legalComplete) return null;
  const t = shopTexts(shop.locale);
  const now = new Date();
  const deals = sortDeals(indexableDeals(all, now), parseDealOrder(shop.settings.deal_order));
  const { description } = homeSeo({ ...shop, heroSubtitle: shop.theme.hero.subtitle }, deals, t.seo);
  const info = [{ name: t.imprint, path: "/impressum" }, { name: t.terms, path: "/agb" }, { name: t.privacy, path: "/datenschutz" }];
  return llmsText({ ...schemaInput(shop), description }, deals, categories.filter((c) => deals.some((d) => d.category?.slug === c.slug)), info, t.seo, now);
}

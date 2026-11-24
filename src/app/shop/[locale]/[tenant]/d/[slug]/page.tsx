import type { Metadata } from "next";
import Link from "next/link";
import { cacheLife, cacheTag } from "next/cache";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageFallback } from "@/components/shop/page-fallback";
import { DealDetail } from "@/components/shop/deal-detail";
import { shopTexts } from "@/components/shop/shop-texts";
import { routeUrl, staticMapUrl } from "@/lib/geo/geocode";
import { dealIndexable, dealSchema, dealSeo, jsonLd } from "@/lib/shop/seo";
import { baseOf, pageMetadata, schemaInput } from "@/lib/shop/seo-server";
import { TrackView } from "./track-view";
import { ShopGateFor } from "@/components/shop/shop-gate-for";
import { getShopDeal, getShopProfile } from "@/lib/shop/queries";

export function generateStaticParams() {
  return [{ slug: "placeholder" }];
}

/** Own or generated title and description of the deal, in the head for every crawler. */
export async function generateMetadata({ params }: PageProps<"/shop/[locale]/[tenant]/d/[slug]">): Promise<Metadata> {
  const { tenant, slug } = await params;
  return dealMetadata(tenant, slug);
}

async function dealMetadata(tenantId: string, slug: string): Promise<Metadata> {
  "use cache";
  cacheTag(`shop:${tenantId}`);
  cacheLife("minutes");
  const [shop, deal] = await Promise.all([getShopProfile(tenantId), getShopDeal(tenantId, slug)]);
  if (!shop || !deal || !shop.legalComplete || shop.state !== "online") return { robots: { index: false } };
  const now = new Date();
  return pageMetadata(shop, `/d/${deal.slug}`, dealSeo(deal, shop, shopTexts(shop.locale).seo, now), { image: `${baseOf(shop)}/og/${deal.slug}`, index: dealIndexable(deal, now) });
}

export default function DealPage({ params }: PageProps<"/shop/[locale]/[tenant]/d/[slug]">) {
  return (
    <Suspense fallback={<PageFallback />}>
      <Deal params={params} />
    </Suspense>
  );
}

async function Deal({ params }: { params: PageProps<"/shop/[locale]/[tenant]/d/[slug]">["params"] }) {
  const { tenant, slug } = await params;
  return <CachedDeal tenantId={tenant} slug={slug} />;
}

async function CachedDeal({ tenantId, slug }: { tenantId: string; slug: string }) {
  "use cache";
  cacheTag(`shop:${tenantId}`);
  cacheLife("minutes");
  const [shop, deal] = await Promise.all([getShopProfile(tenantId), getShopDeal(tenantId, slug)]);
  if (shop && shop.state !== "online") return <ShopGateFor shop={shop} />;
  if (!shop || !deal || !shop.legalComplete) notFound();
  const t = shopTexts(shop.locale);
  const now = new Date();
  const points = deal.locations.filter((l) => l.lat !== null && l.lng !== null).map((l) => ({ lat: l.lat!, lng: l.lng! }));
  const routes = Object.fromEntries(deal.locations.map((l) => [l.id, routeUrl(l)]));
  const structured = dealSchema(deal, schemaInput(shop), dealSeo(deal, shop, t.seo, now), now);
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structured) }} />
      <Link href="/" className="mb-4 inline-block text-sm text-[var(--shop-muted)] hover:text-[var(--shop-text)]">
        ← {t.backToShop}
      </Link>
      <TrackView dealId={deal.id} />
      <DealDetail
        deal={deal}
        shop={{ name: shop.name, currency: shop.currency, locale: shop.locale }}
        t={t}
        buyHref={shop.paymentsReady ? `/checkout/${deal.slug}` : null}
        mapUrl={staticMapUrl(points, shop.theme.colors.primary)}
        routeUrls={routes}
        now={now}
      />
    </div>
  );
}

import Link from "next/link";
import { cacheLife, cacheTag } from "next/cache";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PageFallback } from "@/components/shop/page-fallback";
import { DealDetail } from "@/components/shop/deal-detail";
import { shopTexts } from "@/components/shop/shop-texts";
import { routeUrl, staticMapUrl } from "@/lib/geo/geocode";
import { dealStatus, isTeaser, remaining } from "@/lib/shop/deal-status";
import { getShopDeal, getShopProfile } from "@/lib/shop/queries";

export function generateStaticParams() {
  return [{ slug: "placeholder" }];
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
  if (!shop || !deal || !shop.legalComplete) notFound();
  const t = shopTexts(shop.locale);
  const now = new Date();
  const status = dealStatus(deal, now);
  const points = deal.locations.filter((l) => l.lat !== null && l.lng !== null).map((l) => ({ lat: l.lat!, lng: l.lng! }));
  const routes = Object.fromEntries(deal.locations.map((l) => [l.id, routeUrl(l)]));
  const left = remaining(deal);
  const base = shop.primaryHost ? `https://${shop.primaryHost}` : "";
  // schema.org Offer: lets search engines show price and availability.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: deal.title,
    description: deal.subtitle ?? undefined,
    image: deal.images.map((i) => i.url),
    brand: deal.partner ? { "@type": "Brand", name: deal.partner.name } : undefined,
    // A teaser has no public price yet: no offer for search engines until the sales start.
    offers: isTeaser(deal, now) ? undefined : {
      "@type": "Offer",
      url: `${base}/d/${deal.slug}`,
      priceCurrency: shop.currency,
      price: (deal.price_cents / 100).toFixed(2),
      availability: status === "live" ? "https://schema.org/InStock" : status === "sold_out" ? "https://schema.org/SoldOut" : status === "scheduled" ? "https://schema.org/PreOrder" : "https://schema.org/Discontinued",
      ...(deal.sales_end ? { priceValidUntil: deal.sales_end.slice(0, 10) } : {}),
      ...(left !== null ? { inventoryLevel: { "@type": "QuantitativeValue", value: left } } : {}),
      seller: { "@type": "Organization", name: shop.name },
    },
  };
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      {/* Per-deal head tags rendered with the cached page (React hoists them into <head>): with
          Cache Components a generateMetadata() reading the slug would block the prerendered shell. */}
      <title>{`${deal.title} · ${shop.name}`}</title>
      {deal.subtitle ? <meta name="description" content={deal.subtitle} /> : null}
      <link rel="canonical" href={`${base}/d/${deal.slug}`} />
      <meta property="og:title" content={deal.title} />
      {deal.subtitle ? <meta property="og:description" content={deal.subtitle} /> : null}
      <meta property="og:url" content={`${base}/d/${deal.slug}`} />
      <meta property="og:image" content={`${base}/og/${deal.slug}`} />
      <meta name="twitter:card" content="summary_large_image" />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <Link href="/" className="mb-4 inline-block text-sm text-[var(--shop-muted)] hover:text-[var(--shop-text)]">
        ← {t.backToShop}
      </Link>
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

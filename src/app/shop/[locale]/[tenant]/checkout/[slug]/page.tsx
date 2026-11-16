import { cacheLife, cacheTag } from "next/cache";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { shopTexts } from "@/components/shop/shop-texts";
import { maxQuantity } from "@/lib/payments/map";
import { dealStatus, formatMoney } from "@/lib/shop/deal-status";
import { getShopDeal, getShopProfile } from "@/lib/shop/queries";
import { CheckoutForm } from "./checkout-form";

export function generateStaticParams() {
  return [{ slug: "placeholder" }];
}

export default function CheckoutPage({ params }: PageProps<"/shop/[locale]/[tenant]/checkout/[slug]">) {
  return (
    <Suspense fallback={null}>
      <Checkout params={params} />
    </Suspense>
  );
}

async function Checkout({ params }: { params: PageProps<"/shop/[locale]/[tenant]/checkout/[slug]">["params"] }) {
  const { tenant, slug } = await params;
  return <CachedCheckout tenantId={tenant} slug={slug} />;
}

/** Deal summary and the form; stock and limits are checked again when the buyer continues. */
async function CachedCheckout({ tenantId, slug }: { tenantId: string; slug: string }) {
  "use cache";
  cacheTag(`shop:${tenantId}`);
  cacheLife("minutes");
  const [shop, deal] = await Promise.all([getShopProfile(tenantId), getShopDeal(tenantId, slug)]);
  if (!shop || !deal || !shop.legalComplete) notFound();
  const t = shopTexts(shop.locale);
  const status = dealStatus(deal, new Date());
  const max = maxQuantity(deal);
  const cover = deal.images[0];
  const blocked = !shop.paymentsReady ? t.paymentNotReady : status === "sold_out" || max === 0 ? t.soldOut : status === "scheduled" ? t.comingSoon : status !== "live" ? t.ended : null;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-10">
      <title>{`${t.checkoutTitle} · ${shop.name}`}</title>
      <meta name="robots" content="noindex" />
      <a href={`/d/${deal.slug}`} className="mb-4 inline-block text-sm text-[var(--shop-muted)] hover:text-[var(--shop-text)]">
        ← {deal.title}
      </a>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <aside className="shop-card flex flex-col gap-3 self-start overflow-hidden">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover.url} alt={cover.alt ?? deal.title} className="aspect-[4/3] w-full object-cover" />
          ) : null}
          <div className="flex flex-col gap-1 p-5 pt-2">
            {deal.partner ? <p className="text-xs font-semibold uppercase tracking-wide text-[var(--shop-muted)]">{deal.partner.name}</p> : null}
            <p className="shop-heading text-lg font-bold">{deal.title}</p>
            {deal.subtitle ? <p className="text-sm text-[var(--shop-muted)]">{deal.subtitle}</p> : null}
            <p className="mt-2 text-xl font-bold">{formatMoney(deal.price_cents, shop.currency, shop.locale)}</p>
          </div>
        </aside>
        {blocked ? (
          <div className="shop-card p-6">
            <p className="font-semibold">{blocked}</p>
            <a href="/" className="mt-4 inline-block underline">
              {t.backToShop}
            </a>
          </div>
        ) : (
          <CheckoutForm tenantId={tenantId} slug={deal.slug} unitCents={deal.price_cents} currency={shop.currency} locale={shop.locale} maxQty={max} shopName={shop.name} t={t} />
        )}
      </div>
    </div>
  );
}

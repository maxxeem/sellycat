import Link from "next/link";
import { CalendarClock, Clock, ExternalLink, MapPin } from "lucide-react";
import { describeWindows, dealStatus, formatMoney, isTeaser, remaining, savingsPercent, stockTotal } from "@/lib/shop/deal-status";
import { fmt } from "@/lib/i18n/fmt";
import { Countdown } from "./countdown";
import { formatHours, parseHours } from "@/lib/shop/hours";
import { DealGallery } from "./deal-gallery";
import { StockBar } from "./stock-bar";
import type { ShopTexts } from "./shop-texts";
import type { DealView, ShopInfo } from "./types";

const dateText = (iso: string, locale: string) => new Date(iso).toLocaleDateString(locale === "de" ? "de-CH" : "en-CH", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Zurich" });

/**
 * Deal page body (shop and editor preview). `mapUrl` / `routeUrl` come from the server (they need
 * the Mapbox token); `buyHref` is the checkout link.
 */
export function DealDetail({
  deal,
  shop,
  t,
  buyHref,
  mapUrl,
  routeUrls = {},
  now,
}: {
  deal: DealView;
  shop: ShopInfo;
  t: ShopTexts;
  /** Checkout link; null while the shop cannot take payments (button disabled). */
  buyHref?: string | null;
  mapUrl?: string | null;
  routeUrls?: Record<string, string>;
  now?: Date;
}) {
  const status = dealStatus(deal, now);
  const left = remaining(deal);
  const teaser = isTeaser(deal, now);
  const savings = teaser ? null : savingsPercent(deal.price_cents, deal.compare_at_cents);
  const validity =
    deal.redeem_validity === "until_date" && deal.redeem_until
      ? fmt(t.validUntil, { date: dateText(deal.redeem_until, shop.locale) })
      : deal.redeem_validity === "days_after_purchase" && deal.redeem_days
        ? fmt(t.validDays, { days: deal.redeem_days })
        : null;
  const windows = describeWindows(deal.redeem_windows, shop.locale);
  const countdown = teaser && deal.sales_start ? { until: deal.sales_start, mode: "start" as const } : deal.show_countdown ? (status === "live" && deal.sales_end ? { until: deal.sales_end, mode: "end" as const } : status === "scheduled" && deal.sales_start ? { until: deal.sales_start, mode: "start" as const } : null) : null;
  const stockBar = Boolean(deal.show_stock_bar && stockTotal(deal) && (status === "live" || status === "sold_out"));

  return (
    // Mobile: pictures, then title/price/buy, then the details. Desktop: buy box in a sticky
    // second column next to pictures and details.
    <article className="grid content-start gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-x-12">
      <div className="min-w-0 lg:col-start-1 lg:row-start-1">
        <DealGallery images={deal.images} title={deal.title} t={t} />
      </div>

      <aside className="lg:sticky lg:top-6 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start">
        <div className="shop-card flex flex-col gap-4 p-6">
          {deal.partner ? <p className="text-xs font-semibold uppercase tracking-wide text-[var(--shop-muted)]">{deal.partner.name}</p> : null}
          <h1 className="shop-heading text-2xl font-bold leading-tight md:text-3xl">{deal.title}</h1>
          {deal.subtitle ? <p className="text-[var(--shop-muted)]">{deal.subtitle}</p> : null}
          {teaser ? (
            <p className="flex flex-wrap items-center gap-2" data-testid="teaser-price">
              <span className="shop-badge shop-badge-primary">{t.teaserLabel}</span>
              <span className="font-semibold">{t.teaserPrice}</span>
            </p>
          ) : (
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-3xl font-bold">{formatMoney(deal.price_cents, shop.currency, shop.locale)}</span>
              {deal.compare_at_cents ? <span className="text-lg text-[var(--shop-muted)] line-through">{formatMoney(deal.compare_at_cents, shop.currency, shop.locale)}</span> : null}
              {savings ? <span className="shop-badge shop-badge-primary">{fmt(t.save, { percent: savings })}</span> : null}
            </div>
          )}
          {!teaser && deal.deal_type === "value" && deal.value_cents ? <p className="text-sm font-semibold">{fmt(t.worth, { value: formatMoney(deal.value_cents, shop.currency, shop.locale) })}</p> : null}

          {countdown ? <Countdown until={countdown.until} mode={countdown.mode} t={t} variant="boxes" /> : null}
          {stockBar && !teaser ? <StockBar total={stockTotal(deal)!} taken={deal.sold_qty + deal.reserved_qty} t={t} /> : null}

          {status === "live" && buyHref !== null ? (
            <Link href={buyHref ?? "#"} className="shop-btn w-full" data-testid="buy">
              {t.buy}
            </Link>
          ) : (
            <span className="shop-btn w-full" aria-disabled="true">
              {status === "sold_out" ? t.soldOut : status === "scheduled" || status === "live" ? t.comingSoon : t.ended}
            </span>
          )}

          <div className="flex flex-col gap-2 text-sm">
            {status === "live" && !stockBar && deal.show_remaining && left !== null ? <p className="font-semibold text-[var(--shop-warning)]">{fmt(t.onlyLeft, { count: left })}</p> : null}
            {status === "scheduled" && deal.sales_start ? <p className="font-semibold">{fmt(t.startsAt, { date: dateText(deal.sales_start, shop.locale) })}</p> : null}
            {validity ? (
              <p className="flex items-center gap-2 text-[var(--shop-muted)]">
                <CalendarClock className="h-4 w-4" aria-hidden /> {validity}
              </p>
            ) : null}
            {windows.length ? (
              <p className="flex items-start gap-2 text-[var(--shop-muted)]">
                <Clock className="mt-0.5 h-4 w-4 shrink-0" aria-hidden /> {t.redeemTimes}: {windows.join(" · ")}
              </p>
            ) : null}
          </div>
        </div>
      </aside>

      <div className="min-w-0 empty:hidden lg:col-start-1 lg:row-start-2 [&>section:first-child]:mt-0">
        {deal.descriptionHtml ? (
          <section className="mt-8">
            <h2 className="shop-heading mb-2 text-xl font-bold">{t.description}</h2>
            <div className="shop-prose" dangerouslySetInnerHTML={{ __html: deal.descriptionHtml }} />
          </section>
        ) : null}

        {deal.locations.length ? (
          <section className="mt-8">
            <h2 className="shop-heading mb-3 text-xl font-bold">{t.redeemAt}</h2>
            {mapUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={mapUrl} alt="" loading="lazy" className="mb-4 aspect-[2/1] w-full rounded-[var(--shop-radius)] object-cover" />
            ) : null}
            <ul className="grid gap-3 sm:grid-cols-2">
              {deal.locations.map((l) => (
                <li key={l.id} className="shop-card flex gap-3 p-4 text-sm">
                  <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-[var(--shop-primary)]" aria-hidden />
                  <div className="min-w-0">
                    <p className="font-semibold">{l.name}</p>
                    <p className="text-[var(--shop-muted)]">{[l.street, [l.zip, l.city].filter(Boolean).join(" ")].filter(Boolean).join(", ")}</p>
                    <LocationHours hours={l.hours} legacy={l.opening_hours} locale={shop.locale} />
                    {routeUrls[l.id] ? (
                      <a href={routeUrls[l.id]} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 font-semibold text-[var(--shop-primary)]">
                        {t.route} <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                      </a>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {deal.faq.length ? (
          <section className="mt-8">
            <h2 className="shop-heading mb-3 text-xl font-bold">{t.faq}</h2>
            <div className="flex flex-col gap-2">
              {deal.faq.map((f, i) => (
                <details key={i} className="shop-card p-4">
                  <summary className="cursor-pointer font-semibold">{f.q}</summary>
                  <p className="mt-2 whitespace-pre-line text-sm text-[var(--shop-muted)]">{f.a}</p>
                </details>
              ))}
            </div>
          </section>
        ) : null}

        {deal.terms ? (
          <section className="mt-8">
            <h2 className="shop-heading mb-2 text-xl font-bold">{t.conditions}</h2>
            <p className="whitespace-pre-line text-sm text-[var(--shop-muted)]">{deal.terms}</p>
          </section>
        ) : null}
      </div>
    </article>
  );
}

/** Opening hours in one uniform layout (grouped days); old free text only where nothing structured exists. */
function LocationHours({ hours, legacy, locale }: { hours: unknown; legacy: string | null; locale: "de" | "en" }) {
  const h = parseHours(hours);
  if (h)
    return (
      <dl className="mt-1.5 grid grid-cols-[auto_1fr] gap-x-3 text-xs text-[var(--shop-muted)]" data-testid="location-hours">
        {formatHours(h, locale).map((line) => {
          const [days, ...rest] = line.split(" ");
          return (
            <div key={line} className="contents">
              <dt className="font-semibold">{days}</dt>
              <dd className="tabular-nums">{rest.join(" ")}</dd>
            </div>
          );
        })}
      </dl>
    );
  return legacy ? <p className="mt-1 whitespace-pre-line text-xs text-[var(--shop-muted)]">{legacy}</p> : null;
}

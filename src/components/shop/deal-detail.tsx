import { CalendarClock, Clock, ExternalLink, MapPin } from "lucide-react";
import { describeWindows, dealStatus, formatMoney, remaining, savingsPercent } from "@/lib/shop/deal-status";
import { fmt } from "@/lib/i18n";
import { Countdown } from "./countdown";
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
  buyHref?: string;
  mapUrl?: string | null;
  routeUrls?: Record<string, string>;
  now?: Date;
}) {
  const status = dealStatus(deal, now);
  const left = remaining(deal);
  const savings = savingsPercent(deal.price_cents, deal.compare_at_cents);
  const [cover, ...gallery] = deal.images;
  const validity =
    deal.redeem_validity === "until_date" && deal.redeem_until
      ? fmt(t.validUntil, { date: dateText(deal.redeem_until, shop.locale) })
      : deal.redeem_validity === "days_after_purchase" && deal.redeem_days
        ? fmt(t.validDays, { days: deal.redeem_days })
        : null;
  const windows = describeWindows(deal.redeem_windows, shop.locale);

  return (
    <article className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-12">
      <div className="min-w-0">
        <div className="overflow-hidden rounded-[var(--shop-radius)] bg-[var(--shop-surface)]">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover.url} alt={cover.alt ?? deal.title} className="aspect-[16/10] w-full object-cover" fetchPriority="high" />
          ) : (
            <div className="aspect-[16/10] w-full" />
          )}
        </div>
        {gallery.length ? (
          <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4">
            {gallery.map((img) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={img.url} src={img.url} alt={img.alt ?? ""} loading="lazy" className="aspect-square w-full rounded-[var(--shop-radius)] object-cover" />
            ))}
          </div>
        ) : null}

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
                    {l.opening_hours ? <p className="mt-1 whitespace-pre-line text-xs text-[var(--shop-muted)]">{l.opening_hours}</p> : null}
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

      <aside className="lg:sticky lg:top-6 lg:self-start">
        <div className="shop-card flex flex-col gap-4 p-6">
          {deal.partner ? <p className="text-xs font-semibold uppercase tracking-wide text-[var(--shop-muted)]">{deal.partner.name}</p> : null}
          <h1 className="shop-heading text-2xl font-bold leading-tight md:text-3xl">{deal.title}</h1>
          {deal.subtitle ? <p className="text-[var(--shop-muted)]">{deal.subtitle}</p> : null}
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-3xl font-bold">{formatMoney(deal.price_cents, shop.currency, shop.locale)}</span>
            {deal.compare_at_cents ? <span className="text-lg text-[var(--shop-muted)] line-through">{formatMoney(deal.compare_at_cents, shop.currency, shop.locale)}</span> : null}
            {savings ? <span className="shop-badge shop-badge-primary">{fmt(t.save, { percent: savings })}</span> : null}
          </div>
          {deal.deal_type === "value" && deal.value_cents ? <p className="text-sm font-semibold">{fmt(t.worth, { value: formatMoney(deal.value_cents, shop.currency, shop.locale) })}</p> : null}

          {status === "live" ? (
            <a href={buyHref ?? "#"} className="shop-btn w-full" data-testid="buy">
              {t.buy}
            </a>
          ) : (
            <span className="shop-btn w-full" aria-disabled="true">
              {status === "sold_out" ? t.soldOut : status === "scheduled" ? t.comingSoon : t.ended}
            </span>
          )}

          <div className="flex flex-col gap-2 text-sm">
            {status === "live" && deal.show_remaining && left !== null ? <p className="font-semibold text-[var(--shop-warning)]">{fmt(t.onlyLeft, { count: left })}</p> : null}
            {status === "live" && deal.show_countdown && deal.sales_end ? <Countdown until={deal.sales_end} t={t} /> : null}
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
    </article>
  );
}

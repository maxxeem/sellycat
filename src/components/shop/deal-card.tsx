import Link from "next/link";
import { dealStatus, formatMoney, isTeaser, remaining, savingsPercent, stockTotal } from "@/lib/shop/deal-status";
import { fmt } from "@/lib/i18n/fmt";
import { shopImage } from "@/lib/shop/image";
import { Countdown } from "./countdown";
import { StockBar } from "./stock-bar";
import type { ShopTexts } from "./shop-texts";
import type { DealView, ShopInfo } from "./types";

/**
 * Deal tile of the shop (also used by the editor's live preview). Pure markup on the shop's CSS
 * variables; `variant` follows the theme's list layout.
 */
export function DealCard({ deal, shop, t, variant = "grid", href, now, priority = false }: { deal: DealView; shop: ShopInfo; t: ShopTexts; variant?: "grid" | "list" | "hero"; href?: string; now?: Date; priority?: boolean }) {
  const status = dealStatus(deal, now);
  const left = remaining(deal);
  const teaser = isTeaser(deal, now);
  const savings = teaser ? null : savingsPercent(deal.price_cents, deal.compare_at_cents);
  const cover = deal.images[0];
  const isHero = variant === "hero";
  // A teaser always counts down to its start.
  const countdown = teaser && deal.sales_start ? { until: deal.sales_start, mode: "start" as const } : deal.show_countdown ? (status === "live" && deal.sales_end ? { until: deal.sales_end, mode: "end" as const } : status === "scheduled" && deal.sales_start ? { until: deal.sales_start, mode: "start" as const } : null) : null;
  const stockBar = deal.show_stock_bar && stockTotal(deal) && (status === "live" || status === "sold_out");
  return (
    <CardRoot
      href={href}
      className={`shop-card group flex overflow-hidden ${variant === "list" ? "flex-row" : "flex-col"} ${isHero ? "md:flex-row" : ""}`}
      data-status={status}
    >
      <div className={`relative shrink-0 overflow-hidden bg-[var(--shop-surface)] ${variant === "list" ? "w-32 sm:w-48" : "w-full"} ${isHero ? "md:w-3/5" : ""} ${variant === "list" ? "aspect-square" : isHero ? "aspect-[16/10]" : "aspect-[4/3]"}`}>
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img {...shopImage(cover.url, variant === "list" ? "(min-width: 640px) 192px, 128px" : isHero ? "(min-width: 768px) 60vw, 100vw" : "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw")} alt={cover.alt ?? deal.title} loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : "auto"} decoding="async" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl font-bold text-[var(--shop-muted)]">{deal.title.slice(0, 1)}</div>
        )}
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {teaser ? <span className="shop-badge shop-badge-primary">{t.teaserLabel}</span> : null}
          {savings ? <span className="shop-badge shop-badge-primary">-{savings}%</span> : null}
          {deal.deal_type === "value" ? <span className="shop-badge">{t.valueVoucher}</span> : null}
          {status === "sold_out" ? <span className="shop-badge shop-badge-dark">{t.soldOut}</span> : null}
        </div>
        {countdown ? (
          <div className="absolute bottom-3 left-3">
            <Countdown until={countdown.until} mode={countdown.mode} t={t} variant="chip" />
          </div>
        ) : null}
      </div>
      <div className={`flex min-w-0 flex-1 flex-col gap-1.5 p-4 ${isHero ? "md:justify-center md:p-8" : ""}`}>
        {deal.partner ? <p className="truncate text-xs font-semibold uppercase tracking-wide text-[var(--shop-muted)]">{deal.partner.name}</p> : null}
        <h3 className={`shop-heading line-clamp-2 font-bold leading-snug ${isHero ? "text-2xl md:text-3xl" : "text-lg"}`}>{deal.title}</h3>
        {deal.subtitle ? <p className={`text-sm text-[var(--shop-muted)] ${isHero ? "" : "line-clamp-2"}`}>{deal.subtitle}</p> : null}
        {teaser ? (
          <p className="mt-auto pt-2 text-sm font-semibold" data-testid="teaser-price">{t.teaserPrice}</p>
        ) : (
          <div className="mt-auto flex flex-wrap items-baseline gap-x-2 pt-2">
            <span className="text-xl font-bold">{formatMoney(deal.price_cents, shop.currency, shop.locale)}</span>
            {deal.compare_at_cents ? (
              <span className="text-sm text-[var(--shop-muted)] line-through" aria-label={`${t.insteadOf} ${formatMoney(deal.compare_at_cents, shop.currency, shop.locale)}`}>
                {formatMoney(deal.compare_at_cents, shop.currency, shop.locale)}
              </span>
            ) : null}
          </div>
        )}
        {stockBar ? (
          <div className="pt-1">
            <StockBar total={stockTotal(deal)!} taken={deal.sold_qty + deal.reserved_qty} t={t} slim />
          </div>
        ) : null}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[var(--shop-muted)]">
          {status === "live" && !stockBar && deal.show_remaining && left !== null && left <= 50 ? <span className="text-xs font-semibold text-[var(--shop-warning)]">{fmt(t.onlyLeft, { count: left })}</span> : null}
          {status === "scheduled" && deal.sales_start ? (
            <span className="text-xs font-semibold">{fmt(t.startsAt, { date: new Date(deal.sales_start).toLocaleDateString(shop.locale === "de" ? "de-CH" : "en-CH", { day: "numeric", month: "long", timeZone: "Europe/Zurich" }) })}</span>
          ) : null}
        </div>
      </div>
    </CardRoot>
  );
}

/** Link when the card leads somewhere (shop), plain box in previews. */
function CardRoot({ href, ...props }: { href?: string; className: string; "data-status": string; children: React.ReactNode }) {
  return href ? <Link href={href} {...props} /> : <div {...props} />;
}

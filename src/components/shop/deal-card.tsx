import { dealStatus, formatMoney, remaining, savingsPercent } from "@/lib/shop/deal-status";
import { fmt } from "@/lib/i18n";
import { Countdown } from "./countdown";
import type { ShopTexts } from "./shop-texts";
import type { DealView, ShopInfo } from "./types";

/**
 * Deal tile of the shop (also used by the editor's live preview). Pure markup on the shop's CSS
 * variables; `variant` follows the theme's list layout.
 */
export function DealCard({ deal, shop, t, variant = "grid", href, now, priority = false }: { deal: DealView; shop: ShopInfo; t: ShopTexts; variant?: "grid" | "list" | "hero"; href?: string; now?: Date; priority?: boolean }) {
  const status = dealStatus(deal, now);
  const left = remaining(deal);
  const savings = savingsPercent(deal.price_cents, deal.compare_at_cents);
  const cover = deal.images[0];
  const Tag = href ? "a" : "div";
  const isHero = variant === "hero";
  return (
    <Tag
      {...(href ? { href } : {})}
      className={`shop-card group flex overflow-hidden ${variant === "list" ? "flex-row" : "flex-col"} ${isHero ? "md:flex-row" : ""}`}
      data-status={status}
    >
      <div className={`relative shrink-0 overflow-hidden bg-[var(--shop-surface)] ${variant === "list" ? "w-32 sm:w-48" : "w-full"} ${isHero ? "md:w-3/5" : ""} ${variant === "list" ? "aspect-square" : isHero ? "aspect-[16/10]" : "aspect-[4/3]"}`}>
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover.url} alt={cover.alt ?? deal.title} loading={priority ? "eager" : "lazy"} fetchPriority={priority ? "high" : "auto"} decoding="async" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-4xl font-bold text-[var(--shop-muted)]">{deal.title.slice(0, 1)}</div>
        )}
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {savings ? <span className="shop-badge shop-badge-primary">-{savings}%</span> : null}
          {deal.deal_type === "value" ? <span className="shop-badge">{t.valueVoucher}</span> : null}
          {status === "sold_out" ? <span className="shop-badge shop-badge-dark">{t.soldOut}</span> : null}
        </div>
      </div>
      <div className={`flex min-w-0 flex-1 flex-col gap-1.5 p-4 ${isHero ? "md:justify-center md:p-8" : ""}`}>
        {deal.partner ? <p className="truncate text-xs font-semibold uppercase tracking-wide text-[var(--shop-muted)]">{deal.partner.name}</p> : null}
        <h3 className={`shop-heading line-clamp-2 font-bold leading-snug ${isHero ? "text-2xl md:text-3xl" : "text-lg"}`}>{deal.title}</h3>
        {deal.subtitle ? <p className={`text-sm text-[var(--shop-muted)] ${isHero ? "" : "line-clamp-2"}`}>{deal.subtitle}</p> : null}
        <div className="mt-auto flex flex-wrap items-baseline gap-x-2 pt-2">
          <span className="text-xl font-bold">{formatMoney(deal.price_cents, shop.currency, shop.locale)}</span>
          {deal.compare_at_cents ? (
            <span className="text-sm text-[var(--shop-muted)] line-through" aria-label={`${t.insteadOf} ${formatMoney(deal.compare_at_cents, shop.currency, shop.locale)}`}>
              {formatMoney(deal.compare_at_cents, shop.currency, shop.locale)}
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[var(--shop-muted)]">
          {status === "live" && deal.show_remaining && left !== null && left <= 50 ? <span className="text-xs font-semibold text-[var(--shop-warning)]">{fmt(t.onlyLeft, { count: left })}</span> : null}
          {status === "live" && deal.show_countdown && deal.sales_end ? <Countdown until={deal.sales_end} t={t} compact /> : null}
          {status === "scheduled" && deal.sales_start ? (
            <span className="text-xs font-semibold">{fmt(t.startsAt, { date: new Date(deal.sales_start).toLocaleDateString(shop.locale === "de" ? "de-CH" : "en-CH", { day: "numeric", month: "long", timeZone: "Europe/Zurich" }) })}</span>
          ) : null}
        </div>
      </div>
    </Tag>
  );
}

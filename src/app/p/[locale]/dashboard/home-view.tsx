import Link from "next/link";
import type { ComponentType, ReactNode } from "react";
import { ArrowRight, ArrowUpRight, Check, CreditCard, Handshake, Palette, Receipt, Scale, Tag, Ticket, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { Storefront } from "@phosphor-icons/react/dist/ssr";
import { Badge, buttonClass } from "@/components/ui";
import { fmt, type Dictionary } from "@/lib/i18n";
import { ORDER_TONE, dateTime, type OrderStatus } from "@/lib/dashboard/order-ui";
import { trend, type Figure, type Overview } from "@/lib/dashboard/overview";
import { formatMoney } from "@/lib/shop/deal-status";
import { NewDealButton } from "./deals/new-deal-button";
import { CopyLink } from "./copy-link";
import { ShopStateSwitch } from "./shop-state-switch";
import type { ShopState } from "@/lib/shop/shop-state";

type Icon = ComponentType<{ className?: string; strokeWidth?: number }>;

export type HomeData = {
  t: Dictionary;
  locale: string;
  userName: string;
  tenantName: string;
  shopUrl: string;
  /** building (not opened yet) | online | closed (taken offline). */
  shopState: ShopState;
  /** Owner/admin: may switch the shop online/offline. */
  canManage: boolean;
  /** The shop's primary colour and logo (tint of the shop card). */
  brand: string;
  /** Logo variants for light and dark backgrounds (either may be missing). */
  logos: { light: string | null; dark: string | null };
  currency: string;
  setup: { design: boolean; legal: boolean; deal: boolean; payments: boolean };
  liveDeals: number;
  stats: Overview;
  recent: Array<{ id: string; number: string; status: OrderStatus; email: string; currency: string; amount_cents: number; created_at: string }>;
};

/** Dashboard start page: shop card, getting started (until done), key figures, recent orders, shortcuts. */
export function HomeView({ t, locale, userName, tenantName, shopUrl, shopState, canManage, brand, logos, currency, setup, liveDeals, stats, recent }: HomeData) {
  const h = t.dashboard.home;
  const money = (cents: number) => formatMoney(cents, currency, locale);
  const steps: Array<{ label: string; done: boolean; href: string; icon: Icon }> = [
    { label: t.dashboard.setup.design, done: setup.design, href: "/dashboard/design", icon: Palette },
    { label: t.dashboard.setup.legal, done: setup.legal, href: "/dashboard/settings", icon: Scale },
    { label: t.dashboard.setup.deal, done: setup.deal, href: "/dashboard/deals", icon: Tag },
    { label: t.dashboard.setup.payments, done: setup.payments, href: "/dashboard/payments", icon: CreditCard },
  ];
  const done = steps.filter((s) => s.done).length;
  const online = shopState === "online";
  const st = t.dashboard.shopState;

  return (
    <div className="flex flex-col gap-6">
      {/* Shop card with a Sellycat-orange glow, the shop's address and the main actions. */}
      <section
        className="relative overflow-hidden rounded-card border border-line bg-surface-2 shadow-card"
        style={{ backgroundImage: "radial-gradient(120% 140% at 100% 0%, color-mix(in srgb, var(--accent) 18%, transparent), transparent 60%)" }}
      >
        <div className="flex flex-col gap-5 p-5 sm:p-7 md:flex-row md:items-center md:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <ShopLogo logos={logos} name={tenantName} brand={brand} />
            <div className="min-w-0">
              <p className="text-sm text-muted">{fmt(t.dashboard.welcome, { name: userName })}</p>
              <h1 className="truncate text-2xl font-bold tracking-tight">{tenantName}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <span className={`inline-flex items-center gap-1.5 font-semibold ${online ? "text-success" : shopState === "closed" ? "text-danger" : "text-warn"}`} data-testid="shop-state">
                  <span className={`h-2 w-2 rounded-full ${online ? "bg-success" : shopState === "closed" ? "bg-danger" : "bg-warn"}`} />
                  {online ? h.online : shopState === "closed" ? st.closed : h.offline}
                </span>
                <a href={shopUrl} target="_blank" rel="noreferrer" className="truncate text-muted hover:text-ink hover:underline">
                  {shopUrl.replace(/^https?:\/\//, "")}
                </a>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 *:w-full *:px-2 sm:flex sm:flex-wrap sm:*:w-auto sm:*:px-4 [&>*:last-child]:col-span-2">
            {canManage ? <ShopStateSwitch state={shopState} className="col-span-2 *:w-full sm:*:w-auto" /> : null}
            <a href={shopUrl} target="_blank" rel="noreferrer" className={buttonClass.secondary}>
              <Storefront className="h-4 w-4" aria-hidden /> {t.dashboard.openShop}
            </a>
            <CopyLink url={shopUrl} label={h.copyLink} done={h.copied} />
            <NewDealButton />
          </div>
        </div>
        {!online ? (
          <p className="border-t border-line px-5 py-3 text-sm text-muted sm:px-7" data-testid="shop-state-hint">
            {shopState === "closed" ? st.closedHint : st.buildingHint}{" "}
            <Link href="/dashboard/settings#shop-status" className="font-semibold text-accent-text hover:underline">
              {st.editTexts}
            </Link>
          </p>
        ) : !setup.legal ? (
          // Online, but the shop lists no deals before imprint, terms and privacy are in place.
          <p className="border-t border-line px-5 py-3 text-sm text-warn sm:px-7" data-testid="shop-state-hint">
            {st.needsLegal}{" "}
            <Link href="/dashboard/settings" className="font-semibold text-accent-text hover:underline">
              {t.dashboard.setup.legal}
            </Link>
          </p>
        ) : null}
      </section>

      {done < steps.length ? (
        <section className="rounded-card border border-line bg-surface-2 p-5 shadow-card sm:p-6" data-testid="setup">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-base font-semibold">{t.dashboard.setup.title}</h2>
              <p className="text-sm text-muted">{h.setupHint}</p>
            </div>
            <p className="text-sm font-semibold">{fmt(h.progress, { done, total: steps.length })}</p>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-line" aria-hidden>
            <div className="h-full rounded-full bg-accent" style={{ width: `${(done / steps.length) * 100}%` }} />
          </div>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {steps.map((s) => (
              <li key={s.label}>
                <Link
                  href={s.href}
                  className={`group flex items-center gap-3 rounded-input border p-3 text-sm transition ${s.done ? "border-transparent text-muted" : "border-line hover:border-ink/30 hover:bg-surface"}`}
                >
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${s.done ? "bg-success/15 text-success" : "bg-surface text-ink"}`}>
                    {s.done ? <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden /> : <s.icon className="h-4 w-4" strokeWidth={1.75} />}
                  </span>
                  <span className={`flex-1 ${s.done ? "line-through" : "font-medium"}`}>{s.label}</span>
                  {s.done ? null : <ArrowRight className="h-4 w-4 text-muted transition group-hover:translate-x-0.5" aria-hidden />}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div>
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="text-base font-semibold">{h.period}</h2>
          <Link href="/dashboard/analytics" className="text-sm font-medium text-muted hover:text-ink">
            {t.dashboard.nav.analytics} →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <Kpi icon={Wallet} label={h.revenue} value={money(stats.revenue.value)} figure={stats.revenue} t={t} />
          <Kpi icon={Receipt} label={h.orders} value={String(stats.orders.value)} figure={stats.orders} t={t} />
          <Kpi icon={Ticket} label={h.vouchers} value={String(stats.vouchers.value)} figure={stats.vouchers} t={t} />
          <Kpi icon={Tag} label={h.liveDeals} value={String(liveDeals)} t={t} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel title={h.perDay}>
          <RevenueChart daily={stats.daily} money={money} locale={locale} empty={h.noSales} />
        </Panel>
        <Panel title={h.topDeals}>
          {stats.top.length ? (
            <ol className="flex flex-col gap-3">
              {stats.top.map((d, i) => (
                <li key={d.title} className="text-sm">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="truncate font-medium">
                      <span className="mr-2 text-muted">{i + 1}</span>
                      {d.title}
                    </span>
                    <span className="shrink-0 text-muted">{fmt(h.sold, { qty: d.qty })}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-line">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${(d.qty / (stats.top[0].qty || 1)) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="py-6 text-center text-sm text-muted">{h.noSales}</p>
          )}
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel
          title={h.recentOrders}
          action={
            <Link href="/dashboard/orders" className="text-sm font-medium text-muted hover:text-ink">
              {h.showAll} →
            </Link>
          }
        >
          {recent.length ? (
            <ul className="-my-2 divide-y divide-line">
              {recent.map((o) => (
                <li key={o.id}>
                  <Link href={`/dashboard/orders/${o.id}`} className="flex items-center gap-3 py-2.5 text-sm hover:opacity-80">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{o.email}</p>
                      <p className="text-xs text-muted">
                        {o.number} · {dateTime(o.created_at, locale)}
                      </p>
                    </div>
                    <span className="hidden sm:inline">
                      <Badge tone={ORDER_TONE[o.status]}>{t.orders.status[o.status]}</Badge>
                    </span>
                    <span className="shrink-0 text-right font-semibold">{formatMoney(o.amount_cents, o.currency, locale)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-6 text-center text-sm text-muted">{h.noSales}</p>
          )}
        </Panel>
        <Panel title={h.quick}>
          <div className="grid grid-cols-2 gap-2">
            <QuickAction href="/dashboard/design" icon={Palette} label={h.editDesign} />
            <QuickAction href="/dashboard/orders" icon={Receipt} label={h.viewOrders} />
            <QuickAction href="/dashboard/partners" icon={Handshake} label={h.addPartner} />
            <QuickAction href="/dashboard/payments" icon={CreditCard} label={h.payments} />
          </div>
        </Panel>
      </div>
    </div>
  );
}

/**
 * Shop logo that stays readable in both dashboard themes: with both variants, each shows on a
 * matching tile; with only one, the tile takes the background that variant was made for.
 */
function ShopLogo({ logos, name, brand }: { logos: HomeData["logos"]; name: string; brand: string }) {
  const tile = "flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-line shadow-card";
  const img = (src: string, extra = "") => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" className={`h-10 w-10 object-contain ${extra}`} />
  );
  if (logos.light && logos.dark) {
    return (
      <>
        <div className={`${tile} bg-white dark:hidden`}>{img(logos.light)}</div>
        <div className={`${tile} hidden bg-[#111] dark:flex`}>{img(logos.dark)}</div>
      </>
    );
  }
  if (logos.light) return <div className={`${tile} bg-white`}>{img(logos.light)}</div>;
  if (logos.dark) return <div className={`${tile} bg-[#111]`}>{img(logos.dark)}</div>;
  return (
    <div className={`${tile} bg-surface`}>
      <span className="text-xl font-bold" style={{ color: brand }}>
        {name.slice(0, 1).toUpperCase()}
      </span>
    </div>
  );
}

function Panel({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="min-w-0 rounded-card border border-line bg-surface-2 p-5 shadow-card">
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="text-base font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function Kpi({ icon: Icon, label, value, figure, t }: { icon: Icon; label: string; value: string; figure?: Figure; t: Dictionary }) {
  const change = figure ? trend(figure) : null;
  return (
    <div className="min-w-0 rounded-card border border-line bg-surface-2 p-4 shadow-card sm:p-5">
      <div className="flex items-center justify-between gap-2 text-muted">
        <span className="truncate text-sm font-medium">{label}</span>
        <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
      </div>
      <p className="mt-2 truncate text-2xl font-bold tracking-tight sm:text-[1.7rem]">{value}</p>
      {change !== null ? (
        <p className={`mt-1 flex items-center gap-1 text-xs font-semibold ${change >= 0 ? "text-success" : "text-danger"}`}>
          {change >= 0 ? <TrendingUp className="h-3.5 w-3.5 shrink-0" aria-hidden /> : <TrendingDown className="h-3.5 w-3.5 shrink-0" aria-hidden />}
          {change > 0 ? "+" : ""}
          {change}%<span className="truncate font-normal text-muted">{t.dashboard.home.vsBefore}</span>
        </p>
      ) : (
        <p className="mt-1 text-xs">&nbsp;</p>
      )}
    </div>
  );
}

function QuickAction({ href, icon: Icon, label }: { href: string; icon: Icon; label: string }) {
  return (
    <Link href={href} className="group flex flex-col gap-3 rounded-input border border-line p-3 text-sm font-medium transition hover:border-ink/30 hover:bg-surface">
      <span className="flex items-center justify-between">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent-text">
          <Icon className="h-4 w-4" strokeWidth={1.75} />
        </span>
        <ArrowUpRight className="h-4 w-4 text-muted opacity-0 transition group-hover:opacity-100" aria-hidden />
      </span>
      {label}
    </Link>
  );
}

/** Bars per day (SVG, stretches with the card); hovering a bar shows date and amount. */
function RevenueChart({ daily, money, locale, empty }: { daily: Overview["daily"]; money: (c: number) => string; locale: string; empty: string }) {
  const max = Math.max(0, ...daily.map((d) => d.cents));
  if (!max) return <p className="flex h-40 items-center justify-center text-sm text-muted">{empty}</p>;
  const label = (day: string) => new Date(`${day}T12:00:00Z`).toLocaleDateString(locale === "de" ? "de-CH" : "en-CH", { day: "numeric", month: "short", timeZone: "Europe/Zurich" });
  const w = 100 / daily.length;
  return (
    <div>
      <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="h-40 w-full" role="img" aria-label={daily.map((d) => `${label(d.day)}: ${money(d.cents)}`).join(", ")}>
        {daily.map((d, i) => {
          const height = d.cents ? Math.max(1, (d.cents / max) * 38) : 0.4;
          return (
            <rect key={d.day} x={i * w + w * 0.15} y={40 - height} width={w * 0.7} height={height} rx={0.6} className={d.cents ? "fill-accent" : "fill-line"}>
              <title>{`${label(d.day)}: ${money(d.cents)}`}</title>
            </rect>
          );
        })}
      </svg>
      <div className="mt-2 flex justify-between gap-2 text-xs text-muted">
        <span>{label(daily[0].day)}</span>
        <span>max. {money(max)}</span>
        <span>{label(daily[daily.length - 1].day)}</span>
      </div>
    </div>
  );
}

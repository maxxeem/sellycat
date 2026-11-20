import Link from "next/link";
import { Suspense } from "react";
import { Card, Notice, PageHeader, Skeleton, Table, tdClass, thClass } from "@/components/ui";
import { loadShopAnalytics } from "@/lib/analytics/load";
import { VIEWS_SINCE, addDays, bucket, change, parseRange, totals } from "@/lib/analytics/metrics";
import { requireTenant } from "@/lib/dashboard/context";
import type { Dictionary } from "@/lib/i18n";
import { fromParams } from "@/lib/i18n/params";
import { formatMoney } from "@/lib/shop/deal-status";
import { Kpi, RangeSwitch } from "@/components/analytics/parts";
import { Trend } from "./trend";

export const metadata = { title: "Analytics" };

type Search = PageProps<"/p/[locale]/dashboard/analytics">["searchParams"];

export default async function AnalyticsPage({ params, searchParams }: PageProps<"/p/[locale]/dashboard/analytics">) {
  const { t, locale } = await fromParams(params);
  return (
    <>
      <PageHeader title={t.analytics.title} description={t.analytics.intro} />
      <Suspense fallback={<Skeleton className="h-96" />}>
        <Analytics t={t} locale={locale} searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Analytics({ t, locale, searchParams }: { t: Dictionary; locale: string; searchParams: Search }) {
  const { tenant } = await requireTenant("editor");
  const days = parseRange((await searchParams).range);
  const a = await loadShopAnalytics(tenant.id, days);
  const now = totals(a.daily);
  const before = totals(a.previous);
  // Conversion needs views for the whole period, otherwise it overstates (views started later).
  const viewsComplete = a.period.from >= VIEWS_SINCE;
  if (!viewsComplete) now.conversion = null;
  if (addDays(a.period.from, -days) < VIEWS_SINCE) before.conversion = null;
  const tag = locale === "de" ? "de-CH" : "en-GB";
  const num = (n: number) => new Intl.NumberFormat(tag).format(n);
  const pct = (n: number | null) => (n == null ? "–" : `${new Intl.NumberFormat(tag, { maximumFractionDigits: 1 }).format(n * 100)} %`);
  const money = (c: number | null) => (c == null ? "–" : formatMoney(c, a.currency, locale));
  const tx = t.analytics;
  const unit = days <= 30 ? tx.perDay : days === 90 ? tx.perWeek : tx.perMonth;
  const nothing = now.revenue_cents === 0 && now.orders === 0 && now.deal_views === 0 && now.shop_views === 0 && now.redemptions === 0;

  const funnel = [
    { label: tx.funnelSteps.shop, value: now.shop_views },
    { label: tx.funnelSteps.deal, value: now.deal_views },
    { label: tx.funnelSteps.checkout, value: now.checkouts },
    { label: tx.funnelSteps.paid, value: now.orders },
  ];
  const funnelMax = Math.max(1, ...funnel.map((f) => f.value));

  return (
    <>
      <RangeSwitch days={days} labels={tx.ranges} base="/dashboard/analytics" />
      {!viewsComplete && <div className="mb-4"><Notice>{tx.viewsSince}</Notice></div>}
      {nothing && <div className="mb-4"><Notice>{tx.empty}</Notice></div>}

      <p className="mb-2 text-xs text-muted">{tx.vsPrevious.replace("{days}", String(days))}</p>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi t={tx} label={tx.kpi.revenue} value={money(now.revenue_cents)} delta={change(now.revenue_cents, before.revenue_cents)} hint={tx.revenueHint} />
        <Kpi t={tx} label={tx.kpi.orders} value={num(now.orders)} delta={change(now.orders, before.orders)} />
        <Kpi t={tx} label={tx.kpi.vouchers} value={num(now.vouchers)} delta={change(now.vouchers, before.vouchers)} />
        <Kpi t={tx} label={tx.kpi.average} value={money(now.averageCents)} delta={change(now.averageCents, before.averageCents)} />
        <Kpi t={tx} label={tx.kpi.views} value={num(now.deal_views)} delta={change(now.deal_views, before.deal_views)} />
        <Kpi t={tx} label={tx.kpi.conversion} value={pct(now.conversion)} delta={change(now.conversion, before.conversion)} hint={tx.conversionHint} />
        <Kpi t={tx} label={tx.kpi.redemptions} value={num(now.redemptions)} delta={change(now.redemptions, before.redemptions)} />
        <Kpi t={tx} label={tx.kpi.fees} value={money(now.fee_cents)} />
      </div>

      <Card className="mt-6" title={tx.chartTitle}>
        <Trend rows={bucket(a.daily, days)} currency={a.currency} locale={locale} unit={unit} t={tx} />
      </Card>

      <Card className="mt-6" title={tx.funnel} description={tx.funnelHint}>
        <ul className="space-y-3">
          {funnel.map((f) => (
            <li key={f.label} className="grid grid-cols-[8.5rem_1fr_4rem] items-center gap-3 text-sm sm:grid-cols-[10rem_1fr_5rem]">
              <span className="text-muted">{f.label}</span>
              <span className="h-3 rounded-full bg-surface-2">
                <span className="block h-3 rounded-full bg-coral" style={{ width: f.value > 0 ? `max(4px, ${(f.value / funnelMax) * 100}%)` : 0 }} />
              </span>
              <span className="text-right font-semibold tabular-nums">{num(f.value)}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="mt-6" title={tx.deals}>
        {a.deals.length === 0 ? (
          <p className="text-sm text-muted">{tx.noDeals}</p>
        ) : (
          <div className="-mx-5 -mb-5 overflow-x-auto">
            <Table>
              <thead className="bg-surface-2 text-left">
                <tr>
                  <th className={thClass}>{tx.dealCols.deal}</th>
                  <th className={`${thClass} hidden md:table-cell`}>{tx.dealCols.partner}</th>
                  <th className={`${thClass} text-right`}>{tx.dealCols.views}</th>
                  <th className={`${thClass} text-right`}>{tx.dealCols.sold}</th>
                  <th className={`${thClass} text-right`}>{tx.dealCols.revenue}</th>
                  <th className={`${thClass} hidden text-right sm:table-cell`}>{tx.dealCols.conversion}</th>
                </tr>
              </thead>
              <tbody>
                {a.deals.map((d) => (
                  <tr key={d.deal_id}>
                    <td className={tdClass}>
                      <Link href={`/dashboard/deals/${d.deal_id}`} className="font-medium hover:underline">{d.title}</Link>
                    </td>
                    <td className={`${tdClass} hidden text-muted md:table-cell`}>{d.partner ?? "–"}</td>
                    <td className={`${tdClass} text-right tabular-nums`}>{num(d.views)}</td>
                    <td className={`${tdClass} text-right tabular-nums`}>{num(d.qty)}</td>
                    <td className={`${tdClass} text-right tabular-nums`}>{money(d.revenue_cents)}</td>
                    <td className={`${tdClass} hidden text-right tabular-nums sm:table-cell`}>{viewsComplete && d.views > 0 ? pct(Math.min(1, d.qty / d.views)) : "–"}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </Card>
    </>
  );
}

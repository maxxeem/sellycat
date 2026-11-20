import Link from "next/link";
import { Suspense } from "react";
import { Kpi, RangeSwitch } from "@/components/analytics/parts";
import { Card, PageHeader, Skeleton, Table, tdClass, thClass } from "@/components/ui";
import { loadPlatformAnalytics } from "@/lib/analytics/load";
import { addDays, parseRange } from "@/lib/analytics/metrics";
import type { Dictionary } from "@/lib/i18n";
import { fromParams } from "@/lib/i18n/params";
import { requireStaff } from "@/lib/platform/staff";
import { formatMoney } from "@/lib/shop/deal-status";
import { PlatformTrend, type PlatformSeries } from "./platform-trend";

export const metadata = { title: "Analytics" };

type Search = PageProps<"/p/[locale]/staff/analytics">["searchParams"];

export default async function StaffAnalyticsPage({ params, searchParams }: PageProps<"/p/[locale]/staff/analytics">) {
  const { t, locale } = await fromParams(params);
  return (
    <>
      <PageHeader title={t.staff.analytics.title} description={t.staff.analytics.intro} />
      <Suspense fallback={<Skeleton className="h-96" />}>
        <Platform t={t} locale={locale} searchParams={searchParams} />
      </Suspense>
    </>
  );
}

/** Long periods per week / 30 days, ending today. */
function group(points: { day: string; value: number }[], days: number) {
  if (days <= 30) return points;
  const size = days === 90 ? 7 : 30;
  const out: { day: string; value: number }[] = [];
  for (let end = points.length; end > 0; end -= size) {
    const part = points.slice(Math.max(0, end - size), end);
    out.unshift({ day: part[0].day, value: part.reduce((a, p) => a + p.value, 0) });
  }
  return out;
}

async function Platform({ t, locale, searchParams }: { t: Dictionary; locale: string; searchParams: Search }) {
  await requireStaff();
  const days = parseRange((await searchParams).range);
  const a = await loadPlatformAnalytics(days);
  const tx = t.staff.analytics;
  const num = (n: number) => new Intl.NumberFormat(locale === "de" ? "de-CH" : "en-GB").format(n);
  const sum = (k: "signups" | "orders" | "views") => a.daily.reduce((s, d) => s + d[k], 0);

  // Every day of the period for each currency's fee series (days without sales = 0).
  const allDays = Array.from({ length: days }, (_, i) => addDays(a.period.from, i));
  const series: PlatformSeries[] = [
    ...a.money.map((m) => ({
      key: `fees-${m.currency}`,
      label: `${tx.fees} ${m.currency}`,
      money: m.currency,
      points: allDays.map((day) => ({ day, value: a.moneyDaily.find((x) => x.day === day && x.currency === m.currency)?.fee_cents ?? 0 })),
    })),
    { key: "orders", label: tx.orders, points: a.daily.map((d) => ({ day: d.day, value: d.orders })) },
    { key: "signups", label: tx.signups, points: a.daily.map((d) => ({ day: d.day, value: d.signups })) },
    { key: "views", label: tx.views, points: a.daily.map((d) => ({ day: d.day, value: d.views })) },
  ].map((s) => ({ ...s, points: group(s.points, days) }));

  return (
    <>
      <RangeSwitch days={days} labels={t.analytics.ranges} base="/admin/analytics" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {a.money.map((m) => (
          <Kpi key={`g${m.currency}`} t={t.analytics} label={`${tx.gmv} ${m.currency}`} value={formatMoney(m.gmv_cents, m.currency, locale)} />
        ))}
        {a.money.map((m) => (
          <Kpi key={`f${m.currency}`} t={t.analytics} label={`${tx.fees} ${m.currency}`} value={formatMoney(m.fee_cents, m.currency, locale)} />
        ))}
        <Kpi t={t.analytics} label={tx.orders} value={num(sum("orders"))} />
        <Kpi t={t.analytics} label={tx.signups} value={num(sum("signups"))} />
        <Kpi t={t.analytics} label={tx.tenants} value={num(a.tenantsTotal)} />
        <Kpi t={t.analytics} label={tx.liveDeals} value={num(a.liveDeals)} />
      </div>

      <Card className="mt-6" title={t.analytics.chartTitle}>
        <PlatformTrend series={series} locale={locale} />
      </Card>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_2fr]">
        <Card title={tx.byPlan}>
          <ul className="space-y-3 text-sm">
            {a.plans.map((p) => (
              <li key={p.plan_id} className="flex items-baseline justify-between gap-3">
                <span>
                  <span className="font-medium capitalize">{p.plan_id}</span>
                  <span className="ml-2 text-xs text-muted">{tx.paying.replace("{count}", num(p.paying))}</span>
                </span>
                <span className="font-semibold tabular-nums">{num(p.tenants)}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card title={tx.top}>
          {a.top.length === 0 ? (
            <p className="text-sm text-muted">{tx.noSales}</p>
          ) : (
            <div className="-mx-5 -mb-5 overflow-x-auto">
              <Table>
                <thead className="bg-surface-2 text-left">
                  <tr>
                    <th className={thClass}>{tx.cols.shop}</th>
                    <th className={`${thClass} hidden sm:table-cell`}>{tx.cols.plan}</th>
                    <th className={`${thClass} text-right`}>{tx.cols.orders}</th>
                    <th className={`${thClass} text-right`}>{tx.cols.gmv}</th>
                    <th className={`${thClass} text-right`}>{tx.cols.fees}</th>
                  </tr>
                </thead>
                <tbody>
                  {a.top.map((r) => (
                    <tr key={`${r.id}-${r.currency}`}>
                      <td className={tdClass}>
                        <Link href={`/admin/tenants/${r.id}`} className="font-medium hover:underline">{r.name}</Link>
                      </td>
                      <td className={`${tdClass} hidden capitalize text-muted sm:table-cell`}>{r.plan_id}</td>
                      <td className={`${tdClass} text-right tabular-nums`}>{num(r.orders)}</td>
                      <td className={`${tdClass} text-right tabular-nums`}>{formatMoney(r.gmv_cents, r.currency, locale)}</td>
                      <td className={`${tdClass} text-right tabular-nums`}>{formatMoney(r.fee_cents, r.currency, locale)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Card>
      </div>
    </>
  );
}

import Link from "next/link";
import { poolLevel } from "@/lib/vouchers/pool";
import { isTeaser } from "@/lib/shop/deal-status";
import { Suspense } from "react";
import { Badge, EmptyState, PageHeader, Skeleton } from "@/components/ui";
import { STATUS_TONE } from "@/lib/dashboard/deal-ui";
import { fmt, type Dictionary } from "@/lib/i18n";
import { fromParams } from "@/lib/i18n/params";
import type { Locale } from "@/lib/i18n/locales";
import { requireTenant } from "@/lib/dashboard/context";
import { dealStatus, formatMoney } from "@/lib/shop/deal-status";
import { NewDealButton } from "./new-deal-button";
import { DealFilters } from "./deal-filters";
import { filterAndSort, listCounts, parseListSort, parseListStatus } from "@/lib/dashboard/deal-list";

export const metadata = { title: "Deals" };

export default async function DealsPage({ params, searchParams }: PageProps<"/p/[locale]/dashboard/deals">) {
  const { t, locale } = await fromParams(params);
  return (
    <>
      <PageHeader title={t.deals.title} actions={<NewDealButton />} />
      <Suspense fallback={<Skeleton className="h-64" />}>
        <DealList t={t} locale={locale} searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function DealList({ t, locale, searchParams }: { t: Dictionary; locale: Locale; searchParams: PageProps<"/p/[locale]/dashboard/deals">["searchParams"] }) {
  const { tenant, supabase } = await requireTenant("editor");
  const query = await searchParams;
  const q = typeof query.q === "string" ? query.q.slice(0, 80) : "";
  const status = parseListStatus(query.status);
  const sort = parseListSort(query.sort);
  const [{ data: deals }, { data: info }] = await Promise.all([
    supabase
      .from("deals")
      .select("id, title, subtitle, slug, state, sales_start, sales_end, total_qty, sold_qty, reserved_qty, code_source, pool_free, teaser, price_cents, featured, created_at, updated_at, view_count, archived_at, partners(name), deal_images(url, sort_order)")
      .eq("tenant_id", tenant.id)
      .limit(2000),
    supabase.from("tenants").select("currency").eq("id", tenant.id).single(),
  ]);
  if (!deals?.length) return <EmptyState title={t.deals.empty} action={<NewDealButton />} />;
  const now = new Date();
  const shown = filterAndSort(deals, { q, status, sort }, now) as typeof deals;
  const date = (iso: string) => new Date(iso).toLocaleDateString(locale === "de" ? "de-CH" : "en-CH", { day: "numeric", month: "short", timeZone: "Europe/Zurich" });
  return (
    <>
      <DealFilters q={q} status={status} sort={sort} counts={listCounts(deals, q, now)} />
      {!shown.length ? <p className="rounded-card border border-dashed border-line p-8 text-center text-sm text-muted">{t.deals.list.noResults}</p> : null}
    <ul className="grid gap-3" data-testid="deal-list">
      {shown.map((d) => {
        const status = dealStatus(d, now);
        const pool = d.code_source === "pool" && d.state !== "ended" ? poolLevel(d.pool_free, d.sold_qty) : "ok";
        const cover = [...(d.deal_images ?? [])].sort((a, b) => a.sort_order - b.sort_order)[0];
        return (
          <li key={d.id}>
            <Link href={`/dashboard/deals/${d.id}`} className="flex items-center gap-4 rounded-card border border-line bg-surface-2 p-3 shadow-card transition hover:border-ink">
              <span className="h-16 w-24 shrink-0 overflow-hidden rounded-input bg-surface">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {cover ? <img src={cover.url} alt="" className="h-full w-full object-cover" /> : null}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold">{d.title}</span>
                <span className="block truncate text-sm text-muted">
                  {[
                    d.partners?.name,
                    formatMoney(d.price_cents, info?.currency ?? "CHF", locale),
                    fmt(t.deals.sold, { sold: d.sold_qty }) + (d.total_qty !== null ? ` / ${d.total_qty}` : ""),
                    fmt(t.deals.list.views, { count: d.view_count }),
                    status === "scheduled" && d.sales_start ? fmt(t.deals.list.starts, { date: date(d.sales_start) }) : status === "live" && d.sales_end ? fmt(t.deals.list.ends, { date: date(d.sales_end) }) : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </span>
              <span className="flex shrink-0 flex-col items-end gap-1">
                {d.archived_at ? <Badge tone="neutral">{t.deals.archivedBadge}</Badge> : <Badge tone={STATUS_TONE[status]}>{t.deals.status[status]}</Badge>}
                {!d.archived_at && isTeaser(d, now) ? <Badge tone="amber">{t.deals.teaserBadge}</Badge> : null}
                {pool !== "ok" ? <Badge tone={pool === "empty" ? "red" : "amber"}>{t.deals.pool.badge[pool]}</Badge> : null}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
    </>
  );
}

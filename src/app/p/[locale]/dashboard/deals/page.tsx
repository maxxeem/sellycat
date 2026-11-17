import Link from "next/link";
import { poolLevel } from "@/lib/vouchers/pool";
import { Suspense } from "react";
import { Badge, EmptyState, PageHeader, Skeleton } from "@/components/ui";
import { STATUS_TONE } from "@/lib/dashboard/deal-ui";
import { fmt, type Dictionary } from "@/lib/i18n";
import { fromParams } from "@/lib/i18n/params";
import type { Locale } from "@/lib/i18n/locales";
import { requireTenant } from "@/lib/dashboard/context";
import { dealStatus, formatMoney } from "@/lib/shop/deal-status";
import { NewDealButton } from "./new-deal-button";

export const metadata = { title: "Deals" };

export default async function DealsPage({ params }: PageProps<"/p/[locale]/dashboard/deals">) {
  const { t, locale } = await fromParams(params);
  return (
    <>
      <PageHeader title={t.deals.title} actions={<NewDealButton />} />
      <Suspense fallback={<Skeleton className="h-64" />}>
        <DealList t={t} locale={locale} />
      </Suspense>
    </>
  );
}

async function DealList({ t, locale }: { t: Dictionary; locale: Locale }) {
  const { tenant, supabase } = await requireTenant("editor");
  const [{ data: deals }, { data: info }] = await Promise.all([
    supabase
      .from("deals")
      .select("id, title, state, sales_start, sales_end, total_qty, sold_qty, reserved_qty, code_source, pool_free, price_cents, featured, partners(name), deal_images(url, sort_order)")
      .eq("tenant_id", tenant.id)
      .order("sort_order")
      .order("created_at", { ascending: false }),
    supabase.from("tenants").select("currency").eq("id", tenant.id).single(),
  ]);
  if (!deals?.length) return <EmptyState title={t.deals.empty} action={<NewDealButton />} />;
  return (
    <ul className="grid gap-3">
      {deals.map((d) => {
        const status = dealStatus(d);
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
                  {[d.partners?.name, formatMoney(d.price_cents, info?.currency ?? "CHF", locale), fmt(t.deals.sold, { sold: d.sold_qty }) + (d.total_qty !== null ? ` / ${d.total_qty}` : "")].filter(Boolean).join(" · ")}
                </span>
              </span>
              <span className="flex shrink-0 flex-col items-end gap-1">
                <Badge tone={STATUS_TONE[status]}>{t.deals.status[status]}</Badge>
                {pool !== "ok" ? <Badge tone={pool === "empty" ? "red" : "amber"}>{t.deals.pool.badge[pool]}</Badge> : null}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

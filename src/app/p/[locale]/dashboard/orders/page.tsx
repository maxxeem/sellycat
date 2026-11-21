import Link from "next/link";
import { Suspense } from "react";
import { Badge, EmptyState, Input, PageHeader, Select, Skeleton, Table, buttonClass, tdClass, thClass } from "@/components/ui";
import type { Dictionary } from "@/lib/i18n";
import { fromParams } from "@/lib/i18n/params";
import { requireTenant } from "@/lib/dashboard/context";
import { ORDER_STATUSES, ORDER_TONE, dateTime } from "@/lib/dashboard/order-ui";
import { formatMoney } from "@/lib/shop/deal-status";

export const metadata = { title: "Orders" };
const PAGE_SIZE = 50;

export default async function OrdersPage({ params, searchParams }: PageProps<"/p/[locale]/dashboard/orders">) {
  const { t, locale } = await fromParams(params);
  return (
    <>
      <PageHeader title={t.orders.title} />
      <Suspense fallback={<Skeleton className="h-64" />}>
        <Orders t={t} locale={locale} searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Orders({ t, locale, searchParams }: { t: Dictionary; locale: string; searchParams: PageProps<"/p/[locale]/dashboard/orders">["searchParams"] }) {
  const { tenant, supabase } = await requireTenant("editor");
  const sp = await searchParams;
  const status = ORDER_STATUSES.find((s) => s === sp.status);
  // Only characters that are safe inside a PostgREST or() filter.
  const q = typeof sp.q === "string" ? sp.q.replace(/[^\p{L}\p{N}@._+-]/gu, "").slice(0, 80) : "";
  const page = Math.max(0, Number(sp.page) || 0);

  let query = supabase
    .from("orders")
    .select("id, number, status, email, name, currency, amount_cents, refunded_cents, created_at, order_items(title, qty)", { count: "exact" })
    .eq("tenant_id", tenant.id)
    .order("created_at", { ascending: false })
    .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
  if (status) query = query.eq("status", status);
  else query = query.neq("status", "expired");
  if (q) query = query.or(`email.ilike.%${q}%,number.ilike.%${q}%`);
  const { data: orders, count } = await query;
  const link = (p: Record<string, string | number | undefined>) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries({ status, q: q || undefined, ...p })) if (v !== undefined && v !== "") u.set(k, String(v));
    return `/dashboard/orders${u.size ? `?${u}` : ""}`;
  };

  return (
    <div className="flex flex-col gap-4">
      <form className="flex flex-wrap gap-2" action="/dashboard/orders">
        <Input name="q" defaultValue={q} placeholder={t.orders.search} className="max-w-xs" />
        <Select name="status" defaultValue={status ?? ""} className="max-w-48">
          <option value="">{t.orders.all}</option>
          {ORDER_STATUSES.map((s) => (
            <option key={s} value={s}>
              {t.orders.status[s]}
            </option>
          ))}
        </Select>
        <button type="submit" className={buttonClass.secondary}>
          {t.orders.filter}
        </button>
      </form>

      {!orders?.length ? (
        <EmptyState title={t.orders.empty} description={t.orders.emptyHint} />
      ) : (
        <Table fit>
          <thead>
            <tr className="text-left">
              <th className={thClass}>{t.orders.number}</th>
              <th className={`${thClass} hidden sm:table-cell`}>{t.orders.date}</th>
              <th className={`${thClass} hidden sm:table-cell`}>{t.orders.buyer}</th>
              <th className={`${thClass} hidden md:table-cell`}>{t.orders.items}</th>
              <th className={`${thClass} text-right`}>{t.orders.amount}</th>
              <th className={`${thClass} hidden sm:table-cell`}></th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="hover:bg-surface">
                <td className={tdClass}>
                  <Link href={`/dashboard/orders/${o.id}`} className="font-mono font-semibold hover:underline">
                    {o.number}
                  </Link>
                  {/* Phones: date and buyer under the number instead of own columns. */}
                  <span className="mt-0.5 block max-w-[9.5rem] truncate text-xs text-muted sm:hidden">
                    {dateTime(o.created_at, locale)} · {o.email}
                  </span>
                </td>
                <td className={`${tdClass} hidden whitespace-nowrap text-muted sm:table-cell`}>{dateTime(o.created_at, locale)}</td>
                <td className={`${tdClass} hidden max-w-56 truncate sm:table-cell`}>{o.name ? `${o.name} · ${o.email}` : o.email}</td>
                <td className={`${tdClass} hidden max-w-72 truncate md:table-cell`}>{o.order_items.map((i) => `${i.qty} × ${i.title}`).join(", ")}</td>
                <td className={`${tdClass} whitespace-nowrap text-right font-semibold`}>
                  {formatMoney(o.amount_cents, o.currency, locale)}
                  <span className="mt-1 block sm:hidden">
                    <Badge tone={ORDER_TONE[o.status]}>{t.orders.status[o.status]}</Badge>
                  </span>
                </td>
                <td className={`${tdClass} hidden sm:table-cell`}>
                  <Badge tone={ORDER_TONE[o.status]}>{t.orders.status[o.status]}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {(count ?? 0) > PAGE_SIZE ? (
        <div className="flex gap-2">
          {page > 0 ? (
            <Link href={link({ page: page - 1 || undefined })} className={buttonClass.secondary}>
              {t.orders.prev}
            </Link>
          ) : null}
          {(page + 1) * PAGE_SIZE < (count ?? 0) ? (
            <Link href={link({ page: page + 1 })} className={buttonClass.secondary}>
              {t.orders.next}
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

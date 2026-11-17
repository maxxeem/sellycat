import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { Download } from "lucide-react";
import { Badge, EmptyState, Input, PageHeader, Select, Skeleton, Table, buttonClass, tdClass, thClass } from "@/components/ui";
import type { Dictionary } from "@/lib/i18n";
import { fromParams } from "@/lib/i18n/params";
import { roleAtLeast } from "@/lib/auth/tenants";
import { requireTenant } from "@/lib/dashboard/context";
import { VOUCHER_STATUSES, VOUCHER_TONE, dateTime, shownVoucherStatus } from "@/lib/dashboard/order-ui";
import { formatMoney } from "@/lib/shop/deal-status";
import { shopUrlForSlug } from "@/lib/site/hosts";
import { VoidButton } from "./void-button";

export const metadata = { title: "Vouchers" };
const PAGE_SIZE = 50;

export default async function VouchersPage({ params, searchParams }: PageProps<"/p/[locale]/dashboard/vouchers">) {
  const { t, locale } = await fromParams(params);
  return (
    <>
      <PageHeader title={t.vouchers.title} />
      <Suspense fallback={<Skeleton className="h-64" />}>
        <Vouchers t={t} locale={locale} searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Vouchers({ t, locale, searchParams }: { t: Dictionary; locale: string; searchParams: PageProps<"/p/[locale]/dashboard/vouchers">["searchParams"] }) {
  const { tenant, supabase } = await requireTenant("editor");
  await connection();
  const sp = await searchParams;
  const status = VOUCHER_STATUSES.find((s) => s === sp.status);
  const q = typeof sp.q === "string" ? sp.q.replace(/[^\p{L}\p{N}@._+\- ]/gu, "").trim().slice(0, 80) : "";
  const page = Math.max(0, Number(sp.page) || 0);
  const v = t.vouchers;

  let query = supabase
    .from("vouchers")
    .select("id, code, title, status, value_cents, remaining_cents, valid_until, created_at, token, orders!inner(id, number, email, currency)", { count: "exact" })
    .eq("tenant_id", tenant.id)
    .order("created_at", { ascending: false })
    .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
  if (status) query = query.eq("status", status);
  if (q.includes("@")) query = query.ilike("orders.email", `%${q}%`);
  else if (q) query = query.ilike("code", `%${q.replace(/\s/g, "%")}%`);
  const { data: vouchers, count } = await query;
  const base = shopUrlForSlug(tenant.slug);
  const canVoid = roleAtLeast(tenant.role, "admin");
  const link = (p: Record<string, string | number | undefined>) => {
    const u = new URLSearchParams();
    for (const [k, val] of Object.entries({ status, q: q || undefined, ...p })) if (val !== undefined && val !== "") u.set(k, String(val));
    return u.size ? `?${u}` : "";
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <form className="flex flex-wrap gap-2" action="/dashboard/vouchers">
          <Input name="q" defaultValue={q} placeholder={v.search} className="max-w-xs" />
          <Select name="status" defaultValue={status ?? ""} className="max-w-48">
            <option value="">{v.all}</option>
            {VOUCHER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {t.shop.voucherStatus[s]}
              </option>
            ))}
          </Select>
          <button type="submit" className={buttonClass.secondary}>
            {t.orders.filter}
          </button>
        </form>
        <a href={`/api/dashboard/export${link({ kind: "vouchers" })}`} className={buttonClass.ghost}>
          <Download className="h-4 w-4" aria-hidden /> {v.export}
        </a>
      </div>

      {!vouchers?.length ? (
        <EmptyState title={v.empty} />
      ) : (
        <Table>
          <thead>
            <tr className="text-left">
              <th className={thClass}>{v.code}</th>
              <th className={`${thClass} hidden md:table-cell`}>{v.deal}</th>
              <th className={`${thClass} hidden lg:table-cell`}>{v.buyer}</th>
              <th className={`${thClass} hidden sm:table-cell`}>{v.validUntil}</th>
              <th className={`${thClass} text-right`}>{v.value}</th>
              <th className={thClass}>{v.status}</th>
              <th className={thClass}></th>
            </tr>
          </thead>
          <tbody>
            {vouchers.map((row) => {
              const shown = shownVoucherStatus(row);
              return (
                <tr key={row.id} className="hover:bg-surface">
                  <td className={`${tdClass} whitespace-nowrap font-mono font-semibold`}>{row.code}</td>
                  <td className={`${tdClass} hidden max-w-56 truncate md:table-cell`}>{row.title}</td>
                  <td className={`${tdClass} hidden max-w-56 truncate lg:table-cell`}>
                    <Link href={`/dashboard/orders/${row.orders.id}`} className="hover:underline">
                      {row.orders.email}
                    </Link>
                  </td>
                  <td className={`${tdClass} hidden whitespace-nowrap text-muted sm:table-cell`}>{row.valid_until ? dateTime(row.valid_until, locale).slice(0, 10) : "–"}</td>
                  <td className={`${tdClass} whitespace-nowrap text-right`}>
                    {row.value_cents ? (
                      <>
                        {formatMoney(row.remaining_cents ?? 0, row.orders.currency, locale)}
                        <span className="text-muted"> / {formatMoney(row.value_cents, row.orders.currency, locale)}</span>
                      </>
                    ) : (
                      "–"
                    )}
                  </td>
                  <td className={tdClass}>
                    <Badge tone={VOUCHER_TONE[shown]}>{t.shop.voucherStatus[shown]}</Badge>
                  </td>
                  <td className={`${tdClass} whitespace-nowrap text-right`}>
                    <a href={`${base}/v/${row.token}`} target="_blank" rel="noreferrer" className="text-sm font-medium text-muted hover:text-ink">
                      {v.open}
                    </a>
                    {canVoid && shown === "valid" ? <VoidButton id={row.id} /> : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}

      {(count ?? 0) > PAGE_SIZE ? (
        <div className="flex gap-2">
          {page > 0 ? (
            <Link href={`/dashboard/vouchers${link({ page: page - 1 || undefined })}`} className={buttonClass.secondary}>
              {t.orders.prev}
            </Link>
          ) : null}
          {(page + 1) * PAGE_SIZE < (count ?? 0) ? (
            <Link href={`/dashboard/vouchers${link({ page: page + 1 })}`} className={buttonClass.secondary}>
              {t.orders.next}
            </Link>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

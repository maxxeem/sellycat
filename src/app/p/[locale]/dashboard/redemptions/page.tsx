import { Suspense } from "react";
import { Download } from "lucide-react";
import { EmptyState, PageHeader, Skeleton, Table, buttonClass, tdClass, thClass } from "@/components/ui";
import type { Dictionary } from "@/lib/i18n";
import { fromParams } from "@/lib/i18n/params";
import { roleAtLeast } from "@/lib/auth/tenants";
import { requireTenant } from "@/lib/dashboard/context";
import { dateTime } from "@/lib/dashboard/order-ui";
import { formatMoney } from "@/lib/shop/deal-status";
import { createAdminClient } from "@/lib/supabase/admin";
import { RedeemBox } from "./redeem-box";
import { UndoButton } from "./undo-button";

export const metadata = { title: "Redemptions" };
const UNDO_DAYS = 7;
/** Still inside the undo period (the database checks again). */
const undoable = (iso: string) => Date.now() - new Date(iso).getTime() < UNDO_DAYS * 86_400_000;

export default async function RedemptionsPage({ params }: PageProps<"/p/[locale]/dashboard/redemptions">) {
  const { t, locale } = await fromParams(params);
  return (
    <>
      <PageHeader title={t.dashboard.nav.redemptions} />
      <div className="flex flex-col gap-6">
        <RedeemBox />
        <Suspense fallback={<Skeleton className="h-64" />}>
          <Log t={t} locale={locale} />
        </Suspense>
      </div>
    </>
  );
}

/** Latest redemptions (people who see orders see all; redeemers and partners their own). */
async function Log({ t, locale }: { t: Dictionary; locale: string }) {
  const { tenant, supabase } = await requireTenant("redeemer");
  const v = t.vouchers;
  const { data: rows } = await supabase
    .from("redemptions")
    .select("id, amount_cents, created_at, undone_at, user_id, source, vouchers(code, title, orders(currency)), partner_locations(name)")
    .eq("tenant_id", tenant.id)
    .order("created_at", { ascending: false })
    .limit(100);
  // Names of the people who redeemed (after the role check above).
  const ids = [...new Set((rows ?? []).map((r) => r.user_id).filter((x): x is string => Boolean(x)))];
  const { data: people } = ids.length ? await createAdminClient().from("profiles").select("user_id, full_name").in("user_id", ids) : { data: [] };
  const name = (id: string | null) => people?.find((p) => p.user_id === id)?.full_name ?? "–";
  const canUndo = roleAtLeast(tenant.role, "admin");

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold">{v.log}</h2>
        {roleAtLeast(tenant.role, "editor") ? (
          <a href="/api/dashboard/export?kind=redemptions" className={buttonClass.ghost}>
            <Download className="h-4 w-4" aria-hidden /> {v.export}
          </a>
        ) : null}
      </div>
      {!rows?.length ? (
        <EmptyState title={v.logEmpty} />
      ) : (
        <Table fit>
          <thead>
            <tr className="text-left">
              <th className={thClass}>{v.when}</th>
              <th className={`${thClass} hidden sm:table-cell`}>{v.code}</th>
              <th className={`${thClass} hidden md:table-cell`}>{v.deal}</th>
              <th className={`${thClass} hidden sm:table-cell`}>{v.by}</th>
              <th className={`${thClass} text-right`}>{v.amount}</th>
              <th className={thClass}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className={r.undone_at ? "text-muted line-through" : "hover:bg-surface"}>
                <td className={`${tdClass} whitespace-nowrap`}>
                  {dateTime(r.created_at, locale)}
                  <span className="mt-0.5 block font-mono text-xs text-muted sm:hidden">{r.vouchers?.code}</span>
                </td>
                <td className={`${tdClass} hidden whitespace-nowrap font-mono sm:table-cell`}>{r.vouchers?.code}</td>
                <td className={`${tdClass} hidden max-w-56 truncate md:table-cell`}>{r.vouchers?.title}</td>
                <td className={`${tdClass} hidden max-w-40 truncate sm:table-cell`}>{name(r.user_id)}</td>
                <td className={`${tdClass} whitespace-nowrap text-right`}>{r.amount_cents ? formatMoney(r.amount_cents, r.vouchers?.orders?.currency ?? "CHF", locale) : "–"}</td>
                <td className={`${tdClass} whitespace-nowrap text-right no-underline`}>
                  {r.undone_at ? (
                    <span className="text-xs">{v.undone}</span>
                  ) : canUndo && undoable(r.created_at) ? (
                    <UndoButton id={r.id} />
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </section>
  );
}

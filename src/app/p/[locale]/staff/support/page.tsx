import Link from "next/link";
import { Suspense } from "react";
import { Badge, Card, EmptyState, PageHeader, Skeleton, Table, tdClass, thClass } from "@/components/ui";
import { fmt, type Dictionary } from "@/lib/i18n";
import { fromParams } from "@/lib/i18n/params";
import { requireStaff } from "@/lib/platform/staff";
import { STATUS_TONE, SUPPORT_STATUSES, isSupportCategory, isSupportStatus } from "@/lib/support/rules";
import { createAdminClient } from "@/lib/supabase/admin";
import { NotifySettings } from "./panels";

export const metadata = { title: "Support" };

export default async function StaffSupportPage({ params, searchParams }: PageProps<"/p/[locale]/staff/support">) {
  const { t } = await fromParams(params);
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <Inbox t={t} searchParams={searchParams} />
    </Suspense>
  );
}

async function Inbox({ t, searchParams }: { t: Dictionary; searchParams: PageProps<"/p/[locale]/staff/support">["searchParams"] }) {
  await requireStaff();
  const sp = await searchParams;
  const status = isSupportStatus(sp.status) ? sp.status : null;
  const admin = createAdminClient();
  let q = admin.from("support_tickets").select("id, number, subject, category, status, user_name, user_email, tenant_name, plan_id, last_message_at").order("last_message_at", { ascending: false }).limit(300);
  if (status) q = q.eq("status", status);
  const [{ data: tickets }, { count: open }, { data: settings }, { data: staffRows }] = await Promise.all([
    q,
    admin.from("support_tickets").select("id", { count: "exact", head: true }).neq("status", "done"),
    admin.from("platform_settings").select("support_notify_email, support_notify_staff_ids").maybeSingle(),
    admin.from("platform_staff").select("user_id"),
  ]);
  const staff = await Promise.all(
    (staffRows ?? []).map(async (r) => {
      const { data } = await admin.auth.admin.getUserById(r.user_id);
      return { id: r.user_id, label: data.user?.email ?? r.user_id };
    }),
  );
  const s = t.staff.support;
  const when = (iso: string) => new Date(iso).toLocaleString("de-CH", { timeZone: "Europe/Zurich", dateStyle: "short", timeStyle: "short" });
  const filters = [{ key: null, label: s.all }, ...SUPPORT_STATUSES.map((k) => ({ key: k, label: t.support.statuses[k] }))];
  return (
    <>
      <PageHeader title={s.title} description={fmt(s.intro, { open: open ?? 0 })} />
      <nav className="mb-4 flex w-fit flex-wrap gap-1 rounded-xl bg-surface-2 p-1">
        {filters.map((f) => (
          <Link
            key={f.label}
            href={f.key ? `/admin/support?status=${f.key}` : "/admin/support"}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${status === f.key ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"}`}
          >
            {f.label}
          </Link>
        ))}
      </nav>
      {tickets?.length ? (
        <Table>
          <thead>
            <tr>
              <th className={thClass}>{s.cols.number}</th>
              <th className={thClass}>{s.cols.subject}</th>
              <th className={`${thClass} hidden md:table-cell`}>{s.cols.from}</th>
              <th className={`${thClass} hidden lg:table-cell`}>{s.cols.category}</th>
              <th className={thClass}>{s.cols.status}</th>
              <th className={`${thClass} hidden sm:table-cell`}>{s.cols.last}</th>
            </tr>
          </thead>
          <tbody>
            {tickets.map((tk) => (
              <tr key={tk.id}>
                <td className={`${tdClass} text-muted tabular-nums`}>{tk.number}</td>
                <td className={tdClass}>
                  <Link href={`/admin/support/${tk.id}`} className="font-medium hover:underline">{tk.subject}</Link>
                </td>
                <td className={`${tdClass} hidden md:table-cell`}>
                  {tk.user_name || tk.user_email}
                  <span className="block text-xs text-muted">{tk.tenant_name ?? "–"} · {tk.plan_id ?? "–"}</span>
                </td>
                <td className={`${tdClass} hidden text-muted lg:table-cell`}>{isSupportCategory(tk.category) ? t.support.categories[tk.category] : tk.category}</td>
                <td className={tdClass}>{isSupportStatus(tk.status) ? <Badge tone={STATUS_TONE[tk.status]}>{t.support.statuses[tk.status]}</Badge> : tk.status}</td>
                <td className={`${tdClass} hidden whitespace-nowrap text-sm text-muted sm:table-cell`}>{when(tk.last_message_at)}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      ) : (
        <EmptyState title={s.none} />
      )}
      <Card className="mt-6" title={s.notify} description={s.notifyIntro}>
        <NotifySettings email={settings?.support_notify_email ?? ""} staffIds={settings?.support_notify_staff_ids ?? []} staff={staff} />
      </Card>
    </>
  );
}

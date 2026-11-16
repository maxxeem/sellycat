import { Suspense } from "react";
import { EmptyState, PageHeader, Skeleton, Table, tdClass, thClass } from "@/components/ui";
import type { Dictionary } from "@/lib/i18n";
import { fromParams } from "@/lib/i18n/params";
import { intlTag, type Locale } from "@/lib/i18n/locales";
import { requireStaff } from "@/lib/platform/staff";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function AuditPage({ params }: PageProps<"/p/[locale]/staff/audit">) {
  const { t, locale } = await fromParams(params);
  return (
    <>
      <PageHeader title={t.staff.audit} />
      <Suspense fallback={<Skeleton className="h-64" />}>
        <AuditList t={t} locale={locale} />
      </Suspense>
    </>
  );
}

async function AuditList({ t, locale }: { t: Dictionary; locale: Locale }) {
  await requireStaff();
  const db = createAdminClient();
  const { data } = await db.from("platform_audit_log").select("id, actor_id, action, tenant_id, target_type, target_id, meta, created_at").order("created_at", { ascending: false }).limit(200);
  if (!data?.length) return <EmptyState title={t.staff.emptyAudit} />;
  const date = new Intl.DateTimeFormat(intlTag(locale), { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Zurich" });
  const actorIds = [...new Set(data.map((r) => r.actor_id).filter((v): v is string => Boolean(v)))];
  const actors = new Map<string, string>();
  for (const id of actorIds) {
    const { data: u } = await db.auth.admin.getUserById(id);
    if (u.user?.email) actors.set(id, u.user.email);
  }
  return (
    <Table>
      <thead>
        <tr>
          <th className={thClass}>{t.staff.when}</th>
          <th className={thClass}>{t.staff.action}</th>
          <th className={thClass}>{t.staff.actor}</th>
          <th className={thClass}>Details</th>
        </tr>
      </thead>
      <tbody>
        {data.map((r) => (
          <tr key={r.id}>
            <td className={`${tdClass} whitespace-nowrap`}>{date.format(new Date(r.created_at))}</td>
            <td className={tdClass}>{r.action}</td>
            <td className={tdClass}>{r.actor_id ? (actors.get(r.actor_id) ?? r.actor_id) : "–"}</td>
            <td className={`${tdClass} max-w-xs truncate font-mono text-xs text-muted`}>{JSON.stringify(r.meta)}</td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

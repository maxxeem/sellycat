import Link from "next/link";
import { Suspense } from "react";
import { Badge, EmptyState, PageHeader, Skeleton, Table, buttonClass, tdClass, thClass } from "@/components/ui";
import type { Dictionary } from "@/lib/i18n";
import { fromParams } from "@/lib/i18n/params";
import { intlTag, type Locale } from "@/lib/i18n/locales";
import { requireStaff } from "@/lib/platform/staff";
import { createAdminClient } from "@/lib/supabase/admin";
import { statusTone } from "./status";

export default async function TenantsPage({ params }: PageProps<"/p/[locale]/staff/tenants">) {
  const { t, locale } = await fromParams(params);
  return (
    <>
      <PageHeader
        title={t.staff.tenants}
        actions={
          <Link href="/admin/tenants/new" className={buttonClass.primary}>
            {t.staff.newTenant}
          </Link>
        }
      />
      <Suspense fallback={<Skeleton className="h-64" />}>
        <TenantList t={t} locale={locale} />
      </Suspense>
    </>
  );
}

async function TenantList({ t, locale }: { t: Dictionary; locale: Locale }) {
  await requireStaff();
  const { data } = await createAdminClient().from("tenants").select("id, name, slug, status, plan_id, created_at").order("created_at", { ascending: false }).limit(500);
  if (!data?.length) return <EmptyState title={t.staff.noTenants} />;
  const date = new Intl.DateTimeFormat(intlTag(locale), { dateStyle: "medium" });
  return (
    <Table>
      <thead>
        <tr>
          <th className={thClass}>{t.staff.name}</th>
          <th className={thClass}>{t.staff.slug}</th>
          <th className={thClass}>{t.staff.status}</th>
          <th className={thClass}>{t.staff.plan}</th>
          <th className={thClass}>{t.staff.created}</th>
        </tr>
      </thead>
      <tbody>
        {data.map((row) => (
          <tr key={row.id} className="hover:bg-surface">
            <td className={tdClass}>
              <Link href={`/admin/tenants/${row.id}`} className="font-semibold hover:underline">
                {row.name}
              </Link>
            </td>
            <td className={tdClass}>{row.slug}</td>
            <td className={tdClass}>
              <Badge tone={statusTone(row.status)}>{row.status}</Badge>
            </td>
            <td className={tdClass}>{row.plan_id}</td>
            <td className={tdClass}>{date.format(new Date(row.created_at))}</td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

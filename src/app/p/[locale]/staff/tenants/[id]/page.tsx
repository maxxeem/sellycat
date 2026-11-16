import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Badge, Card, PageHeader, Skeleton, Table, tdClass, thClass } from "@/components/ui";
import type { Dictionary } from "@/lib/i18n";
import { fromParams } from "@/lib/i18n/params";
import { LOCALES } from "@/lib/i18n/locales";
import { requireStaff } from "@/lib/platform/staff";
import { createAdminClient } from "@/lib/supabase/admin";
import { shopUrlForSlug } from "@/lib/site/hosts";
import { statusTone } from "../status";
import { TenantSettingsForm } from "./form";

// Cache Components needs one param to validate the route; real ids render on demand.
export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale, id: "00000000-0000-0000-0000-000000000000" }));
}

export default async function TenantDetailPage({ params }: PageProps<"/p/[locale]/staff/tenants/[id]">) {
  const { t } = await fromParams(params);
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <Detail t={t} idPromise={params.then((p) => p.id)} />
    </Suspense>
  );
}

async function Detail({ t, idPromise }: { t: Dictionary; idPromise: Promise<string> }) {
  await requireStaff();
  const id = await idPromise;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const db = createAdminClient();
  const [{ data: tenant }, { data: plans }, { data: domains }, { data: members }] = await Promise.all([
    db.from("tenants").select("*").eq("id", id).maybeSingle(),
    db.from("plans").select("id, name").order("sort_order"),
    db.from("tenant_domains").select("hostname, kind, status, is_primary").eq("tenant_id", id),
    db.from("tenant_members").select("user_id, role").eq("tenant_id", id),
  ]);
  if (!tenant) notFound();
  const emails = new Map<string, string>();
  for (const m of members ?? []) {
    const { data } = await db.auth.admin.getUserById(m.user_id);
    if (data.user?.email) emails.set(m.user_id, data.user.email);
  }
  return (
    <>
      <PageHeader
        title={tenant.name}
        description={shopUrlForSlug(tenant.slug).replace(/^https?:\/\//, "")}
        actions={<Badge tone={statusTone(tenant.status)}>{tenant.status}</Badge>}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title={t.staff.settings}>
          <TenantSettingsForm id={tenant.id} status={tenant.status} planId={tenant.plan_id} feeBps={tenant.fee_override_bps} plans={plans ?? []} />
        </Card>
        <Card title="Team">
          <ul className="flex flex-col gap-2 text-sm">
            {(members ?? []).map((m) => (
              <li key={m.user_id} className="flex justify-between gap-3">
                <span className="truncate">{emails.get(m.user_id) ?? m.user_id}</span>
                <Badge>{m.role}</Badge>
              </li>
            ))}
          </ul>
        </Card>
      </div>
      <h2 className="mb-3 mt-8 text-lg font-bold">Domains</h2>
      <Table>
        <thead>
          <tr>
            <th className={thClass}>Host</th>
            <th className={thClass}>Typ</th>
            <th className={thClass}>{t.staff.status}</th>
          </tr>
        </thead>
        <tbody>
          {(domains ?? []).map((d) => (
            <tr key={d.hostname}>
              <td className={tdClass}>
                {d.hostname} {d.is_primary ? <Badge tone="coral">primary</Badge> : null}
              </td>
              <td className={tdClass}>{d.kind}</td>
              <td className={tdClass}>{d.status}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </>
  );
}

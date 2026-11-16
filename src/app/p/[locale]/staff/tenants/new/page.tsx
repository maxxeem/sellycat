import { Suspense } from "react";
import { Card, PageHeader, Skeleton } from "@/components/ui";
import { fromParams } from "@/lib/i18n/params";
import { requireStaff } from "@/lib/platform/staff";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_ROOT, siteHost } from "@/lib/site/hosts";
import { NewTenantForm } from "./form";

export default async function NewTenantPage({ params }: PageProps<"/p/[locale]/staff/tenants/new">) {
  const { t } = await fromParams(params);
  return (
    <>
      <PageHeader title={t.staff.newTenant} />
      <Card className="max-w-xl">
        <Suspense fallback={<Skeleton className="h-80" />}>
          <FormWithPlans />
        </Suspense>
      </Card>
    </>
  );
}

async function FormWithPlans() {
  await requireStaff();
  const { data } = await createAdminClient().from("plans").select("id, name").order("sort_order");
  return <NewTenantForm plans={data ?? []} root={(siteHost() || DEFAULT_ROOT).split(":")[0]} />;
}

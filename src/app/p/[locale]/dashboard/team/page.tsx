import { Suspense } from "react";
import { PageHeader, Skeleton } from "@/components/ui";
import { roleAtLeast } from "@/lib/auth/tenants";
import { requireTenant } from "@/lib/dashboard/context";
import { fromParams } from "@/lib/i18n/params";
import { loadTeam } from "@/lib/team/team";
import { TeamManager } from "./team-manager";

export const metadata = { title: "Team" };

export default async function TeamPage({ params }: PageProps<"/p/[locale]/dashboard/team">) {
  const { t } = await fromParams(params);
  return (
    <>
      <PageHeader title={t.team.title} description={t.team.intro} />
      <Suspense fallback={<Skeleton className="h-80" />}>
        <Team />
      </Suspense>
    </>
  );
}

async function Team() {
  const { tenant, user } = await requireTenant("editor");
  const team = await loadTeam(tenant.id);
  return <TeamManager {...team} me={user.id} myRole={tenant.role} canManage={roleAtLeast(tenant.role, "admin")} />;
}

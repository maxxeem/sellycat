import { Suspense } from "react";
import { PageHeader, Skeleton } from "@/components/ui";
import { requireTenant } from "@/lib/dashboard/context";
import { loadDevelopers } from "@/lib/developers/manage";
import { fromParams } from "@/lib/i18n/params";
import { apexUrl } from "@/lib/site/hosts";
import { DeveloperConsole } from "./developer-console";

export const metadata = { title: "API & Webhooks" };

export default async function DevelopersPage({ params }: PageProps<"/p/[locale]/dashboard/developers">) {
  const { t } = await fromParams(params);
  return (
    <>
      <PageHeader title={t.developers.title} description={t.developers.intro} />
      <Suspense fallback={<Skeleton className="h-96" />}>
        <Console />
      </Suspense>
    </>
  );
}

async function Console() {
  const { tenant } = await requireTenant("admin");
  const data = await loadDevelopers(tenant.id);
  return <DeveloperConsole {...data} apiBase={`${apexUrl()}/api/v1`} />;
}

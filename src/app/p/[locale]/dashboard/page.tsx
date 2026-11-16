import { Suspense } from "react";
import { CheckCircle2, Circle, ExternalLink } from "lucide-react";
import { Card, EmptyState, PageHeader, Skeleton, buttonClass } from "@/components/ui";
import { fmt } from "@/lib/i18n";
import { fromParams } from "@/lib/i18n/params";
import { getSessionUser } from "@/lib/auth/session";
import { getCurrentTenant } from "@/lib/auth/tenants";
import { shopUrlForSlug } from "@/lib/site/hosts";

export const metadata = { title: "Dashboard" };

export default async function DashboardHome({ params }: PageProps<"/p/[locale]/dashboard">) {
  const { t } = await fromParams(params);
  return (
    <Suspense fallback={<Skeleton className="h-48" />}>
      <Overview t={t} />
    </Suspense>
  );
}

async function Overview({ t }: { t: Awaited<ReturnType<typeof fromParams>>["t"] }) {
  const [user, tenant] = await Promise.all([getSessionUser(), getCurrentTenant()]);
  if (!tenant) return <EmptyState title={t.dashboard.noTenant} />;
  const shopUrl = shopUrlForSlug(tenant.slug);
  // Phase 1: the checklist is static; each item gets its real status in its phase.
  const steps = [t.dashboard.setup.payments, t.dashboard.setup.design, t.dashboard.setup.legal, t.dashboard.setup.deal];
  return (
    <>
      <PageHeader
        title={fmt(t.dashboard.welcome, { name: user?.name ?? "" })}
        description={tenant.name}
        actions={
          <a href={shopUrl} target="_blank" rel="noreferrer" className={buttonClass.secondary}>
            {t.dashboard.openShop} <ExternalLink className="h-4 w-4" aria-hidden />
          </a>
        }
      />
      <div className="grid gap-4 md:grid-cols-2">
        <Card title={t.dashboard.setup.title}>
          <ul className="flex flex-col gap-3">
            {steps.map((s, i) => (
              <li key={s} className="flex items-center gap-3 text-sm">
                {i < 0 ? <CheckCircle2 className="h-5 w-5 text-success" aria-hidden /> : <Circle className="h-5 w-5 text-muted" aria-hidden />}
                {s}
              </li>
            ))}
          </ul>
        </Card>
        <Card title={t.dashboard.yourShop}>
          <p className="break-all text-sm">
            <a href={shopUrl} target="_blank" rel="noreferrer" className="font-semibold text-accent-text hover:underline">
              {shopUrl.replace(/^https?:\/\//, "")}
            </a>
          </p>
        </Card>
      </div>
    </>
  );
}

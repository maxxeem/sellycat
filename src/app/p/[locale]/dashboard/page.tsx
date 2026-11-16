import Link from "next/link";
import { Suspense } from "react";
import { CheckCircle2, Circle, ExternalLink } from "lucide-react";
import { Card, EmptyState, PageHeader, Skeleton, buttonClass } from "@/components/ui";
import { fmt } from "@/lib/i18n";
import { fromParams } from "@/lib/i18n/params";
import { getSessionUser } from "@/lib/auth/session";
import { getCurrentTenant } from "@/lib/auth/tenants";
import { shopUrlForSlug } from "@/lib/site/hosts";
import { createClient } from "@/lib/supabase/server";

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
  const supabase = await createClient();
  const [{ data: theme }, { data: legal }, { count: deals }, { data: profile }] = await Promise.all([
    supabase.from("shop_themes").select("published_at").eq("tenant_id", tenant.id).maybeSingle(),
    supabase.rpc("shop_legal_complete", { p_tenant: tenant.id }),
    supabase.from("deals").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id).eq("state", "published"),
    supabase.rpc("shop_profile", { p_tenant: tenant.id }),
  ]);
  const steps: Array<{ label: string; done: boolean; href: string }> = [
    { label: t.dashboard.setup.design, done: Boolean(theme?.published_at), href: "/dashboard/design" },
    { label: t.dashboard.setup.legal, done: Boolean(legal), href: "/dashboard/settings" },
    { label: t.dashboard.setup.deal, done: Boolean(deals), href: "/dashboard/deals" },
    { label: t.dashboard.setup.payments, done: Boolean(profile?.[0]?.payments_ready), href: "/dashboard/payments" },
  ];
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
            {steps.map((s) => (
              <li key={s.label}>
                <Link href={s.href} className="flex items-center gap-3 text-sm hover:underline">
                  {s.done ? <CheckCircle2 className="h-5 w-5 text-success" aria-hidden /> : <Circle className="h-5 w-5 text-muted" aria-hidden />}
                  <span className={s.done ? "text-muted line-through" : ""}>{s.label}</span>
                </Link>
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

import { Suspense } from "react";
import { EmptyState, Skeleton } from "@/components/ui";
import type { Dictionary } from "@/lib/i18n";
import { fromParams } from "@/lib/i18n/params";
import { getSessionUser } from "@/lib/auth/session";
import { getCurrentTenant } from "@/lib/auth/tenants";
import { summarise } from "@/lib/dashboard/overview";
import { dealStatus } from "@/lib/shop/deal-status";
import { DEFAULT_ROOT, shopUrlForSlug, siteHost } from "@/lib/site/hosts";
import { fetchAll } from "@/lib/supabase/fetch-all";
import { createClient } from "@/lib/supabase/server";
import { HomeView } from "./home-view";
import { roleAtLeast } from "@/lib/auth/tenants";
import { isShopState } from "@/lib/shop/shop-state";
import { getStaffUser } from "@/lib/platform/staff";
import { redirect } from "next/navigation";

export const metadata = { title: "Dashboard" };

/** The shop's own domain once it is connected and set as main address (else the Sellycat address). */
function customPrimary(host: string | null | undefined): string | null {
  if (!host) return null;
  const root = (siteHost() || DEFAULT_ROOT).split(":")[0];
  return host === root || host.endsWith(`.${root}`) || host.endsWith(".localhost") ? null : `https://${host}`;
}

const DAY = 86_400_000;

export default async function DashboardHome({ params }: PageProps<"/p/[locale]/dashboard">) {
  const { t, locale } = await fromParams(params);
  return (
    <Suspense fallback={<HomeSkeleton />}>
      <Home t={t} locale={locale} />
    </Suspense>
  );
}

function HomeSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-36" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <Skeleton className="h-64" />
    </div>
  );
}

async function Home({ t, locale }: { t: Dictionary; locale: string }) {
  const [user, tenant] = await Promise.all([getSessionUser(), getCurrentTenant()]);
  // An account without a shop (e.g. first Google sign-in) sets one up first; staff keep the notice.
  if (!tenant) {
    if (!(await getStaffUser())) redirect("/welcome");
    return <EmptyState title={t.dashboard.noTenant} />;
  }
  const supabase = await createClient();
  const now = new Date();
  // Two spans of 30 days: the current one and the one before for the trend.
  const since = new Date(now.getTime() - 60 * DAY).toISOString();
  const [{ data: theme }, { data: legal }, { data: deals }, { data: profile }, paid, { data: recent }] = await Promise.all([
    supabase.from("shop_themes").select("published_at, published, draft").eq("tenant_id", tenant.id).maybeSingle(),
    supabase.rpc("shop_legal_complete", { p_tenant: tenant.id }),
    supabase.from("deals").select("state, sales_start, sales_end, total_qty, sold_qty, reserved_qty, code_source, pool_free").eq("tenant_id", tenant.id).eq("state", "published"),
    supabase.rpc("shop_profile", { p_tenant: tenant.id }),
    fetchAll((from, to) => supabase.from("orders").select("paid_at, amount_cents, refunded_cents, order_items(title, qty, deal_id)").eq("tenant_id", tenant.id).gte("paid_at", since).order("paid_at").order("id").range(from, to), 20_000).catch(() => []),
    supabase.from("orders").select("id, number, status, email, currency, amount_cents, created_at").eq("tenant_id", tenant.id).neq("status", "expired").order("created_at", { ascending: false }).limit(5),
  ]);
  const shop = profile?.[0];
  const look = ((theme?.published_at ? theme.published : theme?.draft) ?? {}) as { colors?: { primary?: string }; logoLight?: string; logoDark?: string };

  return (
    <HomeView
      t={t}
      locale={locale}
      userName={user?.name ?? ""}
      tenantName={tenant.name}
      shopUrl={customPrimary(shop?.primary_host) ?? shopUrlForSlug(tenant.slug)}
      shopState={isShopState(shop?.shop_state) ? shop.shop_state : "online"}
      canManage={roleAtLeast(tenant.role, "admin")}
      brand={look.colors?.primary ?? "#ff4b23"}
      logos={{ light: look.logoLight || null, dark: look.logoDark || null }}
      currency={shop?.currency ?? "CHF"}
      setup={{ design: Boolean(theme?.published_at), legal: Boolean(legal), deal: Boolean(deals?.length), payments: Boolean(shop?.payments_ready) }}
      liveDeals={(deals ?? []).filter((d) => dealStatus(d, now) === "live").length}
      stats={summarise(paid, now)}
      recent={recent ?? []}
    />
  );
}

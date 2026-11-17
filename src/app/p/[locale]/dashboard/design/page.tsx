import { Suspense } from "react";
import { Skeleton } from "@/components/ui";
import { requireTenant } from "@/lib/dashboard/context";
import { getShopDeals, listedDeals } from "@/lib/shop/queries";
import { parseTheme } from "@/lib/shop/theme";
import { fromParams } from "@/lib/i18n/params";
import { DesignTabs } from "./design-tabs";
import { ThemeEditor } from "./theme-editor";

export const metadata = { title: "Design" };

export default async function DesignPage({ params }: PageProps<"/p/[locale]/dashboard/design">) {
  const { t } = await fromParams(params);
  return (
    <div className="flex flex-col gap-4">
      <DesignTabs active="shop" t={t.voucherDesign} walletLabel={t.wallet.tabWallet} />
      <Suspense fallback={<Skeleton className="h-[80vh]" />}>
        <Design />
      </Suspense>
    </div>
  );
}

async function Design() {
  const { tenant, supabase } = await requireTenant("editor");
  const [{ data: theme }, { data: info }, { data: categories }, deals] = await Promise.all([
    supabase.from("shop_themes").select("draft, published, published_at, updated_at").eq("tenant_id", tenant.id).maybeSingle(),
    supabase.from("tenants").select("name, currency, locale").eq("id", tenant.id).single(),
    supabase.from("categories").select("name, slug").eq("tenant_id", tenant.id).order("sort_order"),
    getShopDeals(tenant.id),
  ]);
  const draft = theme?.draft && Object.keys(theme.draft as object).length ? theme.draft : theme?.published;
  return (
    <ThemeEditor
      tenantId={tenant.id}
      initial={parseTheme(draft)}
      hasUnpublished={Boolean(theme && JSON.stringify(theme.draft) !== JSON.stringify(theme.published))}
      shop={{ name: info?.name ?? "", currency: info?.currency ?? "CHF", locale: info?.locale === "en" ? "en" : "de" }}
      deals={listedDeals(deals).slice(0, 6)}
      categories={categories ?? []}
    />
  );
}

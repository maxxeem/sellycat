import { Suspense } from "react";
import { Skeleton } from "@/components/ui";
import { requireTenant } from "@/lib/dashboard/context";
import { getShopDeals, listedDeals } from "@/lib/shop/queries";
import { parseTheme } from "@/lib/shop/theme";
import { ThemeEditor } from "./theme-editor";

export const metadata = { title: "Design" };

export default function DesignPage() {
  return (
    <Suspense fallback={<Skeleton className="h-[80vh]" />}>
      <Design />
    </Suspense>
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

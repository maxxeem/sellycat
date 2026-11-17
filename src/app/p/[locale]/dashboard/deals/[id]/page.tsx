import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui";
import { requireTenant } from "@/lib/dashboard/context";
import { LOCALES } from "@/lib/i18n/locales";
import { dealToForm } from "@/lib/shop/deal-input";
import { reusableTexts } from "@/lib/shop/reuse";
import { parseTheme } from "@/lib/shop/theme";
import { DealEditor } from "./deal-editor";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale, id: "00000000-0000-0000-0000-000000000000" }));
}

export default function DealPage({ params }: PageProps<"/p/[locale]/dashboard/deals/[id]">) {
  return (
    <Suspense fallback={<Skeleton className="h-[80vh]" />}>
      <Editor id={params.then((p) => p.id)} />
    </Suspense>
  );
}

async function Editor({ id: idPromise }: { id: Promise<string> }) {
  const id = await idPromise;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const { tenant, supabase } = await requireTenant("editor");
  const [{ data: deal }, { data: partners }, { data: categories }, { data: info }, { data: theme }, { data: legal }, { data: others }] = await Promise.all([
    supabase.from("deals").select("*, deal_images(url, alt, sort_order), deal_locations(location_id)").eq("id", id).eq("tenant_id", tenant.id).maybeSingle(),
    supabase.from("partners").select("id, name, logo_url, website_url, partner_locations(id, name, street, zip, city, lat, lng, opening_hours)").eq("tenant_id", tenant.id).order("name"),
    supabase.from("categories").select("id, name, slug").eq("tenant_id", tenant.id).order("sort_order"),
    supabase.from("tenants").select("name, currency, locale").eq("id", tenant.id).single(),
    supabase.from("shop_themes").select("draft, published").eq("tenant_id", tenant.id).maybeSingle(),
    supabase.rpc("shop_legal_complete", { p_tenant: tenant.id }),
    // Conditions and FAQ of the shop's other deals, newest first, to reuse as a starting point.
    supabase.from("deals").select("title, terms, faq").eq("tenant_id", tenant.id).neq("id", id).order("updated_at", { ascending: false }).limit(200),
  ]);
  if (!deal) notFound();
  const images = [...(deal.deal_images ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  const form = dealToForm(deal, images, (deal.deal_locations ?? []).map((l) => l.location_id));
  return (
    <DealEditor
      id={deal.id}
      tenantId={tenant.id}
      initial={form}
      state={deal.state}
      stock={{ sold_qty: deal.sold_qty, reserved_qty: deal.reserved_qty }}
      partners={partners ?? []}
      categories={categories ?? []}
      shop={{ name: info?.name ?? "", currency: info?.currency ?? "CHF", locale: info?.locale === "en" ? "en" : "de" }}
      theme={parseTheme(theme?.published && Object.keys(theme.published as object).length ? theme.published : theme?.draft)}
      legalComplete={Boolean(legal)}
      reuse={reusableTexts(others ?? [])}
      canDelete={tenant.role === "owner" || tenant.role === "admin"}
    />
  );
}

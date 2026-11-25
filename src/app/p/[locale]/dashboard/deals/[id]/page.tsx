import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui";
import { requireTenant } from "@/lib/dashboard/context";
import { LOCALES } from "@/lib/i18n/locales";
import { dealToForm } from "@/lib/shop/deal-input";
import { shopBase } from "@/lib/shop/seo";
import { siteHost } from "@/lib/site/hosts";
import { shopTexts } from "@/components/shop/shop-texts";
import { ALERT_MODES } from "@/lib/alerts/schedule";
import { reusableTexts } from "@/lib/shop/reuse";
import { parseTheme } from "@/lib/shop/theme";
import { DealEditor } from "./deal-editor";
import { getStaffUser } from "@/lib/platform/staff";
import { serverEnv } from "@/lib/env";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale, id: "00000000-0000-0000-0000-000000000000" }));
}

/** The AI import (server action on this page) may take a while on slow shop pages. */
export const maxDuration = 300;

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
  const [{ data: deal }, { data: partners }, { data: categories }, { data: info }, { data: theme }, { data: legal }, { data: others }, { count: poolUsed }, { data: domain }, { data: shared }, { data: allowedAlert }, { data: autoAlert }, { data: handAlert }, { data: faqLibrary }, { data: voucherDesign }, { data: alertSettings }] = await Promise.all([
    supabase.from("deals").select("*, deal_images(url, alt, sort_order), deal_locations(location_id)").eq("id", id).eq("tenant_id", tenant.id).maybeSingle(),
    supabase.from("partners").select("id, name, logo_url, website_url, partner_locations(id, name, street, zip, city, lat, lng, opening_hours, hours)").eq("tenant_id", tenant.id).order("name"),
    supabase.from("categories").select("id, name, slug").eq("tenant_id", tenant.id).order("sort_order"),
    supabase.from("tenants").select("name, currency, locale, deal_alert_at").eq("id", tenant.id).single(),
    supabase.from("shop_themes").select("draft, published").eq("tenant_id", tenant.id).maybeSingle(),
    supabase.rpc("shop_legal_complete", { p_tenant: tenant.id }),
    // Conditions and FAQ of the shop's other deals, newest first, to reuse as a starting point.
    supabase.from("deals").select("title, terms, faq").eq("tenant_id", tenant.id).neq("id", id).order("updated_at", { ascending: false }).limit(200),
    supabase.from("code_pool").select("id", { count: "exact", head: true }).eq("deal_id", id).not("voucher_id", "is", null),
    supabase.from("tenant_domains").select("hostname").eq("tenant_id", tenant.id).eq("is_primary", true).maybeSingle(),
    supabase.from("deal_shared_codes").select("code").eq("deal_id", id).eq("tenant_id", tenant.id).maybeSingle(),
    supabase.rpc("plan_allows", { p_tenant: tenant.id, p_feature: "deal_alert" }),
    // Readable for owners and admins only: editors just do not see when it was sent.
    supabase.from("deal_alerts").select("created_at").eq("deal_id", id).maybeSingle(),
    supabase.from("deal_alert_deals").select("deal_alerts(created_at)").eq("deal_id", id),
    supabase.from("faq_library").select("question, answer").eq("tenant_id", tenant.id).order("created_at"),
    supabase.from("voucher_designs").select("size, ad_enabled, ad_image").eq("tenant_id", tenant.id).maybeSingle(),
    supabase.from("deal_alert_settings").select("mode").eq("tenant_id", tenant.id).maybeSingle(),
  ]);
  const alertSent = [autoAlert?.created_at, ...(handAlert ?? []).map((x) => x.deal_alerts?.created_at)].filter((x): x is string => Boolean(x)).sort().at(-1) ?? null;
  if (!deal) notFound();
  const [staff, { data: hasSales }] = await Promise.all([getStaffUser(), supabase.rpc("deal_has_sales", { p_deal: deal.id })]);
  const images = [...(deal.deal_images ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  const form = dealToForm(deal, images, (deal.deal_locations ?? []).map((l) => l.location_id), shared?.code ?? "");
  return (
    <DealEditor
      id={deal.id}
      tenantId={tenant.id}
      initial={form}
      state={deal.state}
      stock={{ sold_qty: deal.sold_qty, reserved_qty: deal.reserved_qty, pool_free: deal.pool_free, pool_used: poolUsed ?? 0 }}
      partners={partners ?? []}
      categories={categories ?? []}
      shop={{ name: info?.name ?? "", currency: info?.currency ?? "CHF", locale: info?.locale === "en" ? "en" : "de" }}
      theme={parseTheme(theme?.published && Object.keys(theme.published as object).length ? theme.published : theme?.draft)}
      seoTexts={shopTexts(info?.locale === "en" ? "en" : "de").seo}
      shopUrl={shopBase(domain?.hostname ?? null, siteHost())}
      alert={{ allowed: allowedAlert === true, on: Boolean(info?.deal_alert_at), sentAt: alertSent, mode: ALERT_MODES.find((m) => m === alertSettings?.mode) ?? "instant" }}
      legalComplete={Boolean(legal)}
      faqLibrary={(faqLibrary ?? []).map((f) => ({ q: f.question, a: f.answer }))}
      shopAd={{ size: voucherDesign?.size === "a6" ? "a6" : "a4", active: Boolean(voucherDesign?.ad_enabled && voucherDesign.ad_image) }}
      reuse={reusableTexts(others ?? [])}
      canArchive={tenant.role === "owner" || tenant.role === "admin"}
      archived={Boolean(deal.archived_at)}
      hasSales={hasSales !== false}
      canDeleteForever={Boolean(staff && (staff.aal === "aal2" || serverEnv.staffMfaOptional))}
    />
  );
}

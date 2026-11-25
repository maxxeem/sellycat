import { Suspense } from "react";
import Link from "next/link";
import { Card, PageHeader, Skeleton, buttonClass } from "@/components/ui";
import type { Dictionary } from "@/lib/i18n";
import { fromParams } from "@/lib/i18n/params";
import { requireTenant } from "@/lib/dashboard/context";
import { BillingForm, CategoryManager, LegalForm, ShopSettingsForm } from "./forms";
import { ShopStatus } from "./shop-status";
import { shopTexts } from "@/components/shop/shop-texts";
import { isShopState, type ShopNotice } from "@/lib/shop/shop-state";
import { parseTheme } from "@/lib/shop/theme";
import { isDoc, plainToDoc } from "@/lib/shop/rich-text";

export const metadata = { title: "Settings" };

export default async function SettingsPage({ params }: PageProps<"/p/[locale]/dashboard/settings">) {
  const { t } = await fromParams(params);
  return (
    <>
      <PageHeader title={t.settings.title} />
      <Suspense fallback={<Skeleton className="h-96" />}>
        <Settings t={t} />
      </Suspense>
    </>
  );
}

async function Settings({ t }: { t: Dictionary }) {
  const { tenant, supabase } = await requireTenant("admin");
  const [{ data: info }, { data: legal }, { data: categories }, { data: themeRow }] = await Promise.all([
    supabase.from("tenants").select("name, locale, mail_from_name, reply_to, shop_settings, billing, shop_state, shop_notice").eq("id", tenant.id).single(),
    supabase.from("legal_pages").select("kind, content, content_doc").eq("tenant_id", tenant.id),
    supabase.from("categories").select("id, name, slug").eq("tenant_id", tenant.id).order("sort_order").order("name"),
    supabase.from("shop_themes").select("published, draft, published_at").eq("tenant_id", tenant.id).maybeSingle(),
  ]);
  const shopLocale = info?.locale === "en" ? "en" : "de";
  // Older pages have plain text only: open them as a document with the same paragraphs and lines.
  const legalDocFor = (kind: "imprint" | "terms" | "privacy") => {
    const row = (legal ?? []).find((l) => l.kind === kind);
    return isDoc(row?.content_doc) ? row.content_doc : plainToDoc(row?.content ?? "");
  };
  const s = (info?.shop_settings ?? {}) as Record<string, string | null>;
  const b = (info?.billing ?? {}) as Record<string, string | null>;
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div id="shop-status" className="scroll-mt-24 lg:col-span-2">
        <Card title={t.dashboard.shopState.cardTitle} description={t.dashboard.shopState.cardIntro}>
          <ShopStatus
            state={isShopState(info?.shop_state) ? info.shop_state : "online"}
            notice={(info?.shop_notice ?? {}) as ShopNotice}
            defaults={shopTexts(shopLocale).gate}
            name={info?.name ?? tenant.name}
            theme={parseTheme(themeRow?.published_at ? themeRow.published : themeRow?.draft)}
          />
        </Card>
      </div>
      <Card title={t.settings.shop}>
        <ShopSettingsForm
          values={{
            name: info?.name ?? "",
            locale: info?.locale ?? "de",
            contactEmail: s.contact_email ?? "",
            contactPhone: s.contact_phone ?? "",
            seoTitle: s.seo_title ?? "",
            googleVerification: s.google_verification ?? "",
            seoDescription: s.seo_description ?? "",
            mailFromName: info?.mail_from_name ?? "",
            replyTo: info?.reply_to ?? "",
            ga4: s.ga4_id ?? "",
            metaPixel: s.meta_pixel_id ?? "",
          }}
        />
      </Card>
      <div className="flex flex-col gap-6">
        <Card title={t.dealAlertAdmin.auto.title} description={t.dealAlertAdmin.auto.settingsHint}>
          <Link href="/dashboard/deal-alert#automatic" className={buttonClass.secondary}>{t.dealAlertAdmin.auto.settingsLink}</Link>
        </Card>
        <Card title={t.settings.categories}>
          <CategoryManager categories={categories ?? []} />
        </Card>
        <Card title={t.settings.billing}>
          <BillingForm values={b} />
        </Card>
      </div>
      <Card title={t.settings.legal} description={t.settings.legalHint} className="lg:col-span-2">
        <LegalForm values={{ imprint: legalDocFor("imprint"), terms: legalDocFor("terms"), privacy: legalDocFor("privacy") }} />
      </Card>
    </div>
  );
}

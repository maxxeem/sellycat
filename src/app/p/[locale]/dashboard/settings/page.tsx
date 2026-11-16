import { Suspense } from "react";
import { Card, PageHeader, Skeleton } from "@/components/ui";
import type { Dictionary } from "@/lib/i18n";
import { fromParams } from "@/lib/i18n/params";
import { requireTenant } from "@/lib/dashboard/context";
import { BillingForm, CategoryManager, LegalForm, ShopSettingsForm } from "./forms";

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
  const [{ data: info }, { data: legal }, { data: categories }] = await Promise.all([
    supabase.from("tenants").select("name, locale, mail_from_name, reply_to, shop_settings, billing").eq("id", tenant.id).single(),
    supabase.from("legal_pages").select("kind, content").eq("tenant_id", tenant.id),
    supabase.from("categories").select("id, name, slug").eq("tenant_id", tenant.id).order("sort_order").order("name"),
  ]);
  const legalMap = Object.fromEntries((legal ?? []).map((l) => [l.kind, l.content]));
  const s = (info?.shop_settings ?? {}) as Record<string, string | null>;
  const b = (info?.billing ?? {}) as Record<string, string | null>;
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card title={t.settings.shop}>
        <ShopSettingsForm
          values={{
            name: info?.name ?? "",
            locale: info?.locale ?? "de",
            contactEmail: s.contact_email ?? "",
            contactPhone: s.contact_phone ?? "",
            seoDescription: s.seo_description ?? "",
            mailFromName: info?.mail_from_name ?? "",
            replyTo: info?.reply_to ?? "",
            ga4: s.ga4_id ?? "",
            metaPixel: s.meta_pixel_id ?? "",
          }}
        />
      </Card>
      <div className="flex flex-col gap-6">
        <Card title={t.settings.categories}>
          <CategoryManager categories={categories ?? []} />
        </Card>
        <Card title={t.settings.billing}>
          <BillingForm values={b} />
        </Card>
      </div>
      <Card title={t.settings.legal} description={t.settings.legalHint} className="lg:col-span-2">
        <LegalForm values={{ imprint: legalMap.imprint ?? "", terms: legalMap.terms ?? "", privacy: legalMap.privacy ?? "" }} />
      </Card>
    </div>
  );
}

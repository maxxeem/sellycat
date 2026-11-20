import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Card, PageHeader, Skeleton } from "@/components/ui";
import { fromParams } from "@/lib/i18n/params";
import { LOCALES } from "@/lib/i18n/locales";
import { requireTenant } from "@/lib/dashboard/context";
import { PartnerForm } from "../partner-form";
import type { PartnerBilling } from "@/lib/settlements/billing";
import { BillingForm } from "./billing";
import { DeletePartner, LocationList } from "./locations";
import { Scanners } from "./scanners";
import { shopBase } from "@/lib/mail/deliver";
import { getShopProfile } from "@/lib/shop/queries";
import { listScanners } from "@/lib/vouchers/scanners";
import { createAdminClient } from "@/lib/supabase/admin";

export function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale, id: "00000000-0000-0000-0000-000000000000" }));
}

export default function PartnerPage({ params }: PageProps<"/p/[locale]/dashboard/partners/[id]">) {
  // Locale and id are read inside Suspense (the id is URL data, so the shell stays instant).
  return (
    <Suspense fallback={<Skeleton className="h-96" />}>
      <Partner params={params} />
    </Suspense>
  );
}

async function Partner({ params }: { params: PageProps<"/p/[locale]/dashboard/partners/[id]">["params"] }) {
  const [{ t }, { id }] = await Promise.all([fromParams(params), params]);
  const { tenant, supabase } = await requireTenant("editor");
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const { data: partner } = await supabase
    .from("partners")
    .select("id, name, description, website_url, email, phone, logo_url, partner_locations(id, name, street, zip, city, country, opening_hours, hours, google_place_id, lat, lng)")
    .eq("id", id)
    .eq("tenant_id", tenant.id)
    .maybeSingle();
  if (!partner) notFound();
  // Bank details are not readable through the client roles (column grant); owners and admins get them here.
  const isAdmin = tenant.role === "owner" || tenant.role === "admin";
  const billing = isAdmin ? ((await createAdminClient().from("partners").select("billing").eq("id", partner.id).eq("tenant_id", tenant.id).maybeSingle()).data?.billing ?? {}) : {};
  const [scanners, shop] = await Promise.all([listScanners(tenant.id, partner.id), getShopProfile(tenant.id)]);
  const scanUrl = `${shop ? shopBase(shop) : ""}/scan`;
  return (
    <>
      <Link href="/dashboard/partners" className="mb-3 inline-block text-sm text-muted hover:text-ink">
        ← {t.partners.title}
      </Link>
      <PageHeader title={partner.name} actions={<DeletePartner id={partner.id} />} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title={t.partners.edit}>
          <PartnerForm tenantId={tenant.id} partner={partner} />
        </Card>
        <Card title={t.partners.locations}>
          <LocationList partnerId={partner.id} locations={partner.partner_locations ?? []} />
        </Card>
        {isAdmin ? (
          <Card title={t.partners.billing.title} description={t.partners.billing.intro} className="lg:col-span-2">
            <BillingForm partnerId={partner.id} billing={billing as PartnerBilling} />
          </Card>
        ) : null}
        <Card title={t.scanners.title} className="lg:col-span-2">
          <Scanners partnerId={partner.id} partnerName={partner.name} scanUrl={scanUrl} scanners={scanners} canManage={tenant.role === "owner" || tenant.role === "admin"} />
        </Card>
      </div>
    </>
  );
}

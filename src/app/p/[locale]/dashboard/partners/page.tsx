import Link from "next/link";
import { Suspense } from "react";
import { MapPin } from "lucide-react";
import { Card, EmptyState, PageHeader, Skeleton } from "@/components/ui";
import type { Dictionary } from "@/lib/i18n";
import { fromParams } from "@/lib/i18n/params";
import { requireTenant } from "@/lib/dashboard/context";
import { PartnerForm } from "./partner-form";

export const metadata = { title: "Partner" };

export default async function PartnersPage({ params }: PageProps<"/p/[locale]/dashboard/partners">) {
  const { t } = await fromParams(params);
  return (
    <>
      <PageHeader title={t.partners.title} description={t.partners.intro} />
      <Suspense fallback={<Skeleton className="h-64" />}>
        <PartnerList t={t} />
      </Suspense>
    </>
  );
}

async function PartnerList({ t }: { t: Dictionary }) {
  const { tenant, supabase } = await requireTenant("editor");
  const { data } = await supabase.from("partners").select("id, name, logo_url, partner_locations(count)").eq("tenant_id", tenant.id).order("name");
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="flex flex-col gap-3">
        {!data?.length ? <EmptyState title={t.partners.empty} /> : null}
        {data?.map((p) => (
          <Link key={p.id} href={`/dashboard/partners/${p.id}`} className="flex items-center gap-4 rounded-card border border-line bg-surface-2 p-4 shadow-card transition hover:border-ink">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-input bg-surface">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {p.logo_url ? <img src={p.logo_url} alt="" className="max-h-full max-w-full object-contain" /> : <span className="text-lg font-bold text-muted">{p.name.slice(0, 1)}</span>}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold">{p.name}</span>
              <span className="flex items-center gap-1 text-sm text-muted">
                <MapPin className="h-3.5 w-3.5" aria-hidden /> {(p.partner_locations as unknown as Array<{ count: number }>)[0]?.count ?? 0} · {t.partners.locations}
              </span>
            </span>
          </Link>
        ))}
      </div>
      <Card title={t.partners.add}>
        <PartnerForm tenantId={tenant.id} />
      </Card>
    </div>
  );
}

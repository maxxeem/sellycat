import Link from "next/link";
import { Suspense } from "react";
import { MapPin } from "lucide-react";
import { Badge, Card, EmptyState, PageHeader, Skeleton } from "@/components/ui";
import { fmt, type Dictionary } from "@/lib/i18n";
import { fromParams } from "@/lib/i18n/params";
import { requireTenant } from "@/lib/dashboard/context";
import {
  filterPartners,
  parsePartnerFilter,
  parsePartnerSort,
  partnerCities,
  partnerCounts,
  partnerFacts,
  type PartnerRow,
} from "@/lib/dashboard/partner-list";
import { PartnerFilters } from "./partner-filters";
import { PartnerForm } from "./partner-form";

export const metadata = { title: "Partner" };

export default async function PartnersPage({
  params,
  searchParams,
}: PageProps<"/p/[locale]/dashboard/partners">) {
  const { t } = await fromParams(params);
  return (
    <>
      <PageHeader title={t.partners.title} description={t.partners.intro} />
      <Suspense fallback={<Skeleton className="h-64" />}>
        <PartnerList t={t} searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function PartnerList({
  t,
  searchParams,
}: {
  t: Dictionary;
  searchParams: PageProps<"/p/[locale]/dashboard/partners">["searchParams"];
}) {
  const { tenant, supabase } = await requireTenant("editor");
  const query = await searchParams;
  const q = typeof query.q === "string" ? query.q.slice(0, 80) : "";
  const city = typeof query.city === "string" ? query.city.slice(0, 80) : "";
  const filter = parsePartnerFilter(query.filter);
  const sort = parsePartnerSort(query.sort);
  const { data } = await supabase
    .from("partners")
    .select(
      "id, name, email, logo_url, created_at, partner_locations(name, city), deals(title, state, sales_start, sales_end, total_qty, sold_qty, reserved_qty, code_source, pool_free, teaser, archived_at)",
    )
    .eq("tenant_id", tenant.id)
    .limit(2000);
  const rows = (data ?? []) as unknown as Array<
    PartnerRow & { logo_url: string | null }
  >;
  const now = new Date();
  const shown = filterPartners(
    rows,
    { q, filter, city, sort },
    now,
  ) as typeof rows;
  const l = t.partners.list;
  return (
    <>
      {rows.length ? (
        <div className="mb-5">
          <PartnerFilters
            q={q}
            filter={filter}
            city={city}
            sort={sort}
            counts={partnerCounts(rows, q, city, now)}
            cities={partnerCities(rows)}
          />
        </div>
      ) : null}
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="flex flex-col gap-3">
          {!rows.length ? <EmptyState title={t.partners.empty} /> : null}
          {rows.length && !shown.length ? (
            <p className="rounded-card border border-dashed border-line p-8 text-center text-sm text-muted">
              {l.noResults}
            </p>
          ) : null}
          <ul className="flex flex-col gap-3" data-testid="partner-list">
            {shown.map((p) => {
              const x = partnerFacts(p, now);
              return (
                <li key={p.id}>
                  <Link
                    href={`/dashboard/partners/${p.id}`}
                    className="flex items-center gap-4 rounded-card border border-line bg-surface-2 p-4 shadow-card transition hover:border-ink"
                  >
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-input bg-surface">
                      {p.logo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.logo_url}
                          alt=""
                          className="max-h-full max-w-full object-contain"
                        />
                      ) : (
                        <span className="text-lg font-bold text-muted">
                          {p.name.slice(0, 1)}
                        </span>
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">
                        {p.name}
                      </span>
                      <span className="flex flex-wrap items-center gap-x-1 text-sm text-muted">
                        <MapPin className="h-3.5 w-3.5" aria-hidden />{" "}
                        {x.locations} · {t.partners.locations}
                        {x.cities.length ? (
                          <span className="truncate">
                            · {x.cities.join(", ")}
                          </span>
                        ) : null}
                      </span>
                    </span>
                    <span className="hidden shrink-0 flex-col items-end gap-1 text-xs text-muted sm:flex">
                      {x.live ? (
                        <Badge tone="green">
                          {fmt(l.liveDeals, { count: x.live })}
                        </Badge>
                      ) : (
                        <span>{fmt(l.deals, { count: x.deals })}</span>
                      )}
                      {x.sold ? (
                        <span>{fmt(l.sold, { count: x.sold })}</span>
                      ) : null}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
        <Card title={t.partners.add}>
          <PartnerForm tenantId={tenant.id} />
        </Card>
      </div>
    </>
  );
}

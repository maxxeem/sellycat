import { Suspense } from "react";
import { PageHeader, Skeleton } from "@/components/ui";
import { requireTenant } from "@/lib/dashboard/context";
import { fromParams } from "@/lib/i18n/params";
import { parseDealOrder } from "@/lib/shop/deal-order";
import { isListed } from "@/lib/shop/deal-status";
import { ArrangementEditor, type ArrangeDeal } from "./arrangement-editor";

export const metadata = { title: "Anordnung" };

export default async function ArrangementPage({ params }: PageProps<"/p/[locale]/dashboard/arrangement">) {
  const { t } = await fromParams(params);
  return (
    <>
      <PageHeader title={t.arrangement.title} />
      <Suspense fallback={<Skeleton className="h-96" />}>
        <Arrangement />
      </Suspense>
    </>
  );
}

async function Arrangement() {
  const { tenant, supabase } = await requireTenant("editor");
  const [{ data: info }, { data: deals }] = await Promise.all([
    supabase.from("tenants").select("shop_settings").eq("id", tenant.id).single(),
    supabase
      .from("deals")
      .select("id, title, state, sales_start, sales_end, total_qty, sold_qty, reserved_qty, code_source, pool_free, teaser, featured, sort_order, published_at, view_count, partners(name), deal_images(url, sort_order)")
      .eq("tenant_id", tenant.id)
      .eq("state", "published")
      .limit(500),
  ]);
  const now = new Date();
  const listed: ArrangeDeal[] = (deals ?? [])
    .filter((d) => isListed(d, now))
    .map((d) => ({
      ...d,
      partner: d.partners?.name ?? null,
      cover: [...(d.deal_images ?? [])].sort((a, b) => a.sort_order - b.sort_order)[0]?.url ?? null,
    }));
  return <ArrangementEditor initialMode={parseDealOrder((info?.shop_settings as { deal_order?: string } | null)?.deal_order)} deals={listed} now={now.toISOString()} />;
}

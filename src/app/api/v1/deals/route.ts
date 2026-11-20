import { apiJson, apiRoute } from "@/lib/api/v1";
import { dealStatus, remaining } from "@/lib/shop/deal-status";

/** GET /api/v1/deals – all deals of the shop (`?archived=true` includes archived ones). */
export const GET = apiRoute<Record<string, never>>("read", async ({ db, tenantId }, request) => {
  const archived = new URL(request.url).searchParams.get("archived") === "true";
  let q = db
    .from("deals")
    .select("id, slug, title, subtitle, state, deal_type, teaser, price_cents, compare_at_cents, value_cents, total_qty, sold_qty, reserved_qty, code_source, pool_free, sales_start, sales_end, partner_id, category_id, featured, archived_at, created_at, updated_at")
    .eq("tenant_id", tenantId)
    .order("sort_order")
    .order("created_at", { ascending: false })
    .limit(1000);
  if (!archived) q = q.is("archived_at", null);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  const now = new Date();
  return apiJson({
    data: (data ?? []).map(({ reserved_qty, pool_free, code_source, ...d }) => ({
      ...d,
      status: dealStatus({ ...d, reserved_qty, pool_free, code_source }, now),
      remaining: remaining({ total_qty: d.total_qty, sold_qty: d.sold_qty, reserved_qty, code_source, pool_free }),
    })),
  });
});

import { apiJson, apiRoute, page } from "@/lib/api/v1";
import { parseLimit, parseTime } from "@/lib/developers/rules";

/** GET /api/v1/redemptions – newest first; `?since=`, `?before=` (cursor), `?limit=` (≤ 100). */
export const GET = apiRoute<Record<string, never>>("read", async ({ db, tenantId }, request) => {
  const p = new URL(request.url).searchParams;
  const limit = parseLimit(p.get("limit"));
  let q = db
    .from("redemptions")
    .select("id, voucher_id, amount_cents, source, partner_id, location_id, note, created_at, undone_at, vouchers(code, title, deal_id)")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(limit + 1);
  const since = parseTime(p.get("since"));
  const before = parseTime(p.get("before"));
  if (since) q = q.gte("created_at", since);
  if (before) q = q.lt("created_at", before);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  const out = page(data ?? [], limit);
  return apiJson({ ...out, data: out.data.map(({ vouchers, ...r }) => ({ ...r, voucher: vouchers })) });
});
